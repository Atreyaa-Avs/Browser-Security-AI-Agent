import { Button } from '@/components/ui/button';
import { ScanEye, Zap } from 'lucide-react';
import { EmptyState } from './PanelBits';
import { ExplorationTrail } from './ExplorationTrail';
import { ExtractedFormsList } from './ExtractedFormsList';
import { ObservedElementsTable } from './ObservedElementsTable';
import { StagehandScreenshotCard } from './StagehandScreenshotCard';
import { StagehandSummaryCard } from './StagehandSummaryCard';
import type { ScanStatus, StagehandOutput } from './types';

interface StagehandTabProps {
  output: StagehandOutput | null;
  status: ScanStatus;
  onRunLocalLab: () => void;
}

export function StagehandTab({ output, status, onRunLocalLab }: StagehandTabProps) {
  if (!output) {
    const isRunning = status === 'running';
    return (
      <EmptyState
        icon={<ScanEye className="size-8" />}
        title={isRunning ? 'Stagehand browser agent executing…' : 'Stagehand ready to test'}
        description={
          isRunning
            ? 'Stagehand is executing goto(), observe(), extract(), and capturing DOM telemetry.'
            : 'Launch Stagehand in a headless browser to navigate the page and inspect everything it observes and extracts.'
        }
        action={
          isRunning ? null : (
            <Button onClick={onRunLocalLab}>
              <Zap />
              Test Stagehand on local lab
            </Button>
          )
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <StagehandSummaryCard output={output} />

      <div className="grid gap-4 lg:grid-cols-2">
        {output.screenshot ? <StagehandScreenshotCard screenshot={output.screenshot} /> : null}
        <ExplorationTrail output={output} />
      </div>

      <ObservedElementsTable elements={output.interactiveElements ?? []} />
      <ExtractedFormsList forms={output.forms ?? []} />
    </div>
  );
}
