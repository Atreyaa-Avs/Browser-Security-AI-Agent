import { chromium } from 'playwright';
import WebSocket from 'ws';
import { collectDom } from './collectors/dom';
import { collectHeaders } from './collectors/headers';
import { isAllowed } from './policies/navigation';
import { ruleChecks } from './services/ruleEngine';
import { askLLM } from './services/llm';

const targetUrl: string = process.argv[2] || 'http://localhost:5176';
const investigationId: string = process.argv[3] || 'default';

function sendLog(type: string, message: string, data?: any) {
  try {
    const ws = new WebSocket('ws://localhost:4000/browser-logs?type=agent&id=' + investigationId);
    ws.on('open', () => {
      ws.send(JSON.stringify({ type, message, data, timestamp: Date.now() }));
      setTimeout(() => ws.close(), 100);
    });
  } catch (e) {
    // ignore
  }
  console.log(`[${type}] ${message}`);
}

async function main(): Promise<void> {
  sendLog('info', 'Starting browser agent investigation');
  sendLog('info', `Target URL: ${targetUrl}`);
  
  const browser = await chromium.launch({ headless: true });
  sendLog('info', 'Browser launched');
  
  const context = await browser.newContext();
  const page = await context.newPage();
  sendLog('info', 'Navigating to target URL');
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  sendLog('success', 'Initial page loaded');

  const toVisit = [targetUrl];
  const visited = new Set<string>();
  const allFindings: string[] = [];

  while (toVisit.length && visited.size < 15) {
    const url = toVisit.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);
    sendLog('info', `Visiting: ${url}`);

    await page.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => {});
    const headers = await collectHeaders(page);
    sendLog('debug', `Collected headers from ${url}`);
    const { html, links } = await collectDom(page);
    sendLog('debug', `Found ${links.length} links on ${url}`);
    const findings = ruleChecks(headers, html);
    if (findings.length > 0) {
      sendLog('warning', `Found ${findings.length} potential issues on ${url}`);
      findings.forEach(f => sendLog('finding', f));
    }
    allFindings.push(...findings.map((f) => `${url}: ${f}`));

    const origin = new URL(targetUrl).origin;
    for (const l of links) if (isAllowed(l, origin, visited) && !toVisit.includes(l)) {
      toVisit.push(l);
      sendLog('debug', `Queued link: ${l}`);
    }

    if (findings.length > 0) {
      sendLog('info', 'Requesting LLM analysis for findings');
      const extra = await askLLM(`URL ${url} has findings: ${findings.join('; ')}. Provide detailed attack analysis: vulnerability type, impact, exploitation steps, and remediation.`);
      if (extra) {
        sendLog('llm', 'LLM analysis received');
        allFindings.push(`${url}: LLM -> ${extra.slice(0, 200)}`);
      }
    }
  }

  sendLog('success', `Investigation complete. Visited ${visited.size} pages with ${allFindings.length} findings`);
  console.log(JSON.stringify({ visited: visited.size, findings: allFindings }, null, 2));
  await browser.close();
}

main().catch((err: unknown) => {
  sendLog('error', `Agent failed: ${err}`);
  console.error(err);
  process.exit(1);
});
