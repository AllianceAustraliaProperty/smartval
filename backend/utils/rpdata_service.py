import logging
import requests
import urllib3
from config import Config
from urllib.parse import quote_plus, urlencode

# Every request below sets verify=False because the upstream CoreLogic services
# present certs we don't trust through this proxy. Suppress the per-request
# urllib3 warning to keep logs readable.
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

RPDATA_API_URL = Config.RPDATA_API_URL

logger = logging.getLogger(__name__)


class RpDataAPI:
    def __init__(self):
        self.rpp_cookies = ""
        self.signature_cookies = ""
        # Cookies are fetched lazily on first use, not at construction.
        # Doing it at __init__ blocked Flask startup for up to 10s waiting on
        # the cookie service.
        self._cookies_fetched = False

    def _ensure_cookies(self):
        if not self._cookies_fetched:
            self.refresh_cookies()
            self._cookies_fetched = True

    def refresh_cookies(self):
        """Fetch fresh cookies from the rpdata cookie service."""
        url = RPDATA_API_URL + "/get-cookies"
        try:
            response = requests.get(url, timeout=5)
            if response.ok:
                data = response.json()
                self.rpp_cookies = data.get("rpp_cookies", "")
                self.signature_cookies = data.get("signature_cookies", "")
                if not self.rpp_cookies and not self.signature_cookies:
                    logger.warning(
                        "Cookie service %s returned 200 but both cookie strings were empty",
                        url,
                    )
            else:
                logger.error(
                    "Cookie service %s returned %s: %s",
                    url, response.status_code, response.text[:200],
                )
        except Exception as e:
            logger.exception("Failed to fetch cookies from %s: %s", url, e)

    def _get_cookies_for_url(self, url: str) -> str:
        """Return the appropriate cookie string based on the URL domain."""
        self._ensure_cookies()
        if "signature.corelogic.asia" in url:
            return self.signature_cookies
        return self.rpp_cookies

    def _get_xsrf_token(self, cookies: str) -> str:
        """Extract APP2SESSION-XSRF token from cookie string."""
        for part in cookies.split(';'):
            part = part.strip()
            if part.startswith('APP2SESSION-XSRF='):
                return part.split('=', 1)[1]
        return ""

    def proxy_get(self, url: str):
        cookies = self._get_cookies_for_url(url)
        headers = {"Cookie": cookies}
        response = requests.get(url, headers=headers, verify=False)
        if not response.ok:
            # Retry once with refreshed cookies on auth failure
            if response.status_code in (401, 403):
                self.refresh_cookies()
                cookies = self._get_cookies_for_url(url)
                headers = {"Cookie": cookies}
                response = requests.get(url, headers=headers, verify=False)
            if not response.ok:
                raise Exception(f"RP Data request failed ({response.status_code}): {url}")
        return response.json()

    def proxy_post(self, url: str, data: dict):
        cookies = self._get_cookies_for_url(url)
        xsrf_token = self._get_xsrf_token(cookies)
        headers = {"Cookie": cookies, "Content-Type": "application/json"}
        if xsrf_token:
            headers["X-Xsrf-Token"] = xsrf_token
        response = requests.post(url, json=data, headers=headers, verify=False)
        if not response.ok:
            if response.status_code in (401, 403):
                self.refresh_cookies()
                cookies = self._get_cookies_for_url(url)
                xsrf_token = self._get_xsrf_token(cookies)
                headers = {"Cookie": cookies, "Content-Type": "application/json"}
                if xsrf_token:
                    headers["X-Xsrf-Token"] = xsrf_token
                response = requests.post(url, json=data, headers=headers, verify=False)
            if not response.ok:
                raise Exception(f"RP Data request failed ({response.status_code}): {url}")
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
        rp_data_url = f"https://rpp.corelogic.com.au/api/properties/{rp_id}/propertyTimeline?includeCommons=true&clAppAccountUserGuid=5c0455bc-332d-427b-8700-b48c40b08a25"
        response = self.proxy_get(rp_data_url)
        return response
