/**
 * LDAP/Active Directory Authentication Service
 * Authenticates users against AD and checks group membership
 */

import ldap from "ldapjs";

export interface LDAPConfig {
  url: string;
  bindDN: string;
  bindPassword: string;
  baseDN: string;
  userSearchFilter: string;
  groupDN: string;
}

export interface ADUser {
  dn: string;
  sAMAccountName: string;
  userPrincipalName: string;
  displayName: string;
  givenName: string;
  sn: string;
  mail: string;
  memberOf: string[];
}

// Get LDAP config from environment
export function getLDAPConfig(): LDAPConfig {
  return {
    url: process.env.LDAP_URL || "ldap://192.168.2.1:389",
    bindDN: process.env.LDAP_BIND_DN || "",
    bindPassword: process.env.LDAP_BIND_PASSWORD || "",
    baseDN: process.env.LDAP_BASE_DN || "DC=nobutts,DC=com",
    userSearchFilter: process.env.LDAP_USER_FILTER || "(sAMAccountName={{username}})",
    groupDN: process.env.LDAP_GROUP_DN || "",
  };
}

/**
 * Create LDAP client
 */
function createClient(url: string): ldap.Client {
  return ldap.createClient({
    url,
    timeout: 10000,
    connectTimeout: 10000,
  });
}

/**
 * Bind to LDAP server
 */
function bindAsync(client: ldap.Client, dn: string, password: string): Promise<void> {
  return new Promise((resolve, reject) => {
    client.bind(dn, password, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Search LDAP
 */
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

      res.on("searchEntry", (entry) => {
        entries.push(entry);
      });

      res.on("error", (err) => {
        reject(err);
      });

      res.on("end", () => {
        resolve(entries);
      });
    });
  });
}

/**
 * Parse LDAP entry to ADUser
 * ldapjs returns entries with pojo.attributes array
 */
function parseADUser(entry: ldap.SearchEntry): ADUser {
  const entryAny = entry as any;
  const pojo = entryAny.pojo;

  // Helper to get single attribute value from pojo.attributes array
  const getAttr = (name: string): string => {
    if (pojo && pojo.attributes && Array.isArray(pojo.attributes)) {
      const attr = pojo.attributes.find((a: any) =>
        a.type?.toLowerCase() === name.toLowerCase()
      );
      if (attr && attr.values && attr.values.length > 0) {
        return attr.values[0]?.toString() || "";
      }
    }
    return "";
  };

  // Helper to get multi-valued attribute
  const getAttrAll = (name: string): string[] => {
    if (pojo && pojo.attributes && Array.isArray(pojo.attributes)) {
      const attr = pojo.attributes.find((a: any) =>
        a.type?.toLowerCase() === name.toLowerCase()
      );
      if (attr && attr.values) {
        return attr.values.map((v: any) => v?.toString() || "");
      }
    }
    return [];
  };

  const dn = entry.dn?.toString() || pojo?.dn || "";
  const parsed = {
    dn,
    sAMAccountName: getAttr("sAMAccountName"),
    userPrincipalName: getAttr("userPrincipalName"),
    displayName: getAttr("displayName") || getAttr("cn"),
    givenName: getAttr("givenName"),
    sn: getAttr("sn"),
    mail: getAttr("mail"),
    memberOf: getAttrAll("memberOf"),
  };

  console.log("[LDAP] Parsed user attributes:", {
    dn: parsed.dn,
    sAMAccountName: parsed.sAMAccountName,
    displayName: parsed.displayName,
    mail: parsed.mail,
    memberOfCount: parsed.memberOf.length,
  });

  return parsed;
}

/**
 * Authenticate user against Active Directory
 */
export async function authenticateAD(
  username: string,
  password: string
): Promise<{ success: boolean; user?: ADUser; error?: string }> {
  const config = getLDAPConfig();

  console.log("[LDAP] Starting authentication for username:", username);
  console.log("[LDAP] Config:", {
    url: config.url,
    bindDN: config.bindDN,
    baseDN: config.baseDN,
    userSearchFilter: config.userSearchFilter,
    groupDN: config.groupDN,
  });

  if (!config.bindDN || !config.bindPassword) {
    console.log("[LDAP] Not configured - missing bindDN or bindPassword");
    return { success: false, error: "LDAP not configured" };
  }

  // Strip domain prefix if provided (e.g., "nobutts\eric" -> "eric")
  const cleanUsername = username.includes("\\")
    ? username.split("\\")[1]
    : username.includes("/")
      ? username.split("/")[1]
      : username;

  console.log("[LDAP] Clean username (stripped domain):", cleanUsername);

  const client = createClient(config.url);

  try {
    // First, bind with service account to search for user
    console.log("[LDAP] Binding with service account...");
    await bindAsync(client, config.bindDN, config.bindPassword);
    console.log("[LDAP] Service account bind successful");

    console.log("[LDAP] Search base DN:", config.baseDN);

    // Use simple sAMAccountName filter (works reliably)
    const filter = `(sAMAccountName=${cleanUsername})`;
    console.log("[LDAP] Using filter:", filter);
    const searchOptions: ldap.SearchOptions = {
      filter,
      scope: "sub",
      attributes: [
        "dn",
        "sAMAccountName",
        "userPrincipalName",
        "displayName",
        "givenName",
        "sn",
        "mail",
        "memberOf",
        "cn",
      ],
    };

    const entries = await searchAsync(client, config.baseDN, searchOptions);
    console.log("[LDAP] Search returned", entries.length, "entries");

    if (entries.length === 0) {
      client.unbind();
      console.log("[LDAP] No user found matching filter");
      return { success: false, error: "User not found" };
    }

    const userEntry = entries[0];
    const user = parseADUser(userEntry);
    console.log("[LDAP] Parsed user:", {
      dn: user.dn,
      sAMAccountName: user.sAMAccountName,
      displayName: user.displayName,
      mail: user.mail,
      memberOf: user.memberOf.length + " groups",
    });

    // Check group membership if configured
    if (config.groupDN) {
      console.log("[LDAP] Checking group membership for:", config.groupDN);
      console.log("[LDAP] User groups:", user.memberOf);
      const isMember = user.memberOf.some((group) =>
        group.toLowerCase().includes(config.groupDN.toLowerCase())
      );
      console.log("[LDAP] Is member:", isMember);
      if (!isMember) {
        client.unbind();
        return { success: false, error: "User not in authorized group" };
      }
    }

    // Now try to bind as the user to verify password
    console.log("[LDAP] Verifying user password by binding as user DN:", user.dn);
    const userClient = createClient(config.url);
    try {
      // Try binding with the user's DN and password
      await bindAsync(userClient, user.dn, password);
      console.log("[LDAP] User password verified successfully");
      userClient.unbind();
    } catch (bindError) {
      console.log("[LDAP] User password verification failed:", bindError);
      userClient.unbind();
      client.unbind();
      return { success: false, error: "Invalid credentials" };
    }

    client.unbind();
    console.log("[LDAP] Authentication successful for:", user.sAMAccountName);
    return { success: true, user };
  } catch (error) {
    client.unbind();
    console.error("[LDAP] Authentication error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Authentication failed",
    };
  }
}

/**
 * Check if LDAP is configured
 */
export function isLDAPConfigured(): boolean {
  const config = getLDAPConfig();
  return !!(config.bindDN && config.bindPassword && config.url);
}

const ldapService = {
  authenticateAD,
  isLDAPConfigured,
  getLDAPConfig,
};

export default ldapService;
