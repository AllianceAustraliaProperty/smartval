"""Cache identical PDFs and send heavy work to the isolated renderer."""
import os
import requests
from utils.render_cache import pdf_cache, RenderCache

local_render_lock = RenderCache('local-render-lock')


class PdfServiceError(RuntimeError):
    pass


def generate_pdf_from_html(html):
    cached = pdf_cache.get(html)
    if cached is not None:
        return cached
    with pdf_cache.lock(html):
        cached = pdf_cache.get(html)
        if cached is not None:
            return cached
        worker_url = os.environ.get('PDF_WORKER_URL')
        if worker_url:
            try:
                response = requests.post(worker_url.rstrip('/') + '/render', data=html.encode('utf-8'), headers={'Content-Type': 'text/html; charset=utf-8'}, timeout=(3, 95))
                response.raise_for_status()
                pdf = response.content
            except requests.RequestException as error:
                raise PdfServiceError('PDF rendering is busy or unavailable. Please retry shortly.') from error
        else:
            # Local development retains the same API without a separate service.
            from utils.pdf_render import PdfRenderer
            with local_render_lock.lock('renderer', timeout=90):
                renderer = PdfRenderer()
                try:
                    pdf = renderer.render(html)
                finally:
                    renderer.close()
        if not pdf.startswith(b'%PDF-'):
            raise PdfServiceError('PDF renderer returned an invalid document.')
        pdf_cache.put(html, pdf)
        return pdf
