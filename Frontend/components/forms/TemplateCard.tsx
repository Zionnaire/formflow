import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import type { FormTemplateSummary } from '@/lib/types';

const ICON_TONE_CLASSES = {
  primary: 'bg-primary-container/20 text-primary',
  secondary: 'bg-secondary-container/20 text-secondary',
  tint: 'bg-surface-tint/10 text-surface-tint',
} as const;

export function TemplateCard({ template }: { template: FormTemplateSummary }) {
  return (
    <div className="bg-surface-container-lowest rounded-lg p-md shadow-card hover:shadow-floating transition-all flex flex-col gap-sm border border-transparent hover:border-primary-container/30">
      <div className="flex justify-between items-start">
        <div className={`w-12 h-12 rounded flex items-center justify-center ${ICON_TONE_CLASSES[template.iconTone]}`}>
          <Icon name={template.icon} filled />
        </div>
        {template.badge && <Badge tone={template.badgeTone}>{template.badge}</Badge>}
      </div>

      <div>
        <h3 className="font-label-md text-label-md text-on-background text-lg">{template.title}</h3>
        <p className="font-body-md text-body-md text-on-surface-variant text-sm mt-1">{template.description}</p>
      </div>

      <div className="mt-auto pt-4 flex justify-between items-center border-t border-surface-variant">
        <span className="text-on-surface-variant text-sm flex items-center gap-1">
          <Icon name="description" className="text-[16px]" />
          {template.pageCount} {template.pageCount === 1 ? 'Page' : 'Pages'}
        </span>
        <Link href={`/forms/${template.id}/editor`} className="text-primary font-label-md text-label-md hover:underline">
          Use Template
        </Link>
      </div>
    </div>
  );
}
