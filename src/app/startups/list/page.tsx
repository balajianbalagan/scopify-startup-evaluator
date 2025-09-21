'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { startupApiService } from '@/lib/startupApi';
import { FiMapPin, FiClock, FiUsers, FiDollarSign } from 'react-icons/fi';

interface ListItem {
  id: string;
  name: string;
  type: 'startup' | 'company';
  sector?: string;
  industry?: string;
  stage?: string;
  arr?: string;
  status?: string;
  location?: string;
  description?: string;
  founded_year?: number;
  funding_raised?: number;
  valuation?: number;
  employees?: number;
  is_unicorn?: boolean;
  search_timestamp?: string;
}

export default function StartupsListPage() {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'startups' | 'companies'>('all');
  const router = useRouter();

  // Generate random avatar using DiceBear API
  const getRandomAvatar = (name: string) => {
    const seed = name.toLowerCase().replace(/\s+/g, '');
    return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=6366f1&textColor=ffffff`;
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A';
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount}`;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [startups, companies] = await Promise.all([
        startupApiService.getStartups(query || undefined),
        startupApiService.getCompanies(query || undefined)
      ]);

      const startupItems: ListItem[] = startups.map(startup => ({
        id: `startup-${startup.id}`,
        name: startup.name,
        type: 'startup' as const,
        industry: startup.industry,
        stage: startup.funding_stage,
        arr: startup.arr ? formatCurrency(startup.arr) : undefined,
        status: startup.status,
        location: startup.location,
        description: startup.description,
        founded_year: startup.founded_year,
        funding_raised: startup.total_funding_raised,
        valuation: startup.total_valuation,
        employees: startup.number_of_employees,
        is_unicorn: startup.is_unicorn
      }));

      const companyItems: ListItem[] = companies.map(company => ({
        id: `company-${company.id}`,
        name: company.company_name,
        type: 'company' as const,
        sector: 'Research',
        search_timestamp: company.created_at,
        description: company.search_query
      }));

      setItems([...startupItems, ...companyItems]);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadData();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const filteredItems = items.filter(item => {
    if (filter === 'startups') return item.type === 'startup';
    if (filter === 'companies') return item.type === 'company';
    return true;
  });

  if (loading && items.length === 0) {
    return (
      <div className="min-h-[70vh] bg-gray-50 p-6 rounded-lg">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold">Find Startups & Companies</h1>
            <p className="text-sm text-gray-500 mt-1">
              Search & filter ingested data ({filteredItems.length} results)
            </p>
          </div>
          <div className="flex gap-3 items-center w-full sm:w-auto">
            {/* Filters */}
            <div className="flex bg-white border border-gray-300 rounded-lg overflow-hidden">
              {['all', 'startups', 'companies'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setFilter(mode as any)}
                  className={`px-4 py-2 text-sm font-medium transition ${filter === mode
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search..."
              className="border border-gray-300 rounded-md px-3 py-2 flex-1 sm:flex-none"
            />
            <Link
              href="/startups/add"
              className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              Add Startup
            </Link>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map(item => (
            <div
              key={item.id}
              className="bg-white rounded-2xl shadow hover:shadow-lg transition p-6 flex flex-col justify-between"
            >
              {/* Top: Header */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                    {item.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold truncate">{item.name}</h3>
                    <p className="text-sm text-gray-500 capitalize">{item.type === 'startup' ? item.industry : 'Research'}</p>
                  </div>
                </div>
                {item.stage && (
                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                    {item.stage}
                  </span>
                )}
              </div>

              {/* Middle: Stats + Description */}
              <div className="flex gap-6 mb-4 flex-wrap">
                {item.location && (
                  <div className="flex items-center gap-1 text-gray-600 text-sm">
                    <FiMapPin /> {item.location}
                  </div>
                )}
                {item.founded_year && (
                  <div className="flex items-center gap-1 text-gray-600 text-sm">
                    <FiClock /> {item.founded_year}
                  </div>
                )}
                {item.employees != null && (
                  <div className="flex items-center gap-1 text-gray-600 text-sm">
                    <FiUsers /> {item.employees}
                  </div>
                )}
                {item.arr && (
                  <div className="flex items-center gap-1 text-gray-600 text-sm">
                    <FiDollarSign /> {item.arr}
                  </div>
                )}
              </div>
              {item.description && (
                <p className="text-gray-700 text-sm mb-6 line-clamp-3">
                  {item.description}
                </p>
              )}

              {/* Bottom: Actions */}
              <div className="flex gap-3">
                <Link
                  href={`/${item.type === 'startup' ? 'startups' : 'companies'}/${item.id.split('-')[1]}`}
                  className="flex-1 text-center border border-indigo-600 text-indigo-600 px-3 py-2 rounded-lg hover:bg-indigo-50 transition"
                >
                  View Details
                </Link>
                <button className="flex-1 bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition">
                  {item.type === 'startup' ? 'Quick Compare' : 'Quick Analysis'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[70vh] bg-gray-50 p-6 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">⚠️ {error}</div>
          <button
            onClick={loadData}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] bg-gray-50 p-6 rounded-lg">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Find Startups & Companies</h1>
          <p className="text-sm text-gray-500">Search & filter ingested data ({filteredItems.length} results)</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <div className="flex rounded-lg border border-gray-300 bg-white overflow-hidden">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-2 text-sm font-medium ${filter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 hover:bg-gray-50'
                }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('startups')}
              className={`px-3 py-2 text-sm font-medium border-l border-gray-300 ${filter === 'startups'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 hover:bg-gray-50'
                }`}
            >
              Startups
            </button>
            <button
              onClick={() => setFilter('companies')}
              className={`px-3 py-2 text-sm font-medium border-l border-gray-300 ${filter === 'companies'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 hover:bg-gray-50'
                }`}
            >
              Companies
            </button>
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search startups & companies..."
            className="border border-gray-300 rounded-md px-3 py-2 min-w-0 sm:min-w-[200px]"
          />

          <Link
            href="/startups/add"
            className="inline-flex items-center justify-center px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 whitespace-nowrap"
          >
            Add Startup
          </Link>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            {query ? `No results found for "${query}"` : 'No data available'}
          </div>
          {!query && (
            <Link
              href="/startups/add"
              className="inline-flex items-center px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Add Your First Startup
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="group border border-gray-200 rounded-2xl bg-white p-5 shadow-sm hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <img
                    src={getRandomAvatar(item.name)}
                    alt={item.name}
                    className="h-14 w-14 rounded-xl border border-gray-300 bg-gray-50"
                  />
                  <span
                    className={`absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold text-white ${item.type === "startup" ? "bg-indigo-500" : "bg-emerald-500"
                      }`}
                  >
                    {item.type === "startup" ? "S" : "C"}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition">
                      {item.name}
                    </h3>
                    <div className="flex items-center gap-1">
                      {item.is_unicorn && (
                        <span className="text-yellow-500" title="Unicorn">
                          🦄
                        </span>
                      )}
                      {item.stage && (
                        <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                          {item.stage}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Meta Info */}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                    {item.industry && <span>🏷️ {item.industry}</span>}
                    {item.location && <span>📍 {item.location}</span>}
                    {item.founded_year && <span>📅 {item.founded_year}</span>}
                    {item.employees && <span>👥 {item.employees} employees</span>}
                    {item.arr && <span>💰 ARR {item.arr}</span>}
                  </div>

                  {/* Description */}
                  {item.description && (
                    <p className="mt-2 text-sm text-gray-500 line-clamp-2">{item.description}</p>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex items-center gap-2">
                    <Link
                      href={`/${item.type === "startup" ? "startups" : "companies"}/${item.id.split("-")[1]}`}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition"
                    >
                      View Details
                    </Link>
                    <button className="px-3 py-1.5 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition">
                      {item.type === "startup" ? "Quick Compare" : "Quick Analysis"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

          ))}
        </div>
      )}
    </div>
  );
}
