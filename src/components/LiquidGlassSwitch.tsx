import React from 'react';
import { Check, X } from 'lucide-react';

interface LiquidGlassSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  ariaLabel?: string;
}

export function LiquidGlassSwitch({
  checked,
  onChange,
  className = '',
  size = 'md',
  id,
  disabled = false,
  ariaLabel,
}: LiquidGlassSwitchProps) {
  const sizes = {
    sm: { width: 'w-14', height: 'h-8', knob: 'w-6 h-6', translate: 24, iconSize: 12 },
    md: { width: 'w-24', height: 'h-12', knob: 'w-10 h-10', translate: 48, iconSize: 18 },
    lg: { width: 'w-32', height: 'h-16', knob: 'w-14 h-14', translate: 64, iconSize: 24 },
  };

  const currentSize = sizes[size] || sizes.md;

  return (
    <div className={`relative inline-flex items-center select-none ${className}`} id={id}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel || (checked ? 'Enabled' : 'Disabled')}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`
          ${currentSize.width} ${currentSize.height}
          relative flex items-center rounded-full border-2 p-1 outline-none transition-colors duration-200
          focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white
          dark:focus-visible:ring-offset-slate-950
          ${disabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer'}
          ${checked
            ? 'border-violet-500 bg-violet-100 dark:border-violet-400 dark:bg-violet-950/50'
            : 'border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-800'}
        `}
      >
        <span
          className={`
            ${currentSize.knob}
            absolute left-1 z-10 flex items-center justify-center rounded-full border shadow-sm transition-transform duration-200 ease-out
            ${checked
              ? 'border-violet-500 bg-violet-600 text-white dark:border-violet-300 dark:bg-violet-400 dark:text-slate-950'
              : 'border-slate-300 bg-white text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400'}
          `}
          style={{ transform: `translateX(${checked ? currentSize.translate : 0}px)` }}
        >
          {checked ? <Check size={currentSize.iconSize - 2} className="stroke-[3]" /> : <X size={currentSize.iconSize - 2} className="stroke-[2.5]" />}
        </span>
      </button>
    </div>
  );
}
