'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import aapLogo from '@/app/aap-white.svg';
import { Dancing_Script, Poppins, Montserrat } from 'next/font/google';
import {
  CalendarClock,
  FileText,
  DollarSign,
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

      {/* Center: Exactly Centered File No. and RP Data ID matching home page search bar */}
      <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center space-x-8 lg:space-x-12 mt-2 z-50">
        {/* File No */}
        <div className="flex items-center border-b-[3px] border-white pb-2 transition-all duration-200 hover:border-white/90">
          <label
            htmlFor="header-file-number"
            className="text-white font-semibold text-[15px] mr-2.5 cursor-pointer select-none"
          >
            File No.
          </label>
          <div className="w-[2px] h-6 bg-white/40 mr-3 flex-shrink-0" />
          <input
            id="header-file-number"
            type="text"
            value={fileNumber}
            onChange={(e) => onFileNumberChange?.(e.target.value)}
            placeholder="Enter File No."
            className="bg-transparent text-white font-bold text-[15px] tracking-wide focus:outline-none w-32 sm:w-36 placeholder-white/50 cursor-text"
          />
        </div>

        {/* RP Data ID (Clickable Hyperlink to CoreLogic RP Data property page) */}
        <div className="flex items-center border-b-[3px] border-white pb-2 transition-all duration-200 hover:border-white/90">
          <span className="text-white font-semibold text-[15px] mr-2.5 select-none">
            RP Data ID
          </span>
          <div className="w-[2px] h-6 bg-white/40 mr-3 flex-shrink-0" />
          {rpDataId ? (
            <a
              href={getRpDataUrl()}
              target="_blank"
              rel="noopener noreferrer"
              title={`Open RP Data property page (${rpDataId})`}
              className="group text-white font-bold text-[15px] tracking-wide hover:underline cursor-pointer inline-flex items-center gap-1.5 focus:outline-none"
            >
              <span>{rpDataId}</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100 transition-opacity" />
            </a>
          ) : (
            <span className="text-white/60 font-medium text-[15px] italic select-none">
              Not linked
            </span>
          )}
        </div>
      </div>

      {/* Right: Exactly Home Page-Styled 46x46 Rounded Square Action Buttons */}
      <div className="flex items-center space-x-4 shrink-0 pl-4">
        {/* 1. Schedule Inspection / Email Modal (Lights up orange, no pop-out) */}
        <button
          type="button"
          onClick={onOpenSchedule}
          title="Inspection & Email Scheduling"
          className="
            w-[46px] h-[46px] rounded-[14px] bg-white text-[#006ABE] shadow-sm
            hover:bg-[#F07D2B] hover:text-white transition-colors duration-200
            flex items-center justify-center cursor-pointer
          "
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
              <Loader2 className="w-5 h-5 text-[#006ABE] animate-spin" />
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
                  className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-[#006ABE] transition-colors font-semibold cursor-pointer"
                >
                  <FileSearch className="w-4 h-4 mr-3 text-[#006ABE]" />
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
                  className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors font-semibold cursor-pointer"
                >
                  <Download className="w-4 h-4 mr-3 text-emerald-600" />
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
                  className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-[#006ABE] transition-colors font-semibold cursor-pointer"
                >
                  <Send className="w-4 h-4 mr-3 text-[#006ABE]" />
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
              <DollarSign className="w-6 h-6" strokeWidth={2.5} />
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

        {/* 4. Save Changes Draft (Blue aura glow like profile button, no pop-out) */}
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          title="Save Report Draft"
          className="
            group w-[46px] h-[46px] rounded-[14px] bg-white text-[#006ABE] shadow-sm
            transition-colors duration-200 flex items-center justify-center cursor-pointer disabled:opacity-60
          "
        >
          {isSaving ? (
            <Loader2 className="w-5 h-5 text-[#006ABE] animate-spin drop-shadow-[0_0_8px_rgba(0,106,190,0.8)]" />
          ) : (
            <Save
              className="w-6 h-6 transition-all duration-300 group-hover:drop-shadow-[0_0_10px_rgba(0,106,190,0.85)]"
              strokeWidth={2.4}
            />
          )}
        </button>
      </div>
    </header>
  );
};
