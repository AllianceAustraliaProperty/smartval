"""Run with python -m unittest tests.test_performance (no DB writes)."""
import io
import multiprocessing
import os
from pathlib import Path
import queue
import tempfile
import threading
import time
import unittest
from unittest.mock import Mock, patch

from utils.render_cache import RenderCache


def cache_process(root, calls):
    cache = RenderCache('shared', root=root)
    with cache.lock('report'):
        if cache.get('report') is None:
            with calls.get_lock():
                calls.value += 1
            time.sleep(0.05)
            cache.put('report', b'%PDF-test')


class CacheTests(unittest.TestCase):
    def test_expiry_and_bounded_size(self):
        with tempfile.TemporaryDirectory() as root:
            cache = RenderCache('test', ttl=1, max_bytes=100, root=root)
            for n in range(5):
                cache.put(str(n), b'x' * 40)
            self.assertLessEqual(sum(p.stat().st_size for p in cache.path.glob('*.cache')), 100)
            self.assertIsNone(cache.get('0'))
            path = cache.path / (cache.digest('4') + '.cache')
            os.utime(path, (time.time() - 2, time.time() - 2))
            self.assertIsNone(cache.get('4'))

    def test_cross_process_single_flight(self):
        with tempfile.TemporaryDirectory() as root:
            calls = multiprocessing.Value('i', 0)
            processes = [multiprocessing.Process(target=cache_process, args=(root, calls)) for _ in range(4)]
            for process in processes:
                process.start()
            for process in processes:
                process.join(5)
                self.assertEqual(process.exitcode, 0)
            self.assertEqual(calls.value, 1)

    def test_unwritable_cache_is_optional(self):
        cache = RenderCache('cache', root='/dev/null')
        with cache.lock('key'):
            self.assertIsNone(cache.get('key'))
            cache.put('key', b'pdf')

    def test_image_failures_not_cached(self):
        from utils import image_compress
        with tempfile.TemporaryDirectory() as root, patch.object(image_compress, 'image_cache', RenderCache('images', root=root)), patch.object(image_compress, '_compress_image', side_effect=['https://image', 'data:image/jpeg;base64,AAAA']) as render:
            self.assertEqual(image_compress.compress_image_to_data_url('https://image'), 'https://image')
            self.assertTrue(image_compress.compress_image_to_data_url('https://image').startswith('data:'))
            image_compress.compress_image_to_data_url('https://image')
            self.assertEqual(render.call_count, 2)

    def test_html_invalidates_when_report_fields_change(self):
        from blueprints import valuation_reports as reports
        model = Mock()
        model.get_by_id.return_value = {'fileNumber': 'A'}
        with tempfile.TemporaryDirectory() as root, patch.object(reports, 'html_cache', RenderCache('html', root=root)), patch.object(reports, 'valuation_report_model', model), patch.object(reports, '_render_html_report', side_effect=lambda doc, template: (doc['fileNumber'], True, None)) as render:
            self.assertEqual(reports.generate_html_report('id')[0], 'A')
            reports.generate_html_report('id')
            model.get_by_id.return_value = {'fileNumber': 'B'}
            self.assertEqual(reports.generate_html_report('id')[0], 'B')
            model.get_by_id.return_value = None
            self.assertFalse(reports.generate_html_report('id')[1])
            self.assertEqual(render.call_count, 2)

    def test_pdf_cache_and_changed_html(self):
        from utils import pdf_client
        with tempfile.TemporaryDirectory() as root, patch.object(pdf_client, 'pdf_cache', RenderCache('pdf', root=root)), patch.dict(os.environ, {'PDF_WORKER_URL': 'http://worker'}), patch.object(pdf_client.requests, 'post') as post:
            post.return_value.content = b'%PDF-test'
            self.assertEqual(pdf_client.generate_pdf_from_html('first'), b'%PDF-test')
            pdf_client.generate_pdf_from_html('first')
            pdf_client.generate_pdf_from_html('second')
            self.assertEqual(post.call_count, 2)
            post.return_value.content = b'bad response'
            with self.assertRaises(pdf_client.PdfServiceError):
                pdf_client.generate_pdf_from_html('bad')
            self.assertIsNone(pdf_client.pdf_cache.get('bad'))


class WorkerTests(unittest.TestCase):
    def test_queue_overload_is_retryable_and_health_stays_available(self):
        import pdf_worker
        full = queue.Queue(maxsize=1)
        full.put({})
        with patch.object(pdf_worker, 'jobs', full):
            client = pdf_worker.app.test_client()
            response = client.post('/render', data='<html>report</html>')
            self.assertEqual(response.status_code, 503)
            self.assertEqual(response.headers['Retry-After'], '5')
            self.assertEqual(client.get('/health').status_code, 200)

    def test_context_closed_on_render_failure(self):
        from utils.pdf_render import PdfRenderer
        renderer = PdfRenderer()
        renderer.browser = Mock()
        context = renderer.browser.new_context.return_value
        context.new_page.return_value.set_content.side_effect = RuntimeError('failed')
        with self.assertRaises(RuntimeError):
            renderer.render('html')
        context.close.assert_called_once()


class ListingTests(unittest.TestCase):
    def test_empty_page_and_literal_search(self):
        from models.valuation_report import ValuationReport
        db = Mock()
        db.valuationReports.aggregate.return_value = iter([{'reports': [], 'total': []}])
        rows, total = ValuationReport(db).get_all(projection={'fileNumber': 1}, limit=24, search='a.*')
        self.assertEqual((rows, total), ([], 0))
        match = db.valuationReports.aggregate.call_args.args[0][0]['$match']
        self.assertEqual(match['isDeleted'], {'$ne': True})
        self.assertEqual(match['$or'][1]['fileNumber']['$regex'], r'a\.\*')
        db.valuationReports.count_documents.assert_not_called()


if __name__ == '__main__':
    unittest.main()
