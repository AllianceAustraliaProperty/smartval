"use client";

import React, { useState } from 'react';
import { RoomCategory, FlooringType, FeatureFixture, PrimeCostItem, PhotoAnalysisResult } from '@/types/photo-analysis';
import { AiFieldHighlight } from './AiFieldHighlight';
import { Loader2 } from 'lucide-react';

interface FormState {
  category: RoomCategory | '';
  flooring: FlooringType | '';
  featuresAndFixtures: FeatureFixture[];
  primeCostItems: PrimeCostItem[];
}

export const PhotoUploadForm: React.FC = () => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form values
  const [formData, setFormData] = useState<FormState>({
    category: '',
    flooring: '',
    featuresAndFixtures: [],
    primeCostItems: []
  });

  // Track which fields were AI-suggested
  const [aiSuggestedFields, setAiSuggestedFields] = useState<Set<keyof FormState>>(new Set());

  const handleAnalyzePhoto = async () => {
    if (!imageUrl) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageUrl, 
          // If the user already manually selected a category, we can pass it as context
          expectedCategory: formData.category !== '' ? formData.category : undefined 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze photo');
      }

      const { data }: { data: PhotoAnalysisResult } = await response.json();
      
      const newSuggestedFields = new Set<keyof FormState>();
      
      setFormData(prev => {
        const updated = { ...prev };

        // Only overwrite fields if they are currently empty or if we want AI to take precedence.
        // Usually, we don't overwrite user-entered data silently. 
        if (data.category && !prev.category) {
          updated.category = data.category;
          newSuggestedFields.add('category');
        }
        
        if (data.flooring && !prev.flooring) {
          updated.flooring = data.flooring;
          newSuggestedFields.add('flooring');
        }
        
        if (data.featuresAndFixtures && data.featuresAndFixtures.length > 0) {
          // Merge arrays or replace depending on logic. Here we replace for simplicity if currently empty.
          if (prev.featuresAndFixtures.length === 0) {
            updated.featuresAndFixtures = data.featuresAndFixtures;
            newSuggestedFields.add('featuresAndFixtures');
          }
        }
        
        if (data.primeCostItems && data.primeCostItems.length > 0) {
          if (prev.primeCostItems.length === 0) {
            updated.primeCostItems = data.primeCostItems;
            newSuggestedFields.add('primeCostItems');
          }
        }

        return updated;
      });
      
      setAiSuggestedFields(newSuggestedFields);

    } catch (err: any) {
      setError(err.message || 'An error occurred during analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleManualChange = (field: keyof FormState, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Remove the AI highlight if the user manually changes the field
    setAiSuggestedFields(prev => {
      const updated = new Set(prev);
      updated.delete(field);
      return updated;
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm border border-gray-100">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Photo Details</h2>
      
      {/* Upload/URL input for demo */}
      <div className="mb-6 space-y-2">
        <label className="block text-sm font-medium text-gray-700">Image URL or Data URI</label>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/kitchen.jpg"
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 text-sm"
          />
          <button
            onClick={handleAnalyzePhoto}
            disabled={!imageUrl || isAnalyzing}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {isAnalyzing ? <Loader2 className="animate-spin" size={16} /> : 'Auto-fill with AI'}
          </button>
        </div>
        {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
      </div>

      <div className="space-y-6">
        {/* Category Field */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <AiFieldHighlight isAiSuggested={aiSuggestedFields.has('category')}>
            <select 
              value={formData.category}
              onChange={(e) => handleManualChange('category', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 border p-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Select a category</option>
              <option value="Kitchen">Kitchen</option>
              <option value="Bathroom">Bathroom</option>
              <option value="Bedroom">Bedroom</option>
              <option value="Living">Living</option>
            </select>
          </AiFieldHighlight>
        </div>

        {/* Flooring Field */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Flooring</label>
          <AiFieldHighlight isAiSuggested={aiSuggestedFields.has('flooring')}>
            <select 
              value={formData.flooring}
              onChange={(e) => handleManualChange('flooring', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 border p-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Select flooring</option>
              <option value="Carpet">Carpet</option>
              <option value="Tile Flooring">Tile Flooring</option>
              <option value="Hardwood">Hardwood</option>
            </select>
          </AiFieldHighlight>
        </div>

        {/* Features & Fixtures */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Features & Fixtures (Comma separated for demo)</label>
          <AiFieldHighlight isAiSuggested={aiSuggestedFields.has('featuresAndFixtures')}>
            <input 
              type="text" 
              value={formData.featuresAndFixtures.join(', ')}
              onChange={(e) => handleManualChange('featuresAndFixtures', e.target.value.split(',').map(s => s.trim()))}
              className="mt-1 block w-full rounded-md border-gray-300 border p-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="e.g. blinds, ceiling fan"
            />
          </AiFieldHighlight>
        </div>
      </div>
      
      <div className="mt-8 flex justify-end">
        <button className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-2 rounded-md text-sm font-medium transition-colors">
          Save Draft
        </button>
      </div>
    </div>
  );
};
