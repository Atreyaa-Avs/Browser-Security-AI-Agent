import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link2, Route } from 'lucide-react';
import { EmptyState } from './PanelBits';
import type { DiscoveredEndpoint, StagehandOutput } from './types';

interface AttackSurfacesTabProps {
  endpoints: DiscoveredEndpoint[];
  stagehandOutput: StagehandOutput | null;
}

export function AttackSurfacesTab({ endpoints, stagehandOutput }: AttackSurfacesTabProps) {
  const routes = useMemo<DiscoveredEndpoint[]>(() => {
    if (endpoints.length > 0) return endpoints;
    return (stagehandOutput?.links ?? []).map((link) => ({
      url: link.href,
      title: link.text || 'Internal link',
      type: 'navigation',
    }));
  }, [endpoints, stagehandOutput]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Route className="size-4" />
          Discovered routes & endpoints
        </CardTitle>
        <Badge variant="outline">{routes.length} routes</Badge>
      </CardHeader>
      <CardContent>
        {routes.length === 0 ? (
          <EmptyState
            icon={<Link2 className="size-8" />}
            title="No attack surfaces mapped yet"
            description="Run a Stagehand exploration to discover routes dynamically."
          />
        ) : (
          <ul className="space-y-2">
            {routes.map((route, index) => (
              <li
                key={`${route.url}-${index}`}
                className="bg-muted/40 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Badge variant={route.type === 'auth' ? 'destructive' : 'secondary'}>
                    {route.type || 'route'}
                  </Badge>
                  <span className="truncate font-mono text-xs" title={route.url}>
                    {route.url}
                  </span>
                </div>
                <span className="text-muted-foreground text-xs">{route.title || 'Discovered'}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
