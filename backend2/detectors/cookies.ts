export interface CookieFinding {
  type: 'Session Cookies';
  cookieName: string;
  issue: 'missing_httponly' | 'missing_secure' | 'missing_samesite' | 'insecure_prefix';
  url: string;
  evidence: string;
  description: string;
  severity: 'High' | 'Medium' | 'Low';
}

export class CookieDetector {
  public static check(url: string, cookies: any[]): CookieFinding[] {
    const findings: CookieFinding[] = [];
    const isHttps = url.toLowerCase().startsWith('https://');

    const sessionPatterns = /(sess|token|jwt|auth|sid|id|login|user)/i;

    for (const c of cookies) {
      const name = c.name || '';
      const isSession = sessionPatterns.test(name);

      // 1. HttpOnly Check
      if (!c.httpOnly) {
        findings.push({
          type: 'Session Cookies',
          cookieName: name,
          issue: 'missing_httponly',
          url,
          evidence: `Cookie "${name}" has httpOnly: false`,
          description: isSession
            ? `Critical session cookie "${name}" lacks HttpOnly flag, allowing malicious scripts to access it via Cross-Site Scripting (XSS).`
            : `Cookie "${name}" is accessible via document.cookie because HttpOnly is not set.`,
          severity: isSession ? 'High' : 'Medium'
        });
      }

      // 2. Secure Check (especially if running on HTTPS)
      if (isHttps && !c.secure) {
        findings.push({
          type: 'Session Cookies',
          cookieName: name,
          issue: 'missing_secure',
          url,
          evidence: `Cookie "${name}" has secure: false over HTTPS`,
          description: `Cookie "${name}" is missing the Secure attribute, allowing it to be transmitted over unencrypted HTTP channels.`,
          severity: isSession ? 'High' : 'Medium'
        });
      }

      // 3. SameSite Check
      const sameSite = (c.sameSite || '').toLowerCase();
      if (!sameSite || sameSite === 'none') {
        findings.push({
          type: 'Session Cookies',
          cookieName: name,
          issue: 'missing_samesite',
          url,
          evidence: `Cookie "${name}" sameSite is "${sameSite || 'None/Unspecified'}"`,
          description: `Cookie "${name}" lacks SameSite=Lax or SameSite=Strict, increasing risk of Cross-Site Request Forgery (CSRF).`,
          severity: 'Low'
        });
      }
    }

    return findings;
  }
}

