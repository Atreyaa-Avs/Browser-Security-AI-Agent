import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Route } from 'lucide-react';
import type { ExploredPage, StagehandOutput } from './types';

interface ExplorationTrailProps {
  output: StagehandOutput;
}

function pagesOf(output: StagehandOutput): ExploredPage[] {
  if (output.exploredPages?.length) return output.exploredPages;
  return [
    {
      url: output.url,
      title: output.title,
      linksCount: output.links?.length ?? 0,
      formsCount: output.forms?.length ?? 0,
    },
  ];
}

export function ExplorationTrail({ output }: ExplorationTrailProps) {
  const pages = pagesOf(output);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Route className="size-4" />
          Stagehand goto() exploration trail
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-90">
          <ol className="space-y-2 pr-3">
            {pages.map((page, index) => (
              <li key={`${page.url}-${index}`} className="bg-muted/40 rounded-lg border px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {page.title || `Page ${index + 1}`}
                  </span>
                  <span className="text-muted-foreground shrink-0 text-xs">Step {index + 1}</span>
                </div>
                <p className="text-muted-foreground mt-1 font-mono text-xs break-all">{page.url}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {page.linksCount} links · {page.formsCount} forms
                </p>
              </li>
            ))}
          </ol>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
