'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { EditorSideNav } from '@/components/editor/EditorSideNav';
import { SignatureBox } from '@/components/ui/SignatureBox';
import { useAuth } from '@/lib/auth-context';
import { resolveFormTitle } from '@/lib/mock-data';

interface FormValues {
  firstName: string;
  lastName: string;
  studentId: string;
  email: string;
  phone: string;
}

const EMPTY_VALUES: FormValues = { firstName: '', lastName: '', studentId: '', email: '', phone: '' };
const REQUIRED_FIELDS: (keyof FormValues)[] = ['firstName', 'lastName', 'studentId', 'email', 'phone'];

/**
 * The static Hostel Application-shaped demo used for the pre-seeded template cards on Home/My
 * Forms — those don't have a real extracted field schema, so this stands in as a preview of the
 * editor UX. Uploading your own PDF goes through DynamicFormEditor instead.
 */
export function MockFormEditor({ formId }: { formId: string }) {
  const title = resolveFormTitle(formId);
  const { user } = useAuth();

  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [autoFilled, setAutoFilled] = useState(false);
  const [signature, setSignature] = useState('');
  const [saved, setSaved] = useState(false);

  const filledRequired = REQUIRED_FIELDS.filter((key) => values[key].trim().length > 0).length;
  const totalFields = REQUIRED_FIELDS.length + 1; // + signature
  const progress = Math.round(((filledRequired + (signature.trim() ? 1 : 0)) / totalFields) * 100);
  const fullName = `${values.firstName} ${values.lastName}`.trim();

  function updateField(key: keyof FormValues, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleAutoFill() {
    const profile = user?.primaryProfile;
    const [first, ...rest] = (profile?.fullName ?? '').split(' ');
    setValues({
      firstName: first ?? '',
      lastName: rest.join(' '),
      studentId: profile?.matricNumber ?? '',
      email: profile?.email ?? user?.email ?? '',
      phone: profile?.phone ?? '',
    });
    setSignature(profile?.fullName ?? '');
    setAutoFilled(true);
    setSaved(false);
  }

  function handleSaveProgress() {
    setSaved(true);
  }

  return (
    <main className="flex-1 w-full md:w-[calc(100%-20rem)] flex flex-col min-h-screen pb-24 md:pb-0 pt-16 md:pt-0 relative overflow-y-auto">
      <EditorSideNav progress={progress} onAutoFill={handleAutoFill} onSaveProgress={handleSaveProgress} saved={saved} />

      <div className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-lg py-lg md:py-xl flex flex-col items-center">
        <div className="w-full text-center mb-lg">
          <h2 className="font-headline-lg text-headline-lg text-on-background mb-base">{title}</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Page 1 of 1 &bull; Please fill out all required fields.
          </p>
        </div>

        <div className="w-full bg-surface-container-lowest rounded-lg shadow-card p-lg sm:p-xl relative overflow-hidden">
          <form className="relative z-10 space-y-md w-full" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-sm">
              <h3 className="font-headline-md text-headline-md text-primary mb-sm border-b border-surface-variant pb-2">
                Personal Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <Input
                  id="firstName"
                  label="First Name"
                  value={values.firstName}
                  onChange={(e) => updateField('firstName', e.target.value)}
                />
                <Input
                  id="lastName"
                  label="Last Name"
                  value={values.lastName}
                  onChange={(e) => updateField('lastName', e.target.value)}
                />
              </div>
              <Input
                id="studentId"
                label="Student ID"
                placeholder="e.g., S-12345678"
                value={values.studentId}
                onChange={(e) => updateField('studentId', e.target.value)}
              />
            </div>

            <div className="space-y-sm pt-md">
              <div className="flex items-center justify-between mb-sm border-b border-surface-variant pb-2">
                <h3 className="font-headline-md text-headline-md text-primary">Contact Details</h3>
                {autoFilled && (
                  <span className="inline-flex items-center gap-1 bg-tertiary-fixed text-on-tertiary-fixed-variant px-3 py-1 rounded-full font-label-sm text-label-sm shadow-sm">
                    <Icon name="auto_awesome" filled className="text-[14px]" />
                    Auto-filled
                  </span>
                )}
              </div>
              <Input
                id="email"
                type="email"
                label="University Email"
                value={values.email}
                onChange={(e) => updateField('email', e.target.value)}
              />
              <Input
                id="phone"
                type="tel"
                label="Phone Number"
                value={values.phone}
                onChange={(e) => updateField('phone', e.target.value)}
              />
            </div>

            <SignatureBox
              id="applicantSignature"
              label="Applicant Signature"
              value={signature}
              onChange={setSignature}
              suggestedName={fullName}
            />
          </form>
        </div>
      </div>
    </main>
  );
}
