/**
 * fetch_puppeteer.js - Puppeteer를 사용한 로또 데이터 수집 (API 차단 우회용)
 *
 * 준비:
 *   npm install puppeteer
 *
 * 실행:
 *   node scripts/fetch_puppeteer.js
 *
 * fetch_data.js가 실패할 때 사용하세요.
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'lotto_history.json');
const DELAY_MS = 100;
const START_ROUND = 700;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function estimateLatestRound() {
  const firstDrawDate = new Date('2002-12-07');
  const now = new Date();
  return Math.floor((now - firstDrawDate) / (7 * 24 * 60 * 60 * 1000)) + 1;
}

async function main() {
  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch {
    console.error('❌ puppeteer가 설치되지 않았습니다.');
    console.error('  실행: npm install puppeteer');
    process.exit(1);
  }

  console.log('🍀 Puppeteer로 로또 데이터 수집 시작\n');

  const latestRound = estimateLatestRound();
  const totalRounds = latestRound - START_ROUND + 1;
  console.log(`📅 수집 범위: ${START_ROUND}회 ~ ${latestRound}회 (약 ${totalRounds}회차)`);

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  // 메인 페이지 방문으로 쿠키 획득
  console.log('🍪 동행복권 메인 페이지 방문...');
  await page.goto('https://www.dhlottery.co.kr/gameInfo.do?method=lotto645', {
    waitUntil: 'domcontentloaded', timeout: 30000
  });
  console.log('  완료!\n');

  const results = [];
  let success = 0;
  let fail = 0;
  let consecutiveFail = 0;

  for (let round = START_ROUND; round <= latestRound; round++) {
    process.stdout.write(`\r  진행: ${round - START_ROUND + 1}/${totalRounds} (${round}회) [✓${success} ✗${fail}]`);

    try {
      const url = `https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${round}`;
      const response = await page.evaluate(async (url) => {
        const res = await fetch(url, {
          headers: {
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': 'https://www.dhlottery.co.kr/gameInfo.do?method=lotto645'
          }
        });
        return res.json();
      }, url);

      if (response && response.returnValue === 'success') {
        results.push({
          drwNo: response.drwNo,
          drwNoDate: response.drwNoDate,
          numbers: [response.drwtNo1, response.drwtNo2, response.drwtNo3, response.drwtNo4, response.drwtNo5, response.drwtNo6],
          bonusNo: response.bnusNo,
          firstWinamnt: response.firstWinamnt,
          firstPrzwner: response.firstPrzwner
        });
        success++;
        consecutiveFail = 0;
      } else {
        fail++;
        consecutiveFail++;
        if (consecutiveFail >= 5) {
          console.log(`\n\n⚠️  5회 연속 실패 — ${round - 1}회가 최신 회차입니다.`);
          break;
        }
      }
    } catch {
      fail++;
      consecutiveFail++;
    }

    await sleep(DELAY_MS);
  }

  await browser.close();

  console.log(`\n\n✅ 수집 완료: ${success}회차 성공, ${fail}회차 실패`);

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2), 'utf8');
  const fileSizeKB = (fs.statSync(OUTPUT_PATH).size / 1024).toFixed(1);
  console.log(`💾 저장: ${OUTPUT_PATH} (${fileSizeKB} KB)`);
  console.log('\n🎉 완료! 브라우저를 새로고침하면 실제 데이터가 적용됩니다.');
}

main().catch(err => {
  console.error('\n❌ 오류:', err.message);
  process.exit(1);
});
