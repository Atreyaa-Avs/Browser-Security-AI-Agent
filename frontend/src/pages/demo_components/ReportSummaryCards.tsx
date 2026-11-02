import { Card, CardContent } from '@/components/ui/card';
import { Clock, FileWarning, Gauge, Route } from 'lucide-react';
import type { ScanReport } from './types';
import { gradeTextClass, severityTextClass } from './severity';

interface ReportSummaryCardsProps {
  report: ScanReport;
}

export function ReportSummaryCards({ report }: ReportSummaryCardsProps) {
  const { metrics } = report;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardContent className="flex items-center gap-4">
          <div className="bg-muted flex size-14 shrink-0 items-center justify-center rounded-full border text-xl font-bold">
            <span className={gradeTextClass(report.grade)}>{report.grade}</span>
          </div>
          <div>
            <div className="text-muted-foreground flex items-center gap-1 text-[11px] font-medium tracking-wide uppercase">
              <Gauge className="size-3" />
              Security score
            </div>
            <div className="text-2xl font-semibold tabular-nums">
              {report.securityScore}
              <span className="text-muted-foreground text-sm font-normal">/100</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="text-muted-foreground flex items-center gap-1 text-[11px] font-medium tracking-wide uppercase">
            <FileWarning className="size-3" />
            Discovered issues
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{metrics.totalVulnerabilities}</div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs">
            <span className={severityTextClass('critical')}>{metrics.severityCounts.critical} crit</span>
            <span className={severityTextClass('high')}>{metrics.severityCounts.high} high</span>
            <span className={severityTextClass('medium')}>{metrics.severityCounts.medium} med</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="text-muted-foreground flex items-center gap-1 text-[11px] font-medium tracking-wide uppercase">
            <Route className="size-3" />
            Pages explored
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{metrics.pagesVisited}</div>
          <div className="text-muted-foreground mt-1 text-xs">
            Endpoints: {metrics.endpointsDiscovered}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="text-muted-foreground flex items-center gap-1 text-[11px] font-medium tracking-wide uppercase">
            <Clock className="size-3" />
            Scan duration
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{report.durationSeconds}s</div>
          <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">Autonomous mode: completed</div>
        </CardContent>
      </Card>
    </div>
  );
}
