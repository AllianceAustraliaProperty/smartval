"""
ValuationReport document model
"""
from pymongo import MongoClient
from datetime import datetime
from typing import Dict, Any, Optional, List
from bson import ObjectId


class ValuationReport:
    """ValuationReport document model - now includes property data directly"""
    
    def __init__(self, db_connection):
        self.db = db_connection
        self.collection = self.db.valuationReports
    
    def create(self, data: Dict[str, Any]) -> str:
        """Create a new valuation report with property data included"""
        data['createdAt'] = datetime.utcnow()
        data['updatedAt'] = datetime.utcnow()
        
        result = self.collection.insert_one(data)
        return str(result.inserted_id)
    
    def get_by_id(self, report_id: str) -> Optional[Dict[str, Any]]:
        """Get valuation report by ID"""
        try:
            return self.collection.find_one({'_id': ObjectId(report_id)})
        except:
            return None
    
    def get_by_address(self, address: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get all valuation reports for a specific address"""
        try:
            # Build query based on address fields
            query = {'isDeleted': {'$ne': True}}
            if 'streetName' in address:
                query['address.streetName'] = address['streetName']
            if 'suburb' in address:
                query['address.suburb'] = address['suburb']
            if 'postcode' in address:
                query['address.postcode'] = address['postcode']
            
            reports = list(self.collection.find(query).sort('updatedAt', -1))
            # Convert ObjectId to string for JSON serialization
            for report in reports:
                if '_id' in report:
                    report['_id'] = str(report['_id'])
                    report['id'] = report['_id']
            return reports
        except:
            return []
    
    def get_all(self, projection: Dict[str, int] = None, skip: int = 0, limit: int = 0, search: str = None) -> tuple[List[Dict[str, Any]], int]:
        """Get all active valuation reports with optional pagination and search"""
        query = {'isDeleted': {'$ne': True}}
        
        if search:
            regex = {'$regex': search, '$options': 'i'}
            query['$or'] = [
                {'address.fullAddress': regex},
                {'fileNumber': regex},
                {'rpDataId': regex},
                {'propertyDetails.propertyType': regex},
                {'address.streetName': regex},
                {'address.suburb': regex},
                {'address.postcode': regex}
            ]

        cursor = self.collection.find(query, projection).sort('updatedAt', -1)
        total_count = self.collection.count_documents(query)
        
        if skip:
            cursor = cursor.skip(skip)
        if limit:
            cursor = cursor.limit(limit)

        reports = list(cursor)
        # Convert ObjectId to string for JSON serialization
        for report in reports:
            if '_id' in report:
                report['_id'] = str(report['_id'])
                report['id'] = report['_id']
        return reports, total_count
        
    def get_trashed(self, projection: Dict[str, int] = None) -> List[Dict[str, Any]]:
        """Get all trashed valuation reports"""
        query = {'isDeleted': True}
        cursor = self.collection.find(query, projection).sort('deletedAt', -1)
        reports = list(cursor)
        # Convert ObjectId to string for JSON serialization
        for report in reports:
            if '_id' in report:
                report['_id'] = str(report['_id'])
                report['id'] = report['_id']
        return reports
    
    def update(self, report_id: str, data: Dict[str, Any]) -> bool:
        """Update valuation report"""
        try:
            data['updatedAt'] = datetime.utcnow()
            # Remove fields that shouldn't be updated
            data.pop('_id', None)
            data.pop('createdAt', None)
            data.pop('isDeleted', None)
            data.pop('deletedAt', None)
            
            result = self.collection.update_one(
                {'_id': ObjectId(report_id)},
                {'$set': data}
            )
            return result.modified_count > 0 or result.matched_count > 0
        except Exception as e:
            print(f"Error updating valuation report {report_id}: {str(e)}")
            raise e  # Re-raise the exception so we can see it
    
    def add_photo(self, report_id: str, photo_obj: Dict[str, Any]) -> bool:
        """Atomically add a photo to the photos array"""
        try:
            result = self.collection.update_one(
                {'_id': ObjectId(report_id)},
                {
                    '$push': {'photos': photo_obj},
                    '$set': {'updatedAt': datetime.utcnow()}
                }
            )
            return result.modified_count > 0 or result.matched_count > 0
        except Exception as e:
            print(f"Error adding photo to valuation report {report_id}: {str(e)}")
            raise e
    
    def add_additional_photo(self, report_id: str, photo_obj: Dict[str, Any]) -> bool:
        """Atomically add a photo to the additionalPhotos array"""
        try:
            result = self.collection.update_one(
                {'_id': ObjectId(report_id)},
                {
                    '$push': {'additionalPhotos': photo_obj},
                    '$set': {'updatedAt': datetime.utcnow()}
                }
            )
            return result.modified_count > 0 or result.matched_count > 0
        except Exception as e:
            print(f"Error adding additional photo to valuation report {report_id}: {str(e)}")
            raise e
    
    def add_floor_plan(self, report_id: str, photo_obj: Dict[str, Any]) -> bool:
        """Atomically add a photo to the floorPlans array"""
        try:
            result = self.collection.update_one(
                {'_id': ObjectId(report_id)},
                {
                    '$push': {'floorPlans': photo_obj},
                    '$set': {'updatedAt': datetime.utcnow()}
                }
            )
            return result.modified_count > 0 or result.matched_count > 0
        except Exception as e:
            print(f"Error adding floor plan to valuation report {report_id}: {str(e)}")
            raise e
    
    def add_title_search(self, report_id: str, photo_obj: Dict[str, Any]) -> bool:
        """Atomically add a photo to the titleSearch array"""
        try:
            result = self.collection.update_one(
                {'_id': ObjectId(report_id)},
                {
                    '$push': {'titleSearch': photo_obj},
                    '$set': {'updatedAt': datetime.utcnow()}
                }
            )
            return result.modified_count > 0 or result.matched_count > 0
        except Exception as e:
            print(f"Error adding title search for valuation report {report_id}: {str(e)}")
            raise e

    def remove_title_search(self, report_id: str, photo_url: str) -> bool:
        """Atomically remove a photo from the titleSearch array"""
        try:
            result = self.collection.update_one(
                {'_id': ObjectId(report_id)},
                {
                    '$pull': {'titleSearch': {'photoUrl': photo_url}},
                    '$set': {'updatedAt': datetime.utcnow()}
                }
            )
            return result.modified_count > 0 or result.matched_count > 0
        except Exception as e:
            print(f"Error removing title search from valuation report {report_id}: {str(e)}")
            raise e
    
    def delete(self, report_id: str) -> bool:
        """Soft delete valuation report"""
        try:
            result = self.collection.update_one(
                {'_id': ObjectId(report_id)},
                {'$set': {'isDeleted': True, 'deletedAt': datetime.utcnow()}}
            )
            return result.modified_count > 0 or result.matched_count > 0
        except:
            return False
            
    def restore(self, report_id: str) -> bool:
        """Restore soft-deleted valuation report"""
        try:
            result = self.collection.update_one(
                {'_id': ObjectId(report_id)},
                {
                    '$unset': {'isDeleted': "", 'deletedAt': ""},
                    '$set': {'updatedAt': datetime.utcnow()}
                }
            )
            return result.modified_count > 0 or result.matched_count > 0
        except:
            return False
            
    def hard_delete(self, report_id: str) -> bool:
        """Permanently delete valuation report"""
        try:
            result = self.collection.delete_one({'_id': ObjectId(report_id)})
            return result.deleted_count > 0
        except:
            return False
    
    def serialize(self, document: Dict[str, Any]) -> Dict[str, Any]:
        """Serialize MongoDB document to JSON-friendly format"""
        if document:
            if '_id' in document:
                document['_id'] = str(document['_id'])
                document['id'] = document['_id']
        return document