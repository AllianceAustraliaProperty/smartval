"""Playwright renderer, owned by one dedicated thread."""
from playwright.sync_api import sync_playwright

def compress_pdf(pdf_bytes, image_quality=65):
    """Recompress Chromium's bloated FlateDecode image streams as JPEG."""
    try:
        import pikepdf
        from PIL import Image
        import io
        from concurrent.futures import ThreadPoolExecutor

        pdf = pikepdf.open(io.BytesIO(pdf_bytes))

        pil_images = []
        raw_images = []

        # Step 1: Extract images sequentially (fast, safe for C++ bindings)
        for page in pdf.pages:
            if "/Resources" not in page or "/XObject" not in page["/Resources"]:
                continue
            for key, raw_image in page["/Resources"]["/XObject"].items():
                if raw_image.get("/Subtype") != "/Image":
                    continue
                try:
                    pil_image = pikepdf.PdfImage(raw_image).as_pil_image()
                    if pil_image.mode != 'RGB':
                        pil_image = pil_image.convert('RGB')
                    pil_images.append(pil_image)
                    raw_images.append(raw_image)
                except Exception:
                    continue

        # Step 2: Encode to JPEG concurrently (CPU heavy, but PIL releases the GIL)
        def _encode(img):
            buf = io.BytesIO()
            # Dropped optimize=True as it adds ~30% processing time for only ~5% size reduction
            img.save(buf, format='JPEG', quality=image_quality)
            return buf.getvalue()

        with ThreadPoolExecutor(max_workers=4) as ex:
            jpeg_results = list(ex.map(_encode, pil_images))

        # Step 3: Write back into PDF sequentially (safe for C++ bindings)
        for raw_image, jpeg_bytes in zip(raw_images, jpeg_results):
            try:
                raw_image.write(jpeg_bytes, filter=pikepdf.Name("/DCTDecode"))
                raw_image["/ColorSpace"] = pikepdf.Name("/DeviceRGB")
            except Exception:
                pass

        out = io.BytesIO()
        pdf.save(out, compress_streams=True)
        pdf.close()

        return out.getvalue()
    except Exception as e:
        print(f"Warning: pikepdf compression failed: {e}")
        return pdf_bytes  # safe fallback to original PDF if it fails

class PdfRenderer:
    def __init__(self):
        self.playwright = None
        self.browser = None
        self.completed = 0

    def close(self):
        try:
            if self.browser:
                self.browser.close()
        except Exception:
            pass
        finally:
            self.browser = None
            if self.playwright:
                try:
                    self.playwright.stop()
                except Exception:
                    pass
            self.playwright = None
            self.completed = 0

    def render(self, html):
        if self.completed >= 50 or (self.browser and not self.browser.is_connected()):
            self.close()
        if self.browser is None:
            self.playwright = sync_playwright().start()
            self.browser = self.playwright.chromium.launch(args=[
                '--no-sandbox', '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', '--disable-gpu',
                '--js-flags=--max-old-space-size=512',
            ])
        context = self.browser.new_context()
        try:
            page = context.new_page()
            page.set_default_timeout(45000)
            page.set_content(html, wait_until='load', timeout=45000)
            # load already waits for images; explicitly wait for fonts instead
            # of networkidle's delay and sensitivity to unrelated requests.
            page.wait_for_function("document.fonts.status === 'loaded'", timeout=15000)
            result = page.pdf(format='A4', print_background=True,
                              margin={'top': '0', 'bottom': '0', 'left': '0', 'right': '0'})
            self.completed += 1
            return compress_pdf(result)
        finally:
            context.close()
