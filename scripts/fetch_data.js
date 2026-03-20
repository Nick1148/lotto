/**
 * fetch_data.js - 동행복권 API에서 로또 역대 당첨번호 수집
 *
 * 실행 방법:
 *   node scripts/fetch_data.js
 *
 * 조건: Node.js 18+ (fetch 내장)
 * 결과: data/lotto_history.json 에 저장
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'lotto_history.json');
const DELAY_MS = 200;
const START_ROUND = 700;  // 2016년 초 ≈ 10년치

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/** 현재 최신 회차 추정 (2002-12-07 이후 매주 토요일) */
function estimateLatestRound() {
  const firstDrawDate = new Date('2002-12-07');
  const now = new Date();
  return Math.floor((now - firstDrawDate) / (7 * 24 * 60 * 60 * 1000)) + 1;
}

/** 메인 페이지에서 쿠키 획득 */
async function getCookies() {
  console.log('🍪 세션 쿠키 획득 중...');
  try {
    const res = await fetch('https://www.dhlottery.co.kr/gameInfo.do?method=lotto645', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
      }
    });
    const cookies = res.headers.get('set-cookie') || '';
    console.log(`  쿠키: ${cookies ? '획득 성공' : '없음 (쿠키 없이 진행)'}`);
    return cookies;
  } catch (e) {
    console.warn('  쿠키 획득 실패, 쿠키 없이 진행:', e.message);
    return '';
  }
}

/** 한 회차 데이터 가져오기 */
async function fetchRound(roundNo, cookies) {
  const url = `https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${roundNo}`;
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://www.dhlottery.co.kr/gameInfo.do?method=lotto645',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Accept-Language': 'ko-KR,ko;q=0.9',
      'X-Requested-With': 'XMLHttpRequest',
    };
    if (cookies) headers['Cookie'] = cookies;

    const res = await fetch(url, { headers });
    const text = await res.text();

    // JSON 파싱 시도
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // HTML이 반환된 경우 (세션 만료 등)
      return null;
    }

    if (!data || data.returnValue !== 'success') return null;

    return {
      drwNo: data.drwNo,
      drwNoDate: data.drwNoDate,
      numbers: [data.drwtNo1, data.drwtNo2, data.drwtNo3, data.drwtNo4, data.drwtNo5, data.drwtNo6],
      bonusNo: data.bnusNo,
      firstWinamnt: data.firstWinamnt,
      firstPrzwner: data.firstPrzwner
    };
  } catch (err) {
    return null;
  }
}

async function main() {
  console.log('🍀 로또 역대 당첨번호 수집 시작\n');

  const latestRound = estimateLatestRound();
  const totalRounds = latestRound - START_ROUND + 1;

  console.log(`📅 수집 범위: ${START_ROUND}회 ~ ${latestRound}회 (약 ${totalRounds}회차)`);
  console.log(`⏱️  예상 소요시간: 약 ${Math.ceil(totalRounds * DELAY_MS / 60000)}분\n`);

  // 쿠키 획득
  const cookies = await getCookies();
  await sleep(500);

  // 첫 회차 테스트
  console.log('\n🔍 API 연결 테스트...');
  const testResult = await fetchRound(START_ROUND, cookies);
  if (!testResult) {
    console.error(`\n❌ API 연결 실패!`);
    console.error('동행복권 사이트가 직접 API 접근을 차단하고 있습니다.\n');
    console.error('📌 대안: 수동으로 데이터를 다운로드하세요.');
    console.error('   1. https://www.dhlottery.co.kr/gameInfo.do?method=lotto645Info 방문');
    console.error('   2. 당첨번호 통계 엑셀 다운로드');
    console.error('   3. Excel → JSON 변환 후 data/lotto_history.json 교체');
    console.error('\n💡 또는 Puppeteer를 사용하세요:');
    console.error('   npm install puppeteer');
    console.error('   그 후 scripts/fetch_puppeteer.js 실행\n');
    console.error('현재는 내장 폴백 통계를 사용합니다. 앱은 정상 작동합니다.');
    process.exit(0);
  }

  console.log(`  ✅ 테스트 성공: ${testResult.drwNo}회 (${testResult.drwNoDate})\n`);

  const results = [testResult];
  let success = 1;
  let fail = 0;
  let consecutiveFail = 0;

  for (let round = START_ROUND + 1; round <= latestRound; round++) {
    process.stdout.write(`\r  진행: ${round - START_ROUND + 1}/${totalRounds} (${round}회) [✓${success} ✗${fail}]`);

    const data = await fetchRound(round, cookies);
    if (data) {
      results.push(data);
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

    await sleep(DELAY_MS);
  }

  console.log(`\n\n✅ 수집 완료: ${success}회차 성공, ${fail}회차 실패`);

  // 저장
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2), 'utf8');
  const fileSizeKB = (fs.statSync(OUTPUT_PATH).size / 1024).toFixed(1);
  console.log(`💾 저장: ${OUTPUT_PATH} (${fileSizeKB} KB)`);
  console.log('\n🎉 완료! 브라우저를 새로고침하면 실제 데이터가 적용됩니다.');
}

main().catch(err => {
  console.error('\n❌ 오류:', err.message);
  process.exit(1);
});
