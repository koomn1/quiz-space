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
          relative flex items-center rounded-full border p-1 outline-none transition-all duration-300 backdrop-blur-md shadow-inner
          focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white
          dark:focus-visible:ring-offset-slate-950
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:brightness-105 active:scale-95'}
          ${checked
            ? 'border-primary/40 bg-gradient-to-r from-primary/25 to-primary-hover/30 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1),0_2px_8px_rgba(124,58,237,0.25)]'
            : 'border-slate-300/80 bg-slate-200/50 dark:border-slate-700/60 dark:bg-slate-800/40 shadow-inner'}
        `}
      >
        <span
          className={`
            ${currentSize.knob}
            absolute left-1 z-10 flex items-center justify-center rounded-full border shadow-md transition-all duration-300 ease-out backdrop-blur-sm
            ${checked
              ? 'border-white/40 bg-gradient-to-tr from-primary to-primary-hover text-white shadow-lg shadow-primary/35'
              : 'border-white/60 bg-white/90 text-slate-500 shadow-sm dark:border-slate-600/50 dark:bg-slate-800/90 dark:text-slate-400'}
          `}
          style={{ transform: `translateX(${checked ? currentSize.translate : 0}px)` }}
        >
          {checked ? <Check size={currentSize.iconSize - 2} className="stroke-[3]" /> : <X size={currentSize.iconSize - 2} className="stroke-[2.5]" />}
        </span>
      </button>
    </div>
  );
}
