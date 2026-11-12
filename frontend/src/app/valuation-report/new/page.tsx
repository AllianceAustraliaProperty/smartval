'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRepository } from '@/lib/api-repository';
import { ArrowLeft, X, FilePlus2, ChevronDown, Loader2 } from 'lucide-react';
import { Montserrat } from 'next/font/google';
import { Select } from '@/components/ui/FormField';

const montserrat = Montserrat({ subsets: ['latin'] });

export default function NewValuationReportPage() {
  const router = useRouter();

  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingFileNumber, setIsLoadingFileNumber] = useState(false);
  const [newReportData, setNewReportData] = useState({
    logoType: 'AAP',
    fileNumber: '',
    valuationType: '',
    valuationDate: new Date().toISOString().split('T')[0], // Default to today
  });

  useEffect(() => {
    let isMounted = true;
    const fetchNextNumber = async () => {
      if (!newReportData.logoType) return;
      try {
        setIsLoadingFileNumber(true);
        const res = await apiRepository.getNextFileNumber(newReportData.logoType);
        if (isMounted && res?.nextFileNumber) {
          setNewReportData(prev => ({ ...prev, fileNumber: res.nextFileNumber }));
        }
      } catch (err) {
        console.error('Failed to get next file number:', err);
      } finally {
        if (isMounted) setIsLoadingFileNumber(false);
      }
    };

    fetchNextNumber();
    return () => {
      isMounted = false;
    };
  }, [newReportData.logoType]);

  const handleSubmitNewReport = async () => {
    // Validate required fields
    if (!newReportData.valuationType || !newReportData.valuationDate) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);

      // Create the valuation report with initial data (including logoType and fileNumber)
      const { reportId } = await apiRepository.createValuationReport(newReportData);

      // navigate to the report edit page
      router.push(`/valuation-reports/${reportId}/edit`);
    } catch (err) {
      console.error('Failed to create valuation report:', err);
      setError('Failed to create valuation report. Please try again.');
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    router.push('/valuation-reports');
  };

  return (
    <div className={`${montserrat.className} min-h-screen bg-[#F8F9FA]`}>
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={handleCancel}
                className="group flex items-center space-x-3 px-4 py-2 text-gray-600 hover:text-[#006ABE] transition-colors duration-200 cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" />
                <span className="font-semibold text-sm">Back to Valuation Reports</span>
              </button>

              <div className="h-6 w-px bg-gray-300"></div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#006ABE] tracking-tight">
                  Create New Valuation Report
                </h1>
                <p className="text-sm text-gray-500 font-medium">
                  Start by selecting the valuation type and date
                </p>
              </div>
            </div>
          </div>

          {/* Create Valuation Report Modal */}
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[28px] border border-[#DCE5F2] shadow-2xl max-w-lg w-full p-8 sm:p-10 animate-fade-in-up">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-extrabold text-[#006ABE] tracking-tight">
                    Create Valuation Report
                  </h2>
                  <p className="text-sm text-gray-500 font-medium mt-1">
                    Enter the core details to initialize this valuation.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="w-8 h-8 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
                  <div className="flex items-center space-x-3">
                    <X className="w-5 h-5 text-red-500 shrink-0" />
                    <p className="text-red-800 font-medium text-sm">{error}</p>
                  </div>
                </div>
              )}

              <div className="space-y-5">
                {/* Logo Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Logo Type <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={newReportData.logoType}
                    onChange={(e) => setNewReportData({ ...newReportData, logoType: e.target.value })}
                  >
                    <option value="AAP">AAP</option>
                    <option value="CPV">CPV</option>
                    <option value="TAMN">TAMN</option>
                  </Select>
                </div>

                {/* File Number */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-semibold text-gray-700">
                      File Number
                    </label>
                    {isLoadingFileNumber && (
                      <span className="text-xs text-[#0052cc] animate-pulse font-medium">Detecting next number...</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={newReportData.fileNumber}
                    onChange={(e) => setNewReportData({ ...newReportData, fileNumber: e.target.value })}
                    placeholder="e.g., PV020962 or CPV1490"
                    className="w-full h-12 px-5 rounded-full border-2 border-gray-400/80 hover:border-[#006ABE] focus:border-[#006ABE] focus:ring-2 focus:ring-[#006ABE]/20 text-gray-900 bg-white font-mono text-sm outline-none transition-all"
                  />
                  <p className="text-xs text-gray-400 mt-1 pl-3">Autofilled based on the last report under {newReportData.logoType}</p>
                </div>

                {/* Valuation Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Valuation Type <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={newReportData.valuationType}
                    onChange={(e) => setNewReportData({ ...newReportData, valuationType: e.target.value })}
                  >
                    <option value="">Select valuation type</option>
                    <option value="CGT 2027">CGT 2027</option>
                    <option value="Capital Gains">Capital Gains</option>
                    <option value="Market Assessment">Market Assessment</option>
                    <option value="Stamp Duty">Stamp Duty</option>
                    <option value="Transfer Duty">Transfer Duty</option>
                    <option value="SMSF Audit">SMSF Audit</option>
                    <option value="Land Valuation">Land Valuation</option>
                    <option value="Commercial Short Report">Commercial Short Report</option>
                    <option value="Rent Review">Rent Review</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Retrospective Capital Gains">Retrospective Capital Gains</option>
                    <option value="Rural">Rural</option>
                    <option value="Probate Valuation">Probate Valuation</option>
                    <option value="Family Law">Family Law</option>
                    <option value="Financial Settlement">Financial Settlement</option>
                  </Select>
                </div>

                {/* Valuation Date */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Valuation Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={newReportData.valuationDate}
                    onChange={(e) => setNewReportData({ ...newReportData, valuationDate: e.target.value })}
                    className="w-full h-12 px-5 rounded-full border-2 border-gray-400/80 hover:border-[#006ABE] focus:border-[#006ABE] focus:ring-2 focus:ring-[#006ABE]/20 text-gray-900 bg-white font-medium text-sm outline-none transition-all"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-4 mt-8">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isCreating}
                  className="flex-1 h-12 px-6 text-sm font-semibold rounded-full text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitNewReport}
                  disabled={isCreating || !newReportData.valuationType || !newReportData.valuationDate}
                  className="flex-1 h-12 inline-flex items-center justify-center px-6 text-sm font-bold rounded-full text-white bg-[#006ABE] hover:bg-[#00589e] shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 text-white animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <FilePlus2 className="w-4 h-4 mr-2" />
                      Create Report
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
