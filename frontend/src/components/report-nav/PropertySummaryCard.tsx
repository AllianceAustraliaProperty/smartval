'use client';

import React from 'react';
import { Bed, Bath, Car, Square, DollarSign, Building2 } from 'lucide-react';
import { Montserrat } from 'next/font/google';

const montserrat = Montserrat({ subsets: ['latin'] });

export interface PropertySummaryCardProps {
  propertyData?: {
    bedrooms?: number | string;
    bathrooms?: number | string;
    carSpaces?: number | string;
    buildingArea?: number | string;
    siteArea?: number | string;
    buildYear?: number | string;
    yearBuilt?: number | string;
    marketValue?: number | string;
    valuationDate?: string;
    valuationType?: string;
  };
  className?: string;
}

export const PropertySummaryCard: React.FC<PropertySummaryCardProps> = ({
  propertyData = {},
  className = '',
}) => {
  const formatCurrency = (val?: number | string) => {
    if (!val) return '-';
    const num = typeof val === 'string' ? parseFloat(val.replace(/[^0-9.-]+/g, '')) : val;
    if (isNaN(num)) return String(val);
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div
      className={`
        ${montserrat.className}
        bg-white rounded-[28px] border border-[#DCE5F2] p-8 md:p-10
        shadow-[0_4px_20px_rgba(0,0,0,0.03)] max-w-[1400px] w-full mx-auto mt-8
        ${className}
      `}
    >
      {/* Title */}
      <h3 className="text-2xl sm:text-[28px] font-black text-[#006ABE] tracking-tight mb-3">
        Property Summary
      </h3>

      {/* Bold Dark Divider Line matching wireframe */}
      <div className="h-[2px] bg-black/80 w-full mb-6" />

      {/* 6 Key Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Bedrooms */}
        <div className="flex items-center space-x-3.5 p-3.5 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0]">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#006ABE] flex items-center justify-center shrink-0">
            <Bed className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Bedrooms</div>
            <div className="text-base font-extrabold text-[#1E293B]">{propertyData.bedrooms ?? '-'}</div>
          </div>
        </div>

        {/* Bathrooms */}
        <div className="flex items-center space-x-3.5 p-3.5 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0]">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#006ABE] flex items-center justify-center shrink-0">
            <Bath className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Bathrooms</div>
            <div className="text-base font-extrabold text-[#1E293B]">{propertyData.bathrooms ?? '-'}</div>
          </div>
        </div>

        {/* Parking */}
        <div className="flex items-center space-x-3.5 p-3.5 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0]">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#006ABE] flex items-center justify-center shrink-0">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Parking</div>
            <div className="text-base font-extrabold text-[#1E293B]">{propertyData.carSpaces ?? '-'}</div>
          </div>
        </div>

        {/* Land Area */}
        <div className="flex items-center space-x-3.5 p-3.5 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0]">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#006ABE] flex items-center justify-center shrink-0">
            <Square className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Land Area</div>
            <div className="text-base font-extrabold text-[#1E293B]">
              {propertyData.siteArea ? `${propertyData.siteArea} sqm` : '-'}
            </div>
          </div>
        </div>

        {/* Year Built */}
        <div className="flex items-center space-x-3.5 p-3.5 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0]">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#006ABE] flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Year Built</div>
            <div className="text-base font-extrabold text-[#1E293B]">
              {propertyData.buildYear ?? propertyData.yearBuilt ?? '-'}
            </div>
          </div>
        </div>

        {/* Market Value */}
        <div className="flex items-center space-x-3.5 p-3.5 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0]">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#00B050] flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Market Value</div>
            <div className="text-base font-extrabold text-[#00B050]">
              {formatCurrency(propertyData.marketValue)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
