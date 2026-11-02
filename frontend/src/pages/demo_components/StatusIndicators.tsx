import type { ReactNode } from 'react';
import { cn } from 'cn';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Server, ServerOff } from 'lucide-react';
import type { ScanStatus } from './types';

const STATUS_VARIANT: Record<ScanStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  idle: 'outline',
  running: 'default',
  completed: 'secondary',
  failed: 'destructive',
  aborted: 'outline',
};

const STATUS_DOT: Record<ScanStatus, string> = {
  idle: 'bg-muted-foreground',
  running: 'bg-primary animate-pulse',
  completed: 'bg-emerald-500',
  failed: 'bg-destructive',
  aborted: 'bg-muted-foreground',
};

export function BackendStatusBadge({ online }: { online: boolean | null }) {
  const isOnline = online === true;
  return (
    <Badge variant={isOnline ? 'secondary' : 'outline'} className="gap-1.5">
      {online === null ? (
        <ServerOff className="size-3" />
      ) : isOnline ? (
        <Server className="size-3" />
      ) : (
        <ServerOff className="size-3" />
      )}
      <span
        className={cn(
          'size-1.5 rounded-full',
          isOnline ? 'bg-emerald-500' : online === null ? 'bg-muted-foreground' : 'bg-destructive'
        )}
      />
      {online === null ? 'Checking backend' : isOnline ? 'Backend2 online · 4001' : 'Backend2 offline'}
    </Badge>
  );
}

interface ScanProgressProps {
  status: ScanStatus;
  step: string;
  progress: number;
}

export function ScanProgress({ status, step, progress }: ScanProgressProps) {
  return (
    <div className="bg-muted/40 rounded-lg border p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn('size-2 shrink-0 rounded-full', STATUS_DOT[status])} />
          <Badge variant={STATUS_VARIANT[status]} className="uppercase">
            {status}
          </Badge>
          <span className="text-muted-foreground truncate">{step}</span>
        </div>
        <span className="font-semibold tabular-nums">{progress}%</span>
      </div>
      <Progress value={progress} />
    </div>
  );
}

export function InlineBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn('font-mono', className)}>
      {children}
    </Badge>
  );
}
