"""
Alliance service for fetching reports from Alliance website
"""
import requests
from typing import Dict, List, Any, Optional
from config import Config
import logging

logger = logging.getLogger(__name__)


class AllianceService:
    """Service for interacting with Alliance website API"""
    
    def __init__(self):
        self.base_url = Config.ALLIANCE_BASE_URL
        self.jobs_endpoint = f"{self.base_url}/api/jobs.php"
    
    def fetch_jobs(self, page: int = 1, per_page: int = 10) -> Dict[str, Any]:
        """
        Fetch jobs from Alliance API
        
        Args:
            page: Page number for pagination
            per_page: Number of items per page
            
        Returns:
            Dict containing jobs data and pagination info
        """
        try:
            params = {
                'page': page,
                'per_page': per_page
            }
            
            response = requests.get(self.jobs_endpoint, params=params, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"Successfully fetched {len(data.get('data', []))} jobs from Alliance")
            
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching jobs from Alliance: {str(e)}")
            raise Exception(f"Failed to fetch jobs from Alliance: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error fetching jobs from Alliance: {str(e)}")
            raise Exception(f"Unexpected error fetching jobs from Alliance: {str(e)}")
    
    def get_job_by_id(self, job_id: int) -> Optional[Dict[str, Any]]:
        """
        Get a specific job by ID
        
        Args:
            job_id: The job ID to fetch
            
        Returns:
            Job data or None if not found
        """
        try:
            # First get all jobs and find the specific one
            # Note: If Alliance API supports direct job fetch, we can optimize this
            jobs_data = self.fetch_jobs(page=1, per_page=100)  # Get more jobs to find the specific one
            
            for job in jobs_data.get('data', []):
                if job.get('id') == job_id:
                    return job
            
            logger.warning(f"Job with ID {job_id} not found")
            return None
            
        except Exception as e:
            logger.error(f"Error fetching job {job_id} from Alliance: {str(e)}")
            return None
    
    def transform_job_to_valuation_report(self, job: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform Alliance job data to our valuation report format
        
        Args:
            job: Alliance job data
            
        Returns:
            Transformed data in our valuation report format
        """
        try:
            # Parse property address
            property_address = job.get('property_address', '')
            address_lines = property_address.split('\r\n') if property_address else []
            
            # Basic address parsing (you may need to enhance this based on actual data)
            street_address = address_lines[0] if address_lines else ''
            suburb_state_postcode = address_lines[1] if len(address_lines) > 1 else ''
            
            # Try to extract suburb, state, postcode from the second line
            suburb = ''
            state = ''
            postcode = ''
            
            if suburb_state_postcode:
                parts = suburb_state_postcode.split()
                if len(parts) >= 3:
                    # Assume format: "Suburb State Postcode"
                    suburb = ' '.join(parts[:-2])
                    state = parts[-2]
                    postcode = parts[-1]
            
            # Transform photos from string to array
            photos_str = job.get('photos', '[]')
            try:
                import json
                photos = json.loads(photos_str) if photos_str else []
            except:
                photos = []
            
            # Parse property type from Alliance format
            property_type = job.get('property_type', '').strip()
            
            # Map Alliance fields to our valuation report structure
            transformed_data = {
                'allianceId': str(job.get('id')),
                'fileNumber': job.get('file_number', ''),
                'rpDataId': '',  # Will be filled later if available
                'address': {
                    'fullAddress': property_address,
                    'streetName': street_address,
                    'streetNameOnly': street_address.split()[0] if street_address else '',
                    'suburb': suburb,
                    'state': state if state in ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'] else 'NSW',
                    'postcode': postcode,
                    'unitNumber': ''
                },
                'primaryContact': {
                    'firstName': job.get('first_name', ''),
                    'lastName': job.get('last_name', ''),
                    'phone': job.get('contact_number', ''),
                    'phone2': '',
                    'email': job.get('email_address', ''),
                    'email2': '',
                    'owners': []
                },
                'valuationDetails': {
                    'valuationType': job.get('valuation_type', ''),
                    'valuationDate': job.get('valuation_date_1', ''),
                    'valuationDate2': job.get('valuation_date_2', ''),
                    'inspectionDate': '',
                    'currentDayValuation': False,
                    'externalDesktopValuation': job.get('survey_type') != 'Inspection',
                    'marketValue': None,
                    'interestValued': '',
                    'showCurrencyOfValuation': False,
                    'showLandValue': False,
                    'landValue': None,
                    'showImprovements': False,
                    'improvements': None,
                    'directComparison': '',
                    'purposeOfReport': '',
                    'conversionDate': job.get('conversion_date', ''),
                    'deadlineDate': job.get('deadline_date', ''),
                    'surveyType': job.get('survey_type', ''),
                    'requestedValuationTarget': job.get('requested_valuation_target', ''),
                    'valuationNotes': job.get('valuation_notes', ''),
                    'stage': job.get('stage', '')
                },
                'propertyDetails': {
                    'propertyType': property_type,
                    'titleReference': '',
                    'zoning': '',
                    'siteArea': None,
                    'buildingArea': None,
                    'landShape': '',
                    'councilArea': '',
                    'permissibleUses': '',
                    'heritageIssue': '',
                    'buildYear': None,
                    'accommodation': '',
                    'livingArea': None,
                    'externalArea': None,
                    'parkingArea': None,
                    'otherArea': None,
                    'studyRoom': bool(job.get('study_room', '0') == '1')
                },
                'propertyDescriptors': {
                    'bedrooms': job.get('bedrooms'),
                    'bathrooms': job.get('bathrooms'),
                    'carSpaces': job.get('garage'),
                    'mainBuildingType': '',
                    'externalWalls': '',
                    'internalWalls': '',
                    'roofingType': '',
                    'parkingType': '',
                    'internalCondition': None,
                    'externalCondition': None,
                    'repairsRequirements': '',
                    'defects': ''
                },
                'locationDetails': {
                    'suburbDescription': '',
                    'includesGas': False,
                    'map': {
                        'photo': '',
                        'source': ''
                    },
                    'latitude': '',
                    'longitude': '',
                    'situatedStreet': '',
                    'nearestTransportation': None,
                    'nearestShop': None,
                    'nearestPrimarySchool': None,
                    'nearestSecondarySchool': None,
                    'nearestCBD': None,
                    'nearestConnectingStreet': None
                },
                'ancillaryImprovements': {
                    'showSection': False,
                    'driveway': '',
                    'fencing': '',
                    'otherItems': []
                },
                'generalComments': {
                    'propertyDescription': '',
                    'marketOverview': '',
                    'propertyComments': ''
                },
                'referralDetails': {
                    'referrerName': job.get('referral_name', ''),
                    'referralFee': float(job.get('referral_price', 0)) if job.get('referral_price') else None,
                    'invoiceStatus': job.get('invoice_status', '')
                },
                'photos': [
                    {
                        'photoUrl': photo,
                        'isCover': False,
                        'isGallery': True,
                        'isAnnexure': False,
                        'annexureHeader': '',
                        'featuresFixtures': [],
                        'primeCostItems': [],
                        'internalCondition': '',
                        'externalCondition': '',
                        'externalWallsType': '',
                        'internalWallsType': '',
                        'flooring': '',
                        'category': ''
                    }
                    for photo in photos
                ],
                'comparables': {
                    'sales': [],
                    'rentals': []
                }
            }
            
            return transformed_data
            
        except Exception as e:
            logger.error(f"Error transforming Alliance job {job.get('id', 'unknown')}: {str(e)}")
            raise Exception(f"Failed to transform Alliance job data: {str(e)}")
    
    def get_all_jobs(self, max_pages: int = 10) -> List[Dict[str, Any]]:
        """
        Get all jobs from Alliance (with pagination)
        
        Args:
            max_pages: Maximum number of pages to fetch
            
        Returns:
            List of all jobs
        """
        all_jobs = []
        page = 1
        
        try:
            while page <= max_pages:
                jobs_data = self.fetch_jobs(page=page, per_page=50)
                jobs = jobs_data.get('data', [])
                
                if not jobs:
                    break
                
                all_jobs.extend(jobs)
                
                # Check if we've reached the last page
                total_pages = jobs_data.get('total_pages', 1)
                if page >= total_pages:
                    break
                
                page += 1
            
            logger.info(f"Successfully fetched {len(all_jobs)} total jobs from Alliance")
            return all_jobs
            
        except Exception as e:
            logger.error(f"Error fetching all jobs from Alliance: {str(e)}")
            raise Exception(f"Failed to fetch all jobs from Alliance: {str(e)}")
