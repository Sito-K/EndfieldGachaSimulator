const pool = {
  standard: [
    {id:'s6_1', name:'아델리아', rarity:6, img:'assets/ardelia.png'},
    {id:'s6_2', name:'엠버', rarity:6, img:'assets/ember.png'},
    {id:'s6_5', name:'라스트 라이트', rarity:6, img:'assets/lastrite.png'},
    {id:'s6_6', name:'여풍', rarity:6, img:'assets/lifeng.png'},
    {id:'s6_7', name:'포그라니치니크', rarity:6, img:'assets/pogranichnik.png'},
    
    {id:'s5_1', name:'알레쉬', rarity:5, img:'assets/alesh.png'},
    {id:'s5_2', name:'아크라이트', rarity:5, img:'assets/arclight.png'},
    {id:'s5_3', name:'아비웨나', rarity:5, img:'assets/avywenna.png'},
    {id:'s5_4', name:'진천우', rarity:5, img:'assets/chen.png'},
    {id:'s5_5', name:'판', rarity:5, img:'assets/dapan.png'},
    {id:'s5_6', name:'펠리카', rarity:5, img:'assets/perlica.png'},
    {id:'s5_7', name:'스노우샤인', rarity:5, img:'assets/snowshine.png'},
    {id:'s5_8', name:'울프가드', rarity:5, img:'assets/wulfgard.png'},
    {id:'s5_9', name:'자이히', rarity:5, img:'assets/xaihi.png'},

    {id:'s4_1', name:'아케쿠리', rarity:4, img:'assets/akekuri.png'},
    {id:'s4_2', name:'안탈', rarity:4, img:'assets/antal.png'},
    {id:'s4_3', name:'카치르', rarity:4, img:'assets/catcher.png'},
    {id:'s4_4', name:'에스텔라', rarity:4, img:'assets/estella.png'},
    {id:'s4_5', name:'플루라이트', rarity:4, img:'assets/fluorite.png'}
  ],
  banners: {
    limitedA: [
      {id:'s6_3', name:'질베르타', rarity:6, img:'assets/gilberta.png', isPickup: false},
      {id:'s6_4', name:'레바테인', rarity:6, img:'assets/laevatain.png', isPickup: true},
      {id:'s6_8', name:'이본', rarity:6, img:'assets/yvonne.png', isPickup: false}
    ],
    limitedB: [
      {id:'s6_3', name:'질베르타', rarity:6, img:'assets/gilberta.png', isPickup: false},
      {id:'s6_4', name:'레바테인', rarity:6, img:'assets/laevatain.png', isPickup: false},
      {id:'s6_8', name:'이본', rarity:6, img:'assets/yvonne.png', isPickup: true}
    ],
    limitedC: [
      {id:'s6_3', name:'질베르타', rarity:6, img:'assets/gilberta.png', isPickup: true},
      {id:'s6_4', name:'레바테인', rarity:6, img:'assets/laevatain.png', isPickup: false},
      {id:'s6_8', name:'이본', rarity:6, img:'assets/yvonne.png', isPickup: false}
    ]
  }
};

const cachedPools = (() => {
  const result = {
    standard: {4:[],5:[],6:[]},
    banners: {}
  };

  pool.standard.forEach(c => result.standard[c.rarity].push(c));

  Object.entries(pool.banners).forEach(([key,list])=>{
    result.banners[key] = {6:[]};
    list.forEach(c => result.banners[key][6].push(c));
  });

  return result;
})();

// ==============================
// 확률 / 천장
// ==============================
const baseRate6 = 0.008;
const baseRate5 = 0.08;
const defaultPityLimit = 80;
let pityCounter = 0;
let pity5Counter = 0;
let totalPullCounter = Number(localStorage.getItem('totalPullCounter') || 0);
const pityStart = 65;
const pityIncrement = 0.05;

// ==============================
// DOM 요소
// ==============================
const resultsEl = document.getElementById('results');
const leaderboardEl = document.getElementById('leaderboard');
const singleBtn = document.getElementById('singleBtn');
const tenBtn = document.getElementById('tenBtn');
const cardTpl = document.getElementById('cardTpl').content;
const clearLB = document.getElementById('clearLB');
const currentPullCountEl = document.getElementById('currentPullCount');
const pityRemainingEl = document.getElementById('pityRemaining');
const currentRate6El = document.getElementById('currentRate6');
const totalPullCountEl = document.getElementById('totalPullCount');
const bannerButtons = document.querySelectorAll('.banner-btn');
let currentBanner = "standard";
const clearAllBtn = document.getElementById('clearAll');

// ==============================
// 이벤트
// ==============================
singleBtn.addEventListener('click', ()=> runPull(1));
tenBtn.addEventListener('click', ()=> runPull(10));
clearLB.addEventListener('click', ()=> { 
  localStorage.removeItem('gacha_lb'); 
  renderLeaderboard(); 
});

bannerButtons.forEach(btn=>{
  btn.addEventListener('click', ()=>{

    currentBanner = btn.dataset.banner;

    bannerButtons.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');

    pityCounter = 0;
    pity5Counter = 0;
    updatePullDisplay();
  });
});

clearAllBtn.addEventListener('click', ()=>{
  localStorage.removeItem('totalPullCounter');
  totalPullCounter = 0;
  renderLeaderboard();
  updatePullDisplay();
});


// ==============================
// 표시 업데이트
// ==============================
function updatePullDisplay(){
  currentPullCountEl.textContent = pityCounter;
  pityRemainingEl.textContent = Math.max(0, defaultPityLimit - pityCounter);
  totalPullCountEl.textContent = totalPullCounter;
  currentRate6El.textContent = (getCurrent6Rate() * 100).toFixed(2) + '%';
}

// ==============================
// 히스토리
// ==============================
function pushHistory(entry){
  const key = 'gacha_history';
  const list = JSON.parse(localStorage.getItem(key) || '[]');
  list.unshift(entry);
  localStorage.setItem(key, JSON.stringify(list.slice(0,200)));

  const lbKey = 'gacha_lb';
  const lb = JSON.parse(localStorage.getItem(lbKey) || '[]');
  if(entry.rarity === 6){
    lb.unshift({
      when: entry.when,
      name: entry.name,
      pulls: entry.pulls
    });
    localStorage.setItem(lbKey, JSON.stringify(lb.slice(0,50)));
  }
  renderLeaderboard();
}

function renderLeaderboard(){
  const lb = JSON.parse(localStorage.getItem('gacha_lb') || '[]');
  if(lb.length===0) leaderboardEl.textContent='현재 기록 없음';
  else leaderboardEl.innerHTML = lb.slice(0,20)
  .map((e,i)=> `
    <div>
      ${i+1}. ${e.name}
      <span style="color:#ffcc66">(${e.pulls}뽑)</span>
      - ${new Date(e.when).toLocaleString()}
    </div>
  `)
  .join('');
}

// ==============================
// 캐릭터 선택
// ==============================
function pickRandomFromPool(rarity){
  const standard = cachedPools.standard[rarity] || [];
  const banner = cachedPools.banners[currentBanner]?.[rarity] || [];

  // 6성 + 배너
  if (rarity === 6 && banner.length) {
    const pickup = banner.filter(c => c.isPickup);
    if (pickup.length && Math.random() < 0.5) {
      return pickup[Math.floor(Math.random() * pickup.length)];
    }
    const merged = standard.concat(banner.filter(c => !c.isPickup));
    return merged[Math.floor(Math.random() * merged.length)];
  }

  const merged = standard.concat(banner);
  return merged[Math.floor(Math.random() * merged.length)];
}

// ==============================
// 확률 로직 (5성 천장 포함)
// ==============================
function getCurrent6Rate(){
  if (pityCounter < pityStart) return baseRate6;
  return Math.min(
    1,
    baseRate6 + pityIncrement * (pityCounter - pityStart + 1)
  );
}

function weightedRarityRoll(){
  if (pityCounter >= defaultPityLimit - 1) return 6;
  if (pity5Counter >= 9) return 5;

  const r = Math.random();
  const rate6 = getCurrent6Rate();

  if (r < rate6) return 6;
  if (r < rate6 + baseRate5) return 5;
  return 4;
}

// ==============================
// 카드 렌더링
// ==============================
function renderCards(outcomes, count){
  resultsEl.innerHTML = '';
  resultsEl.className = `results-grid ${count === 10 ? 'ten' : 'single'}`;

  const frag = document.createDocumentFragment();

  outcomes.forEach((card, index)=>{
    const node = cardTpl.cloneNode(true);
    const el = node.querySelector('.card');

    el.classList.add(`r${card.rarity}`);
    el.style.animationDelay = `${index * 0.08}s`;

    node.querySelector('.char-img').src = card.img;
    node.querySelector('.char-name').textContent = card.name;
    node.querySelector('.rarity-badge').textContent = `${card.rarity}★`;

    frag.appendChild(node);
  });

  resultsEl.appendChild(frag);
}

// ==============================
// 뽑기 실행
// ==============================
function pullOnce(){
  const rarity = weightedRarityRoll();
  const pick = pickRandomFromPool(rarity);

  if (rarity === 6) {
    pushHistory({
      when: new Date().toISOString(),
      name: pick.name,
      rarity: 6,
      pulls: pityCounter + 1
    });
    pityCounter = 0;
    pity5Counter = 0;
  } else {
    pityCounter++;
    pity5Counter = rarity === 5 ? 0 : pity5Counter + 1;
  }

  totalPullCounter++;
  return pick;
}

function runPull(count=1){
  const outcomes = Array.from({length:count}, pullOnce);
  localStorage.setItem('totalPullCounter', totalPullCounter);
  renderCards(outcomes, count);
  updatePullDisplay();
}

// ==============================
// 초기화
// ==============================
renderLeaderboard();
updatePullDisplay();
