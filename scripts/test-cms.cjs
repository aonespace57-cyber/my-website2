const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const files = fs.readdirSync(path.join(root, 'content')).filter(name => name.endsWith('.json'));
for (const name of files) {
  const data = JSON.parse(fs.readFileSync(path.join(root, 'content', name), 'utf8'));
  const photos = data.photos || Object.values(data);
  for (const photo of photos) {
    assert.ok(fs.existsSync(path.join(root, photo.image)), `${name}: missing ${photo.image}`);
  }
}

const server = http.createServer((req, res) => {
  let file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!file.startsWith(root + path.sep) && file !== root) {
    res.writeHead(403).end();
    return;
  }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png' };
  if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', types[path.extname(file).toLowerCase()] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    const base = `http://127.0.0.1:${server.address().port}`;
    // Avoid third-party font requests in this local functional test.
    await page.route('https://fonts.**/*', route => route.abort());
    const load = async () => {
      await page.goto(base, { waitUntil: 'networkidle' });
      await page.evaluate(() => window.loadManagedPhotos());
    };
    await load();
    for (const name of files.filter(name => name !== 'featured.json')) {
      const data = JSON.parse(fs.readFileSync(path.join(root, 'content', name), 'utf8'));
      const selector = `[data-photos="${name.replace('.json', '')}"]`;
      assert.equal(await page.locator(selector + ' img').count(), data.photos.length, name);
    }
    assert.equal(await page.locator('.showcase-grid > .model-gallery-card').count(), 5);
    await page.locator('[data-case-tab="block"]').click();
    assert.equal(await page.locator('#case-viewer-count').innerText(), '1 / 3');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#case-viewer-count').innerText(), '2 / 3');
    await page.keyboard.press('Escape');

    const changed = { photos: [
      { image: '/images/목공/한방유비스.png', alt: 'Changed first', caption: '<b>Plain text</b>' },
      { image: '/images/목공/아전.png', alt: 'Changed second' },
    ] };
    await page.route('**/content/model-woodwork.json', route => route.fulfill({ json: changed }));
    await load();
    const gallery = page.locator('[data-photos="model-woodwork"]');
    assert.equal(await gallery.locator('img').count(), 2);
    assert.equal(await gallery.locator('img').first().getAttribute('alt'), 'Changed first');
    assert.equal(await gallery.locator('.model-caption b').count(), 0);
    await gallery.locator('img').first().click();
    assert.equal(await page.locator('#lightbox-image').getAttribute('alt'), 'Changed first');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#lightbox-image').getAttribute('alt'), 'Changed second');
    await page.keyboard.press('Escape');

    await page.route('**/content/case-block.json', route => route.fulfill({ json: { photos: [] } }));
    await load();
    await page.locator('[data-case-tab="block"]').click();
    assert.equal(await page.locator('#case-viewer-placeholder').innerText(), '사진 준비 중');
    assert.equal(await page.locator('#case-viewer-next').isDisabled(), true);
    await page.keyboard.press('Escape');

    await page.route('**/content/model-maxima.json', route => route.fulfill({ status: 503, body: '' }));
    await load();
    assert.equal(await page.locator('[data-photos="model-maxima"] img').count(), 3);
    await page.route('**/content/model-block.json', route => route.fulfill({ json: { photos: [{ image: 'javascript:alert(1)', alt: 'invalid' }] } }));
    await load();
    assert.equal(await page.locator('[data-photos="model-block"] img').count(), 6);

    for (const width of [390, 720]) {
      await page.setViewportSize({ width, height: 844 });
      const columns = await page.locator('.model-gallery-card .color-gallery').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).gridTemplateColumns.split(' ').length));
      assert.ok(columns.every(count => count === 2), `mobile ${width}: ${columns}`);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    await page.locator('input[name="name"]').fill('Test');
    await page.locator('input[name="email"]').fill('test@example.com');
    let confirmed = false;
    page.once('dialog', async dialog => { confirmed = true; await dialog.dismiss(); });
    await page.locator('.submit-button').click();
    assert.ok(confirmed);
    assert.equal(new URL(page.url()).host, new URL(base).host);

    let submissionCount = 0;
    let submissionResult = 'success';
    let expectedAttachments = [];
    await page.route('https://formsubmit.co/**', async route => {
      submissionCount++;
      assert.equal(route.request().url(), expectedAttachments.length
        ? 'https://formsubmit.co/aonespace@naver.com'
        : 'https://formsubmit.co/ajax/aonespace@naver.com');
      const request = route.request();
      const data = await new Response(request.postDataBuffer(), {
        headers: { 'Content-Type': request.headers()['content-type'] },
      }).formData();
      assert.equal(data.get('_captcha'), 'false');
      const attachments = [...data.entries()].filter(([key]) => key.startsWith('attachment'));
      assert.equal(attachments.length, expectedAttachments.length);
      for (let index = 0; index < expectedAttachments.length; index++) {
        const file = data.get(index ? `attachment${index + 1}` : 'attachment');
        assert.equal(file.name, expectedAttachments[index].name);
        assert.deepEqual(Buffer.from(await file.arrayBuffer()), expectedAttachments[index].buffer);
      }
      await new Promise(resolve => setTimeout(resolve, 200));
      if (submissionResult === 'network') return route.abort();
      if (expectedAttachments.length) {
        if (submissionResult !== 'success') return route.fulfill({ status: 500, body: 'Test error' });
        const callback = data.get('_next');
        assert.equal(new URL(callback).origin, base);
        assert.equal(new URL(callback).pathname, '/inquiry-complete.html');
        // A page outside the submission iframe cannot spoof success.
        await page.evaluate(() => window.postMessage({ type: 'inquiry-complete' }, location.origin));
        assert.equal(await page.locator('.form-status').getAttribute('data-state'), 'sending');
        return route.fulfill({ status: 302, headers: { location: callback } });
      }
      return route.fulfill({ json: { success: submissionResult === 'success' ? 'true' : 'false' } });
    });
    page.once('dialog', async dialog => {
      assert.equal(dialog.message(), '전송하시겠습니까?');
      await dialog.accept();
    });
    await page.locator('.submit-button').click();
    await page.evaluate(() => {
      document.querySelector('.contact-form').dispatchEvent(new Event('submit', { cancelable: true }));
    });
    await page.waitForFunction(() => document.querySelector('.form-status').dataset.state === 'success');
    assert.equal(submissionCount, 1);
    assert.equal(new URL(page.url()).host, new URL(base).host);
    assert.equal(await page.locator('.submit-button').isEnabled(), true);

    const fileInput = page.locator('#inquiry-files');
    await fileInput.setInputFiles({ name: 'too-large.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(10000001) });
    assert.equal(await fileInput.evaluate(node => node.checkValidity()), false);
    await page.locator('#clear-attachments').click();
    assert.equal(await fileInput.evaluate(node => node.checkValidity()), true);
    await fileInput.setInputFiles({ name: 'blocked.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('test') });
    assert.equal(await fileInput.evaluate(node => node.checkValidity()), false);
    expectedAttachments = [
      { name: 'drawing.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') },
      { name: 'reference.png', mimeType: 'image/png', buffer: Buffer.from([137, 80, 78, 71, 0, 255]) },
    ];
    await fileInput.setInputFiles(expectedAttachments);
    await page.locator('input[name="name"]').fill('Attachment test');
    await page.locator('input[name="email"]').fill('test@example.com');
    page.once('dialog', dialog => dialog.accept());
    await page.locator('.submit-button').click();
    await page.waitForFunction(() => document.querySelector('.form-status').dataset.state === 'success');
    assert.equal(await fileInput.evaluate(node => node.files.length), 0);
    assert.equal(await page.locator('#attachment-summary').innerText(), '');

    await page.clock.install();
    for (const result of ['failure', 'network']) {
      submissionResult = result;
      await fileInput.setInputFiles(expectedAttachments);
      await page.locator('input[name="name"]').fill('Keep name');
      await page.locator('input[name="email"]').fill('test@example.com');
      await page.locator('textarea[name="message"]').fill('Keep inquiry');
      page.once('dialog', dialog => dialog.accept());
      await page.locator('.submit-button').click();
      await page.waitForTimeout(500);
      assert.equal(await page.locator('.form-status').getAttribute('data-state'), 'sending');
      await page.clock.fastForward(120001);
      await page.waitForFunction(() => document.querySelector('.form-status').dataset.state === 'error');
      assert.equal(await page.locator('textarea[name="message"]').inputValue(), 'Keep inquiry');
      assert.equal(await page.locator('input[name="name"]').inputValue(), 'Keep name');
      assert.equal(await fileInput.evaluate(node => node.files.length), 2);
      assert.equal(await page.locator('.submit-button').isEnabled(), true);
      assert.equal(new URL(page.url()).host, new URL(base).host);
      assert.equal(await page.locator('iframe[name^="inquiry-"]').count(), 0);
    }
    assert.deepEqual(errors, []);
    console.log('PASS: photo management and mobile layout; inquiry cancellation, multipart file bytes, multiple files, size/type limits, AJAX success, duplicate prevention, server/network failures, preserved inputs and attachments, no navigation. No real email sent.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
