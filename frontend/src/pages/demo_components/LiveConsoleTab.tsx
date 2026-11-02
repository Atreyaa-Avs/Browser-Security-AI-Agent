import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Terminal, Trash2 } from 'lucide-react';
import { formatLogTime, logTextClass, logTypeLabel } from './severity';
import type { ScanLog } from './types';

interface LiveConsoleTabProps {
  logs: ScanLog[];
  onClear: () => void;
}

export function LiveConsoleTab({ logs, onClear }: LiveConsoleTabProps) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <Card size="sm" className="gap-0 py-0">
      <CardHeader className="bg-muted/40 border-b py-3">
        <CardTitle className="flex items-center gap-2 font-mono text-xs font-semibold">
          <Terminal className="size-4" />
          Stagehand execution stream (goto, observe, act, extract)
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onClear} disabled={logs.length === 0}>
          <Trash2 />
          Clear stream
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-125">
          <div className="space-y-1 p-4 font-mono text-xs leading-relaxed">
            {logs.length === 0 ? (
              <p className="text-muted-foreground italic">Waiting for Stagehand events…</p>
            ) : (
              logs.map((log, index) => (
                <div key={`${log.timestamp}-${index}`} className="break-all">
                  <span className="text-muted-foreground mr-2">{formatLogTime(log.timestamp)}</span>
                  <span className="text-muted-foreground mr-2">[{logTypeLabel(log)}]</span>
                  <span className={logTextClass(log.type)}>{log.message}</span>
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
