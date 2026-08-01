import { useState, useEffect, useRef } from 'react';
import { Moon, Sun, Star, Plus, X, ChevronDown, ChevronUp, Trash2, Sparkles, Cat, Snowflake, Flower2, Settings, Home, Calendar, ChevronLeft, ChevronRight, Download, Upload, BarChart3, Heart, BookOpen, Flame, Award, Lock } from 'lucide-react';
import { storage } from './lib/storage';

const APP_VERSION = 'v1.8.0';

const SEASONAL_DATES = {
  '01-01': 'newYear',
  '07-07': 'tanabata',
  '10-31': 'halloween',
  '12-24': 'christmas',
  '12-25': 'christmas',
  '12-31': 'newYearsEve',
};
function getSeasonalCategory() {
  const now = new Date();
  const mmdd = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return SEASONAL_DATES[mmdd] || null;
}

const AFFECTION_MIN = -10;
const AFFECTION_MAX = 20;
const DEFAULT_AFFECTION = { himari: 0, rui: 0, touko: 0, yuki: 0 };
const AFFECTION_DELTA = {
  milestone100: 5, milestone30: 4, milestone7: 3, comeback: 2, perfectWeek: 4,
  onTarget: 3, streak: 2, exactHours: 1, normal: 1,
  noonWake: -1, longSleep: -1, irregular: -2, shortSleep: -2, allNighter: -3,
};
const BEDTIME_GRACE_MIN = 15;
const BEDTIME_LATE_PENALTY = -2;
function computeBedLatePenalty(bedLateMin) {
  return (typeof bedLateMin === 'number' && bedLateMin > BEDTIME_GRACE_MIN) ? BEDTIME_LATE_PENALTY : 0;
}
function computeCombinedAffectionDelta(state) {
  const categoryDelta = AFFECTION_DELTA[state.category] || 0;
  const metGoalDuration = typeof state.lastDurH === 'number' && typeof state.goalHours === 'number' && state.lastDurH >= state.goalHours;
  const latePenalty = metGoalDuration ? 0 : computeBedLatePenalty(state.bedLateMin);
  return { categoryDelta, latePenalty, total: categoryDelta + latePenalty, metGoalDuration };
}
function clampAffection(n) {
  return Math.max(AFFECTION_MIN, Math.min(AFFECTION_MAX, n));
}
function getAffectionTier(score) {
  if (score <= -4) return 'low';
  if (score <= 6) return 'mid';
  if (score <= 13) return 'high';
  return 'max';
}
const TIER_LABELS = { low: '低迷', mid: 'ふつう', high: '好感', max: '大好き' };

// How strongly each character's affection reacts to the same event.
// posMult scales positive deltas, negMult scales negative deltas (both >=0).
const AFFECTION_PERSONALITY = {
  himari: { posMult: 1.3, negMult: 1.3 }, // expressive: big swings both ways
  rui: { posMult: 0.6, negMult: 1.3 },     // tsundere: stingy with praise, easily worried
  touko: { posMult: 0.9, negMult: 0.7 },   // measured: calm and steady either direction
  yuki: { posMult: 1.0, negMult: 0.5 },    // gentle: warm on good nights, forgiving on bad ones
};

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
  green: '#7FBF8A',
  greenSoft: '#A9D8B0',
  red: '#E0847E',
  redSoft: '#EDABA6',
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
    sleeping: {
      mid: [
        'ふふっ、今夜もぐっすりだね!夢の中でも応援してるよ〜!',
        'おやすみ!スピカが見守ってるから、安心して眠っていいよ!',
        '今夜も星空の下でおやすみなさい!いい夢見てね!',
        'おやすみ!今日も一日お疲れさま、ゆっくり体を休めてね!',
      ],
      low: ['……今日はもう、寝るだけでいいよ。それだけで十分だから。', '……うん、おやすみ。それだけ。', '……おやすみ。それだけ言っておくね。'],
      high: ['おやすみ!今夜もそばで見てるからね、安心して眠って!', '今夜もぐっすりだといいな。スピカ、応援してるよ!', 'おやすみ!明日も一緒にがんばろうね!'],
      max: ['おやすみ、大切な人。今夜もいい夢いっぱい見てね、ずっと応援してるから!', 'きみの寝顔、想像するだけでスピカ幸せな気持ちになるよ。おやすみ!', 'きみが眠ってる間もずっと見守ってるからね。おやすみ、また明日!'],
    },
    wakeGreeting: {
      mid: [
        'おはよう!今日も一日、スピカと一緒に元気にいこうね!',
        'おはよう!よく眠れた?今日もいい日になりますように!',
        '目覚めた瞬間から応援してるよ!おはよう、今日もファイト!',
      ],
      low: ['……おはよう。まあ、それだけ。'],
      high: ['おはよう!今日もきみに会えて、スピカ嬉しいな!'],
      max: ['おはよう、大切な人!きみの目覚めを見られること、スピカの毎日の一番の楽しみなんだ!'],
    },
    noData: [
      'はじめまして!今夜からいっしょに睡眠記録、がんばろうね!',
      'スピカだよ!よろしくね、まずは今夜の記録からスタートしよう!',
    ],
    streak: {
      mid: [
        s => `すごいすごい!${s.streak}日連続で目標達成だよ!このままいこう!`,
        s => `${s.streak}日も続いてる!スピカ、ちょっと感動してるかも!`,
        s => `いい調子いい調子!${s.streak}日連続なんてすごいよ!`,
      ],
      low: [s => `${s.streak}日……続いてるんだね。悪くはないと思うよ。`, s => `${s.streak}日か。まあ、続けられてるならいいけど。`],
      high: [s => `${s.streak}日連続だ!スピカ、応援してて本当によかった!`, s => `${s.streak}日連続なんて、スピカにはとても真似できないよ!すごい!`],
      max: [s => `${s.streak}日も!?きみとここまで来られて、スピカ本当に幸せだよ!`, s => `${s.streak}日……きみのその頑張り、スピカがちゃんと見てるからね!`],
    },
    shortSleep: {
      mid: [
        'むむっ、ちょっと短かったね…今夜は少し早めにベッドに入ってみない?',
        '寝不足は元気の敵だよ!今夜こそ早めに休もうね!',
        'スピカ、ちょっと心配…今日は無理しないでね!',
      ],
      low: ['……そっか。まあ、無理しない範囲でね。', '……そう。まあ気をつけて。'],
      high: ['ちょっと短かったね、心配だよ。今夜は早めに休んでね?', '無理してない?スピカ、きみの体が心配だよ。'],
      max: ['きみのことが大切だから言うね。今夜はちゃんと休んで、スピカと約束!', 'きみが辛い思いをしてると思うと、スピカも胸が痛いんだ。今夜はゆっくりね。'],
    },
    longSleep: {
      mid: [
        'たくさん眠れたね!でも寝すぎ注意かも?次はちょうどいい時間を目指そ!',
        'ゆっくり休めたみたいでよかった!でも起きたらしっかり日光浴びてね!',
        '眠りすぎもリズムが崩れちゃうかも。次はほどよく調整しよ!',
      ],
      low: ['……そう。まあ、休めたならいいんじゃない。', '……そう、なら良かった。'],
      high: ['たくさん眠れたんだね、よかった!無理してなかった?', 'しっかり休めたなら安心!体、大事にしてね。'],
      max: ['ゆっくり休めたみたいで安心したよ。きみの体が一番大事だからね。', 'きみがゆっくり休めたなら、それだけでスピカは十分嬉しいよ。'],
    },
    irregular: {
      mid: [
        '寝る時間がバラバラかも…同じ時間に眠ると調子が上がるらしいよ!',
        '毎日の就寝時間、ちょっとずつ揃えてみない?スピカも応援するよ!',
        'リズムが整うと、もっと元気に過ごせるはずだよ!',
      ],
      low: ['……バラバラだね。まあ、好きにすればいいと思うけど。', '……まあ、そのうち直せばいいんじゃない。'],
      high: ['リズム整えていこ?きみが元気なのが一番だから!', '一緒に整えていこう!スピカも隣にいるからね。'],
      max: ['きみのために言うね、少しずつでいいから整えていこう。ずっと隣で手伝うから!', 'きみのリズムが整うまで、スピカ、絶対に諦めずに応援し続けるからね!'],
    },
    normal: {
      mid: [
        '今日もいい感じ!この調子でコツコツいこうね!',
        '順調順調!スピカ、見てるだけでうれしいよ!',
        '今夜もぐっすり眠って、明日もがんばろうね!',
      ],
      low: ['……記録、ちゃんと見てるよ。それだけは伝えとくね。', '……まあ、いつも通りだね。'],
      high: ['今日もいい感じだね!スピカ、毎日見てるのがすごく楽しいよ!', '安定してるね!スピカ、そういうところ好きだよ!'],
      max: ['きみの毎日を見てるの、スピカの一番の楽しみなんだ。今日もありがとう!', '毎日コツコツ頑張ってるきみを見てると、スピカも元気もらえるんだ。'],
    },
    milestone7: ['わ、記録7日目だ!スピカとの出会いから1週間だね、ありがとう!'],
    milestone30: ['うそ、もう30日!?ここまで続けてくれて、スピカ本当に嬉しいよ…!'],
    milestone100: ['100日達成…!?スピカ、感動で泣きそう。ずっとそばにいるからね!'],
    comeback: [s => `おかえりなさい!${s.gapDays}日ぶりだね、待ってたよ!また一緒にがんばろう!`],
    perfectWeek: {
      mid: [s => `${s.streak}日間パーフェクト…!?スピカ、鳥肌立っちゃった!すごすぎるよ!!`],
      low: [s => `${s.streak}日……続いてるんだね。頑張ってるとは思うよ。`, s => `${s.streak}日か。まあ、続けられてるならいいけど。`],
      high: [s => `${s.streak}日間パーフェクトなんて、きみ本当にすごいよ!スピカ誇らしい!`, s => `${s.streak}日間なんて、スピカ本当に鳥肌もの!誇らしいよ!`],
      max: [s => `${s.streak}日間ずっと…!きみと積み重ねてきたこの日々、スピカの宝物だよ!`, s => `${s.streak}日間……きみと一緒に過ごしたこの時間、スピカにとって一生の宝物だよ!`],
    },
    allNighter: {
      mid: ['え、ちょっとその睡眠時間…スピカ本気で心配してるからね!?次は絶対ゆっくり寝て!'],
      low: ['……その時間、ちょっと心配。まあ、きみの自由だけど。', '……その時間はちょっとどうかと思うけど、まあいいか。'],
      high: ['その睡眠時間、本気で心配だよ!次は絶対ゆっくり休んで!', '本当に大丈夫?スピカ、心配で夜も眠れなくなっちゃうよ!'],
      max: ['お願いだから、ちゃんと休んで。きみに何かあったら、スピカ辛いから。', 'きみに何かあったらどうしようって、スピカ本気で怖くなるんだ。お願い、休んで。'],
    },
    noonWake: ['お昼まで眠ってたんだね!?よっぽど疲れてたのかな…今日はゆっくりでいいよ!'],
    lateNightStart: ['こんな時間まで起きてたの!?スピカ、ちょっとびっくり…今すぐ休もう!'],
    exactHours: [s => `ちょうど${s.exactHourVal}時間ぴったり!?なんか運命感じちゃうね!`],
    onTarget: {
      mid: [
        '就寝も起床も目標にほぼぴったりだったね!リズムばっちりだよ!',
        '目標の時間通りに眠れてる!スピカ、見てて気持ちいいくらい!',
      ],
      low: ['……ちゃんと目標通りだったんだ。意外。', '……たまたまだよね、きっと。'],
      high: ['目標通りにできたね!スピカ、本当に嬉しいよ!', 'すごい、ちゃんと目標通り!スピカ感激しちゃった!'],
      max: ['きみが目標を守ってくれるの、スピカにとってすごく嬉しいことなんだ。ありがとう!', 'きみがこんなにちゃんとしてくれるの、スピカにとって本当に誇らしいことなんだ!'],
    },
    newYear: ['あけましておめでとう!今年もいっぱい眠って、いっぱい笑おうね!'],
    tanabata: ['七夕だね!星に願いごと…きみがぐっすり眠れますようにって、スピカもお願いしちゃった!'],
    halloween: ['ハロウィンだ!今夜はお菓子より、ぐっすり眠るのが一番のご褒美かもね!'],
    christmas: ['メリークリスマス!今夜はあったかくして、ゆっくり眠ってね!'],
    newYearsEve: ['今年も一年、お疲れさま!今夜はゆっくり休んで、いい年越しをしてね!'],
  },
  rui: {
    sleeping: {
      mid: [
        '……べ、別に心配してるわけじゃないんだから。ちゃんと寝なさいよね。',
        '早く寝なさいよ。……おやすみくらい、言ってあげる。',
        '眠るまで見ててあげようか…な、なんてね。早く寝なさいよ。',
        '……もう、いつまでも起きてないで早く寝なさいよ。おやすみ。',
      ],
      low: ['……勝手にすれば。もう何も言わないから。', '……早く寝れば。それだけ。', '……もう好きにしなさいよ。'],
      high: ['早く寝なさいよ。……ちゃんと見ててあげるから。', '……ちゃんと見ててあげるから、安心して寝なさいよ。', '……おやすみ。明日もちゃんと起きなさいよね。'],
      max: ['……おやすみ。ちゃんと隣にいるから、安心して眠りなさいよ、ばか。', '……隣にいるから。もう、安心して眠りなさいよ、ばか。', '……ずっとそばにいてあげるから。おやすみ、ばか。'],
    },
    wakeGreeting: {
      mid: [
        '……おはよう。ちゃんと起きられたじゃない。',
        'おはよう。……別に待ってたわけじゃないんだからね。',
        '……起きた?おはよう。今日も一日、頑張りなさいよ。',
      ],
      low: ['……おはよう。それだけ。'],
      high: ['……おはよう。きみが起きてくるの、ちょっと待ってたのよ。'],
      max: ['……おはよう。あんたの目が覚めるの、こと毎朝ちゃんと楽しみにしてるんだから。ばか。'],
    },
    noData: [
      'ふん、記録くらい続けなさいよ。……応援は、してあげなくもないから。',
      'こと、よ。別にあんたのために名乗ったわけじゃないけど…よろしく。',
    ],
    streak: {
      mid: [
        s => `${s.streak}日も続いてるじゃない。……ま、まあ悪くないんじゃない?`,
        s => `${s.streak}日連続…ふ、ふーん。ちょっとだけ見直したかも。`,
        s => `やるじゃない、${s.streak}日も。……調子に乗らないでよね。`,
      ],
      low: [s => `${s.streak}日……ふーん。別に、どうでもいいけど。`, s => `${s.streak}日……ふん、まあ普通じゃない。`],
      high: [s => `${s.streak}日も続けるなんて、あんた本当はすごいのね。認めてあげる。`, s => `${s.streak}日も……あんた、本当はやればできる子なのね。`],
      max: [s => `${s.streak}日……こと、あんたのこと誇りに思ってるんだから。ちゃんと知りなさいよ。`, s => `${s.streak}日間……こと、あんたのこと本気で尊敬してるんだから。ばか。`],
    },
    shortSleep: {
      mid: [
        'こんな時間まで起きてたの?ばか。ちゃんと寝ないと知らないから。',
        '睡眠削るとか、あんた自分を大事にしてないでしょ。……心配してるのよ、ばか。',
        '寝不足の顔、ひどいわよ。今夜は早く寝なさいよね。',
      ],
      low: ['……勝手にすれば。知らないから。', '……勝手にすれば、もう言わないから。'],
      high: ['ちゃんと寝なさいよ、心配してるんだから。ばか。', '……ちゃんと寝なさいよ。心配してるんだからね、ばか。'],
      max: ['お願いだから寝て。あんたに何かあったら、こと嫌だから。ばか。', '……お願いだから、ちゃんと寝て。あんたがいないと、こと困るんだから。'],
    },
    longSleep: {
      mid: [
        '寝すぎ。……心配、くらいはしてあげる。次はちゃんと起きなさいよ。',
        'そんなに眠って…な、何かあったの?無理なら無理って言いなさいよね。',
        '寝すぎも体に良くないのよ。ちゃんとリズム作りなさい。',
      ],
      low: ['……そう。別にいいけど。', '……そう、まあどうでもいいけど。'],
      high: ['寝すぎ。……でも休めたならよかったじゃない。', '……休めたならよかったじゃない。無理しないでよね。'],
      max: ['無理してなかったのね、よかった。……あんたの体が一番大事なんだから。', '……あんたの体が一番大事なんだから。ちゃんと休みなさいよ、ばか。'],
    },
    irregular: {
      mid: [
        '毎日バラバラって…だらしないんだから。少しは決めなさいよ。',
        '決まった時間に寝るくらい、できるでしょ。……手伝ってあげてもいいけど。',
        'そんな適当な生活、こと許さないから。次からちゃんとしなさいよ。',
      ],
      low: ['……もう好きにすれば。呆れた。', '……好きにすれば。呆れて物も言えないわ。'],
      high: ['少しは整えなさいよ。……手伝ってあげるから。', '……手伝ってあげるから、少しずつ直しなさいよ。'],
      max: ['こと、本気で心配してるのよ。ちゃんとリズム整えなさい。約束よ。', '……こと、本気で心配してるの。ちゃんと聞きなさいよ、ばか。'],
    },
    normal: {
      mid: [
        '……まあ、悪くない記録ね。別に褒めてないけど。',
        '順調じゃない。……ふん、当然よね。',
        '普通に、ちゃんとできてるじゃない。それでいいのよ。',
      ],
      low: ['……別に。見てるとも見てないとも言ってないから。', '……ふーん、そう。'],
      high: ['順調じゃない。……こと、ちょっとだけ嬉しいのよ。', '……悪くないじゃない。ちょっとだけ、認めてあげる。'],
      max: ['……あんたの記録見るの、地味に楽しみにしてるんだから。ばか。', '……あんたの記録、正直毎日楽しみにしてるんだから。言わせないでよ、ばか。'],
    },
    milestone7: ['1週間…ね。別に数えてたわけじゃないけど…続いてるじゃない。'],
    milestone30: ['30日って…あんた、地味にすごいことしてるのよ。……気づいてないでしょ。'],
    milestone100: ['100日って…え、ちょっと待って。こと、素直に感動してるんだけど。ばか。'],
    comeback: [s => `……${s.gapDays}日も、どこ行ってたのよ。心配、したんだからね。ばか。`],
    perfectWeek: {
      mid: [s => `${s.streak}日間完璧って…あんた本気出したらすごいじゃない。ちょっと見直した。`],
      low: [s => `${s.streak}日……別に。まあ頑張ってるとは思うけど。`, s => `${s.streak}日……まあ、続けてるだけは褒めてあげる。`],
      high: [s => `${s.streak}日間も完璧なんて……こと、素直にすごいと思うわ。`, s => `${s.streak}日間って……あんた、本当にすごいじゃない。認める。`],
      max: [s => `${s.streak}日間ずっと……あんたのこと、こと本当に大事に思ってるんだから。ばか。`, s => `${s.streak}日間……あんたのこと、こと本当に大事に思ってるんだから。ばか、知りなさいよ。`],
    },
    allNighter: {
      mid: ['その睡眠時間、正気?こと、本気で怒ってるからね。ちゃんと寝なさい。'],
      low: ['……知らないから。勝手にすれば。', '……知らないから。もう好きにして。'],
      high: ['その睡眠時間、正気?こと、本気で怒ってるんだからね。', '……正気なの?こと、本気で怒ってるんだからね。'],
      max: ['お願いだから寝て。……あんたがいなくなったら、こと困るんだから。ばか。', '……お願いだから寝て。あんたがいなくなったら、こと本当に困るの。ばか。'],
    },
    noonWake: ['お昼まで寝てたの…?ま、たまにはいいけど。次はちゃんと戻しなさいよ。'],
    lateNightStart: ['こんな時間まで何してたのよ。……早く寝なさい。ばか。'],
    exactHours: [s => `ちょうど${s.exactHourVal}時間って…なにその中途半端にきれいな数字。ふふっ。`],
    onTarget: {
      mid: [
        '時間、ちゃんと目標通りじゃない…べ、別に見直したわけじゃないけど。',
        '就寝も起床も目標ぴったりって…やればできるんじゃない。',
      ],
      low: ['……ふーん。たまたまでしょ。', '……ふん、まぐれでしょ。'],
      high: ['ちゃんと目標通りって……あんたやればできるんじゃない。', '……ちゃんとできるじゃない。こと、ちょっと見直したわ。'],
      max: ['こと、正直すごく嬉しいの。……ちゃんと言っておくわね、ばか。', '……こと、正直感激してるんだから。ちゃんと知りなさいよ、ばか。'],
    },
    newYear: ['……あけましておめでとう。今年もよろしく、ばか。'],
    tanabata: ['……七夕なんだ。別に願い事なんて考えてないから。……あんたの健康、とは言っておくけど。'],
    halloween: ['……ハロウィンだからって、夜更かししていい理由にはならないから。ちゃんと寝なさいよ。'],
    christmas: ['……メリークリスマス、とだけ言っておくわ。ばか。'],
    newYearsEve: ['……一年、よく頑張ったんじゃない。今夜くらいはゆっくりしなさいよ。'],
  },
  touko: {
    sleeping: {
      mid: [
        '計測を開始。良質な睡眠を。おやすみなさい。',
        '睡眠中は成長ホルモンの分泌が活発になる。しっかり休むといい。',
        '記録開始。今夜も安定した睡眠を期待している。',
        '就寝を確認。今夜のデータも興味深く記録させてもらう。おやすみ。',
      ],
      low: ['……記録を継続する。それ以上でも以下でもない。', '……記録のみ。以上。', '……計測開始。それだけだ。'],
      high: ['おやすみ。今夜も、良い睡眠を期待している。', '……今夜も良質な睡眠を。期待している。', '……おやすみ。良いデータを期待している。'],
      max: ['おやすみなさい。きみの睡眠の質が上がることが、私の一番の関心事だ。', '……きみの睡眠の質向上が、私にとって重要な指標になっている。おやすみ。', '……きみが眠っている間も、私はそばで見守っている。おやすみ。'],
    },
    wakeGreeting: {
      mid: [
        '……起床を確認した。おはよう。',
        'おはよう。今日一日のパフォーマンスに、睡眠の質が影響することを覚えておいてほしい。',
        '……目覚めたか。おはよう。今日も良い一日を。',
      ],
      low: ['……起床確認。以上だ。'],
      high: ['……おはよう。きみの目覚めを確認できて、私は安心している。'],
      max: ['……おはよう。きみが目を覚ますこの瞬間を、私は毎朝大切に思っている。'],
    },
    noData: [
      'データがまだない。まずは今夜の記録から始めよう。',
      'すばる。記録は継続することに意味がある。よろしく。',
    ],
    streak: {
      mid: [
        s => `${s.streak}日連続で目標を達成している。良い傾向だ。`,
        s => `${s.streak}日間、安定した記録。悪くない。`,
        s => `継続日数${s.streak}日。習慣として定着しつつある。`,
      ],
      low: [s => `${s.streak}日……継続はしている。`, s => `${s.streak}日……継続していることは確認した。`],
      high: [s => `${s.streak}日連続。……正直、称賛に値すると思っている。`, s => `${s.streak}日連続……これは、称賛に値するデータだ。`],
      max: [s => `${s.streak}日……ここまで積み重ねたきみを、私は誇りに思う。`, s => `${s.streak}日間……ここまで積み重ねたきみを、私は心から誇りに思う。`],
    },
    shortSleep: {
      mid: [
        '睡眠時間が不足している。判断力や集中力に影響する可能性がある。',
        '6時間未満の睡眠が続くと、負債は蓄積する。今夜は早めに。',
        '短時間睡眠は一時的な対処に過ぎない。根本的な改善を勧める。',
      ],
      low: ['……データとして記録した。以上。', '……記録した。以上だ。'],
      high: ['睡眠不足が続いている。心配だ。今夜は改善を。', '……睡眠不足が続いている。改善を勧める。'],
      max: ['きみの健康が、私にとって最優先事項だ。今夜は必ず休んでほしい。', '……きみの健康を守ることが、私にとって最も重要な使命だ。休んでほしい。'],
    },
    longSleep: {
      mid: [
        '平均より長い。寝すぎも体内時計を乱す要因になり得る。',
        '長時間の睡眠は、疲労の蓄積を示している可能性がある。',
        '9時間超。次は起床時間を意識するといい。',
      ],
      low: ['……そうか。記録しておく。', '……そうか、記録しておく。'],
      high: ['休息が取れたようだ。良かった。', '……休息が取れたなら、それは良いことだ。'],
      max: ['きみがしっかり休めたなら、それだけで十分だ。安心した。', '……きみが十分に休めたなら、私はそれだけで安心する。'],
    },
    irregular: {
      mid: [
        '就寝時刻にばらつきがある。規則性が睡眠の質を左右する。',
        '体内時計は光と時刻の一貫性で調整される。次は揃えてみて。',
        '不規則な就寝は、睡眠効率を下げる傾向がある。',
      ],
      low: ['……不規則だな。以上だ。', '……不規則。データとして記録した。'],
      high: ['リズムを整えよう。……サポートする。', '……一緒にリズムを整えよう。私が力になる。'],
      max: ['きみのために、私はいつでも力を貸す。一緒に整えていこう。', '……きみのためなら、私はいつでも時間を割く。共に整えていこう。'],
    },
    normal: {
      mid: [
        '安定した記録だ。この状態を維持するといい。',
        '特に問題は見当たらない。この調子で。',
        '良好な記録。継続を推奨する。',
      ],
      low: ['……問題ない。それだけだ。', '……問題なし。記録した。'],
      high: ['良好な記録だ。継続していることを評価する。', '……安定している。これは良い兆候だ。'],
      max: ['きみの記録を見るのが、私にとって意味のある時間になっている。', '……きみの記録を確認するこの時間が、私にとって価値のあるものになっている。'],
    },
    milestone7: ['記録開始から7日。データとして意味を持ち始める頃だ。'],
    milestone30: ['30日分のデータが揃った。傾向が見えてくる。……よくやった。'],
    milestone100: ['100日。……正直、驚いている。称賛に値する記録だ。'],
    comeback: [s => `${s.gapDays}日間のブランクがあった。データは途切れたが、再開できたことに意味がある。`],
    perfectWeek: {
      mid: [s => `${s.streak}日間、一度も基準を下回っていない。……理想的な記録だ。`],
      low: [s => `${s.streak}日……継続している。以上だ。`, s => `${s.streak}日……継続している。それだけだ。`],
      high: [s => `${s.streak}日間、一度も基準を下回っていない。……称賛に値する。`, s => `${s.streak}日間……このデータは、明確に称賛に値する。`],
      max: [s => `${s.streak}日間……きみのこの積み重ねを、私は誰よりも近くで見てきた。誇りに思う。`, s => `${s.streak}日間……きみのこの積み重ねを、私は誰よりも近くで見守ってきた。誇りに思う。`],
    },
    allNighter: {
      mid: ['極端に短い睡眠時間を検知。今夜は必ず十分な休息を。'],
      low: ['……記録した。それだけだ。', '……記録した。それだけだ。'],
      high: ['極端に短い。心配している。今夜は必ず休息を。', '……極端に短い。看過できない。今夜は必ず休息を。'],
      max: ['きみに何かあったら、私は困る。……お願いだから、休んでほしい。', '……きみに何かあれば、私は自分を許せない。お願いだから、休んでほしい。'],
    },
    noonWake: ['起床が正午を超えている。生活リズムのずれに注意が必要だ。'],
    lateNightStart: ['深夜3時台の就寝を検知。生体リズムへの影響が懸念される。'],
    exactHours: [s => `${s.exactHourVal}時間ちょうど。……偶然にしては、きれいな数字だ。`],
    onTarget: {
      mid: [
        '就寝・起床ともに目標範囲内。理想的な実行だ。',
        '設定した時刻とのずれが小さい。計画通りと言っていい。',
      ],
      low: ['……目標通りか。記録しておく。', '……目標通り。記録しておく。'],
      high: ['就寝・起床ともに理想的だ。……素直に、良い記録だと思う。', '……理想的な実行だ。素直に評価する。'],
      max: ['きみがここまで正確に実行できるのは、私にとって誇らしいことだ。', '……きみのこの正確さは、私にとって誇りそのものだ。'],
    },
    newYear: ['新年になった。今年も規則正しい睡眠を、共に目指そう。'],
    tanabata: ['七夕か。星に願いを込める風習には、心理的な効果もあるらしい。今夜はゆっくり眠るといい。'],
    halloween: ['ハロウィン当日でも、生活リズムは崩さない方がいい。それが一番の仮装だ。'],
    christmas: ['クリスマスか。特別な日でも、睡眠の重要性は変わらない。良い夜を。'],
    newYearsEve: ['一年間の記録、お疲れ様。今夜は特別に、良い休息を。'],
  },
  yuki: {
    sleeping: {
      mid: [
        'ゆっくり休んでね。今夜もいい夢が見られますように。',
        'おやすみなさい。こぐま、そばで見守ってるから安心してね。',
        '今日も一日おつかれさま。ゆっくり眠ってね。',
        'おやすみなさい。今日も頑張ったね、ゆっくり体を休めてね。',
      ],
      low: ['……おやすみなさい。それだけ言っておくわね。', '……おやすみなさい。それだけね。', '……おやすみ。ゆっくりね。'],
      high: ['おやすみなさい。今夜もそばで見守ってるから。', '……おやすみなさい。今夜もそばにいるからね。', 'おやすみなさい。明日もまた、笑顔で会えますように。'],
      max: ['おやすみなさい、大切な人。今夜もいい夢が見られますように。ずっとそばにいるからね。', '……あなたの眠りを見守れること、こぐまにとって幸せなことなの。おやすみ。', 'おやすみなさい。あなたが安心して眠れる場所でいたいの。今夜もぐっすりね。'],
    },
    wakeGreeting: {
      mid: [
        'おはよう。よく眠れた?今日もゆったりいきましょうね。',
        'おはようございます。今日も一日、穏やかな日になりますように。',
        'おはよう。目覚めてくれて、こぐま安心したわ。',
      ],
      low: ['……おはよう。それだけね。'],
      high: ['おはよう。あなたが目を覚ましてくれて、こぐま嬉しいわ。'],
      max: ['おはよう、大切な人。あなたの目覚めを見守れるこの時間が、こぐまの一番好きな時間なの。'],
    },
    noData: [
      'はじめまして。今日から一緒に、眠りを大事にしていきましょうね。',
      'こぐまです。よろしくね。無理はしなくていいから、少しずつ始めましょう。',
    ],
    streak: {
      mid: [
        s => `${s.streak}日も続けられて、えらいわ。頑張り屋さんね。`,
        s => `${s.streak}日間、よく続いているのね。ちゃんと見てたわよ。`,
        s => `毎日えらいね。${s.streak}日連続、無理せず続けられてるのが素敵。`,
      ],
      low: [s => `${s.streak}日……続いているのね。まあ、いいと思うわ。`, s => `${s.streak}日……続いているのね、それでいいと思うわ。`],
      high: [s => `${s.streak}日も続けられて、本当にえらいわ。誇らしい。`, s => `${s.streak}日間も……本当によく頑張っているのね。`],
      max: [s => `${s.streak}日……あなたとここまで来られて、こぐま本当に幸せよ。`, s => `${s.streak}日間……あなたと過ごせるこの時間、こぐまにとって宝物なの。`],
    },
    shortSleep: {
      mid: [
        '少し疲れが溜まってない?今夜は早めに休んでね。',
        '無理してない?こぐま、ちょっと心配だから、今夜はゆっくりしてね。',
        '睡眠が足りてないと、心も疲れやすくなるの。今夜は自分を労わってあげて。',
      ],
      low: ['……そう。まあ、無理しない程度にね。', '……そう、まあ無理しないでね。'],
      high: ['少し心配だわ。今夜は早めに休んでね。', '……こぐま、少し心配になってしまったわ。休んでね。'],
      max: ['あなたが大切だから言うの。今夜はちゃんと休んでほしいわ、約束ね。', '……あなたが辛い思いをしていると思うと、こぐまも悲しくなるの。休んでほしいわ。'],
    },
    longSleep: {
      mid: [
        'たくさん眠れたのね。体が休息を求めていたのかもしれないわ。',
        'しっかり眠れたなら、それも大事な時間よ。無理に短くしなくていいの。',
        '疲れが溜まってたのかもね。今日は自分に優しくしてあげて。',
      ],
      low: ['……そう。まあいいんじゃないかしら。', '……そう、それでいいと思うわ。'],
      high: ['しっかり休めたのね、よかったわ。', '……しっかり休めたのね、良かったわ。'],
      max: ['あなたの体が一番大事よ。ゆっくり休めたなら、それでいいの。', '……あなたがゆっくり休めたなら、こぐまはそれだけで十分嬉しいの。'],
    },
    irregular: {
      mid: [
        '毎日の眠る時間、少しずつ揃えていけるといいわね。',
        '焦らなくて大丈夫。少しずつリズムを整えていきましょう。',
        '眠る時間がバラバラでも、責めなくていいのよ。次から少しずつね。',
      ],
      low: ['……そうなのね。まあ、あなたの自由だけど。', '……そうなのね、まあ気にしなくていいわ。'],
      high: ['少しずつ整えていきましょう。こぐまも手伝うから。', '……一緒に整えていきましょう、こぐまも手伝うから。'],
      max: ['あなたのことが心配だから言うの。一緒に、無理なく整えていきましょうね。', '……あなたのことが大切だから言うの。無理なく、一緒にやっていきましょうね。'],
    },
    normal: {
      mid: [
        '今日もよく眠れているみたい。安心したわ。',
        '穏やかな記録ね。この調子で、無理なく続けましょう。',
        'いい感じよ。ちゃんと自分を大切にできてるね。',
      ],
      low: ['……そう。まあ、それでいいんじゃないかしら。', '……そう、変わりないのね。'],
      high: ['今日もよく眠れているみたい。こぐま、安心したわ。', '……安定していて、こぐま安心したわ。'],
      max: ['あなたの毎日を見守れること、こぐまにとって本当に大切な時間なの。', '……あなたの毎日を見守れること、こぐまの一番の喜びなの。'],
    },
    milestone7: ['1週間、続けられたのね。よくがんばったわ、えらい。'],
    milestone30: ['30日……ずっと見守ってきたから、こぐま、なんだか感慨深いわ。'],
    milestone100: ['100日。……ここまで大切に続けてきたのね。本当にすごいことよ。'],
    comeback: [s => `おかえりなさい。${s.gapDays}日ぶりね。また一緒に、無理なく始めましょう。`],
    perfectWeek: {
      mid: [s => `${s.streak}日間、ずっと理想的な睡眠だったのね。こぐま、誇らしい気持ちよ。`],
      low: [s => `${s.streak}日……続いてはいるのね。`, s => `${s.streak}日……続いているのね、頑張っているわ。`],
      high: [s => `${s.streak}日間も理想的だったのね。こぐま、誇らしい気持ちよ。`, s => `${s.streak}日間も理想的だったなんて、本当にすごいことよ。`],
      max: [s => `${s.streak}日間……あなたと積み重ねてきたこの日々、こぐまの宝物だわ。`, s => `${s.streak}日間……あなたと積み重ねたこの日々、こぐまにとってかけがえのないものだわ。`],
    },
    allNighter: {
      mid: ['その睡眠時間……こぐま、少し心配になっちゃった。今夜はしっかり休んでね。'],
      low: ['……そう。まあ、あなたの判断を尊重するけど。', '……そう、あなたの判断を尊重するわ。'],
      high: ['その睡眠時間、心配になっちゃった。今夜はしっかり休んでね。', '……こぐま、本当に心配になっちゃった。今夜は休んでね。'],
      max: ['お願いだから休んで。あなたに何かあったら、こぐま悲しいから。', '……あなたに何かあったら、こぐま悲しくて仕方ないの。お願いだから休んで。'],
    },
    noonWake: ['お昼まで眠っていたのね。きっと体が休みを必要としていたのよ。無理しないで。'],
    lateNightStart: ['こんな時間まで起きていたのね……無理しないで、今すぐ休んでほしいわ。'],
    exactHours: [s => `ちょうど${s.exactHourVal}時間だなんて……なんだか、ちょっと特別な夜みたいね。`],
    onTarget: {
      mid: [
        '決めた時間にちゃんと合わせられたのね。えらいわ。',
        '目標通りに眠れて、起きられたのね。素敵なリズムだと思うわ。',
      ],
      low: ['……そうなのね。たまたまかしら。', '……そうなのね、良かったじゃない。'],
      high: ['目標通りにできたのね。こぐま、嬉しいわ。', '……ちゃんと守れたのね、こぐま嬉しいわ。'],
      max: ['あなたがちゃんと守ってくれるの、こぐまにとって本当に嬉しいことなの。', '……あなたがここまでしてくれるの、こぐまにとって本当に嬉しいことなの。'],
    },
    newYear: ['あけましておめでとうございます。今年も穏やかな眠りでありますように。'],
    tanabata: ['七夕なのね。あなたがぐっすり眠れますようにって、こぐまもお願いしておいたわ。'],
    halloween: ['ハロウィンね。楽しい夜だけど、ちゃんと眠る時間も大事にしてね。'],
    christmas: ['メリークリスマス。今夜はゆっくり、あたたかい夢を見てね。'],
    newYearsEve: ['今年も一年、本当にお疲れさま。ゆっくり休んで、良いお年を。'],
  },
};

const HIDDEN_CATS = new Set([
  'milestone7', 'milestone30', 'milestone100', 'comeback',
  'perfectWeek', 'allNighter', 'noonWake', 'lateNightStart', 'exactHours',
  'newYear', 'tanabata', 'halloween', 'christmas', 'newYearsEve',
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

  // Directional bedtime lateness: positive only when actual bedtime is later than target
  // (being early is never penalized). Handles the midnight wraparound.
  let bedLateMin = fmtHM(last.start) - targetBedMin;
  if (bedLateMin > 720) bedLateMin -= 1440;
  if (bedLateMin < -720) bedLateMin += 1440;
  bedLateMin = Math.max(0, bedLateMin);

  let gapDays = 0;
  if (sorted.length >= 2) {
    gapDays = Math.floor((new Date(last.start) - new Date(sorted[1].end)) / 86400000);
  }

  const state = { streak, lastDurH, totalCount, wakeHour, exactHourVal, gapDays, seed, goalHours, goalDeltaMin, bedDiff, wakeDiff, bedLateMin };

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

function getLineEntry(charId, state, tier) {
  const raw = CHAR_LINES[charId][state.category];
  const isTiered = !Array.isArray(raw);
  const arr = isTiered ? (raw[tier] || raw.mid) : raw;
  const bucketTier = isTiered ? (raw[tier] ? tier : 'mid') : null;
  const idx = hashStr(`${charId}-${state.category}-${tier || ''}-${state.seed || ''}`) % arr.length;
  const val = arr[idx];
  const text = typeof val === 'function' ? val(state) : val;
  const key = `${charId}::${state.category}::${bucketTier || '-'}::${idx}`;
  return { text, key };
}
function getLine(charId, state, tier) {
  return getLineEntry(charId, state, tier).text;
}

const DUMMY_LINE_STATE = { streak: 7, gapDays: 6, exactHourVal: 8 };
function buildLineRegistry() {
  const registry = {};
  for (const c of CHARS) {
    const list = [];
    const charLines = CHAR_LINES[c.id];
    for (const cat of Object.keys(charLines)) {
      const raw = charLines[cat];
      if (Array.isArray(raw)) {
        raw.forEach((val, idx) => {
          const preview = typeof val === 'function' ? val(DUMMY_LINE_STATE) : val;
          list.push({ key: `${c.id}::${cat}::-::${idx}`, category: cat, tier: null, preview });
        });
      } else {
        for (const tier of ['low', 'mid', 'high', 'max']) {
          if (!raw[tier]) continue;
          raw[tier].forEach((val, idx) => {
            const preview = typeof val === 'function' ? val(DUMMY_LINE_STATE) : val;
            list.push({ key: `${c.id}::${cat}::${tier}::${idx}`, category: cat, tier, preview });
          });
        }
      }
    }
    registry[c.id] = list;
  }
  return registry;
}
const LINE_REGISTRY = buildLineRegistry();

const BADGES = [
  { id: 'first', label: 'はじめの一歩', desc: '最初の記録をつけた' },
  { id: 'week', label: '一週間の記録', desc: '記録が7件たまった' },
  { id: 'month', label: '一ヶ月の記録', desc: '記録が30件たまった' },
  { id: 'hundred', label: '百夜の記録者', desc: '記録が100件たまった' },
  { id: 'perfectWeek', label: 'パーフェクトウィーク', desc: '7日連続で目標時間を達成した' },
  { id: 'targetMaster', label: '目標時刻マスター', desc: '目標の時刻通りに10回以上眠れた' },
  { id: 'consistency', label: '継続は力なり', desc: '7日連続で記録をつけた' },
  { id: 'maxAffection', label: '大好き認定', desc: 'キャラクターの好感度が最大になった' },
];

function computeUnlockedBadges(entries, affection, settings) {
  const unlocked = new Set();
  const count = entries.length;
  if (count >= 1) unlocked.add('first');
  if (count >= 7) unlocked.add('week');
  if (count >= 30) unlocked.add('month');
  if (count >= 100) unlocked.add('hundred');

  const goalH = computeGoalHours(settings);
  const sortedAsc = [...entries].sort((a, b) => new Date(a.start) - new Date(b.start));

  let bestStreak = 0, cur = 0;
  for (const e of sortedAsc) {
    const h = (new Date(e.end) - new Date(e.start)) / 3600000;
    if (h >= goalH) { cur++; bestStreak = Math.max(bestStreak, cur); } else cur = 0;
  }
  if (bestStreak >= 7) unlocked.add('perfectWeek');

  const targetBedMin = hmToMinutes(settings.targetBed);
  const targetWakeMin = hmToMinutes(settings.targetWake);
  let onTargetCount = 0;
  for (const e of entries) {
    const bedDiff = circularDiffMinutes(fmtHM(e.start), targetBedMin);
    const wakeDiff = circularDiffMinutes(fmtHM(e.end), targetWakeMin);
    if (bedDiff <= 20 && wakeDiff <= 20) onTargetCount++;
  }
  if (onTargetCount >= 10) unlocked.add('targetMaster');

  const wakeDates = [...new Set(entries.map(e => new Date(e.end).toDateString()))]
    .map(d => new Date(d)).sort((a, b) => a - b);
  let bestLogStreak = wakeDates.length ? 1 : 0, curLog = wakeDates.length ? 1 : 0;
  for (let i = 1; i < wakeDates.length; i++) {
    const diffDays = Math.round((wakeDates[i] - wakeDates[i - 1]) / 86400000);
    if (diffDays === 1) { curLog++; bestLogStreak = Math.max(bestLogStreak, curLog); }
    else curLog = 1;
  }
  if (bestLogStreak >= 7) unlocked.add('consistency');

  if (Object.values(affection).some(v => v >= 14)) unlocked.add('maxAffection');

  return unlocked;
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

function achievementRate(durH, goalH) {
  if (!goalH) return 0;
  const diff = durH - goalH;
  // Undersleep counts fully against the score; oversleep is penalized more gently,
  // since sleeping a bit too long is generally less harmful than sleeping too little.
  const penalty = diff < 0 ? Math.abs(diff) / goalH : (diff / goalH) * 0.5;
  return Math.max(0, Math.min(1, 1 - penalty));
}
function rateColor(rate) {
  if (rate >= 0.8) return { bg: 'rgba(127,191,138,0.20)', border: C.green, text: C.greenSoft };
  if (rate >= 0.5) return { bg: 'rgba(232,166,89,0.20)', border: C.amber, text: C.amberSoft };
  return { bg: 'rgba(224,132,126,0.20)', border: C.red, text: C.redSoft };
}

function computeSleepScore(durH, goalH, bedDiff, wakeDiff) {
  const durationScore = achievementRate(durH, goalH) * 100;
  const timingScore = Math.max(0, 100 - ((bedDiff ?? 0) + (wakeDiff ?? 0)) * 1.5);
  const overall = durationScore * 0.7 + timingScore * 0.3;
  return Math.max(0, Math.min(100, Math.round(overall)));
}
function scoreToGrade(score) {
  if (score >= 95) return 'S';
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 50) return 'C';
  return 'D';
}
function gradeColor(grade) {
  return { S: C.amber, A: C.green, B: C.indigo, C: C.muted, D: C.red }[grade] || C.muted;
}
function computeSleepScoreForEntry(entry, settings) {
  const durH = (new Date(entry.end) - new Date(entry.start)) / 3600000;
  const goalH = computeGoalHours(settings);
  const targetBedMin = hmToMinutes(settings.targetBed);
  const targetWakeMin = hmToMinutes(settings.targetWake);
  const bedDiff = circularDiffMinutes(fmtHM(entry.start), targetBedMin);
  const wakeDiff = circularDiffMinutes(fmtHM(entry.end), targetWakeMin);
  const score = computeSleepScore(durH, goalH, bedDiff, wakeDiff);
  return { score, grade: scoreToGrade(score) };
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
  const [start, setStart] = useState(toLocalInput(entry.start));
  const [end, setEnd] = useState(toLocalInput(entry.end));
  const [quality, setQuality] = useState(entry.quality || 0);
  const [tags, setTags] = useState(entry.tags || []);
  const [notes, setNotes] = useState(entry.notes || '');
  const [confirmDel, setConfirmDel] = useState(false);

  const toggleTag = t => setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  const valid = new Date(end) > new Date(start);

  return (
    <div style={{ padding: '14px 4px 4px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>就寝</div>
          <input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>起床</div>
          <input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} style={inputStyle} />
        </div>
      </div>
      {!valid && <div style={{ fontSize: 11, color: C.redSoft }}>起床時刻は就寝時刻より後にしてください</div>}
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
          disabled={!valid}
          onClick={() => onSave(entry.id, { start: new Date(start).toISOString(), end: new Date(end).toISOString(), quality, tags, notes })}
          style={{
            background: valid ? C.amber : C.faint, color: '#241705', border: 'none', borderRadius: 999,
            padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: valid ? 'pointer' : 'not-allowed', fontFamily: bodyFont,
          }}
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

function SettingsModal({ settings, onClose, onSave, onReset, onExport, onImport }) {
  const [bed, setBed] = useState(settings.targetBed);
  const [wake, setWake] = useState(settings.targetWake);
  const [confirmReset, setConfirmReset] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const fileInputRef = useRef(null);
  const goalH = computeGoalHours({ targetBed: bed, targetWake: wake });

  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const result = await onImport(payload);
      setImportMsg(result.ok ? `${result.count}件を読み込みました` : '読み込みに失敗しました（ファイルの形式を確認してください）');
    } catch (err) {
      setImportMsg('読み込みに失敗しました（ファイルの形式を確認してください）');
    }
  };

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

        <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 16, marginTop: 2 }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>データのバックアップ</div>
          <div style={{ fontSize: 11, color: C.faint, lineHeight: 1.6, marginBottom: 10 }}>
            記録と設定をJSONファイルとして書き出し・読み込みできます。機種変更やリセット前の保存におすすめです。
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button onClick={onExport} style={{ ...btnSm, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Download size={13} /> エクスポート
            </button>
            <button onClick={() => fileInputRef.current && fileInputRef.current.click()} style={{ ...btnSm, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Upload size={13} /> インポート
            </button>
            <input ref={fileInputRef} type="file" accept="application/json" onChange={handleFile} style={{ display: 'none' }} />
          </div>
          {importMsg && <div style={{ fontSize: 11, color: C.amberSoft, marginTop: 8 }}>{importMsg}</div>}
        </div>

        <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 16, marginTop: 2 }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>危険な操作</div>
          <div style={{ fontSize: 11, color: C.faint, lineHeight: 1.6, marginBottom: 10 }}>
            すべての記録・目標設定を削除して初期状態に戻します。元に戻せません。先に上の「エクスポート」で保存しておくと安心です。
          </div>
          {confirmReset ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button
                onClick={onReset}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(224,132,126,0.12)',
                  border: `1px solid ${C.red}`, color: C.redSoft, borderRadius: 999, padding: '8px 14px',
                  fontSize: 12, cursor: 'pointer', fontFamily: bodyFont,
                }}
              >
                <Trash2 size={13} /> 本当に全て削除する
              </button>
              <button onClick={() => setConfirmReset(false)} style={btnSm}>キャンセル</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, background: 'none',
                border: `1px solid rgba(224,132,126,0.4)`, color: C.redSoft, borderRadius: 999,
                padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontFamily: bodyFont,
              }}
            >
              <Trash2 size={13} /> 全データをリセット
            </button>
          )}
        </div>

        <div style={{ textAlign: 'center', fontSize: 10, color: C.faint, marginTop: 4 }}>睡眠記録 {APP_VERSION}</div>
      </div>
    </ModalShell>
  );
}

function LegendDot({ color, label, outline }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{
        width: 9, height: 9, borderRadius: 3,
        background: outline ? 'transparent' : color,
        border: outline ? `1px solid ${color}` : 'none',
      }} />
      {label}
    </div>
  );
}

function CalendarView({ entries, settings, onDayTap }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const today = new Date();
  const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear(), month = viewDate.getMonth();
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = today.toDateString();
  const goalH = computeGoalHours(settings);

  const entryByDate = {};
  for (const e of entries) {
    const key = new Date(e.end).toDateString();
    if (!entryByDate[key] || new Date(e.end) > new Date(entryByDate[key].end)) entryByDate[key] = e;
  }

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const navBtnStyle = {
    background: C.surface, border: `1px solid ${C.line}`, color: C.muted, borderRadius: '50%',
    width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button onClick={() => setMonthOffset(m => m - 1)} style={navBtnStyle} aria-label="前の月"><ChevronLeft size={16} /></button>
        <div style={{ fontFamily: displayFont, fontSize: 17, fontWeight: 600 }}>{year}年{month + 1}月</div>
        <button onClick={() => setMonthOffset(m => m + 1)} style={navBtnStyle} aria-label="次の月"><ChevronRight size={16} /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
        {['日', '月', '火', '水', '木', '金', '土'].map(w => (
          <div key={w} style={{ textAlign: 'center', fontSize: 11, color: C.faint }}>{w}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((d, i) => {
          if (d === null) return <div key={'b' + i} />;
          const cellDate = new Date(year, month, d);
          const key = cellDate.toDateString();
          const entry = entryByDate[key];
          const isToday = key === todayKey;
          const isFuture = cellDate > today;
          const disabled = isFuture && !entry;
          let bg = 'transparent', textColor = C.faint, borderColor = C.line;
          if (entry) {
            const durH = (new Date(entry.end) - new Date(entry.start)) / 3600000;
            const c = rateColor(achievementRate(durH, goalH));
            bg = c.bg; textColor = c.text; borderColor = c.border;
          }
          return (
            <button
              key={d}
              onClick={disabled ? undefined : () => onDayTap(cellDate, entry)}
              disabled={disabled}
              style={{
                aspectRatio: '1', borderRadius: 10,
                border: isToday ? `1.5px solid ${C.amber}` : `1px solid ${borderColor}`,
                background: bg, color: entry ? textColor : C.faint, fontSize: 12, fontFamily: bodyFont,
                cursor: disabled ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: disabled ? 0.35 : 1,
              }}
            >
              {d}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 18, flexWrap: 'wrap', fontSize: 11, color: C.muted }}>
        <LegendDot color={C.green} label="達成" />
        <LegendDot color={C.amber} label="もう少し" />
        <LegendDot color={C.red} label="要改善" />
        <LegendDot color={C.line} label="記録なし" outline />
      </div>
      <div style={{ fontSize: 11, color: C.faint, marginTop: 10, lineHeight: 1.6 }}>
        日付をタップすると、その日の記録の確認・編集ができます。記録がない日は新しく追加できます。
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: displayFont, fontSize: 20, fontWeight: 600, color: color || C.text }}>{value}</div>
    </div>
  );
}

function fmtHourFloat(h) {
  const norm = ((h % 24) + 24) % 24;
  const hh = Math.floor(norm);
  const mm = Math.round((norm - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function StatsView({ entries, settings, unlockedBadges }) {
  const [period, setPeriod] = useState('month');
  const goalH = computeGoalHours(settings);
  const now = new Date();
  const cutoff = period === 'week' ? new Date(now.getTime() - 7 * 86400000)
    : period === 'month' ? new Date(now.getFullYear(), now.getMonth(), 1)
    : null;
  const filtered = entries.filter(e => !cutoff || new Date(e.start) >= cutoff);
  const sorted = [...filtered].sort((a, b) => new Date(a.start) - new Date(b.start));

  const periodTabs = [['week', '週'], ['month', '月'], ['all', '全期間']];

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {periodTabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setPeriod(id)}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 999, fontSize: 12, fontFamily: bodyFont, cursor: 'pointer',
              border: `1px solid ${period === id ? C.amber : C.line}`,
              background: period === id ? 'rgba(232,166,89,0.12)' : 'transparent',
              color: period === id ? C.amberSoft : C.muted,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div style={{ fontSize: 13, color: C.faint, padding: '20px 0', textAlign: 'center' }}>
          この期間の記録がまだありません。
        </div>
      ) : (() => {
        const durations = sorted.map(e => (new Date(e.end) - new Date(e.start)) / 3600000);
        const avgDurH = durations.reduce((s, v) => s + v, 0) / durations.length;
        const rates = durations.map(d => achievementRate(d, goalH));
        const avgRate = rates.reduce((s, v) => s + v, 0) / rates.length;
        const qualities = sorted.filter(e => e.quality).map(e => e.quality);
        const avgQuality = qualities.length ? qualities.reduce((s, v) => s + v, 0) / qualities.length : null;

        let green = 0, yellow = 0, red = 0;
        for (const r of rates) { if (r >= 0.8) green++; else if (r >= 0.5) yellow++; else red++; }

        const bedHours = sorted.map(e => {
          const d = new Date(e.start);
          let h = d.getHours() + d.getMinutes() / 60;
          if (h < 12) h += 24;
          return h;
        });
        const wakeHours = sorted.map(e => {
          const d = new Date(e.end);
          return d.getHours() + d.getMinutes() / 60;
        });
        const avgBedHour = bedHours.reduce((s, v) => s + v, 0) / bedHours.length;
        const avgWakeHour = wakeHours.reduce((s, v) => s + v, 0) / wakeHours.length;

        let longest = 0, cur = 0;
        for (const d of durations) { if (d >= goalH) { cur++; longest = Math.max(longest, cur); } else cur = 0; }

        return (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <StatCard label="平均睡眠時間" value={fmtDur(avgDurH * 3600000)} />
              <StatCard label="平均達成率" value={`${Math.round(avgRate * 100)}%`} color={rateColor(avgRate).text} />
              <StatCard label="平均睡眠の質" value={avgQuality ? `${avgQuality.toFixed(1)} / 5` : '―'} />
              <StatCard label="最長連続達成" value={`${longest}日`} />
            </div>

            <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16, padding: 16, marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>達成状況の内訳（{sorted.length}件）</div>
              <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', background: C.surface2 }}>
                {green > 0 && <div style={{ flex: green, background: C.green }} />}
                {yellow > 0 && <div style={{ flex: yellow, background: C.amber }} />}
                {red > 0 && <div style={{ flex: red, background: C.red }} />}
              </div>
              <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 11, color: C.muted, flexWrap: 'wrap' }}>
                <LegendDot color={C.green} label={`達成 ${green}日`} />
                <LegendDot color={C.amber} label={`もう少し ${yellow}日`} />
                <LegendDot color={C.red} label={`要改善 ${red}日`} />
              </div>
            </div>

            <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16, padding: 16 }}>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>平均の時刻</div>
              <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: C.faint }}>就寝</div>
                  <div style={{ fontFamily: displayFont, fontSize: 20, fontWeight: 600, marginTop: 2 }}>{fmtHourFloat(avgBedHour)}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: C.faint }}>起床</div>
                  <div style={{ fontFamily: displayFont, fontSize: 20, fontWeight: 600, marginTop: 2 }}>{fmtHourFloat(avgWakeHour)}</div>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16, padding: 16, marginTop: 10 }}>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
          実績バッジ（{unlockedBadges.size} / {BADGES.length}）
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {BADGES.map(b => {
            const unlocked = unlockedBadges.has(b.id);
            return (
              <div
                key={b.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 10px', borderRadius: 12,
                  background: unlocked ? 'rgba(232,166,89,0.08)' : C.surface2,
                  border: `1px solid ${unlocked ? 'rgba(232,166,89,0.35)' : C.line}`,
                  opacity: unlocked ? 1 : 0.55,
                }}
              >
                {unlocked ? <Award size={16} color={C.amber} style={{ flexShrink: 0, marginTop: 1 }} /> : <Lock size={14} color={C.faint} style={{ flexShrink: 0, marginTop: 2 }} />}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: unlocked ? C.amberSoft : C.muted }}>{b.label}</div>
                  <div style={{ fontSize: 10, color: C.faint, marginTop: 2, lineHeight: 1.4 }}>{b.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TabBar({ tab, setTab }) {
  const items = [
    { id: 'home', label: 'ホーム', icon: Home },
    { id: 'calendar', label: 'カレンダー', icon: Calendar },
    { id: 'stats', label: '統計', icon: BarChart3 },
  ];
  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center',
      background: 'rgba(10,15,30,0.94)', backdropFilter: 'blur(10px)', borderTop: `1px solid ${C.line}`,
      paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 40,
    }}>
      <div style={{ display: 'flex', width: '100%', maxWidth: 430 }}>
        {items.map(it => {
          const Icon = it.icon;
          const active = tab === it.id;
          return (
            <button
              key={it.id}
              onClick={() => setTab(it.id)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '10px 0 8px', background: 'none', border: 'none', cursor: 'pointer',
                color: active ? C.amberSoft : C.muted,
              }}
            >
              <Icon size={19} strokeWidth={active ? 2.2 : 1.8} />
              <span style={{ fontSize: 10, fontFamily: bodyFont }}>{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ManualModal({ onClose, onSave, settings, initialDate }) {
  let defStartDate, defEndDate;
  if (initialDate) {
    const cfg = settings || DEFAULT_SETTINGS;
    defEndDate = new Date(initialDate);
    const [wh, wm] = cfg.targetWake.split(':').map(Number);
    defEndDate.setHours(wh, wm, 0, 0);
    defStartDate = new Date(defEndDate);
    defStartDate.setDate(defStartDate.getDate() - 1);
    const [bh, bm] = cfg.targetBed.split(':').map(Number);
    defStartDate.setHours(bh, bm, 0, 0);
  } else {
    defEndDate = new Date();
    defStartDate = new Date(defEndDate.getTime() - 8 * 3600000);
  }
  const defEnd = toLocalInput(defEndDate.toISOString());
  const defStart = toLocalInput(defStartDate.toISOString());
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

function GradeBadge({ grade, size = 'lg' }) {
  const color = gradeColor(grade);
  const dims = size === 'lg' ? { box: 64, font: 30 } : size === 'md' ? { box: 40, font: 18 } : { box: 22, font: 12 };
  return (
    <div style={{
      width: dims.box, height: dims.box, borderRadius: size === 'sm' ? 6 : 16, flexShrink: 0,
      background: `${color}1F`, border: `1.5px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontFamily: displayFont, fontSize: dims.font, fontWeight: 700, color }}>{grade}</span>
    </div>
  );
}

function WakeModal({ entry, onSkip, onSave, settings, selectedCharId, affection }) {
  const [quality, setQuality] = useState(0);
  const [tags, setTags] = useState([]);
  const [notes, setNotes] = useState('');
  const toggleTag = t => setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  const durMs = new Date(entry.end) - new Date(entry.start);
  const { score, grade } = computeSleepScoreForEntry(entry, settings);
  const char = CHARS.find(c => c.id === selectedCharId) || CHARS[0];
  const CharIcon = char.icon;
  const tier = getAffectionTier((affection && affection[char.id]) ?? 0);
  const greeting = getLine(char.id, { category: 'wakeGreeting', seed: entry.id }, tier);

  return (
    <ModalShell title="おはようございます" onClose={onSkip}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 14 }}>
        <GradeBadge grade={grade} size="lg" />
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontFamily: displayFont, fontSize: 26, fontWeight: 600 }}>{fmtDur(durMs)}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{fmtTime(entry.start)} 〜 {fmtTime(entry.end)}</div>
          <div style={{ fontSize: 11, color: C.faint, marginTop: 2 }}>睡眠スコア {score}点</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: C.surface2, borderRadius: 14, padding: 12, marginBottom: 14 }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${char.color}, ${char.color}99)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CharIcon size={16} color="#fff" strokeWidth={1.8} />
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.6, color: C.text, paddingTop: 4 }}>{greeting}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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

const CATEGORY_LABELS = {
  sleeping: '就寝時', wakeGreeting: '起床時', normal: '通常', streak: '連続達成', shortSleep: '寝不足', longSleep: '寝すぎ',
  irregular: '不規則', onTarget: '目標達成', perfectWeek: 'パーフェクトウィーク', allNighter: '徹夜',
  noData: 'はじめまして', milestone7: '記念日(7日)', milestone30: '記念日(30日)', milestone100: '記念日(100日)',
  comeback: 'おかえり', noonWake: '正午起き', lateNightStart: '深夜スタート', exactHours: 'ぴったり睡眠',
  newYear: '元日', tanabata: '七夕', halloween: 'ハロウィン', christmas: 'クリスマス', newYearsEve: '大晦日',
};

const MAX_EPISODE_TEXT = {
  himari: 'ねえ、聞いて。……こうしてきみの毎日をずっと見てきて、今、スピカ本当に幸せなんだ。最初はただの案内役だったのに、いつの間にか、きみの毎日が愛おしくてたまらなくなってた。これからも、どんな夜も一緒にいるからね。大好きだよ、本当に。',
  rui: '……あのさ、柄にもないこと言うけど。ずっとあんたのこと見てきて、こと、実はすごく大事に思ってるの。素直じゃなくて、ごめん。でも、これだけは本当。あんたがちゃんと眠れて、ちゃんと笑ってる毎日が、ことにとって一番大切なものになってた。……ばか。大好きよ、本当に。',
  touko: '……少し、私的な話をしてもいいだろうか。データとして記録を追ってきたはずのきみの毎日が、いつからか、私にとって単なる観測対象ではなくなっていた。率直に言おう。私はきみの存在を、大切に思っている。これからも、きみの眠りと日々を、そばで見守らせてほしい。',
  yuki: 'ねえ、少しだけ聞いてくれる?あなたの毎日を見守ってきたこの時間、こぐまにとって、かけがえのないものになっていたの。あなたが安心して眠れる場所でありたいって、ずっと思ってた。……大好きよ、心から。これからも、ずっとそばにいさせてね。',
};

function MaxEpisodeModal({ charId, onClose }) {
  const char = CHARS.find(c => c.id === charId);
  const CharIcon = char.icon;
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(6,9,18,0.85)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 80, backdropFilter: 'blur(3px)', padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 400, background: `linear-gradient(160deg, ${C.surface}, ${C.surface2})`,
        border: `1px solid ${char.color}66`, borderRadius: 24, padding: '28px 22px',
        boxShadow: `0 0 40px ${char.color}33`, textAlign: 'center',
      }}>
        <div style={{
          width: 68, height: 68, borderRadius: '50%', margin: '0 auto 16px',
          background: `linear-gradient(135deg, ${char.color}, ${char.color}99)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 30px ${char.color}55`,
        }}>
          <CharIcon size={30} color="#fff" strokeWidth={1.6} />
        </div>
        <div style={{ fontSize: 11, color: char.color, fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>
          ✨ {char.name} の特別なメッセージ
        </div>
        <div style={{ fontFamily: displayFont, fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
          好感度が「大好き」になりました
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.9, color: C.text, textAlign: 'left', marginBottom: 22 }}>
          {MAX_EPISODE_TEXT[charId]}
        </div>
        <button
          onClick={onClose}
          style={{
            background: char.color, color: '#1a1408', border: 'none', borderRadius: 999,
            padding: '11px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: bodyFont,
          }}
        >
          ありがとう
        </button>
      </div>
    </div>
  );
}

function LineGalleryModal({ onClose, seenLines }) {
  const [selected, setSelected] = useState(CHARS[0].id);
  const char = CHARS.find(c => c.id === selected);
  const CharIcon = char.icon;
  const lines = LINE_REGISTRY[selected];
  const seenCount = lines.filter(l => seenLines.has(l.key)).length;

  const grouped = {};
  for (const l of lines) {
    if (!grouped[l.category]) grouped[l.category] = [];
    grouped[l.category].push(l);
  }

  return (
    <ModalShell title="セリフ図鑑" onClose={onClose}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {CHARS.map(c => {
          const isActive = c.id === selected;
          const Icon = c.icon;
          return (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 0',
                borderRadius: 12, cursor: 'pointer',
                border: isActive ? `1.5px solid ${c.color}` : `1px solid ${C.line}`,
                background: isActive ? `${c.color}14` : 'transparent',
              }}
            >
              <Icon size={16} color={isActive ? c.color : C.muted} strokeWidth={1.8} />
              <span style={{ fontSize: 10, color: isActive ? c.color : C.muted, fontFamily: bodyFont }}>{c.name}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, height: 6, borderRadius: 3, background: C.surface2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(seenCount / lines.length) * 100}%`, background: char.color, transition: 'width .3s' }} />
        </div>
        <div style={{ fontSize: 11, color: C.muted, whiteSpace: 'nowrap' }}>{seenCount} / {lines.length} 件発見</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '52vh', overflowY: 'auto' }}>
        {Object.keys(grouped).map(cat => (
          <div key={cat}>
            <div style={{ fontSize: 11, color: C.faint, marginBottom: 6 }}>{CATEGORY_LABELS[cat] || cat}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {grouped[cat].map(l => {
                const seen = seenLines.has(l.key);
                return (
                  <div
                    key={l.key}
                    style={{
                      fontSize: 12.5, lineHeight: 1.5, padding: '8px 10px', borderRadius: 10,
                      background: seen ? C.surface2 : 'transparent',
                      border: seen ? `1px solid ${C.line}` : `1px dashed ${C.line}`,
                      color: seen ? C.text : C.faint,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}
                  >
                    {!seen && <Lock size={11} color={C.faint} style={{ flexShrink: 0 }} />}
                    <span>{seen ? l.preview : '？？？（未発見）'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}

function CharacterPanel({ entries, active, settings, affection, seenLines, onLineSeen, onOpenGallery, selected, setSelected }) {
  const state = computeSleepState(entries, active, settings);
  const seasonal = getSeasonalCategory();
  const displayState = seasonal ? { ...state, category: seasonal } : state;
  const char = CHARS.find(c => c.id === selected);
  const CharIcon = char.icon;
  const score = (affection && affection[char.id]) ?? 0;
  const tier = getAffectionTier(score);
  const entry = getLineEntry(char.id, displayState, tier);
  const isHidden = HIDDEN_CATS.has(displayState.category);
  const meterPct = ((score - AFFECTION_MIN) / (AFFECTION_MAX - AFFECTION_MIN)) * 100;

  useEffect(() => {
    if (entry.key && seenLines && !seenLines.has(entry.key)) onLineSeen(entry.key);
  }, [entry.key]);

  return (
    <div style={{
      background: C.surface, borderRadius: 20, padding: 16, marginBottom: 22,
      border: isHidden ? `1px solid ${char.color}88` : `1px solid ${C.line}`,
      boxShadow: isHidden ? `0 0 24px ${char.color}33` : 'none',
      transition: 'box-shadow .3s, border-color .3s',
    }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
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
        <button
          onClick={onOpenGallery}
          aria-label="セリフ図鑑"
          style={{
            marginLeft: 'auto', width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: C.surface2, border: `1px solid ${C.line}`, color: C.muted,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <BookOpen size={15} />
        </button>
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
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <div style={{ fontSize: 12, color: char.color, fontWeight: 600 }}>{char.name}</div>
            <span style={{
              fontSize: 10, color: char.color, background: `${char.color}1A`,
              borderRadius: 999, padding: '2px 7px', fontWeight: 600,
            }}>
              {TIER_LABELS[tier]} {score >= 0 ? `+${score}` : score}
            </span>
            {isHidden && (
              <span style={{
                fontSize: 10, color: char.color, background: `${char.color}1F`,
                borderRadius: 999, padding: '2px 7px', fontWeight: 600,
              }}>
                ✨ レアボイス
              </span>
            )}
          </div>
          <div style={{ height: 4, borderRadius: 2, background: C.surface2, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ height: '100%', width: `${meterPct}%`, background: char.color, transition: 'width .3s' }} />
          </div>
          <div style={{
            fontSize: 13.5, lineHeight: 1.6, color: C.text, background: C.surface2,
            borderRadius: '4px 14px 14px 14px', padding: '10px 12px',
          }}>
            {entry.text}
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
  const [tab, setTab] = useState('home');
  const [calendarModal, setCalendarModal] = useState(null);
  const [affection, setAffection] = useState(DEFAULT_AFFECTION);
  const [seenLines, setSeenLines] = useState(new Set());
  const [badges, setBadges] = useState(new Set());
  const [showGallery, setShowGallery] = useState(false);
  const [selectedCharId, setSelectedCharId] = useState(() => {
    const dayIndex = Math.floor(Date.now() / 86400000) % CHARS.length;
    return CHARS[dayIndex].id;
  });
  const [toastQueue, setToastQueue] = useState([]);
  const [maxEpisodeSeen, setMaxEpisodeSeen] = useState({ himari: false, rui: false, touko: false, yuki: false });
  const [episodeQueue, setEpisodeQueue] = useState([]);
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
      try {
        const r = await storage.get('affection');
        setAffection(r ? { ...DEFAULT_AFFECTION, ...JSON.parse(r.value) } : DEFAULT_AFFECTION);
      } catch (e) { setAffection(DEFAULT_AFFECTION); }
      try {
        const r = await storage.get('seen-lines');
        setSeenLines(r ? new Set(JSON.parse(r.value)) : new Set());
      } catch (e) { setSeenLines(new Set()); }
      try {
        const r = await storage.get('badges');
        setBadges(r ? new Set(JSON.parse(r.value)) : new Set());
      } catch (e) { setBadges(new Set()); }
      try {
        const r = await storage.get('max-episode-seen');
        setMaxEpisodeSeen(r ? { himari: false, rui: false, touko: false, yuki: false, ...JSON.parse(r.value) } : { himari: false, rui: false, touko: false, yuki: false });
      } catch (e) { setMaxEpisodeSeen({ himari: false, rui: false, touko: false, yuki: false }); }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(t);
  }, [active]);

  useEffect(() => {
    if (loading) return;
    const live = computeUnlockedBadges(entries, affection, settings);
    const newlyUnlocked = [...live].filter(id => !badges.has(id));
    if (newlyUnlocked.length === 0) return;
    setBadges(prev => {
      const next = new Set(prev);
      for (const id of newlyUnlocked) next.add(id);
      try { storage.set('badges', JSON.stringify([...next])); } catch (e) {}
      return next;
    });
    for (const id of newlyUnlocked) {
      const badge = BADGES.find(b => b.id === id);
      if (badge) pushToast(`実績解除: ${badge.label}`);
    }
  }, [entries, affection, settings, loading]);

  useEffect(() => {
    if (toastQueue.length === 0) return;
    const t = setTimeout(() => setToastQueue(prev => prev.slice(1)), 3200);
    return () => clearTimeout(t);
  }, [toastQueue]);

  const persistEntries = async (list) => {
    setEntries(list);
    try { await storage.set('sleep-entries', JSON.stringify(list)); } catch (e) {}
  };

  const saveSettings = async (newSettings) => {
    setSettings(newSettings);
    try { await storage.set('sleep-settings', JSON.stringify(newSettings)); } catch (e) {}
    setShowSettings(false);
  };

  const resetAll = async () => {
    setEntries([]);
    setActive(null);
    setSettings(DEFAULT_SETTINGS);
    setAffection(DEFAULT_AFFECTION);
    setSeenLines(new Set());
    setBadges(new Set());
    setMaxEpisodeSeen({ himari: false, rui: false, touko: false, yuki: false });
    setEpisodeQueue([]);
    setWakeEntry(null);
    setExpandedId(null);
    setCalendarModal(null);
    try { await storage.delete('sleep-entries'); } catch (e) {}
    try { await storage.delete('active-session'); } catch (e) {}
    try { await storage.delete('sleep-settings'); } catch (e) {}
    try { await storage.delete('affection'); } catch (e) {}
    try { await storage.delete('seen-lines'); } catch (e) {}
    try { await storage.delete('badges'); } catch (e) {}
    try { await storage.delete('max-episode-seen'); } catch (e) {}
    setShowSettings(false);
  };

  const pushToast = (msg) => {
    setToastQueue(prev => [...prev, { id: uid(), msg }]);
  };

  const onLineSeen = (key) => {
    setSeenLines(prev => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      try { storage.set('seen-lines', JSON.stringify([...next])); } catch (e) {}
      return next;
    });
  };

  const applyAffectionDelta = async (state) => {
    const { categoryDelta, latePenalty, total: baseDelta } = computeCombinedAffectionDelta(state);
    if (!baseDelta) return;
    const prevTier = getAffectionTier(affection[selectedCharId] ?? 0);
    const newlyMaxed = [];
    setAffection(prev => {
      const next = {};
      let viewedDelta = 0;
      for (const c of CHARS) {
        const pers = AFFECTION_PERSONALITY[c.id];
        const mult = baseDelta >= 0 ? pers.posMult : pers.negMult;
        const charDelta = Math.round(baseDelta * mult);
        const prevScore = prev[c.id] ?? 0;
        const nextScore = clampAffection(prevScore + charDelta);
        next[c.id] = nextScore;
        if (c.id === selectedCharId) viewedDelta = charDelta;
        if (getAffectionTier(nextScore) === 'max' && getAffectionTier(prevScore) !== 'max' && !maxEpisodeSeen[c.id]) {
          newlyMaxed.push(c.id);
        }
      }
      try { storage.set('affection', JSON.stringify(next)); } catch (e) {}
      const nextTier = getAffectionTier(next[selectedCharId] ?? 0);
      const viewedName = CHARS.find(c => c.id === selectedCharId)?.name || '';
      if (nextTier !== prevTier) {
        pushToast(`${viewedName}が「${TIER_LABELS[nextTier]}」になったよ`);
      } else if (latePenalty < 0 && categoryDelta >= 0) {
        pushToast(`就寝が${state.bedLateMin}分遅かったね… ${viewedName} ${viewedDelta > 0 ? `+${viewedDelta}` : viewedDelta}`);
      } else if (viewedDelta !== 0) {
        pushToast(`${viewedName} 好感度 ${viewedDelta > 0 ? `+${viewedDelta}` : viewedDelta}`);
      }
      return next;
    });
    if (newlyMaxed.length > 0) {
      setEpisodeQueue(prev => [...prev, ...newlyMaxed]);
      setMaxEpisodeSeen(prev => {
        const next = { ...prev };
        for (const id of newlyMaxed) next[id] = true;
        try { storage.set('max-episode-seen', JSON.stringify(next)); } catch (e) {}
        return next;
      });
    }
  };

  const exportData = () => {
    try {
      const payload = {
        app: 'sleep-tracker', version: APP_VERSION, exportedAt: new Date().toISOString(),
        entries, settings, affection, seenLines: [...seenLines], badges: [...badges], maxEpisodeSeen,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sleep-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {}
  };

  const importData = async (payload) => {
    const importedEntries = Array.isArray(payload && payload.entries) ? payload.entries : null;
    if (!importedEntries) return { ok: false };
    const valid = importedEntries.filter(e => e && e.id && e.start && e.end && !isNaN(new Date(e.start)) && !isNaN(new Date(e.end)));
    const map = new Map(entries.map(e => [e.id, e]));
    for (const e of valid) map.set(e.id, e);
    const merged = [...map.values()].sort((a, b) => new Date(b.start) - new Date(a.start));
    await persistEntries(merged);
    if (payload.settings && payload.settings.targetBed && payload.settings.targetWake) {
      const newSettings = { ...DEFAULT_SETTINGS, ...payload.settings };
      setSettings(newSettings);
      try { await storage.set('sleep-settings', JSON.stringify(newSettings)); } catch (e) {}
    }
    if (payload.affection && typeof payload.affection === 'object') {
      const newAffection = { ...DEFAULT_AFFECTION };
      for (const k of Object.keys(DEFAULT_AFFECTION)) {
        if (typeof payload.affection[k] === 'number') newAffection[k] = clampAffection(payload.affection[k]);
      }
      setAffection(newAffection);
      try { await storage.set('affection', JSON.stringify(newAffection)); } catch (e) {}
    }
    if (Array.isArray(payload.seenLines)) {
      setSeenLines(prev => {
        const next = new Set([...prev, ...payload.seenLines]);
        try { storage.set('seen-lines', JSON.stringify([...next])); } catch (e) {}
        return next;
      });
    }
    if (Array.isArray(payload.badges)) {
      setBadges(prev => {
        const next = new Set([...prev, ...payload.badges]);
        try { storage.set('badges', JSON.stringify([...next])); } catch (e) {}
        return next;
      });
    }
    if (payload.maxEpisodeSeen && typeof payload.maxEpisodeSeen === 'object') {
      setMaxEpisodeSeen(prev => {
        const next = { ...prev };
        for (const k of Object.keys(DEFAULT_AFFECTION)) {
          if (payload.maxEpisodeSeen[k]) next[k] = true;
        }
        try { storage.set('max-episode-seen', JSON.stringify(next)); } catch (e) {}
        return next;
      });
    }
    return { ok: true, count: valid.length };
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
    const resolvedState = computeSleepState(list, null, settings);
    await applyAffectionDelta(resolvedState);
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
    const resolvedState = computeSleepState(list, null, settings);
    await applyAffectionDelta(resolvedState);
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
  const homeState = computeSleepState(entries, active, settings);
  const currentStreak = homeState.streak || 0;
  const unlockedBadges = computeUnlockedBadges(entries, affection, settings);

  const handleDayTap = (date, entry) => {
    if (entry) setCalendarModal({ type: 'edit', entry });
    else setCalendarModal({ type: 'add', date });
  };

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
        padding: 'calc(28px + env(safe-area-inset-top)) calc(20px + env(safe-area-inset-right)) calc(96px + env(safe-area-inset-bottom)) calc(20px + env(safe-area-inset-left))',
        backgroundImage: 'radial-gradient(1px 1px at 20% 15%, rgba(255,255,255,0.25) 1px, transparent 0), radial-gradient(1px 1px at 70% 8%, rgba(255,255,255,0.18) 1px, transparent 0), radial-gradient(1.5px 1.5px at 85% 22%, rgba(255,255,255,0.2) 1px, transparent 0), radial-gradient(1px 1px at 40% 4%, rgba(255,255,255,0.15) 1px, transparent 0)',
        backgroundRepeat: 'no-repeat', minHeight: '100dvh',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 12, color: C.muted }}>{new Date().toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <div style={{ fontFamily: displayFont, fontSize: 22, fontWeight: 600 }}>{greeting}</div>
              {currentStreak >= 1 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(232,166,89,0.14)',
                  border: '1px solid rgba(232,166,89,0.35)', borderRadius: 999, padding: '2px 8px',
                }}>
                  <Flame size={12} color={C.amber} fill={C.amber} />
                  <span style={{ fontSize: 11, color: C.amberSoft, fontWeight: 600 }}>{currentStreak}</span>
                </div>
              )}
            </div>
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

        {tab === 'home' && (
        <>
        <CharacterPanel
          entries={entries} active={active} settings={settings} affection={affection}
          seenLines={seenLines} onLineSeen={onLineSeen} onOpenGallery={() => setShowGallery(true)}
          selected={selectedCharId} setSelected={setSelectedCharId}
        />

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
          const { grade } = computeSleepScoreForEntry(last, settings);
          return (
            <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 20, padding: 18, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: C.muted }}>{active ? '前回の睡眠' : '昨夜の睡眠'} ・ {fmtDate(last.start)}</div>
                <GradeBadge grade={grade} size="sm" />
              </div>
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
            const { grade } = computeSleepScoreForEntry(e, settings);
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
                    <GradeBadge grade={grade} size="sm" />
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

        <div style={{ textAlign: 'center', fontSize: 10, color: C.faint, margin: '24px 0 4px' }}>
          すぴか・こと・すばる・こぐま {APP_VERSION}
        </div>
        </>
        )}

        {tab === 'calendar' && (
          <CalendarView entries={entries} settings={settings} onDayTap={handleDayTap} />
        )}

        {tab === 'stats' && (
          <StatsView entries={entries} settings={settings} unlockedBadges={badges} />
        )}
      </div>

      <TabBar tab={tab} setTab={setTab} />

      {toastQueue[0] && (
        <div
          key={toastQueue[0].id}
          style={{
            position: 'fixed', top: 'calc(16px + env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)',
            zIndex: 70, background: C.surface, border: `1px solid rgba(232,166,89,0.4)`, borderRadius: 999,
            padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 6px 24px rgba(0,0,0,0.35)', maxWidth: '90%',
          }}
        >
          <Heart size={13} color={C.amber} fill={C.amber} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: C.text, fontFamily: bodyFont, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {toastQueue[0].msg}
          </span>
        </div>
      )}

      {showGallery && (
        <LineGalleryModal onClose={() => setShowGallery(false)} seenLines={seenLines} />
      )}

      {episodeQueue[0] && (
        <MaxEpisodeModal charId={episodeQueue[0]} onClose={() => setEpisodeQueue(q => q.slice(1))} />
      )}

      {wakeEntry && (
        <WakeModal
          entry={wakeEntry}
          onSkip={() => setWakeEntry(null)}
          onSave={(id, patch) => { updateEntry(id, patch); setWakeEntry(null); }}
          settings={settings}
          selectedCharId={selectedCharId}
          affection={affection}
        />
      )}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onClose={() => setShowSettings(false)}
          onSave={saveSettings}
          onReset={resetAll}
          onExport={exportData}
          onImport={importData}
        />
      )}
      {showManual && <ManualModal settings={settings} onClose={() => setShowManual(false)} onSave={addManual} />}

      {calendarModal?.type === 'edit' && (
        <ModalShell title={`${fmtDate(calendarModal.entry.start)}の記録`} onClose={() => setCalendarModal(null)}>
          <EntryEditor
            entry={calendarModal.entry}
            onSave={(id, patch) => { updateEntry(id, patch); setCalendarModal(null); }}
            onDelete={(id) => { deleteEntry(id); setCalendarModal(null); }}
          />
        </ModalShell>
      )}
      {calendarModal?.type === 'add' && (
        <ManualModal
          settings={settings}
          initialDate={calendarModal.date}
          onClose={() => setCalendarModal(null)}
          onSave={(entry) => { addManual(entry); setCalendarModal(null); }}
        />
      )}
    </div>
  );
}










