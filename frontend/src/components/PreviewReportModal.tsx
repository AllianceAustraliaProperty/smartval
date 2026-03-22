'use client';

import React, { useState } from 'react';
import { X, Download, ExternalLink, Loader2, RefreshCw } from 'lucide-react';

interface PreviewReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: string;
  propertyAddress?: string;
}

export function PreviewReportModal({ 
  isOpen, 
  onClose, 
  reportId, 
  propertyAddress 
}: PreviewReportModalProps) {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateReport = async () => {
    if (!reportId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Import the API repository dynamically to avoid circular dependencies
      const { apiRepository } = await import('@/lib/api-repository');
      const html = await apiRepository.generateReportPreview(reportId);
      setHtmlContent(html);
    } catch (err) {
      console.error('Failed to generate report:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!reportId) return;
    
    try {
      setIsLoading(true);
      
      // Import API_BASE_URL dynamically
      const { API_BASE_URL } = await import('@/lib/api-config');
      
      // Call the PDF generation endpoint
      const response = await fetch(`${API_BASE_URL}/api/valuation-reports/${reportId}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF report');
      }

      // Get the PDF blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `valuation-report-${reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download PDF:', err);
      setError(err instanceof Error ? err.message : 'Failed to download PDF');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenInNewTab = () => {
    if (!htmlContent) return;
    
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(htmlContent);
      newWindow.document.close();
    }
  };

  // Generate report when modal opens (always fetch fresh data)
  React.useEffect(() => {
    if (isOpen && !isLoading) {
      handleGenerateReport();
    }
  }, [isOpen]);

  // Clear cached content when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setHtmlContent('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-7xl bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Report Preview
              </h2>
              {propertyAddress && (
                <p className="text-sm text-gray-600 mt-1">
                  {propertyAddress}
                </p>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {htmlContent && (
                <>
                  <button
                    onClick={handleGenerateReport}
                    disabled={isLoading}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>

                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </button>

                  <button
                    onClick={handleOpenInNewTab}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in New Tab
                  </button>
                </>
              )}

              <button
                onClick={onClose}
                className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">Generating report...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <X className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Failed to Generate Report
                  </h3>
                  <p className="text-gray-600 mb-4">{error}</p>
                  <button
                    onClick={handleGenerateReport}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {htmlContent && !isLoading && !error && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <iframe
                  srcDoc={htmlContent}
                  className="w-full h-[80vh] border-0"
                  title="Report Preview"
                  sandbox="allow-same-origin allow-scripts"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PreviewReportModal;
