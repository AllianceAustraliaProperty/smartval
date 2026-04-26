"""
Properties blueprint - now works with valuation reports directly
"""
from flask import Blueprint, jsonify, request
# CORS is handled globally in app.py
from database import get_database
from models.valuation_report import ValuationReport

properties_bp = Blueprint('properties', __name__)

valuation_report_model = ValuationReport(get_database())


@properties_bp.route('/', methods=['GET'])
def get_properties():
    """Get all valuation reports (now serving as properties)"""
    try:
        reports = valuation_report_model.get_all()
        
        # Transform reports to property-like format for frontend compatibility
        properties = []
        for report in reports:
            # Group reports by address to show unique properties
            address_key = f"{report.get('address', {}).get('streetName', '')}_{report.get('address', {}).get('suburb', '')}_{report.get('address', {}).get('postcode', '')}"
            
            # Check if we already have this property
            existing_prop = next((p for p in properties if p.get('addressKey') == address_key), None)
            
            if existing_prop:
                existing_prop['valuationReportsCount'] += 1
            else:
                # Create new property entry
                prop = {
                    'id': report.get('id'),
                    'address': report.get('address', {}),
                    'rpDataId': report.get('rpDataId'),
                    'primaryContact': report.get('primaryContact'),
                    'owners': report.get('owners', []),
                    'createdAt': report.get('createdAt'),
                    'updatedAt': report.get('updatedAt'),
                    'addressKey': address_key,
                    'valuationReportsCount': 1
                }
                properties.append(prop)
        
        return jsonify({
            'properties': properties,
            'count': len(properties)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@properties_bp.route('/', methods=['POST'])
def create_property():
    """Create a new valuation report (now serving as property)"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        if 'address' not in data:
            return jsonify({'error': 'Address is required'}), 400
        
        address = data['address']
        required_fields = ['streetName', 'streetNameOnly', 'suburb', 'state', 'postcode']
        for field in required_fields:
            if field not in address:
                return jsonify({'error': f'Address.{field} is required'}), 400
        
        report_id = valuation_report_model.create(data)
        
        return jsonify({
            'message': 'Property created successfully',
            'propertyId': report_id
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@properties_bp.route('/<property_id>', methods=['GET'])
def get_property(property_id):
    """Get valuation report by ID (now serving as property)"""
    try:
        report = valuation_report_model.get_by_id(property_id)
        
        if not report:
            return jsonify({'error': 'Property not found'}), 404
        
        # Serialize report
        report = valuation_report_model.serialize(report)
        
        # Get all reports for the same address
        address = report.get('address', {})
        all_reports = valuation_report_model.get_by_address(address)
        
        return jsonify({
            'property': report,
            'valuationReports': all_reports,
            'valuationReportsCount': len(all_reports)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@properties_bp.route('/<property_id>', methods=['PUT'])
def update_property(property_id):
    """Update valuation report (now serving as property)"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        success = valuation_report_model.update(property_id, data)
        
        if not success:
            return jsonify({'error': 'Property not found'}), 404
        
        return jsonify({'message': 'Property updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@properties_bp.route('/<property_id>', methods=['DELETE'])
def delete_property(property_id):
    """Delete valuation report (now serving as property)"""
    try:
        success = valuation_report_model.delete(property_id)
        
        if not success:
            return jsonify({'error': 'Property not found'}), 404
        
        return jsonify({'message': 'Property deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
