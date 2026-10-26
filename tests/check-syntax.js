// 모든 JS 파일 문법 검사 + JSON 파일 파싱 검사 (빌드 단계가 없으므로 최소한의 정적 검증)
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const jsFiles = ['sw.js',
  ...fs.readdirSync(path.join(root, 'js')).filter(f => f.endsWith('.js')).map(f => 'js/' + f),
  ...fs.readdirSync(path.join(root, 'scripts')).filter(f => f.endsWith('.js')).map(f => 'scripts/' + f)];
const jsonFiles = ['manifest.json', 'vercel.json', 'data/lotto_history.json', 'lang/ko.json', 'lang/en.json'];

let failed = 0;
for (const f of jsFiles) {
  try {
    execFileSync(process.execPath, ['--check', path.join(root, f)], { stdio: 'pipe' });
  } catch (e) {
    failed++;
    console.error(`✗ ${f}\n${e.stderr}`);
  }
}
for (const f of jsonFiles) {
  try {
    JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
  } catch (e) {
    failed++;
    console.error(`✗ ${f}: ${e.message}`);
  }
}
// ko/en 번역 키 일치 여부
const ko = JSON.parse(fs.readFileSync(path.join(root, 'lang/ko.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(root, 'lang/en.json'), 'utf8'));
const missing = Object.keys(ko).filter(k => !(k in en)).concat(Object.keys(en).filter(k => !(k in ko)));
if (missing.length) { failed++; console.error('✗ ko/en 번역 키 불일치:', missing); }

if (failed) { console.error(`${failed} 건 실패`); process.exit(1); }
console.log(`✓ 문법/JSON 검사 통과 (JS ${jsFiles.length}개, JSON ${jsonFiles.length}개)`);
