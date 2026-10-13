import json
from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser=p.chromium.launch(args=['--no-sandbox'])
    page=browser.new_page(); errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('dialog',lambda d:d.accept())
    def route(request):
        name=request.request.url.rsplit('/',1)[-1]
        file=Path('/tests')/name
        if file.is_file(): request.fulfill(path=str(file),content_type='text/javascript')
        else: request.fulfill(body='<html><div id="root"></div><script src="/editor.js"></script></html>',content_type='text/html')
    page.route('http://fixture/**',route)
    page.goto('http://fixture/')
    field=page.get_by_label('Draft file number');field.wait_for();field.fill('edited-before-preview')
    page.get_by_role('button',name='Report',exact=True).click()
    page.get_by_role('button',name='Preview Report',exact=True).click()
    page.get_by_text('Preview file: edited-before-preview',exact=True).wait_for()
    assert page.evaluate('editorFixture.events')==['saving','saved','preview']
    page.get_by_role('button',name='Close test preview').click()
    page.evaluate('editorFixture.fail=true;editorFixture.events=[]')
    field.fill('retained-conflicting-draft')
    page.get_by_role('button',name='Report',exact=True).click()
    page.get_by_role('button',name='Preview Report',exact=True).click()
    page.get_by_role('alert').wait_for()
    assert field.input_value()=='retained-conflicting-draft'
    assert page.get_by_role('dialog').count()==0
    assert page.get_by_role('button',name='Download unsaved draft').is_visible()
    assert page.evaluate('editorFixture.events')==['saving']
    page.evaluate('editorFixture.fail=false')
    page.get_by_role('button',name='Save Changes',exact=True).click()
    page.wait_for_function('editorFixture.report.fileNumber === "retained-conflicting-draft"')
    assert page.get_by_role('alert').count()==0
    assert not errors,errors
    print(json.dumps({'editor_checks':3,'save_before_preview':True,'conflict_retains_draft':True,'retry_succeeds':True,'uncaught_errors':len(errors)}))
    browser.close()
