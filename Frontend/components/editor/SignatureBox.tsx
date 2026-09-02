'use client';

import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface SignatureBoxProps {
  signed: boolean;
  onSign: () => void;
}

/** Placeholder click-to-sign capture area — see brief section 9 on visual-vs-legal signature disclosure. */
export function SignatureBox({ signed, onSign }: SignatureBoxProps) {
  return (
    <div className="pt-lg">
      <label className="font-label-md text-label-md text-on-surface-variant ml-1 mb-xs block">Applicant Signature</label>
      <button
        type="button"
        onClick={onSign}
        className={cn(
          'w-full h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-colors group relative overflow-hidden',
          signed ? 'border-primary bg-primary-fixed/30' : 'border-outline-variant bg-surface-container hover:bg-surface-container-high',
        )}
      >
        {signed ? (
          <span className="font-body-lg text-body-lg text-primary italic">Alex Rivera</span>
        ) : (
          <>
            <Icon name="draw" className="text-outline group-hover:text-primary transition-colors text-[32px] mb-2" />
            <span className="font-body-md text-body-md text-outline group-hover:text-primary transition-colors">Click to Sign</span>
          </>
        )}
      </button>
      <p className="font-label-sm text-label-sm text-outline mt-1 ml-1">
        A visual signature for administrative convenience — not a legally binding e-signature.
      </p>
    </div>
  );
}
