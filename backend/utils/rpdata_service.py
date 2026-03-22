import requests
from config import Config
from urllib.parse import quote_plus, urlencode

RPDATA_API_URL = Config.RPDATA_API_URL
RPDATA_API_KEY = Config.RPDATA_API_KEY

class RpDataAPI:
    def __init__(self):
        self.auth_headers = {
            "secret_sauce": RPDATA_API_KEY
        }


    def proxy_get(self, url: str):
        params = { 
            "url": url
        }
        api_url = RPDATA_API_URL + "/proxy_rpp_get"
        response = requests.get(api_url, params=params, headers=self.auth_headers, verify=False)
        if not response.ok:
            raise Exception("There was a problem requesting to RP Data proxy.")
        return response.json()

    def proxy_post(self, url: str, data: dict):
        params = { 
            "url": url
        }
        api_url = RPDATA_API_URL + "/proxy_rpp_post"
        response = requests.post(api_url, params=params, json=data, headers=self.auth_headers, verify=False)
        if not response.ok:
            raise Exception("There was a problem requesting to RP Data proxy.")
        return response.json()
    
    def get_additional_information(self, rp_id: str):
        rp_data_url = f"https://rpp.corelogic.com.au/api/properties/{rp_id}/additionalInformation?includeCommons=true"
        response = self.proxy_get(rp_data_url)
        return response

    def get_photos(self, rp_id: str):
        rp_data_url = f"https://rpp.corelogic.com.au/api/properties/{rp_id}/photos"
        response = self.proxy_get(rp_data_url)
        return response
    
    def get_user_photos(self, rp_id: str):
        rp_data_url = f"https://signature.corelogic.asia/api/properties/{rp_id}/user/photos"
        response = self.proxy_get(rp_data_url)
        return response
    
    def generate_s3_upload_url(self, post_data: dict):
        rp_data_url = f"https://signature.corelogic.asia/api/digitalAsset"
        response = self.proxy_post(rp_data_url, post_data)
        return response
    
    def get_market_trends(self, property_type_id: str, location_id: str):
        rp_data_url = "https://rpp.corelogic.com.au/api/suburb/marketTrends"
        response = self.proxy_post(rp_data_url, {"propertyTypeId": property_type_id, "locationId": location_id})
        return response
    
    def get_sales_comparables(self, params: dict):
        rp_data_url = "https://signature.corelogic.asia/api/rapidsearch/au/1/list"
        full_url = rp_data_url + "?" + urlencode(params) if params else rp_data_url
        response = self.proxy_get(full_url)
        return response
    
    def search_address(self, address: str):
        rp_data_url = f"https://signature.corelogic.asia/api/suggestion/2/address?address={quote_plus(address)}"
        response = self.proxy_get(rp_data_url)
        return response
    
    def get_sales_comparables_by_rpdata_id(self, rpdata_id: str, latitude: str, longitude: str):
        rp_data_url = f"https://signature.corelogic.asia/api/property/details/{rpdata_id}/calculated/distance?lat={latitude}&lon={longitude}&id={rpdata_id}&propertyId={rpdata_id}"
        response = self.proxy_get(rp_data_url)
        return response
    
    def get_nearby_schools(self, latitude: str, longitude: str):
        rp_data_url = f"https://rpp.corelogic.com.au/api/clapi/nearbySchools?lat={latitude}&lon={longitude}&size=20"
        response = self.proxy_get(rp_data_url)
        return response

    def get_commons(self, rp_id: str):
        rp_data_url = f"https://rpp.corelogic.com.au/api/properties/{rp_id}/commons"
        response = self.proxy_get(rp_data_url)
        return response

    def get_property_timeline(self, rp_id: str):
        rp_data_url = f"https://rpp.corelogic.com.au/api/properties/{rp_id}/propertyTimeline?includeCommons=true"
        response = self.proxy_get(rp_data_url)
        return response