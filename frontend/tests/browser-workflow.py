"""Run with Playwright in an isolated container with --network none.
Mount workflow.js and this file under /tests. No credentials or real records.
"""
import json
from playwright.sync_api import sync_playwright

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(args=['--no-sandbox'])
    page = browser.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.set_content('<html><body><div id="root"></div></body></html>')
    page.add_script_tag(path='/tests/workflow.js')
    field = page.locator('fieldset input[placeholder="Enter annexure header"]')
    field.wait_for()
    page.wait_for_function('!document.querySelector("fieldset").disabled')
    field.press_sequentially('abcdefghijklmnopqrst', delay=10)
    page.wait_for_function('fixture.writes.length === 1 && fixture.activeWrites === 0')
    assert page.evaluate('fixture.photos[0].annexureHeader') == 'abcdefghijklmnopqrst'
    assert page.evaluate('fixture.form.additionalPhotos[0].annexureHeader') == 'abcdefghijklmnopqrst'

    # New input during a slow save becomes exactly one subsequent save.
    page.evaluate('fixture.writeDelay=1000')
    field.fill('first')
    page.wait_for_function('fixture.activeWrites === 1')
    field.fill('newest')
    page.wait_for_function('fixture.photos[0].annexureHeader === "newest" && fixture.activeWrites === 0')
    assert page.evaluate('fixture.peakWrites') == 1

    # A failed request remains visible and can be retried with no lost input.
    page.evaluate('fixture.failWrites=true;fixture.writeDelay=20')
    field.fill('retained draft')
    page.get_by_role('button', name='Retry save').wait_for()
    assert field.input_value() == 'retained draft'
    page.evaluate('fixture.failWrites=false')
    page.get_by_role('button', name='Retry save').click()
    page.wait_for_function('fixture.photos[0].annexureHeader === "retained draft" && !document.querySelector("fieldset").disabled')

    # Section navigation flushes the last character and remount reloads it.
    field.fill('last edit before leaving')
    page.evaluate('fixture.render("other")')
    page.wait_for_function('fixture.photos[0].annexureHeader === "last edit before leaving"')
    page.evaluate('fixture.render("photos")')
    page.wait_for_function('document.querySelector("fieldset") && !document.querySelector("fieldset").disabled')
    assert field.input_value() == 'last edit before leaving'

    # A failed initial photo read must not erase the report's existing array.
    page.evaluate('fixture.render("other")')
    page.get_by_text('Another section', exact=True).wait_for()
    page.evaluate('fixture.form.additionalPhotos=[{annexureHeader:"fresh server record"}];fixture.failReads=true;fixture.render("photos")')
    page.get_by_role('button', name='Retry loading photos').wait_for()
    page.evaluate('fixture.saveReport()')
    assert page.evaluate('fixture.savedReport.additionalPhotos[0].annexureHeader') == 'fresh server record'
    assert page.evaluate('document.querySelector("fieldset").disabled')
    page.evaluate('fixture.failReads=false')
    page.get_by_role('button', name='Retry loading photos').click()
    page.wait_for_function('!document.querySelector("fieldset").disabled')

    page.evaluate('fixture.render("dashboard")')
    page.wait_for_function('fixture.listRequests.length === 1')
    def resolve(index, label, count=1):
        page.evaluate('''([index,label,count]) => fixture.listRequests[index].resolve({
          bundles:[{property:{id:label,address:{fullAddress:label},fileNumber:label}}],totalCount:count
        })''', [index, label, count])
    resolve(0, 'Initial report')
    search = page.get_by_placeholder('Search...').first
    search.wait_for()
    search.fill('old query')
    page.wait_for_function('fixture.listRequests.length === 2')
    search.fill('new query')
    page.wait_for_function('fixture.listRequests.length === 3')
    assert page.evaluate('fixture.listRequests[1].signal.aborted')
    resolve(2, 'New result')
    page.get_by_text('New result', exact=True).first.wait_for()
    resolve(1, 'Obsolete result')
    page.wait_for_timeout(100)
    assert page.get_by_text('Obsolete result', exact=True).count() == 0
    assert not page.evaluate('fixture.requests.some(([url])=>/alliance|inspection-reports/.test(url))')
    assert errors == [], errors
    browser.close()
    print(json.dumps({'workflow_checks': 7, 'rapid_edits': 20, 'rapid_edit_writes': 1,
                      'peak_concurrent_photo_writes': 1, 'uncaught_browser_errors': 0}))
