"""Real scheduling component; entirely synthetic API, no credentials and no mail."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1280, 'height': 950})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    def route(request):
        name = request.request.url.rsplit('/', 1)[-1]
        file = Path('/tests') / name
        if file.is_file(): request.fulfill(path=str(file), content_type='text/css' if name.endswith('.css') else 'text/javascript')
        else: request.fulfill(body='<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/styles.css"/></head><body><div id="root"></div><script src="/schedule.js"></script></body></html>', content_type='text/html')
    page.route('http://localhost/**', route)
    page.goto('http://localhost/')
    page.get_by_role('button', name='Schedule email', exact=True).last.click()
    page.get_by_label('To', exact=True).wait_for()
    page.get_by_role('button', name='Prepare email preview').wait_for(state='visible')
    page.screenshot(path='/screens/schedule-desktop.png')
    page.evaluate('scheduleFixture.failSave=true')
    page.get_by_role('button', name='Prepare email preview').click()
    page.get_by_role('alert').wait_for()
    assert page.evaluate('scheduleFixture.events') == ['save']
    page.evaluate('scheduleFixture.failSave=false;scheduleFixture.events=[]')
    page.get_by_role('button', name='Prepare email preview').click()
    page.get_by_text('Review your email', exact=True).wait_for()
    assert page.evaluate('scheduleFixture.events') == ['save', 'prepare']
    assert page.get_by_role('link', name='Review attached PDF:', exact=False).count() == 1
    page.screenshot(path='/screens/schedule-preview.png')
    page.evaluate('scheduleFixture.failConfirm=true')
    page.get_by_role('button', name='Schedule email', exact=True).last.click()
    page.get_by_role('alert').wait_for()
    assert page.get_by_text('Review your email', exact=True).is_visible()
    page.evaluate('scheduleFixture.failConfirm=false')
    page.get_by_role('button', name='Schedule email', exact=True).last.click()
    page.get_by_role('button', name='Change time').wait_for()
    page.get_by_role('button', name='Change time').click()
    page.get_by_label('Send date and time').fill('2026-12-01T09:00')
    page.get_by_role('button', name='Save new time').click()
    page.get_by_text('Send time updated.', exact=False).wait_for()
    page.set_viewport_size({'width': 375, 'height': 812})
    page.screenshot(path='/screens/schedule-mobile.png')
    assert page.locator('dialog').evaluate('(element) => element.scrollWidth <= element.clientWidth')
    page.get_by_role('button', name='Cancel schedule', exact=True).click()
    page.get_by_role('button', name='Keep schedule').click()
    assert page.evaluate('scheduleFixture.jobs[0].active')
    page.get_by_role('button', name='Cancel schedule', exact=True).click()
    page.get_by_role('button', name='Confirm cancellation').click()
    page.get_by_role('button', name='Prepare email preview').wait_for()
    assert not page.evaluate('scheduleFixture.jobs[0].active')
    page.get_by_text('Recent email history').click()
    page.get_by_text('Cancelled / closed', exact=True).wait_for()
    page.keyboard.press('Escape')
    assert not page.locator('dialog').is_visible()
    assert page.get_by_role('button', name='Schedule email', exact=True).evaluate('(element) => element === document.activeElement')
    page.get_by_role('button', name='Schedule email', exact=True).last.click()
    page.get_by_label('To', exact=True).wait_for()
    page.screenshot(path='/screens/schedule-mobile-form.png')
    assert page.locator('dialog').evaluate('(element) => element.scrollWidth <= element.clientWidth')
    assert not errors, errors
    print(json.dumps({'browser_checks': 10, 'desktop_mobile': True, 'save_failure_blocks_prepare': True, 'confirmation_conflict_keeps_preview': True, 'reschedule_cancel_history': True, 'escape_restores_focus': True, 'uncaught_errors': errors}))
    browser.close()
