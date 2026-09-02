import { PageShell } from '@/components/layout/PageShell';
import { HeroUpload } from '@/components/home/HeroUpload';
import { HowItWorks } from '@/components/home/HowItWorks';
import { SuccessStories } from '@/components/home/SuccessStories';
import { FeaturedTemplates } from '@/components/home/FeaturedTemplates';
import { FormLibrary } from '@/components/home/FormLibrary';
import { HelpBanner } from '@/components/home/HelpBanner';

export default function HomePage() {
  return (
    <PageShell>
      <main className="flex-grow w-full max-w-7xl mx-auto px-margin py-lg flex flex-col gap-xl">
        <HeroUpload />
        <HowItWorks />
        <SuccessStories />
        <FeaturedTemplates />
        <FormLibrary />
        <HelpBanner />
      </main>
    </PageShell>
  );
}
