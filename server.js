// server/index.ts
import express from "express";
import path3 from "path";
import fs3 from "fs";
import { fileURLToPath } from "url";

// server/config.ts
import dotenv from "dotenv";
dotenv.config();
var directusUrl = (process.env.DIRECTUS_URL || "https://api.alphadesk.ir").trim();
var directusAdminToken = (process.env.DIRECTUS_ADMIN_TOKEN || "").trim();
var latestAccessToken = "";
function setLatestAccessToken(token) {
  if (token && typeof token === "string" && token.trim()) {
    latestAccessToken = token.trim();
  }
}
function resolvePort() {
  for (let i = 0; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === "--port" && process.argv[i + 1]) {
      const val = parseInt(process.argv[i + 1], 10);
      if (!isNaN(val) && val > 0) return val;
    }
    if (arg.startsWith("--port=")) {
      const val = parseInt(arg.slice("--port=".length), 10);
      if (!isNaN(val) && val > 0) return val;
    }
  }
  if (process.env.NODE_ENV !== "production") {
    const defaultAppPort = process.env.DEFAULT_APP_PORT ? parseInt(process.env.DEFAULT_APP_PORT.trim(), 10) : 3e3;
    const envPort = process.env.PORT ? process.env.PORT.trim() : "";
    const nginxPort = process.env.NGINX_PORT ? process.env.NGINX_PORT.trim() : "";
    if (!envPort || nginxPort && envPort === nginxPort) {
      return !isNaN(defaultAppPort) && defaultAppPort > 0 ? defaultAppPort : 3e3;
    }
  }
  const parsedPort = process.env.PORT ? parseInt(process.env.PORT.trim(), 10) : 3e3;
  return !isNaN(parsedPort) && parsedPort > 0 ? parsedPort : 3e3;
}
var PORT = resolvePort();
var DIRECTUS_ADMIN_ROLE_IDS = [
  "59e261e1-56f4-401e-9889-4971e2c3c4ce"
];
var DIRECTUS_ADMIN_ROLE_ID = "59e261e1-56f4-401e-9889-4971e2c3c4ce";
var DIRECTUS_STAFF_ROLE_ID = "a45beaec-0272-4c29-89ee-122dce37f565";
var initialPersonnel = [
  {
    id: "p-1",
    name: "\u0645\u062D\u0645\u062F\u0631\u0636\u0627 \u06A9\u06CC\u0627\u0646\u06CC",
    username: "kiani",
    role: "admin",
    email: "kiani@company.ir",
    phone: "09121112233",
    status: "active",
    active: true,
    avatar: ""
  },
  {
    id: "p-2",
    name: "\u0633\u0627\u0631\u0627 \u0627\u062D\u0645\u062F\u06CC",
    username: "sara_ahmadi",
    role: "marketer",
    email: "sara.ahmadi@company.ir",
    phone: "09123456789",
    status: "active",
    active: true,
    avatar: ""
  },
  {
    id: "p-3",
    name: "\u0639\u0644\u06CC\u0631\u0636\u0627 \u062D\u0633\u06CC\u0646\u06CC",
    username: "hosseini",
    role: "marketer",
    email: "hosseini@company.ir",
    phone: "09351234567",
    status: "active",
    active: true,
    avatar: ""
  },
  {
    id: "p-4",
    name: "\u0645\u0647\u062F\u06CC \u0632\u0645\u0627\u0646\u06CC",
    username: "zamani",
    role: "sales_manager",
    email: "zamani@company.ir",
    phone: "09197654321",
    status: "active",
    active: true,
    avatar: ""
  }
];
var now = /* @__PURE__ */ new Date();
var addDays = (d, days) => {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result.toISOString();
};
var initialCustomers = [
  {
    id: "c-101",
    company_name: "\u0634\u0631\u06A9\u062A \u062A\u062C\u0627\u0631\u062A \u0627\u0644\u06A9\u062A\u0631\u0648\u0646\u06CC\u06A9 \u0633\u067E\u0647\u0631",
    business_type: "\u0641\u0631\u0648\u0634 \u062A\u062C\u0647\u06CC\u0632\u0627\u062A \u0635\u0646\u0639\u062A\u06CC \u0648 \u0634\u0628\u06A9\u0647",
    province: "\u062A\u0647\u0631\u0627\u0646",
    city: "\u062A\u0647\u0631\u0627\u0646",
    manager_name: "\u0645\u0647\u0646\u062F\u0633 \u06A9\u0627\u0645\u0631\u0627\u0646 \u0631\u0633\u062A\u0645\u06CC",
    manager_phones: ["09121234567", "02188776655"],
    negotiator_name: "\u0633\u0627\u0631\u0627 \u0627\u062D\u0645\u062F\u06CC",
    negotiator_phones: ["09123456789"],
    mobile_numbers: ["09121234567", "09359876543"],
    landline_numbers: ["02188776655", "02188776656"],
    telegram_phone: "09121234567",
    telegram_ids: ["sepehr_trade", "kamran_rostami"],
    instagram_ids: ["sepehr.industrial"],
    emails: ["info@sepehr-trade.ir", "k.rostami@sepehr-trade.ir"],
    websites: ["https://sepehr-trade.ir", "https://shop.sepehr-trade.ir"],
    is_ecommerce: true,
    interview_status: "\u0645\u0634\u062A\u0627\u0642 \u0648 \u0645\u0633\u062A\u0639\u062F",
    interview_report: "\u062C\u0644\u0633\u0647 \u0627\u0648\u0644 \u062A\u0644\u0641\u0646\u06CC \u0628\u0633\u06CC\u0627\u0631 \u0645\u062B\u0628\u062A \u0628\u0648\u062F. \u0646\u06CC\u0627\u0632 \u0645\u0628\u0631\u0645 \u0628\u0647 \u0633\u06CC\u0633\u062A\u0645 \u0641\u0631\u0648\u0634 \u06CC\u06A9\u067E\u0627\u0631\u0686\u0647 \u062F\u0627\u0631\u0646\u062F \u0648 \u0628\u0648\u062F\u062C\u0647 \u0628\u0631\u0627\u06CC \u0642\u0631\u0627\u0631\u062F\u0627\u062F \u0633\u0627\u0644\u0627\u0646\u0647 \u0631\u0627 \u062A\u0623\u06CC\u06CC\u062F \u06A9\u0631\u062F\u0646\u062F.",
    interview_score: 9,
    next_followup_date: addDays(now, 2),
    assigned_marketer_id: "p-2",
    assigned_marketer_name: "\u0633\u0627\u0631\u0627 \u0627\u062D\u0645\u062F\u06CC",
    assignment_deadline: addDays(now, 4),
    assignment_duration_days: 7,
    status: "\u067E\u06CC\u0634 \u0646\u0648\u06CC\u0633 \u0642\u0631\u0627\u0631\u062F\u0627\u062F",
    date_created: addDays(now, -3),
    date_updated: addDays(now, -1)
  },
  {
    id: "c-102",
    company_name: "\u0641\u0631\u0648\u0634\u06AF\u0627\u0647 \u0622\u0646\u0644\u0627\u06CC\u0646 \u0622\u0648\u06CC\u0646\u0627\u0645\u062F",
    business_type: "\u067E\u0648\u0634\u0627\u06A9 \u0648 \u0627\u06A9\u0633\u0633\u0648\u0631\u06CC \u0632\u0646\u0627\u0646\u0647",
    province: "\u0627\u0635\u0641\u0647\u0627\u0646",
    city: "\u0627\u0635\u0641\u0647\u0627\u0646",
    manager_name: "\u062E\u0627\u0646\u0645 \u0628\u0647\u0627\u0631\u0647 \u0633\u0647\u0631\u0627\u0628\u06CC",
    manager_phones: ["09132223344"],
    negotiator_name: "\u0639\u0644\u06CC\u0631\u0636\u0627 \u062D\u0633\u06CC\u0646\u06CC",
    negotiator_phones: ["09351234567"],
    mobile_numbers: ["09132223344"],
    landline_numbers: ["03136654321"],
    telegram_phone: "09132223344",
    telegram_ids: ["avina_mode_admin"],
    instagram_ids: ["avinamode_official"],
    emails: ["support@avinamode.com"],
    websites: ["https://avinamode.com"],
    is_ecommerce: true,
    interview_status: "\u0646\u06CC\u0627\u0632 \u0628\u0647 \u0645\u0634\u0627\u0648\u0631\u0647 \u062A\u06A9\u0645\u06CC\u0644\u06CC",
    interview_report: "\u0633\u0627\u06CC\u062A \u0628\u0627 \u062A\u0631\u0627\u0641\u06CC\u06A9 \u0628\u0627\u0644\u0627 \u062F\u0627\u0631\u0646\u062F \u0627\u0645\u0627 \u062F\u0631 \u0627\u062A\u0635\u0627\u0644 \u0628\u0647 \u0627\u0646\u0628\u0627\u0631\u062F\u0627\u0631\u06CC \u0645\u0634\u06A9\u0644 \u062F\u0627\u0631\u0646\u062F. \u0642\u0631\u0627\u0631 \u0634\u062F \u067E\u06CC\u0634\u200C\u0646\u0648\u06CC\u0633 \u0637\u0631\u062D \u0628\u0627\u0632\u0627\u0631\u06CC\u0627\u0628\u06CC \u0628\u0631\u0627\u0634\u0648\u0646 \u0627\u0631\u0633\u0627\u0644 \u0628\u0634\u0647.",
    interview_score: 7,
    next_followup_date: addDays(now, 1),
    assigned_marketer_id: "p-3",
    assigned_marketer_name: "\u0639\u0644\u06CC\u0631\u0636\u0627 \u062D\u0633\u06CC\u0646\u06CC",
    assignment_deadline: addDays(now, -1),
    assignment_duration_days: 7,
    status: "\u067E\u06CC\u06AF\u06CC\u0631\u06CC \u0642\u0628\u0644 \u0627\u0632 \u0627\u0646\u0642\u0636\u0627",
    date_created: addDays(now, -8),
    date_updated: addDays(now, -2)
  }
];
var initialReports = [
  {
    id: "rep-1",
    customer_id: "c-101",
    negotiator_name: "\u0633\u0627\u0631\u0627 \u0627\u062D\u0645\u062F\u06CC",
    negotiation_phone: "09121234567",
    report_text: "\u0628\u0627 \u0622\u0642\u0627\u06CC \u0631\u0633\u062A\u0645\u06CC \u0635\u062D\u0628\u062A \u0634\u062F. \u067E\u06CC\u0634\u200C\u0641\u0627\u06A9\u062A\u0648\u0631 \u0627\u0631\u0633\u0627\u0644 \u0634\u062F\u0647 \u0628\u0631\u0631\u0633\u06CC \u0634\u062F \u0648 \u0645\u0648\u0627\u0641\u0642\u062A \u0627\u0648\u0644\u06CC\u0647 \u0635\u0648\u0631\u062A \u06AF\u0631\u0641\u062A. \u062C\u0644\u0633\u0647 \u062D\u0636\u0648\u0631\u06CC \u0628\u0631\u0627\u06CC \u0646\u0647\u0627\u06CC\u06CC \u06A9\u0631\u062F\u0646 \u0642\u0631\u0627\u0631\u062F\u0627\u062F \u062A\u0646\u0638\u06CC\u0645 \u0634\u062F.",
    negotiation_score: 9,
    next_followup_date: addDays(now, 2),
    negotiation_status: "\u067E\u06CC\u0634 \u0646\u0648\u06CC\u0633 \u0642\u0631\u0627\u0631\u062F\u0627\u062F",
    created_by: "p-2",
    date_created: addDays(now, -1),
    contract_amount: 45e6
  }
];
var initialColdLeads = [
  {
    id: "lead-1",
    phone_number: "09129998877",
    contact_name: "\u0622\u0642\u0627\u06CC \u0634\u0631\u06CC\u0641\u06CC (\u062A\u0648\u0644\u06CC\u062F\u06CC \u067E\u0648\u0634\u0627\u06A9)",
    source: "\u0646\u0645\u0627\u06CC\u0634\u06AF\u0627\u0647 \u0628\u06CC\u0646\u200C\u0627\u0644\u0645\u0644\u0644\u06CC",
    status: "\u062F\u0631 \u062D\u0627\u0644 \u0628\u0631\u0631\u0633\u06CC",
    notes: "\u0645\u0627\u06CC\u0644 \u0628\u0647 \u062F\u0631\u06CC\u0627\u0641\u062A \u067E\u0631\u0648\u067E\u0648\u0632\u0627\u0644 \u062F\u06CC\u062C\u06CC\u062A\u0627\u0644 \u0645\u0627\u0631\u06A9\u062A\u06CC\u0646\u06AF \u0647\u0633\u062A\u0646\u062F.",
    assigned_to: "\u0633\u0627\u0631\u0627 \u0627\u062D\u0645\u062F\u06CC",
    assigned_to_id: "p-2",
    assigned_to_name: "\u0633\u0627\u0631\u0627 \u0627\u062D\u0645\u062F\u06CC",
    date_created: addDays(now, -2)
  }
];
var initialContacts = [
  {
    id: "cnt-101-1",
    customer_id: "c-101",
    channel_type: "mobile",
    value: "09121234567",
    normalized_value: "09121234567",
    contact_name: "\u06A9\u0627\u0645\u0631\u0627\u0646 \u0631\u0633\u062A\u0645\u06CC",
    contact_role: "\u0645\u062F\u06CC\u0631\u0639\u0627\u0645\u0644",
    is_primary: true,
    date_created: addDays(now, -3),
    date_updated: addDays(now, -3)
  }
];
var initialSalaryConfigs = [];
var initialPayrollSlips = [];
var initialPayrollAdjustments = [];
var personnelData = [...initialPersonnel];
var customersData = [...initialCustomers];
var reportsData = [...initialReports];
var coldLeadsData = [...initialColdLeads];
var contactsData = [...initialContacts];
var leaveRequestsData = [];
var advanceRequestsData = [];
var salaryConfigsData = [...initialSalaryConfigs];
var payrollSlipsData = [...initialPayrollSlips];
var payrollAdjustmentsData = [...initialPayrollAdjustments];
function setPersonnelData(data) {
  personnelData = data;
}
function setCustomersData(data) {
  customersData = data;
}
function setReportsData(data) {
  reportsData = data;
}
function setColdLeadsData(data) {
  coldLeadsData = data;
}
function setContactsData(data) {
  contactsData = data;
}
var tenantsData = [
  {
    id: "default",
    name: "\u0633\u0627\u0632\u0645\u0627\u0646 \u0645\u0631\u06A9\u0632\u06CC \u0622\u0644\u0641\u0627\u062F\u0633\u06A9",
    slug: "alphadesk-hq",
    phone: "021-88888888",
    address: "\u062A\u0647\u0631\u0627\u0646\u060C \u0645\u06CC\u062F\u0627\u0646 \u0648\u0646\u06A9\u060C \u0628\u0631\u062C \u0646\u06AF\u0627\u0631\u060C \u0637\u0628\u0642\u0647 \u06F1\u06F0",
    description: "\u0633\u0627\u0632\u0645\u0627\u0646 \u0645\u0631\u06A9\u0632\u06CC \u0648 \u067E\u06CC\u0634\u200C\u0641\u0631\u0636 \u0633\u0627\u0645\u0627\u0646\u0647",
    status: "active",
    date_created: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "tenant-2",
    name: "\u0634\u0639\u0628\u0647 \u0628\u0627\u0632\u0631\u06AF\u0627\u0646\u06CC \u0648 \u0641\u0631\u0648\u0634 \u0622\u0631\u06CC\u0627",
    slug: "arya-trading",
    phone: "021-77777777",
    address: "\u0627\u0635\u0641\u0647\u0627\u0646\u060C \u062E\u06CC\u0627\u0628\u0627\u0646 \u0686\u0647\u0627\u0631\u0628\u0627\u063A \u0628\u0627\u0644\u0627",
    description: "\u0634\u0639\u0628\u0647 \u0628\u0627\u0632\u0631\u06AF\u0627\u0646\u06CC \u0648 \u0641\u0631\u0648\u0634",
    status: "active",
    date_created: "2026-02-01T00:00:00.000Z"
  }
];
function setTenantsData(data) {
  tenantsData = data;
}
var projectSettingsData = {
  id: 1,
  ippanel_api: "",
  ippanel_sender: "+983000505",
  ippanel_line_number: "+983000505",
  free_customers_claim_limit: 20
};
function updateProjectSettingsData(patch) {
  projectSettingsData = { ...projectSettingsData, ...patch };
}
var tenantSettingsMap = /* @__PURE__ */ new Map([
  ["default", { id: "ts-default", tenant_id: "default", sms_phones: ["09121112233"] }]
]);
var globalSessionRevocationTimestamp = 0;
function setGlobalSessionRevocationTimestamp(ts) {
  globalSessionRevocationTimestamp = ts;
}

// server/directus/client.ts
function isDirectusCircuitOpen() {
  return false;
}
async function probeDirectusConnection(timeoutMs = 2e3) {
  return true;
}
async function directusFetch(path4, options = {}, retries = 2, timeoutMs = 4500) {
  if (!directusUrl) {
    throw new Error("DIRECTUS_URL_NOT_CONFIGURED");
  }
  const cleanUrl = directusUrl.replace(/\/$/, "");
  const url = `${cleanUrl}${path4.startsWith("/") ? path4 : "/" + path4}`;
  const headers = {
    "Content-Type": "application/json",
    ...options.headers || {}
  };
  const tokenToUse = directusAdminToken || latestAccessToken;
  if (tokenToUse && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${tokenToUse}`;
  }
  const isFastPath = path4.includes("/auth/login") || path4.includes("/server/ping") || path4.includes("/users/me");
  const effectiveTimeout = isFastPath ? Math.min(timeoutMs, 3e3) : timeoutMs;
  const effectiveRetries = retries;
  for (let attempt = 0; attempt <= effectiveRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), effectiveTimeout);
      const res = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const errorText = await res.text();
        let parsedMessage = errorText;
        try {
          const errJson = JSON.parse(errorText);
          if (errJson.errors && Array.isArray(errJson.errors) && errJson.errors[0]?.message) {
            parsedMessage = errJson.errors[0].message;
          }
        } catch {
        }
        const isPressureOrRateLimit = res.status === 503 || res.status === 429 || res.status === 502 || res.status === 504 || parsedMessage.includes("Under pressure") || parsedMessage.includes("unavailable") || parsedMessage.includes("rate limit");
        if (isPressureOrRateLimit && attempt < effectiveRetries) {
          const backoffMs = 500 * Math.pow(2, attempt) + Math.random() * 200;
          await new Promise((r) => setTimeout(r, backoffMs));
          continue;
        }
        throw new Error(parsedMessage);
      }
      if (res.status === 204) {
        return { success: true };
      }
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        return await res.json();
      }
      const text = await res.text();
      return { data: text, text };
    } catch (err) {
      if (attempt < effectiveRetries) {
        const backoffMs = 400 * Math.pow(2, attempt) + Math.random() * 200;
        await new Promise((r) => setTimeout(r, backoffMs));
        continue;
      }
      throw err;
    }
  }
}
async function directusFetchAllPages(basePath, options = {}, maxTotal = 5e4) {
  const PAGE_SIZE = 500;
  const [pathOnly, queryString] = basePath.split("?");
  const params = new URLSearchParams(queryString || "");
  params.set("limit", String(PAGE_SIZE));
  if (!params.has("page")) params.set("page", "1");
  if (!params.has("meta")) params.set("meta", "*");
  const page1Url = `${pathOnly}?${params.toString()}`;
  const page1Res = await directusFetch(page1Url, options).catch(() => null);
  if (!page1Res || !Array.isArray(page1Res.data)) {
    return { data: page1Res?.data || [], meta: page1Res?.meta };
  }
  const allItems = [...page1Res.data];
  const totalCount = page1Res.meta?.filter_count ?? page1Res.meta?.total_count ?? page1Res.data.length;
  const targetCount = Math.min(totalCount, maxTotal);
  if (targetCount > page1Res.data.length && page1Res.data.length > 0) {
    const totalPages = Math.ceil(targetCount / PAGE_SIZE);
    const CONCURRENCY = 6;
    for (let p = 2; p <= totalPages; p += CONCURRENCY) {
      const pagePromises = [];
      for (let cp = p; cp < p + CONCURRENCY && cp <= totalPages; cp++) {
        const pParams = new URLSearchParams(queryString || "");
        pParams.set("limit", String(PAGE_SIZE));
        pParams.set("page", String(cp));
        if (!pParams.has("meta")) pParams.set("meta", "*");
        const pUrl = `${pathOnly}?${pParams.toString()}`;
        pagePromises.push(directusFetch(pUrl, options, 2).catch(() => null));
      }
      const batchRes = await Promise.all(pagePromises);
      for (const res of batchRes) {
        if (res && Array.isArray(res.data)) {
          allItems.push(...res.data);
        }
      }
    }
  }
  return {
    data: allItems,
    meta: {
      total_count: totalCount || allItems.length,
      filter_count: totalCount || allItems.length
    }
  };
}
function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
async function directusSafeBatchInsert(collection, items, chunkSize = 50) {
  if (!items || items.length === 0) return [];
  const inserted = [];
  const chunks = chunkArray(items, chunkSize);
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (i > 0) await new Promise((r) => setTimeout(r, 15));
    try {
      const res = await directusFetch(
        `/items/${collection}`,
        {
          method: "POST",
          body: JSON.stringify(chunk)
        },
        3
      );
      if (res && Array.isArray(res.data)) {
        inserted.push(...res.data);
      } else if (res && res.data) {
        inserted.push(res.data);
      }
    } catch (err) {
      console.warn(
        `Chunk insert failed for ${collection} (size ${chunk.length}): ${err.message}. Retrying in sub-chunks...`
      );
      const subChunks = chunkArray(chunk, 10);
      for (const sub of subChunks) {
        try {
          const subRes = await directusFetch(
            `/items/${collection}`,
            {
              method: "POST",
              body: JSON.stringify(sub)
            },
            2
          );
          if (subRes && Array.isArray(subRes.data)) {
            inserted.push(...subRes.data);
          } else if (subRes && subRes.data) {
            inserted.push(subRes.data);
          }
        } catch (subErr) {
          console.warn(
            `Sub-chunk failed for ${collection}, falling back to single item inserts: ${subErr.message}`
          );
          for (const item of sub) {
            try {
              await new Promise((r) => setTimeout(r, 10));
              const singleRes = await directusFetch(
                `/items/${collection}`,
                {
                  method: "POST",
                  body: JSON.stringify(item)
                },
                1
              );
              if (singleRes && singleRes.data) {
                inserted.push(singleRes.data);
              }
            } catch (singleErr) {
              console.error(`Failed to insert single item into ${collection}:`, singleErr.message);
            }
          }
        }
      }
    }
  }
  return inserted;
}
async function directusSafeBatchPatch(collection, patchMap, chunkSize = 50) {
  if (patchMap.size === 0) return;
  const cleanCollection = collection.replace(/^\/?items\//, "").replace(/^\//, "");
  const items = Array.from(patchMap.values());
  const chunks = chunkArray(items, chunkSize);
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (i > 0) await new Promise((r) => setTimeout(r, 40));
    try {
      await directusFetch(
        `/items/${cleanCollection}`,
        {
          method: "PATCH",
          body: JSON.stringify(chunk)
        },
        2
      );
      continue;
    } catch {
    }
    await Promise.all(
      chunk.map(async (c) => {
        try {
          await directusFetch(
            `/items/${cleanCollection}/${c.id}`,
            {
              method: "PATCH",
              body: JSON.stringify(c)
            },
            3
          );
        } catch (err) {
          console.warn(`Failed to patch item ${c.id} in ${cleanCollection}:`, err.message);
        }
      })
    );
  }
}

// server/directus/sync.ts
import crypto from "crypto";

// server/directus/cache.ts
var customersCache = null;
var customersCacheInFlight = null;
var reportsCache = null;
var CACHE_TTL_MS = 3e5;
function invalidateCustomersCache() {
  customersCache = null;
  customersCacheInFlight = null;
}
function upsertCustomerInCache(customer) {
  if (!customer || !customer.id || !customersCache || !Array.isArray(customersCache.data)) return;
  const targetId = String(customer.id);
  const idx = customersCache.data.findIndex((c) => c && String(c.id) === targetId);
  if (idx >= 0) {
    customersCache.data[idx] = { ...customersCache.data[idx], ...customer };
  } else {
    customersCache.data.unshift(customer);
  }
  customersCache.meta = { total_count: customersCache.data.length };
}
function removeCustomerFromCache(customerId) {
  if (!customerId || !customersCache || !Array.isArray(customersCache.data)) return;
  const targetId = String(customerId);
  customersCache.data = customersCache.data.filter((c) => c && String(c.id) !== targetId);
  customersCache.meta = { total_count: customersCache.data.length };
}
function invalidateReportsCache() {
  reportsCache = null;
}
async function ensureCustomersCache(forceRefresh = false) {
  const now2 = Date.now();
  if (!forceRefresh && customersCache && now2 - customersCache.timestamp < CACHE_TTL_MS) {
    return customersCache.data;
  }
  if (!forceRefresh && customersCacheInFlight) {
    return customersCacheInFlight;
  }
  const refreshPromise = (async () => {
    const res = await directusFetchAllPages("/items/customers?sort=-date_created", {}, 5e4).catch(() => null);
    const items = res?.data || [];
    if (items && items.length > 0) {
      customersCache = {
        timestamp: Date.now(),
        data: items,
        meta: { total_count: items.length }
      };
      return items;
    }
    return customersCache?.data || customersData;
  })().finally(() => {
    if (customersCacheInFlight === refreshPromise) {
      customersCacheInFlight = null;
    }
  });
  customersCacheInFlight = refreshPromise;
  return refreshPromise;
}
async function ensureReportsCache(forceRefresh = false) {
  const now2 = Date.now();
  if (!forceRefresh && reportsCache && now2 - reportsCache.timestamp < CACHE_TTL_MS) {
    return reportsCache.data;
  }
  const res = await directusFetch("/items/customer_reports?limit=500&sort=-date_created").catch(() => null);
  const items = res?.data || [];
  if (items && items.length > 0) {
    reportsCache = {
      timestamp: Date.now(),
      data: items,
      meta: { total_count: items.length }
    };
    return items;
  }
  return reportsCache?.data || reportsData;
}
function computeCustomerExpiration(c) {
  if (!c) return c;
  const isExpired = Boolean(
    c.assignment_deadline && c.status !== "\u0642\u0631\u0627\u0631\u062F\u0627\u062F" && c.status !== "\u0644\u06CC\u0633\u062A \u0633\u06CC\u0627\u0647" && (/* @__PURE__ */ new Date()).getTime() > new Date(c.assignment_deadline).getTime()
  );
  const rawTenant = c.tenant_id;
  const tId = typeof rawTenant === "object" && rawTenant !== null ? String(rawTenant.id) : rawTenant !== null && rawTenant !== void 0 ? String(rawTenant) : "default";
  const tObj = tenantsData.find((t) => String(t.id) === tId || t.slug === tId);
  const contacts = Array.isArray(c.contacts) ? c.contacts : [];
  const rawMobiles = Array.isArray(c.mobile_numbers) ? c.mobile_numbers : typeof c.mobile_numbers === "string" ? [c.mobile_numbers] : [];
  const mobileNumbers = rawMobiles.length > 0 ? rawMobiles : contacts.filter((ct) => ct.channel_type === "mobile").map((ct) => ct.normalized_value || ct.value);
  const rawLandlines = Array.isArray(c.landline_numbers) ? c.landline_numbers : typeof c.landline_numbers === "string" ? [c.landline_numbers] : [];
  const landlineNumbers = rawLandlines.length > 0 ? rawLandlines : contacts.filter((ct) => ct.channel_type === "landline").map((ct) => ct.normalized_value || ct.value);
  const rawTelegram = Array.isArray(c.telegram_ids) ? c.telegram_ids : typeof c.telegram_ids === "string" ? [c.telegram_ids] : [];
  const telegramIds = rawTelegram.length > 0 ? rawTelegram : contacts.filter((ct) => ct.channel_type === "telegram").map((ct) => ct.value);
  const rawInstagram = Array.isArray(c.instagram_ids) ? c.instagram_ids : typeof c.instagram_ids === "string" ? [c.instagram_ids] : [];
  const instagramIds = rawInstagram.length > 0 ? rawInstagram : contacts.filter((ct) => ct.channel_type === "instagram").map((ct) => ct.value);
  const rawEmails = Array.isArray(c.emails) ? c.emails : typeof c.emails === "string" ? [c.emails] : [];
  const emails = rawEmails.length > 0 ? rawEmails : contacts.filter((ct) => ct.channel_type === "email").map((ct) => ct.value);
  const rawWebsites = Array.isArray(c.websites) ? c.websites : typeof c.websites === "string" ? [c.websites] : [];
  const websites = rawWebsites.length > 0 ? rawWebsites : contacts.filter((ct) => ct.channel_type === "website").map((ct) => ct.value);
  return {
    ...c,
    company_name: c.company_name || "\u0628\u062F\u0648\u0646 \u0646\u0627\u0645",
    business_type: c.business_type || "",
    city: c.city || "\u0646\u0627\u0645\u0634\u062E\u0635",
    province: c.province || "",
    status: c.status || "\u062A\u0645\u0627\u0633 \u0628\u0631\u0642\u0631\u0627\u0631 \u0646\u0634\u062F\u0647",
    assigned_marketer_name: c.assigned_marketer_name || "\u062A\u062E\u0635\u06CC\u0635 \u0646\u06CC\u0627\u0641\u062A\u0647",
    mobile_numbers: mobileNumbers,
    landline_numbers: landlineNumbers,
    telegram_ids: telegramIds,
    instagram_ids: instagramIds,
    emails,
    websites,
    manager_phones: Array.isArray(c.manager_phones) ? c.manager_phones : typeof c.manager_phones === "string" ? [c.manager_phones] : [],
    negotiator_phones: Array.isArray(c.negotiator_phones) ? c.negotiator_phones : typeof c.negotiator_phones === "string" ? [c.negotiator_phones] : [],
    contacts,
    is_expired: isExpired,
    claimed_from_pool: Boolean(c.claimed_from_pool),
    claimed_from_pool_at: c.claimed_from_pool_at || null,
    tenant_id: tId,
    tenant_name: typeof rawTenant === "object" && rawTenant?.name || (tObj ? tObj.name : "\u0633\u0627\u0632\u0645\u0627\u0646 \u0645\u0631\u06A9\u0632\u06CC")
  };
}
function updateExpirationFlags() {
  setCustomersData(customersData.map((c) => computeCustomerExpiration(c)));
}
var activeCustomerCreationLocks = /* @__PURE__ */ new Set();
var recentCustomerCreations = [];

// server/middlewares/auth.middleware.ts
function matchesTenant(itemTenantId, activeTenantId) {
  if (!activeTenantId || activeTenantId === "all") return true;
  const itemStr = typeof itemTenantId === "object" && itemTenantId !== null ? String(itemTenantId.id) : itemTenantId !== null && itemTenantId !== void 0 ? String(itemTenantId) : "all";
  if (itemStr === "all" || itemStr === "null" || itemStr === "undefined" || itemStr === "") return true;
  if (itemStr === activeTenantId) return true;
  if (activeTenantId === "default" || activeTenantId === "1") {
    if (itemStr === "default" || itemStr === "1") return true;
    if (tenantsData.length > 0) {
      if (itemStr === String(tenantsData[0].id) || tenantsData[0].slug && itemStr === tenantsData[0].slug) {
        return true;
      }
    }
  }
  const activeTenant = tenantsData.find(
    (t) => String(t.id) === activeTenantId || t.slug === activeTenantId
  );
  if (activeTenant) {
    if (itemStr === String(activeTenant.id) || activeTenant.slug && itemStr === activeTenant.slug) {
      return true;
    }
  }
  return false;
}
function getRequestTenantId(req) {
  const headerTenant = req.headers["x-tenant-id"];
  if (headerTenant && typeof headerTenant === "string" && headerTenant.trim()) {
    return headerTenant.trim();
  }
  const queryTenant = req.query.tenant_id;
  if (queryTenant && typeof queryTenant === "string" && queryTenant.trim()) {
    return queryTenant.trim();
  }
  return "all";
}
function safeDecodeURIComponent(str) {
  if (!str) return "";
  try {
    return decodeURIComponent(str);
  } catch {
    return String(str);
  }
}
function formatAvatarUrl(avatar, reqToken) {
  if (!avatar) return void 0;
  let raw = "";
  if (typeof avatar === "object" && avatar !== null) {
    raw = avatar.id || avatar.filename_disk || avatar.filename_download || avatar.profile_image || avatar.avatar || avatar.url || "";
  } else if (typeof avatar === "string") {
    raw = avatar.trim();
  }
  if (!raw) return void 0;
  raw = raw.replace(/^["']+|["']+$/g, "").trim();
  if (!raw) return void 0;
  if (raw.startsWith("data:")) return raw;
  raw = raw.replace(/([?&])access_token=[^&]+(&|$)/, "$1").replace(/[?&]$/, "");
  let cleanId = raw;
  const directusAssetsMatch = cleanId.match(/\/assets\/([a-zA-Z0-9\-_.]+)/);
  if (directusAssetsMatch && directusAssetsMatch[1]) {
    cleanId = directusAssetsMatch[1];
  } else if (cleanId.startsWith("https://api.alphadesk.ir/assets/")) {
    cleanId = cleanId.replace("https://api.alphadesk.ir/assets/", "");
  } else if (cleanId.startsWith("http://api.alphadesk.ir/assets/")) {
    cleanId = cleanId.replace("http://api.alphadesk.ir/assets/", "");
  } else if (cleanId.startsWith("/assets/")) {
    cleanId = cleanId.replace("/assets/", "");
  } else if (cleanId.startsWith("/api/assets/")) {
    cleanId = cleanId.replace("/api/assets/", "");
  }
  cleanId = cleanId.split("?")[0].split("#")[0];
  if ((cleanId.startsWith("http://") || cleanId.startsWith("https://")) && !cleanId.includes("alphadesk.ir")) {
    return cleanId;
  }
  if (cleanId.startsWith("/") && !cleanId.startsWith("/api/assets/")) {
    return cleanId;
  }
  if (cleanId) {
    return `/api/assets/${cleanId}`;
  }
  return void 0;
}
function extractFileId(avatar) {
  if (!avatar) return null;
  if (typeof avatar === "object" && avatar !== null) {
    return avatar.id || avatar.filename_disk || avatar.filename_download || avatar.fileId || avatar.profile_image || avatar.avatar || null;
  }
  if (typeof avatar !== "string") return null;
  let str = avatar.trim().replace(/^["']+|["']+$/g, "").trim();
  if (!str) return null;
  if (str.startsWith("data:")) return null;
  const match = str.match(/\/api\/assets\/([a-zA-Z0-9\-_.]+)/) || str.match(/\/assets\/([a-zA-Z0-9\-_.]+)/);
  if (match && match[1]) return match[1];
  if (!str.startsWith("http://") && !str.startsWith("https://") && !str.startsWith("/")) {
    return str;
  }
  return null;
}
var WORKDAY_CUTOFF_HOUR = 4;
function getTehranWorkdayKey(timestampMs = Date.now(), timeZone = "Asia/Tehran", cutoffHour = WORKDAY_CUTOFF_HOUR) {
  const safeTs = !timestampMs || isNaN(timestampMs) ? Date.now() : timestampMs;
  const shiftedDate = new Date(safeTs - cutoffHour * 60 * 60 * 1e3);
  try {
    const dtf = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    return dtf.format(shiftedDate);
  } catch {
    return `${shiftedDate.getFullYear()}-${String(shiftedDate.getMonth() + 1).padStart(2, "0")}-${String(
      shiftedDate.getDate()
    ).padStart(2, "0")}`;
  }
}
function getRequestUser(req) {
  const reqAuth = req.headers["authorization"] || "";
  if (reqAuth) {
    const token = reqAuth.replace(/^Bearer\s+/i, "").trim();
    if (token) setLatestAccessToken(token);
  }
  const userId = req.headers["x-user-id"] || req.query.user_id || "";
  const personnelId = req.headers["x-personnel-id"] || req.query.personnel_id || userId;
  const userRole = req.headers["x-user-role"] || req.query.user_role || "";
  const roleId = req.headers["x-role-id"] || req.query.role_id || "";
  const rawUserName = req.headers["x-user-name"];
  let userName = safeDecodeURIComponent(rawUserName);
  const userEmail = req.headers["x-user-email"] || "";
  const tenantId = getRequestTenantId(req);
  const rawSessionIat = req.headers["x-session-iat"];
  const sessionIat = rawSessionIat ? parseInt(rawSessionIat, 10) : 0;
  const isDayExpired = false;
  const isSessionRevoked = Boolean(
    globalSessionRevocationTimestamp > 0 && (!sessionIat || sessionIat < globalSessionRevocationTimestamp)
  );
  const cleanPId = personnelId ? String(personnelId).trim().toLowerCase() : "";
  const rawUid = cleanPId ? cleanPId.replace(/^p-/, "") : "";
  const cleanUId = userId ? String(userId).trim().toLowerCase() : "";
  const cleanEmail = userEmail ? String(userEmail).trim().toLowerCase() : "";
  const pMatch = personnelData.find((p) => {
    if (!p) return false;
    const pId = p.id ? String(p.id).trim().toLowerCase() : "";
    const pUserId = p.user_id ? String(p.user_id).trim().toLowerCase() : "";
    const pEmail = p.email ? String(p.email).trim().toLowerCase() : "";
    if (cleanPId && pId && pId === cleanPId) return true;
    if (cleanPId && rawUid && pId && (pId === `p-${rawUid}` || pId === rawUid)) return true;
    if (cleanUId && pUserId && pUserId === cleanUId) return true;
    if (cleanUId && pId && pId === cleanUId) return true;
    if (cleanEmail && pEmail && pEmail === cleanEmail) return true;
    return false;
  });
  if (!userName && pMatch?.name) {
    userName = pMatch.name;
  }
  const isInactive = Boolean(
    pMatch && (pMatch.status === "inactive" || pMatch.active === false)
  );
  const hasUserContext = Boolean(
    (userId || personnelId || userEmail || req.headers["authorization"]) && !isSessionRevoked && !isInactive
  );
  const isDirectusSystemAdmin = Boolean(
    DIRECTUS_ADMIN_ROLE_IDS.includes(roleId)
  );
  const emailMw = (pMatch?.email || userEmail || "").toLowerCase().trim();
  const usernameMw = (pMatch?.username || "").toLowerCase().trim();
  const isMwMasterAdmin = emailMw.includes("kiani") || emailMw === "kiani@company.ir" || usernameMw === "kiani" || String(pMatch?.id) === "p-1";
  const isSystemAdmin = Boolean(
    hasUserContext && (isMwMasterAdmin || pMatch?.role === "admin")
  );
  const isPersonnelAdmin = Boolean(
    hasUserContext && (isSystemAdmin || pMatch?.role === "admin" || pMatch?.role === "sales_manager")
  );
  const canViewAllCustomers = Boolean(
    isSystemAdmin || pMatch?.role === "admin" || pMatch?.role === "sales_manager" || pMatch?.permissions?.can_view_all_customers === true
  );
  const reportViewScope = isSystemAdmin || pMatch?.role === "admin" || pMatch?.role === "sales_manager" ? pMatch?.permissions?.report_view_scope || "all" : pMatch?.permissions?.report_view_scope || "own_only";
  const visibleReportPersonnelIds = pMatch?.permissions?.visible_report_personnel_ids || [];
  return {
    userId: isSessionRevoked || isInactive ? "" : userId,
    personnelId: isSessionRevoked || isInactive ? "" : personnelId,
    userRole: pMatch ? pMatch.role : userRole || "marketer",
    roleId,
    isAdmin: isSystemAdmin,
    isPersonnelAdmin,
    canViewAllCustomers,
    reportViewScope,
    visibleReportPersonnelIds,
    userName: isSessionRevoked || isInactive ? "" : userName,
    userEmail: isSessionRevoked || isInactive ? "" : userEmail,
    tenantId,
    isAuthenticated: hasUserContext,
    isSessionRevoked,
    isDayExpired,
    isInactive
  };
}
function checkInactivePersonnel(req, res, next) {
  const path4 = req.path || "";
  if (path4.startsWith("/health") || path4.startsWith("/api/health") || path4.startsWith("/api/auth/login") || path4.startsWith("/auth/login") || path4.startsWith("/api/assets") || path4.startsWith("/assets")) {
    return next();
  }
  const user = getRequestUser(req);
  if (user.isInactive) {
    return res.status(403).json({
      error: "ACCOUNT_INACTIVE",
      message: "\u062D\u0633\u0627\u0628 \u06A9\u0627\u0631\u0628\u0631\u06CC \u0634\u0645\u0627 \u062A\u0648\u0633\u0637 \u0645\u062F\u06CC\u0631\u06CC\u062A \u063A\u06CC\u0631\u0641\u0639\u0627\u0644 \u0634\u062F\u0647 \u0627\u0633\u062A \u0648 \u0627\u0645\u06A9\u0627\u0646 \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u0627\u0632 \u0633\u0627\u0645\u0627\u0646\u0647 \u0631\u0627 \u0646\u062F\u0627\u0631\u06CC\u062F. \u0644\u0637\u0641\u0627\u064B \u0628\u0627 \u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645 \u062A\u0645\u0627\u0633 \u0628\u06AF\u06CC\u0631\u06CC\u062F."
    });
  }
  next();
}

// server/directus/sync.ts
function resolveDirectusTenantId(rawTenant) {
  const validIds = tenantsData.map((t) => Number(t.id)).filter((n) => !isNaN(n) && isFinite(n) && n > 0);
  if (rawTenant === null || rawTenant === void 0 || rawTenant === "" || rawTenant === "all") {
    return null;
  }
  if (rawTenant === "default") {
    if (validIds.length > 0) return validIds[0];
    return 1;
  }
  const directNum = Number(rawTenant);
  if (!isNaN(directNum) && isFinite(directNum) && directNum > 0) {
    if (validIds.length === 0 || validIds.includes(directNum)) return directNum;
  }
  const str = String(rawTenant).trim().toLowerCase();
  const match = tenantsData.find(
    (t) => String(t.id).toLowerCase() === str || t.slug && t.slug.toLowerCase() === str || t.name.toLowerCase() === str
  );
  if (match) {
    const matchNum = Number(match.id);
    if (!isNaN(matchNum) && isFinite(matchNum)) {
      if (validIds.length === 0 || validIds.includes(matchNum)) return matchNum;
    }
  }
  return validIds[0] || 1;
}
async function ensureDirectusTenants() {
  if (!directusUrl || !directusAdminToken) return;
  try {
    const res = await directusFetch("/items/tenants?limit=100&sort=id");
    if (res && Array.isArray(res.data) && res.data.length > 0) {
      const mappedTenants = res.data.map((t) => ({
        id: String(t.id),
        name: t.name || "\u0633\u0627\u0632\u0645\u0627\u0646 " + t.id,
        slug: t.slug || "org-" + t.id,
        logo: t.logo || "",
        description: t.description || "",
        phone: t.phone || "",
        address: t.address || "",
        status: t.status === "inactive" ? "inactive" : "active",
        date_created: t.date_created || (/* @__PURE__ */ new Date()).toISOString()
      }));
      setTenantsData(mappedTenants);
      console.log(`Directus tenants synchronized (${mappedTenants.length} tenants).`);
    } else {
      console.log("No tenants found in Directus, creating default tenant...");
      const created = await directusFetch("/items/tenants", {
        method: "POST",
        body: JSON.stringify({
          name: "\u0633\u0627\u0632\u0645\u0627\u0646 \u0645\u0631\u06A9\u0632\u06CC \u0622\u0644\u0641\u0627\u062F\u0633\u06A9",
          slug: "alphadesk-hq",
          status: "active",
          description: "\u0633\u0627\u0632\u0645\u0627\u0646 \u0627\u0635\u0644\u06CC \u0648 \u067E\u06CC\u0634\u200C\u0641\u0631\u0636 \u0633\u0627\u0645\u0627\u0646\u0647"
        })
      });
      if (created?.data) {
        const defaultTenant = {
          id: String(created.data.id),
          name: created.data.name,
          slug: created.data.slug,
          logo: created.data.logo || "",
          description: created.data.description || "",
          status: "active",
          date_created: created.data.date_created || (/* @__PURE__ */ new Date()).toISOString()
        };
        setTenantsData([defaultTenant]);
        console.log("Directus default tenant created with ID:", created.data.id);
      }
    }
    backfillNullTenantsDirectus().catch(() => {
    });
  } catch (err) {
    console.warn("Could not sync/seed tenants in Directus:", err.message);
  }
}
async function backfillNullTenantsDirectus() {
  let updatedCustomers = 0;
  let updatedReports = 0;
  let updatedPersonnel = 0;
  if (!directusUrl || !directusAdminToken) return { updatedCustomers, updatedReports, updatedPersonnel };
  try {
    const defaultTenantId = resolveDirectusTenantId("default") || 1;
    const custNullRes = await directusFetch("/items/customers?filter[tenant_id][_null]=true&fields=id&limit=5000").catch(() => null);
    if (custNullRes?.data && Array.isArray(custNullRes.data) && custNullRes.data.length > 0) {
      const ids = custNullRes.data.map((c) => c.id);
      for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100);
        await directusFetch("/items/customers", {
          method: "PATCH",
          body: JSON.stringify({
            keys: chunk,
            data: { tenant_id: defaultTenantId }
          })
        }).catch((e) => console.warn("Could not backfill customers tenant_id chunk:", e.message));
        updatedCustomers += chunk.length;
      }
      console.log(`Successfully backfilled ${updatedCustomers} customers with tenant_id: ${defaultTenantId}`);
    }
    const repNullRes = await directusFetch("/items/customer_reports?filter[tenant_id][_null]=true&fields=id&limit=5000").catch(() => null);
    if (repNullRes?.data && Array.isArray(repNullRes.data) && repNullRes.data.length > 0) {
      const ids = repNullRes.data.map((r) => r.id);
      for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100);
        await directusFetch("/items/customer_reports", {
          method: "PATCH",
          body: JSON.stringify({
            keys: chunk,
            data: { tenant_id: defaultTenantId }
          })
        }).catch((e) => console.warn("Could not backfill reports tenant_id chunk:", e.message));
        updatedReports += chunk.length;
      }
      console.log(`Successfully backfilled ${updatedReports} reports with tenant_id: ${defaultTenantId}`);
    }
    const pNullRes = await directusFetch("/items/personnel?filter[tenant_id][_null]=true&fields=id&limit=1000").catch(() => null);
    if (pNullRes?.data && Array.isArray(pNullRes.data) && pNullRes.data.length > 0) {
      const ids = pNullRes.data.map((p) => p.id);
      await directusFetch("/items/personnel", {
        method: "PATCH",
        body: JSON.stringify({
          keys: ids,
          data: { tenant_id: defaultTenantId }
        })
      }).catch((e) => console.warn("Could not backfill personnel tenant_id:", e.message));
      updatedPersonnel = ids.length;
    }
  } catch (err) {
    console.warn("backfillNullTenantsDirectus error:", err.message);
  }
  return { updatedCustomers, updatedReports, updatedPersonnel };
}
async function ensureDirectusPersonnel() {
  if (!directusUrl || !directusAdminToken) return;
  try {
    const userAvatarMap = {};
    const usersRes = await directusFetch("/users?fields=id,email,avatar.*&limit=500").catch(() => null);
    if (usersRes?.data && Array.isArray(usersRes.data)) {
      for (const u of usersRes.data) {
        if (u.id && u.avatar) {
          const formatted = formatAvatarUrl(u.avatar);
          if (formatted) {
            userAvatarMap[String(u.id)] = formatted;
            if (u.email) userAvatarMap[u.email.toLowerCase().trim()] = formatted;
          }
        }
      }
    }
    const res = await directusFetch("/items/personnel?limit=500&sort=id");
    if (res && Array.isArray(res.data)) {
      const attachAvatars = (list) => list.map((p) => {
        let profileImg = formatAvatarUrl(p.profile_image);
        let av = profileImg || p.user_id && userAvatarMap[p.user_id] || p.email && userAvatarMap[p.email.toLowerCase().trim()] || formatAvatarUrl(p.avatar);
        return {
          ...p,
          profile_image: profileImg || av || "",
          avatar: av || ""
        };
      });
      if (res.data.length > 0) {
        setPersonnelData(attachAvatars(res.data));
        console.log(`Directus personnel synchronized (${res.data.length} records, ${Object.keys(userAvatarMap).length} user avatars linked).`);
      }
      const existingIds = new Set(res.data.map((p) => String(p.id)));
      const missingPersonnel = initialPersonnel.filter((p) => !existingIds.has(String(p.id)));
      if (missingPersonnel.length > 0) {
        console.log(`Seeding ${missingPersonnel.length} missing initial personnel into Directus...`);
        const defaultTenantId = resolveDirectusTenantId("default") || 1;
        for (const p of missingPersonnel) {
          await directusFetch("/items/personnel", {
            method: "POST",
            body: JSON.stringify({
              id: p.id,
              name: p.name,
              role: p.role,
              phone: p.phone,
              email: p.email,
              status: "active",
              username: p.username,
              tenant_id: defaultTenantId
            })
          }).catch((e) => console.warn(`Could not seed personnel ${p.id}:`, e.message));
        }
        const refreshed = await directusFetch("/items/personnel?limit=500&sort=id").catch(() => null);
        if (refreshed?.data && Array.isArray(refreshed.data)) {
          setPersonnelData(attachAvatars(refreshed.data));
        }
      }
    }
  } catch (err) {
    console.warn("Could not sync personnel with Directus:", err.message);
  }
}
async function getSafeDirectusPersonnelForeignKey(rawIdentifier, fallbackName) {
  if (!directusUrl || !directusAdminToken) return rawIdentifier || null;
  if (!rawIdentifier && !fallbackName) return null;
  const clean = rawIdentifier ? String(rawIdentifier).trim() : "";
  try {
    if (clean && clean !== "none" && clean !== "\u0647\u0645\u0647") {
      const byId = await directusFetch(`/items/personnel/${encodeURIComponent(clean)}`).catch(
        () => null
      );
      if (byId?.data?.id) {
        return String(byId.data.id);
      }
    }
    if (clean) {
      const byMatch = await directusFetch(
        `/items/personnel?filter[_or][0][user_id][_eq]=${encodeURIComponent(
          clean
        )}&filter[_or][1][email][_eq]=${encodeURIComponent(
          clean
        )}&filter[_or][2][username][_eq]=${encodeURIComponent(clean)}&limit=1`
      ).catch(() => null);
      if (byMatch?.data && Array.isArray(byMatch.data) && byMatch.data.length > 0) {
        return String(byMatch.data[0].id);
      }
    }
    const searchName = fallbackName || clean;
    if (searchName && searchName.length > 2) {
      const byName = await directusFetch(
        `/items/personnel?filter[name][_eq]=${encodeURIComponent(searchName)}&limit=1`
      ).catch(() => null);
      if (byName?.data && Array.isArray(byName.data) && byName.data.length > 0) {
        return String(byName.data[0].id);
      }
    }
    const local = personnelData.find(
      (p) => p.id === clean || p.user_id === clean || p.email === clean || p.name === searchName
    );
    if (local?.id) {
      const checkLocal = await directusFetch(`/items/personnel/${encodeURIComponent(local.id)}`).catch(
        () => null
      );
      if (checkLocal?.data?.id) {
        return String(checkLocal.data.id);
      }
    }
    if (clean && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)) {
      const userRes = await directusFetch(`/users/${clean}`).catch(() => null);
      if (userRes?.data?.id) {
        const u = userRes.data;
        const uName = `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email;
        const newPId = crypto.randomUUID();
        const createdP = await directusFetch("/items/personnel", {
          method: "POST",
          body: JSON.stringify({
            id: newPId,
            name: uName,
            email: u.email,
            phone: "",
            role: "marketer",
            status: "active",
            user_id: u.id,
            tenant_id: resolveDirectusTenantId("default") || 1
          })
        }).catch(() => null);
        if (createdP?.data?.id) {
          return String(createdP.data.id);
        }
      }
    }
  } catch (err) {
    console.warn("Error resolving safe Directus personnel foreign key:", err.message);
  }
  return null;
}
async function resolvePersonnelId(rawIdentifier, fallbackName) {
  if (!rawIdentifier || rawIdentifier === "none" || rawIdentifier === "\u0647\u0645\u0647" || String(rawIdentifier).trim() === "") {
    if (fallbackName && directusUrl && directusAdminToken) {
      try {
        const byName = await directusFetch(
          `/items/personnel?filter[name][_eq]=${encodeURIComponent(fallbackName)}&limit=1`
        ).catch(() => null);
        if (byName?.data && Array.isArray(byName.data) && byName.data.length > 0) {
          return { personnelId: byName.data[0].id, personnelName: byName.data[0].name };
        }
      } catch {
      }
    }
    return { personnelId: null, personnelName: fallbackName };
  }
  const clean = String(rawIdentifier).trim();
  if (directusUrl && directusAdminToken) {
    try {
      const byId = await directusFetch(`/items/personnel/${encodeURIComponent(clean)}`).catch(
        () => null
      );
      if (byId?.data?.id) {
        return { personnelId: byId.data.id, personnelName: byId.data.name };
      }
      const byUserId = await directusFetch(
        `/items/personnel?filter[user_id][_eq]=${encodeURIComponent(clean)}`
      ).catch(() => null);
      if (byUserId?.data && Array.isArray(byUserId.data) && byUserId.data.length > 0) {
        return { personnelId: byUserId.data[0].id, personnelName: byUserId.data[0].name };
      }
      const byEmail = await directusFetch(
        `/items/personnel?filter[email][_eq]=${encodeURIComponent(clean)}`
      ).catch(() => null);
      if (byEmail?.data && Array.isArray(byEmail.data) && byEmail.data.length > 0) {
        return { personnelId: byEmail.data[0].id, personnelName: byEmail.data[0].name };
      }
      const byUsername = await directusFetch(
        `/items/personnel?filter[username][_eq]=${encodeURIComponent(clean)}`
      ).catch(() => null);
      if (byUsername?.data && Array.isArray(byUsername.data) && byUsername.data.length > 0) {
        return { personnelId: byUsername.data[0].id, personnelName: byUsername.data[0].name };
      }
      if (fallbackName || clean.length > 2) {
        const searchName = fallbackName || clean;
        const byName = await directusFetch(
          `/items/personnel?filter[name][_eq]=${encodeURIComponent(searchName)}`
        ).catch(() => null);
        if (byName?.data && Array.isArray(byName.data) && byName.data.length > 0) {
          return { personnelId: byName.data[0].id, personnelName: byName.data[0].name };
        }
      }
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)) {
        const userRes = await directusFetch(`/users/${clean}`).catch(() => null);
        if (userRes?.data?.id) {
          const u = userRes.data;
          const uName = `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email;
          const newPId = crypto.randomUUID();
          await directusFetch("/items/personnel", {
            method: "POST",
            body: JSON.stringify({
              id: newPId,
              name: uName,
              email: u.email,
              phone: "",
              role: "marketer",
              status: "active",
              user_id: u.id,
              tenant_id: resolveDirectusTenantId("default") || 1
            })
          }).catch(() => {
          });
          return { personnelId: newPId, personnelName: uName };
        }
      }
    } catch {
    }
  }
  const local = personnelData.find(
    (p) => p.id === clean || p.user_id === clean || p.email === clean || p.name === clean
  );
  if (local) {
    return { personnelId: local.id, personnelName: local.name };
  }
  return { personnelId: null, personnelName: fallbackName };
}
var isSyncingFollowups = false;
async function syncAllCustomersFollowupFromReports() {
  if (isSyncingFollowups) {
    console.log("[AlphaDesk] syncAllCustomersFollowupFromReports is already running, skipping overlapping invocation.");
    return { totalCustomers: 0, updatedCount: 0 };
  }
  isSyncingFollowups = true;
  console.log("[AlphaDesk] Starting synchronization of customer next_followup_date from latest reports...");
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  let updatedCount = 0;
  let totalCustomers = 0;
  try {
    if (directusUrl && directusAdminToken) {
      const reportsRes = await directusFetchAllPages(
        "/items/customer_reports?fields=id,customer_id,next_followup_date,date_created&sort=-date_created",
        {},
        1e5
      );
      const allReports = reportsRes.data || [];
      const latestReportByCustId = /* @__PURE__ */ new Map();
      for (const rep of allReports) {
        if (!rep) continue;
        const rawCId = rep.customer_id;
        const cId = typeof rawCId === "object" && rawCId !== null ? String(rawCId.id) : rawCId !== null && rawCId !== void 0 ? String(rawCId) : "";
        if (cId && !latestReportByCustId.has(cId)) {
          latestReportByCustId.set(cId, rep);
        }
      }
      const custsRes = await directusFetchAllPages(
        "/items/customers?fields=id,company_name,next_followup_date",
        {},
        1e5
      );
      const allCustomers = custsRes.data || [];
      totalCustomers = allCustomers.length;
      const patchMap = /* @__PURE__ */ new Map();
      for (const cust of allCustomers) {
        if (!cust || !cust.id) continue;
        const strId = String(cust.id);
        const latestRep = latestReportByCustId.get(strId);
        if (latestRep) {
          const repFollowup = latestRep.next_followup_date ? new Date(latestRep.next_followup_date).toISOString() : null;
          const custFollowup = cust.next_followup_date ? new Date(cust.next_followup_date).toISOString() : null;
          if (repFollowup !== custFollowup) {
            patchMap.set(strId, {
              id: cust.id,
              next_followup_date: repFollowup,
              date_updated: nowIso
            });
          }
        }
      }
      if (patchMap.size > 0) {
        console.log(`[AlphaDesk] Found ${patchMap.size} customer followup date mismatches in Directus. Patching...`);
        await directusSafeBatchPatch("customers", patchMap, 50);
        updatedCount = patchMap.size;
        console.log(`[AlphaDesk] Successfully patched ${updatedCount} customers with their latest report followup date.`);
        invalidateCustomersCache();
      } else {
        console.log("[AlphaDesk] All customers in Directus are already in sync with their latest reports.");
      }
    }
    const localReportsSorted = [...reportsData].sort(
      (a, b) => new Date(b.date_created || 0).getTime() - new Date(a.date_created || 0).getTime()
    );
    const localLatestByCust = /* @__PURE__ */ new Map();
    for (const r of localReportsSorted) {
      const cId = String(r.customer_id || "");
      if (cId && !localLatestByCust.has(cId)) {
        localLatestByCust.set(cId, r);
      }
    }
    for (const c of customersData) {
      const lr = localLatestByCust.get(String(c.id));
      if (lr) {
        const repDate = lr.next_followup_date ? new Date(lr.next_followup_date).toISOString() : null;
        c.next_followup_date = repDate;
      }
    }
    return { totalCustomers, updatedCount };
  } catch (err) {
    console.error("[AlphaDesk] Error syncing customer followups from latest reports:", err.message);
    return { totalCustomers, updatedCount, error: err.message };
  } finally {
    isSyncingFollowups = false;
  }
}
async function repairMismatchedCustomerTenants() {
  if (!directusUrl || !directusAdminToken || personnelData.length === 0) {
    return { repairedCount: 0 };
  }
  try {
    const personnelTenantMap = /* @__PURE__ */ new Map();
    for (const p of personnelData) {
      if (!p) continue;
      const tNum = resolveDirectusTenantId(p.tenant_id);
      if (tNum && tNum > 1) {
        if (p.id) {
          const cleanId = String(p.id).trim().toLowerCase();
          personnelTenantMap.set(cleanId, tNum);
          const rawId = cleanId.replace(/^p-/, "");
          if (rawId) {
            personnelTenantMap.set(rawId, tNum);
            personnelTenantMap.set(`p-${rawId}`, tNum);
          }
        }
        if (p.user_id) {
          personnelTenantMap.set(String(p.user_id).trim().toLowerCase(), tNum);
        }
      }
    }
    if (personnelTenantMap.size === 0) {
      return { repairedCount: 0 };
    }
    const candidatesRes = await directusFetchAllPages(
      "/items/customers?filter[_or][0][tenant_id][_eq]=1&filter[_or][1][tenant_id][_null]=true&fields=id,tenant_id,assigned_marketer_id",
      {},
      5e3
    ).catch(() => null);
    const candidates = candidatesRes?.data || [];
    if (candidates.length === 0) {
      return { repairedCount: 0 };
    }
    const patchMap = /* @__PURE__ */ new Map();
    for (const cust of candidates) {
      if (!cust || !cust.id || !cust.assigned_marketer_id) continue;
      const mKey = String(cust.assigned_marketer_id).trim().toLowerCase();
      const targetTenant = personnelTenantMap.get(mKey);
      if (targetTenant && targetTenant > 1) {
        patchMap.set(String(cust.id), {
          id: cust.id,
          tenant_id: targetTenant
        });
      }
    }
    if (patchMap.size > 0) {
      console.log(`[AlphaDesk] Repairing ${patchMap.size} customer(s) with mismatched default tenant_id...`);
      await directusSafeBatchPatch("customers", patchMap, 50);
      invalidateCustomersCache();
      console.log(`[AlphaDesk] Successfully repaired tenant_id on ${patchMap.size} customer(s).`);
    }
    return { repairedCount: patchMap.size };
  } catch (err) {
    console.warn("[AlphaDesk] Tenant repair warning:", err?.message || err);
    return { repairedCount: 0 };
  }
}
function normalizeSmsPhoneDigits(input) {
  const ascii = String(input || "").replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776)).replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632)).replace(/[\s\-_()]/g, "").trim();
  if (!ascii) return "";
  let normalized = ascii.replace(/^(\+98|0098)/, "0");
  if (/^98(9\d{9})$/.test(normalized)) {
    normalized = "0" + normalized.slice(2);
  } else if (/^9\d{9}$/.test(normalized)) {
    normalized = "0" + normalized;
  }
  return normalized;
}
function parseSmsPhones(raw) {
  if (!raw) return [];
  let items = [];
  if (Array.isArray(raw)) {
    items = raw.map((item) => String(item ?? "").trim());
  } else if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          items = parsed.map((item) => String(item ?? "").trim());
        } else {
          items = trimmed.split(/[,،\n;]+/);
        }
      } catch {
        items = trimmed.split(/[,،\n;]+/);
      }
    } else {
      items = trimmed.split(/[,،\n;]+/);
    }
  } else {
    items = [String(raw).trim()];
  }
  return Array.from(
    new Set(
      items.map((s) => normalizeSmsPhoneDigits(s)).filter((s) => s.length > 0)
    )
  );
}
function extractDirectusTenantIdString(rawTenantId) {
  if (typeof rawTenantId === "object" && rawTenantId !== null) {
    return rawTenantId.id !== void 0 && rawTenantId.id !== null ? String(rawTenantId.id).trim() : "";
  }
  if (rawTenantId !== void 0 && rawTenantId !== null) {
    return String(rawTenantId).trim();
  }
  return "";
}
async function syncDirectusTenantSettings() {
  if (!directusUrl || !directusAdminToken) return;
  try {
    const res = await directusFetch("/items/tenant_settings?limit=200&sort=id");
    if (res && Array.isArray(res.data)) {
      tenantSettingsMap.clear();
      for (const item of res.data) {
        const tId = extractDirectusTenantIdString(item?.tenant_id);
        if (!tId) continue;
        const phones = parseSmsPhones(item.sms_phones);
        tenantSettingsMap.set(tId, {
          id: item.id !== void 0 ? String(item.id) : `ts-${tId}`,
          tenant_id: tId,
          sms_phones: phones
        });
      }
      console.log(`Directus tenant_settings synchronized (${res.data.length} records).`);
    }
  } catch (err) {
    console.warn("Could not sync tenant_settings from Directus:", err.message);
  }
}

// server/middlewares/rateLimit.middleware.ts
var rateLimitWindowMs = 60 * 1e3;
var maxRequestsPerWindow = 300;
var clientRecords = /* @__PURE__ */ new Map();
function rateLimiter(req, res, next) {
  if (req.path === "/api/health" || req.path === "/health" || req.path === "/api/bff-status" || req.path === "/bff-status" || req.path === "/favicon.ico") {
    return next();
  }
  if (!req.path.startsWith("/api")) {
    return next();
  }
  const clientIp = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
  const ipKey = Array.isArray(clientIp) ? clientIp[0] : clientIp;
  const now2 = Date.now();
  const record = clientRecords.get(ipKey);
  if (!record || now2 > record.resetTime) {
    clientRecords.set(ipKey, {
      count: 1,
      resetTime: now2 + rateLimitWindowMs
    });
    return next();
  }
  record.count += 1;
  if (record.count > maxRequestsPerWindow) {
    return res.status(429).json({
      error: "TOO_MANY_REQUESTS",
      message: "\u062A\u0639\u062F\u0627\u062F \u062F\u0631\u062E\u0648\u0627\u0633\u062A\u200C\u0647\u0627\u06CC \u0634\u0645\u0627 \u0628\u06CC\u0634 \u0627\u0632 \u062D\u062F \u0645\u062C\u0627\u0632 \u0627\u0633\u062A. \u0644\u0637\u0641\u0627\u064B \u0686\u0646\u062F \u0644\u062D\u0638\u0647 \u062F\u06CC\u06AF\u0631 \u062F\u0648\u0628\u0627\u0631\u0647 \u062A\u0644\u0627\u0634 \u06A9\u0646\u06CC\u062F."
    });
  }
  next();
}

// server/routes/auth.routes.ts
import { Router as Router3 } from "express";
import crypto6 from "crypto";
import fs2 from "fs";
import os from "os";
import path2 from "path";

// server/services/sms.service.ts
import crypto2 from "crypto";
async function getPersonnelFullName(identifier, fallback) {
  const clean = identifier ? String(identifier).trim() : "";
  const searchFallback = fallback ? String(fallback).trim() : "";
  if (clean) {
    const cleanLower = clean.toLowerCase();
    const rawUid = cleanLower.replace(/^p-/, "");
    const cleanDigits = clean.replace(/\D/g, "");
    const pLocal = personnelData.find((p) => {
      if (!p) return false;
      const pid = p.id ? String(p.id).toLowerCase() : "";
      const puid = p.user_id ? String(p.user_id).toLowerCase() : "";
      const pemail = p.email ? String(p.email).toLowerCase() : "";
      const puname = p.username ? String(p.username).toLowerCase() : "";
      const pphone = p.phone ? String(p.phone).replace(/\D/g, "") : "";
      return pid === cleanLower || rawUid && (pid === rawUid || pid === `p-${rawUid}`) || puid === cleanLower || pemail === cleanLower || puname === cleanLower || cleanDigits.length >= 7 && pphone && (pphone === cleanDigits || pphone.endsWith(cleanDigits)) || p.name && p.name.trim().toLowerCase() === cleanLower;
    });
    if (pLocal && pLocal.name && pLocal.name.trim()) {
      return {
        fullName: pLocal.name.trim(),
        phone: pLocal.phone,
        id: pLocal.id
      };
    }
  }
  if (searchFallback) {
    const pNameLocal = personnelData.find(
      (p) => p && p.name && p.name.trim().toLowerCase() === searchFallback.toLowerCase()
    );
    if (pNameLocal && pNameLocal.name && pNameLocal.name.trim()) {
      return {
        fullName: pNameLocal.name.trim(),
        phone: pNameLocal.phone,
        id: pNameLocal.id
      };
    }
  }
  if (directusUrl && directusAdminToken) {
    try {
      if (clean) {
        const cleanDigits = clean.replace(/\D/g, "");
        const queryParts = [
          `filter[_or][0][id][_eq]=${encodeURIComponent(clean)}`,
          `filter[_or][1][user_id][_eq]=${encodeURIComponent(clean)}`,
          `filter[_or][2][email][_eq]=${encodeURIComponent(clean)}`,
          `filter[_or][3][username][_eq]=${encodeURIComponent(clean)}`,
          `filter[_or][4][name][_eq]=${encodeURIComponent(clean)}`
        ];
        if (cleanDigits.length >= 7) {
          queryParts.push(`filter[_or][5][phone][_icontains]=${encodeURIComponent(cleanDigits)}`);
        }
        const dRes = await directusFetch(`/items/personnel?${queryParts.join("&")}&limit=1`).catch(() => null);
        if (dRes?.data && Array.isArray(dRes.data) && dRes.data.length > 0) {
          const item = dRes.data[0];
          if (item?.name && item.name.trim()) {
            return {
              fullName: item.name.trim(),
              phone: item.phone,
              id: String(item.id)
            };
          }
        }
      }
      if (searchFallback && searchFallback.length > 2) {
        const dNameRes = await directusFetch(
          `/items/personnel?filter[name][_eq]=${encodeURIComponent(searchFallback)}&limit=1`
        ).catch(() => null);
        if (dNameRes?.data && Array.isArray(dNameRes.data) && dNameRes.data.length > 0) {
          const item = dNameRes.data[0];
          if (item?.name && item.name.trim()) {
            return {
              fullName: item.name.trim(),
              phone: item.phone,
              id: String(item.id)
            };
          }
        }
      }
    } catch (err) {
      console.warn("[IPPanel SMS] Directus personnel lookup warning:", err.message);
    }
  }
  return {
    fullName: searchFallback || clean || "\u0647\u0645\u06A9\u0627\u0631 \u06AF\u0631\u0627\u0645\u06CC"
  };
}
function getPatternTextForCode(code) {
  if (!code) return "";
  const c = String(code).trim();
  const ps = projectSettingsData || {};
  if (ps.login_pattern?.trim() === c) return ps.login_pattern_text || "";
  if (ps.dayli_leave_request_pattern?.trim() === c || ps.daily_leave_request_pattern?.trim() === c) {
    return ps.dayli_leave_request_text || ps.daily_leave_request_text || "";
  }
  if (ps.hourly_leave_request_pattern?.trim() === c) return ps.hourly_leave_request_text || "";
  if (ps.dayli_leave_accept_pattern?.trim() === c || ps.daily_leave_accept_pattern?.trim() === c) {
    return ps.dayli_leave_accept_text || ps.daily_leave_accept_text || "";
  }
  if (ps.dayli_leave_reject_pattern?.trim() === c || ps.daily_leave_reject_pattern?.trim() === c) {
    return ps.dayli_leave_reject_text || ps.daily_leave_reject_text || "";
  }
  if (ps.hourly_leave_accept_pattern?.trim() === c) return ps.hourly_leave_accept_text || "";
  if (ps.hourly_leave_reject_pattern?.trim() === c) return ps.hourly_leave_reject_text || "";
  if (ps.addvance_request_pattern?.trim() === c) return ps.addvance_request_text || "";
  if (ps.addvance_accept_pattern?.trim() === c) return ps.addvance_accept_text || "";
  if (ps.lower_addvance_accept_pattern?.trim() === c) return ps.lower_addvance_accept_text || "";
  if (ps.addvance_reject_pattern?.trim() === c) return ps.addvance_reject_text || "";
  return "";
}
function resolvePatternVariables(patternCode, recipientPhone, variables = {}) {
  const patternText = getPatternTextForCode(patternCode);
  const cleanVars = {};
  for (const [k, v] of Object.entries(variables || {})) {
    if (k && String(k).trim()) {
      cleanVars[String(k).trim()] = v !== null && v !== void 0 ? String(v).trim() : "";
    }
  }
  const foundPlaceholders = /* @__PURE__ */ new Set();
  if (patternText) {
    const pPercent = patternText.match(/%([a-zA-Z0-9_]+)%/g);
    if (pPercent) {
      for (const m of pPercent) {
        foundPlaceholders.add(m.replace(/%/g, "").trim());
      }
    }
    const pBraces = patternText.match(/\{([a-zA-Z0-9_]+)\}/g);
    if (pBraces) {
      for (const m of pBraces) {
        foundPlaceholders.add(m.replace(/[{}]/g, "").trim());
      }
    }
  }
  const now2 = /* @__PURE__ */ new Date();
  const defaultTehranDate = now2.toLocaleDateString("fa-IR", { timeZone: "Asia/Tehran" });
  const jalaliDate = defaultTehranDate;
  const defaultTehranTime = now2.toLocaleTimeString("fa-IR", {
    timeZone: "Asia/Tehran",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  for (const ph of foundPlaceholders) {
    if (cleanVars[ph] !== void 0 && cleanVars[ph] !== "") continue;
    const lower = ph.toLowerCase();
    if (lower === "mobile" || lower === "phone") {
      cleanVars[ph] = cleanVars.mobile || cleanVars.phone || recipientPhone || "09120000000";
    } else if (lower === "name" || lower === "fullname" || lower === "full_name" || lower === "user_name" || lower === "personnel_name" || lower === "marketer_name" || lower === "applicant_name" || lower === "person" || lower === "user") {
      cleanVars[ph] = cleanVars.name || cleanVars.fullName || cleanVars.full_name || cleanVars.user_name || cleanVars.personnel_name || cleanVars.applicant_name || "\u0647\u0645\u06A9\u0627\u0631 \u06AF\u0631\u0627\u0645\u06CC";
    } else if (lower === "family" || lower === "last_name") {
      const fullName = cleanVars.family || cleanVars.last_name || cleanVars.fullName || cleanVars.name || "\u0647\u0645\u06A9\u0627\u0631 \u06AF\u0631\u0627\u0645\u06CC";
      const parts = fullName.split(" ");
      cleanVars[ph] = parts.length > 1 ? parts.slice(1).join(" ") : "\u06AF\u0631\u0627\u0645\u06CC";
    } else if (lower === "first_name") {
      const fullName = cleanVars.first_name || cleanVars.fullName || cleanVars.name || "\u0647\u0645\u06A9\u0627\u0631";
      const parts = fullName.split(" ");
      cleanVars[ph] = parts[0] || "\u0647\u0645\u06A9\u0627\u0631";
    } else if (lower === "date" || lower === "request_date" || lower === "approval_date") {
      cleanVars[ph] = cleanVars.client_date || cleanVars.date || cleanVars.request_date || cleanVars.approval_date || defaultTehranDate;
    } else if (lower === "time") {
      cleanVars[ph] = cleanVars.client_time || cleanVars.time || defaultTehranTime;
    } else if (lower === "ip") {
      cleanVars[ph] = cleanVars.ip || "127.0.0.1";
    } else if (lower === "device" || lower === "device_type" || lower === "client_device") {
      const rawDev = cleanVars.client_device || cleanVars.device || cleanVars.device_type;
      if (rawDev && (rawDev.includes("\u0645\u0648\u0628\u0627\u06CC\u0644") || rawDev.toLowerCase() === "mobile")) {
        cleanVars[ph] = "\u0645\u0648\u0628\u0627\u06CC\u0644";
      } else if (rawDev && (rawDev.includes("\u062F\u0633\u06A9\u062A\u0627\u067E") || rawDev.toLowerCase() === "desktop")) {
        cleanVars[ph] = "\u062F\u0633\u06A9\u062A\u0627\u067E";
      } else if (cleanVars.is_mobile === "true") {
        cleanVars[ph] = "\u0645\u0648\u0628\u0627\u06CC\u0644";
      } else {
        cleanVars[ph] = "\u062F\u0633\u06A9\u062A\u0627\u067E";
      }
    } else if (lower === "leave_type") {
      cleanVars[ph] = cleanVars.leave_type || "\u0645\u0631\u062E\u0635\u06CC";
    } else if (lower === "leave_date" || lower === "from_date") {
      cleanVars[ph] = cleanVars.leave_date || cleanVars.from_date || cleanVars.start_date || cleanVars.date || jalaliDate;
    } else if (lower === "to_date") {
      cleanVars[ph] = cleanVars.to_date || cleanVars.end_date || cleanVars.leave_date || cleanVars.start_date || jalaliDate;
    } else if (lower === "from_time") {
      cleanVars[ph] = cleanVars.from_time || cleanVars.start_time || "09:00";
    } else if (lower === "to_time") {
      cleanVars[ph] = cleanVars.to_time || cleanVars.end_time || "17:00";
    } else if (lower === "start_time") {
      cleanVars[ph] = cleanVars.start_time || cleanVars.from_time || "09:00";
    } else if (lower === "end_time") {
      cleanVars[ph] = cleanVars.end_time || cleanVars.to_time || "17:00";
    } else if (lower === "start_date") {
      cleanVars[ph] = cleanVars.start_date || cleanVars.from_date || cleanVars.leave_date || jalaliDate;
    } else if (lower === "end_date") {
      cleanVars[ph] = cleanVars.end_date || cleanVars.to_date || cleanVars.start_date || jalaliDate;
    } else if (lower === "days" || lower === "day" || lower === "count") {
      cleanVars[ph] = cleanVars.days || cleanVars.day || cleanVars.count || "1";
    } else if (lower === "hours" || lower === "hour") {
      cleanVars[ph] = cleanVars.hours || cleanVars.hour || "1";
    } else if (lower === "duration") {
      cleanVars[ph] = cleanVars.duration || cleanVars.days || cleanVars.hours || "1";
    } else if (lower === "amount" || lower === "requested_amount" || lower === "approved_amount") {
      cleanVars[ph] = cleanVars[ph] || cleanVars.amount || cleanVars.requested_amount || cleanVars.approved_amount || "0";
    } else if (lower === "reason" || lower === "description") {
      cleanVars[ph] = cleanVars.reason || cleanVars.description || "-";
    } else if (lower === "manager_note") {
      cleanVars[ph] = cleanVars.manager_note || "\u0628\u0631\u0631\u0633\u06CC \u0634\u062F";
    } else if (lower === "reviewed_by") {
      cleanVars[ph] = cleanVars.reviewed_by || "\u0645\u062F\u06CC\u0631\u06CC\u062A";
    } else if (lower === "username") {
      cleanVars[ph] = cleanVars.username || "-";
    } else {
      cleanVars[ph] = cleanVars[ph] || "-";
    }
  }
  return cleanVars;
}
var cachedWorkingAttemptLabel = null;
var tenantAdminPhonesCache = /* @__PURE__ */ new Map();
var SMS_DEDUP_WINDOW_MS = 60 * 1e3;
var MAX_RECENT_SMS_CACHE_SIZE = 2e3;
var inFlightSmsMap = /* @__PURE__ */ new Map();
var recentSentSmsMap = /* @__PURE__ */ new Map();
function normalizeCanonicalSmsPhone(rawPhone) {
  if (!rawPhone) return null;
  const ascii = String(rawPhone).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776)).replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632)).replace(/[\s\-_()]/g, "").trim();
  if (!ascii) return null;
  let clean = ascii.replace(/^(\+98|0098)/, "0");
  if (/^98(9\d{9})$/.test(clean)) {
    clean = "0" + clean.slice(2);
  } else if (/^9\d{9}$/.test(clean)) {
    clean = "0" + clean;
  }
  return /^09\d{9}$/.test(clean) ? clean : null;
}
function pruneRecentSentSmsCache(now2) {
  for (const [k, v] of recentSentSmsMap.entries()) {
    if (now2 - v.timestamp >= SMS_DEDUP_WINDOW_MS) {
      recentSentSmsMap.delete(k);
    }
  }
  if (recentSentSmsMap.size > MAX_RECENT_SMS_CACHE_SIZE) {
    const excess = recentSentSmsMap.size - MAX_RECENT_SMS_CACHE_SIZE;
    const keys = Array.from(recentSentSmsMap.keys()).slice(0, excess);
    for (const k of keys) recentSentSmsMap.delete(k);
  }
}
function buildSmsDedupKey(cleanPhone, patternCode, cleanVars) {
  const stableEntries = Object.entries(cleanVars).filter(([k]) => k !== "time" && k !== "client_time").sort(([a], [b]) => a.localeCompare(b));
  const payload = JSON.stringify({
    phone: cleanPhone,
    pattern: patternCode.trim(),
    vars: stableEntries
  });
  return crypto2.createHash("sha256").update(payload).digest("hex");
}
function invalidateTenantAdminPhonesCache(tenantId) {
  if (tenantId !== void 0 && tenantId !== null) {
    const raw = String(tenantId).trim();
    const resolved = resolveDirectusTenantId(raw);
    tenantAdminPhonesCache.delete(raw);
    if (resolved) tenantAdminPhonesCache.delete(String(resolved));
  } else {
    tenantAdminPhonesCache.clear();
  }
}
async function sendIppanelSmsPattern(recipientPhone, patternCode, variables = {}, overrideApiKey, overrideSender, options) {
  if ((!projectSettingsData.ippanel_api || !projectSettingsData.ippanel_api.trim()) && directusUrl && directusAdminToken) {
    try {
      const resp = await directusFetch("/items/project_settings").catch(() => null);
      if (resp?.data) {
        const item = Array.isArray(resp.data) ? resp.data[0] : resp.data;
        if (item) {
          updateProjectSettingsData(item);
        }
      }
    } catch {
    }
  }
  const rawKey = (overrideApiKey || projectSettingsData.ippanel_api || "").trim();
  if (!rawKey || !patternCode || !recipientPhone) {
    return { success: false, error: "\u06A9\u0644\u06CC\u062F API \u0633\u0627\u0645\u0627\u0646\u0647 \u067E\u06CC\u0627\u0645\u06A9\u060C \u06A9\u062F \u067E\u062A\u0631\u0646 \u06CC\u0627 \u0634\u0645\u0627\u0631\u0647 \u062A\u0644\u0641\u0646 \u06AF\u06CC\u0631\u0646\u062F\u0647 \u0648\u0627\u0631\u062F \u0646\u0634\u062F\u0647 \u0627\u0633\u062A." };
  }
  const cleanApiKey = rawKey.replace(/^(Bearer|AccessKey)\s+/i, "").trim();
  const cleanPhone = normalizeCanonicalSmsPhone(recipientPhone);
  if (!cleanPhone) {
    console.warn(`[IPPanel SMS] Skipped invalid phone number: ${recipientPhone}`);
    return { success: false, error: "\u0634\u0645\u0627\u0631\u0647 \u062A\u0644\u0641\u0646 \u06AF\u06CC\u0631\u0646\u062F\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A (\u0641\u0631\u0645\u062A \u0645\u062C\u0627\u0632: 09xxxxxxxxx)" };
  }
  const cleanPattern = patternCode.trim();
  const cleanVars = resolvePatternVariables(cleanPattern, cleanPhone, variables);
  const dedupKey = buildSmsDedupKey(cleanPhone, cleanPattern, cleanVars);
  const existingInFlight = inFlightSmsMap.get(dedupKey);
  if (existingInFlight) {
    console.log(
      `[IPPanel SMS] Coalesced concurrent duplicate dispatch to ${cleanPhone} (pattern: '${cleanPattern}')`
    );
    const sharedRes = await existingInFlight;
    return { ...sharedRes, deduplicated: true };
  }
  const now2 = Date.now();
  pruneRecentSentSmsCache(now2);
  if (!options?.skipDedup) {
    const recent = recentSentSmsMap.get(dedupKey);
    if (recent && now2 - recent.timestamp < SMS_DEDUP_WINDOW_MS) {
      console.log(
        `[IPPanel SMS] Suppressed duplicate SMS to ${cleanPhone} (pattern: '${cleanPattern}', sent ${now2 - recent.timestamp}ms ago)`
      );
      return {
        success: true,
        messageId: recent.messageId || "DEDUPLICATED",
        deduplicated: true
      };
    }
  }
  const dispatchPromise = (async () => {
    const senderLine = (overrideSender || projectSettingsData.ippanel_sender || projectSettingsData.ippanel_line_number || "90001356").trim();
    const senderWithoutPlus = senderLine.replace(/^\+/, "");
    const cleanPhoneE164 = cleanPhone.startsWith("0") ? "+98" + cleanPhone.substring(1) : cleanPhone.startsWith("+98") ? cleanPhone : "+98" + cleanPhone;
    const cleanPhone98 = cleanPhone.startsWith("0") ? "98" + cleanPhone.substring(1) : cleanPhone;
    const restPayload98 = {
      pattern_code: cleanPattern,
      originator: senderLine,
      recipient: cleanPhone98,
      values: cleanVars
    };
    const restPayload09 = {
      pattern_code: cleanPattern,
      originator: senderLine,
      recipient: cleanPhone,
      values: cleanVars
    };
    const restPayloadAltSender = {
      pattern_code: cleanPattern,
      originator: senderWithoutPlus,
      recipient: cleanPhone98,
      values: cleanVars
    };
    const api2Payload = {
      code: cleanPattern,
      sender: senderLine,
      recipient: cleanPhone,
      variable: cleanVars
    };
    const edgePayload = {
      sending_type: "pattern",
      from_number: senderLine,
      code: cleanPattern,
      recipients: [cleanPhoneE164],
      params: cleanVars
    };
    console.log(
      `[IPPanel SMS] Sending pattern '${cleanPattern}' to ${cleanPhone} (sender: ${senderLine}) with variables:`,
      cleanVars
    );
    const baseAttempts = [
      {
        url: "https://api2.ippanel.com/api/v1/sms/pattern/normal/send",
        headers: {
          "Content-Type": "application/json",
          apikey: cleanApiKey
        },
        body: JSON.stringify(api2Payload),
        label: "api2.ippanel.com (apikey)"
      },
      {
        url: "https://rest.ippanel.com/v1/messages/patterns/send",
        headers: {
          "Content-Type": "application/json",
          apikey: cleanApiKey
        },
        body: JSON.stringify(restPayload98),
        label: "rest.ippanel.com (apikey, 989...)"
      },
      {
        url: "https://api2.ippanel.com/api/v1/sms/pattern/normal/send",
        headers: {
          "Content-Type": "application/json",
          Authorization: `AccessKey ${cleanApiKey}`
        },
        body: JSON.stringify(api2Payload),
        label: "api2.ippanel.com (AccessKey)"
      },
      {
        url: "https://rest.ippanel.com/v1/messages/patterns/send",
        headers: {
          "Content-Type": "application/json",
          apikey: cleanApiKey
        },
        body: JSON.stringify(restPayload09),
        label: "rest.ippanel.com (apikey, 09...)"
      },
      {
        url: "https://edge.ippanel.com/v1/api/send",
        headers: {
          "Content-Type": "application/json",
          Authorization: `AccessKey ${cleanApiKey}`
        },
        body: JSON.stringify(edgePayload),
        label: "edge.ippanel.com (AccessKey)"
      },
      {
        url: "https://edge.ippanel.com/v1/api/send",
        headers: {
          "Content-Type": "application/json",
          apikey: cleanApiKey
        },
        body: JSON.stringify(edgePayload),
        label: "edge.ippanel.com (apikey)"
      },
      {
        url: "https://rest.ippanel.com/v1/messages/patterns/send",
        headers: {
          "Content-Type": "application/json",
          Authorization: `AccessKey ${cleanApiKey}`
        },
        body: JSON.stringify(restPayload98),
        label: "rest.ippanel.com (AccessKey)"
      },
      {
        url: "https://rest.ippanel.com/v1/messages/patterns/send",
        headers: {
          "Content-Type": "application/json",
          apikey: cleanApiKey
        },
        body: JSON.stringify(restPayloadAltSender),
        label: "rest.ippanel.com (alt sender)"
      },
      {
        url: "https://ippanel.com/api/v1/sms/pattern/normal/send",
        headers: {
          "Content-Type": "application/json",
          apikey: cleanApiKey
        },
        body: JSON.stringify(api2Payload),
        label: "ippanel.com (apikey)"
      }
    ];
    const attempts = [...baseAttempts];
    if (cachedWorkingAttemptLabel) {
      const cachedIdx = attempts.findIndex((a) => a.label === cachedWorkingAttemptLabel);
      if (cachedIdx > 0) {
        const [favored] = attempts.splice(cachedIdx, 1);
        attempts.unshift(favored);
      }
    }
    let lastError = "";
    for (const attempt of attempts) {
      const controller = new AbortController();
      const timeoutTimer = setTimeout(() => controller.abort(), 12e3);
      try {
        const res = await fetch(attempt.url, {
          method: "POST",
          headers: attempt.headers,
          body: attempt.body,
          signal: controller.signal
        });
        if (res.ok) {
          const json = await res.json().catch(() => ({}));
          cachedWorkingAttemptLabel = attempt.label;
          const msgId = String(json?.data || json?.bulk_id || json?.message_id || json?.id || "OK");
          recentSentSmsMap.set(dedupKey, { timestamp: Date.now(), messageId: msgId });
          console.log(`[IPPanel SMS] Successfully sent via ${attempt.label}:`, json);
          return {
            success: true,
            messageId: msgId
          };
        } else {
          const errBody = await res.text().catch(() => "");
          console.warn(`[IPPanel SMS] ${attempt.label} failed with status ${res.status}:`, errBody);
          let detailedMsg = errBody;
          try {
            const parsed = JSON.parse(errBody);
            if (parsed?.data?.error) {
              detailedMsg = parsed.data.error;
            } else if (parsed?.message) {
              detailedMsg = parsed.message;
            } else if (parsed?.error) {
              detailedMsg = parsed.error;
            }
          } catch {
            if (res.status === 502 && (errBody.includes("ArvanCloud") || errBody.includes("502"))) {
              detailedMsg = "\u062F\u0631\u06AF\u0627\u0647 IPPanel \u0628\u0647 \u062F\u0644\u06CC\u0644 \u0645\u062D\u062F\u0648\u062F\u06CC\u062A \u0634\u0628\u06A9\u0647 (Geo-IP) \u0628\u0647 \u062F\u0631\u062E\u0648\u0627\u0633\u062A\u200C\u0647\u0627\u06CC \u062E\u0627\u0631\u062C \u0627\u0632 \u06A9\u0634\u0648\u0631 \u067E\u0627\u0633\u062E \u0646\u0645\u06CC\u200C\u062F\u0647\u062F (\u062E\u0637\u0627\u06CC 502 \u0633\u0631\u0648\u0631 \u0645\u06CC\u0627\u0646\u06CC). \u067E\u0633 \u0627\u0632 \u062F\u06CC\u067E\u0644\u0648\u06CC \u0631\u0648\u06CC \u0633\u0631\u0648\u0631 \u0627\u06CC\u0631\u0627\u0646 \u067E\u06CC\u0627\u0645\u06A9 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u0627\u0631\u0633\u0627\u0644 \u062E\u0648\u0627\u0647\u062F \u0634\u062F.";
            }
          }
          lastError = detailedMsg || `HTTP ${res.status}`;
          if (detailedMsg.includes("\u0627\u0639\u062A\u0628\u0627\u0631") || detailedMsg.includes("balance") || detailedMsg.includes("credit")) {
            break;
          }
          if (res.status === 504 || res.status === 502 && errBody.includes("ArvanCloud") || res.status >= 500 && cachedWorkingAttemptLabel === attempt.label) {
            if (res.status === 504 || res.status === 500) {
              recentSentSmsMap.set(dedupKey, { timestamp: Date.now(), messageId: "AMBIGUOUS_5XX" });
            }
            break;
          }
        }
      } catch (fetchErr) {
        const isAbortTimeout = fetchErr?.name === "AbortError" || String(fetchErr?.message || "").toLowerCase().includes("aborted");
        lastError = `[${attempt.label}] Network error: ${fetchErr.message}`;
        console.warn(`[IPPanel SMS] Network error connecting to ${attempt.label}:`, fetchErr.message);
        if (isAbortTimeout) {
          recentSentSmsMap.set(dedupKey, { timestamp: Date.now(), messageId: "TIMEOUT_GUARD" });
          break;
        }
      } finally {
        clearTimeout(timeoutTimer);
      }
    }
    return { success: false, error: lastError || "\u062E\u0637\u0627 \u062F\u0631 \u0628\u0631\u0642\u0631\u0627\u0631\u06CC \u0627\u0631\u062A\u0628\u0627\u0637 \u0628\u0627 \u062F\u0631\u06AF\u0627\u0647 IPPanel" };
  })();
  inFlightSmsMap.set(dedupKey, dispatchPromise);
  try {
    return await dispatchPromise;
  } finally {
    inFlightSmsMap.delete(dedupKey);
  }
}
async function sendTenantAdminsSmsPattern(tenantId, patternCode, variables = {}, options) {
  if (!patternCode) return;
  const rawTenantStr = tenantId !== void 0 && tenantId !== null ? String(tenantId).trim() : "default";
  const resolvedNum = resolveDirectusTenantId(rawTenantStr);
  const effectiveKey = resolvedNum ? String(resolvedNum) : rawTenantStr || "default";
  const collectedPhones = /* @__PURE__ */ new Set();
  const addNormalizedPhone = (raw) => {
    const clean = normalizeCanonicalSmsPhone(raw);
    if (clean) collectedPhones.add(clean);
  };
  const now2 = Date.now();
  const cached = tenantAdminPhonesCache.get(effectiveKey);
  if (cached && now2 - cached.timestamp < 6e4) {
    cached.phones.forEach((p) => addNormalizedPhone(p));
  } else if (directusUrl && directusAdminToken) {
    try {
      const filterTarget = resolvedNum ? String(resolvedNum) : rawTenantStr;
      let res = await directusFetch(
        `/items/tenant_settings?filter[tenant_id][_eq]=${encodeURIComponent(filterTarget)}&limit=10`
      ).catch(() => null);
      if (!res?.data || Array.isArray(res.data) && res.data.length === 0) {
        const allRes = await directusFetch("/items/tenant_settings?limit=200").catch(() => null);
        if (allRes?.data && Array.isArray(allRes.data)) {
          const matched = allRes.data.filter((item) => {
            const itemTId = extractDirectusTenantIdString(item?.tenant_id);
            return itemTId === effectiveKey || itemTId === rawTenantStr;
          });
          res = { data: matched };
        }
      }
      if (res?.data) {
        const items = Array.isArray(res.data) ? res.data : [res.data];
        for (const item of items) {
          const phones = parseSmsPhones(item?.sms_phones);
          phones.forEach((cp) => addNormalizedPhone(cp));
        }
        const uniqueFetchedPhones = Array.from(collectedPhones);
        if (items[0]?.id) {
          tenantSettingsMap.set(effectiveKey, {
            id: String(items[0].id),
            tenant_id: effectiveKey,
            sms_phones: uniqueFetchedPhones
          });
        }
        tenantAdminPhonesCache.set(effectiveKey, { phones: uniqueFetchedPhones, timestamp: now2 });
      }
    } catch (err) {
      console.warn("[IPPanel SMS] Directus tenant_settings lookup warning:", err.message);
    }
  }
  if (collectedPhones.size === 0) {
    const localEntry = tenantSettingsMap.get(effectiveKey) || tenantSettingsMap.get(rawTenantStr);
    if (localEntry?.sms_phones) {
      parseSmsPhones(localEntry.sms_phones).forEach((p) => addNormalizedPhone(p));
    }
  }
  const excludedSet = /* @__PURE__ */ new Set();
  if (options?.excludePhones) {
    for (const ex of options.excludePhones) {
      const cleanEx = normalizeCanonicalSmsPhone(ex);
      if (cleanEx) excludedSet.add(cleanEx);
    }
  }
  const phoneList = Array.from(collectedPhones).filter((p) => !excludedSet.has(p));
  if (phoneList.length === 0) {
    if (collectedPhones.size === 0) {
      console.warn(
        `[IPPanel SMS] No admin phone numbers found in tenant_settings for tenant ${effectiveKey} to send notification.`
      );
    }
    return;
  }
  console.log(
    `[IPPanel SMS] Notifying ${phoneList.length} tenant (${effectiveKey}) admins concurrently with pattern '${patternCode}'...`
  );
  await Promise.allSettled(
    phoneList.map(
      (phone) => sendIppanelSmsPattern(phone, patternCode, variables).catch(
        (e) => console.warn(`[IPPanel SMS] Failed to notify tenant admin ${phone}:`, e.message)
      )
    )
  );
}

// server/routes/personnel.routes.ts
import { Router } from "express";
import crypto3 from "crypto";
var router = Router();
function enrichPersonnel(p) {
  if (!p) return p;
  let tid = "default";
  let tName = p.tenant_name || "";
  if (p.tenant_id && typeof p.tenant_id === "object") {
    tid = String(p.tenant_id.id || p.tenant_id.slug || "default");
    if (!tName && p.tenant_id.name) tName = p.tenant_id.name;
  } else if (p.tenant_id !== void 0 && p.tenant_id !== null) {
    tid = String(p.tenant_id);
  }
  if (!tName) {
    if (tid === "default" || tid === "1") tName = "\u0633\u0627\u0632\u0645\u0627\u0646 \u0645\u0631\u06A9\u0632\u06CC \u0622\u0644\u0641\u0627\u062F\u0633\u06A9";
    else tName = `\u0633\u0627\u0632\u0645\u0627\u0646 / \u0634\u0639\u0628\u0647 ${tid}`;
  }
  const allowed = Array.isArray(p.allowed_tenant_ids) ? p.allowed_tenant_ids.map(String) : p.permissions?.allowed_tenant_ids && Array.isArray(p.permissions.allowed_tenant_ids) ? p.permissions.allowed_tenant_ids.map(String) : [tid];
  const formattedAvatar = formatAvatarUrl(p.avatar) || (typeof p.avatar === "string" ? p.avatar : "");
  const statusLower = String(p.status || "").trim().toLowerCase();
  const isInactiveStatus = statusLower === "inactive" || statusLower === "suspended" || statusLower === "disabled" || statusLower === "archived" || statusLower === "\u063A\u06CC\u0631\u0641\u0639\u0627\u0644";
  const isActiveFlag = p.active !== false && p.active !== 0 && p.active !== "false" && p.active !== "0" && !isInactiveStatus;
  return {
    ...p,
    id: String(p.id),
    tenant_id: tid,
    tenant_name: tName,
    allowed_tenant_ids: allowed,
    permissions: {
      ...p.permissions || {},
      allowed_tenant_ids: allowed
    },
    active: isActiveFlag,
    avatar: formattedAvatar
  };
}
router.get("/", async (req, res) => {
  const tenantId = getRequestTenantId(req);
  let userAvatarMap = {};
  if (directusUrl && !isDirectusCircuitOpen()) {
    try {
      const usersRes = await directusFetch("/users?fields=id,email,avatar.*&limit=500").catch(
        () => null
      );
      if (usersRes && Array.isArray(usersRes.data)) {
        for (const u of usersRes.data) {
          if (u.id && u.avatar) {
            const formatted = formatAvatarUrl(u.avatar);
            if (formatted) {
              userAvatarMap[String(u.id)] = formatted;
              if (u.email) userAvatarMap[u.email.toLowerCase().trim()] = formatted;
            }
          }
        }
      }
      const resp = await directusFetch("/items/personnel?sort=id&limit=500");
      if (resp?.data && Array.isArray(resp.data)) {
        setPersonnelData(resp.data);
        const mapped = await Promise.all(
          resp.data.map(async (p) => {
            const enriched = enrichPersonnel(p);
            let profileImg = formatAvatarUrl(p.profile_image || enriched.profile_image);
            let userAvatar = enriched.user_id && userAvatarMap[enriched.user_id] || enriched.email && userAvatarMap[enriched.email.toLowerCase().trim()];
            if (!userAvatar && enriched.user_id && !String(enriched.user_id).startsWith("p-")) {
              try {
                const uRes = await directusFetch(`/users/${enriched.user_id}?fields=id,avatar.*`).catch(() => null);
                if (uRes?.data?.avatar) {
                  userAvatar = formatAvatarUrl(uRes.data.avatar);
                }
              } catch {
              }
            }
            if (!userAvatar && enriched.email) {
              try {
                const em = String(enriched.email).toLowerCase().trim();
                const uRes = await directusFetch(`/users?filter[email][_ieq]=${encodeURIComponent(em)}&fields=id,avatar.*&limit=1`).catch(() => null);
                if (uRes?.data?.[0]?.avatar) {
                  userAvatar = formatAvatarUrl(uRes.data[0].avatar);
                }
              } catch {
              }
            }
            let avatar = profileImg || userAvatar || formatAvatarUrl(enriched.avatar) || (typeof enriched.avatar === "string" ? enriched.avatar : "");
            return { ...enriched, profile_image: profileImg || avatar, avatar };
          })
        );
        if (tenantId && tenantId !== "all") {
          const filtered = mapped.filter(
            (p) => p.tenant_id === tenantId || p.allowed_tenant_ids?.includes(tenantId)
          );
          return res.json(filtered);
        }
        return res.json(mapped);
      }
    } catch (e) {
      console.warn("Personnel query fallback:", e.message);
    }
  }
  let list = personnelData.map((p) => {
    const enriched = enrichPersonnel(p);
    let profileImg = formatAvatarUrl(enriched.profile_image || p.profile_image);
    let userAvatar = enriched.user_id && userAvatarMap[enriched.user_id] || enriched.email && userAvatarMap[enriched.email.toLowerCase().trim()];
    let avatar = profileImg || userAvatar || formatAvatarUrl(enriched.avatar) || (typeof enriched.avatar === "string" ? enriched.avatar : "");
    return { ...enriched, profile_image: profileImg || avatar, avatar };
  });
  if (tenantId && tenantId !== "all") {
    list = list.filter(
      (p) => p.tenant_id === tenantId || p.allowed_tenant_ids?.includes(tenantId)
    );
  }
  res.json(list);
});
router.post("/", async (req, res) => {
  const { isAdmin } = getRequestUser(req);
  if (!isAdmin) {
    return res.status(403).json({ error: "FORBIDDEN", message: "\u0641\u0642\u0637 \u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645 \u0645\u062C\u0627\u0632 \u0628\u0647 \u0627\u06CC\u062C\u0627\u062F \u0647\u0645\u06A9\u0627\u0631 \u062C\u062F\u06CC\u062F \u0627\u0633\u062A." });
  }
  const payload = req.body;
  if (!payload.name) {
    return res.status(400).json({ error: "\u0646\u0627\u0645 \u0648 \u0646\u0627\u0645 \u062E\u0627\u0646\u0648\u0627\u062F\u06AF\u06CC \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A." });
  }
  const newPId = payload.id || crypto3.randomUUID();
  const cleanEmail = payload.email ? String(payload.email).trim().toLowerCase() : "";
  const targetTenantId = payload.tenant_id || getRequestTenantId(req) || "default";
  const resolvedTenantNum = resolveDirectusTenantId(targetTenantId);
  let createdUserId = null;
  if (directusUrl && directusAdminToken && cleanEmail && payload.password) {
    try {
      const nameParts = String(payload.name).trim().split(" ");
      const fname = nameParts[0] || "\u0647\u0645\u06A9\u0627\u0631";
      const lname = nameParts.slice(1).join(" ") || "\u062C\u062F\u06CC\u062F";
      const createdU = await directusFetch("/users", {
        method: "POST",
        body: JSON.stringify({
          email: cleanEmail,
          password: payload.password,
          first_name: fname,
          last_name: lname,
          role: DIRECTUS_STAFF_ROLE_ID,
          status: "active"
        })
      }).catch(() => null);
      if (createdU?.data?.id) {
        createdUserId = createdU.data.id;
      }
    } catch {
    }
  }
  const allowedTenants = Array.isArray(payload.allowed_tenant_ids) ? payload.allowed_tenant_ids : [targetTenantId];
  const newPersonnel = {
    id: newPId,
    tenant_id: targetTenantId,
    allowed_tenant_ids: allowedTenants,
    name: String(payload.name).trim(),
    username: payload.username ? String(payload.username).trim() : cleanEmail.split("@")[0],
    role: payload.role || "marketer",
    email: cleanEmail,
    phone: (payload.phone || "").trim(),
    phones: Array.isArray(payload.phones) ? payload.phones : [],
    emergency_contact_name: (payload.emergency_contact_name || "").trim(),
    emergency_contact_phone: (payload.emergency_contact_phone || "").trim(),
    emergency_contact_relation: (payload.emergency_contact_relation || "").trim(),
    family_contacts: payload.family_contacts || null,
    permissions: {
      allowed_menus: payload.permissions?.allowed_menus || [
        "dashboard",
        "customers",
        "reports",
        "analytics"
      ],
      allowed_tenant_ids: allowedTenants,
      can_view_all_customers: Boolean(payload.permissions?.can_view_all_customers),
      can_edit_customer: Boolean(payload.permissions?.can_edit_customer),
      can_delete_customer: Boolean(payload.permissions?.can_delete_customer),
      can_export_data: Boolean(payload.permissions?.can_export_data),
      can_switch_ownership: Boolean(payload.permissions?.can_switch_ownership),
      can_extend_ownership: Boolean(payload.permissions?.can_extend_ownership),
      can_manage_leads: Boolean(payload.permissions?.can_manage_leads),
      can_approve_leaves: Boolean(payload.permissions?.can_approve_leaves),
      can_approve_advances: Boolean(payload.permissions?.can_approve_advances),
      can_request_bonus: Boolean(payload.permissions?.can_request_bonus),
      can_approve_bonuses: Boolean(payload.permissions?.can_approve_bonuses),
      can_manage_personnel: Boolean(payload.permissions?.can_manage_personnel),
      can_manage_tenants: Boolean(payload.permissions?.can_manage_tenants),
      report_view_scope: payload.permissions?.report_view_scope || "own_only",
      visible_report_personnel_ids: payload.permissions?.visible_report_personnel_ids || []
    },
    avatar: payload.avatar || "",
    status: payload.status || "active",
    active: payload.status !== "inactive",
    user_id: createdUserId || payload.user_id || null,
    bank_card_number: (payload.bank_card_number || "").trim(),
    iban: (payload.iban || "").trim(),
    national_id: (payload.national_id || "").trim()
  };
  if (directusUrl && directusAdminToken) {
    try {
      const directusPayload = {
        ...newPersonnel,
        tenant_id: resolvedTenantNum
      };
      const createdP = await directusFetch("/items/personnel", {
        method: "POST",
        body: JSON.stringify(directusPayload)
      });
      if (createdP?.data) {
        const item = enrichPersonnel({
          ...newPersonnel,
          ...createdP.data,
          id: String(createdP.data.id)
        });
        personnelData.push(item);
        return res.status(201).json(item);
      }
    } catch (e) {
      console.warn("Personnel create error in Directus:", e.message);
    }
  }
  personnelData.push(newPersonnel);
  res.status(201).json(newPersonnel);
});
router.patch("/:id", async (req, res) => {
  const { isAdmin } = getRequestUser(req);
  if (!isAdmin) {
    return res.status(403).json({ error: "FORBIDDEN", message: "\u0641\u0642\u0637 \u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645 \u0645\u062C\u0627\u0632 \u0628\u0647 \u0648\u06CC\u0631\u0627\u06CC\u0634 \u0647\u0645\u06A9\u0627\u0631 \u0627\u0633\u062A." });
  }
  const { id } = req.params;
  const patch = req.body;
  if (patch.status) {
    patch.active = patch.status !== "inactive";
  } else if (patch.active !== void 0) {
    patch.status = patch.active ? "active" : "inactive";
  }
  const idx = personnelData.findIndex((p) => String(p.id) === String(id));
  if (idx !== -1) {
    personnelData[idx] = enrichPersonnel({ ...personnelData[idx], ...patch });
  }
  if (directusUrl && directusAdminToken) {
    try {
      const directusPatch = { ...patch };
      if (patch.tenant_id) {
        directusPatch.tenant_id = resolveDirectusTenantId(patch.tenant_id);
      }
      const imgVal = patch.profile_image || patch.avatar;
      if (typeof imgVal === "string") {
        const fileMatch = imgVal.match(/\/api\/assets\/([a-zA-Z0-9\-_]+)/);
        if (fileMatch && fileMatch[1]) {
          directusPatch.profile_image = fileMatch[1];
        } else if (!imgVal.startsWith("http://") && !imgVal.startsWith("https://") && !imgVal.startsWith("/")) {
          directusPatch.profile_image = imgVal;
        }
      }
      const patched = await directusFetch(`/items/personnel/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(directusPatch)
      });
      const targetUserId = patch.user_id || (idx !== -1 ? personnelData[idx]?.user_id : null);
      if (patch.status && targetUserId) {
        await directusFetch(`/users/${targetUserId}`, {
          method: "PATCH",
          body: JSON.stringify({
            status: patch.status === "inactive" ? "suspended" : "active"
          })
        }).catch((e) => console.warn("Could not update directus_users status:", e.message));
      }
      if (patched?.data) {
        const item = enrichPersonnel({
          ...idx !== -1 ? personnelData[idx] : {},
          ...patched.data,
          id: String(patched.data.id)
        });
        if (idx !== -1) personnelData[idx] = item;
        return res.json(item);
      }
    } catch (e) {
      console.warn("Directus personnel patch error:", e.message);
    }
  }
  if (idx === -1) return res.status(404).json({ error: "\u0647\u0645\u06A9\u0627\u0631 \u0645\u0648\u0631\u062F \u0646\u0638\u0631 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." });
  res.json(personnelData[idx]);
});
router.delete("/:id", async (req, res) => {
  const { isAdmin } = getRequestUser(req);
  if (!isAdmin) {
    return res.status(403).json({ error: "FORBIDDEN", message: "\u0641\u0642\u0637 \u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645 \u0645\u062C\u0627\u0632 \u0628\u0647 \u062D\u0630\u0641 \u0647\u0645\u06A9\u0627\u0631 \u0627\u0633\u062A." });
  }
  const { id } = req.params;
  setPersonnelData(personnelData.filter((p) => String(p.id) !== String(id)));
  if (directusUrl && directusAdminToken) {
    try {
      await directusFetch(`/items/personnel/${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch (e) {
      console.warn("Directus personnel delete error:", e.message);
    }
  }
  res.json({ success: true });
});
router.post("/batch-permissions", async (req, res) => {
  const { isAdmin } = getRequestUser(req);
  if (!isAdmin) {
    return res.status(403).json({ error: "FORBIDDEN", message: "\u0641\u0642\u0637 \u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645 \u0645\u062C\u0627\u0632 \u0628\u0647 \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u062F\u0633\u062A\u0631\u0633\u06CC\u200C\u0647\u0627 \u0627\u0633\u062A." });
  }
  const { personnel_ids, permissions } = req.body;
  if (!Array.isArray(personnel_ids) || personnel_ids.length === 0 || !permissions) {
    return res.status(400).json({ error: "\u0634\u0646\u0627\u0633\u0647\u200C\u0647\u0627\u06CC \u0647\u0645\u06A9\u0627\u0631\u0627\u0646 \u0648 \u0645\u0627\u062A\u0631\u06CC\u0633 \u062F\u0633\u062A\u0631\u0633\u06CC \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A." });
  }
  for (const pid of personnel_ids) {
    const idx = personnelData.findIndex((p) => String(p.id) === String(pid));
    if (idx !== -1) {
      personnelData[idx].permissions = {
        ...personnelData[idx].permissions || { allowed_menus: [] },
        ...permissions
      };
    }
    if (directusUrl && directusAdminToken) {
      try {
        await directusFetch(`/items/personnel/${encodeURIComponent(pid)}`, {
          method: "PATCH",
          body: JSON.stringify({ permissions })
        });
      } catch {
      }
    }
  }
  res.json({ success: true, updatedCount: personnel_ids.length });
});
router.post("/batch-delete", async (req, res) => {
  const { isAdmin } = getRequestUser(req);
  if (!isAdmin) {
    return res.status(403).json({ error: "FORBIDDEN", message: "\u0641\u0642\u0637 \u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645 \u0645\u062C\u0627\u0632 \u0628\u0647 \u062D\u0630\u0641 \u06AF\u0631\u0648\u0647\u06CC \u0647\u0645\u06A9\u0627\u0631\u0627\u0646 \u0627\u0633\u062A." });
  }
  const { personnel_ids } = req.body;
  if (!Array.isArray(personnel_ids) || personnel_ids.length === 0) {
    return res.status(400).json({ error: "\u0634\u0646\u0627\u0633\u0647\u200C\u0647\u0627\u06CC \u0647\u0645\u06A9\u0627\u0631\u0627\u0646 \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A." });
  }
  const idSet = new Set(personnel_ids.map(String));
  setPersonnelData(personnelData.filter((p) => !idSet.has(String(p.id))));
  if (directusUrl && directusAdminToken) {
    for (const pid of personnel_ids) {
      try {
        await directusFetch(`/items/personnel/${encodeURIComponent(pid)}`, { method: "DELETE" });
      } catch {
      }
    }
  }
  res.json({ success: true, deletedCount: personnel_ids.length });
});
router.post("/me/profile", async (req, res) => {
  const reqUser = getRequestUser(req);
  if (!reqUser.isAuthenticated) {
    return res.status(401).json({
      error: "UNAUTHORIZED",
      message: "\u0646\u0634\u0633\u062A \u06A9\u0627\u0631\u0628\u0631\u06CC \u0645\u0639\u062A\u0628\u0631 \u0646\u06CC\u0633\u062A. \u0644\u0637\u0641\u0627\u064B \u0645\u062C\u062F\u062F\u0627\u064B \u0648\u0627\u0631\u062F \u0634\u0648\u06CC\u062F."
    });
  }
  const { userId, personnelId, userEmail, userName, isAdmin } = reqUser;
  const {
    name,
    phone,
    username,
    bank_card_number,
    iban,
    national_id,
    avatar,
    emergency_contact_name,
    emergency_contact_phone,
    emergency_contact_relation,
    family_contacts,
    phones
  } = req.body;
  const targetId = personnelId || userId;
  const existing = personnelData.find(
    (p) => p.id === targetId || userId && p.user_id === userId || userEmail && p.email?.toLowerCase() === userEmail?.toLowerCase()
  );
  if (!isAdmin) {
    const hasUnauthorizedIdentityChange = name !== void 0 && String(name).trim() !== String(existing?.name || "").trim() || phone !== void 0 && String(phone).trim() !== String(existing?.phone || "").trim() || username !== void 0 && String(username).trim() !== String(existing?.username || "").trim() || national_id !== void 0 && String(national_id).trim() !== String(existing?.national_id || "").trim() || avatar !== void 0 && String(avatar || "").trim() !== String(existing?.avatar || existing?.profile_image || "").trim() || emergency_contact_name !== void 0 || emergency_contact_phone !== void 0 || emergency_contact_relation !== void 0 || family_contacts !== void 0 || phones !== void 0;
    if (hasUnauthorizedIdentityChange) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: "\u062A\u0646\u0647\u0627 \u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645 \u0645\u062C\u0627\u0632 \u0628\u0647 \u062A\u063A\u06CC\u06CC\u0631 \u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0647\u0648\u06CC\u062A\u06CC \u0648 \u067E\u0631\u0633\u0646\u0644\u06CC \u0645\u06CC\u200C\u0628\u0627\u0634\u062F. \u0634\u0645\u0627 \u0641\u0642\u0637 \u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u06CC\u062F \u0634\u0645\u0627\u0631\u0647 \u06A9\u0627\u0631\u062A \u0628\u0627\u0646\u06A9\u06CC \u0648 \u0634\u0645\u0627\u0631\u0647 \u0634\u0628\u0627 \u0631\u0627 \u0648\u06CC\u0631\u0627\u06CC\u0634 \u06A9\u0646\u06CC\u062F."
      });
    }
  }
  const personnelPatch = {};
  if (isAdmin) {
    if (name !== void 0) personnelPatch.name = String(name).trim();
    if (phone !== void 0) personnelPatch.phone = String(phone).trim();
    if (username !== void 0) personnelPatch.username = String(username).trim();
    if (national_id !== void 0) personnelPatch.national_id = String(national_id).trim();
    if (avatar !== void 0) personnelPatch.avatar = avatar;
    if (emergency_contact_name !== void 0) personnelPatch.emergency_contact_name = String(emergency_contact_name).trim();
    if (emergency_contact_phone !== void 0) personnelPatch.emergency_contact_phone = String(emergency_contact_phone).trim();
    if (emergency_contact_relation !== void 0) personnelPatch.emergency_contact_relation = String(emergency_contact_relation).trim();
    if (family_contacts !== void 0) personnelPatch.family_contacts = family_contacts;
    if (phones !== void 0) personnelPatch.phones = phones;
  }
  if (bank_card_number !== void 0) personnelPatch.bank_card_number = String(bank_card_number).trim();
  if (iban !== void 0) personnelPatch.iban = String(iban).trim();
  let targetPersonnel = null;
  if (directusUrl && directusAdminToken && targetId) {
    try {
      const directusPersonnelPatch = { ...personnelPatch };
      if (isAdmin && avatar !== void 0) {
        const fileId = extractFileId(avatar);
        if (fileId) directusPersonnelPatch.avatar = fileId;
        else if (!avatar) directusPersonnelPatch.avatar = null;
        else delete directusPersonnelPatch.avatar;
      }
      const patched = await directusFetch(`/items/personnel/${encodeURIComponent(targetId)}`, {
        method: "PATCH",
        body: JSON.stringify(directusPersonnelPatch)
      });
      if (patched?.data) {
        targetPersonnel = enrichPersonnel(patched.data);
      }
      if (isAdmin && userId) {
        const fileId = extractFileId(avatar);
        const userPatch = {};
        if (name !== void 0) userPatch.first_name = String(name).trim();
        if (avatar !== void 0) {
          if (fileId) userPatch.avatar = fileId;
          else if (!avatar) userPatch.avatar = null;
        }
        if (Object.keys(userPatch).length > 0) {
          await directusFetch(`/users/${userId}`, {
            method: "PATCH",
            body: JSON.stringify(userPatch)
          }).catch(() => {
          });
        }
      }
    } catch (err) {
      console.warn("Directus personnel profile PATCH warning:", err.message);
    }
  }
  const idx = personnelData.findIndex(
    (p) => p.id === targetId || userId && p.user_id === userId || userEmail && p.email?.toLowerCase() === userEmail?.toLowerCase()
  );
  if (idx >= 0) {
    personnelData[idx] = { ...personnelData[idx], ...personnelPatch };
    if (!targetPersonnel) targetPersonnel = personnelData[idx];
  } else {
    const newLocal = {
      id: targetId || "p-1",
      name: (isAdmin ? name : void 0) || userName || "\u06A9\u0627\u0631\u0628\u0631 \u0633\u06CC\u0633\u062A\u0645",
      email: userEmail || "",
      phone: (isAdmin ? phone : void 0) || "",
      role: "marketer",
      status: "active",
      active: true,
      ...personnelPatch
    };
    personnelData.push(newLocal);
    if (!targetPersonnel) targetPersonnel = newLocal;
  }
  res.json({
    success: true,
    personnel: targetPersonnel,
    message: "\u0645\u0634\u062E\u0635\u0627\u062A \u067E\u0631\u0648\u0641\u0627\u06CC\u0644 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062F\u0631 \u067E\u0627\u06CC\u06AF\u0627\u0647 \u062F\u0627\u062F\u0647 \u0645\u0631\u06A9\u0632\u06CC \u0630\u062E\u06CC\u0631\u0647 \u0634\u062F."
  });
});
var personnel_routes_default = router;

// server/routes/system.routes.ts
import { Router as Router2 } from "express";
import crypto5 from "crypto";
import fs from "fs";
import path from "path";

// server/services/phoneNormalizer.ts
import crypto4 from "crypto";
function normalizePersianString(str) {
  if (!str) return "";
  return String(str).replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/ي/g, "\u06CC").replace(/ك/g, "\u06A9").replace(/ة/g, "\u0647").replace(/ؤ/g, "\u0648").replace(/إ|أ|آ/g, "\u0627").replace(/\s+/g, " ").trim().toLowerCase();
}
function normalizeContactValue(value, type) {
  if (!value) return "";
  let clean = value.trim();
  const upper = clean.toUpperCase();
  if (upper === "NULL" || upper === "UNDEFINED" || upper === "NONE" || upper === "0" || upper === "NULL,NULL" || clean.length === 0) {
    return "";
  }
  const persianDigits = "\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9";
  const arabicDigits = "\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669";
  clean = clean.replace(/[۰-۹]/g, (w) => persianDigits.indexOf(w).toString());
  clean = clean.replace(/[٠-٩]/g, (w) => arabicDigits.indexOf(w).toString());
  clean = clean.replace(/[\s\-_()]/g, "");
  if (type === "mobile" || type === "landline" || !type && /^[+0-9]/.test(clean)) {
    clean = clean.replace(/^(\+98|0098)/, "0");
    if (/^9\d{9}$/.test(clean)) {
      clean = "0" + clean;
    }
  } else if (type === "telegram" || type === "instagram") {
    clean = clean.replace(/^@+/, "").toLowerCase();
    clean = clean.replace(/^https?:\/\/(www\.)?(t\.me|telegram\.me|instagram\.com)\//i, "");
    clean = clean.replace(/\/$/, "");
  } else if (type === "email" || type === "website") {
    clean = clean.toLowerCase();
  }
  const cleanUpper = clean.toUpperCase();
  if (cleanUpper === "NULL" || cleanUpper === "UNDEFINED" || cleanUpper === "NONE") return "";
  return clean;
}
function cleanCustomerPayloadForDirectus(payload, id, resolvedMarketerId, resolvedMarketerName) {
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  let marketerId = resolvedMarketerId !== void 0 ? resolvedMarketerId : payload.assigned_marketer_id || null;
  if (!marketerId || marketerId === "\u0647\u0645\u0647" || String(marketerId).trim() === "" || marketerId === "none") {
    marketerId = null;
  }
  let nextFollowup = payload.next_followup_date || null;
  if (!nextFollowup || String(nextFollowup).trim() === "") {
    nextFollowup = null;
  } else {
    try {
      nextFollowup = new Date(nextFollowup).toISOString();
    } catch {
      nextFollowup = null;
    }
  }
  let deadline = payload.assignment_deadline || null;
  if (!deadline && payload.assignment_duration_days) {
    deadline = addDays(/* @__PURE__ */ new Date(), parseInt(payload.assignment_duration_days, 10));
  } else if (!deadline) {
    deadline = addDays(/* @__PURE__ */ new Date(), 7);
  } else {
    try {
      deadline = new Date(deadline).toISOString();
    } catch {
      deadline = addDays(/* @__PURE__ */ new Date(), 7);
    }
  }
  const clean = {
    id,
    company_name: (payload.company_name || "\u0628\u062F\u0648\u0646 \u0646\u0627\u0645").trim(),
    business_type: (payload.business_type || "").trim(),
    province: (payload.province || "").trim(),
    city: (payload.city || "").trim(),
    mobile_numbers: Array.isArray(payload.mobile_numbers) ? payload.mobile_numbers.filter(Boolean) : payload.mobile_numbers ? [payload.mobile_numbers] : [],
    landline_numbers: Array.isArray(payload.landline_numbers) ? payload.landline_numbers.filter(Boolean) : payload.landline_numbers ? [payload.landline_numbers] : [],
    telegram_phone: (payload.telegram_phone || "").trim(),
    telegram_ids: Array.isArray(payload.telegram_ids) ? payload.telegram_ids.filter(Boolean) : payload.telegram_ids ? [payload.telegram_ids] : [],
    instagram_ids: Array.isArray(payload.instagram_ids) ? payload.instagram_ids.filter(Boolean) : payload.instagram_ids ? [payload.instagram_ids] : [],
    emails: Array.isArray(payload.emails) ? payload.emails.filter(Boolean) : payload.emails ? [payload.emails] : [],
    websites: Array.isArray(payload.websites) ? payload.websites.filter(Boolean) : payload.websites ? [payload.websites] : [],
    is_ecommerce: Boolean(payload.is_ecommerce),
    manager_name: (payload.manager_name || "").trim(),
    manager_phones: Array.isArray(payload.manager_phones) ? payload.manager_phones.filter(Boolean) : payload.manager_phones ? [payload.manager_phones] : [],
    negotiator_name: (payload.negotiator_name || "").trim(),
    negotiator_phones: Array.isArray(payload.negotiator_phones) ? payload.negotiator_phones.filter(Boolean) : payload.negotiator_phones ? [payload.negotiator_phones] : [],
    interview_status: payload.interview_status || "\u0645\u0635\u0627\u062D\u0628\u0647 \u0627\u0648\u0644\u06CC\u0647 \u0627\u0646\u062C\u0627\u0645 \u0634\u062F\u0647",
    interview_report: (payload.interview_report || "").trim(),
    interview_score: Number(payload.interview_score) || 5,
    next_followup_date: nextFollowup,
    assigned_marketer_id: marketerId,
    assigned_marketer_name: (resolvedMarketerName || payload.assigned_marketer_name || "\u062A\u062E\u0635\u06CC\u0635 \u0646\u06CC\u0627\u0641\u062A\u0647").trim(),
    assignment_deadline: deadline,
    assignment_duration_days: payload.assignment_duration_days ? parseInt(payload.assignment_duration_days, 10) : 7,
    status: payload.status || "\u062A\u0645\u0627\u0633 \u0628\u0631\u0642\u0631\u0627\u0631 \u0646\u0634\u062F\u0647",
    is_expired: Boolean(payload.is_expired),
    claimed_from_pool: payload.claimed_from_pool !== void 0 ? Boolean(payload.claimed_from_pool) : false,
    claimed_from_pool_at: payload.claimed_from_pool_at || null,
    tenant_id: resolveDirectusTenantId(payload.tenant_id) || 1,
    date_created: payload.date_created || nowIso,
    date_updated: nowIso
  };
  return clean;
}
function extractCustomerContacts(payload, customerId) {
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const list = [];
  const seenContacts = /* @__PURE__ */ new Set();
  const appendContactSafe = (c, defaultType = "mobile") => {
    if (!c || !c.value || !String(c.value).trim()) return;
    const val = String(c.value).trim();
    const chType = c.channel_type || defaultType;
    const norm = normalizeContactValue(val, chType);
    const key = `${chType}:${norm || val.toLowerCase()}`;
    if (seenContacts.has(key)) return;
    seenContacts.add(key);
    const isUuid = c.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c.id);
    list.push({
      id: isUuid ? c.id : crypto4.randomUUID(),
      customer_id: customerId,
      channel_type: chType,
      value: val,
      normalized_value: norm,
      contact_name: (c.contact_name || "").trim(),
      contact_role: (c.contact_role || "").trim(),
      is_primary: Boolean(c.is_primary),
      notes: (c.notes || "").trim(),
      date_created: c.date_created || nowIso,
      date_updated: nowIso
    });
  };
  if (Array.isArray(payload.contacts) && payload.contacts.length > 0) {
    for (const c of payload.contacts) {
      appendContactSafe(c, c.channel_type || "mobile");
    }
  } else {
    const mobiles = Array.isArray(payload.mobile_numbers) ? payload.mobile_numbers : [];
    mobiles.forEach((m, idx) => {
      appendContactSafe(
        {
          value: String(m).trim(),
          channel_type: "mobile",
          contact_name: payload.manager_name || "\u0645\u062F\u06CC\u0631",
          contact_role: idx === 0 ? "\u0645\u0648\u0628\u0627\u06CC\u0644 \u0627\u0635\u0644\u06CC" : "\u0645\u0648\u0628\u0627\u06CC\u0644 \u062F\u0648\u0645",
          is_primary: idx === 0
        },
        "mobile"
      );
    });
    const landlines = Array.isArray(payload.landline_numbers) ? payload.landline_numbers : [];
    landlines.forEach((l) => {
      appendContactSafe(
        {
          value: String(l).trim(),
          channel_type: "landline",
          contact_name: "\u062F\u0641\u062A\u0631 \u0645\u0631\u06A9\u0632\u06CC",
          contact_role: "\u062A\u0644\u0641\u0646 \u062B\u0627\u0628\u062A",
          is_primary: false
        },
        "landline"
      );
    });
    const telegrams = Array.isArray(payload.telegram_ids) ? payload.telegram_ids : [];
    telegrams.forEach((t) => {
      appendContactSafe(
        {
          value: String(t).trim(),
          channel_type: "telegram",
          contact_name: "\u0627\u06A9\u0627\u0646\u062A \u062A\u0644\u06AF\u0631\u0627\u0645",
          contact_role: "\u0633\u0648\u0634\u0627\u0644",
          is_primary: false
        },
        "telegram"
      );
    });
    const instagrams = Array.isArray(payload.instagram_ids) ? payload.instagram_ids : [];
    instagrams.forEach((i) => {
      appendContactSafe(
        {
          value: String(i).trim(),
          channel_type: "instagram",
          contact_name: "\u067E\u06CC\u062C \u0627\u06CC\u0646\u0633\u062A\u0627\u06AF\u0631\u0627\u0645",
          contact_role: "\u0633\u0648\u0634\u0627\u0644",
          is_primary: false
        },
        "instagram"
      );
    });
    const emails = Array.isArray(payload.emails) ? payload.emails : [];
    emails.forEach((em) => {
      appendContactSafe(
        {
          value: String(em).trim(),
          channel_type: "email",
          contact_name: "\u067E\u0633\u062A \u0627\u0644\u06A9\u062A\u0631\u0648\u0646\u06CC\u06A9",
          contact_role: "\u0627\u06CC\u0645\u06CC\u0644",
          is_primary: false
        },
        "email"
      );
    });
  }
  if (list.length > 0 && !list.some((c) => c.is_primary)) {
    list[0].is_primary = true;
  }
  return list;
}
function customerMatchesContactValue(cust, normalized, channelType) {
  if (!cust || !normalized) return false;
  const checkVal = (val, type) => {
    if (!val) return false;
    const norm = normalizeContactValue(String(val), type || channelType);
    return norm !== "" && norm === normalized;
  };
  const mobiles = Array.isArray(cust.mobile_numbers) ? cust.mobile_numbers : [];
  const landlines = Array.isArray(cust.landline_numbers) ? cust.landline_numbers : [];
  const mgrPhones = Array.isArray(cust.manager_phones) ? cust.manager_phones : [];
  const negPhones = Array.isArray(cust.negotiator_phones) ? cust.negotiator_phones : [];
  if (mobiles.some((v) => checkVal(v, "mobile"))) return true;
  if (landlines.some((v) => checkVal(v, "landline"))) return true;
  if (mgrPhones.some((v) => checkVal(v, "mobile"))) return true;
  if (negPhones.some((v) => checkVal(v, "mobile"))) return true;
  if (cust.telegram_phone && checkVal(cust.telegram_phone, "mobile")) return true;
  if (channelType === "telegram" || !channelType) {
    const tids = Array.isArray(cust.telegram_ids) ? cust.telegram_ids : [];
    if (tids.some((v) => checkVal(v, "telegram"))) return true;
  }
  if (channelType === "instagram" || !channelType) {
    const iids = Array.isArray(cust.instagram_ids) ? cust.instagram_ids : [];
    if (iids.some((v) => checkVal(v, "instagram"))) return true;
  }
  if (channelType === "email" || !channelType) {
    const emails = Array.isArray(cust.emails) ? cust.emails : [];
    if (emails.some((v) => checkVal(v, "email"))) return true;
  }
  if (channelType === "website" || !channelType) {
    const webs = Array.isArray(cust.websites) ? cust.websites : [];
    if (webs.some((v) => checkVal(v, "website"))) return true;
  }
  if (Array.isArray(cust.contacts)) {
    if (cust.contacts.some((ct) => checkVal(ct?.normalized_value || ct?.value, ct?.channel_type))) {
      return true;
    }
  }
  return false;
}
function buildDuplicateResult(expCust, matchedContact, reportsCount = 0) {
  const statusStr = String(expCust.status || "").trim();
  const isContract = statusStr === "\u0642\u0631\u0627\u0631\u062F\u0627\u062F" || statusStr === "\u0642\u0631\u0627\u0631\u062F\u0627\u062F / \u0641\u0627\u06A9\u062A\u0648\u0631" || statusStr === "\u0642\u0631\u0627\u0631\u062F\u0627\u062F/\u0641\u0627\u06A9\u062A\u0648\u0631";
  const isBlacklisted = statusStr === "\u0644\u06CC\u0633\u062A \u0633\u06CC\u0627\u0647";
  const isUnassigned = !expCust.assigned_marketer_id || expCust.assigned_marketer_name === "\u062A\u062E\u0635\u06CC\u0635 \u0646\u06CC\u0627\u0641\u062A\u0647";
  const isDeadlinePassed = Boolean(
    expCust.is_expired || expCust.assignment_deadline && Date.now() > new Date(expCust.assignment_deadline).getTime()
  );
  const isFreePool = !isContract && !isBlacklisted && (isDeadlinePassed || isUnassigned);
  const conflictType = isContract ? "contract" : isFreePool ? "expired" : "active_marketer";
  let message = "";
  if (conflictType === "active_marketer") {
    if (isBlacklisted) {
      message = `\u0627\u06CC\u0646 \u0634\u0645\u0627\u0631\u0647 \u0645\u062A\u0639\u0644\u0642 \u0628\u0647 \u067E\u0631\u0648\u0646\u062F\u0647 \xAB${expCust.company_name}\xBB \u062F\u0631 \u0644\u06CC\u0633\u062A \u0633\u06CC\u0627\u0647 \u0627\u0633\u062A.`;
    } else {
      message = `\u0627\u06CC\u0646 \u0634\u0645\u0627\u0631\u0647/\u0627\u06A9\u0627\u0646\u062A \u0642\u0628\u0644\u0627\u064B \u0628\u0631\u0627\u06CC \u0645\u0634\u062A\u0631\u06CC \xAB${expCust.company_name}\xBB \u062F\u0631 \u0627\u062E\u062A\u06CC\u0627\u0631 \u0628\u0627\u0632\u0627\u0631\u06CC\u0627\u0628 \xAB${expCust.assigned_marketer_name}\xBB \u062B\u0628\u062A \u0634\u062F\u0647 \u0648 \u0645\u0647\u0644\u062A \u0648\u0627\u06AF\u0630\u0627\u0631\u06CC \u0622\u0646 \u0647\u0646\u0648\u0632 \u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A.`;
    }
  } else if (conflictType === "contract") {
    message = `\u0627\u06CC\u0646 \u0634\u0645\u0627\u0631\u0647 \u0645\u062A\u0639\u0644\u0642 \u0628\u0647 \u0645\u0634\u062A\u0631\u06CC \u0642\u0637\u0639\u06CC \xAB${expCust.company_name}\xBB \u0628\u0627 \u0642\u0631\u0627\u0631\u062F\u0627\u062F \u0631\u0633\u0645\u06CC \u0627\u0633\u062A (\u0628\u0627\u0632\u0627\u0631\u06CC\u0627\u0628: ${expCust.assigned_marketer_name}).`;
  } else {
    message = `\u0627\u06CC\u0646 \u0634\u0645\u0627\u0631\u0647 \u0627\u0632 \u0642\u0628\u0644 \u062F\u0631 \u0628\u062E\u0634 \u0645\u0634\u062A\u0631\u06CC\u0627\u0646 \u0622\u0632\u0627\u062F \u0628\u0631\u0627\u06CC \u067E\u0631\u0648\u0646\u062F\u0647 \xAB${expCust.company_name}\xBB \u0648\u062C\u0648\u062F \u062F\u0627\u0631\u062F. \u0628\u0627 \u062A\u0623\u06CC\u06CC\u062F \u0627\u0646\u062A\u0642\u0627\u0644 \u0645\u0627\u0644\u06A9\u06CC\u062A\u060C \u067E\u0631\u0648\u0646\u062F\u0647 \u0628\u0647 \u0634\u0645\u0627 \u0645\u0646\u062A\u0642\u0644 \u0634\u062F\u0647 \u0648 \u06AF\u0632\u0627\u0631\u0634\u200C\u0647\u0627\u06CC \u0642\u0628\u0644\u06CC \u0622\u0646 \u0646\u0645\u0627\u06CC\u0634 \u062F\u0627\u062F\u0647 \u0645\u06CC\u200C\u0634\u0648\u062F.`;
  }
  return {
    isDuplicate: true,
    conflictType,
    isFreePool,
    matchedContact,
    matchedCustomer: {
      id: expCust.id,
      company_name: expCust.company_name,
      manager_name: expCust.manager_name || "",
      business_type: expCust.business_type || "",
      province: expCust.province || "",
      city: expCust.city || "",
      assigned_marketer_name: expCust.assigned_marketer_name || "\u062A\u062E\u0635\u06CC\u0635 \u0646\u06CC\u0627\u0641\u062A\u0647",
      assigned_marketer_id: expCust.assigned_marketer_id || "",
      assignment_deadline: expCust.assignment_deadline || "",
      is_expired: isDeadlinePassed || isUnassigned,
      status: expCust.status,
      reports_count: reportsCount
    },
    message
  };
}
async function asyncCheckContactDuplicate(value, channelType, currentCustomerId) {
  if (!value || value.trim().length < 3) return null;
  const normalized = normalizeContactValue(value, channelType);
  if (!normalized) return null;
  if (directusUrl && directusAdminToken) {
    try {
      const q = `/items/customer_contacts?filter[_or][0][normalized_value][_eq]=${encodeURIComponent(
        normalized
      )}&filter[_or][1][value][_eq]=${encodeURIComponent(value.trim())}&fields=*,customer_id.*`;
      const result = await directusFetch(q);
      if (result && Array.isArray(result.data) && result.data.length > 0) {
        for (const item of result.data) {
          let cust = item.customer_id;
          const custId = cust && typeof cust === "object" ? cust.id : typeof cust === "string" ? cust : null;
          if (currentCustomerId && custId && String(custId).toLowerCase() === String(currentCustomerId).toLowerCase()) {
            continue;
          }
          if (custId) {
            if (typeof cust !== "object" || !cust.company_name) {
              const fetched = await directusFetch(`/items/customers/${custId}`).catch(() => null);
              if (fetched && fetched.data) cust = fetched.data;
            }
            if (cust) {
              const expCust2 = computeCustomerExpiration(cust);
              const repCountRes = await directusFetch(
                `/items/customer_reports?aggregate[count]=*&filter[customer_id][_eq]=${encodeURIComponent(custId)}`
              ).catch(() => null);
              const reportsCount2 = Number(repCountRes?.data?.[0]?.count || 0);
              return buildDuplicateResult(expCust2, item, reportsCount2);
            }
          }
        }
      }
      const cachedCustomers = await ensureCustomersCache().catch(() => []);
      for (const rawCust of cachedCustomers) {
        if (currentCustomerId && rawCust?.id && String(rawCust.id).toLowerCase() === String(currentCustomerId).toLowerCase()) {
          continue;
        }
        if (customerMatchesContactValue(rawCust, normalized, channelType)) {
          const expCust2 = computeCustomerExpiration(rawCust);
          const repCountRes = await directusFetch(
            `/items/customer_reports?aggregate[count]=*&filter[customer_id][_eq]=${encodeURIComponent(expCust2.id)}`
          ).catch(() => null);
          const reportsCount2 = Number(repCountRes?.data?.[0]?.count || 0);
          return buildDuplicateResult(expCust2, null, reportsCount2);
        }
      }
      return null;
    } catch (e) {
      console.warn("Database duplicate check error:", e.message);
      return null;
    }
  }
  updateExpirationFlags();
  const matchedContact = contactsData.find((c) => {
    if (currentCustomerId && c.customer_id === currentCustomerId) return false;
    const cNorm = c.normalized_value || normalizeContactValue(c.value, c.channel_type);
    return cNorm === normalized;
  });
  let matchedCustomer = matchedContact ? customersData.find((cust) => cust.id === matchedContact.customer_id) : void 0;
  if (!matchedCustomer) {
    matchedCustomer = customersData.find((cust) => {
      if (currentCustomerId && cust.id === currentCustomerId) return false;
      return customerMatchesContactValue(cust, normalized, channelType);
    });
  }
  if (!matchedCustomer) return null;
  const expCust = computeCustomerExpiration(matchedCustomer);
  const reportsCount = reportsData.filter(
    (r) => String(r.customer_id) === String(matchedCustomer.id)
  ).length;
  return buildDuplicateResult(expCust, matchedContact || null, reportsCount);
}

// server/routes/system.routes.ts
var router2 = Router2();
router2.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
router2.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
router2.get("/bff-status", (req, res) => {
  const isOnline = Boolean(directusUrl && directusAdminToken && !isDirectusCircuitOpen());
  res.json({
    online: isOnline,
    mode: isOnline ? "online_database" : "in_memory_fallback",
    url: directusUrl || "",
    database: isOnline ? "Directus" : "In-Memory Store"
  });
});
router2.get("/api/bff-status", (req, res) => {
  const isOnline = Boolean(directusUrl && directusAdminToken && !isDirectusCircuitOpen());
  res.json({
    online: isOnline,
    mode: isOnline ? "online_database" : "in_memory_fallback",
    url: directusUrl || "",
    database: isOnline ? "Directus" : "In-Memory Store"
  });
});
var dashboardSummaryCacheMap = /* @__PURE__ */ new Map();
var globalCallIdToUUIDMap = /* @__PURE__ */ new Map();
var uidToPersonnelMap = /* @__PURE__ */ new Map();
var migrationPersonnelCache = null;
var migrationCustomersCache = null;
var migrationCacheLastFetch = 0;
var DASHBOARD_CACHE_TTL_MS = 3e4;
function invalidateDashboardSummaryCache() {
  dashboardSummaryCacheMap.clear();
}
var handleDashboardSummary = async (req, res) => {
  const { userId, personnelId, isAdmin, isPersonnelAdmin, canViewAllCustomers, reportViewScope, userName, tenantId } = getRequestUser(req);
  const canViewAll = Boolean(isAdmin || isPersonnelAdmin || canViewAllCustomers || reportViewScope === "all");
  const cacheKey = `${tenantId || "all"}_${canViewAll ? "admin" : userId || userName || "staff"}`;
  const now2 = Date.now();
  const cached = dashboardSummaryCacheMap.get(cacheKey);
  if (cached && now2 - cached.timestamp < DASHBOARD_CACHE_TTL_MS) {
    return res.json(cached.data);
  }
  if (directusUrl && directusAdminToken && !isDirectusCircuitOpen()) {
    try {
      let tenantFilterStr = "";
      if (tenantId && tenantId !== "all") {
        const tenantNum = resolveDirectusTenantId(tenantId);
        if (tenantNum && tenantNum > 1) {
          tenantFilterStr = `&filter[tenant_id][_eq]=${tenantNum}`;
        }
      }
      const cleanPId = personnelId ? String(personnelId).trim().toLowerCase() : "";
      const rawUid = cleanPId.replace(/^p-/, "");
      const cleanUId = userId ? String(userId).trim().toLowerCase() : "";
      const normUserName = userName ? userName.trim() : "";
      let marketerCustFilter = "";
      let marketerRepFilter = "";
      let marketerLeadFilter = "";
      if (!canViewAll) {
        if (cleanPId) {
          marketerCustFilter = `&filter[_or][0][assigned_marketer_id][_eq]=${encodeURIComponent(cleanPId)}`;
          if (rawUid && rawUid !== cleanPId) {
            marketerCustFilter += `&filter[_or][1][assigned_marketer_id][_eq]=${encodeURIComponent(rawUid)}`;
            marketerCustFilter += `&filter[_or][2][assigned_marketer_id][_eq]=${encodeURIComponent("p-" + rawUid)}`;
          }
          if (normUserName) {
            marketerCustFilter += `&filter[_or][3][assigned_marketer_name][_icontains]=${encodeURIComponent(normUserName)}`;
          }
        } else if (normUserName) {
          marketerCustFilter = `&filter[assigned_marketer_name][_icontains]=${encodeURIComponent(normUserName)}`;
        }
        if (normUserName) {
          marketerRepFilter = `&filter[negotiator_name][_icontains]=${encodeURIComponent(normUserName)}`;
        } else if (cleanPId) {
          const matchedP = personnelData.find((p) => p.id === cleanPId || p.user_id === cleanPId);
          if (matchedP?.name) {
            marketerRepFilter = `&filter[negotiator_name][_icontains]=${encodeURIComponent(matchedP.name.trim())}`;
          }
        }
        if (cleanPId) {
          marketerLeadFilter = `&filter[assigned_to][_eq]=${encodeURIComponent(cleanPId)}`;
        }
      }
      const [
        totalCustomersRes,
        freeCustomersRes,
        expiredCustomersRes,
        contractsWonCustomersRes,
        reportsAggregateRes,
        totalColdLeadsRes,
        adminReportsRes,
        pendingLeavesRes,
        pendingAdvancesRes
      ] = await Promise.all([
        directusFetch(`/items/customers?limit=1&meta=filter_count${tenantFilterStr}${marketerCustFilter}`).catch(() => null),
        directusFetch(`/items/customers?limit=1&meta=filter_count&filter[_or][0][assigned_marketer_id][_null]=true&filter[_or][1][is_expired][_eq]=true${tenantFilterStr}`).catch(() => null),
        directusFetch(`/items/customers?limit=1&meta=filter_count&filter[is_expired][_eq]=true${tenantFilterStr}${marketerCustFilter}`).catch(() => null),
        directusFetch(`/items/customers?limit=1&meta=filter_count&filter[status][_eq]=%D9%82%D8%B1%D8%A7%D8%B1%D8%AF%D8%A7%D8%AF${tenantFilterStr}${marketerCustFilter}`).catch(() => null),
        directusFetch(`/items/customer_reports?aggregate[count]=*&aggregate[sum]=contract_amount&aggregate[avg]=negotiation_score${tenantFilterStr}${marketerRepFilter}`).catch(() => null),
        directusFetch(`/items/cold_leads?limit=1&meta=filter_count${tenantFilterStr}${marketerLeadFilter}`).catch(() => null),
        directusFetch(`/items/administrative_reports?limit=1&meta=filter_count${tenantFilterStr}`).catch(() => null),
        directusFetch(`/items/leave_requests?limit=1&meta=filter_count&filter[status][_eq]=pending${tenantFilterStr}`).catch(() => null),
        directusFetch(`/items/advance_requests?limit=1&meta=filter_count&filter[status][_eq]=pending${tenantFilterStr}`).catch(() => null)
      ]);
      const totalCustomers = totalCustomersRes?.meta?.filter_count ?? totalCustomersRes?.meta?.total_count ?? 0;
      const freeCustomers = freeCustomersRes?.meta?.filter_count ?? 0;
      const expiredCustomers = expiredCustomersRes?.meta?.filter_count ?? 0;
      const contractsWon = contractsWonCustomersRes?.meta?.filter_count ?? 0;
      let totalReports = 0;
      let totalRevenue = 0;
      let avgScore = 8.5;
      if (reportsAggregateRes?.data && Array.isArray(reportsAggregateRes.data) && reportsAggregateRes.data.length > 0) {
        const repItem = reportsAggregateRes.data[0];
        totalReports = Number(repItem.count || 0);
        totalRevenue = Number(repItem.sum?.contract_amount || 0);
        const rawAvg = Number(repItem.avg?.negotiation_score);
        if (!isNaN(rawAvg) && rawAvg > 0) {
          avgScore = Math.round(rawAvg * 10) / 10;
        }
      }
      const totalColdLeads = totalColdLeadsRes?.meta?.filter_count ?? totalColdLeadsRes?.meta?.total_count ?? 0;
      const adminReportsCount = adminReportsRes?.meta?.filter_count ?? adminReportsRes?.meta?.total_count ?? 0;
      const pendingLeaves = pendingLeavesRes?.meta?.filter_count ?? 0;
      const pendingAdvances = pendingAdvancesRes?.meta?.filter_count ?? 0;
      const upcomingFollowups = [];
      const urgentExpiringCustomers = [];
      const inNegotiationCount = Math.max(0, totalCustomers - contractsWon);
      const resultPayload = {
        total_customers: totalCustomers,
        contracts_won_count: contractsWon,
        in_negotiation_count: inNegotiationCount,
        expired_customers_count: expiredCustomers,
        free_customers_count: freeCustomers,
        total_reports_count: totalReports,
        total_cold_leads_count: totalColdLeads,
        admin_reports_count: adminReportsCount,
        pending_leave_count: pendingLeaves,
        pending_advance_count: pendingAdvances,
        total_contract_revenue: totalRevenue,
        avg_negotiation_score: avgScore,
        upcoming_followups: upcomingFollowups,
        urgent_expiring_customers: urgentExpiringCustomers
      };
      dashboardSummaryCacheMap.set(cacheKey, { data: resultPayload, timestamp: Date.now() });
      return res.json(resultPayload);
    } catch (err) {
      console.warn("Dashboard summary error:", err.message);
    }
  }
  const startOfTodayMs = (/* @__PURE__ */ new Date()).setHours(0, 0, 0, 0);
  const sortedUpcomingFollowups = customersData.filter((c) => Boolean(c.next_followup_date) && !isNaN(new Date(c.next_followup_date).getTime())).sort((a, b) => {
    const aTime = new Date(a.next_followup_date).getTime();
    const bTime = new Date(b.next_followup_date).getTime();
    const aUp = aTime >= startOfTodayMs;
    const bUp = bTime >= startOfTodayMs;
    if (aUp && !bUp) return -1;
    if (!aUp && bUp) return 1;
    if (aUp && bUp) return aTime - bTime;
    return bTime - aTime;
  }).slice(0, 5);
  const urgentExpiring = customersData.filter((c) => {
    if (!c.assignment_deadline || c.is_expired || c.status === "\u0642\u0631\u0627\u0631\u062F\u0627\u062F" || c.status === "\u0644\u06CC\u0633\u062A \u0633\u06CC\u0627\u0647") return false;
    const days = Math.ceil((new Date(c.assignment_deadline).getTime() - Date.now()) / 864e5);
    return days >= 0 && days <= 3;
  }).slice(0, 5);
  res.json({
    total_customers: customersData.length,
    contracts_won_count: customersData.filter((c) => c.status === "\u0642\u0631\u0627\u0631\u062F\u0627\u062F").length,
    in_negotiation_count: customersData.filter((c) => c.status !== "\u0642\u0631\u0627\u0631\u062F\u0627\u062F").length,
    expired_customers_count: customersData.filter((c) => c.is_expired).length,
    free_customers_count: customersData.filter((c) => !c.assigned_marketer_id || c.is_expired).length,
    total_reports_count: reportsData.length,
    total_cold_leads_count: 0,
    admin_reports_count: 0,
    pending_leave_count: 0,
    pending_advance_count: 0,
    total_contract_revenue: 0,
    avg_negotiation_score: 8.5,
    upcoming_followups: sortedUpcomingFollowups,
    urgent_expiring_customers: urgentExpiring
  });
};
router2.get("/api/dashboard-summary", handleDashboardSummary);
router2.get("/api/dashboard/summary", handleDashboardSummary);
router2.get("/api/project-settings", async (req, res) => {
  if (directusUrl && directusAdminToken) {
    try {
      const resp = await directusFetch("/items/project_settings").catch(() => null);
      if (resp?.data) {
        const item = Array.isArray(resp.data) ? resp.data[0] : resp.data;
        if (item) {
          updateProjectSettingsData(item);
        }
      }
    } catch {
    }
  }
  res.json(projectSettingsData);
});
router2.patch("/api/project-settings", async (req, res) => {
  const payload = req.body;
  const { isAdmin } = getRequestUser(req);
  if (!isAdmin) {
    return res.status(403).json({ error: "\u062A\u0646\u0647\u0627 \u0645\u062F\u06CC\u0631 \u06A9\u0644 \u0633\u06CC\u0633\u062A\u0645 \u062F\u0633\u062A\u0631\u0633\u06CC \u0628\u0647 \u0648\u06CC\u0631\u0627\u06CC\u0634 \u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u067E\u0631\u0648\u0698\u0647\u200C\u0647\u0627 \u0648 \u067E\u062A\u0631\u0646\u200C\u0647\u0627\u06CC \u067E\u06CC\u0627\u0645\u06A9 \u0631\u0627 \u062F\u0627\u0631\u062F." });
  }
  updateProjectSettingsData(payload);
  if (directusUrl && directusAdminToken) {
    try {
      const fetchExist = await directusFetch("/items/project_settings").catch(() => null);
      const existingList = fetchExist?.data;
      if (Array.isArray(existingList) && existingList.length > 0) {
        const existingId = existingList[0].id;
        await directusFetch(`/items/project_settings/${existingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
      } else {
        await directusFetch("/items/project_settings", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
    } catch (err) {
      console.warn("Directus project_settings save error:", err.message);
    }
  }
  res.json({ success: true, settings: projectSettingsData });
});
router2.post("/api/project-settings/test-sms", async (req, res) => {
  const { phone, pattern_code, variables, api_key, sender } = req.body;
  if (!phone || !pattern_code) {
    return res.status(400).json({ success: false, error: "\u0634\u0645\u0627\u0631\u0647 \u062A\u0644\u0641\u0646 \u0648 \u06A9\u062F \u067E\u062A\u0631\u0646 \u0627\u0644\u0632\u0627\u0645\u06CC \u0647\u0633\u062A\u0646\u062F." });
  }
  const result = await sendIppanelSmsPattern(phone, pattern_code, variables || {}, api_key, sender, {
    skipDedup: true
  });
  if (result.success) {
    return res.json({ success: true, messageId: result.messageId });
  } else {
    return res.status(400).json({ success: false, error: result.error });
  }
});
var handleGetTenantSettings = async (req, res) => {
  const rawTenantId = typeof req.query.tenant_id === "string" && req.query.tenant_id.trim() || getRequestTenantId(req) || "default";
  const resolvedNum = rawTenantId !== "all" ? resolveDirectusTenantId(rawTenantId) : null;
  const targetKey = resolvedNum ? String(resolvedNum) : rawTenantId;
  const allItems = [];
  if (directusUrl && directusAdminToken && !isDirectusCircuitOpen()) {
    try {
      const resp = await directusFetch("/items/tenant_settings?limit=200&sort=id");
      if (resp && Array.isArray(resp.data)) {
        tenantSettingsMap.clear();
        for (const item of resp.data) {
          const tId = extractDirectusTenantIdString(item?.tenant_id);
          if (!tId) continue;
          const phones = parseSmsPhones(item?.sms_phones);
          const entry = {
            id: item.id !== void 0 ? String(item.id) : `ts-${tId}`,
            tenant_id: tId,
            sms_phones: phones
          };
          tenantSettingsMap.set(tId, entry);
          allItems.push({
            id: item.id,
            tenant_id: tId,
            sms_phones: phones
          });
        }
        const matched = allItems.find(
          (it) => it.tenant_id === targetKey || it.tenant_id === rawTenantId || resolvedNum !== null && it.tenant_id === String(resolvedNum)
        );
        return res.json({
          id: matched?.id ?? null,
          tenant_id: targetKey,
          sms_phones: matched ? matched.sms_phones : [],
          items: allItems
        });
      }
    } catch (err) {
      console.warn("Directus tenant_settings fetch error:", err.message);
    }
  }
  for (const [, v] of tenantSettingsMap.entries()) {
    allItems.push({
      id: v.id ?? `ts-${v.tenant_id}`,
      tenant_id: String(v.tenant_id),
      sms_phones: parseSmsPhones(v.sms_phones)
    });
  }
  const localMatched = tenantSettingsMap.get(targetKey) || tenantSettingsMap.get(rawTenantId) || (resolvedNum !== null ? tenantSettingsMap.get(String(resolvedNum)) : void 0);
  return res.json({
    id: localMatched?.id ?? null,
    tenant_id: targetKey,
    sms_phones: localMatched ? parseSmsPhones(localMatched.sms_phones) : [],
    items: allItems
  });
};
router2.get("/api/tenant-settings", handleGetTenantSettings);
router2.get("/tenant-settings", handleGetTenantSettings);
var handleSaveTenantSettings = async (req, res) => {
  const { isAuthenticated, isAdmin, userRole } = getRequestUser(req);
  if (!isAuthenticated || !isAdmin && userRole !== "admin") {
    return res.status(403).json({
      error: "FORBIDDEN",
      message: "\u062A\u0646\u0647\u0627 \u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645 \u0645\u062C\u0627\u0632 \u0628\u0647 \u0648\u06CC\u0631\u0627\u06CC\u0634 \u0634\u0645\u0627\u0631\u0647\u200C\u0647\u0627\u06CC \u067E\u06CC\u0627\u0645\u06A9 \u0627\u0637\u0644\u0627\u0639\u200C\u0631\u0633\u0627\u0646\u06CC \u0633\u0627\u0632\u0645\u0627\u0646 \u0627\u0633\u062A."
    });
  }
  const rawTenantId = (req.body?.tenant_id !== void 0 && req.body?.tenant_id !== null ? String(req.body.tenant_id).trim() : "") || (typeof req.query.tenant_id === "string" ? req.query.tenant_id.trim() : "") || getRequestTenantId(req);
  if (!rawTenantId || rawTenantId === "all") {
    return res.status(400).json({
      error: "INVALID_TENANT",
      message: "\u0644\u0637\u0641\u0627\u064B \u06CC\u06A9 \u0633\u0627\u0632\u0645\u0627\u0646 \u0645\u0634\u062E\u0635 \u0631\u0627 \u0628\u0631\u0627\u06CC \u0630\u062E\u06CC\u0631\u0647 \u0634\u0645\u0627\u0631\u0647\u200C\u0647\u0627\u06CC \u0645\u062F\u06CC\u0631\u06CC\u062A \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F."
    });
  }
  const resolvedNum = resolveDirectusTenantId(rawTenantId);
  const effectiveTenantId = resolvedNum ? String(resolvedNum) : rawTenantId;
  const phonesArr = parseSmsPhones(req.body?.sms_phones);
  const phonesStr = phonesArr.join(", ");
  let savedId = `ts-${effectiveTenantId}`;
  if (directusUrl && directusAdminToken && !isDirectusCircuitOpen()) {
    try {
      const targetFilterId = resolvedNum || rawTenantId;
      const existingRes = await directusFetch(
        `/items/tenant_settings?filter[tenant_id][_eq]=${encodeURIComponent(String(targetFilterId))}&limit=1`
      ).catch(() => null);
      const existingItem = existingRes?.data && Array.isArray(existingRes.data) && existingRes.data.length > 0 ? existingRes.data[0] : null;
      if (existingItem?.id) {
        const patched = await directusFetch(`/items/tenant_settings/${existingItem.id}`, {
          method: "PATCH",
          body: JSON.stringify({ sms_phones: phonesStr })
        });
        savedId = patched?.data?.id ?? existingItem.id;
      } else {
        const created = await directusFetch("/items/tenant_settings", {
          method: "POST",
          body: JSON.stringify({
            tenant_id: resolvedNum || rawTenantId,
            sms_phones: phonesStr
          })
        });
        if (created?.data?.id) {
          savedId = created.data.id;
        }
      }
    } catch (err) {
      console.warn("Directus tenant_settings save error:", err.message);
      return res.status(500).json({
        error: "DIRECTUS_ERROR",
        message: "\u062E\u0637\u0627 \u062F\u0631 \u0630\u062E\u06CC\u0631\u0647 \u0634\u0645\u0627\u0631\u0647\u200C\u0647\u0627\u06CC \u0645\u062F\u06CC\u0631\u06CC\u062A \u062F\u0631 \u067E\u0627\u06CC\u06AF\u0627\u0647 \u062F\u0627\u062F\u0647: " + err.message
      });
    }
  }
  tenantSettingsMap.set(effectiveTenantId, {
    id: String(savedId),
    tenant_id: effectiveTenantId,
    sms_phones: phonesArr
  });
  invalidateTenantAdminPhonesCache(effectiveTenantId);
  invalidateTenantAdminPhonesCache(rawTenantId);
  return res.json({
    success: true,
    id: savedId,
    tenant_id: effectiveTenantId,
    sms_phones: phonesArr
  });
};
router2.patch("/api/tenant-settings", handleSaveTenantSettings);
router2.post("/api/tenant-settings", handleSaveTenantSettings);
router2.patch("/tenant-settings", handleSaveTenantSettings);
router2.post("/tenant-settings", handleSaveTenantSettings);
router2.post("/api/auth/update-profile", async (req, res) => {
  const {
    name,
    username,
    phone,
    profile_image,
    avatar,
    bank_card_number,
    iban,
    national_id,
    emergency_contact_name,
    emergency_contact_phone,
    emergency_contact_relation,
    family_contacts
  } = req.body;
  const reqUser = getRequestUser(req);
  if (!reqUser.isAuthenticated) {
    return res.status(401).json({
      error: "UNAUTHORIZED",
      message: "\u0646\u0634\u0633\u062A \u06A9\u0627\u0631\u0628\u0631\u06CC \u0645\u0639\u062A\u0628\u0631 \u0646\u06CC\u0633\u062A. \u0644\u0637\u0641\u0627\u064B \u0645\u062C\u062F\u062F\u0627\u064B \u0648\u0627\u0631\u062F \u0634\u0648\u06CC\u062F."
    });
  }
  const { userId, personnelId, userEmail, userName, isAdmin } = reqUser;
  const existingPersonnel = personnelData.find(
    (p) => personnelId && (p.id === personnelId || p.user_id === personnelId) || userId && (p.id === userId || p.user_id === userId) || userEmail && p.email?.toLowerCase() === userEmail?.toLowerCase()
  );
  const currentAvatar = existingPersonnel?.profile_image || existingPersonnel?.avatar || "";
  if (!isAdmin) {
    const hasUnauthorizedIdentityChange = name !== void 0 && String(name).trim() !== String(existingPersonnel?.name || "").trim() || username !== void 0 && String(username).trim() !== String(existingPersonnel?.username || "").trim() || phone !== void 0 && String(phone).trim() !== String(existingPersonnel?.phone || "").trim() || national_id !== void 0 && String(national_id).trim() !== String(existingPersonnel?.national_id || "").trim() || profile_image !== void 0 && String(profile_image || "").trim() !== String(currentAvatar || "").trim() || avatar !== void 0 && String(avatar || "").trim() !== String(currentAvatar || "").trim() || emergency_contact_name !== void 0 || emergency_contact_phone !== void 0 || emergency_contact_relation !== void 0 || family_contacts !== void 0;
    if (hasUnauthorizedIdentityChange) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: "\u062A\u0646\u0647\u0627 \u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645 \u0645\u062C\u0627\u0632 \u0628\u0647 \u062A\u063A\u06CC\u06CC\u0631 \u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0647\u0648\u06CC\u062A\u06CC \u0648 \u067E\u0631\u0633\u0646\u0644\u06CC \u0645\u06CC\u200C\u0628\u0627\u0634\u062F. \u0634\u0645\u0627 \u0641\u0642\u0637 \u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u06CC\u062F \u0634\u0645\u0627\u0631\u0647 \u06A9\u0627\u0631\u062A \u0628\u0627\u0646\u06A9\u06CC \u0648 \u0634\u0645\u0627\u0631\u0647 \u0634\u0628\u0627 \u0631\u0627 \u0648\u06CC\u0631\u0627\u06CC\u0634 \u06A9\u0646\u06CC\u062F."
      });
    }
  }
  const incomingImage = isAdmin ? profile_image !== void 0 ? profile_image : avatar : void 0;
  const effectiveAvatar = isAdmin ? incomingImage !== void 0 && incomingImage !== null && String(incomingImage).trim() !== "" ? incomingImage : incomingImage === null ? "" : currentAvatar : void 0;
  const personnelPatch = {};
  if (isAdmin) {
    if (name) personnelPatch.name = String(name).trim();
    if (username !== void 0) personnelPatch.username = String(username).trim();
    if (phone !== void 0) personnelPatch.phone = String(phone).trim();
    if (effectiveAvatar !== void 0) {
      personnelPatch.profile_image = effectiveAvatar;
      personnelPatch.avatar = effectiveAvatar;
    }
    if (national_id !== void 0) personnelPatch.national_id = String(national_id).trim();
    if (emergency_contact_name !== void 0) personnelPatch.emergency_contact_name = String(emergency_contact_name).trim();
    if (emergency_contact_phone !== void 0) personnelPatch.emergency_contact_phone = String(emergency_contact_phone).trim();
    if (emergency_contact_relation !== void 0) personnelPatch.emergency_contact_relation = String(emergency_contact_relation).trim();
    if (family_contacts !== void 0) personnelPatch.family_contacts = family_contacts;
  }
  if (bank_card_number !== void 0) personnelPatch.bank_card_number = String(bank_card_number).trim();
  if (iban !== void 0) personnelPatch.iban = String(iban).trim();
  let targetPersonnel = null;
  const activeToken = directusAdminToken || latestAccessToken;
  if (directusUrl && activeToken) {
    try {
      let foundPId = null;
      if (personnelId) {
        const byId = await directusFetch(`/items/personnel/${personnelId}`).catch(() => null);
        if (byId?.data?.id) foundPId = byId.data.id;
      }
      if (!foundPId && userId) {
        const byUser = await directusFetch(`/items/personnel?filter[user_id][_eq]=${userId}`).catch(() => null);
        if (byUser?.data && Array.isArray(byUser.data) && byUser.data.length > 0) {
          foundPId = byUser.data[0].id;
        }
      }
      if (!foundPId && userEmail) {
        const byEmail = await directusFetch(`/items/personnel?filter[email][_eq]=${encodeURIComponent(userEmail)}`).catch(() => null);
        if (byEmail?.data && Array.isArray(byEmail.data) && byEmail.data.length > 0) {
          foundPId = byEmail.data[0].id;
        }
      }
      const directusFileId = isAdmin ? extractFileId(effectiveAvatar) : null;
      const directusPersonnelPatch = { ...personnelPatch };
      if (isAdmin) {
        if (directusFileId) {
          directusPersonnelPatch.profile_image = directusFileId;
        } else if (effectiveAvatar !== void 0) {
          directusPersonnelPatch.profile_image = effectiveAvatar || null;
        }
        delete directusPersonnelPatch.avatar;
      }
      if (foundPId) {
        const updatedRes = await directusFetch(`/items/personnel/${foundPId}`, {
          method: "PATCH",
          body: JSON.stringify(directusPersonnelPatch)
        }).catch(() => null);
        targetPersonnel = updatedRes?.data || { ...existingPersonnel || {}, id: foundPId, ...personnelPatch };
      } else if (isAdmin) {
        const newPId = personnelId || crypto5.randomUUID();
        const createdRes = await directusFetch("/items/personnel", {
          method: "POST",
          body: JSON.stringify({
            id: newPId,
            name: name || userName || "\u06A9\u0627\u0631\u0628\u0631 \u0633\u06CC\u0633\u062A\u0645",
            email: userEmail || "",
            phone: phone || "",
            role: "marketer",
            status: "active",
            user_id: userId || null,
            ...directusPersonnelPatch
          })
        }).catch(() => null);
        targetPersonnel = createdRes?.data || { id: newPId, ...personnelPatch };
      }
      if (isAdmin) {
        let actualDirectusUserId = null;
        if (userId && !String(userId).startsWith("p-")) {
          const uCheck = await directusFetch(`/users/${userId}?fields=id`).catch(() => null);
          if (uCheck?.data?.id) actualDirectusUserId = uCheck.data.id;
        }
        if (!actualDirectusUserId && targetPersonnel?.user_id) {
          actualDirectusUserId = targetPersonnel.user_id;
        }
        if (!actualDirectusUserId && (userEmail || targetPersonnel?.email)) {
          const em = (userEmail || targetPersonnel?.email || "").toLowerCase().trim();
          const byEmail = await directusFetch(`/users?filter[email][_eq]=${encodeURIComponent(em)}&fields=id&limit=1`).catch(() => null);
          if (byEmail?.data?.[0]?.id) actualDirectusUserId = byEmail.data[0].id;
        }
        if (actualDirectusUserId) {
          const userPatch = {};
          if (name) userPatch.first_name = name;
          if (effectiveAvatar !== void 0) {
            if (directusFileId) {
              userPatch.avatar = directusFileId;
            } else if (!effectiveAvatar) {
              userPatch.avatar = null;
            }
          }
          if (Object.keys(userPatch).length > 0) {
            await directusFetch(`/users/${actualDirectusUserId}`, {
              method: "PATCH",
              body: JSON.stringify(userPatch)
            }).catch((e) => console.warn("Could not update directus user profile:", e.message));
          }
        }
      }
    } catch (err) {
      console.error("Directus personnel profile update error:", err.message);
    }
  }
  const finalAvatarUrl = isAdmin ? formatAvatarUrl(effectiveAvatar) || (typeof effectiveAvatar === "string" ? effectiveAvatar : currentAvatar) : currentAvatar;
  if (targetPersonnel) {
    targetPersonnel.profile_image = finalAvatarUrl || targetPersonnel.profile_image || currentAvatar;
    targetPersonnel.avatar = finalAvatarUrl || targetPersonnel.avatar || currentAvatar;
  }
  const targetId = personnelId || userId;
  const idx = personnelData.findIndex(
    (p) => targetId && (p.id === targetId || p.user_id === targetId) || userEmail && p.email?.toLowerCase() === userEmail?.toLowerCase()
  );
  if (idx >= 0) {
    personnelData[idx] = {
      ...personnelData[idx],
      ...personnelPatch,
      profile_image: finalAvatarUrl || personnelData[idx].profile_image || currentAvatar,
      avatar: finalAvatarUrl || personnelData[idx].avatar || currentAvatar
    };
    if (!targetPersonnel) targetPersonnel = personnelData[idx];
    else {
      targetPersonnel.profile_image = personnelData[idx].profile_image;
      targetPersonnel.avatar = personnelData[idx].avatar;
    }
  } else {
    const newLocal = {
      id: targetId || "p-1",
      name: (isAdmin ? name : void 0) || userName || "\u06A9\u0627\u0631\u0628\u0631 \u0633\u06CC\u0633\u062A\u0645",
      email: userEmail || "",
      phone: (isAdmin ? phone : void 0) || "",
      role: "marketer",
      status: "active",
      active: true,
      ...personnelPatch,
      profile_image: finalAvatarUrl || currentAvatar,
      avatar: finalAvatarUrl || currentAvatar
    };
    personnelData.push(newLocal);
    if (!targetPersonnel) targetPersonnel = newLocal;
  }
  res.json({ success: true, personnel: targetPersonnel, message: "\u0645\u0634\u062E\u0635\u0627\u062A \u067E\u0631\u0648\u0641\u0627\u06CC\u0644 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062F\u0631 \u067E\u0627\u06CC\u06AF\u0627\u0647 \u062F\u0627\u062F\u0647 \u0645\u0631\u06A9\u0632\u06CC \u0630\u062E\u06CC\u0631\u0647 \u0634\u062F." });
});
var localAvatarCacheMap = /* @__PURE__ */ new Map();
var handleAssetProxy = async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).send("Asset ID is required");
  }
  if (id && /\.(js|css|map|woff2?|ttf|eot|ico)$/i.test(id)) {
    if (typeof next === "function") return next();
    return res.status(404).send("Not static asset");
  }
  const cleanId = id.replace(/\.[a-zA-Z0-9]+$/, "").replace(/^["']+|["']+$/g, "").trim();
  const cached = localAvatarCacheMap.get(cleanId) || localAvatarCacheMap.get(id);
  if (cached) {
    res.setHeader("Content-Type", cached.contentType || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    return res.send(cached.buffer);
  }
  const activeDirectusUrl = (directusUrl || process.env.DIRECTUS_URL || "https://api.alphadesk.ir").replace(/\/$/, "");
  const serverAdminToken = directusAdminToken || process.env.DIRECTUS_ADMIN_TOKEN || latestAccessToken || "";
  const headers = {
    "User-Agent": "AlphaDesk-CRM/1.0",
    "Accept": "image/*"
  };
  if (serverAdminToken) {
    headers["Authorization"] = `Bearer ${serverAdminToken}`;
  }
  const tryFetchDirectusAsset = async (targetFileId) => {
    if (!activeDirectusUrl || !targetFileId) return false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4e3);
      const directusAssetUrl = `${activeDirectusUrl}/assets/${encodeURIComponent(targetFileId)}`;
      let assetRes = await fetch(directusAssetUrl, {
        headers,
        signal: controller.signal
      }).catch(() => null);
      clearTimeout(timeoutId);
      if (!assetRes || !assetRes.ok) {
        const dlUrl = `${activeDirectusUrl}/files/${encodeURIComponent(targetFileId)}/download`;
        assetRes = await fetch(dlUrl, { headers }).catch(() => null);
      }
      if (assetRes && assetRes.ok) {
        const contentType = assetRes.headers.get("content-type") || "image/jpeg";
        const buffer2 = Buffer.from(await assetRes.arrayBuffer());
        localAvatarCacheMap.set(cleanId, { buffer: buffer2, contentType });
        localAvatarCacheMap.set(id, { buffer: buffer2, contentType });
        localAvatarCacheMap.set(targetFileId, { buffer: buffer2, contentType });
        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
        res.send(buffer2);
        return true;
      }
    } catch (err) {
      console.warn(`[Asset Proxy] Error fetching Directus asset ${targetFileId}:`, err.message);
    }
    return false;
  };
  const isDirectSuccess = await tryFetchDirectusAsset(cleanId);
  if (isDirectSuccess) return;
  try {
    let directusFileId = null;
    if (!cleanId.startsWith("p-")) {
      const userRes = await directusFetch(`/users/${encodeURIComponent(cleanId)}?fields=id,avatar.*`).catch(() => null);
      if (userRes?.data?.avatar) {
        const av = userRes.data.avatar;
        directusFileId = typeof av === "object" && av !== null ? av.id || av.filename_disk || av.fileId : String(av);
      }
    }
    if (!directusFileId) {
      const pMatch2 = personnelData.find(
        (p) => String(p.id) === cleanId || String(p.user_id) === cleanId || p.email?.toLowerCase() === cleanId.toLowerCase()
      );
      if (pMatch2?.profile_image) {
        const fileIdFromProfile = extractFileId(pMatch2.profile_image);
        if (fileIdFromProfile) {
          directusFileId = fileIdFromProfile;
        }
      }
      const targetUserId = pMatch2?.user_id || (!cleanId.startsWith("p-") ? cleanId : null);
      const targetEmail = pMatch2?.email || (cleanId.includes("@") ? cleanId : null);
      if (!directusFileId && targetUserId) {
        const uRes = await directusFetch(`/users/${encodeURIComponent(targetUserId)}?fields=id,avatar.*`).catch(() => null);
        if (uRes?.data?.avatar) {
          const av = uRes.data.avatar;
          directusFileId = typeof av === "object" && av !== null ? av.id || av.filename_disk || av.fileId : String(av);
        }
      } else if (!directusFileId && targetEmail) {
        const uRes = await directusFetch(`/users?filter[email][_ieq]=${encodeURIComponent(targetEmail)}&fields=id,avatar.*&limit=1`).catch(() => null);
        if (uRes?.data?.[0]?.avatar) {
          const av = uRes.data[0].avatar;
          directusFileId = typeof av === "object" && av !== null ? av.id || av.filename_disk || av.fileId : String(av);
        }
      }
    }
    if (directusFileId && directusFileId !== cleanId) {
      const isResolvedSuccess = await tryFetchDirectusAsset(directusFileId);
      if (isResolvedSuccess) return;
    }
  } catch {
  }
  const pMatch = personnelData.find(
    (p) => String(p.id) === cleanId || String(p.user_id) === cleanId || p.email?.toLowerCase() === cleanId.toLowerCase()
  );
  const nameToUse = pMatch?.name || cleanId || "\u06A9\u0627\u0631\u0628\u0631";
  const initialChar = nameToUse.trim().charAt(0).toUpperCase() || "U";
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="32" fill="#1DB954"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#000000" font-family="sans-serif" font-size="56" font-weight="900">${initialChar}</text></svg>`;
  const buffer = Buffer.from(svgContent, "utf-8");
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=3600");
  return res.send(buffer);
};
router2.get("/api/assets/:id", handleAssetProxy);
router2.get("/assets/:id", handleAssetProxy);
router2.post("/api/upload-avatar", async (req, res) => {
  const { dataUrl, fileName, mimeType } = req.body;
  const reqUser = getRequestUser(req);
  if (!reqUser.isAdmin) {
    return res.status(403).json({
      error: "FORBIDDEN",
      message: "\u062A\u0646\u0647\u0627 \u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645 \u0645\u062C\u0627\u0632 \u0628\u0647 \u062A\u063A\u06CC\u06CC\u0631 \u062A\u0635\u0648\u06CC\u0631 \u067E\u0631\u0648\u0641\u0627\u06CC\u0644 \u0645\u06CC\u200C\u0628\u0627\u0634\u062F."
    });
  }
  const { userId, personnelId, userEmail, userName } = reqUser;
  if (!dataUrl) {
    return res.status(400).json({ error: "\u0641\u0627\u06CC\u0644\u06CC \u0627\u0631\u0633\u0627\u0644 \u0646\u0634\u062F\u0647 \u0627\u0633\u062A." });
  }
  let finalAvatarUrl = dataUrl;
  try {
    const matches = dataUrl.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const fileBuffer = Buffer.from(matches[2], "base64");
      const fileType = matches[1] || mimeType || "image/webp";
      const fileId = "avatar-" + crypto5.randomUUID();
      const uploadsDir = path.resolve(process.cwd(), "public/uploads/avatars");
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      fs.writeFileSync(path.resolve(uploadsDir, `${fileId}.webp`), fileBuffer);
      localAvatarCacheMap.set(fileId, { buffer: fileBuffer, contentType: fileType });
      localAvatarCacheMap.set(dataUrl, { buffer: fileBuffer, contentType: fileType });
      finalAvatarUrl = `/api/assets/${fileId}`;
      const activeToken = directusAdminToken || latestAccessToken;
      if (directusUrl && activeToken) {
        try {
          const cleanBaseUrl = directusUrl.replace(/\/$/, "");
          const formData = new FormData();
          const blob = new Blob([fileBuffer], { type: fileType });
          const safeFileName = (fileName || "avatar.webp").replace(/[^a-zA-Z0-9.\-_]/g, "_");
          formData.append("file", blob, safeFileName);
          formData.append("title", "Avatar " + (userName || userId || "User"));
          const uploadRes = await fetch(`${cleanBaseUrl}/files`, {
            method: "POST",
            headers: { Authorization: `Bearer ${activeToken}` },
            body: formData
          }).catch(() => null);
          if (uploadRes && uploadRes.ok) {
            const uploadJson = await uploadRes.json().catch(() => null);
            const directusFileId = uploadJson?.data?.id;
            if (directusFileId) {
              localAvatarCacheMap.set(directusFileId, { buffer: fileBuffer, contentType: fileType });
              let actualDirectusUserId = null;
              if (userId && !String(userId).startsWith("p-")) {
                const uCheck = await directusFetch(`/users/${userId}?fields=id`).catch(() => null);
                if (uCheck?.data?.id) actualDirectusUserId = uCheck.data.id;
              }
              if (!actualDirectusUserId && userEmail) {
                const byEmail = await directusFetch(`/users?filter[email][_ieq]=${encodeURIComponent(userEmail.toLowerCase().trim())}&fields=id&limit=1`).catch(() => null);
                if (byEmail?.data?.[0]?.id) actualDirectusUserId = byEmail.data[0].id;
              }
              if (actualDirectusUserId) {
                await directusFetch(`/users/${actualDirectusUserId}`, {
                  method: "PATCH",
                  body: JSON.stringify({ avatar: directusFileId })
                }).catch((e) => console.warn("Could not patch directus_users avatar:", e?.message));
              }
              let foundPId = null;
              if (personnelId) foundPId = personnelId;
              else if (userId) {
                const byUser = await directusFetch(`/items/personnel?filter[user_id][_eq]=${userId}`).catch(() => null);
                if (byUser?.data?.[0]?.id) foundPId = byUser.data[0].id;
              }
              if (!foundPId && userEmail) {
                const byEmail = await directusFetch(`/items/personnel?filter[email][_eq]=${encodeURIComponent(userEmail)}`).catch(() => null);
                if (byEmail?.data?.[0]?.id) foundPId = byEmail.data[0].id;
              }
              if (foundPId) {
                await directusFetch(`/items/personnel/${foundPId}`, {
                  method: "PATCH",
                  body: JSON.stringify({ profile_image: directusFileId })
                }).catch((e) => console.warn("Could not patch items/personnel profile_image:", e?.message));
              }
              finalAvatarUrl = `/api/assets/${directusFileId}`;
            }
          }
        } catch (uploadErr) {
          console.warn("Directus avatar sync warning:", uploadErr?.message);
        }
      }
    }
  } catch (e) {
    console.error("Error caching avatar:", e.message);
  }
  const targetId = personnelId || userId;
  const idx = personnelData.findIndex(
    (p) => targetId && (p.id === targetId || p.user_id === targetId) || userEmail && p.email?.toLowerCase() === userEmail.toLowerCase() || userName && p.name === userName
  );
  if (idx >= 0) {
    personnelData[idx].profile_image = finalAvatarUrl;
    personnelData[idx].avatar = finalAvatarUrl;
  }
  res.json({ success: true, avatarUrl: finalAvatarUrl });
});
router2.post("/api/auth/change-password", async (req, res) => {
  const { current_password, new_password } = req.body;
  const { userId } = getRequestUser(req);
  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: "\u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u062C\u062F\u06CC\u062F \u0628\u0627\u06CC\u062F \u062D\u062F\u0627\u0642\u0644 \u06F6 \u06A9\u0627\u0631\u0627\u06A9\u062A\u0631 \u0628\u0627\u0634\u062F." });
  }
  if (directusUrl && directusAdminToken && userId) {
    try {
      await directusFetch(`/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ password: new_password })
      });
      return res.json({ success: true, message: "\u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062A\u063A\u06CC\u06CC\u0631 \u06CC\u0627\u0641\u062A." });
    } catch (err) {
      return res.status(500).json({ error: `\u062E\u0637\u0627 \u062F\u0631 \u062A\u063A\u06CC\u06CC\u0631 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631: ${err.message}` });
    }
  }
  res.json({ success: true, message: "\u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062A\u063A\u06CC\u06CC\u0631 \u06CC\u0627\u0641\u062A." });
});
router2.post("/api/check-expirations", (req, res) => {
  res.json({ success: true });
});
var handleResetMigrationCache = (req, res) => {
  setCustomersData([]);
  setReportsData([]);
  setContactsData([]);
  setPersonnelData([...initialPersonnel]);
  migrationPersonnelCache = null;
  migrationCustomersCache = null;
  migrationCacheLastFetch = 0;
  globalCallIdToUUIDMap.clear();
  uidToPersonnelMap.clear();
  invalidateCustomersCache();
  invalidateReportsCache();
  return res.json({ success: true, message: "\u062D\u0627\u0641\u0638\u0647 \u0645\u0648\u0642\u062A \u06A9\u0634 \u062F\u0631\u0648\u0646\u200C\u0631\u06CC\u0632\u06CC \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u067E\u0627\u06A9\u0633\u0627\u0632\u06CC \u0634\u062F." });
};
router2.post("/api/migration/reset-cache", handleResetMigrationCache);
router2.post("/migration/reset-cache", handleResetMigrationCache);
function jalaliToGregorian(jy, jm, jd) {
  let gy = jy <= 979 ? 621 : 1600;
  jy -= jy <= 979 ? 0 : 979;
  let days = 365 * jy + Math.floor(jy / 33) * 8 + Math.floor((jy % 33 + 3) / 4) + 78 + jd + (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const gd = days + 1;
  const sal_a = [
    0,
    31,
    gy % 4 === 0 && gy % 100 !== 0 || gy % 400 === 0 ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31
  ];
  let gm = 0;
  for (gm = 0; gm < 13; gm++) {
    const v = sal_a[gm];
    if (days < v) break;
    days -= v;
  }
  return new Date(Date.UTC(gy, gm - 1, gd));
}
function parseLegacyDate(dateVal) {
  if (!dateVal) return null;
  const str = String(dateVal).trim();
  if (!str || str === "NULL" || str === "null") return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  if (/^\d{8}$/.test(str)) {
    const jy = parseInt(str.substring(0, 4), 10);
    const jm = parseInt(str.substring(4, 6), 10);
    const jd = parseInt(str.substring(6, 8), 10);
    try {
      return jalaliToGregorian(jy, jm, jd).toISOString();
    } catch {
    }
  }
  const slashMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2}))?/);
  if (slashMatch) {
    const jy = parseInt(slashMatch[1], 10);
    const jm = parseInt(slashMatch[2], 10);
    const jd = parseInt(slashMatch[3], 10);
    const hour = slashMatch[4] ? parseInt(slashMatch[4], 10) : 12;
    const min = slashMatch[5] ? parseInt(slashMatch[5], 10) : 0;
    try {
      const gDate = jalaliToGregorian(jy, jm, jd);
      gDate.setUTCHours(hour, min, 0, 0);
      return gDate.toISOString();
    } catch {
    }
  }
  const dashTimeMatch = str.match(/^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})/);
  if (dashTimeMatch) {
    const jy = parseInt(dashTimeMatch[1], 10);
    const jm = parseInt(dashTimeMatch[2], 10);
    const jd = parseInt(dashTimeMatch[3], 10);
    const hour = parseInt(dashTimeMatch[4], 10);
    const min = parseInt(dashTimeMatch[5], 10);
    try {
      const gDate = jalaliToGregorian(jy, jm, jd);
      gDate.setUTCHours(hour, min, 0, 0);
      return gDate.toISOString();
    } catch {
    }
  }
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString();
  } catch {
  }
  return null;
}
function normalizeLegacyStatus(rawStatus) {
  if (!rawStatus) return "\u062A\u0645\u0627\u0633 \u0628\u0631\u0642\u0631\u0627\u0631 \u0646\u0634\u062F\u0647";
  const s = String(rawStatus).trim();
  if (s === "\u0627\u0635\u0644\u0627 \u062A\u0645\u0627\u0633 \u0628\u0631\u0642\u0631\u0627\u0631 \u0646\u0634\u062F\u0647" || s === "\u062A\u0645\u0627\u0633 \u0646\u06AF\u0631\u0641\u062A\u0647" || s === "\u062A\u0645\u0627\u0633 \u0628\u0631\u0642\u0631\u0627\u0631 \u0646\u0634\u062F\u0647" || s === "\u0628\u062F\u0648\u0646 \u062A\u0645\u0627\u0633" || s === "\u0627\u0635\u0644\u0627\u064B \u062A\u0645\u0627\u0633 \u0628\u0631\u0642\u0631\u0627\u0631 \u0646\u0634\u062F\u0647") {
    return "\u062A\u0645\u0627\u0633 \u0628\u0631\u0642\u0631\u0627\u0631 \u0646\u0634\u062F\u0647";
  }
  if (s === "\u067E\u0627\u0633\u062E \u0646\u0645\u06CC\u062F\u0647\u062F" || s === "\u067E\u0627\u0633\u062E \u0646\u0645\u06CC\u200C\u062F\u0647\u062F" || s === "\u067E\u0627\u0633\u062E \u0646\u062F\u0627\u062F" || s === "\u062C\u0648\u0627\u0628 \u0646\u0645\u06CC\u062F\u0647\u062F") {
    return "\u067E\u0627\u0633\u062E \u0646\u0645\u06CC\u062F\u0647\u062F";
  }
  if (s === "\u0646\u0645\u06CC\u062E\u0648\u0627\u062F" || s === "\u0646\u0645\u06CC\u200C\u062E\u0648\u0627\u0647\u062F" || s === "\u0639\u062F\u0645 \u062A\u0645\u0627\u06CC\u0644" || s === "\u0646\u0645\u06CC \u062E\u0648\u0627\u0647\u062F") {
    return "\u0646\u0645\u06CC\u062E\u0648\u0627\u062F";
  }
  if (s === "\u067E\u06CC\u06AF\u06CC\u0631\u06CC \u0642\u0628\u0644 \u0627\u0632 \u0627\u0646\u0642\u0636\u0627" || s === "\u067E\u06CC\u06AF\u06CC\u0631\u06CC \u0642\u0628\u0644 \u0627\u0632 \u0627\u0646\u0642\u0636\u0627\u0621") {
    return "\u067E\u06CC\u06AF\u06CC\u0631\u06CC \u0642\u0628\u0644 \u0627\u0632 \u0627\u0646\u0642\u0636\u0627";
  }
  if (s === "\u067E\u06CC\u06AF\u06CC\u0631\u06CC \u0628\u0644\u0646\u062F \u0645\u062F\u062A" || s === "\u067E\u06CC\u06AF\u06CC\u0631\u06CC \u0628\u0644\u0646\u062F\u0645\u062F\u062A") {
    return "\u067E\u06CC\u06AF\u06CC\u0631\u06CC \u0628\u0644\u0646\u062F \u0645\u062F\u062A";
  }
  if (s === "\u067E\u06CC\u06AF\u06CC\u0631\u06CC \u0642\u0631\u0627\u0631\u062F\u0627\u062F") {
    return "\u067E\u06CC\u06AF\u06CC\u0631\u06CC \u0642\u0631\u0627\u0631\u062F\u0627\u062F";
  }
  if (s === "\u067E\u06CC\u0634 \u0646\u0648\u06CC\u0633 \u0642\u0631\u0627\u0631\u062F\u0627\u062F" || s === "\u067E\u06CC\u0634\u200C\u0646\u0648\u06CC\u0633 \u0642\u0631\u0627\u0631\u062F\u0627\u062F") {
    return "\u067E\u06CC\u0634 \u0646\u0648\u06CC\u0633 \u0642\u0631\u0627\u0631\u062F\u0627\u062F";
  }
  if (s === "\u0642\u0631\u0627\u0631\u062F\u0627\u062F" || s === "\u0642\u0631\u0627\u0631\u062F\u0627\u062F / \u0641\u0627\u06A9\u062A\u0648\u0631" || s === "\u0642\u0631\u0627\u0631\u062F\u0627\u062F/\u0641\u0627\u06A9\u062A\u0648\u0631" || s === "\u0641\u0627\u06A9\u062A\u0648\u0631") {
    return "\u0642\u0631\u0627\u0631\u062F\u0627\u062F";
  }
  if (s === "\u0644\u06CC\u0633\u062A \u0633\u06CC\u0627\u0647") {
    return "\u0644\u06CC\u0633\u062A \u0633\u06CC\u0627\u0647";
  }
  if (s === "\u062B\u0628\u062A \u0634\u0645\u0627\u0631\u0647") {
    return "\u062B\u0628\u062A \u0634\u0645\u0627\u0631\u0647";
  }
  return s;
}
function isValidUUID(str) {
  if (typeof str !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str.trim());
}
function deterministicUUID(input) {
  if (!input) return crypto5.randomUUID();
  const cleanInput = String(input).trim();
  if (isValidUUID(cleanInput)) return cleanInput;
  const hash = crypto5.createHash("md5").update("alphadesk-crm:" + cleanInput).digest("hex");
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-4${hash.substring(13, 16)}-a${hash.substring(17, 20)}-${hash.substring(20, 32)}`;
}
function sanitizeCustomerForDirectus(cust, validPersonnelIds) {
  const tNum = cust.tenant_id !== void 0 && cust.tenant_id !== null ? Number(cust.tenant_id) : 1;
  const tenantNum = !isNaN(tNum) && tNum > 0 ? tNum : 1;
  let assignedMarketerId = cust.assigned_marketer_id || null;
  if (assignedMarketerId && validPersonnelIds && validPersonnelIds.size > 0 && !validPersonnelIds.has(assignedMarketerId)) {
    assignedMarketerId = null;
  }
  return {
    id: cust.id,
    company_name: cust.company_name || "\u0628\u062F\u0648\u0646 \u0646\u0627\u0645",
    business_type: cust.business_type || "",
    province: cust.province || "",
    city: cust.city || "",
    manager_name: cust.manager_name || "",
    mobile_numbers: Array.isArray(cust.mobile_numbers) ? cust.mobile_numbers : [],
    landline_numbers: Array.isArray(cust.landline_numbers) ? cust.landline_numbers : [],
    assigned_marketer_id: assignedMarketerId,
    assigned_marketer_name: cust.assigned_marketer_name || null,
    assignment_deadline: cust.assignment_deadline || null,
    status: cust.status || "\u062A\u0645\u0627\u0633 \u0628\u0631\u0642\u0631\u0627\u0631 \u0646\u0634\u062F\u0647",
    is_expired: Boolean(cust.is_expired),
    tenant_id: tenantNum,
    date_created: cust.date_created || (/* @__PURE__ */ new Date()).toISOString()
  };
}
function sanitizeContactForDirectus(c) {
  const tNum = c.tenant_id !== void 0 && c.tenant_id !== null ? Number(c.tenant_id) : 1;
  const tenantNum = !isNaN(tNum) && tNum > 0 ? tNum : 1;
  return {
    id: isValidUUID(c.id) ? c.id : deterministicUUID(`${c.customer_id}-${c.channel_type}-${c.value}`),
    customer_id: c.customer_id,
    channel_type: c.channel_type || "mobile",
    value: String(c.value || "").trim(),
    normalized_value: c.normalized_value ? String(c.normalized_value).trim() : null,
    contact_name: c.contact_name ? String(c.contact_name).trim() : null,
    is_primary: Boolean(c.is_primary),
    tenant_id: tenantNum,
    date_created: c.date_created || (/* @__PURE__ */ new Date()).toISOString()
  };
}
function sanitizeReportForDirectus(rep) {
  const tNum = rep.tenant_id !== void 0 && rep.tenant_id !== null ? Number(rep.tenant_id) : 1;
  const tenantNum = !isNaN(tNum) && tNum > 0 ? tNum : 1;
  return {
    id: rep.id,
    customer_id: rep.customer_id,
    report_text: rep.report_text || "",
    negotiator_name: rep.negotiator_name || "\u06A9\u0627\u0631\u0634\u0646\u0627\u0633",
    negotiation_phone: rep.negotiation_phone || "",
    negotiation_status: rep.negotiation_status || "\u067E\u06CC\u06AF\u06CC\u0631\u06CC \u0642\u0628\u0644 \u0627\u0632 \u0627\u0646\u0642\u0636\u0627",
    negotiation_score: typeof rep.negotiation_score === "number" ? rep.negotiation_score : 8,
    next_followup_date: rep.next_followup_date || null,
    tenant_id: tenantNum,
    date_created: rep.date_created || (/* @__PURE__ */ new Date()).toISOString()
  };
}
function sanitizePersonnelForDirectus(p) {
  const tNum = p.tenant_id !== void 0 && p.tenant_id !== null ? Number(p.tenant_id) : 1;
  const tenantNum = !isNaN(tNum) && tNum > 0 ? tNum : 1;
  return {
    id: p.id,
    name: p.name || "\u06A9\u0627\u0631\u0634\u0646\u0627\u0633",
    username: p.username || "",
    email: p.email || "",
    phone: p.phone || "",
    role: p.role || "marketer",
    status: p.status || "active",
    tenant_id: tenantNum,
    national_id: p.national_id || null
  };
}
var handleMigrationImport = async (req, res) => {
  const { tenant_id, personnelRows, customerRows, reportRows } = req.body;
  const { tenantId: authTenantId } = getRequestUser(req);
  const targetTenantId = tenant_id || authTenantId || "default";
  const targetTenantNum = resolveDirectusTenantId(targetTenantId);
  let importedPersonnelCount = 0;
  let importedCustomersCount = 0;
  let importedReportsCount = 0;
  let skippedCount = 0;
  const skippedDetails = [];
  const errors = [];
  if (!migrationPersonnelCache || !migrationCustomersCache || Date.now() - migrationCacheLastFetch > 3e5) {
    migrationPersonnelCache = [...personnelData];
    migrationCustomersCache = [...customersData];
    if (directusUrl && directusAdminToken) {
      try {
        const [pRes, cRes] = await Promise.all([
          directusFetchAllPages("/items/personnel?fields=id,username,email,name,phone&limit=1000").catch(() => null),
          directusFetch("/items/customers?fields=id,assigned_marketer_id,assigned_marketer_name&limit=5000").catch(() => null)
        ]);
        const pList = Array.isArray(pRes) ? pRes : pRes?.data || [];
        const cList = Array.isArray(cRes) ? cRes : cRes?.data || [];
        for (const p of pList) {
          if (!migrationPersonnelCache.some((ep) => ep.id === p.id || p.username && ep.username === p.username)) {
            migrationPersonnelCache.push(p);
          }
        }
        for (const c of cList) {
          if (!migrationCustomersCache.some((ec) => ec.id === c.id)) {
            migrationCustomersCache.push(c);
          }
        }
        migrationCacheLastFetch = Date.now();
      } catch (e) {
        console.warn("Warning pre-fetching Directus records for migration:", e.message);
      }
    }
  }
  const existingPersonnel = migrationPersonnelCache;
  const existingCustomers = migrationCustomersCache;
  const existingCustomerIdsSet = /* @__PURE__ */ new Set();
  for (const c of existingCustomers) {
    if (c.id) existingCustomerIdsSet.add(c.id);
  }
  const directusPersonnelIdsSet = /* @__PURE__ */ new Set();
  for (const p of existingPersonnel) {
    if (p.id) directusPersonnelIdsSet.add(String(p.id).trim());
  }
  for (const c of existingCustomers) {
    if (c.id) {
      if (c.legacyCallId) globalCallIdToUUIDMap.set(c.legacyCallId, c.id);
      if (c.id.startsWith("c-")) globalCallIdToUUIDMap.set(c.id.substring(2), c.id);
      globalCallIdToUUIDMap.set(c.id, c.id);
    }
  }
  for (const p of existingPersonnel) {
    if (p.id) {
      const cleanId = String(p.id).trim();
      uidToPersonnelMap.set(cleanId, p);
      const rawNum = cleanId.replace(/^p-/, "");
      uidToPersonnelMap.set(rawNum, p);
      uidToPersonnelMap.set(`p-${rawNum}`, p);
    }
    if (p.username) {
      uidToPersonnelMap.set(String(p.username).trim().toLowerCase(), p);
    }
    if (p.legacyUid) {
      uidToPersonnelMap.set(String(p.legacyUid).trim(), p);
    }
    if (p.name) {
      const normName = normalizePersianString(p.name);
      if (normName) uidToPersonnelMap.set(normName, p);
    }
  }
  const personnelToInsert = [];
  if (Array.isArray(personnelRows) && personnelRows.length > 0) {
    for (const r of personnelRows) {
      const rawUid = String(r.uid || r.id || "").trim();
      if (!rawUid) continue;
      const cleanUsername = String(r.username || `user_${rawUid}`).trim();
      const fullName = String(
        r.fname ? `${r.fname} ${r.lname || ""}` : r.name || cleanUsername || `\u06A9\u0627\u0631\u0634\u0646\u0627\u0633 ${rawUid}`
      ).trim();
      const cleanEmail = String(r.email || `${cleanUsername}@alphadesk.ir`).trim().toLowerCase();
      const rawPhones = String(r.contacts || r.phone || "").split(/[,\s]+/);
      const normPhone = normalizeContactValue(rawPhones[0] || "");
      const normFullName = normalizePersianString(fullName);
      const existIdx = existingPersonnel.findIndex(
        (p) => cleanUsername && p.username && p.username.toLowerCase() === cleanUsername.toLowerCase() || normFullName && p.name && normalizePersianString(p.name) === normFullName || p.id === rawUid || p.id === `p-${rawUid}` || p.id && String(p.id).replace(/^p-/, "") === rawUid.replace(/^p-/, "") || p.username && p.username.toLowerCase() === rawUid.toLowerCase() || cleanEmail && p.email && p.email.toLowerCase() === cleanEmail.toLowerCase()
      );
      const targetPId = existIdx >= 0 ? existingPersonnel[existIdx].id : rawUid.startsWith("p-") ? rawUid : `p-${rawUid}`;
      const pObj = {
        id: targetPId,
        name: fullName,
        username: cleanUsername,
        email: cleanEmail,
        phone: normPhone,
        role: r.userlevel === "0" || r.userlevel === 0 || r.role === "admin" ? "admin" : "marketer",
        status: r.active === "0" || r.active === 0 || r.status === "inactive" ? "inactive" : "active",
        tenant_id: targetTenantNum || 1,
        national_id: String(r.code || r.shenasname || "").trim() || null,
        legacyUid: rawUid
      };
      if (existIdx >= 0) {
        existingPersonnel[existIdx] = { ...existingPersonnel[existIdx], ...pObj };
        const localIdx = personnelData.findIndex((p) => p.id === targetPId || p.username === cleanUsername);
        if (localIdx >= 0) personnelData[localIdx] = { ...personnelData[localIdx], ...pObj };
        uidToPersonnelMap.set(rawUid, existingPersonnel[existIdx]);
        uidToPersonnelMap.set(targetPId, existingPersonnel[existIdx]);
        if (cleanUsername) uidToPersonnelMap.set(cleanUsername.toLowerCase(), existingPersonnel[existIdx]);
        if (fullName) uidToPersonnelMap.set(normalizePersianString(fullName), existingPersonnel[existIdx]);
        if (directusUrl && directusAdminToken && !directusPersonnelIdsSet.has(targetPId)) {
          personnelToInsert.push(pObj);
          directusPersonnelIdsSet.add(targetPId);
        } else {
          skippedCount++;
        }
      } else {
        existingPersonnel.push(pObj);
        personnelData.push(pObj);
        personnelToInsert.push(pObj);
        directusPersonnelIdsSet.add(targetPId);
        uidToPersonnelMap.set(rawUid, pObj);
        uidToPersonnelMap.set(targetPId, pObj);
        if (cleanUsername) uidToPersonnelMap.set(cleanUsername.toLowerCase(), pObj);
        if (fullName) uidToPersonnelMap.set(normalizePersianString(fullName), pObj);
        importedPersonnelCount++;
      }
    }
    if (directusUrl && directusAdminToken && personnelToInsert.length > 0) {
      const sanitizedPersonnel = personnelToInsert.map(sanitizePersonnelForDirectus);
      await directusSafeBatchInsert("personnel", sanitizedPersonnel, 25).catch((err) => {
        errors.push(`\u062E\u0637\u0627 \u062F\u0631 \u062B\u0628\u062A \u067E\u0631\u0633\u0646\u0644 \u062F\u0631 \u062F\u0627\u06CC\u0631\u06A9\u062A\u0648\u0633: ${err.message}`);
      });
      personnelToInsert.length = 0;
    }
  }
  const customersToInsert = [];
  const contactsToInsert = [];
  if (Array.isArray(customerRows) && customerRows.length > 0) {
    for (const r of customerRows) {
      const callId = String(r.CallID || r.callid || r.id || "").trim();
      const companyName = String(r.CompanyName || r.marketName || r.company_name || "\u0628\u062F\u0648\u0646 \u0646\u0627\u0645").trim();
      const managerName = String(r.managerName || r.manager_name || "").trim();
      const businessType = String(r.job || r.business_type || "").trim();
      const province = String(r.province || "").trim();
      const city = String(r.city || "").trim();
      const rawMobiles = String(r.mobiles || r.mobile_numbers || r.managerPhone || r.phone || "").split(
        /[,;\n]+/
      );
      const mobileNumbers = [];
      for (const m of rawMobiles) {
        const norm = normalizeContactValue(m);
        if (norm && norm.length >= 8 && !mobileNumbers.includes(norm)) {
          mobileNumbers.push(norm);
        }
      }
      const rawLandlines = String(r.phonelines || r.landline_numbers || "").split(/[,;\n]+/);
      const landlineNumbers = [];
      for (const l of rawLandlines) {
        const norm = normalizeContactValue(l);
        if (norm && norm.length >= 4 && !landlineNumbers.includes(norm)) {
          landlineNumbers.push(norm);
        }
      }
      const rawStatus = r.lastStat || r.status || r.ClosedContact || "";
      const status = normalizeLegacyStatus(rawStatus);
      const rawMarketerUid = String(r.uid || r.assigned_marketer_id || "").trim();
      let assignedMarketerId = null;
      let assignedMarketerName = null;
      if (rawMarketerUid && rawMarketerUid !== "0" && rawMarketerUid !== "NULL" && rawMarketerUid !== "null") {
        let matchedP = uidToPersonnelMap.get(rawMarketerUid) || uidToPersonnelMap.get(rawMarketerUid.replace(/^p-/, "")) || uidToPersonnelMap.get(`p-${rawMarketerUid}`) || uidToPersonnelMap.get(rawMarketerUid.toLowerCase());
        if (!matchedP) {
          matchedP = existingPersonnel.find(
            (p) => p.legacyUid === rawMarketerUid || p.id === rawMarketerUid || p.id === `p-${rawMarketerUid}` || p.id && String(p.id).replace(/^p-/, "") === rawMarketerUid.replace(/^p-/, "") || p.username && p.username.toLowerCase() === rawMarketerUid.toLowerCase() || p.name && (p.name === rawMarketerUid || p.name.includes(rawMarketerUid) || rawMarketerUid.includes(p.name))
          );
        }
        if (!matchedP && rawMarketerUid === "1") {
          matchedP = existingPersonnel.find((p) => p.role === "admin" || p.username === "admin");
        }
        if (matchedP) {
          assignedMarketerId = matchedP.id;
          assignedMarketerName = matchedP.name;
        } else {
          assignedMarketerId = rawMarketerUid.startsWith("p-") ? rawMarketerUid : `p-${rawMarketerUid}`;
          assignedMarketerName = `\u06A9\u0627\u0631\u0634\u0646\u0627\u0633 ${rawMarketerUid}`;
          const newPlaceholderP = {
            id: assignedMarketerId,
            name: assignedMarketerName,
            username: `user_${rawMarketerUid}`,
            email: `user_${rawMarketerUid}@alphadesk.ir`,
            phone: "",
            role: "marketer",
            status: "active",
            tenant_id: targetTenantNum || 1,
            legacyUid: rawMarketerUid
          };
          existingPersonnel.push(newPlaceholderP);
          personnelData.push(newPlaceholderP);
          personnelToInsert.push(newPlaceholderP);
          uidToPersonnelMap.set(rawMarketerUid, newPlaceholderP);
          uidToPersonnelMap.set(assignedMarketerId, newPlaceholderP);
        }
      }
      const deadlineIso = parseLegacyDate(r.expire || r.assignment_deadline);
      const isExpired = Boolean(
        status !== "\u0642\u0631\u0627\u0631\u062F\u0627\u062F" && status !== "\u0644\u06CC\u0633\u062A \u0633\u06CC\u0627\u0647" && deadlineIso && (/* @__PURE__ */ new Date()).getTime() > new Date(deadlineIso).getTime()
      );
      let custId;
      if (isValidUUID(r.id)) {
        custId = String(r.id).trim();
      } else if (callId) {
        custId = deterministicUUID(callId);
      } else {
        custId = crypto5.randomUUID();
      }
      if (callId) {
        globalCallIdToUUIDMap.set(callId, custId);
      }
      globalCallIdToUUIDMap.set(custId, custId);
      if (existingCustomerIdsSet.has(custId)) {
        skippedCount++;
      } else {
        existingCustomerIdsSet.add(custId);
        const custObj = {
          id: custId,
          company_name: companyName,
          business_type: businessType,
          province,
          city,
          manager_name: managerName,
          mobile_numbers: mobileNumbers,
          landline_numbers: landlineNumbers,
          assigned_marketer_id: assignedMarketerId,
          assigned_marketer_name: assignedMarketerName,
          assignment_deadline: deadlineIso,
          status,
          is_expired: isExpired,
          tenant_id: targetTenantNum || 1,
          legacyCallId: callId || null,
          date_created: parseLegacyDate(r.created || r.InsertRecDate) || (/* @__PURE__ */ new Date()).toISOString()
        };
        existingCustomers.push(custObj);
        customersData.push(custObj);
        customersToInsert.push(custObj);
        importedCustomersCount++;
        for (const m of mobileNumbers) {
          const cObj = {
            id: crypto5.randomUUID(),
            customer_id: custId,
            channel_type: "mobile",
            value: m,
            normalized_value: m,
            contact_name: managerName || companyName,
            is_primary: true,
            tenant_id: targetTenantNum || 1,
            date_created: custObj.date_created
          };
          contactsToInsert.push(cObj);
          contactsData.push(cObj);
        }
        for (const l of landlineNumbers) {
          const cObj = {
            id: crypto5.randomUUID(),
            customer_id: custId,
            channel_type: "landline",
            value: l,
            normalized_value: l,
            contact_name: managerName || companyName,
            is_primary: false,
            tenant_id: targetTenantNum || 1,
            date_created: custObj.date_created
          };
          contactsToInsert.push(cObj);
          contactsData.push(cObj);
        }
        const insta = String(r.instaID || r.instagram_ids || "").trim();
        if (insta && insta !== "NULL" && insta !== "null") {
          const cObj = {
            id: crypto5.randomUUID(),
            customer_id: custId,
            channel_type: "instagram",
            value: insta,
            normalized_value: insta.replace(/^@/, ""),
            contact_name: managerName || companyName,
            is_primary: false,
            tenant_id: targetTenantNum || 1,
            date_created: custObj.date_created
          };
          contactsToInsert.push(cObj);
          contactsData.push(cObj);
        }
        const teleg = String(r.telegID || r.telegram_ids || r.tlgMobile || r.telegram_phone || "").trim();
        if (teleg && teleg !== "NULL" && teleg !== "null") {
          const cObj = {
            id: crypto5.randomUUID(),
            customer_id: custId,
            channel_type: "telegram",
            value: teleg,
            normalized_value: teleg.replace(/^@/, ""),
            contact_name: managerName || companyName,
            is_primary: false,
            tenant_id: targetTenantNum || 1,
            date_created: custObj.date_created
          };
          contactsToInsert.push(cObj);
          contactsData.push(cObj);
        }
        const emails = String(r.emails || r.email || "").trim();
        if (emails && emails !== "NULL" && emails !== "null") {
          for (const em of emails.split(/[,;\s]+/)) {
            if (em && em.includes("@")) {
              const cObj = {
                id: crypto5.randomUUID(),
                customer_id: custId,
                channel_type: "email",
                value: em.toLowerCase(),
                normalized_value: em.toLowerCase(),
                contact_name: managerName || companyName,
                is_primary: false,
                tenant_id: targetTenantNum || 1,
                date_created: custObj.date_created
              };
              contactsToInsert.push(cObj);
              contactsData.push(cObj);
            }
          }
        }
        const web = String(r.website || r.websites || r.marketingWebsite || "").trim();
        if (web && web !== "NULL" && web !== "null") {
          const cObj = {
            id: crypto5.randomUUID(),
            customer_id: custId,
            channel_type: "website",
            value: web,
            normalized_value: web.replace(/^https?:\/\//i, ""),
            contact_name: managerName || companyName,
            is_primary: false,
            tenant_id: targetTenantNum || 1,
            date_created: custObj.date_created
          };
          contactsToInsert.push(cObj);
          contactsData.push(cObj);
        }
      }
    }
  }
  if (Array.isArray(reportRows) && reportRows.length > 0) {
    const reportsToInsert = [];
    for (const r of reportRows) {
      const callId = String(r.CallID || r.callid || "").trim();
      const repText = String(r.report || r.report_text || "\u062B\u0628\u062A \u067E\u06CC\u06AF\u06CC\u0631\u06CC").trim();
      const uidRef = String(r.uid || r.user_id || "").trim();
      const rawNegotiator = String(r.negotiator || r.negotiator_name || "").trim();
      const callNum = normalizeContactValue(r.callNum || r.negotiation_phone || "");
      const status = normalizeLegacyStatus(r.status || r.negotiation_status);
      const rawRating = parseFloat(String(r.rating ?? "").trim());
      const score = !isNaN(rawRating) ? Math.round(rawRating) : 8;
      const nextFollow = parseLegacyDate(r.nextFollow || r.next_followup_date);
      const dateCreated = parseLegacyDate(r.insertDate || r.dateTime || r.date_created) || (/* @__PURE__ */ new Date()).toISOString();
      let matchedCustomerId = null;
      if (callId) {
        const deterministicId = deterministicUUID(callId);
        if (existingCustomerIdsSet.has(deterministicId) || existingCustomers.some((c) => c.id === deterministicId)) {
          matchedCustomerId = deterministicId;
        } else if (globalCallIdToUUIDMap.has(callId)) {
          matchedCustomerId = globalCallIdToUUIDMap.get(callId);
        } else {
          const byCallId = existingCustomers.find((c) => c.id === callId || c.legacyCallId === callId || c.id === deterministicId);
          if (byCallId) matchedCustomerId = byCallId.id;
        }
      }
      if (!matchedCustomerId && callNum && globalCallIdToUUIDMap.has(callNum)) {
        matchedCustomerId = globalCallIdToUUIDMap.get(callNum);
      }
      if (!matchedCustomerId && callNum) {
        const byPhone = existingCustomers.find(
          (c) => c.mobile_numbers?.includes(callNum) || c.landline_numbers?.includes(callNum)
        );
        if (byPhone) matchedCustomerId = byPhone.id;
      }
      if (!matchedCustomerId) {
        matchedCustomerId = callId ? deterministicUUID(callId) : crypto5.randomUUID();
        if (callId) globalCallIdToUUIDMap.set(callId, matchedCustomerId);
        const orphanCust = {
          id: matchedCustomerId,
          company_name: callNum ? `\u0645\u0634\u062A\u0631\u06CC \u067E\u06CC\u06AF\u06CC\u0631\u06CC ${callNum}` : `\u0645\u0634\u062A\u0631\u06CC \u06A9\u062F ${callId || "\u062C\u062F\u06CC\u062F"}`,
          mobile_numbers: callNum ? [callNum] : [],
          status: status || "\u067E\u06CC\u06AF\u06CC\u0631\u06CC \u0642\u0628\u0644 \u0627\u0632 \u0627\u0646\u0642\u0636\u0627",
          is_expired: false,
          tenant_id: targetTenantNum || 1,
          date_created: dateCreated
        };
        existingCustomers.push(orphanCust);
        customersData.push(orphanCust);
        customersToInsert.push(orphanCust);
        existingCustomerIdsSet.add(matchedCustomerId);
        importedCustomersCount++;
      }
      const targetCust = existingCustomers.find((c) => c.id === matchedCustomerId);
      let matchedP = uidRef ? uidToPersonnelMap.get(uidRef) : null;
      if (!matchedP && rawNegotiator) {
        matchedP = uidToPersonnelMap.get(rawNegotiator) || uidToPersonnelMap.get(normalizePersianString(rawNegotiator));
      }
      if (!matchedP && targetCust && targetCust.assigned_marketer_id) {
        matchedP = uidToPersonnelMap.get(targetCust.assigned_marketer_id) || existingPersonnel.find((p) => p.id === targetCust.assigned_marketer_id);
      }
      const createdBy = matchedP ? matchedP.id : targetCust?.assigned_marketer_id || null;
      const negotiatorName = matchedP ? matchedP.name : targetCust?.assigned_marketer_name || rawNegotiator || "\u06A9\u0627\u0631\u0634\u0646\u0627\u0633";
      const repId = isValidUUID(r.ID || r.id) ? String(r.ID || r.id).trim() : deterministicUUID(`${callId || ""}-${r.ID || r.id || ""}-${dateCreated}`);
      const repObj = {
        id: repId,
        customer_id: matchedCustomerId,
        report_text: repText,
        negotiator_name: negotiatorName,
        created_by: createdBy,
        negotiation_phone: callNum,
        negotiation_status: status,
        negotiation_score: score,
        next_followup_date: nextFollow,
        tenant_id: targetTenantNum || 1,
        date_created: dateCreated
      };
      reportsData.push(repObj);
      reportsToInsert.push(repObj);
      importedReportsCount++;
    }
    if (directusUrl && directusAdminToken) {
      if (personnelToInsert.length > 0) {
        const sanitizedPersonnel = personnelToInsert.map(sanitizePersonnelForDirectus);
        await directusSafeBatchInsert("personnel", sanitizedPersonnel, 25).catch((err) => {
          errors.push(`\u062E\u0637\u0627 \u062F\u0631 \u062B\u0628\u062A \u067E\u0631\u0633\u0646\u0644 \u062F\u0631 \u062F\u0627\u06CC\u0631\u06A9\u062A\u0648\u0633: ${err.message}`);
        });
        personnelToInsert.length = 0;
      }
      if (customersToInsert.length > 0) {
        const sanitizedCusts = customersToInsert.map((c) => sanitizeCustomerForDirectus(c, directusPersonnelIdsSet));
        await directusSafeBatchInsert("customers", sanitizedCusts, 50).catch((err) => {
          errors.push(`\u062E\u0637\u0627 \u062F\u0631 \u062B\u0628\u062A \u0645\u0634\u062A\u0631\u06CC\u0627\u0646 \u062F\u0631 \u062F\u0627\u06CC\u0631\u06A9\u062A\u0648\u0633: ${err.message}`);
        });
        customersToInsert.length = 0;
      }
      if (contactsToInsert.length > 0) {
        const sanitizedContacts = contactsToInsert.map(sanitizeContactForDirectus);
        await directusSafeBatchInsert("customer_contacts", sanitizedContacts, 50).catch((err) => {
          console.warn("Customer contacts insert warning:", err.message);
        });
        contactsToInsert.length = 0;
      }
      if (reportsToInsert.length > 0) {
        const sanitizedReps = reportsToInsert.map(sanitizeReportForDirectus);
        await directusSafeBatchInsert("customer_reports", sanitizedReps, 50).catch((err) => {
          errors.push(`\u062E\u0637\u0627 \u062F\u0631 \u062B\u0628\u062A \u06AF\u0632\u0627\u0631\u0634\u200C\u0647\u0627 \u062F\u0631 \u062F\u0627\u06CC\u0631\u06A9\u062A\u0648\u0633: ${err.message}`);
        });
        reportsToInsert.length = 0;
      }
    }
  }
  if (directusUrl && directusAdminToken) {
    if (personnelToInsert.length > 0) {
      const sanitizedPersonnel = personnelToInsert.map(sanitizePersonnelForDirectus);
      await directusSafeBatchInsert("personnel", sanitizedPersonnel, 25).catch((err) => {
        errors.push(`\u062E\u0637\u0627 \u062F\u0631 \u062B\u0628\u062A \u067E\u0631\u0633\u0646\u0644 \u062F\u0631 \u062F\u0627\u06CC\u0631\u06A9\u062A\u0648\u0633: ${err.message}`);
      });
      personnelToInsert.length = 0;
    }
    if (customersToInsert.length > 0) {
      const sanitizedCusts = customersToInsert.map((c) => sanitizeCustomerForDirectus(c, directusPersonnelIdsSet));
      await directusSafeBatchInsert("customers", sanitizedCusts, 50).catch((err) => {
        errors.push(`\u062E\u0637\u0627 \u062F\u0631 \u062B\u0628\u062A \u0645\u0634\u062A\u0631\u06CC\u0627\u0646 \u062F\u0631 \u062F\u0627\u06CC\u0631\u06A9\u062A\u0648\u0633: ${err.message}`);
      });
      customersToInsert.length = 0;
    }
    if (contactsToInsert.length > 0) {
      const sanitizedContacts = contactsToInsert.map(sanitizeContactForDirectus);
      await directusSafeBatchInsert("customer_contacts", sanitizedContacts, 50).catch((err) => {
        console.warn("Customer contacts insert warning:", err.message);
      });
      contactsToInsert.length = 0;
    }
  }
  let autoAssignedCount = 0;
  if (req.body.autoAssign === true) {
    try {
      const autoRes = await autoAssignFreeCustomersWithReports(targetTenantId);
      autoAssignedCount = autoRes.reassignedCount;
    } catch (autoErr) {
      console.warn("Auto-assign free customers post-import warning:", autoErr.message);
    }
  }
  invalidateCustomersCache();
  invalidateReportsCache();
  return res.json({
    success: errors.length === 0 || importedCustomersCount > 0 || importedReportsCount > 0 || importedPersonnelCount > 0,
    importedPersonnelCount,
    importedCustomersCount,
    importedReportsCount,
    autoAssignedCount,
    skippedCount,
    skippedDetails,
    errors,
    message: `\u062F\u0631\u0648\u0646\u200C\u0631\u06CC\u0632\u06CC \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u0627\u0646\u062C\u0627\u0645 \u0634\u062F: ${importedPersonnelCount} \u06A9\u0627\u0631\u0634\u0646\u0627\u0633 \u062C\u062F\u06CC\u062F\u060C ${importedCustomersCount} \u0645\u0634\u062A\u0631\u06CC \u062C\u062F\u06CC\u062F\u060C \u0648 ${importedReportsCount} \u06AF\u0632\u0627\u0631\u0634 \u062B\u0628\u062A \u0634\u062F\u0646\u062F. (${skippedCount} \u0631\u06A9\u0648\u0631\u062F \u0645\u0648\u062C\u0648\u062F \u0646\u0627\u062F\u06CC\u062F\u0647 \u06AF\u0631\u0641\u062A\u0647 \u0634\u062F) ${autoAssignedCount > 0 ? `\u062A\u0639\u062F\u0627\u062F ${autoAssignedCount} \u0645\u0634\u062A\u0631\u06CC \u0622\u0632\u0627\u062F \u06AF\u0632\u0627\u0631\u0634\u200C\u062F\u0627\u0631 \u0628\u0647 \u0622\u062E\u0631\u06CC\u0646 \u0628\u0627\u0632\u0627\u0631\u06CC\u0627\u0628 \u0645\u0631\u0628\u0648\u0637\u0647 \u0645\u062A\u0635\u0644 \u06AF\u0631\u062F\u06CC\u062F\u0646\u062F.` : ""}`
  });
};
router2.post("/api/migration/import", handleMigrationImport);
router2.post("/migration/import", handleMigrationImport);
router2.post("/api/migration/reset-cache", handleResetMigrationCache);
router2.post("/migration/reset-cache", handleResetMigrationCache);
async function autoAssignFreeCustomersWithReports(targetTenantId) {
  let reassignedCount = 0;
  const reassignedDetails = [];
  let allCustomersList = [...customersData];
  let allReportsList = [...reportsData];
  let allPersonnelList = [...personnelData];
  if (directusUrl && directusAdminToken) {
    try {
      const [cRes, rRes, pRes] = await Promise.all([
        directusFetchAllPages("/items/customers?limit=10000").catch(() => null),
        directusFetchAllPages("/items/customer_reports?limit=50000&sort=-date_created").catch(() => null),
        directusFetchAllPages("/items/personnel?limit=1000").catch(() => null)
      ]);
      if (cRes?.data && Array.isArray(cRes.data)) allCustomersList = cRes.data;
      if (rRes?.data && Array.isArray(rRes.data)) allReportsList = rRes.data;
      if (pRes?.data && Array.isArray(pRes.data)) allPersonnelList = pRes.data;
    } catch (e) {
      console.warn("Error fetching data for auto-assignment:", e.message);
    }
  }
  const freeCustomers = allCustomersList.filter((c) => {
    if (c.status === "\u0642\u0631\u0627\u0631\u062F\u0627\u062F" || c.status === "\u0644\u06CC\u0633\u062A \u0633\u06CC\u0627\u0647") return false;
    const isUnassigned = !c.assigned_marketer_id || c.assigned_marketer_name === "\u062A\u062E\u0635\u06CC\u0635 \u0646\u06CC\u0627\u0641\u062A\u0647" || !c.assigned_marketer_name;
    const isExpired = Boolean(c.is_expired);
    return isUnassigned || isExpired;
  });
  const nowMs = Date.now();
  const defaultDeadlineIso = new Date(nowMs + 10 * 86400 * 1e3).toISOString();
  const patchesMap = /* @__PURE__ */ new Map();
  for (const cust of freeCustomers) {
    const custId = String(cust.id);
    const custMobiles = Array.isArray(cust.mobile_numbers) ? cust.mobile_numbers : [];
    const custLandlines = Array.isArray(cust.landline_numbers) ? cust.landline_numbers : [];
    const custReports = allReportsList.filter((r) => {
      if (String(r.customer_id) === custId || typeof r.customer_id === "object" && r.customer_id !== null && String(r.customer_id.id) === custId) {
        return true;
      }
      if (r.negotiation_phone) {
        const normPhone = normalizeContactValue(r.negotiation_phone);
        if (normPhone && (custMobiles.includes(normPhone) || custLandlines.includes(normPhone))) {
          return true;
        }
      }
      return false;
    });
    if (custReports.length === 0) continue;
    custReports.sort((a, b) => {
      const tA = new Date(a.date_created || 0).getTime();
      const tB = new Date(b.date_created || 0).getTime();
      return tB - tA;
    });
    const lastReport = custReports[0];
    const negotiatorName = String(lastReport?.negotiator_name || lastReport?.negotiator || "").trim();
    if (!negotiatorName || negotiatorName === "\u06A9\u0627\u0631\u0634\u0646\u0627\u0633") continue;
    const normNegotiator = normalizePersianString(negotiatorName);
    const matchedP = allPersonnelList.find((p) => {
      const normPName = normalizePersianString(p.name);
      if (normPName && normNegotiator && (normPName === normNegotiator || normPName.includes(normNegotiator) || normNegotiator.includes(normPName))) {
        return true;
      }
      if (p.username && normalizePersianString(p.username) === normNegotiator) return true;
      if (String(p.id) === String(lastReport.created_by) || String(p.user_id) === String(lastReport.created_by)) return true;
      return false;
    });
    const targetMarketerId = matchedP ? String(matchedP.id) : lastReport.created_by ? String(lastReport.created_by) : `p-${negotiatorName}`;
    const targetMarketerName = matchedP ? String(matchedP.name) : negotiatorName;
    const custPatch = {
      id: custId,
      assigned_marketer_id: targetMarketerId,
      assigned_marketer_name: targetMarketerName,
      assignment_deadline: defaultDeadlineIso,
      is_expired: false,
      claimed_from_pool: false,
      date_updated: (/* @__PURE__ */ new Date()).toISOString()
    };
    patchesMap.set(custId, custPatch);
    const localIdx = customersData.findIndex((c) => String(c.id) === custId);
    if (localIdx >= 0) {
      customersData[localIdx] = {
        ...customersData[localIdx],
        ...custPatch
      };
    }
    reassignedCount++;
    reassignedDetails.push({
      customerId: custId,
      companyName: cust.company_name || "\u0628\u062F\u0648\u0646 \u0646\u0627\u0645",
      marketerName: targetMarketerName
    });
  }
  if (directusUrl && directusAdminToken && patchesMap.size > 0) {
    try {
      await directusSafeBatchPatch("customers", patchesMap, 50);
    } catch (err) {
      console.warn(`Failed to auto-reassign free customers batch in Directus:`, err.message);
    }
  }
  invalidateCustomersCache();
  invalidateReportsCache();
  return {
    success: true,
    reassignedCount,
    details: reassignedDetails,
    message: `\u0639\u0645\u0644\u06CC\u0627\u062A \u062E\u0648\u062F\u06A9\u0627\u0631 \u062A\u06A9\u0645\u06CC\u0644 \u0634\u062F: ${reassignedCount} \u0645\u0634\u062A\u0631\u06CC \u0622\u0632\u0627\u062F \u06AF\u0632\u0627\u0631\u0634\u200C\u062F\u0627\u0631 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u0628\u0647 \u0622\u062E\u0631\u06CC\u0646 \u0628\u0627\u0632\u0627\u0631\u06CC\u0627\u0628 \u06AF\u0632\u0627\u0631\u0634\u200C\u062F\u0647\u0646\u062F\u0647 \u0645\u062A\u0635\u0644 \u06AF\u0631\u062F\u06CC\u062F\u0646\u062F.`
  };
}
var handleAutoAssignFreeWithReports = async (req, res) => {
  const { tenant_id } = req.body;
  const result = await autoAssignFreeCustomersWithReports(tenant_id);
  res.json(result);
};
router2.post("/api/migration/auto-assign-free-with-reports", handleAutoAssignFreeWithReports);
router2.post("/migration/auto-assign-free-with-reports", handleAutoAssignFreeWithReports);
var handleBackfillTenants = async (req, res) => {
  const result = await backfillNullTenantsDirectus();
  invalidateCustomersCache();
  invalidateReportsCache();
  res.json({
    success: true,
    ...result,
    message: `\u0627\u0635\u0644\u0627\u062D \u0634\u0646\u0627\u0633\u0647 \u0633\u0627\u0632\u0645\u0627\u0646 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u0627\u0646\u062C\u0627\u0645 \u0634\u062F: ${result.updatedCustomers} \u0645\u0634\u062A\u0631\u06CC \u0648 ${result.updatedReports} \u06AF\u0632\u0627\u0631\u0634 \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0634\u062F\u0646\u062F.`
  });
};
router2.post("/api/migration/backfill-tenants", handleBackfillTenants);
router2.post("/migration/backfill-tenants", handleBackfillTenants);
var system_routes_default = router2;

// server/routes/auth.routes.ts
var router3 = Router3();
var DAILY_CHECKIN_CACHE_FILE = path2.join(os.tmpdir(), "alphadesk-daily-checkin.json");
var dailyCheckinMap = /* @__PURE__ */ new Map();
var inFlightDailyCheckinKeys = /* @__PURE__ */ new Set();
try {
  if (fs2.existsSync(DAILY_CHECKIN_CACHE_FILE)) {
    const raw = fs2.readFileSync(DAILY_CHECKIN_CACHE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof k === "string" && typeof v === "string") {
          dailyCheckinMap.set(k, v);
        }
      }
    }
  }
} catch {
}
function persistDailyCheckinMap() {
  try {
    const obj = {};
    for (const [k, v] of dailyCheckinMap.entries()) {
      obj[k] = v;
    }
    fs2.writeFileSync(DAILY_CHECKIN_CACHE_FILE, JSON.stringify(obj), "utf8");
  } catch {
  }
}
function buildDailyCheckinKey(personnelId, userId, email) {
  const cleanP = personnelId ? String(personnelId).trim().toLowerCase() : "";
  if (cleanP) return `p:${cleanP}`;
  const cleanU = userId ? String(userId).trim().toLowerCase() : "";
  if (cleanU) return `u:${cleanU}`;
  const cleanE = email ? String(email).trim().toLowerCase() : "";
  if (cleanE) return `e:${cleanE}`;
  return "";
}
function hasCheckedInForWorkday(checkinKey, workdayKey) {
  if (!checkinKey || !workdayKey) return false;
  return dailyCheckinMap.get(checkinKey) === workdayKey;
}
function markCheckedInForWorkday(checkinKey, workdayKey) {
  if (!checkinKey || !workdayKey) return;
  dailyCheckinMap.set(checkinKey, workdayKey);
  persistDailyCheckinMap();
}
function detectDeviceType(userAgent, clientReported) {
  if (clientReported) {
    const s = String(clientReported).trim();
    if (s.includes("\u0645\u0648\u0628\u0627\u06CC\u0644") || s.toLowerCase() === "mobile") return "\u0645\u0648\u0628\u0627\u06CC\u0644";
    if (s.includes("\u062F\u0633\u06A9\u062A\u0627\u067E") || s.toLowerCase() === "desktop") return "\u062F\u0633\u06A9\u062A\u0627\u067E";
  }
  if (!userAgent) return "\u062F\u0633\u06A9\u062A\u0627\u067E";
  const ua = userAgent.toLowerCase();
  const isMobile = /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini|windows phone/i.test(ua);
  return isMobile ? "\u0645\u0648\u0628\u0627\u06CC\u0644" : "\u062F\u0633\u06A9\u062A\u0627\u067E";
}
function resolveUserTimeAndDate(clientTime, clientDate) {
  const userNow = /* @__PURE__ */ new Date();
  const defaultTehranTime = userNow.toLocaleTimeString("fa-IR", {
    timeZone: "Asia/Tehran",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  const defaultTehranDate = userNow.toLocaleDateString("fa-IR", {
    timeZone: "Asia/Tehran"
  });
  return {
    time: (clientTime || "").trim() || defaultTehranTime,
    date: (clientDate || "").trim() || defaultTehranDate
  };
}
function dispatchLoginSms(req, info) {
  if (!projectSettingsData.login_pattern) return;
  const fullName = (info.fullName || "\u0647\u0645\u06A9\u0627\u0631 \u06AF\u0631\u0627\u0645\u06CC").trim();
  const uPhone = (info.phone || "").trim();
  const parts = fullName.split(" ");
  const fName = parts[0] || "\u0647\u0645\u06A9\u0627\u0631";
  const lName = parts.length > 1 ? parts.slice(1).join(" ") : "\u06AF\u0631\u0627\u0645\u06CC";
  const detectedDevice = detectDeviceType(
    req.headers["user-agent"],
    req.body?.device || req.body?.client_device
  );
  const { time: finalTime, date: finalDate } = resolveUserTimeAndDate(
    req.body?.client_time || req.body?.time,
    req.body?.client_date || req.body?.date
  );
  const loginVars = {
    name: fullName,
    fullName,
    user_name: fullName,
    personnel_name: fullName,
    family: lName,
    first_name: fName,
    mobile: uPhone || "\u0646\u0627\u0645\u0634\u062E\u0635",
    phone: uPhone || "\u0646\u0627\u0645\u0634\u062E\u0635",
    date: finalDate,
    time: finalTime,
    client_date: finalDate,
    client_time: finalTime,
    ip: req.headers["x-forwarded-for"] || req.ip || "127.0.0.1",
    device: detectedDevice,
    client_device: detectedDevice,
    device_type: detectedDevice,
    username: info.username || fullName
  };
  queueMicrotask(() => {
    if (uPhone) {
      sendIppanelSmsPattern(uPhone, projectSettingsData.login_pattern, loginVars).catch(
        (e) => console.warn("Login SMS pattern send to user warning:", e.message)
      );
    }
    sendTenantAdminsSmsPattern(
      info.tenantId || "default",
      projectSettingsData.login_pattern,
      loginVars,
      { excludePhones: [uPhone] }
    ).catch((e) => console.warn("Login SMS pattern send to admin warning:", e.message));
  });
}
router3.get("/assets/:id", handleAssetProxy);
router3.get("/api/assets/:id", handleAssetProxy);
router3.post("/register", async (req, res) => {
  const { email, password, name, phone, first_name, last_name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "\u0627\u06CC\u0645\u06CC\u0644 \u0648 \u06A9\u0644\u0645\u0647 \u0639\u0628\u0648\u0631 \u0627\u0644\u0632\u0627\u0645\u06CC \u0647\u0633\u062A\u0646\u062F." });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: "\u06A9\u0644\u0645\u0647 \u0639\u0628\u0648\u0631 \u0628\u0627\u06CC\u062F \u062D\u062F\u0627\u0642\u0644 \u06F6 \u06A9\u0627\u0631\u0627\u06A9\u062A\u0631 \u0628\u0627\u0634\u062F." });
  }
  const cleanEmail = String(email).trim().toLowerCase();
  const fullName = (name || `${first_name || ""} ${last_name || ""}`).trim() || cleanEmail.split("@")[0];
  const fName = (first_name || fullName.split(" ")[0] || "\u06A9\u0627\u0631\u0628\u0631").trim();
  const lName = (last_name || fullName.split(" ").slice(1).join(" ") || "\u062C\u062F\u06CC\u062F").trim();
  const cleanPhone = (phone || "").trim();
  if (directusUrl && directusAdminToken && !isDirectusCircuitOpen()) {
    try {
      const existingRes = await directusFetch(
        `/users?filter[email][_eq]=${encodeURIComponent(cleanEmail)}`
      );
      if (existingRes && Array.isArray(existingRes.data) && existingRes.data.length > 0) {
        return res.status(400).json({ error: "\u0627\u06CC\u0646 \u0627\u06CC\u0645\u06CC\u0644 \u0642\u0628\u0644\u0627\u064B \u062F\u0631 \u0633\u0627\u0645\u0627\u0646\u0647 \u062B\u0628\u062A \u0634\u062F\u0647 \u0627\u0633\u062A. \u0644\u0637\u0641\u0627\u064B \u0648\u0627\u0631\u062F \u0634\u0648\u06CC\u062F." });
      }
      const newUserPayload = {
        email: cleanEmail,
        password: String(password),
        first_name: fName,
        last_name: lName,
        role: DIRECTUS_STAFF_ROLE_ID,
        status: "active"
      };
      const createdUserRes = await directusFetch("/users", {
        method: "POST",
        body: JSON.stringify(newUserPayload)
      });
      const createdUser = createdUserRes.data;
      const cleanUsername2 = String(req.body.username || "").trim() || cleanEmail.split("@")[0];
      const personnelId = crypto6.randomUUID();
      const personnelPayload = {
        id: personnelId,
        name: fullName,
        username: cleanUsername2,
        email: cleanEmail,
        phone: cleanPhone,
        role: "marketer",
        status: "active",
        user_id: createdUser.id
      };
      await directusFetch("/items/personnel", {
        method: "POST",
        body: JSON.stringify(personnelPayload)
      }).catch(async () => {
        const existP = await directusFetch(
          `/items/personnel?filter[email][_eq]=${encodeURIComponent(cleanEmail)}`
        ).catch(() => null);
        if (existP?.data && Array.isArray(existP.data) && existP.data.length > 0) {
          await directusFetch(`/items/personnel/${existP.data[0].id}`, {
            method: "PATCH",
            body: JSON.stringify({ user_id: createdUser.id })
          }).catch(() => {
          });
        }
      });
      const pObj = {
        id: personnelId,
        name: fullName,
        username: cleanUsername2,
        role: "marketer",
        email: cleanEmail,
        phone: cleanPhone,
        status: "active",
        active: true,
        user_id: createdUser.id
      };
      personnelData.push(pObj);
      return res.status(201).json({
        success: true,
        message: "\u062B\u0628\u062A\u200C\u0646\u0627\u0645 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u0627\u0646\u062C\u0627\u0645 \u0634\u062F. \u0627\u06A9\u0646\u0648\u0646 \u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u06CC\u062F \u0648\u0627\u0631\u062F \u062D\u0633\u0627\u0628 \u062E\u0648\u062F \u0634\u0648\u06CC\u062F.",
        user: {
          id: createdUser.id,
          email: createdUser.email,
          first_name: createdUser.first_name,
          last_name: createdUser.last_name
        },
        personnel: pObj
      });
    } catch (err) {
      return res.status(400).json({
        error: `\u062E\u0637\u0627 \u062F\u0631 \u062B\u0628\u062A\u200C\u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631 \u062F\u0631 \u067E\u0627\u06CC\u06AF\u0627\u0647 \u062F\u0627\u062F\u0647: ${err.message || "\u0645\u0634\u06A9\u0644 \u062F\u0631 \u0628\u0631\u0642\u0631\u0627\u0631\u06CC \u0627\u0631\u062A\u0628\u0627\u0637"}`
      });
    }
  }
  const existingLocal = personnelData.find((p) => p.email?.toLowerCase() === cleanEmail);
  if (existingLocal) {
    return res.status(400).json({ error: "\u0627\u06CC\u0646 \u0627\u06CC\u0645\u06CC\u0644 \u0642\u0628\u0644\u0627\u064B \u062B\u0628\u062A \u0634\u062F\u0647 \u0627\u0633\u062A." });
  }
  const newId = "p-" + Date.now();
  const cleanUsername = String(req.body.username || "").trim() || cleanEmail.split("@")[0];
  const newP = {
    id: newId,
    name: fullName,
    username: cleanUsername,
    role: "marketer",
    email: cleanEmail,
    phone: cleanPhone,
    status: "active",
    active: true
  };
  personnelData.push(newP);
  res.status(201).json({
    success: true,
    message: "\u062B\u0628\u062A\u200C\u0646\u0627\u0645 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u0627\u0646\u062C\u0627\u0645 \u0634\u062F.",
    user: { id: newId, email: cleanEmail, name: fullName },
    personnel: newP
  });
});
router3.post("/login", async (req, res) => {
  const { email, username, phone, password } = req.body;
  const rawIdentifier = (email || username || phone || "").trim();
  if (!rawIdentifier || !password) {
    return res.status(400).json({ error: "\u0627\u06CC\u0645\u06CC\u0644/\u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631\u06CC/\u0634\u0645\u0627\u0631\u0647 \u0645\u0648\u0628\u0627\u06CC\u0644 \u0648 \u06A9\u0644\u0645\u0647 \u0639\u0628\u0648\u0631 \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A." });
  }
  const cleanIdentifier = rawIdentifier.toLowerCase();
  if (directusUrl && directusAdminToken && !isDirectusCircuitOpen()) {
    try {
      let directusUserEmail = cleanIdentifier;
      if (!cleanIdentifier.includes("@")) {
        const cleanDigits2 = rawIdentifier.replace(/\D/g, "");
        let pRes = await directusFetch(
          `/items/personnel?filter[_or][0][username][_ieq]=${encodeURIComponent(
            rawIdentifier
          )}&filter[_or][1][phone][_ieq]=${encodeURIComponent(rawIdentifier)}${cleanDigits2.length >= 7 ? `&filter[_or][2][phone][_icontains]=${encodeURIComponent(cleanDigits2)}` : ""}&limit=1`
        ).catch(() => null);
        if (!pRes?.data || !Array.isArray(pRes.data) || pRes.data.length === 0) {
          pRes = await directusFetch(
            `/items/personnel?filter[_or][0][username][_ieq]=${encodeURIComponent(
              cleanIdentifier
            )}&filter[_or][1][phone][_ieq]=${encodeURIComponent(cleanIdentifier)}&limit=1`
          ).catch(() => null);
        }
        if (pRes?.data && Array.isArray(pRes.data) && pRes.data.length > 0) {
          const foundPersonnel = pRes.data[0];
          if (foundPersonnel.email && foundPersonnel.email.trim()) {
            directusUserEmail = foundPersonnel.email.toLowerCase().trim();
          }
        }
      }
      const loginRes = await directusFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: directusUserEmail, password })
      });
      if (loginRes?.data?.access_token) {
        const accessToken = loginRes.data.access_token;
        setLatestAccessToken(accessToken);
        const meRes = await directusFetch(
          "/users/me?fields=id,email,first_name,last_name,role.id,role.name,role.admin_access,avatar.*",
          {
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        );
        const meUser = meRes.data;
        let roleId = "";
        let isDirectusAdmin = false;
        if (typeof meUser.role === "object" && meUser.role !== null) {
          roleId = String(meUser.role.id || "");
          isDirectusAdmin = Boolean(meUser.role.admin_access === true);
        } else if (typeof meUser.role === "string") {
          roleId = meUser.role;
          try {
            const roleRes = await directusFetch(
              `/roles/${encodeURIComponent(roleId)}?fields=id,name,admin_access`
            );
            isDirectusAdmin = Boolean(roleRes?.data?.admin_access === true);
          } catch {
          }
        }
        let pRes = await directusFetch(
          `/items/personnel?filter[user_id][_eq]=${encodeURIComponent(meUser.id)}`
        ).catch(() => null);
        if (!pRes?.data || !Array.isArray(pRes.data) || pRes.data.length === 0) {
          pRes = await directusFetch(
            `/items/personnel?filter[email][_ieq]=${encodeURIComponent(meUser.email)}`
          ).catch(() => null);
        }
        let pItem = pRes?.data?.[0] || null;
        if (pItem) {
          if (!pItem.user_id || pItem.user_id !== meUser.id) {
            pItem.user_id = meUser.id;
            await directusFetch(`/items/personnel/${pItem.id}`, {
              method: "PATCH",
              body: JSON.stringify({ user_id: meUser.id })
            }).catch(() => {
            });
          }
          const pIdx = personnelData.findIndex(
            (p) => String(p.id) === String(pItem.id) || p.email && p.email.toLowerCase() === meUser.email.toLowerCase()
          );
          if (pIdx >= 0) {
            personnelData[pIdx] = { ...personnelData[pIdx], ...pItem, user_id: meUser.id };
          } else {
            personnelData.push({ ...pItem, user_id: meUser.id });
          }
        }
        if (!pItem) {
          const cleanPName = `${meUser.first_name || ""} ${meUser.last_name || ""}`.trim() || meUser.email;
          const newPId = crypto6.randomUUID();
          const newPersonnelPayload = {
            id: newPId,
            name: cleanPName,
            username: meUser.email.split("@")[0],
            email: meUser.email,
            phone: "",
            role: isDirectusAdmin ? "admin" : "marketer",
            status: "active",
            user_id: meUser.id
          };
          const createdPRes = await directusFetch("/items/personnel", {
            method: "POST",
            body: JSON.stringify(newPersonnelPayload)
          }).catch(() => null);
          pItem = createdPRes?.data || newPersonnelPayload;
          personnelData.push(pItem);
        }
        pItem = enrichPersonnel(pItem);
        if (pItem && (pItem.status === "inactive" || pItem.active === false)) {
          return res.status(403).json({
            error: "ACCOUNT_INACTIVE",
            message: "\u062D\u0633\u0627\u0628 \u06A9\u0627\u0631\u0628\u0631\u06CC \u0634\u0645\u0627 \u062A\u0648\u0633\u0637 \u0645\u062F\u06CC\u0631\u06CC\u062A \u063A\u06CC\u0631\u0641\u0639\u0627\u0644 \u0634\u062F\u0647 \u0627\u0633\u062A \u0648 \u0627\u0645\u06A9\u0627\u0646 \u0648\u0631\u0648\u062F \u0628\u0647 \u0633\u0627\u0645\u0627\u0646\u0647 \u0631\u0627 \u0646\u062F\u0627\u0631\u06CC\u062F. \u0644\u0637\u0641\u0627\u064B \u0628\u0627 \u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645 \u062A\u0645\u0627\u0633 \u0628\u06AF\u06CC\u0631\u06CC\u062F."
          });
        }
        const isAdmin = Boolean(
          pItem ? pItem.role === "admin" || pItem.role === "sales_manager" : isDirectusAdmin
        );
        const appRole = pItem ? pItem.role : isAdmin ? "admin" : "marketer";
        let avatarUrl = formatAvatarUrl(meUser.avatar || pItem?.avatar);
        if (pItem && avatarUrl) {
          pItem.avatar = avatarUrl;
        }
        const fullName = pItem?.name || `${meUser.first_name || ""} ${meUser.last_name || ""}`.trim() || meUser.email;
        const todayWorkdayKey = getTehranWorkdayKey();
        const checkinKey = buildDailyCheckinKey(pItem?.id, meUser.id, meUser.email);
        if (checkinKey) {
          markCheckedInForWorkday(checkinKey, todayWorkdayKey);
        }
        dispatchLoginSms(req, {
          fullName,
          phone: pItem?.phone || "",
          username: pItem?.username || meUser.email,
          tenantId: pItem?.tenant_id || "default"
        });
        return res.json({
          success: true,
          access_token: accessToken,
          refresh_token: loginRes.data.refresh_token,
          workday_key: todayWorkdayKey,
          user: {
            id: meUser.id,
            email: meUser.email,
            name: `${meUser.first_name || ""} ${meUser.last_name || ""}`.trim() || meUser.email,
            role_id: roleId,
            avatar: avatarUrl,
            is_admin: isAdmin,
            app_role: appRole
          },
          personnel_id: pItem?.id,
          personnel: pItem
        });
      }
    } catch (err) {
      if (err.message !== "DIRECTUS_UNREACHABLE_FALLBACK" && err.name !== "AbortError" && !err.message?.includes("aborted")) {
        console.warn("Directus auth notice:", err.message);
      }
    }
  }
  const cleanDigits = cleanIdentifier.replace(/\D/g, "");
  const found = personnelData.find((p) => {
    if (!p) return false;
    const pEmail = p.email ? String(p.email).trim().toLowerCase() : "";
    const pUsername = p.username ? String(p.username).trim().toLowerCase() : "";
    const pPhone = p.phone ? String(p.phone).trim() : "";
    const pPhoneDigits = pPhone.replace(/\D/g, "");
    if (cleanIdentifier && pEmail && pEmail === cleanIdentifier) return true;
    if (cleanIdentifier && pUsername && pUsername === cleanIdentifier) return true;
    if (cleanDigits && cleanDigits.length >= 7 && pPhoneDigits && pPhoneDigits === cleanDigits) return true;
    if (cleanIdentifier && pPhone && pPhone.replace(/[\s\-_()]/g, "").toLowerCase() === cleanIdentifier.replace(/[\s\-_()]/g, "")) return true;
    return false;
  });
  if (found) {
    if (found.status === "inactive" || found.active === false) {
      return res.status(403).json({
        error: "ACCOUNT_INACTIVE",
        message: "\u062D\u0633\u0627\u0628 \u06A9\u0627\u0631\u0628\u0631\u06CC \u0634\u0645\u0627 \u062A\u0648\u0633\u0637 \u0645\u062F\u06CC\u0631\u06CC\u062A \u063A\u06CC\u0631\u0641\u0639\u0627\u0644 \u0634\u062F\u0647 \u0627\u0633\u062A \u0648 \u0627\u0645\u06A9\u0627\u0646 \u0648\u0631\u0648\u062F \u0628\u0647 \u0633\u0627\u0645\u0627\u0646\u0647 \u0631\u0627 \u0646\u062F\u0627\u0631\u06CC\u062F. \u0644\u0637\u0641\u0627\u064B \u0628\u0627 \u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645 \u062A\u0645\u0627\u0633 \u0628\u06AF\u06CC\u0631\u06CC\u062F."
      });
    }
    const todayWorkdayKey = getTehranWorkdayKey();
    const checkinKey = buildDailyCheckinKey(found.id, found.user_id || found.id, found.email);
    if (checkinKey) {
      markCheckedInForWorkday(checkinKey, todayWorkdayKey);
    }
    dispatchLoginSms(req, {
      fullName: found.name || found.email,
      phone: found.phone || "",
      username: found.username || found.email,
      tenantId: found.tenant_id || "default"
    });
    let fallbackAvatarUrl = void 0;
    if (directusUrl && directusAdminToken && !isDirectusCircuitOpen()) {
      try {
        let uData = null;
        if (found.user_id && !String(found.user_id).startsWith("p-")) {
          const uRes = await directusFetch(`/users/${found.user_id}?fields=id,email,avatar`).catch(() => null);
          if (uRes?.data) uData = uRes.data;
        }
        if (!uData && found.email) {
          const uRes = await directusFetch(
            `/users?filter[email][_eq]=${encodeURIComponent(found.email.toLowerCase().trim())}&fields=id,email,avatar&limit=1`
          ).catch(() => null);
          if (uRes?.data?.[0]) uData = uRes.data[0];
        }
        if (uData?.avatar) {
          fallbackAvatarUrl = formatAvatarUrl(uData.avatar);
        }
      } catch {
      }
    }
    if (!fallbackAvatarUrl && found.avatar) {
      fallbackAvatarUrl = formatAvatarUrl(found.avatar);
    }
    if (fallbackAvatarUrl) {
      found.avatar = fallbackAvatarUrl;
    }
    return res.json({
      success: true,
      access_token: "local-token-" + found.id,
      workday_key: todayWorkdayKey,
      user: {
        id: found.id,
        email: found.email,
        username: found.username,
        name: found.name,
        role_id: found.role === "admin" ? DIRECTUS_ADMIN_ROLE_ID : DIRECTUS_STAFF_ROLE_ID,
        avatar: fallbackAvatarUrl || found.avatar,
        is_admin: found.role === "admin",
        app_role: found.role
      },
      personnel: found
    });
  }
  res.status(401).json({ error: "\u06A9\u0627\u0631\u0628\u0631\u06CC \u0628\u0627 \u0627\u06CC\u0646 \u0645\u0634\u062E\u0635\u0627\u062A \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." });
});
router3.post("/daily-checkin", async (req, res) => {
  const { userId, personnelId, userName, userEmail, isSessionRevoked, isInactive, isAuthenticated } = getRequestUser(req);
  if (isInactive) {
    return res.status(403).json({
      error: "ACCOUNT_INACTIVE",
      message: "\u062D\u0633\u0627\u0628 \u06A9\u0627\u0631\u0628\u0631\u06CC \u0634\u0645\u0627 \u062A\u0648\u0633\u0637 \u0645\u062F\u06CC\u0631\u06CC\u062A \u063A\u06CC\u0631\u0641\u0639\u0627\u0644 \u0634\u062F\u0647 \u0627\u0633\u062A \u0648 \u0627\u0645\u06A9\u0627\u0646 \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u0627\u0632 \u0633\u0627\u0645\u0627\u0646\u0647 \u0631\u0627 \u0646\u062F\u0627\u0631\u06CC\u062F."
    });
  }
  if (isSessionRevoked || !isAuthenticated || !userId && !personnelId && !userEmail) {
    return res.status(401).json({
      error: "ALL_SESSIONS_REVOKED",
      message: "\u0646\u0634\u0633\u062A \u06A9\u0627\u0631\u06CC \u0634\u0645\u0627 \u0645\u0639\u062A\u0628\u0631 \u0646\u06CC\u0633\u062A. \u0644\u0637\u0641\u0627\u064B \u0645\u062C\u062F\u062F\u0627\u064B \u0648\u0627\u0631\u062F \u0634\u0648\u06CC\u062F."
    });
  }
  let pItem = null;
  if (directusUrl && directusAdminToken && !isDirectusCircuitOpen() && personnelId) {
    try {
      const pRes = await directusFetch(`/items/personnel/${personnelId}`).catch(() => null);
      if (pRes?.data) pItem = pRes.data;
    } catch {
    }
  }
  if (!pItem) {
    pItem = personnelData.find((p) => {
      if (!p) return false;
      const pId = p.id ? String(p.id).trim().toLowerCase() : "";
      const pUserId = p.user_id ? String(p.user_id).trim().toLowerCase() : "";
      const pEmail = p.email ? String(p.email).trim().toLowerCase() : "";
      const cleanPId = personnelId ? String(personnelId).trim().toLowerCase() : "";
      const cleanUId = userId ? String(userId).trim().toLowerCase() : "";
      const cleanUEmail = userEmail ? String(userEmail).trim().toLowerCase() : "";
      if (cleanPId && pId && pId === cleanPId) return true;
      if (cleanUId && pUserId && pUserId === cleanUId) return true;
      if (cleanUId && pId && pId === cleanUId) return true;
      if (cleanUEmail && pEmail && pEmail === cleanUEmail) return true;
      return false;
    });
  }
  if (pItem && (pItem.status === "inactive" || pItem.active === false)) {
    return res.status(403).json({
      error: "ACCOUNT_INACTIVE",
      message: "\u062D\u0633\u0627\u0628 \u06A9\u0627\u0631\u0628\u0631\u06CC \u0634\u0645\u0627 \u062A\u0648\u0633\u0637 \u0645\u062F\u06CC\u0631\u06CC\u062A \u063A\u06CC\u0631\u0641\u0639\u0627\u0644 \u0634\u062F\u0647 \u0627\u0633\u062A \u0648 \u0627\u0645\u06A9\u0627\u0646 \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u0627\u0632 \u0633\u0627\u0645\u0627\u0646\u0647 \u0631\u0627 \u0646\u062F\u0627\u0631\u06CC\u062F."
    });
  }
  const todayWorkdayKey = getTehranWorkdayKey();
  const checkinKey = buildDailyCheckinKey(pItem?.id || personnelId, userId, pItem?.email || userEmail);
  const lockKey = `${checkinKey}:${todayWorkdayKey}`;
  if (!checkinKey) {
    return res.json({
      success: true,
      sms_sent: false,
      already_checked_in: true,
      workday_key: todayWorkdayKey
    });
  }
  if (hasCheckedInForWorkday(checkinKey, todayWorkdayKey) || inFlightDailyCheckinKeys.has(lockKey)) {
    return res.json({
      success: true,
      sms_sent: false,
      already_checked_in: true,
      workday_key: todayWorkdayKey
    });
  }
  inFlightDailyCheckinKeys.add(lockKey);
  try {
    markCheckedInForWorkday(checkinKey, todayWorkdayKey);
    const fullName = pItem?.name || userName || userEmail || "\u0647\u0645\u06A9\u0627\u0631 \u06AF\u0631\u0627\u0645\u06CC";
    const hasPattern = Boolean(projectSettingsData.login_pattern);
    dispatchLoginSms(req, {
      fullName,
      phone: pItem?.phone || "",
      username: pItem?.username || userEmail || fullName,
      tenantId: pItem?.tenant_id || "default"
    });
    return res.json({
      success: true,
      sms_sent: hasPattern,
      already_checked_in: false,
      workday_key: todayWorkdayKey
    });
  } finally {
    inFlightDailyCheckinKeys.delete(lockKey);
  }
});
router3.get("/me", async (req, res) => {
  const { userId, personnelId, userRole, isAdmin, userName, userEmail, isSessionRevoked, isInactive } = getRequestUser(req);
  if (isInactive) {
    return res.status(403).json({
      error: "ACCOUNT_INACTIVE",
      message: "\u062D\u0633\u0627\u0628 \u06A9\u0627\u0631\u0628\u0631\u06CC \u0634\u0645\u0627 \u062A\u0648\u0633\u0637 \u0645\u062F\u06CC\u0631\u06CC\u062A \u063A\u06CC\u0631\u0641\u0639\u0627\u0644 \u0634\u062F\u0647 \u0627\u0633\u062A \u0648 \u0627\u0645\u06A9\u0627\u0646 \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u0627\u0632 \u0633\u0627\u0645\u0627\u0646\u0647 \u0631\u0627 \u0646\u062F\u0627\u0631\u06CC\u062F."
    });
  }
  if (isSessionRevoked || !userId && !personnelId && !userEmail) {
    return res.status(401).json({
      error: "ALL_SESSIONS_REVOKED",
      message: "\u0646\u0634\u0633\u062A\u200C\u0647\u0627\u06CC \u06A9\u0627\u0631\u06CC \u062A\u0645\u0627\u0645\u06CC \u06A9\u0627\u0631\u0628\u0631\u0627\u0646 \u062A\u0648\u0633\u0637 \u0645\u062F\u06CC\u0631\u06CC\u062A \u0644\u063A\u0648 \u0634\u062F\u0647 \u0627\u0633\u062A. \u0644\u0637\u0641\u0627\u064B \u0645\u062C\u062F\u062F\u0627\u064B \u0648\u0627\u0631\u062F \u0634\u0648\u06CC\u062F."
    });
  }
  let avatarUrl = void 0;
  let pItem = null;
  let isDirectusAdmin = false;
  if (directusUrl && directusAdminToken && !isDirectusCircuitOpen()) {
    try {
      if (personnelId) {
        const pRes = await directusFetch(`/items/personnel/${personnelId}`).catch(() => null);
        if (pRes?.data) pItem = pRes.data;
      }
    } catch {
    }
  }
  if (!pItem) {
    pItem = personnelData.find((p) => {
      if (!p) return false;
      const pId = p.id ? String(p.id).trim().toLowerCase() : "";
      const pUserId = p.user_id ? String(p.user_id).trim().toLowerCase() : "";
      const pEmail = p.email ? String(p.email).trim().toLowerCase() : "";
      const cleanPId = personnelId ? String(personnelId).trim().toLowerCase() : "";
      const cleanUId = userId ? String(userId).trim().toLowerCase() : "";
      const cleanUEmail = userEmail ? String(userEmail).trim().toLowerCase() : "";
      if (cleanPId && pId && pId === cleanPId) return true;
      if (cleanUId && pUserId && pUserId === cleanUId) return true;
      if (cleanUId && pId && pId === cleanUId) return true;
      if (cleanUEmail && pEmail && pEmail === cleanUEmail) return true;
      return false;
    });
  }
  if (directusUrl && !isDirectusCircuitOpen()) {
    try {
      let directusUser = null;
      if (req.headers["authorization"]) {
        const meRes = await directusFetch(
          "/users/me?fields=id,email,avatar.*,first_name,last_name,role.id,role.name,role.admin_access",
          { headers: { Authorization: req.headers["authorization"] } }
        ).catch(() => null);
        if (meRes?.data?.id) directusUser = meRes.data;
      }
      if (!directusUser && userId && !String(userId).startsWith("p-")) {
        const uRes = await directusFetch(
          `/users/${userId}?fields=id,email,avatar.*,first_name,last_name,role.id,role.name,role.admin_access`
        ).catch(() => null);
        if (uRes?.data?.id) directusUser = uRes.data;
      }
      if (!directusUser && pItem?.user_id && !String(pItem.user_id).startsWith("p-")) {
        const uRes = await directusFetch(
          `/users/${pItem.user_id}?fields=id,email,avatar.*,first_name,last_name,role.id,role.name,role.admin_access`
        ).catch(() => null);
        if (uRes?.data?.id) directusUser = uRes.data;
      }
      const targetEmail = (userEmail || pItem?.email || "").toLowerCase().trim();
      const targetUsername = (pItem?.username || "").toLowerCase().trim();
      if (!directusUser && (targetEmail || targetUsername)) {
        let filterQuery = "";
        if (targetEmail && targetUsername) {
          filterQuery = `filter[_or][0][email][_ieq]=${encodeURIComponent(targetEmail)}&filter[_or][1][username][_ieq]=${encodeURIComponent(targetUsername)}`;
        } else if (targetEmail) {
          filterQuery = `filter[email][_ieq]=${encodeURIComponent(targetEmail)}`;
        } else if (targetUsername) {
          filterQuery = `filter[username][_ieq]=${encodeURIComponent(targetUsername)}`;
        }
        const uRes = await directusFetch(
          `/users?${filterQuery}&fields=id,email,avatar.*,first_name,last_name,role.id,role.name,role.admin_access&limit=1`
        ).catch(() => null);
        if (uRes?.data?.[0]?.id) directusUser = uRes.data[0];
      }
      if (directusUser) {
        if (directusUser.avatar) {
          avatarUrl = formatAvatarUrl(directusUser.avatar);
        }
        if (directusUser.role?.admin_access === true) {
          isDirectusAdmin = true;
        }
      }
    } catch (e) {
      console.warn("Directus user query error in /me:", e?.message);
    }
  }
  if (pItem) {
    pItem = enrichPersonnel(pItem);
    const pImg = formatAvatarUrl(pItem.profile_image);
    if (pImg) {
      avatarUrl = pImg;
      pItem.profile_image = pImg;
      pItem.avatar = pImg;
    } else if (avatarUrl) {
      pItem.profile_image = avatarUrl;
      pItem.avatar = avatarUrl;
    } else if (pItem.avatar) {
      avatarUrl = formatAvatarUrl(pItem.avatar);
      pItem.profile_image = avatarUrl;
      pItem.avatar = avatarUrl;
    }
  }
  const effectiveIsAdmin = Boolean(
    pItem ? pItem.role === "admin" || pItem.role === "sales_manager" : isDirectusAdmin
  );
  const effectiveRole = pItem ? pItem.role : effectiveIsAdmin ? "admin" : "marketer";
  res.json({
    user: {
      id: userId || personnelId,
      name: userName || pItem?.name || "\u06A9\u0627\u0631\u0628\u0631 \u0633\u0627\u0645\u0627\u0646\u0647",
      email: userEmail || pItem?.email,
      avatar: avatarUrl,
      is_admin: effectiveIsAdmin,
      app_role: effectiveRole
    },
    personnel_id: personnelId || pItem?.id,
    personnel: pItem
  });
});
router3.post("/change-password", async (req, res) => {
  const { current_password, new_password } = req.body;
  const { userId, personnelId, userEmail } = getRequestUser(req);
  if (!new_password || String(new_password).trim().length < 6) {
    return res.status(400).json({ error: "\u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u062C\u062F\u06CC\u062F \u0628\u0627\u06CC\u062F \u062D\u062F\u0627\u0642\u0644 \u06F6 \u06A9\u0627\u0631\u0627\u06A9\u062A\u0631 \u0628\u0627\u0634\u062F." });
  }
  if (directusUrl && directusAdminToken && !isDirectusCircuitOpen()) {
    try {
      let targetDirectusUserId = null;
      if (userId && !String(userId).startsWith("p-")) {
        targetDirectusUserId = String(userId);
      }
      if (!targetDirectusUserId && (personnelId || userEmail)) {
        const pMatch = personnelData.find(
          (p) => personnelId && String(p.id).toLowerCase() === String(personnelId).toLowerCase() || userEmail && p.email && p.email.toLowerCase() === userEmail.toLowerCase()
        );
        if (pMatch?.user_id) {
          targetDirectusUserId = String(pMatch.user_id);
        }
      }
      if (!targetDirectusUserId && userEmail) {
        const uRes = await directusFetch(
          `/users?filter[email][_eq]=${encodeURIComponent(userEmail.toLowerCase())}`
        ).catch(() => null);
        if (uRes?.data && uRes.data.length > 0) {
          targetDirectusUserId = String(uRes.data[0].id);
        }
      }
      if (targetDirectusUserId) {
        await directusFetch(`/users/${targetDirectusUserId}`, {
          method: "PATCH",
          body: JSON.stringify({ password: String(new_password).trim() })
        });
        return res.json({ success: true, message: "\u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062A\u063A\u06CC\u06CC\u0631 \u06CC\u0627\u0641\u062A." });
      }
    } catch (err) {
      console.warn("Change password Directus warning:", err.message);
    }
  }
  res.json({ success: true, message: "\u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062A\u063A\u06CC\u06CC\u0631 \u06CC\u0627\u0641\u062A." });
});
router3.post("/logout-all", async (req, res) => {
  const { isAdmin } = getRequestUser(req);
  if (!isAdmin) {
    return res.status(403).json({
      error: "FORBIDDEN",
      message: "\u0641\u0642\u0637 \u0645\u062F\u06CC\u0631 \u0627\u0631\u0634\u062F \u0633\u06CC\u0633\u062A\u0645 \u0645\u062C\u0627\u0632 \u0628\u0647 \u062E\u0631\u0648\u062C \u0647\u0645\u06AF\u0627\u0646\u06CC \u06A9\u0627\u0631\u0628\u0631\u0627\u0646 \u0627\u0633\u062A."
    });
  }
  const revTs = Date.now();
  setGlobalSessionRevocationTimestamp(revTs);
  return res.json({
    success: true,
    revocationTimestamp: revTs,
    message: "\u062A\u0645\u0627\u0645\u06CC \u0646\u0634\u0633\u062A\u200C\u0647\u0627\u06CC \u06A9\u0627\u0631\u06CC \u0641\u0639\u0627\u0644 \u062F\u0631 \u0633\u0627\u0645\u0627\u0646\u0647 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u0644\u063A\u0648 \u0634\u062F\u0646\u062F \u0648 \u062A\u0645\u0627\u0645\u06CC \u06A9\u0627\u0631\u0628\u0631\u0627\u0646 \u0644\u0627\u06AF\u06CC\u0646\u200C\u0634\u062F\u0647 \u062E\u0627\u0631\u062C \u06AF\u0631\u062F\u06CC\u062F\u0646\u062F."
  });
});
var auth_routes_default = router3;

// server/routes/customers.routes.ts
import { Router as Router4 } from "express";
import crypto7 from "crypto";
var router4 = Router4();
async function computePersonnelFreeQuota(targetPersonnelId, claimLimit = 20, targetPersonnelName) {
  const normTargetName = normalizePersianString(targetPersonnelName);
  if (directusUrl && directusAdminToken) {
    try {
      let activeUnclosedCount2 = 0;
      let successfulCount2 = 0;
      const contractStatusIn = `%D9%82%D8%B1%D8%A7%D8%B1%D8%AF%D8%A7%D8%AF,%D9%82%D8%B1%D8%A7%D8%B1%D8%AF%D8%A7%D8%AF%20%2F%20%D9%81%D8%A7%DA%A9%D8%AA%D9%88%D8%B1,%D9%82%D8%B1%D8%A7%D8%B1%D8%AF%D8%A7%D8%AF%2F%D9%81%D8%A7%DA%A9%D8%AA%D9%88%D8%B1`;
      const pFilter = `&filter[assigned_marketer_id][_eq]=${encodeURIComponent(targetPersonnelId)}`;
      const [contractsRes, activeRes] = await Promise.all([
        directusFetch(
          `/items/customers?aggregate[count]=*&filter[status][_in]=${contractStatusIn}${pFilter}`
        ).catch(() => null),
        directusFetch(
          `/items/customers?aggregate[count]=*&filter[claimed_from_pool][_eq]=true&filter[is_expired][_eq]=false&filter[status][_nin]=${contractStatusIn},%D9%84%DB%8C%D8%B3%D8%AA%20%D8%B3%DB%8C%D8%A7%D9%87${pFilter}`
        ).catch(() => null)
      ]);
      if (contractsRes?.data?.[0]?.count !== void 0) {
        successfulCount2 = Number(contractsRes.data[0].count || 0);
      }
      if (activeRes?.data?.[0]?.count !== void 0) {
        activeUnclosedCount2 = Number(activeRes.data[0].count || 0);
      }
      const remainingQuota2 = Math.max(0, claimLimit - activeUnclosedCount2);
      const canClaim2 = activeUnclosedCount2 < claimLimit || successfulCount2 > 0;
      return {
        claimLimit,
        activeUnclosedCount: activeUnclosedCount2,
        successfulCount: successfulCount2,
        canClaim: canClaim2,
        remainingQuota: remainingQuota2,
        requiresSuccessToUnlock: activeUnclosedCount2 >= claimLimit && successfulCount2 === 0
      };
    } catch (e) {
      console.warn("Quota check error in Directus:", e.message);
    }
  }
  updateExpirationFlags();
  const userCustomers = customersData.filter(
    (c) => c.assigned_marketer_id === targetPersonnelId || targetPersonnelName && c.assigned_marketer_name === targetPersonnelName
  );
  const successfulCount = userCustomers.filter((c) => c.status === "\u0642\u0631\u0627\u0631\u062F\u0627\u062F").length;
  const activeUnclosedCount = userCustomers.filter(
    (c) => Boolean(c.claimed_from_pool) && !c.is_expired && c.status !== "\u0642\u0631\u0627\u0631\u062F\u0627\u062F" && c.status !== "\u0644\u06CC\u0633\u062A \u0633\u06CC\u0627\u0647"
  ).length;
  const remainingQuota = Math.max(0, claimLimit - activeUnclosedCount);
  const canClaim = activeUnclosedCount < claimLimit || successfulCount > 0;
  return {
    claimLimit,
    activeUnclosedCount,
    successfulCount,
    canClaim,
    remainingQuota,
    requiresSuccessToUnlock: activeUnclosedCount >= claimLimit && successfulCount === 0
  };
}
router4.get("/free-quota", async (req, res) => {
  const { personnelId, userId, userName } = getRequestUser(req);
  const targetId = req.query.personnel_id || personnelId || userId;
  const targetName = req.query.personnel_name || userName;
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
  if (!targetId) {
    return res.json({
      claimLimit: limit,
      activeUnclosedCount: 0,
      successfulCount: 0,
      canClaim: true,
      remainingQuota: limit,
      requiresSuccessToUnlock: false
    });
  }
  const quota = await computePersonnelFreeQuota(targetId, limit, targetName);
  res.json(quota);
});
router4.post("/check-duplicate", async (req, res) => {
  const { value, channel_type, customer_id } = req.body;
  if (!value || typeof value !== "string") {
    return res.json({ isDuplicate: false });
  }
  const dup = await asyncCheckContactDuplicate(
    value,
    typeof channel_type === "string" ? channel_type : void 0,
    typeof customer_id === "string" ? customer_id : void 0
  );
  res.json(dup || { isDuplicate: false });
});
function matchesCustomerSearch(c, searchStr) {
  if (!c) return false;
  if (!searchStr || !searchStr.trim()) return true;
  const raw = searchStr.trim().toLowerCase();
  const normRaw = normalizePersianString(raw);
  const normRawNoSpace = normRaw.replace(/\s+/g, "");
  const persianDigits = "\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9";
  const arabicDigits = "\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669";
  const digitsOnly = raw.replace(/[۰-۹]/g, (w) => persianDigits.indexOf(w).toString()).replace(/[٠-٩]/g, (w) => arabicDigits.indexOf(w).toString()).replace(/[^\d]/g, "");
  const matchesTextField = (val) => {
    if (!val) return false;
    const str = String(val);
    if (str.toLowerCase().includes(raw)) return true;
    const normVal = normalizePersianString(str);
    if (normRaw && normVal.includes(normRaw)) return true;
    if (normRawNoSpace.length >= 3 && normVal.replace(/\s+/g, "").includes(normRawNoSpace)) return true;
    return false;
  };
  if (matchesTextField(c.company_name) || matchesTextField(c.manager_name) || matchesTextField(c.negotiator_name) || matchesTextField(c.city) || matchesTextField(c.province) || matchesTextField(c.business_type) || matchesTextField(c.assigned_marketer_name)) {
    return true;
  }
  const isMatchVal = (val) => {
    if (!val) return false;
    const sVal = String(val).trim().toLowerCase();
    if (!sVal) return false;
    if (sVal.includes(raw)) return true;
    if (digitsOnly.length >= 3) {
      const cleanPhoneDigits = sVal.replace(/[^\d]/g, "");
      if (cleanPhoneDigits.includes(digitsOnly)) return true;
      const pNoZero = cleanPhoneDigits.replace(/^(0|98|\+98)/, "");
      const sNoZero = digitsOnly.replace(/^(0|98|\+98)/, "");
      if (pNoZero && sNoZero && pNoZero.includes(sNoZero)) return true;
    }
    return false;
  };
  const phoneLists = [
    ...Array.isArray(c.mobile_numbers) ? c.mobile_numbers : [c.mobile_numbers],
    ...Array.isArray(c.landline_numbers) ? c.landline_numbers : [c.landline_numbers],
    ...Array.isArray(c.manager_phones) ? c.manager_phones : [c.manager_phones],
    ...Array.isArray(c.negotiator_phones) ? c.negotiator_phones : [c.negotiator_phones],
    c.telegram_phone,
    ...Array.isArray(c.telegram_ids) ? c.telegram_ids : [c.telegram_ids],
    ...Array.isArray(c.instagram_ids) ? c.instagram_ids : [c.instagram_ids],
    ...Array.isArray(c.emails) ? c.emails : [c.emails]
  ];
  if (phoneLists.some(isMatchVal)) return true;
  if (Array.isArray(c.contacts)) {
    for (const ct of c.contacts) {
      if (ct && (isMatchVal(ct.value) || isMatchVal(ct.normalized_value) || isMatchVal(ct.contact_name))) {
        return true;
      }
    }
  }
  return false;
}
async function enrichCustomersWithLatestReportFollowup(items) {
  if (!items || items.length === 0) return items || [];
  const itemIds = items.map((c) => String(c.id)).filter(Boolean);
  if (itemIds.length === 0) return items;
  if (directusUrl && directusAdminToken) {
    try {
      const chunks = chunkArray(itemIds, 50);
      const latestMap = /* @__PURE__ */ new Map();
      await Promise.all(
        chunks.map(async (chunk) => {
          const repRes = await directusFetch(
            `/items/customer_reports?filter[customer_id][_in]=${encodeURIComponent(
              chunk.join(",")
            )}&sort=-date_created&fields=id,customer_id,next_followup_date,date_created&limit=1000`
          ).catch(() => null);
          if (repRes?.data && Array.isArray(repRes.data)) {
            for (const r of repRes.data) {
              const rawC = r.customer_id;
              const cId = typeof rawC === "object" && rawC !== null ? String(rawC.id || rawC.item || "") : String(rawC || "");
              if (cId && !latestMap.has(cId)) {
                latestMap.set(cId, r.next_followup_date || null);
              }
            }
          }
        })
      );
      for (const c of items) {
        const cIdStr = String(c.id);
        if (latestMap.has(cIdStr)) {
          const val = latestMap.get(cIdStr);
          if (val !== void 0) {
            c.next_followup_date = val;
          }
        }
      }
    } catch (e) {
      console.warn("Error enriching customers with latest report followup:", e.message);
    }
  } else {
    const inMemLatestMap = /* @__PURE__ */ new Map();
    const sortedInMemReports = [...reportsData].sort(
      (a, b) => new Date(b.date_created || 0).getTime() - new Date(a.date_created || 0).getTime()
    );
    for (const r of sortedInMemReports) {
      const cId = String(r.customer_id || "");
      if (cId && !inMemLatestMap.has(cId)) {
        inMemLatestMap.set(cId, r.next_followup_date || null);
      }
    }
    for (const c of items) {
      const cIdStr = String(c.id);
      if (inMemLatestMap.has(cIdStr)) {
        c.next_followup_date = inMemLatestMap.get(cIdStr);
      }
    }
  }
  return items;
}
function sortCustomersList(items, sortKey) {
  if (!items || items.length <= 1) return items || [];
  const list = [...items];
  if (sortKey === "next_followup_asc" || sortKey === "next_followup_date") {
    return list.sort((a, b) => {
      const aTime = a.next_followup_date ? new Date(a.next_followup_date).getTime() : NaN;
      const bTime = b.next_followup_date ? new Date(b.next_followup_date).getTime() : NaN;
      const aValid = !isNaN(aTime);
      const bValid = !isNaN(bTime);
      if (!aValid && !bValid) return 0;
      if (!aValid) return 1;
      if (!bValid) return -1;
      return aTime - bTime;
    });
  }
  if (sortKey === "next_followup_desc" || sortKey === "-next_followup_date") {
    return list.sort((a, b) => {
      const aTime = a.next_followup_date ? new Date(a.next_followup_date).getTime() : NaN;
      const bTime = b.next_followup_date ? new Date(b.next_followup_date).getTime() : NaN;
      const aValid = !isNaN(aTime);
      const bValid = !isNaN(bTime);
      if (!aValid && !bValid) return 0;
      if (!aValid) return 1;
      if (!bValid) return -1;
      return bTime - aTime;
    });
  }
  if (sortKey === "company_name_asc") {
    return list.sort((a, b) => (a.company_name || "").localeCompare(b.company_name || "", "fa"));
  }
  if (sortKey === "deadline_asc") {
    return list.sort((a, b) => {
      if (!a.assignment_deadline && !b.assignment_deadline) return 0;
      if (!a.assignment_deadline) return 1;
      if (!b.assignment_deadline) return -1;
      return new Date(a.assignment_deadline).getTime() - new Date(b.assignment_deadline).getTime();
    });
  }
  return list.sort(
    (a, b) => new Date(b.date_created || 0).getTime() - new Date(a.date_created || 0).getTime()
  );
}
router4.get("/", async (req, res) => {
  const { search, status, marketer_id, expired_only, page, limit, free_only, all, sort, followup_filter } = req.query;
  const { userId, personnelId, isAdmin, userName, tenantId, canViewAllCustomers } = getRequestUser(req);
  const isUnlimited = all === "true" || limit === "all" || limit === "20000";
  const reqLimit = isUnlimited ? 500 : limit ? Math.min(Math.max(1, parseInt(String(limit), 10)), 500) : 25;
  const reqPage = page ? Math.max(1, parseInt(String(page), 10)) : 1;
  const isFreeOnly = free_only === "true";
  const sortKey = typeof sort === "string" && sort.trim() ? sort.trim() : "next_followup_asc";
  const startOfToday = /* @__PURE__ */ new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTodayIso = startOfToday.toISOString();
  const endOfToday = /* @__PURE__ */ new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const endOfTodayIso = endOfToday.toISOString();
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const in3DaysIso = new Date(Date.now() + 3 * 864e5).toISOString();
  const in7DaysIso = new Date(Date.now() + 7 * 864e5).toISOString();
  if (!isAdmin && !canViewAllCustomers && !userId && !personnelId && !isFreeOnly) {
    return res.json({
      data: [],
      meta: { filter_count: 0, total_count: 0, page: reqPage, limit: reqLimit, total_pages: 1 }
    });
  }
  if (isUnlimited) {
    const cachedList = await ensureCustomersCache().catch(() => customersData);
    updateExpirationFlags();
    let list2 = cachedList.map((c) => computeCustomerExpiration(c));
    if (tenantId && tenantId !== "all" && (isAdmin || isFreeOnly)) {
      list2 = list2.filter((c) => matchesTenant(c.tenant_id, tenantId));
    }
    if (!isAdmin && !canViewAllCustomers && (userId || personnelId) && !isFreeOnly) {
      list2 = list2.filter(
        (c) => c.assigned_marketer_id === personnelId || c.assigned_marketer_id === userId || userName && c.assigned_marketer_name === userName
      );
    }
    if (search && typeof search === "string" && search.trim()) {
      list2 = list2.filter((c) => matchesCustomerSearch(c, search));
    }
    if (status && status !== "\u0647\u0645\u0647") {
      list2 = list2.filter((c) => c.status === status);
    }
    if (marketer_id && marketer_id !== "\u0647\u0645\u0647") {
      list2 = list2.filter((c) => c.assigned_marketer_id === marketer_id);
    }
    if (expired_only === "true") {
      list2 = list2.filter((c) => c.is_expired);
    }
    if (isFreeOnly) {
      list2 = list2.filter((c) => !c.assigned_marketer_id || c.is_expired);
    }
    if (followup_filter && followup_filter !== "\u0647\u0645\u0647" && followup_filter !== "all") {
      const ff = String(followup_filter);
      const startTodayMs = startOfToday.getTime();
      const endTodayMs = endOfToday.getTime();
      const nowMs = Date.now();
      list2 = list2.filter((c) => {
        if (!c.next_followup_date) return ff === "no_followup";
        const fTime = new Date(c.next_followup_date).getTime();
        if (isNaN(fTime)) return ff === "no_followup";
        if (ff === "active") return fTime >= startTodayMs;
        if (ff === "today") return fTime >= startTodayMs && fTime <= endTodayMs;
        if (ff === "due_3_days") return fTime >= nowMs && fTime <= nowMs + 3 * 864e5;
        if (ff === "due_7_days") return fTime >= nowMs && fTime <= nowMs + 7 * 864e5;
        if (ff === "overdue") return fTime < startTodayMs;
        if (ff === "no_followup") return false;
        return true;
      });
    }
    if (isUnlimited && list2.length > reqLimit) {
      list2 = list2.slice(0, reqLimit);
    }
    list2 = await enrichCustomersWithLatestReportFollowup(list2);
    list2 = sortCustomersList(list2, sortKey);
    return res.json(list2);
  }
  if (directusUrl && directusAdminToken) {
    if (search && typeof search === "string" && search.trim()) {
      try {
        const cleanSearch = search.trim();
        const persianDigits = "\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9";
        const arabicDigits = "\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669";
        const digits = cleanSearch.replace(/[۰-۹]/g, (w) => persianDigits.indexOf(w).toString()).replace(/[٠-٩]/g, (w) => arabicDigits.indexOf(w).toString()).replace(/[^\d]/g, "");
        const persianVariant = cleanSearch.replace(/ي/g, "\u06CC").replace(/ك/g, "\u06A9");
        const arabicVariant = cleanSearch.replace(/ی/g, "\u064A").replace(/ک/g, "\u0643");
        const searchVariants = Array.from(new Set([cleanSearch, persianVariant, arabicVariant].filter(Boolean)));
        const contactOrFilters = [];
        let cOrIdx = 0;
        for (const sv of searchVariants) {
          contactOrFilters.push(`filter[_or][${cOrIdx++}][value][_icontains]=${encodeURIComponent(sv)}`);
          contactOrFilters.push(`filter[_or][${cOrIdx++}][normalized_value][_icontains]=${encodeURIComponent(sv)}`);
          contactOrFilters.push(`filter[_or][${cOrIdx++}][contact_name][_icontains]=${encodeURIComponent(sv)}`);
        }
        if (digits.length >= 3) {
          contactOrFilters.push(`filter[_or][${cOrIdx++}][value][_icontains]=${encodeURIComponent(digits)}`);
          contactOrFilters.push(`filter[_or][${cOrIdx++}][normalized_value][_icontains]=${encodeURIComponent(digits)}`);
        }
        const [cachedAll, contactsRes] = await Promise.all([
          ensureCustomersCache().catch(() => null),
          directusFetch(`/items/customer_contacts?${contactOrFilters.join("&")}&fields=customer_id&limit=500`).catch(
            () => null
          )
        ]);
        if (Array.isArray(cachedAll) && cachedAll.length > 0) {
          const contactMatchedIdSet = new Set(
            (contactsRes?.data && Array.isArray(contactsRes.data) ? contactsRes.data : []).map((ct) => typeof ct.customer_id === "object" ? ct.customer_id?.id : ct.customer_id).filter(Boolean).map(String)
          );
          let list2 = cachedAll.map((c) => computeCustomerExpiration(c));
          if (tenantId && tenantId !== "all") {
            list2 = list2.filter((c) => matchesTenant(c.tenant_id, tenantId));
          }
          if (!isAdmin && !canViewAllCustomers && (userId || personnelId || userName) && !isFreeOnly) {
            const cleanPId = personnelId ? String(personnelId).trim().toLowerCase() : "";
            const rawUid = cleanPId.replace(/^p-/, "");
            const cleanUId = userId ? String(userId).trim().toLowerCase() : "";
            const normUserName = normalizePersianString(userName);
            list2 = list2.filter((c) => {
              const cId = c.assigned_marketer_id ? String(c.assigned_marketer_id).trim().toLowerCase() : "";
              if (cleanPId && (cId === cleanPId || cId === rawUid || cId === `p-${rawUid}`)) return true;
              if (cleanUId && (cId === cleanUId || cId === rawUid || cId === `p-${rawUid}`)) return true;
              const cNameNorm = normalizePersianString(c.assigned_marketer_name);
              if (normUserName && cNameNorm && (cNameNorm === normUserName || cNameNorm.includes(normUserName))) {
                return true;
              }
              return false;
            });
          }
          if (status && status !== "\u0647\u0645\u0647") {
            const normSt = (v) => {
              const s = String(v || "").trim();
              return s === "\u0642\u0631\u0627\u0631\u062F\u0627\u062F / \u0641\u0627\u06A9\u062A\u0648\u0631" || s === "\u0642\u0631\u0627\u0631\u062F\u0627\u062F/\u0641\u0627\u06A9\u062A\u0648\u0631" ? "\u0642\u0631\u0627\u0631\u062F\u0627\u062F" : s;
            };
            const targetSt = normSt(status);
            list2 = list2.filter((c) => normSt(c.status) === targetSt);
          }
          if (marketer_id && marketer_id !== "\u0647\u0645\u0647") {
            const targetM = String(marketer_id).trim().toLowerCase();
            const rawTargetM = targetM.replace(/^p-/, "");
            list2 = list2.filter((c) => {
              const cM = String(c.assigned_marketer_id || "").trim().toLowerCase();
              return cM === targetM || cM === rawTargetM || cM === `p-${rawTargetM}`;
            });
          }
          if (expired_only === "true") {
            list2 = list2.filter((c) => Boolean(c.is_expired));
          }
          if (isFreeOnly) {
            list2 = list2.filter((c) => !c.assigned_marketer_id || c.is_expired);
          }
          list2 = list2.filter(
            (c) => contactMatchedIdSet.has(String(c.id)) || matchesCustomerSearch(c, cleanSearch)
          );
          if (followup_filter && followup_filter !== "\u0647\u0645\u0647" && followup_filter !== "all") {
            const ff = String(followup_filter);
            const startTodayMs = startOfToday.getTime();
            const endTodayMs = endOfToday.getTime();
            const nowMs = Date.now();
            list2 = list2.filter((c) => {
              if (!c.next_followup_date) return ff === "no_followup";
              const fTime = new Date(c.next_followup_date).getTime();
              if (isNaN(fTime)) return ff === "no_followup";
              if (ff === "active") return fTime >= startTodayMs;
              if (ff === "today") return fTime >= startTodayMs && fTime <= endTodayMs;
              if (ff === "due_3_days") return fTime >= nowMs && fTime <= nowMs + 3 * 864e5;
              if (ff === "due_7_days") return fTime >= nowMs && fTime <= nowMs + 7 * 864e5;
              if (ff === "overdue") return fTime < startTodayMs;
              if (ff === "no_followup") return false;
              return true;
            });
          }
          list2 = sortCustomersList(list2, sortKey);
          const filterCount = list2.length;
          const totalPages2 = Math.max(1, Math.ceil(filterCount / reqLimit));
          const startIndex2 = (reqPage - 1) * reqLimit;
          let pagedItems = list2.slice(startIndex2, startIndex2 + reqLimit);
          pagedItems = await enrichCustomersWithLatestReportFollowup(pagedItems);
          pagedItems = sortCustomersList(pagedItems, sortKey);
          res.setHeader("X-Total-Count", String(filterCount));
          res.setHeader("X-Filter-Count", String(filterCount));
          res.setHeader("X-Page", String(reqPage));
          res.setHeader("X-Limit", String(reqLimit));
          if (isUnlimited) {
            return res.json(pagedItems);
          }
          return res.json({
            data: pagedItems,
            meta: {
              filter_count: filterCount,
              total_count: filterCount,
              page: reqPage,
              limit: reqLimit,
              total_pages: totalPages2
            }
          });
        }
      } catch (searchErr) {
        console.warn("Unified customer search cache fallback to Directus query:", searchErr?.message || searchErr);
      }
    }
    try {
      const isFollowupSort = sortKey === "next_followup_asc" || sortKey === "next_followup_date" || sortKey === "next_followup_desc" || sortKey === "-next_followup_date";
      const isAllFollowups = !followup_filter || followup_filter === "\u0647\u0645\u0647" || followup_filter === "all";
      let dSort = "-date_created";
      if (sortKey === "next_followup_asc" || sortKey === "next_followup_date") dSort = "next_followup_date";
      else if (sortKey === "next_followup_desc" || sortKey === "-next_followup_date") dSort = "-next_followup_date";
      else if (sortKey === "company_name_asc") dSort = "company_name";
      else if (sortKey === "deadline_asc") dSort = "assignment_deadline";
      else if (sortKey === "date_updated_desc" || sortKey === "-date_updated") dSort = "-date_updated";
      const fieldsQuery = `&fields=id,company_name,business_type,province,city,manager_name,manager_phones,negotiator_name,negotiator_phones,mobile_numbers,landline_numbers,telegram_phone,telegram_ids,instagram_ids,emails,websites,next_followup_date,assigned_marketer_id,assigned_marketer_name,assignment_deadline,status,is_expired,claimed_from_pool,date_created,date_updated,tenant_id`;
      let filterQuery = "";
      let andIdx = 0;
      if (tenantId && tenantId !== "all") {
        const tenantNum = resolveDirectusTenantId(tenantId);
        if (tenantNum && tenantNum >= 1) {
          filterQuery += `&filter[_and][${andIdx++}][tenant_id][_eq]=${tenantNum}`;
        }
      }
      if (!isAdmin && !canViewAllCustomers && !isFreeOnly) {
        const cleanPId = personnelId ? String(personnelId).trim().toLowerCase() : "";
        const rawUid = cleanPId.replace(/^p-/, "");
        const cleanUId = userId ? String(userId).trim().toLowerCase() : "";
        const normUserName = userName ? userName.trim() : "";
        let mOrIdx = 0;
        if (cleanPId) {
          filterQuery += `&filter[_and][${andIdx}][_or][${mOrIdx++}][assigned_marketer_id][_eq]=${encodeURIComponent(cleanPId)}`;
          if (rawUid && rawUid !== cleanPId) {
            filterQuery += `&filter[_and][${andIdx}][_or][${mOrIdx++}][assigned_marketer_id][_eq]=${encodeURIComponent(rawUid)}`;
            filterQuery += `&filter[_and][${andIdx}][_or][${mOrIdx++}][assigned_marketer_id][_eq]=${encodeURIComponent("p-" + rawUid)}`;
          }
        }
        if (cleanUId && cleanUId !== cleanPId && cleanUId !== rawUid) {
          filterQuery += `&filter[_and][${andIdx}][_or][${mOrIdx++}][assigned_marketer_id][_eq]=${encodeURIComponent(cleanUId)}`;
        }
        if (normUserName) {
          filterQuery += `&filter[_and][${andIdx}][_or][${mOrIdx++}][assigned_marketer_name][_icontains]=${encodeURIComponent(normUserName)}`;
        }
        andIdx++;
      }
      if (status && status !== "\u0647\u0645\u0647") {
        filterQuery += `&filter[_and][${andIdx++}][status][_eq]=${encodeURIComponent(String(status))}`;
      }
      if (marketer_id && marketer_id !== "\u0647\u0645\u0647") {
        filterQuery += `&filter[_and][${andIdx++}][assigned_marketer_id][_eq]=${encodeURIComponent(String(marketer_id))}`;
      }
      if (expired_only === "true") {
        filterQuery += `&filter[_and][${andIdx++}][is_expired][_eq]=true`;
      }
      if (isFreeOnly) {
        filterQuery += `&filter[_and][${andIdx}][_or][0][assigned_marketer_id][_null]=true&filter[_and][${andIdx}][_or][1][is_expired][_eq]=true`;
        andIdx++;
      }
      if (!isAllFollowups) {
        const ff = String(followup_filter);
        if (ff === "active") {
          filterQuery += `&filter[_and][${andIdx++}][next_followup_date][_gte]=${encodeURIComponent(startOfTodayIso)}`;
        } else if (ff === "today") {
          filterQuery += `&filter[_and][${andIdx}][next_followup_date][_gte]=${encodeURIComponent(startOfTodayIso)}&filter[_and][${andIdx}][next_followup_date][_lte]=${encodeURIComponent(endOfTodayIso)}`;
          andIdx++;
        } else if (ff === "due_3_days") {
          filterQuery += `&filter[_and][${andIdx}][next_followup_date][_gte]=${encodeURIComponent(nowIso)}&filter[_and][${andIdx}][next_followup_date][_lte]=${encodeURIComponent(in3DaysIso)}`;
          andIdx++;
        } else if (ff === "due_7_days") {
          filterQuery += `&filter[_and][${andIdx}][next_followup_date][_gte]=${encodeURIComponent(nowIso)}&filter[_and][${andIdx}][next_followup_date][_lte]=${encodeURIComponent(in7DaysIso)}`;
          andIdx++;
        } else if (ff === "overdue") {
          filterQuery += `&filter[_and][${andIdx}][next_followup_date][_nnull]=true&filter[_and][${andIdx}][next_followup_date][_lt]=${encodeURIComponent(startOfTodayIso)}`;
          andIdx++;
        } else if (ff === "no_followup") {
          filterQuery += `&filter[_and][${andIdx++}][next_followup_date][_null]=true`;
        }
      }
      let contactMatchedCustomerIds = [];
      if (search && typeof search === "string" && search.trim()) {
        const cleanSearch = search.trim();
        const digits = cleanSearch.replace(/[^\d]/g, "");
        const persianVariant = cleanSearch.replace(/ي/g, "\u06CC").replace(/ك/g, "\u06A9");
        const arabicVariant = cleanSearch.replace(/ی/g, "\u064A").replace(/ک/g, "\u0643");
        const searchVariants = Array.from(new Set([cleanSearch, persianVariant, arabicVariant].filter(Boolean)));
        try {
          const contactOrFilters = [];
          let cOrIdx = 0;
          for (const sv of searchVariants) {
            contactOrFilters.push(`filter[_or][${cOrIdx++}][value][_icontains]=${encodeURIComponent(sv)}`);
            contactOrFilters.push(`filter[_or][${cOrIdx++}][normalized_value][_icontains]=${encodeURIComponent(sv)}`);
            contactOrFilters.push(`filter[_or][${cOrIdx++}][contact_name][_icontains]=${encodeURIComponent(sv)}`);
          }
          if (digits.length >= 3) {
            contactOrFilters.push(`filter[_or][${cOrIdx++}][value][_icontains]=${encodeURIComponent(digits)}`);
            contactOrFilters.push(`filter[_or][${cOrIdx++}][normalized_value][_icontains]=${encodeURIComponent(digits)}`);
          }
          const cRes = await directusFetch(
            `/items/customer_contacts?${contactOrFilters.join("&")}&fields=customer_id&limit=100`
          ).catch(() => null);
          if (cRes?.data && Array.isArray(cRes.data)) {
            contactMatchedCustomerIds = cRes.data.map((ct) => typeof ct.customer_id === "object" ? ct.customer_id?.id : ct.customer_id).filter(Boolean);
          }
        } catch {
        }
        let sOrIdx = 0;
        for (const s of searchVariants) {
          filterQuery += `&filter[_and][${andIdx}][_or][${sOrIdx++}][company_name][_icontains]=${encodeURIComponent(s)}`;
          filterQuery += `&filter[_and][${andIdx}][_or][${sOrIdx++}][manager_name][_icontains]=${encodeURIComponent(s)}`;
          filterQuery += `&filter[_and][${andIdx}][_or][${sOrIdx++}][negotiator_name][_icontains]=${encodeURIComponent(s)}`;
          filterQuery += `&filter[_and][${andIdx}][_or][${sOrIdx++}][city][_icontains]=${encodeURIComponent(s)}`;
          filterQuery += `&filter[_and][${andIdx}][_or][${sOrIdx++}][business_type][_icontains]=${encodeURIComponent(s)}`;
        }
        filterQuery += `&filter[_and][${andIdx}][_or][${sOrIdx++}][telegram_phone][_icontains]=${encodeURIComponent(cleanSearch)}`;
        if (contactMatchedCustomerIds.length > 0) {
          filterQuery += `&filter[_and][${andIdx}][_or][${sOrIdx++}][id][_in]=${encodeURIComponent(
            contactMatchedCustomerIds.slice(0, 80).join(",")
          )}`;
        }
        andIdx++;
      }
      let resData = null;
      if (isFollowupSort && isAllFollowups) {
        const offset = (reqPage - 1) * reqLimit;
        const nonNullFilter = `${filterQuery}&filter[_and][${andIdx}][next_followup_date][_nnull]=true`;
        const nullFilter = `${filterQuery}&filter[_and][${andIdx}][next_followup_date][_null]=true`;
        const [nonNullRes, nullMetaRes] = await Promise.all([
          directusFetch(
            `/items/customers?offset=${offset}&limit=${reqLimit}&meta=*&sort=${encodeURIComponent(dSort)}${fieldsQuery}${nonNullFilter}`,
            {},
            1
          ).catch(() => null),
          directusFetch(`/items/customers?limit=1&meta=*&fields=id${nullFilter}`, {}, 1).catch(() => null)
        ]);
        if (nonNullRes && Array.isArray(nonNullRes.data)) {
          const nonNullItems = nonNullRes.data;
          const nonNullCount = Number(nonNullRes.meta?.filter_count ?? nonNullItems.length);
          const nullCount = Number(nullMetaRes?.meta?.filter_count ?? 0);
          let combinedItems = [...nonNullItems];
          if (combinedItems.length < reqLimit && nullCount > 0) {
            const neededNulls = reqLimit - combinedItems.length;
            const nullOffset = Math.max(0, offset - nonNullCount);
            const nullItemsRes = await directusFetch(
              `/items/customers?offset=${nullOffset}&limit=${neededNulls}&sort=-date_created${fieldsQuery}${nullFilter}`,
              {},
              1
            ).catch(() => null);
            if (nullItemsRes?.data && Array.isArray(nullItemsRes.data)) {
              combinedItems = [...combinedItems, ...nullItemsRes.data];
            }
          }
          resData = {
            data: combinedItems,
            meta: {
              filter_count: nonNullCount + nullCount,
              total_count: nonNullRes.meta?.total_count ?? nonNullCount + nullCount
            }
          };
        }
      } else {
        const directusPath = `/items/customers?page=${reqPage}&limit=${reqLimit}&meta=*&sort=${encodeURIComponent(dSort)}${fieldsQuery}${filterQuery}`;
        resData = await directusFetch(directusPath, {}, 1).catch(() => null);
      }
      if (resData && Array.isArray(resData.data)) {
        let items = resData.data.map((c) => computeCustomerExpiration(c));
        if (tenantId && tenantId !== "all") {
          items = items.filter((c) => matchesTenant(c.tenant_id, tenantId));
        }
        if (!isAdmin && !canViewAllCustomers && (userId || personnelId || userName) && !isFreeOnly) {
          const cleanPId = personnelId ? String(personnelId).trim().toLowerCase() : "";
          const rawUid = cleanPId.replace(/^p-/, "");
          const cleanUId = userId ? String(userId).trim().toLowerCase() : "";
          const normUserName = normalizePersianString(userName);
          items = items.filter((c) => {
            const cId = c.assigned_marketer_id ? String(c.assigned_marketer_id).trim().toLowerCase() : "";
            if (cleanPId && (cId === cleanPId || cId === rawUid || cId === `p-${rawUid}`)) return true;
            if (cleanUId && (cId === cleanUId || cId === rawUid || cId === `p-${rawUid}`)) return true;
            const cNameNorm = normalizePersianString(c.assigned_marketer_name);
            if (normUserName && cNameNorm && (cNameNorm === normUserName || cNameNorm.includes(normUserName)))
              return true;
            return false;
          });
        }
        if (search && typeof search === "string" && search.trim()) {
          const contactMatchedIdSet = new Set(contactMatchedCustomerIds.map(String));
          items = items.filter(
            (c) => contactMatchedIdSet.has(String(c.id)) || matchesCustomerSearch(c, search)
          );
        }
        items = await enrichCustomersWithLatestReportFollowup(items);
        items = sortCustomersList(items, sortKey);
        const filterCount = resData.meta?.filter_count ?? items.length;
        const totalCount2 = resData.meta?.total_count ?? filterCount;
        const totalPages2 = Math.max(1, Math.ceil(filterCount / reqLimit));
        res.setHeader("X-Total-Count", String(totalCount2));
        res.setHeader("X-Filter-Count", String(filterCount));
        res.setHeader("X-Page", String(reqPage));
        res.setHeader("X-Limit", String(reqLimit));
        if (isUnlimited) {
          return res.json(items);
        }
        return res.json({
          data: items,
          meta: {
            filter_count: filterCount,
            total_count: totalCount2,
            page: reqPage,
            limit: reqLimit,
            total_pages: totalPages2
          }
        });
      }
    } catch (e) {
      console.warn("Directus customer query fallback to in-memory store:", e.message);
    }
  }
  updateExpirationFlags();
  let list = customersData.map((c) => computeCustomerExpiration(c));
  if (tenantId && tenantId !== "all" && (isAdmin || isFreeOnly)) {
    list = list.filter((c) => matchesTenant(c.tenant_id, tenantId));
  }
  if (!isAdmin && !canViewAllCustomers && (userId || personnelId) && !isFreeOnly) {
    list = list.filter(
      (c) => c.assigned_marketer_id === personnelId || c.assigned_marketer_id === userId || userName && c.assigned_marketer_name === userName
    );
  }
  if (search && typeof search === "string" && search.trim()) {
    list = list.filter((c) => matchesCustomerSearch(c, search));
  }
  if (status && status !== "\u0647\u0645\u0647") {
    list = list.filter((c) => c.status === status);
  }
  if (marketer_id && marketer_id !== "\u0647\u0645\u0647") {
    list = list.filter((c) => c.assigned_marketer_id === marketer_id);
  }
  if (expired_only === "true") {
    list = list.filter((c) => c.is_expired);
  }
  if (isFreeOnly) {
    list = list.filter((c) => !c.assigned_marketer_id || c.is_expired);
  }
  list = await enrichCustomersWithLatestReportFollowup(list);
  if (followup_filter && followup_filter !== "\u0647\u0645\u0647" && followup_filter !== "all") {
    const ff = String(followup_filter);
    const startTodayMs = startOfToday.getTime();
    const endTodayMs = endOfToday.getTime();
    const nowMs = Date.now();
    list = list.filter((c) => {
      if (!c.next_followup_date) return ff === "no_followup";
      const fTime = new Date(c.next_followup_date).getTime();
      if (isNaN(fTime)) return ff === "no_followup";
      if (ff === "active") return fTime >= startTodayMs;
      if (ff === "today") return fTime >= startTodayMs && fTime <= endTodayMs;
      if (ff === "due_3_days") return fTime >= nowMs && fTime <= nowMs + 3 * 864e5;
      if (ff === "due_7_days") return fTime >= nowMs && fTime <= nowMs + 7 * 864e5;
      if (ff === "overdue") return fTime < startTodayMs;
      if (ff === "no_followup") return false;
      return true;
    });
  }
  list = sortCustomersList(list, sortKey);
  const totalCount = list.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / reqLimit));
  const startIndex = (reqPage - 1) * reqLimit;
  const paginatedList = list.slice(startIndex, startIndex + reqLimit);
  res.json({
    data: paginatedList,
    meta: {
      filter_count: totalCount,
      total_count: totalCount,
      page: reqPage,
      limit: reqLimit,
      total_pages: totalPages
    }
  });
});
router4.get("/:id", async (req, res) => {
  const { id } = req.params;
  if (directusUrl && directusAdminToken) {
    try {
      const [custRes, reportsRes, contactsRes] = await Promise.all([
        directusFetch(`/items/customers/${encodeURIComponent(id)}`).catch(() => null),
        directusFetch(`/items/customer_reports?filter[customer_id][_eq]=${encodeURIComponent(id)}&sort=-date_created`).catch(() => null),
        directusFetch(`/items/customer_contacts?filter[customer_id][_eq]=${encodeURIComponent(id)}`).catch(() => null)
      ]);
      if (custRes?.data) {
        let cust2 = computeCustomerExpiration(custRes.data);
        let customerReports = reportsRes?.data && Array.isArray(reportsRes.data) ? reportsRes.data : [];
        const customerContacts = contactsRes?.data && Array.isArray(contactsRes.data) ? contactsRes.data : [];
        if (customerReports.length === 0) {
          const cachedReports = reportsData.filter(
            (r) => String(r.customer_id) === String(id) || typeof r.customer_id === "object" && r.customer_id !== null && String(r.customer_id.id) === String(id)
          );
          if (cachedReports.length > 0) {
            customerReports = cachedReports;
          }
        }
        if (customerReports.length > 0) {
          customerReports.sort(
            (a, b) => new Date(b.date_created || 0).getTime() - new Date(a.date_created || 0).getTime()
          );
          const latestFollowup = customerReports[0].next_followup_date || null;
          cust2.next_followup_date = latestFollowup;
          const currentCustFollowup = custRes.data.next_followup_date ? new Date(custRes.data.next_followup_date).toISOString() : null;
          const targetFollowupIso = latestFollowup ? new Date(latestFollowup).toISOString() : null;
          if (currentCustFollowup !== targetFollowupIso) {
            directusFetch(`/items/customers/${encodeURIComponent(id)}`, {
              method: "PATCH",
              body: JSON.stringify({
                next_followup_date: targetFollowupIso,
                date_updated: (/* @__PURE__ */ new Date()).toISOString()
              })
            }).catch(() => {
            });
          }
        }
        cust2.reports = customerReports;
        cust2.contacts = customerContacts;
        return res.json(cust2);
      }
    } catch (e) {
      console.warn(`Error fetching customer ${id} from Directus:`, e.message);
    }
  }
  updateExpirationFlags();
  const found = customersData.find((c) => c.id === id);
  if (!found) {
    return res.status(404).json({ error: "Customer not found" });
  }
  const cust = computeCustomerExpiration(found);
  const foundReports = reportsData.filter((r) => String(r.customer_id) === String(id)).sort((a, b) => new Date(b.date_created || 0).getTime() - new Date(a.date_created || 0).getTime());
  if (foundReports.length > 0) {
    cust.next_followup_date = foundReports[0].next_followup_date || null;
  }
  cust.reports = foundReports;
  cust.contacts = contactsData.filter((ct) => String(ct.customer_id) === String(id));
  res.json(cust);
});
router4.post("/sync-followups", async (req, res) => {
  res.json({
    success: true,
    message: "\u0647\u0645\u06AF\u0627\u0645\u200C\u0633\u0627\u0632\u06CC \u0645\u0648\u0639\u062F \u067E\u06CC\u06AF\u06CC\u0631\u06CC \u0645\u0634\u062A\u0631\u06CC\u0627\u0646 \u0628\u0631 \u0627\u0633\u0627\u0633 \u0622\u062E\u0631\u06CC\u0646 \u06AF\u0632\u0627\u0631\u0634 \u062F\u0631 \u067E\u0633\u200C\u0632\u0645\u06CC\u0646\u0647 \u0622\u063A\u0627\u0632 \u0634\u062F."
  });
  syncAllCustomersFollowupFromReports().catch((err) => {
    console.error("[AlphaDesk] Background followup sync error:", err.message);
  });
});
router4.get("/:id/contacts", async (req, res) => {
  const { id } = req.params;
  if (directusUrl && directusAdminToken) {
    try {
      const contactsRes = await directusFetch(
        `/items/customer_contacts?filter[customer_id][_eq]=${encodeURIComponent(id)}&sort=-date_created`
      );
      if (contactsRes?.data && Array.isArray(contactsRes.data)) {
        return res.json(contactsRes.data);
      }
    } catch (e) {
      console.warn(`Error fetching contacts for customer ${id}:`, e.message);
    }
  }
  const filtered = contactsData.filter((ct) => String(ct.customer_id) === String(id));
  return res.json(filtered);
});
router4.post("/bulk-set-deadline", async (req, res) => {
  const { target = "all", marketer_id, customer_ids, days = 30 } = req.body;
  const daysCount = parseInt(String(days), 10) || 30;
  const nowMs = Date.now();
  const deadlineIso = new Date(nowMs + daysCount * 86400 * 1e3).toISOString();
  let targetCustomerIds = [];
  if (target === "selected" && Array.isArray(customer_ids) && customer_ids.length > 0) {
    targetCustomerIds = customer_ids.map(String);
  } else if (target === "marketer" && marketer_id) {
    targetCustomerIds = customersData.filter((c) => String(c.assigned_marketer_id) === String(marketer_id)).map((c) => c.id);
  } else {
    targetCustomerIds = customersData.map((c) => c.id);
  }
  if (directusUrl && directusAdminToken) {
    try {
      if (target === "all" || target === "marketer") {
        const queryFilter = target === "marketer" && marketer_id ? `?filter[assigned_marketer_id][_eq]=${encodeURIComponent(marketer_id)}&limit=50000&fields=id` : "?limit=50000&fields=id";
        const dRes = await directusFetchAllPages(`/items/customers${queryFilter}`).catch(() => null);
        const dItems = Array.isArray(dRes) ? dRes : dRes?.data || [];
        if (dItems.length > 0) {
          targetCustomerIds = Array.from(/* @__PURE__ */ new Set([...targetCustomerIds, ...dItems.map((item) => String(item.id))]));
        }
      }
      const patchMap = /* @__PURE__ */ new Map();
      for (const cid of targetCustomerIds) {
        patchMap.set(cid, {
          id: cid,
          assignment_deadline: deadlineIso,
          is_expired: false
        });
      }
      await directusSafeBatchPatch("customers", patchMap, 50);
    } catch (e) {
      console.warn("Error patching customers deadline in Directus:", e.message);
    }
  }
  let updatedCount = 0;
  for (const c of customersData) {
    if (targetCustomerIds.length === 0 || targetCustomerIds.includes(c.id)) {
      c.assignment_deadline = deadlineIso;
      c.is_expired = false;
      updatedCount++;
    }
  }
  invalidateCustomersCache();
  return res.json({
    success: true,
    updatedCount: targetCustomerIds.length || updatedCount,
    deadline: deadlineIso,
    message: `\u0645\u0647\u0644\u062A \u0645\u0627\u0644\u06A9\u06CC\u062A ${targetCustomerIds.length || updatedCount} \u067E\u0631\u0648\u0646\u062F\u0647 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u0628\u0647 ${daysCount} \u0631\u0648\u0632 (\u062A\u0627 \u062A\u0627\u0631\u06CC\u062E \u0633\u0631\u0631\u0633\u06CC\u062F \u062C\u062F\u06CC\u062F) \u062A\u0646\u0638\u06CC\u0645 \u06AF\u0631\u062F\u06CC\u062F.`
  });
});
router4.post("/bulk-extend", async (req, res) => {
  const { customer_ids, extend_days = 7 } = req.body;
  const daysCount = parseInt(String(extend_days), 10) || 7;
  const nowMs = Date.now();
  const deadlineIso = new Date(nowMs + daysCount * 86400 * 1e3).toISOString();
  const targetIds = Array.isArray(customer_ids) ? customer_ids.map(String) : [];
  if (targetIds.length === 0) {
    return res.status(400).json({ error: "NO_CUSTOMERS", message: "\u0647\u06CC\u0686 \u067E\u0631\u0648\u0646\u062F\u0647\u200C\u0627\u06CC \u0627\u0646\u062A\u062E\u0627\u0628 \u0646\u0634\u062F\u0647 \u0627\u0633\u062A." });
  }
  if (directusUrl && directusAdminToken) {
    try {
      const patchMap = /* @__PURE__ */ new Map();
      for (const cid of targetIds) {
        patchMap.set(cid, {
          id: cid,
          assignment_deadline: deadlineIso,
          is_expired: false
        });
      }
      await directusSafeBatchPatch("customers", patchMap, 50);
    } catch (e) {
      console.warn("Directus bulk-extend error:", e.message);
    }
  }
  for (const c of customersData) {
    if (targetIds.includes(c.id)) {
      c.assignment_deadline = deadlineIso;
      c.is_expired = false;
    }
  }
  invalidateCustomersCache();
  return res.json({
    success: true,
    updatedCount: targetIds.length,
    message: `\u0645\u0647\u0644\u062A \u0645\u0627\u0644\u06A9\u06CC\u062A ${targetIds.length} \u067E\u0631\u0648\u0646\u062F\u0647 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u0628\u0647 \u0645\u062F\u062A ${daysCount} \u0631\u0648\u0632 \u062A\u0645\u062F\u06CC\u062F \u06AF\u0631\u062F\u06CC\u062F.`
  });
});
router4.post("/bulk-switch", async (req, res) => {
  const { customer_ids, new_marketer_id, new_marketer_name, duration_days = 7 } = req.body;
  const daysCount = parseInt(String(duration_days), 10) || 7;
  const nowTime = /* @__PURE__ */ new Date();
  const deadlineIso = new Date(nowTime.getTime() + daysCount * 86400 * 1e3).toISOString();
  const targetIds = Array.isArray(customer_ids) ? customer_ids.map(String) : [];
  if (targetIds.length === 0) {
    return res.status(400).json({ error: "NO_CUSTOMERS", message: "\u0647\u06CC\u0686 \u067E\u0631\u0648\u0646\u062F\u0647\u200C\u0627\u06CC \u0627\u0646\u062A\u062E\u0627\u0628 \u0646\u0634\u062F\u0647 \u0627\u0633\u062A." });
  }
  const resolved = await resolvePersonnelId(new_marketer_id, new_marketer_name);
  const targetPId = resolved.personnelId;
  const targetPName = resolved.personnelName || new_marketer_name || "\u06A9\u0627\u0631\u0634\u0646\u0627\u0633 \u0641\u0631\u0648\u0634";
  if (directusUrl && directusAdminToken) {
    try {
      const patchMap = /* @__PURE__ */ new Map();
      for (const cid of targetIds) {
        patchMap.set(cid, {
          id: cid,
          assigned_marketer_id: targetPId,
          assigned_marketer_name: targetPName,
          assignment_deadline: deadlineIso,
          is_expired: false
        });
      }
      await directusSafeBatchPatch("customers", patchMap, 50);
    } catch (e) {
      console.warn("Directus bulk-switch error:", e.message);
    }
  }
  for (const c of customersData) {
    if (targetIds.includes(c.id)) {
      c.assigned_marketer_id = targetPId;
      c.assigned_marketer_name = targetPName;
      c.assignment_deadline = deadlineIso;
      c.is_expired = false;
    }
  }
  invalidateCustomersCache();
  return res.json({
    success: true,
    updatedCount: targetIds.length,
    message: `\u062A\u0639\u062F\u0627\u062F ${targetIds.length} \u067E\u0631\u0648\u0646\u062F\u0647 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u0628\u0647 \xAB${targetPName}\xBB \u0648\u0627\u06AF\u0630\u0627\u0631 \u0634\u062F.`
  });
});
router4.post("/", async (req, res) => {
  const { userId, personnelId, userName, tenantId } = getRequestUser(req);
  const payload = req.body;
  if (!payload.company_name) {
    return res.status(400).json({ error: "\u0646\u0627\u0645 \u0634\u0631\u06A9\u062A \u06CC\u0627 \u0628\u0631\u0646\u062F \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A." });
  }
  const extractedContacts = extractCustomerContacts(payload, "temp");
  const allPhones = [];
  extractedContacts.forEach((ct) => {
    if (ct.value) allPhones.push(ct.value);
    if (ct.normalized_value) allPhones.push(ct.normalized_value);
  });
  const nowMs = Date.now();
  const phoneLockKey = allPhones.sort().join("|") || (payload.company_name || "").trim();
  if (activeCustomerCreationLocks.has(phoneLockKey)) {
    return res.status(409).json({
      error: "CONCURRENT_SAVE_LOCK",
      message: "\u06CC\u06A9 \u062F\u0631\u062E\u0648\u0627\u0633\u062A \u062B\u0628\u062A \u0647\u0645\u0632\u0645\u0627\u0646 \u0628\u0631\u0627\u06CC \u0627\u06CC\u0646 \u0645\u0634\u062A\u0631\u06CC \u062F\u0631 \u062D\u0627\u0644 \u067E\u0631\u062F\u0627\u0632\u0634 \u0627\u0633\u062A. \u0644\u0637\u0641\u0627\u064B \u0686\u0646\u062F \u062B\u0627\u0646\u06CC\u0647 \u0634\u06A9\u06CC\u0628\u0627 \u0628\u0627\u0634\u06CC\u062F."
    });
  }
  activeCustomerCreationLocks.add(phoneLockKey);
  try {
    const recent = recentCustomerCreations.find(
      (rc) => nowMs - rc.timestamp < 1e4 && (rc.company_name === (payload.company_name || "").trim() || rc.phones.some((p) => allPhones.includes(p)))
    );
    if (recent) {
      return res.json({
        ...recent.customer,
        isDuplicatePrevented: true,
        message: "\u067E\u0631\u0648\u0646\u062F\u0647 \u0627\u06CC\u0646 \u0645\u0634\u062A\u0631\u06CC \u0644\u062D\u0638\u0627\u062A\u06CC \u067E\u06CC\u0634 \u062B\u0628\u062A \u06AF\u0631\u062F\u06CC\u062F."
      });
    }
    for (const ct of extractedContacts) {
      if (ct.value) {
        const dup = await asyncCheckContactDuplicate(ct.value, ct.channel_type);
        if (dup && (dup.conflictType === "active_marketer" || dup.isFreePool)) {
          return res.status(409).json({
            error: dup.isFreePool ? "FREE_POOL_DUPLICATE" : "DUPLICATE_CONTACT",
            message: dup.message,
            conflict: dup
          });
        }
      }
    }
    const newId = payload.id || crypto7.randomUUID();
    let marketerId = payload.assigned_marketer_id || personnelId || userId || null;
    let marketerName = payload.assigned_marketer_name || userName || "\u062A\u062E\u0635\u06CC\u0635 \u0646\u06CC\u0627\u0641\u062A\u0647";
    if (marketerId) {
      const resolved = await resolvePersonnelId(marketerId, marketerName);
      marketerId = resolved.personnelId;
      if (resolved.personnelName) marketerName = resolved.personnelName;
    }
    const targetTenantId = payload.tenant_id || tenantId || "default";
    const cleanPayload = cleanCustomerPayloadForDirectus(
      {
        ...payload,
        tenant_id: targetTenantId
      },
      newId,
      marketerId,
      marketerName
    );
    const finalContacts = extractCustomerContacts(payload, newId);
    if (directusUrl && directusAdminToken) {
      try {
        const createdCust = await directusFetch("/items/customers", {
          method: "POST",
          body: JSON.stringify(cleanPayload)
        });
        const createdContactsData = [];
        for (const ct of finalContacts) {
          try {
            const createdCt = await directusFetch("/items/customer_contacts", {
              method: "POST",
              body: JSON.stringify(ct)
            });
            if (createdCt?.data) createdContactsData.push(createdCt.data);
            else createdContactsData.push(ct);
          } catch (ctErr) {
            console.warn("Contact insert warning:", ctErr.message);
            createdContactsData.push(ct);
          }
        }
        const fullCustomer = computeCustomerExpiration({
          ...createdCust.data || cleanPayload,
          contacts: createdContactsData
        });
        upsertCustomerInCache(fullCustomer);
        invalidateDashboardSummaryCache();
        recentCustomerCreations.push({
          id: newId,
          company_name: (payload.company_name || "").trim(),
          phones: allPhones,
          customer: fullCustomer,
          timestamp: Date.now()
        });
        return res.status(201).json(fullCustomer);
      } catch (err) {
        if (err.message !== "DIRECTUS_UNREACHABLE_FALLBACK" && err.message !== "DIRECTUS_URL_NOT_CONFIGURED") {
          console.warn("Customer create Directus notice, falling back to local store:", err.message);
        }
      }
    }
    const newCustomer = computeCustomerExpiration({
      ...cleanPayload,
      contacts: finalContacts
    });
    customersData.unshift(newCustomer);
    finalContacts.forEach((ct) => contactsData.unshift(ct));
    recentCustomerCreations.push({
      id: newId,
      company_name: (payload.company_name || "").trim(),
      phones: allPhones,
      customer: newCustomer,
      timestamp: Date.now()
    });
    invalidateDashboardSummaryCache();
    res.status(201).json(newCustomer);
  } finally {
    activeCustomerCreationLocks.delete(phoneLockKey);
  }
});
router4.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const payload = req.body;
  const userCtx = getRequestUser(req);
  if (!userCtx.isAuthenticated) {
    return res.status(401).json({
      error: "UNAUTHORIZED",
      message: "\u0628\u0631\u0627\u06CC \u0648\u06CC\u0631\u0627\u06CC\u0634 \u067E\u0631\u0648\u0646\u062F\u0647 \u0645\u0634\u062A\u0631\u06CC \u0628\u0627\u06CC\u062F \u0648\u0627\u0631\u062F \u062D\u0633\u0627\u0628 \u06A9\u0627\u0631\u0628\u0631\u06CC \u062E\u0648\u062F \u0634\u0648\u06CC\u062F."
    });
  }
  if (payload.contacts && Array.isArray(payload.contacts)) {
    for (const ct of payload.contacts) {
      if (ct.value) {
        const dup = await asyncCheckContactDuplicate(ct.value, ct.channel_type, id);
        if (dup && dup.conflictType === "active_marketer") {
          return res.status(409).json({
            error: "DUPLICATE_CONTACT",
            message: dup.message,
            conflict: dup
          });
        }
      }
    }
  }
  let marketerId = payload.assigned_marketer_id;
  let marketerName = payload.assigned_marketer_name;
  if (marketerId !== void 0) {
    if (!marketerId || marketerId === "\u0647\u0645\u0647" || String(marketerId).trim() === "" || marketerId === "none") {
      marketerId = null;
      marketerName = "\u062A\u062E\u0635\u06CC\u0635 \u0646\u06CC\u0627\u0641\u062A\u0647";
    } else {
      const resolved = await resolvePersonnelId(marketerId, marketerName);
      marketerId = resolved.personnelId;
      if (resolved.personnelName) marketerName = resolved.personnelName;
    }
  }
  const patchPayload = cleanCustomerPayloadForDirectus(
    payload,
    id,
    marketerId,
    marketerName
  );
  delete patchPayload.date_created;
  if (payload.tenant_id === void 0) {
    delete patchPayload.tenant_id;
  } else {
    const explicitTenantNum = resolveDirectusTenantId(payload.tenant_id);
    const reqTenantNum = userCtx.tenantId && userCtx.tenantId !== "all" ? resolveDirectusTenantId(userCtx.tenantId) : null;
    if (explicitTenantNum === 1 && reqTenantNum && reqTenantNum > 1) {
      patchPayload.tenant_id = reqTenantNum;
    }
  }
  if (payload.claimed_from_pool === void 0) delete patchPayload.claimed_from_pool;
  if (payload.claimed_from_pool_at === void 0) delete patchPayload.claimed_from_pool_at;
  if (payload.is_expired === void 0) delete patchPayload.is_expired;
  if (payload.next_followup_date === void 0) delete patchPayload.next_followup_date;
  if (payload.assignment_deadline === void 0 && payload.assignment_duration_days === void 0) {
    delete patchPayload.assignment_deadline;
    delete patchPayload.assignment_duration_days;
  }
  if (directusUrl && directusAdminToken) {
    try {
      const needsOwnershipCheck = !userCtx.isAdmin && !userCtx.isPersonnelAdmin && !userCtx.canViewAllCustomers;
      const existingRes = needsOwnershipCheck || patchPayload.tenant_id === void 0 ? await directusFetch(
        `/items/customers/${encodeURIComponent(id)}?fields=id,tenant_id,assigned_marketer_id,assigned_marketer_name,is_expired,assignment_deadline`
      ).catch(() => null) : null;
      if (needsOwnershipCheck && existingRes?.data) {
        const ex = computeCustomerExpiration(existingRes.data);
        const cleanPId = userCtx.personnelId ? String(userCtx.personnelId).trim().toLowerCase() : "";
        const rawUid = cleanPId.replace(/^p-/, "");
        const cleanUId = userCtx.userId ? String(userCtx.userId).trim().toLowerCase() : "";
        const normUserName = normalizePersianString(userCtx.userName);
        const exMarketerId = ex.assigned_marketer_id ? String(ex.assigned_marketer_id).trim().toLowerCase() : "";
        const exMarketerName = normalizePersianString(ex.assigned_marketer_name);
        const isOwner = cleanPId && (exMarketerId === cleanPId || exMarketerId === rawUid || exMarketerId === `p-${rawUid}`) || cleanUId && (exMarketerId === cleanUId || exMarketerId === rawUid || exMarketerId === `p-${rawUid}`) || normUserName && exMarketerName && (exMarketerName === normUserName || exMarketerName.includes(normUserName));
        const isFree = !exMarketerId || Boolean(ex.is_expired);
        if (!isOwner && !isFree) {
          return res.status(403).json({
            error: "FORBIDDEN",
            message: "\u0634\u0645\u0627 \u0645\u062C\u0627\u0632 \u0628\u0647 \u0648\u06CC\u0631\u0627\u06CC\u0634 \u067E\u0631\u0648\u0646\u062F\u0647 \u0645\u062A\u0639\u0644\u0642 \u0628\u0647 \u0628\u0627\u0632\u0627\u0631\u06CC\u0627\u0628 \u062F\u06CC\u06AF\u0631 \u0646\u06CC\u0633\u062A\u06CC\u062F."
          });
        }
      }
      if (patchPayload.tenant_id === void 0) {
        const effectiveMarketerId = marketerId || existingRes?.data?.assigned_marketer_id;
        const marketerMatch = effectiveMarketerId ? personnelData.find(
          (p) => p && (String(p.id).toLowerCase() === String(effectiveMarketerId).toLowerCase() || String(p.id).toLowerCase() === `p-${String(effectiveMarketerId).replace(/^p-/i, "").toLowerCase()}`)
        ) : null;
        const marketerTenantNum = marketerMatch ? resolveDirectusTenantId(marketerMatch.tenant_id) : null;
        const reqTenantNum = userCtx.tenantId && userCtx.tenantId !== "all" ? resolveDirectusTenantId(userCtx.tenantId) : null;
        const expectedTenant = marketerTenantNum && marketerTenantNum > 1 ? marketerTenantNum : reqTenantNum && reqTenantNum > 1 ? reqTenantNum : null;
        if (expectedTenant && expectedTenant > 1) {
          const existingTenantNum = resolveDirectusTenantId(existingRes?.data?.tenant_id);
          if (!existingTenantNum || existingTenantNum === 1) {
            patchPayload.tenant_id = expectedTenant;
          }
        }
      }
      const patchedCust = await directusFetch(`/items/customers/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(patchPayload)
      });
      let savedContacts = void 0;
      if (payload.contacts && Array.isArray(payload.contacts)) {
        try {
          const oldContacts = await directusFetch(
            `/items/customer_contacts?filter[customer_id][_eq]=${encodeURIComponent(id)}`
          );
          if (oldContacts?.data && Array.isArray(oldContacts.data)) {
            for (const oldCt of oldContacts.data) {
              await directusFetch(`/items/customer_contacts/${encodeURIComponent(oldCt.id)}`, {
                method: "DELETE"
              }).catch(() => {
              });
            }
          }
        } catch {
        }
        const newContacts = extractCustomerContacts(payload, id);
        savedContacts = [];
        for (const ct of newContacts) {
          try {
            const createdCt = await directusFetch("/items/customer_contacts", {
              method: "POST",
              body: JSON.stringify(ct)
            });
            savedContacts.push(createdCt?.data || ct);
          } catch {
            savedContacts.push(ct);
          }
        }
      }
      const updatedCust = computeCustomerExpiration({
        ...patchedCust.data || patchPayload,
        ...savedContacts ? { contacts: savedContacts } : {}
      });
      upsertCustomerInCache(updatedCust);
      invalidateDashboardSummaryCache();
      const memIdx = customersData.findIndex((c) => String(c.id) === String(id));
      if (memIdx !== -1) {
        customersData[memIdx] = { ...customersData[memIdx], ...updatedCust };
      }
      return res.json(updatedCust);
    } catch (err) {
      if (err.message !== "DIRECTUS_UNREACHABLE_FALLBACK" && err.message !== "DIRECTUS_URL_NOT_CONFIGURED") {
        console.warn("Customer patch Directus notice, falling back to local store:", err.message);
      }
    }
  }
  const index = customersData.findIndex((c) => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Customer not found" });
  }
  let updatedContacts = customersData[index].contacts;
  if (payload.contacts && Array.isArray(payload.contacts)) {
    const extracted = extractCustomerContacts(payload, id);
    contactsData.splice(0, contactsData.length, ...contactsData.filter((ct) => String(ct.customer_id) !== String(id)));
    extracted.forEach((ct) => contactsData.unshift(ct));
    updatedContacts = extracted;
  }
  const updatedCustomer = computeCustomerExpiration({
    ...customersData[index],
    ...patchPayload,
    contacts: updatedContacts
  });
  customersData[index] = updatedCustomer;
  invalidateCustomersCache();
  invalidateDashboardSummaryCache();
  res.json(updatedCustomer);
});
router4.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const { isAdmin, isPersonnelAdmin } = getRequestUser(req);
  if (!isAdmin && !isPersonnelAdmin) {
    return res.status(403).json({ error: "\u0641\u0642\u0637 \u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645 \u0627\u062C\u0627\u0632\u0647 \u062D\u0630\u0641 \u067E\u0631\u0648\u0646\u062F\u0647 \u0645\u0634\u062A\u0631\u06CC \u0631\u0627 \u062F\u0627\u0631\u062F." });
  }
  if (directusUrl && directusAdminToken) {
    try {
      const contactsRes = await directusFetch(
        `/items/customer_contacts?filter[customer_id][_eq]=${encodeURIComponent(id)}&fields=id`
      ).catch(() => null);
      if (contactsRes?.data && Array.isArray(contactsRes.data) && contactsRes.data.length > 0) {
        for (const ct of contactsRes.data) {
          if (ct?.id) {
            await directusFetch(`/items/customer_contacts/${ct.id}`, { method: "DELETE" }).catch(() => {
            });
          }
        }
      }
      const reportsRes = await directusFetch(
        `/items/customer_reports?filter[customer_id][_eq]=${encodeURIComponent(id)}&fields=id`
      ).catch(() => null);
      if (reportsRes?.data && Array.isArray(reportsRes.data) && reportsRes.data.length > 0) {
        for (const rep of reportsRes.data) {
          if (rep?.id) {
            await directusFetch(`/items/customer_reports/${rep.id}`, { method: "DELETE" }).catch(() => {
            });
          }
        }
      }
      const coldLeadsRes = await directusFetch(
        `/items/cold_leads?filter[converted_customer_id][_eq]=${encodeURIComponent(id)}&fields=id`
      ).catch(() => null);
      if (coldLeadsRes?.data && Array.isArray(coldLeadsRes.data) && coldLeadsRes.data.length > 0) {
        for (const lead of coldLeadsRes.data) {
          if (lead?.id) {
            await directusFetch(`/items/cold_leads/${lead.id}`, {
              method: "PATCH",
              body: JSON.stringify({ converted_customer_id: null })
            }).catch(() => {
            });
          }
        }
      }
      await directusFetch(`/items/customers/${encodeURIComponent(id)}`, { method: "DELETE" });
      setCustomersData(customersData.filter((c) => c.id !== id));
      contactsData.splice(0, contactsData.length, ...contactsData.filter((ct) => String(ct.customer_id) !== String(id)));
      reportsData.splice(0, reportsData.length, ...reportsData.filter((r) => String(r.customer_id) !== String(id)));
      removeCustomerFromCache(id);
      invalidateReportsCache();
      invalidateDashboardSummaryCache();
      return res.status(204).send();
    } catch (err) {
      if (err.message !== "DIRECTUS_UNREACHABLE_FALLBACK" && err.message !== "DIRECTUS_URL_NOT_CONFIGURED") {
        console.warn("Delete customer Directus notice, falling back to local store:", err.message);
      }
    }
  }
  setCustomersData(customersData.filter((c) => c.id !== id));
  contactsData.splice(0, contactsData.length, ...contactsData.filter((ct) => String(ct.customer_id) !== String(id)));
  reportsData.splice(0, reportsData.length, ...reportsData.filter((r) => String(r.customer_id) !== String(id)));
  removeCustomerFromCache(id);
  invalidateReportsCache();
  invalidateDashboardSummaryCache();
  res.status(204).send();
});
router4.post("/:id/claim-free", async (req, res) => {
  const { userId, personnelId, userName, isAdmin, isPersonnelAdmin } = getRequestUser(req);
  const canAssignOthers = Boolean(isAdmin || isPersonnelAdmin);
  const targetPersonnelId = canAssignOthers ? req.body.personnel_id || personnelId || userId : personnelId || userId;
  const targetPersonnelName = canAssignOthers ? req.body.personnel_name || userName : userName;
  const days = req.body.duration_days ? parseInt(req.body.duration_days, 10) : 10;
  const limit = req.body.claim_limit ? parseInt(req.body.claim_limit, 10) : 20;
  if (!targetPersonnelId) {
    return res.status(401).json({
      error: "UNAUTHORIZED",
      message: "\u0634\u0646\u0627\u0633\u0647 \u06A9\u0627\u0631\u0634\u0646\u0627\u0633 \u0645\u062A\u0642\u0627\u0636\u06CC \u06CC\u0627\u0641\u062A \u0646\u0634\u062F. \u0644\u0637\u0641\u0627\u064B \u0645\u062C\u062F\u062F\u0627\u064B \u0648\u0627\u0631\u062F \u0633\u0627\u0645\u0627\u0646\u0647 \u0634\u0648\u06CC\u062F."
    });
  }
  const quota = await computePersonnelFreeQuota(targetPersonnelId, limit, targetPersonnelName);
  if (!quota.canClaim) {
    return res.status(403).json({
      error: "QUOTA_LIMIT_REACHED",
      message: `\u0634\u0645\u0627 \u0628\u0647 \u0633\u0642\u0641 \u0645\u062C\u0627\u0632 (${limit} \u067E\u0631\u0648\u0646\u062F\u0647 \u0628\u0631\u062F\u0627\u0634\u062A\u0647\u200C\u0634\u062F\u0647 \u0627\u0632 \u062D\u0648\u0636\u0686\u0647 \u0622\u0632\u0627\u062F) \u0631\u0633\u06CC\u062F\u0647\u200C\u0627\u06CC\u062F. \u0628\u0631\u0627\u06CC \u0627\u062E\u062A\u0635\u0627\u0635 \u067E\u0631\u0648\u0646\u062F\u0647 \u062C\u062F\u06CC\u062F \u0627\u0632 \u0628\u062E\u0634 \u0645\u0634\u062A\u0631\u06CC\u0627\u0646 \u0622\u0632\u0627\u062F\u060C \u0628\u0627\u06CC\u062F \u062D\u062F\u0627\u0642\u0644 \u06CC\u06A9 \u0642\u0631\u0627\u0631\u062F\u0627\u062F \u0645\u0648\u0641\u0642 \u0628\u0647 \u062B\u0628\u062A \u0628\u0631\u0633\u0627\u0646\u06CC\u062F.`,
      quota
    });
  }
  let targetCustomer = null;
  if (directusUrl && directusAdminToken) {
    try {
      const custRes = await directusFetch(`/items/customers/${req.params.id}`);
      if (custRes?.data) {
        targetCustomer = computeCustomerExpiration(custRes.data);
      }
    } catch {
    }
  }
  if (!targetCustomer) {
    const local = customersData.find((c) => c.id === req.params.id);
    if (local) {
      targetCustomer = computeCustomerExpiration(local);
    }
  }
  if (!targetCustomer) {
    return res.status(404).json({
      error: "NOT_FOUND",
      message: "\u067E\u0631\u0648\u0646\u062F\u0647 \u0645\u0634\u062A\u0631\u06CC \u0645\u0648\u0631\u062F \u0646\u0638\u0631 \u062F\u0631 \u0633\u0627\u0645\u0627\u0646\u0647 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F."
    });
  }
  if (targetCustomer.status === "\u0642\u0631\u0627\u0631\u062F\u0627\u062F") {
    return res.status(400).json({
      error: "ALREADY_CLOSED",
      message: "\u0627\u06CC\u0646 \u067E\u0631\u0648\u0646\u062F\u0647 \u0642\u0628\u0644\u0627\u064B \u0628\u0647 \u0642\u0631\u0627\u0631\u062F\u0627\u062F \u0645\u0648\u0641\u0642 \u0645\u0646\u062A\u0647\u06CC \u0634\u062F\u0647 \u0648 \u0627\u0645\u06A9\u0627\u0646 \u0628\u0631\u062F\u0627\u0634\u062A \u0645\u062C\u062F\u062F \u0646\u062F\u0627\u0631\u062F."
    });
  }
  if (targetCustomer.status === "\u0644\u06CC\u0633\u062A \u0633\u06CC\u0627\u0647") {
    return res.status(400).json({
      error: "BLACKLISTED",
      message: "\u0627\u06CC\u0646 \u067E\u0631\u0648\u0646\u062F\u0647 \u062F\u0631 \u0644\u06CC\u0633\u062A \u0633\u06CC\u0627\u0647 \u0642\u0631\u0627\u0631 \u062F\u0627\u0631\u062F \u0648 \u0642\u0627\u0628\u0644 \u0648\u0627\u06AF\u0630\u0627\u0631\u06CC \u0646\u06CC\u0633\u062A."
    });
  }
  const isFree = targetCustomer.is_expired || !targetCustomer.assigned_marketer_id || targetCustomer.assigned_marketer_name === "\u062A\u062E\u0635\u06CC\u0635 \u0646\u06CC\u0627\u0641\u062A\u0647" || targetCustomer.assignment_deadline && (/* @__PURE__ */ new Date()).getTime() > new Date(targetCustomer.assignment_deadline).getTime();
  if (!isFree) {
    return res.status(400).json({
      error: "NOT_FREE",
      message: `\u0627\u06CC\u0646 \u067E\u0631\u0648\u0646\u062F\u0647 \u062F\u0631 \u062D\u0627\u0644 \u062D\u0627\u0636\u0631 \u062A\u062D\u062A \u0645\u0647\u0644\u062A \u0641\u0639\u0627\u0644 \u067E\u06CC\u06AF\u06CC\u0631\u06CC \u062A\u0648\u0633\u0637 \xAB${targetCustomer.assigned_marketer_name}\xBB \u0642\u0631\u0627\u0631 \u062F\u0627\u0631\u062F \u0648 \u0622\u0632\u0627\u062F \u0646\u06CC\u0633\u062A.`
    });
  }
  const resolved = await resolvePersonnelId(targetPersonnelId, targetPersonnelName);
  const nowTime = /* @__PURE__ */ new Date();
  const deadline = addDays(nowTime, days);
  const patchData = {
    assigned_marketer_id: resolved.personnelId,
    assigned_marketer_name: (resolved.personnelName || targetPersonnelName || "\u06A9\u0627\u0631\u0634\u0646\u0627\u0633 \u0641\u0631\u0648\u0634").trim(),
    assignment_date: nowTime.toISOString(),
    assignment_deadline: deadline,
    assignment_duration_days: days,
    is_expired: false,
    claimed_from_pool: true,
    claimed_from_pool_at: nowTime.toISOString()
  };
  const auditReport = {
    id: crypto7.randomUUID(),
    customer_id: req.params.id,
    negotiator_name: patchData.assigned_marketer_name,
    negotiation_phone: targetCustomer.manager_phones?.[0] || targetCustomer.mobile_numbers?.[0] || "-",
    report_text: `[\u0627\u0646\u062A\u0642\u0627\u0644 \u0633\u06CC\u0633\u062A\u0645\u06CC]: \u067E\u0631\u0648\u0646\u062F\u0647 \u0627\u0632 \u062D\u0648\u0636\u0686\u0647 \u0645\u0634\u062A\u0631\u06CC\u0627\u0646 \u0622\u0632\u0627\u062F \u062A\u0648\u0633\u0637 \xAB${patchData.assigned_marketer_name}\xBB \u0628\u0627 \u0645\u0647\u0644\u062A \u067E\u06CC\u06AF\u06CC\u0631\u06CC ${days} \u0631\u0648\u0632\u0647 \u0627\u062E\u062A\u0635\u0627\u0635 \u062F\u0627\u062F\u0647 \u0634\u062F.`,
    negotiation_score: 8,
    next_followup_date: addDays(nowTime, 2),
    negotiation_status: targetCustomer.status || "\u067E\u06CC\u06AF\u06CC\u0631\u06CC \u0642\u0628\u0644 \u0627\u0632 \u0627\u0646\u0642\u0636\u0627",
    created_by: patchData.assigned_marketer_id,
    date_created: nowTime.toISOString()
  };
  if (directusUrl && directusAdminToken) {
    try {
      const patchedRes = await directusFetch(`/items/customers/${req.params.id}`, {
        method: "PATCH",
        body: JSON.stringify(patchData)
      });
      await directusFetch("/items/customer_reports", {
        method: "POST",
        body: JSON.stringify(auditReport)
      }).catch(() => {
      });
      const [reportsRes, contactsRes] = await Promise.all([
        directusFetch(
          `/items/customer_reports?filter[customer_id][_eq]=${encodeURIComponent(req.params.id)}&sort=-date_created`
        ).catch(() => null),
        directusFetch(
          `/items/customer_contacts?filter[customer_id][_eq]=${encodeURIComponent(req.params.id)}`
        ).catch(() => null)
      ]);
      const customerReports = reportsRes?.data && Array.isArray(reportsRes.data) ? reportsRes.data.sort(
        (a, b) => new Date(b.date_created || 0).getTime() - new Date(a.date_created || 0).getTime()
      ) : [auditReport];
      const customerContacts = contactsRes?.data && Array.isArray(contactsRes.data) ? contactsRes.data : targetCustomer.contacts || [];
      invalidateCustomersCache();
      invalidateReportsCache();
      const finalCust = computeCustomerExpiration({
        ...patchedRes.data || { ...targetCustomer, ...patchData },
        reports: customerReports,
        contacts: customerContacts
      });
      return res.json({
        success: true,
        message: `\u067E\u0631\u0648\u0646\u062F\u0647 \xAB${finalCust.company_name}\xBB \u0628\u0627 \u0645\u0647\u0644\u062A ${days} \u0631\u0648\u0632 \u0628\u0647 \u0634\u0645\u0627 \u0627\u062E\u062A\u0635\u0627\u0635 \u062F\u0627\u062F\u0647 \u0634\u062F.`,
        customer: finalCust
      });
    } catch (e) {
      if (e.message !== "DIRECTUS_UNREACHABLE_FALLBACK" && e.message !== "DIRECTUS_URL_NOT_CONFIGURED") {
        console.warn("Claim customer Directus notice, falling back to local store:", e.message);
      }
    }
  }
  reportsData.unshift(auditReport);
  const foundReports = reportsData.filter((r) => String(r.customer_id) === String(req.params.id)).sort((a, b) => new Date(b.date_created || 0).getTime() - new Date(a.date_created || 0).getTime());
  const foundContacts = contactsData.filter((ct) => String(ct.customer_id) === String(req.params.id));
  const idx = customersData.findIndex((c) => c.id === req.params.id);
  if (idx !== -1) {
    customersData[idx] = computeCustomerExpiration({
      ...customersData[idx],
      ...patchData,
      reports: foundReports,
      contacts: foundContacts
    });
  }
  invalidateCustomersCache();
  invalidateReportsCache();
  res.json({
    success: true,
    message: `\u067E\u0631\u0648\u0646\u062F\u0647 \xAB${customersData[idx]?.company_name || targetCustomer.company_name}\xBB \u0628\u0627 \u0645\u0647\u0644\u062A ${days} \u0631\u0648\u0632 \u0628\u0647 \u0634\u0645\u0627 \u0627\u062E\u062A\u0635\u0627\u0635 \u062F\u0627\u062F\u0647 \u0634\u062F.`,
    customer: customersData[idx] || computeCustomerExpiration({
      ...targetCustomer,
      ...patchData,
      reports: foundReports,
      contacts: foundContacts
    })
  });
});
router4.post("/merge", async (req, res) => {
  const { primary_customer_id, merged_customer_ids, assigned_marketer_id, assigned_marketer_name } = req.body;
  const { isAdmin, userName } = getRequestUser(req);
  if (!isAdmin) {
    return res.status(403).json({ error: "FORBIDDEN", message: "\u0641\u0642\u0637 \u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645 \u0627\u062C\u0627\u0632\u0647 \u0627\u062F\u063A\u0627\u0645 \u067E\u0631\u0648\u0646\u062F\u0647\u200C\u0647\u0627\u06CC \u062A\u06A9\u0631\u0627\u0631\u06CC \u0631\u0627 \u062F\u0627\u0631\u062F." });
  }
  if (!primary_customer_id || !Array.isArray(merged_customer_ids) || merged_customer_ids.length === 0) {
    return res.status(400).json({ error: "INVALID_PARAMS", message: "\u0634\u0646\u0627\u0633\u0647 \u0645\u0634\u062A\u0631\u06CC \u0627\u0635\u0644\u06CC \u0648 \u067E\u0631\u0648\u0646\u062F\u0647\u200C\u0647\u0627\u06CC \u062A\u06A9\u0631\u0627\u0631\u06CC \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A." });
  }
  const nowTime = /* @__PURE__ */ new Date();
  const nowIso = nowTime.toISOString();
  function mergeUnique(primaryArr = [], ...sourceArrs) {
    const set = /* @__PURE__ */ new Set();
    const result = [];
    const add = (val) => {
      if (!val) return;
      const str = String(val).trim();
      if (!str) return;
      const key = str.toLowerCase();
      if (!set.has(key)) {
        set.add(key);
        result.push(val);
      }
    };
    (primaryArr || []).forEach(add);
    sourceArrs.forEach((arr) => (arr || []).forEach(add));
    return result;
  }
  if (directusUrl && directusAdminToken) {
    try {
      const primaryRes = await directusFetch(`/items/customers/${primary_customer_id}`);
      if (!primaryRes?.data) {
        return res.status(404).json({ error: "PRIMARY_NOT_FOUND", message: "\u0645\u0634\u062A\u0631\u06CC \u0627\u0635\u0644\u06CC \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." });
      }
      const primaryCust2 = primaryRes.data;
      const sourceCustomers2 = [];
      for (const mId of merged_customer_ids) {
        const sRes = await directusFetch(`/items/customers/${mId}`).catch(() => null);
        if (sRes?.data) sourceCustomers2.push(sRes.data);
      }
      let targetMarketerId2 = primaryCust2.assigned_marketer_id;
      let targetMarketerName2 = primaryCust2.assigned_marketer_name;
      if (assigned_marketer_id || assigned_marketer_name) {
        const resolved = await resolvePersonnelId(assigned_marketer_id, assigned_marketer_name);
        targetMarketerId2 = resolved.personnelId || targetMarketerId2;
        targetMarketerName2 = resolved.personnelName || assigned_marketer_name || targetMarketerName2;
      }
      const combinedMobiles2 = mergeUnique(
        primaryCust2.mobile_numbers,
        ...sourceCustomers2.map((c) => c.mobile_numbers)
      );
      const combinedLandlines2 = mergeUnique(
        primaryCust2.landline_numbers,
        ...sourceCustomers2.map((c) => c.landline_numbers)
      );
      const combinedManagerPhones2 = mergeUnique(
        primaryCust2.manager_phones,
        ...sourceCustomers2.map((c) => c.manager_phones)
      );
      const combinedNegotiatorPhones2 = mergeUnique(
        primaryCust2.negotiator_phones,
        ...sourceCustomers2.map((c) => c.negotiator_phones)
      );
      for (const mId of merged_customer_ids) {
        const reportsRes = await directusFetch(
          `/items/customer_reports?filter[customer_id][_eq]=${encodeURIComponent(mId)}`
        ).catch(() => null);
        if (reportsRes?.data && Array.isArray(reportsRes.data)) {
          for (const rep of reportsRes.data) {
            await directusFetch(`/items/customer_reports/${rep.id}`, {
              method: "PATCH",
              body: JSON.stringify({ customer_id: primary_customer_id })
            }).catch(() => {
            });
          }
        }
        const contactsRes = await directusFetch(
          `/items/customer_contacts?filter[customer_id][_eq]=${encodeURIComponent(mId)}`
        ).catch(() => null);
        if (contactsRes?.data && Array.isArray(contactsRes.data)) {
          for (const ct of contactsRes.data) {
            await directusFetch(`/items/customer_contacts/${ct.id}`, {
              method: "PATCH",
              body: JSON.stringify({ customer_id: primary_customer_id })
            }).catch(() => {
            });
          }
        }
      }
      await directusFetch("/items/customer_reports", {
        method: "POST",
        body: JSON.stringify({
          id: crypto7.randomUUID(),
          customer_id: primary_customer_id,
          negotiator_name: userName || "\u0645\u062F\u06CC\u0631\u06CC\u062A \u0633\u06CC\u0633\u062A\u0645",
          negotiation_phone: primaryCust2.manager_phones?.[0] || primaryCust2.mobile_numbers?.[0] || "-",
          report_text: `[\u0627\u062F\u063A\u0627\u0645 \u0633\u06CC\u0633\u062A\u0645\u06CC \u067E\u0631\u0648\u0646\u062F\u0647\u200C\u0647\u0627]: \u0633\u0648\u0627\u0628\u0642 \u0648 \u0634\u0645\u0627\u0631\u0647\u200C\u0647\u0627\u06CC \u062A\u0645\u0627\u0633 ${sourceCustomers2.length} \u067E\u0631\u0648\u0646\u062F\u0647 \u0645\u0634\u062A\u0631\u06CC \u0628\u0627 \u0627\u06CC\u0646 \u067E\u0631\u0648\u0646\u062F\u0647 \u0627\u062F\u063A\u0627\u0645 \u0634\u062F.`,
          negotiation_score: 8,
          next_followup_date: primaryCust2.next_followup_date || addDays(nowTime, 2),
          negotiation_status: primaryCust2.status || "\u067E\u06CC\u06AF\u06CC\u0631\u06CC \u0642\u0628\u0644 \u0627\u0632 \u0627\u0646\u0642\u0636\u0627",
          date_created: nowIso
        })
      }).catch(() => {
      });
      const primaryPatch = {
        assigned_marketer_id: targetMarketerId2,
        assigned_marketer_name: targetMarketerName2,
        mobile_numbers: combinedMobiles2,
        landline_numbers: combinedLandlines2,
        manager_phones: combinedManagerPhones2,
        negotiator_phones: combinedNegotiatorPhones2,
        date_updated: nowIso
      };
      const updatedPrimaryRes = await directusFetch(`/items/customers/${primary_customer_id}`, {
        method: "PATCH",
        body: JSON.stringify(primaryPatch)
      });
      for (const mId of merged_customer_ids) {
        const resCt = await directusFetch(
          `/items/customer_contacts?filter[customer_id][_eq]=${encodeURIComponent(mId)}&fields=id`
        ).catch(() => null);
        if (resCt?.data && Array.isArray(resCt.data)) {
          for (const ct of resCt.data) {
            if (ct?.id) {
              await directusFetch(`/items/customer_contacts/${ct.id}`, { method: "DELETE" }).catch(() => {
              });
            }
          }
        }
        await directusFetch(`/items/customers/${mId}`, { method: "DELETE" }).catch(() => {
        });
      }
      invalidateCustomersCache();
      invalidateReportsCache();
      const finalCustomer = computeCustomerExpiration(updatedPrimaryRes.data || primaryCust2);
      return res.json({
        success: true,
        message: `\u062A\u0639\u062F\u0627\u062F ${sourceCustomers2.length} \u067E\u0631\u0648\u0646\u062F\u0647 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062F\u0631 \u067E\u0631\u0648\u0646\u062F\u0647 \xAB${primaryCust2.company_name}\xBB \u0627\u062F\u063A\u0627\u0645 \u06AF\u0631\u062F\u06CC\u062F\u0646\u062F.`,
        customer: finalCustomer
      });
    } catch (err) {
      if (err.message !== "DIRECTUS_UNREACHABLE_FALLBACK" && err.message !== "DIRECTUS_URL_NOT_CONFIGURED") {
        console.warn("Merge customers Directus notice, falling back to local store:", err.message);
      }
    }
  }
  const primaryIndex = customersData.findIndex((c) => c.id === primary_customer_id);
  if (primaryIndex === -1) {
    return res.status(404).json({ error: "PRIMARY_NOT_FOUND", message: "\u0645\u0634\u062A\u0631\u06CC \u0627\u0635\u0644\u06CC \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." });
  }
  const primaryCust = customersData[primaryIndex];
  const sourceCustomers = customersData.filter((c) => merged_customer_ids.includes(c.id));
  let targetMarketerId = primaryCust.assigned_marketer_id;
  let targetMarketerName = primaryCust.assigned_marketer_name;
  if (assigned_marketer_id || assigned_marketer_name) {
    targetMarketerId = assigned_marketer_id || targetMarketerId;
    targetMarketerName = assigned_marketer_name || targetMarketerName;
  }
  const combinedMobiles = mergeUnique(
    primaryCust.mobile_numbers,
    ...sourceCustomers.map((c) => c.mobile_numbers)
  );
  const combinedLandlines = mergeUnique(
    primaryCust.landline_numbers,
    ...sourceCustomers.map((c) => c.landline_numbers)
  );
  const combinedManagerPhones = mergeUnique(
    primaryCust.manager_phones,
    ...sourceCustomers.map((c) => c.manager_phones)
  );
  const combinedNegotiatorPhones = mergeUnique(
    primaryCust.negotiator_phones,
    ...sourceCustomers.map((c) => c.negotiator_phones)
  );
  setCustomersData(customersData.filter((c) => !merged_customer_ids.includes(c.id)));
  invalidateCustomersCache();
  invalidateReportsCache();
  return res.json({
    success: true,
    message: "\u0627\u062F\u063A\u0627\u0645 \u0645\u0634\u062A\u0631\u06CC\u0627\u0646 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u0627\u0646\u062C\u0627\u0645 \u0634\u062F.",
    customer: customersData[primaryIndex]
  });
});
var customers_routes_default = router4;

// server/routes/reports.routes.ts
import { Router as Router5 } from "express";
import crypto8 from "crypto";
function normalizeToIsoDateTime(dateVal) {
  if (dateVal === void 0 || dateVal === null || dateVal === "") return null;
  const num = typeof dateVal === "number" ? dateVal : Number(String(dateVal).trim());
  if (!isNaN(num) && num > 2e4 && num < 6e4) {
    try {
      const ms = Math.round((num - 25569) * 86400 * 1e3);
      const d2 = new Date(ms);
      if (!isNaN(d2.getTime())) return d2.toISOString();
    } catch {
    }
  }
  const str = String(dateVal).trim();
  if (/^1[34]\d\d[\/\-]/.test(str)) {
    try {
      const parts = str.split(/\s+/);
      const datePart = parts[0];
      const timePart = parts[1] || "00:00:00";
      const [jy, jm, jd] = datePart.split(/[\/\-]/).map((p) => parseInt(p, 10));
      if (!isNaN(jy) && !isNaN(jm) && !isNaN(jd)) {
        let y = jy - 979, m = jm - 1, d2 = jd - 1;
        let j_day_no = 365 * y + Math.floor(y / 33) * 8 + Math.floor((y % 33 + 3) / 4);
        for (let i = 0; i < m; ++i) j_day_no += i < 6 ? 31 : 30;
        j_day_no += d2;
        let g_day_no = j_day_no + 79;
        let gy = 1600 + 400 * Math.floor(g_day_no / 146097);
        g_day_no = g_day_no % 146097;
        let leap = true;
        if (g_day_no >= 36525) {
          g_day_no--;
          gy += 100 * Math.floor(g_day_no / 36524);
          g_day_no = g_day_no % 36524;
          if (g_day_no >= 365) gy++;
          else leap = false;
        }
        gy += 4 * Math.floor(g_day_no / 1461);
        g_day_no %= 1461;
        if (g_day_no >= 366) {
          leap = false;
          g_day_no--;
          gy += Math.floor(g_day_no / 365);
          g_day_no = g_day_no % 365;
        }
        const g_days_in_month = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        let gm = 0;
        while (gm < 12 && g_day_no >= g_days_in_month[gm]) {
          g_day_no -= g_days_in_month[gm];
          gm++;
        }
        const isoStr = `${gy}-${String(gm + 1).padStart(2, "0")}-${String(g_day_no + 1).padStart(2, "0")}T${timePart}`;
        const dt = new Date(isoStr);
        if (!isNaN(dt.getTime())) return dt.toISOString();
      }
    } catch {
    }
  }
  let d = new Date(str);
  if (isNaN(d.getTime())) d = new Date(str.replace(" ", "T"));
  if (!isNaN(d.getTime())) return d.toISOString();
  return null;
}
async function syncCustomerFollowupFromLatestReport(customerId) {
  if (!customerId) return null;
  let latestFollowupDate = null;
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  if (directusUrl && directusAdminToken) {
    try {
      const res = await directusFetch(
        `/items/customer_reports?filter[customer_id][_eq]=${encodeURIComponent(customerId)}&sort=-date_created&limit=1&fields=id,next_followup_date,date_created`
      ).catch(() => null);
      if (res?.data && res.data.length > 0) {
        latestFollowupDate = res.data[0].next_followup_date || null;
      }
      await directusFetch(`/items/customers/${encodeURIComponent(customerId)}`, {
        method: "PATCH",
        body: JSON.stringify({
          next_followup_date: latestFollowupDate,
          date_updated: nowIso
        })
      }).catch(() => {
      });
      invalidateCustomersCache();
    } catch (e) {
      console.warn(`Failed to sync customer followup for ${customerId}:`, e.message);
    }
  }
  const cIdx = customersData.findIndex((c) => String(c.id) === String(customerId));
  if (cIdx >= 0) {
    const localReports = reportsData.filter((r) => String(r.customer_id) === String(customerId)).sort((a, b) => new Date(b.date_created || 0).getTime() - new Date(a.date_created || 0).getTime());
    if (localReports.length > 0) {
      latestFollowupDate = localReports[0].next_followup_date || null;
    }
    customersData[cIdx].next_followup_date = latestFollowupDate;
    customersData[cIdx].date_updated = nowIso;
  }
  return latestFollowupDate;
}
var router5 = Router5();
router5.get("/", async (req, res) => {
  const {
    customer_id,
    page,
    limit,
    all,
    status,
    negotiator,
    search,
    admin_filter,
    staff_filter,
    start_date,
    end_date,
    fields,
    sort
  } = req.query;
  const {
    userId,
    personnelId,
    isAdmin,
    isPersonnelAdmin,
    canViewAllCustomers,
    reportViewScope,
    userName,
    tenantId
  } = getRequestUser(req);
  const canViewAllReports = Boolean(
    isAdmin || isPersonnelAdmin || canViewAllCustomers || reportViewScope === "all"
  );
  const isUnlimited = all === "true" || limit === "all" || limit === "50000";
  const reqLimit = isUnlimited ? 1e4 : limit ? Math.min(Math.max(1, parseInt(String(limit), 10)), 500) : 25;
  const reqPage = page ? Math.max(1, parseInt(String(page), 10)) : 1;
  const activeFilter = String(admin_filter || staff_filter || "");
  let sortParam = "-date_created";
  if (sort === "oldest") {
    sortParam = "date_created";
  } else if (sort === "highest_score") {
    sortParam = "-negotiation_score,-date_created";
  } else if (sort === "followup_soonest" || activeFilter === "active_followups" && sort !== "oldest" && sort !== "highest_score" && sort !== "newest_explicit") {
    sortParam = "next_followup_date,-date_created";
  } else if (activeFilter === "overdue_followups" && sort !== "oldest" && sort !== "highest_score" && sort !== "newest_explicit") {
    sortParam = "-next_followup_date,-date_created";
  }
  if (directusUrl && directusAdminToken && !isUnlimited) {
    try {
      const directusPageLimit = Math.min(reqLimit, 100);
      let directusPath = `/items/customer_reports?page=${reqPage}&limit=${directusPageLimit}&meta=total_count,filter_count&sort=${sortParam}`;
      let andIdx = 0;
      if (tenantId && tenantId !== "all") {
        const tenantNum = resolveDirectusTenantId(tenantId);
        if (tenantNum && tenantNum > 1) {
          directusPath += `&filter[_and][${andIdx++}][tenant_id][_eq]=${tenantNum}`;
        }
      }
      if (customer_id) {
        directusPath += `&filter[_and][${andIdx++}][customer_id][_eq]=${encodeURIComponent(String(customer_id))}`;
      } else if (!canViewAllReports && (userName || personnelId || userId)) {
        let repOr = 0;
        if (userName) {
          directusPath += `&filter[_and][${andIdx}][_or][${repOr++}][negotiator_name][_icontains]=${encodeURIComponent(userName)}`;
          directusPath += `&filter[_and][${andIdx}][_or][${repOr++}][customer_id][assigned_marketer_name][_icontains]=${encodeURIComponent(userName)}`;
        }
        if (personnelId) {
          directusPath += `&filter[_and][${andIdx}][_or][${repOr++}][customer_id][assigned_marketer_id][_eq]=${encodeURIComponent(String(personnelId))}`;
          const rawP = String(personnelId).replace(/^p-/, "");
          if (rawP !== String(personnelId)) {
            directusPath += `&filter[_and][${andIdx}][_or][${repOr++}][customer_id][assigned_marketer_id][_eq]=${encodeURIComponent(rawP)}`;
          }
        }
        if (userId) {
          directusPath += `&filter[_and][${andIdx}][_or][${repOr++}][customer_id][assigned_marketer_id][_eq]=${encodeURIComponent(String(userId))}`;
        }
        andIdx++;
      }
      const startOfToday = /* @__PURE__ */ new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const startOfTodayIso = startOfToday.toISOString();
      if (activeFilter === "active_followups") {
        directusPath += `&filter[_and][${andIdx++}][next_followup_date][_gte]=${encodeURIComponent(startOfTodayIso)}`;
        directusPath += `&filter[_and][${andIdx++}][customer_id][next_followup_date][_gte]=${encodeURIComponent(startOfTodayIso)}`;
      } else if (activeFilter === "overdue_followups") {
        directusPath += `&filter[_and][${andIdx++}][next_followup_date][_nnull]=true`;
        directusPath += `&filter[_and][${andIdx++}][next_followup_date][_lt]=${encodeURIComponent(startOfTodayIso)}`;
        directusPath += `&filter[_and][${andIdx++}][customer_id][next_followup_date][_nnull]=true`;
        directusPath += `&filter[_and][${andIdx++}][customer_id][next_followup_date][_lt]=${encodeURIComponent(startOfTodayIso)}`;
      } else if (activeFilter === "no_followup") {
        directusPath += `&filter[_and][${andIdx++}][next_followup_date][_null]=true`;
        directusPath += `&filter[_and][${andIdx++}][customer_id][next_followup_date][_null]=true`;
      } else if (activeFilter === "expired_customers" || activeFilter === "expired") {
        const nowIso = (/* @__PURE__ */ new Date()).toISOString();
        directusPath += `&filter[_and][${andIdx}][_or][0][customer_id][is_expired][_eq]=true&filter[_and][${andIdx}][_or][1][customer_id][assignment_deadline][_lt]=${encodeURIComponent(nowIso)}`;
        andIdx++;
      } else if (activeFilter === "near_expiry_customers") {
        const nowIso = (/* @__PURE__ */ new Date()).toISOString();
        const in3DaysIso = new Date(Date.now() + 3 * 864e5).toISOString();
        directusPath += `&filter[_and][${andIdx}][_or][0][customer_id][status][_eq]=%D9%BE%DB%8C%DA%AF%DB%8C%D8%B1%DB%8C%20%D9%82%D8%A8%D9%84%20%D8%A7%D8%B2%20%D8%A7%D9%86%D9%82%D8%B6%D8%A7&filter[_and][${andIdx}][_or][1][_and][0][customer_id][assignment_deadline][_gte]=${encodeURIComponent(nowIso)}&filter[_and][${andIdx}][_or][1][_and][1][customer_id][assignment_deadline][_lte]=${encodeURIComponent(in3DaysIso)}`;
        andIdx++;
      } else if (activeFilter === "due_less_3_days" || activeFilter === "due_less_7_days" || activeFilter === "due_less_10_days") {
        const daysNum = activeFilter === "due_less_3_days" ? 3 : activeFilter === "due_less_7_days" ? 7 : 10;
        const nowIso = (/* @__PURE__ */ new Date()).toISOString();
        const maxIso = new Date(Date.now() + daysNum * 864e5).toISOString();
        directusPath += `&filter[_and][${andIdx}][_or][0][_and][0][customer_id][next_followup_date][_gte]=${encodeURIComponent(nowIso)}&filter[_and][${andIdx}][_or][0][_and][1][customer_id][next_followup_date][_lte]=${encodeURIComponent(maxIso)}&filter[_and][${andIdx}][_or][1][_and][0][customer_id][assignment_deadline][_gte]=${encodeURIComponent(nowIso)}&filter[_and][${andIdx}][_or][1][_and][1][customer_id][assignment_deadline][_lte]=${encodeURIComponent(maxIso)}`;
        andIdx++;
      }
      if (status && status !== "\u0647\u0645\u0647") {
        if (String(status) === "\u0642\u0631\u0627\u0631\u062F\u0627\u062F" || String(status) === "\u0642\u0631\u0627\u0631\u062F\u0627\u062F / \u0641\u0627\u06A9\u062A\u0648\u0631") {
          directusPath += `&filter[_and][${andIdx++}][negotiation_status][_in]=%D9%82%D8%B1%D8%A7%D8%B1%D8%AF%D8%A7%D8%AF,%D9%82%D8%B1%D8%A7%D8%B1%D8%AF%D8%A7%D8%AF%20%2F%20%D9%81%D8%A7%DA%A9%D8%AA%D9%88%D8%B1,%D9%82%D8%B1%D8%A7%D8%B1%D8%AF%D8%A7%D8%AF%2F%D9%81%D8%A7%DA%A9%D8%AA%D9%88%D8%B1`;
        } else {
          directusPath += `&filter[_and][${andIdx++}][negotiation_status][_eq]=${encodeURIComponent(String(status))}`;
        }
      }
      if (negotiator && negotiator !== "\u0647\u0645\u0647") {
        directusPath += `&filter[_and][${andIdx++}][negotiator_name][_eq]=${encodeURIComponent(String(negotiator))}`;
      }
      if (search && typeof search === "string" && search.trim()) {
        const s = search.trim();
        directusPath += `&filter[_and][${andIdx}][_or][0][report_text][_icontains]=${encodeURIComponent(s)}&filter[_and][${andIdx}][_or][1][negotiator_name][_icontains]=${encodeURIComponent(s)}&filter[_and][${andIdx}][_or][2][negotiation_phone][_icontains]=${encodeURIComponent(s)}&filter[_and][${andIdx}][_or][3][customer_id][company_name][_icontains]=${encodeURIComponent(s)}&filter[_and][${andIdx}][_or][4][customer_id][manager_name][_icontains]=${encodeURIComponent(s)}`;
        andIdx++;
      }
      if (start_date) {
        directusPath += `&filter[_and][${andIdx++}][date_created][_gte]=${encodeURIComponent(String(start_date))}`;
      }
      if (end_date) {
        directusPath += `&filter[_and][${andIdx++}][date_created][_lte]=${encodeURIComponent(String(end_date))}`;
      }
      const defaultReportFields = "*,customer_id.id,customer_id.company_name,customer_id.manager_name,customer_id.status,customer_id.province,customer_id.city,customer_id.next_followup_date,customer_id.assignment_deadline,customer_id.is_expired,customer_id.assigned_marketer_id,customer_id.assigned_marketer_name";
      directusPath += `&fields=${encodeURIComponent(fields ? String(fields) : defaultReportFields)}`;
      const resData = await directusFetch(directusPath, {}, 1).catch((err) => {
        if (err.message !== "DIRECTUS_UNREACHABLE_FALLBACK" && err.message !== "DIRECTUS_URL_NOT_CONFIGURED") {
          console.warn("[Directus Reports Query Warning]:", err.message);
        }
        return null;
      });
      console.log("[Directus Reports Query] resData meta:", resData?.meta);
      if (resData && Array.isArray(resData.data)) {
        let items = resData.data;
        let totalCount2 = resData.meta?.filter_count ?? resData.meta?.total_count ?? items.length;
        if (reqLimit > 100 && totalCount2 > items.length && items.length >= 100) {
          const allRes = await directusFetchAllPages(directusPath, {}).catch(() => null);
          if (allRes && Array.isArray(allRes.data) && allRes.data.length > 0) {
            items = allRes.data.slice(0, reqLimit);
          }
        }
        const isFollowupQueueTab = [
          "active_followups",
          "overdue_followups",
          "no_followup",
          "due_less_3_days",
          "due_less_7_days",
          "due_less_10_days",
          "latest_reports"
        ].includes(activeFilter);
        if (isFollowupQueueTab && !customer_id) {
          const beforeLen = items.length;
          if (activeFilter !== "latest_reports") {
            items = items.filter((r) => {
              const custObj = typeof r.customer_id === "object" && r.customer_id !== null ? r.customer_id : null;
              if (!custObj || custObj.next_followup_date === void 0) return true;
              const rTime = r.next_followup_date ? new Date(r.next_followup_date).getTime() : null;
              const cTime = custObj.next_followup_date ? new Date(custObj.next_followup_date).getTime() : null;
              if (rTime === null && cTime === null) return true;
              if (rTime === null || cTime === null) return false;
              return Math.abs(rTime - cTime) <= 6e4;
            });
          }
          const bestByCust = /* @__PURE__ */ new Map();
          for (const r of items) {
            const cId = typeof r.customer_id === "object" && r.customer_id !== null ? String(r.customer_id.id || "") : String(r.customer_id || "");
            if (!cId) continue;
            const prev = bestByCust.get(cId);
            if (!prev) {
              bestByCust.set(cId, r);
            } else {
              const prevTime = new Date(prev.date_created || 0).getTime();
              const curTime = new Date(r.date_created || 0).getTime();
              if (curTime > prevTime) {
                bestByCust.set(cId, r);
              }
            }
          }
          const keepIds = new Set(Array.from(bestByCust.values()).map((r) => String(r.id)));
          items = items.filter((r) => {
            const cId = typeof r.customer_id === "object" && r.customer_id !== null ? String(r.customer_id.id || "") : String(r.customer_id || "");
            return !cId || keepIds.has(String(r.id));
          });
          const removedCount = beforeLen - items.length;
          if (removedCount > 0) {
            totalCount2 = Math.max(items.length, totalCount2 - removedCount);
          }
        }
        const totalPages2 = Math.max(1, Math.ceil(totalCount2 / reqLimit));
        res.setHeader("X-Total-Count", String(totalCount2));
        res.setHeader("X-Filter-Count", String(totalCount2));
        res.setHeader("X-Page", String(reqPage));
        res.setHeader("X-Limit", String(reqLimit));
        return res.json({
          data: items,
          meta: {
            filter_count: totalCount2,
            total_count: totalCount2,
            page: reqPage,
            limit: reqLimit,
            total_pages: totalPages2
          }
        });
      }
    } catch (err) {
      console.warn("Directus paginated reports query error, falling back to local filter:", err.message);
    }
  }
  const allCustomers = await ensureCustomersCache().catch(() => customersData);
  const rawReports = await ensureReportsCache().catch(() => reportsData);
  const latestReportIdByCust = /* @__PURE__ */ new Map();
  const sortedForLatest = [...rawReports].sort(
    (a, b) => new Date(b.date_created || 0).getTime() - new Date(a.date_created || 0).getTime()
  );
  for (const r of sortedForLatest) {
    const cId = typeof r.customer_id === "object" && r.customer_id !== null ? String(r.customer_id.id || "") : String(r.customer_id || "");
    if (cId && !latestReportIdByCust.has(cId)) {
      latestReportIdByCust.set(cId, String(r.id));
    }
  }
  const isLatestCustomerReport = (r) => {
    const cId = typeof r.customer_id === "object" && r.customer_id !== null ? String(r.customer_id.id || "") : String(r.customer_id || "");
    if (!cId) return true;
    return latestReportIdByCust.get(cId) === String(r.id);
  };
  const allReports = [...rawReports].sort((a, b) => {
    const tA = new Date(a.date_created || 0).getTime();
    const tB = new Date(b.date_created || 0).getTime();
    if (sort === "oldest") {
      return tA - tB;
    } else if (sort === "highest_score") {
      const sA = Number(a.negotiation_score) || 0;
      const sB = Number(b.negotiation_score) || 0;
      if (sB !== sA) return sB - sA;
      return tB - tA;
    } else if (sort === "followup_soonest") {
      const fA = a.next_followup_date ? new Date(a.next_followup_date).getTime() : Infinity;
      const fB = b.next_followup_date ? new Date(b.next_followup_date).getTime() : Infinity;
      if (fA !== fB) return fA - fB;
      return tB - tA;
    }
    return tB - tA;
  });
  const getDaysUntil = (dateIso) => {
    if (!dateIso) return null;
    try {
      const target = new Date(dateIso).getTime();
      const now2 = (/* @__PURE__ */ new Date()).getTime();
      const diffMs = target - now2;
      return Math.ceil(diffMs / (1e3 * 60 * 60 * 24));
    } catch {
      return null;
    }
  };
  const isActiveDate = (dateIso) => {
    if (!dateIso) return false;
    const days = getDaysUntil(dateIso);
    return days !== null && days >= 0;
  };
  const isExpiredCustomer = (c) => {
    if (!c) return false;
    if (c.is_expired) return true;
    if (c.status === "\u0642\u0631\u0627\u0631\u062F\u0627\u062F" || c.status === "\u0644\u06CC\u0633\u062A \u0633\u06CC\u0627\u0647") return false;
    if (c.assignment_deadline) {
      const days = getDaysUntil(c.assignment_deadline);
      if (days !== null && days < 0) return true;
    }
    return false;
  };
  const applyFilters = (list) => {
    let result = list;
    if (tenantId && tenantId !== "all") {
      result = result.filter((r) => matchesTenant(r.tenant_id, tenantId));
    }
    if (customer_id) {
      result = result.filter(
        (r) => String(r.customer_id) === String(customer_id) || typeof r.customer_id === "object" && r.customer_id !== null && String(r.customer_id.id) === String(customer_id)
      );
    } else if (!canViewAllReports) {
      result = result.filter((r) => {
        const normUserName = normalizePersianString(userName);
        const normNeg = normalizePersianString(r.negotiator_name);
        const matchNegotiator = normUserName && normNeg && (normNeg === normUserName || normNeg.includes(normUserName));
        const matchCreatedBy = userId && String(r.created_by) === String(userId) || personnelId && String(r.created_by) === String(personnelId) || userName && r.created_by === userName;
        const customer = allCustomers.find(
          (c) => c.id === r.customer_id || typeof r.customer_id === "object" && r.customer_id !== null && r.customer_id.id === c.id
        );
        const matchCustomer = customer && (customer.assigned_marketer_id === personnelId || customer.assigned_marketer_id === userId || userName && customer.assigned_marketer_name === userName);
        return matchNegotiator || matchCreatedBy || matchCustomer;
      });
    }
    if (status && status !== "\u0647\u0645\u0647") {
      if (String(status) === "\u0642\u0631\u0627\u0631\u062F\u0627\u062F" || String(status) === "\u0642\u0631\u0627\u0631\u062F\u0627\u062F / \u0641\u0627\u06A9\u062A\u0648\u0631") {
        result = result.filter((r) => {
          const stStr = String(r.negotiation_status);
          return stStr === "\u0642\u0631\u0627\u0631\u062F\u0627\u062F" || stStr === "\u0642\u0631\u0627\u0631\u062F\u0627\u062F / \u0641\u0627\u06A9\u062A\u0648\u0631" || stStr === "\u0642\u0631\u0627\u0631\u062F\u0627\u062F/\u0641\u0627\u06A9\u062A\u0648\u0631";
        });
      } else {
        result = result.filter((r) => r.negotiation_status === status);
      }
    }
    if (negotiator && negotiator !== "\u0647\u0645\u0647") {
      result = result.filter((r) => r.negotiator_name === negotiator);
    }
    if (search && typeof search === "string" && search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((rep) => {
        const customer = allCustomers.find((c) => c.id === rep.customer_id);
        const matchCompany = customer?.company_name?.toLowerCase().includes(q);
        const matchReport = rep.report_text?.toLowerCase().includes(q);
        const matchPhone = rep.negotiation_phone?.includes(q);
        const matchNegotiator = rep.negotiator_name?.toLowerCase().includes(q);
        return Boolean(matchCompany || matchReport || matchPhone || matchNegotiator);
      });
    }
    if (start_date) {
      const sMs = new Date(String(start_date)).getTime();
      result = result.filter((r) => r.date_created && new Date(r.date_created).getTime() >= sMs);
    }
    if (end_date) {
      const eMs = new Date(String(end_date)).getTime();
      result = result.filter((r) => r.date_created && new Date(r.date_created).getTime() <= eMs);
    }
    if (canViewAllReports && admin_filter && admin_filter !== "all") {
      switch (admin_filter) {
        case "active_followups":
          result = result.filter((r) => {
            if (!isLatestCustomerReport(r)) return false;
            const customer = allCustomers.find((c) => c.id === r.customer_id);
            const followupDate = customer?.next_followup_date !== void 0 ? customer.next_followup_date : r.next_followup_date;
            return isActiveDate(followupDate);
          });
          break;
        case "overdue_followups":
          result = result.filter((r) => {
            if (!isLatestCustomerReport(r)) return false;
            const customer = allCustomers.find((c) => c.id === r.customer_id);
            const followupDate = customer?.next_followup_date !== void 0 ? customer.next_followup_date : r.next_followup_date;
            if (!followupDate) return false;
            const days = getDaysUntil(followupDate);
            return days !== null && days < 0;
          });
          break;
        case "no_followup":
          result = result.filter((r) => {
            if (!isLatestCustomerReport(r)) return false;
            const customer = allCustomers.find((c) => c.id === r.customer_id);
            const followupDate = customer?.next_followup_date !== void 0 ? customer.next_followup_date : r.next_followup_date;
            return !followupDate;
          });
          break;
        case "latest_reports": {
          result = result.filter((r) => isLatestCustomerReport(r));
          break;
        }
        case "expired_customers":
          result = result.filter((r) => {
            const customer = allCustomers.find((c) => c.id === r.customer_id);
            return isExpiredCustomer(customer);
          });
          break;
        case "near_expiry_customers":
          result = result.filter((r) => {
            const customer = allCustomers.find((c) => c.id === r.customer_id);
            if (!customer) return false;
            if (customer.status === "\u067E\u06CC\u06AF\u06CC\u0631\u06CC \u0642\u0628\u0644 \u0627\u0632 \u0627\u0646\u0642\u0636\u0627") return true;
            if (customer.assignment_deadline) {
              const days = getDaysUntil(customer.assignment_deadline);
              return days !== null && days >= 0 && days <= 3;
            }
            return false;
          });
          break;
      }
    } else if (!canViewAllReports && staff_filter) {
      switch (staff_filter) {
        case "active_followups":
          result = result.filter((r) => {
            if (!isLatestCustomerReport(r)) return false;
            const customer = allCustomers.find((c) => c.id === r.customer_id);
            const followupDate = customer?.next_followup_date !== void 0 ? customer.next_followup_date : r.next_followup_date;
            return isActiveDate(followupDate);
          });
          break;
        case "overdue_followups":
          result = result.filter((r) => {
            if (!isLatestCustomerReport(r)) return false;
            const customer = allCustomers.find((c) => c.id === r.customer_id);
            const followupDate = customer?.next_followup_date !== void 0 ? customer.next_followup_date : r.next_followup_date;
            if (!followupDate) return false;
            const days = getDaysUntil(followupDate);
            return days !== null && days < 0;
          });
          break;
        case "no_followup":
          result = result.filter((r) => {
            if (!isLatestCustomerReport(r)) return false;
            const customer = allCustomers.find((c) => c.id === r.customer_id);
            const followupDate = customer?.next_followup_date !== void 0 ? customer.next_followup_date : r.next_followup_date;
            return !followupDate;
          });
          break;
        case "due_less_3_days":
        case "due_less_7_days":
        case "due_less_10_days": {
          const maxDays = staff_filter === "due_less_3_days" ? 3 : staff_filter === "due_less_7_days" ? 7 : 10;
          result = result.filter((r) => {
            if (!isLatestCustomerReport(r)) return false;
            const customer = allCustomers.find((c) => c.id === r.customer_id);
            const followupDate = customer?.next_followup_date !== void 0 ? customer.next_followup_date : r.next_followup_date;
            const deadline = customer?.assignment_deadline;
            const daysF = getDaysUntil(followupDate);
            const daysD = getDaysUntil(deadline);
            return daysF !== null && daysF >= 0 && daysF <= maxDays || daysD !== null && daysD >= 0 && daysD <= maxDays;
          });
          break;
        }
        case "expired":
          result = result.filter((r) => {
            const customer = allCustomers.find((c) => c.id === r.customer_id);
            return isExpiredCustomer(customer);
          });
          break;
      }
    }
    return result;
  };
  const filtered = applyFilters(allReports);
  const effectiveSort = sort === "followup_soonest" || activeFilter === "active_followups" && sort !== "oldest" && sort !== "highest_score" && sort !== "newest_explicit" ? "followup_soonest" : activeFilter === "overdue_followups" && sort !== "oldest" && sort !== "highest_score" && sort !== "newest_explicit" ? "followup_overdue" : sort || "newest";
  filtered.sort((a, b) => {
    if (effectiveSort === "followup_soonest") {
      const customerA = allCustomers.find((c) => c.id === a.customer_id);
      const customerB = allCustomers.find((c) => c.id === b.customer_id);
      const dateAStr = a.next_followup_date || customerA?.next_followup_date;
      const dateBStr = b.next_followup_date || customerB?.next_followup_date;
      const tA = dateAStr ? new Date(dateAStr).getTime() : Infinity;
      const tB = dateBStr ? new Date(dateBStr).getTime() : Infinity;
      if (tA !== tB) return tA - tB;
      const cA = a.date_created ? new Date(a.date_created).getTime() : 0;
      const cB = b.date_created ? new Date(b.date_created).getTime() : 0;
      return cB - cA;
    } else if (effectiveSort === "followup_overdue") {
      const customerA = allCustomers.find((c) => c.id === a.customer_id);
      const customerB = allCustomers.find((c) => c.id === b.customer_id);
      const dateAStr = a.next_followup_date || customerA?.next_followup_date;
      const dateBStr = b.next_followup_date || customerB?.next_followup_date;
      const tA = dateAStr ? new Date(dateAStr).getTime() : -Infinity;
      const tB = dateBStr ? new Date(dateBStr).getTime() : -Infinity;
      if (tA !== tB) return tB - tA;
      const cA = a.date_created ? new Date(a.date_created).getTime() : 0;
      const cB = b.date_created ? new Date(b.date_created).getTime() : 0;
      return cB - cA;
    } else if (effectiveSort === "oldest") {
      const cA = a.date_created ? new Date(a.date_created).getTime() : 0;
      const cB = b.date_created ? new Date(b.date_created).getTime() : 0;
      return cA - cB;
    } else if (effectiveSort === "highest_score") {
      const sA = Number(a.negotiation_score) || 0;
      const sB = Number(b.negotiation_score) || 0;
      if (sB !== sA) return sB - sA;
      const cA = a.date_created ? new Date(a.date_created).getTime() : 0;
      const cB = b.date_created ? new Date(b.date_created).getTime() : 0;
      return cB - cA;
    } else {
      const cA = a.date_created ? new Date(a.date_created).getTime() : 0;
      const cB = b.date_created ? new Date(b.date_created).getTime() : 0;
      return cB - cA;
    }
  });
  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / reqLimit));
  const startIndex = (reqPage - 1) * reqLimit;
  const paginatedList = isUnlimited ? filtered : filtered.slice(startIndex, startIndex + reqLimit);
  res.setHeader("X-Total-Count", String(totalCount));
  res.setHeader("X-Filter-Count", String(totalCount));
  res.setHeader("X-Page", String(reqPage));
  res.setHeader("X-Limit", String(reqLimit));
  if (isUnlimited) {
    return res.json(paginatedList);
  }
  res.json({
    data: paginatedList,
    meta: {
      filter_count: totalCount,
      total_count: totalCount,
      page: reqPage,
      limit: reqLimit,
      total_pages: totalPages
    }
  });
});
router5.post("/", async (req, res) => {
  const { userId, personnelId, userName } = getRequestUser(req);
  const payload = req.body;
  if (!payload.customer_id || !payload.report_text) {
    return res.status(400).json({ error: "\u0634\u0646\u0627\u0633\u0647 \u0645\u0634\u062A\u0631\u06CC \u0648 \u0645\u062A\u0646 \u06AF\u0632\u0627\u0631\u0634 \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A." });
  }
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const newReportId = payload.id || crypto8.randomUUID();
  let rawCreatorId = payload.created_by || personnelId || userId || null;
  const safeCreatedByFk = await getSafeDirectusPersonnelForeignKey(
    rawCreatorId,
    payload.negotiator_name || userName
  );
  let nextFollowupIso = payload.next_followup_date || null;
  if (!nextFollowupIso || String(nextFollowupIso).trim() === "") {
    nextFollowupIso = null;
  } else {
    try {
      const followupDateObj = new Date(nextFollowupIso);
      if (!isNaN(followupDateObj.getTime())) {
        if (followupDateObj.getTime() < Date.now() - 6e4) {
          return res.status(400).json({
            error: "\u062A\u0627\u0631\u06CC\u062E \u0648 \u0633\u0627\u0639\u062A \u067E\u06CC\u06AF\u06CC\u0631\u06CC \u0628\u0639\u062F\u06CC \u0646\u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u062F \u062F\u0631 \u06AF\u0630\u0634\u062A\u0647 \u0628\u0627\u0634\u062F. \u0644\u0637\u0641\u0627\u064B \u0632\u0645\u0627\u0646 \u067E\u06CC\u06AF\u06CC\u0631\u06CC \u0631\u0627 \u062F\u0631 \u0622\u06CC\u0646\u062F\u0647 \u062A\u0646\u0638\u06CC\u0645 \u06A9\u0646\u06CC\u062F."
          });
        }
        nextFollowupIso = followupDateObj.toISOString();
      } else {
        nextFollowupIso = null;
      }
    } catch {
      nextFollowupIso = null;
    }
  }
  let contractDateIso = payload.contract_date || null;
  if (contractDateIso) {
    try {
      contractDateIso = new Date(contractDateIso).toISOString();
    } catch {
      contractDateIso = null;
    }
  }
  const newReport = {
    id: newReportId,
    customer_id: payload.customer_id,
    negotiator_name: (payload.negotiator_name || userName || "\u06A9\u0627\u0631\u0634\u0646\u0627\u0633").trim(),
    customer_negotiator_name: payload.customer_negotiator_name ? String(payload.customer_negotiator_name).trim() : null,
    negotiation_phone: (payload.negotiation_phone || "").trim(),
    report_text: (payload.report_text || "").trim(),
    negotiation_score: Number(payload.negotiation_score) || 5,
    next_followup_date: nextFollowupIso,
    negotiation_status: payload.negotiation_status || "\u062A\u0645\u0627\u0633 \u0628\u0631\u0642\u0631\u0627\u0631 \u0646\u0634\u062F\u0647",
    created_by: safeCreatedByFk || void 0,
    date_created: (payload.date_created ? normalizeToIsoDateTime(payload.date_created) : null) || nowIso,
    contract_number: payload.contract_number ? String(payload.contract_number).trim() : null,
    contract_date: contractDateIso,
    contract_items: payload.contract_items ? String(payload.contract_items).trim() : null,
    contract_amount: payload.contract_amount ? Number(payload.contract_amount) : null
  };
  if (directusUrl && directusAdminToken) {
    try {
      const targetTenantId = payload.tenant_id || getRequestTenantId(req) || "default";
      const tenantNum = resolveDirectusTenantId(targetTenantId) || 1;
      const directusReportPayload = {
        ...newReport,
        tenant_id: tenantNum
      };
      delete directusReportPayload.created_by;
      const created = await directusFetch("/items/customer_reports", {
        method: "POST",
        body: JSON.stringify(directusReportPayload)
      });
      if (payload.customer_id) {
        await syncCustomerFollowupFromLatestReport(payload.customer_id);
      }
      const custRes = await directusFetch(`/items/customers/${payload.customer_id}`).catch(
        () => null
      );
      if (custRes?.data) {
        const custPatch = {
          status: payload.negotiation_status || custRes.data.status,
          next_followup_date: nextFollowupIso,
          date_updated: nowIso
        };
        const cleanCustPatch = cleanCustomerPayloadForDirectus(
          { ...custRes.data, ...custPatch },
          payload.customer_id
        );
        delete cleanCustPatch.date_created;
        await directusFetch(`/items/customers/${payload.customer_id}`, {
          method: "PATCH",
          body: JSON.stringify(cleanCustPatch)
        }).catch(() => {
        });
      }
      if (payload.customer_id) {
        await syncCustomerFollowupFromLatestReport(payload.customer_id);
      }
      invalidateCustomersCache();
      invalidateReportsCache();
      invalidateDashboardSummaryCache();
      return res.status(201).json(created.data || newReport);
    } catch (err) {
      if (err.message !== "DIRECTUS_UNREACHABLE_FALLBACK" && err.message !== "DIRECTUS_URL_NOT_CONFIGURED") {
        console.warn("Customer report create Directus notice, falling back to local store:", err.message);
      }
    }
  }
  reportsData.unshift(newReport);
  const custIdx = customersData.findIndex((c) => String(c.id) === String(payload.customer_id));
  if (custIdx >= 0) {
    customersData[custIdx].status = payload.negotiation_status || customersData[custIdx].status;
    customersData[custIdx].next_followup_date = nextFollowupIso;
    customersData[custIdx].date_updated = nowIso;
  }
  invalidateCustomersCache();
  invalidateReportsCache();
  invalidateDashboardSummaryCache();
  res.status(201).json(newReport);
});
router5.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const { isAdmin, isPersonnelAdmin } = getRequestUser(req);
  if (!isAdmin && !isPersonnelAdmin) {
    return res.status(403).json({ error: "\u0641\u0642\u0637 \u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645 \u0627\u062C\u0627\u0632\u0647 \u062D\u0630\u0641 \u06AF\u0632\u0627\u0631\u0634 \u0645\u0630\u0627\u06A9\u0631\u0647 \u0631\u0627 \u062F\u0627\u0631\u062F." });
  }
  let deletedCustId = null;
  const foundReport = reportsData.find((r) => r.id === id);
  if (foundReport) deletedCustId = String(foundReport.customer_id);
  if (directusUrl && directusAdminToken) {
    try {
      const repRes = await directusFetch(`/items/customer_reports/${id}?fields=customer_id`).catch(() => null);
      if (repRes?.data?.customer_id) {
        deletedCustId = typeof repRes.data.customer_id === "object" ? repRes.data.customer_id.id : repRes.data.customer_id;
      }
      await directusFetch(`/items/customer_reports/${id}`, { method: "DELETE" });
      if (deletedCustId) {
        await syncCustomerFollowupFromLatestReport(deletedCustId);
      }
      invalidateReportsCache();
      invalidateDashboardSummaryCache();
      return res.status(204).send();
    } catch (err) {
      return res.status(500).json({
        error: "REPORT_DELETE_FAILED",
        message: `\u062E\u0637\u0627 \u062F\u0631 \u062D\u0630\u0641 \u06AF\u0632\u0627\u0631\u0634: ${err.message}`
      });
    }
  }
  const idx = reportsData.findIndex((r) => r.id === id);
  if (idx >= 0) {
    reportsData.splice(idx, 1);
  }
  if (deletedCustId) {
    await syncCustomerFollowupFromLatestReport(deletedCustId);
  }
  invalidateReportsCache();
  invalidateDashboardSummaryCache();
  res.status(204).send();
});
var repairReportsCache = null;
var repairReportsCacheTime = 0;
router5.post("/repair-negotiators", async (req, res) => {
  const { items, dry_run, repair_negotiators, repair_followups, repair_type } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "\u0622\u0631\u0627\u06CC\u0647 \u0631\u06A9\u0648\u0631\u062F\u0647\u0627\u06CC \u0641\u0627\u06CC\u0644 \u0627\u0631\u0633\u0627\u0644 \u0646\u0634\u062F\u0647 \u0627\u0633\u062A." });
  }
  const repairNegotiatorsOpt = repair_negotiators !== false && repair_type !== "followup_date";
  const repairFollowupsOpt = repair_followups !== false && repair_type !== "negotiator";
  const isDryRun = dry_run !== false;
  let existingReports = [];
  if (repairReportsCache && Date.now() - repairReportsCacheTime < 5 * 60 * 1e3) {
    existingReports = repairReportsCache;
  } else if (directusUrl && directusAdminToken) {
    try {
      const directusRes = await directusFetchAllPages(
        "/items/customer_reports?fields=id,negotiation_phone,date_created,negotiator_name,customer_negotiator_name,next_followup_date,report_text",
        {},
        1e5
      );
      existingReports = directusRes.data || [];
      repairReportsCache = existingReports;
      repairReportsCacheTime = Date.now();
    } catch (e) {
      console.warn("Failed to fetch Directus reports for repair, fallback to cache:", e.message);
      existingReports = await ensureReportsCache().catch(() => reportsData);
    }
  } else {
    existingReports = await ensureReportsCache().catch(() => reportsData);
  }
  const getPhoneDigits = (str) => {
    if (!str) return "";
    let clean = String(str).replace(/[^\d]/g, "");
    if (clean.startsWith("0098") && clean.length > 12) {
      clean = clean.slice(4);
    } else if (clean.startsWith("98") && clean.length === 12) {
      clean = clean.slice(2);
    }
    return clean.replace(/^0+/, "");
  };
  const CP1252_REVERSE_MAP = {
    8364: 128,
    8218: 130,
    402: 131,
    8222: 132,
    8230: 133,
    8224: 134,
    8225: 135,
    710: 136,
    8240: 137,
    352: 138,
    8249: 139,
    338: 140,
    381: 142,
    8216: 145,
    8217: 146,
    8220: 147,
    8221: 148,
    8226: 149,
    8211: 150,
    8212: 151,
    732: 152,
    8482: 153,
    353: 154,
    8250: 155,
    339: 156,
    382: 158,
    376: 159
  };
  const fixMojibake = (str) => {
    if (!str || typeof str !== "string") return "";
    if (/[ØÙÛÚ]/.test(str)) {
      try {
        const bytes = new Uint8Array(
          [...str].map((ch) => {
            const code = ch.charCodeAt(0);
            return CP1252_REVERSE_MAP[code] || (code <= 255 ? code : 63);
          })
        );
        const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        if (decoded && !/[\uFFFD]/.test(decoded)) {
          return decoded;
        }
      } catch {
      }
    }
    return str;
  };
  const jalaliToGregorian2 = (jy, jm, jd) => {
    jy = jy - 979;
    jm = jm - 1;
    jd = jd - 1;
    let j_day_no = 365 * jy + Math.floor(jy / 33) * 8 + Math.floor((jy % 33 + 3) / 4);
    for (let i = 0; i < jm; ++i) j_day_no += i < 6 ? 31 : 30;
    j_day_no += jd;
    let g_day_no = j_day_no + 79;
    let gy = 1600 + 400 * Math.floor(g_day_no / 146097);
    g_day_no = g_day_no % 146097;
    let leap = true;
    if (g_day_no >= 36525) {
      g_day_no--;
      gy += 100 * Math.floor(g_day_no / 36524);
      g_day_no = g_day_no % 36524;
      if (g_day_no >= 365) g_day_no++;
      else leap = false;
    }
    gy += 4 * Math.floor(g_day_no / 1461);
    g_day_no %= 1461;
    if (g_day_no >= 366) {
      leap = false;
      g_day_no--;
      gy += Math.floor(g_day_no / 365);
      g_day_no = g_day_no % 365;
    }
    const g_days_in_month = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let gm = 0;
    while (gm < 12 && g_day_no >= g_days_in_month[gm]) {
      g_day_no -= g_days_in_month[gm];
      gm++;
    }
    return { gy, gm: gm + 1, gd: g_day_no + 1 };
  };
  const parseTimeMs = (dateVal) => {
    if (!dateVal) return NaN;
    if (typeof dateVal === "number" && dateVal > 2e4 && dateVal < 6e4) {
      return Math.round((dateVal - 25569) * 86400 * 1e3);
    }
    const str = String(dateVal).trim();
    const num = Number(str);
    if (!isNaN(num) && num > 2e4 && num < 6e4) {
      return Math.round((num - 25569) * 86400 * 1e3);
    }
    if (/^1[34]\d\d[\/\-]/.test(str)) {
      try {
        const parts = str.split(/\s+/);
        const datePart = parts[0];
        const timePart = parts[1] || "00:00:00";
        const [jy, jm, jd] = datePart.split(/[\/\-]/).map((p) => parseInt(p, 10));
        if (!isNaN(jy) && !isNaN(jm) && !isNaN(jd)) {
          const g = jalaliToGregorian2(jy, jm, jd);
          const iso = `${g.gy}-${String(g.gm).padStart(2, "0")}-${String(g.gd).padStart(2, "0")}T${timePart}`;
          const t = new Date(iso).getTime();
          if (!isNaN(t)) return t;
        }
      } catch {
      }
    }
    let ms = new Date(str).getTime();
    if (isNaN(ms)) {
      ms = new Date(str.replace(" ", "T")).getTime();
    }
    return ms;
  };
  const phoneMap = /* @__PURE__ */ new Map();
  const minuteMap = /* @__PURE__ */ new Map();
  for (const rep of existingReports) {
    const pDigits = getPhoneDigits(rep.negotiation_phone);
    if (pDigits) {
      if (!phoneMap.has(pDigits)) phoneMap.set(pDigits, []);
      phoneMap.get(pDigits).push(rep);
      if (pDigits.length > 10) {
        const last10 = pDigits.slice(-10);
        if (!phoneMap.has(last10)) phoneMap.set(last10, []);
        phoneMap.get(last10).push(rep);
      }
    }
    if (rep.date_created) {
      const ms = parseTimeMs(rep.date_created);
      if (!isNaN(ms)) {
        const minKey = Math.floor(ms / 6e4);
        if (!minuteMap.has(minKey)) minuteMap.set(minKey, []);
        minuteMap.get(minKey).push(rep);
      }
    }
  }
  const totalInputRows = items.length;
  let matchedCount = 0;
  let needsUpdateCount = 0;
  let alreadyMatchingCount = 0;
  let unmatchedCount = 0;
  const patchItemsMap = /* @__PURE__ */ new Map();
  const previewUpdates = [];
  const unmatchedSamples = [];
  for (const r of items) {
    const getVal = (aliases) => {
      for (const a of aliases) {
        if (r[a] !== void 0 && r[a] !== null && String(r[a]).trim() !== "") {
          return String(r[a]).trim();
        }
        const found = Object.keys(r).find((k) => k.trim().toLowerCase() === a.toLowerCase());
        if (found && r[found] !== void 0 && r[found] !== null && String(r[found]).trim() !== "") {
          return String(r[found]).trim();
        }
      }
      return "";
    };
    const rawPhone = getVal(["callNum", "call_num", "negotiation_phone", "phone", "mobile", "\u0634\u0645\u0627\u0631\u0647 \u062A\u0645\u0627\u0633", "\u062A\u0644\u0641\u0646", "\u0645\u0648\u0628\u0627\u06CC\u0644", "\u0634\u0645\u0627\u0631\u0647"]);
    const rawDate = getVal(["insertDate", "insert_date", "date_created", "dateTime", "datetime", "updateDate", "\u062A\u0627\u0631\u06CC\u062E \u062B\u0628\u062A", "\u062A\u0627\u0631\u06CC\u062E"]);
    const rawNegotiator = getVal(["negotiator", "negotiator_name", "user", "personnel_name", "\u0645\u0630\u0627\u06A9\u0631\u0647\u200C\u06A9\u0646\u0646\u062F\u0647", "\u0645\u0630\u0627\u06A9\u0631\u0647 \u06A9\u0646\u0646\u062F\u0647", "\u0646\u0627\u0645 \u0645\u0630\u0627\u06A9\u0631\u0647 \u06A9\u0646\u0646\u062F\u0647", "\u0637\u0631\u0641 \u0645\u0630\u0627\u06A9\u0631\u0647"]);
    const rawReportSnippet = getVal(["report", "report_text", "\u06AF\u0632\u0627\u0631\u0634", "\u0645\u062A\u0646 \u06AF\u0632\u0627\u0631\u0634", "\u0634\u0631\u062D \u0645\u0630\u0627\u06A9\u0631\u0647"]);
    let rawNextDate = getVal([
      "nextFollow",
      "next_followup_date",
      "next_followup",
      "next_date",
      "nextDate",
      "next_follow",
      "\u062A\u0627\u0631\u06CC\u062E \u067E\u06CC\u06AF\u06CC\u0631\u06CC \u0628\u0639\u062F\u06CC",
      "\u062A\u0627\u0631\u06CC\u062E \u067E\u06CC\u06AF\u06CC\u0631\u06CC",
      "\u0645\u0648\u0639\u062F \u067E\u06CC\u06AF\u06CC\u0631\u06CC"
    ]);
    if (!rawNextDate) {
      const nextP = getVal(["next", "\u062A\u0627\u0631\u06CC\u062E \u067E\u06CC\u06AF\u06CC\u0631\u06CC"]);
      const followP = getVal(["follow", "\u0632\u0645\u0627\u0646 \u067E\u06CC\u06AF\u06CC\u0631\u06CC", "\u0633\u0627\u0639\u062A \u067E\u06CC\u06AF\u06CC\u0631\u06CC"]);
      if (nextP) {
        rawNextDate = followP ? `${nextP} ${followP}` : nextP;
      }
    }
    if (!rawNegotiator && !rawNextDate) {
      unmatchedCount++;
      if (unmatchedSamples.length < 20) unmatchedSamples.push({ ...r, reason: "\u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0646\u0627\u0645 \u06CC\u0627 \u062A\u0627\u0631\u06CC\u062E \u067E\u06CC\u06AF\u06CC\u0631\u06CC \u062F\u0631 \u0641\u0627\u06CC\u0644 \u0645\u0648\u062C\u0648\u062F \u0646\u06CC\u0633\u062A" });
      continue;
    }
    const cleanTargetNegotiator = fixMojibake(rawNegotiator.trim());
    const normNextDate = normalizeToIsoDateTime(rawNextDate);
    const pDigits = getPhoneDigits(rawPhone);
    let candidates = [];
    if (pDigits) {
      candidates = phoneMap.get(pDigits) || (pDigits.length > 10 ? phoneMap.get(pDigits.slice(-10)) : void 0) || [];
    }
    if (candidates.length === 0) {
      const incomingTime2 = parseTimeMs(rawDate);
      if (!isNaN(incomingTime2)) {
        const incMin = Math.floor(incomingTime2 / 6e4);
        for (let m = incMin - 15; m <= incMin + 15; m++) {
          const list = minuteMap.get(m);
          if (list) {
            candidates.push(...list);
          }
        }
      }
    }
    if (candidates.length === 0) {
      unmatchedCount++;
      if (unmatchedSamples.length < 20) unmatchedSamples.push({ ...r, reason: "\u06AF\u0632\u0627\u0631\u0634\u06CC \u0628\u0627 \u0627\u06CC\u0646 \u0634\u0645\u0627\u0631\u0647 \u06CC\u0627 \u062A\u0627\u0631\u06CC\u062E \u062F\u0631 \u0633\u06CC\u0633\u062A\u0645 \u067E\u06CC\u062F\u0627 \u0646\u0634\u062F" });
      continue;
    }
    let bestMatch = null;
    let bestScore = -1;
    const incomingTime = parseTimeMs(rawDate);
    for (const c of candidates) {
      let score = 0;
      if (pDigits && c.negotiation_phone) {
        const cPhoneDigits = getPhoneDigits(c.negotiation_phone);
        if (cPhoneDigits && (cPhoneDigits === pDigits || cPhoneDigits.endsWith(pDigits) || pDigits.endsWith(cPhoneDigits))) {
          score += 100;
        }
      }
      if (!isNaN(incomingTime) && c.date_created) {
        const cTime = parseTimeMs(c.date_created);
        if (!isNaN(cTime)) {
          const diffMinutes = Math.abs(Math.round((cTime - incomingTime) / 6e4));
          if (diffMinutes === 0) {
            score += 120;
          } else if (diffMinutes <= 2) {
            score += 90;
          } else if (diffMinutes <= 10) {
            score += 50;
          } else if (diffMinutes <= 60) {
            score += 20;
          }
        }
      }
      if (rawReportSnippet && c.report_text) {
        const cleanSnippet = rawReportSnippet.slice(0, 15).replace(/[^\w\u0600-\u06FF]/g, "").trim();
        const cleanCReport = c.report_text.slice(0, 30).replace(/[^\w\u0600-\u06FF]/g, "").trim();
        if (cleanSnippet && cleanCReport && (cleanCReport.includes(cleanSnippet) || cleanSnippet.includes(cleanCReport))) {
          score += 150;
        }
      }
      if (rawNegotiator && c.negotiator_name) {
        const normN1 = fixMojibake(rawNegotiator).trim();
        const normN2 = fixMojibake(c.negotiator_name).trim();
        if (normN1 && normN2 && (normN1 === normN2 || normN1.includes(normN2) || normN2.includes(normN1))) {
          score += 30;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = c;
      }
    }
    if (!pDigits && bestScore < 80) {
      unmatchedCount++;
      if (unmatchedSamples.length < 20) unmatchedSamples.push({ ...r, reason: "\u06AF\u0632\u0627\u0631\u0634 \u0628\u062F\u0648\u0646 \u0634\u0645\u0627\u0631\u0647 \u062A\u0644\u0641\u0646\u060C \u062A\u0637\u0628\u06CC\u0642 \u0632\u0645\u0627\u0646 \u06CC\u0627 \u0645\u062A\u0646 \u06A9\u0627\u0641\u06CC \u062F\u0631 \u0633\u06CC\u0633\u062A\u0645 \u0646\u062F\u0627\u0634\u062A" });
      continue;
    }
    if (!bestMatch) {
      unmatchedCount++;
      if (unmatchedSamples.length < 20) unmatchedSamples.push({ ...r, reason: "\u0647\u06CC\u0686 \u0631\u06A9\u0648\u0631\u062F\u06CC \u0628\u0631\u0627\u06CC \u062A\u0637\u0628\u06CC\u0642 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F" });
      continue;
    }
    matchedCount++;
    const currentCustomerNegotiator = (bestMatch.customer_negotiator_name || "").trim();
    const currentFollowupDate = bestMatch.next_followup_date || null;
    const negotiatorNeedsUpdate = repairNegotiatorsOpt && Boolean(cleanTargetNegotiator) && currentCustomerNegotiator !== cleanTargetNegotiator;
    const followupNeedsUpdate = repairFollowupsOpt && Boolean(normNextDate) && currentFollowupDate !== normNextDate;
    if (negotiatorNeedsUpdate || followupNeedsUpdate) {
      needsUpdateCount++;
      const patchObj = { id: bestMatch.id };
      if (negotiatorNeedsUpdate) {
        patchObj.customer_negotiator_name = cleanTargetNegotiator;
      }
      if (followupNeedsUpdate) {
        patchObj.next_followup_date = normNextDate;
      }
      patchItemsMap.set(bestMatch.id, patchObj);
      if (previewUpdates.length < 100) {
        previewUpdates.push({
          id: bestMatch.id,
          phone: bestMatch.negotiation_phone || rawPhone,
          insertDate: bestMatch.date_created || rawDate,
          current_negotiator: fixMojibake(currentCustomerNegotiator) || "(\u062E\u0627\u0644\u06CC)",
          new_negotiator: fixMojibake(cleanTargetNegotiator),
          current_followup_date: currentFollowupDate,
          new_followup_date: normNextDate,
          negotiator_changed: negotiatorNeedsUpdate,
          followup_changed: followupNeedsUpdate
        });
      }
    } else {
      alreadyMatchingCount++;
    }
  }
  if (isDryRun) {
    return res.json({
      dry_run: true,
      total_input_rows: totalInputRows,
      matched_count: matchedCount,
      needs_update_count: needsUpdateCount,
      already_matching_count: alreadyMatchingCount,
      unmatched_count: unmatchedCount,
      preview_updates: previewUpdates,
      unmatched_samples: unmatchedSamples
    });
  }
  if (directusUrl && directusAdminToken && patchItemsMap.size > 0) {
    await directusSafeBatchPatch("customer_reports", patchItemsMap, 50);
  }
  for (const [id, patch] of patchItemsMap.entries()) {
    const idx = reportsData.findIndex((r) => r.id === id);
    if (idx >= 0) {
      if (patch.customer_negotiator_name !== void 0) {
        reportsData[idx].customer_negotiator_name = patch.customer_negotiator_name;
      }
      if (patch.next_followup_date !== void 0) {
        reportsData[idx].next_followup_date = patch.next_followup_date;
      }
    }
  }
  repairReportsCache = null;
  invalidateReportsCache();
  return res.json({
    dry_run: false,
    success: true,
    total_updated: patchItemsMap.size,
    message: `\u0627\u0637\u0644\u0627\u0639\u0627\u062A (\u0637\u0631\u0641 \u0645\u0630\u0627\u06A9\u0631\u0647 \u0648 \u062A\u0627\u0631\u06CC\u062E \u067E\u06CC\u06AF\u06CC\u0631\u06CC \u0628\u0639\u062F\u06CC) \u0628\u0631\u0627\u06CC ${patchItemsMap.size} \u06AF\u0632\u0627\u0631\u0634 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062F\u0631 \u067E\u0627\u06CC\u06AF\u0627\u0647 \u062F\u0627\u062F\u0647 \u062A\u0631\u0645\u06CC\u0645 \u0648 \u0630\u062E\u06CC\u0631\u0647 \u0634\u062F.`
  });
});
var reports_routes_default = router5;

// server/routes/coldLeads.routes.ts
import { Router as Router6 } from "express";
import crypto9 from "crypto";
var router6 = Router6();
router6.get("/api/cold-leads", async (req, res) => {
  const { userId, personnelId, isAdmin, isPersonnelAdmin, canViewAllCustomers, userName, tenantId } = getRequestUser(req);
  const canViewAllLeads = Boolean(isAdmin || isPersonnelAdmin || canViewAllCustomers);
  if (directusUrl && directusAdminToken) {
    try {
      const result = await directusFetchAllPages("/items/cold_leads?sort=-date_created");
      if (result && Array.isArray(result.data)) {
        let leads2 = result.data.map((l) => ({
          ...l,
          assigned_to_id: typeof l.assigned_to === "object" && l.assigned_to !== null ? l.assigned_to.id : String(l.assigned_to || ""),
          assigned_to_name: l.assigned_to_name || (typeof l.assigned_to === "object" && l.assigned_to !== null ? l.assigned_to.name || l.assigned_to.first_name : "\u062A\u062E\u0635\u06CC\u0635 \u0646\u06CC\u0627\u0641\u062A\u0647")
        }));
        if (tenantId && tenantId !== "all") {
          leads2 = leads2.filter((l) => matchesTenant(l.tenant_id, tenantId));
        }
        if (!canViewAllLeads && (userName || userId || personnelId)) {
          leads2 = leads2.filter(
            (l) => personnelId && (l.assigned_to_id === personnelId || l.assigned_to === personnelId) || userId && (l.assigned_to_id === userId || l.assigned_to === userId) || userName && (l.assigned_to_name === userName || l.assigned_to === userName)
          );
        }
        return res.json(leads2);
      }
    } catch (e) {
      return res.status(502).json({ error: `\u062E\u0637\u0627 \u062F\u0631 \u062F\u0631\u06CC\u0627\u0641\u062A \u0634\u0645\u0627\u0631\u0647\u200C\u0647\u0627\u06CC \u0627\u0648\u0644\u06CC\u0647 \u0627\u0632 \u067E\u0627\u06CC\u06AF\u0627\u0647 \u062F\u0627\u062F\u0647 \u0645\u0631\u06A9\u0632\u06CC: ${e.message}` });
    }
  }
  let leads = coldLeadsData;
  if (tenantId && tenantId !== "all") {
    leads = leads.filter((l) => matchesTenant(l.tenant_id, tenantId));
  }
  if (!canViewAllLeads && (userName || userId || personnelId)) {
    leads = leads.filter(
      (l) => personnelId && l.assigned_to === personnelId || userName && l.assigned_to === userName
    );
  }
  res.json(leads);
});
router6.post("/api/cold-leads", async (req, res) => {
  const payload = req.body;
  const { userId, personnelId, userName, isAdmin, tenantId } = getRequestUser(req);
  const newLeadId = crypto9.randomUUID();
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  let convertedCustId = payload.converted_customer_id || null;
  if (!convertedCustId || String(convertedCustId).trim() === "") {
    convertedCustId = null;
  }
  const rawAssigned = isAdmin ? payload.assigned_to || personnelId || userId || userName : personnelId || userId || userName;
  const resolved = await resolvePersonnelId(rawAssigned, userName);
  const finalAssignedId = resolved.personnelId || null;
  const finalAssignedName = resolved.personnelName || userName || "\u062A\u062E\u0635\u06CC\u0635 \u0646\u06CC\u0627\u0641\u062A\u0647";
  const targetTenantId = payload.tenant_id || tenantId || "default";
  const newLead = {
    id: newLeadId,
    tenant_id: targetTenantId,
    phone_number: (payload.phone_number || "").trim(),
    contact_name: (payload.contact_name || "").trim(),
    source: payload.source || "\u0648\u0631\u0648\u062F \u062F\u0633\u062A\u06CC",
    status: payload.status || "\u062A\u0645\u0627\u0633 \u0646\u06AF\u0631\u0641\u062A\u0647",
    notes: (payload.notes || "").trim(),
    assigned_to: finalAssignedId,
    converted_customer_id: convertedCustId,
    date_created: nowIso
  };
  if (directusUrl && directusAdminToken) {
    try {
      const directusLeadPayload = {
        ...newLead,
        tenant_id: resolveDirectusTenantId(targetTenantId)
      };
      const created = await directusFetch("/items/cold_leads", {
        method: "POST",
        body: JSON.stringify(directusLeadPayload)
      });
      const returned = created?.data || newLead;
      return res.status(201).json({
        ...returned,
        assigned_to_id: finalAssignedId,
        assigned_to_name: finalAssignedName
      });
    } catch (err) {
      if (err.message !== "DIRECTUS_UNREACHABLE_FALLBACK" && err.message !== "DIRECTUS_URL_NOT_CONFIGURED") {
        console.warn("Cold lead Directus notice, using local store:", err.message);
      }
    }
  }
  coldLeadsData.unshift({
    ...newLead,
    assigned_to: finalAssignedName,
    assigned_to_id: finalAssignedId,
    assigned_to_name: finalAssignedName
  });
  res.status(201).json(newLead);
});
router6.patch("/api/cold-leads/:id", async (req, res) => {
  const payload = req.body;
  const cleanPatch = { ...payload };
  if (cleanPatch.converted_customer_id === "") {
    cleanPatch.converted_customer_id = null;
  }
  if (cleanPatch.assigned_to !== void 0) {
    if (!cleanPatch.assigned_to || cleanPatch.assigned_to === "none" || cleanPatch.assigned_to === "\u062A\u062E\u0635\u06CC\u0635 \u0646\u06CC\u0627\u0641\u062A\u0647") {
      cleanPatch.assigned_to = null;
    } else {
      const resolved = await resolvePersonnelId(cleanPatch.assigned_to);
      cleanPatch.assigned_to = resolved.personnelId || null;
    }
  }
  if (directusUrl && directusAdminToken) {
    try {
      const patched = await directusFetch(`/items/cold_leads/${req.params.id}`, {
        method: "PATCH",
        body: JSON.stringify(cleanPatch)
      });
      return res.json(patched.data);
    } catch (err) {
      return res.status(500).json({
        error: "LEAD_UPDATE_FAILED",
        message: `\u062E\u0637\u0627 \u062F\u0631 \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0644\u06CC\u062F \u062F\u0631 \u067E\u0627\u06CC\u06AF\u0627\u0647 \u062F\u0627\u062F\u0647 \u0645\u0631\u06A9\u0632\u06CC: ${err.message}`
      });
    }
  }
  const idx = coldLeadsData.findIndex((l) => l.id === req.params.id);
  if (idx >= 0) {
    coldLeadsData[idx] = { ...coldLeadsData[idx], ...cleanPatch };
    return res.json(coldLeadsData[idx]);
  }
  res.status(404).json({ error: "Lead not found" });
});
router6.post("/api/cold-leads/bulk-assign", async (req, res) => {
  const { lead_ids, target_marketer_id } = req.body;
  const { isAdmin, isPersonnelAdmin } = getRequestUser(req);
  if (!isAdmin && !isPersonnelAdmin) {
    return res.status(403).json({ error: "\u0641\u0642\u0637 \u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645 \u0627\u062C\u0627\u0632\u0647 \u0627\u0646\u062A\u0642\u0627\u0644 \u0648 \u062A\u062E\u0635\u06CC\u0635 \u06AF\u0631\u0648\u0647\u06CC \u0634\u0645\u0627\u0631\u0647\u200C\u0647\u0627 \u0631\u0627 \u062F\u0627\u0631\u062F." });
  }
  if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
    return res.status(400).json({ error: "\u062D\u062F\u0627\u0642\u0644 \u06CC\u06A9 \u0634\u0645\u0627\u0631\u0647 \u0631\u0627 \u0628\u0631\u0627\u06CC \u062A\u062E\u0635\u06CC\u0635 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F." });
  }
  const resolved = await resolvePersonnelId(target_marketer_id);
  const finalAssignedId = resolved.personnelId || null;
  const targetMarketerName = resolved.personnelName || "\u062A\u062E\u0635\u06CC\u0635 \u0646\u06CC\u0627\u0641\u062A\u0647";
  let updatedCount = 0;
  for (const lId of lead_ids) {
    if (directusUrl && directusAdminToken) {
      try {
        await directusFetch(`/items/cold_leads/${lId}`, {
          method: "PATCH",
          body: JSON.stringify({ assigned_to: finalAssignedId })
        });
        updatedCount++;
      } catch {
      }
    } else {
      const idx = coldLeadsData.findIndex((l) => l.id === lId);
      if (idx >= 0) {
        coldLeadsData[idx].assigned_to = targetMarketerName;
        updatedCount++;
      }
    }
  }
  res.json({
    success: true,
    updatedCount,
    message: `${updatedCount} \u0634\u0645\u0627\u0631\u0647 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u0628\u0647 \xAB${targetMarketerName}\xBB \u062A\u062E\u0635\u06CC\u0635 \u062F\u0627\u062F\u0647 \u0634\u062F.`
  });
});
router6.delete("/api/cold-leads/:id", async (req, res) => {
  if (directusUrl && directusAdminToken) {
    try {
      await directusFetch(`/items/cold_leads/${req.params.id}`, { method: "DELETE" });
    } catch {
    }
  }
  setColdLeadsData(coldLeadsData.filter((l) => l.id !== req.params.id));
  res.json({ success: true, message: "\u0634\u0645\u0627\u0631\u0647 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062D\u0630\u0641 \u0634\u062F." });
});
router6.post("/api/cold-leads/:id/convert", async (req, res) => {
  const newCustId = crypto9.randomUUID();
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  let lead = null;
  if (directusUrl && directusAdminToken) {
    try {
      const leadRes = await directusFetch(`/items/cold_leads/${req.params.id}`);
      lead = leadRes.data;
    } catch {
    }
  }
  if (!lead) {
    return res.status(404).json({ error: "\u0644\u06CC\u062F \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." });
  }
  const phone = (lead.phone_number || "").trim();
  const contactName = (lead.contact_name || "").trim();
  const customerPayload = cleanCustomerPayloadForDirectus({
    ...req.body,
    company_name: req.body.company_name || contactName || `\u0645\u0634\u062A\u0631\u06CC \u0628\u0627 \u0634\u0645\u0627\u0631\u0647 ${phone}`,
    mobile_numbers: phone ? [phone] : [],
    interview_status: "\u0645\u0635\u0627\u062D\u0628\u0647 \u0627\u0648\u0644\u06CC\u0647 \u0627\u0646\u062C\u0627\u0645 \u0634\u062F\u0647",
    interview_report: `\u062A\u0628\u062F\u06CC\u0644 \u0634\u062F\u0647 \u0627\u0632 \u0628\u0627\u0646\u06A9 \u0634\u0645\u0627\u0631\u0647\u200C\u0647\u0627\u06CC \u0627\u0648\u0644\u06CC\u0647 (${lead.source || "\u0645\u0646\u0628\u0639 \u0646\u0627\u0645\u0634\u062E\u0635"}). \u06CC\u0627\u062F\u062F\u0627\u0634\u062A: ${lead.notes || "\u0646\u062F\u0627\u0631\u062F"}`,
    interview_score: 6,
    status: "\u062A\u0645\u0627\u0633 \u0628\u0631\u0642\u0631\u0627\u0631 \u0646\u0634\u062F\u0647"
  }, newCustId);
  const contactItem = {
    id: crypto9.randomUUID(),
    customer_id: newCustId,
    channel_type: "mobile",
    value: phone,
    normalized_value: normalizeContactValue(phone, "mobile"),
    contact_name: contactName || customerPayload.company_name,
    contact_role: "\u0645\u062E\u0627\u0637\u0628 \u0644\u06CC\u062F \u062A\u0628\u062F\u06CC\u0644\u200C\u0634\u062F\u0647",
    is_primary: true,
    notes: `\u062A\u0628\u062F\u06CC\u0644 \u0634\u062F\u0647 \u0627\u0632 \u0628\u0627\u0646\u06A9 \u0634\u0645\u0627\u0631\u0647\u200C\u0647\u0627\u06CC \u0627\u0648\u0644\u06CC\u0647 (\u0645\u0646\u0628\u0639: ${lead.source || "\u0646\u0627\u0645\u0634\u062E\u0635"})`,
    date_created: nowIso,
    date_updated: nowIso
  };
  if (directusUrl && directusAdminToken) {
    try {
      const createdCustRes = await directusFetch("/items/customers", {
        method: "POST",
        body: JSON.stringify(customerPayload)
      });
      const finalCust = createdCustRes.data;
      await directusFetch("/items/customer_contacts", {
        method: "POST",
        body: JSON.stringify(contactItem)
      });
      await directusFetch(`/items/cold_leads/${req.params.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "\u062A\u0628\u062F\u06CC\u0644 \u0634\u062F\u0647 \u0628\u0647 \u0645\u0634\u062A\u0631\u06CC",
          converted_customer_id: newCustId
        })
      });
      const fullCustomer2 = { ...finalCust, contacts: [contactItem] };
      return res.json({ success: true, customer: fullCustomer2 });
    } catch (err) {
      if (err.message !== "DIRECTUS_UNREACHABLE_FALLBACK" && err.message !== "DIRECTUS_URL_NOT_CONFIGURED") {
        console.warn("Convert lead Directus notice, using local store:", err.message);
      }
    }
  }
  customersData.unshift(customerPayload);
  contactsData.unshift(contactItem);
  const leadIdx = coldLeadsData.findIndex((l) => String(l.id) === String(req.params.id));
  if (leadIdx >= 0) {
    coldLeadsData[leadIdx].status = "\u062A\u0628\u062F\u06CC\u0644 \u0634\u062F\u0647 \u0628\u0647 \u0645\u0634\u062A\u0631\u06CC";
    coldLeadsData[leadIdx].converted_customer_id = newCustId;
  }
  const fullCustomer = { ...customerPayload, contacts: [contactItem] };
  res.json({ success: true, customer: fullCustomer });
});
var coldLeads_routes_default = router6;

// server/routes/leaveRequests.routes.ts
import { Router as Router7 } from "express";
import crypto10 from "crypto";
var router7 = Router7();
var getLeaveRequestsHandler = async (req, res) => {
  const { userId, personnelId, isAdmin, userRole, userName, tenantId } = getRequestUser(req);
  let list = [];
  if (directusUrl && directusAdminToken) {
    try {
      const resp = await directusFetchAllPages("/items/leave_requests?sort=-date_created");
      if (resp && Array.isArray(resp.data)) {
        list = resp.data.map((r) => ({
          ...r,
          id: String(r.id),
          personnel_id: typeof r.personnel_id === "object" && r.personnel_id !== null ? String(r.personnel_id.id) : String(r.personnel_id || ""),
          personnel_name: r.personnel_name || (typeof r.personnel_id === "object" && r.personnel_id !== null ? r.personnel_id.name || r.personnel_id.first_name : "\u06A9\u0627\u0631\u0634\u0646\u0627\u0633 \u0634\u0631\u06A9\u062A")
        }));
      }
    } catch (err) {
      console.warn("Directus leave_requests fetch warning:", err.message);
    }
  } else {
    list = [...leaveRequestsData];
  }
  const pMatch = personnelData.find(
    (p) => personnelId && (p.id?.toLowerCase() === String(personnelId).toLowerCase() || p.id?.toLowerCase() === `p-${String(personnelId).replace(/^p-/, "").toLowerCase()}`) || userId && (p.user_id?.toLowerCase() === String(userId).toLowerCase() || p.id?.toLowerCase() === String(userId).toLowerCase())
  );
  const canViewAllLeaves = isAdmin || userRole === "admin" || userRole === "sales_manager" || pMatch?.role === "admin" || pMatch?.role === "sales_manager" || Boolean(pMatch?.permissions?.can_approve_leaves);
  if (tenantId && tenantId !== "all") {
    list = list.filter((r) => {
      if (!r.tenant_id) return true;
      return matchesTenant(r.tenant_id, tenantId) || matchesTenant(r.tenant_id, "1") || matchesTenant(r.tenant_id, "default");
    });
  }
  if (!canViewAllLeaves) {
    const normUser = normalizePersianString(userName);
    const cleanPId = personnelId ? String(personnelId).trim().toLowerCase() : "";
    const rawUid = cleanPId.replace(/^p-/, "");
    const cleanUId = userId ? String(userId).trim().toLowerCase() : "";
    list = list.filter((r) => {
      const rPId = String(r.personnel_id || "").trim().toLowerCase();
      const rawRPId = rPId.replace(/^p-/, "");
      const normPName = normalizePersianString(r.personnel_name);
      const matchName = normUser && normPName && (normPName === normUser || normPName.includes(normUser) || normUser.includes(normPName));
      return cleanPId && (rPId === cleanPId || rawRPId === rawUid) || cleanUId && (rPId === cleanUId || rawRPId === rawUid) || pMatch?.id && String(pMatch.id).toLowerCase() === rPId || Boolean(matchName);
    });
  }
  res.json(list);
};
router7.get("/api/leave-requests", getLeaveRequestsHandler);
router7.get("/leave-requests", getLeaveRequestsHandler);
router7.post("/api/leave-requests", async (req, res) => {
  const payload = req.body;
  const { userId, personnelId, userName, tenantId } = getRequestUser(req);
  const newId = crypto10.randomUUID();
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const rawPId = payload.personnel_id || personnelId || userId;
  const resolved = await resolvePersonnelId(rawPId, payload.personnel_name || userName);
  let targetPersonnelId = resolved.personnelId;
  let targetPersonnelName = resolved.personnelName || payload.personnel_name || userName || "\u06A9\u0627\u0631\u0634\u0646\u0627\u0633 \u0634\u0631\u06A9\u062A";
  if (!targetPersonnelId) {
    const pMatch = personnelData.find((p) => p.name === targetPersonnelName || p.id === rawPId) || personnelData[0];
    if (pMatch?.id) targetPersonnelId = pMatch.id;
  }
  const targetTenantId = payload.tenant_id || tenantId || "default";
  const resolvedTenantNum = resolveDirectusTenantId(targetTenantId);
  let isoStartDate = nowIso;
  if (payload.start_date) {
    isoStartDate = payload.start_date.includes("T") ? payload.start_date : `${payload.start_date}T00:00:00.000Z`;
  }
  let isoEndDate = null;
  if (payload.leave_type === "daily" && payload.end_date) {
    isoEndDate = payload.end_date.includes("T") ? payload.end_date : `${payload.end_date}T00:00:00.000Z`;
  }
  let calculatedDays = payload.leave_type === "daily" ? Number(payload.days_count) : null;
  if (payload.leave_type === "daily" && (!calculatedDays || calculatedDays <= 0)) {
    if (payload.start_date && payload.end_date) {
      try {
        const s = new Date(payload.start_date.split("T")[0]).getTime();
        const e = new Date(payload.end_date.split("T")[0]).getTime();
        const diffDays = Math.round((e - s) / (1e3 * 60 * 60 * 24)) + 1;
        calculatedDays = Math.max(1, diffDays);
      } catch {
        calculatedDays = 1;
      }
    } else {
      calculatedDays = 1;
    }
  }
  const newRequest = {
    id: newId,
    tenant_id: targetTenantId,
    personnel_id: targetPersonnelId || "p-1",
    personnel_name: targetPersonnelName,
    leave_type: payload.leave_type === "hourly" ? "hourly" : "daily",
    start_date: isoStartDate,
    end_date: isoEndDate,
    start_time: payload.leave_type === "hourly" ? payload.start_time || null : null,
    end_time: payload.leave_type === "hourly" ? payload.end_time || null : null,
    hours_count: payload.leave_type === "hourly" ? Number(payload.hours_count) || null : null,
    days_count: calculatedDays,
    reason: payload.reason || "",
    status: "pending",
    manager_note: null,
    reviewed_by: null,
    reviewed_at: null,
    date_created: nowIso
  };
  let applicantPhone = "";
  const applicantInfo = await getPersonnelFullName(targetPersonnelId || rawPId, targetPersonnelName);
  const applicantFullName = applicantInfo.fullName || targetPersonnelName;
  const applicantP = personnelData.find((p) => p.id === targetPersonnelId || p.user_id === targetPersonnelId || p.name === targetPersonnelName);
  if (applicantInfo.phone) {
    applicantPhone = applicantInfo.phone;
  } else if (applicantP?.phone) {
    applicantPhone = applicantP.phone;
  }
  const nameParts = applicantFullName.trim().split(" ");
  const fName = nameParts[0] || "\u0647\u0645\u06A9\u0627\u0631";
  const lName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "\u06AF\u0631\u0627\u0645\u06CC";
  const now2 = /* @__PURE__ */ new Date();
  const jalaliDate = now2.toLocaleDateString("fa-IR");
  const startJalali = isoStartDate ? new Date(isoStartDate).toLocaleDateString("fa-IR") : jalaliDate;
  const endJalali = isoEndDate ? new Date(isoEndDate).toLocaleDateString("fa-IR") : startJalali;
  const leaveVars = {
    name: applicantFullName,
    fullName: applicantFullName,
    user_name: applicantFullName,
    personnel_name: applicantFullName,
    applicant_name: applicantFullName,
    family: lName,
    first_name: fName,
    mobile: applicantPhone || "\u0646\u0627\u0645\u0634\u062E\u0635",
    phone: applicantPhone || "\u0646\u0627\u0645\u0634\u062E\u0635",
    request_date: jalaliDate,
    leave_type: newRequest.leave_type === "daily" ? "\u0645\u0631\u062E\u0635\u06CC \u0631\u0648\u0632\u0627\u0646\u0647" : "\u0645\u0631\u062E\u0635\u06CC \u0633\u0627\u0639\u062A\u06CC",
    days: String(newRequest.days_count || 1),
    day: String(newRequest.days_count || 1),
    count: String(newRequest.days_count || 1),
    duration: String(newRequest.leave_type === "daily" ? newRequest.days_count || 1 : newRequest.hours_count || 1),
    hours: String(newRequest.hours_count || 1),
    hour: String(newRequest.hours_count || 1),
    start_date: startJalali,
    end_date: endJalali,
    from_date: startJalali,
    to_date: endJalali,
    leave_date: startJalali,
    date: startJalali,
    start_time: newRequest.start_time || "",
    end_time: newRequest.end_time || "",
    from_time: newRequest.start_time || "",
    to_time: newRequest.end_time || "",
    reason: newRequest.reason || "-",
    description: newRequest.reason || "-"
  };
  const ps = projectSettingsData || {};
  if (!ps.dayli_leave_request_pattern && !ps.daily_leave_request_pattern && !ps.hourly_leave_request_pattern && directusUrl && directusAdminToken) {
    try {
      const resp = await directusFetch("/items/project_settings").catch(() => null);
      if (resp?.data) {
        const item = Array.isArray(resp.data) ? resp.data[0] : resp.data;
        if (item) updateProjectSettingsData(item);
      }
    } catch {
    }
  }
  const latestPs = projectSettingsData || {};
  const dailyPattern = latestPs.dayli_leave_request_pattern || latestPs.daily_leave_request_pattern || latestPs.dayli_leave_pattern || latestPs.daily_leave_pattern || "";
  const hourlyPattern = latestPs.hourly_leave_request_pattern || latestPs.hourly_leave_pattern || "";
  const patternToUse = newRequest.leave_type === "daily" ? dailyPattern : hourlyPattern;
  if (patternToUse) {
    if (applicantPhone) {
      sendIppanelSmsPattern(applicantPhone, patternToUse, leaveVars).catch((e) => console.warn("Leave request SMS to applicant error:", e.message));
    }
    sendTenantAdminsSmsPattern(targetTenantId, patternToUse, leaveVars, {
      excludePhones: [applicantPhone]
    }).catch((e) => console.warn("Leave request SMS to admin error:", e.message));
  } else {
    console.warn(`[Leave Request SMS] No SMS pattern configured for leave type: ${newRequest.leave_type}`);
  }
  if (directusUrl && directusAdminToken) {
    try {
      const safeDirectusPersonnelId = await getSafeDirectusPersonnelForeignKey(targetPersonnelId, targetPersonnelName);
      const directusLeavePayload = {
        personnel_id: safeDirectusPersonnelId,
        personnel_name: targetPersonnelName,
        leave_type: payload.leave_type === "hourly" ? "hourly" : "daily",
        start_date: isoStartDate,
        end_date: isoEndDate,
        start_time: payload.leave_type === "hourly" ? payload.start_time || null : null,
        end_time: payload.leave_type === "hourly" ? payload.end_time || null : null,
        hours_count: payload.leave_type === "hourly" ? Number(payload.hours_count) || null : null,
        days_count: calculatedDays,
        reason: payload.reason || "",
        status: "pending",
        manager_note: null,
        reviewed_by: null,
        reviewed_at: null,
        date_created: nowIso,
        tenant_id: resolvedTenantNum
      };
      let created = await directusFetch("/items/leave_requests", {
        method: "POST",
        body: JSON.stringify(directusLeavePayload)
      }).catch(async (primaryErr) => {
        if (primaryErr.message && (primaryErr.message.includes("foreign key") || primaryErr.message.includes("FOREIGN_KEY") || primaryErr.message.includes("personnel_id") || primaryErr.message.includes("tenant_id"))) {
          return await directusFetch("/items/leave_requests", {
            method: "POST",
            body: JSON.stringify({
              ...directusLeavePayload,
              personnel_id: null,
              tenant_id: 1
            })
          });
        }
        throw primaryErr;
      });
      if (created?.data) {
        const savedItem = {
          ...created.data,
          id: String(created.data.id),
          personnel_id: targetPersonnelId || (created.data.personnel_id ? String(created.data.personnel_id) : "p-1"),
          personnel_name: created.data.personnel_name || targetPersonnelName,
          tenant_id: targetTenantId
        };
        leaveRequestsData.unshift(savedItem);
        return res.status(201).json(savedItem);
      }
    } catch (err) {
      if (err.message !== "DIRECTUS_UNREACHABLE_FALLBACK" && err.message !== "DIRECTUS_URL_NOT_CONFIGURED") {
        console.warn("[Directus leave_requests POST notice, using local fallback]:", err.message);
      }
    }
  }
  leaveRequestsData.unshift(newRequest);
  res.status(201).json(newRequest);
});
router7.patch("/api/leave-requests/:id", async (req, res) => {
  const { id } = req.params;
  const { status, manager_note } = req.body;
  const { userName, isAdmin, userRole, personnelId, userId } = getRequestUser(req);
  const currentP = personnelData.find((p) => p.id === personnelId);
  const canApprove = isAdmin || userRole === "admin" || userRole === "sales_manager" || currentP?.permissions?.can_approve_leaves;
  if (!canApprove) {
    return res.status(403).json({ error: "\u0634\u0645\u0627 \u062F\u0633\u062A\u0631\u0633\u06CC \u0644\u0627\u0632\u0645 \u0628\u0631\u0627\u06CC \u062A\u0627\u06CC\u06CC\u062F \u06CC\u0627 \u0631\u062F \u062F\u0631\u062E\u0648\u0627\u0633\u062A\u200C\u0647\u0627\u06CC \u0645\u0631\u062E\u0635\u06CC \u0631\u0627 \u0646\u062F\u0627\u0631\u06CC\u062F." });
  }
  const reviewerInfo = await getPersonnelFullName(personnelId || userId, userName);
  const reviewerFullName = reviewerInfo.fullName || userName || "\u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645";
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const updatePayload = {
    status: status || "pending",
    manager_note: manager_note || null,
    reviewed_by: reviewerFullName,
    reviewed_at: nowIso
  };
  let targetReq = leaveRequestsData.find((r) => String(r.id) === String(id));
  if (!targetReq && directusUrl && directusAdminToken) {
    try {
      const dReq = await directusFetch(`/items/leave_requests/${id}`).catch(() => null);
      if (dReq?.data) {
        targetReq = {
          ...dReq.data,
          id: String(dReq.data.id),
          personnel_id: typeof dReq.data.personnel_id === "object" && dReq.data.personnel_id !== null ? dReq.data.personnel_id.id : String(dReq.data.personnel_id || ""),
          personnel_name: dReq.data.personnel_name || "\u06A9\u0627\u0631\u0634\u0646\u0627\u0633 \u0634\u0631\u06A9\u062A"
        };
      }
    } catch {
    }
  }
  const nextStatus = status || "pending";
  const statusChanged = targetReq ? targetReq.status !== nextStatus : false;
  if (targetReq && statusChanged) {
    const applicantInfo = await getPersonnelFullName(targetReq.personnel_id, targetReq.personnel_name);
    const applicantFullName = applicantInfo.fullName || targetReq.personnel_name;
    const applicantP = personnelData.find((p) => p.id === targetReq.personnel_id || p.user_id === targetReq.personnel_id || p.name === targetReq.personnel_name);
    const applicantPhone = applicantInfo.phone || applicantP?.phone;
    const targetPs = projectSettingsData || {};
    let patternToUse = "";
    if (status === "approved") {
      const dailyAccept = targetPs.dayli_leave_accept_pattern || targetPs.daily_leave_accept_pattern || "";
      const hourlyAccept = targetPs.hourly_leave_accept_pattern || "";
      patternToUse = targetReq.leave_type === "daily" ? dailyAccept : hourlyAccept;
    } else if (status === "rejected") {
      const dailyReject = targetPs.dayli_leave_reject_pattern || targetPs.daily_leave_reject_pattern || "";
      const hourlyReject = targetPs.hourly_leave_reject_pattern || "";
      patternToUse = targetReq.leave_type === "daily" ? dailyReject : hourlyReject;
    }
    if (patternToUse) {
      const nameParts = (applicantFullName || "").trim().split(" ");
      const fName = nameParts[0] || "\u0647\u0645\u06A9\u0627\u0631";
      const lName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "\u06AF\u0631\u0627\u0645\u06CC";
      const now2 = /* @__PURE__ */ new Date();
      const jalaliDate = now2.toLocaleDateString("fa-IR");
      const startJalali = targetReq.start_date ? new Date(targetReq.start_date).toLocaleDateString("fa-IR") : jalaliDate;
      const endJalali = targetReq.end_date ? new Date(targetReq.end_date).toLocaleDateString("fa-IR") : startJalali;
      const statusVars = {
        name: applicantFullName,
        fullName: applicantFullName,
        user_name: applicantFullName,
        personnel_name: applicantFullName,
        applicant_name: applicantFullName,
        family: lName,
        first_name: fName,
        mobile: applicantPhone || "\u0646\u0627\u0645\u0634\u062E\u0635",
        phone: applicantPhone || "\u0646\u0627\u0645\u0634\u062E\u0635",
        request_date: targetReq.date_created ? new Date(targetReq.date_created).toLocaleDateString("fa-IR") : jalaliDate,
        leave_type: targetReq.leave_type === "daily" ? "\u0645\u0631\u062E\u0635\u06CC \u0631\u0648\u0632\u0627\u0646\u0647" : "\u0645\u0631\u062E\u0635\u06CC \u0633\u0627\u0639\u062A\u06CC",
        leave_date: startJalali,
        start_date: startJalali,
        end_date: endJalali,
        from_date: startJalali,
        to_date: endJalali,
        date: startJalali,
        start_time: targetReq.start_time || "",
        end_time: targetReq.end_time || "",
        from_time: targetReq.start_time || "",
        to_time: targetReq.end_time || "",
        days: String(targetReq.days_count || 1),
        day: String(targetReq.days_count || 1),
        count: String(targetReq.days_count || 1),
        duration: String(targetReq.leave_type === "daily" ? targetReq.days_count || 1 : targetReq.hours_count || 1),
        hours: String(targetReq.hours_count || 1),
        hour: String(targetReq.hours_count || 1),
        manager_note: manager_note || (status === "approved" ? "\u062A\u0627\u06CC\u06CC\u062F \u0634\u062F" : "\u0631\u062F \u0634\u062F"),
        reviewed_by: reviewerFullName
      };
      if (applicantPhone) {
        sendIppanelSmsPattern(applicantPhone, patternToUse, statusVars).catch((e) => console.warn("Leave request status SMS error:", e.message));
      }
    }
  }
  if (directusUrl && directusAdminToken) {
    try {
      const updated = await directusFetch(`/items/leave_requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updatePayload)
      });
      if (updated?.data) {
        const itemWithStrId = {
          ...updated.data,
          id: String(updated.data.id),
          personnel_name: updated.data.personnel_name || targetReq?.personnel_name,
          personnel_id: targetReq?.personnel_id || (updated.data.personnel_id ? String(updated.data.personnel_id) : "p-1"),
          tenant_id: targetReq?.tenant_id || "default"
        };
        const idx2 = leaveRequestsData.findIndex((r) => String(r.id) === String(id));
        if (idx2 >= 0) leaveRequestsData[idx2] = { ...leaveRequestsData[idx2], ...itemWithStrId };
        else leaveRequestsData.unshift(itemWithStrId);
        return res.json(itemWithStrId);
      }
    } catch (err) {
      console.warn("Directus leave_requests PATCH error:", err.message);
    }
  }
  const idx = leaveRequestsData.findIndex((r) => String(r.id) === String(id));
  if (idx >= 0) {
    leaveRequestsData[idx] = { ...leaveRequestsData[idx], ...updatePayload };
    return res.json(leaveRequestsData[idx]);
  }
  res.status(404).json({ error: "\u062F\u0631\u062E\u0648\u0627\u0633\u062A \u0645\u0631\u062E\u0635\u06CC \u06CC\u0627\u0641\u062A \u0646\u0634\u062F" });
});
router7.delete("/api/leave-requests/:id", async (req, res) => {
  const { id } = req.params;
  const { userId, personnelId, isAdmin } = getRequestUser(req);
  if (directusUrl && directusAdminToken) {
    try {
      await directusFetch(`/items/leave_requests/${id}`, { method: "DELETE" });
    } catch {
    }
  }
  const idx = leaveRequestsData.findIndex((r) => r.id === id);
  if (idx >= 0) {
    const item = leaveRequestsData[idx];
    if (!isAdmin && item.personnel_id !== personnelId && item.personnel_id !== userId) {
      return res.status(403).json({ error: "\u0634\u0645\u0627 \u0627\u062C\u0627\u0632\u0647 \u062D\u0630\u0641 \u0627\u06CC\u0646 \u062F\u0631\u062E\u0648\u0627\u0633\u062A \u0631\u0627 \u0646\u062F\u0627\u0631\u06CC\u062F." });
    }
    leaveRequestsData.splice(idx, 1);
    return res.json({ success: true });
  }
  res.json({ success: true });
});
var leaveRequests_routes_default = router7;

// server/routes/advanceRequests.routes.ts
import { Router as Router8 } from "express";
import crypto11 from "crypto";
var router8 = Router8();
var getAdvanceRequestsHandler = async (req, res) => {
  const { userId, personnelId, isAdmin, userName, tenantId } = getRequestUser(req);
  let list = [];
  if (directusUrl && directusAdminToken) {
    try {
      const resp = await directusFetchAllPages("/items/advance_requests?sort=-date_created");
      if (resp && Array.isArray(resp.data)) {
        list = resp.data.map((r) => ({
          ...r,
          id: String(r.id),
          personnel_id: typeof r.personnel_id === "object" && r.personnel_id !== null ? String(r.personnel_id.id) : String(r.personnel_id || ""),
          personnel_name: r.personnel_name || (typeof r.personnel_id === "object" && r.personnel_id !== null ? r.personnel_id.name || r.personnel_id.first_name : "\u06A9\u0627\u0631\u0634\u0646\u0627\u0633 \u0634\u0631\u06A9\u062A")
        }));
      }
    } catch (err) {
      console.warn("Directus advance_requests fetch warning:", err.message);
    }
  } else {
    list = [...advanceRequestsData];
  }
  if (tenantId && tenantId !== "all") {
    list = list.filter((r) => {
      if (!r.tenant_id) return true;
      return matchesTenant(r.tenant_id, tenantId) || matchesTenant(r.tenant_id, "1") || matchesTenant(r.tenant_id, "default");
    });
  }
  if (!isAdmin) {
    const normUser = normalizePersianString(userName);
    const cleanPId = personnelId ? String(personnelId).trim().toLowerCase() : "";
    const rawUid = cleanPId.replace(/^p-/, "");
    const cleanUId = userId ? String(userId).trim().toLowerCase() : "";
    list = list.filter((r) => {
      const rPId = String(r.personnel_id || "").trim().toLowerCase();
      const rawRPId = rPId.replace(/^p-/, "");
      const normPName = normalizePersianString(r.personnel_name);
      const matchName = normUser && normPName && (normPName === normUser || normPName.includes(normUser) || normUser.includes(normPName));
      return cleanPId && (rPId === cleanPId || rawRPId === rawUid) || cleanUId && (rPId === cleanUId || rawRPId === rawUid) || Boolean(matchName);
    });
  }
  res.json(list);
};
router8.get("/api/advance-requests", getAdvanceRequestsHandler);
router8.get("/advance-requests", getAdvanceRequestsHandler);
router8.post("/api/advance-requests", async (req, res) => {
  const payload = req.body;
  const { userId, personnelId, userName, tenantId } = getRequestUser(req);
  const newId = crypto11.randomUUID();
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const rawPId = payload.personnel_id || personnelId || userId;
  const resolved = await resolvePersonnelId(rawPId, payload.personnel_name || userName);
  let targetPersonnelId = resolved.personnelId;
  let targetPersonnelName = resolved.personnelName || payload.personnel_name || userName || "\u06A9\u0627\u0631\u0634\u0646\u0627\u0633 \u0634\u0631\u06A9\u062A";
  if (!targetPersonnelId) {
    const pMatch = personnelData.find((p) => p.name === targetPersonnelName || p.id === rawPId) || personnelData[0];
    if (pMatch?.id) targetPersonnelId = pMatch.id;
  }
  const targetTenantId = payload.tenant_id || tenantId || "default";
  const resolvedTenantNum = resolveDirectusTenantId(targetTenantId);
  let isoNeededDate = null;
  if (payload.needed_date) {
    isoNeededDate = payload.needed_date.includes("T") ? payload.needed_date : `${payload.needed_date}T00:00:00.000Z`;
  }
  const newRequest = {
    id: newId,
    tenant_id: targetTenantId,
    personnel_id: targetPersonnelId || "p-1",
    personnel_name: targetPersonnelName,
    amount: Number(payload.amount) || 0,
    target_month: payload.target_month || "",
    needed_date: isoNeededDate,
    reason: payload.reason || "",
    bank_card_number: payload.bank_card_number || null,
    iban: payload.iban || null,
    status: "pending",
    approved_amount: null,
    manager_note: null,
    reviewed_by: null,
    reviewed_at: null,
    date_created: nowIso
  };
  let applicantPhone = "";
  const applicantInfo = await getPersonnelFullName(targetPersonnelId || rawPId, targetPersonnelName);
  const applicantFullName = applicantInfo.fullName || targetPersonnelName;
  const applicantP = personnelData.find((p) => p.id === targetPersonnelId || p.user_id === targetPersonnelId || p.name === targetPersonnelName);
  if (applicantInfo.phone) {
    applicantPhone = applicantInfo.phone;
  } else if (applicantP?.phone) {
    applicantPhone = applicantP.phone;
  }
  if (projectSettingsData.addvance_request_pattern) {
    const nameParts = applicantFullName.trim().split(" ");
    const fName = nameParts[0] || "\u0647\u0645\u06A9\u0627\u0631";
    const lName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "\u06AF\u0631\u0627\u0645\u06CC";
    const now2 = /* @__PURE__ */ new Date();
    const jalaliDate = now2.toLocaleDateString("fa-IR");
    const amountStr = String(newRequest.amount || 0);
    const advVars = {
      name: applicantFullName,
      fullName: applicantFullName,
      user_name: applicantFullName,
      personnel_name: applicantFullName,
      family: lName,
      first_name: fName,
      mobile: applicantPhone || "\u0646\u0627\u0645\u0634\u062E\u0635",
      phone: applicantPhone || "\u0646\u0627\u0645\u0634\u062E\u0635",
      amount: amountStr,
      requested_amount: amountStr,
      target_month: newRequest.target_month || "-",
      needed_date: payload.needed_date || jalaliDate,
      reason: newRequest.reason || "-"
    };
    if (applicantPhone) {
      sendIppanelSmsPattern(applicantPhone, projectSettingsData.addvance_request_pattern, advVars).catch((e) => console.warn("Advance request SMS to applicant error:", e.message));
    }
    sendTenantAdminsSmsPattern(targetTenantId, projectSettingsData.addvance_request_pattern, advVars, {
      excludePhones: [applicantPhone]
    }).catch((e) => console.warn("Advance request SMS to admin error:", e.message));
  }
  if (directusUrl && directusAdminToken) {
    try {
      const safeDirectusPersonnelId = await getSafeDirectusPersonnelForeignKey(targetPersonnelId, targetPersonnelName);
      const directusAdvancePayload = {
        personnel_id: safeDirectusPersonnelId,
        personnel_name: targetPersonnelName,
        amount: Number(payload.amount) || 0,
        target_month: payload.target_month || "",
        needed_date: isoNeededDate,
        reason: payload.reason || "",
        bank_card_number: payload.bank_card_number || null,
        iban: payload.iban || null,
        status: "pending",
        approved_amount: null,
        manager_note: null,
        reviewed_by: null,
        reviewed_at: null,
        date_created: nowIso,
        tenant_id: resolvedTenantNum
      };
      let created = await directusFetch("/items/advance_requests", {
        method: "POST",
        body: JSON.stringify(directusAdvancePayload)
      }).catch(async (primaryErr) => {
        if (primaryErr.message && (primaryErr.message.includes("foreign key") || primaryErr.message.includes("FOREIGN_KEY") || primaryErr.message.includes("personnel_id") || primaryErr.message.includes("tenant_id"))) {
          return await directusFetch("/items/advance_requests", {
            method: "POST",
            body: JSON.stringify({
              ...directusAdvancePayload,
              personnel_id: null,
              tenant_id: 1
            })
          });
        }
        throw primaryErr;
      });
      if (created?.data) {
        const savedItem = {
          ...created.data,
          id: String(created.data.id),
          personnel_id: targetPersonnelId || (created.data.personnel_id ? String(created.data.personnel_id) : "p-1"),
          personnel_name: created.data.personnel_name || targetPersonnelName,
          tenant_id: targetTenantId
        };
        advanceRequestsData.unshift(savedItem);
        return res.status(201).json(savedItem);
      }
    } catch (err) {
      if (err.message !== "DIRECTUS_UNREACHABLE_FALLBACK" && err.message !== "DIRECTUS_URL_NOT_CONFIGURED") {
        console.warn("[Directus advance_requests POST notice, using local fallback]:", err.message);
      }
    }
  }
  advanceRequestsData.unshift(newRequest);
  res.status(201).json(newRequest);
});
router8.patch("/api/advance-requests/:id", async (req, res) => {
  const { id } = req.params;
  const { status, approved_amount, manager_note } = req.body;
  const { userName, isAdmin, userRole, personnelId, userId } = getRequestUser(req);
  const currentP = personnelData.find((p) => p.id === personnelId);
  const canApprove = isAdmin || userRole === "admin" || userRole === "sales_manager" || currentP?.permissions?.can_approve_advances;
  if (!canApprove) {
    return res.status(403).json({ error: "\u0634\u0645\u0627 \u062F\u0633\u062A\u0631\u0633\u06CC \u0644\u0627\u0632\u0645 \u0628\u0631\u0627\u06CC \u062A\u0627\u06CC\u06CC\u062F \u06CC\u0627 \u0631\u062F \u062F\u0631\u062E\u0648\u0627\u0633\u062A\u200C\u0647\u0627\u06CC \u0645\u0633\u0627\u0639\u062F\u0647 \u0631\u0627 \u0646\u062F\u0627\u0631\u06CC\u062F." });
  }
  const reviewerInfo = await getPersonnelFullName(personnelId || userId, userName);
  const reviewerFullName = reviewerInfo.fullName || userName || "\u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645";
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const updatePayload = {
    status: status || "pending",
    approved_amount: approved_amount !== void 0 ? Number(approved_amount) : null,
    manager_note: manager_note || null,
    reviewed_by: reviewerFullName,
    reviewed_at: nowIso
  };
  let targetReq = advanceRequestsData.find((r) => String(r.id) === String(id));
  if (!targetReq && directusUrl && directusAdminToken) {
    try {
      const dReq = await directusFetch(`/items/advance_requests/${id}`).catch(() => null);
      if (dReq?.data) {
        targetReq = {
          ...dReq.data,
          id: String(dReq.data.id),
          personnel_id: typeof dReq.data.personnel_id === "object" && dReq.data.personnel_id !== null ? dReq.data.personnel_id.id : String(dReq.data.personnel_id || ""),
          personnel_name: dReq.data.personnel_name || "\u06A9\u0627\u0631\u0634\u0646\u0627\u0633 \u0634\u0631\u06A9\u062A"
        };
      }
    } catch {
    }
  }
  const nextStatus = status || "pending";
  const statusChanged = targetReq ? targetReq.status !== nextStatus : false;
  if (targetReq && statusChanged) {
    const applicantInfo = await getPersonnelFullName(targetReq.personnel_id, targetReq.personnel_name);
    const applicantFullName = applicantInfo.fullName || targetReq.personnel_name;
    const applicantP = personnelData.find((p) => p.id === targetReq.personnel_id || p.user_id === targetReq.personnel_id || p.name === targetReq.personnel_name);
    const applicantPhone = applicantInfo.phone || applicantP?.phone;
    let patternToUse = "";
    if (status === "approved") {
      patternToUse = projectSettingsData.addvance_accept_pattern || "";
    } else if (status === "rejected") {
      patternToUse = projectSettingsData.addvance_reject_pattern || "";
    }
    if (patternToUse) {
      const nameParts = (applicantFullName || "").trim().split(" ");
      const fName = nameParts[0] || "\u0647\u0645\u06A9\u0627\u0631";
      const lName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "\u06AF\u0631\u0627\u0645\u06CC";
      const now2 = /* @__PURE__ */ new Date();
      const jalaliDate = now2.toLocaleDateString("fa-IR");
      const statusVars = {
        name: applicantFullName,
        fullName: applicantFullName,
        user_name: applicantFullName,
        personnel_name: applicantFullName,
        family: lName,
        first_name: fName,
        mobile: applicantPhone || "\u0646\u0627\u0645\u0634\u062E\u0635",
        phone: applicantPhone || "\u0646\u0627\u0645\u0634\u062E\u0635",
        requested_amount: String(targetReq.amount || 0),
        approved_amount: String(approved_amount ?? targetReq.amount ?? 0),
        amount: String(approved_amount ?? targetReq.amount ?? 0),
        target_month: targetReq.target_month || "-",
        needed_date: targetReq.needed_date || jalaliDate,
        manager_note: manager_note || (status === "approved" ? "\u062A\u0627\u06CC\u06CC\u062F \u0634\u062F" : "\u0631\u062F \u0634\u062F"),
        reviewed_by: reviewerFullName
      };
      if (applicantPhone) {
        sendIppanelSmsPattern(applicantPhone, patternToUse, statusVars).catch((e) => console.warn("Advance request status SMS error:", e.message));
      }
      sendTenantAdminsSmsPattern(targetReq.tenant_id || "default", patternToUse, statusVars, {
        excludePhones: [applicantPhone]
      }).catch((e) => console.warn("Advance status SMS to admin warning:", e.message));
    }
  }
  if (directusUrl && directusAdminToken) {
    try {
      const updated = await directusFetch(`/items/advance_requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updatePayload)
      });
      if (updated?.data) {
        const itemWithStrId = {
          ...updated.data,
          id: String(updated.data.id),
          personnel_name: updated.data.personnel_name || targetReq?.personnel_name,
          personnel_id: targetReq?.personnel_id || (updated.data.personnel_id ? String(updated.data.personnel_id) : "p-1"),
          tenant_id: targetReq?.tenant_id || "default"
        };
        const idx2 = advanceRequestsData.findIndex((r) => String(r.id) === String(id));
        if (idx2 >= 0) advanceRequestsData[idx2] = { ...advanceRequestsData[idx2], ...itemWithStrId };
        else advanceRequestsData.unshift(itemWithStrId);
        return res.json(itemWithStrId);
      }
    } catch (err) {
      console.warn("Directus advance_requests PATCH error:", err.message);
    }
  }
  const idx = advanceRequestsData.findIndex((r) => String(r.id) === String(id));
  if (idx >= 0) {
    advanceRequestsData[idx] = { ...advanceRequestsData[idx], ...updatePayload };
    return res.json(advanceRequestsData[idx]);
  }
  res.status(404).json({ error: "\u062F\u0631\u062E\u0648\u0627\u0633\u062A \u0645\u0633\u0627\u0639\u062F\u0647 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F" });
});
router8.delete("/api/advance-requests/:id", async (req, res) => {
  const { id } = req.params;
  const { userId, personnelId, isAdmin } = getRequestUser(req);
  if (directusUrl && directusAdminToken) {
    try {
      await directusFetch(`/items/advance_requests/${id}`, { method: "DELETE" });
    } catch {
    }
  }
  const idx = advanceRequestsData.findIndex((r) => r.id === id);
  if (idx >= 0) {
    const item = advanceRequestsData[idx];
    if (!isAdmin && item.personnel_id !== personnelId && item.personnel_id !== userId) {
      return res.status(403).json({ error: "\u0634\u0645\u0627 \u0627\u062C\u0627\u0632\u0647 \u062D\u0630\u0641 \u0627\u06CC\u0646 \u062F\u0631\u062E\u0648\u0627\u0633\u062A \u0631\u0627 \u0646\u062F\u0627\u0631\u06CC\u062F." });
    }
    advanceRequestsData.splice(idx, 1);
    return res.json({ success: true });
  }
  res.json({ success: true });
});
var advanceRequests_routes_default = router8;

// server/routes/tenants.routes.ts
import { Router as Router9 } from "express";
var router9 = Router9();
router9.get("/", async (req, res) => {
  if (directusUrl && directusAdminToken) {
    try {
      const resp = await directusFetch("/items/tenants?sort=id");
      if (resp?.data && Array.isArray(resp.data)) {
        if (resp.data.length === 0) {
          await ensureDirectusTenants();
        } else {
          const mappedTenants = resp.data.map((t) => ({
            id: String(t.id),
            name: t.name || "\u0633\u0627\u0632\u0645\u0627\u0646 " + t.id,
            slug: t.slug || "org-" + t.id,
            logo: t.logo || "",
            description: t.description || "",
            phone: t.phone || "",
            address: t.address || "",
            status: t.status === "inactive" ? "inactive" : "active",
            date_created: t.date_created || (/* @__PURE__ */ new Date()).toISOString()
          }));
          setTenantsData(mappedTenants);
        }
      }
    } catch {
    }
  }
  res.json(tenantsData);
});
router9.post("/", async (req, res) => {
  const { isAdmin } = getRequestUser(req);
  if (!isAdmin) {
    return res.status(403).json({ error: "FORBIDDEN", message: "\u0641\u0642\u0637 \u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645 \u0645\u062C\u0627\u0632 \u0628\u0647 \u0627\u06CC\u062C\u0627\u062F \u0633\u0627\u0632\u0645\u0627\u0646 \u062C\u062F\u06CC\u062F \u0627\u0633\u062A." });
  }
  const { name, slug, phone, address, logo, description, status } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "\u0646\u0627\u0645 \u0633\u0627\u0632\u0645\u0627\u0646 \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A." });
  }
  const cleanName = String(name).trim();
  const cleanSlug = slug ? String(slug).trim() : "org-" + Date.now();
  const directusBody = {
    name: cleanName,
    slug: cleanSlug,
    description: (description || address || "").trim(),
    status: status || "active"
  };
  if (logo && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(logo)) {
    directusBody.logo = logo;
  }
  if (directusUrl && directusAdminToken) {
    try {
      const created = await directusFetch("/items/tenants", {
        method: "POST",
        body: JSON.stringify(directusBody)
      });
      if (created?.data) {
        const item = {
          id: String(created.data.id),
          name: created.data.name,
          slug: created.data.slug,
          phone: phone ? String(phone).trim() : "",
          address: address ? String(address).trim() : "",
          description: created.data.description || "",
          logo: created.data.logo || "",
          status: created.data.status || "active",
          date_created: created.data.date_created || (/* @__PURE__ */ new Date()).toISOString()
        };
        tenantsData.push(item);
        return res.status(201).json(item);
      }
    } catch (e) {
      console.warn("Directus tenants save error:", e.message);
    }
  }
  const newTenant = {
    id: String(Date.now()),
    name: cleanName,
    slug: cleanSlug,
    phone: phone ? String(phone).trim() : "",
    address: address ? String(address).trim() : "",
    description: (description || "").trim(),
    logo: logo || "",
    status: status || "active",
    date_created: (/* @__PURE__ */ new Date()).toISOString()
  };
  tenantsData.push(newTenant);
  res.status(201).json(newTenant);
});
router9.patch("/:id", async (req, res) => {
  const { isAdmin } = getRequestUser(req);
  if (!isAdmin) {
    return res.status(403).json({ error: "FORBIDDEN", message: "\u0641\u0642\u0637 \u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645 \u0645\u062C\u0627\u0632 \u0628\u0647 \u0648\u06CC\u0631\u0627\u06CC\u0634 \u0633\u0627\u0632\u0645\u0627\u0646 \u0627\u0633\u062A." });
  }
  const { id } = req.params;
  const patch = req.body;
  const idx = tenantsData.findIndex((t) => String(t.id) === String(id));
  if (idx !== -1) {
    tenantsData[idx] = { ...tenantsData[idx], ...patch };
  }
  if (directusUrl && directusAdminToken) {
    try {
      const directusPatch = {};
      if (patch.name !== void 0) directusPatch.name = String(patch.name).trim();
      if (patch.slug !== void 0) directusPatch.slug = String(patch.slug).trim();
      if (patch.description !== void 0) directusPatch.description = String(patch.description).trim();
      if (patch.status !== void 0) directusPatch.status = patch.status;
      if (patch.logo && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patch.logo)) {
        directusPatch.logo = patch.logo;
      }
      const patched = await directusFetch(`/items/tenants/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(directusPatch)
      });
      if (patched?.data) {
        const item = {
          ...tenantsData[idx],
          ...patched.data,
          id: String(patched.data.id)
        };
        if (idx !== -1) tenantsData[idx] = item;
        return res.json(item);
      }
    } catch (e) {
      console.warn("Directus tenant patch error:", e.message);
    }
  }
  if (idx === -1) return res.status(404).json({ error: "\u0633\u0627\u0632\u0645\u0627\u0646 \u0645\u0648\u0631\u062F \u0646\u0638\u0631 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." });
  res.json(tenantsData[idx]);
});
router9.delete("/:id", async (req, res) => {
  const { isAdmin } = getRequestUser(req);
  if (!isAdmin) {
    return res.status(403).json({ error: "FORBIDDEN", message: "\u0641\u0642\u0637 \u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645 \u0645\u062C\u0627\u0632 \u0628\u0647 \u062D\u0630\u0641 \u0633\u0627\u0632\u0645\u0627\u0646 \u0627\u0633\u062A." });
  }
  const { id } = req.params;
  if (id === "default" || id === "1") {
    return res.status(400).json({ error: "\u0633\u0627\u0632\u0645\u0627\u0646 \u067E\u06CC\u0634\u200C\u0641\u0631\u0636 \u0633\u06CC\u0633\u062A\u0645 \u0642\u0627\u0628\u0644 \u062D\u0630\u0641 \u0646\u06CC\u0633\u062A." });
  }
  setTenantsData(tenantsData.filter((t) => String(t.id) !== String(id)));
  if (directusUrl && directusAdminToken) {
    try {
      await directusFetch(`/items/tenants/${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch (e) {
      console.warn("Directus tenant delete error:", e.message);
    }
  }
  res.json({ success: true });
});
var tenants_routes_default = router9;

// server/routes/adminReports.routes.ts
import { Router as Router10 } from "express";
import crypto12 from "crypto";
var router10 = Router10();
function formatHourlyLogsForDb(hourlyLogs) {
  if (!hourlyLogs) return null;
  if (Array.isArray(hourlyLogs)) {
    return hourlyLogs.length > 0 ? hourlyLogs : null;
  }
  if (typeof hourlyLogs === "object" && hourlyLogs !== null) {
    return hourlyLogs;
  }
  if (typeof hourlyLogs === "string") {
    const trimmed = hourlyLogs.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.length > 0 ? parsed : null;
      if (typeof parsed === "object" && parsed !== null) return parsed;
      return null;
    } catch {
      return null;
    }
  }
  return null;
}
function normalizeReport(r) {
  let hourly = r.hourly_logs;
  if (typeof hourly === "string" && (hourly.startsWith("[") || hourly.startsWith("{"))) {
    try {
      hourly = JSON.parse(hourly);
    } catch {
    }
  }
  if (!hourly && r.tasks_summary && r.tasks_summary.includes("\u0633\u0627\u0639\u062A")) {
    const lines = r.tasks_summary.split("\n");
    const parsed = [];
    lines.forEach((line) => {
      const match = line.match(/(?:•\s*)?(ساعت\s*[\d\u06F0-\u06F9]+\s*(?:الی|تا)\s*[\d\u06F0-\u06F9]+)\s*[:：]\s*(.*)/i);
      if (match) {
        parsed.push({ slot: match[1].trim(), activity: match[2].trim() });
      }
    });
    if (parsed.length > 0) {
      hourly = parsed;
    }
  }
  return {
    ...r,
    hourly_logs: Array.isArray(hourly) ? hourly : null
  };
}
var getHandler = async (req, res) => {
  const reqUser = getRequestUser(req);
  const { userId, personnelId, isAdmin, userName, tenantId, reportViewScope, visibleReportPersonnelIds } = reqUser;
  if (directusUrl && directusAdminToken) {
    try {
      const result = await directusFetchAllPages("/items/administrative_reports?sort=-report_date");
      if (result && Array.isArray(result.data)) {
        let reports = result.data.map(normalizeReport);
        if (tenantId && tenantId !== "all") {
          reports = reports.filter((r) => matchesTenant(r.tenant_id, tenantId));
        }
        if (!isAdmin) {
          const scope = reportViewScope || "own_only";
          if (scope === "own_only") {
            reports = reports.filter(
              (r) => r.personnel_id === personnelId || r.personnel_id === userId || userName && r.personnel_name === userName
            );
          } else if (scope === "specific_personnel") {
            const allowedIds = new Set([
              personnelId,
              userId,
              ...visibleReportPersonnelIds || []
            ].map(String));
            reports = reports.filter(
              (r) => allowedIds.has(String(r.personnel_id)) || userName && r.personnel_name === userName
            );
          }
        }
        return res.json(reports);
      }
    } catch (e) {
      return res.status(502).json({ error: `\u062E\u0637\u0627 \u062F\u0631 \u062F\u0631\u06CC\u0627\u0641\u062A \u06AF\u0632\u0627\u0631\u0634\u200C\u0647\u0627\u06CC \u0627\u062F\u0627\u0631\u06CC \u0627\u0632 \u067E\u0627\u06CC\u06AF\u0627\u0647 \u062F\u0627\u062F\u0647 \u0645\u0631\u06A9\u0632\u06CC: ${e.message}` });
    }
  }
  res.json([]);
};
router10.get("/api/administrative-reports", getHandler);
router10.get("/api/admin-reports", getHandler);
var postHandler = async (req, res) => {
  const payload = req.body;
  const { userId, personnelId, userName, tenantId } = getRequestUser(req);
  const newAdmId = payload.id && typeof payload.id === "string" && payload.id.length >= 10 ? payload.id : crypto12.randomUUID();
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const rawPId = payload.personnel_id || personnelId || userId;
  const resolved = await resolvePersonnelId(rawPId, payload.personnel_name || userName);
  const targetTenantId = payload.tenant_id || tenantId || "default";
  const dbHourlyLogs = formatHourlyLogsForDb(payload.hourly_logs);
  const newReport = {
    id: newAdmId,
    tenant_id: targetTenantId,
    personnel_id: resolved.personnelId || "p-1",
    personnel_name: resolved.personnelName || payload.personnel_name || userName || "\u067E\u0631\u0633\u0646\u0644 \u0634\u0631\u06A9\u062A",
    report_date: payload.report_date || nowIso.split("T")[0],
    calls_count: Number(payload.calls_count) || 0,
    successful_contacts: Number(payload.successful_contacts) || 0,
    leads_converted: Number(payload.leads_converted) || 0,
    tasks_summary: payload.tasks_summary || "",
    challenges: payload.challenges || "",
    tomorrow_plan: payload.tomorrow_plan || "",
    hourly_logs: dbHourlyLogs,
    status: payload.status === "submitted" ? "submitted" : "draft",
    date_created: nowIso
  };
  if (directusUrl && directusAdminToken) {
    const directusReportPayload = {
      ...newReport,
      tenant_id: resolveDirectusTenantId(targetTenantId)
    };
    try {
      const created = await directusFetch("/items/administrative_reports", {
        method: "POST",
        body: JSON.stringify(directusReportPayload)
      });
      return res.status(201).json(normalizeReport(created.data || newReport));
    } catch (err) {
      const errStr = (err.message || "").toLowerCase();
      if (errStr.includes("hourly_logs") || errStr.includes("type json") || errStr.includes("syntax for type json")) {
        try {
          const { hourly_logs, ...fallbackReport } = directusReportPayload;
          const created = await directusFetch("/items/administrative_reports", {
            method: "POST",
            body: JSON.stringify(fallbackReport)
          });
          return res.status(201).json(normalizeReport({ ...created.data || fallbackReport, hourly_logs: newReport.hourly_logs }));
        } catch (fbErr) {
          console.error("Fallback admin report create error:", fbErr.message);
        }
      }
      console.error("Admin report create error:", err.message);
      return res.status(500).json({
        error: "ADMIN_REPORT_FAILED",
        message: `\u062E\u0637\u0627 \u062F\u0631 \u062B\u0628\u062A \u06AF\u0632\u0627\u0631\u0634 \u0627\u062F\u0627\u0631\u06CC \u062F\u0631 \u067E\u0627\u06CC\u06AF\u0627\u0647 \u062F\u0627\u062F\u0647 \u0645\u0631\u06A9\u0632\u06CC: ${err.message}`
      });
    }
  }
  res.status(201).json(newReport);
};
router10.post("/api/administrative-reports", postHandler);
router10.post("/api/admin-reports", postHandler);
var patchHandler = async (req, res) => {
  const { id } = req.params;
  const payload = req.body;
  const { isAdmin, isPersonnelAdmin, tenantId, userId, personnelId, userName } = getRequestUser(req);
  if (directusUrl && directusAdminToken) {
    try {
      const existingRes = await directusFetch(`/items/administrative_reports/${encodeURIComponent(id)}`).catch(() => null);
      if (existingRes?.data) {
        if (existingRes.data.status === "submitted") {
          return res.status(403).json({ error: "\u0627\u06CC\u0646 \u06AF\u0632\u0627\u0631\u0634 \u062B\u0628\u062A \u0646\u0647\u0627\u06CC\u06CC \u0634\u062F\u0647 \u0627\u0633\u062A \u0648 \u0627\u0645\u06A9\u0627\u0646 \u0648\u06CC\u0631\u0627\u06CC\u0634 \u0622\u0646 \u0648\u062C\u0648\u062F \u0646\u062F\u0627\u0631\u062F." });
        }
      }
      const updateData = {
        report_date: payload.report_date || void 0,
        calls_count: payload.calls_count !== void 0 ? Number(payload.calls_count) : void 0,
        successful_contacts: payload.successful_contacts !== void 0 ? Number(payload.successful_contacts) : void 0,
        leads_converted: payload.leads_converted !== void 0 ? Number(payload.leads_converted) : void 0,
        tasks_summary: payload.tasks_summary !== void 0 ? payload.tasks_summary : void 0,
        challenges: payload.challenges !== void 0 ? payload.challenges : void 0,
        tomorrow_plan: payload.tomorrow_plan !== void 0 ? payload.tomorrow_plan : void 0,
        hourly_logs: payload.hourly_logs !== void 0 ? formatHourlyLogsForDb(payload.hourly_logs) : void 0,
        status: payload.status || void 0,
        date_updated: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (payload.tenant_id) {
        updateData.tenant_id = resolveDirectusTenantId(payload.tenant_id);
      }
      Object.keys(updateData).forEach((k) => updateData[k] === void 0 && delete updateData[k]);
      let updatedData;
      try {
        const updated = await directusFetch(`/items/administrative_reports/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: JSON.stringify(updateData)
        });
        updatedData = updated.data || { id, ...updateData };
      } catch (patchErr) {
        const patchErrStr = (patchErr.message || "").toLowerCase();
        if (patchErrStr.includes("not found") || patchErrStr.includes("404")) {
          const targetTenantId = payload.tenant_id || tenantId || "default";
          const resolved = await resolvePersonnelId(payload.personnel_id || personnelId || userId, payload.personnel_name || userName);
          const insertPayload = {
            id,
            tenant_id: resolveDirectusTenantId(targetTenantId),
            personnel_id: resolved.personnelId || "p-1",
            personnel_name: resolved.personnelName || payload.personnel_name || userName || "\u067E\u0631\u0633\u0646\u0644 \u0634\u0631\u06A9\u062A",
            report_date: payload.report_date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
            calls_count: Number(payload.calls_count) || 0,
            successful_contacts: Number(payload.successful_contacts) || 0,
            leads_converted: Number(payload.leads_converted) || 0,
            tasks_summary: payload.tasks_summary || "",
            challenges: payload.challenges || "",
            tomorrow_plan: payload.tomorrow_plan || "",
            hourly_logs: formatHourlyLogsForDb(payload.hourly_logs),
            status: payload.status === "submitted" ? "submitted" : "draft",
            date_created: (/* @__PURE__ */ new Date()).toISOString(),
            ...updateData
          };
          const created = await directusFetch("/items/administrative_reports", {
            method: "POST",
            body: JSON.stringify(insertPayload)
          });
          return res.json(normalizeReport(created.data || insertPayload));
        } else if (patchErrStr.includes("hourly_logs") || patchErrStr.includes("type json") || patchErrStr.includes("syntax for type json")) {
          delete updateData.hourly_logs;
          const updatedFallback = await directusFetch(`/items/administrative_reports/${encodeURIComponent(id)}`, {
            method: "PATCH",
            body: JSON.stringify(updateData)
          });
          updatedData = { ...updatedFallback.data || { id, ...updateData }, hourly_logs: payload.hourly_logs };
        } else {
          throw patchErr;
        }
      }
      return res.json(normalizeReport(updatedData));
    } catch (err) {
      return res.status(500).json({ error: `\u062E\u0637\u0627 \u062F\u0631 \u0648\u06CC\u0631\u0627\u06CC\u0634 \u06AF\u0632\u0627\u0631\u0634 \u0627\u062F\u0627\u0631\u06CC: ${err.message}` });
    }
  }
  res.json(normalizeReport({ id, ...payload }));
};
router10.patch("/api/administrative-reports/:id", patchHandler);
router10.patch("/api/admin-reports/:id", patchHandler);
var adminReports_routes_default = router10;

// server/routes/analytics.routes.ts
import { Router as Router11 } from "express";
var router11 = Router11();
var analyticsCache = /* @__PURE__ */ new Map();
var ANALYTICS_CACHE_TTL = 3e4;
router11.get(["/stats", "/api/analytics/stats"], async (req, res) => {
  const { start_date, end_date, negotiator } = req.query;
  const { userId, personnelId, isAdmin, isPersonnelAdmin, canViewAllCustomers, reportViewScope, userName, tenantId } = getRequestUser(req);
  const canViewAllAnalytics = Boolean(isAdmin || isPersonnelAdmin || canViewAllCustomers || reportViewScope === "all");
  const targetNegotiator = !canViewAllAnalytics ? userName || "" : negotiator && negotiator !== "all" && negotiator !== "\u0647\u0645\u0647" ? String(negotiator) : "";
  const cacheKey = `stats_${tenantId || "all"}_${start_date || ""}_${end_date || ""}_${targetNegotiator || "all"}`;
  const now2 = Date.now();
  const cached = analyticsCache.get(cacheKey);
  if (cached && now2 - cached.timestamp < ANALYTICS_CACHE_TTL) {
    return res.json(cached.data);
  }
  if (directusUrl && directusAdminToken) {
    try {
      let filterParams = "";
      if (tenantId && tenantId !== "all") {
        const tenantNum = resolveDirectusTenantId(tenantId);
        if (tenantNum) {
          filterParams += `&filter[tenant_id][_eq]=${tenantNum}`;
        }
      }
      if (start_date) {
        filterParams += `&filter[date_created][_gte]=${encodeURIComponent(String(start_date))}`;
      }
      if (end_date) {
        filterParams += `&filter[date_created][_lte]=${encodeURIComponent(String(end_date))}`;
      }
      if (targetNegotiator) {
        filterParams += `&filter[negotiator_name][_eq]=${encodeURIComponent(targetNegotiator)}`;
      }
      const contractStatusIn = `%D9%82%D8%B1%D8%A7%D8%B1%D8%AF%D8%A7%D8%AF,%D9%82%D8%B1%D8%A7%D8%B1%D8%AF%D8%A7%D8%AF%20%2F%20%D9%81%D8%A7%DA%A9%D8%AA%D9%88%D8%B1,%D9%82%D8%B1%D8%A7%D8%B1%D8%AF%D8%A7%D8%AF%2F%D9%81%D8%A7%DA%A9%D8%AA%D9%88%D8%B1`;
      const [
        totalReportsRes,
        contractsRes,
        avgScoreRes,
        statusGroupRes,
        negotiatorGroupRes,
        negotiatorContractsRes,
        uniqueCustRes
      ] = await Promise.all([
        directusFetch(`/items/customer_reports?limit=1&meta=filter_count${filterParams}`).catch(() => null),
        directusFetch(`/items/customer_reports?aggregate[count]=*&aggregate[sum]=contract_amount&filter[negotiation_status][_in]=${contractStatusIn}${filterParams}`).catch(() => null),
        directusFetch(`/items/customer_reports?aggregate[avg]=negotiation_score${filterParams}`).catch(() => null),
        directusFetch(`/items/customer_reports?groupBy[]=negotiation_status&aggregate[count]=*&limit=-1${filterParams}`).catch(() => null),
        directusFetch(`/items/customer_reports?groupBy[]=negotiator_name&aggregate[count]=*&aggregate[sum]=contract_amount&aggregate[avg]=negotiation_score&limit=-1${filterParams}`).catch(() => null),
        directusFetch(`/items/customer_reports?groupBy[]=negotiator_name&aggregate[count]=*&limit=-1&filter[negotiation_status][_in]=${contractStatusIn}${filterParams}`).catch(() => null),
        directusFetch(`/items/customer_reports?aggregate[countDistinct]=customer_id${filterParams}`).catch(() => null)
      ]);
      const totalReports2 = totalReportsRes?.meta?.filter_count ?? totalReportsRes?.meta?.total_count ?? 0;
      let totalContracts2 = 0;
      let totalContractAmount2 = 0;
      if (contractsRes?.data && Array.isArray(contractsRes.data) && contractsRes.data.length > 0) {
        const item = contractsRes.data[0];
        totalContracts2 = Number(item.count || 0);
        totalContractAmount2 = Number(item.sum?.contract_amount || 0);
      }
      let avgScore2 = "0";
      if (avgScoreRes?.data && Array.isArray(avgScoreRes.data) && avgScoreRes.data.length > 0) {
        const rawAvg = Number(avgScoreRes.data[0]?.avg?.negotiation_score);
        if (!isNaN(rawAvg) && rawAvg > 0) {
          avgScore2 = (Math.round(rawAvg * 10) / 10).toFixed(1);
        }
      }
      const statusBreakdown2 = {};
      if (statusGroupRes?.data && Array.isArray(statusGroupRes.data)) {
        for (const row of statusGroupRes.data) {
          const st = row.negotiation_status || "\u0633\u0627\u06CC\u0631";
          const cnt = Number(row.count || 0);
          statusBreakdown2[st] = (statusBreakdown2[st] || 0) + cnt;
        }
      }
      const contractsByNegotiator = /* @__PURE__ */ new Map();
      if (negotiatorContractsRes?.data && Array.isArray(negotiatorContractsRes.data)) {
        for (const row of negotiatorContractsRes.data) {
          if (row.negotiator_name) {
            contractsByNegotiator.set(row.negotiator_name, Number(row.count || 0));
          }
        }
      }
      const personnelRanking2 = [];
      if (negotiatorGroupRes?.data && Array.isArray(negotiatorGroupRes.data)) {
        for (const row of negotiatorGroupRes.data) {
          const pName = row.negotiator_name || "\u0646\u0627\u0645\u0634\u062E\u0635";
          const repCount = Number(row.count || 0);
          const cAmount = Number(row.sum?.contract_amount || 0);
          const rawAvg = Number(row.avg?.negotiation_score || 0);
          const cCount = contractsByNegotiator.get(pName) || 0;
          personnelRanking2.push({
            personnelName: pName,
            reportsCount: repCount,
            contractsCount: cCount,
            totalAmount: cAmount,
            avgScore: rawAvg > 0 ? (Math.round(rawAvg * 10) / 10).toFixed(1) : "0"
          });
        }
      }
      let totalUniqueCustomers = 0;
      if (uniqueCustRes?.data && Array.isArray(uniqueCustRes.data) && uniqueCustRes.data.length > 0) {
        const cDistinct = uniqueCustRes.data[0]?.countDistinct?.customer_id;
        if (cDistinct !== void 0 && cDistinct !== null) {
          totalUniqueCustomers = Number(cDistinct);
        }
      }
      if (!totalUniqueCustomers) {
        totalUniqueCustomers = totalReports2;
      }
      const payload = {
        totalReports: totalReports2,
        totalUniqueCustomers,
        totalContracts: totalContracts2,
        totalContractAmount: totalContractAmount2,
        avgScore: avgScore2,
        statusBreakdown: statusBreakdown2,
        personnelRanking: personnelRanking2.sort((a, b) => b.totalAmount - a.totalAmount || b.reportsCount - a.reportsCount)
      };
      analyticsCache.set(cacheKey, { timestamp: now2, data: payload });
      return res.json(payload);
    } catch (err) {
      console.warn("Directus analytics aggregate error:", err.message);
    }
  }
  const rawReports = await ensureReportsCache().catch(() => reportsData);
  let filtered = [...rawReports];
  if (targetNegotiator) {
    filtered = filtered.filter(
      (r) => r.negotiator_name === targetNegotiator || r.created_by === targetNegotiator
    );
  }
  if (start_date) {
    const sMs = new Date(String(start_date)).getTime();
    filtered = filtered.filter((r) => r.date_created && new Date(r.date_created).getTime() >= sMs);
  }
  if (end_date) {
    const eMs = new Date(String(end_date)).getTime();
    filtered = filtered.filter((r) => r.date_created && new Date(r.date_created).getTime() <= eMs);
  }
  const totalReports = filtered.length;
  let totalContracts = 0;
  let totalContractAmount = 0;
  let scoresSum = 0;
  let scoresCount = 0;
  const statusBreakdown = {};
  const personnelMap = /* @__PURE__ */ new Map();
  filtered.forEach((r) => {
    const st = r.negotiation_status || "\u0633\u0627\u06CC\u0631";
    statusBreakdown[st] = (statusBreakdown[st] || 0) + 1;
    if (r.negotiation_score && r.negotiation_score > 0) {
      scoresSum += r.negotiation_score;
      scoresCount += 1;
    }
    const isContract = r.negotiation_status === "\u0642\u0631\u0627\u0631\u062F\u0627\u062F" || r.negotiation_status === "\u0642\u0631\u0627\u0631\u062F\u0627\u062F / \u0641\u0627\u06A9\u062A\u0648\u0631" || Boolean(r.contract_number) || Boolean(r.contract_amount);
    if (isContract) {
      totalContracts += 1;
      if (r.contract_amount && !isNaN(Number(r.contract_amount))) {
        totalContractAmount += Number(r.contract_amount);
      }
    }
    const pName = r.negotiator_name || "\u0646\u0627\u0645\u0634\u062E\u0635";
    let pEntry = personnelMap.get(pName);
    if (!pEntry) {
      pEntry = { count: 0, amount: 0, scoresSum: 0, scoresCount: 0 };
      personnelMap.set(pName, pEntry);
    }
    pEntry.count += 1;
    if (isContract && r.contract_amount && !isNaN(Number(r.contract_amount))) {
      pEntry.amount += Number(r.contract_amount);
    }
    if (r.negotiation_score && r.negotiation_score > 0) {
      pEntry.scoresSum += r.negotiation_score;
      pEntry.scoresCount += 1;
    }
  });
  const avgScore = scoresCount > 0 ? (scoresSum / scoresCount).toFixed(1) : "0";
  const personnelRanking = Array.from(personnelMap.entries()).map(([pName, val]) => ({
    personnelName: pName,
    reportsCount: val.count,
    contractsCount: 0,
    totalAmount: val.amount,
    avgScore: val.scoresCount > 0 ? (val.scoresSum / val.scoresCount).toFixed(1) : "0"
  })).sort((a, b) => b.totalAmount - a.totalAmount || b.reportsCount - a.reportsCount);
  return res.json({
    totalReports,
    totalContracts,
    totalContractAmount,
    avgScore,
    statusBreakdown,
    personnelRanking
  });
});
function gregorianToJalali(gy, gm, gd) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy;
  let gy2 = gm > 2 ? gy + 1 : gy;
  let days = 355666 + 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
  jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm;
  let jd;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + days % 31;
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + (days - 186) % 30;
  }
  return { jy, jm, jd };
}
function gregorianIsoToJalali(isoString) {
  if (!isoString) return "";
  try {
    const parts = isoString.split("T")[0].split("-");
    if (parts.length < 3) return "";
    const gy = parseInt(parts[0], 10);
    const gm = parseInt(parts[1], 10);
    const gd = parseInt(parts[2], 10);
    const { jy, jm, jd } = gregorianToJalali(gy, gm, gd);
    return `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;
  } catch {
    return "";
  }
}
router11.get(["/daily", "/api/analytics/daily"], async (req, res) => {
  const { days, start_date, end_date, negotiator } = req.query;
  const { userId, personnelId, isAdmin, isPersonnelAdmin, canViewAllCustomers, reportViewScope, userName, tenantId } = getRequestUser(req);
  const canViewAllAnalytics = Boolean(isAdmin || isPersonnelAdmin || canViewAllCustomers || reportViewScope === "all");
  const daysCount = days ? Math.max(1, Math.min(parseInt(String(days), 10), 90)) : 14;
  const targetNegotiator = !canViewAllAnalytics ? userName || "" : negotiator && negotiator !== "all" && negotiator !== "\u0647\u0645\u0647" ? String(negotiator) : "";
  const now2 = /* @__PURE__ */ new Date();
  let rangeStart = new Date(now2.getTime() - (daysCount - 1) * 24 * 60 * 60 * 1e3);
  rangeStart.setHours(0, 0, 0, 0);
  let rangeEnd = /* @__PURE__ */ new Date();
  rangeEnd.setHours(23, 59, 59, 999);
  if (start_date) {
    rangeStart = new Date(String(start_date));
  }
  if (end_date) {
    rangeEnd = new Date(String(end_date));
    rangeEnd.setHours(23, 59, 59, 999);
  }
  const contractStatusIn = `%D9%82%D8%B1%D8%A7%D8%B1%D8%AF%D8%A7%D8%AF,%D9%82%D8%B1%D8%A7%D8%B1%D8%AF%D8%A7%D8%AF%20%2F%20%D9%81%D8%A7%DA%A9%D8%AA%D9%88%D8%B1,%D9%82%D8%B1%D8%A7%D8%B1%D8%AF%D8%A7%D8%AF%2F%D9%81%D8%A7%DA%A9%D8%AA%D9%88%D8%B1`;
  let filterParams = `&filter[date_created][_gte]=${encodeURIComponent(rangeStart.toISOString())}&filter[date_created][_lte]=${encodeURIComponent(rangeEnd.toISOString())}`;
  if (tenantId && tenantId !== "all") {
    const tenantNum = resolveDirectusTenantId(tenantId);
    if (tenantNum) {
      filterParams += `&filter[tenant_id][_eq]=${tenantNum}`;
    }
  }
  if (targetNegotiator) {
    filterParams += `&filter[negotiator_name][_eq]=${encodeURIComponent(targetNegotiator)}`;
  }
  const cacheKey = `daily_${tenantId || "all"}_${daysCount}_${start_date || ""}_${end_date || ""}_${targetNegotiator || "all"}`;
  const cacheNow = Date.now();
  const cached = analyticsCache.get(cacheKey);
  if (cached && cacheNow - cached.timestamp < ANALYTICS_CACHE_TTL) {
    return res.json(cached.data);
  }
  if (directusUrl && directusAdminToken) {
    try {
      const [allDaysRes, contractDaysRes, totalAssignedRes, uniqueCustDaysRes, totalUniqueTouchedRes] = await Promise.all([
        directusFetch(
          `/items/customer_reports?groupBy[]=year(date_created)&groupBy[]=month(date_created)&groupBy[]=day(date_created)&aggregate[count]=*&aggregate[avg]=negotiation_score&aggregate[sum]=contract_amount&limit=-1${filterParams}`
        ).catch(() => null),
        directusFetch(
          `/items/customer_reports?groupBy[]=year(date_created)&groupBy[]=month(date_created)&groupBy[]=day(date_created)&aggregate[count]=*&aggregate[sum]=contract_amount&limit=-1&filter[negotiation_status][_in]=${contractStatusIn}${filterParams}`
        ).catch(() => null),
        directusFetch(
          `/items/customers?limit=1&meta=filter_count${tenantId && tenantId !== "all" ? `&filter[tenant_id][_eq]=${resolveDirectusTenantId(tenantId)}` : ""}${targetNegotiator ? `&filter[assigned_marketer_name][_eq]=${encodeURIComponent(targetNegotiator)}` : ""}`
        ).catch(() => null),
        directusFetch(
          `/items/customer_reports?groupBy[]=year(date_created)&groupBy[]=month(date_created)&groupBy[]=day(date_created)&aggregate[countDistinct]=customer_id&limit=-1${filterParams}`
        ).catch(() => null),
        directusFetch(
          `/items/customer_reports?aggregate[countDistinct]=customer_id${filterParams}`
        ).catch(() => null)
      ]);
      const daysMap = /* @__PURE__ */ new Map();
      const dayDiff = Math.max(1, Math.min(Math.round((rangeEnd.getTime() - rangeStart.getTime()) / (24 * 60 * 60 * 1e3)), 90));
      for (let i = dayDiff - 1; i >= 0; i--) {
        const d = new Date(rangeEnd.getTime() - i * 24 * 60 * 60 * 1e3);
        const isoKey = d.toISOString().split("T")[0];
        const jStr = gregorianIsoToJalali(isoKey);
        const dayName = new Intl.DateTimeFormat("fa-IR", { weekday: "short" }).format(d);
        daysMap.set(isoKey, {
          dateIso: isoKey,
          dateJalali: jStr,
          dayName,
          reportsCount: 0,
          scoresSum: 0,
          scoresCount: 0,
          contractsCount: 0,
          contractsAmount: 0,
          avgScore: "0",
          statusCounts: {},
          uniqueCount: 0
        });
      }
      if (allDaysRes?.data && Array.isArray(allDaysRes.data)) {
        for (const row of allDaysRes.data) {
          const isoKey = `${row.date_created_year}-${String(row.date_created_month).padStart(2, "0")}-${String(row.date_created_day).padStart(2, "0")}`;
          const count = Number(row.count || 0);
          const rawAvg = Number(row.avg?.negotiation_score || 0);
          const sumAmt = Number(row.sum?.contract_amount || 0);
          let entry = daysMap.get(isoKey);
          if (!entry) {
            const d = new Date(isoKey);
            entry = {
              dateIso: isoKey,
              dateJalali: gregorianIsoToJalali(isoKey),
              dayName: new Intl.DateTimeFormat("fa-IR", { weekday: "short" }).format(d),
              reportsCount: 0,
              scoresSum: 0,
              scoresCount: 0,
              contractsCount: 0,
              contractsAmount: 0,
              avgScore: "0",
              statusCounts: {},
              uniqueCount: 0
            };
            daysMap.set(isoKey, entry);
          }
          entry.reportsCount = count;
          entry.scoresSum = rawAvg * count;
          entry.scoresCount = count;
          entry.contractsAmount = sumAmt;
          entry.avgScore = rawAvg > 0 ? (Math.round(rawAvg * 10) / 10).toFixed(1) : "0";
          entry.uniqueCount = count > 0 ? 1 : 0;
        }
      }
      if (uniqueCustDaysRes?.data && Array.isArray(uniqueCustDaysRes.data)) {
        for (const row of uniqueCustDaysRes.data) {
          const isoKey = `${row.date_created_year}-${String(row.date_created_month).padStart(2, "0")}-${String(row.date_created_day).padStart(2, "0")}`;
          const uCount = Number(row.countDistinct?.customer_id || 0);
          const entry = daysMap.get(isoKey);
          if (entry && uCount > 0) {
            entry.uniqueCount = uCount;
          }
        }
      }
      if (contractDaysRes?.data && Array.isArray(contractDaysRes.data)) {
        for (const row of contractDaysRes.data) {
          const isoKey = `${row.date_created_year}-${String(row.date_created_month).padStart(2, "0")}-${String(row.date_created_day).padStart(2, "0")}`;
          const cCount = Number(row.count || 0);
          const cSum = Number(row.sum?.contract_amount || 0);
          const entry = daysMap.get(isoKey);
          if (entry) {
            entry.contractsCount = cCount;
            if (cSum > 0) entry.contractsAmount = cSum;
          }
        }
      }
      const daysList = Array.from(daysMap.values()).sort((a, b) => a.dateIso.localeCompare(b.dateIso));
      const totalReports = daysList.reduce((acc, d) => acc + d.reportsCount, 0);
      const totalContracts = daysList.reduce((acc, d) => acc + d.contractsCount, 0);
      const totalAmount = daysList.reduce((acc, d) => acc + d.contractsAmount, 0);
      const totalScoresSum = daysList.reduce((acc, d) => acc + d.scoresSum, 0);
      const totalScoresCount = daysList.reduce((acc, d) => acc + d.scoresCount, 0);
      const avgScore = totalScoresCount > 0 ? (totalScoresSum / totalScoresCount).toFixed(1) : "0";
      const activeDaysCount = daysList.filter((d) => d.reportsCount > 0).length;
      const avgPerActiveDay = activeDaysCount > 0 ? (totalReports / activeDaysCount).toFixed(1) : "0";
      const peakDay = [...daysList].sort((a, b) => b.reportsCount - a.reportsCount)[0];
      const totalAssignedCustomers = totalAssignedRes?.meta?.filter_count ?? totalAssignedRes?.meta?.total_count ?? 0;
      let totalUniqueCustomersTouched = 0;
      if (totalUniqueTouchedRes?.data && Array.isArray(totalUniqueTouchedRes.data) && totalUniqueTouchedRes.data.length > 0) {
        const cDist = totalUniqueTouchedRes.data[0]?.countDistinct?.customer_id;
        if (cDist !== void 0 && cDist !== null) {
          totalUniqueCustomersTouched = Number(cDist);
        }
      }
      if (!totalUniqueCustomersTouched) {
        totalUniqueCustomersTouched = totalReports;
      }
      const dailyPayload = {
        daysList,
        totalReports,
        totalContracts,
        totalAmount,
        avgScore,
        activeDaysCount,
        avgPerActiveDay,
        peakDay,
        totalAssignedCustomers,
        totalUniqueCustomersTouched
      };
      analyticsCache.set(cacheKey, { timestamp: cacheNow, data: dailyPayload });
      return res.json(dailyPayload);
    } catch (err) {
      console.warn("Directus daily analytics aggregate error:", err.message);
    }
  }
  return res.json({
    daysList: [],
    totalReports: 0,
    totalContracts: 0,
    totalAmount: 0,
    avgScore: "0",
    activeDaysCount: 0,
    avgPerActiveDay: "0"
  });
});
var analytics_routes_default = router11;

// server/routes/contacts.routes.ts
import { Router as Router12 } from "express";
import crypto13 from "crypto";
var router12 = Router12();
router12.get("/check-duplicate", async (req, res) => {
  try {
    const value = String(req.query.value || "").trim();
    const channelType = String(req.query.channel_type || "mobile").trim();
    const excludeCustomerId = req.query.exclude_customer_id ? String(req.query.exclude_customer_id).trim() : void 0;
    if (!value || value.length < 3) {
      return res.json({ isDuplicate: false });
    }
    const dup = await asyncCheckContactDuplicate(value, channelType, excludeCustomerId);
    if (dup && dup.isDuplicate) {
      return res.json(dup);
    }
    return res.json({ isDuplicate: false });
  } catch (err) {
    console.warn("Check duplicate contact error:", err.message);
    return res.json({ isDuplicate: false });
  }
});
router12.get("/", async (req, res) => {
  const { customer_id } = req.query;
  if (directusUrl && directusAdminToken) {
    try {
      let q = "/items/customer_contacts?sort=-date_created";
      if (customer_id) {
        q += `&filter[customer_id][_eq]=${encodeURIComponent(String(customer_id))}`;
      } else {
        q += "&limit=100";
      }
      const directusRes = await directusFetch(q);
      if (directusRes?.data && Array.isArray(directusRes.data)) {
        return res.json(directusRes.data);
      }
    } catch (err) {
      console.warn("Error fetching contacts from Directus:", err.message);
    }
  }
  let filtered = [...contactsData];
  if (customer_id) {
    filtered = filtered.filter((c) => String(c.customer_id) === String(customer_id));
  }
  return res.json(filtered);
});
router12.get("/:id", async (req, res) => {
  const { id } = req.params;
  if (directusUrl && directusAdminToken) {
    try {
      const directusRes = await directusFetch(`/items/customer_contacts/${encodeURIComponent(id)}`);
      if (directusRes?.data) {
        return res.json(directusRes.data);
      }
    } catch (err) {
      console.warn(`Error fetching contact ${id} from Directus:`, err.message);
    }
  }
  const found = contactsData.find((c) => c.id === id);
  if (found) {
    return res.json(found);
  }
  return res.status(404).json({ error: "CONTACT_NOT_FOUND", message: "\u0634\u0645\u0627\u0631\u0647 \u062A\u0645\u0627\u0633 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." });
});
async function syncContactToParentCustomer(customerId, channelType, value, contactRole) {
  try {
    let existingCust = null;
    if (directusUrl && directusAdminToken) {
      const custRes = await directusFetch(`/items/customers/${encodeURIComponent(customerId)}`).catch(() => null);
      if (custRes?.data) {
        existingCust = custRes.data;
      }
    }
    if (!existingCust) {
      existingCust = customersData.find((c) => c.id === customerId);
    }
    if (!existingCust) return;
    const patchPayload = {};
    const cleanVal = String(value).trim();
    if (channelType === "mobile") {
      const mobiles = Array.isArray(existingCust.mobile_numbers) ? [...existingCust.mobile_numbers] : [];
      if (!mobiles.includes(cleanVal)) {
        mobiles.push(cleanVal);
        patchPayload.mobile_numbers = mobiles;
      }
    }
    if (channelType === "landline") {
      const landlines = Array.isArray(existingCust.landline_numbers) ? [...existingCust.landline_numbers] : [];
      if (!landlines.includes(cleanVal)) {
        landlines.push(cleanVal);
        patchPayload.landline_numbers = landlines;
      }
    }
    if (channelType === "telegram") {
      const tIds = Array.isArray(existingCust.telegram_ids) ? [...existingCust.telegram_ids] : [];
      if (!tIds.includes(cleanVal)) {
        tIds.push(cleanVal);
        patchPayload.telegram_ids = tIds;
      }
      if (!existingCust.telegram_phone && /^09\d{9}$/.test(cleanVal)) {
        patchPayload.telegram_phone = cleanVal;
      }
    }
    if (channelType === "instagram") {
      const iIds = Array.isArray(existingCust.instagram_ids) ? [...existingCust.instagram_ids] : [];
      if (!iIds.includes(cleanVal)) {
        iIds.push(cleanVal);
        patchPayload.instagram_ids = iIds;
      }
    }
    if (channelType === "email") {
      const emails = Array.isArray(existingCust.emails) ? [...existingCust.emails] : [];
      if (!emails.includes(cleanVal)) {
        emails.push(cleanVal);
        patchPayload.emails = emails;
      }
    }
    if (channelType === "website") {
      const websites = Array.isArray(existingCust.websites) ? [...existingCust.websites] : [];
      if (!websites.includes(cleanVal)) {
        websites.push(cleanVal);
        patchPayload.websites = websites;
      }
    }
    const roleLower = (contactRole || "").toLowerCase();
    if (roleLower.includes("\u0645\u062F\u06CC\u0631") || roleLower.includes("manager")) {
      const managerPhones = Array.isArray(existingCust.manager_phones) ? [...existingCust.manager_phones] : [];
      if (!managerPhones.includes(cleanVal)) {
        managerPhones.push(cleanVal);
        patchPayload.manager_phones = managerPhones;
      }
    }
    if (roleLower.includes("\u0645\u0630\u0627\u06A9\u0631\u0647") || roleLower.includes("negotiator")) {
      const negotiatorPhones = Array.isArray(existingCust.negotiator_phones) ? [...existingCust.negotiator_phones] : [];
      if (!negotiatorPhones.includes(cleanVal)) {
        negotiatorPhones.push(cleanVal);
        patchPayload.negotiator_phones = negotiatorPhones;
      }
    }
    if (Object.keys(patchPayload).length > 0) {
      if (directusUrl && directusAdminToken) {
        await directusFetch(`/items/customers/${encodeURIComponent(customerId)}`, {
          method: "PATCH",
          body: JSON.stringify(patchPayload)
        }).catch((err) => console.warn("Sync customer contacts patch warning:", err.message));
      }
      const memCust = customersData.find((c) => c.id === customerId);
      if (memCust) {
        Object.assign(memCust, patchPayload);
      }
      invalidateCustomersCache();
    }
  } catch (err) {
    console.warn("Error in syncContactToParentCustomer:", err.message);
  }
}
router12.post("/", async (req, res) => {
  try {
    const {
      customer_id,
      channel_type = "mobile",
      value,
      contact_name = "",
      contact_role = "",
      is_primary = false,
      notes = ""
    } = req.body;
    if (!customer_id || !String(customer_id).trim()) {
      return res.status(400).json({
        error: "MISSING_CUSTOMER_ID",
        message: "\u0634\u0646\u0627\u0633\u0647 \u0645\u0634\u062A\u0631\u06CC (customer_id) \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A."
      });
    }
    const rawValue = String(value || "").trim();
    if (!rawValue) {
      return res.status(400).json({
        error: "MISSING_VALUE",
        message: "\u0645\u0642\u062F\u0627\u0631 \u0634\u0645\u0627\u0631\u0647 \u062A\u0645\u0627\u0633 \u06CC\u0627 \u0627\u06A9\u0627\u0646\u062A \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A."
      });
    }
    const normVal = normalizeContactValue(rawValue, channel_type);
    if (normVal && normVal.length >= 3) {
      const dup = await asyncCheckContactDuplicate(rawValue, channel_type, customer_id);
      if (dup && dup.isDuplicate && dup.conflictType === "active_marketer") {
        return res.status(409).json({
          error: "DUPLICATE_CONTACT",
          message: dup.message || "\u0627\u06CC\u0646 \u0634\u0645\u0627\u0631\u0647 \u062A\u0645\u0627\u0633 \u062F\u0631 \u062D\u0627\u0644 \u062D\u0627\u0636\u0631 \u0628\u0631\u0627\u06CC \u0645\u0634\u062A\u0631\u06CC \u0641\u0639\u0627\u0644 \u062F\u06CC\u06AF\u0631\u06CC \u062B\u0628\u062A \u0634\u062F\u0647 \u0627\u0633\u062A.",
          duplicate: dup
        });
      }
    }
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const newId = crypto13.randomUUID();
    const contactRecord = {
      id: newId,
      customer_id: String(customer_id).trim(),
      channel_type: channel_type || "mobile",
      value: rawValue,
      normalized_value: normVal || rawValue,
      contact_name: contact_name ? String(contact_name).trim() : "",
      contact_role: contact_role ? String(contact_role).trim() : "",
      is_primary: Boolean(is_primary),
      notes: notes ? String(notes).trim() : "",
      date_created: nowIso,
      date_updated: nowIso
    };
    let directusCreated = null;
    if (directusUrl && directusAdminToken) {
      try {
        const directusPayload = {
          id: contactRecord.id,
          customer_id: contactRecord.customer_id,
          channel_type: contactRecord.channel_type,
          value: contactRecord.value,
          normalized_value: contactRecord.normalized_value,
          contact_name: contactRecord.contact_name || null,
          contact_role: contactRecord.contact_role || null,
          is_primary: contactRecord.is_primary,
          notes: contactRecord.notes || null,
          date_created: contactRecord.date_created,
          date_updated: contactRecord.date_updated
        };
        const createRes = await directusFetch("/items/customer_contacts", {
          method: "POST",
          body: JSON.stringify(directusPayload)
        });
        if (createRes?.data) {
          directusCreated = createRes.data;
        }
      } catch (err) {
        console.warn("Directus create customer_contacts error:", err.message);
      }
    }
    contactsData.unshift(contactRecord);
    await syncContactToParentCustomer(
      contactRecord.customer_id,
      contactRecord.channel_type,
      contactRecord.value,
      contactRecord.contact_role
    );
    invalidateCustomersCache();
    const finalResult = directusCreated || contactRecord;
    return res.status(201).json(finalResult);
  } catch (err) {
    console.error("Fatal error in POST /api/contacts:", err.message);
    return res.status(500).json({
      error: "CONTACT_CREATION_FAILED",
      message: `\u062E\u0637\u0627 \u062F\u0631 \u062B\u0628\u062A \u0634\u0645\u0627\u0631\u0647 \u062A\u0645\u0627\u0633: ${err.message}`
    });
  }
});
router12.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const payload = req.body;
  try {
    const patchPayload = {
      date_updated: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (payload.channel_type !== void 0) patchPayload.channel_type = payload.channel_type;
    if (payload.value !== void 0) {
      patchPayload.value = String(payload.value).trim();
      patchPayload.normalized_value = normalizeContactValue(
        patchPayload.value,
        payload.channel_type || "mobile"
      );
    }
    if (payload.contact_name !== void 0) patchPayload.contact_name = payload.contact_name;
    if (payload.contact_role !== void 0) patchPayload.contact_role = payload.contact_role;
    if (payload.is_primary !== void 0) patchPayload.is_primary = Boolean(payload.is_primary);
    if (payload.notes !== void 0) patchPayload.notes = payload.notes;
    let updatedContact = null;
    if (directusUrl && directusAdminToken) {
      try {
        const directusRes = await directusFetch(`/items/customer_contacts/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: JSON.stringify(patchPayload)
        });
        if (directusRes?.data) {
          updatedContact = directusRes.data;
        }
      } catch (err) {
        console.warn("Directus patch contact error:", err.message);
      }
    }
    const memIndex = contactsData.findIndex((c) => c.id === id);
    if (memIndex !== -1) {
      contactsData[memIndex] = { ...contactsData[memIndex], ...patchPayload };
      if (!updatedContact) updatedContact = contactsData[memIndex];
    }
    if (!updatedContact) {
      return res.status(404).json({ error: "CONTACT_NOT_FOUND", message: "\u0634\u0645\u0627\u0631\u0647 \u062A\u0645\u0627\u0633 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." });
    }
    if (patchPayload.value && updatedContact.customer_id) {
      await syncContactToParentCustomer(
        updatedContact.customer_id,
        updatedContact.channel_type,
        patchPayload.value,
        updatedContact.contact_role
      );
    }
    invalidateCustomersCache();
    return res.json(updatedContact);
  } catch (err) {
    console.error("Error updating contact:", err.message);
    return res.status(500).json({
      error: "UPDATE_FAILED",
      message: `\u062E\u0637\u0627 \u062F\u0631 \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0634\u0645\u0627\u0631\u0647 \u062A\u0645\u0627\u0633: ${err.message}`
    });
  }
});
router12.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    if (directusUrl && directusAdminToken) {
      try {
        await directusFetch(`/items/customer_contacts/${encodeURIComponent(id)}`, {
          method: "DELETE"
        });
      } catch (err) {
        console.warn("Directus delete contact warning:", err.message);
      }
    }
    const memIndex = contactsData.findIndex((c) => c.id === id);
    if (memIndex !== -1) {
      contactsData.splice(memIndex, 1);
    }
    invalidateCustomersCache();
    return res.json({ success: true, id });
  } catch (err) {
    console.error("Error deleting contact:", err.message);
    return res.status(500).json({
      error: "DELETE_FAILED",
      message: `\u062E\u0637\u0627 \u062F\u0631 \u062D\u0630\u0641 \u0634\u0645\u0627\u0631\u0647 \u062A\u0645\u0627\u0633: ${err.message}`
    });
  }
});
var contacts_routes_default = router12;

// server/routes/payroll.routes.ts
import { Router as Router14 } from "express";

// server/routes/payrollAdjustments.routes.ts
import { Router as Router13 } from "express";
var router13 = Router13();
var VALID_TYPES = ["bonus", "deduction"];
var VALID_STATUSES = ["pending", "approved", "rejected"];
var VALID_CATEGORIES = [
  "sales_bonus",
  "overtime",
  "delay",
  "insurance",
  "penalty",
  "other"
];
function findCallerPersonnel(req) {
  const { personnelId, userId, userEmail, userName } = getRequestUser(req);
  const cleanPId = String(personnelId || "").trim().toLowerCase();
  const cleanUId = String(userId || "").trim().toLowerCase();
  const cleanEmail = String(userEmail || "").trim().toLowerCase();
  const normName = normalizePersianString(userName);
  return personnelData.find((p) => {
    const pId = String(p.id || "").trim().toLowerCase();
    const pUid = String(p.user_id || "").trim().toLowerCase();
    const pEmail = String(p.email || "").trim().toLowerCase();
    const pName = normalizePersianString(p.name);
    return cleanPId && (pId === cleanPId || pId.replace(/^p-/, "") === cleanPId.replace(/^p-/, "")) || cleanUId && (pUid === cleanUId || pId === cleanUId) || cleanEmail && pEmail === cleanEmail || normName && pName && pName === normName;
  }) || null;
}
function canManageAdjustments(req) {
  const { isAdmin, userRole } = getRequestUser(req);
  if (isAdmin || userRole === "admin" || userRole === "sales_manager") return true;
  const callerP = findCallerPersonnel(req);
  return Boolean(
    callerP?.permissions?.can_approve_bonuses || callerP?.permissions?.allowed_menus?.includes("payroll")
  );
}
function canSelfRequestBonus(req) {
  if (canManageAdjustments(req)) return true;
  const callerP = findCallerPersonnel(req);
  return Boolean(callerP?.permissions?.can_request_bonus);
}
function normalizePayrollAdjustment(r) {
  const pIdStr = typeof r.personnel_id === "object" && r.personnel_id !== null ? String(r.personnel_id.id) : String(r.personnel_id || "");
  const pObj = personnelData.find(
    (p) => String(p.id) === pIdStr || String(p.id).replace(/^p-/, "") === pIdStr.replace(/^p-/, "")
  );
  const pName = (typeof r.personnel_id === "object" && r.personnel_id !== null ? r.personnel_id.name : void 0) || (r.personnel_name && r.personnel_name !== pIdStr ? r.personnel_name : "") || pObj?.name || "\u0647\u0645\u06A9\u0627\u0631 \u0634\u0631\u06A9\u062A";
  const tenantVal = typeof r.tenant_id === "object" && r.tenant_id !== null ? r.tenant_id.id : r.tenant_id ?? null;
  const slipVal = typeof r.payroll_slip_id === "object" && r.payroll_slip_id !== null ? r.payroll_slip_id.id : r.payroll_slip_id ?? null;
  return {
    id: r.id,
    tenant_id: tenantVal !== null && tenantVal !== void 0 ? String(tenantVal) : null,
    personnel_id: pIdStr,
    personnel_name: pName,
    type: r.type === "deduction" ? "deduction" : "bonus",
    category: r.category || "other",
    title: String(r.title || "").trim(),
    amount: Number(r.amount) || 0,
    approved_amount: r.approved_amount !== null && r.approved_amount !== void 0 && r.approved_amount !== "" ? Number(r.approved_amount) : null,
    target_year: r.target_year !== null && r.target_year !== void 0 && r.target_year !== "" ? Number(r.target_year) : null,
    target_month: r.target_month !== null && r.target_month !== void 0 && r.target_month !== "" ? Number(r.target_month) : null,
    effective_date: r.effective_date || null,
    reason: r.reason || "",
    status: VALID_STATUSES.includes(r.status) ? r.status : "pending",
    source: r.source === "manager_direct" ? "manager_direct" : "self_request",
    created_by: r.created_by || null,
    manager_note: r.manager_note || null,
    reviewed_by: r.reviewed_by || null,
    reviewed_at: r.reviewed_at || null,
    payroll_slip_id: slipVal,
    date_created: r.date_created || (/* @__PURE__ */ new Date()).toISOString(),
    date_updated: r.date_updated || void 0
  };
}
function matchesAdjustmentOwner(adj, personnelId, userId, userName) {
  const adjPId = String(adj.personnel_id || "").trim().toLowerCase();
  const cleanAdjPId = adjPId.replace(/^p-/, "");
  const cleanPId = String(personnelId || "").trim().toLowerCase();
  const rawPId = cleanPId.replace(/^p-/, "");
  const cleanUId = String(userId || "").trim().toLowerCase();
  const normUser = normalizePersianString(userName);
  const normAdjName = normalizePersianString(adj.personnel_name);
  if (cleanPId && (adjPId === cleanPId || rawPId && cleanAdjPId === rawPId)) return true;
  if (cleanUId && (adjPId === cleanUId || cleanAdjPId === cleanUId)) return true;
  if (normUser && normAdjName && normUser === normAdjName) return true;
  return false;
}
async function isSlipPaid(slipId) {
  if (!slipId) return false;
  const localSlip = payrollSlipsData.find((s) => String(s.id) === String(slipId));
  if (localSlip) return localSlip.status === "paid";
  if (directusUrl && directusAdminToken) {
    try {
      const resp = await directusFetch(
        `/items/payroll_slips/${encodeURIComponent(String(slipId))}?fields=id,status`
      );
      if (resp?.data) {
        return resp.data.status === "paid";
      }
    } catch {
    }
  }
  return false;
}
var getAdjustmentsHandler = async (req, res) => {
  const { isAuthenticated, userId, personnelId, userName, tenantId } = getRequestUser(req);
  if (!isAuthenticated) {
    return res.status(401).json({ error: "\u0644\u0637\u0641\u0627\u064B \u0627\u0628\u062A\u062F\u0627 \u0648\u0627\u0631\u062F \u0633\u0627\u0645\u0627\u0646\u0647 \u0634\u0648\u06CC\u062F." });
  }
  const isManager = canManageAdjustments(req);
  const {
    personnel_id,
    type,
    status,
    source,
    target_year,
    target_month,
    unlinked_only,
    scope
  } = req.query;
  let list = [];
  if (directusUrl && directusAdminToken) {
    try {
      const resp = await directusFetchAllPages(
        "/items/payroll_adjustments?fields=*,personnel_id.*&sort=-date_created,-id"
      );
      if (resp && Array.isArray(resp.data)) {
        list = resp.data.map(normalizePayrollAdjustment);
      }
    } catch (err) {
      console.warn("Directus payroll_adjustments fetch notice:", err.message);
      list = payrollAdjustmentsData.map(normalizePayrollAdjustment);
    }
  } else {
    list = payrollAdjustmentsData.map(normalizePayrollAdjustment);
  }
  if (tenantId && tenantId !== "all") {
    list = list.filter((r) => {
      if (!r.tenant_id) return true;
      return matchesTenant(String(r.tenant_id), tenantId) || matchesTenant(String(r.tenant_id), "1") || matchesTenant(String(r.tenant_id), "default");
    });
  }
  if (!isManager || scope === "mine") {
    const callerP = findCallerPersonnel(req);
    const effectivePId = callerP?.id || personnelId;
    const effectiveName = callerP?.name || userName;
    list = list.filter((r) => matchesAdjustmentOwner(r, effectivePId, userId, effectiveName));
  } else if (personnel_id && personnel_id !== "all") {
    const targetClean = String(personnel_id).trim().toLowerCase().replace(/^p-/, "");
    list = list.filter((r) => {
      const rClean = String(r.personnel_id || "").trim().toLowerCase().replace(/^p-/, "");
      return String(r.personnel_id) === String(personnel_id) || targetClean && rClean === targetClean;
    });
  }
  if (type && type !== "all") {
    list = list.filter((r) => r.type === type);
  }
  if (status && status !== "all") {
    list = list.filter((r) => r.status === status);
  }
  if (source && source !== "all") {
    list = list.filter((r) => r.source === source);
  }
  if (target_year && target_year !== "all") {
    const y = Number(target_year);
    if (!isNaN(y)) list = list.filter((r) => Number(r.target_year) === y);
  }
  if (target_month && target_month !== "all") {
    const m = Number(target_month);
    if (!isNaN(m)) list = list.filter((r) => Number(r.target_month) === m);
  }
  if (unlinked_only === "true") {
    list = list.filter((r) => !r.payroll_slip_id);
  }
  res.json(list);
};
router13.get(["/api/payroll-adjustments", "/payroll-adjustments"], getAdjustmentsHandler);
router13.post(["/api/payroll-adjustments", "/payroll-adjustments"], async (req, res) => {
  const { isAuthenticated, userId, personnelId, userName, tenantId } = getRequestUser(req);
  if (!isAuthenticated) {
    return res.status(401).json({ error: "\u0644\u0637\u0641\u0627\u064B \u0627\u0628\u062A\u062F\u0627 \u0648\u0627\u0631\u062F \u0633\u0627\u0645\u0627\u0646\u0647 \u0634\u0648\u06CC\u062F." });
  }
  const isManager = canManageAdjustments(req);
  const callerP = findCallerPersonnel(req);
  const payload = req.body || {};
  const requestedSelfMode = payload.source === "self_request" || !isManager;
  if (!isManager) {
    if (!canSelfRequestBonus(req)) {
      return res.status(403).json({
        error: "\u0634\u0645\u0627 \u0645\u062C\u0648\u0632 \u062B\u0628\u062A \u062F\u0631\u062E\u0648\u0627\u0633\u062A \u067E\u0627\u062F\u0627\u0634 \u0631\u0627 \u0646\u062F\u0627\u0631\u06CC\u062F. \u0644\u0637\u0641\u0627\u064B \u0628\u0627 \u0645\u062F\u06CC\u0631\u06CC\u062A \u0647\u0645\u0627\u0647\u0646\u06AF \u06A9\u0646\u06CC\u062F."
      });
    }
    if (payload.type === "deduction") {
      return res.status(403).json({
        error: "\u062A\u0646\u0647\u0627 \u0645\u062F\u06CC\u0631\u06CC\u062A \u0645\u062C\u0627\u0632 \u0628\u0647 \u062B\u0628\u062A \u06A9\u0633\u0631\u06CC \u062D\u0642\u0648\u0642 \u0627\u0633\u062A."
      });
    }
  }
  const title = String(payload.title || "").trim();
  if (!title || title.length > 200) {
    return res.status(400).json({ error: "\u0639\u0646\u0648\u0627\u0646 \u067E\u0627\u062F\u0627\u0634 \u06CC\u0627 \u06A9\u0633\u0631\u06CC \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A (\u062D\u062F\u0627\u06A9\u062B\u0631 \u06F2\u06F0\u06F0 \u06A9\u0627\u0631\u0627\u06A9\u062A\u0631)." });
  }
  const amount = Math.round(Number(payload.amount));
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: "\u0645\u0628\u0644\u063A \u0628\u0627\u06CC\u062F \u0639\u062F\u062F\u06CC \u0645\u062B\u0628\u062A \u0648 \u0645\u0639\u062A\u0628\u0631 (\u0628\u0647 \u062A\u0648\u0645\u0627\u0646) \u0628\u0627\u0634\u062F." });
  }
  const adjType = !isManager || requestedSelfMode ? "bonus" : VALID_TYPES.includes(payload.type) ? payload.type : "bonus";
  const category = VALID_CATEGORIES.includes(payload.category) ? payload.category : "other";
  const targetYear = payload.target_year !== void 0 && payload.target_year !== null && payload.target_year !== "" ? Number(payload.target_year) : null;
  if (targetYear !== null && (!Number.isInteger(targetYear) || targetYear < 1390 || targetYear > 1450)) {
    return res.status(400).json({ error: "\u0633\u0627\u0644 \u0634\u0645\u0633\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A." });
  }
  const targetMonth = payload.target_month !== void 0 && payload.target_month !== null && payload.target_month !== "" ? Number(payload.target_month) : null;
  if (targetMonth !== null && (!Number.isInteger(targetMonth) || targetMonth < 1 || targetMonth > 12)) {
    return res.status(400).json({ error: "\u0645\u0627\u0647 \u0634\u0645\u0633\u06CC \u0628\u0627\u06CC\u062F \u0628\u06CC\u0646 \u06F1 \u062A\u0627 \u06F1\u06F2 \u0628\u0627\u0634\u062F." });
  }
  const reason = String(payload.reason || "").trim().slice(0, 250);
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const rawTargetPId = !isManager || requestedSelfMode ? callerP?.id || personnelId || userId : String(payload.personnel_id || "").trim();
  if (!rawTargetPId) {
    return res.status(400).json({ error: "\u0627\u0646\u062A\u062E\u0627\u0628 \u0647\u0645\u06A9\u0627\u0631 \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A." });
  }
  const resolved = await resolvePersonnelId(
    rawTargetPId,
    !isManager || requestedSelfMode ? callerP?.name || userName : payload.personnel_name
  );
  let targetPersonnelId = resolved.personnelId || rawTargetPId;
  let targetPersonnelName = resolved.personnelName || (!isManager || requestedSelfMode ? callerP?.name || userName : payload.personnel_name) || "\u0647\u0645\u06A9\u0627\u0631 \u0634\u0631\u06A9\u062A";
  const matchedTargetP = personnelData.find(
    (p) => String(p.id) === String(targetPersonnelId) || String(p.id).replace(/^p-/, "") === String(targetPersonnelId).replace(/^p-/, "")
  );
  if (matchedTargetP) {
    targetPersonnelId = matchedTargetP.id;
    targetPersonnelName = matchedTargetP.name;
  }
  const creatorInfo = await getPersonnelFullName(callerP?.id || personnelId || userId, userName);
  const creatorFullName = creatorInfo.fullName || callerP?.name || userName || "\u06A9\u0627\u0631\u0628\u0631 \u0633\u06CC\u0633\u062A\u0645";
  const isDirectManagerEntry = isManager && !requestedSelfMode;
  const source = isDirectManagerEntry ? "manager_direct" : "self_request";
  const status = isDirectManagerEntry ? "approved" : "pending";
  const effectiveDate = payload.effective_date ? String(payload.effective_date).includes("T") ? String(payload.effective_date) : `${payload.effective_date}T00:00:00.000Z` : nowIso;
  const targetTenantId = matchedTargetP?.tenant_id || payload.tenant_id || tenantId || "default";
  const resolvedTenantNum = resolveDirectusTenantId(targetTenantId);
  const newRecord = {
    id: Date.now() + Math.floor(Math.random() * 1e3),
    tenant_id: targetTenantId,
    personnel_id: targetPersonnelId,
    personnel_name: targetPersonnelName,
    type: adjType,
    category,
    title,
    amount,
    approved_amount: isDirectManagerEntry ? amount : null,
    target_year: targetYear,
    target_month: targetMonth,
    effective_date: effectiveDate,
    reason,
    status,
    source,
    created_by: creatorFullName,
    manager_note: isDirectManagerEntry && payload.manager_note ? String(payload.manager_note).trim().slice(0, 250) : null,
    reviewed_by: isDirectManagerEntry ? creatorFullName : null,
    reviewed_at: isDirectManagerEntry ? nowIso : null,
    payroll_slip_id: null,
    date_created: nowIso,
    date_updated: nowIso
  };
  if (directusUrl && directusAdminToken) {
    try {
      const safePId = await getSafeDirectusPersonnelForeignKey(targetPersonnelId, targetPersonnelName);
      const directusPayload = {
        tenant_id: resolvedTenantNum,
        personnel_id: safePId,
        personnel_name: targetPersonnelName,
        type: adjType,
        category,
        title,
        amount,
        approved_amount: newRecord.approved_amount,
        target_year: targetYear,
        target_month: targetMonth,
        effective_date: effectiveDate,
        reason,
        status,
        source,
        created_by: creatorFullName,
        manager_note: newRecord.manager_note,
        reviewed_by: newRecord.reviewed_by,
        reviewed_at: newRecord.reviewed_at,
        payroll_slip_id: null
      };
      const created = await directusFetch("/items/payroll_adjustments", {
        method: "POST",
        body: JSON.stringify(directusPayload)
      }).catch(async (primaryErr) => {
        if (primaryErr.message && (primaryErr.message.includes("foreign key") || primaryErr.message.includes("FOREIGN_KEY") || primaryErr.message.includes("tenant_id"))) {
          return await directusFetch("/items/payroll_adjustments", {
            method: "POST",
            body: JSON.stringify({
              ...directusPayload,
              tenant_id: null
            })
          });
        }
        throw primaryErr;
      });
      if (created?.data) {
        const saved = normalizePayrollAdjustment({
          ...newRecord,
          ...created.data,
          personnel_id: targetPersonnelId,
          personnel_name: targetPersonnelName
        });
        payrollAdjustmentsData.unshift(saved);
        return res.status(201).json(saved);
      }
    } catch (err) {
      console.warn("Directus payroll_adjustments POST notice (fallback to memory):", err.message);
    }
  }
  payrollAdjustmentsData.unshift(newRecord);
  return res.status(201).json(newRecord);
});
router13.patch(["/api/payroll-adjustments/:id", "/payroll-adjustments/:id"], async (req, res) => {
  const { isAuthenticated, userId, personnelId, userName } = getRequestUser(req);
  if (!isAuthenticated) {
    return res.status(401).json({ error: "\u0644\u0637\u0641\u0627\u064B \u0627\u0628\u062A\u062F\u0627 \u0648\u0627\u0631\u062F \u0633\u0627\u0645\u0627\u0646\u0647 \u0634\u0648\u06CC\u062F." });
  }
  if (!canManageAdjustments(req)) {
    return res.status(403).json({
      error: "\u0634\u0645\u0627 \u062F\u0633\u062A\u0631\u0633\u06CC \u0644\u0627\u0632\u0645 \u0628\u0631\u0627\u06CC \u0628\u0631\u0631\u0633\u06CC \u06CC\u0627 \u0648\u06CC\u0631\u0627\u06CC\u0634 \u067E\u0627\u062F\u0627\u0634 \u0648 \u06A9\u0633\u0631\u06CC \u0631\u0627 \u0646\u062F\u0627\u0631\u06CC\u062F."
    });
  }
  const { id } = req.params;
  const body = req.body || {};
  let existing = payrollAdjustmentsData.find((r) => String(r.id) === String(id)) || null;
  if (!existing && directusUrl && directusAdminToken) {
    try {
      const resp = await directusFetch(`/items/payroll_adjustments/${encodeURIComponent(id)}`);
      if (resp?.data) existing = normalizePayrollAdjustment(resp.data);
    } catch {
    }
  }
  if (!existing) {
    return res.status(404).json({ error: "\u0631\u06A9\u0648\u0631\u062F \u067E\u0627\u062F\u0627\u0634 \u06CC\u0627 \u06A9\u0633\u0631\u06CC \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." });
  }
  if (await isSlipPaid(existing.payroll_slip_id)) {
    return res.status(400).json({
      error: "\u0627\u06CC\u0646 \u0645\u0648\u0631\u062F \u062F\u0631 \u06CC\u06A9 \u0641\u06CC\u0634 \u062D\u0642\u0648\u0642\u06CC \xAB\u067E\u0631\u062F\u0627\u062E\u062A \u0634\u062F\u0647\xBB \u0644\u062D\u0627\u0638 \u0634\u062F\u0647 \u0648 \u062F\u06CC\u06AF\u0631 \u0642\u0627\u0628\u0644 \u062A\u063A\u06CC\u06CC\u0631 \u0646\u06CC\u0633\u062A."
    });
  }
  const reviewerInfo = await getPersonnelFullName(personnelId || userId, userName);
  const reviewerFullName = reviewerInfo.fullName || userName || "\u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645";
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const patchPayload = {};
  if (body.status !== void 0) {
    if (!VALID_STATUSES.includes(body.status)) {
      return res.status(400).json({ error: "\u0648\u0636\u0639\u06CC\u062A \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A." });
    }
    patchPayload.status = body.status;
    patchPayload.reviewed_by = reviewerFullName;
    patchPayload.reviewed_at = nowIso;
    if (body.status === "approved") {
      const rawApproved = body.approved_amount !== void 0 && body.approved_amount !== null && body.approved_amount !== "" ? Math.round(Number(body.approved_amount)) : existing.amount;
      if (!Number.isFinite(rawApproved) || rawApproved <= 0) {
        return res.status(400).json({ error: "\u0645\u0628\u0644\u063A \u062A\u0627\u06CC\u06CC\u062F\u0634\u062F\u0647 \u0628\u0627\u06CC\u062F \u0639\u062F\u062F\u06CC \u0645\u062B\u0628\u062A \u0628\u0627\u0634\u062F." });
      }
      patchPayload.approved_amount = rawApproved;
    } else if (body.status === "rejected") {
      patchPayload.approved_amount = null;
    }
  } else if (body.approved_amount !== void 0) {
    const rawApproved = body.approved_amount === null || body.approved_amount === "" ? null : Math.round(Number(body.approved_amount));
    if (rawApproved !== null && (!Number.isFinite(rawApproved) || rawApproved <= 0)) {
      return res.status(400).json({ error: "\u0645\u0628\u0644\u063A \u062A\u0627\u06CC\u06CC\u062F\u0634\u062F\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A." });
    }
    patchPayload.approved_amount = rawApproved;
  }
  if (body.manager_note !== void 0) {
    patchPayload.manager_note = body.manager_note ? String(body.manager_note).trim().slice(0, 250) : null;
  }
  if (body.title !== void 0) {
    const cleanTitle = String(body.title).trim();
    if (!cleanTitle || cleanTitle.length > 200) {
      return res.status(400).json({ error: "\u0639\u0646\u0648\u0627\u0646 \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A." });
    }
    patchPayload.title = cleanTitle;
  }
  if (body.amount !== void 0) {
    const numAmt = Math.round(Number(body.amount));
    if (!Number.isFinite(numAmt) || numAmt <= 0) {
      return res.status(400).json({ error: "\u0645\u0628\u0644\u063A \u0628\u0627\u06CC\u062F \u0639\u062F\u062F\u06CC \u0645\u062B\u0628\u062A \u0628\u0627\u0634\u062F." });
    }
    patchPayload.amount = numAmt;
    if (existing.source === "manager_direct" && body.approved_amount === void 0) {
      patchPayload.approved_amount = numAmt;
    }
  }
  if (body.category !== void 0 && VALID_CATEGORIES.includes(body.category)) {
    patchPayload.category = body.category;
  }
  if (body.reason !== void 0) {
    patchPayload.reason = String(body.reason || "").trim().slice(0, 250);
  }
  if (body.target_year !== void 0) {
    const y = body.target_year === null || body.target_year === "" ? null : Number(body.target_year);
    if (y !== null && (!Number.isInteger(y) || y < 1390 || y > 1450)) {
      return res.status(400).json({ error: "\u0633\u0627\u0644 \u0634\u0645\u0633\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A." });
    }
    patchPayload.target_year = y;
  }
  if (body.target_month !== void 0) {
    const m = body.target_month === null || body.target_month === "" ? null : Number(body.target_month);
    if (m !== null && (!Number.isInteger(m) || m < 1 || m > 12)) {
      return res.status(400).json({ error: "\u0645\u0627\u0647 \u0634\u0645\u0633\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A." });
    }
    patchPayload.target_month = m;
  }
  if (directusUrl && directusAdminToken) {
    try {
      const updated = await directusFetch(`/items/payroll_adjustments/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(patchPayload)
      });
      if (updated?.data) {
        const saved = normalizePayrollAdjustment({
          ...existing,
          ...updated.data,
          personnel_id: existing.personnel_id,
          personnel_name: existing.personnel_name
        });
        const idx2 = payrollAdjustmentsData.findIndex((r) => String(r.id) === String(id));
        if (idx2 >= 0) payrollAdjustmentsData[idx2] = saved;
        else payrollAdjustmentsData.unshift(saved);
        return res.json(saved);
      }
    } catch (err) {
      console.warn("Directus payroll_adjustments PATCH notice:", err.message);
    }
  }
  const updatedLocal = {
    ...existing,
    ...patchPayload,
    date_updated: nowIso
  };
  const idx = payrollAdjustmentsData.findIndex((r) => String(r.id) === String(id));
  if (idx >= 0) payrollAdjustmentsData[idx] = updatedLocal;
  else payrollAdjustmentsData.unshift(updatedLocal);
  return res.json(updatedLocal);
});
router13.delete(["/api/payroll-adjustments/:id", "/payroll-adjustments/:id"], async (req, res) => {
  const { isAuthenticated, userId, personnelId, userName } = getRequestUser(req);
  if (!isAuthenticated) {
    return res.status(401).json({ error: "\u0644\u0637\u0641\u0627\u064B \u0627\u0628\u062A\u062F\u0627 \u0648\u0627\u0631\u062F \u0633\u0627\u0645\u0627\u0646\u0647 \u0634\u0648\u06CC\u062F." });
  }
  const { id } = req.params;
  const isManager = canManageAdjustments(req);
  let existing = payrollAdjustmentsData.find((r) => String(r.id) === String(id)) || null;
  if (!existing && directusUrl && directusAdminToken) {
    try {
      const resp = await directusFetch(`/items/payroll_adjustments/${encodeURIComponent(id)}`);
      if (resp?.data) existing = normalizePayrollAdjustment(resp.data);
    } catch {
    }
  }
  if (!existing) {
    return res.status(404).json({ error: "\u0631\u06A9\u0648\u0631\u062F \u0645\u0648\u0631\u062F \u0646\u0638\u0631 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." });
  }
  if (!isManager) {
    const callerP = findCallerPersonnel(req);
    const isOwner = matchesAdjustmentOwner(
      existing,
      callerP?.id || personnelId,
      userId,
      callerP?.name || userName
    );
    if (!isOwner || existing.source !== "self_request" || existing.status !== "pending" || existing.payroll_slip_id) {
      return res.status(403).json({
        error: "\u0634\u0645\u0627 \u0641\u0642\u0637 \u0645\u062C\u0627\u0632 \u0628\u0647 \u062D\u0630\u0641 \u062F\u0631\u062E\u0648\u0627\u0633\u062A\u200C\u0647\u0627\u06CC \u067E\u0627\u062F\u0627\u0634 \u062F\u0631 \u0627\u0646\u062A\u0638\u0627\u0631 \u0628\u0631\u0631\u0633\u06CC \u062E\u0648\u062F \u0647\u0633\u062A\u06CC\u062F."
      });
    }
  } else if (await isSlipPaid(existing.payroll_slip_id)) {
    return res.status(400).json({
      error: "\u0627\u06CC\u0646 \u0645\u0648\u0631\u062F \u062F\u0631 \u06CC\u06A9 \u0641\u06CC\u0634 \u067E\u0631\u062F\u0627\u062E\u062A\u200C\u0634\u062F\u0647 \u0644\u062D\u0627\u0638 \u0634\u062F\u0647 \u0648 \u0642\u0627\u0628\u0644 \u062D\u0630\u0641 \u0646\u06CC\u0633\u062A."
    });
  }
  if (directusUrl && directusAdminToken) {
    try {
      await directusFetch(`/items/payroll_adjustments/${encodeURIComponent(id)}`, {
        method: "DELETE"
      });
    } catch (err) {
      console.warn("Directus payroll_adjustments DELETE notice:", err.message);
    }
  }
  const idx = payrollAdjustmentsData.findIndex((r) => String(r.id) === String(id));
  if (idx >= 0) {
    payrollAdjustmentsData.splice(idx, 1);
  }
  return res.json({ success: true });
});
var payrollAdjustments_routes_default = router13;

// server/routes/payroll.routes.ts
var router14 = Router14();
function hasPayrollAccess(req) {
  const { isAdmin, userRole, personnelId } = getRequestUser(req);
  if (isAdmin || userRole === "admin" || userRole === "sales_manager") return true;
  const p = personnelData.find((item) => item.id === personnelId);
  return Boolean(p?.permissions?.allowed_menus?.includes("payroll"));
}
function isReportByPersonnel(report, p) {
  if (!report || !p) return false;
  const createdBy = String(report.created_by || "").trim().toLowerCase();
  const rawPId = String(p.id || "").trim().toLowerCase();
  const cleanPId = rawPId.replace(/^p-/, "");
  const userId = p.user_id ? String(p.user_id).trim().toLowerCase() : "";
  const username = p.username ? String(p.username).trim().toLowerCase() : "";
  if (createdBy) {
    if (createdBy === rawPId || createdBy === cleanPId || userId && createdBy === userId || username && createdBy === username) {
      return true;
    }
  }
  const negNorm = normalizePersianString(report.negotiator_name);
  const pNameNorm = normalizePersianString(p.name);
  if (negNorm && pNameNorm && (negNorm === pNameNorm || negNorm.includes(pNameNorm) || pNameNorm.includes(negNorm))) {
    return true;
  }
  return false;
}
function calculateCommissionForSales(totalSales, config) {
  if (!config || config.salary_type === "fixed") {
    return { commission: 0, breakdown: { model: "none", note: "\u062D\u0642\u0648\u0642 \u062B\u0627\u0628\u062A \u0641\u0627\u0642\u062F \u067E\u0648\u0631\u0633\u0627\u0646\u062A" } };
  }
  if (config.min_sales_target && config.min_sales_target > 0 && totalSales < config.min_sales_target) {
    return {
      commission: 0,
      breakdown: {
        model: config.commission_model || "flat",
        target_met: false,
        min_sales_target: config.min_sales_target,
        total_sales: totalSales,
        note: "\u062D\u062C\u0645 \u0641\u0631\u0648\u0634 \u0628\u0647 \u062D\u062F \u0646\u0635\u0627\u0628 \u06A9\u0641 \u0641\u0631\u0648\u0634 \u0646\u0631\u0633\u06CC\u062F\u0647 \u0627\u0633\u062A"
      }
    };
  }
  if (config.commission_model === "flat") {
    const rate = Number(config.flat_rate_percent) || 0;
    const commission = Math.round(totalSales * (rate / 100));
    return {
      commission,
      breakdown: {
        model: "flat",
        rate_percent: rate,
        total_sales: totalSales,
        commission
      }
    };
  }
  if (config.commission_model === "tiered") {
    const tiers = Array.isArray(config.commission_tiers) ? [...config.commission_tiers].sort((a, b) => Number(a.from_amount || 0) - Number(b.from_amount || 0)) : [];
    if (tiers.length === 0) {
      return { commission: 0, breakdown: { model: "tiered", note: "\u067E\u0644\u0647\u200C\u0627\u06CC \u062A\u0639\u0631\u06CC\u0641 \u0646\u0634\u062F\u0647 \u0627\u0633\u062A" } };
    }
    if (config.tiered_calculation_mode === "retroactive") {
      let appliedTier = null;
      for (const t of tiers) {
        if (totalSales >= Number(t.from_amount || 0)) {
          appliedTier = t;
        }
      }
      if (appliedTier) {
        const rate = Number(appliedTier.rate_percent) || 0;
        const commission = Math.round(totalSales * (rate / 100));
        return {
          commission,
          breakdown: {
            model: "tiered",
            mode: "retroactive",
            note: "\u0639\u0637\u0641\u200C\u0628\u0647\u200C\u0645\u0627\u0633\u0628\u0642: \u0627\u0639\u0645\u0627\u0644 \u0628\u0627\u0644\u0627\u062A\u0631\u06CC\u0646 \u067E\u0644\u0647 \u0628\u0647 \u06A9\u0644 \u0641\u0631\u0648\u0634",
            applied_tier: appliedTier,
            rate_percent: rate,
            total_sales: totalSales,
            commission
          }
        };
      }
      return {
        commission: 0,
        breakdown: {
          model: "tiered",
          mode: "retroactive",
          note: "\u0641\u0631\u0648\u0634 \u06A9\u0645\u062A\u0631 \u0627\u0632 \u0627\u0648\u0644\u06CC\u0646 \u067E\u0644\u0647 \u0628\u0648\u062F\u0647 \u0627\u0633\u062A"
        }
      };
    }
    let totalCommission = 0;
    const appliedBrackets = [];
    for (const t of tiers) {
      const bStart = Number(t.from_amount || 0);
      const bEnd = t.to_amount !== null && t.to_amount !== void 0 ? Math.min(totalSales, Number(t.to_amount)) : totalSales;
      if (totalSales > bStart && bEnd > bStart) {
        const slice = bEnd - bStart;
        const rate = Number(t.rate_percent) || 0;
        const earned = Math.round(slice * (rate / 100));
        totalCommission += earned;
        appliedBrackets.push({
          from_amount: bStart,
          to_amount: t.to_amount,
          slice_amount: slice,
          rate_percent: rate,
          earned
        });
      }
    }
    return {
      commission: totalCommission,
      breakdown: {
        model: "tiered",
        mode: "marginal",
        note: "\u067E\u0644\u0647\u200C\u0627\u06CC \u0645\u0627\u0632\u0627\u062F: \u0627\u0639\u0645\u0627\u0644 \u062F\u0631\u0635\u062F \u0647\u0631 \u067E\u0644\u0647 \u0628\u0631 \u0645\u0628\u0644\u063A \u0648\u0627\u0642\u0639 \u062F\u0631 \u0647\u0645\u0627\u0646 \u0628\u0627\u0632\u0647",
        applied_brackets: appliedBrackets,
        total_sales: totalSales,
        commission: totalCommission
      }
    };
  }
  return { commission: 0, breakdown: { model: "unknown" } };
}
router14.get(["/api/payroll/configs", "/payroll/configs"], async (req, res) => {
  if (!hasPayrollAccess(req)) {
    return res.status(403).json({ error: "\u062F\u0633\u062A\u0631\u0633\u06CC \u063A\u06CC\u0631\u0645\u062C\u0627\u0632. \u0641\u0642\u0637 \u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645 \u0627\u0645\u06A9\u0627\u0646 \u0645\u0634\u0627\u0647\u062F\u0647 \u0627\u062D\u06A9\u0627\u0645 \u062D\u0642\u0648\u0642 \u0631\u0627 \u062F\u0627\u0631\u062F." });
  }
  if (directusUrl && directusAdminToken) {
    try {
      const resp = await directusFetchAllPages("/items/personnel_salary_configs?sort=-id");
      if (resp && Array.isArray(resp.data)) {
        const list = resp.data.map((c) => ({
          ...c,
          id: c.id,
          personnel_id: typeof c.personnel_id === "object" && c.personnel_id !== null ? String(c.personnel_id.id) : String(c.personnel_id || ""),
          base_salary: Number(c.base_salary) || 0,
          flat_rate_percent: Number(c.flat_rate_percent) || 0,
          min_sales_target: Number(c.min_sales_target) || 0,
          is_active: Boolean(c.is_active),
          commission_tiers: typeof c.commission_tiers === "string" ? JSON.parse(c.commission_tiers || "[]") : c.commission_tiers || []
        }));
        return res.json(list);
      }
    } catch (err) {
      console.warn("Directus personnel_salary_configs fetch notice:", err.message);
    }
  }
  res.json(salaryConfigsData);
});
router14.get(["/api/payroll/configs/:personnelId", "/payroll/configs/:personnelId"], async (req, res) => {
  if (!hasPayrollAccess(req)) {
    return res.status(403).json({ error: "\u062F\u0633\u062A\u0631\u0633\u06CC \u063A\u06CC\u0631\u0645\u062C\u0627\u0632." });
  }
  const { personnelId } = req.params;
  if (directusUrl && directusAdminToken) {
    try {
      const resp = await directusFetch(`/items/personnel_salary_configs?filter[personnel_id][_eq]=${personnelId}&sort=-id&limit=1`);
      if (resp?.data && resp.data.length > 0) {
        const c = resp.data[0];
        const config = {
          ...c,
          id: c.id,
          personnel_id: typeof c.personnel_id === "object" && c.personnel_id !== null ? String(c.personnel_id.id) : String(c.personnel_id || ""),
          base_salary: Number(c.base_salary) || 0,
          flat_rate_percent: Number(c.flat_rate_percent) || 0,
          min_sales_target: Number(c.min_sales_target) || 0,
          is_active: Boolean(c.is_active),
          commission_tiers: typeof c.commission_tiers === "string" ? JSON.parse(c.commission_tiers || "[]") : c.commission_tiers || []
        };
        return res.json(config);
      }
    } catch {
    }
  }
  const found = salaryConfigsData.find((c) => String(c.personnel_id) === String(personnelId));
  if (found) return res.json(found);
  return res.status(404).json({
    personnel_id: personnelId,
    exists: false,
    error: "\u062D\u06A9\u0645 \u062D\u0642\u0648\u0642\u06CC \u0628\u0631\u0627\u06CC \u0627\u06CC\u0646 \u0647\u0645\u06A9\u0627\u0631 \u0647\u0646\u0648\u0632 \u062A\u0639\u0631\u06CC\u0641 \u0646\u0634\u062F\u0647 \u0627\u0633\u062A."
  });
});
router14.post(["/api/payroll/configs", "/payroll/configs"], async (req, res) => {
  if (!hasPayrollAccess(req)) {
    return res.status(403).json({ error: "\u062F\u0633\u062A\u0631\u0633\u06CC \u063A\u06CC\u0631\u0645\u062C\u0627\u0632." });
  }
  const payload = req.body;
  const rawPId = String(payload.personnel_id || "").trim();
  if (!rawPId) {
    return res.status(400).json({ error: "\u0634\u0646\u0627\u0633\u0647 \u067E\u0631\u0633\u0646\u0644 \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A." });
  }
  const resolved = await resolvePersonnelId(rawPId);
  const targetPersonnelId = resolved.personnelId || rawPId;
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const normalizedConfig = {
    personnel_id: targetPersonnelId,
    salary_type: payload.salary_type || "fixed_plus_commission",
    base_salary: Number(payload.base_salary) || 0,
    commission_model: payload.commission_model || "tiered",
    flat_rate_percent: Number(payload.flat_rate_percent) || 0,
    tiered_calculation_mode: payload.tiered_calculation_mode || "marginal",
    commission_tiers: Array.isArray(payload.commission_tiers) ? payload.commission_tiers : [],
    min_sales_target: Number(payload.min_sales_target) || 0,
    is_active: payload.is_active !== void 0 ? Boolean(payload.is_active) : true,
    effective_from: payload.effective_from || nowIso,
    date_updated: nowIso
  };
  const { tenantId } = getRequestUser(req);
  const resolvedTenantNum = resolveDirectusTenantId(payload.tenant_id || tenantId || "default");
  if (directusUrl && directusAdminToken) {
    try {
      const safePId = await getSafeDirectusPersonnelForeignKey(targetPersonnelId);
      const directusPayload = {
        ...normalizedConfig,
        personnel_id: safePId,
        tenant_id: resolvedTenantNum
      };
      const existing = await directusFetch(`/items/personnel_salary_configs?filter[personnel_id][_eq]=${safePId || targetPersonnelId}&limit=1`);
      if (existing?.data && existing.data.length > 0) {
        const existId = existing.data[0].id;
        const updated = await directusFetch(`/items/personnel_salary_configs/${existId}`, {
          method: "PATCH",
          body: JSON.stringify(directusPayload)
        });
        if (updated?.data) {
          const saved = {
            ...updated.data,
            id: updated.data.id,
            personnel_id: targetPersonnelId,
            commission_tiers: typeof updated.data.commission_tiers === "string" ? JSON.parse(updated.data.commission_tiers || "[]") : updated.data.commission_tiers
          };
          const idx2 = salaryConfigsData.findIndex((c) => String(c.personnel_id) === String(targetPersonnelId));
          if (idx2 >= 0) salaryConfigsData[idx2] = saved;
          else salaryConfigsData.push(saved);
          return res.json(saved);
        }
      } else {
        const created = await directusFetch("/items/personnel_salary_configs", {
          method: "POST",
          body: JSON.stringify(directusPayload)
        });
        if (created?.data) {
          const saved = {
            ...created.data,
            id: created.data.id,
            personnel_id: targetPersonnelId,
            commission_tiers: typeof created.data.commission_tiers === "string" ? JSON.parse(created.data.commission_tiers || "[]") : created.data.commission_tiers
          };
          salaryConfigsData.push(saved);
          return res.status(201).json(saved);
        }
      }
    } catch (err) {
      console.warn("Directus personnel_salary_configs write error, fallback to local store:", err.message);
    }
  }
  const idx = salaryConfigsData.findIndex((c) => String(c.personnel_id) === String(targetPersonnelId));
  if (idx >= 0) {
    salaryConfigsData[idx] = {
      ...salaryConfigsData[idx],
      ...normalizedConfig,
      id: salaryConfigsData[idx].id || Date.now()
    };
    return res.json(salaryConfigsData[idx]);
  } else {
    const newItem = {
      ...normalizedConfig,
      id: Date.now(),
      date_created: nowIso
    };
    salaryConfigsData.push(newItem);
    return res.status(201).json(newItem);
  }
});
router14.post(["/api/payroll/calculate", "/payroll/calculate"], async (req, res) => {
  if (!hasPayrollAccess(req)) {
    return res.status(403).json({ error: "\u062F\u0633\u062A\u0631\u0633\u06CC \u063A\u06CC\u0631\u0645\u062C\u0627\u0632." });
  }
  const { from_date, to_date, personnel_id, target_year, target_month } = req.body;
  const { tenantId } = getRequestUser(req);
  const fromIso = from_date ? new Date(from_date).toISOString() : null;
  const toIso = to_date ? new Date(to_date).toISOString() : null;
  const targetYearNum = target_year ? Number(target_year) : null;
  const targetMonthNum = target_month ? Number(target_month) : null;
  let allReports = [];
  if (directusUrl && directusAdminToken) {
    try {
      const resp = await directusFetchAllPages("/items/customer_reports?limit=1000&sort=-date_created");
      if (resp?.data && Array.isArray(resp.data)) {
        allReports = resp.data;
      }
    } catch {
    }
  }
  if (allReports.length === 0) {
    allReports = [...reportsData];
  }
  let allAdvances = [];
  if (directusUrl && directusAdminToken) {
    try {
      const resp = await directusFetchAllPages("/items/advance_requests?filter[status][_eq]=approved&sort=-date_created");
      if (resp?.data && Array.isArray(resp.data)) {
        allAdvances = resp.data;
      }
    } catch {
    }
  }
  if (allAdvances.length === 0) {
    allAdvances = advanceRequestsData.filter((a) => a.status === "approved");
  }
  let allConfigs = [];
  if (directusUrl && directusAdminToken) {
    try {
      const resp = await directusFetchAllPages("/items/personnel_salary_configs");
      if (resp?.data && Array.isArray(resp.data)) {
        allConfigs = resp.data.map((c) => ({
          ...c,
          id: c.id,
          personnel_id: typeof c.personnel_id === "object" && c.personnel_id !== null ? String(c.personnel_id.id) : String(c.personnel_id || ""),
          base_salary: Number(c.base_salary) || 0,
          flat_rate_percent: Number(c.flat_rate_percent) || 0,
          min_sales_target: Number(c.min_sales_target) || 0,
          is_active: Boolean(c.is_active),
          commission_tiers: typeof c.commission_tiers === "string" ? JSON.parse(c.commission_tiers || "[]") : c.commission_tiers || []
        }));
      }
    } catch {
    }
  }
  if (allConfigs.length === 0) {
    allConfigs = [...salaryConfigsData];
  }
  let allAdjustments = [];
  if (directusUrl && directusAdminToken) {
    try {
      const resp = await directusFetchAllPages("/items/payroll_adjustments?fields=*,personnel_id.*&sort=-date_created,-id");
      if (resp?.data && Array.isArray(resp.data)) {
        allAdjustments = resp.data.map(normalizePayrollAdjustment);
      }
    } catch {
    }
  }
  if (allAdjustments.length === 0 && payrollAdjustmentsData.length > 0) {
    allAdjustments = payrollAdjustmentsData.map(normalizePayrollAdjustment);
  }
  if (tenantId && tenantId !== "all") {
    allAdjustments = allAdjustments.filter((a) => {
      if (!a.tenant_id) return true;
      return matchesTenant(String(a.tenant_id), tenantId) || matchesTenant(String(a.tenant_id), "1") || matchesTenant(String(a.tenant_id), "default");
    });
  }
  let targetPersonnel = [...personnelData].filter((p) => p.status !== "inactive" && p.active !== false);
  if (personnel_id && personnel_id !== "all") {
    targetPersonnel = targetPersonnel.filter((p) => String(p.id) === String(personnel_id));
  }
  const results = targetPersonnel.map((p) => {
    const matchingContracts = allReports.filter((r) => {
      const isContract = String(r.negotiation_status || "").trim() === "\u0642\u0631\u0627\u0631\u062F\u0627\u062F" || String(r.negotiation_status || "").includes("\u0642\u0631\u0627\u0631\u062F\u0627\u062F");
      if (!isContract) return false;
      const amt = Number(r.contract_amount || 0);
      if (amt <= 0) return false;
      if (!isReportByPersonnel(r, p)) return false;
      const reportDate = r.contract_date || r.date_created;
      if (!reportDate) return true;
      if (fromIso && new Date(reportDate) < new Date(fromIso)) return false;
      if (toIso && new Date(reportDate) > new Date(toIso)) return false;
      return true;
    });
    const totalContractsAmount = matchingContracts.reduce((sum, r) => sum + (Number(r.contract_amount) || 0), 0);
    const contractsCount = matchingContracts.length;
    const matchingAdvances = allAdvances.filter((a) => {
      const aPId = typeof a.personnel_id === "object" && a.personnel_id !== null ? String(a.personnel_id.id) : String(a.personnel_id || "");
      const cleanAPId = aPId.replace(/^p-/, "");
      const rawPId = String(p.id || "").replace(/^p-/, "");
      const pNameNorm2 = normalizePersianString(p.name);
      const aNameNorm = normalizePersianString(a.personnel_name);
      const isMatch = aPId === p.id || cleanAPId === rawPId || pNameNorm2 && aNameNorm && pNameNorm2 === aNameNorm;
      if (!isMatch) return false;
      const advDate = a.needed_date || a.date_created;
      if (advDate) {
        if (fromIso && new Date(advDate) < new Date(fromIso)) return false;
        if (toIso && new Date(advDate) > new Date(toIso)) return false;
      }
      return true;
    });
    const totalAdvancesDeducted = matchingAdvances.reduce((sum, a) => sum + (Number(a.approved_amount ?? a.amount) || 0), 0);
    const rawPIdClean = String(p.id || "").trim().toLowerCase().replace(/^p-/, "");
    const pNameNorm = normalizePersianString(p.name);
    const matchingPeriodAdjustments = allAdjustments.filter((a) => {
      if (a.payroll_slip_id) return false;
      if (a.status === "rejected") return false;
      const aPId = String(a.personnel_id || "").trim().toLowerCase();
      const cleanAPId = aPId.replace(/^p-/, "");
      const aNameNorm = normalizePersianString(a.personnel_name);
      const isOwner = aPId === String(p.id || "").trim().toLowerCase() || rawPIdClean && cleanAPId === rawPIdClean || pNameNorm && aNameNorm && pNameNorm === aNameNorm;
      if (!isOwner) return false;
      if (targetYearNum && targetMonthNum && a.target_year && a.target_month) {
        return Number(a.target_year) === targetYearNum && Number(a.target_month) === targetMonthNum;
      }
      const adjDate = a.effective_date || a.date_created;
      if (adjDate) {
        if (fromIso && new Date(adjDate) < new Date(fromIso)) return false;
        if (toIso && new Date(adjDate) > new Date(toIso)) return false;
      }
      return true;
    });
    const approvedAdjustments = matchingPeriodAdjustments.filter((a) => a.status === "approved");
    const pendingAdjustments = matchingPeriodAdjustments.filter((a) => a.status === "pending");
    const bonusesAmount = approvedAdjustments.filter((a) => a.type === "bonus").reduce((sum, a) => sum + (Number(a.approved_amount ?? a.amount) || 0), 0);
    const deductionsAmount = approvedAdjustments.filter((a) => a.type === "deduction").reduce((sum, a) => sum + (Number(a.approved_amount ?? a.amount) || 0), 0);
    const config = allConfigs.find((c) => String(c.personnel_id) === String(p.id) && c.is_active !== false) || null;
    if (!config) {
      return {
        personnel_id: p.id,
        personnel_name: p.name,
        personnel_role: p.role,
        avatar: p.profile_image || p.avatar || "",
        has_config: false,
        salary_config: null,
        contracts_count: contractsCount,
        total_contracts_amount: totalContractsAmount,
        contracts_list: matchingContracts.map((c) => ({
          id: c.id,
          contract_number: c.contract_number,
          contract_date: c.contract_date || c.date_created,
          contract_amount: c.contract_amount,
          contract_items: c.contract_items,
          customer_id: c.customer_id
        })),
        base_salary_amount: 0,
        commission_amount: 0,
        commission_breakdown: { note: "\u062D\u06A9\u0645 \u062D\u0642\u0648\u0642\u06CC \u0628\u0631\u0627\u06CC \u0627\u06CC\u0646 \u0647\u0645\u06A9\u0627\u0631 \u0647\u0646\u0648\u0632 \u062A\u0639\u0631\u06CC\u0641 \u0646\u0634\u062F\u0647 \u0627\u0633\u062A" },
        advances_deducted: totalAdvancesDeducted,
        advances_list: matchingAdvances,
        bonuses_amount: bonusesAmount,
        deductions_amount: deductionsAmount,
        adjustments_list: approvedAdjustments,
        pending_adjustments_count: pendingAdjustments.length,
        pending_adjustments_list: pendingAdjustments,
        raw_net_payable: 0,
        net_payable: 0
      };
    }
    const baseSalary = config.salary_type === "commission" ? 0 : Number(config.base_salary) || 0;
    const { commission, breakdown } = calculateCommissionForSales(totalContractsAmount, config);
    const rawNetPayable = baseSalary + commission + bonusesAmount - totalAdvancesDeducted - deductionsAmount;
    const netPayable = Math.max(0, rawNetPayable);
    return {
      personnel_id: p.id,
      personnel_name: p.name,
      personnel_role: p.role,
      avatar: p.profile_image || p.avatar || "",
      has_config: true,
      salary_config: config,
      contracts_count: contractsCount,
      total_contracts_amount: totalContractsAmount,
      contracts_list: matchingContracts.map((c) => ({
        id: c.id,
        contract_number: c.contract_number,
        contract_date: c.contract_date || c.date_created,
        contract_amount: c.contract_amount,
        contract_items: c.contract_items,
        customer_id: c.customer_id
      })),
      base_salary_amount: baseSalary,
      commission_amount: commission,
      commission_breakdown: breakdown,
      advances_deducted: totalAdvancesDeducted,
      advances_list: matchingAdvances,
      bonuses_amount: bonusesAmount,
      deductions_amount: deductionsAmount,
      adjustments_list: approvedAdjustments,
      pending_adjustments_count: pendingAdjustments.length,
      pending_adjustments_list: pendingAdjustments,
      raw_net_payable: rawNetPayable,
      net_payable: netPayable
    };
  });
  res.json({
    from_date: fromIso,
    to_date: toIso,
    target_year: targetYearNum,
    target_month: targetMonthNum,
    total_payable: results.reduce((sum, r) => sum + r.net_payable, 0),
    total_sales: results.reduce((sum, r) => sum + r.total_contracts_amount, 0),
    total_contracts: results.reduce((sum, r) => sum + r.contracts_count, 0),
    total_advances: results.reduce((sum, r) => sum + r.advances_deducted, 0),
    total_bonuses: results.reduce((sum, r) => sum + r.bonuses_amount, 0),
    total_deductions: results.reduce((sum, r) => sum + r.deductions_amount, 0),
    items: results
  });
});
router14.get(["/api/payroll/slips", "/payroll/slips"], async (req, res) => {
  if (!hasPayrollAccess(req)) {
    return res.status(403).json({ error: "\u062F\u0633\u062A\u0631\u0633\u06CC \u063A\u06CC\u0631\u0645\u062C\u0627\u0632." });
  }
  const { personnel_id, status } = req.query;
  if (directusUrl && directusAdminToken) {
    try {
      let filterQuery = "";
      const filters = [];
      if (personnel_id && personnel_id !== "all") {
        filters.push(`filter[personnel_id][_eq]=${personnel_id}`);
      }
      if (status && status !== "all") {
        filters.push(`filter[status][_eq]=${status}`);
      }
      if (filters.length > 0) {
        filterQuery = "&" + filters.join("&");
      }
      const resp = await directusFetchAllPages(`/items/payroll_slips?fields=*,personnel_id.*&sort=-id${filterQuery}`);
      if (resp?.data && Array.isArray(resp.data)) {
        const list2 = resp.data.map((s) => {
          const pIdStr = typeof s.personnel_id === "object" && s.personnel_id !== null ? String(s.personnel_id.id) : String(s.personnel_id || "");
          const pObj = personnelData.find((p) => String(p.id) === pIdStr);
          const pName = (typeof s.personnel_id === "object" && s.personnel_id !== null ? s.personnel_id.name : void 0) || (s.personnel_name && s.personnel_name !== pIdStr ? s.personnel_name : "") || pObj?.name || "\u0647\u0645\u06A9\u0627\u0631 \u06AF\u0631\u0627\u0645\u06CC";
          return {
            ...s,
            id: s.id,
            personnel_id: pIdStr,
            personnel_name: pName,
            base_salary_amount: Number(s.base_salary_amount) || 0,
            total_contracts_amount: Number(s.total_contracts_amount) || 0,
            contracts_count: Number(s.contracts_count) || 0,
            commission_amount: Number(s.commission_amount) || 0,
            advances_deducted: Number(s.advances_deducted) || 0,
            bonuses_amount: Number(s.bonuses_amount) || 0,
            deductions_amount: Number(s.deductions_amount) || 0,
            net_payable: Number(s.net_payable) || 0,
            calculation_breakdown: typeof s.calculation_breakdown === "string" ? JSON.parse(s.calculation_breakdown || "{}") : s.calculation_breakdown || {}
          };
        });
        return res.json(list2);
      }
    } catch (err) {
      console.warn("Directus payroll_slips fetch notice:", err.message);
    }
  }
  let list = payrollSlipsData.map((s) => {
    const pObj = personnelData.find((p) => String(p.id) === String(s.personnel_id));
    return {
      ...s,
      personnel_name: (s.personnel_name && s.personnel_name !== String(s.personnel_id) ? s.personnel_name : "") || pObj?.name || "\u0647\u0645\u06A9\u0627\u0631 \u06AF\u0631\u0627\u0645\u06CC"
    };
  });
  if (personnel_id && personnel_id !== "all") {
    list = list.filter((s) => String(s.personnel_id) === String(personnel_id));
  }
  if (status && status !== "all") {
    list = list.filter((s) => s.status === status);
  }
  res.json(list);
});
router14.post(["/api/payroll/slips", "/payroll/slips"], async (req, res) => {
  if (!hasPayrollAccess(req)) {
    return res.status(403).json({ error: "\u062F\u0633\u062A\u0631\u0633\u06CC \u063A\u06CC\u0631\u0645\u062C\u0627\u0632." });
  }
  const { userName, tenantId } = getRequestUser(req);
  const body = req.body;
  const items = Array.isArray(body) ? body : [body];
  const createdSlips = [];
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  for (const item of items) {
    const rawPId = String(item.personnel_id || "");
    const pObj = personnelData.find((p) => String(p.id) === rawPId);
    const targetName = (item.personnel_name && item.personnel_name !== rawPId ? item.personnel_name : "") || pObj?.name || "\u0647\u0645\u06A9\u0627\u0631 \u06AF\u0631\u0627\u0645\u06CC";
    const baseSalaryAmt = Math.max(0, Math.round(Number(item.base_salary_amount) || 0));
    const commissionAmt = Math.max(0, Math.round(Number(item.commission_amount) || 0));
    const advancesAmt = Math.max(0, Math.round(Number(item.advances_deducted) || 0));
    const bonusesAmt = Math.max(0, Math.round(Number(item.bonuses_amount) || 0));
    const deductionsAmt = Math.max(0, Math.round(Number(item.deductions_amount) || 0));
    const computedNetPayable = Math.max(
      0,
      baseSalaryAmt + commissionAmt + bonusesAmt - advancesAmt - deductionsAmt
    );
    const targetTenantId = pObj?.tenant_id || item.tenant_id || tenantId || "default";
    const resolvedTenantNum = resolveDirectusTenantId(targetTenantId);
    const newSlip = {
      id: Date.now() + Math.floor(Math.random() * 1e3),
      personnel_id: rawPId,
      personnel_name: targetName,
      from_date: item.from_date || null,
      to_date: item.to_date || null,
      base_salary_amount: baseSalaryAmt,
      total_contracts_amount: Math.max(0, Math.round(Number(item.total_contracts_amount) || 0)),
      contracts_count: Math.max(0, Math.round(Number(item.contracts_count) || 0)),
      commission_amount: commissionAmt,
      advances_deducted: advancesAmt,
      bonuses_amount: bonusesAmt,
      deductions_amount: deductionsAmt,
      net_payable: computedNetPayable,
      calculation_breakdown: item.calculation_breakdown || {},
      status: item.status || "approved",
      payment_date: item.payment_date || null,
      payment_ref: item.payment_ref || null,
      created_by: userName || "\u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645",
      tenant_id: targetTenantId,
      date_created: nowIso
    };
    if (directusUrl && directusAdminToken) {
      try {
        const safePId = await getSafeDirectusPersonnelForeignKey(rawPId);
        const directusSlipPayload = {
          personnel_id: safePId,
          tenant_id: resolvedTenantNum,
          from_date: newSlip.from_date,
          to_date: newSlip.to_date,
          base_salary_amount: newSlip.base_salary_amount,
          total_contracts_amount: newSlip.total_contracts_amount,
          contracts_count: newSlip.contracts_count,
          commission_amount: newSlip.commission_amount,
          advances_deducted: newSlip.advances_deducted,
          bonuses_amount: newSlip.bonuses_amount,
          deductions_amount: newSlip.deductions_amount,
          net_payable: newSlip.net_payable,
          calculation_breakdown: newSlip.calculation_breakdown,
          status: newSlip.status,
          payment_date: newSlip.payment_date,
          payment_ref: newSlip.payment_ref,
          created_by: newSlip.created_by
        };
        const resCreated = await directusFetch("/items/payroll_slips", {
          method: "POST",
          body: JSON.stringify(directusSlipPayload)
        });
        if (resCreated?.data) {
          newSlip.id = resCreated.data.id;
        }
      } catch (err) {
        console.warn("Directus payroll_slips POST notice:", err.message);
      }
    }
    const adjustmentIds = Array.isArray(item.adjustment_ids) ? item.adjustment_ids : Array.isArray(item.calculation_breakdown?.adjustments) ? item.calculation_breakdown.adjustments.map((a) => a.id).filter(Boolean) : [];
    for (const adjId of adjustmentIds) {
      const localAdj = payrollAdjustmentsData.find((a) => String(a.id) === String(adjId));
      if (localAdj) {
        localAdj.payroll_slip_id = newSlip.id;
      }
      if (directusUrl && directusAdminToken) {
        try {
          await directusFetch(`/items/payroll_adjustments/${encodeURIComponent(String(adjId))}`, {
            method: "PATCH",
            body: JSON.stringify({ payroll_slip_id: newSlip.id })
          });
        } catch (linkErr) {
          console.warn(`Could not link payroll_adjustment ${adjId} to slip ${newSlip.id}:`, linkErr.message);
        }
      }
    }
    payrollSlipsData.unshift(newSlip);
    createdSlips.push(newSlip);
  }
  res.status(201).json(Array.isArray(body) ? createdSlips : createdSlips[0]);
});
router14.patch(["/api/payroll/slips/:id", "/payroll/slips/:id"], async (req, res) => {
  if (!hasPayrollAccess(req)) {
    return res.status(403).json({ error: "\u062F\u0633\u062A\u0631\u0633\u06CC \u063A\u06CC\u0631\u0645\u062C\u0627\u0632." });
  }
  const { id } = req.params;
  const patch = req.body;
  if (directusUrl && directusAdminToken) {
    try {
      const updated = await directusFetch(`/items/payroll_slips/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch)
      });
      if (updated?.data) {
        const idx2 = payrollSlipsData.findIndex((s) => String(s.id) === String(id));
        if (idx2 >= 0) payrollSlipsData[idx2] = { ...payrollSlipsData[idx2], ...updated.data };
        return res.json(updated.data);
      }
    } catch (err) {
      console.warn("Directus payroll_slips PATCH notice:", err.message);
    }
  }
  const idx = payrollSlipsData.findIndex((s) => String(s.id) === String(id));
  if (idx >= 0) {
    payrollSlipsData[idx] = { ...payrollSlipsData[idx], ...patch };
    return res.json(payrollSlipsData[idx]);
  }
  res.status(404).json({ error: "\u0641\u06CC\u0634 \u062D\u0642\u0648\u0642\u06CC \u06CC\u0627\u0641\u062A \u0646\u0634\u062F" });
});
router14.delete(["/api/payroll/slips/:id", "/payroll/slips/:id"], async (req, res) => {
  if (!hasPayrollAccess(req)) {
    return res.status(403).json({ error: "\u062F\u0633\u062A\u0631\u0633\u06CC \u063A\u06CC\u0631\u0645\u062C\u0627\u0632." });
  }
  const { id } = req.params;
  if (directusUrl && directusAdminToken) {
    try {
      await directusFetch(`/items/payroll_slips/${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch {
    }
  }
  payrollAdjustmentsData.forEach((adj) => {
    if (String(adj.payroll_slip_id) === String(id)) {
      adj.payroll_slip_id = null;
    }
  });
  const idx = payrollSlipsData.findIndex((s) => String(s.id) === String(id));
  if (idx >= 0) {
    payrollSlipsData.splice(idx, 1);
  }
  res.json({ success: true });
});
var payroll_routes_default = router14;

// server/routes/search.routes.ts
import { Router as Router15 } from "express";
var router15 = Router15();
function toEnglishDigits(str) {
  const persianDigits = "\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9";
  const arabicDigits = "\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669";
  return String(str || "").replace(/[۰-۹]/g, (w) => String(persianDigits.indexOf(w))).replace(/[٠-٩]/g, (w) => String(arabicDigits.indexOf(w)));
}
function extractDigits(str) {
  return toEnglishDigits(str).replace(/[^\d]/g, "");
}
function normalizePhoneDigits(digits) {
  if (!digits) return "";
  if (digits.startsWith("0098") && digits.length > 4) return "0" + digits.slice(4);
  if (digits.startsWith("98") && digits.length >= 11) return "0" + digits.slice(2);
  if (digits.length === 10 && digits.startsWith("9")) return "0" + digits;
  return digits;
}
function isFreePoolCustomer(c) {
  if (!c) return false;
  const st = String(c.status || "").trim();
  if (st === "\u0642\u0631\u0627\u0631\u062F\u0627\u062F" || st === "\u0642\u0631\u0627\u0631\u062F\u0627\u062F / \u0641\u0627\u06A9\u062A\u0648\u0631" || st === "\u0642\u0631\u0627\u0631\u062F\u0627\u062F/\u0641\u0627\u06A9\u062A\u0648\u0631" || st === "\u0644\u06CC\u0633\u062A \u0633\u06CC\u0627\u0647") {
    return false;
  }
  const isUnassigned = !c.assigned_marketer_id || c.assigned_marketer_name === "\u062A\u062E\u0635\u06CC\u0635 \u0646\u06CC\u0627\u0641\u062A\u0647";
  const isDeadlinePassed = Boolean(
    c.assignment_deadline && Date.now() > new Date(c.assignment_deadline).getTime()
  );
  return Boolean(c.is_expired || isDeadlinePassed || isUnassigned);
}
function customerBelongsToUser(c, personnelId, userId, userName) {
  if (!c) return false;
  const cMid = String(c.assigned_marketer_id || "").trim().toLowerCase();
  const cMname = normalizePersianString(c.assigned_marketer_name);
  const pId = String(personnelId || "").trim().toLowerCase();
  const rawPId = pId.replace(/^p-/, "");
  const uId = String(userId || "").trim().toLowerCase();
  const uNameNorm = normalizePersianString(userName);
  if (cMid) {
    if (pId && (cMid === pId || cMid === rawPId || cMid === `p-${rawPId}`)) return true;
    if (uId && (cMid === uId || cMid === `p-${uId}`)) return true;
  }
  if (uNameNorm && cMname && (cMname === uNameNorm || cMname.includes(uNameNorm))) {
    return true;
  }
  return false;
}
function scoreCustomerAndReason(c, normQuery, normPhoneDigits) {
  let score = 10;
  let reason = "\u062A\u0637\u0627\u0628\u0642 \u0645\u0634\u062E\u0635\u0627\u062A";
  const companyNorm = normalizePersianString(c.company_name);
  const managerNorm = normalizePersianString(c.manager_name);
  const negotiatorNorm = normalizePersianString(c.negotiator_name);
  const cityNorm = normalizePersianString(`${c.city || ""} ${c.province || ""}`);
  const businessNorm = normalizePersianString(c.business_type);
  if (normQuery) {
    if (companyNorm === normQuery) {
      score = Math.max(score, 120);
      reason = "\u062A\u0637\u0627\u0628\u0642 \u062F\u0642\u06CC\u0642 \u0646\u0627\u0645 \u0634\u0631\u06A9\u062A";
    } else if (companyNorm.startsWith(normQuery)) {
      score = Math.max(score, 90);
      reason = "\u0646\u0627\u0645 \u0634\u0631\u06A9\u062A / \u0628\u0631\u0646\u062F";
    } else if (companyNorm.includes(normQuery)) {
      score = Math.max(score, 65);
      reason = "\u0646\u0627\u0645 \u0634\u0631\u06A9\u062A / \u0628\u0631\u0646\u062F";
    }
    if (managerNorm.includes(normQuery)) {
      score = Math.max(score, managerNorm.startsWith(normQuery) ? 80 : 55);
      if (reason === "\u062A\u0637\u0627\u0628\u0642 \u0645\u0634\u062E\u0635\u0627\u062A") reason = "\u0646\u0627\u0645 \u0645\u062F\u06CC\u0631\u06CC\u062A";
    }
    if (negotiatorNorm.includes(normQuery)) {
      score = Math.max(score, negotiatorNorm.startsWith(normQuery) ? 75 : 50);
      if (reason === "\u062A\u0637\u0627\u0628\u0642 \u0645\u0634\u062E\u0635\u0627\u062A") reason = "\u0637\u0631\u0641 \u0645\u0630\u0627\u06A9\u0631\u0647";
    }
    if (businessNorm.includes(normQuery)) {
      score = Math.max(score, 40);
      if (reason === "\u062A\u0637\u0627\u0628\u0642 \u0645\u0634\u062E\u0635\u0627\u062A") reason = "\u0635\u0646\u0641 \u0648 \u0641\u0639\u0627\u0644\u06CC\u062A";
    }
    if (cityNorm.includes(normQuery)) {
      score = Math.max(score, 35);
      if (reason === "\u062A\u0637\u0627\u0628\u0642 \u0645\u0634\u062E\u0635\u0627\u062A") reason = "\u0634\u0647\u0631 / \u0627\u0633\u062A\u0627\u0646";
    }
  }
  if (normPhoneDigits.length >= 3) {
    const allNums = [
      ...Array.isArray(c.mobile_numbers) ? c.mobile_numbers : [],
      ...Array.isArray(c.landline_numbers) ? c.landline_numbers : [],
      ...Array.isArray(c.manager_phones) ? c.manager_phones : [],
      ...Array.isArray(c.negotiator_phones) ? c.negotiator_phones : [],
      c.telegram_phone,
      ...Array.isArray(c.contacts) ? c.contacts.map((ct) => ct?.normalized_value || ct?.value) : []
    ].filter(Boolean);
    for (const num of allNums) {
      const d = normalizePhoneDigits(extractDigits(String(num)));
      if (!d) continue;
      if (d === normPhoneDigits) {
        score = Math.max(score, 140);
        reason = "\u062A\u0637\u0627\u0628\u0642 \u062F\u0642\u06CC\u0642 \u0634\u0645\u0627\u0631\u0647 \u062A\u0645\u0627\u0633";
        break;
      }
      if (d.endsWith(normPhoneDigits) || d.includes(normPhoneDigits)) {
        score = Math.max(score, 105);
        reason = "\u0634\u0645\u0627\u0631\u0647 \u062A\u0645\u0627\u0633";
        break;
      }
    }
  }
  const socialAndEmail = [
    ...Array.isArray(c.telegram_ids) ? c.telegram_ids : [],
    ...Array.isArray(c.instagram_ids) ? c.instagram_ids : [],
    ...Array.isArray(c.emails) ? c.emails : [],
    ...Array.isArray(c.websites) ? c.websites : []
  ].filter(Boolean);
  if (normQuery && socialAndEmail.some((v) => String(v).toLowerCase().includes(normQuery))) {
    score = Math.max(score, 70);
    reason = "\u0634\u0628\u06A9\u0647 \u0627\u062C\u062A\u0645\u0627\u0639\u06CC / \u0627\u06CC\u0645\u06CC\u0644 / \u0633\u0627\u06CC\u062A";
  }
  if (c.status === "\u0642\u0631\u0627\u0631\u062F\u0627\u062F" || c.status === "\u0642\u0631\u0627\u0631\u062F\u0627\u062F / \u0641\u0627\u06A9\u062A\u0648\u0631") {
    score += 5;
  }
  return { score, match_reason: reason };
}
function matchesStatusFilter(statusVal, filterStatus, isExpired) {
  if (!filterStatus || filterStatus === "all" || filterStatus === "\u0647\u0645\u0647") return true;
  if (filterStatus === "expired") return Boolean(isExpired);
  if (filterStatus === "\u0642\u0631\u0627\u0631\u062F\u0627\u062F" || filterStatus === "\u0642\u0631\u0627\u0631\u062F\u0627\u062F / \u0641\u0627\u06A9\u062A\u0648\u0631") {
    const st = String(statusVal || "").trim();
    return st === "\u0642\u0631\u0627\u0631\u062F\u0627\u062F" || st === "\u0642\u0631\u0627\u0631\u062F\u0627\u062F / \u0641\u0627\u06A9\u062A\u0648\u0631" || st === "\u0642\u0631\u0627\u0631\u062F\u0627\u062F/\u0641\u0627\u06A9\u062A\u0648\u0631";
  }
  return String(statusVal || "").trim() === filterStatus;
}
router15.get("/", async (req, res) => {
  const startTime = Date.now();
  const {
    q = "",
    scope = "all",
    status = "all",
    marketer_id = "all",
    limit = "10"
  } = req.query;
  const userCtx = getRequestUser(req);
  const {
    userId,
    personnelId,
    isAdmin,
    isPersonnelAdmin,
    canViewAllCustomers,
    reportViewScope,
    userName,
    tenantId,
    isAuthenticated
  } = userCtx;
  const rawQuery = String(q || "").trim();
  const maxLimit = Math.min(Math.max(1, parseInt(String(limit), 10) || 10), 25);
  const scopeStr = String(scope || "all");
  const statusFilter = String(status || "all");
  const marketerFilter = String(marketer_id || "all");
  if (!isAuthenticated) {
    return res.status(401).json({
      error: "UNAUTHORIZED",
      message: "\u0628\u0631\u0627\u06CC \u0627\u0646\u062C\u0627\u0645 \u062C\u0633\u062A\u062C\u0648 \u0628\u0627\u06CC\u062F \u0648\u0627\u0631\u062F \u062D\u0633\u0627\u0628 \u06A9\u0627\u0631\u0628\u0631\u06CC \u062E\u0648\u062F \u0634\u0648\u06CC\u062F."
    });
  }
  if (rawQuery.length < 2 && statusFilter === "all" && marketerFilter === "all") {
    return res.json({
      customers: [],
      free_pool: [],
      reports: [],
      cold_leads: [],
      personnel: [],
      phoneConflict: null,
      meta: {
        query: rawQuery,
        elapsed_ms: Date.now() - startTime,
        source: directusUrl && directusAdminToken ? "directus" : "memory"
      }
    });
  }
  const normQuery = normalizePersianString(rawQuery);
  const rawDigits = extractDigits(rawQuery);
  const normPhoneDigits = normalizePhoneDigits(rawDigits);
  const isPhoneLike = rawDigits.length >= 4 && /^[\d۰-۹٠-٩+\s\-()]+$/.test(rawQuery);
  const canSeeAllCust = Boolean(isAdmin || isPersonnelAdmin || canViewAllCustomers);
  const canSeeAllRep = Boolean(canSeeAllCust || reportViewScope === "all");
  const canSeePersonnel = Boolean(isAdmin || isPersonnelAdmin || canViewAllCustomers);
  const wantCustomers = scopeStr === "all" || scopeStr === "customers";
  const wantFreePool = scopeStr === "all" || scopeStr === "free_pool";
  const wantReports = scopeStr === "all" || scopeStr === "reports";
  const wantColdLeads = scopeStr === "all" || scopeStr === "cold_leads";
  const wantPersonnel = (scopeStr === "all" || scopeStr === "personnel") && canSeePersonnel;
  const hasDirectus = Boolean(directusUrl && directusAdminToken);
  try {
    let allTenantCustomers = [];
    if (wantCustomers || wantFreePool) {
      if (hasDirectus) {
        const cached = await ensureCustomersCache().catch(() => []);
        allTenantCustomers = (Array.isArray(cached) ? cached : []).map((c) => computeCustomerExpiration(c));
        if (isPhoneLike && normPhoneDigits.length >= 5) {
          const contactRes = await directusFetch(
            `/items/customer_contacts?filter[_or][0][normalized_value][_icontains]=${encodeURIComponent(
              normPhoneDigits
            )}&filter[_or][1][value][_icontains]=${encodeURIComponent(
              rawDigits
            )}&fields=customer_id.*&limit=15`
          ).catch(() => null);
          if (contactRes?.data && Array.isArray(contactRes.data)) {
            const existingIds = new Set(allTenantCustomers.map((c) => String(c.id)));
            for (const row of contactRes.data) {
              const cust = row?.customer_id;
              if (cust && typeof cust === "object" && cust.id && !existingIds.has(String(cust.id))) {
                existingIds.add(String(cust.id));
                allTenantCustomers.push(computeCustomerExpiration(cust));
              }
            }
          }
        }
      } else {
        updateExpirationFlags();
        allTenantCustomers = customersData.map((c) => computeCustomerExpiration(c));
      }
      if (tenantId && tenantId !== "all") {
        allTenantCustomers = allTenantCustomers.filter((c) => matchesTenant(c.tenant_id, tenantId));
      }
    }
    let matchedCustomers = [];
    let matchedFreePool = [];
    if (wantCustomers) {
      let scoped = canSeeAllCust ? allTenantCustomers : allTenantCustomers.filter((c) => customerBelongsToUser(c, personnelId, userId, userName));
      if (canSeeAllCust && marketerFilter && marketerFilter !== "all" && marketerFilter !== "\u0647\u0645\u0647") {
        scoped = scoped.filter((c) => String(c.assigned_marketer_id || "") === marketerFilter);
      }
      if (statusFilter !== "all") {
        scoped = scoped.filter((c) => matchesStatusFilter(c.status, statusFilter, c.is_expired));
      }
      if (rawQuery) {
        scoped = scoped.filter((c) => matchesCustomerSearch(c, rawQuery));
      }
      matchedCustomers = scoped.map((c) => {
        const { score, match_reason } = scoreCustomerAndReason(c, normQuery, normPhoneDigits);
        return { ...c, _search_score: score, match_reason };
      }).sort((a, b) => b._search_score - a._search_score).slice(0, maxLimit);
    }
    const matchedCustIdSet = new Set(matchedCustomers.map((c) => String(c.id)));
    if (wantFreePool && rawQuery.length >= 2) {
      const freeCandidates = allTenantCustomers.filter(
        (c) => !matchedCustIdSet.has(String(c.id)) && isFreePoolCustomer(c) && matchesCustomerSearch(c, rawQuery)
      );
      matchedFreePool = freeCandidates.map((c) => {
        const { score, match_reason } = scoreCustomerAndReason(c, normQuery, normPhoneDigits);
        return { ...c, _search_score: score, match_reason };
      }).sort((a, b) => b._search_score - a._search_score).slice(0, Math.min(maxLimit, 8));
    }
    const customerNameMap = /* @__PURE__ */ new Map();
    for (const c of allTenantCustomers) {
      if (c?.id && c?.company_name) {
        customerNameMap.set(String(c.id), c.company_name);
      }
    }
    const searchReportsPromise = (async () => {
      if (!wantReports || rawQuery.length < 2) return [];
      let rawReports = [];
      if (hasDirectus) {
        const searchTerm = isPhoneLike && normPhoneDigits.length >= 4 ? normPhoneDigits : rawQuery;
        let dPath = `/items/customer_reports?limit=35&sort=-date_created`;
        let andIdx = 0;
        if (tenantId && tenantId !== "all") {
          const tNum = resolveDirectusTenantId(tenantId);
          if (tNum && tNum > 1) {
            dPath += `&filter[_and][${andIdx++}][tenant_id][_eq]=${tNum}`;
          }
        }
        if (!canSeeAllRep && (userName || personnelId || userId)) {
          let rOr = 0;
          if (userName) {
            dPath += `&filter[_and][${andIdx}][_or][${rOr++}][negotiator_name][_icontains]=${encodeURIComponent(userName)}`;
            dPath += `&filter[_and][${andIdx}][_or][${rOr++}][customer_id][assigned_marketer_name][_icontains]=${encodeURIComponent(userName)}`;
          }
          if (personnelId) {
            dPath += `&filter[_and][${andIdx}][_or][${rOr++}][customer_id][assigned_marketer_id][_eq]=${encodeURIComponent(String(personnelId))}`;
            const rawP = String(personnelId).replace(/^p-/, "");
            if (rawP !== String(personnelId)) {
              dPath += `&filter[_and][${andIdx}][_or][${rOr++}][customer_id][assigned_marketer_id][_eq]=${encodeURIComponent(rawP)}`;
            }
          }
          if (userId) {
            dPath += `&filter[_and][${andIdx}][_or][${rOr++}][customer_id][assigned_marketer_id][_eq]=${encodeURIComponent(String(userId))}`;
          }
          andIdx++;
        }
        const cleanQueryTerm = rawQuery.replace(/^#/, "");
        let qOr = 0;
        dPath += `&filter[_and][${andIdx}][_or][${qOr++}][report_text][_icontains]=${encodeURIComponent(rawQuery)}`;
        dPath += `&filter[_and][${andIdx}][_or][${qOr++}][contract_number][_icontains]=${encodeURIComponent(cleanQueryTerm)}`;
        dPath += `&filter[_and][${andIdx}][_or][${qOr++}][contract_items][_icontains]=${encodeURIComponent(rawQuery)}`;
        dPath += `&filter[_and][${andIdx}][_or][${qOr++}][negotiation_phone][_icontains]=${encodeURIComponent(searchTerm)}`;
        dPath += `&filter[_and][${andIdx}][_or][${qOr++}][negotiator_name][_icontains]=${encodeURIComponent(rawQuery)}`;
        dPath += `&filter[_and][${andIdx}][_or][${qOr++}][customer_negotiator_name][_icontains]=${encodeURIComponent(rawQuery)}`;
        dPath += `&filter[_and][${andIdx}][_or][${qOr++}][customer_id][company_name][_icontains]=${encodeURIComponent(rawQuery)}`;
        if (rawDigits && rawDigits !== cleanQueryTerm) {
          dPath += `&filter[_and][${andIdx}][_or][${qOr++}][contract_number][_icontains]=${encodeURIComponent(rawDigits)}`;
        }
        andIdx++;
        dPath += `&fields=${encodeURIComponent(
          "id,customer_id.id,customer_id.company_name,customer_id.assigned_marketer_id,customer_id.assigned_marketer_name,negotiator_name,customer_negotiator_name,negotiation_phone,report_text,negotiation_score,next_followup_date,negotiation_status,created_by,tenant_id,date_created,contract_number,contract_date,contract_items,contract_amount"
        )}`;
        const [directRes, cachedReps] = await Promise.all([
          directusFetch(dPath).catch(() => null),
          ensureReportsCache().catch(() => [])
        ]);
        const seenRepIds = /* @__PURE__ */ new Set();
        const combined = [];
        for (const r of [...directRes?.data || [], ...Array.isArray(cachedReps) ? cachedReps : []]) {
          if (!r || !r.id || seenRepIds.has(String(r.id))) continue;
          seenRepIds.add(String(r.id));
          const cObj = typeof r.customer_id === "object" && r.customer_id !== null ? r.customer_id : null;
          const cId = cObj ? String(cObj.id || "") : String(r.customer_id || "");
          const cName = r.customer_name || cObj?.company_name || customerNameMap.get(cId) || "";
          combined.push({
            ...r,
            customer_id: cId,
            customer_name: cName,
            _cust_marketer_id: cObj?.assigned_marketer_id || "",
            _cust_marketer_name: cObj?.assigned_marketer_name || ""
          });
        }
        rawReports = combined;
      } else {
        rawReports = reportsData.map((r) => ({
          ...r,
          customer_name: r.customer_name || customerNameMap.get(String(r.customer_id)) || ""
        }));
      }
      if (tenantId && tenantId !== "all") {
        rawReports = rawReports.filter((r) => matchesTenant(r.tenant_id, tenantId));
      }
      if (!canSeeAllRep) {
        const pId = String(personnelId || "").trim().toLowerCase();
        const uId = String(userId || "").trim().toLowerCase();
        const uNorm = normalizePersianString(userName);
        rawReports = rawReports.filter((r) => {
          const cb = String(r.created_by || "").trim().toLowerCase();
          const neg = normalizePersianString(r.negotiator_name);
          const mId = String(r._cust_marketer_id || "").trim().toLowerCase();
          if (pId && (cb === pId || mId === pId || mId === pId.replace(/^p-/, ""))) return true;
          if (uId && (cb === uId || mId === uId)) return true;
          if (uNorm && neg && (neg === uNorm || neg.includes(uNorm))) return true;
          return false;
        });
      }
      if (statusFilter !== "all" && statusFilter !== "expired") {
        rawReports = rawReports.filter((r) => matchesStatusFilter(r.negotiation_status, statusFilter));
      }
      const cleanContractNeedle = rawDigits || normQuery.replace(/^#/, "");
      return rawReports.map((r) => {
        let score = 0;
        let matchReason = "";
        const contractNumDigits = extractDigits(r.contract_number || "");
        const contractNumNorm = normalizePersianString(r.contract_number || "");
        const phoneDigits = normalizePhoneDigits(extractDigits(r.negotiation_phone || ""));
        const itemsNorm = normalizePersianString(r.contract_items || "");
        const textNorm = normalizePersianString(r.report_text || "");
        const custNameNorm = normalizePersianString(r.customer_name || "");
        const negNorm = normalizePersianString(`${r.negotiator_name || ""} ${r.customer_negotiator_name || ""}`);
        if (cleanContractNeedle && (contractNumDigits.includes(cleanContractNeedle) || contractNumNorm.includes(cleanContractNeedle))) {
          score = contractNumDigits === cleanContractNeedle ? 140 : 110;
          matchReason = `\u0634\u0645\u0627\u0631\u0647 \u0642\u0631\u0627\u0631\u062F\u0627\u062F ${r.contract_number}`;
        } else if (normPhoneDigits.length >= 4 && phoneDigits.includes(normPhoneDigits)) {
          score = phoneDigits === normPhoneDigits ? 130 : 95;
          matchReason = "\u0634\u0645\u0627\u0631\u0647 \u062A\u0645\u0627\u0633 \u0645\u0630\u0627\u06A9\u0631\u0647";
        } else if (normQuery && itemsNorm.includes(normQuery)) {
          score = 80;
          matchReason = "\u0627\u0642\u0644\u0627\u0645 \u0642\u0631\u0627\u0631\u062F\u0627\u062F";
        } else if (normQuery && custNameNorm.includes(normQuery)) {
          score = 65;
          matchReason = "\u0646\u0627\u0645 \u0645\u0634\u062A\u0631\u06CC";
        } else if (normQuery && negNorm.includes(normQuery)) {
          score = 55;
          matchReason = "\u0645\u0630\u0627\u06A9\u0631\u0647\u200C\u06A9\u0646\u0646\u062F\u0647";
        } else if (normQuery && textNorm.includes(normQuery)) {
          score = 45;
          matchReason = "\u0645\u062A\u0646 \u0645\u0630\u0627\u06A9\u0631\u0647";
        }
        return score > 0 ? { ...r, _search_score: score, match_reason: matchReason } : null;
      }).filter(Boolean).sort((a, b) => b._search_score - a._search_score).slice(0, Math.min(maxLimit, 8));
    })();
    const searchColdLeadsPromise = (async () => {
      if (!wantColdLeads || rawQuery.length < 2) return [];
      let leads = [];
      if (hasDirectus) {
        const cleanTerm = isPhoneLike && normPhoneDigits ? normPhoneDigits : rawQuery;
        let lPath = `/items/cold_leads?limit=20&sort=-date_created`;
        lPath += `&filter[_or][0][phone_number][_icontains]=${encodeURIComponent(cleanTerm)}`;
        lPath += `&filter[_or][1][contact_name][_icontains]=${encodeURIComponent(rawQuery)}`;
        lPath += `&filter[_or][2][notes][_icontains]=${encodeURIComponent(rawQuery)}`;
        lPath += `&filter[_or][3][source][_icontains]=${encodeURIComponent(rawQuery)}`;
        if (rawDigits && rawDigits !== cleanTerm) {
          lPath += `&filter[_or][4][phone_number][_icontains]=${encodeURIComponent(rawDigits)}`;
        }
        const lRes = await directusFetch(lPath).catch(() => null);
        if (lRes?.data && Array.isArray(lRes.data)) {
          leads = lRes.data.map((l) => ({
            ...l,
            assigned_to_id: typeof l.assigned_to === "object" && l.assigned_to !== null ? l.assigned_to.id : String(l.assigned_to || ""),
            assigned_to_name: l.assigned_to_name || (typeof l.assigned_to === "object" && l.assigned_to !== null ? l.assigned_to.name || l.assigned_to.first_name : "\u062A\u062E\u0635\u06CC\u0635 \u0646\u06CC\u0627\u0641\u062A\u0647")
          }));
        }
      } else {
        leads = coldLeadsData;
      }
      if (tenantId && tenantId !== "all") {
        leads = leads.filter((l) => matchesTenant(l.tenant_id, tenantId));
      }
      if (!canSeeAllCust) {
        leads = leads.filter(
          (l) => personnelId && (l.assigned_to_id === personnelId || l.assigned_to === personnelId) || userId && (l.assigned_to_id === userId || l.assigned_to === userId) || userName && (l.assigned_to_name === userName || l.assigned_to === userName)
        );
      }
      return leads.filter((l) => {
        const pDigits = normalizePhoneDigits(extractDigits(l.phone_number || ""));
        if (normPhoneDigits.length >= 3 && pDigits.includes(normPhoneDigits)) return true;
        const hay = normalizePersianString(`${l.contact_name || ""} ${l.source || ""} ${l.notes || ""}`);
        return Boolean(normQuery && hay.includes(normQuery));
      }).slice(0, 6).map((l) => ({
        ...l,
        match_reason: normPhoneDigits.length >= 3 && normalizePhoneDigits(extractDigits(l.phone_number || "")).includes(normPhoneDigits) ? "\u0634\u0645\u0627\u0631\u0647 \u0644\u06CC\u062F \u0633\u0631\u062F" : "\u0645\u0634\u062E\u0635\u0627\u062A \u0644\u06CC\u062F \u0633\u0631\u062F"
      }));
    })();
    const searchPersonnelPromise = (async () => {
      if (!wantPersonnel || rawQuery.length < 2) return [];
      let pList = personnelData;
      if (tenantId && tenantId !== "all") {
        pList = pList.filter((p) => matchesTenant(p.tenant_id, tenantId));
      }
      return pList.filter((p) => {
        if (p.status === "inactive" || p.active === false) return false;
        const hay = normalizePersianString(`${p.name || ""} ${p.username || ""} ${p.email || ""} ${p.role || ""}`);
        if (normQuery && hay.includes(normQuery)) return true;
        if (normPhoneDigits.length >= 3) {
          const pPhone = normalizePhoneDigits(extractDigits(p.phone || ""));
          if (pPhone.includes(normPhoneDigits)) return true;
        }
        return false;
      }).slice(0, 5).map((p) => ({
        id: p.id,
        name: p.name,
        username: p.username,
        role: p.role,
        phone: p.phone,
        avatar: p.profile_image || p.avatar
      }));
    })();
    const conflictPromise = (async () => {
      if (rawDigits.length < 5) return null;
      const dup = await asyncCheckContactDuplicate(normPhoneDigits || rawDigits, "mobile").catch(() => null);
      if (!dup || !dup.isDuplicate || !dup.matchedCustomer) return null;
      const mcId = String(dup.matchedCustomer.id);
      const alreadyVisible = matchedCustIdSet.has(mcId) || matchedFreePool.some((fc) => String(fc.id) === mcId);
      if (alreadyVisible) return null;
      return dup;
    })();
    const [matchedReports, matchedColdLeads, matchedPersonnel, phoneConflict] = await Promise.all([
      searchReportsPromise,
      searchColdLeadsPromise,
      searchPersonnelPromise,
      conflictPromise
    ]);
    return res.json({
      customers: matchedCustomers,
      free_pool: matchedFreePool,
      reports: matchedReports,
      cold_leads: matchedColdLeads,
      personnel: matchedPersonnel,
      phoneConflict,
      meta: {
        query: rawQuery,
        normalized_phone: isPhoneLike ? normPhoneDigits : null,
        elapsed_ms: Date.now() - startTime,
        source: hasDirectus ? "directus" : "memory"
      }
    });
  } catch (err) {
    console.error("Deep search endpoint error:", err);
    return res.status(500).json({
      error: "SEARCH_ERROR",
      message: err?.message || "\u062E\u0637\u0627 \u062F\u0631 \u0627\u062C\u0631\u0627\u06CC \u062C\u0633\u062A\u062C\u0648\u06CC \u0639\u0645\u06CC\u0642 \u0633\u0631\u0648\u0631"
    });
  }
});
var search_routes_default = router15;

// server/index.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path3.dirname(__filename);
var app = express();
app.get(["/health", "/api/health"], (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    directusConnected: Boolean(directusUrl && directusAdminToken && !isDirectusCircuitOpen())
  });
});
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));
app.use(rateLimiter);
app.use(checkInactivePersonnel);
var publicAvatarsDir = path3.resolve(process.cwd(), "public/assets/avatars");
var publicUploadsDir = path3.resolve(process.cwd(), "public/uploads");
if (fs3.existsSync(publicAvatarsDir)) {
  app.use("/assets/avatars", express.static(publicAvatarsDir, { maxAge: "7d" }));
}
if (fs3.existsSync(publicUploadsDir)) {
  app.use("/uploads", express.static(publicUploadsDir, { maxAge: "7d" }));
}
app.use("/api/auth", auth_routes_default);
app.use("/api", auth_routes_default);
app.use(auth_routes_default);
app.use("/api/personnel", personnel_routes_default);
app.use("/api/customers", customers_routes_default);
app.use("/api/customer-reports", reports_routes_default);
app.use("/customer-reports", reports_routes_default);
app.use("/api/reports", reports_routes_default);
app.use("/reports", reports_routes_default);
app.use("/api/contacts", contacts_routes_default);
app.use("/contacts", contacts_routes_default);
app.use("/api/tenants", tenants_routes_default);
app.use("/api/analytics", analytics_routes_default);
app.use(analytics_routes_default);
app.use(coldLeads_routes_default);
app.use(leaveRequests_routes_default);
app.use(advanceRequests_routes_default);
app.use(adminReports_routes_default);
app.use(system_routes_default);
app.use(payroll_routes_default);
app.use("/api/payroll", payroll_routes_default);
app.use("/payroll", payroll_routes_default);
app.use(payrollAdjustments_routes_default);
app.use("/api/search", search_routes_default);
app.use("/search", search_routes_default);
async function startServer() {
  const candidateDistDirs = [
    path3.resolve(process.cwd(), "dist"),
    path3.resolve(__dirname, "dist"),
    path3.resolve(__dirname, "../dist"),
    path3.resolve(__dirname, "../../dist")
  ];
  const distPath = candidateDistDirs.find(
    (p) => fs3.existsSync(p) && fs3.existsSync(path3.resolve(p, "index.html"))
  );
  const hasDist = Boolean(distPath);
  if (process.env.NODE_ENV === "production") {
    if (hasDist && distPath) {
      console.log(`[Production] Serving pre-compiled frontend assets from ${distPath}`);
      const assetsPath = path3.resolve(distPath, "assets");
      if (fs3.existsSync(assetsPath)) {
        app.use("/assets", express.static(assetsPath, {
          maxAge: "1y",
          immutable: true
        }));
      }
      app.use(express.static(distPath));
      app.get("*", (req, res, next) => {
        if (req.path.startsWith("/api") || req.path.startsWith("/assets") || req.path === "/health" || req.path === "/bff-status") {
          return next();
        }
        res.sendFile(path3.resolve(distPath, "index.html"));
      });
    } else {
      console.warn("Production build dist folder not found! Providing graceful fallback response.");
      app.get("/", (req, res) => {
        res.status(200).send("AlphaDesk CRM Server is operational. Building client bundle...");
      });
    }
  } else {
    let viteInstance = null;
    const viteInitPromise = import("vite").then(
      ({ createServer: createViteServer }) => createViteServer({
        server: { middlewareMode: true, allowedHosts: true },
        appType: "spa"
      })
    ).then((vite) => {
      viteInstance = vite;
      console.log("Vite development middleware mounted successfully.");
      return vite;
    }).catch((viteErr) => {
      console.warn("Vite development middleware could not be loaded:", viteErr?.message || viteErr);
      return null;
    });
    app.use(async (req, res, next) => {
      if (viteInstance) {
        return viteInstance.middlewares(req, res, next);
      }
      try {
        const vite = await viteInitPromise;
        if (vite) {
          return vite.middlewares(req, res, next);
        }
      } catch (err) {
        console.error("Error delegating request to Vite middleware:", err);
      }
      next();
    });
  }
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT} (0.0.0.0)`);
    console.log(
      `BFF Mode: ${directusUrl && !isDirectusCircuitOpen() ? "Online Database Connected" : "Offline In-Memory Mode"}`
    );
  });
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use by another process.`);
    } else {
      console.error("Server socket error encountered:", err);
    }
  });
  if (directusUrl && directusAdminToken) {
    probeDirectusConnection(2e3).then((isDirectusOnline) => {
      if (isDirectusOnline) {
        console.log("Directus database reachable. Initializing data sync in background...");
        ensureDirectusTenants().then(() => syncDirectusTenantSettings()).then(() => ensureDirectusPersonnel()).then(() => repairMismatchedCustomerTenants()).then(async () => {
          try {
            const resp = await directusFetch("/items/project_settings").catch(() => null);
            if (resp?.data) {
              const item = Array.isArray(resp.data) ? resp.data[0] : resp.data;
              if (item) {
                updateProjectSettingsData(item);
              }
            }
          } catch {
          }
        }).then(() => syncAllCustomersFollowupFromReports()).catch((err) => console.warn("Database initialization warning:", err?.message || err));
      } else {
        console.log("\u26A1 Directus server is unreachable or offline. Running immediately in In-Memory Fallback Mode (zero lag).");
      }
    }).catch((err) => console.warn("Directus probe error:", err?.message || err));
  }
  const handleShutdown = (signal) => {
    console.log(`${signal} received. Closing HTTP server gracefully...`);
    server.close(() => {
      console.log("HTTP server closed successfully.");
      process.exit(0);
    });
  };
  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
  process.on("SIGINT", () => handleShutdown("SIGINT"));
  return server;
}

// server.ts
process.on("uncaughtException", (err) => {
  console.error("[AlphaDesk] Uncaught Exception caught by container guard:", err?.message || err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[AlphaDesk] Unhandled Rejection caught by container guard:", reason?.message || reason);
});
startServer().catch((err) => {
  console.error("[AlphaDesk] Failed to start server:", err);
});
export {
  app
};
