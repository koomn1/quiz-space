import React from 'react';
import { AlertTriangle, Image as ImageIcon, Loader2 } from 'lucide-react';

interface QuestionMediaProps {
  src?: string | null;
  alt: string;
  className?: string;
  containerClassName?: string;
  eager?: boolean;
  onError?: () => void;
}

export default function QuestionMedia({
  src,
  alt,
  className = '',
  containerClassName = '',
  eager = false,
  onError,
}: QuestionMediaProps) {
  const [isLoading, setIsLoading] = React.useState(Boolean(src));
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    setIsLoading(Boolean(src));
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return (
      <div className={`flex min-h-24 min-w-24 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-slate-400 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-500 ${containerClassName}`} role="status">
        {hasError ? <AlertTriangle className="h-7 w-7" aria-hidden="true" /> : <ImageIcon className="h-7 w-7" aria-hidden="true" />}
        {hasError && <span className="sr-only">تعذر تحميل الصورة</span>}
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${containerClassName}`}>
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-slate-100/80 text-indigo-500 backdrop-blur-[2px] dark:bg-slate-900/70" aria-hidden="true">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        referrerPolicy="no-referrer"
        className={`block h-auto max-w-full object-contain ${className}`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
          onError?.();
        }}
      />
    </div>
  );
}
