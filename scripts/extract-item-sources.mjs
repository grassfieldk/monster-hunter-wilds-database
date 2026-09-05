import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const gameDirectory = process.argv[2];
if (!gameDirectory) throw new Error('ゲームのインストール先を引数に指定してください');
const cache = path.resolve('.cache/direct');
await fs.mkdir(cache, { recursive: true });
async function download(url, name) {
  const target = path.join(cache, name);
  try { await fs.access(target); return; } catch {}
  const response = await fetch(url);
  if (!response.ok) throw new Error(`資料の取得に失敗しました: ${response.status}`);
  await fs.writeFile(target, Buffer.from(await response.arrayBuffer()));
}
await download('https://raw.githubusercontent.com/dtlnor/RE_RSZ/60fc0631729e/rszmhwilds.json', 'layouts.json');
await download('https://raw.githubusercontent.com/alphazolam/RE_RSZ/1ef9f648d9c6/rszmhwilds.json', 'layouts-current.json');
const variants = {};
for (const [revision, ids] of [
  ['2002eb41c38d', ['49baaac0', 'bfaf2088', '11cb8271']],
  ['f97857d43ac6', ['4af01865']],
]) {
  const name = `layouts-${revision}.json`;
  await download(`https://raw.githubusercontent.com/dtlnor/RE_RSZ/${revision}/rszmhwilds.json`, name);
  const definitions = JSON.parse(await fs.readFile(path.join(cache, name), 'utf8'));
  for (const id of ids) {
    const definition = definitions[id];
    variants[`${id}:${definition.crc}`] = { ...definition, source: revision };
  }
}
await fs.writeFile(path.join(cache, 'layout-variants.json'), JSON.stringify(variants));
function run(script, args = []) {
  const result = spawnSync(process.execPath, [script, ...args], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${path.basename(script)} が終了コード ${result.status} で停止しました`);
}
const filter = 'GameDesign/(Common/(Gimmick/.*|Item/FixItems|Enemy/(EM.*|EnemyRewardDataSetting))\\.user\\.3|Gimmick/Common/GimmickReward.*\\.user\\.3|Facility/.*\\.user\\.3|Mission/.*(MsData|QuestData|Reward[^/]*|SupplyItemData)\\.user\\.3|Stage/Common/EnumMaker/Stage\\.user\\.3|Stage/st10[1-5]/.*Gimmick.*\\.(scn\\.21|pog\\.12|poglst\\.0)|Text/(Excel_Data/.*|Mission/.*)\\.msg\\.23)$';
run('scripts/internal/extract-game-files.mjs', [gameDirectory, filter, '--fresh']);
run('scripts/internal/parse-game-files.mjs');
run('scripts/internal/parse-game-messages.mjs');
run('scripts/internal/build-item-sources.mjs', [cache]);
