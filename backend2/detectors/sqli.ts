import { Page } from 'playwright';

export interface SQLiFinding {
  type: 'SQL Injection';
  url: string;
  parameter?: string;
  payload: string;
  dbEngine: string;
  evidence: string;
  description: string;
  severity: 'Critical';
}

const SQL_ERROR_PATTERNS = [
  { engine: 'MySQL', regex: /(you have an error in your sql syntax|warning: mysql_|check the manual that corresponds to your (mysql|mariadb) server version)/i },
  { engine: 'PostgreSQL', regex: /(pg_query\(\)|syntax error at or near|unterminated quoted string at or near|psycopg2\.)/i },
  { engine: 'SQLite', regex: /(sqlite3::sqlexception|unrecognized token:|near ".*?": syntax error|operationalerror: near)/i },
  { engine: 'Microsoft SQL Server', regex: /(unclosed quotation mark after the character string|microsoft ole db provider for sql server|driver.*sql[-_ ]*server)/i },
  { engine: 'Oracle', regex: /(ora-01756|ora-00933|ora-00921|quoted string not properly terminated)/i },
  { engine: 'Generic SQL', regex: /(sql syntax.*?error|syntax error in query|database query failed|pdoexception)/i }
];

export class SQLiDetector {
  private static TEST_PAYLOADS = [
    "'",
    "''",
    "' OR '1'='1",
    "1' ORDER BY 1--+",
    "' UNION SELECT NULL--"
  ];

  public static async testUrlParameters(page: Page, targetUrl: string): Promise<SQLiFinding[]> {
    const findings: SQLiFinding[] = [];
    try {
      const parsed = new URL(targetUrl);
      const params = Array.from(parsed.searchParams.keys());

      for (const param of params) {
        for (const payload of SQLiDetector.TEST_PAYLOADS.slice(0, 2)) {
          const testUrl = new URL(targetUrl);
          testUrl.searchParams.set(param, payload);

          const res = await page.goto(testUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => null);
          if (!res) continue;

          const content = await page.content().catch(() => '');

          for (const pattern of SQL_ERROR_PATTERNS) {
            const match = content.match(pattern.regex);
            if (match) {
              findings.push({
                type: 'SQL Injection',
                url: testUrl.toString(),
                parameter: param,
                payload,
                dbEngine: pattern.engine,
                evidence: `Matched database error: "${match[0].slice(0, 150)}"`,
                description: `High-confidence SQL Injection vulnerability detected in parameter "${param}". Backend returned a database error signature indicative of unsanitized SQL concatenation.`,
                severity: 'Critical'
              });
              break; // One finding per parameter is enough
            }
          }
        }
      }
    } catch {}
    return findings;
  }
}

