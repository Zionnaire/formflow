import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/ProgressBar';
import type { MyForm } from '@/lib/types';

export function FormCard({ form }: { form: MyForm }) {
  const isComplete = form.status === 'complete';

  return (
    <div className="bg-surface-container-lowest rounded-lg p-md shadow-card flex flex-col gap-sm relative overflow-hidden border border-transparent hover:border-outline-variant transition-colors">
      <div className="flex justify-between items-start mb-2">
        {isComplete ? (
          <div className="bg-primary-container text-on-primary-container px-3 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1">
            <Icon name="check_circle" className="text-[14px]" />
            Completed
          </div>
        ) : (
          <div className="bg-tertiary-fixed text-on-tertiary-fixed px-3 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1">
            <Icon name="edit_note" className="text-[14px]" />
            Draft
          </div>
        )}
        <span className="font-label-sm text-label-sm text-on-surface-variant">{form.dateLabel}</span>
      </div>

      <h3 className="font-headline-md text-headline-md text-on-surface">{form.templateTitle}</h3>
      <p className="font-body-md text-body-md text-on-surface-variant flex-grow">{form.description}</p>

      {!isComplete && (
        <div className="flex items-center gap-2 mt-4">
          <ProgressBar value={form.progress} className="flex-grow" />
          <span className="font-label-sm text-label-sm text-tertiary">{form.progress}%</span>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-surface-container-highest flex justify-between items-center">
        <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
          <Icon name={form.departmentIcon} className="text-[16px]" />
          {form.department}
        </span>
        {isComplete ? (
          <Link href={`/forms/${form.id}/review`} className="text-on-surface-variant font-label-md text-label-md flex items-center gap-1 hover:text-on-surface transition-colors">
            Download
            <Icon name="download" className="text-[18px]" />
          </Link>
        ) : (
          <Link href={`/forms/${form.id}/editor`} className="text-primary font-label-md text-label-md flex items-center gap-1 hover:text-surface-tint transition-colors">
            Resume
            <Icon name="arrow_forward" className="text-[18px]" />
          </Link>
        )}
      </div>
    </div>
  );
}
