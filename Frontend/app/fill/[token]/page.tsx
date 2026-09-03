'use client';

import { use } from 'react';
import { DynamicSharedFillForm } from '@/components/fill/DynamicSharedFillForm';

/** Token-scoped, no-login view (brief section 2 & 7.3) — resolved live via GET /api/v1/fill/:token. */
export default function SharedFillPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  return <DynamicSharedFillForm token={token} />;
}
