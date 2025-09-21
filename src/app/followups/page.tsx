// src/app/followups/page.tsx
'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { GroupedFlags, CompanyFlag,startupApiService } from '@/lib/startupApi';

type FilterStatus = 'all' | 'raised' | 'resolved' | 'cancelled';
type RiskLevel = 'all' | 'low' | 'medium' | 'high';
type CompanyFilter = 'all' | 'with-flags' | 'no-flags';

export default function FollowupsPage() {
  const [groupedFlags, setGroupedFlags] = useState<GroupedFlags[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('raised'); // Default to only raised
  const [riskFilter, setRiskFilter] = useState<RiskLevel>('all');
  const [companyFilter, setCompanyFilter] = useState<CompanyFilter>('all');
  const [expandedCompanies, setExpandedCompanies] = useState<Set<number>>(new Set());

  useEffect(() => {
    startupApiService.getGroupedFlags()
      .then(setGroupedFlags)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredData = groupedFlags
    .map(item => ({
      ...item,
      flags: item.flags.filter(flag => {
        const statusMatch = statusFilter === 'all' || flag.status === statusFilter;
        const riskMatch = riskFilter === 'all' || flag.risk_level === riskFilter;
        return statusMatch && riskMatch;
      })
    }))
    .filter(item => {
      if (companyFilter === 'with-flags') return item.flags.length > 0;
      if (companyFilter === 'no-flags') return item.flags.length === 0;
      return true;
    });

  const totalFlags = filteredData.reduce((acc, item) => acc + item.flags.length, 0);
  const companiesWithFlags = filteredData.filter(item => item.flags.length > 0).length;

  const toggleCompany = (companyId: number) => {
    setExpandedCompanies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(companyId)) {
        newSet.delete(companyId);
      } else {
        newSet.add(companyId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    const allCompanyIds = filteredData.map(item => item.company.id);
    setExpandedCompanies(new Set(allCompanyIds));
  };

  const collapseAll = () => {
    setExpandedCompanies(new Set());
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] bg-gray-50 p-6 rounded-lg flex items-center justify-center">
        <div className="text-gray-500">Loading follow-ups...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[70vh] bg-gray-50 p-6 rounded-lg">
        <div className="text-red-600 text-center">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] bg-gray-50 p-6 rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Follow-ups</h1>
          <p className="text-sm text-gray-500">Outstanding diligence tasks & reminders</p>
          <div className="mt-2 flex gap-4 text-sm">
            <span className="text-gray-600">
              {totalFlags} total flags across {companiesWithFlags} companies
            </span>
          </div>
        </div>
        <Link href="/startups/list" className="text-sm text-indigo-600 hover:text-indigo-800">
          Cancel
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex flex-wrap gap-6 items-center">
          <div className="flex gap-2 items-center">
            <label className="text-sm font-medium text-gray-700">Company:</label>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value as CompanyFilter)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Companies</option>
              <option value="with-flags">With Flags Only</option>
              <option value="no-flags">No Flags Only</option>
            </select>
          </div>

          <div className="flex gap-2 items-center">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All</option>
              <option value="raised">Raised</option>
              <option value="resolved">Resolved</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div className="flex gap-2 items-center">
            <label className="text-sm font-medium text-gray-700">Risk Level:</label>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as RiskLevel)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Expand/Collapse All */}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={expandAll}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Expand All
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={collapseAll}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* Company Cards */}
      <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
        {filteredData.map((item) => (
          <CompanyCard 
            key={item.company.id} 
            data={item} 
            isExpanded={expandedCompanies.has(item.company.id)}
            onToggle={() => toggleCompany(item.company.id)}
          />
        ))}
        
        {filteredData.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No companies match the current filters
          </div>
        )}
      </div>
    </div>
  );
}

function CompanyCard({ 
  data, 
  isExpanded, 
  onToggle 
}: { 
  data: GroupedFlags; 
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { company, flags } = data;
  const hasFlags = flags.length > 0;

  return (
    <div className={`bg-white border rounded-lg shadow-sm overflow-hidden ${hasFlags ? 'border-amber-200' : 'border-green-200'}`}>
      {/* Header - Clickable */}
      <div 
        className={`p-4 cursor-pointer hover:opacity-90 transition-opacity ${hasFlags ? 'bg-amber-50' : 'bg-green-50'}`}
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {hasFlags && (
                <span className="transform transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(90deg)' : '' }}>
                  ▶
                </span>
              )}
              <h3 className="font-semibold text-gray-900">{company.company_name}</h3>
            </div>
            {company.pitchdeck_url && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Has Pitch Deck
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasFlags ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
                {flags.length} flag{flags.length !== 1 ? 's' : ''}
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                ✓ No flags found
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Flags List - Collapsible */}
      {hasFlags && isExpanded && (
        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {flags.map((flag) => (
            <FlagItem key={flag.id} flag={flag} />
          ))}
        </div>
      )}

      {/* Show first few flags when collapsed */}
      {hasFlags && !isExpanded && flags.length > 0 && (
        <div className="p-4 bg-gray-50 border-t">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{flags[0].flag_description}</span>
            {flags.length > 1 && (
              <span className="text-gray-500"> +{flags.length - 1} more...</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FlagItem({ flag }: { flag: CompanyFlag }) {
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'raised': return 'bg-red-100 text-red-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getRiskColor(flag.risk_level)}`}>
              {flag.risk_level}
            </span>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(flag.status)}`}>
              {flag.status}
            </span>
            <span className="text-xs text-gray-500">
              {flag.flag_type.replace('_', ' ')}
            </span>
          </div>
          <p className="text-sm text-gray-900 font-medium">{flag.flag_description}</p>
          <p className="text-xs text-gray-500 mt-1">
            Created: {new Date(flag.created_at).toLocaleDateString()}
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200 transition-colors"
            onClick={() => console.log('Resolve flag', flag.id)}
          >
            Resolve
          </button>
          <button
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            onClick={() => console.log('Cancel flag', flag.id)}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
