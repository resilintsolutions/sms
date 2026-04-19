'use client';

import CommunityFeed from '@/components/community/CommunityFeed';
import { useCommunityEnabled } from '@/lib/useCommunityEnabled';
import { Globe } from 'lucide-react';

export default function ParentCommunityPage() {
  const { enabled, isLoading } = useCommunityEnabled();

  if (isLoading) {
    return <p className="p-8 text-slate-500">Loading…</p>;
  }

  if (!enabled) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Globe className="h-16 w-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-slate-700">Community is Disabled</h2>
        <p className="mt-2 text-sm text-slate-500 max-w-md">
          The community feature is currently turned off for your school. Please contact your administrator for more information.
        </p>
      </div>
    );
  }

  return (
    <CommunityFeed
      canPost={true}
      showCompetitions={true}
      title="School Community"
      accentClass="text-amber-700"
    />
  );
}
