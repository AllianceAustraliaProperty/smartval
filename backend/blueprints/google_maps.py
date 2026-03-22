"""
Google Maps Proxy Blueprint
Provides backend endpoints that proxy Google Maps services so the frontend
doesn't need to call Google APIs directly.
"""

from flask import Blueprint, request, jsonify, Response, current_app
import requests


google_maps_bp = Blueprint('google_maps', __name__)


def _get_api_key() -> str:
    api_key = current_app.config.get('GOOGLE_MAPS_API_KEY')
    if not api_key:
        raise RuntimeError('Google Maps API key not configured')
    return api_key


def _http_get(url: str, *, timeout: int = 30, stream: bool = False):
    headers = {
        'User-Agent': 'SMARTval-Backend/1.0'
    }
    return requests.get(url, headers=headers, timeout=timeout, stream=stream)


@google_maps_bp.route('/geocode', methods=['GET'])
def geocode():
    address = request.args.get('address')
    if not address:
        return jsonify({'error': 'address is required'}), 400

    try:
        api_key = _get_api_key()
        url = (
            'https://maps.googleapis.com/maps/api/geocode/json'
            f'?address={requests.utils.quote(address)}&key={api_key}&region=au&components=country:AU'
        )
        resp = _http_get(url)
        return jsonify(resp.json()), resp.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@google_maps_bp.route('/reverse-geocode', methods=['GET'])
def reverse_geocode():
    lat = request.args.get('lat')
    lng = request.args.get('lng')
    if not lat or not lng:
        return jsonify({'error': 'lat and lng are required'}), 400

    try:
        api_key = _get_api_key()
        url = (
            'https://maps.googleapis.com/maps/api/geocode/json'
            f'?latlng={lat},{lng}&key={api_key}&result_type=street_address|route'
        )
        resp = _http_get(url)
        return jsonify(resp.json()), resp.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@google_maps_bp.route('/places', methods=['GET'])
def places_nearby():
    lat = request.args.get('lat')
    lng = request.args.get('lng')
    place_type = request.args.get('type')
    keyword = request.args.get('keyword')
    radius = request.args.get('radius')

    if not lat or not lng or not place_type:
        return jsonify({'error': 'lat, lng and type are required'}), 400

    try:
        api_key = _get_api_key()

        if radius:
            url = (
                'https://maps.googleapis.com/maps/api/place/nearbysearch/json'
                f'?location={lat},{lng}&radius={radius}&type={place_type}&key={api_key}'
            )
        else:
            url = (
                'https://maps.googleapis.com/maps/api/place/nearbysearch/json'
                f'?location={lat},{lng}&rankby=distance&type={place_type}&key={api_key}'
            )
        if keyword:
            url += f'&keyword={requests.utils.quote(keyword)}'

        resp = _http_get(url)
        return jsonify(resp.json()), resp.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@google_maps_bp.route('/distance-matrix', methods=['GET'])
def distance_matrix():
    origins = request.args.get('origins')
    destinations = request.args.get('destinations')
    mode = request.args.get('mode', 'driving')
    if not origins or not destinations:
        return jsonify({'error': 'origins and destinations are required'}), 400

    try:
        api_key = _get_api_key()
        url = (
            'https://maps.googleapis.com/maps/api/distancematrix/json'
            f'?origins={requests.utils.quote(origins)}'
            f'&destinations={requests.utils.quote(destinations)}'
            f'&mode={mode}&key={api_key}'
        )
        resp = _http_get(url)
        return jsonify(resp.json()), resp.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@google_maps_bp.route('/custom-map', methods=['GET'])
def custom_map():
    address = request.args.get('address')
    zoom = request.args.get('zoom', '14')
    size = request.args.get('size', '600x400')
    if not address:
        return jsonify({'error': 'address is required'}), 400

    try:
        api_key = _get_api_key()
        map_url = (
            'https://maps.googleapis.com/maps/api/staticmap'
            f'?center={requests.utils.quote(address)}&zoom={zoom}&size={size}'
            f'&maptype=roadmap&markers=color:red%7C{requests.utils.quote(address)}&key={api_key}'
        )
        resp = _http_get(map_url, stream=True)
        content = resp.content
        return Response(content, status=resp.status_code, mimetype='image/png', headers={
            'Cache-Control': 'public, max-age=3600'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


