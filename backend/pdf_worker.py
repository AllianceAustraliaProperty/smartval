"""Internal PDF service: one renderer, two queued jobs, no published port.

Run with one Gunicorn process and six threads. Playwright is owned solely by
the render thread; every job gets a fresh browser context.
"""
import queue
import threading
import time
from flask import Flask, Response, jsonify, request
from utils.pdf_render import PdfRenderer

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024
jobs = queue.Queue(maxsize=2)


def run_jobs():
    renderer = PdfRenderer()
    while True:
        job = jobs.get()
        try:
            if time.monotonic() >= job['deadline']:
                job['error'] = TimeoutError('PDF job expired in queue')
            else:
                job['pdf'] = renderer.render(job['html'])
        except Exception as error:
            job['error'] = error
            app.logger.error('PDF rendering failed (%s)', type(error).__name__)
            renderer.close()
        finally:
            job['done'].set()
            jobs.task_done()


render_thread = threading.Thread(target=run_jobs, name='pdf-renderer', daemon=True)
render_thread.start()


@app.get('/health')
def health():
    return jsonify({'status': 'ok' if render_thread.is_alive() else 'failed', 'queued': jobs.qsize()}), 200 if render_thread.is_alive() else 503


@app.post('/render')
def render():
    html = request.get_data(as_text=True)
    if not html:
        return jsonify({'error': 'HTML is required'}), 400
    job = {'html': html, 'done': threading.Event(), 'deadline': time.monotonic() + 90}
    try:
        jobs.put_nowait(job)
    except queue.Full:
        return jsonify({'error': 'PDF renderer is busy; please retry shortly.'}), 503, {'Retry-After': '5'}
    if not job['done'].wait(90):
        return jsonify({'error': 'PDF rendering timed out; please retry.'}), 504
    if 'error' in job:
        return jsonify({'error': 'Unable to render PDF. Please retry.'}), 502
    return Response(job['pdf'], mimetype='application/pdf')
