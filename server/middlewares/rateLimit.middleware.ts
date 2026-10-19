import { Request, Response, NextFunction } from 'express';

const rateLimitWindowMs = 60 * 1000; // 1 minute
const maxRequestsPerWindow = 300;

interface ClientRateRecord {
  count: number;
  resetTime: number;
}

const clientRecords = new Map<string, ClientRateRecord>();

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  // Skip rate limiting for static assets or dev middleware
  if (!req.path.startsWith('/api')) {
    return next();
  }

  const clientIp = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
  const ipKey = Array.isArray(clientIp) ? clientIp[0] : clientIp;
  const now = Date.now();

  const record = clientRecords.get(ipKey);

  if (!record || now > record.resetTime) {
    clientRecords.set(ipKey, {
      count: 1,
      resetTime: now + rateLimitWindowMs,
    });
    return next();
  }

  record.count += 1;

  if (record.count > maxRequestsPerWindow) {
    return res.status(429).json({
      error: 'TOO_MANY_REQUESTS',
      message: 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً چند لحظه دیگر دوباره تلاش کنید.',
    });
  }

  next();
}
