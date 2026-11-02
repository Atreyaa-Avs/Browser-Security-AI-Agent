import { Badge } from '@/components/ui/badge';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bug, Gauge, Route, ScanEye, Terminal } from 'lucide-react';
import type { ScanLog, StagehandOutput } from './types';

interface DemoTabBarProps {
  stagehandOutput: StagehandOutput | null;
  findingsCount: number;
  surfacesCount: number;
  logs: ScanLog[];
}

export function DemoTabBar({ stagehandOutput, findingsCount, surfacesCount, logs }: DemoTabBarProps) {
  return (
    <TabsList variant="line" className="h-auto w-full justify-start gap-1 overflow-x-auto border-b p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <TabsTrigger value="stagehand">
        <ScanEye />
        Stagehand output
        {stagehandOutput ? <Badge variant="secondary">active</Badge> : null}
      </TabsTrigger>
      <TabsTrigger value="overview">
        <Gauge />
        Audit summary
      </TabsTrigger>
      <TabsTrigger value="vulns">
        <Bug />
        Vulnerabilities
        <Badge variant="outline">{findingsCount}</Badge>
      </TabsTrigger>
      <TabsTrigger value="surfaces">
        <Route />
        Attack surfaces
        <Badge variant="outline">{surfacesCount}</Badge>
      </TabsTrigger>
      <TabsTrigger value="logs">
        <Terminal />
        Live console
        <Badge variant="outline">{logs.length}</Badge>
      </TabsTrigger>
    </TabsList>
  );
}
