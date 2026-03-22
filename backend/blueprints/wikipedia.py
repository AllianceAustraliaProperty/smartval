"""
Wikipedia Blueprint
Handles Wikipedia API calls for suburb descriptions
"""

import re
import requests
from flask import Blueprint, request, jsonify
# CORS is handled globally in app.py

# Initialize blueprint
wikipedia_bp = Blueprint('wikipedia', __name__)

WIKIPEDIA_STATE_MAP = {
    'NSW': 'New_South_Wales',
    'VIC': 'Victoria',
    'QLD': 'Queensland', 
    'SA': 'South_Australia',
    'WA': 'Western_Australia',
    'TAS': 'Tasmania',
    'ACT': 'Australian_Capital_Territory',
    'NT': 'Northern_Territory'
}

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"

@wikipedia_bp.route('/suburb-description', methods=['GET'])
def get_suburb_description():
    """Get suburb description from Wikipedia"""
    try:
        suburb = request.args.get('suburb')
        state = request.args.get('state')
        
        if not suburb or not state:
            return jsonify({'error': 'Suburb and state are required'}), 400
        
        # Clean suburb name and get full state name
        clean_suburb = re.sub(r'\s*,?\s*NSW\s*$', '', suburb, flags=re.IGNORECASE).strip().title()
        full_state = WIKIPEDIA_STATE_MAP.get(state, state)
        
        print(f"DEBUG - Original suburb: {suburb}, state: {state}")
        print(f"DEBUG - Clean suburb: {clean_suburb}, full_state: {full_state}")
        
        url = "https://en.wikipedia.org/w/api.php"
        
        # First, use Wikipedia search API to find the correct page title
        search_params = {
            'action': 'opensearch',
            'format': 'json',
            'search': f"{clean_suburb} {full_state.replace('_', ' ')}",
            'limit': 1,
            'origin': '*'
        }
        
        print(f"DEBUG - Searching with: {search_params['search']}")
        search_response = requests.get(url, params=search_params, timeout=10, headers={'User-Agent': USER_AGENT})
        
        if search_response.status_code == 200:
            search_data = search_response.json()
            print(f"DEBUG - Search response: {search_data}")
            
            # OpenSearch returns [query, [titles], [descriptions], [urls]]
            if len(search_data) >= 2 and search_data[1]:
                page_title = search_data[1][0]
                print(f"DEBUG - Found page title: {page_title}")
                
                # Now get the extract for this page
                extract_params = {
                    'action': 'query',
                    'format': 'json',
                    'prop': 'extracts',
                    'exintro': '0',
                    'explaintext': '1',
                    'titles': page_title,
                    'redirects': '1',  # Follow redirects
                    'origin': '*'
                }
                
                extract_response = requests.get(url, params=extract_params, timeout=10, headers={'User-Agent': USER_AGENT})
                
                if extract_response.status_code == 200:
                    data = extract_response.json()
                    pages = data.get('query', {}).get('pages', {})
                    
                    for page_id, page_data in pages.items():
                        if page_id != '-1' and 'missing' not in page_data:
                            extract = page_data.get('extract')
                            if extract:
                                print(f"DEBUG - Successfully found extract, length: {len(extract)}")
                                return jsonify({
                                    'description': extract,
                                    'suburb': suburb,
                                    'state': state
                                }), 200
        
        # If search fails, try direct query as fallback
        print(f"DEBUG - Search failed, trying direct query")
        search_queries = [
            f"{clean_suburb}, {full_state.replace('_', ' ')}",
            clean_suburb,
        ]
        
        for search_query in search_queries:
            print(f"DEBUG - Trying direct query: {search_query}")
            
            params = {
                'action': 'query',
                'format': 'json',
                'prop': 'extracts',
                'exintro': '0',
                'explaintext': '1',
                'titles': search_query,
                'redirects': '1',
                'origin': '*'
            }
            
            response = requests.get(url, params=params, timeout=10, headers={'User-Agent': USER_AGENT})
            
            if response.status_code == 200:
                data = response.json()
                pages = data.get('query', {}).get('pages', {})
                
                for page_id, page_data in pages.items():
                    if page_id != '-1' and 'missing' not in page_data:
                        extract = page_data.get('extract')
                        if extract:
                            print(f"DEBUG - Found extract with direct query: {search_query}")
                            return jsonify({
                                'description': extract,
                                'suburb': suburb,
                                'state': state
                            }), 200
        
        # If all attempts fail
        return jsonify({'error': 'No Wikipedia page found for this suburb'}), 404
            
    except requests.exceptions.Timeout:
        return jsonify({'error': 'Request timeout - Wikipedia API is slow to respond'}), 408
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Request failed: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500
