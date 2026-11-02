import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { BackendStatusBadge } from './StatusIndicators';

interface DemoHeaderProps {
  backendOnline: boolean | null;
  onBack: () => void;
}

export function DemoHeader({ backendOnline, onBack }: DemoHeaderProps) {
  return (
    <header className="bg-background/85 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-6 py-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft />
            Dashboard
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-semibold">Stagehand AI Web Security Agent</h1>
              <Badge variant="outline">DEMO.md Engine (backend2)</Badge>
            </div>
            <p className="text-muted-foreground text-xs">
              Stagehand primitives: goto() · observe() · act() · extract() + 5 vulnerability detectors
            </p>
          </div>
        </div>
        <BackendStatusBadge online={backendOnline} />
      </div>
    </header>
  );
}
