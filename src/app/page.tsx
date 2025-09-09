// src/app/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    // replace so the browser history doesn't keep this intermediate page
    router.replace('/startups/list');
  }, [router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8 bg-gray-50">
      <div className="text-center">
        <div className="mb-4 h-3 w-48 mx-auto rounded-full bg-gray-200 animate-pulse" />
        <div className="text-sm text-gray-500">Opening Startups list…</div>
      </div>
    </div>
  );
}
