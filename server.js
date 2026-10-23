// server/index.ts
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// server/config.ts
import dotenv from "dotenv";
dotenv.config();
var directusUrl = (process.env.DIRECTUS_URL || "").trim();
var directusAdminToken = (process.env.DIRECTUS_ADMIN_TOKEN || "").trim();
function resolvePort() {
  const portArgIndex = process.argv.indexOf("--port");
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const val = parseInt(process.argv[portArgIndex + 1], 10);
    if (!isNaN(val) && val > 0) return val;
  }
  const parsedPort = process.env.PORT ? parseInt(process.env.PORT.trim(), 10) : 3e3;
  return !isNaN(parsedPort) && parsedPort > 0 ? parsedPort : 3e3;
}
var PORT = resolvePort();
var DIRECTUS_ADMIN_ROLE_IDS = [
  "59e261e1-56f4-401e-9889-4971e2c3c4ce"
];
var DIRECTUS_ADMIN_ROLE_ID = "59e261e1-56f4-401e-9889-4971e2c3c4ce";
var DIRECTUS_STAFF_ROLE_ID = "b9c11357-4926-47ad-b020-6080cb2a62df";
var initialPersonnel = [
  {
    id: "p-1",
    name: "\u0645\u062D\u0645\u062F\u0631\u0636\u0627 \u06A9\u06CC\u0627\u0646\u06CC",
    username: "kiani",
    role: "admin",
    email: "kiani@company.ir",
    phone: "09121112233",
    status: "active",
    active: true
  },
  {
    id: "p-2",
    name: "\u0633\u0627\u0631\u0627 \u0627\u062D\u0645\u062F\u06CC",
    username: "sara_ahmadi",
    role: "marketer",
    email: "sara.ahmadi@company.ir",
    phone: "09123456789",
    status: "active",
    active: true
  },
  {
    id: "p-3",
    name: "\u0639\u0644\u06CC\u0631\u0636\u0627 \u062D\u0633\u06CC\u0646\u06CC",
    username: "hosseini",
    role: "marketer",
    email: "hosseini@company.ir",
    phone: "09351234567",
    status: "active",
    active: true
  },
  {
    id: "p-4",
    name: "\u0645\u0647\u062F\u06CC \u0632\u0645\u0627\u0646\u06CC",
    username: "zamani",
    role: "sales_manager",
    email: "zamani@company.ir",
    phone: "09197654321",
    status: "active",
    active: true
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
var personnelData = [...initialPersonnel];
var customersData = [];
var reportsData = [];
var coldLeadsData = [];
var contactsData = [];
var leaveRequestsData = [];
var advanceRequestsData = [];
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
async function directusFetch(path2, options = {}, retries = 2) {
  if (!directusUrl) {
    throw new Error("DIRECTUS_URL_NOT_CONFIGURED");
  }
  const cleanUrl = directusUrl.replace(/\/$/, "");
  const url = `${cleanUrl}${path2.startsWith("/") ? path2 : "/" + path2}`;
  const headers = {
    "Content-Type": "application/json",
    ...options.headers || {}
  };
  if (directusAdminToken) {
    headers["Authorization"] = `Bearer ${directusAdminToken}`;
  }
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15e3);
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
        if (isPressureOrRateLimit && attempt < retries) {
          const backoffMs = 500 * Math.pow(2, attempt) + Math.random() * 200;
          console.warn(
            `Directus under pressure (${res.status}: ${parsedMessage}). Retrying in ${Math.round(
              backoffMs
            )}ms (Attempt ${attempt + 1}/${retries})...`
          );
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
      if (attempt < retries && (err.name === "AbortError" || err.message?.includes("fetch failed") || err.message?.includes("Under pressure") || err.code === "ECONNRESET" || err.code === "ETIMEDOUT")) {
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
    const pagePromises = [];
    for (let p = 2; p <= totalPages; p++) {
      const pParams = new URLSearchParams(queryString || "");
      pParams.set("limit", String(PAGE_SIZE));
      pParams.set("page", String(p));
      if (!pParams.has("meta")) pParams.set("meta", "*");
      const pUrl = `${pathOnly}?${pParams.toString()}`;
      pagePromises.push(directusFetch(pUrl, options, 2).catch(() => null));
    }
    const pagesRes = await Promise.all(pagePromises);
    for (const res of pagesRes) {
      if (res && Array.isArray(res.data)) {
        allItems.push(...res.data);
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
async function directusSafeBatchPatch(collection, patchMap, chunkSize = 20) {
  if (patchMap.size === 0) return;
  const items = Array.from(patchMap.values());
  const chunks = chunkArray(items, chunkSize);
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (i > 0) await new Promise((r) => setTimeout(r, 100));
    await Promise.all(
      chunk.map(async (c) => {
        try {
          await directusFetch(
            `/items/${collection}/${c.id}`,
            {
              method: "PATCH",
              body: JSON.stringify(c)
            },
            4
          );
        } catch (err) {
          console.warn(`Failed to patch item ${c.id} in ${collection}:`, err.message);
        }
      })
    );
  }
}

// server/directus/sync.ts
import crypto from "crypto";
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
    const res = await directusFetch("/items/personnel?limit=500&sort=id");
    if (res && Array.isArray(res.data)) {
      if (res.data.length > 0) {
        setPersonnelData(res.data);
        console.log(`Directus personnel synchronized (${res.data.length} records).`);
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
          setPersonnelData(refreshed.data);
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
import { Router as Router2 } from "express";
import crypto3 from "crypto";

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
function formatAvatarUrl(avatar) {
  if (!avatar || typeof avatar !== "string") return void 0;
  const trimmed = avatar.trim();
  if (!trimmed) return void 0;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
    return trimmed;
  }
  if (directusUrl) {
    const cleanBase = directusUrl.replace(/\/$/, "");
    if (trimmed.startsWith("/assets/")) return `${cleanBase}${trimmed}`;
    if (trimmed.startsWith("/")) return `${cleanBase}${trimmed}`;
    return `${cleanBase}/assets/${trimmed}`;
  }
  if (trimmed.startsWith("/")) return trimmed;
  return `/api/assets/${trimmed}`;
}
function getRequestUser(req) {
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
  const isSessionRevoked = Boolean(
    globalSessionRevocationTimestamp > 0 && (!sessionIat || sessionIat < globalSessionRevocationTimestamp)
  );
  const cleanPId = personnelId ? String(personnelId).trim().toLowerCase() : "";
  const rawUid = cleanPId.replace(/^p-/, "");
  const cleanUId = userId ? String(userId).trim().toLowerCase() : "";
  const cleanEmail = userEmail ? userEmail.trim().toLowerCase() : "";
  const pMatch = personnelData.find(
    (p) => cleanPId && (p.id?.toLowerCase() === cleanPId || p.id?.toLowerCase() === `p-${rawUid}`) || cleanUId && (p.user_id?.toLowerCase() === cleanUId || p.id?.toLowerCase() === cleanUId) || cleanEmail && p.email?.toLowerCase() === cleanEmail
  );
  if (!userName && pMatch?.name) {
    userName = pMatch.name;
  }
  const hasUserContext = Boolean(
    (userId || personnelId || userEmail || req.headers["authorization"]) && !isSessionRevoked
  );
  const resolvedRole = pMatch?.role || userRole || "";
  const isDirectusSystemAdmin = Boolean(
    !pMatch && (DIRECTUS_ADMIN_ROLE_IDS.includes(roleId) || userRole === "admin")
  );
  const isAdmin = Boolean(
    hasUserContext && (pMatch ? pMatch.role === "admin" || pMatch.role === "sales_manager" : isDirectusSystemAdmin)
  );
  const canViewAllCustomers = Boolean(
    isAdmin || pMatch?.permissions?.can_view_all_customers === true
  );
  return {
    userId: isSessionRevoked ? "" : userId,
    personnelId: isSessionRevoked ? "" : personnelId,
    userRole: isAdmin ? pMatch?.role === "sales_manager" ? "sales_manager" : "admin" : resolvedRole || "marketer",
    roleId,
    isAdmin,
    canViewAllCustomers,
    userName: isSessionRevoked ? "" : userName,
    userEmail: isSessionRevoked ? "" : userEmail,
    tenantId,
    isAuthenticated: hasUserContext,
    isSessionRevoked
  };
}

// server/services/sms.service.ts
function getPatternTextForCode(code) {
  if (!code) return "";
  const c = String(code).trim();
  if (projectSettingsData.login_pattern?.trim() === c) return projectSettingsData.login_pattern_text || "";
  if (projectSettingsData.dayli_leave_request_pattern?.trim() === c) return projectSettingsData.dayli_leave_request_text || "";
  if (projectSettingsData.hourly_leave_request_pattern?.trim() === c) return projectSettingsData.hourly_leave_request_text || "";
  if (projectSettingsData.dayli_leave_accept_pattern?.trim() === c) return projectSettingsData.dayli_leave_accept_text || "";
  if (projectSettingsData.dayli_leave_reject_pattern?.trim() === c) return projectSettingsData.dayli_leave_reject_text || "";
  if (projectSettingsData.hourly_leave_accept_pattern?.trim() === c) return projectSettingsData.hourly_leave_accept_text || "";
  if (projectSettingsData.hourly_leave_reject_pattern?.trim() === c) return projectSettingsData.hourly_leave_reject_text || "";
  if (projectSettingsData.addvance_request_pattern?.trim() === c) return projectSettingsData.addvance_request_text || "";
  if (projectSettingsData.addvance_accept_pattern?.trim() === c) return projectSettingsData.addvance_accept_text || "";
  if (projectSettingsData.lower_addvance_accept_pattern?.trim() === c) return projectSettingsData.lower_addvance_accept_text || "";
  if (projectSettingsData.addvance_reject_pattern?.trim() === c) return projectSettingsData.addvance_reject_text || "";
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
  const jalaliDate = now2.toLocaleDateString("fa-IR");
  const jalaliTime = now2.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
  for (const ph of foundPlaceholders) {
    if (cleanVars[ph] !== void 0 && cleanVars[ph] !== "") continue;
    const lower = ph.toLowerCase();
    if (lower === "mobile" || lower === "phone") {
      cleanVars[ph] = cleanVars.mobile || cleanVars.phone || recipientPhone || "09120000000";
    } else if (lower === "family" || lower === "last_name") {
      const fullName = cleanVars.fullName || cleanVars.name || "\u0647\u0645\u06A9\u0627\u0631 \u06AF\u0631\u0627\u0645\u06CC";
      const parts = fullName.split(" ");
      cleanVars[ph] = parts.length > 1 ? parts.slice(1).join(" ") : "\u06AF\u0631\u0627\u0645\u06CC";
    } else if (lower === "name" || lower === "first_name") {
      const fullName = cleanVars.fullName || cleanVars.name || "\u0647\u0645\u06A9\u0627\u0631";
      const parts = fullName.split(" ");
      cleanVars[ph] = parts[0] || "\u0647\u0645\u06A9\u0627\u0631";
    } else if (lower === "date" || lower === "request_date" || lower === "approval_date") {
      cleanVars[ph] = cleanVars.date || cleanVars.request_date || cleanVars.approval_date || jalaliDate;
    } else if (lower === "time") {
      cleanVars[ph] = cleanVars.time || jalaliTime;
    } else if (lower === "ip") {
      cleanVars[ph] = cleanVars.ip || "127.0.0.1";
    } else if (lower === "device") {
      cleanVars[ph] = cleanVars.device || "\u0633\u0627\u0645\u0627\u0646\u0647 \u0648\u0628 \u0622\u0644\u0641\u0627\u062F\u0633\u06A9";
    } else if (lower === "leave_type") {
      cleanVars[ph] = cleanVars.leave_type || "\u0645\u0631\u062E\u0635\u06CC";
    } else if (lower === "leave_date") {
      cleanVars[ph] = cleanVars.leave_date || cleanVars.start_date || cleanVars.date || jalaliDate;
    } else if (lower === "from_time") {
      cleanVars[ph] = cleanVars.from_time || cleanVars.start_time || "09:00";
    } else if (lower === "to_time") {
      cleanVars[ph] = cleanVars.to_time || cleanVars.end_time || "17:00";
    } else if (lower === "start_time") {
      cleanVars[ph] = cleanVars.start_time || cleanVars.from_time || "09:00";
    } else if (lower === "end_time") {
      cleanVars[ph] = cleanVars.end_time || cleanVars.to_time || "17:00";
    } else if (lower === "start_date") {
      cleanVars[ph] = cleanVars.start_date || cleanVars.leave_date || jalaliDate;
    } else if (lower === "end_date") {
      cleanVars[ph] = cleanVars.end_date || cleanVars.start_date || jalaliDate;
    } else if (lower === "amount" || lower === "requested_amount" || lower === "approved_amount") {
      cleanVars[ph] = cleanVars[ph] || cleanVars.amount || cleanVars.requested_amount || cleanVars.approved_amount || "0";
    } else if (lower === "reason") {
      cleanVars[ph] = cleanVars.reason || "-";
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
async function sendIppanelSmsPattern(recipientPhone, patternCode, variables = {}, overrideApiKey, overrideSender) {
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
  let cleanPhone = String(recipientPhone).replace(/[\s\-_()]/g, "").trim();
  cleanPhone = cleanPhone.replace(/^(\+98|0098)/, "0");
  if (/^9\d{9}$/.test(cleanPhone)) {
    cleanPhone = "0" + cleanPhone;
  }
  if (!/^09\d{9}$/.test(cleanPhone)) {
    console.warn(`[IPPanel SMS] Skipped invalid phone number: ${recipientPhone}`);
    return { success: false, error: "\u0634\u0645\u0627\u0631\u0647 \u062A\u0644\u0641\u0646 \u06AF\u06CC\u0631\u0646\u062F\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A (\u0641\u0631\u0645\u062A \u0645\u062C\u0627\u0632: 09xxxxxxxxx)" };
  }
  const senderLine = (overrideSender || projectSettingsData.ippanel_sender || projectSettingsData.ippanel_line_number || "90001356").trim();
  const senderWithoutPlus = senderLine.replace(/^\+/, "");
  const cleanPhoneE164 = cleanPhone.startsWith("0") ? "+98" + cleanPhone.substring(1) : cleanPhone.startsWith("+98") ? cleanPhone : "+98" + cleanPhone;
  const cleanPhone98 = cleanPhone.startsWith("0") ? "98" + cleanPhone.substring(1) : cleanPhone;
  const cleanVars = resolvePatternVariables(patternCode.trim(), cleanPhone, variables);
  const restPayload98 = {
    pattern_code: patternCode.trim(),
    originator: senderLine,
    recipient: cleanPhone98,
    values: cleanVars
  };
  const restPayload09 = {
    pattern_code: patternCode.trim(),
    originator: senderLine,
    recipient: cleanPhone,
    values: cleanVars
  };
  const restPayloadAltSender = {
    pattern_code: patternCode.trim(),
    originator: senderWithoutPlus,
    recipient: cleanPhone98,
    values: cleanVars
  };
  const api2Payload = {
    code: patternCode.trim(),
    sender: senderLine,
    recipient: cleanPhone,
    variable: cleanVars
  };
  const edgePayload = {
    sending_type: "pattern",
    from_number: senderLine,
    code: patternCode.trim(),
    recipients: [cleanPhoneE164],
    params: cleanVars
  };
  console.log(
    `[IPPanel SMS] Sending pattern '${patternCode}' to ${cleanPhone} (sender: ${senderLine}) with variables:`,
    cleanVars
  );
  const attempts = [
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
      url: "https://rest.ippanel.com/v1/messages/patterns/send",
      headers: {
        "Content-Type": "application/json",
        apikey: cleanApiKey
      },
      body: JSON.stringify(restPayload09),
      label: "rest.ippanel.com (apikey, 09...)"
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
      url: "https://api2.ippanel.com/api/v1/sms/pattern/normal/send",
      headers: {
        "Content-Type": "application/json",
        apikey: cleanApiKey
      },
      body: JSON.stringify(api2Payload),
      label: "api2.ippanel.com (apikey)"
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
      url: "https://ippanel.com/api/v1/sms/pattern/normal/send",
      headers: {
        "Content-Type": "application/json",
        apikey: cleanApiKey
      },
      body: JSON.stringify(api2Payload),
      label: "ippanel.com (apikey)"
    },
    {
      url: "https://rest.ippanel.com/v1/messages/patterns/send",
      headers: {
        "Content-Type": "application/json",
        Authorization: `AccessKey ${cleanApiKey}`
      },
      body: JSON.stringify(restPayload98),
      label: "rest.ippanel.com (AccessKey)"
    }
  ];
  let lastError = "";
  for (const attempt of attempts) {
    try {
      const res = await fetch(attempt.url, {
        method: "POST",
        headers: attempt.headers,
        body: attempt.body
      });
      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        console.log(`[IPPanel SMS] Successfully sent via ${attempt.label}:`, json);
        return {
          success: true,
          messageId: String(json?.data || json?.bulk_id || json?.message_id || json?.id || "OK")
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
      }
    } catch (fetchErr) {
      lastError = `[${attempt.label}] Network error: ${fetchErr.message}`;
      console.warn(`[IPPanel SMS] Network error connecting to ${attempt.label}:`, fetchErr.message);
    }
  }
  return { success: false, error: lastError || "\u062E\u0637\u0627 \u062F\u0631 \u0628\u0631\u0642\u0631\u0627\u0631\u06CC \u0627\u0631\u062A\u0628\u0627\u0637 \u0628\u0627 \u062F\u0631\u06AF\u0627\u0647 IPPanel" };
}
async function sendTenantAdminsSmsPattern(tenantId, patternCode, variables = {}) {
  if (!patternCode) return;
  const tIdStr = tenantId !== void 0 && tenantId !== null ? String(tenantId).trim() : "default";
  const collectedPhones = /* @__PURE__ */ new Set();
  if (directusUrl && directusAdminToken) {
    try {
      let res = await directusFetch(
        `/items/tenant_settings?filter[tenant_id][_eq]=${encodeURIComponent(tIdStr)}`
      ).catch(() => null);
      if (!res?.data || Array.isArray(res.data) && res.data.length === 0) {
        res = await directusFetch("/items/tenant_settings").catch(() => null);
      }
      if (res?.data) {
        const items = Array.isArray(res.data) ? res.data : [res.data];
        for (const item of items) {
          const raw = item?.sms_phones;
          if (Array.isArray(raw)) {
            raw.forEach((p) => p && collectedPhones.add(String(p).trim()));
          } else if (typeof raw === "string") {
            raw.split(",").forEach((p) => p.trim() && collectedPhones.add(p.trim()));
          }
        }
      }
    } catch (err) {
      console.warn("[IPPanel SMS] Directus tenant_settings lookup warning:", err.message);
    }
  }
  for (const [, local] of tenantSettingsMap.entries()) {
    if (local?.sms_phones) {
      const pArr = Array.isArray(local.sms_phones) ? local.sms_phones : String(local.sms_phones).split(",");
      pArr.forEach((p) => p.trim() && collectedPhones.add(p.trim()));
    }
  }
  if (collectedPhones.size === 0) {
    console.warn("[IPPanel SMS] No admin phone numbers found in tenant_settings to send notification.");
    return;
  }
  console.log(
    `[IPPanel SMS] Notifying ${collectedPhones.size} tenant admins with pattern '${patternCode}'...`
  );
  for (const phone of collectedPhones) {
    sendIppanelSmsPattern(phone, patternCode, variables).catch(
      (e) => console.warn(`[IPPanel SMS] Failed to notify tenant admin ${phone}:`, e.message)
    );
  }
}

// server/routes/personnel.routes.ts
import { Router } from "express";
import crypto2 from "crypto";
var router = Router();
function enrichPersonnel(p) {
  if (!p) return p;
  const tid = p.tenant_id && typeof p.tenant_id === "object" ? String(p.tenant_id.id || p.tenant_id.name || "default") : String(p.tenant_id || "default");
  const allowed = Array.isArray(p.allowed_tenant_ids) ? p.allowed_tenant_ids.map(String) : p.permissions?.allowed_tenant_ids && Array.isArray(p.permissions.allowed_tenant_ids) ? p.permissions.allowed_tenant_ids.map(String) : [tid];
  return {
    ...p,
    id: String(p.id),
    tenant_id: tid,
    allowed_tenant_ids: allowed,
    permissions: {
      ...p.permissions || {},
      allowed_tenant_ids: allowed
    },
    active: p.active !== false && p.status !== "inactive"
  };
}
router.get("/", async (req, res) => {
  const tenantId = getRequestTenantId(req);
  let userAvatarMap = {};
  if (directusUrl && directusAdminToken) {
    try {
      const usersRes = await directusFetch("/users?fields=id,email,avatar&limit=500").catch(
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
        const mapped = resp.data.map((p) => {
          const enriched = enrichPersonnel(p);
          let avatar = enriched.avatar;
          if (!avatar) {
            if (enriched.user_id && userAvatarMap[enriched.user_id]) {
              avatar = userAvatarMap[enriched.user_id];
            } else if (enriched.email && userAvatarMap[enriched.email.toLowerCase().trim()]) {
              avatar = userAvatarMap[enriched.email.toLowerCase().trim()];
            }
          }
          return { ...enriched, avatar };
        });
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
    let avatar = enriched.avatar;
    if (!avatar) {
      if (enriched.user_id && userAvatarMap[enriched.user_id]) {
        avatar = userAvatarMap[enriched.user_id];
      } else if (enriched.email && userAvatarMap[enriched.email.toLowerCase().trim()]) {
        avatar = userAvatarMap[enriched.email.toLowerCase().trim()];
      }
    }
    return { ...enriched, avatar };
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
  const newPId = payload.id || crypto2.randomUUID();
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
      can_manage_personnel: Boolean(payload.permissions?.can_manage_personnel),
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
      const patched = await directusFetch(`/items/personnel/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(directusPatch)
      });
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
  const { userId, personnelId, userEmail, userName } = getRequestUser(req);
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
  const personnelPatch = {};
  if (name !== void 0) personnelPatch.name = String(name).trim();
  if (phone !== void 0) personnelPatch.phone = String(phone).trim();
  if (username !== void 0) personnelPatch.username = String(username).trim();
  if (bank_card_number !== void 0) personnelPatch.bank_card_number = String(bank_card_number).trim();
  if (iban !== void 0) personnelPatch.iban = String(iban).trim();
  if (national_id !== void 0) personnelPatch.national_id = String(national_id).trim();
  if (avatar !== void 0) personnelPatch.avatar = avatar;
  if (emergency_contact_name !== void 0) personnelPatch.emergency_contact_name = String(emergency_contact_name).trim();
  if (emergency_contact_phone !== void 0) personnelPatch.emergency_contact_phone = String(emergency_contact_phone).trim();
  if (emergency_contact_relation !== void 0) personnelPatch.emergency_contact_relation = String(emergency_contact_relation).trim();
  if (family_contacts !== void 0) personnelPatch.family_contacts = family_contacts;
  if (phones !== void 0) personnelPatch.phones = phones;
  let targetPersonnel = null;
  if (directusUrl && directusAdminToken && targetId) {
    try {
      const patched = await directusFetch(`/items/personnel/${encodeURIComponent(targetId)}`, {
        method: "PATCH",
        body: JSON.stringify(personnelPatch)
      });
      if (patched?.data) {
        targetPersonnel = enrichPersonnel(patched.data);
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
      name: name || userName || "\u06A9\u0627\u0631\u0628\u0631 \u0633\u06CC\u0633\u062A\u0645",
      email: userEmail || "",
      phone: phone || "",
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

// server/routes/auth.routes.ts
var router2 = Router2();
var handleAssetProxy = async (req, res, next) => {
  const assetId = req.params.id;
  if (assetId && /\.(js|css|map|woff2?|ttf|eot|ico|svg)$/i.test(assetId)) {
    return next();
  }
  if (directusUrl) {
    try {
      const assetUrl = `${directusUrl.replace(/\/$/, "")}/assets/${assetId}`;
      const headers = {};
      if (directusAdminToken) {
        headers["Authorization"] = `Bearer ${directusAdminToken}`;
      }
      const fetchRes = await fetch(assetUrl, { headers });
      if (fetchRes.ok) {
        const contentType = fetchRes.headers.get("content-type") || "image/jpeg";
        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "public, max-age=86400");
        const buffer = Buffer.from(await fetchRes.arrayBuffer());
        return res.send(buffer);
      }
    } catch (e) {
      console.warn("Asset proxy error:", e.message);
    }
  }
  return res.status(404).send("Asset not found");
};
router2.get("/assets/:id", handleAssetProxy);
router2.get("/api/assets/:id", handleAssetProxy);
router2.post("/register", async (req, res) => {
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
  if (directusUrl && directusAdminToken) {
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
      const personnelId = crypto3.randomUUID();
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
router2.post("/login", async (req, res) => {
  const { email, username, phone, password } = req.body;
  const rawIdentifier = (email || username || phone || "").trim();
  if (!rawIdentifier || !password) {
    return res.status(400).json({ error: "\u0627\u06CC\u0645\u06CC\u0644/\u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631\u06CC/\u0634\u0645\u0627\u0631\u0647 \u0645\u0648\u0628\u0627\u06CC\u0644 \u0648 \u06A9\u0644\u0645\u0647 \u0639\u0628\u0648\u0631 \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A." });
  }
  const cleanIdentifier = rawIdentifier.toLowerCase();
  if (directusUrl && directusAdminToken) {
    try {
      let directusUserEmail = cleanIdentifier;
      if (!cleanIdentifier.includes("@")) {
        let pRes = await directusFetch(
          `/items/personnel?filter[_or][0][username][_eq]=${encodeURIComponent(
            rawIdentifier
          )}&filter[_or][1][phone][_eq]=${encodeURIComponent(rawIdentifier)}&limit=1`
        ).catch(() => null);
        if (!pRes?.data || !Array.isArray(pRes.data) || pRes.data.length === 0) {
          pRes = await directusFetch(
            `/items/personnel?filter[_or][0][username][_eq]=${encodeURIComponent(
              cleanIdentifier
            )}&filter[_or][1][phone][_eq]=${encodeURIComponent(cleanIdentifier)}&limit=1`
          ).catch(() => null);
        }
        if (pRes?.data && Array.isArray(pRes.data) && pRes.data.length > 0) {
          const foundPersonnel = pRes.data[0];
          if (foundPersonnel.email) {
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
        const meRes = await directusFetch(
          "/users/me?fields=id,email,first_name,last_name,role.id,role.name,role.admin_access,avatar",
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
            `/items/personnel?filter[email][_eq]=${encodeURIComponent(meUser.email)}`
          ).catch(() => null);
        }
        let pItem = pRes?.data?.[0] || null;
        if (!pItem) {
          const cleanPName = `${meUser.first_name || ""} ${meUser.last_name || ""}`.trim() || meUser.email;
          const newPId = crypto3.randomUUID();
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
        }
        pItem = enrichPersonnel(pItem);
        const isAdmin = Boolean(
          pItem ? pItem.role === "admin" || pItem.role === "sales_manager" : isDirectusAdmin
        );
        const appRole = pItem ? pItem.role : isAdmin ? "admin" : "marketer";
        let avatarUrl = formatAvatarUrl(meUser.avatar || pItem?.avatar);
        if (projectSettingsData.login_pattern) {
          const uPhone = pItem?.phone || "";
          const fullName = pItem?.name || meUser.email;
          const parts = fullName.split(" ");
          const fName = parts[0] || "\u0647\u0645\u06A9\u0627\u0631";
          const lName = parts.length > 1 ? parts.slice(1).join(" ") : "\u06AF\u0631\u0627\u0645\u06CC";
          const now2 = /* @__PURE__ */ new Date();
          const loginVars = {
            name: fName,
            family: lName,
            fullName,
            mobile: uPhone || "\u0646\u0627\u0645\u0634\u062E\u0635",
            phone: uPhone || "\u0646\u0627\u0645\u0634\u062E\u0635",
            date: now2.toLocaleDateString("fa-IR"),
            time: now2.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
            ip: req.headers["x-forwarded-for"] || req.ip || "127.0.0.1",
            device: req.headers["user-agent"] ? "\u0645\u0631\u0648\u0631\u06AF\u0631 \u0648\u0628" : "\u0633\u0627\u0645\u0627\u0646\u0647 \u0648\u0628",
            username: meUser.email
          };
          if (uPhone) {
            sendIppanelSmsPattern(uPhone, projectSettingsData.login_pattern, loginVars).catch(
              (e) => console.warn("Login SMS pattern send to user warning:", e.message)
            );
          }
          sendTenantAdminsSmsPattern(
            pItem?.tenant_id || "default",
            projectSettingsData.login_pattern,
            loginVars
          ).catch((e) => console.warn("Login SMS pattern send to admin warning:", e.message));
        }
        return res.json({
          success: true,
          access_token: accessToken,
          refresh_token: loginRes.data.refresh_token,
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
      console.warn("Directus auth login failed, trying local fallback:", err.message);
    }
  }
  const found = personnelData.find(
    (p) => p.email && p.email.toLowerCase() === cleanIdentifier || p.username && p.username.toLowerCase() === cleanIdentifier || p.phone && p.phone.replace(/[\s\-_()]/g, "") === cleanIdentifier.replace(/[\s\-_()]/g, "")
  );
  if (found) {
    if (projectSettingsData.login_pattern) {
      const uPhone = found.phone || "";
      const fullName = found.name || found.email;
      const parts = fullName.split(" ");
      const fName = parts[0] || "\u0647\u0645\u06A9\u0627\u0631";
      const lName = parts.length > 1 ? parts.slice(1).join(" ") : "\u06AF\u0631\u0627\u0645\u06CC";
      const now2 = /* @__PURE__ */ new Date();
      const loginVars = {
        name: fName,
        family: lName,
        fullName,
        mobile: uPhone || "\u0646\u0627\u0645\u0634\u062E\u0635",
        phone: uPhone || "\u0646\u0627\u0645\u0634\u062E\u0635",
        date: now2.toLocaleDateString("fa-IR"),
        time: now2.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
        ip: req.headers["x-forwarded-for"] || req.ip || "127.0.0.1",
        device: "\u0633\u0627\u0645\u0627\u0646\u0647 \u0648\u0628 \u0622\u0644\u0641\u0627\u062F\u0633\u06A9",
        username: found.username || found.email
      };
      if (uPhone) {
        sendIppanelSmsPattern(uPhone, projectSettingsData.login_pattern, loginVars).catch(
          (e) => console.warn("Login SMS pattern send to user warning:", e.message)
        );
      }
      sendTenantAdminsSmsPattern(
        found.tenant_id || "default",
        projectSettingsData.login_pattern,
        loginVars
      ).catch((e) => console.warn("Login SMS pattern send to admin warning:", e.message));
    }
    return res.json({
      success: true,
      access_token: "local-token-" + found.id,
      user: {
        id: found.id,
        email: found.email,
        username: found.username,
        name: found.name,
        role_id: found.role === "admin" ? DIRECTUS_ADMIN_ROLE_ID : DIRECTUS_STAFF_ROLE_ID,
        is_admin: found.role === "admin",
        app_role: found.role
      },
      personnel: found
    });
  }
  res.status(401).json({ error: "\u06A9\u0627\u0631\u0628\u0631\u06CC \u0628\u0627 \u0627\u06CC\u0646 \u0645\u0634\u062E\u0635\u0627\u062A \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." });
});
router2.get("/me", async (req, res) => {
  const { userId, personnelId, userRole, isAdmin, userName, userEmail, isSessionRevoked } = getRequestUser(req);
  if (isSessionRevoked || !userId && !personnelId && !userEmail) {
    return res.status(401).json({
      error: "ALL_SESSIONS_REVOKED",
      message: "\u0646\u0634\u0633\u062A\u200C\u0647\u0627\u06CC \u06A9\u0627\u0631\u06CC \u062A\u0645\u0627\u0645\u06CC \u06A9\u0627\u0631\u0628\u0631\u0627\u0646 \u062A\u0648\u0633\u0637 \u0645\u062F\u06CC\u0631\u06CC\u062A \u0644\u063A\u0648 \u0634\u062F\u0647 \u0627\u0633\u062A. \u0644\u0637\u0641\u0627\u064B \u0645\u062C\u062F\u062F\u0627\u064B \u0648\u0627\u0631\u062F \u0634\u0648\u06CC\u062F."
    });
  }
  let avatarUrl = void 0;
  let pItem = null;
  let isDirectusAdmin = false;
  if (directusUrl && directusAdminToken) {
    try {
      if (userId) {
        const uRes = await directusFetch(
          `/users/${userId}?fields=id,email,avatar,first_name,last_name,role.id,role.name,role.admin_access`
        );
        if (uRes?.data?.avatar) {
          avatarUrl = formatAvatarUrl(uRes.data.avatar);
        }
        if (uRes?.data?.role?.admin_access === true) {
          isDirectusAdmin = true;
        }
      }
      if (personnelId) {
        const pRes = await directusFetch(`/items/personnel/${personnelId}`);
        if (pRes?.data) pItem = pRes.data;
      }
    } catch {
    }
  }
  if (!pItem) {
    pItem = personnelData.find(
      (p) => personnelId && p.id === personnelId || userId && p.user_id === userId || userEmail && p.email?.toLowerCase() === userEmail?.toLowerCase()
    );
  }
  if (pItem) {
    pItem = enrichPersonnel(pItem);
    if (!avatarUrl && pItem.avatar) avatarUrl = pItem.avatar;
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
router2.post("/change-password", async (req, res) => {
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
router2.post("/logout-all", async (req, res) => {
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
var auth_routes_default = router2;

// server/routes/customers.routes.ts
import { Router as Router3 } from "express";
import crypto5 from "crypto";

// server/directus/cache.ts
var customersCache = null;
var reportsCache = null;
var CACHE_TTL_MS = 3e5;
function invalidateCustomersCache() {
  customersCache = null;
}
function invalidateReportsCache() {
  reportsCache = null;
}
async function ensureCustomersCache(forceRefresh = false) {
  const now2 = Date.now();
  if (!forceRefresh && customersCache && now2 - customersCache.timestamp < CACHE_TTL_MS) {
    return customersCache.data;
  }
  const res = await directusFetch("/items/customers?limit=5000&sort=-date_created").catch(() => null);
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
}
async function ensureReportsCache(forceRefresh = false) {
  const now2 = Date.now();
  if (!forceRefresh && reportsCache && now2 - reportsCache.timestamp < CACHE_TTL_MS) {
    return reportsCache.data;
  }
  const res = await directusFetch("/items/customer_reports?limit=5000&sort=-date_created").catch(() => null);
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
              const expCust = computeCustomerExpiration(cust);
              const isContract2 = expCust.status === "\u0642\u0631\u0627\u0631\u062F\u0627\u062F";
              const isExpired2 = !!expCust.is_expired;
              const conflictType2 = isContract2 ? "contract" : isExpired2 ? "expired" : "active_marketer";
              let msg = "";
              if (conflictType2 === "active_marketer") {
                msg = `\u0627\u06CC\u0646 \u0634\u0645\u0627\u0631\u0647/\u0627\u06A9\u0627\u0646\u062A \u0642\u0628\u0644\u0627\u064B \u0628\u0631\u0627\u06CC \u0645\u0634\u062A\u0631\u06CC \xAB${expCust.company_name}\xBB \u062F\u0631 \u0627\u062E\u062A\u06CC\u0627\u0631 \u0628\u0627\u0632\u0627\u0631\u06CC\u0627\u0628 \xAB${expCust.assigned_marketer_name}\xBB \u062B\u0628\u062A \u0634\u062F\u0647 \u0648 \u0645\u0647\u0644\u062A \u0648\u0627\u06AF\u0630\u0627\u0631\u06CC \u0622\u0646 \u0647\u0646\u0648\u0632 \u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A.`;
              } else if (conflictType2 === "contract") {
                msg = `\u0627\u06CC\u0646 \u0634\u0645\u0627\u0631\u0647 \u0645\u062A\u0639\u0644\u0642 \u0628\u0647 \u0645\u0634\u062A\u0631\u06CC \u0642\u0637\u0639\u06CC \xAB${expCust.company_name}\xBB \u0628\u0627 \u0642\u0631\u0627\u0631\u062F\u0627\u062F \u0631\u0633\u0645\u06CC \u0627\u0633\u062A (\u0628\u0627\u0632\u0627\u0631\u06CC\u0627\u0628: ${expCust.assigned_marketer_name}).`;
              } else {
                msg = `\u0627\u06CC\u0646 \u0634\u0645\u0627\u0631\u0647 \u0642\u0628\u0644\u0627\u064B \u0628\u0631\u0627\u06CC \u0645\u0634\u062A\u0631\u06CC \xAB${expCust.company_name}\xBB \u062B\u0628\u062A \u0634\u062F\u0647 \u0628\u0648\u062F\u060C \u0627\u0645\u0627 \u0645\u0647\u0644\u062A \u0628\u0627\u0632\u0627\u0631\u06CC\u0627\u0628 (${expCust.assigned_marketer_name}) \u0645\u0646\u0642\u0636\u06CC \u0634\u062F\u0647 \u0627\u0633\u062A \u0648 \u0627\u0645\u06A9\u0627\u0646 \u0648\u0627\u06AF\u0630\u0627\u0631\u06CC \u0645\u062C\u062F\u062F \u062F\u0627\u0631\u062F.`;
              }
              return {
                isDuplicate: true,
                conflictType: conflictType2,
                matchedContact: item,
                matchedCustomer: {
                  id: expCust.id,
                  company_name: expCust.company_name,
                  assigned_marketer_name: expCust.assigned_marketer_name,
                  assigned_marketer_id: expCust.assigned_marketer_id,
                  assignment_deadline: expCust.assignment_deadline,
                  is_expired: isExpired2,
                  status: expCust.status
                },
                message: msg
              };
            }
          }
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
  if (!matchedContact) return null;
  const matchedCustomer = customersData.find((cust) => cust.id === matchedContact.customer_id);
  if (!matchedCustomer) return null;
  const isExpired = !!matchedCustomer.is_expired;
  const isContract = matchedCustomer.status === "\u0642\u0631\u0627\u0631\u062F\u0627\u062F";
  const conflictType = isContract ? "contract" : isExpired ? "expired" : "active_marketer";
  let message = "";
  if (conflictType === "active_marketer") {
    message = `\u0627\u06CC\u0646 \u0634\u0645\u0627\u0631\u0647/\u0627\u06A9\u0627\u0646\u062A \u0642\u0628\u0644\u0627\u064B \u0628\u0631\u0627\u06CC \u0645\u0634\u062A\u0631\u06CC \xAB${matchedCustomer.company_name}\xBB \u062F\u0631 \u0627\u062E\u062A\u06CC\u0627\u0631 \u0628\u0627\u0632\u0627\u0631\u06CC\u0627\u0628 \xAB${matchedCustomer.assigned_marketer_name}\xBB \u062B\u0628\u062A \u0634\u062F\u0647 \u0627\u0633\u062A \u0648 \u0645\u0647\u0644\u062A \u0648\u0627\u06AF\u0630\u0627\u0631\u06CC \u0622\u0646 \u0647\u0646\u0648\u0632 \u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A.`;
  } else if (conflictType === "contract") {
    message = `\u0627\u06CC\u0646 \u0634\u0645\u0627\u0631\u0647 \u0645\u062A\u0639\u0644\u0642 \u0628\u0647 \u0645\u0634\u062A\u0631\u06CC \u0642\u0637\u0639\u06CC \xAB${matchedCustomer.company_name}\xBB \u0628\u0627 \u0642\u0631\u0627\u0631\u062F\u0627\u062F \u0631\u0633\u0645\u06CC \u0627\u0633\u062A (\u0628\u0627\u0632\u0627\u0631\u06CC\u0627\u0628: ${matchedCustomer.assigned_marketer_name}).`;
  } else {
    message = `\u0627\u06CC\u0646 \u0634\u0645\u0627\u0631\u0647 \u0642\u0628\u0644\u0627\u064B \u0628\u0631\u0627\u06CC \u0645\u0634\u062A\u0631\u06CC \xAB${matchedCustomer.company_name}\xBB \u062B\u0628\u062A \u0634\u062F\u0647 \u0628\u0648\u062F\u060C \u0627\u0645\u0627 \u0645\u0647\u0644\u062A \u0628\u0627\u0632\u0627\u0631\u06CC\u0627\u0628 (${matchedCustomer.assigned_marketer_name}) \u0645\u0646\u0642\u0636\u06CC \u0634\u062F\u0647 \u0627\u0633\u062A \u0648 \u0627\u0645\u06A9\u0627\u0646 \u0648\u0627\u06AF\u0630\u0627\u0631\u06CC \u0645\u062C\u062F\u062F \u062F\u0627\u0631\u062F.`;
  }
  return {
    isDuplicate: true,
    conflictType,
    matchedContact,
    matchedCustomer: {
      id: matchedCustomer.id,
      company_name: matchedCustomer.company_name,
      assigned_marketer_name: matchedCustomer.assigned_marketer_name,
      assigned_marketer_id: matchedCustomer.assigned_marketer_id,
      assignment_deadline: matchedCustomer.assignment_deadline,
      is_expired: isExpired,
      status: matchedCustomer.status
    },
    message
  };
}

// server/routes/customers.routes.ts
var router3 = Router3();
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
          `/items/customers?aggregate[count]=*&filter[is_expired][_eq]=false&filter[status][_nin]=${contractStatusIn},%D9%84%DB%8C%D8%B3%D8%AA%20%D8%B3%DB%8C%D8%A7%D9%87${pFilter}`
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
    (c) => !c.is_expired && c.status !== "\u0642\u0631\u0627\u0631\u062F\u0627\u062F" && c.status !== "\u0644\u06CC\u0633\u062A \u0633\u06CC\u0627\u0647"
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
router3.get("/free-quota", async (req, res) => {
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
router3.post("/check-duplicate", async (req, res) => {
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
router3.get("/", async (req, res) => {
  const { search, status, marketer_id, expired_only, page, limit, free_only, all } = req.query;
  const { userId, personnelId, isAdmin, userName, tenantId, canViewAllCustomers } = getRequestUser(req);
  const isUnlimited = all === "true" || limit === "all" || limit === "20000";
  const reqLimit = isUnlimited ? 500 : limit ? Math.min(Math.max(1, parseInt(String(limit), 10)), 500) : 25;
  const reqPage = page ? Math.max(1, parseInt(String(page), 10)) : 1;
  const isFreeOnly = free_only === "true";
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
    if (!isAdmin && (userId || personnelId) && !isFreeOnly) {
      list2 = list2.filter(
        (c) => c.assigned_marketer_id === personnelId || c.assigned_marketer_id === userId || userName && c.assigned_marketer_name === userName
      );
    }
    if (search && typeof search === "string") {
      const s = search.toLowerCase();
      list2 = list2.filter(
        (c) => c.company_name?.toLowerCase().includes(s) || c.manager_name?.toLowerCase().includes(s) || c.city?.toLowerCase().includes(s) || c.business_type?.toLowerCase().includes(s)
      );
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
    return res.json(list2);
  }
  if (directusUrl && directusAdminToken) {
    try {
      let directusPath = `/items/customers?page=${reqPage}&limit=${reqLimit}&meta=*&sort=-date_created`;
      directusPath += `&fields=id,company_name,business_type,province,city,manager_name,negotiator_name,mobile_numbers,landline_numbers,next_followup_date,assigned_marketer_id,assigned_marketer_name,assignment_deadline,status,is_expired,claimed_from_pool,date_created,date_updated,tenant_id`;
      let andIdx = 0;
      if (tenantId && tenantId !== "all") {
        const tenantNum = resolveDirectusTenantId(tenantId);
        if (tenantNum && tenantNum > 1) {
          directusPath += `&filter[_and][${andIdx++}][tenant_id][_eq]=${tenantNum}`;
        }
      }
      if (!isAdmin && !canViewAllCustomers && !isFreeOnly) {
        const cleanPId = personnelId ? String(personnelId).trim().toLowerCase() : "";
        const rawUid = cleanPId.replace(/^p-/, "");
        const cleanUId = userId ? String(userId).trim().toLowerCase() : "";
        const normUserName = userName ? userName.trim() : "";
        let mOrIdx = 0;
        if (cleanPId) {
          directusPath += `&filter[_and][${andIdx}][_or][${mOrIdx++}][assigned_marketer_id][_eq]=${encodeURIComponent(cleanPId)}`;
          if (rawUid && rawUid !== cleanPId) {
            directusPath += `&filter[_and][${andIdx}][_or][${mOrIdx++}][assigned_marketer_id][_eq]=${encodeURIComponent(rawUid)}`;
            directusPath += `&filter[_and][${andIdx}][_or][${mOrIdx++}][assigned_marketer_id][_eq]=${encodeURIComponent("p-" + rawUid)}`;
          }
        }
        if (cleanUId && cleanUId !== cleanPId && cleanUId !== rawUid) {
          directusPath += `&filter[_and][${andIdx}][_or][${mOrIdx++}][assigned_marketer_id][_eq]=${encodeURIComponent(cleanUId)}`;
        }
        if (normUserName) {
          directusPath += `&filter[_and][${andIdx}][_or][${mOrIdx++}][assigned_marketer_name][_icontains]=${encodeURIComponent(normUserName)}`;
        }
        andIdx++;
      }
      if (status && status !== "\u0647\u0645\u0647") {
        directusPath += `&filter[_and][${andIdx++}][status][_eq]=${encodeURIComponent(String(status))}`;
      }
      if (marketer_id && marketer_id !== "\u0647\u0645\u0647") {
        directusPath += `&filter[_and][${andIdx++}][assigned_marketer_id][_eq]=${encodeURIComponent(String(marketer_id))}`;
      }
      if (expired_only === "true") {
        directusPath += `&filter[_and][${andIdx++}][is_expired][_eq]=true`;
      }
      if (isFreeOnly) {
        directusPath += `&filter[_and][${andIdx}][_or][0][assigned_marketer_id][_null]=true&filter[_and][${andIdx}][_or][1][is_expired][_eq]=true`;
        andIdx++;
      }
      if (search && typeof search === "string" && search.trim()) {
        const s = search.trim();
        directusPath += `&filter[_and][${andIdx}][_or][0][company_name][_icontains]=${encodeURIComponent(
          s
        )}&filter[_and][${andIdx}][_or][1][manager_name][_icontains]=${encodeURIComponent(
          s
        )}&filter[_and][${andIdx}][_or][2][city][_icontains]=${encodeURIComponent(
          s
        )}&filter[_and][${andIdx}][_or][3][business_type][_icontains]=${encodeURIComponent(s)}`;
        andIdx++;
      }
      const resData = await directusFetch(directusPath, {}, 1).catch(() => null);
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
          const s = search.trim().toLowerCase();
          items = items.filter(
            (c) => c.company_name?.toLowerCase().includes(s) || c.manager_name?.toLowerCase().includes(s) || c.city?.toLowerCase().includes(s) || c.business_type?.toLowerCase().includes(s) || Array.isArray(c.mobile_numbers) && c.mobile_numbers.some((m) => m.includes(s)) || Array.isArray(c.landline_numbers) && c.landline_numbers.some((l) => l.includes(s))
          );
        }
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
  if (!isAdmin && (userId || personnelId) && !isFreeOnly) {
    list = list.filter(
      (c) => c.assigned_marketer_id === personnelId || c.assigned_marketer_id === userId || userName && c.assigned_marketer_name === userName
    );
  }
  if (search && typeof search === "string") {
    const s = search.toLowerCase();
    list = list.filter(
      (c) => c.company_name?.toLowerCase().includes(s) || c.manager_name?.toLowerCase().includes(s) || c.city?.toLowerCase().includes(s) || c.business_type?.toLowerCase().includes(s)
    );
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
router3.get("/:id", async (req, res) => {
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
  cust.reports = reportsData.filter((r) => String(r.customer_id) === String(id));
  cust.contacts = contactsData.filter((ct) => String(ct.customer_id) === String(id));
  res.json(cust);
});
router3.post("/bulk-set-deadline", async (req, res) => {
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
router3.post("/bulk-extend", async (req, res) => {
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
router3.post("/bulk-switch", async (req, res) => {
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
router3.post("/", async (req, res) => {
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
        if (dup && dup.conflictType === "active_marketer") {
          return res.status(409).json({
            error: "DUPLICATE_CONTACT",
            message: dup.message,
            conflict: dup
          });
        }
      }
    }
    const newId = payload.id || crypto5.randomUUID();
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
        invalidateCustomersCache();
        const fullCustomer = computeCustomerExpiration({
          ...createdCust.data || cleanPayload,
          contacts: createdContactsData
        });
        recentCustomerCreations.push({
          id: newId,
          company_name: (payload.company_name || "").trim(),
          phones: allPhones,
          customer: fullCustomer,
          timestamp: Date.now()
        });
        return res.status(201).json(fullCustomer);
      } catch (err) {
        console.error("Customer create Directus error:", err.message);
        return res.status(500).json({
          error: "CUSTOMER_SAVE_FAILED",
          message: `\u062E\u0637\u0627 \u062F\u0631 \u0630\u062E\u06CC\u0631\u0647 \u067E\u0631\u0648\u0646\u062F\u0647 \u0645\u0634\u062A\u0631\u06CC \u062F\u0631 \u067E\u0627\u06CC\u06AF\u0627\u0647 \u062F\u0627\u062F\u0647 \u0645\u0631\u06A9\u0632\u06CC: ${err.message}`
        });
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
    res.status(201).json(newCustomer);
  } finally {
    activeCustomerCreationLocks.delete(phoneLockKey);
  }
});
router3.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const payload = req.body;
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
  if (directusUrl && directusAdminToken) {
    try {
      const patchedCust = await directusFetch(`/items/customers/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patchPayload)
      });
      if (payload.contacts && Array.isArray(payload.contacts)) {
        try {
          const oldContacts = await directusFetch(
            `/items/customer_contacts?filter[customer_id][_eq]=${encodeURIComponent(id)}`
          );
          if (oldContacts?.data && Array.isArray(oldContacts.data)) {
            for (const oldCt of oldContacts.data) {
              await directusFetch(`/items/customer_contacts/${oldCt.id}`, {
                method: "DELETE"
              }).catch(() => {
              });
            }
          }
        } catch {
        }
        const newContacts = extractCustomerContacts(payload, id);
        for (const ct of newContacts) {
          await directusFetch("/items/customer_contacts", {
            method: "POST",
            body: JSON.stringify(ct)
          }).catch(() => {
          });
        }
      }
      invalidateCustomersCache();
      const updatedCust = computeCustomerExpiration(patchedCust.data || patchPayload);
      return res.json(updatedCust);
    } catch (err) {
      console.error("Customer patch Directus error:", err.message);
      return res.status(500).json({
        error: "CUSTOMER_UPDATE_FAILED",
        message: `\u062E\u0637\u0627 \u062F\u0631 \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u067E\u0631\u0648\u0646\u062F\u0647 \u0645\u0634\u062A\u0631\u06CC \u062F\u0631 \u067E\u0627\u06CC\u06AF\u0627\u0647 \u062F\u0627\u062F\u0647 \u0645\u0631\u06A9\u0632\u06CC: ${err.message}`
      });
    }
  }
  const index = customersData.findIndex((c) => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Customer not found" });
  }
  const updatedCustomer = computeCustomerExpiration({
    ...customersData[index],
    ...patchPayload
  });
  customersData[index] = updatedCustomer;
  invalidateCustomersCache();
  res.json(updatedCustomer);
});
router3.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const { isAdmin } = getRequestUser(req);
  if (!isAdmin) {
    return res.status(403).json({ error: "\u0641\u0642\u0637 \u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645 \u0627\u062C\u0627\u0632\u0647 \u062D\u0630\u0641 \u067E\u0631\u0648\u0646\u062F\u0647 \u0645\u0634\u062A\u0631\u06CC \u0631\u0627 \u062F\u0627\u0631\u062F." });
  }
  if (directusUrl && directusAdminToken) {
    try {
      await directusFetch(`/items/customers/${id}`, { method: "DELETE" });
      const contactsRes = await directusFetch(
        `/items/customer_contacts?filter[customer_id][_eq]=${encodeURIComponent(id)}`
      ).catch(() => null);
      if (contactsRes?.data && Array.isArray(contactsRes.data)) {
        for (const ct of contactsRes.data) {
          await directusFetch(`/items/customer_contacts/${ct.id}`, { method: "DELETE" }).catch(
            () => {
            }
          );
        }
      }
      invalidateCustomersCache();
      return res.status(204).send();
    } catch (err) {
      return res.status(500).json({
        error: "CUSTOMER_DELETE_FAILED",
        message: `\u062E\u0637\u0627 \u062F\u0631 \u062D\u0630\u0641 \u067E\u0631\u0648\u0646\u062F\u0647 \u0645\u0634\u062A\u0631\u06CC: ${err.message}`
      });
    }
  }
  setCustomersData(customersData.filter((c) => c.id !== id));
  invalidateCustomersCache();
  res.status(204).send();
});
router3.post("/:id/claim-free", async (req, res) => {
  const { userId, personnelId, userName } = getRequestUser(req);
  const targetPersonnelId = req.body.personnel_id || personnelId || userId;
  const targetPersonnelName = req.body.personnel_name || userName;
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
  if (directusUrl && directusAdminToken) {
    try {
      const patchedRes = await directusFetch(`/items/customers/${req.params.id}`, {
        method: "PATCH",
        body: JSON.stringify(patchData)
      });
      const auditReport = {
        id: crypto5.randomUUID(),
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
      await directusFetch("/items/customer_reports", {
        method: "POST",
        body: JSON.stringify(auditReport)
      }).catch(() => {
      });
      invalidateCustomersCache();
      invalidateReportsCache();
      const finalCust = computeCustomerExpiration(patchedRes.data || { ...targetCustomer, ...patchData });
      return res.json({
        success: true,
        message: `\u067E\u0631\u0648\u0646\u062F\u0647 \xAB${finalCust.company_name}\xBB \u0628\u0627 \u0645\u0647\u0644\u062A ${days} \u0631\u0648\u0632 \u0628\u0647 \u0634\u0645\u0627 \u0627\u062E\u062A\u0635\u0627\u0635 \u062F\u0627\u062F\u0647 \u0634\u062F.`,
        customer: finalCust
      });
    } catch (e) {
      console.error("Claim customer Directus error:", e.message);
      return res.status(500).json({
        error: "CLAIM_FAILED",
        message: `\u062E\u0637\u0627 \u062F\u0631 \u0627\u062E\u062A\u0635\u0627\u0635 \u067E\u0631\u0648\u0646\u062F\u0647: ${e.message}`
      });
    }
  }
  const idx = customersData.findIndex((c) => c.id === req.params.id);
  if (idx !== -1) {
    customersData[idx] = computeCustomerExpiration({
      ...customersData[idx],
      ...patchData
    });
  }
  invalidateCustomersCache();
  res.json({
    success: true,
    message: "\u067E\u0631\u0648\u0646\u062F\u0647 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u0628\u0647 \u0634\u0645\u0627 \u0627\u062E\u062A\u0635\u0627\u0635 \u062F\u0627\u062F\u0647 \u0634\u062F.",
    customer: customersData[idx]
  });
});
router3.post("/merge", async (req, res) => {
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
          id: crypto5.randomUUID(),
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
      console.error("Merge customers error:", err.message);
      return res.status(500).json({
        error: "MERGE_FAILED",
        message: `\u062E\u0637\u0627 \u062F\u0631 \u0627\u062F\u063A\u0627\u0645 \u067E\u0631\u0648\u0646\u062F\u0647\u200C\u0647\u0627\u06CC \u0645\u0634\u062A\u0631\u06CC\u0627\u0646: ${err.message}`
      });
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
var customers_routes_default = router3;

// server/routes/reports.routes.ts
import { Router as Router4 } from "express";
import crypto6 from "crypto";
var router4 = Router4();
router4.get("/", async (req, res) => {
  const { customer_id, page, limit, all, status, negotiator, search, admin_filter, staff_filter, start_date, end_date, fields } = req.query;
  const { userId, personnelId, isAdmin, userName, tenantId } = getRequestUser(req);
  const isUnlimited = all === "true" || limit === "all" || limit === "50000";
  const reqLimit = isUnlimited ? 50 : limit ? Math.min(Math.max(1, parseInt(String(limit), 10)), 100) : 25;
  const reqPage = page ? Math.max(1, parseInt(String(page), 10)) : 1;
  const activeFilter = isAdmin ? admin_filter : staff_filter;
  const requiresRelationalFilter = Boolean(
    activeFilter && activeFilter !== "all" && activeFilter !== "active_followups" && activeFilter !== "no_followup"
  );
  if (directusUrl && directusAdminToken && !isUnlimited && !requiresRelationalFilter) {
    try {
      const directusPageLimit = Math.min(reqLimit, 100);
      let directusPath = `/items/customer_reports?page=${reqPage}&limit=${directusPageLimit}&meta=*&sort=-date_created`;
      let andIdx = 0;
      if (tenantId && tenantId !== "all") {
        const tenantNum = resolveDirectusTenantId(tenantId);
        if (tenantNum && tenantNum > 1) {
          directusPath += `&filter[_and][${andIdx++}][tenant_id][_eq]=${tenantNum}`;
        }
      }
      if (customer_id) {
        directusPath += `&filter[_and][${andIdx++}][customer_id][_eq]=${encodeURIComponent(String(customer_id))}`;
      } else if (!isAdmin && (userName || personnelId || userId)) {
        let repOr = 0;
        if (userName) {
          directusPath += `&filter[_and][${andIdx}][_or][${repOr++}][negotiator_name][_icontains]=${encodeURIComponent(userName)}`;
        }
        if (personnelId) {
          directusPath += `&filter[_and][${andIdx}][_or][${repOr++}][created_by][_eq]=${encodeURIComponent(String(personnelId))}`;
          const rawP = String(personnelId).replace(/^p-/, "");
          if (rawP !== String(personnelId)) {
            directusPath += `&filter[_and][${andIdx}][_or][${repOr++}][created_by][_eq]=${encodeURIComponent(rawP)}`;
          }
        }
        if (userId) {
          directusPath += `&filter[_and][${andIdx}][_or][${repOr++}][created_by][_eq]=${encodeURIComponent(String(userId))}`;
        }
        andIdx++;
      }
      const activeFilter2 = isAdmin ? admin_filter : staff_filter;
      if (activeFilter2 === "active_followups") {
        directusPath += `&filter[_and][${andIdx++}][next_followup_date][_nnull]=true`;
      } else if (activeFilter2 === "no_followup") {
        directusPath += `&filter[_and][${andIdx++}][next_followup_date][_null]=true`;
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
        directusPath += `&filter[_and][${andIdx}][_or][0][report_text][_icontains]=${encodeURIComponent(s)}&filter[_and][${andIdx}][_or][1][negotiator_name][_icontains]=${encodeURIComponent(s)}&filter[_and][${andIdx}][_or][2][negotiation_phone][_icontains]=${encodeURIComponent(s)}`;
        andIdx++;
      }
      if (start_date) {
        directusPath += `&filter[_and][${andIdx++}][date_created][_gte]=${encodeURIComponent(String(start_date))}`;
      }
      if (end_date) {
        directusPath += `&filter[_and][${andIdx++}][date_created][_lte]=${encodeURIComponent(String(end_date))}`;
      }
      if (fields) {
        directusPath += `&fields=${encodeURIComponent(String(fields))}`;
      }
      const resData = await directusFetch(directusPath, {}, 1).catch(() => null);
      if (resData && Array.isArray(resData.data)) {
        let items = resData.data;
        const totalCount2 = resData.meta?.filter_count ?? resData.meta?.total_count ?? items.length;
        if (reqLimit > 100 && totalCount2 > items.length && items.length >= 100) {
          const allRes = await directusFetchAllPages(directusPath, {}).catch(() => null);
          if (allRes && Array.isArray(allRes.data) && allRes.data.length > 0) {
            items = allRes.data.slice(0, reqLimit);
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
  const allReports = [...rawReports].sort((a, b) => {
    const tA = new Date(a.date_created || 0).getTime();
    const tB = new Date(b.date_created || 0).getTime();
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
    } else if (!isAdmin) {
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
    if (isAdmin && admin_filter && admin_filter !== "all") {
      switch (admin_filter) {
        case "active_followups":
          result = result.filter((r) => {
            const customer = allCustomers.find((c) => c.id === r.customer_id);
            const followupDate = r.next_followup_date || customer?.next_followup_date;
            return isActiveDate(followupDate);
          });
          break;
        case "no_followup":
          result = result.filter((r) => {
            const customer = allCustomers.find((c) => c.id === r.customer_id);
            const followupDate = r.next_followup_date || customer?.next_followup_date;
            return !followupDate;
          });
          break;
        case "latest_reports": {
          const latestMap = /* @__PURE__ */ new Map();
          for (const rep of result) {
            if (!latestMap.has(rep.customer_id)) {
              latestMap.set(rep.customer_id, rep);
            }
          }
          result = Array.from(latestMap.values());
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
    } else if (!isAdmin && staff_filter) {
      switch (staff_filter) {
        case "active_followups":
          result = result.filter((r) => {
            const customer = allCustomers.find((c) => c.id === r.customer_id);
            const followupDate = r.next_followup_date || customer?.next_followup_date;
            return isActiveDate(followupDate);
          });
          break;
        case "no_followup":
          result = result.filter((r) => {
            const customer = allCustomers.find((c) => c.id === r.customer_id);
            const followupDate = r.next_followup_date || customer?.next_followup_date;
            return !followupDate;
          });
          break;
        case "due_less_3_days":
        case "due_less_7_days":
        case "due_less_10_days": {
          const maxDays = staff_filter === "due_less_3_days" ? 3 : staff_filter === "due_less_7_days" ? 7 : 10;
          result = result.filter((r) => {
            const customer = allCustomers.find((c) => c.id === r.customer_id);
            const followupDate = r.next_followup_date || customer?.next_followup_date;
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
router4.post("/", async (req, res) => {
  const { userId, personnelId, userName } = getRequestUser(req);
  const payload = req.body;
  if (!payload.customer_id || !payload.report_text) {
    return res.status(400).json({ error: "\u0634\u0646\u0627\u0633\u0647 \u0645\u0634\u062A\u0631\u06CC \u0648 \u0645\u062A\u0646 \u06AF\u0632\u0627\u0631\u0634 \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A." });
  }
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const newReportId = payload.id || crypto6.randomUUID();
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
      nextFollowupIso = new Date(nextFollowupIso).toISOString();
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
    negotiation_phone: (payload.negotiation_phone || "").trim(),
    report_text: (payload.report_text || "").trim(),
    negotiation_score: Number(payload.negotiation_score) || 5,
    next_followup_date: nextFollowupIso,
    negotiation_status: payload.negotiation_status || "\u062A\u0645\u0627\u0633 \u0628\u0631\u0642\u0631\u0627\u0631 \u0646\u0634\u062F\u0647",
    created_by: safeCreatedByFk || void 0,
    date_created: payload.date_created || nowIso,
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
        created_by: safeCreatedByFk,
        tenant_id: tenantNum
      };
      const created = await directusFetch("/items/customer_reports", {
        method: "POST",
        body: JSON.stringify(directusReportPayload)
      });
      const custRes = await directusFetch(`/items/customers/${payload.customer_id}`).catch(
        () => null
      );
      if (custRes?.data) {
        const custPatch = {
          status: payload.negotiation_status || custRes.data.status,
          date_updated: nowIso
        };
        if (nextFollowupIso) {
          custPatch.next_followup_date = nextFollowupIso;
        }
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
      invalidateCustomersCache();
      invalidateReportsCache();
      return res.status(201).json(created.data || newReport);
    } catch (err) {
      console.error("Customer report create Directus error:", err.message);
      return res.status(500).json({
        error: "REPORT_SAVE_FAILED",
        message: `\u062E\u0637\u0627 \u062F\u0631 \u062B\u0628\u062A \u06AF\u0632\u0627\u0631\u0634 \u062F\u0631 \u067E\u0627\u06CC\u06AF\u0627\u0647 \u062F\u0627\u062F\u0647 \u0645\u0631\u06A9\u0632\u06CC: ${err.message}`
      });
    }
  }
  reportsData.unshift(newReport);
  const custIdx = customersData.findIndex((c) => c.id === payload.customer_id);
  if (custIdx >= 0) {
    customersData[custIdx].status = payload.negotiation_status || customersData[custIdx].status;
    if (nextFollowupIso) {
      customersData[custIdx].next_followup_date = nextFollowupIso;
    }
    customersData[custIdx].date_updated = nowIso;
  }
  invalidateCustomersCache();
  invalidateReportsCache();
  res.status(201).json(newReport);
});
router4.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const { isAdmin } = getRequestUser(req);
  if (!isAdmin) {
    return res.status(403).json({ error: "\u0641\u0642\u0637 \u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645 \u0627\u062C\u0627\u0632\u0647 \u062D\u0630\u0641 \u06AF\u0632\u0627\u0631\u0634 \u0645\u0630\u0627\u06A9\u0631\u0647 \u0631\u0627 \u062F\u0627\u0631\u062F." });
  }
  if (directusUrl && directusAdminToken) {
    try {
      await directusFetch(`/items/customer_reports/${id}`, { method: "DELETE" });
      invalidateReportsCache();
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
  invalidateReportsCache();
  res.status(204).send();
});
var reports_routes_default = router4;

// server/routes/coldLeads.routes.ts
import { Router as Router5 } from "express";
import crypto7 from "crypto";
var router5 = Router5();
router5.get("/api/cold-leads", async (req, res) => {
  const { userId, personnelId, isAdmin, userName, tenantId } = getRequestUser(req);
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
        if (!isAdmin && (userName || userId || personnelId)) {
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
  if (!isAdmin && (userName || userId || personnelId)) {
    leads = leads.filter(
      (l) => personnelId && l.assigned_to === personnelId || userName && l.assigned_to === userName
    );
  }
  res.json(leads);
});
router5.post("/api/cold-leads", async (req, res) => {
  const payload = req.body;
  const { userId, personnelId, userName, isAdmin, tenantId } = getRequestUser(req);
  const newLeadId = crypto7.randomUUID();
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
      console.error("Cold lead error:", err.message);
      return res.status(500).json({
        error: "LEAD_SAVE_FAILED",
        message: `\u062E\u0637\u0627 \u062F\u0631 \u062B\u0628\u062A \u0634\u0645\u0627\u0631\u0647 \u062F\u0631 \u067E\u0627\u06CC\u06AF\u0627\u0647 \u062F\u0627\u062F\u0647 \u0645\u0631\u06A9\u0632\u06CC: ${err.message}`
      });
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
router5.patch("/api/cold-leads/:id", async (req, res) => {
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
router5.post("/api/cold-leads/bulk-assign", async (req, res) => {
  const { lead_ids, target_marketer_id } = req.body;
  const { isAdmin } = getRequestUser(req);
  if (!isAdmin) {
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
router5.delete("/api/cold-leads/:id", async (req, res) => {
  if (directusUrl && directusAdminToken) {
    try {
      await directusFetch(`/items/cold_leads/${req.params.id}`, { method: "DELETE" });
    } catch {
    }
  }
  setColdLeadsData(coldLeadsData.filter((l) => l.id !== req.params.id));
  res.json({ success: true, message: "\u0634\u0645\u0627\u0631\u0647 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062D\u0630\u0641 \u0634\u062F." });
});
router5.post("/api/cold-leads/:id/convert", async (req, res) => {
  const newCustId = crypto7.randomUUID();
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
    id: crypto7.randomUUID(),
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
      const fullCustomer = { ...finalCust, contacts: [contactItem] };
      return res.json({ success: true, customer: fullCustomer });
    } catch (err) {
      console.error("Convert lead error:", err.message);
      return res.status(500).json({
        error: "CONVERT_FAILED",
        message: `\u062E\u0637\u0627 \u062F\u0631 \u062A\u0628\u062F\u06CC\u0644 \u0644\u06CC\u062F \u0628\u0647 \u0645\u0634\u062A\u0631\u06CC \u062F\u0631 \u067E\u0627\u06CC\u06AF\u0627\u0647 \u062F\u0627\u062F\u0647 \u0645\u0631\u06A9\u0632\u06CC: ${err.message}`
      });
    }
  }
  res.status(500).json({ error: "\u067E\u0627\u06CC\u06AF\u0627\u0647 \u062F\u0627\u062F\u0647 \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u0646\u06CC\u0633\u062A." });
});
var coldLeads_routes_default = router5;

// server/routes/leaveRequests.routes.ts
import { Router as Router6 } from "express";
import crypto8 from "crypto";
var router6 = Router6();
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
router6.get("/api/leave-requests", getLeaveRequestsHandler);
router6.get("/leave-requests", getLeaveRequestsHandler);
router6.post("/api/leave-requests", async (req, res) => {
  const payload = req.body;
  const { userId, personnelId, userName, tenantId } = getRequestUser(req);
  const newId = crypto8.randomUUID();
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
  const applicantP = personnelData.find((p) => p.id === targetPersonnelId || p.user_id === targetPersonnelId || p.name === targetPersonnelName);
  if (applicantP?.phone) {
    applicantPhone = applicantP.phone;
  }
  const nameParts = (targetPersonnelName || "").trim().split(" ");
  const fName = nameParts[0] || "\u0647\u0645\u06A9\u0627\u0631";
  const lName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "\u06AF\u0631\u0627\u0645\u06CC";
  const now2 = /* @__PURE__ */ new Date();
  const jalaliDate = now2.toLocaleDateString("fa-IR");
  const leaveVars = {
    name: fName,
    family: lName,
    fullName: targetPersonnelName,
    mobile: applicantPhone || "\u0646\u0627\u0645\u0634\u062E\u0635",
    phone: applicantPhone || "\u0646\u0627\u0645\u0634\u062E\u0635",
    request_date: jalaliDate,
    leave_type: newRequest.leave_type === "daily" ? "\u0645\u0631\u062E\u0635\u06CC \u0631\u0648\u0632\u0627\u0646\u0647" : "\u0645\u0631\u062E\u0635\u06CC \u0633\u0627\u0639\u062A\u06CC",
    days: String(newRequest.days_count || 1),
    hours: String(newRequest.hours_count || 1),
    start_date: payload.start_date || jalaliDate,
    end_date: payload.end_date || payload.start_date || jalaliDate,
    leave_date: payload.start_date || jalaliDate,
    start_time: newRequest.start_time || "",
    end_time: newRequest.end_time || "",
    from_time: newRequest.start_time || "",
    to_time: newRequest.end_time || "",
    reason: newRequest.reason || "-"
  };
  const patternToUse = newRequest.leave_type === "daily" ? projectSettingsData.dayli_leave_request_pattern : projectSettingsData.hourly_leave_request_pattern;
  if (patternToUse) {
    if (applicantPhone) {
      sendIppanelSmsPattern(applicantPhone, patternToUse, leaveVars).catch((e) => console.warn("Leave request SMS to applicant error:", e.message));
    }
    sendTenantAdminsSmsPattern(targetTenantId, patternToUse, leaveVars).catch((e) => console.warn("Leave request SMS to admin error:", e.message));
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
      console.error("[Directus leave_requests POST ERROR]:", err.message);
      return res.status(500).json({
        error: "LEAVE_REQUEST_SAVE_FAILED",
        message: `\u062E\u0637\u0627 \u062F\u0631 \u0630\u062E\u06CC\u0631\u0647 \u062F\u0631\u062E\u0648\u0627\u0633\u062A \u0645\u0631\u062E\u0635\u06CC \u062F\u0631 \u067E\u0627\u06CC\u06AF\u0627\u0647 \u062F\u0627\u062F\u0647: ${err.message}`
      });
    }
  }
  leaveRequestsData.unshift(newRequest);
  res.status(201).json(newRequest);
});
router6.patch("/api/leave-requests/:id", async (req, res) => {
  const { id } = req.params;
  const { status, manager_note } = req.body;
  const { userName, isAdmin, userRole, personnelId } = getRequestUser(req);
  const currentP = personnelData.find((p) => p.id === personnelId);
  const canApprove = isAdmin || userRole === "admin" || userRole === "sales_manager" || currentP?.permissions?.can_approve_leaves;
  if (!canApprove) {
    return res.status(403).json({ error: "\u0634\u0645\u0627 \u062F\u0633\u062A\u0631\u0633\u06CC \u0644\u0627\u0632\u0645 \u0628\u0631\u0627\u06CC \u062A\u0627\u06CC\u06CC\u062F \u06CC\u0627 \u0631\u062F \u062F\u0631\u062E\u0648\u0627\u0633\u062A\u200C\u0647\u0627\u06CC \u0645\u0631\u062E\u0635\u06CC \u0631\u0627 \u0646\u062F\u0627\u0631\u06CC\u062F." });
  }
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const updatePayload = {
    status: status || "pending",
    manager_note: manager_note || null,
    reviewed_by: userName || "\u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645",
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
  if (targetReq) {
    const applicantP = personnelData.find((p) => p.id === targetReq.personnel_id || p.user_id === targetReq.personnel_id || p.name === targetReq.personnel_name);
    const applicantPhone = applicantP?.phone;
    let patternToUse = "";
    if (status === "approved") {
      patternToUse = targetReq.leave_type === "daily" ? projectSettingsData.dayli_leave_accept_pattern || "" : projectSettingsData.hourly_leave_accept_pattern || "";
    } else if (status === "rejected") {
      patternToUse = targetReq.leave_type === "daily" ? projectSettingsData.dayli_leave_reject_pattern || "" : projectSettingsData.hourly_leave_reject_pattern || "";
    }
    if (patternToUse) {
      const nameParts = (targetReq.personnel_name || "").trim().split(" ");
      const fName = nameParts[0] || "\u0647\u0645\u06A9\u0627\u0631";
      const lName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "\u06AF\u0631\u0627\u0645\u06CC";
      const now2 = /* @__PURE__ */ new Date();
      const jalaliDate = now2.toLocaleDateString("fa-IR");
      const statusVars = {
        name: fName,
        family: lName,
        fullName: targetReq.personnel_name,
        mobile: applicantPhone || "\u0646\u0627\u0645\u0634\u062E\u0635",
        phone: applicantPhone || "\u0646\u0627\u0645\u0634\u062E\u0635",
        request_date: targetReq.date_created ? new Date(targetReq.date_created).toLocaleDateString("fa-IR") : jalaliDate,
        leave_type: targetReq.leave_type === "daily" ? "\u0645\u0631\u062E\u0635\u06CC \u0631\u0648\u0632\u0627\u0646\u0647" : "\u0645\u0631\u062E\u0635\u06CC \u0633\u0627\u0639\u062A\u06CC",
        leave_date: targetReq.start_date || jalaliDate,
        start_date: targetReq.start_date || jalaliDate,
        end_date: targetReq.end_date || targetReq.start_date || jalaliDate,
        start_time: targetReq.start_time || "",
        end_time: targetReq.end_time || "",
        from_time: targetReq.start_time || "",
        to_time: targetReq.end_time || "",
        days: String(targetReq.days_count || 1),
        hours: String(targetReq.hours_count || 1),
        manager_note: manager_note || (status === "approved" ? "\u062A\u0627\u06CC\u06CC\u062F \u0634\u062F" : "\u0631\u062F \u0634\u062F"),
        reviewed_by: userName || "\u0645\u062F\u06CC\u0631\u06CC\u062A"
      };
      if (applicantPhone) {
        sendIppanelSmsPattern(applicantPhone, patternToUse, statusVars).catch((e) => console.warn("Leave request status SMS error:", e.message));
      }
      sendTenantAdminsSmsPattern(targetReq.tenant_id || "default", patternToUse, statusVars).catch((e) => console.warn("Leave status SMS to admin warning:", e.message));
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
router6.delete("/api/leave-requests/:id", async (req, res) => {
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
var leaveRequests_routes_default = router6;

// server/routes/advanceRequests.routes.ts
import { Router as Router7 } from "express";
import crypto9 from "crypto";
var router7 = Router7();
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
router7.get("/api/advance-requests", getAdvanceRequestsHandler);
router7.get("/advance-requests", getAdvanceRequestsHandler);
router7.post("/api/advance-requests", async (req, res) => {
  const payload = req.body;
  const { userId, personnelId, userName, tenantId } = getRequestUser(req);
  const newId = crypto9.randomUUID();
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
  const applicantP = personnelData.find((p) => p.id === targetPersonnelId || p.user_id === targetPersonnelId || p.name === targetPersonnelName);
  if (applicantP?.phone) {
    applicantPhone = applicantP.phone;
  }
  if (projectSettingsData.addvance_request_pattern) {
    const nameParts = (targetPersonnelName || "").trim().split(" ");
    const fName = nameParts[0] || "\u0647\u0645\u06A9\u0627\u0631";
    const lName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "\u06AF\u0631\u0627\u0645\u06CC";
    const now2 = /* @__PURE__ */ new Date();
    const jalaliDate = now2.toLocaleDateString("fa-IR");
    const amountStr = String(newRequest.amount || 0);
    const advVars = {
      name: fName,
      family: lName,
      fullName: targetPersonnelName,
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
    sendTenantAdminsSmsPattern(targetTenantId, projectSettingsData.addvance_request_pattern, advVars).catch((e) => console.warn("Advance request SMS to admin error:", e.message));
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
      console.error("[Directus advance_requests POST ERROR]:", err.message);
      return res.status(500).json({
        error: "ADVANCE_REQUEST_SAVE_FAILED",
        message: `\u062E\u0637\u0627 \u062F\u0631 \u0630\u062E\u06CC\u0631\u0647 \u062F\u0631\u062E\u0648\u0627\u0633\u062A \u0645\u0633\u0627\u0639\u062F\u0647 \u062F\u0631 \u067E\u0627\u06CC\u06AF\u0627\u0647 \u062F\u0627\u062F\u0647: ${err.message}`
      });
    }
  }
  advanceRequestsData.unshift(newRequest);
  res.status(201).json(newRequest);
});
router7.patch("/api/advance-requests/:id", async (req, res) => {
  const { id } = req.params;
  const { status, approved_amount, manager_note } = req.body;
  const { userName, isAdmin, userRole, personnelId } = getRequestUser(req);
  const currentP = personnelData.find((p) => p.id === personnelId);
  const canApprove = isAdmin || userRole === "admin" || userRole === "sales_manager" || currentP?.permissions?.can_approve_advances;
  if (!canApprove) {
    return res.status(403).json({ error: "\u0634\u0645\u0627 \u062F\u0633\u062A\u0631\u0633\u06CC \u0644\u0627\u0632\u0645 \u0628\u0631\u0627\u06CC \u062A\u0627\u06CC\u06CC\u062F \u06CC\u0627 \u0631\u062F \u062F\u0631\u062E\u0648\u0627\u0633\u062A\u200C\u0647\u0627\u06CC \u0645\u0633\u0627\u0639\u062F\u0647 \u0631\u0627 \u0646\u062F\u0627\u0631\u06CC\u062F." });
  }
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const updatePayload = {
    status: status || "pending",
    approved_amount: approved_amount !== void 0 ? Number(approved_amount) : null,
    manager_note: manager_note || null,
    reviewed_by: userName || "\u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645",
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
  if (targetReq) {
    const applicantP = personnelData.find((p) => p.id === targetReq.personnel_id || p.user_id === targetReq.personnel_id || p.name === targetReq.personnel_name);
    const applicantPhone = applicantP?.phone;
    let patternToUse = "";
    if (status === "approved") {
      patternToUse = projectSettingsData.addvance_accept_pattern || "";
    } else if (status === "rejected") {
      patternToUse = projectSettingsData.addvance_reject_pattern || "";
    }
    if (patternToUse) {
      const nameParts = (targetReq.personnel_name || "").trim().split(" ");
      const fName = nameParts[0] || "\u0647\u0645\u06A9\u0627\u0631";
      const lName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "\u06AF\u0631\u0627\u0645\u06CC";
      const now2 = /* @__PURE__ */ new Date();
      const jalaliDate = now2.toLocaleDateString("fa-IR");
      const statusVars = {
        name: fName,
        family: lName,
        fullName: targetReq.personnel_name,
        mobile: applicantPhone || "\u0646\u0627\u0645\u0634\u062E\u0635",
        phone: applicantPhone || "\u0646\u0627\u0645\u0634\u062E\u0635",
        requested_amount: String(targetReq.amount || 0),
        approved_amount: String(approved_amount ?? targetReq.amount ?? 0),
        amount: String(approved_amount ?? targetReq.amount ?? 0),
        target_month: targetReq.target_month || "-",
        needed_date: targetReq.needed_date || jalaliDate,
        manager_note: manager_note || (status === "approved" ? "\u062A\u0627\u06CC\u06CC\u062F \u0634\u062F" : "\u0631\u062F \u0634\u062F"),
        reviewed_by: userName || "\u0645\u062F\u06CC\u0631\u06CC\u062A"
      };
      if (applicantPhone) {
        sendIppanelSmsPattern(applicantPhone, patternToUse, statusVars).catch((e) => console.warn("Advance request status SMS error:", e.message));
      }
      sendTenantAdminsSmsPattern(targetReq.tenant_id || "default", patternToUse, statusVars).catch((e) => console.warn("Advance status SMS to admin warning:", e.message));
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
router7.delete("/api/advance-requests/:id", async (req, res) => {
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
var advanceRequests_routes_default = router7;

// server/routes/tenants.routes.ts
import { Router as Router8 } from "express";
var router8 = Router8();
router8.get("/", async (req, res) => {
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
router8.post("/", async (req, res) => {
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
router8.patch("/:id", async (req, res) => {
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
router8.delete("/:id", async (req, res) => {
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
var tenants_routes_default = router8;

// server/routes/adminReports.routes.ts
import { Router as Router9 } from "express";
import crypto10 from "crypto";
var router9 = Router9();
function normalizeReport(r) {
  let hourly = r.hourly_logs;
  if (typeof hourly === "string" && hourly.startsWith("[")) {
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
  const { userId, personnelId, isAdmin, userName, tenantId } = getRequestUser(req);
  if (directusUrl && directusAdminToken) {
    try {
      const result = await directusFetchAllPages("/items/administrative_reports?sort=-report_date");
      if (result && Array.isArray(result.data)) {
        let reports = result.data.map(normalizeReport);
        if (tenantId && tenantId !== "all") {
          reports = reports.filter((r) => matchesTenant(r.tenant_id, tenantId));
        }
        if (!isAdmin && (userId || personnelId)) {
          reports = reports.filter(
            (r) => r.personnel_id === personnelId || r.personnel_id === userId || userName && r.personnel_name === userName
          );
        }
        return res.json(reports);
      }
    } catch (e) {
      return res.status(502).json({ error: `\u062E\u0637\u0627 \u062F\u0631 \u062F\u0631\u06CC\u0627\u0641\u062A \u06AF\u0632\u0627\u0631\u0634\u200C\u0647\u0627\u06CC \u0627\u062F\u0627\u0631\u06CC \u0627\u0632 \u067E\u0627\u06CC\u06AF\u0627\u0647 \u062F\u0627\u062F\u0647 \u0645\u0631\u06A9\u0632\u06CC: ${e.message}` });
    }
  }
  res.json([]);
};
router9.get("/api/administrative-reports", getHandler);
router9.get("/api/admin-reports", getHandler);
var postHandler = async (req, res) => {
  const payload = req.body;
  const { userId, personnelId, userName, tenantId } = getRequestUser(req);
  const newAdmId = crypto10.randomUUID();
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const rawPId = payload.personnel_id || personnelId || userId;
  const resolved = await resolvePersonnelId(rawPId, payload.personnel_name || userName);
  const targetTenantId = payload.tenant_id || tenantId || "default";
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
    hourly_logs: payload.hourly_logs || null,
    status: payload.status === "submitted" ? "submitted" : "draft",
    date_created: nowIso
  };
  if (directusUrl && directusAdminToken) {
    try {
      const directusReportPayload = {
        ...newReport,
        tenant_id: resolveDirectusTenantId(targetTenantId)
      };
      const created = await directusFetch("/items/administrative_reports", {
        method: "POST",
        body: JSON.stringify(directusReportPayload)
      });
      return res.status(201).json(normalizeReport(created.data || newReport));
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes("hourly_logs")) {
        try {
          const { hourly_logs, ...fallbackReport } = newReport;
          const created = await directusFetch("/items/administrative_reports", {
            method: "POST",
            body: JSON.stringify({
              ...fallbackReport,
              tenant_id: resolveDirectusTenantId(targetTenantId)
            })
          });
          return res.status(201).json(normalizeReport({ ...created.data || fallbackReport, hourly_logs: newReport.hourly_logs }));
        } catch {
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
router9.post("/api/administrative-reports", postHandler);
router9.post("/api/admin-reports", postHandler);
var patchHandler = async (req, res) => {
  const { id } = req.params;
  const payload = req.body;
  const { isAdmin } = getRequestUser(req);
  if (directusUrl && directusAdminToken) {
    try {
      const existingRes = await directusFetch(`/items/administrative_reports/${encodeURIComponent(id)}`).catch(() => null);
      if (existingRes?.data) {
        if (existingRes.data.status === "submitted" && !isAdmin) {
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
        hourly_logs: payload.hourly_logs !== void 0 ? payload.hourly_logs : void 0,
        status: payload.status || void 0,
        date_updated: (/* @__PURE__ */ new Date()).toISOString()
      };
      Object.keys(updateData).forEach((k) => updateData[k] === void 0 && delete updateData[k]);
      const updated = await directusFetch(`/items/administrative_reports/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(updateData)
      });
      return res.json(normalizeReport(updated.data || { id, ...updateData }));
    } catch (err) {
      return res.status(500).json({ error: `\u062E\u0637\u0627 \u062F\u0631 \u0648\u06CC\u0631\u0627\u06CC\u0634 \u06AF\u0632\u0627\u0631\u0634 \u0627\u062F\u0627\u0631\u06CC: ${err.message}` });
    }
  }
  res.json(normalizeReport({ id, ...payload }));
};
router9.patch("/api/administrative-reports/:id", patchHandler);
router9.patch("/api/admin-reports/:id", patchHandler);
var adminReports_routes_default = router9;

// server/routes/analytics.routes.ts
import { Router as Router10 } from "express";
var router10 = Router10();
var analyticsCache = /* @__PURE__ */ new Map();
var ANALYTICS_CACHE_TTL = 3e4;
router10.get(["/stats", "/api/analytics/stats"], async (req, res) => {
  const { start_date, end_date, negotiator } = req.query;
  const { userId, personnelId, isAdmin, userName, tenantId } = getRequestUser(req);
  const targetNegotiator = !isAdmin ? userName || "" : negotiator && negotiator !== "all" && negotiator !== "\u0647\u0645\u0647" ? String(negotiator) : "";
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
router10.get(["/daily", "/api/analytics/daily"], async (req, res) => {
  const { days, start_date, end_date, negotiator } = req.query;
  const { userId, personnelId, isAdmin, userName, tenantId } = getRequestUser(req);
  const daysCount = days ? Math.max(1, Math.min(parseInt(String(days), 10), 90)) : 14;
  const targetNegotiator = !isAdmin ? userName || "" : negotiator && negotiator !== "all" && negotiator !== "\u0647\u0645\u0647" ? String(negotiator) : "";
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
var analytics_routes_default = router10;

// server/routes/system.routes.ts
import { Router as Router11 } from "express";
import crypto11 from "crypto";
var router11 = Router11();
router11.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
router11.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
router11.get("/bff-status", (req, res) => {
  res.json({
    online: Boolean(directusUrl && directusAdminToken),
    url: directusUrl || "",
    database: "Directus"
  });
});
router11.get("/api/bff-status", (req, res) => {
  res.json({
    online: Boolean(directusUrl && directusAdminToken),
    url: directusUrl || "",
    database: "Directus"
  });
});
var dashboardSummaryCacheMap = /* @__PURE__ */ new Map();
var globalCallIdToUUIDMap = /* @__PURE__ */ new Map();
var uidToPersonnelMap = /* @__PURE__ */ new Map();
var migrationPersonnelCache = null;
var migrationCustomersCache = null;
var migrationCacheLastFetch = 0;
var DASHBOARD_CACHE_TTL_MS = 3e4;
var handleDashboardSummary = async (req, res) => {
  const { userId, personnelId, isAdmin, userName, tenantId } = getRequestUser(req);
  const cacheKey = `${tenantId || "all"}_${isAdmin ? "admin" : userId || userName || "staff"}`;
  const now2 = Date.now();
  const cached = dashboardSummaryCacheMap.get(cacheKey);
  if (cached && now2 - cached.timestamp < DASHBOARD_CACHE_TTL_MS) {
    return res.json(cached.data);
  }
  if (directusUrl && directusAdminToken) {
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
      if (!isAdmin) {
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
          marketerRepFilter = `&filter[created_by][_eq]=${encodeURIComponent(cleanPId)}`;
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
    upcoming_followups: customersData.slice(0, 5),
    urgent_expiring_customers: customersData.slice(0, 5)
  });
};
router11.get("/api/dashboard-summary", handleDashboardSummary);
router11.get("/api/dashboard/summary", handleDashboardSummary);
router11.get("/api/project-settings", async (req, res) => {
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
router11.patch("/api/project-settings", async (req, res) => {
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
router11.post("/api/auth/update-profile", async (req, res) => {
  const {
    name,
    username,
    phone,
    avatar,
    bank_card_number,
    iban,
    national_id,
    emergency_contact_name,
    emergency_contact_phone,
    emergency_contact_relation,
    family_contacts
  } = req.body;
  const { userId, personnelId, userEmail, userName } = getRequestUser(req);
  const personnelPatch = {};
  if (name) personnelPatch.name = String(name).trim();
  if (username !== void 0) personnelPatch.username = String(username).trim();
  if (phone !== void 0) personnelPatch.phone = String(phone).trim();
  if (avatar !== void 0) personnelPatch.avatar = avatar;
  if (bank_card_number !== void 0) personnelPatch.bank_card_number = String(bank_card_number).trim();
  if (iban !== void 0) personnelPatch.iban = String(iban).trim();
  if (national_id !== void 0) personnelPatch.national_id = String(national_id).trim();
  if (emergency_contact_name !== void 0) personnelPatch.emergency_contact_name = String(emergency_contact_name).trim();
  if (emergency_contact_phone !== void 0) personnelPatch.emergency_contact_phone = String(emergency_contact_phone).trim();
  if (emergency_contact_relation !== void 0) personnelPatch.emergency_contact_relation = String(emergency_contact_relation).trim();
  if (family_contacts !== void 0) personnelPatch.family_contacts = family_contacts;
  let targetPersonnel = null;
  if (directusUrl && directusAdminToken) {
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
      if (foundPId) {
        const updatedRes = await directusFetch(`/items/personnel/${foundPId}`, {
          method: "PATCH",
          body: JSON.stringify(personnelPatch)
        });
        targetPersonnel = updatedRes?.data || { id: foundPId, ...personnelPatch };
      } else {
        const newPId = personnelId || crypto11.randomUUID();
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
            ...personnelPatch
          })
        });
        targetPersonnel = createdRes?.data || { id: newPId, ...personnelPatch };
      }
      if (userId) {
        await directusFetch(`/users/${userId}`, {
          method: "PATCH",
          body: JSON.stringify({
            ...name ? { first_name: name } : {},
            ...avatar ? { avatar } : {}
          })
        }).catch(() => {
        });
      }
    } catch (err) {
      console.error("Directus personnel profile update error:", err.message);
    }
  }
  const targetId = personnelId || userId;
  const idx = personnelData.findIndex(
    (p) => targetId && p.id === targetId || userId && p.user_id === userId || userEmail && p.email?.toLowerCase() === userEmail?.toLowerCase()
  );
  if (idx >= 0) {
    personnelData[idx] = { ...personnelData[idx], ...personnelPatch };
    if (!targetPersonnel) targetPersonnel = personnelData[idx];
  } else {
    const newLocal = {
      id: targetId || "p-1",
      name: name || userName || "\u06A9\u0627\u0631\u0628\u0631 \u0633\u06CC\u0633\u062A\u0645",
      email: userEmail || "",
      phone: phone || "",
      role: "marketer",
      status: "active",
      active: true,
      ...personnelPatch
    };
    personnelData.push(newLocal);
    if (!targetPersonnel) targetPersonnel = newLocal;
  }
  res.json({ success: true, personnel: targetPersonnel, message: "\u0645\u0634\u062E\u0635\u0627\u062A \u067E\u0631\u0648\u0641\u0627\u06CC\u0644 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062F\u0631 \u067E\u0627\u06CC\u06AF\u0627\u0647 \u062F\u0627\u062F\u0647 \u0645\u0631\u06A9\u0632\u06CC \u0630\u062E\u06CC\u0631\u0647 \u0634\u062F." });
});
router11.post("/api/upload-avatar", async (req, res) => {
  const { dataUrl, fileName, mimeType } = req.body;
  const { userId, personnelId } = getRequestUser(req);
  if (!dataUrl) {
    return res.status(400).json({ error: "\u0641\u0627\u06CC\u0644\u06CC \u0627\u0631\u0633\u0627\u0644 \u0646\u0634\u062F\u0647 \u0627\u0633\u062A." });
  }
  let finalAvatarUrl = dataUrl;
  let fileId = null;
  if (directusUrl && directusAdminToken) {
    try {
      const matches = dataUrl.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const fileBuffer = Buffer.from(matches[2], "base64");
        const fileType = matches[1] || mimeType || "image/jpeg";
        const name = fileName || `avatar-${userId || Date.now()}.jpg`;
        const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
        const header = `--${boundary}\r
Content-Disposition: form-data; name="file"; filename="${name}"\r
Content-Type: ${fileType}\r
\r
`;
        const footer = `\r
--${boundary}--\r
`;
        const bodyBuffer = Buffer.concat([Buffer.from(header, "utf-8"), fileBuffer, Buffer.from(footer, "utf-8")]);
        const uploadRes = await fetch(`${directusUrl.replace(/\/$/, "")}/files`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${directusAdminToken}`,
            "Content-Type": `multipart/form-data; boundary=${boundary}`
          },
          body: bodyBuffer
        });
        if (uploadRes.ok) {
          const fileData = await uploadRes.json();
          fileId = fileData?.data?.id;
          if (fileId) {
            finalAvatarUrl = `${directusUrl.replace(/\/$/, "")}/assets/${fileId}`;
            if (userId) {
              await directusFetch(`/users/${userId}`, {
                method: "PATCH",
                body: JSON.stringify({ avatar: fileId })
              }).catch(() => {
              });
            }
          }
        }
      }
    } catch (e) {
      console.error("Error uploading avatar to Directus:", e);
    }
  }
  const targetId = personnelId || userId;
  const idx = personnelData.findIndex((p) => p.id === targetId || p.id === "p-1");
  if (idx >= 0) {
    personnelData[idx].avatar = finalAvatarUrl;
  }
  res.json({ success: true, avatarUrl: finalAvatarUrl, fileId });
});
router11.post("/api/auth/change-password", async (req, res) => {
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
router11.post("/api/check-expirations", (req, res) => {
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
router11.post("/api/migration/reset-cache", handleResetMigrationCache);
router11.post("/migration/reset-cache", handleResetMigrationCache);
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
  if (!input) return crypto11.randomUUID();
  const cleanInput = String(input).trim();
  if (isValidUUID(cleanInput)) return cleanInput;
  const hash = crypto11.createHash("md5").update("alphadesk-crm:" + cleanInput).digest("hex");
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
        custId = crypto11.randomUUID();
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
            id: crypto11.randomUUID(),
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
            id: crypto11.randomUUID(),
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
            id: crypto11.randomUUID(),
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
            id: crypto11.randomUUID(),
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
                id: crypto11.randomUUID(),
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
            id: crypto11.randomUUID(),
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
        matchedCustomerId = callId ? deterministicUUID(callId) : crypto11.randomUUID();
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
router11.post("/api/migration/import", handleMigrationImport);
router11.post("/migration/import", handleMigrationImport);
router11.post("/api/migration/reset-cache", handleResetMigrationCache);
router11.post("/migration/reset-cache", handleResetMigrationCache);
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
router11.post("/api/migration/auto-assign-free-with-reports", handleAutoAssignFreeWithReports);
router11.post("/migration/auto-assign-free-with-reports", handleAutoAssignFreeWithReports);
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
router11.post("/api/migration/backfill-tenants", handleBackfillTenants);
router11.post("/migration/backfill-tenants", handleBackfillTenants);
var system_routes_default = router11;

// server/index.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
app.get(["/health", "/api/health"], (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    directusConnected: Boolean(directusUrl && directusAdminToken)
  });
});
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));
app.use(rateLimiter);
app.use("/api/auth", auth_routes_default);
app.use("/api", auth_routes_default);
app.use(auth_routes_default);
app.use("/api/personnel", personnel_routes_default);
app.use("/api/customers", customers_routes_default);
app.use("/api/customer-reports", reports_routes_default);
app.use("/api/tenants", tenants_routes_default);
app.use("/api/analytics", analytics_routes_default);
app.use(analytics_routes_default);
app.use(coldLeads_routes_default);
app.use(leaveRequests_routes_default);
app.use(advanceRequests_routes_default);
app.use(adminReports_routes_default);
app.use(system_routes_default);
async function startServer() {
  if (directusUrl && directusAdminToken) {
    ensureDirectusTenants().then(() => ensureDirectusPersonnel()).then(async () => {
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
    }).catch((err) => console.warn("Database initialization warning:", err?.message || err));
  }
  const candidateDistDirs = [
    path.resolve(process.cwd(), "dist"),
    path.resolve(__dirname, "dist"),
    path.resolve(__dirname, "../dist"),
    path.resolve(__dirname, "../../dist")
  ];
  const distPath = candidateDistDirs.find(
    (p) => fs.existsSync(p) && fs.existsSync(path.resolve(p, "index.html"))
  );
  const hasDist = Boolean(distPath);
  if (process.env.NODE_ENV === "production") {
    if (hasDist && distPath) {
      console.log(`[Production] Serving pre-compiled frontend assets from ${distPath}`);
      app.use(express.static(distPath));
      app.get("*", (req, res, next) => {
        if (req.path.startsWith("/api") || req.path === "/health" || req.path === "/bff-status") {
          return next();
        }
        res.sendFile(path.resolve(distPath, "index.html"));
      });
    } else {
      console.warn("Production build dist folder not found! Providing graceful fallback response.");
      app.get("/", (req, res) => {
        res.status(200).send("AlphaDesk CRM Server is operational. Building client bundle...");
      });
    }
  } else {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa"
      });
      app.use(vite.middlewares);
      console.log("Vite development middleware mounted successfully.");
    } catch (viteErr) {
      console.warn("Vite development middleware could not be loaded:", viteErr?.message || viteErr);
    }
  }
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT} (0.0.0.0)`);
    console.log(`BFF Mode: ${directusUrl ? "Online Database Connected" : "Offline In-Memory Mode"}`);
  });
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use by another process.`);
    } else {
      console.error("Server socket error encountered:", err);
    }
  });
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
