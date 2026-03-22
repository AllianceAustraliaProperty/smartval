import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/config/db';
import PropertyValuation from '@/models/PropertyValuation';
import * as ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { uploadToOneDrive } from '@/lib/onedrive';
// WinAX import removed - PDF generation now handled by backend
import sharp from 'sharp';
import { Buffer } from 'buffer';
import { getOneDriveDownloadUrl, tokenManager } from '@/lib/onedrive-token';

async function generateCustomMapImage(address: string, apiKey: string, fullAddressLabel: string, lat?: string | null, lng?: string | null): Promise<Buffer> {
  const center = (lat && lng) ? `${lat},${lng}` : encodeURIComponent(address);
  const marker = (lat && lng) ? `${lat},${lng}` : encodeURIComponent(address);
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${center}&zoom=14&size=600x400&maptype=roadmap&markers=color:red%7C${marker}&key=${apiKey}`;

  const arrayBuffer = await fetch(mapUrl).then(res => res.arrayBuffer());

  const nodeBuffer = Buffer.from(arrayBuffer); 

  // Create address text positioned directly above the red marker (original behavior)
  const escapeForSvg = (text: string) => text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const safeLabel = escapeForSvg(fullAddressLabel);
  const addressLabelSvg = `
    <svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
      <!-- Address text directly on map, positioned above center (where red marker is) -->
      <text x="300" y="140" font-size="18" font-family="DejaVu Sans, Liberation Sans, Arial, Helvetica, sans-serif" font-weight="700" fill="#141414" text-anchor="middle" alignment-baseline="middle" stroke="#ffffff" stroke-width="1" paint-order="stroke fill">
        ${safeLabel}
      </text>
    </svg>
  `;

  return await sharp(nodeBuffer)
    .composite([{ 
      input: Buffer.from(addressLabelSvg), 
      top: 0, 
      left: 0,
      blend: 'over'
    }])
    .png()
    .toBuffer();
}

function formatImprovementName(key: string): string {
  // Convert camelCase or custom keys to readable format
  return key
    .replace(/([A-Z])/g, ' $1') // Insert space before capitals
    .replace(/^./, str => str.toUpperCase()); // Capitalize first letter
}


export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await context.params;

  // ✅ Fixed dimensions for consistent image sizing with black borders
  const reportCoverImageWidth = 670;  // Increased width to fill up to Y column
  const reportCoverImageHeight = 300; // Slightly increased height
  const locationMapImageWidth = 500;
  const locationMapImageHeight = 190;

  try {
    const property: any = await PropertyValuation.findById(id).lean();
    if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

    const workbook = new ExcelJS.Workbook();
    const templatePath = path.resolve(process.cwd(), 'public/templates/AAP-Report.xlsx');
    await workbook.xlsx.readFile(templatePath);
    workbook.calcProperties.fullCalcOnLoad = true;

    const filloutSheet = workbook.getWorksheet('Fillout');
    if (!filloutSheet) {
      throw new Error('Fillout sheet not found in template');
    }

    // ✅ Set values directly into specific cells under existing labels
    const overview = property.overview || {};
    const valuationDetails = property.valuationDetails || {};
    const propertyDetails = property.propertyDetails || {};
    const propertyDescriptors = property.propertyDescriptors || {};
    const roomFeaturesFixtures = property.roomFeaturesFixtures || {};
    const locationAndNeighborhood = property.locationAndNeighborhood || {};
    const siteDetails = property.siteDetails || {};
    const ancillaryImprovements = property.ancillaryImprovements || {};
    const generalComments = property.generalComments || {};
    
    filloutSheet.getCell('B2').value = overview.jobNumber || '';
    filloutSheet.getCell('C2').value = overview.closedByz || '';
    filloutSheet.getCell('D2').value = overview.propertyValuer || '';
    filloutSheet.getCell('E2').value = overview.reportType || '';
    filloutSheet.getCell('F2').value = overview.valuationType || '';
    filloutSheet.getCell('G2').value = overview.addressStreet || '';
    filloutSheet.getCell('H2').value = overview.addressSuburb || '';
    filloutSheet.getCell('I2').value = overview.addressState || '';
    filloutSheet.getCell('J2').value = overview.addressPostcode || '';
    filloutSheet.getCell('K2').value = overview.propertyType || '';
    filloutSheet.getCell('L2').value = overview.valuationNotes || '';
    filloutSheet.getCell('M2').value = overview.dateOfValuation || '';
    filloutSheet.getCell('N2').value = valuationDetails.clientsExpectedValue || '';
    filloutSheet.getCell('O2').value = overview.surveyType || '';
    filloutSheet.getCell('P2').value = overview.dateOfInspection || '';
    filloutSheet.getCell('Q2').value = valuationDetails.valuersGuaranteedValue || '';
    filloutSheet.getCell('R2').value = valuationDetails.requestedValuationTarget || '';
    filloutSheet.getCell('B22').value = overview.dateOfValuation || '';
    filloutSheet.getCell('B24').value = overview.dateOfValuation || '';
    filloutSheet.getCell('B27').value = propertyDetails.buildYear || '';
    filloutSheet.getCell('B28').value = propertyDetails.titleReference || '';
    filloutSheet.getCell('B29').value = propertyDetails.councilArea || '';
    filloutSheet.getCell('B31').value = propertyDetails.zoning || '';
    filloutSheet.getCell('B32').value = propertyDetails.permissibleUses || '';
    filloutSheet.getCell('B33').value = propertyDetails.landShape || '';
    filloutSheet.getCell('B34').value = propertyDetails.landSlope || '';
    filloutSheet.getCell('B35').value = propertyDetails.frontage || '';
    filloutSheet.getCell('B36').value = propertyDetails.depth || '';
    filloutSheet.getCell('B37').value = propertyDetails.siteArea || '';
    filloutSheet.getCell('B38').value = propertyDetails.livingArea || '';
    filloutSheet.getCell('B39').value = propertyDetails.externalArea || '';
    filloutSheet.getCell('B44').value = locationAndNeighborhood.suburbDescription || '';
    filloutSheet.getCell('B45').value = locationAndNeighborhood.addressStreet || '';
    filloutSheet.getCell('B46').value = locationAndNeighborhood.connectedStreet?.name || '';
    filloutSheet.getCell('B47').value = locationAndNeighborhood.publicTransport?.type || '';
    filloutSheet.getCell('B48').value = locationAndNeighborhood.publicTransport?.name || '';
    filloutSheet.getCell('B49').value = locationAndNeighborhood.publicTransport?.distance || '';
    filloutSheet.getCell('B50').value = locationAndNeighborhood.shop?.type || '';
    filloutSheet.getCell('B51').value = locationAndNeighborhood.shop?.distance || '';
    filloutSheet.getCell('B52').value = locationAndNeighborhood.primarySchool?.name || '';
    filloutSheet.getCell('B53').value = locationAndNeighborhood.primarySchool?.distance || '';
    filloutSheet.getCell('B54').value = locationAndNeighborhood.highSchool?.name || '';
    filloutSheet.getCell('B55').value = locationAndNeighborhood.highSchool?.distance || '';
    filloutSheet.getCell('B56').value = locationAndNeighborhood.cbd?.name || '';
    filloutSheet.getCell('B57').value = locationAndNeighborhood.cbd?.distance || '';
    filloutSheet.getCell('B58').value = locationAndNeighborhood.includesGas || '';
    filloutSheet.getCell('B63').value = siteDetails.mapSource || '';
    filloutSheet.getCell('B66').value = propertyDescriptors.mainBuildingType || '';
    filloutSheet.getCell('B67').value = propertyDescriptors.externalWalls || '';
    filloutSheet.getCell('B68').value = propertyDescriptors.internalWalls || '';
    filloutSheet.getCell('B69').value = propertyDescriptors.roofing || '';
    filloutSheet.getCell('B70').value = propertyDescriptors.numberOfBedrooms || '';
    filloutSheet.getCell('B71').value = propertyDescriptors.numberOfBathrooms || '';
    filloutSheet.getCell('B72').value = propertyDescriptors.parkingType || '';
    filloutSheet.getCell('B75').value = propertyDescriptors.internalCondition || '';
    filloutSheet.getCell('B76').value = propertyDescriptors.externalCondition || '';
    filloutSheet.getCell('B77').value = propertyDescriptors.repairRequirements || '';
    filloutSheet.getCell('B78').value = propertyDescriptors.defects || '';
    filloutSheet.getCell('B83').value = ancillaryImprovements.driveway || '';
    filloutSheet.getCell('B84').value = ancillaryImprovements.fencing || '';
    const selectedImprovements = Object.entries(ancillaryImprovements?.improvements || {})
      .filter(([_, value]) => typeof value === 'object' && value !== null && 'selected' in value && (value as { selected: boolean }).selected)
      .map(([key]) => formatImprovementName(key))
      .join(', ');

    filloutSheet.getCell('B85').value = selectedImprovements || '';
    filloutSheet.getCell('B88').value = roomFeaturesFixtures?.rooms?.["Bedroom 1"]?.extraItems?.join(", ") || '';
    filloutSheet.getCell('B89').value = roomFeaturesFixtures?.rooms?.["Bedroom 2"]?.extraItems?.join(", ") || '';
    filloutSheet.getCell('B90').value = roomFeaturesFixtures?.rooms?.["Bedroom 3"]?.extraItems?.join(", ") || '';
    filloutSheet.getCell('B91').value = roomFeaturesFixtures?.rooms?.["Bedroom 4"]?.extraItems?.join(", ") || '';
    filloutSheet.getCell('B92').value = roomFeaturesFixtures?.rooms?.["Bedroom 5"]?.extraItems?.join(", ") || '';
    filloutSheet.getCell('B93').value = roomFeaturesFixtures?.rooms?.["Bedroom 6"]?.extraItems?.join(", ") || '';
    filloutSheet.getCell('B94').value = roomFeaturesFixtures?.rooms?.["Bathroom"]?.extraItems?.join(", ") || '';
    filloutSheet.getCell('B95').value = roomFeaturesFixtures?.rooms?.["Ensuite"]?.extraItems?.join(", ") || '';
    filloutSheet.getCell('B96').value = roomFeaturesFixtures?.rooms?.["Study"]?.extraItems?.join(", ") || '';
    filloutSheet.getCell('B97').value = roomFeaturesFixtures?.rooms?.["Kitchen"]?.extraItems?.join(", ") || '';
    filloutSheet.getCell('B98').value = roomFeaturesFixtures?.rooms?.["Living"]?.extraItems?.join(", ") || '';
    filloutSheet.getCell('B99').value = roomFeaturesFixtures?.rooms?.["Dining"]?.extraItems?.join(", ") || '';
    filloutSheet.getCell('B100').value = roomFeaturesFixtures?.rooms?.["Lounge"]?.extraItems?.join(", ") || '';
    filloutSheet.getCell('B101').value = roomFeaturesFixtures?.rooms?.["Rumpus"]?.extraItems?.join(", ") || '';
    filloutSheet.getCell('B102').value = roomFeaturesFixtures?.rooms?.["Sunroom"]?.extraItems?.join(", ") || '';
    filloutSheet.getCell('B103').value = roomFeaturesFixtures?.rooms?.["Storage area"]?.extraItems?.join(", ") || '';
    filloutSheet.getCell('B104').value = roomFeaturesFixtures?.rooms?.["Workshop"]?.extraItems?.join(", ") || '';
    filloutSheet.getCell('B105').value = roomFeaturesFixtures?.rooms?.["Porch"]?.extraItems?.join(", ") || '';
    filloutSheet.getCell('B106').value = roomFeaturesFixtures?.rooms?.["Alfresco"]?.extraItems?.join(", ") || '';
    filloutSheet.getCell('B107').value = roomFeaturesFixtures?.rooms?.["Patio"]?.extraItems?.join(", ") || '';
    filloutSheet.getCell('B108').value = roomFeaturesFixtures?.rooms?.["Balcony"]?.extraItems?.join(", ") || '';
    filloutSheet.getCell('B109').value = roomFeaturesFixtures?.rooms?.["Laundry"]?.extraItems?.join(", ") || '';
    filloutSheet.getCell('B110').value = roomFeaturesFixtures?.rooms?.["General"]?.extraItems?.join(", ") || '';

    filloutSheet.getCell('B113').value = roomFeaturesFixtures?.rooms?.["Bedroom 1"]?.flooringTypes?.join(", ") || '';
    filloutSheet.getCell('B114').value = roomFeaturesFixtures?.rooms?.["Bedroom 2"]?.flooringTypes?.join(", ") || '';
    filloutSheet.getCell('B115').value = roomFeaturesFixtures?.rooms?.["Bedroom 3"]?.flooringTypes?.join(", ") || '';
    filloutSheet.getCell('B116').value = roomFeaturesFixtures?.rooms?.["Bedroom 4"]?.flooringTypes?.join(", ") || '';
    filloutSheet.getCell('B117').value = roomFeaturesFixtures?.rooms?.["Bedroom 5"]?.flooringTypes?.join(", ") || '';
    filloutSheet.getCell('B118').value = roomFeaturesFixtures?.rooms?.["Bedroom 6"]?.flooringTypes?.join(", ") || '';
    filloutSheet.getCell('B119').value = roomFeaturesFixtures?.rooms?.["Bathroom"]?.flooringTypes?.join(", ") || '';
    filloutSheet.getCell('B120').value = roomFeaturesFixtures?.rooms?.["Ensuite"]?.flooringTypes?.join(", ") || '';
    filloutSheet.getCell('B121').value = roomFeaturesFixtures?.rooms?.["Study"]?.flooringTypes?.join(", ") || '';
    filloutSheet.getCell('B122').value = roomFeaturesFixtures?.rooms?.["Kitchen"]?.flooringTypes?.join(", ") || '';
    filloutSheet.getCell('B123').value = roomFeaturesFixtures?.rooms?.["Dining"]?.flooringTypes?.join(", ") || '';
    filloutSheet.getCell('B124').value = roomFeaturesFixtures?.rooms?.["Living"]?.flooringTypes?.join(", ") || '';
    filloutSheet.getCell('B125').value = roomFeaturesFixtures?.rooms?.["Lounge"]?.flooringTypes?.join(", ") || '';
    filloutSheet.getCell('B126').value = roomFeaturesFixtures?.rooms?.["Rumpus"]?.flooringTypes?.join(", ") || '';
    filloutSheet.getCell('B127').value = roomFeaturesFixtures?.rooms?.["Sunroom"]?.flooringTypes?.join(", ") || '';
    filloutSheet.getCell('B128').value = roomFeaturesFixtures?.rooms?.["Storage area"]?.flooringTypes?.join(", ") || '';
    filloutSheet.getCell('B129').value = roomFeaturesFixtures?.rooms?.["Workshop"]?.flooringTypes?.join(", ") || '';
    filloutSheet.getCell('B130').value = roomFeaturesFixtures?.rooms?.["Porch"]?.flooringTypes?.join(", ") || '';
    filloutSheet.getCell('B131').value = roomFeaturesFixtures?.rooms?.["Alfresco"]?.flooringTypes?.join(", ") || '';
    filloutSheet.getCell('B132').value = roomFeaturesFixtures?.rooms?.["Patio"]?.flooringTypes?.join(", ") || '';
    filloutSheet.getCell('B133').value = roomFeaturesFixtures?.rooms?.["Balcony"]?.flooringTypes?.join(", ") || '';
    filloutSheet.getCell('B134').value = roomFeaturesFixtures?.rooms?.["Laundry"]?.flooringTypes?.join(", ") || '';
    filloutSheet.getCell('B135').value = roomFeaturesFixtures?.rooms?.["General"]?.flooringTypes?.join(", ") || '';
    filloutSheet.getCell('B143').value = generalComments.marketOverview || '';
    filloutSheet.getCell('B182').value = valuationDetails.landValue || '';
    filloutSheet.getCell('B183').value = valuationDetails.improvements || '';
    filloutSheet.getCell('B184').value = valuationDetails.marketValue || '';

    // 🧹 Photos Sheet
    const photoSheet = workbook.getWorksheet('Photos');
    if (!photoSheet) {
      throw new Error('Photos sheet not found in template');
    }

    const photos = property.photos || {};
    const exteriorPhotos = photos.exteriorPhotos || [];
    const interiorPhotos = photos.interiorPhotos || [];
    const additionalPhotos = photos.additionalPhotos || [];
    const reportCoverPhoto = photos.reportCoverPhoto || [];
    const grannyFlatPhotos = photos.grannyFlatPhotos || [];

    const fullAddressLabel = `${overview.addressStreet}, ${overview.addressSuburb}, ${overview.addressState} ${overview.addressPostcode}`;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

    const locationDetails = property.locationDetails || {};
    const lat = locationDetails.latitude || null;
    const lng = locationDetails.longitude || null;

    // Generate and add map image using coordinates for accuracy
    const mapImageBuffer = await generateCustomMapImage(fullAddressLabel, apiKey, fullAddressLabel, lat, lng);
    
    // ✅ Crop map image to fixed dimensions with black border
    const croppedMapBuffer = await cropImageToFit(mapImageBuffer, locationMapImageWidth, locationMapImageHeight);
    
    const imageId = workbook.addImage({
      buffer: croppedMapBuffer as any,
      extension: 'png',
    });

    // Account for black border when placing image
    const borderWidth = 2;
    const finalMapWidth = locationMapImageWidth + (borderWidth * 2);
    const finalMapHeight = locationMapImageHeight + (borderWidth * 2);

    photoSheet.addImage(imageId, {
      tl: { col: 2, row: 16 }, 
      ext: { width: finalMapWidth, height: finalMapHeight },
    });
    
    console.log(`✅ Google Maps image embedded with fixed dimensions and black border: ${croppedMapBuffer.length} bytes`);

    // Photo grid settings
    const maxRows = 31;
    const startingRow = 4;
    const photosPerRow = 2;
    const imageWidth = 250;
    const imageHeight = 150;

    // Add report cover photo as actual image instead of hyperlink
    if (reportCoverPhoto && reportCoverPhoto.length > 0) {
      try {
        // ✅ Use new token manager to get downloadable URL
        const downloadUrl = await getOneDriveDownloadUrl(reportCoverPhoto[0]);
        const response = await fetch(downloadUrl);
        const imageBuffer = await response.arrayBuffer();

        // ✅ Crop report cover image to fixed dimensions with black border
        const croppedImageBuffer = await cropImageToFit(imageBuffer, reportCoverImageWidth, reportCoverImageHeight);

        const reportCoverImageId = workbook.addImage({
          buffer: croppedImageBuffer as any,
          extension: 'png', 
        });

        // Account for black border when placing image
        const borderWidth = 2;
        const finalImageWidth = reportCoverImageWidth + (borderWidth * 2);
        const finalImageHeight = reportCoverImageHeight + (borderWidth * 2);

        // Add image to cell C4 position (similar to other photos)
        photoSheet.addImage(reportCoverImageId, {
          tl: { col: 2, row: 3 }, // C4 cell position (col 2 = C, row 3 = 4 in 0-based indexing)
          ext: { width: finalImageWidth, height: finalImageHeight },
        });
        
        console.log(`✅ Report cover image embedded with fixed dimensions and black border: ${croppedImageBuffer.length} bytes`);
      } catch (error) {
        console.error('Failed to embed report cover photo:', error);
        // Fallback to hyperlink if image embedding fails
        photoSheet.getCell('C4').value = {
          text: "View Report Cover Photo", 
          hyperlink: reportCoverPhoto[0] || ''
        };
      }
    } else {
      // Clear the cell if no photo is available
      photoSheet.getCell('C4').value = '';
    }

    // Process all photos
    const allPhotos: { type: string; url: string }[] = [
      ...exteriorPhotos.map((url: string) => ({ type: 'Exterior', url })),
      ...interiorPhotos.map((url: string) => ({ type: 'Interior', url })),
      ...additionalPhotos.map((url: string) => ({ type: 'Additional', url })),
    ];

    for (let i = 0; i < Math.min(allPhotos.length, maxRows); i++) {
      const rowIndex = Math.floor(i / photosPerRow);
      const colIndex = i % photosPerRow;
      
      const col = 28 + (colIndex * 4);
      const row = 5 + (rowIndex * 8);

      try {
        // ✅ Use new token manager (no manual token needed)
        const downloadUrl = await getOneDriveDownloadUrl(allPhotos[i].url);
        const response = await fetch(downloadUrl);
        const imageBuffer = await response.arrayBuffer();

        const imageId = workbook.addImage({
          buffer: Buffer.from(imageBuffer) as any,
          extension: 'png', 
        });

        photoSheet.addImage(imageId, {
          tl: { col: col, row: row }, 
          ext: { width: imageWidth, height: imageHeight },
        });
        
        console.log(`✅ Photo ${i+1} embedded: ${imageBuffer.byteLength} bytes (${allPhotos[i].type})`);
      } catch (error) {
        console.error(`Failed to embed image at position ${i}:`, error);
      }
    }
    
    // Clear remaining cells
    for (let i = allPhotos.length; i < maxRows; i++) {
      const row = startingRow + i;
      photoSheet.getCell(`AB${row}`).value = '';
    }



    // 📊 Valuation Summary Sheet
    const valuationSummarySheet = workbook.getWorksheet('Valuation Summary');
    if (!valuationSummarySheet) {
      throw new Error('Valuation sheet not found in template');
    }

    // Generate and add map image for valuation summary (reuse lat/lng already extracted above)
    const mapImageBuffer1 = await generateCustomMapImage(fullAddressLabel, apiKey, fullAddressLabel, lat, lng);
    
    // ✅ Crop map image to fixed dimensions with black border
    const croppedMapBuffer1 = await cropImageToFit(mapImageBuffer1, locationMapImageWidth, locationMapImageHeight);
    
    const imageId1 = workbook.addImage({
      buffer: croppedMapBuffer1 as any,
      extension: 'png',
    });

    // Account for black border when placing image
    const borderWidth1 = 2;
    const finalMapWidth1 = locationMapImageWidth + (borderWidth1 * 2);
    const finalMapHeight1 = locationMapImageHeight + (borderWidth1 * 2);

    valuationSummarySheet.addImage(imageId1, {
      tl: { col: 29, row: 13 }, 
      ext: { width: finalMapWidth1, height: finalMapHeight1 },
    });

    console.log(`✅ Google Maps image embedded in Valuation Summary with fixed dimensions and black border: ${croppedMapBuffer1.length} bytes`);

    // ✨ Valuation Summary photos - FULL WIDTH 3x2 GRID with minimal gaps
    const maxRows1 = 31;
    const photosPerRow1 = 2; // 2 photos per row
    const targetImageWidth = 320;  // ✅ WIDER to fill to DH column
    const targetImageHeight = 220; // ✅ SLIGHTLY TALLER height
    const maxPhotosValuationSummary = 6; // ✅ LIMIT to only 6 photos (3 rows × 2 columns)

    const allPhotos1: { type: string; url: string }[] = [
      ...exteriorPhotos.map((url: string) => ({ type: 'Exterior', url })),
      ...interiorPhotos.map((url: string) => ({ type: 'Interior', url })),
      ...additionalPhotos.map((url: string) => ({ type: 'Additional', url })),
    ];

    // ✅ Function to crop/resize image to fit box perfectly
    async function cropImageToFit(imageBuffer: Buffer | ArrayBuffer, targetWidth: number, targetHeight: number): Promise<Buffer> {
      try {
        const image = sharp(Buffer.isBuffer(imageBuffer) ? imageBuffer : Buffer.from(imageBuffer));
        const metadata = await image.metadata();
        
        if (!metadata.width || !metadata.height) {
          // If we can't get metadata, return original
          return Buffer.isBuffer(imageBuffer) ? imageBuffer : Buffer.from(imageBuffer);
        }

        const originalWidth = metadata.width;
        const originalHeight = metadata.height;
        const targetRatio = targetWidth / targetHeight;
        const originalRatio = originalWidth / originalHeight;

        let resizeWidth: number;
        let resizeHeight: number;

        // ✅ Implement your logic: smaller dimension takes 100%, other gets cropped
        if (originalRatio > targetRatio) {
          // Image is wider - fit to height, crop width
          resizeHeight = targetHeight;
          resizeWidth = Math.round(targetHeight * originalRatio);
        } else {
          // Image is taller - fit to width, crop height  
          resizeWidth = targetWidth;
          resizeHeight = Math.round(targetWidth / originalRatio);
        }

        // Resize and crop from center, then add black border
        const croppedImage = await image
          .resize(resizeWidth, resizeHeight)
          .extract({
            left: Math.max(0, Math.round((resizeWidth - targetWidth) / 2)),
            top: Math.max(0, Math.round((resizeHeight - targetHeight) / 2)),
            width: targetWidth,
            height: targetHeight
          });

        // ✅ Add professional black border (2px on all sides)
        const borderWidth = 2;
        const processedImage = await croppedImage
          .extend({
            top: borderWidth,
            bottom: borderWidth,
            left: borderWidth,
            right: borderWidth,
            background: { r: 0, g: 0, b: 0, alpha: 1 } // Black border
          })
          .png()
          .toBuffer();

        console.log(`🖼️ Image processed: ${originalWidth}x${originalHeight} → ${targetWidth}x${targetHeight} + 2px black border`);
        return processedImage;
      } catch (error) {
        console.warn('Failed to crop image, using original:', error);
        return Buffer.isBuffer(imageBuffer) ? imageBuffer : Buffer.from(imageBuffer);
      }
    }

    // ✅ Render 6 photos in clean 3×2 grid
    console.log(`📊 Valuation Summary: Rendering ${Math.min(allPhotos1.length, maxPhotosValuationSummary)} out of ${allPhotos1.length} total photos in 3×2 grid`);
    
    for (let i = 0; i < Math.min(allPhotos1.length, maxPhotosValuationSummary); i++) {
      const rowIndex = Math.floor(i / photosPerRow1); // 0, 0, 1, 1, 2, 2
      const colIndex = i % photosPerRow1;             // 0, 1, 0, 1, 0, 1
      
      // ✅ LARGE PHOTOS: Tight 3×2 layout like reference image
      const startCol = 118;   // Starting column
      const startRow = 7;     // Starting row
      const colSpacing = 6;   // ✅ TIGHT spacing for large photos
      const rowSpacing = 9;   // ✅ TIGHT spacing for large photos
      
      const col = startCol + (colIndex * colSpacing);
      const row = startRow + (rowIndex * rowSpacing);

      console.log(`📍 Photo ${i+1}: Position (${col}, ${row}) - Row ${rowIndex+1}, Col ${colIndex+1}`);

      try {
        // ✅ Download and crop image
        const downloadUrl = await getOneDriveDownloadUrl(allPhotos1[i].url);
        const response = await fetch(downloadUrl);
        const imageBuffer = await response.arrayBuffer();

        // ✅ Crop image to fit perfectly in box
        const croppedImageBuffer = await cropImageToFit(imageBuffer, targetImageWidth, targetImageHeight);

        const imageId = workbook.addImage({
          buffer: croppedImageBuffer as any,
          extension: 'png', 
        });

        // ✅ Account for border when placing image (border adds 4px total to each dimension)
        const borderWidth = 2;
        const finalImageWidth = targetImageWidth + (borderWidth * 2);
        const finalImageHeight = targetImageHeight + (borderWidth * 2);
        
        valuationSummarySheet.addImage(imageId, {
          tl: { col: col, row: row }, 
          ext: { width: finalImageWidth, height: finalImageHeight },
        });
        
        console.log(`✅ Photo ${i+1} (${allPhotos1[i].type}) added to grid position ${rowIndex+1}×${colIndex+1} with black border`);
      } catch (error) {
        console.error(`Failed to embed valuation summary image at position ${i}:`, error);
      }
    }

    // Clear remaining cells in valuation summary (based on 6 photo limit)
    const photosRenderedInValuation = Math.min(allPhotos1.length, maxPhotosValuationSummary);
    for (let i = photosRenderedInValuation; i < maxRows1; i++) {
      const row = 4 + i; // Start from row 4
      valuationSummarySheet.getCell(`DO${row}`).value = '';
    }

    // 🏠 Granny Flat Photos Section positioned to the LEFT for better page fit in Valuation Summary (only if granny flat photos exist)
    if (grannyFlatPhotos && grannyFlatPhotos.length > 0) {
      console.log(`🏠 Adding Granny Flat section as NEXT PAGE (to the left for better fit) in Valuation Summary with ${grannyFlatPhotos.length} photos`);
      
      // Position the granny flat section as the NEXT PAGE horizontally (to the left for better page fit)
      // Photos section is around columns 118-130, so position Granny Flat to the left for better fit
      const grannyFlatStartCol = 131; // Position to the left of Photos page for better page fit
      const grannyFlatStartRow = 7; // Same row as Photos section (same vertical position)
      const grannyFlatPhotosPerRow = 2; // Same 3x2 grid layout as photos
      const maxGrannyFlatPhotos = 6; // Same limit as photos section
      
      // Add "Granny Flat" heading at the same row level as Photos heading
      const grannyFlatHeadingRow = 5; // Same row level as Photos heading
      valuationSummarySheet.getCell(grannyFlatHeadingRow, grannyFlatStartCol).value = 'Granny Flat';
      valuationSummarySheet.getCell(grannyFlatHeadingRow, grannyFlatStartCol).font = { 
        size: 14, 
        bold: true,
        name: 'Arial'
      };
      
      console.log(`🏷️ Added "Granny Flat" heading at row ${grannyFlatHeadingRow}, col ${grannyFlatStartCol} (to the left for better page fit)`);
      
      // Start photos grid at same row level as Photos section
      
      // Process granny flat photos with same 3x2 grid layout as main photos
      for (let i = 0; i < Math.min(grannyFlatPhotos.length, maxGrannyFlatPhotos); i++) {
        const rowIndex = Math.floor(i / grannyFlatPhotosPerRow); // 0, 0, 1, 1, 2, 2  
        const colIndex = i % grannyFlatPhotosPerRow;             // 0, 1, 0, 1, 0, 1
        
        // Same spacing as the main photos section
        const colSpacing = 6;   // Same as photos section
        const rowSpacing = 9;   // Same as photos section
        
        const col = grannyFlatStartCol + (colIndex * colSpacing);
        const row = grannyFlatStartRow + (rowIndex * rowSpacing);

        console.log(`📍 Granny Flat Photo ${i+1}: LEFT PAGE Position (${col}, ${row}) - Row ${rowIndex+1}, Col ${colIndex+1}`);

        try {
          // Download and crop granny flat image
          const downloadUrl = await getOneDriveDownloadUrl(grannyFlatPhotos[i]);
          const response = await fetch(downloadUrl);
          const imageBuffer = await response.arrayBuffer();

          // Crop image to fit perfectly in box (same as photos section)
          const croppedImageBuffer = await cropImageToFit(imageBuffer, targetImageWidth, targetImageHeight);

          const imageId = workbook.addImage({
            buffer: croppedImageBuffer as any,
            extension: 'png', 
          });

          // Account for border when placing image (same as photos section)
          const borderWidth = 2;
          const finalImageWidth = targetImageWidth + (borderWidth * 2);
          const finalImageHeight = targetImageHeight + (borderWidth * 2);
          
          valuationSummarySheet.addImage(imageId, {
            tl: { col: col, row: row }, 
            ext: { width: finalImageWidth, height: finalImageHeight },
          });
          
          console.log(`✅ Granny Flat Photo ${i+1} added to the LEFT of Photos at position ${rowIndex+1}×${colIndex+1} with black border`);
        } catch (error) {
          console.error(`Failed to embed granny flat image at position ${i}:`, error);
        }
      }
      
      console.log(`✅ Granny Flat section added to the LEFT for better page fit in Valuation Summary successfully with ${Math.min(grannyFlatPhotos.length, maxGrannyFlatPhotos)} photos`);
    } else {
      console.log(`📭 No granny flat photos found, skipping Granny Flat section in Valuation Summary`);
    }

    // 📋 Report Cover Sheet
    const reportOverviewSheet = workbook.getWorksheet('Report Cover');
    if (!reportOverviewSheet) {
      throw new Error('Report Cover sheet not found in template');
    }

    if (reportCoverPhoto && reportCoverPhoto.length > 0) {
      try {
        // ✅ Use new token manager to get downloadable URL
        const downloadUrl = await getOneDriveDownloadUrl(reportCoverPhoto[0]);
        const response = await fetch(downloadUrl);
        const imageBuffer = await response.arrayBuffer();

        // ✅ Crop report cover image to fixed dimensions with black border
        const croppedReportCoverBuffer = await cropImageToFit(imageBuffer, reportCoverImageWidth, reportCoverImageHeight);

        const reportCoverImageId = workbook.addImage({
          buffer: croppedReportCoverBuffer as any,
          extension: 'png', 
        });

        // Account for black border when placing image
        const borderWidth2 = 2;
        const finalReportCoverWidth = reportCoverImageWidth + (borderWidth2 * 2);
        const finalReportCoverHeight = reportCoverImageHeight + (borderWidth2 * 2);

        // Add image to Report Cover sheet
        reportOverviewSheet.addImage(reportCoverImageId, {
          tl: { col: 14, row: 7 }, 
          ext: { width: finalReportCoverWidth, height: finalReportCoverHeight },
        });

        console.log(`✅ Report cover image embedded in Report Cover sheet with fixed dimensions and black border: ${croppedReportCoverBuffer.length} bytes`);
      } catch (error) {
        console.error('Failed to embed report cover photo:', error);
        // Fallback to hyperlink if image embedding fails
        reportOverviewSheet.getCell('Q13').value = {
          text: "View Report Cover Photo", 
          hyperlink: reportCoverPhoto[0] || ''
        };
      }
    } else {
      // Clear the cell if no photo is available
      reportOverviewSheet.getCell('Q13').value = '';
    }

    // ✅ Save Excel file to temp directory first
    // ✅ Save Excel file to temp directory with proper handling
    const tempExcelPath = path.join(os.tmpdir(), `${id}-valuation-report-${Date.now()}.xlsx`);
    
    // Ensure the temp directory exists and is writable
    const tempDir = path.dirname(tempExcelPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Write the Excel file with proper error handling
    try {
      const buffer = await workbook.xlsx.writeBuffer() as any;

      // Save buffer to file
      fs.writeFileSync(tempExcelPath, buffer);
      
      // Wait a bit for file system to settle
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify the file was written correctly
      if (!fs.existsSync(tempExcelPath)) {
        throw new Error('Excel file was not created');
      }
      
      const excelStats = fs.statSync(tempExcelPath);
      console.log(`Excel file created: ${tempExcelPath}, size: ${excelStats.size} bytes`);
      
      if (excelStats.size === 0) {
        throw new Error('Generated Excel file is empty');
      }

      // Set file permissions to ensure Excel can access it
      try {
        fs.chmodSync(tempExcelPath, 0o666); // Read/write for all users
        console.log('File permissions set successfully');
      } catch (chmodError) {
        console.warn('Could not set file permissions (this is usually fine on Windows):', chmodError);
      }

    } catch (writeError) {
      console.error('Failed to write Excel file:', writeError);
      if (writeError instanceof Error) {
        throw new Error(`Failed to create Excel file: ${writeError.message}`);
      } else {
        throw new Error('Failed to create Excel file: Unknown error');
      }
    }

    const buffer = fs.readFileSync(tempExcelPath);
    const file = {
      buffer,
      originalname: `Valuation-Report-${id}.xlsx`,
    };

    // Upload Excel to OneDrive
    const oneDriveUrl = await uploadToOneDrive(file, id, 'Valuation-Report');
    const downloadBase64 = buffer.toString('base64');

    // PDF generation is now handled by the backend using Playwright
    // The backend endpoint /api/valuation-reports/{reportId}/generate handles PDF creation
    console.log('Excel report generated successfully. PDF generation handled by backend.');
    const pdfUrl = '';
    const pdfGenerated = false;

    // ✅ Clean up temporary Excel file
    try {
      if (fs.existsSync(tempExcelPath)) {
        fs.unlinkSync(tempExcelPath);
        console.log('Temporary Excel file cleaned up');
      }
    } catch (cleanupError) {
      console.warn('Failed to cleanup temp Excel file:', cleanupError);
    }

    // ✅ Return response with PDF status
    return NextResponse.json({
      success: true,
      reportUrl: oneDriveUrl,
      pdfUrl: pdfUrl, // Will be empty string if PDF generation failed
      download: downloadBase64,
      filename: `Valuation-Report-${id}.xlsx`,
      pdfGenerated: pdfGenerated, // ✅ Indicate if PDF was generated
      generationMethod: 'Backend Playwright', // ✅ For debugging
      message: 'Excel report generated successfully. PDF generation handled by backend Playwright system.'
    });

  } catch (err: any) {
    console.error('Excel Report Error:', err);
    
    // ✅ Enhanced error handling for different error types
    if (err.message.includes('token') || err.message.includes('401') || err.message.includes('Authentication')) {
      return NextResponse.json({ 
        error: 'Authentication failed. Please check OneDrive configuration.', 
        message: err.message,
        suggestion: 'Try running the setup script again or check your environment variables.'
      }, { status: 401 });
    }
    
    if (err.message.includes('Template') || err.message.includes('sheet not found')) {
      return NextResponse.json({ 
        error: 'Template file error', 
        message: err.message,
        suggestion: 'Ensure the Excel template file exists and has the required sheets.'
      }, { status: 400 });
    }
    
    if (err.message.includes('Property not found')) {
      return NextResponse.json({ 
        error: 'Property not found', 
        message: err.message 
      }, { status: 404 });
    }

    // Error handling for Excel generation
    
    return NextResponse.json({ 
      error: 'Failed to generate report', 
      message: err.message 
    }, { status: 500 });
  }
}