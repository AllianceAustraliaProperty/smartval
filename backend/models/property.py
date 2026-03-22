"""
Property document model
"""
from pymongo import MongoClient
from datetime import datetime
from typing import Dict, Any, Optional, List
from bson import ObjectId


class Property:
    """Property document model"""
    
    def __init__(self, db_connection: MongoClient):
        self.db = db_connection
        self.collection = self.db.properties
    
    def create(self, data: Dict[str, Any]) -> str:
        """Create a new property"""
        data['createdAt'] = datetime.utcnow()
        data['updatedAt'] = datetime.utcnow()
        
        # Initialize owners as empty array if not provided
        if 'owners' not in data:
            data['owners'] = []
            
        result = self.collection.insert_one(data)
        return str(result.inserted_id)
    
    def get_by_id(self, property_id: str) -> Optional[Dict[str, Any]]:
        """Get property by ID"""
        try:
            return self.collection.find_one({'_id': ObjectId(property_id)})
        except:
            return None
    
    def get_all(self) -> List[Dict[str, Any]]:
        """Get all properties"""
        properties = list(self.collection.find().sort('updatedAt', -1))
        # Convert ObjectId to string for JSON serialization
        for prop in properties:
            if '_id' in prop:
                prop['_id'] = str(prop['_id'])
        return properties
    
    def update(self, property_id: str, data: Dict[str, Any]) -> bool:
        """Update property"""
        try:
            data['updatedAt'] = datetime.utcnow()
            # Remove _id if present to avoid update error
            data.pop('_id', None)
            
            result = self.collection.update_one(
                {'_id': ObjectId(property_id)},
                {'$set': data}
            )
            return result.modified_count > 0 or result.matched_count > 0
        except:
            return False
    
    def delete(self, property_id: str) -> bool:
        """Delete property"""
        try:
            result = self.collection.delete_one({'_id': ObjectId(property_id)})
            return result.deleted_count > 0
        except:
            return False
    
    def serialize(self, document: Dict[str, Any]) -> Dict[str, Any]:
        """Serialize MongoDB document to JSON-friendly format"""
        if document and '_id' in document:
            document['_id'] = str(document['_id'])
            document['id'] = document['_id']
        return document
