import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search } from 'lucide-react';
import type { ObservedElement } from './types';

interface ObservedElementsTableProps {
  elements: ObservedElement[];
}

export function ObservedElementsTable({ elements }: ObservedElementsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Search className="size-4" />
          Interactive elements discovered via stagehand.observe()
        </CardTitle>
        <div className="text-muted-foreground col-start-2 row-span-2 row-start-1 justify-self-end text-xs">
          {elements.length} elements
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-72">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tag / Type</TableHead>
                <TableHead>Name / ID</TableHead>
                <TableHead>Selector</TableHead>
                <TableHead>Text / Label</TableHead>
                <TableHead>Auth workflow</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {elements.map((element, index) => (
                <TableRow key={`${element.selector}-${index}`}>
                  <TableCell className="font-mono text-xs">
                    &lt;{element.tagName}&gt;{element.type ? ` [type="${element.type}"]` : ''}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {element.name || element.id || '—'}
                  </TableCell>
                  <TableCell className="max-w-70 truncate font-mono text-xs" title={element.selector}>
                    {element.selector}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-50 truncate">
                    {element.text || element.placeholder || '—'}
                  </TableCell>
                  <TableCell>
                    {element.isAuthRelated ? (
                      <Badge variant="destructive">Auth</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">No</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
