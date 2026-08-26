import React from 'react';
import { resolveProfileImageUrl } from '../constants/profileAssets';

interface ProfileAvatarProps {
  src?: string | null;
  alt?: string;
  fallback: string;
  className?: string;
  imageClassName?: string;
  eager?: boolean;
  fallbackClassName?: string;
}

export default function ProfileAvatar({
  src,
  alt = '',
  fallback,
  className = '',
  imageClassName = 'h-full w-full object-cover',
  eager = false,
  fallbackClassName = '',
}: ProfileAvatarProps) {
  const normalizedSource = React.useMemo(() => {
    const value = String(src || '').trim();
    return value ? resolveProfileImageUrl(value) : '';
  }, [src]);
  const [failedSource, setFailedSource] = React.useState<string | null>(null);
  const canUseSource = Boolean(normalizedSource) && failedSource !== normalizedSource;

  React.useEffect(() => {
    setFailedSource(null);
  }, [normalizedSource]);

  return (
    <div className={`overflow-hidden ${className}`}>
      {canUseSource ? (
        <img
          src={normalizedSource}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          className={imageClassName}
          onError={() => setFailedSource(normalizedSource)}
        />
      ) : (
        <span className={`flex h-full w-full items-center justify-center ${fallbackClassName}`} aria-label={alt}>
          {fallback}
        </span>
      )}
    </div>
  );
}
