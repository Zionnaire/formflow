'use client';

import { MediaCard } from '@/components/profile/MediaCard';
import { useAuth } from '@/lib/auth-context';

export function MediaManager() {
  const { user, refreshUser } = useAuth();

  return (
    <main className="flex-grow w-full max-w-7xl mx-auto px-margin py-lg md:py-xl grid grid-cols-1 md:grid-cols-12 gap-md md:gap-lg">
      <div className="col-span-1 md:col-span-12 mb-lg text-center md:text-left">
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-base">
          Media Manager
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
          Upload your passport photo and signature here. We&apos;ll securely use these to auto-fill and auto-sign
          your future applications, saving you time.
        </p>
      </div>

      <div className="col-span-1 md:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-lg">
        <MediaCard
          kind="photo"
          title="Passport Photo"
          description="Used for ID cards and official forms."
          icon="account_box"
          previewUrl={user?.mediaAssets.passportPhotoUrl}
          previewClassName="relative w-48 h-64 bg-surface-container-low rounded-lg border-2 border-dashed border-outline-variant overflow-hidden"
          emptyLabel="No photo yet"
          replaceLabel="Replace Photo"
          onUploaded={refreshUser}
        />
        <MediaCard
          kind="signature"
          title="Digital Signature"
          description="Auto-sign documents securely."
          icon="draw"
          previewUrl={user?.mediaAssets.signatureUrl}
          previewClassName="relative w-full h-48 bg-surface-container-low rounded-lg border-2 border-dashed border-primary overflow-hidden"
          emptyLabel="No signature yet"
          replaceLabel="Update Signature"
          onUploaded={refreshUser}
        />
      </div>
    </main>
  );
}
