import type { ScanLog } from './types';

export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
}

/** Flat, static Tailwind classes so the JIT compiler can see every variant. */
const SEVERITY_TEXT: Record<string, string> = {
  critical: 'text-red-600 dark:text-red-400',
  high: 'text-orange-600 dark:text-orange-400',
  medium: 'text-amber-600 dark:text-amber-400',
  low: 'text-sky-600 dark:text-sky-400',
  info: 'text-muted-foreground',
};

const SEVERITY_BADGE: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-600 dark:text-red-400',
  high: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  low: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  info: 'bg-muted text-muted-foreground',
};

const LOG_TEXT: Record<string, string> = {
  stagehand: 'text-sky-600 dark:text-sky-400',
  finding: 'text-red-600 dark:text-red-400',
  error: 'text-red-600 dark:text-red-400',
  success: 'text-emerald-600 dark:text-emerald-400',
  complete: 'text-emerald-600 dark:text-emerald-400',
  ai_query: 'text-violet-600 dark:text-violet-400',
  ai_analysis: 'text-violet-600 dark:text-violet-400',
  warn: 'text-amber-600 dark:text-amber-400',
};

const SEVERITY_ACCENT: Record<string, string> = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-amber-500',
  low: 'border-l-sky-500',
  info: 'border-l-border',
};

export function severityTextClass(severity: string): string {
  return SEVERITY_TEXT[severity.toLowerCase()] ?? SEVERITY_TEXT.info;
}

export function severityAccentClass(severity: string): string {
  return SEVERITY_ACCENT[severity.toLowerCase()] ?? SEVERITY_ACCENT.info;
}

export function severityBadgeClass(severity: string): string {
  return SEVERITY_BADGE[severity.toLowerCase()] ?? SEVERITY_BADGE.info;
}

export function gradeTextClass(grade?: string): string {
  switch (grade) {
    case 'A+':
    case 'A':
      return 'text-emerald-600 dark:text-emerald-400';
    case 'B':
      return 'text-sky-600 dark:text-sky-400';
    case 'C':
      return 'text-amber-600 dark:text-amber-400';
    case 'D':
      return 'text-orange-600 dark:text-orange-400';
    default:
      return 'text-red-600 dark:text-red-400';
  }
}

export function logTextClass(type: string): string {
  return LOG_TEXT[type] ?? 'text-muted-foreground';
}

export const SEVERITY_OPTIONS: SelectOption<string>[] = [
  { value: 'all', label: 'All Severities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export const DETECTOR_OPTIONS: SelectOption<string>[] = [
  { value: 'all', label: 'All Detectors (5 Modules)' },
  { value: 'xss', label: 'XSS' },
  { value: 'sql', label: 'SQL Injection' },
  { value: 'idor', label: 'IDOR' },
  { value: 'headers', label: 'Security Headers' },
  { value: 'cookies', label: 'Session Cookies' },
];

export const MAX_PAGES_OPTIONS: SelectOption<number>[] = [
  { value: 5, label: '5 pages' },
  { value: 8, label: '8 pages' },
  { value: 15, label: '15 pages' },
];

export function formatLogTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}

export function logTypeLabel(log: ScanLog): string {
  return log.type.toUpperCase();
}
