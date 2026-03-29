/**
 * daily-content.js — 오늘의 행운번호 + MBTI 랭킹 자동 생성 & 발송
 *
 * GitHub Actions에서 매일 08:00 KST 실행
 * - Telegram Bot API로 채널에 발송
 * - X(Twitter) API v2로 자동 트윗
 *
 * 환경변수:
 *   TELEGRAM_BOT_TOKEN  — @BotFather에서 발급
 *   TELEGRAM_CHAT_ID    — 채널 ID (예: @lotto_lucky_daily)
 *   X_API_KEY           — X API Key
 *   X_API_SECRET        — X API Secret
 *   X_ACCESS_TOKEN      — X Access Token
 *   X_ACCESS_SECRET     — X Access Token Secret
 */

const https = require('https');
const crypto = require('crypto');

// ─── 번호 생성 (서버 사이드) ─────────────────────────────
function hashDate(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function seededRandom(seed) {
  let s = seed;
  return function() {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function generateLuckyNumbers(seed) {
  const rng = seededRandom(seed);
  const pool = Array.from({ length: 45 }, (_, i) => i + 1);
  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 6).sort((a, b) => a - b);
}

function getMbtiRanking(dateStr) {
  const types = [
    'ISTJ','ISFJ','INFJ','INTJ','ISTP','ISFP','INFP','INTP',
    'ESTP','ESFP','ENFP','ENTP','ESTJ','ESFJ','ENFJ','ENTJ'
  ];
  const seed = hashDate(dateStr);
  const shuffled = [...types];
  let s = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getDailyFortune(dateStr) {
  const seed = hashDate(dateStr);
  const score = 60 + (seed % 40);
  const colors = ['빨강', '주황', '노랑', '초록', '파랑', '보라', '분홍', '금색'];
  const directions = ['동', '서', '남', '북', '동남', '동북', '서남', '서북'];
  const messages = [
    '오늘은 새로운 시작이 길한 날!',
    '직감을 믿으세요, 행운이 따릅니다',
    '꾸준함이 빛을 발하는 날입니다',
    '주변 사람에게 행운을 나누세요',
    '오늘의 도전이 내일의 행운으로!',
    '작은 변화가 큰 행운을 부릅니다',
    '웃는 얼굴에 복이 옵니다',
    '기다리던 좋은 소식이 올 수 있어요'
  ];
  return {
    score,
    color: colors[seed % colors.length],
    direction: directions[(seed >> 4) % directions.length],
    luckyNumber: (seed % 45) + 1,
    message: messages[(seed >> 8) % messages.length]
  };
}

// ─── 콘텐츠 생성 ─────────────────────────────────────────
function generateContent() {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayName = dayNames[today.getDay()];

  const month = today.getMonth() + 1;
  const date = today.getDate();

  const seed = hashDate(dateStr);
  const numbers = generateLuckyNumbers(seed);
  const mbtiRanking = getMbtiRanking(dateStr);
  const fortune = getDailyFortune(dateStr);

  const numbersStr = numbers.map(n => String(n).padStart(2, '0')).join(' ');
  const top3Mbti = mbtiRanking.slice(0, 3);
  const isSaturday = today.getDay() === 6;

  return { dateStr, month, date, dayName, numbers, numbersStr, top3Mbti, mbtiRanking, fortune, isSaturday };
}

function buildTelegramMessage(data) {
  const { month, date, dayName, numbersStr, top3Mbti, fortune, isSaturday } = data;

  let msg = `🍀 ${month}/${date}(${dayName}) 오늘의 행운번호\n\n`;
  msg += `🎱 ${numbersStr}\n\n`;
  msg += `📊 MBTI 행운 TOP 3\n`;
  msg += `🥇 ${top3Mbti[0]}  🥈 ${top3Mbti[1]}  🥉 ${top3Mbti[2]}\n\n`;
  msg += `✨ 오늘의 운세: ${fortune.score}점\n`;
  msg += `🎨 행운색: ${fortune.color} | 🧭 행운방향: ${fortune.direction}\n`;
  msg += `💬 ${fortune.message}\n\n`;

  if (isSaturday) {
    msg += `🔥 오늘은 추첨일! 클로버 2배 이벤트 중!\n\n`;
  }

  msg += `👉 나만의 번호 뽑으러 가기\nhttps://nick1148.site`;

  return msg;
}

function buildTweet(data) {
  const { month, date, dayName, numbersStr, top3Mbti, fortune, isSaturday } = data;

  let tweet = `🍀 ${month}/${date}(${dayName}) 오늘의 행운번호\n\n`;
  tweet += `🎱 ${numbersStr}\n\n`;
  tweet += `MBTI 행운 TOP3\n`;
  tweet += `🥇${top3Mbti[0]} 🥈${top3Mbti[1]} 🥉${top3Mbti[2]}\n\n`;
  tweet += `운세 ${fortune.score}점 | ${fortune.color} | ${fortune.message}\n\n`;

  if (isSaturday) tweet += `🔥 추첨일 클로버 2배!\n`;

  tweet += `👉 nick1148.site\n\n`;
  tweet += `#로또 #로또번호 #오늘의운세 #MBTI #행운번호 #로또예상`;

  // 280자 제한 체크
  if (tweet.length > 280) {
    tweet = tweet.slice(0, 277) + '...';
  }

  return tweet;
}

// ─── API 호출 ────────────────────────────────────────────
function httpRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function sendTelegram(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.log('⚠️ Telegram 환경변수 미설정 — 스킵');
    return false;
  }

  const body = JSON.stringify({
    chat_id: chatId,
    text: message,
    parse_mode: 'HTML',
    disable_web_page_preview: false
  });

  const result = await httpRequest({
    hostname: 'api.telegram.org',
    path: `/bot${token}/sendMessage`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  }, body);

  if (result.status === 200) {
    console.log('✅ Telegram 발송 성공');
    return true;
  } else {
    console.error('❌ Telegram 발송 실패:', result.data);
    return false;
  }
}

// X(Twitter) OAuth 1.0a 서명
function generateOAuthSignature(method, url, params, consumerSecret, tokenSecret) {
  const sortedParams = Object.keys(params).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
  const baseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  return crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
}

async function postTweet(text) {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    console.log('⚠️ X(Twitter) 환경변수 미설정 — 스킵');
    return false;
  }

  const url = 'https://api.twitter.com/2/tweets';
  const oauthParams = {
    oauth_consumer_key: apiKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: '1.0'
  };

  const signature = generateOAuthSignature('POST', url, oauthParams, apiSecret, accessSecret);
  oauthParams.oauth_signature = signature;

  const authHeader = 'OAuth ' + Object.keys(oauthParams).sort()
    .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
    .join(', ');

  const body = JSON.stringify({ text });

  const result = await httpRequest({
    hostname: 'api.twitter.com',
    path: '/2/tweets',
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  }, body);

  if (result.status === 201) {
    console.log('✅ X(Twitter) 트윗 성공:', result.data?.data?.id);
    return true;
  } else {
    console.error('❌ X(Twitter) 트윗 실패:', result.data);
    return false;
  }
}

// ─── 메인 실행 ───────────────────────────────────────────
async function main() {
  console.log('🚀 일일 콘텐츠 생성 시작...');

  const data = generateContent();
  console.log(`📅 ${data.dateStr} (${data.dayName})`);
  console.log(`🎱 오늘의 번호: ${data.numbersStr}`);
  console.log(`🏆 MBTI TOP3: ${data.top3Mbti.join(', ')}`);
  console.log(`✨ 운세: ${data.fortune.score}점`);

  // Telegram
  const telegramMsg = buildTelegramMessage(data);
  console.log('\n--- Telegram 메시지 ---');
  console.log(telegramMsg);
  await sendTelegram(telegramMsg);

  // X (Twitter)
  const tweet = buildTweet(data);
  console.log('\n--- X 트윗 ---');
  console.log(tweet);
  console.log(`(${tweet.length}/280자)`);
  await postTweet(tweet);

  console.log('\n✅ 일일 콘텐츠 발송 완료');
}

main().catch(err => {
  console.error('❌ 오류:', err);
  process.exit(1);
});
