import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DETECTOR_OPTIONS, SEVERITY_OPTIONS } from './severity';
import { EmptyState } from './PanelBits';
import { FindingCard } from './FindingCard';
import { Filter } from 'lucide-react';
import type { EnrichedVulnerability, ScanMode } from './types';

interface VulnerabilitiesTabProps {
  findings: EnrichedVulnerability[];
  severityFilter: string;
  onSeverityFilterChange: (value: string) => void;
  detectorFilter: string;
  onDetectorFilterChange: (value: string) => void;
  scanMode: ScanMode;
}

export function VulnerabilitiesTab({
  findings,
  severityFilter,
  onSeverityFilterChange,
  detectorFilter,
  onDetectorFilterChange,
  scanMode,
}: VulnerabilitiesTabProps) {
  const filteredFindings = useMemo(
    () =>
      findings.filter((finding) => {
        if (
          severityFilter !== 'all' &&
          finding.aiAnalysis.severity.toLowerCase() !== severityFilter
        ) {
          return false;
        }
        if (detectorFilter !== 'all' && !finding.type.toLowerCase().includes(detectorFilter.toLowerCase())) {
          return false;
        }
        return true;
      }),
    [detectorFilter, findings, severityFilter]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-muted-foreground text-xs">Severity</Label>
          <Select value={severityFilter} onValueChange={(value) => value && onSeverityFilterChange(value)}>
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEVERITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-muted-foreground text-xs">Detector</Label>
          <Select value={detectorFilter} onValueChange={(value) => value && onDetectorFilterChange(value)}>
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DETECTOR_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Badge variant="outline" className="ml-auto">
          <Filter className="size-3" />
          Showing {filteredFindings.length} of {findings.length}
        </Badge>
      </div>

      {filteredFindings.length === 0 ? (
        <EmptyState
          title="No findings to display"
          description={
            scanMode === 'stagehand-only'
              ? 'Currently in Stagehand-only mode. Switch to Full audit to run the 5 detectors and AI analysis.'
              : 'No findings match the selected filter criteria.'
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filteredFindings.map((finding) => (
            <FindingCard key={finding.id} finding={finding} />
          ))}
        </div>
      )}
    </div>
  );
}
