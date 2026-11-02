import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Image } from 'lucide-react';

interface StagehandScreenshotCardProps {
  screenshot: string;
}

export function StagehandScreenshotCard({ screenshot }: StagehandScreenshotCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Image className="size-4" />
          Stagehand headless viewport render
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-90 overflow-hidden rounded-lg border">
          <img src={screenshot} alt="Stagehand viewport" className="block h-auto w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
