const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'lotto_history.json');
const PRIMARY_API = 'https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=';
const BACKUP_API = 'https://lotto.oot.kr/api/';

function httpGet(url, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*'
      },
      timeout
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400) {
        reject(new Error('redirect ' + res.statusCode));
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error('HTTP ' + res.statusCode));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function fetchFromPrimary(drwNo) {
  const raw = await httpGet(PRIMARY_API + drwNo);
  const data = JSON.parse(raw);
  if (data.returnValue === 'fail') return null;
  return {
    drwNo: data.drwNo,
    drwNoDate: data.drwNoDate,
    numbers: [data.drwtNo1, data.drwtNo2, data.drwtNo3, data.drwtNo4, data.drwtNo5, data.drwtNo6].sort((a, b) => a - b),
    bonusNo: data.bnusNo
  };
}

async function fetchFromBackup(drwNo) {
  const raw = await httpGet(BACKUP_API + drwNo);
  const data = JSON.parse(raw);
  if (!data || !data.numbers || data.numbers.length < 6) return null;
  return {
    drwNo: data.round || drwNo,
    drwNoDate: data.date || '',
    numbers: data.numbers.slice(0, 6).sort((a, b) => a - b),
    bonusNo: data.bonus || data.numbers[6] || null
  };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchDraw(drwNo) {
  for (let i = 0; i < 3; i++) {
    try {
      console.log('  [try ' + (i+1) + '/3] dhlottery...');
      const result = await fetchFromPrimary(drwNo);
      return result;
    } catch (e) {
      console.log('    fail: ' + e.message);
      if (i < 2) await sleep(3000);
    }
  }
  for (let i = 0; i < 2; i++) {
    try {
      console.log('  [backup ' + (i+1) + '/2] lotto.oot.kr...');
      const result = await fetchFromBackup(drwNo);
      return result;
    } catch (e) {
      console.log('    fail: ' + e.message);
      if (i < 1) await sleep(2000);
    }
  }
  return undefined;
}

async function main() {
  const history = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const lastDrwNo = history[history.length - 1].drwNo;
  console.log('current last: ' + lastDrwNo + '\n');

  let added = 0;
  let drwNo = lastDrwNo + 1;

  while (added < 10) {
    console.log(drwNo + ' fetching...');
    const result = await fetchDraw(drwNo);
    if (result === null) { console.log('  -> not yet drawn\n'); break; }
    if (result === undefined) { console.log('  -> API failed\n'); break; }
    if (result.numbers.length !== 6 || result.numbers.some(n => n < 1 || n > 45)) {
      console.log('  -> invalid data\n'); break;
    }
    history.push(result);
    added++;
    console.log('  OK: ' + result.numbers.join(',') + ' + bonus ' + result.bonusNo + '\n');
    drwNo++;
    await sleep(2000);
  }

  if (added > 0) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(history, null, 2), 'utf8');
    console.log('added ' + added + ' draws. total ' + history.length);
  } else {
    console.log('no new draws.');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
