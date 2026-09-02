'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell } from '@/components/layout/PageShell';
import { PhotoUploadField } from '@/components/profile/PhotoUploadField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { studentProfile, guardianProfile } from '@/lib/mock-data';

export default function ProfileSetupPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(studentProfile);
  const [guardian, setGuardian] = useState(guardianProfile);
  const [saving, setSaving] = useState(false);

  function handleSave() {
    setSaving(true);
    // TODO: PATCH /api/v1/auth/profile once the backend profile endpoint is wired up.
    setTimeout(() => {
      setSaving(false);
      router.push('/');
    }, 500);
  }

  return (
    <PageShell>
      <main className="flex-grow w-full max-w-4xl mx-auto px-margin py-xl flex flex-col gap-lg">
        <header className="mb-md">
          <h1 className="font-headline-lg text-headline-lg md:font-headline-lg-mobile md:text-headline-lg-mobile text-on-surface mb-xs">
            Profile Setup
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Let&apos;s get your details filled out once so you never have to type them again.
          </p>
        </header>

        <form
          className="space-y-xl"
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          <section className="bg-surface-container-lowest p-lg rounded-lg shadow-card border border-surface-container-highest">
            <h2 className="font-headline-md text-headline-md text-primary mb-md border-b border-surface-variant pb-2">
              Student Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
              <PhotoUploadField />
              <Input
                id="fullName"
                label="Full Name"
                placeholder="e.g. Jane Doe"
                value={profile.fullName}
                onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))}
              />
              <Input
                id="matricNumber"
                label="Matriculation Number"
                placeholder="e.g. MAT123456"
                value={profile.matricNumber}
                onChange={(e) => setProfile((p) => ({ ...p, matricNumber: e.target.value }))}
              />
              <Select
                id="department"
                label="Department"
                value={profile.department}
                onChange={(e) => setProfile((p) => ({ ...p, department: e.target.value }))}
              >
                <option value="">Select Department...</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Engineering">Engineering</option>
                <option value="Arts & Humanities">Arts &amp; Humanities</option>
              </Select>
              <Select
                id="level"
                label="Level / Year"
                value={profile.level}
                onChange={(e) => setProfile((p) => ({ ...p, level: e.target.value }))}
              >
                <option value="">Select Level...</option>
                <option value="100 Level (Freshman)">100 Level (Freshman)</option>
                <option value="200 Level (Sophomore)">200 Level (Sophomore)</option>
                <option value="300 Level (Junior)">300 Level (Junior)</option>
                <option value="400 Level (Senior)">400 Level (Senior)</option>
              </Select>
              <Input
                id="phone"
                type="tel"
                label="Phone Number"
                placeholder="+1 (555) 000-0000"
                value={profile.phone}
                onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
              />
              <Input
                id="email"
                type="email"
                label="Email Address"
                placeholder="jane@student.edu"
                value={profile.email}
                onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
              />
              <div className="md:col-span-2">
                <Input
                  id="dob"
                  type="date"
                  label="Date of Birth"
                  className="w-full md:w-1/2"
                  value={profile.dateOfBirth}
                  onChange={(e) => setProfile((p) => ({ ...p, dateOfBirth: e.target.value }))}
                />
              </div>
            </div>
          </section>

          <section className="bg-surface-container-low p-lg rounded-lg border border-surface-variant relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-secondary-fixed-dim opacity-20 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-2 mb-md">
              <Icon name="diversity_3" className="text-secondary text-2xl" />
              <h2 className="font-headline-md text-headline-md text-on-surface">Secondary Profile (Guardian / Sponsor)</h2>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mb-md">
              Often needed for emergency contacts or financial forms.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter bg-surface-container-lowest p-md rounded shadow-sm border border-outline-variant/30">
              <Input
                id="guardianName"
                label="Guardian Full Name"
                placeholder="e.g. John Doe"
                value={guardian.fullName}
                onChange={(e) => setGuardian((g) => ({ ...g, fullName: e.target.value }))}
              />
              <Input
                id="guardianRelation"
                label="Relationship"
                placeholder="e.g. Parent, Uncle"
                value={guardian.relationship}
                onChange={(e) => setGuardian((g) => ({ ...g, relationship: e.target.value }))}
              />
              <Input
                id="guardianPhone"
                type="tel"
                label="Guardian Phone"
                placeholder="+1 (555) 111-2222"
                value={guardian.phone}
                onChange={(e) => setGuardian((g) => ({ ...g, phone: e.target.value }))}
              />
              <Input
                id="guardianEmail"
                type="email"
                label="Guardian Email (Optional)"
                placeholder="john@example.com"
                value={guardian.email}
                onChange={(e) => setGuardian((g) => ({ ...g, email: e.target.value }))}
              />
            </div>
            <Button type="button" variant="text" className="mt-md flex items-center gap-2 py-2 px-4 rounded-lg hover:bg-surface-variant/50 text-secondary hover:text-primary">
              <Icon name="add_circle" className="text-lg" />
              Add Another Contact
            </Button>
          </section>

          <div className="flex flex-col sm:flex-row justify-end items-center gap-md pt-lg border-t border-surface-variant">
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="rounded-xl w-full sm:w-auto" disabled={saving}>
              <Icon name="save" className="text-sm" />
              {saving ? 'Saving…' : 'Save Profile'}
            </Button>
          </div>
        </form>
      </main>
    </PageShell>
  );
}
