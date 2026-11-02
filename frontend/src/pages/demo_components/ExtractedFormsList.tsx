import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import type { ExtractedFormData } from './types';

interface ExtractedFormsListProps {
  forms: ExtractedFormData[];
}

export function ExtractedFormsList({ forms }: ExtractedFormsListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <FileText className="size-4" />
          Forms extracted via stagehand.extract()
        </CardTitle>
      </CardHeader>
      <CardContent>
        {forms.length === 0 ? (
          <p className="text-muted-foreground text-sm">No forms found on target page.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {forms.map((form, formIndex) => (
              <div key={`${form.selector}-${formIndex}`} className="bg-muted/40 space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={form.method === 'POST' ? 'default' : 'secondary'}>{form.method}</Badge>
                  <span className="text-muted-foreground truncate font-mono text-[11px]">
                    {form.selector}
                  </span>
                </div>
                <p className="text-muted-foreground font-mono text-xs break-all">Action: {form.action}</p>
                <div className="space-y-1 border-t pt-2">
                  <div className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                    Inputs ({form.inputs.length})
                  </div>
                  {form.inputs.map((input, inputIndex) => (
                    <div key={`${input.name}-${inputIndex}`} className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="font-mono">{input.name}</span>
                      <span className="text-muted-foreground">({input.type})</span>
                      {input.required ? (
                        <Badge variant="destructive">required</Badge>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
