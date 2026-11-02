import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Play, ShieldCheck, Square, Zap } from 'lucide-react';
import { ScanProgress } from './StatusIndicators';
import { MAX_PAGES_OPTIONS } from './severity';
import { LOCAL_LAB_URL, type ScanMode, type ScanStatus } from './types';

interface ScanControlPanelProps {
  targetUrl: string;
  onTargetUrlChange: (url: string) => void;
  scanMode: ScanMode;
  onScanModeChange: (mode: ScanMode) => void;
  maxPages: number;
  onMaxPagesChange: (pages: number) => void;
  status: ScanStatus;
  step: string;
  progress: number;
  onStart: () => void;
  onStop: () => void;
  onPreset: (url: string, mode?: ScanMode) => void;
}

const PRESETS = [
  { label: 'Acunetix VulnWeb', url: 'http://testphp.vulnweb.com' },
  { label: 'Zero WebApp', url: 'http://zero.webappsecurity.com' },
];

export function ScanControlPanel({
  targetUrl,
  onTargetUrlChange,
  scanMode,
  onScanModeChange,
  maxPages,
  onMaxPagesChange,
  status,
  step,
  progress,
  onStart,
  onStop,
  onPreset,
}: ScanControlPanelProps) {
  const isRunning = status === 'running';

  return (
    <section className="bg-card rounded-xl border p-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-muted-foreground text-xs">Execution Mode</Label>
            <ToggleGroup
              value={[scanMode]}
              onValueChange={(value) => {
                const next = value[0];
                if (next) onScanModeChange(next as ScanMode);
              }}
              variant="outline"
              size="sm"
              disabled={isRunning}
            >
              <ToggleGroupItem value="stagehand-only" aria-label="Stagehand only mode">
                <Zap />
                Stagehand only
              </ToggleGroupItem>
              <ToggleGroupItem value="full" aria-label="Full audit mode">
                <ShieldCheck />
                Full audit
              </ToggleGroupItem>
            </ToggleGroup>
            {scanMode === 'full' ? (
              <Badge variant="outline">5 detectors + AI</Badge>
            ) : (
              <Badge variant="outline">Explore & extract</Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-xs">Quick presets</span>
            <Button
              variant="outline"
              size="sm"
              disabled={isRunning}
              onClick={() => onPreset(LOCAL_LAB_URL, 'stagehand-only')}
            >
              <Zap />
              Local lab
            </Button>
            {PRESETS.map((preset) => (
              <Button
                key={preset.url}
                variant="ghost"
                size="sm"
                disabled={isRunning}
                onClick={() => onPreset(preset.url)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor="target-url" className="text-muted-foreground text-xs">
              Target URL
            </Label>
            <Input
              id="target-url"
              value={targetUrl}
              onChange={(event) => onTargetUrlChange(event.target.value)}
              placeholder="https://example.com"
              disabled={isRunning}
              className="h-9"
            />
          </div>

          {scanMode === 'full' ? (
            <div className="w-36 space-y-1.5">
              <Label className="text-muted-foreground text-xs">Max pages</Label>
              <Select
                value={maxPages}
                onValueChange={(value) => {
                  if (typeof value === 'number') onMaxPagesChange(value);
                }}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MAX_PAGES_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {isRunning ? (
            <Button variant="destructive" size="lg" onClick={onStop}>
              <Square />
              Abort execution
            </Button>
          ) : (
            <Button size="lg" onClick={onStart} disabled={!targetUrl}>
              {scanMode === 'full' ? <ShieldCheck /> : <Play />}
              {scanMode === 'full' ? 'Launch full audit' : 'Run Stagehand'}
            </Button>
          )}
        </div>

        {status !== 'idle' ? <ScanProgress status={status} step={step} progress={progress} /> : null}
      </div>
    </section>
  );
}
