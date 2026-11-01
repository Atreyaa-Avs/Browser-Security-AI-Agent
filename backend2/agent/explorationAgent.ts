import { StagehandAgent } from './stagehandAgent';
import { ScopeValidator } from '../utils/scopeValidator';
import { Crawler } from '../discovery/crawler';
import { DiscoveredEndpoint, AttackSurface } from '../discovery/pageAnalyzer';
import { GroqService } from '../services/groqService';

export interface ExplorationResult {
  targetUrl: string;
  visitedUrls: string[];
  endpoints: DiscoveredEndpoint[];
  surfaces: AttackSurface[];
  authWorkflows: AttackSurface[];
}

export class ExplorationAgent {
  private stagehand: StagehandAgent;
  private scope: ScopeValidator;
  private groq: GroqService;
  private onLog?: (step: string, message: string, data?: any) => void;

  constructor(
    stagehand: StagehandAgent,
    scope: ScopeValidator,
    groq: GroqService,
    onLog?: (step: string, message: string, data?: any) => void
  ) {
    this.stagehand = stagehand;
    this.scope = scope;
    this.groq = groq;
    this.onLog = onLog;
  }

  private log(step: string, message: string, data?: any) {
    if (this.onLog) {
      this.onLog(step, message, data);
    } else {
      console.log(`[ExplorationAgent:${step}] ${message}`);
    }
  }

  public async run(targetUrl: string): Promise<ExplorationResult> {
    // 1. Open the website
    this.log('init', `Step 1: Opening website ${targetUrl} via Stagehand`);
    await this.stagehand.init();
    const homeNav = await this.stagehand.goto(targetUrl);

    // 2. Understand homepage
    this.log('observe', `Step 2: Understanding homepage layout, forms, and interactive components...`);
    const homeElements = await this.stagehand.observe('Homepage key interactive sections and forms');
    const homeExtract = await this.stagehand.extract('Extract all initial navigation paths and entry forms');

    this.log('observe', `Homepage analyzed: "${homeExtract.title}", found ${homeElements.length} interactive elements and ${homeExtract.forms.length} forms`);

    // 3 & 4. Discover internal links & navigate pages
    this.log('crawl', `Step 3 & 4: Starting autonomous crawl across internal routes...`);
    const crawler = new Crawler(this.stagehand, this.scope, {
      maxPages: 10,
      maxDepth: 2,
      onEvent: (evt) => {
        this.log('discovery', evt.message, evt.data);
      }
    });

    const crawlResult = await crawler.start(targetUrl);

    // 5 & 6. Identify forms, inputs, login, and profile workflows
    this.log('analyze', `Step 5 & 6: Cataloging discovered attack surfaces and authentication workflows...`);
    const authWorkflows = crawlResult.surfaces.filter(s => s.isAuthWorkflow);
    this.log('analyze', `Identified ${crawlResult.surfaces.length} total attack surfaces (${authWorkflows.length} auth-related workflows)`);

    // 7. Prioritize with Groq AI
    this.log('ai_prioritize', `Step 7: Utilizing Groq AI reasoning to prioritize attack surfaces for security probing...`);
    const prioritizedUrls = await this.groq.prioritizeSurfaces(
      crawlResult.surfaces.map(s => ({
        url: s.url,
        type: s.type === 'auth' ? 'auth' : s.type === 'form' ? 'form' : 'link',
        inputs: s.parameters,
        description: s.form ? `${s.form.method} form with ${s.parameters.join(', ')}` : undefined
      }))
    );

    this.log('complete', `Step 8: Exploration complete. Ready for detection engine.`);

    return {
      targetUrl,
      visitedUrls: crawlResult.visitedUrls,
      endpoints: crawlResult.endpoints,
      surfaces: crawlResult.surfaces,
      authWorkflows
    };
  }
}

