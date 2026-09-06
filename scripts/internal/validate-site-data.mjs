import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const directory = process.argv[2] ?? '.cache/direct/site';
const read = (name) => JSON.parse(fs.readFileSync(path.join(directory, `${name}.json`), 'utf8'));
const items = read('items');
const monsters = read('monsters');
const lookups = read('lookups');
const itemIds = new Set(items.map(item => item.game_id));
const stageIds = new Set(lookups.stages.map(stage => stage.game_id));
const partIds = new Set(lookups.partNames.map(part => part.part));
assert(items.length > 0 && monsters.length > 0);
assert.equal(itemIds.size, items.length);
assert.equal(new Set(monsters.map(monster => monster.game_id)).size, monsters.length);
const positive = value => assert(Number.isFinite(value) && value > 0);
for (const item of items) {
  assert(item.names.ja && item.kind);
  for (const value of [item.rarity, item.max_count, item.buy_price, item.sell_price]) assert(Number.isFinite(value) && value >= 0);
  assert(Array.isArray(item.recipes));
  for (const recipe of item.recipes) {
    positive(recipe.amount);
    assert(recipe.inputs.length > 0 && recipe.inputs.every(id => itemIds.has(id)));
  }
}
for (const monster of monsters) {
  assert(monster.names.ja && monster.species);
  positive(monster.base_health);
  assert(monster.locations.every(id => stageIds.has(id)));
  for (const value of Object.values(monster.size)) assert(Number.isFinite(value) && value >= 0);
  for (const part of monster.parts) {
    assert(partIds.has(part.part));
    for (const value of Object.values(part.multipliers)) assert(Number.isFinite(value) && value >= 0 && value <= 1);
  }
  for (const reward of monster.rewards) {
    assert(itemIds.has(reward.item_id));
    positive(reward.amount);
    positive(reward.chance);
    assert(reward.chance <= 100);
    if (reward.part) assert(partIds.has(reward.part));
  }
}
for (const name of ['item-uses', 'item-sources']) {
  for (const [id, entries] of Object.entries(read(name))) {
    assert(itemIds.has(Number(id)));
    assert(entries.length > 0);
  }
}
console.log('生成データの ID 参照・数量・確率を検証しました');
