import { chromium } from 'playwright';
import { collectDom } from './collectors/dom';
import { collectHeaders } from './collectors/headers';
import { isAllowed } from './policies/navigation';
import { ruleChecks } from './services/ruleEngine';
import { askLLM } from './services/llm';

const targetUrl: string = process.argv[2] || 'http://localhost:5176';

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

  const toVisit = [targetUrl];
  const visited = new Set<string>();
  const allFindings: string[] = [];

  while (toVisit.length && visited.size < 15) {
    const url = toVisit.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);

    await page.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => {});
    const headers = await collectHeaders(page);
    const { html, links } = await collectDom(page);
    const findings = ruleChecks(headers, html);
    allFindings.push(...findings.map((f) => `${url}: ${f}`));

    const origin = new URL(targetUrl).origin;
    for (const l of links) if (isAllowed(l, origin, visited) && !toVisit.includes(l)) toVisit.push(l);

    if (findings.length > 0) {
      const extra = await askLLM(`URL ${url} has findings: ${findings.join('; ')}. Provide detailed attack analysis: vulnerability type, impact, exploitation steps, and remediation.`);
      if (extra) allFindings.push(`${url}: LLM -> ${extra.slice(0, 200)}`);
    }
  }

  console.log(JSON.stringify({ visited: visited.size, findings: allFindings }, null, 2));
  await browser.close();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
