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
const modelBundle = await build({
  entryPoints: ['src/simulator/model.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
});
const { defaultRandomAmuletId, emptyBuild, selectedGear } = await import(
  `data:text/javascript;base64,${Buffer.from(modelBundle.outputFiles[0].text).toString('base64')}`
);
const persistenceBundle = await build({
  entryPoints: ['src/simulator/searchPersistence.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
});
const { readSavedSearch, saveSearch } = await import(
  `data:text/javascript;base64,${Buffer.from(persistenceBundle.outputFiles[0].text).toString('base64')}`
);
const presetsBundle = await build({
  entryPoints: ['src/simulator/searchPresets.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
});
const { deleteSearchPreset, readSearchPresets, saveSearchPreset } = await import(
  `data:text/javascript;base64,${Buffer.from(presetsBundle.outputFiles[0].text).toString('base64')}`
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

test('スキルなしの枠を含む鑑定護石を選択できる', () => {
  const data = fixture();
  data.randomAmulets = {
    groups: { 1: [skill(1, 1)], 2: [skill(2, 1)] },
    combos: [{ rarity: 5, groups: [1, 2, 0], slots: [] }],
  };
  const build = { ...emptyBuild(), amulet: defaultRandomAmuletId(data.randomAmulets, 0) };
  assert.equal(build.amulet, 'random-amulet:0:1.1:2.1:0.0');
  assert.deepEqual(selectedGear(build, data).amulet?.skills, [skill(1, 1), skill(2, 1)]);
});

test('多数のスキル検索で最適化処理が失敗しても通常検索を続ける', async () => {
  const data = fixture();
  const targets = Array.from({ length: 10 }, (_, index) => ({ id: index + 1, level: 1 }));
  data.armor = [
    armor(
      'head',
      0,
      [],
      1,
      targets.map((target) => skill(target.id, 1)),
    ),
  ];
  data.decorations = [];
  data.maxSkillLevels = Object.fromEntries(targets.map((target) => [target.id, 1]));
  data.skillNames = Object.fromEntries(targets.map((target) => [target.id, `スキル ${target.id}`]));
  const workerBundle = await build({
    entryPoints: ['src/simulator/search.worker.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false,
    plugins: [
      {
        name: 'failed-constraint-search',
        setup(bundle) {
          bundle.onResolve({ filter: /^\.\/constraintSearch$/ }, ({ path }) => ({
            path,
            namespace: 'failed-constraint-search',
          }));
          bundle.onLoad({ filter: /.*/, namespace: 'failed-constraint-search' }, () => ({
            contents: 'export async function findConstraintBuilds() { throw new Error("最適化処理の失敗") }',
            loader: 'js',
          }));
        },
      },
    ],
  });
  const previous = globalThis.self;
  const messages = [];
  globalThis.self = { postMessage: (message) => messages.push(message) };
  try {
    await import(`data:text/javascript;base64,${Buffer.from(workerBundle.outputFiles[0].text).toString('base64')}`);
    await globalThis.self.onmessage({
      data: {
        data,
        targets,
        sort: 'slots',
        weaponType: null,
        weaponRequired: false,
        includeMeldingOnly: false,
        seriesTargets: [],
        includeArtian: false,
      },
    });
    assert.equal(messages.at(-1).results[0].build.head, 'head');
  } finally {
    if (previous === undefined) delete globalThis.self;
    else globalThis.self = previous;
  }
});

test('指定外スキルの上限を超えた Lv は順位に加算しない', () => {
  const data = fixture();
  data.armor = [
    armor('head-overcap', 0, [], 1, [skill(1, 1), skill(2, 5)]),
    armor('head-useful', 0, [], 1, [skill(1, 1), skill(3, 3)]),
  ];
  data.decorations = [];
  data.maxSkillLevels = { 1: 1, 2: 2, 3: 3 };
  data.skillNames = { 1: '指定スキル', 2: '指定外 A', 3: '指定外 B' };
  const results = searchBuilds(data, [{ id: 1, level: 1 }], 'slots');
  assert.deepEqual(
    results.map((result) => result.build.head),
    ['head-useful', 'head-overcap'],
  );
  assert.deepEqual(
    results.map((result) => result.utility),
    [3, 2],
  );
});

test('装飾品も発動上限に基づいて選ぶ', () => {
  const data = fixture();
  data.armor = [armor('head', 0, [1], 1)];
  data.decorations = [
    { game_id: 11, type: 1842954880, required_slot: 1, skills: [skill(1, 1), skill(2, 5)] },
    { game_id: 12, type: 1842954880, required_slot: 1, skills: [skill(1, 1), skill(3, 3)] },
  ];
  data.maxSkillLevels = { 1: 1, 2: 2, 3: 3 };
  data.skillNames = { 1: '指定スキル', 2: '指定外 A', 3: '指定外 B' };
  const results = searchBuilds(data, [{ id: 1, level: 1 }], 'slots');
  assert.equal(results[0].build.decorations.head[0], 12);
  assert.equal(results[0].utility, 3);
});

test('既存装備で上限に達した指定外スキルを装飾品で重複評価しない', () => {
  const data = fixture();
  data.armor = [armor('head', 0, [1], 1, [skill(2, 2)])];
  data.decorations = [
    { game_id: 11, type: 1842954880, required_slot: 1, skills: [skill(1, 1), skill(2, 2)] },
    { game_id: 12, type: 1842954880, required_slot: 1, skills: [skill(1, 1), skill(3, 1)] },
  ];
  data.maxSkillLevels = { 1: 1, 2: 2, 3: 1 };
  data.skillNames = { 1: '指定スキル', 2: '指定外 A', 3: '指定外 B' };
  const results = searchBuilds(data, [{ id: 1, level: 1 }], 'slots');
  assert.equal(results[0].build.decorations.head[0], 12);
  assert.equal(results[0].utility, 3);
});

test('空きスロット優先では小さい枠に装飾品を入れる', () => {
  const results = searchBuilds(fixture(), [{ id: 1, level: 1 }], 'slots');
  assert.equal(results.length, 2);
  assert.equal(results[0].build.head, 'head-a');
  assert.deepEqual(results[0].freeSlots, [3]);
  assert.deepEqual(results[0].build.decorations.head, [null, 10]);
});

test('検索途中の上位候補を進捗として受け取れる', () => {
  const snapshots = [];
  const progressCounts = [];
  const results = searchBuilds(fixture(), [{ id: 1, level: 1 }], 'slots', null, (progress) => {
    if (progress.results) snapshots.push(progress.results);
    progressCounts.push([progress.visited, progress.found]);
  });
  assert.ok(snapshots.length > 1);
  assert.equal(snapshots[0].length, 1);
  assert.deepEqual(snapshots.at(-1), results);
  assert.ok(progressCounts.every(([visited], index) => index === 0 || visited >= progressCounts[index - 1][0]));
  assert.equal(progressCounts.at(-1)[1], 2);
});

test('検索条件と結果を保存して復元できる', () => {
  const storage = new Map();
  const previous = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  };
  try {
    const result = searchBuilds(fixture(), [{ id: 1, level: 1 }], 'slots')[0];
    const saved = {
      weaponTargets: [{ id: 1, level: 1 }],
      armorTargets: [],
      seriesTargets: [{ id: 2, level: 1 }],
      searchedTargets: [{ id: 1, level: 1 }],
      sort: 'slots',
      weaponType: 'LongSword',
      weaponId: 'weapon-a',
      includeMeldingOnly: false,
      includeArtian: false,
      progress: { stage: 'searching', visited: 100, found: 1, results: [result] },
      results: [result],
      searching: false,
      message: '',
    };
    saveSearch(saved);
    assert.deepEqual(readSavedSearch(), {
      ...saved,
      progress: { stage: 'searching', visited: 100, found: 1 },
    });
    const { seriesTargets: _, searchedTargets: __, ...previousVersion } = saved;
    delete previousVersion.includeMeldingOnly;
    delete previousVersion.includeArtian;
    delete previousVersion.weaponId;
    storage.set('simulator-search-v1', JSON.stringify(previousVersion));
    assert.deepEqual(readSavedSearch()?.seriesTargets, []);
    assert.deepEqual(readSavedSearch()?.searchedTargets, []);
    assert.equal(readSavedSearch()?.includeMeldingOnly, false);
    assert.equal(readSavedSearch()?.includeArtian, true);
    assert.equal(readSavedSearch()?.weaponId, null);
  } finally {
    if (previous === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previous;
  }
});

test('名前付き検索条件を最大 30 件まで保存し、削除後に再度保存できる', () => {
  const storage = new Map();
  const previous = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  };
  try {
    const criteria = {
      weaponTargets: [{ id: 1, level: 2 }],
      armorTargets: [],
      seriesTargets: [],
      sort: 'slots',
      weaponType: 'LongSword',
      weaponId: 'weapon-a',
      includeMeldingOnly: false,
      includeArtian: false,
    };
    const presets = Array.from({ length: 30 }, (_, index) => saveSearchPreset(`条件 ${index}`, criteria));
    assert.ok(presets.every((result) => 'preset' in result));
    assert.equal(readSearchPresets().length, 30);
    assert.ok(readSearchPresets().every((preset) => !preset.criteria.includeArtian));
    assert.ok(readSearchPresets().every((preset) => preset.criteria.weaponId === 'weapon-a'));
    assert.deepEqual(saveSearchPreset('条件 0', criteria), { error: 'duplicate' });
    assert.deepEqual(saveSearchPreset('条件 30', criteria), { error: 'limit' });
    const first = presets[0].preset;
    assert.deepEqual(
      deleteSearchPreset(first.id),
      presets.slice(1).map((result) => result.preset),
    );
    assert.equal(readSearchPresets().length, 29);
    assert.ok('preset' in saveSearchPreset('条件 30', criteria));
    assert.equal(readSearchPresets().length, 30);
  } finally {
    if (previous === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previous;
  }
});

test('保存済み検索条件が 30 件を超えている場合は新しい 30 件を残す', () => {
  const storage = new Map();
  const previous = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  };
  try {
    const criteria = {
      weaponTargets: [],
      armorTargets: [],
      seriesTargets: [],
      sort: 'slots',
      weaponType: null,
      includeMeldingOnly: false,
    };
    storage.set(
      'simulator-search-presets-v1',
      JSON.stringify(Array.from({ length: 32 }, (_, index) => ({ id: `${index}`, name: `条件 ${index}`, criteria }))),
    );
    assert.deepEqual(
      readSearchPresets().map((preset) => preset.name),
      Array.from({ length: 30 }, (_, index) => `条件 ${index + 2}`),
    );
    assert.ok(readSearchPresets().every((preset) => preset.criteria.includeArtian));
    assert.ok(readSearchPresets().every((preset) => preset.criteria.weaponId === null));
    assert.equal(JSON.parse(storage.get('simulator-search-presets-v1')).length, 30);
  } finally {
    if (previous === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previous;
  }
});

test('錬金限定の装飾品を検索条件から除外する', () => {
  const data = fixture();
  data.armor = [armor('head', 0, [1], 0)];
  data.decorations = [
    { game_id: 11, type: 1842954880, required_slot: 1, skills: [skill(1, 1)], names: { ja: '錬金珠' } },
  ];
  data.meldingOnlyDecorationIds = [11];
  assert.equal(searchBuilds(data, [{ id: 1, level: 1 }], 'slots').length, 0);
  assert.equal(searchBuilds(data, [{ id: 1, level: 1 }], 'slots', null, undefined, false, true).length, 1);
  assert.deepEqual(searchBuilds(data, [{ id: 1, level: 1 }], 'slots', null, undefined, false, false), []);
});

test('鑑定護石の候補整理でも成立する組み合わせを残す', () => {
  const data = fixture();
  data.armor = [];
  data.amulets = [];
  data.decorations = [];
  data.randomAmulets = {
    groups: {
      1: [skill(1, 1), skill(2, 1)],
      2: [skill(3, 1), skill(4, 1)],
      3: [skill(5, 1), skill(6, 1)],
    },
    combos: [{ rarity: 1, groups: [1, 2, 3], slots: [] }],
  };
  const results = searchBuilds(data, [{ id: 1, level: 1 }], 'slots');
  assert.equal(results.length, 4);
  assert.ok(results.every((result) => result.build.amulet?.includes('random-amulet:0:1.1')));
});

test('2 スキルの鑑定護石も検索と装備情報の復元に含める', () => {
  const data = fixture();
  data.armor = [];
  data.amulets = [];
  data.decorations = [];
  data.randomAmulets = {
    groups: { 1: [skill(1, 1)], 2: [skill(2, 1)] },
    combos: [{ rarity: 1, groups: [1, 2, 0], slots: [] }],
  };
  const results = searchBuilds(data, [{ id: 1, level: 1 }], 'slots');
  assert.equal(results.length, 1);
  assert.equal(results[0].build.amulet, 'random-amulet:0:1.1:2.1:0.0');
  assert.deepEqual(results[0].skills, [
    [1, 1],
    [2, 1],
  ]);
});

test('同じスキル抽選枠を持つ鑑定護石のスロット違いを残す', () => {
  const data = fixture();
  data.armor = [];
  data.amulets = [];
  data.decorations = [];
  data.randomAmulets = {
    groups: { 1: [skill(1, 1)], 2: [skill(2, 1)] },
    combos: [
      { rarity: 1, groups: [1, 2, 0], slots: [] },
      { rarity: 1, groups: [1, 2, 0], slots: [{ level: 3, type: 1842954880 }] },
    ],
  };
  const results = searchBuilds(data, [{ id: 1, level: 1 }], 'slots');
  assert.deepEqual(
    results.map((result) => result.build.amulet),
    ['random-amulet:1:1.1:2.1:0.0', 'random-amulet:0:1.1:2.1:0.0'],
  );
});

test('防具、通常護石、装飾品、鑑定護石の順に検索する', () => {
  const data = fixture();
  data.armor = [armor('direct-head', 0, [], 1, [skill(1, 1)]), armor('slotted-head', 0, [1], 0)];
  data.amulets = [{ ...amulet('normal-charm'), skills: [skill(1, 1)] }];
  data.randomAmulets = {
    groups: { 1: [skill(1, 1)], 2: [skill(2, 1)], 3: [skill(3, 1)] },
    combos: [{ rarity: 1, groups: [1, 2, 3], slots: [] }],
  };
  const results = searchBuilds(data, [{ id: 1, level: 1 }], 'slots');
  assert.deepEqual([...new Set(results.map((result) => result.phase))], [0, 1, 2, 3]);
  assert.equal(results[0].build.head, 'direct-head');
  assert.ok(results.some((result) => result.phase === 2 && result.build.decorations.head?.includes(10)));
  assert.ok(results.some((result) => result.phase === 3 && result.build.amulet?.startsWith('random-amulet:')));
});

test('アーティア武器を検索対象から切り替えられる', () => {
  const data = fixture();
  data.weapons.push(weapon('artian-source'));
  data.artianSkills.weaponIds = ['artian-source'];
  data.artianSkills.skillPairs = [{ groupSkillId: 2, seriesSkillId: 3 }];
  data.skillNames[2] = 'アーティアスキル';
  data.skillNames[3] = 'シリーズスキル';
  data.maxSkillLevels[2] = 1;
  data.maxSkillLevels[3] = 1;
  const target = [{ id: 2, level: 1 }];
  const included = searchBuilds(data, target, 'slots');
  assert.ok(included.some((result) => result.build.weapon === 'artian:artian-source:2.3'));
  assert.deepEqual(searchBuilds(data, target, 'slots', null, undefined, false, false, [], false, false), []);
  const selected = searchBuilds(
    data,
    target,
    'slots',
    'LongSword',
    undefined,
    false,
    false,
    [],
    false,
    true,
    'artian-source',
  );
  assert.ok(selected.length > 0);
  assert.ok(selected.every((result) => result.build.weapon?.startsWith('artian:artian-source:')));
});

test('指定した武器だけを検索結果に使う', () => {
  const data = fixture();
  data.weapons.push({ ...weapon('weapon-b'), defense: 100 });
  const results = searchBuilds(
    data,
    [{ id: 1, level: 1 }],
    'defense',
    'LongSword',
    undefined,
    false,
    false,
    [],
    false,
    true,
    'weapon-a',
  );
  assert.ok(results.length > 0);
  assert.ok(results.every((result) => result.build.weapon === 'weapon-a'));
  assert.deepEqual(
    searchBuilds(
      data,
      [{ id: 1, level: 1 }],
      'slots',
      'LongSword',
      undefined,
      false,
      false,
      [],
      false,
      true,
      'missing',
    ),
    [],
  );
});

test('装飾品で上限に達したら鑑定護石を準備しない', () => {
  const data = fixture();
  data.armor = Array.from({ length: 201 }, (_, index) => armor(`head-${index}`, 0, [1], index));
  data.randomAmulets = {
    groups: {
      1: Array.from({ length: 20 }, (_, index) => skill(100 + index, 1)),
      2: Array.from({ length: 20 }, (_, index) => skill(200 + index, 1)),
      3: Array.from({ length: 20 }, (_, index) => skill(300 + index, 1)),
    },
    combos: [{ rarity: 1, groups: [1, 2, 3], slots: [{ level: 1, type: 1842954880 }] }],
  };
  let last;
  const results = searchBuilds(data, [{ id: 1, level: 1 }], 'slots', null, (progress) => {
    last = progress;
  });
  assert.equal(last.found, 200);
  assert.ok(last.visited < 8000);
  assert.ok(results.every((result) => result.phase === 2));
});

test('200 件で探索を止め、上位 10 件だけを返す', () => {
  const data = fixture();
  data.armor = [
    ...Array.from({ length: 201 }, (_, index) => armor(`head-${index}`, 0, [1], index + 1)),
    ...data.armor.filter((item) => item.part !== 0),
  ];
  const progress = [];
  const results = searchBuilds(data, [{ id: 1, level: 1 }], 'defense', null, (update) => progress.push(update));
  assert.equal(results.length, 10);
  assert.equal(progress.at(-1).found, 200);
  assert.equal(progress.at(-1).limitReached, true);
  assert.ok(results.every((result, index) => index === 0 || results[index - 1].defense >= result.defense));
});

test('二部位の候補が 200 件を超えても防御力上位を返す', () => {
  const data = fixture();
  data.armor = [
    ...Array.from({ length: 30 }, (_, index) => armor(`head-${index}`, 0, [], index, [skill(1, 1)])),
    ...Array.from({ length: 30 }, (_, index) => armor(`chest-${index}`, 1, [], index * 2, [skill(1, 1)])),
  ];
  data.decorations = [];
  const expected = data.armor
    .filter((item) => item.part === 0)
    .flatMap((head) =>
      data.armor
        .filter((item) => item.part === 1)
        .map((chest) => ({
          head: head.game_id,
          chest: chest.game_id,
          defense: head.defense + chest.defense,
        })),
    )
    .sort((a, b) => b.defense - a.defense || `${a.head}|${a.chest}`.localeCompare(`${b.head}|${b.chest}`))
    .slice(0, 10);
  let progress;
  const actual = searchBuilds(data, [{ id: 1, level: 2 }], 'defense', null, (update) => {
    progress = update;
  });
  assert.equal(progress.found, 200);
  assert.deepEqual(
    actual.map(({ build, defense }) => ({ head: build.head, chest: build.chest, defense })),
    expected,
  );
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
  data.decorations = [];
  const results = searchBuilds(data, [{ id: 1, level: 2 }], 'slots', 'Tachi');
  assert.ok(results.length > 0);
  assert.ok(results.every((result) => result.build.weapon === null || result.build.weapon === 'weapon-b'));
  assert.equal(results[0].build.weapon, null);
  assert.equal(results[0].build.head, 'head-a');
  assert.equal(results[0].build.legs, 'legs');
  assert.equal(results[0].skills.find(([id]) => id === 1)?.[1], 2);
});

test('シリーズ条件が成立しない場合は通常スキルの検索を始めない', () => {
  const data = fixture();
  data.skillNames[2] = 'シリーズスキル';
  data.maxSkillLevels[2] = 1;
  data.armor[0].skills = [skill(1, 1)];
  const progress = [];
  const results = searchBuilds(
    data,
    [
      { id: 1, level: 1 },
      { id: 2, level: 1 },
    ],
    'slots',
    null,
    (update) => progress.push(update),
    false,
    false,
    [{ id: 2, level: 1 }],
  );
  assert.deepEqual(results, []);
  assert.deepEqual(progress, [{ stage: 'searching', visited: 0, found: 0, results: [] }]);
});

test('シリーズ条件を先に確認した後も通常スキルを含めて検索する', () => {
  const data = fixture();
  data.skillNames[2] = 'シリーズスキル';
  data.maxSkillLevels[2] = 1;
  data.armor[0].skills = [skill(1, 1), skill(2, 1)];
  const results = searchBuilds(
    data,
    [
      { id: 1, level: 1 },
      { id: 2, level: 1 },
    ],
    'slots',
    null,
    undefined,
    false,
    false,
    [{ id: 2, level: 1 }],
  );
  assert.ok(results.length > 0);
  assert.ok(results.every((result) => result.skills.some(([id, level]) => id === 1 && level >= 1)));
  assert.ok(results.every((result) => result.skills.some(([id, level]) => id === 2 && level >= 1)));
});

test('少数データの総当たりと上位順位が一致する', () => {
  const data = fixture();
  data.weapons.push(weapon('weapon-b'));
  data.amulets.push(amulet('amulet-b'));
  data.armor.push(armor('head-c', 0, [2, 1], 50));
  const heads = data.armor.filter((item) => item.part === 0);
  const expected = [];
  for (const head of heads)
    for (let mask = 0; mask < 1 << head.slots.length; mask++) {
      const used = head.slots.filter((_, index) => mask & (1 << index));
      if (!used.length) continue;
      const free = head.slots.filter((_, index) => !(mask & (1 << index)));
      expected.push({
        id: ['', head.game_id, '', '', '', '', ''].join('|'),
        defense: head.defense,
        counts: [3, 2, 1].map((level) => free.filter((slot) => slot === level).length),
      });
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
      brute.slice(0, 10).map((row) => row.id),
    );
  }
});

test('武器種で効果がないスキルを含む護石を除外する', () => {
  const data = fixture();
  data.skillNames[2] = '笛吹き名人';
  data.amulets.push({ ...amulet('horn-charm'), skills: [skill(2, 1)] });
  data.maxSkillLevels[2] = 1;
  const results = searchBuilds(data, [{ id: 2, level: 1 }], 'slots', 'LongSword');
  assert.deepEqual(results, []);
});

test('同条件なら指定外の有用スキルを優先する', () => {
  const data = fixture();
  data.skillNames[2] = '攻撃';
  data.skillNames[3] = '植生学';
  data.amulets = [
    { ...amulet('field-charm'), skills: [skill(1, 1), skill(3, 1)] },
    { ...amulet('attack-charm'), skills: [skill(1, 1), skill(2, 1)] },
  ];
  data.armor = [];
  data.decorations = [];
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
  data.maxSkillLevels[2] = 1;
  const results = searchBuilds(data, [{ id: 2, level: 1 }], 'slots', null, undefined, true);
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
  data.maxSkillLevels[3] = 1;
  const results = searchBuilds(data, [{ id: 3, level: 1 }], 'slots');
  assert.ok(results.length > 0);
  assert.ok(results.every((result) => result.build.weapon === 'fire-weapon'));
});

test('武器スキルのみなら防具を空欄にする', () => {
  const data = fixture();
  data.weapons[0].skills = [skill(1, 1)];
  data.armor = [];
  data.decorations = [];
  const results = searchBuilds(data, [{ id: 1, level: 1 }], 'slots', null, undefined, true);
  assert.equal(results[0].build.weapon, 'weapon-a');
  assert.ok(['head', 'chest', 'arms', 'waist', 'legs', 'amulet'].every((slot) => results[0].build[slot] === null));
});

test('武器だけで上限に達したら護石候補を準備しない', () => {
  const data = fixture();
  data.weapons = Array.from({ length: 201 }, (_, index) => ({
    ...weapon(`weapon-${index}`),
    defense: index,
    skills: [skill(1, 1)],
  }));
  data.randomAmulets = {
    groups: { 1: [skill(1, 1)], 2: [skill(2, 1)], 3: [skill(3, 1)] },
    combos: [{ rarity: 1, groups: [1, 2, 3], slots: [] }],
  };
  const updates = [];
  const results = searchBuilds(
    data,
    [{ id: 1, level: 1 }],
    'defense',
    null,
    (progress) => updates.push(progress),
    true,
  );
  assert.equal(updates.at(-1).found, 200);
  assert.ok(updates.at(-1).visited < 1000);
  assert.ok(results.every((result) => result.build.amulet === null));
});

test('頭だけで条件を満たせるなら武器と他の防具を空欄にする', () => {
  const data = fixture();
  data.armor[0].skills = [skill(1, 1)];
  data.decorations = [];
  const results = searchBuilds(data, [{ id: 1, level: 1 }], 'defense');
  assert.equal(results[0].build.head, 'head-a');
  assert.ok(['weapon', 'chest', 'arms', 'waist', 'legs', 'amulet'].every((slot) => results[0].build[slot] === null));
});

test('必要な二部位だけを選ぶ', () => {
  const data = fixture();
  data.armor[0].skills = [skill(1, 1)];
  data.armor[3].skills = [skill(1, 1)];
  data.decorations = [];
  const results = searchBuilds(data, [{ id: 1, level: 2 }], 'slots');
  assert.equal(results[0].build.head, 'head-a');
  assert.equal(results[0].build.arms, 'arms');
  assert.ok(['weapon', 'chest', 'waist', 'legs', 'amulet'].every((slot) => results[0].build[slot] === null));
});
