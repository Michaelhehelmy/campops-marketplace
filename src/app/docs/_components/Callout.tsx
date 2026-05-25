import { AlertTriangle, Info, Lightbulb, XCircle } from 'lucide-react';

interface CalloutProps {
  type?: 'info' | 'warning' | 'tip' | 'danger';
  title?: string;
  children: React.ReactNode;
}

const styles: Record<string, { icon: React.ReactNode; bg: string; border: string; text: string }> = {
  info: {
    icon: <Info className="w-5 h-5 text-blue-500" />,
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-800 dark:text-blue-200',
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-800 dark:text-amber-200',
  },
  tip: {
    icon: <Lightbulb className="w-5 h-5 text-emerald-500" />,
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-800 dark:text-emerald-200',
  },
  danger: {
    icon: <XCircle className="w-5 h-5 text-red-500" />,
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-800 dark:text-red-200',
  },
};

export function Callout({ type = 'info', title, children }: CalloutProps) {
  const style = styles[type];

  return (
    <div className={`${style.bg} ${style.border} border-l-4 rounded-r-lg p-4 my-6`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">{style.icon}</span>
        <div>
          {title && <p className={`font-semibold mb-1 ${style.text}`}>{title}</p>}
          <div className={`text-sm ${style.text} opacity-90`}>{children}</div>
        </div>
      </div>
    </div>
  );
}
