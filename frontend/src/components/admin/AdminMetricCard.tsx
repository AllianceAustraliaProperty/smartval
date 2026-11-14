import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface AdminMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  badgeText?: string;
  badgeVariant?: 'blue' | 'emerald' | 'amber' | 'slate';
}

export function AdminMetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  badgeText,
  badgeVariant = 'blue',
}: AdminMetricCardProps) {
  const badgeStyles = {
    blue: 'bg-blue-50 text-[#006ABE] border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
  }[badgeVariant];

  return (
    <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${badgeStyles}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div>
        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {value}
        </div>
        {subtitle && (
          <div className="flex items-center space-x-2 mt-1.5">
            {badgeText && (
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${badgeStyles}`}>
                {badgeText}
              </span>
            )}
            <span className="text-xs text-slate-500 font-medium">{subtitle}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminMetricCard;
