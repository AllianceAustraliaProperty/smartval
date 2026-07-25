import React, { useState, useRef, useEffect } from 'react';
import { FormField, Input, Checkbox, FileUpload, Select } from '../ui/FormField';
import { SectionProps } from '@/types/property-valuation';
import { Upload, X, Edit3, Wand2 } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';
import { uploadMultipleFilesToS3 } from '@/lib/s3-upload';

// Import the constants
const ROOM_CATEGORIES = [
  'Alfresco', 'Balcony', 'Bathroom', 'Bedroom', 'Bedroom 1', 'Bedroom 2', 'Bedroom 3', 'Bedroom 4', 'Bedroom 5', 'Bedroom 6',
  'Deck', 'Dining', 'Ensuite', 'Ensuite 2', 'Entertainment Area', 'Family', 'Family And Meals', 'Formal Dining', 'General',
  'Kitchen', 'Kitchen 1', 'Kitchen 2', 'Kitchen And Dining', 'Kitchen And Meals', 'Laundry', 'Living', 'Living And Dining',
  'Lounge', 'Office Room', 'Media Room', 'Patio', 'Porch', 'Powder Room', 'Retreat', 'Rumpus', 'Storage', 'Study', 'Sunroom',
  'Swimming Pool', 'Theatre Room', 'Toilet', 'Workshop'
];

const FLOORING_OPTIONS = [
  'Brick', 'Carpet', 'Concrete Flooring', 'Cork', 'Hardwood', 'Laminated Floorboards', 'Marble Flooring', 'Parquet',
  'Polished Concrete', 'Porcelain Tile', 'Floorboards', 'Rubber Mat', 'Tile Flooring', 'Timber Flooring', 'Vinyl', 'Other'
];

const PRIME_COST_ITEMS = [
  "butler's pantry", 'ceiling fans', 'cooktop', 'dishwasher', 'double bowl sink', 'ducted air conditioning',
  'ducted heater', 'european laundry', 'evaporative cooling system', 'exhaust fan', 'extra toilet', 'fireplace',
  'fly screen', 'freestanding cooktop', 'gas heater', 'heater', 'heat lamp', 'hot water system', 'internal laundry',
  'kitchenette', 'linen', 'oven', 'paths', 'pergola', 'powder room', 'rangehood', 'retaining walls', 'roller shutters',
  'room unit air conditioning', 'separate toilet', 'shed', 'shower', 'single bowl sink', 'solar panels', 'spa',
  'split system air conditioning', 'stainless steel laundry tub', 'swimming pool', 'toilet suite', 'vanity',
  'verandah', 'walk-in pantry', 'wall mounted heater', 'wood heater'
];

// Room-specific features and prime cost items
const ROOM_FEATURES: Record<string, string[]> = {
  'Bathroom': ['aluminium framed windows', 'fitted mirror', 'bath tub', 'timber framed windows'],
  'Ensuite': ['aluminium framed windows', 'fitted mirror', 'bath tub', 'timber framed windows'],
  'Ensuite 2': ['aluminium framed windows', 'fitted mirror', 'bath tub', 'timber framed windows'],
  'Bedroom': ['aluminium framed windows', 'built-in wardrobe', 'timber framed windows', 'blinds', 'plantation shutters', 'walk-in wardrobe', 'sliding door', 'timber glazed door'],
  'Bedroom 1': ['aluminium framed windows', 'built-in wardrobe', 'timber framed windows', 'blinds', 'plantation shutters', 'walk-in wardrobe', 'sliding door', 'timber glazed door'],
  'Bedroom 2': ['aluminium framed windows', 'built-in wardrobe', 'timber framed windows', 'blinds', 'plantation shutters', 'walk-in wardrobe', 'sliding door', 'timber glazed door'],
  'Bedroom 3': ['aluminium framed windows', 'built-in wardrobe', 'timber framed windows', 'blinds', 'plantation shutters', 'walk-in wardrobe', 'sliding door', 'timber glazed door'],
  'Bedroom 4': ['aluminium framed windows', 'built-in wardrobe', 'timber framed windows', 'blinds', 'plantation shutters', 'walk-in wardrobe', 'sliding door', 'timber glazed door'],
  'Bedroom 5': ['aluminium framed windows', 'built-in wardrobe', 'timber framed windows', 'blinds', 'plantation shutters', 'walk-in wardrobe', 'sliding door', 'timber glazed door'],
  'Bedroom 6': ['aluminium framed windows', 'built-in wardrobe', 'timber framed windows', 'blinds', 'plantation shutters', 'walk-in wardrobe', 'sliding door', 'timber glazed door'],
  'Dining': ['aluminium framed windows', 'timber framed windows', 'blinds', 'plantation shutters', 'sliding door', 'bi-fold door', 'aluminium glazed door', 'timber glazed door'],
  'Formal Dining': ['aluminium framed windows', 'timber framed windows', 'blinds', 'plantation shutters', 'sliding door', 'aluminium glazed door'],
  'Kitchen': ['aluminium framed windows', 'timber framed windows', 'blinds', 'plantation shutters', 'sliding door', 'kitchen cupboards', 'overhead cupboards'],
  'Kitchen 1': ['aluminium framed windows', 'timber framed windows', 'blinds', 'plantation shutters', 'sliding door', 'kitchen cupboards', 'overhead cupboards'],
  'Kitchen 2': ['aluminium framed windows', 'timber framed windows', 'blinds', 'plantation shutters', 'sliding door', 'kitchen cupboards', 'overhead cupboards'],
  'Kitchen And Dining': ['aluminium framed windows', 'timber framed windows', 'blinds', 'plantation shutters', 'sliding door', 'kitchen cupboards', 'overhead cupboards'],
  'Kitchen And Meals': ['aluminium framed windows', 'timber framed windows', 'blinds', 'plantation shutters', 'sliding door', 'kitchen cupboards', 'overhead cupboards'],
  'Laundry': ['aluminium framed windows', 'timber framed windows'],
  'Living': ['aluminium framed windows', 'timber framed windows', 'blinds', 'plantation shutters', 'sliding door', 'bi-fold door', 'timber glazed door'],
  'Living And Dining': ['aluminium framed windows', 'timber framed windows', 'blinds', 'plantation shutters', 'sliding door', 'bi-fold door', 'aluminium glazed door', 'timber glazed door'],
  'Lounge': ['aluminium framed windows', 'timber framed windows', 'blinds', 'plantation shutters', 'sliding door'],
  'Entertainment Area': ['aluminium framed windows', 'timber framed windows', 'blinds', 'plantation shutters', 'sliding door'],
  'Family': ['aluminium framed windows', 'timber framed windows', 'blinds', 'plantation shutters', 'sliding door'],
  'Family And Meals': ['aluminium framed windows', 'timber framed windows', 'blinds', 'plantation shutters', 'sliding door', 'aluminium glazed door'],
  'General': ['security system', 'smoke alarm'],
  'Office Room': ['aluminium framed windows', 'timber framed windows', 'blinds', 'plantation shutters', 'sliding door'],
  'Media Room': ['aluminium framed windows', 'timber framed windows', 'blinds', 'plantation shutters', 'sliding door'],
  'Powder Room': [],
  'Retreat': ['aluminium framed windows', 'timber framed windows', 'blinds', 'plantation shutters', 'sliding door'],
  'Rumpus': ['aluminium framed windows', 'timber framed windows', 'blinds', 'plantation shutters', 'sliding door'],
  'Study': ['aluminium framed windows', 'timber framed windows', 'blinds', 'plantation shutters', 'sliding door', 'built-in wardrobe'],
  'Sunroom': ['aluminium framed windows', 'timber framed windows', 'blinds', 'plantation shutters', 'sliding door'],
  'Theatre Room': ['aluminium framed windows', 'timber framed windows', 'blinds', 'plantation shutters', 'sliding door'],
  'Workshop': ['aluminium framed windows', 'timber framed windows', 'blinds', 'plantation shutters', 'sliding door']
};

const ROOM_PRIME_COST_ITEMS: Record<string, string[]> = {
  'Alfresco': ['ceiling fans', 'retaining walls', 'paths', 'pergola'],
  'Balcony': ['ceiling fans', 'room unit air conditioning', 'split system air conditioning'],
  'Bathroom': ['toilet suite', 'shower', 'vanity', 'exhaust fan', 'heat lamp'],
  'Bedroom': ['ceiling fans', 'room unit air conditioning', 'split system air conditioning', 'ducted air conditioning', 'ducted heater'],
  'Bedroom 1': ['ceiling fans', 'room unit air conditioning', 'split system air conditioning', 'ducted air conditioning', 'ducted heater'],
  'Bedroom 2': ['ceiling fans', 'room unit air conditioning', 'split system air conditioning', 'ducted air conditioning', 'ducted heater'],
  'Bedroom 3': ['ceiling fans', 'room unit air conditioning', 'split system air conditioning', 'ducted air conditioning', 'ducted heater'],
  'Bedroom 4': ['ceiling fans', 'room unit air conditioning', 'split system air conditioning', 'ducted air conditioning', 'ducted heater'],
  'Bedroom 5': ['ceiling fans', 'room unit air conditioning', 'split system air conditioning', 'ducted air conditioning', 'ducted heater'],
  'Bedroom 6': ['ceiling fans', 'room unit air conditioning', 'split system air conditioning', 'ducted air conditioning', 'ducted heater'],
  'Deck': ['ceiling fans', 'room unit air conditioning', 'split system air conditioning', 'ducted air conditioning', 'pergola'],
  'Dining': ['ceiling fans', 'room unit air conditioning', 'split system air conditioning', 'ducted air conditioning', 'ducted heater'],
  'Ensuite': ['toilet suite', 'shower', 'vanity', 'exhaust fan', 'heat lamp'],
  'Ensuite 2': ['toilet suite', 'shower', 'vanity', 'exhaust fan', 'heat lamp'],
  'Entertainment Area': ['ceiling fans', 'room unit air conditioning', 'split system air conditioning', 'ducted air conditioning', 'pergola', 'paths'],
  'Family': ['ceiling fans', 'room unit air conditioning', 'split system air conditioning', 'ducted air conditioning', 'ducted heater'],
  'Family And Meals': ['ceiling fans', 'room unit air conditioning', 'split system air conditioning', 'ducted air conditioning', 'ducted heater'],
  'Formal Dining': ['ceiling fans', 'room unit air conditioning', 'split system air conditioning', 'ducted air conditioning', 'ducted heater'],
  'Kitchen': ['double bowl sink', 'single bowl sink', 'rangehood', 'cooktop', 'oven', 'freestanding cooktop', 'dishwasher'],
  'Kitchen 1': ['double bowl sink', 'single bowl sink', 'rangehood', 'cooktop', 'oven', 'freestanding cooktop', 'dishwasher'],
  'Kitchen 2': ['double bowl sink', 'single bowl sink', 'rangehood', 'cooktop', 'oven', 'freestanding cooktop', 'dishwasher'],
  'Kitchen And Dining': ['double bowl sink', 'single bowl sink', 'rangehood', 'cooktop', 'oven', 'freestanding cooktop', 'dishwasher', 'ceiling fans'],
  'Kitchen And Meals': ['double bowl sink', 'single bowl sink', 'rangehood', 'cooktop', 'oven', 'freestanding cooktop', 'dishwasher', 'ceiling fans'],
  'Laundry': ['stainless steel laundry tub', 'exhaust fan', 'ceiling fans'],
  'Living': ['ceiling fans', 'room unit air conditioning', 'split system air conditioning', 'ducted air conditioning', 'ducted heater'],
  'Living And Dining': ['ceiling fans', 'room unit air conditioning', 'split system air conditioning', 'ducted air conditioning', 'ducted heater'],
  'Lounge': ['ceiling fans', 'room unit air conditioning', 'split system air conditioning', 'ducted air conditioning', 'ducted heater'],
  'Office Room': ['ceiling fans', 'room unit air conditioning', 'split system air conditioning', 'ducted air conditioning'],
  'Media Room': ['ceiling fans', 'room unit air conditioning', 'split system air conditioning', 'ducted air conditioning'],
  'Patio': ['ceiling fans', 'retaining walls', 'paths', 'pergola'],
  'Porch': ['ceiling fans', 'retaining walls', 'paths'],
  'Powder Room': [],
  'Retreat': ['ceiling fans', 'room unit air conditioning', 'split system air conditioning', 'ducted air conditioning'],
  'Rumpus': ['ceiling fans', 'room unit air conditioning', 'split system air conditioning', 'ducted air conditioning'],
  'Storage': ['ceiling fans'],
  'Study': ['ceiling fans', 'room unit air conditioning', 'split system air conditioning', 'ducted air conditioning'],
  'Sunroom': ['ceiling fans', 'room unit air conditioning', 'split system air conditioning', 'ducted air conditioning'],
  'Theatre Room': ['ceiling fans', 'room unit air conditioning', 'split system air conditioning', 'ducted air conditioning'],
  'Workshop': ['shed', 'ceiling fans']
};

interface PhotoUploadProps {
  reportId: string;
  onPhotosUpdate: (photos: any[]) => void;
}

const PhotoUploadComponent: React.FC<PhotoUploadProps> = ({ reportId, onPhotosUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [editingPhoto, setEditingPhoto] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const individualFileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const photoGridRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const [automatingPhotos, setAutomatingPhotos] = useState<Set<number>>(new Set());

  const handleAutomatePhoto = async (index: number, photoUrl: string, expectedCategory?: string) => {
    console.log("Automating photo:", { index, photoUrl, expectedCategory });
    if (!photoUrl) return;

    setAutomatingPhotos(prev => {
      const newSet = new Set(prev);
      newSet.add(index);
      return newSet;
    });
    setUploadError(null);

    try {
      console.log("Sending request to /api/analyze-photo...");
      const response = await fetch('/api/analyze-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageUrl: photoUrl, 
          expectedCategory: expectedCategory || undefined 
        }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {}
        throw new Error(errorData?.error || 'Failed to analyze photo');
      }

      const { data } = await response.json();
      
      const updatedPhotos = [...photos];
      const photo = { ...updatedPhotos[index] };

      if (data.category && !photo.category) {
        photo.category = data.category;
      }
      if (data.flooring && !photo.flooring) {
        photo.flooring = data.flooring;
      }
      if (data.categorySpecificDetails) {
        if (data.categorySpecificDetails.featuresAndFixtures && data.categorySpecificDetails.featuresAndFixtures.length > 0) {
          // Merge or replace. Let's replace if empty, otherwise merge uniquely
          const current = photo.featuresFixtures || [];
          photo.featuresFixtures = Array.from(new Set([...current, ...data.categorySpecificDetails.featuresAndFixtures]));
        }
        if (data.categorySpecificDetails.primeCostItems && data.categorySpecificDetails.primeCostItems.length > 0) {
          const current = photo.primeCostItems || [];
          photo.primeCostItems = Array.from(new Set([...current, ...data.categorySpecificDetails.primeCostItems]));
        }
      }

      updatedPhotos[index] = photo;
      setPhotos(updatedPhotos);
      onPhotosUpdate(updatedPhotos);

      // Save to database
      await fetch(`${API_BASE_URL}/photos/update/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: updatedPhotos }),
      });

    } catch (err: any) {
      console.error('AI Automation error:', err);
      const errorMsg = err.message || 'An error occurred during AI analysis';
      setUploadError(errorMsg);
      alert(`AI Automation failed: ${errorMsg}`);
    } finally {
      setAutomatingPhotos(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }
  };

  // Fetch photos when component mounts
  useEffect(() => {
    if (reportId && reportId !== 'temp') {
      fetchPhotos();
    }
  }, [reportId]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (reportId === 'temp' || !reportId) {
      setUploadError('Please save the valuation report first before uploading photos.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      // Limit selection to 15 files per upload batch and allow up to 15 to run concurrently
      const { successful, failed } = await uploadMultipleFilesToS3(reportId, files, {
        maxConcurrent: 15,
        maxFiles: 15,
      });

      if (successful.length > 0) {
        console.log(`Successfully uploaded ${successful.length} files to S3`);
        // Refresh photos to get updated list
        await fetchPhotos();
      }

      if (failed.length > 0) {
        const errorMessages = failed.map(f => f.error).join(', ');
        setUploadError(`Failed to upload ${failed.length} files: ${errorMessages}`);
      }

    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const fetchPhotos = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/photos/list/${reportId}`);
      if (response.ok) {
        const data = await response.json();
        const allPhotos = data.photos || [];
        setPhotos(allPhotos);
        onPhotosUpdate(allPhotos);
      }
    } catch (error) {
      console.error('Error fetching photos:', error);
    }
  };

  const deletePhoto = async (photoUrl: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/photos/delete/${reportId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ photoUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }

      // Refresh photos
      await fetchPhotos();
    } catch (error) {
      console.error('Delete error:', error);
      setUploadError(error instanceof Error ? error.message : 'Delete failed');
    }
  };

  const updatePhotoAttribute = (photoIndex: number, attribute: string, value: any) => {
    const updatedPhotos = [...photos];
    const updatedPhoto = {
      ...updatedPhotos[photoIndex],
      [attribute]: value
    };

    // If category is changing, clear features and prime cost items since they're category-specific
    if (attribute === 'category') {
      updatedPhoto.featuresFixtures = [];
      updatedPhoto.primeCostItems = [];
    }

    updatedPhotos[photoIndex] = updatedPhoto;
    setPhotos(updatedPhotos);

    // Update the form data for saving later and trigger dirty state
    onPhotosUpdate(updatedPhotos);
  };

  const addEmptyPhoto = async () => {
    try {
      setUploading(true);
      setUploadError(null);

      const newPhoto = {
        photoUrl: null,
        category: '',
        flooring: '',
        annexureHeader: '',
        internalCondition: '',
        externalCondition: '',
        internalWallsType: '',
        externalWallsType: '',
        featuresFixtures: [],
        primeCostItems: [],
        isCover: false,
        isGallery: false,
        isAnnexure: false
      };

      // Save to database
      const response = await fetch(`${API_BASE_URL}/photos/create/${reportId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPhoto),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create photo');
      }

      const savedPhoto = await response.json();

      // Add the saved photo to local state
      const updatedPhotos = [...photos, savedPhoto];
      setPhotos(updatedPhotos);
      onPhotosUpdate(updatedPhotos);
    } catch (error) {
      console.error('Error creating empty photo:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to create photo');
    } finally {
      setUploading(false);
    }
  };

  const handleDragStart = (index: number, e: React.DragEvent<HTMLDivElement>) => {
    setDragIndex(index);
    isDraggingRef.current = true;
    e.dataTransfer.effectAllowed = 'move';
  };

  // Use a document-level dragover listener to compute the closest card by Y position.
  // This makes drag sensitivity much better because it works even when the cursor
  // is in the gap between cards or slightly outside a card's bounds.
  useEffect(() => {
    const onDocumentDragOver = (e: DragEvent) => {
      if (!isDraggingRef.current || !photoGridRef.current) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';

      const cards = photoGridRef.current.children;
      if (!cards || cards.length === 0) return;

      let closestIndex = 0;
      let closestDist = Infinity;

      for (let i = 0; i < cards.length; i++) {
        const rect = cards[i].getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const dist = Math.abs(e.clientY - midY);
        if (dist < closestDist) {
          closestDist = dist;
          closestIndex = i;
        }
      }

      setDragOverIndex(closestIndex);
    };

    document.addEventListener('dragover', onDocumentDragOver);
    return () => document.removeEventListener('dragover', onDocumentDragOver);
  }, []);

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
    isDraggingRef.current = false;
  };

  const handleDrop = async (dropIndex: number, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (dragIndex === null || dragIndex === dropIndex) {
      handleDragEnd();
      return;
    }

    const reordered = [...photos];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);

    setPhotos(reordered);
    onPhotosUpdate(reordered);
    handleDragEnd();

    try {
      await fetch(`${API_BASE_URL}/photos/update/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: reordered }),
      });
    } catch (error) {
      console.error('Error saving reordered photos:', error);
      setUploadError('Failed to save new photo order');
    }
  };

  const handleIndividualFileUpload = async (photoIndex: number, files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (reportId === 'temp' || !reportId) {
      setUploadError('Please save the valuation report first before uploading photos.');
      return;
    }

    const file = files[0];
    setUploading(true);
    setUploadError(null);

    try {
      // Get file extension
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!fileExtension) {
        throw new Error('Invalid file: no extension found');
      }

      // Get presigned URL
      const response = await fetch(`${API_BASE_URL}/photos/presigned-url/${reportId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileExtension,
          contentType: file.type,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get presigned URL');
      }

      const presignedData = await response.json();

      // Upload to S3
      const uploadResponse = await fetch(presignedData.presignedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadResponse.ok) {
        throw new Error('S3 upload failed');
      }

      console.log(`Successfully uploaded file to S3:`, presignedData.s3Url);

      // Update the photo in local state with the new URL
      const updatedPhotos = [...photos];
      updatedPhotos[photoIndex] = {
        ...updatedPhotos[photoIndex],
        photoUrl: presignedData.s3Url
      };

      // Save updated photos to database
      const updateResponse = await fetch(`${API_BASE_URL}/photos/update/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: updatedPhotos }),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update photo in database');
      }

      // Update local state
      setPhotos(updatedPhotos);
      onPhotosUpdate(updatedPhotos);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {uploadError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600 text-sm">{uploadError}</p>
        </div>
      )}

      {/* Single Photo Upload Section */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Upload Photos
        </h3>

        <div className="space-y-4">
          {/* Upload Button and Add Photo Button */}
          <div className="flex gap-4">
            <div className="flex-1 flex items-center justify-center">
              <label
                htmlFor="file-upload-photos"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-2 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 16MB • Up to 15 photos per upload</p>
                </div>
                <input
                  id="file-upload-photos"
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  accept="image/*"
                  onChange={(event) => handleFileUpload(event.target.files)}
                  disabled={uploading}
                />
              </label>
            </div>
            <div className="flex items-center">
              <button
                type="button"
                onClick={addEmptyPhoto}
                disabled={uploading}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors h-32 flex flex-col items-center justify-center gap-2"
              >
                <Upload className="w-6 h-6" />
                <span>Add Photo</span>
                <span className="text-xs font-normal">Without Image</span>
              </button>
            </div>
          </div>

          {/* Photo Grid */}
          {photos.length > 0 && (
            <div className="space-y-6" ref={photoGridRef}>
              {photos.map((photo, index) => (
                <div
                  key={`photo_${photo.id || photo.photoUrl || index}_${index}`}
                  draggable
                  onDragStart={(e) => handleDragStart(index, e)}
                  onDrop={(e) => handleDrop(index, e)}
                  onDragEnd={handleDragEnd}
                  style={{ cursor: dragIndex === index ? 'grabbing' : 'grab' }}
                  className={`border-2 rounded-lg p-6 bg-white shadow-sm transition-all duration-200 ${dragIndex === index
                    ? 'opacity-50 border-blue-400'
                    : dragOverIndex === index && dragIndex !== null && dragIndex !== index
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-gray-300'
                    }`}>
                  <div className="flex gap-6">
                    {/* Photo - Left Side - Full Image */}
                    <div className="relative group flex-shrink-0 w-1/2">
                      {photo.photoUrl ? (
                        <img
                          src={`${photo.photoUrl}`}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-auto max-h-96 object-contain rounded-lg border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-full h-96 flex flex-col items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
                          <Upload className="w-16 h-16 text-gray-400 mb-4" />
                          <p className="text-gray-500 mb-4">No image uploaded</p>
                          <label
                            htmlFor={`individual-upload-${index}`}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700"
                          >
                            Upload Image
                          </label>
                          <input
                            id={`individual-upload-${index}`}
                            ref={(el) => { individualFileInputRefs.current[index] = el; }}
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleIndividualFileUpload(index, e.target.files)}
                            disabled={uploading}
                          />
                        </div>
                      )}
                      <div className="absolute top-2 right-2 flex gap-2">
                        {photo.photoUrl && (
                          <>
                            <label
                              htmlFor={`replace-upload-${index}`}
                              className="bg-blue-600 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-blue-700 cursor-pointer flex items-center justify-center"
                              title="Upload a different picture"
                            >
                              <Edit3 className="w-4 h-4" />
                            </label>
                            <input
                              id={`replace-upload-${index}`}
                              ref={(el) => { individualFileInputRefs.current[index] = el; }}
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => handleIndividualFileUpload(index, e.target.files)}
                              disabled={uploading}
                            />
                          </>
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            if (photo.photoUrl) {
                              // Photo with URL - delete via delete endpoint (handles S3 cleanup)
                              await deletePhoto(photo.photoUrl);
                            } else {
                              // Empty photo - remove from array and update database
                              try {
                                const updatedPhotos = photos.filter((_, i) => i !== index);

                                // Update database
                                const response = await fetch(`${API_BASE_URL}/photos/update/${reportId}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ photos: updatedPhotos }),
                                });

                                if (!response.ok) {
                                  throw new Error('Failed to delete photo from database');
                                }

                                // Update local state
                                setPhotos(updatedPhotos);
                                onPhotosUpdate(updatedPhotos);
                              } catch (error) {
                                console.error('Delete error:', error);
                                setUploadError(error instanceof Error ? error.message : 'Failed to delete photo');
                              }
                            }
                          }}
                          className="bg-red-600 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-700"
                          title="Delete photo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Photo Details Form - Right Side - Single Column Layout */}
                    <div className="flex-1 w-1/2 space-y-4">
                      {/* 2-Column Grid for Basic Properties */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Left Column */}
                        <div className="space-y-4">
                          {/* Photo Settings - Only show when photo URL exists */}
                          {photo.photoUrl && (
                            <div className="space-y-3 bg-gray-50 p-3 rounded-md">
                              <h4 className="text-sm font-semibold text-gray-800 mb-2">Photo Settings</h4>
                              <label className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={photo.isCover || false}
                                  onChange={(e) => updatePhotoAttribute(index, 'isCover', e.target.checked)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-gray-700">Cover Photo</span>
                              </label>
                              <label className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={photo.isGallery || false}
                                  onChange={(e) => updatePhotoAttribute(index, 'isGallery', e.target.checked)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-gray-700">Gallery</span>
                              </label>
                              <label className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={photo.isAnnexure || false}
                                  onChange={(e) => updatePhotoAttribute(index, 'isAnnexure', e.target.checked)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-gray-700">Annexure</span>
                              </label>
                            </div>
                          )}

                          {/* Basic Details */}
                          <div className="space-y-3 bg-gray-50 p-3 rounded-md">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="text-sm font-semibold text-gray-800">Basic Details</h4>
                              {photo.photoUrl && (
                                <button
                                  type="button"
                                  onClick={() => handleAutomatePhoto(index, photo.photoUrl, photo.category)}
                                  disabled={automatingPhotos.has(index)}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
                                  title="Automate photo details with AI"
                                >
                                  {automatingPhotos.has(index) ? (
                                    <>
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                      Automating...
                                    </>
                                  ) : (
                                    <>
                                      <Wand2 className="w-3 h-3" />
                                      Automate
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-800 mb-1">Category</label>
                              <select
                                value={ROOM_CATEGORIES.includes(photo.category || '') ? (photo.category || '') : ''}
                                onChange={(e) => updatePhotoAttribute(index, 'category', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="">Select Category</option>
                                {ROOM_CATEGORIES.map(cat => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-800 mb-1">Flooring</label>
                              <select
                                value={photo.flooring || ''}
                                onChange={(e) => updatePhotoAttribute(index, 'flooring', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="">Select Flooring</option>
                                {FLOORING_OPTIONS.map(floor => (
                                  <option key={floor} value={floor}>{floor}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-800 mb-1">Annexure Header</label>
                              <input
                                type="text"
                                value={photo.annexureHeader || ''}
                                onChange={(e) => updatePhotoAttribute(index, 'annexureHeader', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter annexure header"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Full Width Sections Below - 3 Column Grid */}
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Features & Fixtures Checkboxes */}
                    <div className="bg-gray-50 p-4 rounded-md">
                      <label className="block text-sm font-semibold text-gray-800 mb-3">Features & Fixtures</label>
                      <div className="max-h-48 overflow-y-auto border-2 border-gray-300 rounded-lg p-4 bg-white">
                        <div className="grid grid-cols-2 gap-2">
                          {/* Predefined features */}
                          {(ROOM_FEATURES[photo.category || ''] || []).map(feature => (
                            <label key={feature} className="flex items-center space-x-2 text-sm hover:bg-gray-50 p-1 rounded">
                              <input
                                type="checkbox"
                                checked={(photo.featuresFixtures || []).includes(feature)}
                                onChange={(e) => {
                                  const current = photo.featuresFixtures || [];
                                  const updated = e.target.checked
                                    ? [...current, feature]
                                    : current.filter((item: string) => item !== feature);
                                  updatePhotoAttribute(index, 'featuresFixtures', updated);
                                }}
                                className="rounded border-gray-400 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-800 font-medium">{feature}</span>
                            </label>
                          ))}
                          {/* Custom features (not in predefined list) */}
                          {(photo.featuresFixtures || [])
                            .filter((item: string) => !(ROOM_FEATURES[photo.category || ''] || []).includes(item))
                            .map((feature: string) => (
                              <label key={`custom-${feature}`} className="flex items-center space-x-2 text-sm hover:bg-gray-50 p-1 rounded bg-blue-50">
                                <input
                                  type="checkbox"
                                  checked={true}
                                  onChange={(e) => {
                                    const current = photo.featuresFixtures || [];
                                    const updated = current.filter((item: string) => item !== feature);
                                    updatePhotoAttribute(index, 'featuresFixtures', updated);
                                  }}
                                  className="rounded border-gray-400 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-800 font-medium">{feature}</span>
                                <span className="text-xs text-blue-600 ml-1">(custom)</span>
                              </label>
                            ))}
                        </div>
                        {(!photo.category || !ROOM_FEATURES[photo.category]) && (photo.featuresFixtures || []).length === 0 && (
                          <p className="text-sm text-gray-600 text-center py-4 bg-gray-100 rounded">Select a category to see features or add custom items</p>
                        )}
                      </div>
                    </div>

                    {/* Prime Cost Items Checkboxes */}
                    <div className="bg-gray-50 p-4 rounded-md">
                      <label className="block text-sm font-semibold text-gray-800 mb-3">Prime Cost Items</label>
                      <div className="max-h-48 overflow-y-auto border-2 border-gray-300 rounded-lg p-4 bg-white">
                        <div className="grid grid-cols-2 gap-2">
                          {/* Predefined prime cost items */}
                          {(ROOM_PRIME_COST_ITEMS[photo.category || ''] || []).map(item => (
                            <label key={item} className="flex items-center space-x-2 text-sm hover:bg-gray-50 p-1 rounded">
                              <input
                                type="checkbox"
                                checked={(photo.primeCostItems || []).includes(item)}
                                onChange={(e) => {
                                  const current = photo.primeCostItems || [];
                                  const updated = e.target.checked
                                    ? [...current, item]
                                    : current.filter((primeItem: string) => primeItem !== item);
                                  updatePhotoAttribute(index, 'primeCostItems', updated);
                                }}
                                className="rounded border-gray-400 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-800 font-medium">{item}</span>
                            </label>
                          ))}
                          {/* Custom prime cost items (not in predefined list) */}
                          {(photo.primeCostItems || [])
                            .filter((item: string) => !(ROOM_PRIME_COST_ITEMS[photo.category || ''] || []).includes(item))
                            .map((item: string) => (
                              <label key={`custom-${item}`} className="flex items-center space-x-2 text-sm hover:bg-gray-50 p-1 rounded bg-green-50">
                                <input
                                  type="checkbox"
                                  checked={true}
                                  onChange={(e) => {
                                    const current = photo.primeCostItems || [];
                                    const updated = current.filter((primeItem: string) => primeItem !== item);
                                    updatePhotoAttribute(index, 'primeCostItems', updated);
                                  }}
                                  className="rounded border-gray-400 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-800 font-medium">{item}</span>
                                <span className="text-xs text-green-600 ml-1">(custom)</span>
                              </label>
                            ))}
                        </div>
                        {(!photo.category || !ROOM_PRIME_COST_ITEMS[photo.category]) && (photo.primeCostItems || []).length === 0 && (
                          <p className="text-sm text-gray-600 text-center py-4 bg-gray-100 rounded">Select a category to see prime cost items or add custom items</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {uploading && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-sm text-gray-600">Uploading...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


interface SimpleAdditionalPhotoUploadProps {
  reportId: string;
  onPhotosUpdate: (photos: any[]) => void;
}

const SimpleAdditionalPhotosUploader: React.FC<SimpleAdditionalPhotoUploadProps> = ({ reportId, onPhotosUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [editingPhoto, setEditingPhoto] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const individualFileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const [customItemInputs, setCustomItemInputs] = useState<{ [key: number]: string }>({});
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const photoGridRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (reportId && reportId !== 'temp') {
      fetchPhotos();
    }
  }, [reportId]);

  const fetchPhotos = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/additional-photos/list/${reportId}`);
      if (res.ok) {
        const data = await res.json();
        const list = data.photos || [];
        setPhotos(list);
        onPhotosUpdate(list);
      }
    } catch (e) {
      console.error('Error fetching additional photos:', e);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (reportId === 'temp' || !reportId) {
      setUploadError('Please save the valuation report first before uploading photos.');
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const { successful, failed } = await uploadMultipleFilesToS3(reportId, files, { maxConcurrent: 15, maxFiles: 15 }, '/additional-photos');
      if (successful.length > 0) {
        await fetchPhotos();
      }
      if (failed.length > 0) {
        const errorMessages = failed.map(f => f.error).join(', ');
        setUploadError(`Failed to upload ${failed.length} files: ${errorMessages}`);
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (photoUrl: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/additional-photos/delete/${reportId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl })
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Delete failed');
      }
      await fetchPhotos();
    } catch (e: any) {
      setUploadError(e?.message || 'Delete failed');
    }
  };

  const updatePhotoAttribute = async (photoIndex: number, attribute: string, value: any) => {
    const updatedPhotos = [...photos];
    const updatedPhoto = {
      ...updatedPhotos[photoIndex],
      [attribute]: value
    };

    // If category is changing, clear features and prime cost items since they're category-specific
    if (attribute === 'category') {
      updatedPhoto.featuresFixtures = [];
      updatedPhoto.primeCostItems = [];
    }

    updatedPhotos[photoIndex] = updatedPhoto;
    setPhotos(updatedPhotos);

    // Save to database
    try {
      const response = await fetch(`${API_BASE_URL}/additional-photos/update/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: updatedPhotos })
      });
      if (response.ok) {
        onPhotosUpdate(updatedPhotos);
      }
    } catch (error) {
      console.error('Error updating photo:', error);
    }
  };

  const addEmptyPhoto = async () => {
    try {
      setUploading(true);
      setUploadError(null);

      const newPhoto = {
        photoUrl: null,
        category: '',
        flooring: '',
        annexureHeader: '',
        internalCondition: '',
        externalCondition: '',
        internalWallsType: '',
        externalWallsType: '',
        featuresFixtures: [],
        primeCostItems: [],
        extraItems: []
      };

      // Add to local state and save to database
      const updatedPhotos = [...photos, newPhoto];

      const response = await fetch(`${API_BASE_URL}/additional-photos/update/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: updatedPhotos })
      });

      if (!response.ok) {
        throw new Error('Failed to create photo');
      }

      setPhotos(updatedPhotos);
      onPhotosUpdate(updatedPhotos);
    } catch (error) {
      console.error('Error creating empty photo:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to create photo');
    } finally {
      setUploading(false);
    }
  };

  const handleIndividualFileUpload = async (photoIndex: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (reportId === 'temp' || !reportId) {
      setUploadError('Please save the valuation report first before uploading photos.');
      return;
    }

    const file = files[0];
    setUploading(true);
    setUploadError(null);

    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!fileExtension) {
        throw new Error('Invalid file: no extension found');
      }

      // Get presigned URL
      const response = await fetch(`${API_BASE_URL}/additional-photos/presigned-url/${reportId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileExtension,
          contentType: file.type,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get presigned URL');
      }

      const presignedData = await response.json();

      // Upload to S3
      const uploadResponse = await fetch(presignedData.presignedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadResponse.ok) {
        throw new Error('S3 upload failed');
      }

      // Update the photo in local state with the new URL
      const updatedPhotos = [...photos];
      updatedPhotos[photoIndex] = {
        ...updatedPhotos[photoIndex],
        photoUrl: presignedData.s3Url
      };

      // Save updated photos to database
      const updateResponse = await fetch(`${API_BASE_URL}/additional-photos/update/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: updatedPhotos }),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update photo in database');
      }

      setPhotos(updatedPhotos);
      onPhotosUpdate(updatedPhotos);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDragStart = (index: number, e: React.DragEvent<HTMLDivElement>) => {
    setDragIndex(index);
    isDraggingRef.current = true;
    e.dataTransfer.effectAllowed = 'move';
  };

  // Use a document-level dragover listener to compute the closest card by Y position.
  useEffect(() => {
    const onDocumentDragOver = (e: DragEvent) => {
      if (!isDraggingRef.current || !photoGridRef.current) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';

      const cards = photoGridRef.current.children;
      if (!cards || cards.length === 0) return;

      let closestIndex = 0;
      let closestDist = Infinity;

      for (let i = 0; i < cards.length; i++) {
        const rect = cards[i].getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const dist = Math.abs(e.clientY - midY);
        if (dist < closestDist) {
          closestDist = dist;
          closestIndex = i;
        }
      }

      setDragOverIndex(closestIndex);
    };

    document.addEventListener('dragover', onDocumentDragOver);
    return () => document.removeEventListener('dragover', onDocumentDragOver);
  }, []);

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
    isDraggingRef.current = false;
  };

  const handleDrop = async (dropIndex: number, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (dragIndex === null || dragIndex === dropIndex) {
      handleDragEnd();
      return;
    }

    const reordered = [...photos];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);

    setPhotos(reordered);
    onPhotosUpdate(reordered);
    handleDragEnd();

    try {
      await fetch(`${API_BASE_URL}/additional-photos/update/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: reordered }),
      });
    } catch (error) {
      console.error('Error saving reordered additional photos:', error);
      setUploadError('Failed to save new photo order');
    }
  };

  return (
    <div className="space-y-6">
      {uploadError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600 text-sm">{uploadError}</p>
        </div>
      )}

      {/* Upload Section */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 flex items-center justify-center">
            <label htmlFor="file-upload-additional-photos" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-2 text-gray-400" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 16MB • Up to 15 photos per upload</p>
              </div>
              <input id="file-upload-additional-photos" ref={fileInputRef} type="file" className="hidden" multiple accept="image/*" onChange={(e) => handleFileUpload(e.target.files)} disabled={uploading} />
            </label>
          </div>
          <div className="flex items-center">
            <button
              type="button"
              onClick={addEmptyPhoto}
              disabled={uploading}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors h-32 flex flex-col items-center justify-center gap-2"
            >
              <Upload className="w-6 h-6" />
              <span>Add Photo</span>
              <span className="text-xs font-normal">Without Image</span>
            </button>
          </div>
        </div>
      </div>

      {/* Photo Grid with Settings (Same as main photos) */}
      {photos.length > 0 && (
        <div className="space-y-6" ref={photoGridRef}>
          {photos.map((photo, index) => (
            <div
              key={`additional_photo_${photo.id || photo.photoUrl || index}_${index}`}
              draggable
              onDragStart={(e) => handleDragStart(index, e)}
              onDrop={(e) => handleDrop(index, e)}
              onDragEnd={handleDragEnd}
              style={{ cursor: dragIndex === index ? 'grabbing' : 'grab' }}
              className={`border-2 rounded-lg p-6 bg-white shadow-sm transition-all duration-200 ${dragIndex === index
                ? 'opacity-50 border-blue-400'
                : dragOverIndex === index && dragIndex !== null && dragIndex !== index
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-300'
                }`}>
              <div className="flex gap-6">
                {/* Photo - Left Side */}
                <div className="relative group flex-shrink-0 w-1/2">
                  {photo.photoUrl ? (
                    <img
                      src={`${photo.photoUrl}`}
                      alt={`Additional Photo ${index + 1}`}
                      className="w-full h-auto max-h-96 object-contain rounded-lg border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-full h-96 flex flex-col items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
                      <Upload className="w-16 h-16 text-gray-400 mb-4" />
                      <p className="text-gray-500 mb-4">No image uploaded</p>
                      <label
                        htmlFor={`additional-individual-upload-${index}`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700"
                      >
                        Upload Image
                      </label>
                      <input
                        id={`additional-individual-upload-${index}`}
                        ref={(el) => { individualFileInputRefs.current[index] = el; }}
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleIndividualFileUpload(index, e.target.files)}
                        disabled={uploading}
                      />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-2">
                    {photo.photoUrl && (
                      <>
                        <label
                          htmlFor={`additional-replace-upload-${index}`}
                          className="bg-blue-600 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-blue-700 cursor-pointer flex items-center justify-center"
                          title="Upload a different picture"
                        >
                          <Edit3 className="w-4 h-4" />
                        </label>
                        <input
                          id={`additional-replace-upload-${index}`}
                          ref={(el) => { individualFileInputRefs.current[index] = el; }}
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => handleIndividualFileUpload(index, e.target.files)}
                          disabled={uploading}
                        />
                      </>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        if (photo.photoUrl) {
                          await deletePhoto(photo.photoUrl);
                        } else {
                          // Empty photo - remove from array
                          try {
                            const updatedPhotos = photos.filter((_, i) => i !== index);
                            const response = await fetch(`${API_BASE_URL}/additional-photos/update/${reportId}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ photos: updatedPhotos }),
                            });
                            if (response.ok) {
                              setPhotos(updatedPhotos);
                              onPhotosUpdate(updatedPhotos);
                            }
                          } catch (error) {
                            console.error('Delete error:', error);
                            setUploadError(error instanceof Error ? error.message : 'Failed to delete photo');
                          }
                        }
                      }}
                      className="bg-red-600 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-700"
                      title="Delete photo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Photo Details Form - Right Side */}
                <div className="flex-1 w-1/2 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Left Column */}
                    <div className="space-y-4">
                      {/* Basic Details */}
                      <div className="space-y-3 bg-gray-50 p-3 rounded-md">
                        <h4 className="text-sm font-semibold text-gray-800 mb-2">Basic Details</h4>
                        <div>
                          <label className="block text-sm font-medium text-gray-800 mb-1">Category</label>
                          <select
                            value={photo.category || ''}
                            onChange={(e) => updatePhotoAttribute(index, 'category', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Select Category</option>
                            {ROOM_CATEGORIES.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-800 mb-1">Flooring</label>
                          <select
                            value={photo.flooring || ''}
                            onChange={(e) => updatePhotoAttribute(index, 'flooring', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Select Flooring</option>
                            {FLOORING_OPTIONS.map(floor => (
                              <option key={floor} value={floor}>{floor}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-800 mb-1">Annexure Header</label>
                          <input
                            type="text"
                            value={photo.annexureHeader || ''}
                            onChange={(e) => updatePhotoAttribute(index, 'annexureHeader', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter annexure header"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Full Width Sections Below - 3 Column Grid */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Features & Fixtures Checkboxes */}
                <div className="bg-gray-50 p-4 rounded-md">
                  <label className="block text-sm font-semibold text-gray-800 mb-3">Features & Fixtures</label>
                  <div className="max-h-48 overflow-y-auto border-2 border-gray-300 rounded-lg p-4 bg-white">
                    <div className="grid grid-cols-2 gap-2">
                      {(ROOM_FEATURES[photo.category || ''] || []).map(feature => (
                        <label key={feature} className="flex items-center space-x-2 text-sm hover:bg-gray-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={(photo.featuresFixtures || []).includes(feature)}
                            onChange={(e) => {
                              const current = photo.featuresFixtures || [];
                              const updated = e.target.checked
                                ? [...current, feature]
                                : current.filter((item: string) => item !== feature);
                              updatePhotoAttribute(index, 'featuresFixtures', updated);
                            }}
                            className="rounded border-gray-400 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-800 font-medium">{feature}</span>
                        </label>
                      ))}
                      {(photo.featuresFixtures || [])
                        .filter((item: string) => !(ROOM_FEATURES[photo.category || ''] || []).includes(item))
                        .map((feature: string) => (
                          <label key={`custom-${feature}`} className="flex items-center space-x-2 text-sm hover:bg-gray-50 p-1 rounded bg-blue-50">
                            <input
                              type="checkbox"
                              checked={true}
                              onChange={(e) => {
                                const current = photo.featuresFixtures || [];
                                const updated = current.filter((item: string) => item !== feature);
                                updatePhotoAttribute(index, 'featuresFixtures', updated);
                              }}
                              className="rounded border-gray-400 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-800 font-medium">{feature}</span>
                            <span className="text-xs text-blue-600 ml-1">(custom)</span>
                          </label>
                        ))}
                    </div>
                    {(!photo.category || !ROOM_FEATURES[photo.category]) && (photo.featuresFixtures || []).length === 0 && (
                      <p className="text-sm text-gray-600 text-center py-4 bg-gray-100 rounded">Select a category to see features or add custom items</p>
                    )}
                  </div>
                </div>

                {/* Prime Cost Items Checkboxes */}
                <div className="bg-gray-50 p-4 rounded-md">
                  <label className="block text-sm font-semibold text-gray-800 mb-3">Prime Cost Items</label>
                  <div className="max-h-48 overflow-y-auto border-2 border-gray-300 rounded-lg p-4 bg-white">
                    <div className="grid grid-cols-2 gap-2">
                      {(ROOM_PRIME_COST_ITEMS[photo.category || ''] || []).map(item => (
                        <label key={item} className="flex items-center space-x-2 text-sm hover:bg-gray-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={(photo.primeCostItems || []).includes(item)}
                            onChange={(e) => {
                              const current = photo.primeCostItems || [];
                              const updated = e.target.checked
                                ? [...current, item]
                                : current.filter((primeItem: string) => primeItem !== item);
                              updatePhotoAttribute(index, 'primeCostItems', updated);
                            }}
                            className="rounded border-gray-400 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-800 font-medium">{item}</span>
                        </label>
                      ))}
                      {(photo.primeCostItems || [])
                        .filter((item: string) => !(ROOM_PRIME_COST_ITEMS[photo.category || ''] || []).includes(item))
                        .map((item: string) => (
                          <label key={`custom-${item}`} className="flex items-center space-x-2 text-sm hover:bg-gray-50 p-1 rounded bg-green-50">
                            <input
                              type="checkbox"
                              checked={true}
                              onChange={(e) => {
                                const current = photo.primeCostItems || [];
                                const updated = current.filter((primeItem: string) => primeItem !== item);
                                updatePhotoAttribute(index, 'primeCostItems', updated);
                              }}
                              className="rounded border-gray-400 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-800 font-medium">{item}</span>
                            <span className="text-xs text-green-600 ml-1">(custom)</span>
                          </label>
                        ))}
                    </div>
                    {(!photo.category || !ROOM_PRIME_COST_ITEMS[photo.category]) && (photo.primeCostItems || []).length === 0 && (
                      <p className="text-sm text-gray-600 text-center py-4 bg-gray-100 rounded">Select a category to see prime cost items or add custom items</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {uploading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-sm text-gray-600">Uploading...</span>
        </div>
      )}
    </div>
  );
};


interface FloorPlanUploadProps {
  reportId: string;
  onPhotosUpdate: (photos: any[]) => void;
}

const FloorPlanUploader: React.FC<FloorPlanUploadProps> = ({ reportId, onPhotosUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (reportId && reportId !== 'temp') {
      fetchPhotos();
    }
  }, [reportId]);

  const fetchPhotos = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/floor-plans/list/${reportId}`);
      if (res.ok) {
        const data = await res.json();
        const list = data.photos || [];
        setPhotos(list);
        onPhotosUpdate(list);
      }
    } catch (e) {
      console.error('Error fetching floor plans:', e);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (reportId === 'temp' || !reportId) {
      setUploadError('Please save the valuation report first before uploading floor plans.');
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const { successful, failed } = await uploadMultipleFilesToS3(reportId, files, { maxConcurrent: 12, maxFiles: 12 }, '/floor-plans');
      if (successful.length > 0) {
        await fetchPhotos();
      }
      if (failed.length > 0) {
        const errorMessages = failed.map(f => f.error).join(', ');
        setUploadError(`Failed to upload ${failed.length} files: ${errorMessages}`);
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (photoUrl: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/floor-plans/delete/${reportId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl })
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Delete failed');
      }
      await fetchPhotos();
    } catch (e: any) {
      setUploadError(e?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-4">
      {uploadError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600 text-sm">{uploadError}</p>
        </div>
      )}
      <div className="flex items-center justify-center w-full">
        <label htmlFor="file-upload-floor-plans" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-8 h-8 mb-2 text-gray-400" />
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">PNG, JPG, GIF, PDF up to 16MB • Up to 12 files per upload</p>
          </div>
          <input id="file-upload-floor-plans" ref={fileInputRef} type="file" className="hidden" multiple accept="image/*,application/pdf" onChange={(e) => handleFileUpload(e.target.files)} disabled={uploading} />
        </label>
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {photos.map((photo, idx) => (
            <div key={`floor_plan_${idx}`} className="relative">
              <img src={`${photo.photoUrl}`} alt={`Floor Plan ${idx + 1}`} className="w-full h-40 object-cover rounded-lg border-2 border-gray-200" />
              <button type="button" onClick={() => deletePhoto(photo.photoUrl)} className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-2 shadow hover:bg-red-700" title="Delete floor plan">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {uploading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-sm text-gray-600">Uploading...</span>
        </div>
      )}
    </div>
  );
};


interface TitleSearchUploadProps {
  reportId: string;
  onPhotosUpdate: (photos: any[]) => void;
}

const TitleSearchUploader: React.FC<TitleSearchUploadProps> = ({ reportId, onPhotosUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (reportId && reportId !== 'temp') {
      fetchPhotos();
    }
  }, [reportId]);

  const fetchPhotos = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/title-search/list/${reportId}`);
      if (res.ok) {
        const data = await res.json();
        setPhotos(data.photos || []);
        onPhotosUpdate(data.photos || []);
      }
    } catch (e) {
      console.error('Failed to fetch title search:', e);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (photos.length >= 3) {
      setUploadError('Maximum 3 title search images allowed. Delete one first.');
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const { successful, failed } = await uploadMultipleFilesToS3(reportId, files, { maxConcurrent: 3, maxFiles: 3 }, '/title-search');
      if (failed.length > 0) {
        setUploadError(`Failed to upload: ${failed.map(f => f.error).join(', ')}`);
      }
      await fetchPhotos();
    } catch (e: any) {
      setUploadError(e?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deletePhoto = async (photoUrl: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/title-search/delete/${reportId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl })
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Delete failed');
      }
      await fetchPhotos();
    } catch (e: any) {
      setUploadError(e?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-4">
      {uploadError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600 text-sm">{uploadError}</p>
        </div>
      )}
      {photos.length < 3 && (
        <div className="flex items-center justify-center w-full">
          <label htmlFor="file-upload-title-search" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-8 h-8 mb-2 text-gray-400" />
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500">PNG, JPG, PDF up to 16MB • Up to 3 files</p>
            </div>
            <input id="file-upload-title-search" ref={fileInputRef} type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => handleFileUpload(e.target.files)} disabled={uploading} />
          </label>
        </div>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {photos.map((photo, idx) => (
            <div key={`title_search_${idx}`} className="relative">
              <img src={`${photo.photoUrl}`} alt="Title Search" className="w-full h-40 object-cover rounded-lg border-2 border-gray-200" />
              <button type="button" onClick={() => deletePhoto(photo.photoUrl)} className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-2 shadow hover:bg-red-700" title="Delete title search">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {uploading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-sm text-gray-600">Uploading...</span>
        </div>
      )}
    </div>
  );
};


export const PhotosSection: React.FC<SectionProps> = ({ register, errors, watch, setValue, reportId }) => {
  const [photos, setPhotos] = useState<any[]>([]);
  const [additionalPhotos, setAdditionalPhotos] = useState<any[]>([]);
  const [floorPlans, setFloorPlans] = useState<any[]>([]);
  const [titleSearch, setTitleSearch] = useState<any[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const formReportId = watch('id');
  const actualReportId = reportId || formReportId || 'temp';

  // Reset unsaved changes when form is successfully saved
  React.useEffect(() => {
    setHasUnsavedChanges(false);
  }, [formReportId]); // Reset when report ID changes (indicating a successful save)

  const handlePhotosUpdate = (newPhotos: any[]) => {
    setPhotos(newPhotos);
    setValue('photos', newPhotos, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false
    });
    setHasUnsavedChanges(true);
  };

  const handleAdditionalPhotosUpdate = (newPhotos: any[]) => {
    setAdditionalPhotos(newPhotos);
    // Persisted immediately on upload/delete; do not mark as dirty
    setValue('additionalPhotos', newPhotos, {
      shouldDirty: false,
      shouldTouch: true,
      shouldValidate: false
    });
  };

  const handleFloorPlansUpdate = (newPhotos: any[]) => {
    setFloorPlans(newPhotos);
    // Persisted immediately on upload/delete; do not mark as dirty
    setValue('floorPlans', newPhotos, {
      shouldDirty: false,
      shouldTouch: true,
      shouldValidate: false
    });
  };

  const handleTitleSearchUpdate = (newPhotos: any[]) => {
    setTitleSearch(newPhotos);
    setValue('titleSearch', newPhotos, {
      shouldDirty: false,
      shouldTouch: true,
      shouldValidate: false
    });
  };

  // Show message if no report ID is available
  if (!actualReportId || actualReportId === 'temp') {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Photos</h2>
          <p className="text-gray-600">Upload and manage photos for the valuation report.</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-yellow-800 text-sm">
            Please save the valuation report first before uploading photos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Photos</h2>
        <p className="text-gray-600">Upload and manage photos for the valuation report.</p>
        {hasUnsavedChanges && (
          <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-yellow-800 text-sm font-medium">
              ⚠️ You have unsaved changes. Click Save to save your photo attribute changes.
            </p>
          </div>
        )}
      </div>

      <PhotoUploadComponent
        reportId={actualReportId}
        onPhotosUpdate={handlePhotosUpdate}
      />

      {/* Additional Photos Section */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Additional Photos (Granny flat, Studio etc)</h3>
        <p className="text-gray-600 mb-4">Use this section to upload extra photos that don't belong in the main photo set.</p>

        {/* Type Selector for Granny Flat/Studio */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <label className="block text-sm font-semibold text-gray-800 mb-3">Photo Section Type</label>
          <div className="flex gap-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                value="Granny Flat"
                checked={watch('additionalPhotosType') === 'Granny Flat'}
                onChange={(e) => setValue('additionalPhotosType', e.target.value, { shouldDirty: true })}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-900">Granny Flat</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                value="Studio"
                checked={watch('additionalPhotosType') === 'Studio'}
                onChange={(e) => setValue('additionalPhotosType', e.target.value, { shouldDirty: true })}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-900">Studio</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                value=""
                checked={!watch('additionalPhotosType') || watch('additionalPhotosType') === ''}
                onChange={(e) => setValue('additionalPhotosType', '', { shouldDirty: true })}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-900">None</span>
            </label>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Select the type of additional photos to display in parentheses in the PDF (e.g., "Additional Photos (Granny Flat)").
          </p>
        </div>

        <SimpleAdditionalPhotosUploader
          reportId={actualReportId}
          onPhotosUpdate={handleAdditionalPhotosUpdate}
        />
      </div>

      {/* Floor Plans Section */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Floor Plan</h3>
        <p className="text-gray-600 mb-4">Upload floor plan images for the property.</p>
        <FloorPlanUploader
          reportId={actualReportId}
          onPhotosUpdate={handleFloorPlansUpdate}
        />
      </div>

      {/* Title Search Section */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Title Search</h3>
        <p className="text-gray-600 mb-4">Upload up to 2 title search images for the report.</p>
        <TitleSearchUploader
          reportId={actualReportId}
          onPhotosUpdate={handleTitleSearchUpdate}
        />
      </div>

      {/* Blank Pages Section */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Blank Pages</h3>
        <p className="text-gray-600 mb-4">Add blank pages at the end of the report (e.g., for notes).</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Number of Blank Pages"
            error={(errors as any).valuationDetails?.blankPagesCount?.message}
          >
            <Input
              type="number"
              min="0"
              max="10"
              {...register('valuationDetails.blankPagesCount', { valueAsNumber: true })}
              placeholder="0"
              error={(errors as any).valuationDetails?.blankPagesCount?.message}
            />
          </FormField>
          <FormField
            label="Blank Pages Heading"
            error={(errors as any).valuationDetails?.blankPagesHeading?.message}
          >
            <Input
              {...register('valuationDetails.blankPagesHeading')}
              placeholder="e.g., Notes"
              error={(errors as any).valuationDetails?.blankPagesHeading?.message}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};
