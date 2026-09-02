interface LogoMarkProps {
  size?: number;
  className?: string;
}

/** The icon-only badge from the FormFlow logo — pairs with a "FormFlow" text label. */
export function LogoMark({ size = 28, className }: LogoMarkProps) {
  // eslint-disable-next-line @next/next/no-img-element -- local SVG, no need for next/image's raster pipeline
  return <img src="/logo-mark.svg" alt="" width={size} height={size} className={className} />;
}

interface LogoProps {
  height?: number;
  className?: string;
}

/** The full lockup (badge + wordmark + tagline) — best at larger sizes where the tagline stays legible. */
export function Logo({ height = 48, className }: LogoProps) {
  const width = Math.round((640 / 200) * height);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- local SVG, no need for next/image's raster pipeline
    <img src="/logo.svg" alt="FormFlow — Paperwork, sorted with care." width={width} height={height} className={className} />
  );
}
