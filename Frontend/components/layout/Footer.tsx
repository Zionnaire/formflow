import { LogoMark } from '@/components/ui/Logo';

const FOOTER_LINKS = ['Support', 'Privacy Policy', 'Student Guide'];

export function Footer() {
  return (
    <footer className="w-full py-lg px-margin flex flex-col md:flex-row justify-between items-center gap-md bg-surface-container-highest mt-auto">
      <div className="font-headline-md text-headline-md text-primary flex items-center gap-2">
        <LogoMark size={28} />
        FormFlow
      </div>
      <p className="font-body-md text-body-md text-on-surface-variant text-sm text-center md:text-left">
        © {new Date().getFullYear()} FormFlow. Built for students with care.
      </p>
      <nav className="flex gap-md font-label-sm text-label-sm">
        {FOOTER_LINKS.map((label) => (
          <a key={label} href="#" className="text-on-surface-variant hover:text-primary transition-colors">
            {label}
          </a>
        ))}
      </nav>
    </footer>
  );
}
