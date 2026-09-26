import fs from 'node:fs';

const directory = 'scripts/data/wilds-sim';
const readCsv = (name) =>
  fs
    .readFileSync(`${directory}/${name}`, 'utf8')
    .replace(/^\uFEFF/u, '')
    .trim()
    .split(/\r?\n/u)
    .slice(1)
    .map((line) => line.split(','));
const skills = JSON.parse(fs.readFileSync('public/data/skills.json', 'utf8'));
const skillByName = new Map(skills.map((skill) => [skill.names.ja, skill.game_id]));
const groups = {};
for (const [group, name, level] of readCsv('MHWilds_GROUP_SHININGCHARM.csv')) {
  const id = skillByName.get(name);
  if (id === undefined) throw Error(`スキルがありません: ${name}`);
  if (!groups[group]) groups[group] = [];
  groups[group].push({ skill_id: id, level: Number(level) });
}
const combos = readCsv('MHWilds_COMBO_SHININGCHARM.csv').map(
  ([rarity, first, second, third, level1, level2, level3, type1, type2, type3]) => ({
    rarity: Number(rarity),
    groups: [Number(first), Number(second), Number(third)],
    slots: [
      [level1, type1],
      [level2, type2],
      [level3, type3],
    ]
      .map(([level, type]) => ({ level: Number(level), type: Number(type) === 1 ? -1638455296 : 1842954880 }))
      .filter((slot) => slot.level > 0),
  }),
);
fs.writeFileSync('public/data/random-amulet-data.json', JSON.stringify({ groups, combos }));
