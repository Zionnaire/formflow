import { Icon } from '@/components/ui/Icon';

export function PhotoUploadField() {
  return (
    <div className="md:col-span-2 mb-sm flex flex-col items-center justify-center p-md border-2 border-dashed border-outline-variant rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer group">
      <Icon name="person_add" className="text-outline text-4xl mb-2 group-hover:text-primary transition-colors" />
      <span className="font-label-md text-label-md text-on-surface-variant group-hover:text-primary transition-colors">
        Upload Profile Photo
      </span>
      <span className="font-label-sm text-label-sm text-outline mt-1">(Optional, but helpful)</span>
    </div>
  );
}
