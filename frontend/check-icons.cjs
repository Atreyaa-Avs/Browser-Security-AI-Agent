const l = require('lucide-react');
const names = [
  'ArrowLeft','ShieldCheck','Server','Terminal','ScanEye','Gauge','Bug','Route',
  'FileText','Search','MousePointerClick','Link2','Cookie','Play','Square',
  'Download','Trash2','Loader2','CircleAlert','CheckCircle2','CircleX','ListTree',
  'Clock','Layers','Filter','ExternalLink','Radar','Image','Activity',
];
console.log('missing:', names.filter((n) => !l[n]));
