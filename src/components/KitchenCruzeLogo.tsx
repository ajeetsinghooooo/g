import React, { useState } from 'react';

interface KitchenCruzeLogoProps {
  variant?: 'light' | 'dark' | 'symbolOnly';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  customLogoUrl?: string;
  className?: string;
  onClick?: () => void;
}

export const KitchenCruzeLogo: React.FC<KitchenCruzeLogoProps> = ({
  variant = 'dark',
  size = 'md',
  customLogoUrl,
  className = '',
  onClick,
}) => {
  const [imgError, setImgError] = useState(false);
  const isSymbolOnly = variant === 'symbolOnly';
  const isLight = variant === 'light';

  // Determine logo source: custom logo or official /logo.png with fallback to /logo.svg
  const logoSrc = customLogoUrl && customLogoUrl.trim().length > 0 ? customLogoUrl : '/logo.png';
  const finalSrc = imgError ? '/logo.svg' : logoSrc;

  // Badge Dimensions
  const badgeSizes = {
    sm: 'h-7 w-7 sm:h-8 sm:w-8 min-w-[1.75rem] sm:min-w-[2rem]',
    md: 'h-8 w-8 sm:h-10 sm:w-10 min-w-[2rem] sm:min-w-[2.5rem]',
    lg: 'h-10 w-10 sm:h-12 sm:w-12 min-w-[2.5rem] sm:min-w-[3rem]',
    xl: 'h-16 w-16 sm:h-20 sm:w-20 min-w-[4rem] sm:min-w-[5rem]',
  }[size];

  // Text Typography Scales
  const textClasses = {
    sm: { title: 'text-xs sm:text-base', subtitle: 'text-[8px] sm:text-[8.5px]' },
    md: { title: 'text-sm sm:text-xl', subtitle: 'text-[8.5px] sm:text-[9.5px]' },
    lg: { title: 'text-lg sm:text-2xl', subtitle: 'text-[10px] sm:text-[11px]' },
    xl: { title: 'text-xl sm:text-3xl', subtitle: 'text-xs' },
  }[size];

  if (isSymbolOnly) {
    return (
      <div
        id="kitchen-cruze-logo"
        onClick={onClick}
        className={`inline-flex items-center justify-center select-none ${onClick ? 'cursor-pointer group' : ''} ${className}`}
      >
        <img
          src={finalSrc}
          alt="Kitchen Cruze"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className={`${badgeSizes} rounded-full object-cover shadow-xs ring-1 ring-amber-500/20 bg-white group-hover:scale-105 transition-transform duration-200`}
        />
      </div>
    );
  }

  return (
    <div
      id="kitchen-cruze-logo"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 sm:gap-3 select-none ${onClick ? 'cursor-pointer group' : ''} ${className}`}
    >
      {/* Official Circular Logo Badge */}
      <div className="relative shrink-0 flex items-center justify-center">
        <img
          src={finalSrc}
          alt="Kitchen Cruze"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className={`${badgeSizes} rounded-full object-cover shadow-xs ring-1.5 ring-amber-500/30 bg-white group-hover:scale-105 transition-transform duration-200`}
        />
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col justify-center leading-none">
        <div className="flex items-center gap-1.5">
          <span
            className={`font-['Outfit',sans-serif] font-black tracking-wider ${textClasses.title} ${
              isLight ? 'text-white' : 'text-slate-900'
            }`}
          >
            KITCHEN
          </span>
          <span
            className={`font-['Outfit',sans-serif] font-black tracking-wide ${textClasses.title} text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600`}
          >
            CRUZE
          </span>
        </div>
        {size !== 'sm' && (
          <span
            className={`font-semibold tracking-[0.22em] uppercase mt-1 hidden sm:inline-block ${textClasses.subtitle} ${
              isLight ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Gourmet Kitchen
          </span>
        )}
      </div>
    </div>
  );
};
