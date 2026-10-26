// 브라우저 스모크 테스트 (390px 모바일 화면)
// 실행: npm run test:e2e   (Playwright + Chromium 필요: npm i -D playwright && npx playwright install chromium)
// 외부 CDN(GA, Firebase, Kakao 등)은 차단한 상태로 핵심 기능만 검증한다.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..', '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

function serve() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); res.end('not found'); return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)));
}

const results = [];
async function check(name, fn) {
  try { await fn(); results.push(['✓', name]); }
  catch (e) { results.push(['✗', name + ' — ' + e.message]); }
}
function expect(cond, msg) { if (!cond) throw new Error(msg); }

(async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'ko-KR', serviceWorkers: 'block' });
  await ctx.route(url => !url.toString().startsWith(base), r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  const fresh = async (q = '') => {
    await page.goto(base + '/' + q, { waitUntil: 'load' });
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape'); // 출석 모달 닫기
    await page.waitForTimeout(900);
    await page.keyboard.press('Escape');
  };

  await fresh();

  await check('페이지 로드 시 JS 오류 없음', async () => expect(errors.length === 0, errors.join(' | ')));

  await check('390px 에서 가로 스크롤 없음', async () => {
    const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    expect(sw <= cw, `scrollWidth ${sw} > ${cw}`);
  });

  await check('최근 회차 표시', async () => {
    const t = await page.textContent('#latestRound');
    expect(/제 \d+회/.test(t), t);
  });

  await check('랜덤 버튼 연타해도 공은 6개', async () => {
    await page.click('#btn-random');
    await page.waitForTimeout(150);
    await page.click('#btn-random');
    await page.waitForTimeout(1500);
    const n = await page.$$eval('#balls-random .ball', els => els.length);
    expect(n === 6, `공 ${n}개`);
  });

  await check('생성 기록에 추가됨', async () => {
    const n = await page.$$eval('#historyList .history-item', els => els.length);
    expect(n >= 1, `기록 ${n}개`);
  });

  await check('탭 키보드 이동 (→)', async () => {
    await page.focus('#tabbtn-random');
    await page.keyboard.press('ArrowRight');
    const sel = await page.getAttribute('#tabbtn-frequent', 'aria-selected');
    const visible = await page.isVisible('#tab-frequent');
    expect(sel === 'true' && visible, `aria-selected=${sel}, visible=${visible}`);
  });

  await check('번호 필터 적용 시 오류 없음 + 제외 번호 미포함', async () => {
    await page.evaluate(() => { GameSystem.addClovers(20); renderCloverBalance(); });
    await page.click('#tab-random .number-filter-btn', { trial: false }).catch(() => {});
    await page.evaluate(() => activateTab('random'));
    await page.click('#tab-random .number-filter-btn');
    await page.waitForSelector('#numberFilterModal', { state: 'visible' });
    for (let n = 1; n <= 30; n++) await page.click(`#filterExcludeBalls button:nth-child(${n})`);
    await page.click('#filterApplyBtn');
    await page.click('#btn-random');
    await page.waitForTimeout(1500);
    const nums = await page.$$eval('#balls-random .ball', els => els.map(e => Number(e.textContent)));
    expect(nums.length === 6 && nums.every(n => n > 30), `결과 ${nums}`);
    expect(errors.length === 0, errors.join(' | '));
    await page.evaluate(() => { numberFilter.active = false; numberFilter.excludes.clear(); });
  });

  await check('주간 리포트 생성 시 오류 없음', async () => {
    await page.click('#btn-weekly-report');
    await page.waitForTimeout(300);
    expect(await page.isVisible('#weeklyReportResult'), '리포트 미표시');
    expect(errors.length === 0, errors.join(' | '));
  });

  await check('사주: 미래 날짜는 거부', async () => {
    await page.fill('#heroBirthDate', '2099-01-01');
    await page.click('#btn-saju-hero');
    await page.waitForTimeout(300);
    const toast = await page.textContent('.toast');
    expect(/미래/.test(toast), toast);
    expect(!(await page.isVisible('#loadingOverlay')), '로딩이 시작됨');
  });

  await check('궁합 딥링크 XSS 차단', async () => {
    await fresh('?chem=' + encodeURIComponent('<img src=x onerror=window.__xss=1>').slice(0, 200) + '&from=' + encodeURIComponent('<b>x'));
    await page.evaluate(() => { document.getElementById('chemName1').value = '<img src=x onerror=window.__xss=1>'; });
    await page.click('#btn-chemistry');
    await page.waitForTimeout(5500);
    const xss = await page.evaluate(() => window.__xss);
    const imgs = await page.$$eval('#result-chemistry img, #historyList img', els => els.length);
    expect(xss === undefined && imgs === 0, `xss=${xss}, img=${imgs}`);
    const names = await page.textContent('.chem-names');
    expect(names.includes('<img'), names);
  });

  await check('모달: Esc 로 닫힘', async () => {
    await page.click('#trophyBtn');
    expect(await page.isVisible('#achievementModal'), '열리지 않음');
    await page.keyboard.press('Escape');
    expect(!(await page.isVisible('#achievementModal')), '닫히지 않음');
  });

  await check('?tab=name 딥링크', async () => {
    await fresh('?tab=name');
    expect(await page.isVisible('#tab-name'), '이름 탭 미표시');
  });

  await check('전체 과정에서 JS 오류 없음', async () => expect(errors.length === 0, errors.join(' | ')));

  await browser.close();
  server.close();
  for (const [mark, name] of results) console.log(`${mark} ${name}`);
  const failed = results.filter(r => r[0] === '✗').length;
  console.log(failed ? `${failed}건 실패` : `전체 ${results.length}건 통과`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
