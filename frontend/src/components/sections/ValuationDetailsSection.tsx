import React, { useEffect, useState, useRef } from 'react';
import { FormField, Input, Checkbox, Textarea, Select } from '../ui/FormField';
import { SectionProps } from '@/types/property-valuation';
import { Wand2 } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';

const getTodayDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const ValuationDetailsSection: React.FC<SectionProps> = ({ register, errors, watch, setValue }) => {
  const [showCapMethod, setShowCapMethod] = useState(false);
  const landValue = watch('valuationDetails.landValue');
  const improvements = watch('valuationDetails.improvements');
  const marketValue = watch('valuationDetails.marketValue');
  const isUnit = watch('valuationDetails.isUnit');
  const rpDataId = watch('rpDataId');
  const propDetailsType = watch('propertyDetails.propertyType');
  const directComparisonText = watch('valuationDetails.directComparison');
  const valuationType = watch('valuationDetails.valuationType');
  const capitalisedValue = watch('valuationDetails.capitalisedValue');
  const dateIssued = watch('valuationDetails.dateIssued');
  const surveyType = watch('valuationDetails.surveyType');
  const inspectionDate = watch('valuationDetails.inspectionDate');
  const prevSurveyTypeRef = useRef(surveyType);
  const valuationDate = watch('valuationDetails.valuationDate');
  const interestValued = watch('valuationDetails.interestValued');
  const isUnitInitializedRef = useRef(false);
  const prevIsUnitSyncRef = useRef<boolean | undefined>(undefined);

  // Default dateIssued to the current date if unset
  useEffect(() => {
    if (!dateIssued || dateIssued.trim() === '') {
      setValue('valuationDetails.dateIssued', getTodayDateString(), { shouldDirty: true });
    }
  }, [dateIssued, setValue]);

  // Default inspectionDate to current date when surveyType is 'Inspection'
  useEffect(() => {
    if (surveyType === 'Inspection') {
      if (!inspectionDate || inspectionDate.trim() === '') {
        setValue('valuationDetails.inspectionDate', getTodayDateString(), { shouldDirty: true });
      } else if (prevSurveyTypeRef.current !== undefined && prevSurveyTypeRef.current !== 'Inspection') {
        setValue('valuationDetails.inspectionDate', getTodayDateString(), { shouldDirty: true });
      }
    }
    prevSurveyTypeRef.current = surveyType;
  }, [surveyType, inspectionDate, setValue]);

  // Auto-tick currentDayValuation if valuationDate is the current date
  useEffect(() => {
    if (!valuationDate) return;
    const valDatePart = String(valuationDate).split('T')[0];
    const today = getTodayDateString();
    setValue('valuationDetails.currentDayValuation', valDatePart === today, { shouldDirty: true });
  }, [valuationDate, setValue]);

  // Auto-tick externalDesktopValuation if surveyType is set to desktop or kerbside
  useEffect(() => {
    if (!surveyType) return;
    const lower = surveyType.toLowerCase();
    if (lower.includes('desktop') || lower.includes('kerbside') || lower.includes('external')) {
      setValue('valuationDetails.externalDesktopValuation', true, { shouldDirty: true });
    } else if (lower.includes('inspection')) {
      setValue('valuationDetails.externalDesktopValuation', false, { shouldDirty: true });
    }
  }, [surveyType, setValue]);

  // Autofill interestValued with "Fee Simple Vacant Possession" always
  useEffect(() => {
    if (!interestValued || interestValued.trim() === '') {
      setValue('valuationDetails.interestValued', 'Fee Simple Vacant Possession', { shouldDirty: true });
    }
  }, [interestValued, setValue]);

  // Auto-select property type (House vs Unit) from propertyDetails or RP Data
  useEffect(() => {
    if (isUnitInitializedRef.current) return;

    if (propDetailsType) {
      const lower = propDetailsType.toLowerCase();
      const isUnitType = lower.includes('unit') || lower.includes('apartment') || lower.includes('flat');
      setValue('valuationDetails.isUnit', isUnitType, { shouldDirty: true });
      isUnitInitializedRef.current = true;
      return;
    }

    if (!rpDataId) return;

    let isMounted = true;
    (async () => {
      try {
        const resp = await fetch(`${API_BASE_URL}/rpdata/commons/${encodeURIComponent(String(rpDataId))}`);
        if (!resp.ok) return;
        const payload = await resp.json();
        const data = payload?.data || payload;
        const rawT = String(data?.attrCore?.propertyType || data?.propertyType || '').toLowerCase();
        const rawSub = String(data?.attrCore?.propertySubType || data?.propertySubType || '').toLowerCase();
        const isUnitType = rawT.includes('unit') || rawSub.includes('unit') || rawSub.includes('apartment') || rawSub.includes('flat');
        if (isMounted) {
          setValue('valuationDetails.isUnit', isUnitType, { shouldDirty: true });
          isUnitInitializedRef.current = true;
        }
      } catch (_) {}
    })();

    return () => {
      isMounted = false;
    };
  }, [propDetailsType, rpDataId, setValue]);

  // Sync checkboxes and improvements value based on House vs Unit
  useEffect(() => {
    // Auto-tick display currency in report in either case by default
    setValue('valuationDetails.showCurrencyOfValuation', true, { shouldDirty: true });

    if (isUnit === true) {
      // Unit selected: auto-tick only show land value and disable improvements
      setValue('valuationDetails.showLandValue', true, { shouldDirty: true });
      setValue('valuationDetails.showImprovements', false, { shouldDirty: true });
      if (prevIsUnitSyncRef.current === false) {
        setValue('valuationDetails.improvements', undefined, { shouldDirty: true });
      }
    } else if (isUnit === false) {
      // House selected: auto-tick both show land value and improvements
      setValue('valuationDetails.showLandValue', true, { shouldDirty: true });
      setValue('valuationDetails.showImprovements', true, { shouldDirty: true });
    }
    prevIsUnitSyncRef.current = isUnit;
  }, [isUnit, setValue]);

  // Auto-set market value when capitalised value changes (for SMSF reports)
  useEffect(() => {
    if (capitalisedValue !== undefined) {
      setValue('valuationDetails.marketValue', capitalisedValue, { shouldDirty: true });
    }
  }, [capitalisedValue, setValue]);

  // Auto-calculate market value when land value or improvements change
  useEffect(() => {
    const land = Number(landValue) || 0;
    const impr = Number(improvements) || 0;
    const total = land + impr;

    // Always set the market value (even if 0) when either field changes
    // This ensures market value is cleared when both land and improvements are deleted
    if (landValue !== undefined || improvements !== undefined) {
      setValue('valuationDetails.marketValue', total, { shouldDirty: true });
    }
  }, [landValue, improvements, setValue]);

  // Auto-set valuation amount equal to market value when it's a Unit
  useEffect(() => {
    if (isUnit && marketValue !== undefined) {
      setValue('valuationDetails.valuationAmount', marketValue, { shouldDirty: true });
    }
  }, [isUnit, marketValue, setValue]);

  // Normalize state abbreviations inside Direct Comparison Approach text (e.g., Nsw -> NSW)
  useEffect(() => {
    if (!directComparisonText) return;
    const fixed = directComparisonText.replace(/\b(nsw|vic|qld|sa|wa|tas|nt|act)\b/gi, (m) => m.toUpperCase());
    if (fixed !== directComparisonText) {
      setValue('valuationDetails.directComparison', fixed, { shouldDirty: true });
    }
  }, [directComparisonText, setValue]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleAutoFillDirectComparison = () => {
    const comparables = watch('comparables');
    const valuationType = watch('valuationDetails.valuationType');

    // 1. Commercial / Commercial Short Report / Rent Review Logic
    if (valuationType === 'Commercial' || valuationType === 'Commercial Short Report' || valuationType === 'Rent Review') {
      const rentalComparables = comparables?.rentals || [];
      const rentalRates = rentalComparables
        .map((r: any) => Number(r.rentalRate || r.rental_rate || r.nlaRate || r.nla_rate))
        .filter((val: number) => !isNaN(val) && val > 0);

      const manualLowest = Number(watch('valuationDetails.lowestRentalRate' as any)) || 0;
      const manualHighest = Number(watch('valuationDetails.highestRentalRate' as any)) || 0;

      let rateRangeText = 'N/A';
      if (manualLowest > 0 && manualHighest > 0) {
        rateRangeText = `${Math.round(manualLowest)}-${Math.round(manualHighest)}`;
      } else if (rentalRates.length > 0) {
        const minRate = Math.round(Math.min(...rentalRates));
        const maxRate = Math.round(Math.max(...rentalRates));
        rateRangeText = `${minRate}-${maxRate}`;
      }

      const sqMeterRate = Number(watch('valuationDetails.squareMeterRate')) || 0;
      const nla = Number(watch('valuationDetails.nla')) || 0;
      const marketRent = Number(watch('valuationDetails.marketRent')) || 0;
      const rawDate = watch('valuationDetails.valuationDate');
      
      let valuationDate = 'N/A';
      if (rawDate) {
        const d = new Date(rawDate);
        valuationDate = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      }

      const nlaTotal = nla * sqMeterRate;
      const roundedNlaTotal = Math.ceil(nlaTotal / 1000) * 1000;
      
      const autoText = `Based on the above comparable rental evidence, it suggests that the NLA rental rate ranges from ${rateRangeText} per sqm.
We considered a value rate of $${sqMeterRate.toFixed(2)} per sqm appropriate for the total net lettable area of the retail space. The NLA rate of $${sqMeterRate.toFixed(2)} per sqm is noted to be within the range as supported from the rental evidence.

NLA ${nla} Sqm @ $${sqMeterRate.toFixed(2)} p.sqm = ${formatCurrency(nlaTotal)} roundoff ${roundedNlaTotal.toLocaleString('en-AU')}

Rental Valuation Amount:
We assessed the subject property's Fair Market Rental Value on ${valuationDate}, based on the above stated comparable rental evidence, we considered a Net Market Rental Value of ${formatCurrency(roundedNlaTotal)} per annum (exclusive of outgoings & GST)`;

      setValue('valuationDetails.directComparison', autoText, { shouldDirty: true });
      setValue('valuationDetails.marketRent', roundedNlaTotal, { shouldDirty: true });
      return;
    }

    // 2. Residential Logic (Default)
    const salesComparables = watch('comparables.sales') || (comparables?.sales) || [];
    const rentalComparables = watch('comparables.rentals') || (comparables?.rentals) || [];
    const allComparables = [...salesComparables, ...rentalComparables];
    
    const evidence = allComparables.find((comp: any) => 
      comp.isComparable === true || 
      String(comp.isComparable) === 'true' || 
      String(comp.isComparable) === 'on'
    );

    if (evidence) {
      const toTitleCase = (str: string) => {
        if (!str) return 'N/A';
        const stateAbbreviations = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];
        return str.split(' ').map(word => {
          if (stateAbbreviations.includes(word.toUpperCase())) return word.toUpperCase();
          return word.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
        }).join(' ');
      };

      const formattedAddress = toTitleCase(evidence.fullAddress || '');
      const comparisonText = String(evidence.comparison || 'N/A').trim().replace(/\.+$/, '');
      const autoText = `Sales evidence at ${formattedAddress} comprises of ${evidence.bedrooms || 'N/A'} bedroom(s) and ${evidence.bathrooms || 'N/A'} bathroom(s). In comparison to subject: ${comparisonText}. On balance, the considered indicative market value of the subject property is ${evidence.saleLeasePrice ? formatCurrency(evidence.saleLeasePrice) : 'N/A'}.`;

      setValue('valuationDetails.directComparison', autoText, { shouldDirty: true });
    } else {
      alert('No comparable sales evidence found. Please mark a sales comparable as "Is Comparable" first.');
    }
  };
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Valuation Type"
          error={errors.valuationDetails?.valuationType?.message}
        >
          <Select
            {...register('valuationDetails.valuationType')}
            error={errors.valuationDetails?.valuationType?.message}
          >
            <option value="">Select valuation type</option>
            <option value="CGT 2027">CGT 2027</option>
            <option value="Capital Gains">Capital Gains</option>
            <option value="Market Assessment">Market Assessment</option>
            <option value="Stamp Duty">Stamp Duty</option>
            <option value="Transfer Duty">Transfer Duty</option>
            <option value="SMSF Audit">SMSF Audit</option>
            <option value="Retrospective Capital Gains">Retrospective Capital Gains</option>
            <option value="Land Valuation">Land Valuation</option>
            <option value="Commercial Short Report">Commercial Short Report</option>
            <option value="Rent Review">Rent Review</option>
            <option value="Commercial">Commercial</option>
            <option value="Rural">Rural</option>
            <option value="Rural (2 Hectare Exemption)">Rural (2 Hectare Exemption)</option>
            <option value="Probate Valuation">Probate Valuation</option>
            <option value="Family Law">Family Law</option>
            <option value="Financial Settlement">Financial Settlement</option>
          </Select>
        </FormField>

        {valuationType === 'Land Valuation' && (
          <FormField
            label="Valuation SubType"
            error={(errors as any).valuationDetails?.landValuationType?.message}
          >
            <Select
              {...register('valuationDetails.landValuationType')}
              error={(errors as any).valuationDetails?.landValuationType?.message}
            >
              <option value="">Select subtype</option>
              <option value="Stamp Duty">Stamp Duty</option>
              <option value="Capital Gains Tax">Capital Gains Tax</option>
              <option value="Transfer Duty">Transfer Duty</option>
              <option value="Market Assessment">Market Assessment</option>
              <option value="Probate">Probate</option>
              <option value="Pre Purchase/Pre Sale">Pre Purchase/Pre Sale</option>
              <option value="Family Law Matter">Family Law Matter</option>
            </Select>
          </FormField>
        )}

        {(valuationType === 'Commercial' || valuationType === 'Commercial Short Report') && (
          <FormField
            label="Valuation SubType"
            error={(errors as any).valuationDetails?.commercialSubType?.message}
          >
            <Input
              {...register('valuationDetails.commercialSubType')}
              placeholder="e.g., Probate / Pre Purchase/Pre Sale / Family Law Matter"
              error={(errors as any).valuationDetails?.commercialSubType?.message}
            />
          </FormField>
        )}

        <FormField
          label="Valuation Date"
          error={errors.valuationDetails?.valuationDate?.message}
        >
          <Input
            type="date"
            max="2100-12-31"
            {...register('valuationDetails.valuationDate')}
            error={errors.valuationDetails?.valuationDate?.message}
          />
        </FormField>

        <FormField
          label="Valuation Date 2"
          error={errors.valuationDetails?.valuationDate2?.message}
        >
          <Input
            type="date"
            max="2100-12-31"
            {...register('valuationDetails.valuationDate2')}
            error={errors.valuationDetails?.valuationDate2?.message}
          />
        </FormField>

        <FormField
          label="Logo Type"
          error={errors.valuationDetails?.logoType?.message}
        >
          <Select
            {...register('valuationDetails.logoType')}
            error={errors.valuationDetails?.logoType?.message}
          >
            <option value="AAP">AAP</option>
            <option value="CPV">CPV</option>
            <option value="TAMN">TAMN</option>
          </Select>
        </FormField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Inspection Date"
          error={errors.valuationDetails?.inspectionDate?.message}
        >
          <Input
            type="date"
            max="2100-12-31"
            {...register('valuationDetails.inspectionDate')}
            error={errors.valuationDetails?.inspectionDate?.message}
          />
        </FormField>

        <FormField
          label="Conversion Date"
          error={errors.valuationDetails?.conversionDate?.message}
        >
          <Input
            type="date"
            max="2100-12-31"
            {...register('valuationDetails.conversionDate')}
            error={errors.valuationDetails?.conversionDate?.message}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Deadline Date"
          error={errors.valuationDetails?.deadlineDate?.message}
        >
          <Input
            type="date"
            max="2100-12-31"
            {...register('valuationDetails.deadlineDate')}
            error={errors.valuationDetails?.deadlineDate?.message}
          />
        </FormField>

        <FormField
          label="Survey Type"
          error={errors.valuationDetails?.surveyType?.message}
        >
          <Select
            {...register('valuationDetails.surveyType')}
            error={errors.valuationDetails?.surveyType?.message}
          >
            <option value="">Select survey type</option>
            <option value="Inspection">Inspection</option>
            <option value="External/Desktop Valuation">External/Desktop Valuation</option>
            <option value="Kerbside Valuation">Kerbside Valuation</option>
          </Select>
        </FormField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Date Issued"
          error={errors.valuationDetails?.dateIssued?.message}
        >
          <Input
            type="date"
            max="2100-12-31"
            {...register('valuationDetails.dateIssued')}
            error={errors.valuationDetails?.dateIssued?.message}
          />
        </FormField>

        <FormField
          label="Date of Instruction"
          error={(errors as any).valuationDetails?.dateOfInstruction?.message}
        >
          <Input
            type="date"
            max="2100-12-31"
            {...register('valuationDetails.dateOfInstruction')}
            error={(errors as any).valuationDetails?.dateOfInstruction?.message}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Requested Valuation Target"
          error={errors.valuationDetails?.requestedValuationTarget?.message}
        >
          <Input
            {...register('valuationDetails.requestedValuationTarget')}
            placeholder="e.g., Market Value, Insurance Value"
            error={errors.valuationDetails?.requestedValuationTarget?.message}
          />
        </FormField>

        <FormField
          label="Stage"
          error={errors.valuationDetails?.stage?.message}
        >
          <Input
            {...register('valuationDetails.stage')}
            placeholder="e.g., Draft, Final, Under Review"
            error={errors.valuationDetails?.stage?.message}
          />
        </FormField>
      </div>

      <FormField
        label="Purpose of Report"
        error={errors.valuationDetails?.purposeOfReport?.message}
      >
        <Textarea
          {...register('valuationDetails.purposeOfReport')}
          placeholder="Describe the specific purpose and intended use of this valuation report"
          rows={3}
          error={errors.valuationDetails?.purposeOfReport?.message}
        />
      </FormField>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Current Day Valuation"
          error={errors.valuationDetails?.currentDayValuation?.message}
        >
          <Checkbox
            {...register('valuationDetails.currentDayValuation')}
            label="Valuation represents current day assessment"
          />
        </FormField>

        <FormField
          label="External/Desktop Valuation"
          error={errors.valuationDetails?.externalDesktopValuation?.message}
        >
          <Checkbox
            {...register('valuationDetails.externalDesktopValuation')}
            label="Valuation prepared without internal inspection"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Market Value"
          error={errors.valuationDetails?.marketValue?.message}
        >
          <Input
            type="number"
            {...register('valuationDetails.marketValue', { valueAsNumber: true })}
            placeholder="Auto-calculated (Land + Improvements)"
            error={errors.valuationDetails?.marketValue?.message}
            readOnly
            className="bg-gray-100 cursor-not-allowed"
          />
        </FormField>

        <FormField
          label="Interest Valued"
          error={errors.valuationDetails?.interestValued?.message}
        >
          <Input
            {...register('valuationDetails.interestValued')}
            placeholder="e.g., Fee Simple"
            error={errors.valuationDetails?.interestValued?.message}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Instructing Party"
          error={(errors as any).valuationDetails?.instructingParty?.message}
        >
          <Input
            {...register('valuationDetails.instructingParty')}
            placeholder="e.g., Septimus Jones & Lee and Kilger Partners"
            error={(errors as any).valuationDetails?.instructingParty?.message}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Primary Method"
          error={(errors as any).valuationDetails?.primaryMethod?.message}
        >
          <Select
            {...register('valuationDetails.primaryMethod')}
            error={(errors as any).valuationDetails?.primaryMethod?.message}
          >
            <option value="">Select primary method</option>
            <option value="Direct Sales Comparison">Direct Sales Comparison</option>
            <option value="Income Capitalisation">Income Capitalisation</option>
            <option value="Discounted Cash Flow">Discounted Cash Flow</option>
            <option value="Summation Approach">Summation Approach</option>
            <option value="Residual Method">Residual Method</option>
            <option value="Profits Method">Profits Method</option>
            <option value="Cost Approach">Cost Approach</option>
          </Select>
        </FormField>

        <FormField
          label="Secondary Method"
          error={(errors as any).valuationDetails?.secondaryMethod?.message}
        >
          <Select
            {...register('valuationDetails.secondaryMethod')}
            error={(errors as any).valuationDetails?.secondaryMethod?.message}
          >
            <option value="">Select secondary method</option>
            <option value="Direct Sales Comparison">Direct Sales Comparison</option>
            <option value="Income Capitalisation">Income Capitalisation</option>
            <option value="Discounted Cash Flow">Discounted Cash Flow</option>
            <option value="Summation Approach">Summation Approach</option>
            <option value="Residual Method">Residual Method</option>
            <option value="Profits Method">Profits Method</option>
            <option value="Cost Approach">Cost Approach</option>
          </Select>
        </FormField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FormField
          label="Show Currency of Valuation"
          error={errors.valuationDetails?.showCurrencyOfValuation?.message}
        >
          <Checkbox
            {...register('valuationDetails.showCurrencyOfValuation')}
            label="Display currency in report"
          />
        </FormField>

        <FormField
          label="Show Land Value"
          error={errors.valuationDetails?.showLandValue?.message}
        >
          <Checkbox
            {...register('valuationDetails.showLandValue')}
            label="Include land value component"
          />
        </FormField>

        <FormField
          label="Show Improvements"
          error={errors.valuationDetails?.showImprovements?.message}
        >
          <Checkbox
            {...register('valuationDetails.showImprovements')}
            label="Include improvements component"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FormField
          label="Land Value"
          error={errors.valuationDetails?.landValue?.message}
        >
          <Input
            type="number"
            {...register('valuationDetails.landValue', { valueAsNumber: true })}
            placeholder="e.g., 500000"
            error={errors.valuationDetails?.landValue?.message}
          />
        </FormField>

        <FormField
          label="Improvements Value"
          error={errors.valuationDetails?.improvements?.message}
        >
          <Input
            type="number"
            {...register('valuationDetails.improvements', { valueAsNumber: true })}
            placeholder="e.g., 350000"
            error={errors.valuationDetails?.improvements?.message}
            disabled={isUnit === true}
            className={isUnit === true ? 'bg-gray-100 cursor-not-allowed text-gray-400' : ''}
          />
        </FormField>

        <FormField
          label="Property Type"
          error={errors.valuationDetails?.isUnit?.message}
        >
          <div className="flex gap-6 pt-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                value="false"
                checked={!watch('valuationDetails.isUnit')}
                onChange={() => {
                  setValue('valuationDetails.isUnit', false, { shouldDirty: true });
                  setValue('valuationDetails.showLandValue', true, { shouldDirty: true });
                  setValue('valuationDetails.showImprovements', true, { shouldDirty: true });
                  setValue('valuationDetails.showCurrencyOfValuation', true, { shouldDirty: true });
                }}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-900">House</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                value="true"
                checked={watch('valuationDetails.isUnit') === true}
                onChange={() => {
                  setValue('valuationDetails.isUnit', true, { shouldDirty: true });
                  setValue('valuationDetails.showLandValue', true, { shouldDirty: true });
                  setValue('valuationDetails.showImprovements', false, { shouldDirty: true });
                  setValue('valuationDetails.improvements', undefined, { shouldDirty: true });
                  setValue('valuationDetails.showCurrencyOfValuation', true, { shouldDirty: true });
                }}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-900">Unit</span>
            </label>
          </div>
        </FormField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Lowest Value SQM"
          error={(errors as any).valuationDetails?.lowestValueSqm?.message}
        >
          <Input
            type="number"
            {...register('valuationDetails.lowestValueSqm', { valueAsNumber: true })}
            placeholder="e.g., 8500"
            error={(errors as any).valuationDetails?.lowestValueSqm?.message}
          />
        </FormField>

        <FormField
          label="Highest Value SQM"
          error={(errors as any).valuationDetails?.highestValueSqm?.message}
        >
          <Input
            type="number"
            {...register('valuationDetails.highestValueSqm', { valueAsNumber: true })}
            placeholder="e.g., 9000"
            error={(errors as any).valuationDetails?.highestValueSqm?.message}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Square Meter Rate"
          error={errors.valuationDetails?.squareMeterRate?.message}
        >
          <Input
            type="number"
            {...register('valuationDetails.squareMeterRate', { valueAsNumber: true })}
            placeholder="e.g., 5000"
            error={errors.valuationDetails?.squareMeterRate?.message}
          />
        </FormField>

        <FormField
          label="NLA (sqm)"
          error={errors.valuationDetails?.nla?.message}
        >
          <Input
            type="number"
            {...register('valuationDetails.nla', { valueAsNumber: true })}
            placeholder="e.g., 100"
            error={errors.valuationDetails?.nla?.message}
          />
        </FormField>

        <FormField
          label="Assessed Net Rental ($ p.a.)"
          error={(errors as any).valuationDetails?.assessedNetRental?.message}
        >
          <Input
            type="number"
            {...register('valuationDetails.assessedNetRental', { valueAsNumber: true })}
            placeholder="e.g., 50000"
            error={(errors as any).valuationDetails?.assessedNetRental?.message}
          />
        </FormField>

        <FormField
          label="Capitalisation Rate / Yield Adopted (%)"
          error={(errors as any).valuationDetails?.capitalisationRate?.message}
        >
          <Input
            type="number"
            step="0.01"
            {...register('valuationDetails.capitalisationRate', { valueAsNumber: true })}
            placeholder="e.g., 5.5"
            error={(errors as any).valuationDetails?.capitalisationRate?.message}
          />
        </FormField>

        <FormField
          label="Yield Rate 1 (%)"
          error={(errors as any).valuationDetails?.capRateLow?.message}
        >
          <Input
            type="number"
            step="0.01"
            {...register('valuationDetails.capRateLow', { valueAsNumber: true })}
            placeholder="e.g., 4.75"
            error={(errors as any).valuationDetails?.capRateLow?.message}
          />
        </FormField>

        <FormField
          label="Yield Rate 2 (%)"
          error={(errors as any).valuationDetails?.capRateHigh?.message}
        >
          <Input
            type="number"
            step="0.01"
            {...register('valuationDetails.capRateHigh', { valueAsNumber: true })}
            placeholder="e.g., 5.25"
            error={(errors as any).valuationDetails?.capRateHigh?.message}
          />
        </FormField>

        <FormField
          label="Market Rent ($ p.a.)"
          error={(errors as any).valuationDetails?.marketRent?.message}
        >
          <Input
            type="number"
            {...register('valuationDetails.marketRent', { valueAsNumber: true })}
            placeholder="e.g., 23500"
            error={(errors as any).valuationDetails?.marketRent?.message}
          />
        </FormField>

        <FormField
          label="Letting Up Expenses ($)"
          error={(errors as any).valuationDetails?.lettingUpExpenses?.message}
        >
          <Input
            type="number"
            {...register('valuationDetails.lettingUpExpenses', { valueAsNumber: true })}
            placeholder="e.g., 10000"
            error={(errors as any).valuationDetails?.lettingUpExpenses?.message}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Planning Scheme"
          error={(errors as any).valuationDetails?.planningScheme?.message}
        >
          <Input
            {...register('valuationDetails.planningScheme')}
            placeholder="e.g., Local Environmental Plan"
            error={(errors as any).valuationDetails?.planningScheme?.message}
          />
        </FormField>

        <FormField
          label="Planning Approval"
          error={(errors as any).valuationDetails?.planningApproval?.message}
        >
          <Input
            {...register('valuationDetails.planningApproval')}
            placeholder="e.g., DA Approved"
            error={(errors as any).valuationDetails?.planningApproval?.message}
          />
        </FormField>

        <FormField
          label="Current Use"
          error={(errors as any).valuationDetails?.currentUse?.message}
        >
          <Input
            {...register('valuationDetails.currentUse')}
            placeholder="e.g., Commercial retail"
            error={(errors as any).valuationDetails?.currentUse?.message}
          />
        </FormField>

        <FormField
          label="Potential / Future Use"
          error={(errors as any).valuationDetails?.potentialFutureUse?.message}
        >
          <Input
            {...register('valuationDetails.potentialFutureUse')}
            placeholder="e.g., Mixed-use development"
            error={(errors as any).valuationDetails?.potentialFutureUse?.message}
          />
        </FormField>

        <FormField
          label="Registered Proprietor"
          error={(errors as any).valuationDetails?.registeredProprietor?.message}
        >
          <Input
            {...register('valuationDetails.registeredProprietor')}
            placeholder="e.g., John Smith"
            error={(errors as any).valuationDetails?.registeredProprietor?.message}
          />
        </FormField>

        <FormField
          label="Occupancy"
          error={(errors as any).valuationDetails?.occupancy?.message}
        >
          <Select
            {...register('valuationDetails.occupancy' as any)}
            error={(errors as any).valuationDetails?.occupancy?.message}
          >
            <option value="">Select occupancy status</option>
            <option value="Vacant">Vacant</option>
            <option value="Tenant Occupied">Tenant Occupied</option>
            <option value="Owner Occupied">Owner Occupied</option>
          </Select>
        </FormField>
      </div>

      {/* Capitalisation Method Fields */}
      <div className="flex items-center gap-3 mt-4">
        <h3 className="text-lg font-semibold text-gray-800">Capitalisation Method</h3>
        <button
          type="button"
          onClick={() => setShowCapMethod(prev => !prev)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
            showCapMethod ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
              showCapMethod ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="text-sm text-gray-500">{showCapMethod ? 'Shown' : 'Hidden'}</span>
      </div>
      {showCapMethod && (
      <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FormField
          label="Gross Rental Rate ($/m² p.a.)"
          error={(errors as any).valuationDetails?.grossRentalRate?.message}
        >
          <Input
            type="number"
            step="0.01"
            {...register('valuationDetails.grossRentalRate', { valueAsNumber: true })}
            placeholder="e.g., 170.00"
            error={(errors as any).valuationDetails?.grossRentalRate?.message}
          />
        </FormField>

        <FormField
          label="Vacancy Allowance (%)"
          error={(errors as any).valuationDetails?.vacancyAllowancePct?.message}
        >
          <Input
            type="number"
            step="0.01"
            {...register('valuationDetails.vacancyAllowancePct', { valueAsNumber: true })}
            placeholder="e.g., 0.00"
            error={(errors as any).valuationDetails?.vacancyAllowancePct?.message}
          />
        </FormField>

        <FormField
          label="Outgoings Rate ($/m² p.a.)"
          error={(errors as any).valuationDetails?.outgoingsRate?.message}
        >
          <Input
            type="number"
            step="0.01"
            {...register('valuationDetails.outgoingsRate', { valueAsNumber: true })}
            placeholder="e.g., 30.00"
            error={(errors as any).valuationDetails?.outgoingsRate?.message}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <FormField
          label="Cap Rate Low (%)"
          error={(errors as any).valuationDetails?.capRateLow?.message}
        >
          <Input
            type="number"
            step="0.01"
            {...register('valuationDetails.capRateLow', { valueAsNumber: true })}
            placeholder="e.g., 4.75"
            error={(errors as any).valuationDetails?.capRateLow?.message}
          />
        </FormField>

        <FormField
          label="Cap Rate Mid (%)"
          error={(errors as any).valuationDetails?.capRateMid?.message}
        >
          <Input
            type="number"
            step="0.01"
            {...register('valuationDetails.capRateMid', { valueAsNumber: true })}
            placeholder="e.g., 5.00"
            error={(errors as any).valuationDetails?.capRateMid?.message}
          />
        </FormField>

        <FormField
          label="Cap Rate High (%)"
          error={(errors as any).valuationDetails?.capRateHigh?.message}
        >
          <Input
            type="number"
            step="0.01"
            {...register('valuationDetails.capRateHigh', { valueAsNumber: true })}
            placeholder="e.g., 5.25"
            error={(errors as any).valuationDetails?.capRateHigh?.message}
          />
        </FormField>

        <FormField
          label="Adopted Cap Value ($)"
          error={(errors as any).valuationDetails?.adoptedCapValue?.message}
        >
          <Input
            type="number"
            step="1"
            {...register('valuationDetails.adoptedCapValue', { valueAsNumber: true })}
            placeholder="e.g., 3060000"
            error={(errors as any).valuationDetails?.adoptedCapValue?.message}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FormField
          label="Capital Expenditure Rate ($/m²)"
          error={(errors as any).valuationDetails?.capitalExpenditureRate?.message}
        >
          <Input
            type="number"
            step="0.01"
            {...register('valuationDetails.capitalExpenditureRate', { valueAsNumber: true })}
            placeholder="e.g., 13.00"
            error={(errors as any).valuationDetails?.capitalExpenditureRate?.message}
          />
        </FormField>

        <FormField
          label="Incentive Months"
          error={(errors as any).valuationDetails?.incentiveMonths?.message}
        >
          <Input
            type="number"
            step="0.01"
            {...register('valuationDetails.incentiveMonths', { valueAsNumber: true })}
            placeholder="e.g., 0"
            error={(errors as any).valuationDetails?.incentiveMonths?.message}
          />
        </FormField>

        <FormField
          label="Letting Up Months"
          error={(errors as any).valuationDetails?.lettingUpMonths?.message}
        >
          <Input
            type="number"
            step="0.01"
            {...register('valuationDetails.lettingUpMonths', { valueAsNumber: true })}
            placeholder="e.g., 3"
            error={(errors as any).valuationDetails?.lettingUpMonths?.message}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FormField
          label="Agent's Commission (%)"
          error={(errors as any).valuationDetails?.agentsCommissionPct?.message}
        >
          <Input
            type="number"
            step="0.01"
            {...register('valuationDetails.agentsCommissionPct', { valueAsNumber: true })}
            placeholder="e.g., 12.00"
            error={(errors as any).valuationDetails?.agentsCommissionPct?.message}
          />
        </FormField>

        <FormField
          label="PV Discount Rate (%)"
          error={(errors as any).valuationDetails?.pvDiscountRate?.message}
        >
          <Input
            type="number"
            step="0.01"
            {...register('valuationDetails.pvDiscountRate', { valueAsNumber: true })}
            placeholder="e.g., 10.00"
            error={(errors as any).valuationDetails?.pvDiscountRate?.message}
          />
        </FormField>

        <FormField
          label="Miscellaneous ($)"
          error={(errors as any).valuationDetails?.miscellaneousAmount?.message}
        >
          <Input
            type="number"
            step="0.01"
            {...register('valuationDetails.miscellaneousAmount', { valueAsNumber: true })}
            placeholder="e.g., 0.00"
            error={(errors as any).valuationDetails?.miscellaneousAmount?.message}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="PV of Overage Rent ($)"
          error={(errors as any).valuationDetails?.pvOverageRent?.message}
        >
          <Input
            type="number"
            step="0.01"
            {...register('valuationDetails.pvOverageRent', { valueAsNumber: true })}
            placeholder="e.g., 0.00"
            error={(errors as any).valuationDetails?.pvOverageRent?.message}
          />
        </FormField>
      </div>
      </>
      )}

      <FormField
        label="Valuation Notes"
        error={errors.valuationDetails?.valuationNotes?.message}
      >
        <Textarea
          {...register('valuationDetails.valuationNotes')}
          placeholder="Additional notes, qualifications, or special considerations for this valuation"
          rows={4}
          error={errors.valuationDetails?.valuationNotes?.message}
        />
      </FormField>

      <FormField
        label="Direct Comparison Approach"
        error={errors.valuationDetails?.directComparison?.message}
      >
        <div className="relative">
          <Textarea
            {...register('valuationDetails.directComparison')}
            placeholder="Summarise comparable sales and adjustments supporting the valuation conclusion."
            rows={6}
            error={errors.valuationDetails?.directComparison?.message}
          />
          <button
            type="button"
            onClick={handleAutoFillDirectComparison}
            className="absolute top-2 right-2 p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-200"
            title="Auto-fill from comparable sales evidence"
          >
            <Wand2 className="w-4 h-4" />
          </button>
        </div>
      </FormField>
    </div>
  );
};
