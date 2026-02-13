import Link from 'next/link';
import { routing } from '@/i18n/routing';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <h1 className="text-2xl font-bold text-slate-800">404</h1>
      <p className="mt-2 text-slate-600">পৃষ্ঠা পাওয়া যায়নি / Page not found</p>
      <Link
        href={`/${routing.defaultLocale}/login`}
        className="mt-6 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
      >
        হোমে ফিরে যান / Go to Home
      </Link>
    </div>
  );
}
