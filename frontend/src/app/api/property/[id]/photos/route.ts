import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/config/db';
import PropertyValuation from '@/models/PropertyValuation';

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    console.log('🔌 Database connected successfully');
  } catch (dbError) {
    console.error('❌ Database connection failed:', dbError);
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }
  
  const { id } = await context.params;
  
  try {
    const body = await req.json();
    const { photoType, photoUrl } = body;
    
    if (!photoType || !photoUrl) {
      return NextResponse.json({ error: 'Photo type and URL are required' }, { status: 400 });
    }
    
    // Valid photo types
    const validPhotoTypes = ['exteriorPhotos', 'interiorPhotos', 'additionalPhotos', 'reportCoverPhoto', 'grannyFlatPhotos'];
    if (!validPhotoTypes.includes(photoType)) {
      return NextResponse.json({ error: 'Invalid photo type' }, { status: 400 });
    }
    
    // Find the property
    const property = await PropertyValuation.findById(id);
    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }
    
    // Check if the photo exists in the specified type
    const photos = property.photos || {};
    const photoArray = photos[photoType] || [];
    
    console.log(`🔍 Searching for photo in ${photoType}:`, photoUrl);
    console.log(`🔍 Current ${photoType} array:`, photoArray);
    console.log(`🔍 Photo exists in array:`, photoArray.includes(photoUrl));
    
    if (!photoArray.includes(photoUrl)) {
      return NextResponse.json({ error: 'Photo not found in property' }, { status: 404 });
    }
    
    // Remove the photo URL from the array
    const updatedPhotoArray = photoArray.filter((url: string) => url !== photoUrl);
    
    console.log(`🗑️ Updated ${photoType} array after removal:`, updatedPhotoArray);
    console.log(`📊 Before: ${photoArray.length} photos, After: ${updatedPhotoArray.length} photos`);
    
    // Update the property with the new photo array
    const updatedPhotos = {
      ...photos,
      [photoType]: updatedPhotoArray
    };
    
    // First, get the current property to ensure we have the latest data
    const currentProperty = await PropertyValuation.findById(id);
    if (!currentProperty) {
      return NextResponse.json({ error: 'Property not found during update' }, { status: 404 });
    }
    
    // Update the specific photo array
    currentProperty.photos = currentProperty.photos || {};
    currentProperty.photos[photoType] = updatedPhotoArray;
    
    // Mark the photos field as modified to ensure Mongoose saves it
    currentProperty.markModified('photos');
    
    // Save the changes with error handling
    let result;
    try {
      result = await currentProperty.save();
      console.log('💾 Save operation completed successfully');
    } catch (saveError) {
      console.error('❌ Error during save operation:', saveError);
      throw saveError;
    }
    
    console.log(`💾 Database update result:`, result?.photos?.[photoType]?.length);
    console.log(`💾 Full updated photos in DB:`, result?.photos);
    
    // Double-check by re-fetching from database
    const verification = await PropertyValuation.findById(id).lean();
    console.log(`🔍 Verification - Photos in DB after save:`, verification && typeof verification === 'object' && !Array.isArray(verification) ? verification?.photos?.[photoType]?.length : 'N/A');
    console.log(`🔍 Verification - Full photo data:`, verification && typeof verification === 'object' && !Array.isArray(verification) ? verification?.photos?.[photoType] : 'N/A');
    
    console.log(`✅ Photo deleted successfully from ${photoType}: ${photoUrl}`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Photo deleted successfully',
      remainingPhotos: updatedPhotoArray.length
    });
    
  } catch (error: any) {
    console.error('Error deleting photo:', error);
    return NextResponse.json({ 
      error: 'Failed to delete photo', 
      message: error.message 
    }, { status: 500 });
  }
}