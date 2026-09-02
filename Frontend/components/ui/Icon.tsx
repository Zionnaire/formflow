import { cn } from '@/lib/utils';

interface IconProps {
  name: string;
  filled?: boolean;
  className?: string;
}

/** Thin wrapper around the Material Symbols Outlined icon font used throughout FormFlow. */
export function Icon({ name, filled = false, className }: IconProps) {
  return (
    <span className={cn('material-symbols-outlined', filled && 'fill', className)} aria-hidden="true">
      {name}
    </span>
  );
}
