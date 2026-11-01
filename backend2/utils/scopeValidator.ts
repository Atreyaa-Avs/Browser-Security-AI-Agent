import { URL } from 'url';

export interface ScopeOptions {
  allowSubdomains?: boolean;
  blockedExtensions?: string[];
  maxDepth?: number;
}

const DEFAULT_BLOCKED_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico',
  '.css', '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.mp3',
  '.avi', '.pdf', '.zip', '.tar', '.gz', '.dmg', '.exe'
];

export class ScopeValidator {
  private baseOrigin: string;
  private baseHostname: string;
  private options: ScopeOptions;

  constructor(targetUrl: string, options: ScopeOptions = {}) {
    const parsed = new URL(targetUrl);
    this.baseOrigin = parsed.origin;
    this.baseHostname = parsed.hostname;
    this.options = {
      allowSubdomains: options.allowSubdomains ?? false,
      blockedExtensions: options.blockedExtensions ?? DEFAULT_BLOCKED_EXTENSIONS,
      maxDepth: options.maxDepth ?? 3
    };
  }

  public getOrigin(): string {
    return this.baseOrigin;
  }

  public getHostname(): string {
    return this.baseHostname;
  }

  public static isValidTarget(urlStr: string): { valid: boolean; reason?: string; normalizedUrl?: string } {
    try {
      if (!urlStr || typeof urlStr !== 'string') {
        return { valid: false, reason: 'URL cannot be empty' };
      }
      let trimmed = urlStr.trim();
      if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        trimmed = 'http://' + trimmed;
      }
      const parsed = new URL(trimmed);

      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { valid: false, reason: 'Only HTTP and HTTPS protocols are allowed' };
      }

      // Check metadata IP and localhost safety
      if (parsed.hostname === '169.254.169.254') {
        return { valid: false, reason: 'Cloud metadata IP 169.254.169.254 is prohibited' };
      }

      return { valid: true, normalizedUrl: parsed.origin + (parsed.pathname === '/' ? '' : parsed.pathname) + parsed.search };
    } catch (err: any) {
      return { valid: false, reason: `Malformed URL: ${err.message}` };
    }
  }

  public isAllowed(candidateUrl: string): boolean {
    try {
      if (!candidateUrl || typeof candidateUrl !== 'string') return false;

      const trimmed = candidateUrl.trim();
      if (
        trimmed.startsWith('javascript:') ||
        trimmed.startsWith('mailto:') ||
        trimmed.startsWith('tel:') ||
        trimmed.startsWith('data:') ||
        trimmed.startsWith('#')
      ) {
        return false;
      }

      const parsed = new URL(trimmed, this.baseOrigin);

      // Must be http or https
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return false;
      }

      // Hostname check
      if (this.options.allowSubdomains) {
        if (parsed.hostname !== this.baseHostname && !parsed.hostname.endsWith(`.${this.baseHostname}`)) {
          return false;
        }
      } else {
        if (parsed.hostname.toLowerCase() !== this.baseHostname.toLowerCase()) {
          return false;
        }
      }

      // Check file extensions (skip static media)
      const pathname = parsed.pathname.toLowerCase();
      for (const ext of this.options.blockedExtensions || []) {
        if (pathname.endsWith(ext)) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  public normalize(urlStr: string): string {
    try {
      const parsed = new URL(urlStr, this.baseOrigin);
      parsed.hash = ''; // strip fragment
      let norm = parsed.toString();
      if (norm.endsWith('/') && parsed.pathname !== '/') {
        norm = norm.slice(0, -1);
      }
      return norm;
    } catch {
      return urlStr;
    }
  }
}

