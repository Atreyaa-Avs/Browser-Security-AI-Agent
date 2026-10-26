export async function collectDom(page: any): Promise<{ html: string; links: string[] }> {
  const html = await page.content();
  const links: string[] = await page.$$eval('a', (els: any[]) => els.map((e: any) => e.href));
  return { html, links };
}
