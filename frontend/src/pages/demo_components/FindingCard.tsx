import { cn } from 'cn';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MetaField } from './PanelBits';
import { severityAccentClass, severityBadgeClass } from './severity';
import type { EnrichedVulnerability } from './types';

interface FindingCardProps {
  finding: EnrichedVulnerability;
}

export function FindingCard({ finding }: FindingCardProps) {
  const analysis = finding.aiAnalysis;

  return (
    <Card size="sm" className={cn('border-l-4', severityAccentClass(analysis.severity))}>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase ${severityBadgeClass(analysis.severity)}`}
              >
                {analysis.severity}
              </span>
              <span className="text-sm font-semibold">
                {finding.type}
                {finding.parameter ? ` in "${finding.parameter}"` : ''}
              </span>
            </div>
            <p className="text-muted-foreground font-mono text-xs break-all">{finding.url}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{analysis.cwe}</Badge>
            <Badge variant="secondary">CVSS {analysis.cvss}</Badge>
          </div>
        </div>

        <div className="bg-muted/40 rounded-lg border p-3">
          <MetaField label="Evidence / proof">
            <p className="font-mono text-xs break-all">{finding.evidence}</p>
          </MetaField>
          {finding.payload ? (
            <p className="mt-2 font-mono text-xs text-amber-600 dark:text-amber-400">
              Injected payload: {finding.payload}
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <MetaField label="Impact analysis">
            <p className="text-muted-foreground leading-relaxed">{analysis.impact}</p>
          </MetaField>
          <MetaField label="Remediation guidance">
            <p className="text-muted-foreground leading-relaxed">{analysis.remediation}</p>
          </MetaField>
        </div>

        {analysis.recommendationCode ? (
          <div className="bg-muted/40 rounded-lg border p-3">
            <MetaField label="Recommended fix pattern">
              <pre className="overflow-x-auto font-mono text-xs">{analysis.recommendationCode}</pre>
            </MetaField>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
