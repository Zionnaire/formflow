import Image from 'next/image';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';

interface MediaCardProps {
  title: string;
  description: string;
  icon: string;
  previewSrc: string;
  previewAlt: string;
  previewClassName: string;
  primaryLabel: string;
  secondaryLabel?: string;
}

export function MediaCard({
  title,
  description,
  icon,
  previewSrc,
  previewAlt,
  previewClassName,
  primaryLabel,
  secondaryLabel,
}: MediaCardProps) {
  return (
    <div className="bg-surface-container-lowest/70 backdrop-blur rounded-lg p-lg flex flex-col items-center justify-center text-center group hover:shadow-floating shadow-card transition-shadow duration-300 border border-white/30">
      <div className="w-full flex justify-between items-start mb-md">
        <div className="text-left">
          <h2 className="font-headline-md text-headline-md text-on-surface">{title}</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">{description}</p>
        </div>
        <Icon name={icon} className="text-tertiary-container text-3xl" />
      </div>

      <div className={previewClassName}>
        <Image src={previewSrc} alt={previewAlt} fill className="object-cover" />
      </div>

      <div className="flex gap-sm w-full mt-md justify-center">
        <Button variant="primary" className="rounded-full">
          {primaryLabel}
        </Button>
        {secondaryLabel && (
          <Button variant="secondary" className="rounded-full">
            {secondaryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
