import React, { useState, useRef } from 'react';
import { FormField, Textarea } from '../ui/FormField';
import { SectionProps } from '@/types/property-valuation';
import { Wand2 } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';
import { apiRepository } from '@/lib/api-repository';
import { summarizePhotos } from '@/lib/photo-utils';
import { uploadFileToS3 } from '@/lib/s3-upload';

export const GeneralCommentsSection: React.FC<SectionProps> = ({ register, errors, watch, setValue, reportId }) => {
  const [isAutomating, setIsAutomating] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isGeneratingOverview, setIsGeneratingOverview] = useState(false);
  const [isGeneratingComments, setIsGeneratingComments] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const existingImageUrl = watch('generalComments.valuationCommentsImage' as any) as string | undefined;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !reportId) return;
    setIsUploadingImage(true);
    try {
      const result = await uploadFileToS3(String(reportId), file, '/photos');
      if (result.success && result.s3Url) {
        setValue('generalComments.valuationCommentsImage' as any, result.s3Url, { shouldDirty: true });
      } else {
        alert('Image upload failed: ' + (result.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Image upload failed: ' + err?.message);
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const formatGeneralItems = (): string => {
    const photos = watch('photos') || [];

    // Only these specific prime cost items should appear in property comments
    const allowedPrimeItems = [
      'ceiling fans',
      'room unit air conditioning',
      'split system air conditioning',
      'ducted air conditioning',
      'ducted heater',
    ];

    const featureItems: string[] = [];
    const primeItems: string[] = [];

    photos.forEach(photo => {
      if (photo.category && photo.category.toLowerCase().includes('general')) {
        if (photo.featuresFixtures && Array.isArray(photo.featuresFixtures)) {
          featureItems.push(...photo.featuresFixtures);
        }
      }
      if (photo.primeCostItems && Array.isArray(photo.primeCostItems)) {
        // Only collect the 5 allowed prime cost items
        const filtered = photo.primeCostItems.filter(
          (item: string) => item && allowedPrimeItems.includes(item.trim().toLowerCase())
        );
        primeItems.push(...filtered);
      }
    });

    // Filter out empty items, convert to lowercase, deduplicate, and sort
    const validFeatureItems = featureItems
      .filter(item => item && item.trim().length > 0)
      .map(item => item.toLowerCase())
      .sort();

    const validPrimeItems = [...new Set(
      primeItems
        .filter(item => item && item.trim().length > 0)
        .map(item => item.toLowerCase())
    )].sort();

    // Combine arrays with features first, then prime items
    const validItems = [...validFeatureItems, ...validPrimeItems];

    if (validItems.length === 0) return 'N/A';
    if (validItems.length === 1) return validItems[0];

    return `${validItems.slice(0, -1).join(', ')} and ${validItems[validItems.length - 1]}`;
  };

  const formatPhotoCategories = (categories: Array<{ category: string }>): string => {
    if (!categories || categories.length === 0) return 'N/A';

    // Get category names and convert to lowercase
    const categoryNames = categories
      .map(cat => cat.category.toLowerCase())
      .filter(cat => !cat.startsWith('bedroom') && !cat.startsWith('bathroom') && !cat.startsWith('ensuite'))
      .filter(name => name && name.trim().length > 0);

    if (categoryNames.length === 0) return 'N/A';
    if (categoryNames.length === 1) return categoryNames[0];
    if (categoryNames.length === 2) return `${categoryNames[0]} and ${categoryNames[1]}`;

    // More than 2: join with commas and "and" before the last
    return `${categoryNames.slice(0, -1).join(', ')} and ${categoryNames[categoryNames.length - 1]}`;
  };

  const generatePropertyComments = (): string => {
    // Get photos and summarize
    const photos = watch('photos') || [];
    const photosSummary = summarizePhotos(photos);

    // Format categories properly
    const categories = formatPhotoCategories(photosSummary.categories);

    // Get general items
    const generalItems = formatGeneralItems();

    // Get property data
    const bedrooms = watch('propertyDescriptors.bedrooms') || 'N/A';
    const bathrooms = watch('propertyDescriptors.bathrooms') || 'N/A';
    const parkingType = watch('propertyDescriptors.parkingType')?.toLowerCase() || 'N/A';
    const siteArea = watch('propertyDetails.siteArea') || 'N/A';
    const buildingArea = watch('propertyDetails.buildingArea') || 'N/A';
    const propertyType = watch('propertyDetails.propertyType')?.toLowerCase() || '';

    // Determine land area text based on property type
    const landTypesWithTotalArea = ['house', 'duplex', 'triplex', 'house & granny flat', 'terrace', 'granny flat', 'rural', 'land'];
    const landAreaText = landTypesWithTotalArea.includes(propertyType)
      ? 'has a total land area of'
      : 'has a parent land area of';

    // Granny Flat counts from additional photos (if any)
    const addType = watch('additionalPhotosType');
    const addPhotos = (watch('additionalPhotos') as any[]) || [];
    let grannyFlatLine = '';
    if (addType === 'Granny Flat' && addPhotos.length) {
      const gfSummary = summarizePhotos(addPhotos);
      const gfBedrooms = gfSummary.categories.filter(c => c.category.toLowerCase().startsWith('bedroom')).length;
      const gfBathrooms = gfSummary.categories.filter(c => {
        const lower = c.category.toLowerCase();
        return lower.startsWith('bathroom') || lower.startsWith('ensuite');
      }).length;
      const gfCategories = gfSummary.categories
        .map(c => c.category.toLowerCase())
        .filter(c => !c.startsWith('bedroom') && !c.startsWith('bathroom') && !c.startsWith('ensuite'));
      const gfStructural: string[] = [];
      if (gfBedrooms) gfStructural.push(`${gfBedrooms} bedrooms`);
      if (gfBathrooms) gfStructural.push(`${gfBathrooms} bathrooms`);
      gfStructural.push('car space');
      const gfBase = gfStructural.join(', ');
      const gfRooms = gfCategories.length > 0 ? ` with ${gfCategories.join(', ')}` : '';
      grannyFlatLine = ` For Granny Flat: ${gfBase}${gfRooms}.`;
    }

    // Generate property comments
    const mainBuildingSuffix = grannyFlatLine ? ' For main building.' : '';

    // Only include the features line if there are actual items (not N/A)
    const featuresLine = generalItems !== 'N/A'
      ? `The property features items such as ${generalItems}. `
      : '';

    const propertyComments = (
      `The subject property consists of ${bedrooms} bedrooms, ${bathrooms} bathrooms, ${parkingType}, with ${categories}.` +
      mainBuildingSuffix +
      grannyFlatLine + ' ' +
      `The subject property ${landAreaText} ${siteArea} sqm and a total building area of ${buildingArea} sqm approximately. ` +
      featuresLine +
      `The building condition and location are considered suitable as a long term asset. ` +
      `This has been considered in the assessment of the market value of the subject property.`
    );

    return propertyComments;
  };

  const handleGeneratePropertyDescription = () => {
    setIsGeneratingDescription(true);
    try {
      const builtYear = watch('propertyDetails.buildYear');
      const externalWalls = watch('propertyDescriptors.externalWalls')?.toLowerCase() || 'N/A';
      const mainBuildingType = watch('propertyDescriptors.mainBuildingType')?.toLowerCase() || 'N/A';
      const roofingType = watch('propertyDescriptors.roofingType')?.toLowerCase() || 'N/A';
      const landShape = watch('propertyDetails.landShape')?.toLowerCase() || 'N/A';
      const landSlope = watch('propertyDetails.landSlope')?.toLowerCase() || 'N/A';
      const frontage = watch('propertyDetails.frontage') || 'N/A';
      const depth = watch('propertyDetails.depth') || 'N/A';
      const siteArea = watch('propertyDetails.siteArea') || 'N/A';
      const situatedStreet = watch('locationDetails.situatedStreet')?.toLowerCase() || 'N/A';
      
      // Extract street name from address (e.g., "10/462-464 Guildford Road Guildford NSW 2161" -> "Guildford Road")
      const fullAddress = watch('address.fullAddress') || '';
      const streetName = watch('address.streetName') || watch('address.streetNameOnly') || '';
      
      // If streetName is not available, try to extract from fullAddress
      let extractedStreetName = streetName;
      if (!extractedStreetName && fullAddress) {
        // Extract street name from full address (everything between unit/number and suburb)
        // Pattern: [unit/number] [street name] [suburb] [state] [postcode]
        const addressParts = fullAddress.split(' ');
        // Find where suburb starts (typically after street name, before NSW/VIC/etc)
        const stateIndex = addressParts.findIndex(part => ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'].includes(part.toUpperCase()));
        if (stateIndex > 2) {
          // Get suburb (word before state)
          const suburb = watch('address.suburb') || '';
          if (suburb) {
            const suburbIndex = addressParts.findIndex(part => part.toLowerCase() === suburb.toLowerCase());
            if (suburbIndex > 1) {
              // Street name is between first part (unit/number) and suburb
              extractedStreetName = addressParts.slice(1, suburbIndex).join(' ');
            }
          } else {
            // Fallback: take parts 1 to 2 before state as street name
            extractedStreetName = addressParts.slice(1, stateIndex - 1).join(' ');
          }
        }
      }
      
      const streetNameForDescription = extractedStreetName || 'N/A';
      const nearestConnectingStreet = watch('locationDetails.nearestConnectingStreet.name') || streetNameForDescription;

      const propertyDescription = (
        `The subject property is a Circa ${builtYear || 'N/A'} built ${externalWalls} construction ${mainBuildingType} ` +
        `with ${roofingType} roofing set on a ${landShape} shaped allotment, on a ${landSlope} slope from front to rear, ` +
        `and has satisfactory site drainage in dry conditions. The site dimensions are approximately ${frontage} metres of frontage ` +
        `and ${depth} metres of depth with a total area of approximately ${siteArea} sqm, subject to survey. ` +
        `It is located towards the ${situatedStreet} side of ${streetNameForDescription} with ${nearestConnectingStreet} being the nearest connected street.`
      );

      setValue('generalComments.propertyDescription', propertyDescription, { shouldDirty: true });
    } catch (error) {
      console.error('Error generating property description:', error);
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const handleGenerateMarketOverview = async () => {
    const localityId = watch('rpData.localityId');

    if (!localityId) {
      alert('Please run Automate in Property Details first to get locality ID');
      return;
    }

    setIsGeneratingOverview(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/rpdata/market-trends?locality_id=${localityId}&property_type_id=1`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch market trends (${response.status})`);
      }

      const data = await response.json();

      // Extract market trends from response
      const marketTrendsData = data?.data?.seriesResponseList || [];

      const marketTrendsRaw = {
        growth_rate: 0,
        median_house_price: 0,
        weekly_rent: 0,
        rental_yield: 0
      };

      const marketTrendsFormatted = {
        growth_rate: 'N/A',
        median_house_price: 'N/A',
        weekly_rent: 'N/A',
        rental_yield: 'N/A'
      };

      const formatNumber = (value: number): string => {
        return value.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };

      // Process market trends
      for (const item of marketTrendsData) {
        const metricType = item.metricType;
        const seriesValue = item.seriesDataList?.[0]?.value || 0;

        if (metricType === "Change in Median Value (12 months)") {
          marketTrendsFormatted.growth_rate = `${(seriesValue * 100).toFixed(2)}%`;
          marketTrendsRaw.growth_rate = seriesValue;
        } else if (metricType === "Median Value (monthly)") {
          marketTrendsFormatted.median_house_price = formatNumber(seriesValue);
          marketTrendsRaw.median_house_price = seriesValue;
        } else if (metricType === "Median Asking Rent (12 months)") {
          marketTrendsFormatted.weekly_rent = `$${seriesValue}/w`;
          marketTrendsRaw.weekly_rent = seriesValue;
        }
      }

      // Calculate rental yield
      if (marketTrendsRaw.weekly_rent && marketTrendsRaw.median_house_price) {
        const yearlyAmount = marketTrendsRaw.weekly_rent * 52;
        marketTrendsRaw.rental_yield = yearlyAmount / marketTrendsRaw.median_house_price;
        marketTrendsFormatted.rental_yield = `${(marketTrendsRaw.rental_yield * 100).toFixed(2)}%`;
      }

      // Get property data from form
      const suburb = watch('address.suburb') || 'N/A';
      const state = watch('address.state') || 'N/A';
      const councilArea = watch('propertyDetails.councilArea') || 'N/A';

      // Generate market overview
      const marketOverview = (
        `${suburb} in ${state} belongs to the LGA of the ${councilArea}. ` +
        `Over the past 12 months, the growth of ${marketTrendsFormatted.growth_rate} ` +
        `for median house prices in ${suburb}. ` +
        `The current median house price is ${marketTrendsFormatted.median_house_price}. ` +
        `The average weekly rental is ${marketTrendsFormatted.weekly_rent} ` +
        `based on the current median house price, with a gross rental yield of ${marketTrendsFormatted.rental_yield}.`
      );

      setValue('generalComments.marketOverview', marketOverview, { shouldDirty: true });
    } catch (error) {
      console.error('Error fetching market trends:', error);
      alert('Failed to fetch market trends. Check console for details.');
    } finally {
      setIsGeneratingOverview(false);
    }
  };

  const handleGeneratePropertyComments = () => {
    setIsGeneratingComments(true);
    try {
      const propertyComments = generatePropertyComments();
      setValue('generalComments.propertyComments', propertyComments, { shouldDirty: true });
    } catch (error) {
      console.error('Error generating property comments:', error);
    } finally {
      setIsGeneratingComments(false);
    }
  };

  const handleAutomateMarketTrends = async () => {
    const localityId = watch('rpData.localityId');

    if (!localityId) {
      alert('Please run Automate in Property Details first to get locality ID');
      return;
    }

    setIsAutomating(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/rpdata/market-trends?locality_id=${localityId}&property_type_id=1`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch market trends (${response.status})`);
      }

      const data = await response.json();
      console.log('Market Trends Data:', data);

      // Extract market trends from response
      const marketTrendsData = data?.data?.seriesResponseList || [];

      const marketTrendsRaw = {
        growth_rate: 0,
        median_house_price: 0,
        weekly_rent: 0,
        rental_yield: 0
      };

      const marketTrendsFormatted = {
        growth_rate: 'N/A',
        median_house_price: 'N/A',
        weekly_rent: 'N/A',
        rental_yield: 'N/A'
      };

      const formatNumber = (value: number): string => {
        return value.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };

      // Process market trends
      for (const item of marketTrendsData) {
        const metricType = item.metricType;
        const seriesValue = item.seriesDataList?.[0]?.value || 0;

        if (metricType === "Change in Median Value (12 months)") {
          marketTrendsFormatted.growth_rate = `${(seriesValue * 100).toFixed(2)}%`;
          marketTrendsRaw.growth_rate = seriesValue;
        } else if (metricType === "Median Value (monthly)") {
          marketTrendsFormatted.median_house_price = formatNumber(seriesValue);
          marketTrendsRaw.median_house_price = seriesValue;
        } else if (metricType === "Median Asking Rent (12 months)") {
          marketTrendsFormatted.weekly_rent = `$${seriesValue}/w`;
          marketTrendsRaw.weekly_rent = seriesValue;
        }
      }

      // Calculate rental yield
      if (marketTrendsRaw.weekly_rent && marketTrendsRaw.median_house_price) {
        const yearlyAmount = marketTrendsRaw.weekly_rent * 52;
        marketTrendsRaw.rental_yield = yearlyAmount / marketTrendsRaw.median_house_price;
        marketTrendsFormatted.rental_yield = `${(marketTrendsRaw.rental_yield * 100).toFixed(2)}%`;
      }

      // Get property data from form
      const suburb = watch('address.suburb') || 'N/A';
      const state = watch('address.state') || 'N/A';
      const councilArea = watch('propertyDetails.councilArea') || 'N/A';

      // Generate market overview
      const marketOverview = (
        `${suburb} in ${state} belongs to the LGA of the ${councilArea}. ` +
        `Over the past 12 months, the growth of ${marketTrendsFormatted.growth_rate} ` +
        `for median house prices in ${suburb}. ` +
        `The current median house price is ${marketTrendsFormatted.median_house_price}. ` +
        `The average weekly rental is ${marketTrendsFormatted.weekly_rent} ` +
        `based on the current median house price, with a gross rental yield of ${marketTrendsFormatted.rental_yield}.`
      );

      console.log('Generated Market Overview:', marketOverview);
      setValue('generalComments.marketOverview', marketOverview, { shouldDirty: true });

      // Generate property description
      const builtYear = watch('propertyDetails.buildYear');
      const externalWalls = watch('propertyDescriptors.externalWalls')?.toLowerCase() || 'N/A';
      const mainBuildingType = watch('propertyDescriptors.mainBuildingType')?.toLowerCase() || 'N/A';
      const roofingType = watch('propertyDescriptors.roofingType')?.toLowerCase() || 'N/A';
      const landShape = watch('propertyDetails.landShape')?.toLowerCase() || 'N/A';
      const landSlope = watch('propertyDetails.landSlope')?.toLowerCase() || 'N/A';
      const frontage = watch('propertyDetails.frontage') || 'N/A';
      const depth = watch('propertyDetails.depth') || 'N/A';
      const siteArea = watch('propertyDetails.siteArea') || 'N/A';
      const situatedStreet = watch('locationDetails.situatedStreet')?.toLowerCase() || 'N/A';
      
      // Extract street name from address (e.g., "10/462-464 Guildford Road Guildford NSW 2161" -> "Guildford Road")
      const fullAddress = watch('address.fullAddress') || '';
      const streetName = watch('address.streetName') || watch('address.streetNameOnly') || '';
      
      // If streetName is not available, try to extract from fullAddress
      let extractedStreetName = streetName;
      if (!extractedStreetName && fullAddress) {
        // Extract street name from full address (everything between unit/number and suburb)
        const addressParts = fullAddress.split(' ');
        const stateIndex = addressParts.findIndex(part => ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'].includes(part.toUpperCase()));
        if (stateIndex > 2) {
          const suburbName = watch('address.suburb') || '';
          if (suburbName) {
            const suburbIndex = addressParts.findIndex(part => part.toLowerCase() === suburbName.toLowerCase());
            if (suburbIndex > 1) {
              extractedStreetName = addressParts.slice(1, suburbIndex).join(' ');
            }
          } else {
            extractedStreetName = addressParts.slice(1, stateIndex - 1).join(' ');
          }
        }
      }
      
      const streetNameForDescription = extractedStreetName || 'N/A';
      const nearestConnectingStreet = watch('locationDetails.nearestConnectingStreet.name') || streetNameForDescription;

      const propertyDescription = (
        `The subject property is a Circa ${builtYear || 'N/A'} built ${externalWalls} construction ${mainBuildingType} ` +
        `with ${roofingType} roofing set on a ${landShape} shaped allotment, on a ${landSlope} slope from front to rear, ` +
        `and has satisfactory site drainage in dry conditions. The site dimensions are approximately ${frontage} metres of frontage ` +
        `and ${depth} metres of depth with a total area of approximately ${siteArea} sqm, subject to survey. ` +
        `It is located towards the ${situatedStreet} side of ${streetNameForDescription} with ${nearestConnectingStreet} being the nearest connected street.`
      );

      console.log('Generated Property Description:', propertyDescription);
      setValue('generalComments.propertyDescription', propertyDescription, { shouldDirty: true });

      // Generate property comments
      const propertyComments = generatePropertyComments();
      console.log('Generated Property Comments:', propertyComments);
      setValue('generalComments.propertyComments', propertyComments, { shouldDirty: true });

      // After populating values, auto-save the full form
      if (reportId) {
        try {
          setIsAutoSaving(true);
          const formData = watch();
          await apiRepository.updateValuationReport(String(reportId), formData as any);
        } catch (_) {
          // swallow save errors; user can click Save manually
        } finally {
          setIsAutoSaving(false);
        }
      }

    } catch (error) {
      console.error('Error fetching market trends:', error);
      alert('Failed to fetch market trends. Check console for details.');
    } finally {
      setIsAutomating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">General Comments</h2>
          <p className="text-gray-600">Provide narrative commentary to support the valuation conclusions and describe the property context.</p>
        </div>
        {Boolean(watch('rpData.localityId')) && (
          <button
            type="button"
            onClick={handleAutomateMarketTrends}
            disabled={isAutomating}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            title="Automate Market Overview from RP Data"
          >
            {isAutomating || isAutoSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {isAutomating ? 'Automating...' : 'Saving...'}
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Automate
              </>
            )}
          </button>
        )}
      </div>

      <FormField
        label="Property Description"
        error={errors.generalComments?.propertyDescription?.message}
      >
        <div className="relative">
          <Textarea
            {...register('generalComments.propertyDescription')}
            placeholder="Describe key aspects of the property, improvements, and presentation."
            rows={6}
            error={errors.generalComments?.propertyDescription?.message}
          />
          <button
            type="button"
            onClick={handleGeneratePropertyDescription}
            disabled={isGeneratingDescription}
            className="absolute top-2 right-2 p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Auto-generate property description"
          >
            {isGeneratingDescription ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
            ) : (
              <Wand2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </FormField>

      <FormField
        label="Market Overview"
        error={errors.generalComments?.marketOverview?.message}
      >
        <div className="relative">
          <Textarea
            {...register('generalComments.marketOverview')}
            placeholder="Discuss current market conditions, supply/demand factors, and recent trends."
            rows={6}
            error={errors.generalComments?.marketOverview?.message}
          />
          <button
            type="button"
            onClick={handleGenerateMarketOverview}
            disabled={isGeneratingOverview || !watch('rpData.localityId')}
            className="absolute top-2 right-2 p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title={watch('rpData.localityId') ? "Auto-generate market overview from RP Data" : "Run Automate in Property Details first"}
          >
            {isGeneratingOverview ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
            ) : (
              <Wand2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </FormField>

      <FormField
        label="Property Comments"
        error={errors.generalComments?.propertyComments?.message}
      >
        <div className="relative">
          <Textarea
            {...register('generalComments.propertyComments')}
            placeholder="Summarise notable observations, risk considerations, and any assumptions or limitations."
            rows={6}
            error={errors.generalComments?.propertyComments?.message}
          />
          <button
            type="button"
            onClick={handleGeneratePropertyComments}
            disabled={isGeneratingComments}
            className="absolute top-2 right-2 p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Auto-generate property comments"
          >
            {isGeneratingComments ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
            ) : (
              <Wand2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </FormField>

      <FormField
        label="Valuation Comments Paragraph"
        error={(errors as any).generalComments?.valuationCommentsPara?.message}
      >
        <Textarea
          {...register('generalComments.valuationCommentsPara')}
          placeholder="Enter valuation comments paragraph text"
          rows={4}
          error={(errors as any).generalComments?.valuationCommentsPara?.message}
        />
      </FormField>

      <FormField label="Valuation Comments Image" error={undefined}>
        <div className="space-y-3">
          {existingImageUrl ? (
            <div className="flex items-start gap-3">
              <img src={existingImageUrl} alt="Valuation comments chart" className="max-w-xs max-h-40 object-contain border rounded" />
              <button
                type="button"
                onClick={() => setValue('generalComments.valuationCommentsImage' as any, '', { shouldDirty: true })}
                className="text-sm text-red-600 hover:text-red-800 underline"
              >
                Remove
              </button>
            </div>
          ) : null}
          <div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={isUploadingImage}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploadingImage ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div> Uploading...</>
              ) : (
                existingImageUrl ? 'Replace Image' : 'Upload Image'
              )}
            </button>
            <p className="mt-1 text-xs text-gray-500">This image will appear below the Valuation Comments in the report.</p>
          </div>
        </div>
      </FormField>
    </div>
  );
};
