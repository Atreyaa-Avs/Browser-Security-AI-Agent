import { StagehandAgent } from '../agent/stagehandAgent';
import { ScopeValidator } from '../utils/scopeValidator';
import { PageAnalyzer, DiscoveredEndpoint, AttackSurface } from './pageAnalyzer';

export interface CrawlEvent {
  type: 'crawling' | 'discovered' | 'analyzed' | 'form_found' | 'error';
  url: string;
  message: string;
  data?: any;
}

export class Crawler {
  private stagehand: StagehandAgent;
  private scope: ScopeValidator;
  private analyzer: PageAnalyzer;
  private visited: Set<string> = new Set();
  private queue: { url: string; depth: number }[] = [];
  private endpoints: Map<string, DiscoveredEndpoint> = new Map();
  private surfaces: AttackSurface[] = [];
  private onEvent?: (event: CrawlEvent) => void;
  private maxPages: number;
  private maxDepth: number;

  constructor(
    stagehand: StagehandAgent,
    scope: ScopeValidator,
    options?: {
      maxPages?: number;
      maxDepth?: number;
      onEvent?: (event: CrawlEvent) => void;
    }
  ) {
    this.stagehand = stagehand;
    this.scope = scope;
    this.analyzer = new PageAnalyzer(scope);
    this.maxPages = options?.maxPages ?? 12;
    this.maxDepth = options?.maxDepth ?? 3;
    this.onEvent = options?.onEvent;
  }

  private emit(event: CrawlEvent) {
    if (this.onEvent) {
      this.onEvent(event);
    }
  }

  public async start(initialUrl: string): Promise<{
    visitedUrls: string[];
    endpoints: DiscoveredEndpoint[];
    surfaces: AttackSurface[];
  }> {
    const startUrl = this.scope.normalize(initialUrl);
    this.queue.push({ url: startUrl, depth: 0 });

    this.emit({
      type: 'crawling',
      url: startUrl,
      message: `Starting autonomous crawl at ${startUrl} (maxPages: ${this.maxPages}, maxDepth: ${this.maxDepth})`
    });

    while (this.queue.length > 0 && this.visited.size < this.maxPages) {
      const item = this.queue.shift()!;
      const currentUrl = item.url;
      const depth = item.depth;

      if (this.visited.has(currentUrl)) continue;
      this.visited.add(currentUrl);

      this.emit({
        type: 'crawling',
        url: currentUrl,
        message: `Visiting [Depth ${depth}]: ${currentUrl}`
      });

      try {
        // Stagehand navigation
        const res = await this.stagehand.goto(currentUrl, { timeout: 15000, waitUntil: 'domcontentloaded' });
        
        // Stagehand extraction
        const pageData = await this.stagehand.extract(`Extract page links, forms, and inputs for ${currentUrl}`);

        // Page Analysis
        const analysis = this.analyzer.analyzePage(pageData, currentUrl, depth);

        this.emit({
          type: 'analyzed',
          url: currentUrl,
          message: `Analyzed ${currentUrl} (${pageData.title || 'Untitled'}) - Found ${analysis.endpoints.length} links and ${analysis.surfaces.length} surfaces`,
          data: { title: pageData.title, status: res.status }
        });

        // Store surfaces
        for (const surf of analysis.surfaces) {
          this.surfaces.push(surf);
          if (surf.type === 'form') {
            this.emit({
              type: 'form_found',
              url: surf.url,
              message: `Discovered form with ${surf.parameters.length} inputs on ${surf.url}`,
              data: surf
            });
          }
        }

        // Queue newly discovered endpoints
        for (const ep of analysis.endpoints) {
          if (!this.endpoints.has(ep.url)) {
            this.endpoints.set(ep.url, ep);
            this.emit({
              type: 'discovered',
              url: ep.url,
              message: `Discovered internal endpoint: ${ep.url} (${ep.type})`,
              data: ep
            });

            if (!this.visited.has(ep.url) && ep.depth <= this.maxDepth) {
              this.queue.push({ url: ep.url, depth: ep.depth });
            }
          }
        }
      } catch (err: any) {
        this.emit({
          type: 'error',
          url: currentUrl,
          message: `Failed to crawl ${currentUrl}: ${err.message}`
        });
      }
    }

    return {
      visitedUrls: Array.from(this.visited),
      endpoints: Array.from(this.endpoints.values()),
      surfaces: this.surfaces
    };
  }
}

