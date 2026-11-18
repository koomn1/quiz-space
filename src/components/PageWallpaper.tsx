import React from 'react';

interface PageWallpaperProps {
  src: string;
  alt?: string;
  overlayClassName?: string;
  className?: string;
}

/**
 * High-performance fixed wallpaper for pages like Quiz Creator and Quiz Resolver.
 * The background image remains completely static (fixed) while the page content scrolls smoothly over it.
 * Includes a glassmorphic dark tone overlay to ensure optimal contrast and readability.
 */
export const PageWallpaper: React.FC<PageWallpaperProps> = ({
  src,
  alt = '',
  overlayClassName = 'bg-slate-950/80 dark:bg-[#031717]/85 backdrop-blur-[1.5px]',
  className = '',
}) => {
  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 -z-10 pointer-events-none select-none overflow-hidden ${className}`}
      style={{ willChange: 'transform' }}
    >
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover object-center scale-[1.02] transform-gpu"
        loading="eager"
        decoding="async"
        draggable={false}
      />
      {/* Contrast & Theme Ambient Overlay */}
      <div className={`absolute inset-0 transition-colors duration-300 ${overlayClassName}`} />
      {/* Subtle brand vignette at edges */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-black/60 pointer-events-none" />
    </div>
  );
};

export default PageWallpaper;
