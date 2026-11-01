import { URL } from 'url';
import dns from 'dns/promises';
import { lookup as dnsLookup } from 'dns';

const BLOCKED_HOSTNAMES = new Set([
  'localhost', '127.0.0.1', '::1', '0.0.0.0',
  'metadata.google.internal', '169.254.169.254',
  '169.254.170.2', 'fd00:ec2::1',
]);

const BLOCKED_CIDRS = [
  { start: '10.0.0.0', end: '10.255.255.255' },
  { start: '172.16.0.0', end: '172.31.255.255' },
  { start: '192.168.0.0', end: '192.168.255.255' },
  { start: '169.254.0.0', end: '169.254.255.255' },
  { start: '127.0.0.0', end: '127.255.255.255' },
  { start: '100.64.0.0', end: '100.127.255.255' },
  { start: '198.18.0.0', end: '198.19.255.255' },
  { start: '224.0.0.0', end: '239.255.255.255' },
  { start: '240.0.0.0', end: '255.255.255.255' },
  { start: '::1', end: '::1' },
  { start: 'fc00::', end: 'fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff' },
  { start: 'fe80::', end: 'febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff' },
];

function ipToNumber(ip: string): bigint | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let num = 0n;
  for (const p of parts) {
    const n = parseInt(p, 10);
    if (isNaN(n) || n < 0 || n > 255) return null;
    num = (num << 8n) | BigInt(n);
  }
  return num;
}

function isIpInCidr(ip: string, cidr: string): boolean {
  const [network, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr, 10);
  const ipNum = ipToNumber(ip);
  const netNum = ipToNumber(network);
  if (ipNum === null || netNum === null) return false;
  const mask = (0xFFFFFFFFn << BigInt(32 - prefix)) & 0xFFFFFFFFn;
  return (ipNum & mask) === (netNum & mask);
}

function isBlockedIp(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(lower)) return true;
  if (isIpInCidr(lower, '169.254.169.254/32')) return true;
  for (const cidr of [
    '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16',
    '127.0.0.0/8', '169.254.0.0/16', '100.64.0.0/10',
    '198.18.0.0/15', '224.0.0.0/4', '240.0.0.0/4',
    'fc00::/7', 'fe80::/10', '::1/128',
  ]) {
    if (isIpInCidr(lower, cidr)) return true;
  }
  return false;
}

export interface UrlValidationResult {
  valid: boolean;
  normalizedUrl?: string;
  hostname?: string;
  error?: string;
  resolvedIps?: string[];
}

export async function validateUrl(rawUrl: string): Promise<UrlValidationResult> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'Only HTTP and HTTPS URLs are permitted' };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname) return { valid: false, error: 'Missing hostname' };

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { valid: false, error: `Hostname '${hostname}' is blocked (SSRF protection)` };
  }

  if (isIpInCidr(hostname, '127.0.0.0/8') || isIpInCidr(hostname, '::1/128') ||
      isIpInCidr(hostname, '10.0.0.0/8') || isIpInCidr(hostname, '172.16.0.0/12') ||
      isIpInCidr(hostname, '192.168.0.0/16') || isIpInCidr(hostname, '169.254.0.0/16') ||
      isIpInCidr(hostname, 'fc00::/7') || isIpInCidr(hostname, 'fe80::/10')) {
    return { valid: false, error: `IP address '${hostname}' is blocked (SSRF protection)` };
  }

  // Resolve DNS and validate resolved IPs
  try {
    const addresses = await dns.resolve4(hostname).catch(() => [] as string[]);
    const addresses6 = await dns.resolve6(hostname).catch(() => [] as string[]);
    const allAddresses = [...addresses, ...addresses6];
    const blockedIps = allAddresses.filter(a => isBlockedIp(a));
    if (blockedIps.length > 0) {
      return {
        valid: false,
        error: `Resolved IP(s) ${blockedIps.join(', ')} are blocked (SSRF protection)`,
        resolvedIps: allAddresses,
      };
    }
    return {
      valid: true,
      normalizedUrl: parsed.toString(),
      hostname,
      resolvedIps: allAddresses,
    };
  } catch (err: any) {
    return { valid: false, error: `DNS resolution failed: ${err.message}` };
  }
}

export async function validateUrlAfterRedirect(rawUrl: string): Promise<UrlValidationResult> {
  return validateUrl(rawUrl);
}

export function isUrlAllowed(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTNAMES.has(hostname)) return false;
    if (isIpInCidr(hostname, '127.0.0.0/8') || isIpInCidr(hostname, '::1/128') ||
        isIpInCidr(hostname, '10.0.0.0/8') || isIpInCidr(hostname, '172.16.0.0/12') ||
        isIpInCidr(hostname, '192.168.0.0/16') || isIpInCidr(hostname, '169.254.0.0/16') ||
        isIpInCidr(hostname, 'fc00::/7') || isIpInCidr(hostname, 'fe80::/10')) return false;
    return true;
  } catch {
    return false;
  }
}
