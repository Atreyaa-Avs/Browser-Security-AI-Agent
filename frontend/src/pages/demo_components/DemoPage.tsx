import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { AttackSurfacesTab } from './AttackSurfacesTab';
import { DemoHeader } from './DemoHeader';
import { DemoTabBar } from './DemoTabBar';
import { LiveConsoleTab } from './LiveConsoleTab';
import { OverviewTab } from './OverviewTab';
import { ScanControlPanel } from './ScanControlPanel';
import { StagehandTab } from './StagehandTab';
import { VulnerabilitiesTab } from './VulnerabilitiesTab';
import { LOCAL_LAB_URL, type ScanMode, type TabKey } from './types';
import { useScanController } from './useScanController';

export default function DemoPage() {
  const navigate = useNavigate();
  const scan = useScanController();
  const [severityFilter, setSeverityFilter] = useState('all');
  const [detectorFilter, setDetectorFilter] = useState('all');

  const surfacesCount = useMemo(
    () => scan.endpoints.length || scan.stagehandOutput?.links.length || 0,
    [scan.endpoints.length, scan.stagehandOutput]
  );

  const runPreset = (url: string, mode?: ScanMode) => {
    scan.setTargetUrl(url);
    void scan.startScan({ url, mode });
  };

  const runLocalLab = () => runPreset(LOCAL_LAB_URL, 'stagehand-only');

  return (
    <div className="bg-background text-foreground min-h-screen">
      <DemoHeader backendOnline={scan.backendOnline} onBack={() => navigate('/')} />

      <main className="mx-auto max-w-[1400px] space-y-4 px-6 py-6">
        <ScanControlPanel
          targetUrl={scan.targetUrl}
          onTargetUrlChange={scan.setTargetUrl}
          scanMode={scan.scanMode}
          onScanModeChange={scan.setScanMode}
          maxPages={scan.maxPages}
          onMaxPagesChange={scan.setMaxPages}
          status={scan.status}
          step={scan.step}
          progress={scan.progress}
          onStart={() => void scan.startScan()}
          onStop={() => void scan.stopScan()}
          onPreset={runPreset}
        />

        <Tabs
          value={scan.activeTab}
          onValueChange={(value) => scan.setActiveTab(value as TabKey)}
          className="gap-4"
        >
          <DemoTabBar
            stagehandOutput={scan.stagehandOutput}
            findingsCount={scan.findings.length}
            surfacesCount={surfacesCount}
            logs={scan.logs}
          />

          <TabsContent value="stagehand">
            <StagehandTab
              output={scan.stagehandOutput}
              status={scan.status}
              onRunLocalLab={runLocalLab}
            />
          </TabsContent>

          <TabsContent value="overview">
            <OverviewTab
              report={scan.report}
              status={scan.status}
              onRunFullAudit={() => {
                scan.setScanMode('full');
                void scan.startScan({ mode: 'full' });
              }}
            />
          </TabsContent>

          <TabsContent value="vulns">
            <VulnerabilitiesTab
              findings={scan.findings}
              severityFilter={severityFilter}
              onSeverityFilterChange={setSeverityFilter}
              detectorFilter={detectorFilter}
              onDetectorFilterChange={setDetectorFilter}
              scanMode={scan.scanMode}
            />
          </TabsContent>

          <TabsContent value="surfaces">
            <AttackSurfacesTab
              endpoints={scan.endpoints}
              stagehandOutput={scan.stagehandOutput}
            />
          </TabsContent>

          <TabsContent value="logs">
            <LiveConsoleTab logs={scan.logs} onClear={scan.clearLogs} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
