'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, Trash2, Building, FileText, CheckCircle, FileType, Download, Eye as Preview, Sparkles, Home, MapPin, DollarSign, Calendar, User as UserIcon, User, ArrowRight, Shield, Settings, LogOut, ChevronDown, FileSearch, ExternalLink, RefreshCw, Copy, Mail } from 'lucide-react';
import { getCurrentUser, signOut, type User as AuthUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { apiRepository } from '@/lib/api-repository';
import { DEFAULT_PROPERTY_FORM, PropertyData } from '@/types/property-valuation';
import { PreviewReportModal } from '@/components/PreviewReportModal';
import { Dancing_Script, Poppins, Montserrat } from 'next/font/google';
import Image from 'next/image';
import aapLogo from '../aap-logo.svg';

const dancingScript = Dancing_Script({
  weight: ['700'],
  subsets: ['latin'],
});
const poppins = Poppins({ weight: ['700'], subsets: ['latin'] });
const montserrat = Montserrat({ weight: ['400', '500', '600', '700'], subsets: ['latin'] });

interface ValuationReportCardData {
  id: string;
  address: string;
  rpDataId?: string;
  allianceId?: string;
  createdAt?: string;
  updatedAt?: string;
  fileNumber?: string;
  propertyType?: string;
  logoType?: string;
}

interface AllianceJob {
  id: number;
  file_number: string;
  first_name: string;
  last_name: string;
  conversion_date: string | null;
  property_address: string;
  valuation_type: string;
  requested_valuation_target: string;
  survey_type: string;
  valuation_notes: string;
  deadline_date: string | null;
  stage: string;
  fillout_by: string | null;
  photos: string;
  created_at: string;
  updated_at: string;
}


const LOGO_MAP: Record<string, string> = {
  AAP: '/images/logos/aap-logo.png',
  CPV: '/images/logos/cpv-logo.png',
  TAMN: '/images/logos/tamn-logo.png',
};

function ReportLogo({ logoType }: { logoType?: string }) {
  const src = logoType ? LOGO_MAP[logoType] : undefined;
  return (
    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200 shrink-0">
      {src ? (
        <Image src={src} alt={`${logoType || 'Client'} logo`} width={44} height={44} className="object-contain" />
      ) : (
        <div className="w-full h-full bg-gray-100" />
      )}
    </div>
  );
}

export default function ValuationReportsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [valuationReports, setValuationReports] = useState<ValuationReportCardData[]>([]);
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [userButtonPosition, setUserButtonPosition] = useState({ top: 0, left: 0 });
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewReportId, setPreviewReportId] = useState<string | null>(null);
  const [previewAddress, setPreviewAddress] = useState<string>('');
  const [previewFileNumber, setPreviewFileNumber] = useState<string>('');
  
  // Duplication state
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateReportId, setDuplicateReportId] = useState<string | null>(null);
  const [numCopies, setNumCopies] = useState<number>(1);
  const [isDuplicating, setIsDuplicating] = useState(false);

  // Alliance state
  const [allianceJobs, setAllianceJobs] = useState<AllianceJob[]>([]);
  const [isLoadingAlliance, setIsLoadingAlliance] = useState(false);
  const [allianceError, setAllianceError] = useState<string | null>(null);
  const [showAllianceSection, setShowAllianceSection] = useState(true);
  const [importingJobId, setImportingJobId] = useState<number | null>(null);

  // Inspection state
  const [inspectionReports, setInspectionReports] = useState<any[]>([]);
  const [isLoadingInspection, setIsLoadingInspection] = useState(false);
  const [inspectionError, setInspectionError] = useState<string | null>(null);
  const [showInspectionSection, setShowInspectionSection] = useState(true);

  // Track user button position for dropdown placement
  const userButtonRef = React.useRef<HTMLButtonElement>(null);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (userButtonRef.current && isUserMenuOpen) {
      const rect = userButtonRef.current.getBoundingClientRect();
      setUserButtonPosition({
        top: rect.bottom + 12, // display below the button
        left: rect.right - 288 // align right
      });
    }
  }, [isUserMenuOpen]);

  // Auto-fetch inspection reports on mount
  useEffect(() => {
    const fetchInspectionReports = async () => {
      setIsLoadingInspection(true);
      try {
        const response = await apiRepository.getInspectionReports(1, 20);
        if (response.success && response.data) {
          setInspectionReports(response.data);
        }
      } catch (error) {
        console.error('Error auto-fetching inspection reports:', error);
      } finally {
        setIsLoadingInspection(false);
      }
    };

    fetchInspectionReports();
  }, []);

  const handleDeleteInspectionReport = async (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation
    if (!confirm('Are you sure you want to delete this inspection report? This action cannot be undone.')) {
      return;
    }

    try {
      await apiRepository.deleteInspectionReport(reportId);

      // Remove from state
      setInspectionReports(prev => prev.filter(report => report.id !== reportId));

      // Show success feedback (optional, could use a toast)
      alert('Report deleted successfully');
    } catch (error: any) {
      console.error('Error deleting report:', error);
      alert(error.message || 'Failed to delete report');
    }
  };

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setCurrentUser(user);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);

  // Auto-load Alliance reports after valuation reports are loaded
  useEffect(() => {
    // Only fetch alliance reports after valuation reports are loaded
    if (isLoading) {
      return;
    }

    const loadAllianceReports = async () => {
      try {
        setIsLoadingAlliance(true);
        setAllianceError(null);
        const response = await apiRepository.getAllianceJobs(1, 20);
        if (response.success && response.data?.data) {
          // Get all existing alliance IDs from valuation reports
          const existingAllianceIds = new Set(
            valuationReports
              .map(report => report.allianceId?.toString())
              .filter(Boolean)
          );

          // Filter out alliance reports that already exist in valuation reports
          const filteredJobs = response.data.data.filter((job: AllianceJob) => {
            const jobIdStr = job.id.toString();
            return !existingAllianceIds.has(jobIdStr);
          });

          setAllianceJobs(filteredJobs);
        } else {
          setAllianceError('Failed to fetch Alliance jobs');
        }
      } catch (error) {
        console.error('Error fetching Alliance jobs:', error);
        setAllianceError('Failed to load Alliance reports');
      } finally {
        setIsLoadingAlliance(false);
      }
    };

    loadAllianceReports();
  }, [isLoading, valuationReports]); // Run when loading state or valuation reports change

  const fetchValuationReports = async () => {
    try {
      setIsLoading(true);
      const bundles = await apiRepository.listPropertyBundles();
      console.log('API Response bundles:', bundles);
      const cards: ValuationReportCardData[] = bundles.map(({ property }) => {
        let derivedLogoType = property.valuationDetails?.logoType;
        if (!derivedLogoType && property.fileNumber) {
          if (property.fileNumber.startsWith('CPV')) derivedLogoType = 'CPV';
          else if (property.fileNumber.startsWith('TAMN')) derivedLogoType = 'TAMN';
          else derivedLogoType = 'AAP';
        }
        return {
          id: property.id || 'unknown',
          address: property.address?.fullAddress || 'No address',
          rpDataId: property.rpDataId,
          allianceId: property.allianceId,
          createdAt: property.createdAt,
          updatedAt: property.updatedAt,
          fileNumber: property.fileNumber,
          propertyType: property.propertyDetails?.propertyType,
          logoType: derivedLogoType,
        };
      });
      console.log('Processed cards:', cards);
      setValuationReports(cards);
    } catch (e) {
      console.error('Failed to fetch valuation reports:', e);
      setValuationReports([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchValuationReports();
  }, []);

  const fetchAllianceJobs = async () => {
    try {
      setIsLoadingAlliance(true);
      setAllianceError(null);
      const response = await apiRepository.getAllianceJobs(1, 20);
      if (response.success && response.data?.data) {
        // Get all existing alliance IDs from valuation reports
        const existingAllianceIds = new Set(
          valuationReports
            .map(report => report.allianceId?.toString())
            .filter(Boolean)
        );

        // Filter out alliance reports that already exist in valuation reports
        const filteredJobs = response.data.data.filter((job: AllianceJob) => {
          const jobIdStr = job.id.toString();
          return !existingAllianceIds.has(jobIdStr);
        });

        setAllianceJobs(filteredJobs);
      } else {
        setAllianceError('Failed to fetch Alliance jobs');
      }
    } catch (error) {
      console.error('Failed to fetch Alliance jobs:', error);
      setAllianceError('Failed to connect to Alliance service');
    } finally {
      setIsLoadingAlliance(false);
    }
  };

  const handleCreateNew = () => {
    // Navigate to the new valuation report page
    router.push('/valuation-report/new');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this valuation report?')) {
      return;
    }
    try {
      await apiRepository.deleteProperty(id);
      setValuationReports((prev) => prev.filter((report) => report.id !== id));
    } catch (error) {
      console.error('Failed to delete valuation report from local storage', error);
      alert('Failed to delete valuation report.');
    }
  };

  const handleEdit = (id: string) => {
    router.push(`/valuation-reports/${id}/edit`);
  };

  const handlePreview = (id: string, address: string, fileNumber?: string) => {
    setPreviewReportId(id);
    setPreviewAddress(address);
    setPreviewFileNumber(fileNumber || '');
    setShowPreviewModal(true);
  };

  const handleClosePreview = () => {
    setShowPreviewModal(false);
    setPreviewReportId(null);
    setPreviewAddress('');
    setPreviewFileNumber('');
  };


  const handleDuplicateClick = (id: string) => {
    setDuplicateReportId(id);
    setNumCopies(1);
    setShowDuplicateModal(true);
  };

  const handleConfirmDuplicate = async () => {
    if (!duplicateReportId) return;
    
    setIsDuplicating(true);
    try {
      await apiRepository.duplicateProperty(duplicateReportId, numCopies);
      await fetchValuationReports(); // Refresh the list
      setShowDuplicateModal(false);
      setDuplicateReportId(null);
    } catch (error) {
      console.error('Failed to duplicate report', error);
      alert('Failed to duplicate valuation report.');
    } finally {
      setIsDuplicating(false);
    }
  };

    const handleSelect = (id: string) => {
    setSelectedReports(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleCardClick = (e: React.MouseEvent, id: string) => {
    if (e.ctrlKey || e.metaKey) {
      handleSelect(id);
    } else {
      setSelectedReports(prev => {
        if (prev.has(id) && prev.size === 1) {
          return new Set();
        }
        return new Set([id]);
      });
    }
  };

  const handleSelectAll = () => {
    if (selectedReports.size === filteredReports.length) {
      setSelectedReports(new Set());
    } else {
      setSelectedReports(new Set(filteredReports.map(report => report.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedReports.size === 0) {
      alert('Please select at least one valuation report to delete.');
      return;
    }
    if (confirm(`Are you sure you want to delete ${selectedReports.size} valuation report(s)?`)) {
      try {
        setIsLoading(true);
        const deletePromises = Array.from(selectedReports).map(id => 
          apiRepository.deleteProperty(id)
        );
        await Promise.all(deletePromises);
        
        // Remove from local state
        setValuationReports(prev => prev.filter(report => !selectedReports.has(report.id)));
        setSelectedReports(new Set());
      } catch (error) {
        console.error('Failed to delete some reports:', error);
        alert('An error occurred while deleting the reports. Please try again.');
        fetchValuationReports();
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleExport = () => {
    if (selectedReports.size === 0) {
      alert('Please select at least one valuation report to export.');
      return;
    }
    alert('Export functionality coming soon...');
  };

  const handleLogs = () => {
    alert('Logs functionality coming soon...');
  };


  const handleGenerateReport = () => {
    if (selectedReports.size === 0) {
      alert('Please select at least one valuation report to generate report.');
      return;
    }
    alert('Generate PDF Report functionality coming soon...');
  };

  const handleGoHome = () => {
    window.location.href = '/valuation-reports';
  };

  const handleLogout = () => {
    setIsUserMenuOpen(false);
    signOut();
    router.push('/login');
  };

  const handleAdminPanel = () => {
    setIsUserMenuOpen(false);
    const target = currentUser?.role === 'admin' ? '/admin' : '/account';
    router.push(target);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedOnButton = !!(userButtonRef.current && userButtonRef.current.contains(target));
      const clickedOnMenu = !!(userMenuRef.current && userMenuRef.current.contains(target));
      if (!clickedOnButton && !clickedOnMenu) {
        setIsUserMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsUserMenuOpen(false);
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isUserMenuOpen]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'valuer': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return Shield;
      case 'valuer': return UserIcon;
      default: return UserIcon;
    }
  };

  const filteredReports = valuationReports.filter((report) => {
    if (!searchTerm.trim()) return true;
    const dateStr = report.updatedAt ? new Date(report.updatedAt) : null;
    const dateFormatted = dateStr
      ? [
          dateStr.toLocaleDateString('en-AU'),                                             // 08/05/2026
          dateStr.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: '2-digit' }), // 08/05/26
          dateStr.toLocaleDateString('en-GB'),                                             // 08/05/2026
          dateStr.toISOString().slice(0, 10),                                              // 2026-05-08
        ].join(' ')
      : '';
    const searchable = [
      report.address,
      report.rpDataId,
      report.fileNumber,
      report.propertyType,
      dateFormatted,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return searchable.includes(searchTerm.toLowerCase());
  });

  if (isLoading) {
    return (
      <div
        className={`min-h-screen relative overflow-hidden flex items-center justify-center`}
        style={{ background: 'radial-gradient(ellipse 80% 75% at bottom center, #1f7cc6 20%, #ddeaf4 70%, #ffffff 90%)' }}
      >
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, #ffffff 2px, transparent 0)',
            backgroundSize: '20px 20px'
          }}
        ></div>
        <div
          className="absolute inset-0 pointer-events-none animate-breath origin-bottom"
          style={{ background: 'radial-gradient(ellipse 80% 80% at bottom center, #1f7cc6 0%, transparent 70%)'}}
        ></div>
        
        <div className="relative z-10 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#0b70c5] border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-700 font-medium tracking-wide animate-pulse">Loading Valuation Reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${montserrat.className} h-screen bg-[#F8F9FA] flex flex-col`}>
      
      {/* TOP HEADER */}
      <header className="h-[80px] flex items-center justify-between px-6 shrink-0 relative z-20 shadow-md" style={{ backgroundColor: "#006ABE" }}>
        {/* logo and subtitle on the left  */}
        <div className="flex items-center space-x-3 shrink-0 cursor-pointer group" onClick={handleGoHome}>
          <div className="brightness-0 invert opacity-95">
            <Image src={aapLogo} alt="AAP Logo" width={40} height={40} className="w-[40px] h-[40px] object-contain transform transition-transform duration-500 ease-out group-hover:scale-105" priority />
          </div>
          <div className="flex flex-col justify-center -mt-[20px]">
              <h1 className="text-[32px] tracking-wide flex items-baseline h-8">
              <span className={`font-bold text-white ${poppins.className}`}>SMART</span>
              <span className={`text-white relative -top-[1px] ${dancingScript.className}`} style={{ marginLeft: '2px', fontSize: '1.05em' }}>val</span>
            </h1>
          </div>
        </div>

        {/* search bar in the middle */}
        <div className="flex-1 max-w-3xl px-8 hidden md:block mt-2">
          <div className="relative flex items-center w-full border-b-[3px] border-white pb-2 transition-all duration-300 hover:border-white/90">
            <Search className="w-6 h-6 text-white mr-4 flex-shrink-0" strokeWidth={2.5} />
            <div className="w-[2px] h-6 bg-white/40 mr-4 flex-shrink-0"></div>
            <input
              type="text"
              placeholder="Search by file number, address, valuer, client or property number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-white text-[17px] w-full placeholder-white/80 focus:outline-none tracking-wide"
            />
          </div>
        </div>

        {/* actions on the right side */}
        <div className="flex items-center space-x-4 shrink-0 pl-4">
          {/* User Button */}
          {currentUser && (
            <button
              ref={userButtonRef}
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="w-[46px] h-[46px] rounded-[14px] bg-white flex items-center justify-center text-[#006ABE] hover:bg-gray-100 transition-colors shadow-sm"
            >
              <UserIcon className="w-6 h-6" strokeWidth={2.5} />
            </button>
          )}

          {/* create New Valuation Report button */}
          <button
            onClick={handleCreateNew}
            className="w-[46px] h-[46px] rounded-[14px] bg-[#28A745] flex items-center justify-center text-white hover:bg-[#218838] shadow-sm transition-colors"
          >
            <Plus className="w-7 h-7" strokeWidth={3} />
          </button>
          
          {/* Bulk Delete button */}
          <button
            onClick={handleBulkDelete}
            disabled={selectedReports.size === 0}
            className={`w-[46px] h-[46px] rounded-[14px] flex items-center justify-center shadow-sm transition-colors ${
              selectedReports.size > 0 
                ? 'bg-red-500 text-white hover:bg-red-600 cursor-pointer' 
                : 'bg-[#d1d5db] text-gray-500 cursor-not-allowed opacity-90'
            }`}
          >
            <Trash2 className="w-6 h-6" strokeWidth={2.5} />
          </button>
        </div>
      </header>

      {/* Mobile Search Bar (shows only on small screens) */}
      <div className="px-6 py-4 bg-[#006ABE] block md:hidden border-t border-white/20">
        <div className="relative flex items-center w-full border-b-[3px] border-white pb-2">
          <Search className="w-5 h-5 text-white mr-3 flex-shrink-0" />
          <div className="w-[2px] h-5 bg-white/40 mr-3 flex-shrink-0"></div>
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-white text-[15px] w-full placeholder-white/80 focus:outline-none"
          />
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto relative">
        
        {/* User Menu Dropdown Portal */}
        {isUserMenuOpen && currentUser && (
          <div className="fixed inset-0 z-[999999] pointer-events-none">
            <div
              className="absolute w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 pointer-events-auto"
              style={{
                top: `${userButtonPosition.top}px`,
                left: `${userButtonPosition.left}px`
              }}
              ref={userMenuRef}
            >
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[#006ABE] rounded-xl flex items-center justify-center flex-shrink-0">
                    <UserIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate">{currentUser.name}</p>
                    <p className="text-sm text-gray-500 truncate">{currentUser.email}</p>
                  </div>
                </div>
              </div>

              <div className="p-2">
                <button
                  onClick={handleAdminPanel}
                  className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-xl transition-colors duration-200"
                >
                  <Settings className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">
                    {currentUser?.role === 'admin' ? 'Admin Panel' : 'Account Settings'}
                  </span>
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors duration-200"
                >
                  <LogOut className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
          {/* Report Count Pill */}
          <div className="flex justify-center mb-10">
            <div className="px-8 py-3.5 rounded-[18px] bg-[#e9ebed] shadow-sm">
              <span className="text-[15px] font-bold text-gray-800 tracking-wide">
                {filteredReports.length} Valuation Reports available
              </span>
            </div>
          </div>

          {/* Valuation Reports Grid */}
          {filteredReports.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
              {filteredReports.map((report, index) => (
                <div
                  key={report.id || index}
                  className={`group relative bg-white rounded-[40px] border-2 p-8 pb-7 transition-all duration-300 cursor-pointer ${
                    selectedReports.has(report.id)
                      ? 'border-[#006ABE] scale-[1.01]'
                      : 'border-[#e6eff5] hover:-translate-y-1 hover:border-[#006ABE]/30'
                  }`}
                  style={{ boxShadow: selectedReports.has(report.id) ? '0 0 25px 2px rgba(0, 106, 190, 0.25)' : (hoveredCard === report.id ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' : '0 4px 20px rgba(0, 0, 0, 0.03)') }}
                    onClick={(e) => handleCardClick(e, report.id)}
                  onMouseEnter={() => setHoveredCard(report.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  

                  {/* Top row: Logo + Preview */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 rounded-full bg-white shadow-md flex items-center justify-center p-1 border border-gray-50 flex-shrink-0">
                      {report.logoType && LOGO_MAP[report.logoType] ? (
                        <Image src={LOGO_MAP[report.logoType]} alt={`${report.logoType} logo`} width={44} height={44} className="object-contain" />
                      ) : (
                        <div className="w-full h-full bg-gray-50 rounded-full" />
                      )}
                    </div>
                    
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePreview(report.id, report.address, report.fileNumber); }}
                      className="inline-flex items-center px-7 py-2.5 text-[16px] font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                      <Preview className="w-5 h-5 mr-2" strokeWidth={2.5} />
                      Preview
                    </button>
                  </div>

                  {/* Card Content */}
                  <div>
                    {/* File number */}
                    <p className="text-[16px] font-extrabold text-[#222222] mb-1 tracking-wide">
                      {report.fileNumber || report.id}
                    </p>
                    
                    {/* Property type (blue, bold) */}
                    <h3 className="text-[28px] font-bold mb-5 leading-tight min-h-[64px] line-clamp-2 pr-2" style={{ color: "#006ABE" }}>
                      {report.propertyType || 'Property Valuation'}
                    </h3>

                    {/* Address */}
                    <p className="text-[16px] font-bold text-gray-900 mb-6 leading-relaxed line-clamp-2 min-h-[46px] pr-2">
                      {report.address || 'No address available'}
                    </p>

                    {/* Metadata */}
                    <div className="space-y-2.5 mb-7">
                      <div className="flex items-center text-[13px] text-gray-700 font-medium">
                        <FileText className="w-[18px] h-[18px] mr-3 text-gray-500" strokeWidth={2} />
                        <span>RP Data ID: <span className="font-semibold text-gray-900">{report.rpDataId || 'Not provided'}</span></span>
                      </div>
                      <div className="flex items-center text-[13px] text-gray-700 font-medium">
                        <Calendar className="w-[18px] h-[18px] mr-3 text-gray-500" strokeWidth={2} />
                        <span>Date Modified: <span className="font-semibold text-gray-900">{report.updatedAt ? new Date(report.updatedAt).toLocaleDateString('en-AU') : 'Unknown'}</span></span>
                      </div>
                    </div>

                    {/* Blue divider line */}
                    <div className="h-[2px] w-full mb-7" style={{ backgroundColor: "#006ABE" }} />

                    {/* Action buttons */}
                    <div className="flex flex-col space-y-3.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDuplicateClick(report.id); }}
                        className="w-full inline-flex items-center justify-center py-4 text-[16px] font-bold text-gray-900 bg-[#f0f0f0] rounded-full hover:bg-[#e4e4e4] transition-colors"
                      >
                        <Copy className="w-[18px] h-[18px] mr-2" strokeWidth={2.5} />
                        Duplicate
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(report.id); }}
                        className="w-full inline-flex items-center justify-center py-4 text-[16px] font-bold text-white rounded-full transition-colors shadow-md hover:opacity-90" style={{ backgroundColor: "#006ABE" }}
                      >
                        <Edit3 className="w-[18px] h-[18px] mr-2" strokeWidth={2.5} />
                        Open
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-[#006ABE]/10 rounded-full blur-2xl animate-pulse"></div>
                <div className="relative w-24 h-24 bg-[#006ABE] rounded-[30px] flex items-center justify-center mx-auto mb-8 shadow-xl">
                  <FileText className="w-12 h-12 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {searchTerm ? 'No valuation reports found' : 'No valuation reports yet'}
              </h3>
              <p className="text-[15px] text-gray-600 mb-10 max-w-md mx-auto">
                {searchTerm
                  ? `No valuation reports match "${searchTerm}". Try adjusting your search terms.`
                  : 'Get started by creating your first valuation report.'}
              </p>
              <button
                onClick={handleCreateNew}
                className="group inline-flex items-center px-8 py-4 text-[15px] font-bold rounded-2xl text-white bg-[#28A745] hover:bg-[#218838] shadow-lg transition-all duration-300 transform hover:-translate-y-1"
              >
                <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-300" strokeWidth={3} />
                New Report
              </button>
            </div>
          )}
        </div>

      </main>

      

      {/* Preview Modal */}
      {showPreviewModal && previewReportId && (
        <PreviewReportModal
          isOpen={showPreviewModal}
          onClose={handleClosePreview}
          reportId={previewReportId}
          propertyAddress={previewAddress}
          fileNumber={previewFileNumber}
        />
      )}

      {/* Duplicate Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Duplicate Report</h3>
            <p className="text-sm text-gray-500 mb-6">
              How many copies of this report would you like to create?
            </p>
            
            <div className="mb-6">
              <label htmlFor="copies" className="block text-sm font-medium text-gray-700 mb-2">
                Number of Copies
              </label>
              <input
                type="number"
                id="copies"
                min="1"
                max="20"
                value={numCopies}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNumCopies(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDuplicateModal(false)}
                disabled={isDuplicating}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDuplicate}
                disabled={isDuplicating}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200 flex items-center"
              >
                {isDuplicating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Copying...
                  </>
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
