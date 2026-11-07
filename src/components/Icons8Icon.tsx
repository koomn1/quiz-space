import React from 'react';

type Icons8Name =
  | 'document'
  | 'folder'
  | 'sparkles'
  | 'bolt'
  | 'chart'
  | 'target'
  | 'flame'
  | 'book'
  | 'trophy'
  | 'save'
  | 'brain'
  | 'cosmo'
  | 'bell'
  | 'star'
  | 'lock'
  | 'warning'
  | 'users'
  | 'globe'
  | 'pencil'
  | 'check';

const ICON_IDS: Record<Icons8Name, string> = {
  document: 'cGUQXpWT11Dw',
  folder: 'Us0gLlbSYM9k',
  sparkles: 'JqGay9KXwqhP',
  bolt: 'GtgqQIYSqT50',
  chart: 'nHu7dMNox1kB',
  target: 'nbBCL87roGNj',
  flame: '8uAtuJQJ4jhd',
  book: '39FLspc26r4c',
  trophy: 'kPENNmiEJv3b',
  save: 'Ygov9LJC2LzE',
  brain: 'pcD8bVCCf7dC',
  cosmo: 'cMi3MgUvbjxS',
  bell: 'z8yqcMdq4T2h',
  star: '8ggStxqyboK5',
  lock: 'AZ2LjCeHqRan',
  warning: 'flPDaHwgNdNn',
  users: 'aOANxyF4L9EF',
  globe: '8E6l9OTyeByt',
  pencil: 'ELPAgpGXIX9K',
  check: 'EjPKvil2xjmP',
};

interface Icons8IconProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  name: Icons8Name;
  size?: number;
}

export function Icons8Icon({ name, size = 24, className = '', alt = '', ...props }: Icons8IconProps) {
  const iconId = ICON_IDS[name];
  return (
    <img
      {...props}
      src={`https://img.icons8.com/?id=${iconId}&format=png&size=${size}`}
      width={size}
      height={size}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      className={`inline-block object-contain ${className}`}
      loading="lazy"
      decoding="async"
    />
  );
}

export type { Icons8Name };
