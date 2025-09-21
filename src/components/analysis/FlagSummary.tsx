// FlagsSummary.tsx
import { CompanyFlag, getActiveFlags } from "@/lib/flagService";
import { useState } from "react";

type Props = {
  companyName: string;
  flags: CompanyFlag[];
};

export default function FlagsSummary({ companyName, flags }: Props) {
  const unresolvedFlags = getActiveFlags(flags);
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-rose-50 border border-rose-200 shadow-sm text-sm font-medium text-rose-700 hover:bg-rose-100 transition"
      >
        <span className="font-semibold">{unresolvedFlags.length}</span>
        <span>flag{unresolvedFlags.length !== 1 ? "s" : ""} found</span>
        <span className="ml-2 inline-block transform transition-transform" style={{ transform: open ? "rotate(90deg)" : "" }}>
          ▶
        </span>
      </button>
      {open && (
        <ul className="mt-2 max-h-56 overflow-y-auto bg-rose-50 border border-rose-200 rounded-lg p-2 space-y-2">
          {unresolvedFlags.map((flag, idx) => (
            <li key={idx} className="text-xs flex flex-col p-2 border border-rose-100 rounded-md bg-white/70 hover:bg-rose-100/80">
              <span className="font-medium text-rose-900">{flag.flag_type.replace('_', ' ')}</span>
              <span className="text-rose-700">{flag.flag_description}</span>
              <span className="text-xs text-gray-500">Risk: {flag.risk_level}</span>
            </li>
          ))}
          {unresolvedFlags.length === 0 && (
            <li className="text-xs text-gray-500 italic">No unresolved flags</li>
          )}
        </ul>
      )}
    </div>
  );
}
