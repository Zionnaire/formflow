import { Icon } from '@/components/ui/Icon';

export function DocumentPreview() {
  return (
    <div className="lg:col-span-8 bg-surface-container-lowest rounded-lg shadow-card p-md flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden group border border-surface-dim/30">
      <div className="w-[80%] h-full max-h-[600px] bg-white shadow-sm border border-surface-variant rounded-lg p-lg flex flex-col gap-sm relative opacity-90 transition-opacity group-hover:opacity-100">
        <div className="w-1/3 h-6 bg-surface-container-high rounded mb-md" />
        <div className="w-full h-3 bg-surface-container rounded" />
        <div className="w-full h-3 bg-surface-container rounded" />
        <div className="w-3/4 h-3 bg-surface-container rounded" />
        <div className="w-1/2 h-4 bg-surface-container-high rounded mt-md mb-sm" />
        <div className="grid grid-cols-2 gap-sm">
          <div className="h-10 bg-surface-container-low border border-surface-dim/50 rounded flex items-center px-sm">
            <div className="w-1/2 h-2 bg-on-surface-variant/30 rounded" />
          </div>
          <div className="h-10 bg-surface-container-low border border-surface-dim/50 rounded flex items-center px-sm">
            <div className="w-3/4 h-2 bg-on-surface-variant/30 rounded" />
          </div>
        </div>
        <div className="mt-auto pt-md border-t border-surface-variant flex justify-between items-end">
          <div className="w-1/4 h-2 bg-surface-container rounded" />
          <div className="w-1/3 h-16 border border-primary/30 border-dashed rounded flex items-center justify-center bg-surface-container-low text-primary/50 font-label-sm text-label-sm">
            Signed
          </div>
        </div>

        <div className="absolute inset-0 bg-background/20 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-lg">
          <button className="bg-surface-container-highest text-on-surface px-md py-sm rounded-full font-label-md text-label-md shadow-sm hover:shadow-md transition-all flex items-center gap-xs">
            <Icon name="zoom_in" /> View Fullscreen
          </button>
        </div>
      </div>
      <p className="absolute bottom-md text-on-surface-variant font-label-sm text-label-sm">Page 1 of 1</p>
    </div>
  );
}
