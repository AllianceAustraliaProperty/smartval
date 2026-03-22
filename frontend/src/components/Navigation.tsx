import React from 'react';
import { 
  Home, 
  DollarSign, 
  Building, 
  MapPin, 
  Camera, 
  FileText, 
  MessageCircle, 
  TrendingUp, 
  Paperclip,
  Settings,
  Hammer,
  Scale,
  Map,
  ClipboardList,
  Shield,
  Bed,
  Bath,
  Car,
  Square,
  User,
  Navigation as NavigationIcon
} from 'lucide-react';

export interface Section {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  isCompleted?: boolean;
  hasErrors?: boolean;
}

const sections: Section[] = [
  { id: 'propertyAddress', title: 'Property Address', icon: NavigationIcon },
  { id: 'valuationDetails', title: 'Valuation Details', icon: DollarSign },
  // { id: 'primaryContact', title: 'Primary Contact', icon: User },
  { id: 'propertyDetails', title: 'Property Details', icon: Building },
  { id: 'locationDetails', title: 'Location Details', icon: MapPin },
  { id: 'propertyDescriptors', title: 'Property Descriptors', icon: ClipboardList },
  { id: 'ancillaryImprovements', title: 'Ancillary Improvements', icon: Hammer },
  { id: 'generalComments', title: 'General Comments', icon: MessageCircle },
  // { id: 'referralDetails', title: 'Referral Details', icon: User },
  { id: 'comparables', title: 'Comparables', icon: Scale },
  { id: 'photos', title: 'Photos', icon: Camera }
];

interface NavigationProps {
  currentSection: string;
  onSectionChange: (sectionId: string) => void;
  completedSections: Set<string>;
  sectionsWithErrors: Set<string>;
  propertyData?: {
    valuationType?: string;
    valuationDate?: string;
    bedrooms?: number;
    bathrooms?: number;
    carSpaces?: number;
    buildingArea?: number;
    siteArea?: number;
    marketValue?: number;
  };
}

export const Navigation: React.FC<NavigationProps> = ({
  currentSection,
  onSectionChange,
  completedSections,
  sectionsWithErrors,
  propertyData
}) => {
  return (
    <nav className="fixed left-0 top-0 bg-white/90 backdrop-blur-xl border-r border-white/30 w-80 h-screen overflow-y-auto z-20 shadow-2xl">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 via-white/30 to-blue-100/50 pointer-events-none"></div>
      
      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8 p-4 bg-gradient-to-r from-blue-500 to-blue-700 rounded-2xl shadow-lg">
          <div className="relative">
            <div className="absolute inset-0 bg-white/20 rounded-xl blur-sm"></div>
            <div className="relative w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Building className="w-7 h-7 text-white drop-shadow-lg" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white drop-shadow-lg">SMARTval</h1>
            <p className="text-blue-100 text-sm font-medium">Property Valuation</p>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="space-y-2">
          {sections.map((section, index) => {
            const Icon = section.icon;
            const isActive = currentSection === section.id;
            const isCompleted = completedSections.has(section.id);
            const hasErrors = sectionsWithErrors.has(section.id);

            return (
              <button
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                className={`
                  group w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg relative overflow-hidden
                  ${isActive 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 border border-blue-400' 
                    : hasErrors
                    ? 'bg-gradient-to-r from-red-50 to-red-100 text-red-700 border border-red-200 hover:from-red-100 hover:to-red-150'
                    : isCompleted
                    ? 'bg-gradient-to-r from-green-50 to-green-100 text-green-700 border border-green-200 hover:from-green-100 hover:to-green-150'
                    : 'bg-white/70 backdrop-blur-sm text-gray-700 border border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'
                  }
                `}
              >
                {/* Glow effect for active item */}
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-blue-600/20 rounded-xl blur-xl"></div>
                )}
                
                <div className="relative flex-shrink-0">
                  <Icon 
                    className={`w-5 h-5 transition-all duration-300 ${
                      isActive ? 'text-white drop-shadow-lg scale-110' : 
                      hasErrors ? 'text-red-500' :
                      isCompleted ? 'text-green-600' : 
                      'text-gray-500 group-hover:text-blue-600'
                    }`} 
                  />
                </div>
                
                <div className="relative flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate transition-colors duration-300 ${
                    isActive ? 'text-white drop-shadow-sm' : 
                    hasErrors ? 'text-red-700' :
                    isCompleted ? 'text-green-700' :
                    'text-gray-900 group-hover:text-blue-700'
                  }`}>
                    {section.title}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-xs transition-colors duration-300 ${
                      isActive ? 'text-blue-100' : 
                      hasErrors ? 'text-red-500' :
                      isCompleted ? 'text-green-500' :
                      'text-gray-500 group-hover:text-blue-500'
                    }`}>
                      Step {index + 1}
                    </span>
                    
                    {/* Status indicators */}
                    <div className="flex items-center space-x-1">
                      {isCompleted && !hasErrors && (
                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      {hasErrors && (
                        <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      {!isCompleted && !hasErrors && !isActive && (
                        <div className="w-3 h-3 bg-gray-300 rounded-full transition-colors duration-300 group-hover:bg-blue-400"></div>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Progress Section */}
        <div className="mt-8 p-6 bg-gradient-to-br from-white/70 to-blue-50/70 backdrop-blur-sm rounded-2xl border border-white/50 shadow-lg">
          <div className="flex items-center justify-between text-sm mb-3">
            <span className="font-semibold text-gray-700">Overall Progress</span>
            <span className="font-bold text-blue-700 text-lg">
              {completedSections.size}/{sections.length}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-700 ease-out shadow-lg relative overflow-hidden"
              style={{ width: `${(completedSections.size / sections.length) * 100}%` }}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
            </div>
          </div>
          
          <div className="flex justify-between text-xs mt-2 text-gray-600">
            <span>{Math.round((completedSections.size / sections.length) * 100)}% Complete</span>
            <span>{sections.length - completedSections.size} remaining</span>
          </div>
        </div>


        {/* Property Summary */}
        {propertyData && (
          <div className="mt-4 p-4 bg-gradient-to-br from-white/70 to-blue-50/70 backdrop-blur-sm rounded-xl border border-white/50 shadow-lg">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center">
              <Building className="w-4 h-4 mr-2 text-blue-600" />
              Property Summary
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Left Column */}
              <div className="space-y-2">
                <div className="text-center">
                  <div className="text-xs font-medium text-gray-600 mb-1">Valuation Type</div>
                  <div className="text-xs font-semibold text-gray-800">
                    {propertyData.valuationType || 'Not set'}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-xs font-medium text-gray-600 mb-1">Valuation Date</div>
                  <div className="text-xs font-semibold text-gray-800">
                    {propertyData.valuationDate ? new Date(propertyData.valuationDate).toLocaleDateString('en-AU') : 'Not set'}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="flex justify-center mb-1">
                    <Bed className="w-3 h-3 text-blue-500" />
                  </div>
                  <div className="text-xs font-semibold text-gray-800">
                    {propertyData.bedrooms ?? 'Not set'}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="flex justify-center mb-1">
                    <Bath className="w-3 h-3 text-blue-500" />
                  </div>
                  <div className="text-xs font-semibold text-gray-800">
                    {propertyData.bathrooms ?? 'Not set'}
                  </div>
                </div>
              </div>
              
              {/* Right Column */}
              <div className="space-y-2">
                <div className="text-center">
                  <div className="flex justify-center mb-1">
                    <Car className="w-3 h-3 text-blue-500" />
                  </div>
                  <div className="text-xs font-semibold text-gray-800">
                    {propertyData.carSpaces ?? 'Not set'}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="flex justify-center mb-1">
                    <Building className="w-3 h-3 text-blue-500" />
                  </div>
                  <div className="text-xs font-semibold text-gray-800">
                    {propertyData.buildingArea ? `${propertyData.buildingArea} m²` : 'Not set'}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="flex justify-center mb-1">
                    <Square className="w-3 h-3 text-blue-500" />
                  </div>
                  <div className="text-xs font-semibold text-gray-800">
                    {propertyData.siteArea ? `${propertyData.siteArea} m²` : 'Not set'}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-xs font-medium text-gray-600 mb-1">Market Value</div>
                  <div className="text-xs font-bold text-green-700">
                    {propertyData.marketValue ? `$${propertyData.marketValue.toLocaleString()}` : 'Not set'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}; 