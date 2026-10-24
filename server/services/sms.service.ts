import {
  directusUrl,
  directusAdminToken,
  personnelData,
  projectSettingsData,
  updateProjectSettingsData,
  tenantSettingsMap,
} from '../config.ts';
import { directusFetch } from '../directus/client.ts';

/**
 * Resolves the full name of a user directly from the `personnel` collection (`name` field).
 * Searches local synchronized personnelData and queries Directus personnel collection if needed.
 */
export async function getPersonnelFullName(
  identifier?: string | null,
  fallback?: string
): Promise<{ fullName: string; phone?: string; id?: string }> {
  const clean = identifier ? String(identifier).trim() : '';
  const searchFallback = fallback ? String(fallback).trim() : '';

  // 1. Check in-memory synchronized personnelData
  if (clean) {
    const cleanLower = clean.toLowerCase();
    const rawUid = cleanLower.replace(/^p-/, '');
    const cleanDigits = clean.replace(/\D/g, '');

    const pLocal = personnelData.find((p) => {
      if (!p) return false;
      const pid = p.id ? String(p.id).toLowerCase() : '';
      const puid = (p as any).user_id ? String((p as any).user_id).toLowerCase() : '';
      const pemail = p.email ? String(p.email).toLowerCase() : '';
      const puname = (p as any).username ? String((p as any).username).toLowerCase() : '';
      const pphone = p.phone ? String(p.phone).replace(/\D/g, '') : '';

      return (
        pid === cleanLower ||
        (rawUid && (pid === rawUid || pid === `p-${rawUid}`)) ||
        puid === cleanLower ||
        pemail === cleanLower ||
        puname === cleanLower ||
        (cleanDigits.length >= 7 && pphone && (pphone === cleanDigits || pphone.endsWith(cleanDigits))) ||
        (p.name && p.name.trim().toLowerCase() === cleanLower)
      );
    });

    if (pLocal && pLocal.name && pLocal.name.trim()) {
      return {
        fullName: pLocal.name.trim(),
        phone: pLocal.phone,
        id: pLocal.id,
      };
    }
  }

  // Also check fallback in local personnelData
  if (searchFallback) {
    const pNameLocal = personnelData.find(
      (p) => p && p.name && p.name.trim().toLowerCase() === searchFallback.toLowerCase()
    );
    if (pNameLocal && pNameLocal.name && pNameLocal.name.trim()) {
      return {
        fullName: pNameLocal.name.trim(),
        phone: pNameLocal.phone,
        id: pNameLocal.id,
      };
    }
  }

  // 2. Query Directus personnel collection directly if connected
  if (directusUrl && directusAdminToken) {
    try {
      if (clean) {
        const cleanDigits = clean.replace(/\D/g, '');
        const queryParts = [
          `filter[_or][0][id][_eq]=${encodeURIComponent(clean)}`,
          `filter[_or][1][user_id][_eq]=${encodeURIComponent(clean)}`,
          `filter[_or][2][email][_ieq]=${encodeURIComponent(clean)}`,
          `filter[_or][3][username][_ieq]=${encodeURIComponent(clean)}`,
          `filter[_or][4][name][_ieq]=${encodeURIComponent(clean)}`,
        ];
        if (cleanDigits.length >= 7) {
          queryParts.push(`filter[_or][5][phone][_icontains]=${encodeURIComponent(cleanDigits)}`);
        }

        const dRes = await directusFetch(`/items/personnel?${queryParts.join('&')}&limit=1`).catch(() => null);
        if (dRes?.data && Array.isArray(dRes.data) && dRes.data.length > 0) {
          const item = dRes.data[0];
          if (item?.name && item.name.trim()) {
            return {
              fullName: item.name.trim(),
              phone: item.phone,
              id: String(item.id),
            };
          }
        }
      }

      if (searchFallback && searchFallback.length > 2) {
        const dNameRes = await directusFetch(
          `/items/personnel?filter[name][_ieq]=${encodeURIComponent(searchFallback)}&limit=1`
        ).catch(() => null);
        if (dNameRes?.data && Array.isArray(dNameRes.data) && dNameRes.data.length > 0) {
          const item = dNameRes.data[0];
          if (item?.name && item.name.trim()) {
            return {
              fullName: item.name.trim(),
              phone: item.phone,
              id: String(item.id),
            };
          }
        }
      }
    } catch (err: any) {
      console.warn('[IPPanel SMS] Directus personnel lookup warning:', err.message);
    }
  }

  // Fallback to provided name or default
  return {
    fullName: searchFallback || clean || 'همکار گرامی',
  };
}

export function getPatternTextForCode(code: string | null | undefined): string {
  if (!code) return '';
  const c = String(code).trim();
  if (projectSettingsData.login_pattern?.trim() === c) return projectSettingsData.login_pattern_text || '';
  if (projectSettingsData.dayli_leave_request_pattern?.trim() === c) return projectSettingsData.dayli_leave_request_text || '';
  if (projectSettingsData.hourly_leave_request_pattern?.trim() === c) return projectSettingsData.hourly_leave_request_text || '';
  if (projectSettingsData.dayli_leave_accept_pattern?.trim() === c) return projectSettingsData.dayli_leave_accept_text || '';
  if (projectSettingsData.dayli_leave_reject_pattern?.trim() === c) return projectSettingsData.dayli_leave_reject_text || '';
  if (projectSettingsData.hourly_leave_accept_pattern?.trim() === c) return projectSettingsData.hourly_leave_accept_text || '';
  if (projectSettingsData.hourly_leave_reject_pattern?.trim() === c) return projectSettingsData.hourly_leave_reject_text || '';
  if (projectSettingsData.addvance_request_pattern?.trim() === c) return projectSettingsData.addvance_request_text || '';
  if (projectSettingsData.addvance_accept_pattern?.trim() === c) return projectSettingsData.addvance_accept_text || '';
  if (projectSettingsData.lower_addvance_accept_pattern?.trim() === c) return projectSettingsData.lower_addvance_accept_text || '';
  if (projectSettingsData.addvance_reject_pattern?.trim() === c) return projectSettingsData.addvance_reject_text || '';
  return '';
}

export function resolvePatternVariables(
  patternCode: string,
  recipientPhone: string,
  variables: Record<string, string | number> = {}
): Record<string, string> {
  const patternText = getPatternTextForCode(patternCode);
  const cleanVars: Record<string, string> = {};

  for (const [k, v] of Object.entries(variables || {})) {
    if (k && String(k).trim()) {
      cleanVars[String(k).trim()] = v !== null && v !== undefined ? String(v).trim() : '';
    }
  }

  const foundPlaceholders = new Set<string>();
  if (patternText) {
    const pPercent = patternText.match(/%([a-zA-Z0-9_]+)%/g);
    if (pPercent) {
      for (const m of pPercent) {
        foundPlaceholders.add(m.replace(/%/g, '').trim());
      }
    }
    const pBraces = patternText.match(/\{([a-zA-Z0-9_]+)\}/g);
    if (pBraces) {
      for (const m of pBraces) {
        foundPlaceholders.add(m.replace(/[{}]/g, '').trim());
      }
    }
  }

  const now = new Date();
  const jalaliDate = now.toLocaleDateString('fa-IR');
  const jalaliTime = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

  for (const ph of foundPlaceholders) {
    if (cleanVars[ph] !== undefined && cleanVars[ph] !== '') continue;

    const lower = ph.toLowerCase();
    if (lower === 'mobile' || lower === 'phone') {
      cleanVars[ph] = cleanVars.mobile || cleanVars.phone || recipientPhone || '09120000000';
    } else if (
      lower === 'name' ||
      lower === 'fullname' ||
      lower === 'full_name' ||
      lower === 'user_name' ||
      lower === 'personnel_name' ||
      lower === 'marketer_name' ||
      lower === 'applicant_name' ||
      lower === 'person' ||
      lower === 'user'
    ) {
      cleanVars[ph] =
        cleanVars.name ||
        cleanVars.fullName ||
        cleanVars.full_name ||
        cleanVars.user_name ||
        cleanVars.personnel_name ||
        cleanVars.applicant_name ||
        'همکار گرامی';
    } else if (lower === 'family' || lower === 'last_name') {
      const fullName =
        cleanVars.family ||
        cleanVars.last_name ||
        cleanVars.fullName ||
        cleanVars.name ||
        'همکار گرامی';
      const parts = fullName.split(' ');
      cleanVars[ph] = parts.length > 1 ? parts.slice(1).join(' ') : 'گرامی';
    } else if (lower === 'first_name') {
      const fullName = cleanVars.first_name || cleanVars.fullName || cleanVars.name || 'همکار';
      const parts = fullName.split(' ');
      cleanVars[ph] = parts[0] || 'همکار';
    } else if (lower === 'date' || lower === 'request_date' || lower === 'approval_date') {
      cleanVars[ph] = cleanVars.date || cleanVars.request_date || cleanVars.approval_date || jalaliDate;
    } else if (lower === 'time') {
      cleanVars[ph] = cleanVars.time || jalaliTime;
    } else if (lower === 'ip') {
      cleanVars[ph] = cleanVars.ip || '127.0.0.1';
    } else if (lower === 'device') {
      cleanVars[ph] = cleanVars.device || 'سامانه وب آلفادسک';
    } else if (lower === 'leave_type') {
      cleanVars[ph] = cleanVars.leave_type || 'مرخصی';
    } else if (lower === 'leave_date') {
      cleanVars[ph] = cleanVars.leave_date || cleanVars.start_date || cleanVars.date || jalaliDate;
    } else if (lower === 'from_time') {
      cleanVars[ph] = cleanVars.from_time || cleanVars.start_time || '09:00';
    } else if (lower === 'to_time') {
      cleanVars[ph] = cleanVars.to_time || cleanVars.end_time || '17:00';
    } else if (lower === 'start_time') {
      cleanVars[ph] = cleanVars.start_time || cleanVars.from_time || '09:00';
    } else if (lower === 'end_time') {
      cleanVars[ph] = cleanVars.end_time || cleanVars.to_time || '17:00';
    } else if (lower === 'start_date') {
      cleanVars[ph] = cleanVars.start_date || cleanVars.leave_date || jalaliDate;
    } else if (lower === 'end_date') {
      cleanVars[ph] = cleanVars.end_date || cleanVars.start_date || jalaliDate;
    } else if (lower === 'amount' || lower === 'requested_amount' || lower === 'approved_amount') {
      cleanVars[ph] =
        cleanVars[ph] ||
        cleanVars.amount ||
        cleanVars.requested_amount ||
        cleanVars.approved_amount ||
        '0';
    } else if (lower === 'reason') {
      cleanVars[ph] = cleanVars.reason || '-';
    } else if (lower === 'manager_note') {
      cleanVars[ph] = cleanVars.manager_note || 'بررسی شد';
    } else if (lower === 'reviewed_by') {
      cleanVars[ph] = cleanVars.reviewed_by || 'مدیریت';
    } else if (lower === 'username') {
      cleanVars[ph] = cleanVars.username || '-';
    } else {
      cleanVars[ph] = cleanVars[ph] || '-';
    }
  }

  return cleanVars;
}

export async function sendIppanelSmsPattern(
  recipientPhone: string | null | undefined,
  patternCode: string | null | undefined,
  variables: Record<string, string | number> = {},
  overrideApiKey?: string,
  overrideSender?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (
    (!projectSettingsData.ippanel_api || !projectSettingsData.ippanel_api.trim()) &&
    directusUrl &&
    directusAdminToken
  ) {
    try {
      const resp = await directusFetch('/items/project_settings').catch(() => null);
      if (resp?.data) {
        const item = Array.isArray(resp.data) ? resp.data[0] : resp.data;
        if (item) {
          updateProjectSettingsData(item);
        }
      }
    } catch {}
  }

  const rawKey = (overrideApiKey || projectSettingsData.ippanel_api || '').trim();
  if (!rawKey || !patternCode || !recipientPhone) {
    return { success: false, error: 'کلید API سامانه پیامک، کد پترن یا شماره تلفن گیرنده وارد نشده است.' };
  }

  const cleanApiKey = rawKey.replace(/^(Bearer|AccessKey)\s+/i, '').trim();

  let cleanPhone = String(recipientPhone).replace(/[\s\-_()]/g, '').trim();
  cleanPhone = cleanPhone.replace(/^(\+98|0098)/, '0');
  if (/^9\d{9}$/.test(cleanPhone)) {
    cleanPhone = '0' + cleanPhone;
  }

  if (!/^09\d{9}$/.test(cleanPhone)) {
    console.warn(`[IPPanel SMS] Skipped invalid phone number: ${recipientPhone}`);
    return { success: false, error: 'شماره تلفن گیرنده نامعتبر است (فرمت مجاز: 09xxxxxxxxx)' };
  }

  const senderLine = (
    overrideSender ||
    projectSettingsData.ippanel_sender ||
    projectSettingsData.ippanel_line_number ||
    '90001356'
  ).trim();
  const senderWithoutPlus = senderLine.replace(/^\+/, '');
  const cleanPhoneE164 = cleanPhone.startsWith('0')
    ? '+98' + cleanPhone.substring(1)
    : cleanPhone.startsWith('+98')
    ? cleanPhone
    : '+98' + cleanPhone;
  const cleanPhone98 = cleanPhone.startsWith('0') ? '98' + cleanPhone.substring(1) : cleanPhone;

  const cleanVars = resolvePatternVariables(patternCode.trim(), cleanPhone, variables);

  const restPayload98 = {
    pattern_code: patternCode.trim(),
    originator: senderLine,
    recipient: cleanPhone98,
    values: cleanVars,
  };

  const restPayload09 = {
    pattern_code: patternCode.trim(),
    originator: senderLine,
    recipient: cleanPhone,
    values: cleanVars,
  };

  const restPayloadAltSender = {
    pattern_code: patternCode.trim(),
    originator: senderWithoutPlus,
    recipient: cleanPhone98,
    values: cleanVars,
  };

  const api2Payload = {
    code: patternCode.trim(),
    sender: senderLine,
    recipient: cleanPhone,
    variable: cleanVars,
  };

  const edgePayload = {
    sending_type: 'pattern',
    from_number: senderLine,
    code: patternCode.trim(),
    recipients: [cleanPhoneE164],
    params: cleanVars,
  };

  console.log(
    `[IPPanel SMS] Sending pattern '${patternCode}' to ${cleanPhone} (sender: ${senderLine}) with variables:`,
    cleanVars
  );

  const attempts: Array<{
    url: string;
    headers: Record<string, string>;
    body: string;
    label: string;
  }> = [
    {
      url: 'https://rest.ippanel.com/v1/messages/patterns/send',
      headers: {
        'Content-Type': 'application/json',
        apikey: cleanApiKey,
      },
      body: JSON.stringify(restPayload98),
      label: 'rest.ippanel.com (apikey, 989...)',
    },
    {
      url: 'https://rest.ippanel.com/v1/messages/patterns/send',
      headers: {
        'Content-Type': 'application/json',
        apikey: cleanApiKey,
      },
      body: JSON.stringify(restPayload09),
      label: 'rest.ippanel.com (apikey, 09...)',
    },
    {
      url: 'https://rest.ippanel.com/v1/messages/patterns/send',
      headers: {
        'Content-Type': 'application/json',
        apikey: cleanApiKey,
      },
      body: JSON.stringify(restPayloadAltSender),
      label: 'rest.ippanel.com (alt sender)',
    },
    {
      url: 'https://api2.ippanel.com/api/v1/sms/pattern/normal/send',
      headers: {
        'Content-Type': 'application/json',
        apikey: cleanApiKey,
      },
      body: JSON.stringify(api2Payload),
      label: 'api2.ippanel.com (apikey)',
    },
    {
      url: 'https://api2.ippanel.com/api/v1/sms/pattern/normal/send',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `AccessKey ${cleanApiKey}`,
      },
      body: JSON.stringify(api2Payload),
      label: 'api2.ippanel.com (AccessKey)',
    },
    {
      url: 'https://edge.ippanel.com/v1/api/send',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `AccessKey ${cleanApiKey}`,
      },
      body: JSON.stringify(edgePayload),
      label: 'edge.ippanel.com (AccessKey)',
    },
    {
      url: 'https://edge.ippanel.com/v1/api/send',
      headers: {
        'Content-Type': 'application/json',
        apikey: cleanApiKey,
      },
      body: JSON.stringify(edgePayload),
      label: 'edge.ippanel.com (apikey)',
    },
    {
      url: 'https://ippanel.com/api/v1/sms/pattern/normal/send',
      headers: {
        'Content-Type': 'application/json',
        apikey: cleanApiKey,
      },
      body: JSON.stringify(api2Payload),
      label: 'ippanel.com (apikey)',
    },
    {
      url: 'https://rest.ippanel.com/v1/messages/patterns/send',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `AccessKey ${cleanApiKey}`,
      },
      body: JSON.stringify(restPayload98),
      label: 'rest.ippanel.com (AccessKey)',
    },
  ];

  let lastError = '';

  for (const attempt of attempts) {
    try {
      const res = await fetch(attempt.url, {
        method: 'POST',
        headers: attempt.headers,
        body: attempt.body,
      });

      if (res.ok) {
        const json: any = await res.json().catch(() => ({}));
        console.log(`[IPPanel SMS] Successfully sent via ${attempt.label}:`, json);
        return {
          success: true,
          messageId: String(json?.data || json?.bulk_id || json?.message_id || json?.id || 'OK'),
        };
      } else {
        const errBody = await res.text().catch(() => '');
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
          if (res.status === 502 && (errBody.includes('ArvanCloud') || errBody.includes('502'))) {
            detailedMsg =
              'درگاه IPPanel به دلیل محدودیت شبکه (Geo-IP) به درخواست‌های خارج از کشور پاسخ نمی‌دهد (خطای 502 سرور میانی). پس از دیپلوی روی سرور ایران پیامک با موفقیت ارسال خواهد شد.';
          }
        }

        lastError = detailedMsg || `HTTP ${res.status}`;

        if (
          detailedMsg.includes('اعتبار') ||
          detailedMsg.includes('balance') ||
          detailedMsg.includes('credit')
        ) {
          break;
        }
      }
    } catch (fetchErr: any) {
      lastError = `[${attempt.label}] Network error: ${fetchErr.message}`;
      console.warn(`[IPPanel SMS] Network error connecting to ${attempt.label}:`, fetchErr.message);
    }
  }

  return { success: false, error: lastError || 'خطا در برقراری ارتباط با درگاه IPPanel' };
}

export async function sendTenantAdminsSmsPattern(
  tenantId: string | number | null | undefined,
  patternCode: string | null | undefined,
  variables: Record<string, string | number> = {}
) {
  if (!patternCode) return;
  const tIdStr = tenantId !== undefined && tenantId !== null ? String(tenantId).trim() : 'default';

  const collectedPhones = new Set<string>();

  if (directusUrl && directusAdminToken) {
    try {
      let res = await directusFetch(
        `/items/tenant_settings?filter[tenant_id][_eq]=${encodeURIComponent(tIdStr)}`
      ).catch(() => null);
      if (!res?.data || (Array.isArray(res.data) && res.data.length === 0)) {
        res = await directusFetch('/items/tenant_settings').catch(() => null);
      }
      if (res?.data) {
        const items = Array.isArray(res.data) ? res.data : [res.data];
        for (const item of items) {
          const raw = item?.sms_phones;
          if (Array.isArray(raw)) {
            raw.forEach((p: any) => p && collectedPhones.add(String(p).trim()));
          } else if (typeof raw === 'string') {
            raw.split(',').forEach((p: string) => p.trim() && collectedPhones.add(p.trim()));
          }
        }
      }
    } catch (err: any) {
      console.warn('[IPPanel SMS] Directus tenant_settings lookup warning:', err.message);
    }
  }

  for (const [, local] of tenantSettingsMap.entries()) {
    if (local?.sms_phones) {
      const pArr = Array.isArray(local.sms_phones)
        ? local.sms_phones
        : String(local.sms_phones).split(',');
      pArr.forEach((p) => p.trim() && collectedPhones.add(p.trim()));
    }
  }

  if (collectedPhones.size === 0) {
    console.warn('[IPPanel SMS] No admin phone numbers found in tenant_settings to send notification.');
    return;
  }

  console.log(
    `[IPPanel SMS] Notifying ${collectedPhones.size} tenant admins with pattern '${patternCode}'...`
  );
  for (const phone of collectedPhones) {
    sendIppanelSmsPattern(phone, patternCode, variables).catch((e) =>
      console.warn(`[IPPanel SMS] Failed to notify tenant admin ${phone}:`, e.message)
    );
  }
}
