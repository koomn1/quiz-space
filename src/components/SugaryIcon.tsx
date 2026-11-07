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

const UPLOADED_ICON_FILES: Record<SugaryIconName, string> = {
  home: 'icons8-browser-window-50.png',
  book: 'icons8-learning-50.png',
  sparkles: 'icons8-3d-purple-ai-star-100.png',
  'graduation-cap': 'icons8-learning-50.png',
  gift: 'icons8-gift-50.png',
  document: 'icons8-document-50.png',
  presentation: 'icons8-browser-window-50.png',
  trophy: 'icons8-trophy-50.png',
  bell: 'icons8-push-notifications-50.png',
  star: 'icons8-star-100.png',
  lock: 'icons8-shield-with-check-mark-100.png',
  globe: 'icons8-globe-icon-with-cursor-arrow,-internet-access-and-web-browsing-50.png',
  crown: 'icons8-3d-crown-100.png',
  layers: 'icons8-task-progress-tracking-50.png',
  coins: 'icons8-dollar-money-bag-50.png',
  'arrow-right': 'icons8-chevron-right-50.png',
  search: 'icons8-cursor-100.png',
  rocket: 'icons8-blue-rocket-with-flames,-startup-launch,-innovation-and-discovery-50.png',
};

interface SugaryIconProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  name: SugaryIconName;
  size?: number;
}

export function SugaryIcon({ name, size = 28, className = '', alt = '', ...props }: SugaryIconProps) {
  return (
    <img
      {...props}
      src={`${import.meta.env.BASE_URL}icons8/uploaded/${UPLOADED_ICON_FILES[name]}`}
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
