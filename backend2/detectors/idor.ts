import { Page } from 'playwright';

export interface IDORFinding {
  type: 'IDOR';
  url: string;
  parameter?: string;
  originalId: string;
  probedId: string;
  evidence: string;
  description: string;
  severity: 'High';
}

export class IDORDetector {
  private static ID_PARAM_REGEX = /^(id|user_id|uid|account_id|order_id|doc_id|file_id|item_id|profile_id)$/i;

  public static async testEndpoint(page: Page, targetUrl: string): Promise<IDORFinding[]> {
    const findings: IDORFinding[] = [];
    try {
      const parsed = new URL(targetUrl);
      const params = Array.from(parsed.searchParams.keys());

      // 1. Check Query Parameters for Numeric or Predictable Identifiers
      for (const param of params) {
        const val = parsed.searchParams.get(param) || '';
        const isNumeric = /^\d+$/.test(val);
        const isIdParam = IDORDetector.ID_PARAM_REGEX.test(param) || isNumeric;

        if (isIdParam && isNumeric && parseInt(val, 10) > 0) {
          const num = parseInt(val, 10);
          const alternateId = num > 1 ? (num - 1).toString() : (num + 1).toString();

          const testUrl = new URL(targetUrl);
          testUrl.searchParams.set(param, alternateId);

          const res = await page.goto(testUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => null);
          if (!res) continue;

          const status = res.status();
          const content = await page.content().catch(() => '');

          // If accessible (HTTP 200) without redirecting to login or throwing 401/403/404
          if (status === 200 && !content.includes('Access Denied') && !content.includes('Unauthorized') && !content.includes('403 Forbidden')) {
            findings.push({
              type: 'IDOR',
              url: testUrl.toString(),
              parameter: param,
              originalId: val,
              probedId: alternateId,
              evidence: `Accessed alternate object identifier "${param}=${alternateId}" returned HTTP ${status} without authorization challenge.`,
              description: `Potential Insecure Direct Object Reference (IDOR) on parameter "${param}". Modifying the object identifier retrieved a valid response without tenant or access validation.`,
              severity: 'High'
            });
          }
        }
      }

      // 2. Check Path Segments for numeric IDs (e.g. /users/42, /items/101)
      const segments = parsed.pathname.split('/');
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (/^\d+$/.test(seg) && parseInt(seg, 10) > 0) {
          const num = parseInt(seg, 10);
          const altNum = num > 1 ? (num - 1).toString() : (num + 1).toString();
          const newSegments = [...segments];
          newSegments[i] = altNum;

          const testUrl = new URL(targetUrl);
          testUrl.pathname = newSegments.join('/');

          const res = await page.goto(testUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => null);
          if (res && res.status() === 200) {
            findings.push({
              type: 'IDOR',
              url: testUrl.toString(),
              parameter: `path_segment[${i}]`,
              originalId: seg,
              probedId: altNum,
              evidence: `Modifying URL path identifier from "${seg}" to "${altNum}" resolved successfully with HTTP 200.`,
              description: `Predictable direct path object reference detected in endpoint path.`,
              severity: 'High'
            });
            break;
          }
        }
      }
    } catch {}
    return findings;
  }
}

