export function isAllowed(url: string, origin: string, visited: Set<string>): boolean {
  return url.startsWith(origin) && !visited.has(url);
}
