import { Icon } from '@/components/ui/Icon';

const STEPS = [
  {
    icon: 'upload_file',
    title: 'Upload or Select',
    description: 'Upload your own PDF or pick a template from our library.',
  },
  {
    icon: 'edit_note',
    title: 'Fill & Auto-sign',
    description: 'Type directly onto the form. Use your saved profile to auto-fill repetitive details.',
  },
  {
    icon: 'download_done',
    title: 'Download & Submit',
    description: 'Get your completed, professional PDF ready for printing or emailing.',
  },
];

export function HowItWorks() {
  return (
    <section className="bg-surface-container-low rounded-lg p-lg flex flex-col gap-lg shadow-card">
      <h2 className="font-headline-lg text-headline-lg text-on-background text-center">How it works</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
        {STEPS.map((step) => (
          <div key={step.title} className="flex flex-col items-center text-center gap-md">
            <div className="w-16 h-16 rounded-full bg-primary-container/20 flex items-center justify-center">
              <Icon name={step.icon} className="text-primary text-3xl" />
            </div>
            <div>
              <h3 className="font-headline-md text-headline-md text-on-background mb-xs">{step.title}</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
