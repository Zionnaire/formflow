'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { SignatureBox } from '@/components/ui/SignatureBox';

interface GuarantorValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  relationship: string;
  employmentStatus: string;
  annualIncome: string;
}

const EMPTY_VALUES: GuarantorValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  relationship: '',
  employmentStatus: '',
  annualIncome: '',
};

export function SharedFillForm({ studentName }: { studentName: string }) {
  const [values, setValues] = useState(EMPTY_VALUES);
  const [signature, setSignature] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const fullName = `${values.firstName} ${values.lastName}`.trim();

  function update<K extends keyof GuarantorValues>(key: K, value: GuarantorValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  if (submitted) {
    return (
      <main className="w-full max-w-3xl bg-surface-container-lowest rounded-lg shadow-card p-margin md:p-lg flex flex-col items-center text-center gap-md">
        <div className="w-16 h-16 rounded-full bg-primary-container/20 flex items-center justify-center">
          <Icon name="check_circle" filled className="text-primary text-4xl" />
        </div>
        <h2 className="font-headline-md text-headline-md text-on-surface">Section submitted</h2>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
          Thanks — your guarantor details for {studentName}&apos;s application have been recorded. You can close this
          page.
        </p>
      </main>
    );
  }

  return (
    <main className="w-full max-w-3xl bg-surface-container-lowest rounded-lg shadow-card p-margin md:p-lg">
      <form
        className="flex flex-col gap-lg"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
      >
        <section className="flex flex-col gap-md">
          <div className="flex items-center gap-sm border-b border-surface-variant pb-base">
            <Icon name="person" className="text-secondary" />
            <h3 className="font-headline-md text-headline-md text-on-surface">Guarantor Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
            <Input
              id="firstName"
              label="First Name"
              placeholder="e.g., Robert"
              required
              value={values.firstName}
              onChange={(e) => update('firstName', e.target.value)}
            />
            <Input
              id="lastName"
              label="Last Name"
              placeholder="e.g., Jenkins"
              required
              value={values.lastName}
              onChange={(e) => update('lastName', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
            <Input
              id="email"
              type="email"
              label="Email Address"
              placeholder="robert@example.com"
              required
              value={values.email}
              onChange={(e) => update('email', e.target.value)}
            />
            <Input
              id="phone"
              type="tel"
              label="Phone Number"
              placeholder="(555) 123-4567"
              required
              value={values.phone}
              onChange={(e) => update('phone', e.target.value)}
            />
          </div>
          <Select
            id="relationship"
            label="Relationship to Student"
            required
            value={values.relationship}
            onChange={(e) => update('relationship', e.target.value)}
          >
            <option value="" disabled>
              Select relationship...
            </option>
            <option value="parent">Parent</option>
            <option value="guardian">Legal Guardian</option>
            <option value="relative">Other Relative</option>
            <option value="other">Other</option>
          </Select>
        </section>

        <section className="flex flex-col gap-md">
          <div className="flex items-center gap-sm border-b border-surface-variant pb-base">
            <Icon name="account_balance" className="text-secondary" />
            <h3 className="font-headline-md text-headline-md text-on-surface">Financial Details</h3>
          </div>
          <Select
            id="employmentStatus"
            label="Employment Status"
            required
            value={values.employmentStatus}
            onChange={(e) => update('employmentStatus', e.target.value)}
          >
            <option value="" disabled>
              Select status...
            </option>
            <option value="employed">Employed Full-Time</option>
            <option value="self">Self-Employed</option>
            <option value="retired">Retired</option>
            <option value="other">Other</option>
          </Select>
          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="annualIncome">
              Approximate Annual Income
            </label>
            <div className="relative">
              <span className="absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant font-body-md text-body-md">
                $
              </span>
              <input
                id="annualIncome"
                type="number"
                required
                placeholder="75,000"
                value={values.annualIncome}
                onChange={(e) => update('annualIncome', e.target.value)}
                className="bg-surface-container-low border border-outline-variant rounded px-md py-sm pl-[40px] font-body-md text-body-md text-on-surface focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-colors w-full"
              />
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-md">
          <div className="flex items-center gap-sm border-b border-surface-variant pb-base">
            <Icon name="draw" className="text-secondary" />
            <h3 className="font-headline-md text-headline-md text-on-surface">Guarantor Signature</h3>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">
            By signing below, you agree to act as a guarantor for {studentName} for the duration of the lease
            agreement.
          </p>
          <SignatureBox id="guarantorSignature" label="Your Signature" value={signature} onChange={setSignature} suggestedName={fullName} />
        </section>

        <div className="flex justify-end mt-sm pt-md border-t border-surface-variant">
          <Button type="submit" variant="primary" className="rounded-full shadow-card" disabled={!signature.trim()}>
            <Icon name="send" />
            Submit My Section
          </Button>
        </div>
      </form>
    </main>
  );
}
