# 🍀 로또 번호 예상기

한국 로또(6/45) 번호를 4가지 방식으로 생성하는 웹 앱입니다.

---

## 빠른 시작

### 방법 1: 바로 실행 (폴백 데이터 사용)
`index.html`을 브라우저에서 열면 바로 사용 가능합니다.
단, 자주나온/안나온 번호는 내장된 근사 통계를 사용합니다.

### 방법 2: 실제 데이터로 실행 (권장)

**1단계: 로또 역대 데이터 수집** (Node.js 18+ 필요)
```bash
node scripts/fetch_data.js
```
- 약 500회차 데이터를 수집합니다 (약 1~2분 소요)
- `data/lotto_history.json`에 저장됩니다

**2단계: 로컬 서버 실행**
```bash
# Python 3
python -m http.server 8000

# 또는 Node.js (http-server)
npx http-server -p 8000
```

**3단계: 브라우저에서 접속**
```
http://localhost:8000
```

---

## 기능

| 탭 | 방식 | 설명 |
|---|---|---|
| 🎲 완전 랜덤 | Fisher-Yates 셔플 | 1~45 완전 무작위 |
| 🔥 자주 나온 | 빈도 상위 15개 풀 | 최근 10년 자주 출현한 번호 |
| ❄️ 안 나온 | 빈도 하위 15개 풀 | 최근 10년 드물게 출현한 번호 |
| ✨ 내 사주 | 60간지 LCG | 생년월일 기반 결정론적 번호 |

---

## 로또 공 색상

| 범위 | 색상 |
|------|------|
| 1~10 | 🟡 노란색 |
| 11~20 | 🔵 파란색 |
| 21~30 | 🔴 빨간색 |
| 31~40 | ⚫ 회색 |
| 41~45 | 🟢 초록색 |

---

## 사주 계산 방식

1. 생년월일(+태어난 시간)에서 **연주/월주/일주/시주** 추출
2. 각 기둥의 **천간·지지** 수치 조합으로 씨드(seed) 생성
3. **LCG(선형 합동 생성기)** 로 결정론적 난수 생성
4. Fisher-Yates 셔플로 1~45 중 6개 선택

> ⚠️ 사주 번호는 재미 목적이며, 당첨을 보장하지 않습니다.

---

## 파일 구조

```
로또번호/
├── index.html              ← 메인 앱
├── css/style.css           ← 스타일 (공 색상, 애니메이션)
├── js/
│   ├── app.js              ← UI 이벤트, 애니메이션
│   ├── lotto.js            ← 4종 번호 생성 알고리즘
│   ├── saju.js             ← 60간지 사주 계산
│   └── data.js             ← JSON 로드 + 빈도 분석
├── data/
│   └── lotto_history.json  ← 수집된 당첨번호 (fetch_data.js 실행 후 채워짐)
└── scripts/
    └── fetch_data.js       ← 동행복권 API 데이터 수집 스크립트
```

---

## GitHub Pages 배포

```bash
git init
git add .
git commit -m "로또 번호 예상기 초기 배포"
git branch -M main
git remote add origin https://github.com/USERNAME/lotto-app.git
git push -u origin main
```

GitHub 저장소 Settings → Pages → Source: `main` 브랜치 선택 후 활성화.

---

## 주의사항

- 이 앱은 **재미 목적**으로 제작되었습니다
- 로또는 완전한 확률 게임으로, 번호 생성 방식과 무관하게 당첨 확률은 동일합니다
- 과도한 로또 구매를 삼가세요
- 데이터 출처: [동행복권](https://www.dhlottery.co.kr)
