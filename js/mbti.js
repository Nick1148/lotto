/**
 * mbti.js - MBTI 기반 로또 번호 생성 모듈
 * 4축 가중치 + 날짜 변동 → 같은 MBTI라도 매일 다른 번호
 */

const MbtiGenerator = (() => {
  // 소수 목록 (1~45)
  const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43];

  // 16유형 프로필
  const PROFILES = {
    INTJ: { label: '전략가', traits: ['분석적', '독립적', '비전가'], luckyElement: '水' },
    INTP: { label: '논리술사', traits: ['논리적', '호기심', '창의적'], luckyElement: '水' },
    ENTJ: { label: '통솔자', traits: ['리더십', '효율적', '결단력'], luckyElement: '金' },
    ENTP: { label: '변론가', traits: ['혁신적', '도전적', '재치있는'], luckyElement: '火' },
    INFJ: { label: '옹호자', traits: ['통찰력', '이상주의', '헌신적'], luckyElement: '木' },
    INFP: { label: '중재자', traits: ['감성적', '창의적', '이상적'], luckyElement: '木' },
    ENFJ: { label: '선도자', traits: ['카리스마', '이타적', '영감'], luckyElement: '火' },
    ENFP: { label: '활동가', traits: ['열정적', '상상력', '사교적'], luckyElement: '火' },
    ISTJ: { label: '현실주의자', traits: ['책임감', '꼼꼼함', '신뢰'], luckyElement: '土' },
    ISFJ: { label: '수호자', traits: ['배려', '인내심', '충실함'], luckyElement: '土' },
    ESTJ: { label: '경영자', traits: ['체계적', '실용적', '리더십'], luckyElement: '金' },
    ESFJ: { label: '집정관', traits: ['사교적', '협력적', '친절함'], luckyElement: '土' },
    ISTP: { label: '장인', traits: ['관찰력', '실용적', '논리적'], luckyElement: '金' },
    ISFP: { label: '모험가', traits: ['감각적', '유연함', '탐구적'], luckyElement: '木' },
    ESTP: { label: '사업가', traits: ['대담함', '현실적', '활동적'], luckyElement: '火' },
    ESFP: { label: '연예인', traits: ['즉흥적', '낙천적', '매력적'], luckyElement: '火' }
  };

  /**
   * 4축별 가중치 계산
   * @param {string} mbtiType - 4글자 MBTI (예: "ENFP")
   * @returns {number[]} 1~45 각 번호의 가중치 배열
   */
  function calcWeights(mbtiType) {
    const weights = new Array(45).fill(1);
    const [ei, sn, tf, jp] = mbtiType.split('');

    for (let i = 0; i < 45; i++) {
      const num = i + 1;

      // E/I 축
      if (ei === 'E' && num % 2 === 1) weights[i] += 2;  // 홀수 가중
      if (ei === 'I' && num % 2 === 0) weights[i] += 2;  // 짝수 가중

      // S/N 축
      if (sn === 'S' && num <= 23) weights[i] += 1;       // 현실적: 낮은 번호
      if (sn === 'N' && num >= 23) weights[i] += 1;       // 직관적: 높은 번호

      // T/F 축
      if (tf === 'T' && PRIMES.includes(num)) weights[i] += 2;  // 소수 가중
      if (tf === 'F' && num % 3 === 0) weights[i] += 2;         // 3의 배수 가중

      // J/P 축
      if (jp === 'J' && num % 5 === 0) weights[i] += 2;                       // 5의 배수 가중
      if (jp === 'P' && [7, 8, 9].includes(num % 10)) weights[i] += 2;       // 끝자리 7,8,9 가중
    }

    return weights;
  }

  /**
   * 날짜 기반 seed 생성
   */
  function dateSeed() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    return y * 10000 + m * 100 + d;
  }

  /**
   * MBTI seed 생성
   */
  function mbtiSeed(mbtiType) {
    let seed = 0;
    for (let i = 0; i < 4; i++) {
      seed = seed * 31 + mbtiType.charCodeAt(i);
    }
    return seed;
  }

  /**
   * 가중치 기반 번호 선택 (결정론적)
   */
  function selectNumbers(weights, seed) {
    // LCG
    const a = 1664525;
    const c = 1013904223;
    const m = 2 ** 32;
    let state = Math.abs(seed) % m;

    const nextRand = () => {
      state = (a * state + c) % m;
      return state;
    };

    // 가중치 기반 풀 생성
    const pool = [];
    for (let i = 0; i < 45; i++) {
      for (let j = 0; j < weights[i]; j++) {
        pool.push(i + 1);
      }
    }

    // Fisher-Yates with LCG
    for (let i = pool.length - 1; i > 0; i--) {
      const j = nextRand() % (i + 1);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    // 중복 제거하며 6개 선택
    const selected = [];
    const used = new Set();
    for (const num of pool) {
      if (!used.has(num)) {
        selected.push(num);
        used.add(num);
        if (selected.length === 6) break;
      }
    }

    return selected.sort((a, b) => a - b);
  }

  /**
   * MBTI 기반 번호 생성 (공개 API)
   * @param {string} mbtiType - 4글자 MBTI 타입
   * @returns {{ numbers: number[], mbtiInfo: Object }}
   */
  function getMbtiNumbers(mbtiType) {
    const type = mbtiType.toUpperCase();
    const profile = PROFILES[type] || PROFILES['ENFP'];
    const weights = calcWeights(type);

    // MBTI seed + 날짜 seed 혼합 → 매일 다른 번호
    const seed = mbtiSeed(type) * 997 + dateSeed() * 31;
    const numbers = selectNumbers(weights, seed);

    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

    return {
      numbers,
      mbtiInfo: {
        type,
        label: profile.label,
        traits: profile.traits,
        luckyElement: profile.luckyElement,
        date: dateStr
      }
    };
  }

  return { getMbtiNumbers, PROFILES };
})();
