import React, { useState } from 'react';
import { FormField, Input, Textarea, Select, Checkbox } from '../ui/FormField';
import { SectionProps } from '@/types/property-valuation';
import { AllPropertyTypes, mapRpDataPropertyType } from '@/constants/property-types';
import { LAND_SHAPE_TYPES } from '@/constants/land-shapes';
import { Wand2 } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';
import { apiRepository } from '@/lib/api-repository';
import { summarizePhotos } from '@/lib/photo-utils';
import { HeaderActionPortal } from '../report-nav';

const DEFAULT_PERMISSIBLE_USES =
  'Permissible uses with development consent include Bed and breakfast, Community care accommodation, Tourist accommodation, Home based business, Informal outdoor recreation, Medical centre, Place of worship, Seniors housing, Railway, Residential aged care facility, Rooming house, Tramway, Roads etc.';
const DEFAULT_HERITAGE_ISSUE = 'N/A';

const isSmsfOrCommercial = (valuationType?: string, propertyType?: string): boolean => {
  const v = (valuationType || '').toLowerCase();
  const p = (propertyType || '').toLowerCase();
  return (
    v.includes('smsf') ||
    v.includes('commercial') ||
    v.includes('rent review') ||
    p.includes('commercial')
  );
};

export const PropertyDetailsSection: React.FC<SectionProps> = ({ register, errors, watch, setValue, reportId }) => {
  const [isAutomatingFromRP, setIsAutomatingFromRP] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  const state = watch('address.state');
  const tenureType = watch('propertyDetails.tenureType');
  const prevStateRef = React.useRef(state);

  // Default tenure type based on property state (ACT -> Crown Leasehold, otherwise Freehold)
  React.useEffect(() => {
    const isAct = String(state || '').trim().toUpperCase() === 'ACT';
    const defaultTenure = isAct ? 'Crown Leasehold' : 'Freehold';

    if (!tenureType || (prevStateRef.current !== undefined && prevStateRef.current !== state)) {
      setValue('propertyDetails.tenureType', defaultTenure, { shouldDirty: true });
    }
    prevStateRef.current = state;
  }, [state, tenureType, setValue]);

  // Auto-fetch and select property type and areas if linked to RP Data and unset
  const rpDataId = watch('rpDataId');
  const propType = watch('propertyDetails.propertyType');
  const watchedBuildingArea = watch('propertyDetails.buildingArea');
  const watchedParkingArea = watch('propertyDetails.parkingArea');
  const watchedLivingArea = watch('propertyDetails.livingArea');

  React.useEffect(() => {
    if (!rpDataId) return;

    // Check if everything is already populated
    if (propType && watchedParkingArea !== undefined && watchedLivingArea !== undefined && watchedBuildingArea !== undefined) {
      return;
    }

    let isMounted = true;
    (async () => {
      try {
        const resp = await fetch(`${API_BASE_URL}/rpdata/commons/${encodeURIComponent(String(rpDataId))}`);
        if (!resp.ok) return;
        const payload = await resp.json();
        const data = payload?.data || payload;

        if (isMounted && !watch('propertyDetails.propertyType')) {
          const mappedType = mapRpDataPropertyType(
            data?.attrCore?.propertyType || data?.propertyType,
            data?.attrCore?.propertySubType || data?.propertySubType
          );
          if (mappedType) {
            setValue('propertyDetails.propertyType', mappedType, { shouldDirty: true });
          }
        }

        const carSpacesNum = Number(data?.attrCore?.carSpaces);
        const buildingAreaNum = Number(data?.attrAdditional?.floorArea);

        let parkingVal = watch('propertyDetails.parkingArea');
        if (parkingVal === undefined && Number.isFinite(carSpacesNum) && carSpacesNum > 0) {
          parkingVal = carSpacesNum * 18;
          if (isMounted) {
            setValue('propertyDetails.parkingArea', parkingVal, { shouldDirty: true });
          }
        }

        let bVal = watch('propertyDetails.buildingArea');
        if (bVal === undefined && Number.isFinite(buildingAreaNum) && buildingAreaNum > 0) {
          bVal = buildingAreaNum;
          if (isMounted) {
            setValue('propertyDetails.buildingArea', bVal, { shouldDirty: true });
          }
        }

        const livingVal = watch('propertyDetails.livingArea');
        if (livingVal === undefined && bVal !== undefined) {
          const effectiveParking = parkingVal !== undefined ? parkingVal : (Number.isFinite(carSpacesNum) && carSpacesNum > 0 ? carSpacesNum * 18 : 0);
          if (isMounted) {
            setValue('propertyDetails.livingArea', Math.max(0, bVal - effectiveParking), { shouldDirty: true });
          }
        }

        const rawCouncil = typeof data?.location?.councilArea === 'string' ? data.location.councilArea.trim() : '';
        if (rawCouncil && isMounted) {
          const baseCouncil = rawCouncil.replace(/^(city\s+of\s+|shire\s+of\s+|municipality\s+of\s+)/i, '').trim();
          if (!watch('propertyDetails.zoningEffects')) {
            setValue('propertyDetails.zoningEffects', `${baseCouncil || rawCouncil} Local Environment Plan (LEP)`, { shouldDirty: true });
          }
          if (!watch('propertyDetails.councilArea')) {
            const formattedCouncil = rawCouncil.toLowerCase().startsWith('city of ')
              ? rawCouncil
              : `City of ${baseCouncil || rawCouncil}`;
            setValue('propertyDetails.councilArea', formattedCouncil, { shouldDirty: true });
          }
        }
      } catch (_) {}
    })();

    return () => {
      isMounted = false;
    };
  }, [rpDataId, propType, watchedParkingArea, watchedLivingArea, watchedBuildingArea, setValue, watch]);

  // Default land slope to 'Moderate' if unset
  const landSlope = watch('propertyDetails.landSlope');
  React.useEffect(() => {
    if (!landSlope) {
      setValue('propertyDetails.landSlope', 'Moderate', { shouldDirty: true });
    }
  }, [landSlope, setValue]);

  // Default permissible uses only for residential and rural reports (NOT for SMSF or Commercial)
  const valuationType = watch('valuationDetails.valuationType');
  const propTypeForPermissible = watch('propertyDetails.propertyType');
  const permissibleUses = watch('propertyDetails.permissibleUses');
  const heritageIssue = watch('propertyDetails.heritageIssue');

  React.useEffect(() => {
    const isExcluded = isSmsfOrCommercial(valuationType, propTypeForPermissible);
    if (isExcluded) {
      if (permissibleUses === DEFAULT_PERMISSIBLE_USES) {
        setValue('propertyDetails.permissibleUses', '', { shouldDirty: true });
      }
      return;
    }

    if (!permissibleUses || permissibleUses.trim() === '') {
      setValue('propertyDetails.permissibleUses', DEFAULT_PERMISSIBLE_USES, { shouldDirty: true });
    }
  }, [valuationType, propTypeForPermissible, permissibleUses, setValue]);

  React.useEffect(() => {
    if (!heritageIssue || heritageIssue.trim() === '') {
      setValue('propertyDetails.heritageIssue', DEFAULT_HERITAGE_ISSUE, { shouldDirty: true });
    }
  }, [heritageIssue, setValue]);

  // Synchronize livingArea = buildingArea - parkingArea when buildingArea or parkingArea changes
  const prevCalcRef = React.useRef<{ building?: number; parking?: number }>({});

  React.useEffect(() => {
    const b = typeof watchedBuildingArea === 'number' ? watchedBuildingArea : (watchedBuildingArea ? Number(watchedBuildingArea) : undefined);
    const p = typeof watchedParkingArea === 'number' ? watchedParkingArea : (watchedParkingArea !== undefined && watchedParkingArea !== null && watchedParkingArea !== '' ? Number(watchedParkingArea) : undefined);

    if (b !== undefined && Number.isFinite(b) && p !== undefined && Number.isFinite(p)) {
      if (prevCalcRef.current.building !== b || prevCalcRef.current.parking !== p) {
        const calculatedLiving = Math.max(0, b - p);
        setValue('propertyDetails.livingArea', calculatedLiving, { shouldDirty: true });
        prevCalcRef.current = { building: b, parking: p };
      }
    }
  }, [watchedBuildingArea, watchedParkingArea, setValue]);

  const handleAutoFillZoningEffects = () => {
    const councilArea = watch('propertyDetails.councilArea');

    if (!councilArea || councilArea.trim() === '') {
      alert('Please enter a Council Area first.');
      return;
    }

    const rawCouncil = councilArea.trim();
    const baseCouncil = rawCouncil.replace(/^(city\s+of\s+|shire\s+of\s+|municipality\s+of\s+)/i, '').trim();
    // Append "Local Environment Plan (LEP)" to the council name
    const zoningEffectsText = `${baseCouncil || rawCouncil} Local Environment Plan (LEP)`;
    setValue('propertyDetails.zoningEffects', zoningEffectsText, { shouldDirty: true });
  };

  const handleGenerateAccommodation = () => {
    // Get photos and summarize
    const photos = watch('photos') || [];
    const photosSummary = summarizePhotos(photos);

    // Format categories as comma-separated string
    const catArray = photosSummary.categories
      .map(cat => cat.category.toLowerCase())
      .filter(cat => !cat.startsWith('bedroom') && !cat.startsWith('bathroom'));

    const categories = catArray.length > 1
      ? `${catArray.slice(0, -1).join(', ')} and ${catArray[catArray.length - 1]}`                                                                                
      : catArray.join(''); 

    // Get property descriptors
    const bedrooms = watch('propertyDescriptors.bedrooms') || 'N/A';
    const bathrooms = watch('propertyDescriptors.bathrooms') || 'N/A';
    const parkingType = watch('propertyDescriptors.parkingType')?.toLowerCase() || 'N/A';

    // Determine if we have a Granny Flat section (additional photos)
    const addType = watch('additionalPhotosType');
    const addPhotos = (watch('additionalPhotos') as any[]) || [];
    const hasGrannyFlat = addType === 'Granny Flat' && addPhotos.length > 0;

    // Main building text
    const mainParts = [
      `${bedrooms} bedrooms`,
      `${bathrooms} bathrooms`,
      parkingType
    ];
    const mainBaseText = mainParts.join(', ') + (categories ? ` with ${categories}` : '');
    const mainText = hasGrannyFlat ? `${mainBaseText} in the main house.` : `${mainBaseText}.`;

    // Granny Flat bedroom/bathroom count from additional photos if selected (no leading label)
    let gfText = '';
    if (hasGrannyFlat) {
      const gfSummary = summarizePhotos(addPhotos);
      const gfBedrooms = gfSummary.categories.filter(c => c.category.toLowerCase().startsWith('bedroom')).length;
      const gfBathrooms = gfSummary.categories.filter(c => {
        const lower = c.category.toLowerCase();
        return lower.startsWith('bathroom') || lower.startsWith('ensuite');
      }).length;
      const gfCategories = gfSummary.categories
        .map(c => c.category.toLowerCase())
        .filter(c => !c.startsWith('bedroom') && !c.startsWith('bathroom'));
      
      const gfRoomsFormatted = gfCategories.length > 1                                                                                                            
          ? `${gfCategories.slice(0, -1).join(', ')} and ${gfCategories[gfCategories.length - 1]}`                                                                  
          : gfCategories.join('');
      const gfStructural: string[] = [];
      if (gfBedrooms) gfStructural.push(`${gfBedrooms} bedrooms`);
      if (gfBathrooms) gfStructural.push(`${gfBathrooms} bathrooms`);
      gfStructural.push('car space');
      const gfBase = gfStructural.join(', ');
      const gfRooms = gfCategories.length > 0 ? ` with ${gfRoomsFormatted}` : '';
      gfText = ` ${gfBase}${gfRooms} in the granny flat.`;
    }

    const accommodation = `${mainText}${gfText}`.trim();

    setValue('propertyDetails.accommodation', accommodation, { shouldDirty: true });
  };

  const handleAutomateFromRP = async () => {
    const rpDataId = watch('rpDataId');
    if (!rpDataId) return;

    setIsAutomatingFromRP(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/rpdata/commons/${encodeURIComponent(String(rpDataId))}`);
      if (!resp.ok) throw new Error(`Failed to fetch RP Data commons (${resp.status})`);
      const payload = await resp.json();
      const data = payload?.data || payload; // support both wrapped and direct

      const siteAreaRaw = data?.attrCore?.landArea;
      const buildingAreaRaw = data?.attrAdditional?.floorArea;
      const councilArea = data?.location?.councilArea;
      const buildYearRaw = data?.attrAdditional?.yearBuilt;
      const bedroomsRaw = data?.attrCore?.beds;
      const bathroomsRaw = data?.attrCore?.baths;
      const carSpacesRaw = data?.attrCore?.carSpaces;
      const roofingType = data?.attrAdditional?.roofMaterial;

      const toNum = (v: any): number | undefined => {
        if (v === null || v === undefined || v === '') return undefined;
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
      };

      const updates: any = {};
      const setIfDefined = (path: string, value: any) => {
        if (value !== undefined && value !== null && value !== '') {
          updates[path] = value;
          setValue(path as any, value, { shouldDirty: true });
        }
      };

      const buildingAreaNum = toNum(buildingAreaRaw);
      const carSpacesNum = toNum(carSpacesRaw);

      // Multiples of 18 for parking area (e.g. 2 spaces -> 36 sqm)
      const parkingAreaVal = carSpacesNum !== undefined && carSpacesNum > 0
        ? carSpacesNum * 18
        : undefined;

      // Living area = building area - parking area (e.g. 198 - 36 = 162 sqm)
      const livingAreaVal = buildingAreaNum !== undefined
        ? (parkingAreaVal !== undefined ? Math.max(0, buildingAreaNum - parkingAreaVal) : buildingAreaNum)
        : undefined;

      setIfDefined('propertyDetails.siteArea', toNum(siteAreaRaw));
      setIfDefined('propertyDetails.buildingArea', buildingAreaNum);
      setIfDefined('propertyDetails.parkingArea', parkingAreaVal);
      setIfDefined('propertyDetails.livingArea', livingAreaVal);
      // Format council area and zoning effects:
      // Zoning effects: "[Council] Local Environment Plan (LEP)"
      // Council area: "City of [Council]"
      if (councilArea && typeof councilArea === 'string' && councilArea.trim()) {
        const rawCouncil = councilArea.trim();
        const baseCouncil = rawCouncil.replace(/^(city\s+of\s+|shire\s+of\s+|municipality\s+of\s+)/i, '').trim();
        const zoningEffectsVal = `${baseCouncil || rawCouncil} Local Environment Plan (LEP)`;
        const formattedCouncilArea = rawCouncil.toLowerCase().startsWith('city of ')
          ? rawCouncil
          : `City of ${baseCouncil || rawCouncil}`;

        setIfDefined('propertyDetails.zoningEffects', zoningEffectsVal);
        setIfDefined('propertyDetails.councilArea', formattedCouncilArea);
      } else {
        setIfDefined('propertyDetails.councilArea', councilArea);
      }
      setIfDefined('propertyDetails.buildYear', toNum(buildYearRaw));
      setIfDefined('propertyDescriptors.bedrooms', toNum(bedroomsRaw));
      setIfDefined('propertyDescriptors.bathrooms', toNum(bathroomsRaw));
      setIfDefined('propertyDescriptors.carSpaces', carSpacesNum);
      setIfDefined('propertyDescriptors.roofingType', roofingType);

      // Map and set property type from RP Data commons
      const mappedPropType = mapRpDataPropertyType(
        data?.attrCore?.propertyType || data?.propertyType,
        data?.attrCore?.propertySubType || data?.propertySubType
      );
      setIfDefined('propertyDetails.propertyType', mappedPropType);

      // Sync valuationDetails isUnit, showLandValue, showImprovements, showCurrencyOfValuation
      if (mappedPropType) {
        const lowerProp = mappedPropType.toLowerCase();
        const isUnitProp = lowerProp.includes('unit') || lowerProp.includes('apartment') || lowerProp.includes('flat');
        setValue('valuationDetails.isUnit', isUnitProp, { shouldDirty: true });
        setValue('valuationDetails.showLandValue', true, { shouldDirty: true });
        setValue('valuationDetails.showImprovements', !isUnitProp, { shouldDirty: true });
        setValue('valuationDetails.showCurrencyOfValuation', true, { shouldDirty: true });
        if (isUnitProp) {
          setValue('valuationDetails.improvements', undefined, { shouldDirty: true });
        }
      }

      // Ensure tenure type is set based on state (ACT -> Crown Leasehold, otherwise Freehold)
      const propState = watch('address.state') || data?.location?.state;
      const isAct = String(propState || '').trim().toUpperCase() === 'ACT';
      const defaultTenure = isAct ? 'Crown Leasehold' : 'Freehold';
      setIfDefined('propertyDetails.tenureType', defaultTenure);

      // Ensure land slope defaults to Moderate if unset
      const currentSlope = watch('propertyDetails.landSlope');
      if (!currentSlope) {
        setIfDefined('propertyDetails.landSlope', 'Moderate');
      }

      // Ensure permissible uses defaults ONLY for residential and rural reports (NOT for SMSF or Commercial)
      const currentValType = watch('valuationDetails.valuationType');
      const currentPropType = watch('propertyDetails.propertyType') || mappedPropType;
      if (!isSmsfOrCommercial(currentValType, currentPropType)) {
        const currentPermissible = watch('propertyDetails.permissibleUses');
        if (!currentPermissible || !currentPermissible.trim()) {
          setIfDefined('propertyDetails.permissibleUses', DEFAULT_PERMISSIBLE_USES);
        }
      }
      const currentHeritage = watch('propertyDetails.heritageIssue');
      if (!currentHeritage || !currentHeritage.trim()) {
        setIfDefined('propertyDetails.heritageIssue', DEFAULT_HERITAGE_ISSUE);
      }

      // Fetch additional information and map extra fields
      try {
        const addResp = await fetch(`${API_BASE_URL}/rpdata/additional-information/${encodeURIComponent(String(rpDataId))}`);
        if (addResp.ok) {
          const addPayload = await addResp.json();
          const addData = addPayload?.data || addPayload;

          // Attempt additional info property type if not resolved yet
          const addPropType = mapRpDataPropertyType(
            addData?.attrCore?.propertyType || addData?.propertyType,
            addData?.attrCore?.propertySubType || addData?.propertySubType
          );
          if (addPropType) {
            setIfDefined('propertyDetails.propertyType', addPropType);
          }
          // Extract RPD (Real Property Description e.g., 'LOT 1571 DP1193054') instead of raw title ref
          const rpd =
            addData?.legal?.realPropertyDescription ||
            addData?.legal?.rpd ||
            addData?.legalDescription ||
            addData?.rpd ||
            addData?.realPropertyDescription ||
            (addData?.parcels?.[0]?.lot && addData?.parcels?.[0]?.plan
              ? `LOT ${addData.parcels[0].lot} ${addData.parcels[0].planType || ''}${addData.parcels[0].plan}`.replace(/\s+/g, ' ').trim()
              : undefined) ||
            addData?.title?.titleReference;
          const zoning = addData?.site?.zoneDescriptionLocal;
          const localityId = addData?.location?.locality?.id;

          setIfDefined('propertyDetails.titleReference', rpd);
          setIfDefined('propertyDetails.zoning', zoning);

          const addCouncil = addData?.location?.councilArea;
          if (addCouncil && typeof addCouncil === 'string' && addCouncil.trim() && !watch('propertyDetails.councilArea')) {
            const rawCouncil = addCouncil.trim();
            const baseCouncil = rawCouncil.replace(/^(city\s+of\s+|shire\s+of\s+|municipality\s+of\s+)/i, '').trim();
            const zoningEffectsVal = `${baseCouncil || rawCouncil} Local Environment Plan (LEP)`;
            const formattedCouncilArea = rawCouncil.toLowerCase().startsWith('city of ')
              ? rawCouncil
              : `City of ${baseCouncil || rawCouncil}`;

            setIfDefined('propertyDetails.zoningEffects', zoningEffectsVal);
            setIfDefined('propertyDetails.councilArea', formattedCouncilArea);
          }

          // Ensure tenure type is set based on state (ACT -> Crown Leasehold, otherwise Freehold)
          const propState = watch('address.state') || addData?.location?.state;
          const isAct = String(propState || '').trim().toUpperCase() === 'ACT';
          const defaultTenure = isAct ? 'Crown Leasehold' : 'Freehold';
          setIfDefined('propertyDetails.tenureType', defaultTenure);

          // Ensure land slope defaults to Moderate if unset
          const currentSlope = watch('propertyDetails.landSlope');
          if (!currentSlope) {
            setIfDefined('propertyDetails.landSlope', 'Moderate');
          }

          // Ensure rpData object exists and set localityId
          const localityIdNum = toNum(localityId);
          if (localityIdNum !== undefined) {
            const currentRpData = watch('rpData') || {};
            setValue('rpData', { ...currentRpData, localityId: localityIdNum }, { shouldDirty: true });
          }
        }
      } catch (_) {
        // ignore additional info errors, continue with available updates
      }

      // Generate accommodation from photos and property descriptors
      const photos = watch('photos') || [];
      const photosSummary = summarizePhotos(photos);
      const catArray = photosSummary.categories
        .map(cat => cat.category.toLowerCase())
        .filter(cat => !cat.startsWith('bedroom') && !cat.startsWith('bathroom'))

      const categories = catArray.length > 1
        ? `${catArray.slice(0, -1).join(', ')} and ${catArray[catArray.length - 1]}`
        : catArray.join('');

      const bedroomsVal = watch('propertyDescriptors.bedrooms') || 'N/A';
      const bathroomsVal = watch('propertyDescriptors.bathrooms') || 'N/A';
      const parkingTypeVal = watch('propertyDescriptors.parkingType')?.toLowerCase() || 'N/A';

      const accommodationParts = [
        `${bedroomsVal} bedrooms`,
        `${bathroomsVal} bathrooms`,
        parkingTypeVal
      ];

      const addType = watch('additionalPhotosType');
      const addPhotos = (watch('additionalPhotos') as any[]) || [];
      const hasGrannyFlat = addType === 'Granny Flat' && addPhotos.length > 0;

      const mainBaseText = accommodationParts.join(', ') + (categories ? ` with ${categories}` : '');
      const mainText = hasGrannyFlat ? `${mainBaseText} in the main house.` : mainBaseText;

      let gfText = '';
      if (hasGrannyFlat) {
        const gfSummary = summarizePhotos(addPhotos);
        const gfBedrooms = gfSummary.categories.filter(c => c.category.toLowerCase().startsWith('bedroom')).length;
        const gfBathrooms = gfSummary.categories.filter(c => {
          const lower = c.category.toLowerCase();
          return lower.startsWith('bathroom') || lower.startsWith('ensuite');
        }).length;
        const gfCategories = gfSummary.categories
          .map(c => c.category.toLowerCase())
          .filter(c => !c.startsWith('bedroom') && !c.startsWith('bathroom'));
        const gfStructural: string[] = [];
        if (gfBedrooms) gfStructural.push(`${gfBedrooms} bedrooms`);
        if (gfBathrooms) gfStructural.push(`${gfBathrooms} bathrooms`);
        gfStructural.push('car space');
        const gfBase = gfStructural.join(', ');
        const gfRooms = gfCategories.length > 0 ? ` with ${gfCategories.join(', ')}` : '';
        gfText = ` ${gfBase}${gfRooms} in the granny flat`;
      }

      let accommodationText = `${mainText}${gfText}`.trim();
      if (!accommodationText.endsWith('.')) {
        accommodationText += '.';
      }
      setValue('propertyDetails.accommodation', accommodationText, { shouldDirty: true });

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
    } catch (e: any) {
      console.error('RP Data automation error:', e);
      alert(`Automation failed: ${e.message || 'Unknown error'}. Please check if the RP Data service is running.`);
    } finally {
      setIsAutomatingFromRP(false);
    }
  };

  return (
    <div className="space-y-8">
      {Boolean(watch('rpDataId')) && (
        <HeaderActionPortal>
          <button
            type="button"
            onClick={handleAutomateFromRP}
            disabled={isAutomatingFromRP || isAutoSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#006ABE] hover:bg-[#00589e] text-white shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold cursor-pointer"
            title="Automate from RP Data"
          >
            {isAutomatingFromRP || isAutoSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {isAutomatingFromRP ? 'Automating...' : 'Saving...'}
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Automate
              </>
            )}
          </button>
        </HeaderActionPortal>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Title Reference"
          error={errors.propertyDetails?.titleReference?.message}
        >
          <Input
            {...register('propertyDetails.titleReference')}
            placeholder="e.g., Lot 12 DP123456"
            error={errors.propertyDetails?.titleReference?.message}
          />
        </FormField>

        <FormField
          label="Zoning"
          error={errors.propertyDetails?.zoning?.message}
        >
          <Input
            {...register('propertyDetails.zoning')}
            placeholder="e.g., R2 Low Density Residential"
            error={errors.propertyDetails?.zoning?.message}
          />
        </FormField>

        <FormField
          label="Tenure Type"
          error={errors.propertyDetails?.tenureType?.message}
        >
          <Select
            {...register('propertyDetails.tenureType')}
            options={[
              { value: 'Freehold', label: 'Freehold' },
              { value: 'Crown Leasehold', label: 'Crown Leasehold' },
            ]}
            error={errors.propertyDetails?.tenureType?.message}
          />
        </FormField>

        <FormField
          label="Site Area (sqm)"
          error={errors.propertyDetails?.siteArea?.message}
        >
          <Input
            type="number"
            {...register('propertyDetails.siteArea', { valueAsNumber: true })}
            placeholder="Enter total site area"
            error={errors.propertyDetails?.siteArea?.message}
          />
        </FormField>

        <FormField
          label="Building Area (sqm)"
          error={errors.propertyDetails?.buildingArea?.message}
        >
          <Input
            type="number"
            {...register('propertyDetails.buildingArea', { valueAsNumber: true })}
            placeholder="Enter building area"
            error={errors.propertyDetails?.buildingArea?.message}
          />
        </FormField>

        <FormField
          label="Land Shape"
          error={errors.propertyDetails?.landShape?.message}
        >
          <Select
            {...register('propertyDetails.landShape')}
            options={LAND_SHAPE_TYPES.map(shape => ({ value: shape, label: shape }))}
            error={errors.propertyDetails?.landShape?.message}
          />
        </FormField>

        <FormField
          label="Council Area"
          error={errors.propertyDetails?.councilArea?.message}
        >
          <Input
            {...register('propertyDetails.councilArea')}
            placeholder="e.g., City of Parramatta"
            error={errors.propertyDetails?.councilArea?.message}
          />
        </FormField>

        <FormField
          label="Zoning Effects"
          error={errors.propertyDetails?.zoningEffects?.message}
        >
          <div className="relative">
            <Input
              {...register('propertyDetails.zoningEffects')}
              placeholder="e.g., Parramatta City Council Local Environment Plan (LEP)"
              error={errors.propertyDetails?.zoningEffects?.message}
            />
            <button
              type="button"
              onClick={handleAutoFillZoningEffects}
              className="absolute top-1/2 -translate-y-1/2 right-2 p-2 text-[#006ABE] hover:text-[#00589e] hover:bg-blue-50 rounded-full transition-colors duration-200 cursor-pointer"
              title="Auto-fill from Council Area"
            >
              <Wand2 className="w-4 h-4" />
            </button>
          </div>
        </FormField>

        <FormField
          label="Permissible Uses"
          error={errors.propertyDetails?.permissibleUses?.message}
        >
          <Textarea
            {...register('propertyDetails.permissibleUses')}
            placeholder="Outline the permissible uses under current zoning"
            rows={4}
            error={errors.propertyDetails?.permissibleUses?.message}
          />
        </FormField>

        <FormField
          label="Heritage Issues"
          error={errors.propertyDetails?.heritageIssue?.message}
        >
          <Textarea
            {...register('propertyDetails.heritageIssue')}
            placeholder="Note any heritage considerations or overlays"
            rows={4}
            error={errors.propertyDetails?.heritageIssue?.message}
          />
        </FormField>

        <FormField
          label="Flood"
          error={(errors as any).propertyDetails?.flood?.message}
        >
          <Input
            {...register('propertyDetails.flood')}
            placeholder="e.g., None, Low, Medium, High"
            error={(errors as any).propertyDetails?.flood?.message}
          />
        </FormField>

        <FormField
          label="Bushfire"
          error={(errors as any).propertyDetails?.bushfire?.message}
        >
          <Input
            {...register('propertyDetails.bushfire')}
            placeholder="e.g., None, BAL-LOW, BAL-12.5"
            error={(errors as any).propertyDetails?.bushfire?.message}
          />
        </FormField>

        <FormField
          label="Rainfall"
          error={(errors as any).propertyDetails?.rainfall?.message}
        >
          <Input
            {...register('propertyDetails.rainfall')}
            placeholder="e.g., 800mm per annum"
            error={(errors as any).propertyDetails?.rainfall?.message}
          />
        </FormField>

        <FormField
          label="Town Planning"
          error={(errors as any).propertyDetails?.townPlanning?.message}
        >
          <Textarea
            {...register('propertyDetails.townPlanning')}
            placeholder="Enter town planning details"
            rows={4}
            error={(errors as any).propertyDetails?.townPlanning?.message}
          />
        </FormField>

        <FormField
          label="Topography"
          error={(errors as any).propertyDetails?.topography?.message}
        >
          <Textarea
            {...register('propertyDetails.topography')}
            placeholder="e.g., Gently undulating, flat terrain"
            rows={4}
            error={(errors as any).propertyDetails?.topography?.message}
          />
        </FormField>

        <FormField
          label="Statutory Value ($)"
          error={(errors as any).propertyDetails?.statutoryValue?.message}
        >
          <Input
            type="number"
            {...register('propertyDetails.statutoryValue', { valueAsNumber: true })}
            placeholder="e.g., 3000000"
            error={(errors as any).propertyDetails?.statutoryValue?.message}
          />
        </FormField>

        <FormField
          label="Statutory Date"
          error={(errors as any).propertyDetails?.statutoryDate?.message}
        >
          <Input
            type="date"
            {...register('propertyDetails.statutoryDate')}
            error={(errors as any).propertyDetails?.statutoryDate?.message}
          />
        </FormField>

        <FormField
          label="Capital Improved Value ($)"
          error={(errors as any).propertyDetails?.capitalImprovedValue?.message}
        >
          <Input
            type="number"
            {...register('propertyDetails.capitalImprovedValue', { valueAsNumber: true })}
            placeholder="e.g., 280000"
            error={(errors as any).propertyDetails?.capitalImprovedValue?.message}
          />
        </FormField>

        <FormField
          label="Net Annual Value ($)"
          error={(errors as any).propertyDetails?.netAnnualValue?.message}
        >
          <Input
            type="number"
            {...register('propertyDetails.netAnnualValue', { valueAsNumber: true })}
            placeholder="e.g., 20500"
            error={(errors as any).propertyDetails?.netAnnualValue?.message}
          />
        </FormField>

        <FormField
          label="Year Built"
          error={errors.propertyDetails?.buildYear?.message}
          className="md:col-span-2"
        >
          <div className="space-y-2">
            <Input
              type="number"
              {...register('propertyDetails.buildYear')}
              placeholder="e.g., 1998"
              error={errors.propertyDetails?.buildYear?.message}
            />
            <Checkbox
              {...register('propertyDetails.includeGrannyFlatBuildYear')}
              label="Add Year Built (Granny Flat)"
            />
          </div>
        </FormField>

        {watch('propertyDetails.includeGrannyFlatBuildYear') && (
          <FormField
            label="Year Built (Granny Flat)"
            error={(errors as any).propertyDetails?.buildYearGrannyFlat?.message}
          >
            <Input
              type="number"
              {...register('propertyDetails.buildYearGrannyFlat', { valueAsNumber: true })}
              placeholder="e.g., 1998"
              error={(errors as any).propertyDetails?.buildYearGrannyFlat?.message}
            />
          </FormField>
        )}

        <FormField
          label="Accommodation"
          error={errors.propertyDetails?.accommodation?.message}
          className="md:col-span-2"
        >
          <div className="relative">
            <Textarea
              {...register('propertyDetails.accommodation')}
              placeholder="Summarise bed/bath count, living areas, parking, etc."
              rows={4}
              error={errors.propertyDetails?.accommodation?.message}
            />
            <button
              type="button"
              onClick={handleGenerateAccommodation}
              className="absolute top-2 right-2 p-2 text-[#006ABE] hover:text-[#00589e] hover:bg-blue-50 rounded-full transition-colors duration-200 cursor-pointer"
              title="Auto-generate from photos and property descriptors"
            >
              <Wand2 className="w-4 h-4" />
            </button>
          </div>
        </FormField>

        <FormField
          label="Property Type"
          error={errors.propertyDetails?.propertyType?.message}
          className="md:col-span-2"
        >
          <Select
            {...register('propertyDetails.propertyType')}
            options={AllPropertyTypes.map(type => ({ value: type, label: type }))}
            error={errors.propertyDetails?.propertyType?.message}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <FormField
          label="Living Area (sqm)"
          error={errors.propertyDetails?.livingArea?.message}
        >
          <Input
            type="number"
            {...register('propertyDetails.livingArea', { valueAsNumber: true })}
            placeholder="Internal living space"
            error={errors.propertyDetails?.livingArea?.message}
          />
        </FormField>

        <FormField
          label={`External Area (sqm${watch('propertyDetails.includeGrannyFlatExternalArea') ? ' - Granny Flat' : ''})`}
          error={(watch('propertyDetails.includeGrannyFlatExternalArea')
            ? (errors as any).propertyDetails?.externalAreaGrannyFlat?.message
            : errors.propertyDetails?.externalArea?.message)}
        >
          <div className="mb-2">
            <Checkbox
              {...register('propertyDetails.includeGrannyFlatExternalArea')}
              label="Granny Flat"
            />
          </div>
          <Input
            type="number"
            {...register((watch('propertyDetails.includeGrannyFlatExternalArea')
              ? 'propertyDetails.externalAreaGrannyFlat'
              : 'propertyDetails.externalArea') as any, { valueAsNumber: true })}
            placeholder="Outdoor or balcony areas"
            error={(watch('propertyDetails.includeGrannyFlatExternalArea')
              ? (errors as any).propertyDetails?.externalAreaGrannyFlat?.message
              : errors.propertyDetails?.externalArea?.message)}
          />
        </FormField>

        <FormField
          label="Parking Area (sqm)"
          error={errors.propertyDetails?.parkingArea?.message}
        >
          <Input
            type="number"
            {...register('propertyDetails.parkingArea', { valueAsNumber: true })}
            placeholder="Garages, carports, hardstand"
            error={errors.propertyDetails?.parkingArea?.message}
          />
        </FormField>

        <FormField
          label="Other Area (sqm)"
          error={errors.propertyDetails?.otherArea?.message}
        >
          <Input
            type="number"
            {...register('propertyDetails.otherArea', { valueAsNumber: true })}
            placeholder="Any other measurable areas"
            error={errors.propertyDetails?.otherArea?.message}
          />
        </FormField>

        <FormField
          label="Study Room"
          error={errors.propertyDetails?.studyRoom?.message}
        >
          <Checkbox
            {...register('propertyDetails.studyRoom')}
            label="Property includes a study room"
          />
        </FormField>

        <FormField
          label="Land Slope"
          error={errors.propertyDetails?.landSlope?.message}
        >
          <Select
            {...register('propertyDetails.landSlope')}
            options={[
              { value: 'Level', label: 'Level' },
              { value: 'Moderate', label: 'Moderate' },
              { value: 'Steep', label: 'Steep' },
              { value: 'Sharp', label: 'Sharp' }
            ]}
            error={errors.propertyDetails?.landSlope?.message}
          />
        </FormField>

        <FormField
          label="Frontage (m)"
          error={errors.propertyDetails?.frontage?.message}
        >
          <Input
            type="number"
            {...register('propertyDetails.frontage', { valueAsNumber: true })}
            placeholder="e.g., 12.5"
            error={errors.propertyDetails?.frontage?.message}
          />
        </FormField>

        <FormField
          label="Depth (m)"
          error={errors.propertyDetails?.depth?.message}
        >
          <Input
            type="number"
            {...register('propertyDetails.depth', { valueAsNumber: true })}
            placeholder="e.g., 30.5"
            error={errors.propertyDetails?.depth?.message}
          />
        </FormField>
      </div>
    </div>
  );
};
