import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const mergedDirectory = path.resolve(process.argv[2] ?? 'tools/mhdb-wilds-data/output/merged');
const requestedSourceRevision = process.argv[3];
const outputDirectory = path.resolve('public/data');

async function load(relativePath) {
  return JSON.parse(await readFile(path.join(mergedDirectory, relativePath), 'utf8'));
}

function addUse(uses, itemId, value) {
  const key = String(itemId);
  if (!uses[key]) uses[key] = [];
  uses[key].push(value);
}

function localizedName(entry) {
  return entry?.names?.ja || entry?.names?.en || '名称不明';
}

const [items, monsters, stages, species, partNames, armor, amulets] = await Promise.all([
  load('Item.json'),
  load('LargeMonsters.json'),
  load('Stage.json'),
  load('Species.json'),
  load('PartNames.json'),
  load('Armor.json'),
  load('Amulet.json'),
]);

const weaponFiles = [
  ['Bow.json', '弓'],
  ['ChargeBlade.json', 'チャージアックス'],
  ['DualBlades.json', '双剣'],
  ['GreatSword.json', '大剣'],
  ['Gunlance.json', 'ガンランス'],
  ['Hammer.json', 'ハンマー'],
  ['HeavyBowgun.json', 'ヘビィボウガン'],
  ['HuntingHorn.json', '狩猟笛'],
  ['InsectGlaive.json', '操虫棍'],
  ['Lance.json', 'ランス'],
  ['LightBowgun.json', 'ライトボウガン'],
  ['LongSword.json', '太刀'],
  ['SwitchAxe.json', 'スラッシュアックス'],
  ['SwordShield.json', '片手剣'],
];
const weapons = await Promise.all(weaponFiles.map(async ([file, category]) => ({ category, entries: await load(`weapons/${file}`) })));
const itemUses = {};

for (const result of items) {
  for (const recipe of result.recipes ?? []) {
    for (const inputId of recipe.inputs ?? []) {
      addUse(itemUses, inputId, { category: '調合', name: localizedName(result), amount: 1 });
    }
  }
}

for (const set of armor) {
  for (const piece of set.pieces ?? []) {
    for (const [itemId, amount] of Object.entries(piece.crafting?.inputs ?? {})) {
      addUse(itemUses, itemId, { category: '防具生産', name: localizedName(piece), detail: localizedName(set), amount });
    }
  }
}

for (const amulet of amulets) {
  for (const rank of amulet.ranks ?? []) {
    for (const [itemId, amount] of Object.entries(rank.recipe?.inputs ?? {})) {
      addUse(itemUses, itemId, { category: '護石生産', name: localizedName(rank), amount });
    }
  }
}

for (const { category, entries } of weapons) {
  for (const weapon of entries) {
    for (const [itemId, amount] of Object.entries(weapon.crafting?.inputs ?? {})) {
      addUse(itemUses, itemId, { category: `${category}生産`, name: localizedName(weapon), amount });
    }
  }
}

let sourceRevision = requestedSourceRevision || 'unknown';
if (!requestedSourceRevision) {
  try {
    sourceRevision = execFileSync('git', ['-C', path.dirname(path.dirname(mergedDirectory)), 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {}
}

await mkdir(outputDirectory, { recursive: true });
const source = {
  generatedAt: new Date().toISOString(),
  gameFiles: ['re_chunk_000.pak', 're_chunk_000.pak.patch_*.pak', 're_chunk_000.pak.sub_000.pak'],
  sourceProject: 'LartTyler/mhdb-wilds-data',
  sourceRevision,
};

await Promise.all([
  writeFile(path.join(outputDirectory, 'items.json'), JSON.stringify(items)),
  writeFile(path.join(outputDirectory, 'monsters.json'), JSON.stringify(monsters)),
  writeFile(path.join(outputDirectory, 'lookups.json'), JSON.stringify({ stages, species, partNames })),
  writeFile(path.join(outputDirectory, 'item-uses.json'), JSON.stringify(itemUses)),
  writeFile(path.join(outputDirectory, 'source.json'), JSON.stringify(source, null, 2)),
]);

console.log(`サイト用データを ${outputDirectory} に生成しました`);
