'use client';

/**
 * MaterialIcon — Google Material Symbols wrapper
 *
 * Uses the variable-weight "Material Symbols Outlined" font loaded
 * from Google Fonts. Provides a consistent <span> element with proper
 * CSS class and sizing.
 *
 * Usage:
 *   <MaterialIcon name="search" />
 *   <MaterialIcon name="star" className="text-amber-400" size="sm" />
 *   <MaterialIcon name="local_fire_department" size="lg" />
 */

type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

const sizeMap: Record<IconSize, string> = {
  xs: 'text-[14px]',
  sm: 'text-[16px]',
  md: 'text-[20px]',
  lg: 'text-[24px]',
  xl: 'text-[28px]',
  '2xl': 'text-[32px]',
  '3xl': 'text-[40px]',
};

interface MaterialIconProps {
  name: string;
  size?: IconSize;
  className?: string;
  fill?: boolean;
}

export function MaterialIcon({
  name,
  size = 'md',
  className = '',
  fill = false,
}: MaterialIconProps) {
  const fontVariation = fill
    ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0" }
    : { fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0" };

  return (
    <span
      className={`material-symbols-outlined leading-none select-none ${sizeMap[size]} ${className}`}
      style={fontVariation}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}

export default MaterialIcon;
