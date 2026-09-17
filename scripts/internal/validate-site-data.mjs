import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const directory = process.argv[2] ?? '.cache/direct/site';
const read = (name) => JSON.parse(fs.readFileSync(path.join(directory, `${name}.json`), 'utf8'));
const items = read('items');
const monsters = read('monsters');
const quests = read('quests');
const lookups = read('lookups');
const armor = read('armor');
const amulets = read('amulets');
const weapons = read('weapons');
const decorations = read('decorations');
const skills = read('skills');
const weaponTrees = read('weapon-trees');
const equipmentRecipes = [...read('armor-recipes'), ...read('amulet-recipes'), ...read('weapon-recipes'), ...read('kinsect-recipes')];
const itemIds = new Set(items.map(item => item.game_id));
const skillIds = new Set(skills.map(skill => skill.game_id));
const weaponIds = new Set(weapons.map(weapon => weapon.game_id));
const stageIds = new Set(lookups.stages.map(stage => stage.game_id));
const partIds = new Set(lookups.partNames.map(part => part.part));
assert(items.length > 0 && monsters.length > 0 && quests.length > 0);
assert.equal(itemIds.size, items.length);
assert.equal(new Set(monsters.map(monster => monster.game_id)).size, monsters.length);
assert.equal(new Set(quests.map(quest => quest.game_id)).size, quests.length);
assert(armor.length > 0 && amulets.length > 0 && weapons.length > 0 && decorations.length > 0 && skills.length > 0);
assert.equal(new Set(armor.map(item => item.game_id)).size, armor.length);
assert.equal(new Set(amulets.map(item => item.game_id)).size, amulets.length);
assert.equal(new Set(weapons.map(item => item.game_id)).size, weapons.length);
assert.equal(new Set(decorations.map(item => item.game_id)).size, decorations.length);
for (const equipment of [...armor, ...amulets, ...weapons, ...decorations]) {
  assert(equipment.names.ja);
  for (const skill of equipment.skills) assert(skillIds.has(skill.skill_id));
}
for (const edge of weaponTrees) assert(weaponIds.has(edge.parent_id) && weaponIds.has(edge.child_id));
for (const recipe of equipmentRecipes) {
  assert(recipe.materials.length > 0);
  for (const material of recipe.materials) assert(itemIds.has(material.item_id) && material.amount > 0);
}
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
  if (monster.base_health !== null) positive(monster.base_health);
  assert(monster.locations.every(id => stageIds.has(id)));
  for (const value of Object.values(monster.size)) if (value !== null) assert(Number.isFinite(value) && value >= 0);
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
for (const quest of quests) {
  assert(quest.names.ja);
  assert(quest.objective.ja);
  assert(['任務', 'フリー', 'イベント', '闘技大会', '調査', 'その他'].includes(quest.category));
  assert(quest.difficulty === null || (Number.isFinite(quest.difficulty) && quest.difficulty >= 0));
  assert(quest.locations.every(id => stageIds.has(id)));
  for (const value of [quest.time_limit, quest.reward_money, quest.hunter_rank_points, quest.quest_type, quest.order_rank]) {
    assert(value === null || (Number.isFinite(value) && value >= 0));
  }
  for (const target of quest.target_monsters) {
    assert(Number.isInteger(target.game_id));
    assert(target.names.ja && Number.isFinite(target.amount) && target.amount >= 0);
  }
  assert(quest.clear_condition_type === null || (Number.isInteger(quest.clear_condition_type) && quest.clear_condition_type >= 0));
}
for (const name of ['item-uses', 'item-sources']) {
  for (const [id, entries] of Object.entries(read(name))) {
    assert(itemIds.has(Number(id)));
    assert(entries.length > 0);
  }
}
console.log('生成データの ID 参照・数量・確率を検証しました');
