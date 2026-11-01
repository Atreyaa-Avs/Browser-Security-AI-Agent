export interface HeaderFinding {
  type: 'Security Headers';
  header: string;
  status: 'missing' | 'insecure' | 'disclosure';
  url: string;
  evidence: string;
  description: string;
  severity: 'Medium' | 'Low' | 'Info';
}

export class HeaderDetector {
  public static check(url: string, headers: Record<string, string>): HeaderFinding[] {
    const findings: HeaderFinding[] = [];
    const lower: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers)) {
      lower[k.toLowerCase()] = v;
    }

    const isHttps = url.toLowerCase().startsWith('https://');

    // 1. Content-Security-Policy
    if (!lower['content-security-policy']) {
      findings.push({
        type: 'Security Headers',
        header: 'Content-Security-Policy',
        status: 'missing',
        url,
        evidence: 'Header not present in HTTP response',
        description: 'Missing Content-Security-Policy exposes the application to Cross-Site Scripting (XSS) and data injection attacks.',
        severity: 'Medium'
      });
    } else {
      const csp = lower['content-security-policy'];
      if (csp.includes("'unsafe-inline'") || csp.includes("'unsafe-eval'")) {
        findings.push({
          type: 'Security Headers',
          header: 'Content-Security-Policy',
          status: 'insecure',
          url,
          evidence: `CSP directive contains unsafe keywords: ${csp.slice(0, 100)}`,
          description: "CSP contains 'unsafe-inline' or 'unsafe-eval', weakening script execution restrictions.",
          severity: 'Low'
        });
      }
    }

    // 2. Strict-Transport-Security (HSTS)
    if (isHttps && !lower['strict-transport-security']) {
      findings.push({
        type: 'Security Headers',
        header: 'Strict-Transport-Security',
        status: 'missing',
        url,
        evidence: 'HSTS header missing over HTTPS connection',
        description: 'Missing Strict-Transport-Security allows potential SSL stripping and man-in-the-middle attacks.',
        severity: 'Medium'
      });
    }

    // 3. X-Frame-Options
    if (!lower['x-frame-options'] && (!lower['content-security-policy'] || !lower['content-security-policy'].includes('frame-ancestors'))) {
      findings.push({
        type: 'Security Headers',
        header: 'X-Frame-Options',
        status: 'missing',
        url,
        evidence: 'Neither X-Frame-Options nor CSP frame-ancestors found',
        description: 'Missing X-Frame-Options allows the page to be embedded in an iframe, risking Clickjacking attacks.',
        severity: 'Medium'
      });
    }

    // 4. X-Content-Type-Options
    if (!lower['x-content-type-options'] || !lower['x-content-type-options'].includes('nosniff')) {
      findings.push({
        type: 'Security Headers',
        header: 'X-Content-Type-Options',
        status: 'missing',
        url,
        evidence: `Header value is: ${lower['x-content-type-options'] || 'absent'}`,
        description: "Missing 'X-Content-Type-Options: nosniff' can allow MIME-type sniffing and drive-by download attacks.",
        severity: 'Low'
      });
    }

    // 5. Referrer-Policy
    if (!lower['referrer-policy']) {
      findings.push({
        type: 'Security Headers',
        header: 'Referrer-Policy',
        status: 'missing',
        url,
        evidence: 'Referrer-Policy header is omitted',
        description: 'Without a Referrer-Policy, sensitive token or parameter leaks in HTTP Referer headers may occur.',
        severity: 'Low'
      });
    }

    // 6. Technology Disclosure Headers
    const disclosureHeaders = ['x-powered-by', 'server', 'x-aspnet-version', 'x-runtime'];
    for (const h of disclosureHeaders) {
      if (lower[h]) {
        findings.push({
          type: 'Security Headers',
          header: h,
          status: 'disclosure',
          url,
          evidence: `${h}: ${lower[h]}`,
          description: `Server exposes backend software details (${h}: ${lower[h]}), aiding attacker reconnaissance.`,
          severity: 'Info'
        });
      }
    }

    return findings;
  }
}

