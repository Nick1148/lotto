/**
 * chemistry.js - 로또 궁합 번호 생성 모듈
 * 두 사람의 이름 기반 궁합 점수 + 공동 행운번호
 */

const ChemistryGenerator = (() => {
  // 오행 상생/상극 관계
  const ELEMENT_COMPAT = {
    '木木': { score: 15, desc: '같은 나무끼리, 함께 숲을 이뤄요' },
    '木火': { score: 20, desc: '나무가 불을 키우듯, 서로의 열정을 키워요' },
    '木土': { score: 8, desc: '나무가 땅을 뚫고 자라는 관계예요' },
    '木金': { score: 5, desc: '도끼가 나무를 자르듯, 강한 긴장감이 있어요' },
    '木水': { score: 18, desc: '물이 나무를 키우듯, 서로를 성장시켜요' },
    '火火': { score: 14, desc: '불꽃이 만나 더 뜨거워지는 관계!' },
    '火土': { score: 19, desc: '불이 재가 되어 땅을 비옥하게 해요' },
    '火金': { score: 6, desc: '불이 쇠를 녹이듯, 변화를 만들어요' },
    '火水': { score: 4, desc: '물과 불의 대비! 강렬한 에너지예요' },
    '土土': { score: 16, desc: '대지끼리, 든든한 안정감이 있어요' },
    '土金': { score: 18, desc: '땅 속 보석처럼, 귀한 인연이에요' },
    '土水': { score: 7, desc: '흙이 물을 가두듯, 서로를 보완해요' },
    '金金': { score: 15, desc: '쇠끼리 부딪혀 불꽃을 일으켜요' },
    '金水': { score: 20, desc: '쇠가 물을 모으듯, 완벽한 조화예요' },
    '水水': { score: 16, desc: '물이 만나 큰 강이 되는 관계예요' }
  };

  // 궁합 코멘트 (점수 구간별)
  const COMMENTS = [
    { min: 90, texts: ['운명적 궁합! 같이 로또 사면 대박!', '천생연분 로또 파트너!', '이 조합은 하늘이 내려준 거예요!'] },
    { min: 80, texts: ['환상의 궁합! 행운이 넘쳐요!', '찰떡 궁합! 함께하면 운도 2배!', '서로의 행운을 끌어당기는 사이!'] },
    { min: 70, texts: ['좋은 궁합이에요! 기대해볼만해요~', '서로에게 행운을 가져다주는 관계!', '함께하면 좋은 일이 생길 거예요!'] },
    { min: 60, texts: ['은은한 행운이 감도는 궁합!', '서로 다른 매력이 시너지를 만들어요!', '함께 도전하면 재밌을 거예요!'] }
  ];

  /**
   * LCG 기반 결정론적 난수 생성기
   */
  function createLCG(seed) {
    let s = Math.abs(seed) || 1;
    return function() {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s;
    };
  }

  /**
   * 두 이름의 궁합 결과 생성
   */
  function getChemistry(name1, name2) {
    // 이름 순서 정규화 (순서 바꿔도 같은 결과)
    const sorted = [name1, name2].sort();
    const n1 = sorted[0];
    const n2 = sorted[1];

    // 각 이름의 seed 계산
    const info1 = NameGenerator.calcSeed(n1);
    const info2 = NameGenerator.calcSeed(n2);

    const element1 = NameGenerator.getElement(info1.total);
    const element2 = NameGenerator.getElement(info2.total);

    // combined seed
    const combinedSeed = info1.seed * 31 + info2.seed * 997 + info1.total * info2.total;

    // 궁합 점수 (60~95 범위)
    const rawScore = Math.abs(combinedSeed) % 36;
    const score = rawScore + 60;

    // 오행 궁합 분석
    const elemKey1 = element1.ko + element2.ko;
    const elemKey2 = element2.ko + element1.ko;
    const elemCompat = ELEMENT_COMPAT[elemKey1] || ELEMENT_COMPAT[elemKey2] || { score: 12, desc: '독특한 조합의 에너지예요' };

    // 최종 점수 보정 (오행 궁합 반영)
    const finalScore = Math.min(95, Math.max(60, score + Math.floor((elemCompat.score - 12) / 2)));

    // 공동 행운 번호 생성 (날짜 + 이름 조합)
    const now = new Date();
    const dateSeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    const numberSeed = combinedSeed + dateSeed;

    const lcg = createLCG(numberSeed);
    const nums = new Set();
    while (nums.size < 6) {
      nums.add((lcg() % 45) + 1);
    }
    const numbers = [...nums].sort((a, b) => a - b);

    // 코멘트 선택
    const commentGroup = COMMENTS.find(c => finalScore >= c.min) || COMMENTS[COMMENTS.length - 1];
    const lcgComment = createLCG(combinedSeed + 7777);
    const comment = commentGroup.texts[lcgComment() % commentGroup.texts.length];

    return {
      name1,
      name2,
      score: finalScore,
      numbers,
      element1,
      element2,
      elementDesc: elemCompat.desc,
      comment,
      strokes1: info1.total,
      strokes2: info2.total
    };
  }

  return { getChemistry };
})();
