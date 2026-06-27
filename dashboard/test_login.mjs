/**
 * Playwright login test — runs in a loop until login works end-to-end.
 * Usage: node test_login.mjs
 */
import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3001';
const LOGIN_URL = `${BASE_URL}/dashboard/login`;
const ADMIN_EMAIL = 'admin@sentinel.ai';
const ADMIN_PASSWORD = 'Admin@Sentinel123';

async function runTest() {
  const browser = await chromium.launch({ headless: true, slowMo: 100 });
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = [];

  // ── Test 1: Login page loads ─────────────────────────────────────────────────
  try {
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 15000 });
    const emailInput = await page.locator('input[name="email"]').count();
    const passInput = await page.locator('input[name="password"]').count();
    const btn = await page.locator('button[type="submit"]').count();
    const url = page.url();
    if (emailInput && passInput && btn) {
      results.push({ test: 'Login page loads', status: 'PASS', detail: `url=${url}` });
    } else {
      results.push({ test: 'Login page loads', status: 'FAIL', detail: `email=${emailInput} pass=${passInput} btn=${btn} url=${url}` });
    }
  } catch (e) {
    results.push({ test: 'Login page loads', status: 'FAIL', detail: e.message });
  }

  // ── Test 2: Invalid credentials show error ───────────────────────────────────
  try {
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.fill('input[name="email"]', 'wrong@test.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    const errText = await page.locator('text=/Incorrect|invalid|failed|Cannot reach/i').count();
    const url = page.url();
    if (errText > 0) {
      results.push({ test: 'Invalid creds show error', status: 'PASS', detail: `error elements: ${errText}` });
    } else {
      results.push({ test: 'Invalid creds show error', status: 'FAIL', detail: `No error shown, url: ${url}` });
    }
  } catch (e) {
    results.push({ test: 'Invalid creds show error', status: 'FAIL', detail: e.message });
  }

  // ── Test 3: Valid admin login succeeds ───────────────────────────────────────
  let loginSucceeded = false;
  try {
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);

    const networkLog = [];
    const allResponses = [];
    page.on('response', r => {
      const url = r.url();
      allResponses.push(url.replace('http://localhost:3001', '').split('?')[0]);
      if (url.includes('/login') || url.includes('/auth/') || url.includes('/dashboard')) {
        networkLog.push({ url: url.replace('http://localhost:3001', '').slice(0, 60), status: r.status() });
      }
    });

    await page.click('button[type="submit"]');
    // Wait for navigation away from login page OR timeout
    try {
      await page.waitForURL(url => !url.includes('/login'), { timeout: 10000 });
    } catch {
      // might still be on login page
    }
    // Give async callbacks time to complete
    await page.waitForTimeout(500);

    const urlAfter = page.url();
    const cookies = await context.cookies();
    const tokenCookie = cookies.find(c => c.name === 'sentinel_token');

    console.log('\n  [Login Debug]');
    console.log('  URL after submit:', urlAfter);
    console.log('  All request paths (last 5):', allResponses.slice(-5));
    console.log('  Filtered network log:', JSON.stringify(networkLog));
    console.log('  Token cookie:', tokenCookie ? `SET (domain=${tokenCookie.domain}, path=${tokenCookie.path})` : 'NOT SET');

    // Check for error message on page
    const bodyText = await page.textContent('body').catch(() => '');
    const hasError = /Incorrect|invalid|failed|Cannot reach/i.test(bodyText);

    if (hasError) {
      const errEl = await page.locator('span[style*="color: rgb(239"]').first().textContent().catch(() => '');
      results.push({ test: 'Admin login succeeds', status: 'FAIL', detail: `Error: "${errEl || 'see body'}", url: ${urlAfter}` });
    } else if (!urlAfter.includes('/login')) {
      loginSucceeded = true;
      results.push({ test: 'Admin login succeeds', status: 'PASS', detail: `Redirected to: ${urlAfter}` });
    } else {
      results.push({ test: 'Admin login succeeds', status: 'FAIL', detail: `Still on login, token: ${tokenCookie ? 'SET' : 'missing'}, url: ${urlAfter}` });
    }
  } catch (e) {
    results.push({ test: 'Admin login succeeds', status: 'FAIL', detail: e.message });
  }

  // ── Test 4: Dashboard renders after login ────────────────────────────────────
  try {
    if (loginSucceeded) {
      const heading = await page.locator('h1, h2, [class*="title"], [class*="header"]').first().textContent().catch(() => '');
      results.push({ test: 'Dashboard renders after login', status: 'PASS', detail: `At ${page.url()}, heading: "${heading.trim()}"` });
    } else {
      results.push({ test: 'Dashboard renders after login', status: 'FAIL', detail: 'Skipped — login did not succeed' });
    }
  } catch (e) {
    results.push({ test: 'Dashboard renders after login', status: 'FAIL', detail: e.message });
  }

  await browser.close();

  // ── Print report ─────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(65));
  console.log('  PLAYWRIGHT LOGIN TEST RESULTS');
  console.log('═'.repeat(65));
  let passed = 0;
  for (const r of results) {
    const icon = r.status === 'PASS' ? '✓' : '✗';
    console.log(`  ${icon} [${r.status}] ${r.test}`);
    console.log(`         → ${r.detail}`);
    if (r.status === 'PASS') passed++;
  }
  console.log('═'.repeat(65));
  console.log(`  ${passed}/${results.length} tests passed`);
  console.log('═'.repeat(65) + '\n');

  return { allPassed: passed === results.length, results };
}

// ── Loop until all pass ──────────────────────────────────────────────────────
let attempt = 0;
while (true) {
  attempt++;
  console.log(`\n${'─'.repeat(65)}`);
  console.log(`  ATTEMPT ${attempt}  —  ${new Date().toLocaleTimeString()}`);
  console.log('─'.repeat(65));

  try {
    const { allPassed, results } = await runTest();
    if (allPassed) {
      console.log('ALL TESTS PASSED — Login is working!\n');
      process.exit(0);
    }
    const failed = results.filter(r => r.status === 'FAIL');
    console.log(`${failed.length} test(s) still failing. Retrying in 5s...\n`);
    await new Promise(r => setTimeout(r, 5000));
  } catch (err) {
    console.error('Test runner crashed:', err.message);
    await new Promise(r => setTimeout(r, 5000));
  }
}
