'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { startupApiService } from '@/lib/startupApi';

type Company = {
  id: number;
  company_name: string;
  search_query?: string | null;
  search_timestamp?: string | null;
  requested_by_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  async function loadCompanies() {
    setLoading(true);
    setError(null);
    try {
      const data = await startupApiService.getMyCompanySearches(0, 100);
      const arr = Array.isArray(data) ? (data as Company[]) : [];

      // Sort by updated_at/search_timestamp/created_at desc
      arr.sort((a, b) => {
        const at =
          new Date(a.updated_at || a.search_timestamp || a.created_at || 0).getTime();
        const bt =
          new Date(b.updated_at || b.search_timestamp || b.created_at || 0).getTime();
        return bt - at;
      });

      setCompanies(arr);
    } catch (e: any) {
      setError(e?.message || 'Failed to load companies');
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCompanies();
  }, []);

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="mt-3 h-5 w-40 bg-gray-200 rounded animate-pulse" />
              <div className="mt-4 h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
              <div className="mt-6 h-8 w-28 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {companies.map((c) => {
          const lastTs =
            c.search_timestamp || c.updated_at || c.created_at || new Date().toISOString();
          return (
            <div
              key={c.id}
              className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-gray-500">Company</div>
                  <div className="text-lg font-semibold text-gray-900">{c.company_name}</div>
                </div>
                <span className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-indigo-50 text-indigo-700">
                  🏢
                </span>
              </div>

              {c.search_query && (
                <div className="mt-3 text-sm text-gray-600">
                  <span className="text-gray-500">Query:</span> {c.search_query}
                </div>
              )}
              <div className="mt-1 text-xs text-gray-400">
                Last searched: {new Date(lastTs).toLocaleString()}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  {c.requested_by_id ? `Requested by #${c.requested_by_id}` : '\u00A0'}
                </div>
                <Link
                  href={`/companies/${c.id}`}
                  className="text-sm text-indigo-700 font-medium hover:underline"
                >
                  View details →
                </Link>
              </div>
            </div>
          );
        })}
        {!companies.length && (
          <div className="col-span-full text-sm text-gray-500">
            No companies found for your account.
          </div>
        )}
      </div>
    );
  }, [companies, loading]);

  return (
    <div className="min-h-[70vh] bg-gray-50 p-6 rounded-lg">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Companies</h1>
          <p className="text-sm text-gray-500">Browse your tracked companies. Click to view details.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadCompanies}
            className="text-sm text-gray-700 border rounded-md px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <Link href="/startups/add" className="text-sm text-indigo-600 hover:underline">
            + Add Startup
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 border border-red-200 bg-red-50 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {content}
    </div>
  );
}