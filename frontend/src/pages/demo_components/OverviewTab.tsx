import { Button } from '@/components/ui/button';
import { ShieldCheck } from 'lucide-react';
import { EmptyState } from './PanelBits';
import { ExecutiveSummaryCard } from './ExecutiveSummaryCard';
import { ReportSummaryCards } from './ReportSummaryCards';
import type { ScanReport, ScanStatus } from './types';

interface OverviewTabProps {
  report: ScanReport | null;
  status: ScanStatus;
  onRunFullAudit: () => void;
}

export function OverviewTab({ report, status, onRunFullAudit }: OverviewTabProps) {
  if (!report) {
    const isRunning = status === 'running';
    return (
      <EmptyState
        icon={<ShieldCheck className="size-8" />}
        title={isRunning ? 'Autonomous scan in progress…' : 'No full audit report yet'}
        description="Switch to Full audit mode and launch a scan to inspect security posture, run the 5 detectors, and receive AI remediation guidance."
        action={
          isRunning ? null : (
            <Button onClick={onRunFullAudit}>
              <ShieldCheck />
              Run full security audit
            </Button>
          )
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ReportSummaryCards report={report} />
      <ExecutiveSummaryCard report={report} />
    </div>
  );
}
