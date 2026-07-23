import React from 'react';
import { LiquidGlassSwitch } from './LiquidGlassSwitch';

interface NeumorphismToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
}

export function NeumorphismToggle({ checked, onChange, size = 'sm' }: NeumorphismToggleProps) {
  return (
    <div className="flex items-center justify-center">
      <LiquidGlassSwitch 
        checked={checked} 
        onChange={onChange} 
        size={size}
      />
    </div>
  );
}

