'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, Trash2, Building, FileText, CheckCircle, FileType, Download, Eye as Preview, Sparkles, Home, MapPin, DollarSign, Calendar, User as UserIcon, User, ArrowRight, Shield, Settings, LogOut, ChevronDown, FileSearch, ExternalLink, RefreshCw, Copy, Mail } from 'lucide-react';
import { getCurrentUser, signOut, type User as AuthUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { apiRepository } from '@/lib/api-repository';
import { DEFAULT_PROPERTY_FORM, PropertyData } from '@/types/property-valuation';
import { PreviewReportModal } from '@/components/PreviewReportModal';
import { Inter, Dancing_Script } from 'next/font/google';
import Image from 'next/image';
import aapLogo from '../aap-logo.svg';

const dancingScript = Dancing_Script({
  weight: ['700'],
  subsets: ['latin'],
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

interface ValuationReportCardData {
  id: string;
  address: string;
  rpDataId?: string;
  allianceId?: string;
  createdAt?: string;
  updatedAt?: string;
  fileNumber?: string;
  propertyType?: string;
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
        top: rect.top - 180, // displays above the button
        left: rect.right + 12
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
        console.log('Processing property:', property);
        return {
          id: property.id || 'unknown',
          address: property.address?.fullAddress || 'No address',
          rpDataId: property.rpDataId,
          allianceId: property.allianceId,
          createdAt: property.createdAt,
          updatedAt: property.updatedAt,
          fileNumber: property.fileNumber,
          propertyType: property.propertyDetails?.propertyType,
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

  const handlePreview = (id: string, address: string) => {
    setPreviewReportId(id);
    setPreviewAddress(address);
    setShowPreviewModal(true);
  };

  const handleClosePreview = () => {
    setShowPreviewModal(false);
    setPreviewReportId(null);
    setPreviewAddress('');
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

  const handleSelectAll = () => {
    if (selectedReports.size === filteredReports.length) {
      setSelectedReports(new Set());
    } else {
      setSelectedReports(new Set(filteredReports.map(report => report.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedReports.size === 0) {
      alert('Please select at least one valuation report to delete.');
      return;
    }
    if (confirm(`Are you sure you want to delete ${selectedReports.size} valuation report(s)?`)) {
      // Implement bulk delete logic here
      alert('Bulk delete functionality coming soon...');
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
        className={`min-h-screen relative overflow-hidden flex items-center justify-center ${inter.className}`}
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
    <div className={`h-screen bg-white flex flex-col font-sans ${inter.className}`}>
      
      {/* TOP HEADER */}
      <header className="h-[80px] flex items-center justify-between pl-4 pr-6 lg:pl-4 lg:pr-8 shrink-0 relative z-20">
        {/* logo and subtitle on the left  */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="cursor-pointer group flex items-center space-x-3" onClick={handleGoHome}>
            <Image src={aapLogo} alt="AAP Logo" width={52} height={52} className="w-[52px] h-[52px] object-contain drop-shadow-sm transform transition-transform duration-500 ease-out group-hover:scale-105" priority />
            <div className="flex flex-col justify-center">
              <h1 className="text-4xl tracking-wide flex items-center h-10">
                <span className={`font-bold text-[#1f7cc6] ${inter.className}`}>SMART</span>
                <span className={`text-[#1f7cc6] relative -top-[0.1px] ${dancingScript.className}`} style={{ marginLeft: '2px', fontSize: '1.05em' }}>val</span>
              </h1>
              <p className="text-gray-500 font-medium text-xs tracking-wide">Alliance Australia Property</p>
            </div>
          </div>
        </div>

        {/* search bar in the middle */}
        <div className="flex-1 max-w-5xl px-12 hidden md:block">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#1f7cc6]" />
            <input
              type="text"
              placeholder="Search by file number, address, valuer, client or property number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-11 pr-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1f7cc6] focus:border-[#1f7cc6] transition-all duration-300 placeholder-gray-400 text-gray-900 shadow-sm text-sm"
            />
          </div>
        </div>

        {/* actions on the right side */}
        <div className="flex items-center space-x-4 shrink-0">
          {/* create New Valuation Report button */}
          <button
            onClick={handleCreateNew}
            className="group relative inline-flex items-center px-5 h-10 text-sm font-semibold rounded-xl text-white bg-[#2b7bc4] shadow-sm transition-all duration-300 hover:brightness-110 hover:[box-shadow:0_0_15px_rgba(43,123,196,0.6)]"
          >
            <Plus className="w-4 h-4 mr-1.5 group-hover:rotate-90 transition-transform duration-300" />
            New Report
          </button>
        </div>
      </header>

      {/* Mobile Search Bar (shows only on small screens) */}
      <div className="px-6 py-2 bg-white block md:hidden">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#1f7cc6]" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1f7cc6] focus:border-[#1f7cc6] transition-all duration-300 placeholder-gray-400 text-gray-900 shadow-sm"
          />
        </div>
      </div>

      {/* BOTTOM SECTION */}
      <div className="flex flex-1 overflow-hidden relative z-10">
        
        {/* LEFT SIDEBAR */}
        <aside className="w-[80px] bg-white flex flex-col justify-end items-center pb-4 shrink-0 relative z-20">
          {currentUser && (
            <div className="flex flex-col items-center w-full">
              <hr className="w-8 border-t-2 border-[#94a3b8] mb-4 opacity-60" />
              <button
                ref={userButtonRef}
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="relative w-12 h-12 bg-[#2b7bc4] text-white rounded-[14px] flex items-center justify-center transition-all duration-300 hover:brightness-110 hover:[box-shadow:0_0_15px_rgba(43,123,196,0.6)]"
              >
                <div className="w-7 h-7 border-[1.5px] border-white rounded-[8px] flex items-center justify-center">
                  <UserIcon className="w-[18px] h-[18px] text-white" strokeWidth={1.5} />
                </div>
              </button>
            </div>
          )}
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 bg-[#b5cddd] rounded-tl-[64px] border-t border-l border-gray-300 shadow-[inset_6px_6px_20px_rgba(0,0,0,0.08)] p-8 overflow-y-auto relative">
          
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
                    <div className="w-10 h-10 bg-[#5b9bd5] rounded-xl flex items-center justify-center flex-shrink-0">
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
                    <span className="truncate">Admin Panel</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      router.push('/settings');
                    }}
                    className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-xl transition-colors duration-200"
                  >
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Email Templates</span>
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

          <div className="max-w-7xl mx-auto">

          {/* Bulk Actions */}
          {selectedReports.size > 0 && (
            <div className="mb-6 flex items-center justify-end space-x-2">
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors duration-200"
              >
                Delete ({selectedReports.size})
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors duration-200"
              >
                Export ({selectedReports.size})
              </button>
            </div>
          )}

          {/* Valuation Reports Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {filteredReports.map((report, index) => (
              <div
                key={report.id || index}
                className="group relative bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-xl transform hover:scale-[1.02]"
                onMouseEnter={() => setHoveredCard(report.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {/* Selection Checkbox */}
                <div className="absolute top-3 left-3 z-10">
                  <input
                    type="checkbox"
                    checked={selectedReports.has(report.id)}
                    onChange={() => handleSelect(report.id)}
                    className="w-4 h-4 text-blue-600 bg-white border-2 border-gray-300 rounded focus:ring-blue-500 focus:ring-1"
                  />
                </div>

                {/* Blue Header Section */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-700 p-4 text-white relative">
                  <div className="flex items-center space-x-3 pl-6">
                    <Home className="w-6 h-6" />
                    <div>
                      <p className="text-sm font-medium opacity-90">{report.fileNumber || report.id}</p>
                      <p className="text-lg font-bold">{report.propertyType || 'Property Valuation'}</p>
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4">
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="truncate">{report.address || 'No address available'}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <UserIcon className="w-4 h-4 mr-2 text-gray-400" />
                      <span>RP Data ID: {report.rpDataId || 'Not provided'}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      <span>Modified: {report.updatedAt ? new Date(report.updatedAt).toLocaleDateString('en-AU') : 'Unknown'}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePreview(report.id, report.address)}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                    >
                      <FileSearch className="w-4 h-4 mr-1" />
                      Preview
                    </button>
                    <button
                      onClick={() => handleEdit(report.id)}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    >
                      <Edit3 className="w-4 h-4 mr-1" />
                      Open
                    </button>
                    <button
                      onClick={() => handleDuplicateClick(report.id)}
                      title="Duplicate Report"
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(report.id)}
                      className="px-3 py-2 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-lg hover:bg-red-700 transition-colors duration-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredReports.length === 0 && (
            <div className="text-center py-16">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-blue-700/20 rounded-full blur-2xl animate-pulse"></div>
                <div className="relative w-24 h-24 bg-gradient-to-r from-blue-500 to-blue-700 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                  <FileText className="w-12 h-12 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {searchTerm ? 'No valuation reports found' : 'No valuation reports yet'}
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                {searchTerm
                  ? `No valuation reports match "${searchTerm}". Try adjusting your search terms.`
                  : 'Get started by creating your first valuation report.'}
              </p>
              <button
                onClick={handleCreateNew}
                className="group inline-flex items-center px-6 py-3 text-base font-semibold rounded-xl text-white bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                New Report
              </button>
            </div>
          )}
        </div>

      {/* Alliance Reports Section */}
      <div className="min-h-screen relative z-10">
        <div className="max-w-7xl mx-auto px-8 py-12">
          {/* Alliance Section Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                <ExternalLink className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Alliance Reports</h2>
                <p className="text-gray-600">Valuation reports from Alliance Australia Property</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchAllianceJobs}
                disabled={isLoadingAlliance}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingAlliance ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => setShowAllianceSection(!showAllianceSection)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-red-600 rounded-xl hover:from-orange-600 hover:to-red-700 transition-all duration-200"
              >
                {showAllianceSection ? 'Hide' : 'Show'} Reports
              </button>
            </div>
          </div>

          {/* Alliance Reports Content */}
          {showAllianceSection && (
            <div className="space-y-6">
              {/* Error State */}
              {allianceError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <ExternalLink className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-red-800">Connection Error</h3>
                      <p className="text-red-600">{allianceError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {isLoadingAlliance && (
                <div className="text-center py-12">
                  <div className="inline-flex items-center space-x-3">
                    <RefreshCw className="w-6 h-6 text-orange-500 animate-spin" />
                    <span className="text-lg font-medium text-gray-700">Loading Alliance reports...</span>
                  </div>
                </div>
              )}

              {/* Alliance Jobs Grid */}
              {!isLoadingAlliance && !allianceError && allianceJobs.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {allianceJobs.map((job) => (
                    <div
                      key={job.id}
                      className="group relative bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-xl transform hover:scale-[1.02]"
                    >
                      {/* Orange Header Section */}
                      <div className="bg-gradient-to-r from-orange-500 to-red-600 p-4 text-white relative">
                        <div className="flex items-center space-x-3">
                          <ExternalLink className="w-6 h-6" />
                          <div>
                            <p className="text-sm font-medium opacity-90">{job.file_number}</p>
                            <p className="text-lg font-bold">Alliance Report</p>
                          </div>
                        </div>
                        <div className="absolute top-2 right-2">
                          <span className="px-2 py-1 text-xs font-medium bg-white/20 rounded-full">
                            {job.stage}
                          </span>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-4">
                        <div className="space-y-3 mb-4">
                          <div className="flex items-center text-sm text-gray-600">
                            <UserIcon className="w-4 h-4 mr-2 text-gray-400" />
                            <span>{job.first_name} {job.last_name}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="truncate">{job.property_address}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <FileText className="w-4 h-4 mr-2 text-gray-400" />
                            <span>{job.valuation_type}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            <span>Created: {new Date(job.created_at).toLocaleDateString('en-AU')}</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              // TODO: Implement view functionality
                              console.log('View Alliance job:', job.id);
                            }}
                            className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                          >
                            <FileSearch className="w-4 h-4 mr-1" />
                            View
                          </button>
                          <button
                            onClick={async () => {
                              setImportingJobId(job.id);
                              try {
                                const result = await apiRepository.importAllianceJob(job.id);

                                if (result.success) {
                                  alert(`Successfully imported Alliance report ${job.id}!`);
                                  // Reload valuation reports
                                  await fetchValuationReports();
                                  // Optionally refresh alliance jobs
                                  await fetchAllianceJobs();
                                }
                              } catch (error: any) {
                                if (error.message.includes('already_exists') || error.message.includes('409')) {
                                  alert('This Alliance report has already been imported.');
                                } else {
                                  alert(`Failed to import report: ${error.message}`);
                                }
                                console.error('Import error:', error);
                              } finally {
                                setImportingJobId(null);
                              }
                            }}
                            disabled={importingJobId === job.id}
                            className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-red-600 border border-orange-500 rounded-lg hover:from-orange-600 hover:to-red-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {importingJobId === job.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                                Importing...
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4 mr-1" />
                                Import
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!isLoadingAlliance && !allianceError && allianceJobs.length === 0 && (
                <div className="text-center py-16">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-red-600/20 rounded-full blur-2xl animate-pulse"></div>
                    <div className="relative w-24 h-24 bg-gradient-to-r from-orange-500 to-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                      <ExternalLink className="w-12 h-12 text-white" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">No Alliance reports found</h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    No reports are currently available from Alliance Australia Property.
                  </p>
                  <button
                    onClick={fetchAllianceJobs}
                    className="group inline-flex items-center px-8 py-4 text-lg font-bold rounded-2xl text-white bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110"
                  >
                    <RefreshCw className="w-6 h-6 mr-3 group-hover:rotate-180 transition-transform duration-300" />
                    Refresh Alliance Reports
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Inspection Reports Section */}
      <div className="min-h-screen relative z-10">
        <div className="max-w-7xl mx-auto px-8 py-12">
          {/* Inspection Section Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <FileSearch className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Inspection Reports</h2>
                <p className="text-gray-600">Property inspection reports</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  // TODO: Add backend fetch functionality
                  setIsLoadingInspection(true);
                  setTimeout(() => setIsLoadingInspection(false), 1000);
                }}
                disabled={isLoadingInspection}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingInspection ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => setShowInspectionSection(!showInspectionSection)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl hover:from-purple-600 hover:to-indigo-700 transition-all duration-200"
              >
                {showInspectionSection ? 'Hide' : 'Show'} Reports
              </button>
            </div>
          </div>

          {/* Inspection Reports Content */}
          {showInspectionSection && (
            <div className="space-y-6">
              {/* Loading State */}
              {isLoadingInspection && (
                <div className="text-center py-12">
                  <div className="inline-flex items-center space-x-3">
                    <RefreshCw className="w-6 h-6 text-purple-500 animate-spin" />
                    <span className="text-lg font-medium text-gray-700">Loading inspection reports...</span>
                  </div>
                </div>
              )}

              {/* Empty State - No Reports Yet */}
              {!isLoadingInspection && inspectionReports.length === 0 && (
                <div className="text-center py-16">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-indigo-600/20 rounded-full blur-2xl animate-pulse"></div>
                    <div className="relative w-24 h-24 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                      <FileSearch className="w-12 h-12 text-white" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">No inspection reports found</h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    No inspection reports are currently available.
                  </p>
                  <button
                    onClick={async () => {
                      setIsLoadingInspection(true);
                      setInspectionError(null);
                      try {
                        const response = await apiRepository.getInspectionReports(1, 20);
                        if (response.success && response.data) {
                          setInspectionReports(response.data);
                        }
                      } catch (error: any) {
                        console.error('Error fetching inspection reports:', error);
                        setInspectionError(error.message || 'Failed to fetch inspection reports');
                      } finally {
                        setIsLoadingInspection(false);
                      }
                    }}
                    className="group inline-flex items-center px-8 py-4 text-lg font-bold rounded-2xl text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110"
                  >
                    <RefreshCw className="w-6 h-6 mr-3 group-hover:rotate-180 transition-transform duration-300" />
                    Refresh Inspection Reports
                  </button>
                </div>
              )}

              {/* Reports Grid */}
              {!isLoadingInspection && inspectionReports.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {inspectionReports.map((report: any) => (
                    <div
                      key={report.id}
                      className="group bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-white/30 overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                              <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">
                                Inspection Report
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 line-clamp-2">
                              {report.address?.fullAddress || 'No address'}
                            </h3>
                          </div>
                        </div>

                        <div className="space-y-2 mb-4 text-sm">
                          <div className="flex items-center text-gray-600">
                            <MapPin className="w-4 h-4 mr-2 text-purple-500" />
                            <span className="line-clamp-1">{report.address?.suburb || 'N/A'}</span>
                          </div>
                          <div className="flex items-center text-gray-600">
                            <User className="w-4 h-4 mr-2 text-purple-500" />
                            <span>{report.primaryContact?.name || report.primaryContact?.firstName || 'No contact'}</span>
                          </div>
                          <div className="flex items-center text-gray-600">
                            <Calendar className="w-4 h-4 mr-2 text-purple-500" />
                            <span>
                              {report.createdAt
                                ? new Date(report.createdAt).toLocaleDateString()
                                : 'No date'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                          <span className="text-xs text-gray-500">
                            ID: {report.inspectionId || 'N/A'}
                          </span>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => handleDeleteInspectionReport(report.id, e)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Report"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                router.push(`/valuation-reports/${report.id}/edit`);
                              }}
                              className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300"
                            >
                              View Report
                              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </main>


      {/* Floating Status Indicator */}
      <div className="fixed bottom-8 left-[112px] z-50">
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 p-4 transform transition-all duration-500 hover:scale-105">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
            <div className="text-sm font-medium text-gray-700">
              {filteredReports.length} of {valuationReports.length} valuation reports
            </div>
          </div>
        </div>
      </div>

      </div>

      {/* Preview Modal */}
      {showPreviewModal && previewReportId && (
        <PreviewReportModal
          isOpen={showPreviewModal}
          onClose={handleClosePreview}
          reportId={previewReportId}
          propertyAddress={previewAddress}
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
