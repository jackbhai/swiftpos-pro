import React, { useState, useEffect } from 'react';
import { cx } from '@/lib/format';
import { ImageOff, Package } from 'lucide-react';

interface Props {
  src?: string | null;
  alt?: string;
  className?: string;
  emojiClassName?: string;
  fallbackEmoji?: string;
}

export function isImageUrl(str?: string | null): boolean {
  if (!str || typeof str !== 'string') return false;
  const s = str.trim();
  return (
    s.startsWith('http://') ||
    s.startsWith('https://') ||
    s.startsWith('data:image/') ||
    s.startsWith('blob:') ||
    s.startsWith('./') ||
    s.startsWith('/')
  );
}

export default function ProductImage({
  src,
  alt = 'Product',
  className = 'w-full h-full object-cover',
  emojiClassName = 'text-2xl',
  fallbackEmoji = '📦',
}: Props) {
  const [hasError, setHasError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setHasError(false);
    setLoaded(false);
  }, [src]);

  const isImg = isImageUrl(src);

  if (isImg && !hasError && src) {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-xl bg-surface2/60 flex items-center justify-center">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center text-ink3 text-xs animate-pulse">
            <Package size={18} className="opacity-40" />
          </div>
        )}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setHasError(true)}
          className={cx(
            className,
            'transition-opacity duration-200',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      </div>
    );
  }

  // Text emoji or fallback
  const emojiDisplay = src && !isImg ? src : fallbackEmoji;

  return (
    <div className="flex h-full w-full items-center justify-center select-none">
      <span className={emojiClassName}>{emojiDisplay}</span>
    </div>
  );
}
