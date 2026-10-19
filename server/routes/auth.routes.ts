import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import {
  directusUrl,
  directusAdminToken,
  personnelData,
  DIRECTUS_ADMIN_ROLE_ID,
  DIRECTUS_ADMIN_ROLE_IDS,
  DIRECTUS_STAFF_ROLE_ID,
  projectSettingsData,
  setGlobalSessionRevocationTimestamp,
} from '../config.ts';
import { directusFetch } from '../directus/client.ts';
import {
  formatAvatarUrl,
  getRequestUser,
} from '../middlewares/auth.middleware.ts';
import { sendIppanelSmsPattern, sendTenantAdminsSmsPattern } from '../services/sms.service.ts';
import { enrichPersonnel } from './personnel.routes.ts';

const router = Router();

// Proxy for directus assets/avatars
router.get('/assets/:id', async (req: Request, res: Response) => {
  const assetId = req.params.id;
  if (directusUrl) {
    try {
      const assetUrl = `${directusUrl.replace(/\/$/, '')}/assets/${assetId}`;
      const headers: Record<string, string> = {};
      if (directusAdminToken) {
        headers['Authorization'] = `Bearer ${directusAdminToken}`;
      }
      const fetchRes = await fetch(assetUrl, { headers });
      if (fetchRes.ok) {
        const contentType = fetchRes.headers.get('content-type') || 'image/jpeg';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        const buffer = Buffer.from(await fetchRes.arrayBuffer());
        return res.send(buffer);
      }
    } catch (e: any) {
      console.warn('Asset proxy error:', e.message);
    }
  }
  return res.status(404).send('Asset not found');
});

router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name, phone, first_name, last_name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'ایمیل و کلمه عبور الزامی هستند.' });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ error: 'کلمه عبور باید حداقل ۶ کاراکتر باشد.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const fullName =
    (name || `${first_name || ''} ${last_name || ''}`).trim() || cleanEmail.split('@')[0];
  const fName = (first_name || fullName.split(' ')[0] || 'کاربر').trim();
  const lName = (last_name || fullName.split(' ').slice(1).join(' ') || 'جدید').trim();
  const cleanPhone = (phone || '').trim();

  if (directusUrl && directusAdminToken) {
    try {
      const existingRes = await directusFetch(
        `/users?filter[email][_eq]=${encodeURIComponent(cleanEmail)}`
      );
      if (existingRes && Array.isArray(existingRes.data) && existingRes.data.length > 0) {
        return res.status(400).json({ error: 'این ایمیل قبلاً در سامانه ثبت شده است. لطفاً وارد شوید.' });
      }

      const newUserPayload = {
        email: cleanEmail,
        password: String(password),
        first_name: fName,
        last_name: lName,
        role: DIRECTUS_STAFF_ROLE_ID,
        status: 'active',
      };

      const createdUserRes = await directusFetch('/users', {
        method: 'POST',
        body: JSON.stringify(newUserPayload),
      });
      const createdUser = createdUserRes.data;

      const cleanUsername = String(req.body.username || '').trim() || cleanEmail.split('@')[0];
      const personnelId = crypto.randomUUID();
      const personnelPayload = {
        id: personnelId,
        name: fullName,
        username: cleanUsername,
        email: cleanEmail,
        phone: cleanPhone,
        role: 'marketer',
        status: 'active',
        user_id: createdUser.id,
      };

      await directusFetch('/items/personnel', {
        method: 'POST',
        body: JSON.stringify(personnelPayload),
      }).catch(async () => {
        const existP = await directusFetch(
          `/items/personnel?filter[email][_eq]=${encodeURIComponent(cleanEmail)}`
        ).catch(() => null);
        if (existP?.data && Array.isArray(existP.data) && existP.data.length > 0) {
          await directusFetch(`/items/personnel/${existP.data[0].id}`, {
            method: 'PATCH',
            body: JSON.stringify({ user_id: createdUser.id }),
          }).catch(() => {});
        }
      });

      const pObj = {
        id: personnelId,
        name: fullName,
        username: cleanUsername,
        role: 'marketer',
        email: cleanEmail,
        phone: cleanPhone,
        status: 'active',
        active: true,
        user_id: createdUser.id,
      };
      personnelData.push(pObj);

      return res.status(201).json({
        success: true,
        message: 'ثبت‌نام با موفقیت انجام شد. اکنون می‌توانید وارد حساب خود شوید.',
        user: {
          id: createdUser.id,
          email: createdUser.email,
          first_name: createdUser.first_name,
          last_name: createdUser.last_name,
        },
        personnel: pObj,
      });
    } catch (err: any) {
      return res.status(400).json({
        error: `خطا در ثبت‌نام کاربر در پایگاه داده: ${err.message || 'مشکل در برقراری ارتباط'}`,
      });
    }
  }

  const existingLocal = personnelData.find((p) => p.email?.toLowerCase() === cleanEmail);
  if (existingLocal) {
    return res.status(400).json({ error: 'این ایمیل قبلاً ثبت شده است.' });
  }

  const newId = 'p-' + Date.now();
  const cleanUsername = String(req.body.username || '').trim() || cleanEmail.split('@')[0];
  const newP = {
    id: newId,
    name: fullName,
    username: cleanUsername,
    role: 'marketer',
    email: cleanEmail,
    phone: cleanPhone,
    status: 'active',
    active: true,
  };
  personnelData.push(newP);

  res.status(201).json({
    success: true,
    message: 'ثبت‌نام با موفقیت انجام شد.',
    user: { id: newId, email: cleanEmail, name: fullName },
    personnel: newP,
  });
});

router.post('/login', async (req: Request, res: Response) => {
  const { email, username, phone, password } = req.body;
  const rawIdentifier = (email || username || phone || '').trim();

  if (!rawIdentifier || !password) {
    return res.status(400).json({ error: 'ایمیل/نام کاربری/شماره موبایل و کلمه عبور الزامی است.' });
  }

  const cleanIdentifier = rawIdentifier.toLowerCase();

  if (directusUrl && directusAdminToken) {
    try {
      let directusUserEmail = cleanIdentifier;

      if (!cleanIdentifier.includes('@')) {
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

      const loginRes = await directusFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: directusUserEmail, password }),
      });

      if (loginRes?.data?.access_token) {
        const accessToken = loginRes.data.access_token;

        const meRes = await directusFetch('/users/me?fields=id,email,first_name,last_name,role,avatar', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        const meUser = meRes.data;
        const uRole = meUser.role;
        const isAdmin = DIRECTUS_ADMIN_ROLE_IDS.includes(uRole);

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
          const cleanPName =
            `${meUser.first_name || ''} ${meUser.last_name || ''}`.trim() || meUser.email;
          const newPId = crypto.randomUUID();
          const newPersonnelPayload = {
            id: newPId,
            name: cleanPName,
            username: meUser.email.split('@')[0],
            email: meUser.email,
            phone: '',
            role: isAdmin ? 'admin' : 'marketer',
            status: 'active',
            user_id: meUser.id,
          };

          const createdPRes = await directusFetch('/items/personnel', {
            method: 'POST',
            body: JSON.stringify(newPersonnelPayload),
          }).catch(() => null);

          pItem = createdPRes?.data || newPersonnelPayload;
        }

        pItem = enrichPersonnel(pItem);

        let avatarUrl = formatAvatarUrl(meUser.avatar || pItem?.avatar);

        if (projectSettingsData.login_pattern) {
          const uPhone = pItem?.phone || '';
          const fullName = pItem?.name || meUser.email;
          const parts = fullName.split(' ');
          const fName = parts[0] || 'همکار';
          const lName = parts.length > 1 ? parts.slice(1).join(' ') : 'گرامی';
          const now = new Date();

          const loginVars = {
            name: fName,
            family: lName,
            fullName: fullName,
            mobile: uPhone || 'نامشخص',
            phone: uPhone || 'نامشخص',
            date: now.toLocaleDateString('fa-IR'),
            time: now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
            ip: (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1',
            device: req.headers['user-agent'] ? 'مرورگر وب' : 'سامانه وب',
            username: meUser.email,
          };

          if (uPhone) {
            sendIppanelSmsPattern(uPhone, projectSettingsData.login_pattern, loginVars).catch(
              (e) => console.warn('Login SMS pattern send to user warning:', e.message)
            );
          }

          sendTenantAdminsSmsPattern(
            pItem?.tenant_id || 'default',
            projectSettingsData.login_pattern,
            loginVars
          ).catch((e) => console.warn('Login SMS pattern send to admin warning:', e.message));
        }

        return res.json({
          success: true,
          access_token: accessToken,
          refresh_token: loginRes.data.refresh_token,
          user: {
            id: meUser.id,
            email: meUser.email,
            name: `${meUser.first_name || ''} ${meUser.last_name || ''}`.trim() || meUser.email,
            role_id: uRole,
            avatar: avatarUrl,
            is_admin: isAdmin,
            app_role: pItem?.role || (isAdmin ? 'admin' : 'marketer'),
          },
          personnel_id: pItem?.id,
          personnel: pItem,
        });
      }
    } catch (err: any) {
      console.warn('Directus auth login failed, trying local fallback:', err.message);
    }
  }

  const found = personnelData.find(
    (p) =>
      (p.email && p.email.toLowerCase() === cleanIdentifier) ||
      (p.username && p.username.toLowerCase() === cleanIdentifier) ||
      (p.phone && p.phone.replace(/[\s\-_()]/g, '') === cleanIdentifier.replace(/[\s\-_()]/g, ''))
  );

  if (found) {
    if (projectSettingsData.login_pattern) {
      const uPhone = found.phone || '';
      const fullName = found.name || found.email;
      const parts = fullName.split(' ');
      const fName = parts[0] || 'همکار';
      const lName = parts.length > 1 ? parts.slice(1).join(' ') : 'گرامی';
      const now = new Date();

      const loginVars = {
        name: fName,
        family: lName,
        fullName: fullName,
        mobile: uPhone || 'نامشخص',
        phone: uPhone || 'نامشخص',
        date: now.toLocaleDateString('fa-IR'),
        time: now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        ip: (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1',
        device: 'سامانه وب آلفادسک',
        username: found.username || found.email,
      };

      if (uPhone) {
        sendIppanelSmsPattern(uPhone, projectSettingsData.login_pattern, loginVars).catch(
          (e) => console.warn('Login SMS pattern send to user warning:', e.message)
        );
      }

      sendTenantAdminsSmsPattern(
        found.tenant_id || 'default',
        projectSettingsData.login_pattern,
        loginVars
      ).catch((e) => console.warn('Login SMS pattern send to admin warning:', e.message));
    }

    return res.json({
      success: true,
      access_token: 'local-token-' + found.id,
      user: {
        id: found.id,
        email: found.email,
        username: found.username,
        name: found.name,
        role_id: found.role === 'admin' ? DIRECTUS_ADMIN_ROLE_ID : DIRECTUS_STAFF_ROLE_ID,
        is_admin: found.role === 'admin',
        app_role: found.role,
      },
      personnel: found,
    });
  }

  res.status(401).json({ error: 'کاربری با این مشخصات یافت نشد.' });
});

router.get('/me', async (req: Request, res: Response) => {
  const { userId, personnelId, userRole, isAdmin, userName, userEmail, isSessionRevoked } =
    getRequestUser(req);
  if (isSessionRevoked || (!userId && !personnelId && !userEmail)) {
    return res.status(401).json({
      error: 'ALL_SESSIONS_REVOKED',
      message:
        'نشست‌های کاری تمامی کاربران توسط مدیریت لغو شده است. لطفاً مجدداً وارد شوید.',
    });
  }

  let avatarUrl: string | undefined = undefined;
  let pItem: any = null;

  if (directusUrl && directusAdminToken) {
    try {
      if (userId) {
        const uRes = await directusFetch(
          `/users/${userId}?fields=id,email,avatar,first_name,last_name`
        );
        if (uRes?.data?.avatar) {
          avatarUrl = formatAvatarUrl(uRes.data.avatar);
        }
      }
      if (personnelId) {
        const pRes = await directusFetch(`/items/personnel/${personnelId}`);
        if (pRes?.data) pItem = pRes.data;
      }
    } catch {}
  }

  if (!pItem) {
    pItem = personnelData.find(
      (p) =>
        (personnelId && p.id === personnelId) ||
        (userId && p.user_id === userId) ||
        (userEmail && p.email?.toLowerCase() === userEmail?.toLowerCase())
    );
  }

  if (pItem) {
    pItem = enrichPersonnel(pItem);
    if (!avatarUrl && pItem.avatar) avatarUrl = pItem.avatar;
  }

  res.json({
    user: {
      id: userId || personnelId,
      name: userName || pItem?.name || 'کاربر سامانه',
      email: userEmail || pItem?.email,
      avatar: avatarUrl,
      is_admin: isAdmin,
      app_role: userRole,
    },
    personnel_id: personnelId || pItem?.id,
    personnel: pItem,
  });
});

router.post('/change-password', async (req: Request, res: Response) => {
  const { current_password, new_password } = req.body;
  const { userId } = getRequestUser(req);

  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد.' });
  }

  if (directusUrl && directusAdminToken && userId) {
    try {
      await directusFetch(`/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ password: new_password }),
      });
      return res.json({ success: true, message: 'رمز عبور با موفقیت تغییر یافت.' });
    } catch (err: any) {
      return res.status(500).json({ error: `خطا در تغییر رمز عبور: ${err.message}` });
    }
  }

  res.json({ success: true, message: 'رمز عبور با موفقیت تغییر یافت.' });
});

router.post('/logout-all', async (req: Request, res: Response) => {
  const { isAdmin } = getRequestUser(req);
  if (!isAdmin) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'فقط مدیر ارشد سیستم مجاز به خروج همگانی کاربران است.',
    });
  }

  const revTs = Date.now();
  setGlobalSessionRevocationTimestamp(revTs);

  return res.json({
    success: true,
    revocationTimestamp: revTs,
    message:
      'تمامی نشست‌های کاری فعال در سامانه با موفقیت لغو شدند و تمامی کاربران لاگین‌شده خارج گردیدند.',
  });
});

export default router;
