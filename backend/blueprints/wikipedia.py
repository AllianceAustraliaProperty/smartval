"""
Wikipedia Blueprint
Handles Wikipedia API calls for suburb descriptions
"""

import re
import requests
from flask import Blueprint, request, jsonify

# Initialize blueprint
wikipedia_bp = Blueprint('wikipedia', __name__)

WIKIPEDIA_STATE_MAP = {
    'NSW': 'New South Wales',
    'VIC': 'Victoria',
    'QLD': 'Queensland', 
    'SA': 'South Australia',
    'WA': 'Western Australia',
    'TAS': 'Tasmania',
    'ACT': 'Australian Capital Territory',
    'NT': 'Northern Territory'
}

# Compliant user agent adhering to Wikimedia API policy
USER_AGENT = "SmartVal/1.0 (https://smartval.com.au; support@smartval.com.au)"

def clean_extract_text(text: str) -> str:
    """Clean wikipedia intro extract for appraisal report usage"""
    if not text:
        return ""
    # Remove pronunciation parentheticals like (  REZ-ə-v(w)aw) or (/.../) or empty ()
    cleaned = re.sub(r'\s*\(\s*(?:/[^)]+/|[A-Za-z0-9\s\-əˈˌ\.\:\(\)]*|\s*)\)', '', text)
    # Remove references like [1], [note 1]
    cleaned = re.sub(r'\[\s*(?:\d+|note\s*\d+|citation needed)\s*\]', '', cleaned, flags=re.IGNORECASE)
    # Collapse multiple consecutive newlines / spaces
    cleaned = re.sub(r'[ \t]+', ' ', cleaned)
    cleaned = re.sub(r'\n\s*\n+', '\n\n', cleaned).strip()
    return cleaned

@wikipedia_bp.route('/suburb-description', methods=['GET'])
def get_suburb_description():
    """Get suburb description from Wikipedia"""
    try:
        suburb = request.args.get('suburb', '')
        state = request.args.get('state', '')
        
        if not suburb or not state:
            return jsonify({'error': 'Suburb and state are required'}), 400
        
        state_upper = state.strip().upper()
        full_state = WIKIPEDIA_STATE_MAP.get(state_upper, state.strip().title())
        
        # Clean suburb name: strip state suffix and postcode if included
        clean_suburb = re.sub(r'\s*,?\s*(?:NSW|VIC|QLD|WA|SA|TAS|ACT|NT)(?:\s+\d{4})?\s*$', '', suburb, flags=re.IGNORECASE)
        clean_suburb = re.sub(r'\s+\d{4}\s*$', '', clean_suburb).strip().title()
        
        url = "https://en.wikipedia.org/w/api.php"
        headers = {'User-Agent': USER_AGENT}
        
        # Priority candidate titles for Australian suburbs
        candidates = [
            f"{clean_suburb}, {full_state}",
            clean_suburb,
        ]
        
        # Query candidates directly
        for candidate_title in candidates:
            params = {
                'action': 'query',
                'format': 'json',
                'prop': 'extracts',
                'exintro': '1',
                'explaintext': '1',
                'titles': candidate_title,
                'redirects': '1',
                'origin': '*'
            }
            response = requests.get(url, params=params, timeout=10, headers=headers)
            if response.status_code == 200:
                data = response.json()
                pages = data.get('query', {}).get('pages', {})
                for page_id, page_data in pages.items():
                    if page_id != '-1' and 'missing' not in page_data:
                        extract = page_data.get('extract')
                        if extract and len(extract) > 40:
                            cleaned_extract = clean_extract_text(extract)
                            return jsonify({
                                'description': cleaned_extract,
                                'suburb': clean_suburb,
                                'state': state
                            }), 200
        
        # If direct candidates miss, use opensearch
        search_params = {
            'action': 'opensearch',
            'format': 'json',
            'search': f"{clean_suburb} {full_state}",
            'limit': 3,
            'origin': '*'
        }
        search_res = requests.get(url, params=search_params, timeout=10, headers=headers)
        if search_res.status_code == 200:
            search_data = search_res.json()
            if len(search_data) >= 2 and search_data[1]:
                for title in search_data[1]:
                    params = {
                        'action': 'query',
                        'format': 'json',
                        'prop': 'extracts',
                        'exintro': '1',
                        'explaintext': '1',
                        'titles': title,
                        'redirects': '1',
                        'origin': '*'
                    }
                    response = requests.get(url, params=params, timeout=10, headers=headers)
                    if response.status_code == 200:
                        data = response.json()
                        pages = data.get('query', {}).get('pages', {})
                        for page_id, page_data in pages.items():
                            if page_id != '-1' and 'missing' not in page_data:
                                extract = page_data.get('extract')
                                if extract and len(extract) > 40:
                                    cleaned_extract = clean_extract_text(extract)
                                    return jsonify({
                                        'description': cleaned_extract,
                                        'suburb': clean_suburb,
                                        'state': state
                                    }), 200

        return jsonify({'error': 'No Wikipedia page found for this suburb'}), 404

    except requests.exceptions.Timeout:
        return jsonify({'error': 'Request timeout - Wikipedia API is slow to respond'}), 408
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Request failed: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500
