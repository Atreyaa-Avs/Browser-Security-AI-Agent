import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Cookie, Link2, MousePointerClick, Server } from 'lucide-react';
import type { StagehandOutput } from './types';

interface StagehandSummaryCardProps {
  output: StagehandOutput;
}

export function StagehandSummaryCard({ output }: StagehandSummaryCardProps) {
  const stats = [
    {
      label: 'Observed elements',
      value: output.interactiveElements?.length ?? 0,
      icon: MousePointerClick,
    },
    { label: 'Discovered forms', value: output.forms?.length ?? 0, icon: Server },
    { label: 'Discovered links', value: output.links?.length ?? 0, icon: Link2 },
    { label: 'Cookies captured', value: output.cookies?.length ?? 0, icon: Cookie },
  ];

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">HTTP {output.status}</Badge>
            <h2 className="truncate text-base font-semibold">{output.title}</h2>
          </div>
          <p className="text-muted-foreground font-mono text-xs break-all">{output.url}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {stats.map((stat, index) => (
            <div key={stat.label} className="flex items-center gap-3">
              {index > 0 ? <Separator orientation="vertical" className="hidden h-8 sm:block" /> : null}
              <div className="min-w-24">
                <div className="text-muted-foreground flex items-center gap-1 text-[11px] font-medium tracking-wide uppercase">
                  <stat.icon className="size-3" />
                  {stat.label}
                </div>
                <div className="text-xl font-semibold tabular-nums">{stat.value}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
