import { randomBytes } from 'crypto';

export function generateKeyValue(): string {
  const segments = Array.from({ length: 4 }, () =>
    randomBytes(3).toString('hex').toUpperCase()
  );
  return `APOC-${segments.join('-')}`;
}

export function getKeyExpiry(hours = 12): string {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + hours);
  return expiry.toISOString();
}

export function isKeyValid(key: {
  is_active: boolean;
  is_used: boolean;
  expires_at: string;
}): boolean {
  return key.is_active && !key.is_used && new Date() < new Date(key.expires_at);
}
