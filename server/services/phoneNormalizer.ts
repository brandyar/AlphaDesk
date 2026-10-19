import crypto from 'crypto';
import {
  directusUrl,
  directusAdminToken,
  addDays,
  customersData,
  contactsData,
} from '../config.ts';
import { directusFetch } from '../directus/client.ts';
import {
  computeCustomerExpiration,
  updateExpirationFlags,
} from '../directus/cache.ts';
import { resolveDirectusTenantId } from '../directus/sync.ts';
import { CustomerContact } from '../types.ts';

export function normalizePersianString(str?: string | null): string {
  if (!str) return '';
  return String(str)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/إ|أ|آ/g, 'ا')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function normalizeContactValue(value: string, type?: string): string {
  if (!value) return '';
  let clean = value.trim();
  const upper = clean.toUpperCase();
  if (
    upper === 'NULL' ||
    upper === 'UNDEFINED' ||
    upper === 'NONE' ||
    upper === '0' ||
    upper === 'NULL,NULL' ||
    clean.length === 0
  ) {
    return '';
  }

  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  clean = clean.replace(/[۰-۹]/g, (w) => persianDigits.indexOf(w).toString());
  clean = clean.replace(/[٠-٩]/g, (w) => arabicDigits.indexOf(w).toString());
  clean = clean.replace(/[\s\-_()]/g, '');

  if (type === 'mobile' || type === 'landline' || (!type && /^[+0-9]/.test(clean))) {
    clean = clean.replace(/^(\+98|0098)/, '0');
    if (/^9\d{9}$/.test(clean)) {
      clean = '0' + clean;
    }
  } else if (type === 'telegram' || type === 'instagram') {
    clean = clean.replace(/^@+/, '').toLowerCase();
    clean = clean.replace(/^https?:\/\/(www\.)?(t\.me|telegram\.me|instagram\.com)\//i, '');
    clean = clean.replace(/\/$/, '');
  } else if (type === 'email' || type === 'website') {
    clean = clean.toLowerCase();
  }

  const cleanUpper = clean.toUpperCase();
  if (cleanUpper === 'NULL' || cleanUpper === 'UNDEFINED' || cleanUpper === 'NONE') return '';

  return clean;
}

export function cleanCustomerPayloadForDirectus(
  payload: any,
  id: string,
  resolvedMarketerId?: string | null,
  resolvedMarketerName?: string
) {
  const nowIso = new Date().toISOString();

  let marketerId: string | null =
    resolvedMarketerId !== undefined ? resolvedMarketerId : payload.assigned_marketer_id || null;
  if (!marketerId || marketerId === 'همه' || String(marketerId).trim() === '' || marketerId === 'none') {
    marketerId = null;
  }

  let nextFollowup: string | null = payload.next_followup_date || null;
  if (!nextFollowup || String(nextFollowup).trim() === '') {
    nextFollowup = null;
  } else {
    try {
      nextFollowup = new Date(nextFollowup).toISOString();
    } catch {
      nextFollowup = null;
    }
  }

  let deadline: string | null = payload.assignment_deadline || null;
  if (!deadline && payload.assignment_duration_days) {
    deadline = addDays(new Date(), parseInt(payload.assignment_duration_days, 10));
  } else if (!deadline) {
    deadline = addDays(new Date(), 7);
  } else {
    try {
      deadline = new Date(deadline).toISOString();
    } catch {
      deadline = addDays(new Date(), 7);
    }
  }

  const clean: Record<string, any> = {
    id,
    company_name: (payload.company_name || 'بدون نام').trim(),
    business_type: (payload.business_type || '').trim(),
    province: (payload.province || '').trim(),
    city: (payload.city || '').trim(),
    mobile_numbers: Array.isArray(payload.mobile_numbers)
      ? payload.mobile_numbers.filter(Boolean)
      : payload.mobile_numbers
      ? [payload.mobile_numbers]
      : [],
    landline_numbers: Array.isArray(payload.landline_numbers)
      ? payload.landline_numbers.filter(Boolean)
      : payload.landline_numbers
      ? [payload.landline_numbers]
      : [],
    telegram_phone: (payload.telegram_phone || '').trim(),
    telegram_ids: Array.isArray(payload.telegram_ids)
      ? payload.telegram_ids.filter(Boolean)
      : payload.telegram_ids
      ? [payload.telegram_ids]
      : [],
    instagram_ids: Array.isArray(payload.instagram_ids)
      ? payload.instagram_ids.filter(Boolean)
      : payload.instagram_ids
      ? [payload.instagram_ids]
      : [],
    emails: Array.isArray(payload.emails)
      ? payload.emails.filter(Boolean)
      : payload.emails
      ? [payload.emails]
      : [],
    websites: Array.isArray(payload.websites)
      ? payload.websites.filter(Boolean)
      : payload.websites
      ? [payload.websites]
      : [],
    is_ecommerce: Boolean(payload.is_ecommerce),
    manager_name: (payload.manager_name || '').trim(),
    manager_phones: Array.isArray(payload.manager_phones)
      ? payload.manager_phones.filter(Boolean)
      : payload.manager_phones
      ? [payload.manager_phones]
      : [],
    negotiator_name: (payload.negotiator_name || '').trim(),
    negotiator_phones: Array.isArray(payload.negotiator_phones)
      ? payload.negotiator_phones.filter(Boolean)
      : payload.negotiator_phones
      ? [payload.negotiator_phones]
      : [],
    interview_status: payload.interview_status || 'مصاحبه اولیه انجام شده',
    interview_report: (payload.interview_report || '').trim(),
    interview_score: Number(payload.interview_score) || 5,
    next_followup_date: nextFollowup,
    assigned_marketer_id: marketerId,
    assigned_marketer_name: (
      resolvedMarketerName ||
      payload.assigned_marketer_name ||
      'تخصیص نیافته'
    ).trim(),
    assignment_deadline: deadline,
    assignment_duration_days: payload.assignment_duration_days
      ? parseInt(payload.assignment_duration_days, 10)
      : 7,
    status: payload.status || 'تماس برقرار نشده',
    is_expired: Boolean(payload.is_expired),
    claimed_from_pool:
      payload.claimed_from_pool !== undefined ? Boolean(payload.claimed_from_pool) : false,
    claimed_from_pool_at: payload.claimed_from_pool_at || null,
    tenant_id: resolveDirectusTenantId(payload.tenant_id),
    date_created: payload.date_created || nowIso,
    date_updated: nowIso,
  };

  return clean;
}

export function extractCustomerContacts(payload: any, customerId: string): CustomerContact[] {
  const nowIso = new Date().toISOString();
  const list: CustomerContact[] = [];
  const seenContacts = new Set<string>();

  const appendContactSafe = (c: any, defaultType: string = 'mobile') => {
    if (!c || !c.value || !String(c.value).trim()) return;
    const val = String(c.value).trim();
    const chType = c.channel_type || defaultType;
    const norm = normalizeContactValue(val, chType);
    const key = `${chType}:${norm || val.toLowerCase()}`;
    if (seenContacts.has(key)) return;
    seenContacts.add(key);

    const isUuid =
      c.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c.id);
    list.push({
      id: isUuid ? c.id : crypto.randomUUID(),
      customer_id: customerId,
      channel_type: chType,
      value: val,
      normalized_value: norm,
      contact_name: (c.contact_name || '').trim(),
      contact_role: (c.contact_role || '').trim(),
      is_primary: Boolean(c.is_primary),
      notes: (c.notes || '').trim(),
      date_created: c.date_created || nowIso,
      date_updated: nowIso,
    });
  };

  if (Array.isArray(payload.contacts) && payload.contacts.length > 0) {
    for (const c of payload.contacts) {
      appendContactSafe(c, c.channel_type || 'mobile');
    }
  } else {
    const mobiles = Array.isArray(payload.mobile_numbers) ? payload.mobile_numbers : [];
    mobiles.forEach((m: string, idx: number) => {
      appendContactSafe(
        {
          value: String(m).trim(),
          channel_type: 'mobile',
          contact_name: payload.manager_name || 'مدیر',
          contact_role: idx === 0 ? 'موبایل اصلی' : 'موبایل دوم',
          is_primary: idx === 0,
        },
        'mobile'
      );
    });

    const landlines = Array.isArray(payload.landline_numbers) ? payload.landline_numbers : [];
    landlines.forEach((l: string) => {
      appendContactSafe(
        {
          value: String(l).trim(),
          channel_type: 'landline',
          contact_name: 'دفتر مرکزی',
          contact_role: 'تلفن ثابت',
          is_primary: false,
        },
        'landline'
      );
    });

    const telegrams = Array.isArray(payload.telegram_ids) ? payload.telegram_ids : [];
    telegrams.forEach((t: string) => {
      appendContactSafe(
        {
          value: String(t).trim(),
          channel_type: 'telegram',
          contact_name: 'اکانت تلگرام',
          contact_role: 'سوشال',
          is_primary: false,
        },
        'telegram'
      );
    });

    const instagrams = Array.isArray(payload.instagram_ids) ? payload.instagram_ids : [];
    instagrams.forEach((i: string) => {
      appendContactSafe(
        {
          value: String(i).trim(),
          channel_type: 'instagram',
          contact_name: 'پیج اینستاگرام',
          contact_role: 'سوشال',
          is_primary: false,
        },
        'instagram'
      );
    });

    const emails = Array.isArray(payload.emails) ? payload.emails : [];
    emails.forEach((em: string) => {
      appendContactSafe(
        {
          value: String(em).trim(),
          channel_type: 'email',
          contact_name: 'پست الکترونیک',
          contact_role: 'ایمیل',
          is_primary: false,
        },
        'email'
      );
    });
  }

  if (list.length > 0 && !list.some((c) => c.is_primary)) {
    list[0].is_primary = true;
  }

  return list;
}

export async function asyncCheckContactDuplicate(
  value: string,
  channelType?: string,
  currentCustomerId?: string
) {
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
          const custId =
            cust && typeof cust === 'object'
              ? cust.id
              : typeof cust === 'string'
              ? cust
              : null;

          if (
            currentCustomerId &&
            custId &&
            String(custId).toLowerCase() === String(currentCustomerId).toLowerCase()
          ) {
            continue;
          }

          if (custId) {
            if (typeof cust !== 'object' || !cust.company_name) {
              const fetched = await directusFetch(`/items/customers/${custId}`).catch(() => null);
              if (fetched && fetched.data) cust = fetched.data;
            }
            if (cust) {
              const expCust = computeCustomerExpiration(cust);
              const isContract = expCust.status === 'قرارداد';
              const isExpired = !!expCust.is_expired;
              const conflictType: 'active_marketer' | 'expired' | 'contract' = isContract
                ? 'contract'
                : isExpired
                ? 'expired'
                : 'active_marketer';

              let msg = '';
              if (conflictType === 'active_marketer') {
                msg = `این شماره/اکانت قبلاً برای مشتری «${expCust.company_name}» در اختیار بازاریاب «${expCust.assigned_marketer_name}» ثبت شده و مهلت واگذاری آن هنوز معتبر است.`;
              } else if (conflictType === 'contract') {
                msg = `این شماره متعلق به مشتری قطعی «${expCust.company_name}» با قرارداد رسمی است (بازاریاب: ${expCust.assigned_marketer_name}).`;
              } else {
                msg = `این شماره قبلاً برای مشتری «${expCust.company_name}» ثبت شده بود، اما مهلت بازاریاب (${expCust.assigned_marketer_name}) منقضی شده است و امکان واگذاری مجدد دارد.`;
              }

              return {
                isDuplicate: true,
                conflictType,
                matchedContact: item,
                matchedCustomer: {
                  id: expCust.id,
                  company_name: expCust.company_name,
                  assigned_marketer_name: expCust.assigned_marketer_name,
                  assigned_marketer_id: expCust.assigned_marketer_id,
                  assignment_deadline: expCust.assignment_deadline,
                  is_expired: isExpired,
                  status: expCust.status,
                },
                message: msg,
              };
            }
          }
        }
      }
      return null;
    } catch (e: any) {
      console.warn('Database duplicate check error:', e.message);
      return null;
    }
  }

  // Fallback to local memory store
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
  const isContract = matchedCustomer.status === 'قرارداد';
  const conflictType: 'active_marketer' | 'expired' | 'contract' = isContract
    ? 'contract'
    : isExpired
    ? 'expired'
    : 'active_marketer';

  let message = '';
  if (conflictType === 'active_marketer') {
    message = `این شماره/اکانت قبلاً برای مشتری «${matchedCustomer.company_name}» در اختیار بازاریاب «${matchedCustomer.assigned_marketer_name}» ثبت شده است و مهلت واگذاری آن هنوز معتبر است.`;
  } else if (conflictType === 'contract') {
    message = `این شماره متعلق به مشتری قطعی «${matchedCustomer.company_name}» با قرارداد رسمی است (بازاریاب: ${matchedCustomer.assigned_marketer_name}).`;
  } else {
    message = `این شماره قبلاً برای مشتری «${matchedCustomer.company_name}» ثبت شده بود، اما مهلت بازاریاب (${matchedCustomer.assigned_marketer_name}) منقضی شده است و امکان واگذاری مجدد دارد.`;
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
      status: matchedCustomer.status,
    },
    message,
  };
}
