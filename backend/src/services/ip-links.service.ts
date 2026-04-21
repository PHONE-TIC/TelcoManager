import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
import { prisma } from "../db";

const ACCOUNTS_BASE_URL = "https://accounts.unyc.io";
const ATLAS_LOGIN_URL = process.env.ATLAS_IP_LINKS_URL || "https://atlas.unyc.io/lien";
const ATLAS_USERNAME = process.env.ATLAS_USERNAME || "";
const ATLAS_PASSWORD = process.env.ATLAS_PASSWORD || "";
const ATLAS_TOTP_URI = process.env.ATLAS_TOTP_URI || "";
const SYNC_INTERVAL_MS = 3 * 60 * 1000;
const TEL_PRO_FACTOR_LABEL = "Tél pro";

type LinkHealthStatus = "connected" | "disconnected";

type AtlasLink = {
  id: number;
  reference: string;
  clientName: string;
  type: string;
  maxBandwidth: string;
  gtr: string | null;
  backup4g: boolean;
  firewall: boolean;
  collecteOperator: string | null;
  stateLabel: string;
  healthStatus: LinkHealthStatus | null;
  healthLabel: "OK" | "KO" | "Non supervisé";
};

type IpLinksStats = {
  total: number;
  connected: number;
  disconnected: number;
  ignored: number;
  lastSyncedAt: string | null;
};

type IpLinksSnapshot = {
  items: AtlasLink[];
  stats: IpLinksStats;
};

let syncTimer: NodeJS.Timeout | null = null;
let latestSnapshot: IpLinksSnapshot = {
  items: [],
  stats: {
    total: 0,
    connected: 0,
    disconnected: 0,
    ignored: 0,
    lastSyncedAt: null,
  },
};
let syncInFlight: Promise<IpLinksSnapshot> | null = null;

function requireAtlasConfig() {
  if (!ATLAS_USERNAME || !ATLAS_PASSWORD || !ATLAS_TOTP_URI) {
    throw new Error(
      "Atlas IP links credentials are not fully configured. Set ATLAS_USERNAME, ATLAS_PASSWORD and ATLAS_TOTP_URI."
    );
  }
}

function decodeHtml(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeFormAction(value: string): string {
  const decoded = value
    .replace(/&amp;/g, "&")
    .replace(/&#x2F;/g, "/")
    .trim();

  if (decoded.startsWith("http")) return decoded;
  if (decoded.startsWith("/")) return `${ACCOUNTS_BASE_URL}${decoded}`;
  return `${ACCOUNTS_BASE_URL}/${decoded}`;
}

function extractFormAction(html: string): string {
  const match = html.match(/<form[^>]*action="([^"]+)"/i);
  if (!match) {
    throw new Error("Impossible de trouver le formulaire Atlas attendu");
  }
  return decodeFormAction(match[1]);
}

function extractTelProCredentialId(html: string): string {
  const radioRegex = /<input[^>]*name="selectedCredentialId"[^>]*value="([^"]+)"[^>]*>[\s\S]*?<label[^>]*>([\s\S]*?)<\/label>/gi;
  let match: RegExpExecArray | null;

  while ((match = radioRegex.exec(html)) !== null) {
    const label = decodeHtml(match[2]);
    if (label.includes(TEL_PRO_FACTOR_LABEL)) {
      return match[1];
    }
  }

  const checkedMatch = html.match(/<input[^>]*name="selectedCredentialId"[^>]*value="([^"]+)"[^>]*checked/i);
  if (checkedMatch) return checkedMatch[1];

  throw new Error("Impossible de trouver le facteur TOTP Tél pro dans Atlas");
}

function toBoolFromNullableLabel(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized !== "" && normalized !== "non" && normalized !== "false";
  }
  return true;
}

function parseProvider(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.trim();
  return cleaned ? cleaned : null;
}

function parseHealth(raw: unknown): { status: LinkHealthStatus | null; label: AtlasLink["healthLabel"] } {
  if (raw === 1 || raw === "1") {
    return { status: "connected", label: "OK" };
  }
  if (raw === 0 || raw === "0") {
    return { status: "disconnected", label: "KO" };
  }
  return { status: null, label: "Non supervisé" };
}

function createBase32Buffer(secret: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = secret.replace(/=+$/, "").toUpperCase();
  let bits = "";

  for (const char of cleaned) {
    const value = alphabet.indexOf(char);
    if (value === -1) {
      throw new Error("Invalid base32 secret");
    }
    bits += value.toString(2).padStart(5, "0");
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  }

  return Buffer.from(bytes);
}

function generateTotpCodeSafe(uri: string): string {
  const parsed = new URL(uri);
  const secret = parsed.searchParams.get("secret");
  const digits = Number(parsed.searchParams.get("digits") || 6);
  const period = Number(parsed.searchParams.get("period") || 30);
  const algorithm = (parsed.searchParams.get("algorithm") || "SHA1").toLowerCase();

  if (!secret) throw new Error("Missing TOTP secret in ATLAS_TOTP_URI");

  const crypto = require("crypto") as typeof import("crypto");
  const key = createBase32Buffer(secret);
  const counter = Math.floor(Date.now() / 1000 / period);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac(algorithm, key).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(code % 10 ** digits).padStart(digits, "0");
}

async function createAtlasClient() {
  const jar = new CookieJar();
  const client = wrapper(
    axios.create({
      jar,
      withCredentials: true,
      maxRedirects: 10,
      timeout: 60000,
      validateStatus: (status) => status >= 200 && status < 400,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
      },
    })
  );

  return { client, jar };
}

async function authenticateAtlasSession() {
  requireAtlasConfig();
  const { client, jar } = await createAtlasClient();

  const initialResponse = await client.get(ATLAS_LOGIN_URL);
  const loginAction = extractFormAction(String(initialResponse.data));

  const loginResponse = await client.post(
    loginAction,
    new URLSearchParams({
      username: ATLAS_USERNAME,
      password: ATLAS_PASSWORD,
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  const totpHtml = String(loginResponse.data);
  const totpAction = extractFormAction(totpHtml);
  const selectedCredentialId = extractTelProCredentialId(totpHtml);
  const totpCode = generateTotpCodeSafe(ATLAS_TOTP_URI);

  const totpResponse = await client.post(
    totpAction,
    new URLSearchParams({
      selectedCredentialId,
      otp: totpCode,
      login: "Connexion",
    }),
    {
      maxRedirects: 0,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      validateStatus: (status) => status >= 200 && status < 400,
    }
  );

  const redirectLocation = totpResponse.headers.location;
  if (!redirectLocation) {
    throw new Error("Connexion Atlas incomplète après validation TOTP");
  }

  await client.get(redirectLocation);
  const landingResponse = await client.get(ATLAS_LOGIN_URL);
  if (!String(landingResponse.data).includes("Parc de liens IP")) {
    throw new Error("Session Atlas non établie après authentification");
  }

  return { client, jar };
}

async function fetchAllAtlasLinks(): Promise<AtlasLink[]> {
  const { client } = await authenticateAtlasSession();
  const items: AtlasLink[] = [];
  const pageSize = 500;
  let draw = 1;
  let start = 0;
  let totalRecords = Number.POSITIVE_INFINITY;

  while (start < totalRecords) {
    const response = await client.post(
      `${ATLAS_LOGIN_URL}/parc`,
      new URLSearchParams({
        draw: String(draw),
        start: String(start),
        length: String(pageSize),
        state: "",
        fromCustomer: "",
        health: "",
        provider: "",
        type: "",
        backup_option: "",
        firewall_option: "",
        owner_id: "",
        customer_reference: "",
        nd_supplementaire: "",
        "search[value]": "",
        "search[regex]": "false",
      }),
      {
        maxRedirects: 0,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
        },
        validateStatus: (status) => status >= 200 && status < 400,
      }
    );

    if (typeof response.data === "string") {
      throw new Error("Atlas a renvoyé du HTML au lieu du JSON pour /lien/parc");
    }

    const rows = Array.isArray(response.data?.data) ? response.data.data : [];
    totalRecords = Number(response.data?.recordsFiltered ?? response.data?.recordsTotal ?? rows.length ?? 0);

    for (const row of rows) {
      const health = parseHealth(row.sante);
      items.push({
        id: Number(row.id ?? row.lienIp_id ?? 0),
        reference: decodeHtml(row.reference || row.lienIp_name),
        clientName: decodeHtml(
          row.client_name ||
            row.site_installation ||
            row.client?.name ||
            row.client_info_general_raison_social ||
            row.owner_label ||
            ""
        ),
        type: decodeHtml(row.lienIp_type_lien),
        maxBandwidth: decodeHtml(
          row.lienIp_offre_debit != null
            ? `${row.lienIp_offre_debit}M${row.lienIp_offre_debit_garanti === 0 ? " (Max)" : ""}${
                row.lienIp_offre_nb_paires && row.lienIp_type_lien === "SDSL"
                  ? ` - ${row.lienIp_offre_nb_paires}p`
                  : ""
              }`
            : ""
        ),
        gtr: decodeHtml(row.lienIp_gtr) || null,
        backup4g: toBoolFromNullableLabel(row.backup_option_label),
        firewall: toBoolFromNullableLabel(row.firewall_option_label),
        collecteOperator: parseProvider(row.lienIp_offre_fournisseur),
        stateLabel: decodeHtml(row.lienIp_etat || row.state || ""),
        healthStatus: health.status,
        healthLabel: health.label,
      });
    }

    if (rows.length === 0) break;
    start += rows.length;
    draw += 1;
  }

  return items.filter(
    (item) =>
      item.reference &&
      item.stateLabel.toLowerCase() !== "annulé" &&
      item.stateLabel.toLowerCase() !== "resilié"
  );
}

function buildSnapshot(items: AtlasLink[]): IpLinksSnapshot {
  const connected = items.filter((item) => item.healthStatus === "connected").length;
  const disconnected = items.filter((item) => item.healthStatus === "disconnected").length;
  const ignored = items.filter((item) => item.healthStatus === null).length;

  return {
    items,
    stats: {
      total: items.length,
      connected,
      disconnected,
      ignored,
      lastSyncedAt: new Date().toISOString(),
    },
  };
}

async function ensureActivityLog() {
  try {
    await prisma.activityLog.create({
      data: {
        action: "SYNC_IP_LINKS",
        details: `Synced ${latestSnapshot.stats.total} IP links (${latestSnapshot.stats.connected} connected, ${latestSnapshot.stats.disconnected} disconnected, ${latestSnapshot.stats.ignored} ignored)`
      }
    });
  } catch (error) {
    console.warn("Could not persist IP links activity log", error);
  }
}

export async function syncIpLinks(): Promise<IpLinksSnapshot> {
  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    const items = await fetchAllAtlasLinks();
    latestSnapshot = buildSnapshot(items);
    await ensureActivityLog();
    return latestSnapshot;
  })();

  try {
    return await syncInFlight;
  } finally {
    syncInFlight = null;
  }
}

export function getIpLinksSnapshot(): IpLinksSnapshot {
  return latestSnapshot;
}

export function startIpLinksSyncJob() {
  if (syncTimer) return;

  syncIpLinks().catch((error) => {
    console.error("Initial IP links sync failed:", error);
  });

  syncTimer = setInterval(() => {
    syncIpLinks().catch((error) => {
      console.error("Scheduled IP links sync failed:", error);
    });
  }, SYNC_INTERVAL_MS);
}
