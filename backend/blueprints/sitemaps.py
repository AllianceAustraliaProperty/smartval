from flask import Blueprint, request, jsonify, current_app
from database import get_database
from models.valuation_report import ValuationReport
from utils.s3_service import s3_service


sitemaps_bp = Blueprint("sitemaps", __name__)

valuation_report_model = ValuationReport(get_database())

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp", "bmp", "tiff"}


@sitemaps_bp.route("/presigned-url/<report_id>", methods=["POST"])
def get_sitemap_presigned_url(report_id):
    """Generate presigned URL for manual sitemap upload."""
    try:
        report = valuation_report_model.get_by_id(report_id)
        if not report:
            return jsonify({"error": "Valuation report not found"}), 404

        data = request.get_json() or {}
        file_extension = (data.get("fileExtension") or "").lower()
        content_type = data.get("contentType")

        if not file_extension:
            return jsonify({"error": "File extension is required"}), 400
        if file_extension not in ALLOWED_EXTENSIONS:
            return jsonify({"error": f"Invalid file type: {file_extension}"}), 400

        presigned_data = s3_service.generate_presigned_url(
            file_extension=file_extension,
            report_id=report_id,
            content_type=content_type,
        )

        return (
            jsonify(
                {
                    "presignedUrl": presigned_data["presigned_url"],
                    "fileKey": presigned_data["file_key"],
                    "s3Url": presigned_data["s3_url"],
                    "bucket": presigned_data["bucket"],
                    "region": presigned_data["region"],
                }
            ),
            200,
        )
    except Exception as e:  # pragma: no cover - logging only
        current_app.logger.error(f"Error generating sitemap presigned URL: {str(e)}")
        return jsonify({"error": f"Failed to generate presigned URL: {str(e)}"}), 500


@sitemaps_bp.route("/confirm-upload/<report_id>", methods=["POST"])
def confirm_sitemap_upload(report_id):
    """Confirm sitemap upload and store URL on the valuation report."""
    try:
        report = valuation_report_model.get_by_id(report_id)
        if not report:
            return jsonify({"error": "Valuation report not found"}), 404

        data = request.get_json() or {}
        s3_url = data.get("s3Url")
        file_key = data.get("fileKey")

        if not s3_url or not file_key:
            return jsonify({"error": "S3 URL and file key are required"}), 400

        # Store sitemap URL under valuationDetails.manualSitemapUrl using dotted path
        valuation_report_model.update(
            report_id,
            {
                "valuationDetails.manualSitemapUrl": s3_url,
            },
        )

        return jsonify({"message": "Sitemap uploaded successfully", "sitemapUrl": s3_url}), 200
    except Exception as e:  # pragma: no cover - logging only
        current_app.logger.error(f"Error confirming sitemap upload: {str(e)}")
        return jsonify({"error": f"Failed to confirm upload: {str(e)}"}), 500

{
  "cells": [],
  "metadata": {
    "language_info": {
      "name": "python"
    }
  },
  "nbformat": 4,
  "nbformat_minor": 2
}