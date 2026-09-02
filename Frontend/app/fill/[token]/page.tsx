import { LogoMark } from '@/components/ui/Logo';
import { SharedFillForm } from '@/components/fill/SharedFillForm';

/**
 * Token-scoped, no-login view (brief section 2 & 7.3). In the real flow the token resolves
 * via GET /api/v1/fill/:token to a specific submission section and student name — here it's
 * a fixed demo student since Share resolution isn't wired to the frontend yet.
 */
export default async function SharedFillPage({ params }: { params: Promise<{ token: string }> }) {
  await params;
  const studentName = 'Sarah Jenkins';

  return (
    <div className="bg-background text-on-background antialiased min-h-screen flex flex-col items-center py-xl px-margin">
      <header className="w-full max-w-3xl mb-lg text-center flex flex-col items-center">
        <div className="flex items-center gap-2 mb-md text-primary">
          <LogoMark size={36} />
          <h1 className="font-headline-md text-headline-md font-bold">FormFlow</h1>
        </div>
        <h2 className="font-headline-lg text-headline-lg text-on-surface mb-base">
          Filling Guarantor Section for {studentName}
        </h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl mx-auto">
          {studentName.split(' ')[0]} has requested your help completing her Student Housing Application. Please
          provide the requested guarantor details below. This section is secure and will only be shared with the
          application reviewers.
        </p>
      </header>

      <SharedFillForm studentName={studentName} />

      <footer className="mt-xl text-center w-full max-w-3xl border-t border-surface-variant pt-lg">
        <p className="font-label-sm text-label-sm text-on-surface-variant">
          © {new Date().getFullYear()} FormFlow. Built for students with care.
        </p>
        <div className="flex justify-center gap-md mt-sm">
          <a href="#" className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors">
            Privacy Policy
          </a>
          <a href="#" className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors">
            Support
          </a>
        </div>
      </footer>
    </div>
  );
}
