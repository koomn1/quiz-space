import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption<T = string | number> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  description?: string;
  badge?: string;
}

export interface LiquidGlassSelectProps<T = string | number> {
  id?: string;
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  popoverClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  ariaLabel?: string;
  dir?: 'rtl' | 'ltr';
  leftIcon?: React.ReactNode;
}

export function LiquidGlassSelect<T extends string | number = string | number>({
  id,
  value,
  onChange,
  options,
  placeholder = 'اختر...',
  disabled = false,
  className = '',
  popoverClassName = '',
  size = 'md',
  ariaLabel,
  dir,
  leftIcon,
}: LiquidGlassSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const generatedId = useId();
  const selectId = id || generatedId;

  const selectedIndex = options.findIndex((opt) => opt.value === value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null;

  // Handle outside click to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Synchronize highlighted index when opening
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
  }, [isOpen, selectedIndex]);

  // Scroll active item into view when highlighted
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listboxRef.current) {
      const activeEl = listboxRef.current.children[highlightedIndex] as HTMLElement | undefined;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
        break;
      case 'Home':
        e.preventDefault();
        setHighlightedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setHighlightedIndex(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          onChange(options[highlightedIndex].value);
          setIsOpen(false);
        }
        break;
      case 'Escape':
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const sizeClasses = {
    sm: 'py-2 px-3 text-xs rounded-xl min-h-[38px]',
    md: 'py-2.5 px-4 text-xs sm:text-sm rounded-2xl min-h-[44px]',
    lg: 'py-3.5 px-5 text-sm sm:text-base rounded-2xl min-h-[52px]',
  }[size];

  return (
    <div
      ref={containerRef}
      className={`relative w-full text-right ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      dir={dir}
    >
      {/* Liquid Glass Trigger */}
      <button
        id={selectId}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        className={`group relative w-full flex items-center justify-between gap-2.5 transition-all duration-300 font-bold select-none outline-none
          backdrop-blur-xl border shadow-xs active:scale-[0.99]
          bg-white/80 hover:bg-white/95 dark:bg-slate-900/80 dark:hover:bg-slate-900/95
          border-slate-200/80 hover:border-violet-400/60 dark:border-white/10 dark:hover:border-violet-500/40
          text-slate-800 dark:text-slate-100
          focus-visible:ring-2 focus-visible:ring-violet-400/40 dark:focus-visible:ring-violet-500/40
          ${sizeClasses} ${className}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
          {leftIcon && <span className="shrink-0 text-violet-500 dark:text-violet-400">{leftIcon}</span>}
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className="truncate block font-extrabold text-slate-800 dark:text-slate-100">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-300 border border-violet-500/20">
              {selectedOption.badge}
            </span>
          )}
        </div>

        {/* Animated Chevron */}
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-slate-400 group-hover:text-violet-500 dark:group-hover:text-violet-400 transition-transform duration-300 ease-out ${
            isOpen ? 'rotate-180 text-violet-500 dark:text-violet-400 scale-110' : ''
          }`}
        />
      </button>

      {/* Liquid Glass Popover */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 mt-2 z-50 overflow-hidden rounded-2xl border
            backdrop-blur-2xl bg-white/95 dark:bg-slate-950/95
            border-white/80 dark:border-white/10
            shadow-2xl shadow-violet-500/10 dark:shadow-black/60
            animate-in fade-in-0 zoom-in-95 duration-200 origin-top ${popoverClassName}`}
          style={{
            maxHeight: '320px',
          }}
        >
          <ul
            ref={listboxRef}
            role="listbox"
            tabIndex={-1}
            aria-activedescendant={highlightedIndex >= 0 ? `${selectId}-opt-${highlightedIndex}` : undefined}
            className="p-1.5 space-y-1 overflow-y-auto max-h-[300px] scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800"
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isHighlighted = index === highlightedIndex;

              return (
                <li
                  key={String(option.value)}
                  id={`${selectId}-opt-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`group/item flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-xs sm:text-sm font-bold transition-all duration-150 select-none ${
                    isSelected
                      ? 'bg-violet-500/15 text-violet-900 dark:text-violet-200 border border-violet-500/25 shadow-xs'
                      : isHighlighted
                      ? 'bg-slate-100/90 dark:bg-slate-800/80 text-slate-900 dark:text-white'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {option.icon && (
                      <span className="shrink-0 text-base leading-none transition-transform duration-200 group-hover/item:scale-110">
                        {option.icon}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`truncate block ${isSelected ? 'font-black text-violet-700 dark:text-violet-300' : 'font-bold'}`}>
                          {option.label}
                        </span>
                        {option.badge && (
                          <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-300">
                            {option.badge}
                          </span>
                        )}
                      </div>
                      {option.description && (
                        <p className="text-[10px] font-medium leading-4 text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {option.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <span className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-violet-500 text-white shadow-xs animate-in zoom-in-75 duration-150">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
