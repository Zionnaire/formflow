import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';

/**
 * Both the button and dropzone route to the demo editor for now — the real upload ->
 * hash-check -> extract-fields pipeline (brief section 7.1) isn't wired up yet.
 */
export function HeroUpload() {
  return (
    <section className="flex flex-col md:flex-row gap-lg items-center">
      <div className="w-full md:w-1/2 flex flex-col gap-md">
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-background">
          Tackle your paperwork with ease.
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-lg">
          Upload your university forms, PDFs, or applications. We&apos;ll help you fill them out automatically and
          seamlessly.
        </p>
        <div className="flex gap-4 mt-sm">
          <Link href="/forms/hostel-application/editor">
            <Button variant="primary" size="lg" className="rounded">
              <Icon name="upload_file" />
              Upload new form
            </Button>
          </Link>
        </div>
      </div>

      <Link href="/forms/hostel-application/editor" className="w-full md:w-1/2">
        <div className="shadow-card bg-surface-container-lowest rounded-lg p-lg flex flex-col items-center justify-center text-center border-2 border-dashed border-primary min-h-[300px] cursor-pointer hover:bg-surface-container-low transition-colors group">
          <div className="w-20 h-20 rounded-full bg-primary-container/20 flex items-center justify-center mb-md group-hover:scale-110 transition-transform">
            <Icon name="cloud_upload" className="text-primary text-4xl" />
          </div>
          <h3 className="font-headline-md text-headline-md text-on-background mb-xs">Drop your PDF here</h3>
          <p className="text-on-surface-variant font-body-md text-body-md">or click to browse files</p>
          <p className="text-on-surface-variant/70 text-sm mt-4">Supports PDF, DOCX (Max 10MB)</p>
        </div>
      </Link>
    </section>
  );
}
