import React from 'react';

export type SugaryIconName =
  | 'home'
  | 'book'
  | 'sparkles'
  | 'graduation-cap'
  | 'gift'
  | 'document'
  | 'presentation'
  | 'trophy'
  | 'bell'
  | 'star'
  | 'lock'
  | 'globe'
  | 'crown'
  | 'layers'
  | 'coins'
  | 'arrow-right'
  | 'search'
  | 'rocket';

interface SugaryIconProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  name: SugaryIconName;
  size?: number;
}

export function SugaryIcon({ name, size = 28, className = '', alt = '', ...props }: SugaryIconProps) {
  return (
    <img
      {...props}
      src={`${import.meta.env.BASE_URL}icons8/sugary/${name}.png`}
      width={size}
      height={size}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      className={`inline-block shrink-0 object-contain drop-shadow-[0_2px_3px_rgba(15,23,42,0.18)] ${className}`}
      loading="lazy"
      decoding="async"
    />
  );
}
