import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAuthenticated } from "@/lib/auth/get-current-user";
import ldap from "ldapjs";

export const dynamic = "force-dynamic";

interface LDAPConfig {
  url: string;
  bindDN: string;
  bindPassword: string;
  baseDN: string;
}

function getLDAPConfig(): LDAPConfig {
  return {
    url: process.env.LDAP_URL || "ldap://192.168.2.1:389",
    bindDN: process.env.LDAP_BIND_DN || "",
    bindPassword: process.env.LDAP_BIND_PASSWORD || "",
    baseDN: process.env.LDAP_BASE_DN || "DC=nobutts,DC=com",
  };
}

function createClient(url: string): ldap.Client {
  return ldap.createClient({
    url,
    timeout: 10000,
    connectTimeout: 10000,
  });
}

function bindAsync(client: ldap.Client, dn: string, password: string): Promise<void> {
  return new Promise((resolve, reject) => {
    client.bind(dn, password, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function searchAsync(
  client: ldap.Client,
  baseDN: string,
  options: ldap.SearchOptions
): Promise<ldap.SearchEntry[]> {
  return new Promise((resolve, reject) => {
    const entries: ldap.SearchEntry[] = [];
    client.search(baseDN, options, (err, res) => {
      if (err) {
        reject(err);
        return;
      }
      res.on("searchEntry", (entry) => entries.push(entry));
      res.on("error", (err) => reject(err));
      res.on("end", () => resolve(entries));
    });
  });
}

interface ADUserDetails {
  displayName: string;
  givenName: string;
  sn: string;
  mail: string;
  title?: string;
  department?: string;
  telephoneNumber?: string;
  mobile?: string;
}

// Internal type for ldapjs pojo attribute structure
interface LDAPAttribute {
  type?: string;
  values?: (string | Buffer)[];
}

// Type for the pojo structure returned by ldapjs at runtime
interface LDAPEntryPojo {
  dn?: string;
  attributes?: LDAPAttribute[];
}

function parseADDetails(entry: ldap.SearchEntry): ADUserDetails {
  // ldapjs SearchEntry has a pojo property at runtime with attributes array
  const pojo = (entry as ldap.SearchEntry & { pojo?: LDAPEntryPojo }).pojo;

  const getAttr = (name: string): string => {
    if (pojo && pojo.attributes && Array.isArray(pojo.attributes)) {
      const attr = (pojo.attributes as LDAPAttribute[]).find((a) =>
        a.type?.toLowerCase() === name.toLowerCase()
      );
      if (attr && attr.values && attr.values.length > 0) {
        return attr.values[0]?.toString() || "";
      }
    }
    return "";
  };

  return {
    displayName: getAttr("displayName") || getAttr("cn"),
    givenName: getAttr("givenName"),
    sn: getAttr("sn"),
    mail: getAttr("mail"),
    title: getAttr("title") || undefined,
    department: getAttr("department") || undefined,
    telephoneNumber: getAttr("telephoneNumber") || undefined,
    mobile: getAttr("mobile") || undefined,
  };
}

async function fetchADUserDetails(externalId: string): Promise<ADUserDetails | null> {
  const config = getLDAPConfig();

  if (!config.bindDN || !config.bindPassword) {
    throw new Error("LDAP not configured");
  }

  const client = createClient(config.url);

  try {
    await bindAsync(client, config.bindDN, config.bindPassword);

    // Check if externalId is a DN (starts with CN=) or a sAMAccountName
    const isDN = externalId.toUpperCase().startsWith("CN=");

    let searchBase: string;
    let searchOptions: ldap.SearchOptions;

    if (isDN) {
      // Search directly at the DN with base scope
      searchBase = externalId;
      searchOptions = {
        scope: "base",
        attributes: [
          "dn",
          "sAMAccountName",
          "displayName",
          "givenName",
          "sn",
          "mail",
          "cn",
          "title",
          "department",
          "telephoneNumber",
          "mobile",
        ],
      };
    } else {
      // Search by sAMAccountName
      searchBase = config.baseDN;
      searchOptions = {
        filter: `(sAMAccountName=${externalId})`,
        scope: "sub",
        attributes: [
          "dn",
          "sAMAccountName",
          "displayName",
          "givenName",
          "sn",
          "mail",
          "cn",
          "title",
          "department",
          "telephoneNumber",
          "mobile",
        ],
      };
    }

    const entries = await searchAsync(client, searchBase, searchOptions);

    if (entries.length === 0) {
      client.unbind();
      return null;
    }

    const details = parseADDetails(entries[0]);
    client.unbind();
    return details;
  } catch (error) {
    client.unbind();
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const authenticated = await isAuthenticated(request);
    if (!authenticated) {
      return NextResponse.json(
        { success: false, error: { message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const currentUser = await getCurrentUser(request);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { message: "User not found" } },
        { status: 404 }
      );
    }

    // Only sync LDAP users
    if (user.authProvider !== "LDAP") {
      return NextResponse.json(
        { success: false, error: { message: "User is not an AD account" } },
        { status: 400 }
      );
    }

    // Get externalId (DN or sAMAccountName)
    const externalId = user.externalId;
    if (!externalId) {
      return NextResponse.json(
        { success: false, error: { message: "No AD identifier found for user" } },
        { status: 400 }
      );
    }

    // Fetch latest details from AD
    const adDetails = await fetchADUserDetails(externalId);

    if (!adDetails) {
      return NextResponse.json(
        { success: false, error: { message: "User not found in Active Directory" } },
        { status: 404 }
      );
    }

    // Update user record with latest AD details
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: adDetails.displayName || user.name,
        email: adDetails.mail || user.email,
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        authProvider: true,
        externalId: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        user: updatedUser,
        synced: {
          displayName: adDetails.displayName,
          email: adDetails.mail,
          title: adDetails.title,
          department: adDetails.department,
        },
      },
      message: "Profile synced from Active Directory",
    });
  } catch (error) {
    console.error("Error syncing from AD:", error);

    const message = error instanceof Error ? error.message : "Failed to sync from AD";

    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 }
    );
  }
}
