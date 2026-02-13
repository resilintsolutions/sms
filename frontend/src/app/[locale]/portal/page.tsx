'use client';

import { useTranslations } from 'next-intl';

export default function StudentGuardianPortal() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-100 via-primary-50 to-violet-100 px-4 py-12">
      <div className="card-accent max-w-md border-t-teal-400 text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-2xl bg-gradient-to-br from-primary-500 to-teal-500 p-4 text-white shadow-lg">
            <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Student / Guardian Portal</h1>
        <p className="mt-2 text-sm text-slate-600">
          View profile, attendance, results, fees, and notices.
        </p>
        <p className="mt-4 rounded-xl bg-primary-50 px-4 py-3 text-xs text-slate-500">
          Login with student or guardian account to see linked students.
        </p>
      </div>
    </div>
  );
}
