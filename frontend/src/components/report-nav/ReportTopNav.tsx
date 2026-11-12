'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import aapLogo from '@/app/aap-white.svg';
import { Dancing_Script, Poppins, Montserrat } from 'next/font/google';
import {
  CalendarClock,
  FileText,
  Receipt,
  Save,
  Loader2,
  FileSearch,
  Download,
  Send,
  ExternalLink,
} from 'lucide-react';

const dancingScript = Dancing_Script({ subsets: ['latin'] });
const poppins = Poppins({ weight: '700', subsets: ['latin'] });
const montserrat = Montserrat({ subsets: ['latin'] });

export interface ReportTopNavProps {
  fileNumber?: string;
  rpDataId?: string;
  propertyAddress?: string;
  onFileNumberChange?: (val: string) => void;
  onRpDataIdChange?: (val: string) => void;
  onBack?: () => void;
  onOpenSchedule?: () => void;
  onOpenPreview?: () => void;
  onGenerateReport?: () => void;
  onSendReport?: () => void;
  onOpenFinancial?: () => void;
  onPreviewInvoice?: () => void;
  onGenerateInvoice?: () => void;
  onSendInvoice?: () => void;
  onSave?: () => void;
  isSaving?: boolean;
  isDirty?: boolean;
  isScheduled?: boolean;
  isGeneratingReport?: boolean;
  isSendingReport?: boolean;
  isGeneratingInvoice?: boolean;
  isSendingInvoice?: boolean;
  className?: string;
}

export const ReportTopNav: React.FC<ReportTopNavProps> = ({
  fileNumber = '',
  rpDataId = '',
  propertyAddress = '',
  onFileNumberChange,
  onRpDataIdChange,
  onBack,
  onOpenSchedule,
  onOpenPreview,
  onGenerateReport,
  onSendReport,
  onOpenFinancial,
  onPreviewInvoice,
  onGenerateInvoice,
  onSendInvoice,
  onSave,
  isSaving = false,
  isDirty = false,
  isScheduled = false,
  isGeneratingReport = false,
  isSendingReport = false,
  isGeneratingInvoice = false,
  isSendingInvoice = false,
  className = '',
}) => {
  const [isReportMenuOpen, setIsReportMenuOpen] = useState(false);
  const [isInvoiceMenuOpen, setIsInvoiceMenuOpen] = useState(false);

  const reportMenuRef = useRef<HTMLDivElement>(null);
  const invoiceMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (reportMenuRef.current && !reportMenuRef.current.contains(e.target as Node)) {
        setIsReportMenuOpen(false);
      }
      if (invoiceMenuRef.current && !invoiceMenuRef.current.contains(e.target as Node)) {
        setIsInvoiceMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper to build CoreLogic RP Data property URL from address and rpDataId
  const getRpDataUrl = () => {
    if (!rpDataId && !propertyAddress) {
      return 'https://rpp.corelogic.com.au';
    }
    const cleanAddress = (propertyAddress || '').trim();
    // Convert address to URL slug: e.g. "30 Fairway Street Parklea NSW 2768" -> "30-fairway-street-parklea-nsw-2768"
    const slug = cleanAddress
      ? cleanAddress
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      : 'property';

    if (rpDataId) {
      return `https://rpp.corelogic.com.au/property/${slug || 'property'}/${encodeURIComponent(rpDataId)}`;
    }
    return `https://rpp.corelogic.com.au/property/${slug}`;
  };

  return (
    <header
      className={`
        ${montserrat.className}
        h-[80px] shrink-0 sticky top-0 z-[100] shadow-md
        flex items-center justify-between px-8 select-none
        ${className}
      `}
      style={{ backgroundColor: '#006ABE' }}
    >
      {/* Left: Exact Home Page Brand & Logo */}
      <div
        className="flex items-center space-x-3 shrink-0 cursor-pointer group"
        onClick={onBack}
        title="Return to Valuation Reports"
      >
        <div>
          <Image
            src={aapLogo}
            alt="AAP Logo"
            width={40}
            height={40}
            className="w-[40px] h-[40px] object-contain transform transition-transform duration-500 ease-out group-hover:scale-105"
            priority
          />
        </div>
        <div className="flex flex-col justify-center -mt-[20px]">
          <h1 className="text-[32px] tracking-wide flex items-baseline h-8">
            <span className={`font-bold text-white ${poppins.className}`}>SMART</span>
            <span
              className={`text-white relative -top-[1px] ${dancingScript.className}`}
              style={{ marginLeft: '2px', fontSize: '1.05em' }}
            >
              val
            </span>
          </h1>
        </div>
      </div>

      {/* Center: Centered File No. and RP Data ID each with individual underlines */}
      <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center space-x-8 lg:space-x-12 mt-2 z-50">
        {/* File No */}
        <div className="flex items-center border-b-[3px] border-white pb-2 transition-all duration-300 hover:border-white/90">
          <label
            htmlFor="header-file-number"
            className="text-white font-semibold text-[17px] mr-3 cursor-pointer select-none whitespace-nowrap"
          >
            File No.
          </label>
          <div className="w-[2px] h-6 bg-white/40 mr-4 flex-shrink-0" />
          <input
            id="header-file-number"
            type="text"
            value={fileNumber}
            onChange={(e) => onFileNumberChange?.(e.target.value)}
            placeholder="Enter File No."
            style={{
              width: fileNumber
                ? `${Math.max(fileNumber.length + 1, 8)}ch`
                : '14ch',
            }}
            className="bg-transparent text-white font-bold text-[17px] tracking-wide focus:outline-none placeholder-white/50 cursor-text max-w-[200px]"
          />
        </div>

        {/* RP Data ID (Clickable Hyperlink to CoreLogic RP Data property page) */}
        <div className="flex items-center border-b-[3px] border-white pb-2 transition-all duration-300 hover:border-white/90">
          <span className="text-white font-semibold text-[17px] mr-3 select-none whitespace-nowrap">
            RP Data ID
          </span>
          <div className="w-[2px] h-6 bg-white/40 mr-4 flex-shrink-0" />
          {rpDataId ? (
            <a
              href={getRpDataUrl()}
              target="_blank"
              rel="noopener noreferrer"
              title={`Open RP Data property page (${rpDataId})`}
              className="group text-white font-bold text-[17px] tracking-wide hover:underline cursor-pointer inline-flex items-center gap-2 focus:outline-none truncate"
            >
              <span>{rpDataId}</span>
              <ExternalLink className="w-4 h-4 opacity-75 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </a>
          ) : (
            <span className="text-white/60 font-medium text-[17px] italic select-none">
              Not linked
            </span>
          )}
        </div>
      </div>

      {/* Right: Exactly Home Page-Styled 46x46 Rounded Square Action Buttons */}
      <div className="flex items-center space-x-4 shrink-0 pl-4">
        {/* 1. Schedule Inspection / Email Modal (Lights up orange, soft orangish when scheduled) */}
        <button
          type="button"
          onClick={onOpenSchedule}
          title={isScheduled ? 'Report delivery scheduled' : 'Inspection & Email Scheduling'}
          className={`
            w-[46px] h-[46px] rounded-[14px] shadow-sm transition-colors duration-200
            flex items-center justify-center cursor-pointer border-2
            ${
              isScheduled
                ? 'bg-orange-50 text-[#F07D2B] border-orange-200 hover:bg-[#F07D2B] hover:text-white hover:border-transparent'
                : 'bg-white text-[#006ABE] border-transparent hover:bg-[#F07D2B] hover:text-white'
            }
          `}
        >
          <CalendarClock className="w-6 h-6" strokeWidth={2.3} />
        </button>

        {/* 2. Valuation Report Actions (Lights up golden yellow, no pop-out) */}
        <div className="relative" ref={reportMenuRef}>
          <button
            type="button"
            onClick={() => {
              if (onGenerateReport || onSendReport) {
                setIsReportMenuOpen((prev) => !prev);
              } else if (onOpenPreview) {
                onOpenPreview();
              }
            }}
            disabled={isGeneratingReport || isSendingReport}
            title="Valuation Report Menu (Preview, PDF, Send)"
            className={`
              w-[46px] h-[46px] rounded-[14px] shadow-sm transition-colors duration-200
              flex items-center justify-center cursor-pointer disabled:opacity-60
              ${isReportMenuOpen ? 'bg-[#E8C33E] text-white' : 'bg-white text-[#006ABE] hover:bg-[#E8C33E] hover:text-white'}
            `}
          >
            {isGeneratingReport || isSendingReport ? (
              <Loader2 className="w-5 h-5 text-[#E8C33E] animate-spin" />
            ) : (
              <FileText className="w-6 h-6" strokeWidth={2.3} />
            )}
          </button>

          {isReportMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 origin-top-right bg-white rounded-2xl shadow-xl border border-gray-100 z-[110] overflow-hidden py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
              {onOpenPreview && (
                <button
                  type="button"
                  onClick={() => {
                    setIsReportMenuOpen(false);
                    onOpenPreview();
                  }}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-yellow-50 hover:text-[#D49E10] transition-colors font-semibold cursor-pointer"
                >
                  <FileSearch className="w-4 h-4 mr-3 text-[#E8C33E]" />
                  Preview Report
                </button>
              )}
              {onGenerateReport && (
                <button
                  type="button"
                  onClick={() => {
                    setIsReportMenuOpen(false);
                    onGenerateReport();
                  }}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-yellow-50 hover:text-[#D49E10] transition-colors font-semibold cursor-pointer"
                >
                  <Download className="w-4 h-4 mr-3 text-[#E8C33E]" />
                  Generate PDF
                </button>
              )}
              {onSendReport && (
                <button
                  type="button"
                  onClick={() => {
                    setIsReportMenuOpen(false);
                    onSendReport();
                  }}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-yellow-50 hover:text-[#D49E10] transition-colors font-semibold cursor-pointer"
                >
                  <Send className="w-4 h-4 mr-3 text-[#E8C33E]" />
                  Send Report
                </button>
              )}
            </div>
          )}
        </div>

        {/* 3. Financial & Invoice Actions (Lights up vibrant green, no pop-out) */}
        <div className="relative" ref={invoiceMenuRef}>
          <button
            type="button"
            onClick={() => {
              if (onPreviewInvoice || onGenerateInvoice || onSendInvoice) {
                setIsInvoiceMenuOpen((prev) => !prev);
              }
            }}
            disabled={isGeneratingInvoice || isSendingInvoice}
            title="Financial & Invoice Actions"
            className={`
              w-[46px] h-[46px] rounded-[14px] shadow-sm transition-colors duration-200
              flex items-center justify-center cursor-pointer disabled:opacity-60
              ${isInvoiceMenuOpen ? 'bg-[#64C038] text-white' : 'bg-white text-[#006ABE] hover:bg-[#64C038] hover:text-white'}
            `}
          >
            {isGeneratingInvoice || isSendingInvoice ? (
              <Loader2 className="w-5 h-5 text-[#28A745] animate-spin" />
            ) : (
              <Receipt className="w-6 h-6" strokeWidth={2.3} />
            )}
          </button>

          {isInvoiceMenuOpen && (
            <div className="absolute right-0 mt-2 w-60 origin-top-right bg-white rounded-2xl shadow-xl border border-gray-100 z-[110] overflow-hidden py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
              {onPreviewInvoice && (
                <button
                  type="button"
                  onClick={() => {
                    setIsInvoiceMenuOpen(false);
                    onPreviewInvoice();
                  }}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-[#28A745] transition-colors font-semibold cursor-pointer"
                >
                  <FileSearch className="w-4 h-4 mr-3 text-[#28A745]" />
                  Preview Invoice
                </button>
              )}
              {onGenerateInvoice && (
                <button
                  type="button"
                  onClick={() => {
                    setIsInvoiceMenuOpen(false);
                    onGenerateInvoice();
                  }}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-[#28A745] transition-colors font-semibold cursor-pointer"
                >
                  <Download className="w-4 h-4 mr-3 text-[#28A745]" />
                  Generate Invoice PDF
                </button>
              )}
              {onSendInvoice && (
                <button
                  type="button"
                  onClick={() => {
                    setIsInvoiceMenuOpen(false);
                    onSendInvoice();
                  }}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-[#28A745] transition-colors font-semibold cursor-pointer"
                >
                  <Send className="w-4 h-4 mr-3 text-[#28A745]" />
                  Send Invoice
                </button>
              )}
            </div>
          )}
        </div>

        {/* 4. Save Changes Draft (Disabled like trash button on home page when no unsaved changes) */}
        <button
          type="button"
          onClick={onSave}
          disabled={!isDirty || isSaving}
          title={isSaving ? 'Saving...' : !isDirty ? 'All changes saved' : 'Save Report Draft'}
          className={`
            w-[46px] h-[46px] rounded-[14px] flex items-center justify-center shadow-sm transition-colors duration-200
            ${
              isDirty && !isSaving
                ? 'group bg-white text-[#006ABE] hover:bg-white cursor-pointer'
                : 'bg-[#d1d5db] text-gray-500 cursor-not-allowed opacity-90'
            }
          `}
        >
          {isSaving ? (
            <Loader2 className="w-5 h-5 text-[#006ABE] animate-spin drop-shadow-[0_0_8px_rgba(0,106,190,0.8)]" />
          ) : (
            <Save
              className={`w-6 h-6 transition-all duration-300 ${
                isDirty ? 'group-hover:drop-shadow-[0_0_10px_rgba(0,106,190,0.85)]' : 'text-gray-500'
              }`}
              strokeWidth={2.4}
            />
          )}
        </button>
      </div>
    </header>
  );
};
