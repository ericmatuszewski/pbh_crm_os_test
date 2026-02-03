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

// Internal type for ldapjs pojo attribute structure
interface LDAPAttribute {
  type?: string;
  values?: (string | Buffer)[];
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
      const attr = (pojo.attributes as LDAPAttribute[]).find((a) =>
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
      const attr = (pojo.attributes as LDAPAttribute[]).find((a) =>
        a.type?.toLowerCase() === name.toLowerCase()
      );
      if (attr && attr.values) {
        return attr.values.map((v) => v?.toString() || "");
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

  if (!config.bindDN || !config.bindPassword) {
    return { success: false, error: "LDAP not configured" };
  }

  // Strip domain prefix if provided (e.g., "nobutts\eric" -> "eric")
  const cleanUsername = username.includes("\\")
    ? username.split("\\")[1]
    : username.includes("/")
      ? username.split("/")[1]
      : username;

  const client = createClient(config.url);

  try {
    // First, bind with service account to search for user
    await bindAsync(client, config.bindDN, config.bindPassword);

    // Use simple sAMAccountName filter (works reliably)
    const filter = `(sAMAccountName=${cleanUsername})`;
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

    if (entries.length === 0) {
      client.unbind();
      return { success: false, error: "User not found" };
    }

    const userEntry = entries[0];
    const user = parseADUser(userEntry);

    // Check group membership if configured
    if (config.groupDN) {
      const isMember = user.memberOf.some((group) =>
        group.toLowerCase().includes(config.groupDN.toLowerCase())
      );
      if (!isMember) {
        client.unbind();
        return { success: false, error: "User not in authorized group" };
      }
    }

    // Now try to bind as the user to verify password
    const userClient = createClient(config.url);
    try {
      // Try binding with the user's DN and password
      await bindAsync(userClient, user.dn, password);
      userClient.unbind();
    } catch {
      userClient.unbind();
      client.unbind();
      return { success: false, error: "Invalid credentials" };
    }

    client.unbind();
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
