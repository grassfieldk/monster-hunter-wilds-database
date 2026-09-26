import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';

const bundled = await build({
  entryPoints: ['src/simulator/search.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
});
const { searchBuilds } = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`
);

const skill = (skillId, level) => ({ skill_id: skillId, level });
const armor = (id, part, slots, defense, skills = []) => ({
  game_id: id,
  part,
  slots,
  defense,
  skills,
  resistances: [0, 0, 0, 0, 0],
  names: { ja: id },
});
const weapon = (id) => ({
  game_id: id,
  weapon_type: 'LongSword',
  category: '大剣',
  slots: [],
  defense: 0,
  skills: [],
  names: { ja: id },
  attack: 1,
  affinity: 0,
  attribute_value: 0,
});
const amulet = (id) => ({ game_id: id, skills: [], names: { ja: id } });
const fixture = () => ({
  weapons: [weapon('weapon-a')],
  armor: [
    armor('head-a', 0, [3, 1], 1),
    armor('head-b', 0, [3], 100),
    armor('chest', 1, [], 0),
    armor('arms', 2, [], 0),
    armor('waist', 3, [], 0),
    armor('legs', 4, [], 0),
  ],
  amulets: [amulet('amulet')],
  decorations: [{ game_id: 10, type: 1842954880, required_slot: 1, skills: [skill(1, 1)], names: { ja: '珠' } }],
  maxSkillLevels: { 1: 2 },
  skillNames: { 1: '試験スキル' },
  randomAmulets: { groups: {}, combos: [] },
  artianSkills: { weaponIds: [], skillPairs: [], bonuses: [] },
});

test('空きスロット優先では小さい枠に装飾品を入れる', () => {
  const results = searchBuilds(fixture(), [{ id: 1, level: 1 }], 'slots');
  assert.equal(results.length, 2);
  assert.equal(results[0].build.head, 'head-a');
  assert.deepEqual(results[0].freeSlots, [3]);
  assert.deepEqual(results[0].build.decorations.head, [null, 10]);
});

test('防御力優先でも条件を満たす全候補を比べる', () => {
  const results = searchBuilds(fixture(), [{ id: 1, level: 1 }], 'defense');
  assert.equal(results.length, 2);
  assert.equal(results[0].build.head, 'head-b');
  assert.equal(results[0].defense, 100);
});

test('武器種指定とシリーズ系スキルの合算', () => {
  const data = fixture();
  data.weapons.push({ ...weapon('weapon-b'), weapon_type: 'Tachi' });
  data.armor[0].skills = [skill(1, 1)];
  data.armor[5].skills = [skill(1, 1)];
  const results = searchBuilds(data, [{ id: 1, level: 2 }], 'slots', 'Tachi');
  assert.ok(results.length > 0);
  assert.ok(results.every((result) => result.build.weapon === 'weapon-b'));
  assert.equal(results[0].skills.find(([id]) => id === 1)?.[1], 2);
});

test('少数データの総当たりと上位順位が一致する', () => {
  const data = fixture();
  data.weapons.push(weapon('weapon-b'));
  data.amulets.push(amulet('amulet-b'));
  data.armor.push(armor('head-c', 0, [2, 1], 50));
  const heads = data.armor.filter((item) => item.part === 0);
  const expected = [];
  for (const selectedWeapon of data.weapons)
    for (const head of heads)
      for (const selectedAmulet of data.amulets) {
        for (let mask = 0; mask < 1 << head.slots.length; mask++) {
          const used = head.slots.filter((_, index) => mask & (1 << index));
          if (!used.length) continue;
          const free = head.slots.filter((_, index) => !(mask & (1 << index)));
          expected.push({
            id: [selectedWeapon.game_id, head.game_id, 'chest', 'arms', 'waist', 'legs', selectedAmulet.game_id].join(
              '|',
            ),
            defense: head.defense,
            counts: [3, 2, 1].map((level) => free.filter((slot) => slot === level).length),
          });
        }
      }
  const bestById = new Map();
  for (const row of expected) {
    const old = bestById.get(row.id);
    const counts = row.counts.join('');
    if (!old || counts > old.counts.join('')) bestById.set(row.id, row);
  }
  for (const sort of ['slots', 'defense']) {
    const brute = [...bestById.values()].sort((a, b) => {
      const differences =
        sort === 'slots'
          ? [...b.counts.map((value, index) => value - a.counts[index]), b.defense - a.defense]
          : [b.defense - a.defense, ...b.counts.map((value, index) => value - a.counts[index])];
      return differences.find((value) => value !== 0) ?? a.id.localeCompare(b.id);
    });
    const actual = searchBuilds(data, [{ id: 1, level: 1 }], sort);
    assert.deepEqual(
      actual.map((result) =>
        [
          result.build.weapon,
          result.build.head,
          result.build.chest,
          result.build.arms,
          result.build.waist,
          result.build.legs,
          result.build.amulet,
        ].join('|'),
      ),
      brute.map((row) => row.id),
    );
  }
});

test('武器種で効果がないスキルを含む護石を除外する', () => {
  const data = fixture();
  data.skillNames[2] = '笛吹き名人';
  data.amulets.push({ ...amulet('horn-charm'), skills: [skill(2, 1)] });
  const results = searchBuilds(data, [{ id: 1, level: 1 }], 'slots', 'LongSword');
  assert.ok(results.length > 0);
  assert.ok(results.every((result) => result.build.amulet !== 'horn-charm'));
});

test('同条件なら指定外の有用スキルを優先する', () => {
  const data = fixture();
  data.skillNames[2] = '攻撃';
  data.skillNames[3] = '植生学';
  data.amulets = [
    { ...amulet('field-charm'), skills: [skill(3, 1)] },
    { ...amulet('attack-charm'), skills: [skill(2, 1)] },
  ];
  const results = searchBuilds(data, [{ id: 1, level: 1 }], 'slots');
  assert.equal(results[0].build.amulet, 'attack-charm');
  assert.ok(results[0].utility > results.find((result) => result.build.amulet === 'field-charm').utility);
});

test('武器種ごとの成立可能性を候補整理で失わない', () => {
  const data = fixture();
  data.skillNames[2] = '笛吹き名人';
  data.weapons = Array.from({ length: 31 }, (_, index) => weapon(`greatsword-${index.toString().padStart(2, '0')}`));
  data.weapons.push({ ...weapon('hunting-horn'), weapon_type: 'Whistle' });
  data.amulets = [{ ...amulet('horn-charm'), skills: [skill(2, 1)] }];
  const results = searchBuilds(data, [{ id: 1, level: 1 }], 'slots');
  assert.ok(results.length > 0);
  assert.ok(results.every((result) => result.build.weapon === 'hunting-horn'));
});

test('武器の属性と合わない属性強化を除外する', () => {
  const data = fixture();
  data.skillNames[3] = '火属性攻撃強化';
  data.weapons = [
    { ...weapon('water-weapon'), attribute: 2, attribute_value: 10 },
    { ...weapon('fire-weapon'), attribute: 1, attribute_value: 10 },
  ];
  data.amulets = [{ ...amulet('fire-charm'), skills: [skill(3, 1)] }];
  const results = searchBuilds(data, [{ id: 1, level: 1 }], 'slots');
  assert.ok(results.length > 0);
  assert.ok(results.every((result) => result.build.weapon === 'fire-weapon'));
});
