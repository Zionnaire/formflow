import { PageShell } from '@/components/layout/PageShell';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { MediaManager } from '@/components/profile/MediaManager';

export const metadata = { title: 'Media Manager - FormFlow' };

export default function MediaManagerPage() {
  return (
    <PageShell>
      <RequireAuth>
        <MediaManager />
      </RequireAuth>
    </PageShell>
  );
}
