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

  // ─── 일간(日干) 10타입 성격 데이터 ─────────────────────────
  const ILGAN_TRAITS = {
    '甲': {
      name: '갑목(甲木)', nature: '큰 나무, 거목',
      personality: '곧은 소나무처럼 강직하고 진취적',
      desc: '갑목은 하늘을 향해 곧게 뻗는 큰 나무의 기운입니다. 리더십이 강하고 자존심이 높으며, 새로운 것을 개척하는 선구자적 성향을 가졌어요. 봄의 시작을 알리는 기운으로, 시작하는 힘이 강합니다.',
      luckyDirection: '동쪽', luckyColor: '청색/녹색', element: '목'
    },
    '乙': {
      name: '을목(乙木)', nature: '꽃, 풀, 덩굴',
      personality: '유연하고 적응력이 뛰어난 처세가',
      desc: '을목은 바람에 흔들리면서도 꺾이지 않는 풀과 꽃의 기운입니다. 부드럽지만 끈질긴 생명력을 가졌으며, 주변 환경에 잘 적응하고 인간관계가 원만해요. 섬세한 감성과 예술적 기질이 돋보입니다.',
      luckyDirection: '동쪽', luckyColor: '연두색', element: '목'
    },
    '丙': {
      name: '병화(丙火)', nature: '태양, 큰 불',
      personality: '밝고 화려하며 열정적인 낙천가',
      desc: '병화는 세상을 밝히는 태양의 기운입니다. 밝고 따뜻한 성격으로 주변에 사람이 모이며, 화려함과 열정을 가졌어요. 표현력이 뛰어나고 정의감이 강하지만, 때로는 급한 성격이 화를 부르기도 합니다.',
      luckyDirection: '남쪽', luckyColor: '빨간색', element: '화'
    },
    '丁': {
      name: '정화(丁火)', nature: '촛불, 별빛, 달빛',
      personality: '따뜻하고 사려 깊은 지성인',
      desc: '정화는 어둠을 밝히는 촛불의 기운입니다. 조용하지만 꺼지지 않는 내면의 열정을 가졌으며, 예리한 판단력과 섬세한 감성이 공존해요. 학문적 성향이 강하고 깊은 사색을 즐깁니다.',
      luckyDirection: '남쪽', luckyColor: '자주색/보라색', element: '화'
    },
    '戊': {
      name: '무토(戊土)', nature: '큰 산, 대지',
      personality: '묵직하고 신뢰감 있는 중재자',
      desc: '무토는 만물을 품는 큰 산의 기운입니다. 넓은 포용력과 안정감으로 주변의 신뢰를 받으며, 중심을 잡아주는 역할을 해요. 변화보다는 지키는 것에 강하고, 약속과 신용을 중시합니다.',
      luckyDirection: '중앙', luckyColor: '황색/갈색', element: '토'
    },
    '己': {
      name: '기토(己土)', nature: '논밭, 정원의 흙',
      personality: '온화하고 실속 있는 현실주의자',
      desc: '기토는 곡식을 키우는 비옥한 땅의 기운입니다. 겉으로는 온순하지만 내면에 실속을 챙기는 지혜가 있어요. 배려심이 깊고 꼼꼼하며, 한번 시작한 일은 끝까지 마무리하는 끈기가 있습니다.',
      luckyDirection: '중앙', luckyColor: '연한 갈색', element: '토'
    },
    '庚': {
      name: '경금(庚金)', nature: '바위, 원석, 강철',
      personality: '강인하고 의리 있는 결단가',
      desc: '경금은 단련된 강철의 기운입니다. 결단력이 뛰어나고 의리를 중시하며, 불의를 참지 못하는 강직한 성품이에요. 승부욕이 강하고 목표를 향해 돌진하는 추진력이 있습니다.',
      luckyDirection: '서쪽', luckyColor: '흰색/은색', element: '금'
    },
    '辛': {
      name: '신금(辛金)', nature: '보석, 금은 장신구',
      personality: '날카롭고 완벽주의적인 심미가',
      desc: '신금은 세공된 보석의 기운입니다. 예리한 감각과 미적 감성을 가졌으며, 완벽을 추구하는 성향이 강해요. 깔끔하고 세련된 것을 좋아하며, 자신만의 기준이 뚜렷합니다.',
      luckyDirection: '서쪽', luckyColor: '은색/연분홍', element: '금'
    },
    '壬': {
      name: '임수(壬水)', nature: '큰 강, 바다',
      personality: '지혜롭고 포용력 있는 전략가',
      desc: '임수는 큰 강과 바다의 기운입니다. 깊은 지혜와 넓은 포용력으로 큰 그림을 그리는 능력이 있어요. 적응력이 뛰어나고 어떤 상황에서도 길을 찾아내는 유연한 사고를 가졌습니다.',
      luckyDirection: '북쪽', luckyColor: '검은색/진한 남색', element: '수'
    },
    '癸': {
      name: '계수(癸水)', nature: '이슬, 빗물, 안개',
      personality: '직관적이고 감성적인 몽상가',
      desc: '계수는 조용히 스미는 이슬과 빗물의 기운입니다. 섬세한 감성과 뛰어난 직관력을 가졌으며, 겉으로는 조용하지만 내면에 깊은 생각을 품고 있어요. 영감이 풍부하고 창의적인 아이디어가 넘칩니다.',
      luckyDirection: '북쪽', luckyColor: '검은색/진한 파란', element: '수'
    }
  };

  // ─── 오행 상생/상극 ─────────────────────────────────────────
  const SANG_SAENG = {
    '목화': { desc: '나무가 불을 피워 세상을 밝히는 상생', detail: '목생화(木生火) — 나무가 타서 불꽃이 됩니다. 성장의 기운이 열정으로 전환되어 강한 추진력을 만들어요.' },
    '화토': { desc: '불이 재가 되어 땅을 비옥하게 하는 상생', detail: '화생토(火生土) — 불이 타고 남은 재가 기름진 흙이 됩니다. 열정이 안정으로 바뀌며 결실을 맺어요.' },
    '토금': { desc: '땅속에서 귀한 금이 생겨나는 상생', detail: '토생금(土生金) — 땅속 깊은 곳에서 보석이 탄생합니다. 안정된 기반이 귀한 성과를 만들어내요.' },
    '금수': { desc: '쇠가 찬 기운을 모아 물방울을 맺는 상생', detail: '금생수(金生水) — 차가운 금속 표면에 이슬이 맺힙니다. 단단한 의지가 지혜의 흐름을 만들어요.' },
    '수목': { desc: '물이 나무를 키워 푸르게 하는 상생', detail: '수생목(水生木) — 물이 나무의 뿌리를 적셔 성장시킵니다. 지혜가 새로운 시작의 힘이 되어요.' }
  };

  const SANG_GEUK = {
    '목토': { desc: '나무 뿌리가 땅을 뚫고 자라는 상극', detail: '목극토(木剋土) — 나무가 흙의 기운을 빼앗습니다. 도전과 변화의 긴장감이 있지만, 이를 통해 성장할 수 있어요.' },
    '토수': { desc: '흙이 물길을 막아 가두는 상극', detail: '토극수(土剋水) — 제방이 물의 흐름을 막습니다. 안정을 추구하는 힘과 유동적인 힘의 긴장이 있어요.' },
    '수화': { desc: '물이 불을 꺼뜨리는 상극', detail: '수극화(水剋火) — 물이 불꽃을 진압합니다. 이성과 감성의 대립이 있지만, 균형을 찾으면 큰 힘이 돼요.' },
    '화금': { desc: '불이 쇠를 녹여 새 형태를 만드는 상극', detail: '화극금(火剋金) — 용광로에서 쇠가 녹아 새로운 형태가 됩니다. 변화의 고통 속에 재탄생의 기회가 있어요.' },
    '금목': { desc: '도끼가 나무를 베어내는 상극', detail: '금극목(金剋木) — 날카로운 쇠가 나무를 잘라냅니다. 강한 제약이 있지만, 가지치기가 더 큰 성장을 만들어요.' }
  };

  // ─── 지지 관계표 ─────────────────────────────────────────────
  const SAMHAP = [
    { ji: ['申','子','辰'], element: '수', desc: '신자진(申子辰) 삼합수국 — 물의 기운이 크게 모여 지혜와 유연함이 극대화됩니다' },
    { ji: ['寅','午','戌'], element: '화', desc: '인오술(寅午戌) 삼합화국 — 불의 기운이 크게 모여 열정과 추진력이 극대화됩니다' },
    { ji: ['巳','酉','丑'], element: '금', desc: '사유축(巳酉丑) 삼합금국 — 금의 기운이 크게 모여 결단력과 실행력이 극대화됩니다' },
    { ji: ['亥','卯','未'], element: '목', desc: '해묘미(亥卯未) 삼합목국 — 나무의 기운이 크게 모여 성장과 창의력이 극대화됩니다' }
  ];

  const YUKHAP = [
    { pair: ['子','丑'], result: '토', desc: '자축합토(子丑合土) — 겨울의 물과 소의 땅이 만나 안정의 기운을 만듭니다' },
    { pair: ['寅','亥'], result: '목', desc: '인해합목(寅亥合木) — 호랑이와 돼지가 만나 성장의 기운을 만듭니다' },
    { pair: ['卯','戌'], result: '화', desc: '묘술합화(卯戌合火) — 토끼와 개가 만나 열정의 기운을 만듭니다' },
    { pair: ['辰','酉'], result: '금', desc: '진유합금(辰酉合金) — 용과 닭이 만나 결실의 기운을 만듭니다' },
    { pair: ['巳','申'], result: '수', desc: '사신합수(巳申合水) — 뱀과 원숭이가 만나 지혜의 기운을 만듭니다' },
    { pair: ['午','未'], result: '화', desc: '오미합(午未合) — 말과 양이 만나 음양이 조화를 이룹니다' }
  ];

  const CHUNG = [
    { pair: ['子','午'], desc: '자오충(子午沖) — 물과 불의 정면 충돌. 감정의 기복이 크지만 강렬한 에너지를 가집니다' },
    { pair: ['丑','未'], desc: '축미충(丑未沖) — 두 토(土)의 충돌. 고집과 신념의 대립이지만, 중심을 잡으면 강해집니다' },
    { pair: ['寅','申'], desc: '인신충(寅申沖) — 호랑이와 원숭이의 대립. 활동력이 넘치지만 방향 설정이 중요합니다' },
    { pair: ['卯','酉'], desc: '묘유충(卯酉沖) — 나무와 금의 정면 대결. 변화와 결단의 에너지가 강합니다' },
    { pair: ['辰','戌'], desc: '진술충(辰戌沖) — 용과 개의 충돌. 큰 변화를 몰고 오지만, 그만큼 성장의 기회입니다' },
    { pair: ['巳','亥'], desc: '사해충(巳亥沖) — 뱀과 돼지의 대립. 내면의 갈등이 있지만, 해결하면 큰 전환점이 됩니다' }
  ];

  // ─── 오행별 번호 대역 ─────────────────────────────────────────
  const ELEMENT_NUMBER_RANGE = {
    '목': { min: 1, max: 9, desc: '1~9번대는 목(木)의 기운 — 시작과 성장의 에너지' },
    '화': { min: 10, max: 18, desc: '10번대는 화(火)의 기운 — 열정과 확산의 에너지' },
    '토': { min: 19, max: 27, desc: '20번대는 토(土)의 기운 — 안정과 중심의 에너지' },
    '금': { min: 28, max: 36, desc: '30번대는 금(金)의 기운 — 결실과 성취의 에너지' },
    '수': { min: 37, max: 45, desc: '40번대는 수(水)의 기운 — 지혜와 재물의 에너지' }
  };

  // ─── 지지 본기(本氣) 오행 매핑 ─────────────────────────────
  const JI_MAIN_ELEMENT = {
    '子': '수', '丑': '토', '寅': '목', '卯': '목',
    '辰': '토', '巳': '화', '午': '화', '未': '토',
    '申': '금', '酉': '금', '戌': '토', '亥': '수'
  };

  function getNumberElement(num) {
    if (num <= 9) return '목';
    if (num <= 18) return '화';
    if (num <= 27) return '토';
    if (num <= 36) return '금';
    return '수';
  }

  // ─── 사주 분석 함수 ─────────────────────────────────────────
  function analyzePillars(saju) {
    const pillars = [saju.yearPillar, saju.monthPillar, saju.dayPillar];
    if (saju.hourPillar) pillars.push(saju.hourPillar);

    // 1. 일간 성격
    const ilganTrait = ILGAN_TRAITS[saju.dayPillar.gan.hanja] || ILGAN_TRAITS['甲'];

    // 2. 오행 분포
    const elementCount = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
    pillars.forEach(p => {
      elementCount[p.gan.element]++;
      const jiElem = JI_MAIN_ELEMENT[p.ji.hanja];
      if (jiElem) elementCount[jiElem]++;
    });

    // 3. 음양 균형
    const yangCount = pillars.filter(p => p.gan.yin_yang === '양').length;
    const yinCount = pillars.length - yangCount;

    // 4. 상생/상극 찾기 (인접 기둥 간)
    const sangSaengFound = [];
    const sangGeukFound = [];
    for (let i = 0; i < pillars.length - 1; i++) {
      const e1 = pillars[i].gan.element;
      const e2 = pillars[i + 1].gan.element;
      if (e1 === e2) continue;
      const key1 = e1 + e2;
      const key2 = e2 + e1;
      if (SANG_SAENG[key1]) sangSaengFound.push(SANG_SAENG[key1]);
      else if (SANG_SAENG[key2]) sangSaengFound.push(SANG_SAENG[key2]);
      if (SANG_GEUK[key1]) sangGeukFound.push(SANG_GEUK[key1]);
      else if (SANG_GEUK[key2]) sangGeukFound.push(SANG_GEUK[key2]);
    }

    // 5. 지지 삼합/육합/충 찾기
    const jiList = pillars.map(p => p.ji.hanja);
    const samhapFound = [];
    SAMHAP.forEach(s => {
      const count = s.ji.filter(j => jiList.includes(j)).length;
      if (count >= 2) samhapFound.push(s);
    });
    const yukhapFound = [];
    YUKHAP.forEach(y => {
      if (jiList.includes(y.pair[0]) && jiList.includes(y.pair[1])) {
        yukhapFound.push(y);
      }
    });
    const chungFound = [];
    CHUNG.forEach(c => {
      if (jiList.includes(c.pair[0]) && jiList.includes(c.pair[1])) {
        chungFound.push(c);
      }
    });

    return {
      ilganTrait, elementCount, yangCount, yinCount,
      sangSaeng: sangSaengFound, sangGeuk: sangGeukFound,
      samhapFound, yukhapFound, chungFound
    };
  }

  return {
    calculate, generateNumbers, getSajuNumbers, analyzePillars,
    getNumberElement, CHEONGAN, JIJI, ILGAN_TRAITS,
    SANG_SAENG, SANG_GEUK, ELEMENT_NUMBER_RANGE
  };
})();
