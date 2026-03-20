/**
 * saju.js - 사주(四柱) 계산 모듈
 * 천간(天干) 10개 + 지지(地支) 12개 = 60간지 기반
 */

const SajuCalculator = (() => {
  // 천간 (天干) - 10개
  const CHEONGAN = [
    { ko: '갑', hanja: '甲', romanized: 'Gap', element: '목', yin_yang: '양', value: 1 },
    { ko: '을', hanja: '乙', romanized: 'Eul', element: '목', yin_yang: '음', value: 2 },
    { ko: '병', hanja: '丙', romanized: 'Byeong', element: '화', yin_yang: '양', value: 3 },
    { ko: '정', hanja: '丁', romanized: 'Jeong', element: '화', yin_yang: '음', value: 4 },
    { ko: '무', hanja: '戊', romanized: 'Mu', element: '토', yin_yang: '양', value: 5 },
    { ko: '기', hanja: '己', romanized: 'Gi', element: '토', yin_yang: '음', value: 6 },
    { ko: '경', hanja: '庚', romanized: 'Gyeong', element: '금', yin_yang: '양', value: 7 },
    { ko: '신', hanja: '辛', romanized: 'Sin', element: '금', yin_yang: '음', value: 8 },
    { ko: '임', hanja: '壬', romanized: 'Im', element: '수', yin_yang: '양', value: 9 },
    { ko: '계', hanja: '癸', romanized: 'Gye', element: '수', yin_yang: '음', value: 10 }
  ];

  // 지지 (地支) - 12개
  const JIJI = [
    { ko: '자', hanja: '子', romanized: 'Ja', animal: '쥐', value: 1 },
    { ko: '축', hanja: '丑', romanized: 'Chuk', animal: '소', value: 2 },
    { ko: '인', hanja: '寅', romanized: 'In', animal: '호랑이', value: 3 },
    { ko: '묘', hanja: '卯', romanized: 'Myo', animal: '토끼', value: 4 },
    { ko: '진', hanja: '辰', romanized: 'Jin', animal: '용', value: 5 },
    { ko: '사', hanja: '巳', romanized: 'Sa', animal: '뱀', value: 6 },
    { ko: '오', hanja: '午', romanized: 'O', animal: '말', value: 7 },
    { ko: '미', hanja: '未', romanized: 'Mi', animal: '양', value: 8 },
    { ko: '신', hanja: '申', romanized: 'Sin', animal: '원숭이', value: 9 },
    { ko: '유', hanja: '酉', romanized: 'Yu', animal: '닭', value: 10 },
    { ko: '술', hanja: '戌', romanized: 'Sul', animal: '개', value: 11 },
    { ko: '해', hanja: '亥', romanized: 'Hae', animal: '돼지', value: 12 }
  ];

  /**
   * 연주(年柱) 계산 - 갑자년 기준 (1984년)
   */
  function calcYearPillar(year) {
    // 갑자년 = 1984년을 기준으로
    const offset = year - 1984;
    const ganIdx = ((offset % 10) + 10) % 10;
    const jiIdx = ((offset % 12) + 12) % 12;
    return { gan: CHEONGAN[ganIdx], ji: JIJI[jiIdx] };
  }

  /**
   * 월주(月柱) 계산
   * 연간에 따라 월간이 달라짐
   */
  function calcMonthPillar(year, month) {
    // 월지: 1월=인(寅=2), 2월=묘(卯=3), ... 순으로 배열
    // 인월(寅月)이 음력 1월이나 양력 기준 간략화
    const monthJiBase = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1]; // 1월~12월 → 인~축
    const jiIdx = monthJiBase[month - 1];

    // 연간에 따른 월간 기준 계산
    // 갑기년: 병인월 시작, 을경년: 무인월 시작, ...
    const yearGanIdx = (((year - 1984) % 10) + 10) % 10;
    const monthGanBase = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0]; // 갑~계 연에 대응하는 인월 간
    const ganBase = monthGanBase[yearGanIdx];
    const ganIdx = (ganBase + (month - 1)) % 10;

    return { gan: CHEONGAN[ganIdx], ji: JIJI[jiIdx] };
  }

  /**
   * 일주(日柱) 계산
   * 갑자일 기준: 1900-01-01 = 갑술일 (간지 41번째)
   */
  function calcDayPillar(year, month, day) {
    // 기준일: 2000-01-01 = 갑신일 (간 0=갑, 지 8=신 → 인덱스 0,8)
    const base = new Date(2000, 0, 1);
    const target = new Date(year, month - 1, day);
    const diffDays = Math.round((target - base) / (1000 * 60 * 60 * 24));

    // 기준: 2000-01-01 갑신일 → 간=갑(0), 지=신(8)
    const ganIdx = ((diffDays % 10) + 10) % 10;
    const jiIdx = ((diffDays + 8) % 12 + 12) % 12;

    return { gan: CHEONGAN[ganIdx], ji: JIJI[jiIdx] };
  }

  /**
   * 시주(時柱) 계산 (-1이면 모름)
   */
  function calcHourPillar(dayGanIdx, hourIdx) {
    if (hourIdx < 0) return null;

    // 일간에 따른 자시(子時) 간의 인덱스
    // 갑기일: 갑자시, 을경일: 병자시, 병신일: 무자시, 정임일: 경자시, 무계일: 임자시
    const hourGanBase = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8]; // 갑~계 일에 대응
    const ganBase = hourGanBase[dayGanIdx];
    const ganIdx = (ganBase + hourIdx) % 10;

    return { gan: CHEONGAN[ganIdx], ji: JIJI[hourIdx] };
  }

  /**
   * 사주 전체 계산
   * @param {number} year - 생년
   * @param {number} month - 생월 (1~12)
   * @param {number} day - 생일
   * @param {number} hourIdx - 시주 인덱스 (-1: 모름, 0~11: 자~해)
   * @returns {Object} { yearPillar, monthPillar, dayPillar, hourPillar, seed }
   */
  function calculate(year, month, day, hourIdx = -1) {
    const yearPillar = calcYearPillar(year);
    const monthPillar = calcMonthPillar(year, month);
    const dayPillar = calcDayPillar(year, month, day);
    const hourPillar = calcHourPillar(
      CHEONGAN.indexOf(dayPillar.gan),
      hourIdx
    );

    // 씨드 계산: 각 기둥의 value 합산
    let seed = yearPillar.gan.value * 1000
             + yearPillar.ji.value * 100
             + monthPillar.gan.value * 10
             + monthPillar.ji.value;
    seed *= dayPillar.gan.value * 7 + dayPillar.ji.value * 13;
    if (hourPillar) {
      seed = seed * 31 + hourPillar.gan.value * 17 + hourPillar.ji.value * 19;
    }

    return { yearPillar, monthPillar, dayPillar, hourPillar, seed };
  }

  /**
   * 씨드 기반 LCG 결정론적 난수 생성기로 로또 번호 6개 추출
   * 같은 씨드 → 항상 같은 번호
   */
  function generateNumbers(seed) {
    // LCG: Xn+1 = (a * Xn + c) mod m
    const a = 1664525;
    const c = 1013904223;
    const m = 2 ** 32;

    let state = Math.abs(seed) % m;
    const nextRand = () => {
      state = (a * state + c) % m;
      return state;
    };

    // 1~45 셔플 (Fisher-Yates with LCG)
    const pool = Array.from({ length: 45 }, (_, i) => i + 1);
    for (let i = 44; i > 0; i--) {
      const j = nextRand() % (i + 1);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    return pool.slice(0, 6).sort((a, b) => a - b);
  }

  /**
   * 생년월일 → 사주 기반 번호 생성 (공개 API)
   */
  function getSajuNumbers(year, month, day, hourIdx = -1) {
    const saju = calculate(year, month, day, hourIdx);
    const numbers = generateNumbers(saju.seed);
    return { saju, numbers };
  }

  return { calculate, generateNumbers, getSajuNumbers, CHEONGAN, JIJI };
})();
