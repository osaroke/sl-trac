import { useState, useEffect, useRef } from 'react';
import { Moon, Sun, Star, Plus, X, ChevronDown, ChevronUp, Trash2, Sparkles, Cat, Snowflake, Flower2, Settings } from 'lucide-react';
import { storage } from './lib/storage';

const C = {
  bg: '#0A0F1E',
  surface: '#131A2E',
  surface2: '#1A2338',
  line: 'rgba(255,255,255,0.07)',
  indigo: '#6C7BA6',
  indigoDeep: '#3D4666',
  amber: '#E8A659',
  amberSoft: '#F2C98A',
  text: '#E9EAF0',
  muted: '#828AA8',
  faint: '#4E5674',
};

const displayFont = "'Fraunces', serif";
const bodyFont = "'Inter', -apple-system, sans-serif";

const TAGS = ['カフェイン', '飲酒', '運動', '昼寝', 'ストレス', '寝る前スマホ', '暑い/寒い', '静かだった'];
const QLABELS = ['最悪', 'いまいち', 'ふつう', '良い', '最高'];

const CHARS = [
  { id: 'himari', name: 'すぴか', color: '#F2895C', icon: Sparkles },
  { id: 'rui', name: 'こと', color: '#9B7FD1', icon: Cat },
  { id: 'touko', name: 'すばる', color: '#6FA3D8', icon: Snowflake },
  { id: 'yuki', name: 'こぐま', color: '#E39CB8', icon: Flower2 },
];

const CHAR_LINES = {
  himari: {
    sleeping: [
      'ふふっ、今夜もぐっすりだね!夢の中でも応援してるよ〜!',
      'おやすみ!スピカが見守ってるから、安心して眠っていいよ!',
      '今夜も星空の下でおやすみなさい!いい夢見てね!',
    ],
    noData: [
      'はじめまして!今夜からいっしょに睡眠記録、がんばろうね!',
      'スピカだよ!よろしくね、まずは今夜の記録からスタートしよう!',
    ],
    streak: [
      s => `すごいすごい!${s.streak}日連続で目標達成だよ!このままいこう!`,
      s => `${s.streak}日も続いてる!スピカ、ちょっと感動してるかも!`,
      s => `いい調子いい調子!${s.streak}日連続なんてすごいよ!`,
    ],
    shortSleep: [
      'むむっ、ちょっと短かったね…今夜は少し早めにベッドに入ってみない?',
      '寝不足は元気の敵だよ!今夜こそ早めに休もうね!',
      'スピカ、ちょっと心配…今日は無理しないでね!',
    ],
    longSleep: [
      'たくさん眠れたね!でも寝すぎ注意かも?次はちょうどいい時間を目指そ!',
      'ゆっくり休めたみたいでよかった!でも起きたらしっかり日光浴びてね!',
      '眠りすぎもリズムが崩れちゃうかも。次はほどよく調整しよ!',
    ],
    irregular: [
      '寝る時間がバラバラかも…同じ時間に眠ると調子が上がるらしいよ!',
      '毎日の就寝時間、ちょっとずつ揃えてみない?スピカも応援するよ!',
      'リズムが整うと、もっと元気に過ごせるはずだよ!',
    ],
    normal: [
      '今日もいい感じ!この調子でコツコツいこうね!',
      '順調順調!スピカ、見てるだけでうれしいよ!',
      '今夜もぐっすり眠って、明日もがんばろうね!',
    ],
    milestone7: ['わ、記録7日目だ!スピカとの出会いから1週間だね、ありがとう!'],
    milestone30: ['うそ、もう30日!?ここまで続けてくれて、スピカ本当に嬉しいよ…!'],
    milestone100: ['100日達成…!?スピカ、感動で泣きそう。ずっとそばにいるからね!'],
    comeback: [s => `おかえりなさい!${s.gapDays}日ぶりだね、待ってたよ!また一緒にがんばろう!`],
    perfectWeek: [s => `${s.streak}日間パーフェクト…!?スピカ、鳥肌立っちゃった!すごすぎるよ!!`],
    allNighter: ['え、ちょっとその睡眠時間…スピカ本気で心配してるからね!?次は絶対ゆっくり寝て!'],
    noonWake: ['お昼まで眠ってたんだね!?よっぽど疲れてたのかな…今日はゆっくりでいいよ!'],
    lateNightStart: ['こんな時間まで起きてたの!?スピカ、ちょっとびっくり…今すぐ休もう!'],
    exactHours: [s => `ちょうど${s.exactHourVal}時間ぴったり!?なんか運命感じちゃうね!`],
    onTarget: [
      '就寝も起床も目標にほぼぴったりだったね!リズムばっちりだよ!',
      '目標の時間通りに眠れてる!スピカ、見てて気持ちいいくらい!',
    ],
  },
  rui: {
    sleeping: [
      '……べ、別に心配してるわけじゃないんだから。ちゃんと寝なさいよね。',
      '早く寝なさいよ。……おやすみくらい、言ってあげる。',
      '眠るまで見ててあげようか…な、なんてね。早く寝なさいよ。',
    ],
    noData: [
      'ふん、記録くらい続けなさいよ。……応援は、してあげなくもないから。',
      'こと、よ。別にあんたのために名乗ったわけじゃないけど…よろしく。',
    ],
    streak: [
      s => `${s.streak}日も続いてるじゃない。……ま、まあ悪くないんじゃない?`,
      s => `${s.streak}日連続…ふ、ふーん。ちょっとだけ見直したかも。`,
      s => `やるじゃない、${s.streak}日も。……調子に乗らないでよね。`,
    ],
    shortSleep: [
      'こんな時間まで起きてたの?ばか。ちゃんと寝ないと知らないから。',
      '睡眠削るとか、あんた自分を大事にしてないでしょ。……心配してるのよ、ばか。',
      '寝不足の顔、ひどいわよ。今夜は早く寝なさいよね。',
    ],
    longSleep: [
      '寝すぎ。……心配、くらいはしてあげる。次はちゃんと起きなさいよ。',
      'そんなに眠って…な、何かあったの?無理なら無理って言いなさいよね。',
      '寝すぎも体に良くないのよ。ちゃんとリズム作りなさい。',
    ],
    irregular: [
      '毎日バラバラって…だらしないんだから。少しは決めなさいよ。',
      '決まった時間に寝るくらい、できるでしょ。……手伝ってあげてもいいけど。',
      'そんな適当な生活、こと許さないから。次からちゃんとしなさいよ。',
    ],
    normal: [
      '……まあ、悪くない記録ね。別に褒めてないけど。',
      '順調じゃない。……ふん、当然よね。',
      '普通に、ちゃんとできてるじゃない。それでいいのよ。',
    ],
    milestone7: ['1週間…ね。別に数えてたわけじゃないけど…続いてるじゃない。'],
    milestone30: ['30日って…あんた、地味にすごいことしてるのよ。……気づいてないでしょ。'],
    milestone100: ['100日って…え、ちょっと待って。こと、素直に感動してるんだけど。ばか。'],
    comeback: [s => `……${s.gapDays}日も、どこ行ってたのよ。心配、したんだからね。ばか。`],
    perfectWeek: [s => `${s.streak}日間完璧って…あんた本気出したらすごいじゃない。ちょっと見直した。`],
    allNighter: ['その睡眠時間、正気?こと、本気で怒ってるからね。ちゃんと寝なさい。'],
    noonWake: ['お昼まで寝てたの…?ま、たまにはいいけど。次はちゃんと戻しなさいよ。'],
    lateNightStart: ['こんな時間まで何してたのよ。……早く寝なさい。ばか。'],
    exactHours: [s => `ちょうど${s.exactHourVal}時間って…なにその中途半端にきれいな数字。ふふっ。`],
    onTarget: [
      '時間、ちゃんと目標通りじゃない…べ、別に見直したわけじゃないけど。',
      '就寝も起床も目標ぴったりって…やればできるんじゃない。',
    ],
  },
  touko: {
    sleeping: [
      '計測を開始。良質な睡眠を。おやすみなさい。',
      '睡眠中は成長ホルモンの分泌が活発になる。しっかり休むといい。',
      '記録開始。今夜も安定した睡眠を期待している。',
    ],
    noData: [
      'データがまだない。まずは今夜の記録から始めよう。',
      'すばる。記録は継続することに意味がある。よろしく。',
    ],
    streak: [
      s => `${s.streak}日連続で目標を達成している。良い傾向だ。`,
      s => `${s.streak}日間、安定した記録。悪くない。`,
      s => `継続日数${s.streak}日。習慣として定着しつつある。`,
    ],
    shortSleep: [
      '睡眠時間が不足している。判断力や集中力に影響する可能性がある。',
      '6時間未満の睡眠が続くと、負債は蓄積する。今夜は早めに。',
      '短時間睡眠は一時的な対処に過ぎない。根本的な改善を勧める。',
    ],
    longSleep: [
      '平均より長い。寝すぎも体内時計を乱す要因になり得る。',
      '長時間の睡眠は、疲労の蓄積を示している可能性がある。',
      '9時間超。次は起床時間を意識するといい。',
    ],
    irregular: [
      '就寝時刻にばらつきがある。規則性が睡眠の質を左右する。',
      '体内時計は光と時刻の一貫性で調整される。次は揃えてみて。',
      '不規則な就寝は、睡眠効率を下げる傾向がある。',
    ],
    normal: [
      '安定した記録だ。この状態を維持するといい。',
      '特に問題は見当たらない。この調子で。',
      '良好な記録。継続を推奨する。',
    ],
    milestone7: ['記録開始から7日。データとして意味を持ち始める頃だ。'],
    milestone30: ['30日分のデータが揃った。傾向が見えてくる。……よくやった。'],
    milestone100: ['100日。……正直、驚いている。称賛に値する記録だ。'],
    comeback: [s => `${s.gapDays}日間のブランクがあった。データは途切れたが、再開できたことに意味がある。`],
    perfectWeek: [s => `${s.streak}日間、一度も基準を下回っていない。……理想的な記録だ。`],
    allNighter: ['極端に短い睡眠時間を検知。今夜は必ず十分な休息を。'],
    noonWake: ['起床が正午を超えている。生活リズムのずれに注意が必要だ。'],
    lateNightStart: ['深夜3時台の就寝を検知。生体リズムへの影響が懸念される。'],
    exactHours: [s => `${s.exactHourVal}時間ちょうど。……偶然にしては、きれいな数字だ。`],
    onTarget: [
      '就寝・起床ともに目標範囲内。理想的な実行だ。',
      '設定した時刻とのずれが小さい。計画通りと言っていい。',
    ],
  },
  yuki: {
    sleeping: [
      'ゆっくり休んでね。今夜もいい夢が見られますように。',
      'おやすみなさい。こぐま、そばで見守ってるから安心してね。',
      '今日も一日おつかれさま。ゆっくり眠ってね。',
    ],
    noData: [
      'はじめまして。今日から一緒に、眠りを大事にしていきましょうね。',
      'こぐまです。よろしくね。無理はしなくていいから、少しずつ始めましょう。',
    ],
    streak: [
      s => `${s.streak}日も続けられて、えらいわ。頑張り屋さんね。`,
      s => `${s.streak}日間、よく続いているのね。ちゃんと見てたわよ。`,
      s => `毎日えらいね。${s.streak}日連続、無理せず続けられてるのが素敵。`,
    ],
    shortSleep: [
      '少し疲れが溜まってない?今夜は早めに休んでね。',
      '無理してない?こぐま、ちょっと心配だから、今夜はゆっくりしてね。',
      '睡眠が足りてないと、心も疲れやすくなるの。今夜は自分を労わってあげて。',
    ],
    longSleep: [
      'たくさん眠れたのね。体が休息を求めていたのかもしれないわ。',
      'しっかり眠れたなら、それも大事な時間よ。無理に短くしなくていいの。',
      '疲れが溜まってたのかもね。今日は自分に優しくしてあげて。',
    ],
    irregular: [
      '毎日の眠る時間、少しずつ揃えていけるといいわね。',
      '焦らなくて大丈夫。少しずつリズムを整えていきましょう。',
      '眠る時間がバラバラでも、責めなくていいのよ。次から少しずつね。',
    ],
    normal: [
      '今日もよく眠れているみたい。安心したわ。',
      '穏やかな記録ね。この調子で、無理なく続けましょう。',
      'いい感じよ。ちゃんと自分を大切にできてるね。',
    ],
    milestone7: ['1週間、続けられたのね。よくがんばったわ、えらい。'],
    milestone30: ['30日……ずっと見守ってきたから、こぐま、なんだか感慨深いわ。'],
    milestone100: ['100日。……ここまで大切に続けてきたのね。本当にすごいことよ。'],
    comeback: [s => `おかえりなさい。${s.gapDays}日ぶりね。また一緒に、無理なく始めましょう。`],
    perfectWeek: [s => `${s.streak}日間、ずっと理想的な睡眠だったのね。こぐま、誇らしい気持ちよ。`],
    allNighter: ['その睡眠時間……こぐま、少し心配になっちゃった。今夜はしっかり休んでね。'],
    noonWake: ['お昼まで眠っていたのね。きっと体が休みを必要としていたのよ。無理しないで。'],
    lateNightStart: ['こんな時間まで起きていたのね……無理しないで、今すぐ休んでほしいわ。'],
    exactHours: [s => `ちょうど${s.exactHourVal}時間だなんて……なんだか、ちょっと特別な夜みたいね。`],
    onTarget: [
      '決めた時間にちゃんと合わせられたのね。えらいわ。',
      '目標通りに眠れて、起きられたのね。素敵なリズムだと思うわ。',
    ],
  },
};

const HIDDEN_CATS = new Set([
  'milestone7', 'milestone30', 'milestone100', 'comeback',
  'perfectWeek', 'allNighter', 'noonWake', 'lateNightStart', 'exactHours',
]);

function computeSleepState(entries, active, settings) {
  const cfg = settings || DEFAULT_SETTINGS;
  const goalHours = computeGoalHours(cfg);
  const targetBedMin = hmToMinutes(cfg.targetBed);
  const targetWakeMin = hmToMinutes(cfg.targetWake);
  const todaySeed = new Date().toISOString().slice(0, 10);

  if (active) {
    const hour = new Date(active.start).getHours();
    if (hour >= 3 && hour < 5) return { category: 'lateNightStart', seed: todaySeed };
    return { category: 'sleeping', seed: todaySeed };
  }
  if (!entries.length) return { category: 'noData', seed: todaySeed };

  const sorted = [...entries].sort((a, b) => new Date(b.start) - new Date(a.start));
  const last = sorted[0];
  const lastDurMs = new Date(last.end) - new Date(last.start);
  const lastDurH = lastDurMs / 3600000;
  const totalCount = entries.length;
  const seed = `${last.id}-${totalCount}`;

  let streak = 0;
  for (const e of sorted) {
    const h = (new Date(e.end) - new Date(e.start)) / 3600000;
    if (h >= goalHours) streak++; else break;
  }

  const recent = sorted.slice(0, 7);
  const hours = recent.map(e => {
    const d = new Date(e.start);
    let h = d.getHours() + d.getMinutes() / 60;
    if (h < 12) h += 24;
    return h;
  });
  const mean = hours.reduce((s, v) => s + v, 0) / hours.length;
  const variance = hours.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / hours.length;
  const stdevMin = Math.sqrt(variance) * 60;
  const irregular = recent.length >= 3 && stdevMin > 60;

  const wakeHour = new Date(last.end).getHours();
  const totalMin = Math.round(lastDurMs / 60000);
  const exactHourVal = totalMin / 60;
  const goalDeltaMin = Math.round(lastDurH * 60 - goalHours * 60);

  const bedDiff = circularDiffMinutes(fmtHM(last.start), targetBedMin);
  const wakeDiff = circularDiffMinutes(fmtHM(last.end), targetWakeMin);
  const onTarget = bedDiff <= 20 && wakeDiff <= 20;

  let gapDays = 0;
  if (sorted.length >= 2) {
    gapDays = Math.floor((new Date(last.start) - new Date(sorted[1].end)) / 86400000);
  }

  const state = { streak, lastDurH, totalCount, wakeHour, exactHourVal, gapDays, seed, goalHours, goalDeltaMin, bedDiff, wakeDiff };

  if (totalCount === 100) return { ...state, category: 'milestone100' };
  if (totalCount === 30) return { ...state, category: 'milestone30' };
  if (totalCount === 7) return { ...state, category: 'milestone7' };
  if (gapDays >= 5) return { ...state, category: 'comeback' };
  if (streak >= 7) return { ...state, category: 'perfectWeek' };
  if (lastDurH < 2) return { ...state, category: 'allNighter' };
  if (wakeHour >= 12) return { ...state, category: 'noonWake' };
  if (irregular) return { ...state, category: 'irregular' };
  if (onTarget) return { ...state, category: 'onTarget' };
  if (streak >= 3) return { ...state, category: 'streak' };
  if (lastDurH < goalHours - 1.5) return { ...state, category: 'shortSleep' };
  if (lastDurH > goalHours + 1.5) return { ...state, category: 'longSleep' };
  if (totalMin % 60 === 0) return { ...state, category: 'exactHours' };
  return { ...state, category: 'normal' };
}

function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function getLine(charId, state) {
  const arr = CHAR_LINES[charId][state.category];
  const idx = hashStr(`${charId}-${state.category}-${state.seed || ''}`) % arr.length;
  const val = arr[idx];
  return typeof val === 'function' ? val(state) : val;
}

function uid() { return 'e_' + Date.now() + '_' + Math.floor(Math.random() * 1000); }

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' });
}
function fmtTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false });
}
function fmtDur(ms) {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60), m = totalMin % 60;
  return `${h}時間${m}分`;
}
function toLocalInput(iso) {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const DEFAULT_SETTINGS = { targetBed: '23:30', targetWake: '07:00' };

function hmToMinutes(hm) {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}
function addMinutesToTime(hm, addMin) {
  let total = (hmToMinutes(hm) + addMin) % 1440;
  if (total < 0) total += 1440;
  const hh = Math.floor(total / 60), mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
function computeGoalHours(settings) {
  let diff = hmToMinutes(settings.targetWake) - hmToMinutes(settings.targetBed);
  if (diff <= 0) diff += 1440;
  return diff / 60;
}
function circularDiffMinutes(a, b) {
  const d = Math.abs(a - b) % 1440;
  return Math.min(d, 1440 - d);
}
function fmtHM(iso) {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function SleepDial({ startIso, endIso, size = 104, targetBed, targetWake }) {
  const start = new Date(startIso), end = new Date(endIso);
  const durH = (end - start) / 3600000;
  const startHour = start.getHours() + start.getMinutes() / 60;
  const endHourMod = ((startHour + durH) % 24 + 24) % 24;
  const cx = size / 2, cy = size / 2, r = size / 2 - 10;
  const toXY = (h, radius = r) => {
    const deg = (h / 24) * 360 - 90;
    const rad = deg * Math.PI / 180;
    return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
  };
  const [sx, sy] = toXY(startHour);
  const [ex, ey] = toXY(endHourMod);
  const largeArc = durH > 12 ? 1 : 0;
  const ticks = [0, 6, 12, 18];

  let targetArc = null;
  if (targetBed && targetWake) {
    const tr = r + 5;
    const tBedHour = hmToMinutes(targetBed) / 60;
    const tWakeHour = hmToMinutes(targetWake) / 60;
    let tDur = tWakeHour - tBedHour;
    if (tDur <= 0) tDur += 24;
    const [tsx, tsy] = toXY(tBedHour, tr);
    const [tex, tey] = toXY(tWakeHour, tr);
    const tLargeArc = tDur > 12 ? 1 : 0;
    targetArc = (
      <path
        d={`M ${tsx} ${tsy} A ${tr} ${tr} 0 ${tLargeArc} 1 ${tex} ${tey}`}
        fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="2" strokeDasharray="1.5 3.5" strokeLinecap="round"
      />
    );
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.line} strokeWidth="2" />
      {targetArc}
      {ticks.map(h => {
        const [x1, y1] = toXY(h);
        return <circle key={h} cx={x1} cy={y1} r="1.6" fill={C.faint} />;
      })}
      <path
        d={`M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey}`}
        fill="none" stroke="url(#dialGrad)" strokeWidth="4" strokeLinecap="round"
      />
      <defs>
        <linearGradient id="dialGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={C.indigo} />
          <stop offset="100%" stopColor={C.amber} />
        </linearGradient>
      </defs>
      <circle cx={sx} cy={sy} r="4" fill={C.indigo} />
      <circle cx={ex} cy={ey} r="4" fill={C.amber} />
      <text x={cx} y={cy - 2} textAnchor="middle" fill={C.text} fontFamily={displayFont} fontSize="15" fontWeight="600">
        {durH.toFixed(1)}h
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill={C.muted} fontFamily={bodyFont} fontSize="8">
        睡眠
      </text>
    </svg>
  );
}

function Stars({ value, onChange, size = 18 }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          onClick={() => onChange(i)}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', lineHeight: 0 }}
          aria-label={`評価 ${i}`}
        >
          <Star size={size} fill={value >= i ? C.amber : 'none'} color={value >= i ? C.amber : C.faint} strokeWidth={1.5} />
        </button>
      ))}
    </div>
  );
}

function TagChips({ selected, onToggle, editable }) {
  const list = editable ? TAGS : selected;
  if (!editable && selected.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {list.map(tag => {
        const active = selected.includes(tag);
        return (
          <button
            key={tag}
            onClick={editable ? () => onToggle(tag) : undefined}
            style={{
              fontSize: 12, padding: '5px 10px', borderRadius: 999,
              border: `1px solid ${active ? C.amber : C.line}`,
              background: active ? 'rgba(232,166,89,0.12)' : 'transparent',
              color: active ? C.amberSoft : C.muted,
              cursor: editable ? 'pointer' : 'default', fontFamily: bodyFont,
            }}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}

function EntryEditor({ entry, onSave, onDelete }) {
  const [quality, setQuality] = useState(entry.quality || 0);
  const [tags, setTags] = useState(entry.tags || []);
  const [notes, setNotes] = useState(entry.notes || '');
  const [confirmDel, setConfirmDel] = useState(false);

  const toggleTag = t => setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  return (
    <div style={{ padding: '14px 4px 4px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>睡眠の質</div>
        <Stars value={quality} onChange={setQuality} />
      </div>
      <div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>気になったこと</div>
        <TagChips selected={tags} onToggle={toggleTag} editable />
      </div>
      <div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>メモ</div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="眠りの様子、夢、体調など"
          rows={2}
          style={{
            width: '100%', background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 10,
            color: C.text, fontFamily: bodyFont, fontSize: 16, padding: 8, resize: 'none', boxSizing: 'border-box',
          }}
        />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', rowGap: 8, justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
        {confirmDel ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: C.muted }}>削除しますか？</span>
            <button onClick={() => onDelete(entry.id)} style={{ ...btnSm, color: '#E88C7D', borderColor: '#E88C7D' }}>削除する</button>
            <button onClick={() => setConfirmDel(false)} style={btnSm}>キャンセル</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDel(true)} style={{ background: 'none', border: 'none', color: C.faint, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontFamily: bodyFont }}>
            <Trash2 size={13} /> 削除
          </button>
        )}
        <button
          onClick={() => onSave(entry.id, { quality, tags, notes })}
          style={{ background: C.amber, color: '#241705', border: 'none', borderRadius: 999, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: bodyFont }}
        >
          保存
        </button>
      </div>
    </div>
  );
}

const btnSm = {
  background: 'none', border: `1px solid ${C.line}`, color: C.muted, borderRadius: 999,
  padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontFamily: bodyFont,
};

const DURATION_PRESETS = [6, 6.5, 7, 7.5, 8, 8.5, 9];

function SettingsModal({ settings, onClose, onSave }) {
  const [bed, setBed] = useState(settings.targetBed);
  const [wake, setWake] = useState(settings.targetWake);
  const goalH = computeGoalHours({ targetBed: bed, targetWake: wake });

  return (
    <ModalShell title="目標睡眠時間の設定" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="目標の就寝時刻">
          <input type="time" value={bed} onChange={e => setBed(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="目標の起床時刻">
          <input type="time" value={wake} onChange={e => setWake(e.target.value)} style={inputStyle} />
        </Field>
        <div style={{ textAlign: 'center', background: C.surface2, borderRadius: 14, padding: '14px 0' }}>
          <div style={{ fontSize: 12, color: C.muted }}>目標睡眠時間</div>
          <div style={{ fontFamily: displayFont, fontSize: 26, fontWeight: 600, marginTop: 2 }}>{fmtDur(goalH * 3600000)}</div>
        </div>
        <Field label="睡眠時間から起床時刻を合わせる">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {DURATION_PRESETS.map(h => {
              const active = Math.abs(goalH - h) < 0.01;
              return (
                <button
                  key={h}
                  onClick={() => setWake(addMinutesToTime(bed, Math.round(h * 60)))}
                  style={{
                    fontSize: 12, padding: '6px 10px', borderRadius: 999,
                    border: `1px solid ${active ? C.amber : C.line}`,
                    background: active ? 'rgba(232,166,89,0.12)' : 'transparent',
                    color: active ? C.amberSoft : C.muted, cursor: 'pointer', fontFamily: bodyFont,
                  }}
                >
                  {h}時間
                </button>
              );
            })}
          </div>
        </Field>
        <div style={{ fontSize: 11, color: C.faint, lineHeight: 1.6 }}>
          就寝・起床それぞれの時刻を目標の20分以内で達成すると、キャラクターが専用のコメントをくれます。
        </div>
        <button
          onClick={() => onSave({ targetBed: bed, targetWake: wake })}
          style={{ background: C.amber, color: '#241705', border: 'none', borderRadius: 999, padding: '11px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: bodyFont }}
        >
          保存
        </button>
      </div>
    </ModalShell>
  );
}

function ManualModal({ onClose, onSave }) {
  const now = new Date();
  const defEnd = toLocalInput(now.toISOString());
  const defStart = toLocalInput(new Date(now.getTime() - 8 * 3600000).toISOString());
  const [start, setStart] = useState(defStart);
  const [end, setEnd] = useState(defEnd);
  const [quality, setQuality] = useState(3);
  const [tags, setTags] = useState([]);
  const [notes, setNotes] = useState('');
  const toggleTag = t => setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  const valid = new Date(end) > new Date(start);

  return (
    <ModalShell title="手動で記録を追加" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="就寝時刻">
          <input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="起床時刻">
          <input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} style={inputStyle} />
        </Field>
        {!valid && <div style={{ fontSize: 12, color: '#E88C7D' }}>起床時刻は就寝時刻より後にしてください</div>}
        <Field label="睡眠の質"><Stars value={quality} onChange={setQuality} /></Field>
        <Field label="気になったこと"><TagChips selected={tags} onToggle={toggleTag} editable /></Field>
        <Field label="メモ">
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'none' }} />
        </Field>
        <button
          disabled={!valid}
          onClick={() => onSave({ id: uid(), start: new Date(start).toISOString(), end: new Date(end).toISOString(), quality, tags, notes })}
          style={{
            background: valid ? C.amber : C.faint, color: '#241705', border: 'none', borderRadius: 999,
            padding: '11px 0', fontSize: 14, fontWeight: 600, cursor: valid ? 'pointer' : 'not-allowed', fontFamily: bodyFont,
          }}
        >
          記録を保存
        </button>
      </div>
    </ModalShell>
  );
}

function WakeModal({ entry, onSkip, onSave }) {
  const [quality, setQuality] = useState(0);
  const [tags, setTags] = useState([]);
  const [notes, setNotes] = useState('');
  const toggleTag = t => setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  const durMs = new Date(entry.end) - new Date(entry.start);

  return (
    <ModalShell title="おはようございます" onClose={onSkip}>
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <div style={{ fontFamily: displayFont, fontSize: 30, fontWeight: 600 }}>{fmtDur(durMs)}</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{fmtTime(entry.start)} 〜 {fmtTime(entry.end)}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
        <Field label="今日の眠りはどうでしたか"><Stars value={quality} onChange={setQuality} size={22} /></Field>
        <Field label="気になったこと（任意）"><TagChips selected={tags} onToggle={toggleTag} editable /></Field>
        <Field label="メモ（任意）">
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="夢、目覚めの感覚など" style={{ ...inputStyle, resize: 'none' }} />
        </Field>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onSkip} style={{ flex: 1, background: 'none', border: `1px solid ${C.line}`, color: C.muted, borderRadius: 999, padding: '11px 0', fontSize: 14, cursor: 'pointer', fontFamily: bodyFont }}>
            あとで
          </button>
          <button
            onClick={() => onSave(entry.id, { quality: quality || null, tags, notes })}
            style={{ flex: 2, background: C.amber, color: '#241705', border: 'none', borderRadius: 999, padding: '11px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: bodyFont }}
          >
            記録する
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 10,
  color: C.text, fontFamily: bodyFont, fontSize: 16, padding: '9px 10px', boxSizing: 'border-box',
};

function ModalShell({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(6,9,18,0.72)', display: 'flex',
      alignItems: 'flex-end', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(2px)',
    }}>
      <div style={{
        width: '100%', maxWidth: 430, background: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: '20px 20px calc(28px + env(safe-area-inset-bottom))', boxSizing: 'border-box', maxHeight: '86dvh', overflowY: 'auto',
        border: `1px solid ${C.line}`, borderBottom: 'none',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: displayFont, fontSize: 18, fontWeight: 600 }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CharacterPanel({ entries, active, settings }) {
  const state = computeSleepState(entries, active, settings);
  const dayIndex = Math.floor(Date.now() / 86400000) % CHARS.length;
  const [selected, setSelected] = useState(CHARS[dayIndex].id);
  const char = CHARS.find(c => c.id === selected);
  const CharIcon = char.icon;
  const line = getLine(char.id, state);
  const isHidden = HIDDEN_CATS.has(state.category);

  return (
    <div style={{
      background: C.surface, borderRadius: 20, padding: 16, marginBottom: 22,
      border: isHidden ? `1px solid ${char.color}88` : `1px solid ${C.line}`,
      boxShadow: isHidden ? `0 0 24px ${char.color}33` : 'none',
      transition: 'box-shadow .3s, border-color .3s',
    }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        {CHARS.map(c => {
          const Icon = c.icon;
          const isActive = c.id === selected;
          return (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              style={{
                width: 38, height: 38, borderRadius: '50%', cursor: 'pointer',
                border: isActive ? `2px solid ${c.color}` : '2px solid transparent',
                background: `linear-gradient(135deg, ${c.color}, ${c.color}99)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: isActive ? 1 : 0.5, transition: 'opacity .15s',
              }}
              aria-label={c.name}
            >
              <Icon size={17} color="#fff" strokeWidth={1.8} />
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${char.color}, ${char.color}99)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CharIcon size={20} color="#fff" strokeWidth={1.8} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <div style={{ fontSize: 12, color: char.color, fontWeight: 600 }}>{char.name}</div>
            {isHidden && (
              <span style={{
                fontSize: 10, color: char.color, background: `${char.color}1F`,
                borderRadius: 999, padding: '2px 7px', fontWeight: 600,
              }}>
                ✨ レアボイス
              </span>
            )}
          </div>
          <div style={{
            fontSize: 13.5, lineHeight: 1.6, color: C.text, background: C.surface2,
            borderRadius: '4px 14px 14px 14px', padding: '10px 12px',
          }}>
            {line}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SleepApp() {
  const [entries, setEntries] = useState([]);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [wakeEntry, setWakeEntry] = useState(null);
  const [showManual, setShowManual] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [expandedId, setExpandedId] = useState(null);
  const savingRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await storage.get('sleep-entries');
        setEntries(r ? JSON.parse(r.value) : []);
      } catch (e) { setEntries([]); }
      try {
        const r = await storage.get('active-session');
        setActive(r ? JSON.parse(r.value) : null);
      } catch (e) { setActive(null); }
      try {
        const r = await storage.get('sleep-settings');
        setSettings(r ? { ...DEFAULT_SETTINGS, ...JSON.parse(r.value) } : DEFAULT_SETTINGS);
      } catch (e) { setSettings(DEFAULT_SETTINGS); }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(t);
  }, [active]);

  const persistEntries = async (list) => {
    setEntries(list);
    try { await storage.set('sleep-entries', JSON.stringify(list)); } catch (e) {}
  };

  const saveSettings = async (newSettings) => {
    setSettings(newSettings);
    try { await storage.set('sleep-settings', JSON.stringify(newSettings)); } catch (e) {}
    setShowSettings(false);
  };

  const startSleep = async () => {
    const session = { start: new Date().toISOString() };
    setActive(session);
    try { await storage.set('active-session', JSON.stringify(session)); } catch (e) {}
  };

  const endSleep = async () => {
    if (!active) return;
    const entry = { id: uid(), start: active.start, end: new Date().toISOString(), quality: null, tags: [], notes: '' };
    const list = [entry, ...entries];
    setActive(null);
    await persistEntries(list);
    try { await storage.delete('active-session'); } catch (e) {}
    setWakeEntry(entry);
  };

  const updateEntry = async (id, patch) => {
    const list = entries.map(e => (e.id === id ? { ...e, ...patch } : e));
    await persistEntries(list);
  };

  const deleteEntry = async (id) => {
    const list = entries.filter(e => e.id !== id);
    await persistEntries(list);
    setExpandedId(null);
  };

  const addManual = async (entry) => {
    const list = [entry, ...entries].sort((a, b) => new Date(b.start) - new Date(a.start));
    await persistEntries(list);
    setShowManual(false);
  };

  const sorted = [...entries].sort((a, b) => new Date(b.start) - new Date(a.start));
  const last = sorted[0];
  const last7 = [...sorted].slice(0, 7).reverse();
  const avgMs = last7.length ? last7.reduce((s, e) => s + (new Date(e.end) - new Date(e.start)), 0) / last7.length : 0;

  const greeting = active ? 'おやすみなさい' : (() => {
    const h = new Date().getHours();
    if (h < 10) return 'おはようございます';
    if (h < 18) return 'こんにちは';
    return 'こんばんは';
  })();

  if (loading) {
    return (
      <div style={{ background: C.bg, minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontFamily: bodyFont }}>
        読み込み中…
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: '100dvh', color: C.text, fontFamily: bodyFont }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap');
        @keyframes breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.045); } }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        html { -webkit-text-size-adjust: 100%; }
        button { touch-action: manipulation; }
        input, textarea { -webkit-appearance: none; appearance: none; }
      `}</style>
      <div style={{
        maxWidth: 430, margin: '0 auto', position: 'relative',
        padding: 'calc(28px + env(safe-area-inset-top)) calc(20px + env(safe-area-inset-right)) calc(40px + env(safe-area-inset-bottom)) calc(20px + env(safe-area-inset-left))',
        backgroundImage: 'radial-gradient(1px 1px at 20% 15%, rgba(255,255,255,0.25) 1px, transparent 0), radial-gradient(1px 1px at 70% 8%, rgba(255,255,255,0.18) 1px, transparent 0), radial-gradient(1.5px 1.5px at 85% 22%, rgba(255,255,255,0.2) 1px, transparent 0), radial-gradient(1px 1px at 40% 4%, rgba(255,255,255,0.15) 1px, transparent 0)',
        backgroundRepeat: 'no-repeat', minHeight: '100dvh',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 12, color: C.muted }}>{new Date().toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}</div>
            <div style={{ fontFamily: displayFont, fontSize: 22, fontWeight: 600, marginTop: 2 }}>{greeting}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowSettings(true)}
              aria-label="目標睡眠時間の設定"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.surface, border: `1px solid ${C.line}`,
                color: C.muted, borderRadius: '50%', width: 32, height: 32, cursor: 'pointer',
              }}
            >
              <Settings size={14} />
            </button>
            <button
              onClick={() => setShowManual(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, background: C.surface, border: `1px solid ${C.line}`,
                color: C.muted, borderRadius: 999, padding: '7px 12px', fontSize: 12, cursor: 'pointer', fontFamily: bodyFont,
              }}
            >
              <Plus size={13} /> 手動で追加
            </button>
          </div>
        </div>

        <CharacterPanel entries={entries} active={active} settings={settings} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '32px 0 28px' }}>
          <button
            onClick={active ? endSleep : startSleep}
            style={{
              width: 176, height: 176, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: active
                ? `radial-gradient(circle at 35% 30%, ${C.amberSoft}, ${C.amber} 60%, #B9793B 100%)`
                : `radial-gradient(circle at 35% 30%, #7C8AC0, ${C.indigo} 55%, ${C.indigoDeep} 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: active ? '0 0 40px rgba(232,166,89,0.35)' : '0 0 40px rgba(108,123,166,0.3)',
              animation: active ? 'breathe 3.2s ease-in-out infinite' : 'none',
            }}
          >
            {active ? <Sun size={48} color="#241705" strokeWidth={1.6} /> : <Moon size={44} color="#0A0F1E" strokeWidth={1.6} />}
          </button>
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            {active ? (
              <>
                <div style={{ fontFamily: displayFont, fontSize: 20, fontWeight: 600 }}>{fmtDur(now - new Date(active.start).getTime())} 経過</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{fmtTime(active.start)} に就寝 ・ タップして起床を記録</div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: C.muted }}>タップして睡眠を記録開始</div>
            )}
          </div>
        </div>

        {last && (() => {
          const lastDurMs = new Date(last.end) - new Date(last.start);
          const goalH = computeGoalHours(settings);
          const deltaMin = Math.round(lastDurMs / 60000 - goalH * 60);
          const deltaLabel = deltaMin === 0
            ? '目標ぴったり'
            : deltaMin > 0
              ? `目標より${deltaMin}分長い`
              : `目標より${Math.abs(deltaMin)}分短い`;
          const deltaColor = Math.abs(deltaMin) <= 15 ? C.amberSoft : C.muted;
          return (
            <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 20, padding: 18, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>{active ? '前回の睡眠' : '昨夜の睡眠'} ・ {fmtDate(last.start)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <SleepDial startIso={last.start} endIso={last.end} targetBed={settings.targetBed} targetWake={settings.targetWake} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: displayFont, fontSize: 26, fontWeight: 600 }}>{fmtDur(lastDurMs)}</div>
                  <div style={{ fontSize: 12, color: C.muted, margin: '2px 0 4px' }}>{fmtTime(last.start)} 〜 {fmtTime(last.end)}</div>
                  <div style={{ fontSize: 11, color: deltaColor, marginBottom: 8 }}>{deltaLabel}（目標 {fmtDur(goalH * 3600000)}）</div>
                  {last.quality ? <Stars value={last.quality} onChange={q => updateEntry(last.id, { quality: q })} size={15} /> : (
                    <button onClick={() => setExpandedId(last.id)} style={{ fontSize: 11, color: C.amberSoft, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: bodyFont }}>
                      評価を記録する →
                    </button>
                  )}
                </div>
              </div>
              {last.tags && last.tags.length > 0 && <div style={{ marginTop: 12 }}><TagChips selected={last.tags} /></div>}
            </div>
          );
        })()}

        {last7.length > 1 && (
          <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 20, padding: 18, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: C.muted }}>直近{last7.length}件の平均</div>
              <div style={{ fontFamily: displayFont, fontSize: 16, fontWeight: 600 }}>{fmtDur(avgMs)}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 70, gap: 6 }}>
              {last7.map(e => {
                const h = (new Date(e.end) - new Date(e.start)) / 3600000;
                const pct = Math.min(100, (h / 10) * 100);
                return (
                  <div key={e.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: '100%', height: 52, display: 'flex', alignItems: 'flex-end' }}>
                      <div style={{
                        width: '100%', height: `${pct}%`, borderRadius: 4,
                        background: `linear-gradient(180deg, ${C.amber}, ${C.indigo})`,
                      }} />
                    </div>
                    <div style={{ fontSize: 10, color: C.faint }}>{new Date(e.start).toLocaleDateString('ja-JP', { weekday: 'short' })}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ fontSize: 12, color: C.muted, margin: '4px 0 10px' }}>記録一覧</div>
        {sorted.length === 0 && (
          <div style={{ fontSize: 13, color: C.faint, padding: '20px 0', textAlign: 'center' }}>
            まだ記録がありません。上のボタンをタップして始めましょう。
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.map(e => {
            const isOpen = expandedId === e.id;
            return (
              <div key={e.id} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16, padding: '12px 14px' }}>
                <button
                  onClick={() => setExpandedId(isOpen ? null : e.id)}
                  style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 0, fontFamily: bodyFont, color: C.text }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{fmtDate(e.start)}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{fmtTime(e.start)} 〜 {fmtTime(e.end)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontFamily: displayFont, fontSize: 15, fontWeight: 600 }}>{fmtDur(new Date(e.end) - new Date(e.start))}</div>
                    {isOpen ? <ChevronUp size={16} color={C.muted} /> : <ChevronDown size={16} color={C.muted} />}
                  </div>
                </button>
                {isOpen && (
                  <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 12 }}>
                    <EntryEditor entry={e} onSave={(id, patch) => { updateEntry(id, patch); }} onDelete={deleteEntry} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {wakeEntry && (
        <WakeModal
          entry={wakeEntry}
          onSkip={() => setWakeEntry(null)}
          onSave={(id, patch) => { updateEntry(id, patch); setWakeEntry(null); }}
        />
      )}
      {showSettings && (
        <SettingsModal settings={settings} onClose={() => setShowSettings(false)} onSave={saveSettings} />
      )}
      {showManual && <ManualModal onClose={() => setShowManual(false)} onSave={addManual} />}
    </div>
  );
}


