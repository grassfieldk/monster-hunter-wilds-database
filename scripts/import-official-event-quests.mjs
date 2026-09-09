import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const sourceUrl = 'https://info.monsterhunter.com/wilds/event-quest/ja/schedule';
const cacheDirectory = path.resolve('.cache/quest-research');
const outputPath = path.resolve('public/data/quests.json');
const htmlPath = path.join(cacheDirectory, 'official-event-schedule.html');
const metadataPath = path.join(cacheDirectory, 'official-event-schedule.json');

fs.mkdirSync(cacheDirectory, { recursive: true });
let html;
if (process.platform === 'win32') {
  const command = `$ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -UseBasicParsing -Uri '${sourceUrl}' -OutFile '${htmlPath}'`;
  execFileSync('powershell.exe', ['-NoProfile', '-Command', command], { stdio: 'inherit' });
  html = fs.readFileSync(htmlPath, 'utf8');
} else {
  const response = await fetch(sourceUrl, { headers: { 'user-agent': 'Mozilla/5.0' } });
  if (!response.ok) throw new Error(`公式イベントページを取得できませんでした: HTTP ${response.status}`);
  html = await response.text();
  fs.writeFileSync(htmlPath, html);
}

const decode = (value) => value
  .replace(/&#(\d+);/gu, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([0-9a-f]+);/giu, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gu, ' ')
  .replace(/&amp;/gu, '&').replace(/&lt;/gu, '<').replace(/&gt;/gu, '>').replace(/&quot;/gu, '"')
  .replace(/&#39;/gu, "'");
const textContent = (value) => decode(value.replace(/<[^>]*>/gu, ' ')).replace(/\s+/gu, ' ').trim();
const first = (value, expression) => value.match(expression)?.[1] ?? '';
const overview = (row) => [...row.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gu)].reduce((result, match) => {
  const label = textContent(first(match[1], /<span\b[^>]*class="overview_dt"[^>]*>([\s\S]*?)<\/span>/u));
  if (!label) return result;
  const value = textContent(match[1].replace(/<span\b[^>]*class="overview_dt"[^>]*>[\s\S]*?<\/span>/u, '')).replace(/^:\s*/u, '');
  result[label] = value;
  return result;
}, {});
const hash = (value) => {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.codePointAt(0);
    result = Math.imul(result, 16777619);
  }
  return result | 0;
};
const parseNumber = (value = '') => {
  const match = value.match(/\d[\d,]*/u);
  return match ? Number(match[0].replace(/,/gu, '')) : null;
};

const sourceHtml = html.replace(/<!--[\s\S]*?-->/gu, '');
const rows = [...sourceHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gu)]
  .map((match) => match[1])
  .filter((row) => /class="title"/u.test(row));
const imported = [];
const importedKeys = new Set();
const usedIds = new Set(JSON.parse(fs.readFileSync(outputPath, 'utf8')).map((quest) => quest.game_id));
for (const row of rows) {
  const titleBlock = first(row, /<div\b[^>]*class="title"[^>]*>([\s\S]*?)<\/div>\s*<p\b[^>]*class="terms"/u);
  const titleSpans = [...titleBlock.matchAll(/<span\b[^>]*>([\s\S]*?)<\/span>/gu)];
  const title = textContent(titleSpans.at(-1)?.[1] ?? '');
  if (!title) continue;
  const details = overview(row);
  const difficulty = parseNumber(textContent(first(row, /<td\b[^>]*class="level"[^>]*>([\s\S]*?)<\/td>/u)));
  const description = textContent(first(row, /<p\b[^>]*class="txt"[^>]*>([\s\S]*?)<\/p>/u));
  const start = details['配信開始日時'] ?? '';
  const end = details['配信終了日時'] ?? '';
  const key = `${title}|${difficulty ?? ''}|${start}|${end}`;
  if (importedKeys.has(key)) continue;
  importedKeys.add(key);
  let gameId = hash(key);
  while (usedIds.has(gameId)) gameId = (gameId + 1) | 0;
  usedIds.add(gameId);
  imported.push({
    game_id: gameId,
    names: { ja: title },
    descriptions: { ja: description },
    category: 'イベント',
    difficulty,
    locations: [],
    location_names: details['フィールド'] ? [details['フィールド']] : [],
    time_limit: parseNumber(details['制限時間']),
    reward_money: null,
    hunter_rank_points: null,
    quest_type: null,
    order_rank: parseNumber(details['受注・参加条件']),
    target_monsters: [],
    objective: { ja: details['クリア条件'] ?? 'クリア条件の情報はありません' },
    clear_condition_type: null,
    source: { type: 'official-event-page', url: sourceUrl, fetched_at: new Date().toISOString(), key },
  });
}

const existing = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
const merged = [...existing.filter((quest) => quest.source?.type !== 'official-event-page'), ...imported];
fs.writeFileSync(outputPath, JSON.stringify(merged));
fs.writeFileSync(metadataPath, JSON.stringify({ sourceUrl, fetchedAt: new Date().toISOString(), imported: imported.length }));
const sourcePath = path.resolve('public/data/source.json');
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
source.dataOrigin = 'Monster Hunter Wilds ゲームデータ + 公式イベントページ';
source.additionalSources = [{ type: 'official-event-page', url: sourceUrl, fetchedAt: new Date().toISOString(), count: imported.length }];
fs.writeFileSync(sourcePath, JSON.stringify(source));
console.log(`公式イベントクエストを ${imported.length} 件取り込みました`);
