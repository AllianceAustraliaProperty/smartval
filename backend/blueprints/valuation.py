"""
Valuation blueprint for valuation report endpoints
"""
from flask import Blueprint, jsonify, request
from database import get_database, get_valuation_reports_collection
from models.valuation_report import ValuationReport, Location

valuation_bp = Blueprint('valuation', __name__)

valuation_model = ValuationReport(get_database())


@valuation_bp.route('/reports', methods=['GET'])
def get_valuation_reports():
    """Get all valuation reports"""
    reports = valuation_model.get_all()
    return jsonify({'reports': reports, 'count': len(reports)})


@valuation_bp.route('/reports', methods=['POST'])
def create_valuation_report():
    """Create a new valuation report"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Create location object if location data is provided
    if 'location' in data:
        location_data = data['location']
        location = Location(
            street_address=location_data.get('streetAddress', ''),
            street_name=location_data.get('streetName', ''),
            city=location_data.get('city', ''),
            state=location_data.get('state', ''),
            state_abbr=location_data.get('stateAbbr', ''),
            postcode=location_data.get('postcode', '')
        )
        data['location'] = location.to_dict()
    
    report_id = valuation_model.create(data)
    
    return jsonify({
        'message': 'Valuation report created successfully',
        'report_id': report_id
    }), 201


@valuation_bp.route('/reports/<report_id>', methods=['GET'])
def get_valuation_report(report_id):
    """Get valuation report by ID"""
    report = valuation_model.get_by_id(report_id)
    
    if not report:
        return jsonify({'error': 'Report not found'}), 404
    
    return jsonify({'report': report})


@valuation_bp.route('/reports/<report_id>', methods=['PUT'])
def update_valuation_report(report_id):
    """Update valuation report"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Update location if provided
    if 'location' in data:
        location_data = data['location']
        location = Location(
            street_address=location_data.get('streetAddress', ''),
            street_name=location_data.get('streetName', ''),
            city=location_data.get('city', ''),
            state=location_data.get('state', ''),
            state_abbr=location_data.get('stateAbbr', ''),
            postcode=location_data.get('postcode', '')
        )
        data['location'] = location.to_dict()
    
    success = valuation_model.update(report_id, data)
    
    if not success:
        return jsonify({'error': 'Report not found'}), 404
    
    return jsonify({'message': 'Report updated successfully'})


@valuation_bp.route('/reports/<report_id>', methods=['DELETE'])
def delete_valuation_report(report_id):
    """Delete valuation report"""
    success = valuation_model.delete(report_id)
    
    if not success:
        return jsonify({'error': 'Report not found'}), 404
    
    return jsonify({'message': 'Report deleted successfully'})
