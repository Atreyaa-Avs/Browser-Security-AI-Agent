import { Page } from 'playwright';

export interface XSSFinding {
  type: 'XSS';
  subType: 'Reflected XSS' | 'DOM XSS';
  url: string;
  parameter?: string;
  payload: string;
  evidence: string;
  description: string;
  severity: 'High' | 'Critical';
}

export class XSSDetector {
  /**
   * Safe canary payloads that test reflection and tag preservation without causing harm
   */
  private static CANARY_PROBE = 'sec_probe_' + Math.random().toString(36).substring(2, 7);
  private static TEST_PAYLOADS = [
    `"><script>/*${XSSDetector.CANARY_PROBE}*/</script>`,
    `<svg onload="console.log('${XSSDetector.CANARY_PROBE}')">`,
    `"><img src=x onerror="secCheck('${XSSDetector.CANARY_PROBE}')">`,
    `'"><b id="${XSSDetector.CANARY_PROBE}">xss_proof</b>`
  ];

  /**
   * Tests URL query parameters for unescaped reflection
   */
  public static async testUrlParameters(page: Page, targetUrl: string): Promise<XSSFinding[]> {
    const findings: XSSFinding[] = [];
    try {
      const parsed = new URL(targetUrl);
      const params = Array.from(parsed.searchParams.keys());

      for (const param of params) {
        const testPayload = XSSDetector.TEST_PAYLOADS[0];
        const testUrl = new URL(targetUrl);
        testUrl.searchParams.set(param, testPayload);

        const res = await page.goto(testUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => null);
        if (!res) continue;

        const bodyHtml = await page.content().catch(() => '');

        // Check if raw payload or unescaped tag is present in the rendered DOM
        if (bodyHtml.includes(testPayload) || bodyHtml.includes(XSSDetector.CANARY_PROBE)) {
          findings.push({
            type: 'XSS',
            subType: 'Reflected XSS',
            url: testUrl.toString(),
            parameter: param,
            payload: testPayload,
            evidence: `Parameter "${param}" reflected unescaped script tag: ...${testPayload}...`,
            description: `Reflected Cross-Site Scripting (XSS) detected in parameter "${param}". Unsanitized input is returned directly in the response document.`,
            severity: 'High'
          });
        }
      }
    } catch {}
    return findings;
  }

  /**
   * Checks for DOM XSS sinks and insecure client-side APIs in the page
   */
  public static async checkDomSinks(page: Page, url: string): Promise<XSSFinding[]> {
    const findings: XSSFinding[] = [];
    try {
      const sinkReports = await page.evaluate(() => {
        const issues: string[] = [];
        const scripts = Array.from(document.querySelectorAll('script')).map(s => s.textContent || '');

        for (const code of scripts) {
          if (/(location\.hash|location\.search|document\.URL|document\.referrer)\s*.*?(innerHTML|outerHTML|document\.write|eval)/is.test(code)) {
            issues.push('Source (URL/hash) piped directly into dangerous sink (innerHTML/eval/document.write)');
          }
        }

        // Check if document.write or eval are referenced in inline handlers
        document.querySelectorAll('*').forEach((el) => {
          for (let i = 0; i < el.attributes.length; i++) {
            const attr = el.attributes[i];
            if (attr.name.startsWith('on') && /(eval|innerHTML)/i.test(attr.value)) {
              issues.push(`Inline event handler ${attr.name} contains dynamic code evaluation`);
            }
          }
        });

        return issues;
      });

      for (const rep of sinkReports) {
        findings.push({
          type: 'XSS',
          subType: 'DOM XSS',
          url,
          payload: 'DOM source-to-sink flow',
          evidence: rep,
          description: 'Client-side JavaScript passes untrusted browser sources into dangerous DOM sinks without sanitization.',
          severity: 'High'
        });
      }
    } catch {}
    return findings;
  }
}

