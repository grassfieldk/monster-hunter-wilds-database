import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const gameDirectory = process.argv[2];
if (!gameDirectory) throw new Error('ゲームのインストール先を引数に指定してください');
const cache = path.resolve('.cache/direct');
const site = path.join(cache, 'site');
fs.mkdirSync(cache, { recursive: true });
function run(script, args = []) {
  const result = spawnSync(process.execPath, [script, ...args], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${path.basename(script)} が終了コード ${result.status} で停止しました`);
}
const filter = 'GameDesign/';
run('scripts/internal/extract-game-files.mjs', [gameDirectory, filter, '--fresh']);
run('scripts/internal/parse-game-files.mjs');
run('scripts/internal/parse-game-messages.mjs');
run('scripts/internal/build-direct-data.mjs');
run('scripts/internal/build-item-sources.mjs', [cache, site]);
run('scripts/internal/validate-site-data.mjs', [site]);
const publicData = path.resolve('public/data');
fs.mkdirSync(publicData, { recursive: true });
for (const name of ['items', 'monsters', 'lookups', 'item-uses', 'item-sources', 'source']) {
  fs.copyFileSync(path.join(site, `${name}.json`), path.join(publicData, `${name}.json`));
}
console.log('ゲームデータからサイト用データを生成しました');
