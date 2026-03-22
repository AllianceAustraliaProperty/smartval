#!/usr/bin/env python3
"""
Simple test script to verify S3 configuration and connectivity
Run this to test if S3 credentials and bucket access work
"""

import os
import sys
from dotenv import load_dotenv

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
load_dotenv()

from utils.s3_service import s3_service

def test_s3_connection():
    """Test S3 connection and bucket access"""
    try:
        print("Testing S3 connection...")
        
        # Test getting S3 client
        s3_client = s3_service._get_s3_client()
        print("✓ S3 client created successfully")
        
        # Test bucket access
        bucket_name = s3_service.bucket_name
        print(f"Testing bucket access: {bucket_name}")
        
        # Try to list objects (this will fail if bucket doesn't exist or no access)
        response = s3_client.list_objects_v2(Bucket=bucket_name, MaxKeys=1)
        print("✓ Bucket access confirmed")
        
        # Test generating a presigned URL
        print("Testing presigned URL generation...")
        presigned_data = s3_service.generate_presigned_url(
            file_extension='jpg',
            report_id='test-report',
            content_type='image/jpeg'
        )
        
        print("✓ Presigned URL generated successfully")
        print(f"  File key: {presigned_data['file_key']}")
        print(f"  S3 URL: {presigned_data['s3_url']}")
        print(f"  Bucket: {presigned_data['bucket']}")
        print(f"  Region: {presigned_data['region']}")
        
        print("\n🎉 All S3 tests passed! The configuration is working correctly.")
        return True
        
    except Exception as e:
        print(f"❌ S3 test failed: {str(e)}")
        print("\nTroubleshooting:")
        print("1. Check that AWS credentials are set correctly")
        print("2. Verify the bucket name exists and you have access")
        print("3. Ensure the AWS region is correct")
        return False

if __name__ == "__main__":
    print("S3 Configuration Test")
    print("=" * 50)
    
    # Check environment variables
    print("Environment variables:")
    print(f"  AWS_ACCESS_KEY_ID: {'✓ Set' if os.getenv('AWS_ACCESS_KEY_ID') else '❌ Not set'}")
    print(f"  AWS_SECRET_ACCESS_KEY: {'✓ Set' if os.getenv('AWS_SECRET_ACCESS_KEY') else '❌ Not set'}")
    print(f"  AWS_REGION: {os.getenv('AWS_REGION', 'Not set')}")
    print(f"  S3_BUCKET_NAME: {os.getenv('S3_BUCKET_NAME', 'Not set')}")
    print()
    
    success = test_s3_connection()
    sys.exit(0 if success else 1)
