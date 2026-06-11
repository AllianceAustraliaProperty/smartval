'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRepository } from '@/lib/api-repository';
import { ArrowLeft, X, FilePlus2 } from 'lucide-react';

export default function NewValuationReportPage() {
  const router = useRouter();

  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newReportData, setNewReportData] = useState({
    valuationType: '',
    valuationDate: new Date().toISOString().split('T')[0], // Default to today
  });

  const handleSubmitNewReport = async () => {
    // Validate required fields
    if (!newReportData.valuationType || !newReportData.valuationDate) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);

      // Create the valuation report with initial data
      const { reportId } = await apiRepository.createValuationReport(newReportData);

      // Navigate to the report edit page
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-blue-100">
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={handleCancel}
                className="group flex items-center space-x-3 px-4 py-2 text-gray-600 hover:text-blue-600 transition-colors duration-300"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
                <span className="font-medium">Back to Valuation Reports</span>
              </button>

              <div className="h-8 w-px bg-gray-300"></div>

              <div>
                <h1 className="text-3xl font-bold text-gray-900">Create New Valuation Report</h1>
                <p className="text-gray-600">Start by selecting the valuation type and date</p>
              </div>
            </div>
          </div>

          {/* Create Valuation Report Modal */}
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-fade-in-up">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Valuation Report</h2>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <X className="w-5 h-5 text-red-500" />
                    <p className="text-red-800 font-medium">{error}</p>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {/* Valuation Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valuation Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newReportData.valuationType}
                    onChange={(e) => setNewReportData({ ...newReportData, valuationType: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  >
                    <option value="">Select valuation type</option>
                    <option value="Capital Gains">Capital Gains</option>
                    <option value="Market Assessment">Market Assessment</option>
                    <option value="Stamp Duty">Stamp Duty</option>
                    <option value="Transfer Duty">Transfer Duty</option>
                    <option value="SMSF Audit">SMSF Audit</option>
                    <option value="Land Valuation">Land Valuation</option>
                    <option value="Commercial Short Report">Commercial Short Report</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Retrospective Capital Gains">Retrospective Capital Gains</option>
                    <option value="Rural">Rural</option>
                    <option value="Probate Valuation">Probate Valuation</option>
                  </select>
                </div>

                {/* Valuation Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valuation Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={newReportData.valuationDate}
                    onChange={(e) => setNewReportData({ ...newReportData, valuationDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-4 mt-8">
                <button
                  onClick={handleCancel}
                  disabled={isCreating}
                  className="flex-1 px-6 py-3 text-sm font-medium rounded-xl text-gray-700 bg-white border-2 border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitNewReport}
                  disabled={isCreating || !newReportData.valuationType || !newReportData.valuationDate}
                  className="flex-1 inline-flex items-center justify-center px-6 py-3 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isCreating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
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
