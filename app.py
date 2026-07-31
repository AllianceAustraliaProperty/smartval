import os
import json
from urllib.parse import urlparse

from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright, ElementHandle, Page


load_dotenv()

CDP_URL = os.getenv("CDP_URL")

app = Flask(__name__)
CORS(app, resources={r"*": {"origins": "*"}})


def _connect_context_and_validate():
    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp("http://localhost:9222")
        try:
            context = browser.contexts[0]
        except IndexError:
            browser.close()
            raise RuntimeError("No browser context available on CDP endpoint")

        # Ensure target page exists (similar to the C# lookup)
        rpp_page = next((pg for pg in context.pages if "rpp.corelogic.com.au" in pg.url), None)
        if rpp_page is None:
            browser.close()
            raise RuntimeError("Target page not found")

        return p, browser, context


@app.get("/proxy_rpp_get")
def proxy_rpp_get():
    request_url = request.args.get("url", type=str)
    if not request_url:
        return jsonify({"error": "Missing 'url' query parameter"}), 400

    # Basic format validation akin to UrlParser; ensure host matches expected domain
    parsed = urlparse(request_url)
    if not parsed.scheme or not parsed.netloc:
        return jsonify({"error": "Invalid URL format"}), 400

    try:
        with sync_playwright() as p:
            browser = p.chromium.connect_over_cdp(CDP_URL)
            context = browser.contexts[0]
            params = [(k, v) for k in request.args for v in request.args.getlist(k) if k != "url"]
            resp = context.request.get(request_url, params=params)

            content_type = resp.headers.get("content-type", "")
            if "application/json" in content_type.lower():
                try:
                    data = resp.json()
                    return make_response(jsonify(data), resp.status)
                except Exception as ex:
                    print(ex)
            
            # For non-JSON (like images) or if JSON parsing fails, return raw body
            body = resp.body()
            response = make_response(body, resp.status)
            if content_type:
                response.headers["Content-Type"] = content_type
            return response
    except Exception as ex:
        print(ex)
        return make_response(str(ex), 500)


@app.post("/proxy_rpp_post")
def proxy_rpp_post():
    request_url = request.args.get("url", type=str)
    if not request_url:
        return jsonify({"error": "Missing 'url' query parameter"}), 400

    try:
        params = [(k, v if v is not None else "") for k in request.args for v in request.args.getlist(k) if k != "url"]
        with sync_playwright() as p:
            browser = p.chromium.connect_over_cdp(CDP_URL)
            context = browser.contexts[0]
            cookies = context.cookies(["https://rpp.corelogic.com.au"])
            xsrf_token = next((c.get("value") for c in cookies if c.get("name") == "APP2SESSION-XSRF"), None)
            response = context.request.post(request_url, params=params,  data=request.json, headers={"X-Xsrf-Token": xsrf_token})
            return make_response(jsonify(response.json()), response.status)
    except Exception as ex:
        return make_response(str(ex), 500)


@app.get("/test")
def test():
    return make_response("Test Receieved", 200)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002)


