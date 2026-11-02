import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Sparkles } from 'lucide-react';
import { downloadReport, type ReportFormat } from './reportExport';
import type { ScanReport } from './types';

interface ExecutiveSummaryCardProps {
  report: ScanReport;
}

const EXPORTS: { format: ReportFormat; label: string }[] = [
  { format: 'md', label: 'Markdown' },
  { format: 'json', label: 'JSON' },
];

export function ExecutiveSummaryCard({ report }: ExecutiveSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4" />
          AI executive briefing
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          {EXPORTS.map((item) => (
            <Button
              key={item.format}
              variant="outline"
              size="sm"
              onClick={() => downloadReport(report, item.format)}
            >
              <Download />
              Export {item.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <p className="bg-muted/40 text-muted-foreground rounded-lg border p-4 text-sm leading-relaxed whitespace-pre-line">
          {report.executiveSummary}
        </p>
      </CardContent>
    </Card>
  );
}

export { downloadReport };
