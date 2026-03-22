"""
RPData blueprint for handling RP Data API requests
"""
from flask import Blueprint, jsonify, request
from utils.rpdata_service import RpDataAPI
import logging

# Create blueprint
rpdata_bp = Blueprint('rpdata', __name__)

# Initialize RP Data API service
rpdata_api = RpDataAPI()

# Set up logging
logger = logging.getLogger(__name__)


@rpdata_bp.route('/api/rpdata/sales-comparables', methods=['POST'])
def get_sales_comparables():
    """
    Get sales comparables from RP Data API
    
    Expected POST data structure:
    {
        "type": "house,unit,flats",
        "radius": "2",
        "addressSuburb": "MELBOURNE",
        "addressState": "VIC", 
        "addressPostcode": "3000",
        "salesLastSaleContractDate": "20240101-20241231",
        "isActive": "true",
        "salesLastSoldPrice": "500000-1000000",
        "landArea": "500-1000",
        "beds": "2-4",
        "baths": "1-3",
        "carSpaces": "1-2",
        "offset": "0",
        "sort": "+distance"
    }
    """
    try:
        # Get JSON data from request
        data = request.get_json()
        
        if not data:
            return jsonify({
                'error': 'No data provided',
                'message': 'Request body must contain JSON data'
            }), 400
        
        # Log the incoming request for debugging
        logger.info(f"Sales comparables request received: {data}")
        
        # Validate required parameters
        if 'type' not in data:
            return jsonify({
                'error': 'Missing required parameter',
                'message': 'Property type is required'
            }), 400
        
        # Call RP Data API service
        try:
            response = rpdata_api.get_sales_comparables(data)
            
            # Log successful response
            logger.info(f"RP Data API call successful, returned {len(response.get('results', []))} results")
            
            # Return the response from RP Data API
            return jsonify({
                'success': True,
                'data': response,
                'message': 'Sales comparables retrieved successfully'
            })
            
        except Exception as api_error:
            logger.error(f"RP Data API error: {str(api_error)}")
            return jsonify({
                'error': 'RP Data API error',
                'message': f'Failed to retrieve sales comparables: {str(api_error)}'
            }), 500
            
    except Exception as e:
        logger.error(f"Unexpected error in get_sales_comparables: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'message': 'An unexpected error occurred while processing the request'
        }), 500


@rpdata_bp.route('/api/rpdata/commons/<rp_id>', methods=['GET'])
def get_commons(rp_id: str):
    """
    Retrieve commons data for a given RP Data property id.
    """
    try:
        if not rp_id or not str(rp_id).strip():
            return jsonify({
                'error': 'Missing required parameter',
                'message': 'Path parameter "rp_id" is required'
            }), 400

        rp_id = str(rp_id).strip()
        logger.info(f"RP Data commons request received: rp_id={rp_id}")

        try:
            response = rpdata_api.get_commons(rp_id)
            logger.info("RP Data commons retrieval successful")
            return jsonify({
                'success': True,
                'data': response,
                'message': 'Commons retrieved successfully'
            })
        except Exception as api_error:
            logger.error(f"RP Data commons error: {str(api_error)}")
            return jsonify({
                'error': 'RP Data API error',
                'message': f'Failed to retrieve commons: {str(api_error)}'
            }), 500

    except Exception as e:
        logger.error(f"Unexpected error in get_commons: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'message': 'An unexpected error occurred while processing the request'
        }), 500


@rpdata_bp.route('/api/rpdata/additional-information/<rp_id>', methods=['GET'])
def get_additional_information(rp_id: str):
    """
    Retrieve additional information for a given RP Data property id.
    """
    try:
        if not rp_id or not str(rp_id).strip():
            return jsonify({
                'error': 'Missing required parameter',
                'message': 'Path parameter "rp_id" is required'
            }), 400

        rp_id = str(rp_id).strip()
        logger.info(f"RP Data additional information request received: rp_id={rp_id}")

        try:
            response = rpdata_api.get_additional_information(rp_id)
            logger.info("RP Data additional information retrieval successful")
            return jsonify({
                'success': True,
                'data': response,
                'message': 'Additional information retrieved successfully'
            })
        except Exception as api_error:
            logger.error(f"RP Data additional information error: {str(api_error)}")
            return jsonify({
                'error': 'RP Data API error',
                'message': f'Failed to retrieve additional information: {str(api_error)}'
            }), 500

    except Exception as e:
        logger.error(f"Unexpected error in get_additional_information: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'message': 'An unexpected error occurred while processing the request'
        }), 500


@rpdata_bp.route('/api/rpdata/property-timeline/<rp_id>', methods=['GET'])
def get_property_timeline(rp_id: str):
    """
    Retrieve property timeline for a given RP Data property id.
    """
    try:
        if not rp_id or not str(rp_id).strip():
            return jsonify({
                'error': 'Missing required parameter',
                'message': 'Path parameter "rp_id" is required'
            }), 400

        rp_id = str(rp_id).strip()
        logger.info(f"RP Data property timeline request received: rp_id={rp_id}")

        try:
            response = rpdata_api.get_property_timeline(rp_id)
            logger.info("RP Data property timeline retrieval successful")
            return jsonify({
                'success': True,
                'data': response,
                'message': 'Property timeline retrieved successfully'
            })
        except Exception as api_error:
            logger.error(f"RP Data property timeline error: {str(api_error)}")
            return jsonify({
                'error': 'RP Data API error',
                'message': f'Failed to retrieve property timeline: {str(api_error)}'
            }), 500

    except Exception as e:
        logger.error(f"Unexpected error in get_property_timeline: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'message': 'An unexpected error occurred while processing the request'
        }), 500


@rpdata_bp.route('/api/rpdata/market-trends', methods=['GET'])
def get_market_trends():
    """
    Retrieve market trends for a given locality and property type.

    Query parameters:
    - locality_id: The locality ID (required)
    - property_type_id: The property type ID (required)
    """
    try:
        locality_id = request.args.get('locality_id')
        property_type_id = request.args.get('property_type_id')

        if not locality_id or not str(locality_id).strip():
            return jsonify({
                'error': 'Missing required parameter',
                'message': 'Query parameter "locality_id" is required'
            }), 400

        if not property_type_id or not str(property_type_id).strip():
            return jsonify({
                'error': 'Missing required parameter',
                'message': 'Query parameter "property_type_id" is required'
            }), 400

        locality_id = str(locality_id).strip()
        property_type_id = str(property_type_id).strip()

        logger.info(f"RP Data market trends request received: locality_id={locality_id}, property_type_id={property_type_id}")

        try:
            response = rpdata_api.get_market_trends(property_type_id, locality_id)
            logger.info("RP Data market trends retrieval successful")
            return jsonify({
                'success': True,
                'data': response,
                'message': 'Market trends retrieved successfully'
            })
        except Exception as api_error:
            logger.error(f"RP Data market trends error: {str(api_error)}")
            return jsonify({
                'error': 'RP Data API error',
                'message': f'Failed to retrieve market trends: {str(api_error)}'
            }), 500

    except Exception as e:
        logger.error(f"Unexpected error in get_market_trends: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'message': 'An unexpected error occurred while processing the request'
        }), 500





@rpdata_bp.route('/api/rpdata/health', methods=['GET'])
def health_check():
    """
    Health check endpoint for RP Data service 
    """
    try:
        # Test RP Data API connectivity with a simple request
        test_params = {
            'type': 'house',
            'radius': '1',
            'offset': '0',
            'sort': '+distance'
        }
        
        response = rpdata_api.get_sales_comparables(test_params)
        
        return jsonify({
            'status': 'healthy',
            'service': 'RP Data API',
            'message': 'Service is operational',
            'test_response': 'success'
        })
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            'status': 'unhealthy',
            'service': 'RP Data API', 
            'message': f'Service is not operational: {str(e)}',
            'test_response': 'failed'
        }), 503


@rpdata_bp.errorhandler(400)
def bad_request(error):
    """Handle 400 Bad Request errors"""
    return jsonify({
        'error': 'Bad Request',
        'message': 'Invalid request data'
    }), 400


@rpdata_bp.errorhandler(500)
def internal_error(error):
    """Handle 500 Internal Server Error"""
    return jsonify({
        'error': 'Internal Server Error',
        'message': 'An unexpected error occurred'
    }), 500


@rpdata_bp.route('/api/rpdata/search-address', methods=['GET', 'POST'])
def search_address():
    """
    Search for addresses using RP Data suggestion API.

    Accepts either:
    - GET query param: ?address=...
    - POST JSON body: { "address": "..." }
    """
    try:
        address = request.args.get('address')
        if not address:
            body = request.get_json(silent=True) or {}
            address = body.get('address')

        if not address or not str(address).strip():
            return jsonify({
                'error': 'Missing required parameter',
                'message': 'Parameter "address" is required'
            }), 400

        address = str(address).strip()
        logger.info(f"Search address request received: {address}")

        try:
            response = rpdata_api.search_address(address)
            logger.info("RP Data address search successful")
            return jsonify({
                'success': True,
                'data': response,
                'message': 'Addresses retrieved successfully'
            })
        except Exception as api_error:
            logger.error(f"RP Data address search error: {str(api_error)}")
            return jsonify({
                'error': 'RP Data API error',
                'message': f'Failed to search addresses: {str(api_error)}'
            }), 500

    except Exception as e:
        logger.error(f"Unexpected error in search_address: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'message': 'An unexpected error occurred while processing the request'
        }), 500


@rpdata_bp.route('/api/rpdata/sales-comparables-by-id/<rpdata_id>', methods=['POST'])
def get_sales_comparables_by_id(rpdata_id: str):
    """
    Get sales comparables for a specific property by RP Data ID.

    Expected POST data structure:
    {
        "latitude": "-37.8136",
        "longitude": "144.9631"
    }
    """
    try:
        # Get JSON data from request
        data = request.get_json()

        if not data:
            return jsonify({
                'error': 'No data provided',
                'message': 'Request body must contain JSON data with latitude and longitude'
            }), 400

        # Validate required parameters
        if not rpdata_id or not str(rpdata_id).strip():
            return jsonify({
                'error': 'Missing required parameter',
                'message': 'RP Data ID is required'
            }), 400

        latitude = data.get('latitude')
        longitude = data.get('longitude')

        if not latitude or not longitude:
            return jsonify({
                'error': 'Missing required parameters',
                'message': 'Both latitude and longitude are required'
            }), 400

        rpdata_id = str(rpdata_id).strip()
        latitude = str(latitude)
        longitude = str(longitude)

        # Log the incoming request for debugging
        logger.info(f"Sales comparables by ID request received: rpdata_id={rpdata_id}, lat={latitude}, lon={longitude}")

        # Call RP Data API service
        try:
            response = rpdata_api.get_sales_comparables_by_rpdata_id(rpdata_id, latitude, longitude)

            # Log successful response
            logger.info(f"RP Data API call successful for property ID {rpdata_id}")

            # Return the response in the same format as sales-comparables
            return jsonify({
                'success': True,
                'data': response,
                'message': 'Sales comparable retrieved successfully'
            })

        except Exception as api_error:
            logger.error(f"RP Data API error: {str(api_error)}")
            return jsonify({
                'error': 'RP Data API error',
                'message': f'Failed to retrieve sales comparable: {str(api_error)}'
            }), 500

    except Exception as e:
        logger.error(f"Unexpected error in get_sales_comparables_by_id: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'message': 'An unexpected error occurred while processing the request'
        }), 500