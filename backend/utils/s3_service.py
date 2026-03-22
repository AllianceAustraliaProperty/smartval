"""
S3 service for handling file uploads and presigned URLs
"""
import boto3
import uuid
from botocore.exceptions import ClientError, NoCredentialsError
from flask import current_app
from config import Config

class S3Service:
    def __init__(self):
        self.s3_client = None
        self.bucket_name = Config.S3_BUCKET_NAME
        self.region = Config.AWS_REGION
        
    def _get_s3_client(self):
        """Get S3 client with credentials"""
        if self.s3_client is None:
            try:
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=Config.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=Config.AWS_SECRET_ACCESS_KEY,
                    region_name=self.region
                )
            except NoCredentialsError:
                current_app.logger.error("AWS credentials not found")
                raise Exception("AWS credentials not configured")
        return self.s3_client
    
    def generate_presigned_url(self, file_extension, report_id, content_type=None):
        """
        Generate a presigned URL for uploading a file to S3
        
        Args:
            file_extension (str): File extension (e.g., 'jpg', 'png')
            report_id (str): Report ID for organizing files
            content_type (str): MIME type of the file
            
        Returns:
            dict: Contains presigned URL, file key, and S3 URL
        """
        try:
            s3_client = self._get_s3_client()
            
            # Generate unique filename
            unique_filename = f"{uuid.uuid4()}.{file_extension}"
            file_key = f"photos/{report_id}/{unique_filename}"
            
            # Set default content type if not provided
            if not content_type:
                content_type = self._get_content_type(file_extension)
            
            # Generate presigned URL for PUT operation
            presigned_url = s3_client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': file_key,
                    'ContentType': content_type
                },
                ExpiresIn=3600  # 1 hour expiration
            )
            
            # Generate the final S3 URL for the file
            s3_url = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{file_key}"
            
            return {
                'presigned_url': presigned_url,
                'file_key': file_key,
                's3_url': s3_url,
                'bucket': self.bucket_name,
                'region': self.region
            }
            
        except ClientError as e:
            current_app.logger.error(f"S3 ClientError: {str(e)}")
            raise Exception(f"Failed to generate presigned URL: {str(e)}")
        except Exception as e:
            current_app.logger.error(f"S3 Error: {str(e)}")
            raise Exception(f"Failed to generate presigned URL: {str(e)}")
    
    def _get_content_type(self, file_extension):
        """Get MIME type based on file extension"""
        content_types = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'bmp': 'image/bmp',
            'tiff': 'image/tiff'
        }
        return content_types.get(file_extension.lower(), 'application/octet-stream')
    
    def delete_file(self, file_key):
        """
        Delete a file from S3
        
        Args:
            file_key (str): S3 object key
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            s3_client = self._get_s3_client()
            s3_client.delete_object(Bucket=self.bucket_name, Key=file_key)
            return True
        except ClientError as e:
            current_app.logger.error(f"Failed to delete S3 object {file_key}: {str(e)}")
            return False
        except Exception as e:
            current_app.logger.error(f"Error deleting S3 object {file_key}: {str(e)}")
            return False

# Global instance
s3_service = S3Service()
