export async function collectHeaders(page: any): Promise<Record<string, string>> {
  return await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as any;
    return nav ? { 'content-type': nav.responseType || '' } : {};
  });
}
