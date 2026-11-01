import { ScopeValidator } from '../utils/scopeValidator';
import { PageExtractionResult, ExtractedFormData } from '../agent/stagehandAgent';

export interface DiscoveredEndpoint {
  url: string;
  depth: number;
  type: 'navigation' | 'auth' | 'form_action' | 'api' | 'profile';
  sourceUrl: string;
  title?: string;
}

export interface AttackSurface {
  id: string;
  url: string;
  form?: ExtractedFormData;
  parameters: string[];
  type: 'form' | 'query' | 'auth' | 'header';
  isAuthWorkflow: boolean;
  priority: 'high' | 'medium' | 'low';
}

export class PageAnalyzer {
  private scope: ScopeValidator;

  constructor(scope: ScopeValidator) {
    this.scope = scope;
  }

  public analyzePage(pageData: PageExtractionResult, currentUrl: string, currentDepth: number): {
    endpoints: DiscoveredEndpoint[];
    surfaces: AttackSurface[];
  } {
    const endpoints: DiscoveredEndpoint[] = [];
    const surfaces: AttackSurface[] = [];

    // 1. Analyze Links
    for (const link of pageData.links) {
      if (this.scope.isAllowed(link.href)) {
        const norm = this.scope.normalize(link.href);
        const isAuth = /(login|signin|register|signup|auth|account|user|profile)/i.test(norm) || /(login|sign in|register|profile)/i.test(link.text);
        const isApi = /(\/api\/|\/v1\/|\/graphql)/i.test(norm);

        endpoints.push({
          url: norm,
          depth: currentDepth + 1,
          type: isAuth ? 'auth' : isApi ? 'api' : 'navigation',
          sourceUrl: currentUrl,
          title: link.text
        });
      }
    }

    // 2. Analyze Forms
    for (const form of pageData.forms) {
      const formAction = this.scope.normalize(form.action);
      const isAuth = form.inputs.some(i => i.type === 'password' || /(pass|user|email|login|auth)/i.test(i.name));
      const hasCsrf = form.inputs.some(i => /(csrf|xsrf|token|_token)/i.test(i.name));

      const paramNames = form.inputs.map(i => i.name).filter(Boolean);

      surfaces.push({
        id: `form_${surfaces.length + 1}_${Date.now()}`,
        url: formAction,
        form,
        parameters: paramNames,
        type: isAuth ? 'auth' : 'form',
        isAuthWorkflow: isAuth,
        priority: isAuth ? 'high' : paramNames.length > 0 ? 'medium' : 'low'
      });

      if (this.scope.isAllowed(formAction)) {
        endpoints.push({
          url: formAction,
          depth: currentDepth + 1,
          type: isAuth ? 'auth' : 'form_action',
          sourceUrl: currentUrl,
          title: `Form: ${form.method} ${formAction}`
        });
      }
    }

    // 3. Analyze Query Parameters on Current URL
    try {
      const parsed = new URL(currentUrl);
      const queryParams = Array.from(parsed.searchParams.keys());
      if (queryParams.length > 0) {
        surfaces.push({
          id: `query_${Date.now()}`,
          url: currentUrl,
          parameters: queryParams,
          type: 'query',
          isAuthWorkflow: false,
          priority: queryParams.some(p => /(id|user|file|search|q|page|order)/i.test(p)) ? 'high' : 'medium'
        });
      }
    } catch {}

    return { endpoints, surfaces };
  }
}

