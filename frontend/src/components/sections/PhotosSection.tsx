import React, { useState, useRef, useEffect } from 'react';
import { FormField, Input, Checkbox, FileUpload, Select } from '../ui/FormField';
import { SectionProps } from '@/types/property-valuation';
import { Upload, X, Edit3, Wand2, ListOrdered, Clock, ImageOff, Plus, ChevronDown, ChevronUp, Check, Star, FileText, Camera, Trash2, Loader2 } from 'lucide-react';

const inputClass = "w-full h-9 px-4 py-1.5 text-xs sm:text-sm font-medium border border-gray-300 rounded-full bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#006ABE] focus:ring-2 focus:ring-[#006ABE]/20 transition-all text-left shadow-2xs";
const labelClass = "block text-xs font-semibold text-gray-700 mb-1 ml-0.5 text-left";
import { API_BASE_URL } from '@/lib/api-config';
import { uploadMultipleFilesToS3 } from '@/lib/s3-upload';
import { getAdditionalPhotoSaves } from '@/lib/additional-photo-saves';

// Import the constants
const ROOM_CATEGORIES = [
  'Alfresco', 'Balcony', 'Bathroom', 'Bedroom', 'Bedroom 1', 'Bedroom 2', 'Bedroom 3', 'Bedroom 4', 'Bedroom 5', 'Bedroom 6',
  'Deck', 'Dining', 'Ensuite', 'Ensuite 2', 'Entertainment Area', 'Family', 'Family And Meals', 'Formal Dining', 'General',
  'Kitchen', 'Kitchen 1', 'Kitchen 2', 'Kitchen And Dining', 'Kitchen And Meals', 'Laundry', 'Living', 'Living And Dining',
  'Lounge', 'Office Room', 'Media Room', 'Patio', 'Porch', 'Powder Room', 'Retreat', 'Rumpus', 'Storage', 'Study', 'Sunroom',
  'Theatre Room', 'Toilet', 'Workshop'
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
  'split system air conditioning', 'stainless steel laundry tub', 'toilet suite', 'vanity',
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

const getCategoryFeatures = (category: string | undefined | null) => {
  if (!category) return [];
  if (ROOM_FEATURES[category]) return ROOM_FEATURES[category];
  const baseCategory = category.replace(/\s*\d+$/, '').trim();
  return ROOM_FEATURES[baseCategory] || [];
};

const getCategoryPrimeCostItems = (category: string | undefined | null) => {
  if (!category) return [];
  if (ROOM_PRIME_COST_ITEMS[category]) return ROOM_PRIME_COST_ITEMS[category];
  const baseCategory = category.replace(/\s*\d+$/, '').trim();
  return ROOM_PRIME_COST_ITEMS[baseCategory] || [];
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
  const [processingPhotoUrls, setProcessingPhotoUrls] = useState<Set<string>>(new Set());
  const updateQueueRef = useRef<{ photoUrl: string, data: any }[]>([]);
  const isUpdatingRef = useRef(false);
  const photosRef = useRef<any[]>(photos);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  const [isArranging, setIsArranging] = useState(false);

  const handleAutoArrange = async () => {
    setIsArranging(true);
    setUploadError(null);
    try {
      const getCategoryRank = (category: string | undefined | null) => {
        if (!category) return 999;
        const lower = category.toLowerCase();
        if (lower === 'living') return 10;
        if (lower === 'kitchen') return 20;
        if (lower === 'dining') return 30;
        if (lower === 'bathroom') return 40;
        if (lower.startsWith('bedroom')) {
          const match = lower.match(/\d+/);
          const num = match ? parseInt(match[0], 10) : 0;
          return 50 + num;
        }
        if (lower.startsWith('ensuite')) {
          const match = lower.match(/\d+/);
          const num = match ? parseInt(match[0], 10) : 0;
          return 60 + num;
        }
        if (lower === 'balcony' || lower === 'deck' || lower === 'balcony/deck') return 70;
        if (lower === 'patio') return 80;
        return 100;
      };

      const sorted = [...photos].sort((a, b) => {
        const rankA = getCategoryRank(a.category);
        const rankB = getCategoryRank(b.category);
        return rankA - rankB;
      });

      photosRef.current = sorted;
      setPhotos(sorted);
      onPhotosUpdate(sorted);

      await fetch(`${API_BASE_URL}/photos/update/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ photos: sorted }),
      });
    } catch (error) {
      console.error('Error auto-arranging photos:', error);
      setUploadError('Failed to save auto-arranged order');
    } finally {
      setIsArranging(false);
    }
  };

  const processUpdateQueue = async () => {
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;

    while (updateQueueRef.current.length > 0) {
      const nextUpdate = updateQueueRef.current.shift();
      if (!nextUpdate) break;

      const { photoUrl, data } = nextUpdate;

      const latestPhotos = [...photosRef.current];
      const targetIndex = latestPhotos.findIndex(p => p.photoUrl === photoUrl);

      if (targetIndex === -1) {
        continue;
      }

      const photo = { ...latestPhotos[targetIndex] };

      if (data.category && !photo.category) {
        let finalCategory = data.category;
        
        if (finalCategory.toLowerCase().startsWith('bedroom')) {
          let maxBedroom = 0;
          latestPhotos.forEach(p => {
            if (p.category && p.category.toLowerCase().startsWith('bedroom')) {
              if (p.category.toLowerCase() === 'bedroom') {
                maxBedroom = Math.max(maxBedroom, 1);
              } else {
                const match = p.category.match(/\d+/);
                if (match) {
                  maxBedroom = Math.max(maxBedroom, parseInt(match[0], 10));
                }
              }
            }
          });
          finalCategory = `Bedroom ${maxBedroom + 1}`;
        } else if (finalCategory.toLowerCase().startsWith('ensuite')) {
          let ensuiteCount = 0;
          let maxEnsuite = 1;
          latestPhotos.forEach(p => {
            if (p.category && p.category.toLowerCase().startsWith('ensuite')) {
              ensuiteCount++;
              const match = p.category.match(/\d+/);
              if (match) {
                maxEnsuite = Math.max(maxEnsuite, parseInt(match[0], 10));
              } else if (p.category.toLowerCase() === 'ensuite') {
                maxEnsuite = Math.max(maxEnsuite, 1);
              }
            }
          });
          if (ensuiteCount === 0) {
            finalCategory = 'Ensuite';
          } else {
            finalCategory = `Ensuite ${maxEnsuite + 1}`;
          }
        }

        photo.category = finalCategory;
      }
      if (data.flooring && !photo.flooring) {
        photo.flooring = data.flooring;
      }
      if (data.categorySpecificDetails) {
        const categoryFeatures = getCategoryFeatures(photo.category);
        const categoryPrimeCostItems = getCategoryPrimeCostItems(photo.category);

        if (data.categorySpecificDetails.featuresAndFixtures && data.categorySpecificDetails.featuresAndFixtures.length > 0) {
          const current = photo.featuresFixtures || [];
          const validAiFeatures = data.categorySpecificDetails.featuresAndFixtures.filter((f: string) => categoryFeatures.includes(f));
          photo.featuresFixtures = Array.from(new Set([...current, ...validAiFeatures]));
        }
        if (data.categorySpecificDetails.primeCostItems && data.categorySpecificDetails.primeCostItems.length > 0) {
          const current = photo.primeCostItems || [];
          const validAiItems = data.categorySpecificDetails.primeCostItems.filter((i: string) => categoryPrimeCostItems.includes(i));
          photo.primeCostItems = Array.from(new Set([...current, ...validAiItems]));
        }
      }

      latestPhotos[targetIndex] = photo;
      photosRef.current = latestPhotos;
      setPhotos(latestPhotos);
      onPhotosUpdate(latestPhotos);

      try {
        await fetch(`${API_BASE_URL}/photos/update/${reportId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ photos: latestPhotos }),
        });
      } catch (err) {
        console.error("Failed to save automated photo update", err);
      }
    }

    isUpdatingRef.current = false;
  };

  const handleAutomatePhoto = async (index: number, photoUrl: string, expectedCategory?: string) => {
    if (!photoUrl) return;

    if (processingPhotoUrls.has(photoUrl)) {
      return;
    }

    setUploadError(null);
    setProcessingPhotoUrls(prev => new Set(prev).add(photoUrl));

    try {
      console.log("Processing concurrent photo automation:", { photoUrl, expectedCategory });
      const response = await fetch('/internal-api/analyze-photo', {
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
      
      updateQueueRef.current.push({ photoUrl, data });
      processUpdateQueue();

    } catch (err: any) {
      console.error('AI Automation error for photo:', photoUrl, err);
      const errorMsg = err.message || 'An error occurred during AI analysis';
      setUploadError(`Photo automation failed: ${errorMsg}`);
    } finally {
      setProcessingPhotoUrls(prev => {
        const next = new Set(prev);
        next.delete(photoUrl);
        return next;
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
      const response = await fetch(`${API_BASE_URL}/photos/list/${reportId}`, {
        credentials: 'include',
      });
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
        credentials: 'include',
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

  const handleDeleteCard = async (photoIndex: number) => {
    const photo = photos[photoIndex];
    if (photo && photo.photoUrl) {
      await deletePhoto(photo.photoUrl);
    } else {
      try {
        const updatedPhotos = photos.filter((_, i) => i !== photoIndex);
        photosRef.current = updatedPhotos;
        setPhotos(updatedPhotos);
        onPhotosUpdate(updatedPhotos);
        const response = await fetch(`${API_BASE_URL}/photos/update/${reportId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ photos: updatedPhotos }),
        });
        if (!response.ok) {
          throw new Error('Failed to delete photo card');
        }
      } catch (error) {
        console.error('Delete error:', error);
        setUploadError(error instanceof Error ? error.message : 'Failed to delete photo');
      }
    }
  };

  const removeImageOnly = async (photoUrl: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/photos/remove-image/${reportId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ photoUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Remove image failed');
      }

      // Refresh photos
      await fetchPhotos();
    } catch (error) {
      console.error('Remove image error:', error);
      setUploadError(error instanceof Error ? error.message : 'Remove image failed');
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
        credentials: 'include',
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
        credentials: 'include',
        body: JSON.stringify({ photos: reordered }),
      });
    } catch (error) {
      console.error('Error saving reordered photos:', error);
      setUploadError('Failed to save new photo order');
    }
  };

  const movePhoto = async (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= photos.length) return;

    const reordered = [...photos];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    photosRef.current = reordered;
    setPhotos(reordered);
    onPhotosUpdate(reordered);

    try {
      await fetch(`${API_BASE_URL}/photos/update/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
        credentials: 'include',
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
        credentials: 'include',
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
      <div className="border border-gray-200 rounded-2xl p-6">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Upload Photos
          </h3>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={addEmptyPhoto}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#006ABE] hover:bg-[#00589e] text-white font-bold rounded-full shadow-sm hover:shadow transition-all text-xs sm:text-sm cursor-pointer disabled:opacity-50"
              title="Add a photo entry without uploading an image"
            >
              <Plus className="w-4 h-4" />
              <span>Add Entry</span>
            </button>
            <button
              type="button"
              onClick={handleAutoArrange}
              disabled={isArranging || photos.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-[#006ABE] bg-blue-50 border border-blue-200 rounded-full hover:bg-[#006ABE] hover:text-white transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
            >
              {isArranging ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div> : <ListOrdered className="w-4 h-4" />}
              Auto Arrange
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Upload Dropzone */}
          <div className="w-full">
            <label
              htmlFor="file-upload-photos"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-2xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
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
                  className={`border rounded-2xl p-5 sm:p-6 bg-white shadow-sm transition-all duration-200 hover:shadow-md ${dragIndex === index
                    ? 'opacity-50 border-blue-400 ring-2 ring-blue-100'
                    : dragOverIndex === index && dragIndex !== null && dragIndex !== index
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-gray-200'
                    }`}>
                  {/* TIER 1: PHOTO PREVIEW ON LEFT + DETAILS & SETTINGS ON RIGHT */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                    {/* Photo - Left Column (5 cols) */}
                    <div className="col-span-12 lg:col-span-5 flex flex-col">
                      {photo.photoUrl ? (
                        <div className="w-full h-full min-h-[210px] max-h-[280px] rounded-2xl overflow-hidden border border-gray-200 relative group bg-gray-100 shadow-2xs flex items-center justify-center">
                          <img
                            src={`${photo.photoUrl}`}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />

                          {/* Top-Right Actions: Pill-shaped Action Buttons (Hover Only) */}
                          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
                            <label
                              htmlFor={`replace-upload-${index}`}
                              className="h-7 px-3 bg-black/70 hover:bg-black/85 text-white text-[11px] rounded-full font-medium backdrop-blur-md shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 hover:scale-105 active:scale-95"
                              title="Upload a different picture"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span>Change</span>
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
                            <button
                              type="button"
                              onClick={async () => {
                                await removeImageOnly(photo.photoUrl);
                              }}
                              className="w-7 h-7 bg-amber-600/90 hover:bg-amber-600 text-white rounded-full shadow-md backdrop-blur-md transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
                              title="Remove picture (keep details)"
                            >
                              <ImageOff className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCard(index)}
                              className="w-7 h-7 bg-red-600/90 hover:bg-red-600 text-white rounded-full shadow-md backdrop-blur-md transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
                              title="Delete photo card"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full min-h-[210px] flex flex-col items-center justify-center bg-gray-50/80 rounded-2xl border-2 border-dashed border-gray-300 p-6 text-center relative group">
                          {/* Trash button in top right of pictureless box (Hover Only) */}
                          <button
                            type="button"
                            onClick={() => handleDeleteCard(index)}
                            className="absolute top-2.5 right-2.5 w-7 h-7 bg-red-600/90 hover:bg-red-600 text-white rounded-full shadow-md backdrop-blur-md transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto duration-200"
                            title="Delete photo card"
                            aria-label="Delete photo card"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <Upload className="w-12 h-12 text-gray-400 mb-3" />
                          <p className="text-sm font-medium text-gray-600 mb-3">No image uploaded</p>
                          <label
                            htmlFor={`individual-upload-${index}`}
                            className="inline-flex items-center px-4 py-2 bg-[#006ABE] hover:bg-[#00589e] text-white font-semibold text-xs rounded-full shadow-sm hover:shadow transition-all cursor-pointer"
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
                    </div>

                    {/* Details & Settings - Right Column Studio Card (7 cols) */}
                    <div className="col-span-12 lg:col-span-7 bg-gray-50/70 p-4 sm:p-4.5 rounded-2xl border border-gray-200 flex flex-col justify-between gap-3">
                      {/* Header bar: Title, Up/Down Buttons & Automate AI Button */}
                      <div className="h-8 flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-[#006ABE] text-white flex items-center justify-center shrink-0 shadow-xs">
                            <Camera className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-sm font-bold text-gray-900 tracking-tight shrink-0">
                            Photo #{index + 1}
                          </span>
                          <div className="flex items-center gap-1 ml-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => movePhoto(index, 'up')}
                              disabled={index === 0}
                              className="w-7 h-7 rounded-full bg-white border border-gray-200 text-gray-600 hover:text-[#006ABE] hover:border-blue-300 hover:bg-blue-50/60 flex items-center justify-center transition-all shadow-2xs disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
                              title="Move photo up"
                              aria-label="Move photo up"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => movePhoto(index, 'down')}
                              disabled={index === photos.length - 1}
                              className="w-7 h-7 rounded-full bg-white border border-gray-200 text-gray-600 hover:text-[#006ABE] hover:border-blue-300 hover:bg-blue-50/60 flex items-center justify-center transition-all shadow-2xs disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
                              title="Move photo down"
                              aria-label="Move photo down"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {photo.photoUrl && (() => {
                          const isAutomating = processingPhotoUrls.has(photo.photoUrl);
                          const isQueued = false;
                          const isDisabled = isAutomating || isQueued;

                          return (
                            <button
                              type="button"
                              onClick={() => handleAutomatePhoto(index, photo.photoUrl, photo.category)}
                              disabled={isDisabled}
                              className="h-8 px-3.5 text-[#006ABE] hover:text-[#00589e] hover:bg-blue-100/70 rounded-full border border-blue-200/80 bg-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold disabled:opacity-50 shadow-2xs shrink-0"
                              title={
                                isAutomating
                                  ? 'Analyzing photo with AI...'
                                  : 'Automate photo details with AI'
                              }
                            >
                              {isAutomating ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span className="text-xs font-semibold">Automating...</span>
                                </>
                              ) : (
                                <>
                                  <Wand2 className="w-3.5 h-3.5 text-[#006ABE]" />
                                  <span className="text-xs font-semibold">Automate</span>
                                </>
                              )}
                            </button>
                          );
                        })()}
                      </div>

                      {/* Photo Settings: 3 Equal-Width Segmented Capsule Toggles */}
                      {photo.photoUrl && (
                        <div className="grid grid-cols-3 gap-2">
                          <label
                            className={`flex items-center justify-center gap-1.5 h-8.5 px-3 rounded-full border text-xs font-semibold cursor-pointer transition-all select-none shadow-2xs ${
                              photo.isCover
                                ? 'bg-amber-50 border-amber-300 text-amber-800'
                                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={photo.isCover || false}
                              onChange={(e) => updatePhotoAttribute(index, 'isCover', e.target.checked)}
                              className="sr-only"
                            />
                            <Star className={`w-3.5 h-3.5 ${photo.isCover ? 'fill-amber-500 text-amber-500' : 'text-gray-400'}`} />
                            <span className="truncate">Cover Photo</span>
                          </label>

                          <label
                            className={`flex items-center justify-center gap-1.5 h-8.5 px-3 rounded-full border text-xs font-semibold cursor-pointer transition-all select-none shadow-2xs ${
                              photo.isGallery
                                ? 'bg-blue-50 border-blue-300 text-[#006ABE]'
                                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={photo.isGallery || false}
                              onChange={(e) => updatePhotoAttribute(index, 'isGallery', e.target.checked)}
                              className="sr-only"
                            />
                            <Check className={`w-3.5 h-3.5 ${photo.isGallery ? 'text-[#006ABE]' : 'text-gray-400'}`} />
                            <span className="truncate">Gallery</span>
                          </label>

                          <label
                            className={`flex items-center justify-center gap-1.5 h-8.5 px-3 rounded-full border text-xs font-semibold cursor-pointer transition-all select-none shadow-2xs ${
                              photo.isAnnexure
                                ? 'bg-purple-50 border-purple-300 text-purple-800'
                                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={photo.isAnnexure || false}
                              onChange={(e) => updatePhotoAttribute(index, 'isAnnexure', e.target.checked)}
                              className="sr-only"
                            />
                            <FileText className={`w-3.5 h-3.5 ${photo.isAnnexure ? 'text-purple-600' : 'text-gray-400'}`} />
                            <span className="truncate">Annexure</span>
                          </label>
                        </div>
                      )}

                      {/* Basic Details: Symmetrical Layout (Category & Flooring 50/50, Annexure Header full-width) */}
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className={labelClass}>Category</label>
                            <div className="relative">
                              <input
                                type="text"
                                list={`category-options-${index}`}
                                value={photo.category || ''}
                                onChange={(e) => updatePhotoAttribute(index, 'category', e.target.value)}
                                placeholder="Select category..."
                                className={inputClass}
                              />
                              <datalist id={`category-options-${index}`}>
                                {ROOM_CATEGORIES.map(cat => (
                                  <option key={cat} value={cat} />
                                ))}
                              </datalist>
                            </div>
                          </div>

                          <div>
                            <label className={labelClass}>Flooring</label>
                            <div className="relative">
                              <select
                                value={photo.flooring || ''}
                                onChange={(e) => updatePhotoAttribute(index, 'flooring', e.target.value)}
                                className={`${inputClass} appearance-none pr-8 cursor-pointer`}
                              >
                                <option value="">Select Flooring</option>
                                {FLOORING_OPTIONS.map(floor => (
                                  <option key={floor} value={floor}>{floor}</option>
                                ))}
                              </select>
                              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <ChevronDown className="w-3.5 h-3.5" />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className={labelClass}>Annexure Header</label>
                          <input
                            type="text"
                            value={photo.annexureHeader || ''}
                            onChange={(e) => updatePhotoAttribute(index, 'annexureHeader', e.target.value)}
                            className={inputClass}
                            placeholder="Enter descriptive annexure header..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* TIER 2: FEATURES & FIXTURES + PRIME COST ITEMS (50/50 SPLIT) */}
                  <div className="mt-5 pt-4 border-t border-gray-200 grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch">
                    {/* LEFT 50% (6 cols): Features & Fixtures */}
                    <div className="lg:col-span-6 bg-gray-50/70 p-4 rounded-2xl border border-gray-200 flex flex-col">
                      <div className="h-8 flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900 tracking-tight">Features & Fixtures</span>
                          {(photo.featuresFixtures || []).length > 0 && (
                            <span className="text-[11px] font-semibold text-[#006ABE] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full shadow-2xs">
                              {(photo.featuresFixtures || []).length} selected
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 bg-white p-3.5 rounded-2xl border border-gray-200/90 min-h-[110px] max-h-48 overflow-y-auto">
                        <div className="flex flex-wrap gap-2">
                          {(getCategoryFeatures(photo.category)).map(feature => {
                            const isChecked = (photo.featuresFixtures || []).includes(feature);
                            return (
                              <button
                                key={feature}
                                type="button"
                                onClick={() => {
                                  const current = photo.featuresFixtures || [];
                                  const updated = isChecked
                                    ? current.filter((item: string) => item !== feature)
                                    : [...current, feature];
                                  updatePhotoAttribute(index, 'featuresFixtures', updated);
                                }}
                                className={`h-7 px-3 rounded-full text-xs font-medium border transition-all cursor-pointer select-none inline-flex items-center gap-1.5 shadow-2xs ${
                                  isChecked
                                    ? 'bg-blue-50 border-blue-300 text-[#006ABE] font-semibold'
                                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {isChecked ? <Check className="w-3 h-3 text-[#006ABE]" /> : <Plus className="w-3 h-3 text-gray-400" />}
                                <span>{feature}</span>
                              </button>
                            );
                          })}
                          {/* Custom features */}
                          {(photo.featuresFixtures || [])
                            .filter((item: string) => !(getCategoryFeatures(photo.category)).includes(item))
                            .map((feature: string) => (
                              <button
                                key={`custom-${feature}`}
                                type="button"
                                onClick={() => {
                                  const current = photo.featuresFixtures || [];
                                  const updated = current.filter((item: string) => item !== feature);
                                  updatePhotoAttribute(index, 'featuresFixtures', updated);
                                }}
                                className="h-7 px-3 rounded-full text-xs font-semibold bg-blue-50 border border-blue-300 text-[#006ABE] inline-flex items-center gap-1.5 shadow-2xs hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all cursor-pointer group"
                                title="Click to remove custom feature"
                              >
                                <Check className="w-3 h-3 text-[#006ABE] group-hover:hidden" />
                                <X className="w-3 h-3 text-red-500 hidden group-hover:inline" />
                                <span>{feature}</span>
                                <span className="text-[10px] text-blue-500/80 group-hover:text-red-400">(custom)</span>
                              </button>
                            ))}
                        </div>
                        {(!photo.category || getCategoryFeatures(photo.category).length === 0) && (photo.featuresFixtures || []).length === 0 && (
                          <p className="text-xs text-gray-400 text-center py-6">Select a category above to view features</p>
                        )}
                      </div>
                    </div>

                    {/* RIGHT 50% (6 cols): Prime Cost Items */}
                    <div className="lg:col-span-6 bg-gray-50/70 p-4 rounded-2xl border border-gray-200 flex flex-col">
                      <div className="h-8 flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900 tracking-tight">Prime Cost Items</span>
                          {(photo.primeCostItems || []).length > 0 && (
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shadow-2xs">
                              {(photo.primeCostItems || []).length} selected
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 bg-white p-3.5 rounded-2xl border border-gray-200/90 min-h-[110px] max-h-48 overflow-y-auto">
                        <div className="flex flex-wrap gap-2">
                          {(getCategoryPrimeCostItems(photo.category)).map(item => {
                            const isChecked = (photo.primeCostItems || []).includes(item);
                            return (
                              <button
                                key={item}
                                type="button"
                                onClick={() => {
                                  const current = photo.primeCostItems || [];
                                  const updated = isChecked
                                    ? current.filter((primeItem: string) => primeItem !== item)
                                    : [...current, item];
                                  updatePhotoAttribute(index, 'primeCostItems', updated);
                                }}
                                className={`h-7 px-3 rounded-full text-xs font-medium border transition-all cursor-pointer select-none inline-flex items-center gap-1.5 shadow-2xs ${
                                  isChecked
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {isChecked ? <Check className="w-3 h-3 text-emerald-600" /> : <Plus className="w-3 h-3 text-gray-400" />}
                                <span>{item}</span>
                              </button>
                            );
                          })}
                          {/* Custom prime cost items */}
                          {(photo.primeCostItems || [])
                            .filter((item: string) => !(getCategoryPrimeCostItems(photo.category)).includes(item))
                            .map((item: string) => (
                              <button
                                key={`custom-${item}`}
                                type="button"
                                onClick={() => {
                                  const current = photo.primeCostItems || [];
                                  const updated = current.filter((primeItem: string) => primeItem !== item);
                                  updatePhotoAttribute(index, 'primeCostItems', updated);
                                }}
                                className="h-7 px-3 rounded-full text-xs font-semibold bg-emerald-50 border border-emerald-300 text-emerald-800 inline-flex items-center gap-1.5 shadow-2xs hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all cursor-pointer group"
                                title="Click to remove custom item"
                              >
                                <Check className="w-3 h-3 text-emerald-600 group-hover:hidden" />
                                <X className="w-3 h-3 text-red-500 hidden group-hover:inline" />
                                <span>{item}</span>
                                <span className="text-[10px] text-emerald-600/80 group-hover:text-red-400">(custom)</span>
                              </button>
                            ))}
                        </div>
                        {(!photo.category || getCategoryPrimeCostItems(photo.category).length === 0) && (photo.primeCostItems || []).length === 0 && (
                          <p className="text-xs text-gray-400 text-center py-6">Select a category above to view prime cost items</p>
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
  const photosRef = useRef<any[]>([]);
  const mounted = useRef(true);
  const onUpdateRef = useRef(onPhotosUpdate);
  onUpdateRef.current = onPhotosUpdate;
  const saves = React.useMemo(() => getAdditionalPhotoSaves(reportId), [reportId]);
  const [, refreshSaveStatus] = useState(0);
  const [photosLoaded, setPhotosLoaded] = useState(false);

  const publishPhotos = (list: any[], saved = false) => {
    photosRef.current = list;
    if (saved) saves.queue.setSaved(list);
    if (mounted.current) {
      setPhotos(list);
      onUpdateRef.current(list);
    }
  };
  const [editingPhoto, setEditingPhoto] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const individualFileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const [customItemInputs, setCustomItemInputs] = useState<{ [key: number]: string }>({});
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const photoGridRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    mounted.current = true;
    setPhotosLoaded(false);
    const unsubscribe = saves.subscribe(() => refreshSaveStatus(value => value + 1));
    // Recover unsaved edits when a section is remounted after a failed request.
    if (saves.queue.pending && saves.queue.latest) {
      publishPhotos(saves.queue.latest);
    } else {
      // A failed initial fetch must not replace the parent form's photos with
      // an empty list or a snapshot from an earlier visit to this report.
      saves.queue.forgetSaved();
      photosRef.current = [];
      setPhotos([]);
    }
    if (reportId && reportId !== 'temp') {
      void saves.run(fetchPhotos, false).catch(error => {
        if (mounted.current) setUploadError(error.message || 'Unable to load additional photos');
      });
    }
    return () => {
      mounted.current = false;
      unsubscribe();
      // Keep the shared queue alive while navigating between report sections.
      void saves.flush().catch(() => {});
    };
  }, [reportId, saves]);

  const fetchPhotos = async () => {
    const res = await fetch(`${API_BASE_URL}/additional-photos/list/${reportId}`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Unable to load additional photos. Please retry.');
    const data = await res.json();
    publishPhotos(data.photos || [], true);
    if (mounted.current) {
      setPhotosLoaded(true);
      setUploadError(null);
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
      await saves.run(async () => {
      const { successful, failed } = await uploadMultipleFilesToS3(reportId, files, { maxConcurrent: 15, maxFiles: 15 }, '/additional-photos');
      if (successful.length > 0) {
        await fetchPhotos();
      }
      if (failed.length > 0) {
        const errorMessages = failed.map(f => f.error).join(', ');
        setUploadError(`Failed to upload ${failed.length} files: ${errorMessages}`);
      }
      });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (photoUrl: string) => {
    try {
      await saves.run(async () => {
        const response = await fetch(`${API_BASE_URL}/additional-photos/delete/${reportId}`, {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ photoUrl }),
        });
        if (!response.ok) throw new Error('Failed to delete photo');
        await fetchPhotos();
      });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Delete failed');
    }
  };

  const updatePhotoAttribute = (photoIndex: number, attribute: string, value: any) => {
    if (saves.busy || !photosLoaded) return;
    const updatedPhotos = [...photosRef.current];
    const updatedPhoto = { ...updatedPhotos[photoIndex], [attribute]: value };
    if (attribute === 'category') {
      updatedPhoto.featuresFixtures = [];
      updatedPhoto.primeCostItems = [];
    }
    updatedPhotos[photoIndex] = updatedPhoto;
    // Update both the editor and its parent form immediately. Persistence is
    // coalesced, and only one network write may be active for this report.
    publishPhotos(updatedPhotos);
    saves.queue.enqueue(updatedPhotos);
  };

  const savePhotosNow = async (list: any[]) => {
    const response = await fetch(`${API_BASE_URL}/additional-photos/update/${reportId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ photos: list }),
    });
    if (!response.ok) throw new Error('Photo changes could not be saved. Please retry.');
    publishPhotos(list, true);
  };

  const [isArranging, setIsArranging] = useState(false);

  const handleAutoArrange = async () => {
    if (saves.busy || !photosLoaded || photosRef.current.length === 0) return;
    setIsArranging(true);
    setUploadError(null);
    try {
      const getCategoryRank = (category: string | undefined | null) => {
        if (!category) return 999;
        const lower = category.toLowerCase();
        if (lower === 'living') return 10;
        if (lower === 'kitchen') return 20;
        if (lower === 'dining') return 30;
        if (lower === 'bathroom') return 40;
        if (lower.startsWith('bedroom')) {
          const match = lower.match(/\d+/);
          const num = match ? parseInt(match[0], 10) : 0;
          return 50 + num;
        }
        if (lower.startsWith('ensuite')) {
          const match = lower.match(/\d+/);
          const num = match ? parseInt(match[0], 10) : 0;
          return 60 + num;
        }
        if (lower === 'balcony' || lower === 'deck' || lower === 'balcony/deck') return 70;
        if (lower === 'patio') return 80;
        return 100;
      };

      const sorted = [...photosRef.current].sort((a, b) => {
        const rankA = getCategoryRank(a.category);
        const rankB = getCategoryRank(b.category);
        return rankA - rankB;
      });

      await saves.run(async () => {
        await savePhotosNow(sorted);
      });
    } catch (error) {
      console.error('Error auto-arranging additional photos:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to save auto-arranged order');
    } finally {
      setIsArranging(false);
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

      await saves.run(async () => {
      const updatedPhotos = [...photosRef.current, newPhoto];

      await savePhotosNow(updatedPhotos);
      });
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
      await saves.run(async () => {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!fileExtension) {
        throw new Error('Invalid file: no extension found');
      }

      // Get presigned URL
      const response = await fetch(`${API_BASE_URL}/additional-photos/presigned-url/${reportId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
      const updatedPhotos = [...photosRef.current];
      updatedPhotos[photoIndex] = {
        ...updatedPhotos[photoIndex],
        photoUrl: presignedData.s3Url
      };

      await savePhotosNow(updatedPhotos);
      });
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDragStart = (index: number, e: React.DragEvent<HTMLDivElement>) => {
    if (saves.busy || uploading || !photosLoaded) { e.preventDefault(); return; }
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

    if (saves.busy || uploading || !photosLoaded || dragIndex === null || dragIndex === dropIndex) {
      handleDragEnd();
      return;
    }

    const sourceIndex = dragIndex;
    handleDragEnd();
    try {
      await saves.run(async () => {
        const reordered = [...photosRef.current];
        const [moved] = reordered.splice(sourceIndex, 1);
        reordered.splice(dropIndex, 0, moved);
        await savePhotosNow(reordered);
      });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to save new photo order');
    }
  };

  return (
    <div className="space-y-6">
      <div aria-live="polite" className="text-sm text-gray-600">
        {saves.queue.error ? (
          <span role="alert" className="text-red-700">
            {saves.queue.error.message}{' '}
            <button type="button" className="underline font-semibold" onClick={() => {
              void saves.run(fetchPhotos, false).catch(() => {});
            }}>Retry save</button>
          </span>
        ) : saves.pending ? (photosLoaded ? 'Saving additional photo changes…' : 'Loading additional photos…') : photosLoaded ? 'Additional photo changes saved automatically.' : 'Additional photos have not loaded.'}
      </div>
      {uploadError && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600 text-sm">{uploadError}</p>
          {!photosLoaded && <button type="button" className="underline text-sm font-semibold" disabled={saves.busy} onClick={() => {
            void saves.run(fetchPhotos, false).catch(error => setUploadError(error.message));
          }}>Retry loading photos</button>}
        </div>
      )}

      <fieldset disabled={uploading || saves.busy || !photosLoaded} className="space-y-6 min-w-0">
      {/* Upload Section */}
      <div className="space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <p className="text-sm font-medium text-gray-700">Add or drag photos below</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={addEmptyPhoto}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#006ABE] hover:bg-[#00589e] text-white font-bold rounded-full shadow-sm hover:shadow transition-all text-xs sm:text-sm cursor-pointer disabled:opacity-50"
              title="Add a photo entry without uploading an image"
            >
              <Plus className="w-4 h-4" />
              <span>Add Entry</span>
            </button>
            <button
              type="button"
              onClick={handleAutoArrange}
              disabled={isArranging || photos.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-[#006ABE] bg-blue-50 border border-blue-200 rounded-full hover:bg-[#006ABE] hover:text-white transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
            >
              {isArranging ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div> : <ListOrdered className="w-4 h-4" />}
              Auto Arrange
            </button>
          </div>
        </div>
        <div className="w-full">
          <label htmlFor="file-upload-additional-photos" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-2xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
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
      </div>

      {/* Photo Grid with Settings (Same as main photos) */}
      {photos.length > 0 && (
        <div className="space-y-6" ref={photoGridRef}>
          {photos.map((photo, index) => (
            <div
              key={`additional_photo_${photo.id || photo.photoUrl || index}_${index}`}
              draggable={!uploading && !saves.busy && photosLoaded}
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
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-96 flex flex-col items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
                      <Upload className="w-16 h-16 text-gray-400 mb-4" />
                      <p className="text-gray-500 mb-4">No image uploaded</p>
                      <label
                        htmlFor={`additional-individual-upload-${index}`}
                        className="inline-flex items-center px-5 py-2.5 bg-[#006ABE] hover:bg-[#00589e] text-white font-bold text-xs sm:text-sm rounded-full shadow-sm hover:shadow transition-all cursor-pointer"
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
                          try {
                            await saves.run(() => savePhotosNow(photosRef.current.filter((_, i) => i !== index)));
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
                          <div className="relative">
                            <input
                              type="text"
                              list={`additional-category-options-${index}`}
                              value={photo.category || ''}
                              onChange={(e) => updatePhotoAttribute(index, 'category', e.target.value)}
                              onBlur={() => { void saves.flush().catch(() => {}); }}
                              placeholder="Select or type category..."
                              className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <datalist id={`additional-category-options-${index}`}>
                              {ROOM_CATEGORIES.map(cat => (
                                <option key={cat} value={cat} />
                              ))}
                            </datalist>
                          </div>
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
                            onBlur={() => { void saves.flush().catch(() => {}); }}
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
                      {(getCategoryFeatures(photo.category)).map(feature => (
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
                        .filter((item: string) => !(getCategoryFeatures(photo.category)).includes(item))
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
                    {(!photo.category || getCategoryFeatures(photo.category).length === 0) && (photo.featuresFixtures || []).length === 0 && (
                      <p className="text-sm text-gray-600 text-center py-4 bg-gray-100 rounded">Select a category to see features or add custom items</p>
                    )}
                  </div>
                </div>

                {/* Prime Cost Items Checkboxes */}
                <div className="bg-gray-50 p-4 rounded-md">
                  <label className="block text-sm font-semibold text-gray-800 mb-3">Prime Cost Items</label>
                  <div className="max-h-48 overflow-y-auto border-2 border-gray-300 rounded-lg p-4 bg-white">
                    <div className="grid grid-cols-2 gap-2">
                      {(getCategoryPrimeCostItems(photo.category)).map(item => (
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
                        .filter((item: string) => !(getCategoryPrimeCostItems(photo.category)).includes(item))
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
                    {(!photo.category || getCategoryPrimeCostItems(photo.category).length === 0) && (photo.primeCostItems || []).length === 0 && (
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
      </fieldset>
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
      const res = await fetch(`${API_BASE_URL}/floor-plans/list/${reportId}`, {
        credentials: 'include',
      });
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
        credentials: 'include',
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
      const res = await fetch(`${API_BASE_URL}/title-search/list/${reportId}`, {
        credentials: 'include',
      });
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
        credentials: 'include',
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
    // Keep the parent form current while the shared autosave queue persists edits.
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
      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
        <p className="text-yellow-800 text-sm font-medium">
          Please save the valuation report first before uploading photos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {hasUnsavedChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <p className="text-yellow-800 text-sm font-medium">
            ⚠️ You have unsaved changes. Click Save to save your photo attribute changes.
          </p>
        </div>
      )}

      <PhotoUploadComponent
        reportId={actualReportId}
        onPhotosUpdate={handlePhotosUpdate}
      />

      {/* Additional Photos Section */}
      <div className="border border-gray-200 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Additional Photos (Granny flat, Studio etc)</h3>
        <p className="text-gray-600 mb-4">Use this section to upload extra photos that don&apos;t belong in the main photo set.</p>

        {/* Type Selector for Granny Flat/Studio */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-2xl p-4">
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
            Select the type of additional photos to display in parentheses in the PDF (e.g., &quot;Additional Photos (Granny Flat)&quot;).
          </p>
        </div>

        <SimpleAdditionalPhotosUploader
          reportId={actualReportId}
          onPhotosUpdate={handleAdditionalPhotosUpdate}
        />
      </div>

      {/* Floor Plans Section */}
      <div className="border border-gray-200 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Floor Plan</h3>
        <p className="text-gray-600 mb-4">Upload floor plan images for the property.</p>
        <FloorPlanUploader
          reportId={actualReportId}
          onPhotosUpdate={handleFloorPlansUpdate}
        />
      </div>

      {/* Title Search Section */}
      <div className="border border-gray-200 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Title Search</h3>
        <p className="text-gray-600 mb-4">Upload up to 2 title search images for the report.</p>
        <TitleSearchUploader
          reportId={actualReportId}
          onPhotosUpdate={handleTitleSearchUpdate}
        />
      </div>

      {/* Blank Pages Section */}
      <div className="border border-gray-200 rounded-2xl p-6">
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
