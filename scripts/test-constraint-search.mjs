import assert from 'node:assert/strict';
import { readFileSync, unlinkSync } from 'node:fs';
import test from 'node:test';
import { build } from 'esbuild';

const read = (name) => JSON.parse(readFileSync(`public/data/${name}.json`, 'utf8'));
const skills = read('skills');
const skillLevels = read('skill-levels');
const probabilities = read('decoration-probabilities');
const data = {
  weapons: read('weapons'),
  armor: read('armor'),
  amulets: read('amulets'),
  decorations: read('decorations'),
  skillNames: Object.fromEntries(skills.map((skill) => [skill.game_id, skill.names.ja])),
  maxSkillLevels: Object.fromEntries(skillLevels.map((level) => [level.skill_id, level.level])),
  randomAmulets: read('random-amulet-data'),
  artianSkills: read('artian-skill-data'),
  meldingOnlyDecorationIds: probabilities
    .filter((row) => row.probabilities.every((value) => value === 0))
    .map((row) => row.accessory_id),
};
const targetNames = [
  ['ガード性能', 3],
  ['ガード強化', 3],
  ['業物', 3],
  ['砥石使用高速化', 2],
  ['回避性能', 5],
  ['回避距離ＵＰ', 3],
  ['納刀術', 3],
  ['耐震', 3],
  ['体力回復量ＵＰ', 3],
  ['広域化', 5],
  ['満足感', 3],
  ['早食い', 3],
  ['火耐性', 3],
];
const targets = targetNames.map(([name, level]) => ({
  id: skills.find((skill) => skill.names.ja === name)?.game_id,
  level,
}));
assert.ok(targets.every((target) => target.id !== undefined));

const outfile = 'scripts/.constraint-test-bundle.mjs';
await build({
  entryPoints: ['src/simulator/constraintSearch.ts'],
  bundle: true,
  packages: 'external',
  platform: 'node',
  format: 'esm',
  outfile,
  plugins: [
    {
      name: 'highs-wasm-url',
      setup(build) {
        build.onResolve({ filter: /^highs\/runtime\?url$/ }, () => ({ path: 'highs-wasm-url', namespace: 'test' }));
        build.onLoad({ filter: /.*/, namespace: 'test' }, () => ({
          contents: `export default ${JSON.stringify(import.meta.resolve('highs/runtime'))};`,
          loader: 'js',
        }));
      },
    },
  ],
});
let findConstraintBuilds;
try {
  ({ findConstraintBuilds } = await import(`./.constraint-test-bundle.mjs?${Date.now()}`));
} finally {
  unlinkSync(outfile);
}

test('画像と同じ 13 スキルの装備が見つかる', async () => {
  const results = await findConstraintBuilds(data, targets, null, false);
  assert.ok(results.length > 0);
  for (const result of results) {
    const levels = new Map(result.skills);
    for (const target of targets) assert.ok((levels.get(target.id) ?? 0) >= target.level);
  }
  const armorId = (name) => data.armor.find((item) => item.names.ja === name)?.game_id;
  const amuletId = data.amulets.find((item) => item.names.ja === '友愛の護石Ⅴ')?.game_id;
  assert.ok(
    results.some(
      ({ build }) =>
        build.head === armorId('ゼレドロフェイクα') &&
        build.chest === armorId('ゼレドロリュックα') &&
        build.arms === armorId('ミツネアームα') &&
        build.waist === armorId('レギオスコイルβ') &&
        build.legs === armorId('トゥナムルグリーヴγ') &&
        build.amulet === amuletId,
    ),
  );
});
