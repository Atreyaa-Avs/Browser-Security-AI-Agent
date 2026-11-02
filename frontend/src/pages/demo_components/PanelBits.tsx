import type { ReactNode } from 'react';
import { cn } from 'cn';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SectionCardProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: SectionCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {actions ? <div className="col-start-2 row-span-2 row-start-1 justify-self-end">{actions}</div> : null}
      </CardHeader>
      <CardContent className={cn('text-sm', contentClassName)}>{children}</CardContent>
    </Card>
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center',
        className
      )}
    >
      {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description ? (
          <p className="text-muted-foreground max-w-md text-sm text-balance">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

interface StatTileProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  valueClassName?: string;
}

export function StatTile({ label, value, hint, icon, valueClassName }: StatTileProps) {
  return (
    <div className="bg-card rounded-lg border p-3">
      <div className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium tracking-wide uppercase">
        {icon}
        {label}
      </div>
      <div className={cn('mt-1 text-2xl font-semibold tabular-nums', valueClassName)}>{value}</div>
      {hint ? <div className="text-muted-foreground mt-1 text-xs">{hint}</div> : null}
    </div>
  );
}

interface MetaFieldProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function MetaField({ label, children, className }: MetaFieldProps) {
  return (
    <div className={className}>
      <div className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">{label}</div>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}

export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('font-mono text-xs break-all', className)}>{children}</span>;
}
