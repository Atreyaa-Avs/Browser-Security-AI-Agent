import { chromium, Browser, BrowserContext, Page, Response } from 'playwright';

export interface ObservedElement {
  id: string;
  tagName: string;
  type?: string;
  name?: string;
  selector: string;
  text: string;
  role?: string;
  placeholder?: string;
  isInteractive: boolean;
  isAuthRelated?: boolean;
}

export interface ExtractedFormData {
  action: string;
  method: string;
  selector: string;
  inputs: {
    name: string;
    type: string;
    value?: string;
    placeholder?: string;
    required?: boolean;
  }[];
}

export interface PageExtractionResult {
  title: string;
  url: string;
  links: { href: string; text: string }[];
  forms: ExtractedFormData[];
  scripts: string[];
  metaTags: Record<string, string>;
  interactiveElements: ObservedElement[];
}

export class StagehandAgent {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private lastResponse: Response | null = null;
  private lastHeaders: Record<string, string> = {};
  private lastStatusCode: number = 0;
  private logCallback?: (level: 'info' | 'debug' | 'warn' | 'error' | 'stagehand', msg: string, data?: any) => void;

  constructor(options?: { logCallback?: (level: string, msg: string, data?: any) => void }) {
    if (options?.logCallback) {
      this.logCallback = options.logCallback as any;
    }
  }

  private log(level: 'info' | 'debug' | 'warn' | 'error' | 'stagehand', msg: string, data?: any) {
    if (this.logCallback) {
      this.logCallback(level, msg, data);
    } else {
      console.log(`[Stagehand:${level.toUpperCase()}] ${msg}`, data || '');
    }
  }

  public async init(options?: { headless?: boolean }): Promise<void> {
    const headless = options?.headless ?? (process.env.HEADLESS !== 'false');
    this.log('stagehand', `Initializing Stagehand browser engine (headless: ${headless})...`);

    this.browser = await chromium.launch({
      headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    this.context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) StagehandSecurityAgent/1.0',
      ignoreHTTPSErrors: true,
      viewport: { width: 1280, height: 800 }
    });

    this.page = await this.context.newPage();

    // Listen to responses to capture headers
    this.page.on('response', (response) => {
      try {
        if (response.url() === this.page?.url()) {
          this.lastResponse = response;
          this.lastStatusCode = response.status();
          const headers = response.headers();
          this.lastHeaders = headers;
        }
      } catch {}
    });

    this.log('stagehand', 'Stagehand browser initialized successfully');
  }

  public getContext(): BrowserContext {
    if (!this.context) throw new Error('StagehandAgent not initialized. Call init() first.');
    return this.context;
  }

  public getPage(): Page {
    if (!this.page) throw new Error('StagehandAgent not initialized. Call init() first.');
    return this.page;
  }

  /**
   * Stagehand goto() primitive:
   * Opens the target website and establishes session
   */
  public async goto(url: string, options?: { timeout?: number; waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' }): Promise<{ status: number; headers: Record<string, string>; title: string }> {
    if (!this.page) throw new Error('StagehandAgent not initialized.');
    this.log('stagehand', `goto() -> Navigating to ${url}`);

    const res = await this.page.goto(url, {
      waitUntil: options?.waitUntil ?? 'domcontentloaded',
      timeout: options?.timeout ?? 25000
    });

    this.lastResponse = res;
    this.lastStatusCode = res ? res.status() : 0;
    this.lastHeaders = res ? res.headers() : {};
    const title = await this.page.title().catch(() => '');

    this.log('stagehand', `goto() completed. Status: ${this.lastStatusCode}, Title: "${title}"`);
    return {
      status: this.lastStatusCode,
      headers: { ...this.lastHeaders },
      title
    };
  }

  /**
   * Stagehand observe() primitive:
   * Discovers interactive elements, form fields, action buttons, links
   */
  public async observe(instruction?: string): Promise<ObservedElement[]> {
    if (!this.page) throw new Error('StagehandAgent not initialized.');
    this.log('stagehand', `observe() -> Inspecting page interactive elements (${instruction || 'all interactive elements'})...`);

    const elements = await this.page.evaluate(() => {
      const results: any[] = [];
      const seen = new Set<string>();

      // 1. Inputs, Textareas, Selects
      document.querySelectorAll('input, textarea, select').forEach((el, index) => {
        const input = el as HTMLInputElement;
        const selector = input.id ? `#${input.id}` : input.name ? `[name="${input.name}"]` : `${input.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
        if (seen.has(selector)) return;
        seen.add(selector);

        const type = (input.type || 'text').toLowerCase();
        const isAuth = type === 'password' || /(user|login|auth|pass|email|token)/i.test(input.name || '') || /(user|login|auth|pass|email)/i.test(input.id || '');

        results.push({
          id: `elem_${results.length + 1}`,
          tagName: input.tagName.toLowerCase(),
          type,
          name: input.name || '',
          selector,
          text: input.value || input.placeholder || '',
          placeholder: input.placeholder || '',
          isInteractive: true,
          isAuthRelated: isAuth
        });
      });

      // 2. Buttons
      document.querySelectorAll('button, input[type="submit"], [role="button"]').forEach((el, index) => {
        const btn = el as HTMLElement;
        const text = btn.innerText?.trim() || (btn as HTMLInputElement).value || '';
        const selector = btn.id ? `#${btn.id}` : `${btn.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
        if (seen.has(selector)) return;
        seen.add(selector);

        results.push({
          id: `elem_${results.length + 1}`,
          tagName: btn.tagName.toLowerCase(),
          role: 'button',
          selector,
          text: text.slice(0, 50),
          isInteractive: true,
          isAuthRelated: /(sign in|log in|register|signup|auth|submit)/i.test(text)
        });
      });

      // 3. Navigation Links
      document.querySelectorAll('a[href]').forEach((el) => {
        const link = el as HTMLAnchorElement;
        const href = link.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
        const text = link.innerText?.trim() || '';
        const selector = `a[href="${href.replace(/"/g, '\\"')}"]`;
        if (seen.has(selector)) return;
        seen.add(selector);

        results.push({
          id: `elem_${results.length + 1}`,
          tagName: 'a',
          selector,
          text: text.slice(0, 60),
          role: 'link',
          isInteractive: true,
          isAuthRelated: /(login|sign in|account|profile|admin|dashboard)/i.test(text) || /(login|signin|admin|auth)/i.test(href)
        });
      });

      return results;
    });

    this.log('stagehand', `observe() discovered ${elements.length} interactive elements`);
    return elements;
  }

  /**
   * Stagehand act() primitive:
   * Interacts with elements: clicking, typing, submitting
   */
  public async act(action: {
    action: 'click' | 'type' | 'select' | 'submit' | 'navigate';
    selector?: string;
    text?: string;
    value?: string;
    description?: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (!this.page) throw new Error('StagehandAgent not initialized.');
    this.log('stagehand', `act() -> ${action.action} on ${action.selector || action.description || 'element'}`);

    try {
      if (action.action === 'click' && action.selector) {
        await this.page.click(action.selector, { timeout: 5000 });
        await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      } else if (action.action === 'type' && action.selector) {
        await this.page.fill(action.selector, action.value ?? action.text ?? '', { timeout: 5000 });
      } else if (action.action === 'submit' && action.selector) {
        await this.page.$eval(action.selector, (form: any) => form.submit()).catch(async () => {
          await this.page?.click(`${action.selector} [type="submit"], ${action.selector} button`);
        });
        await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      } else if (action.action === 'navigate' && action.value) {
        await this.page.goto(action.value, { waitUntil: 'domcontentloaded', timeout: 15000 });
      }
      return { success: true };
    } catch (err: any) {
      this.log('warn', `act() failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Stagehand extract() primitive:
   * Pulls structured information (forms, links, metadata, scripts) from the page
   */
  public async extract(instruction: string = 'Extract all links, forms, and interactive inputs'): Promise<PageExtractionResult> {
    if (!this.page) throw new Error('StagehandAgent not initialized.');
    this.log('stagehand', `extract() -> Executing: "${instruction}"`);

    const extracted = await this.page.evaluate(() => {
      const pageUrl = window.location.href;
      const title = document.title;

      // Extract Links
      const links: { href: string; text: string }[] = [];
      const linkHrefs = new Set<string>();
      document.querySelectorAll('a[href]').forEach((a) => {
        const href = (a as HTMLAnchorElement).href;
        const text = (a as HTMLElement).innerText?.trim() || '';
        if (href && !linkHrefs.has(href)) {
          linkHrefs.add(href);
          links.push({ href, text: text.slice(0, 100) });
        }
      });

      // Extract Forms
      const forms: any[] = [];
      document.querySelectorAll('form').forEach((form, idx) => {
        const action = form.getAttribute('action') || pageUrl;
        const method = (form.getAttribute('method') || 'GET').toUpperCase();
        const selector = form.id ? `#${form.id}` : form.name ? `form[name="${form.name}"]` : `form:nth-of-type(${idx + 1})`;

        const inputs: any[] = [];
        form.querySelectorAll('input, textarea, select').forEach((inp) => {
          const inputEl = inp as HTMLInputElement;
          const name = inputEl.name || inputEl.id;
          if (name) {
            inputs.push({
              name,
              type: (inputEl.type || 'text').toLowerCase(),
              value: inputEl.value || '',
              placeholder: inputEl.placeholder || '',
              required: inputEl.required || false
            });
          }
        });

        forms.push({ action, method, selector, inputs });
      });

      // Extract inline & external scripts
      const scripts: string[] = [];
      document.querySelectorAll('script').forEach((s) => {
        if (s.src) {
          scripts.push(s.src);
        } else if (s.textContent) {
          scripts.push(s.textContent.slice(0, 300));
        }
      });

      // Extract meta tags
      const metaTags: Record<string, string> = {};
      document.querySelectorAll('meta').forEach((m) => {
        const name = m.getAttribute('name') || m.getAttribute('property') || m.getAttribute('http-equiv');
        const content = m.getAttribute('content');
        if (name && content) {
          metaTags[name] = content;
        }
      });

      return { title, url: pageUrl, links, forms, scripts: scripts.slice(0, 20), metaTags };
    });

    const interactiveElements = await this.observe('Interactive elements for extraction');

    return {
      ...extracted,
      interactiveElements
    };
  }

  public async getCookies() {
    if (!this.context) return [];
    return await this.context.cookies();
  }

  public getHeaders(): Record<string, string> {
    return { ...this.lastHeaders };
  }

  public getStatusCode(): number {
    return this.lastStatusCode;
  }

  public async getPageContent(): Promise<string> {
    if (!this.page) return '';
    return await this.page.content().catch(() => '');
  }

  public async captureScreenshot(): Promise<string> {
    if (!this.page) return '';
    try {
      const buf = await this.page.screenshot({ type: 'jpeg', quality: 75 });
      return `data:image/jpeg;base64,${buf.toString('base64')}`;
    } catch {
      return '';
    }
  }

  public async close(): Promise<void> {
    this.log('stagehand', 'Closing Stagehand browser session');
    try {
      if (this.page) await this.page.close().catch(() => {});
      if (this.context) await this.context.close().catch(() => {});
      if (this.browser) await this.browser.close().catch(() => {});
    } catch {}
    this.page = null;
    this.context = null;
    this.browser = null;
  }
}
