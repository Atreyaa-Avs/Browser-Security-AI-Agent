export function ruleChecks(headers: Record<string, string>, html: string): string[] {
  const findings: string[] = [];
  const h = (k: string) => headers[k.toLowerCase()];
  if (!h('content-security-policy')) findings.push('Missing CSP header');
  if (!h('x-frame-options') && !h('content-security-policy')?.includes('frame-ancestors')) findings.push('Clickjacking: no X-Frame-Options/CSP frame-ancestors');
  if (!h('strict-transport-security')) findings.push('Missing HSTS');
  if (!h('x-content-type-options')) findings.push('Missing X-Content-Type-Options');
  if (/eval\(|document\.write\(/.test(html)) findings.push('Dangerous JS: eval/document.write');
  return findings;
}
