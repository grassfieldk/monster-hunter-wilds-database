import fs from 'node:fs';
import path from 'node:path';

const cache = path.resolve('.cache/direct');
const output = path.join(cache, 'site');
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const report = read(path.join(cache, 'parse-report.json'));
const parsed = new Set(report.ok);
const texts = read(path.join(cache, 'texts.json'));
const byName = new Map(Object.values(texts).map((row) => [row.name, row.ja]));
const inputs = new Set();
function load(name) {
  const file = `natives/STM/GameDesign/${name}.user.3`;
  if (!parsed.has(file)) throw Error(`解析済みデータが必要です: ${name}`);
  inputs.add(file);
  return read(path.join(cache, 'json', `${file}.json`));
}
function loadSharedParts(number, variant, suffix) {
  const file = `natives/STM/GameDesign/Enemy/Resident/Em${number}_${variant}_0_Resident.user.3`;
  inputs.add(file);
  const bytes = fs.readFileSync(path.join(cache, 'raw', file));
  const resources = [...new Set(bytes.toString('utf16le').match(/GameDesign\/Enemy\/[^\0]+\.user/g) ?? [])];
  const matches = resources.filter((name) => name.endsWith(`_Param_${suffix}.user`));
  if (matches.length !== 1) throw Error(`部位データの参照が一意ではありません: ${file}/${suffix}`);
  return load(matches[0].replace(/^GameDesign\//, '').replace(/\.user$/, ''));
}
const rows = (data, type) => data.instances.filter((row) => row?.$type === type);
const ref = (data, value) => data.instances[value?.$ref];
const scalar = (data, value) => typeof value === 'object' ? ref(data, value)?._Value : value;
function resolve(value, depth = 0) {
  if (!value) return '';
  if (depth > 12) throw Error('テキスト参照が循環しています');
  return value.replace(/<REF ([^>]+)>/g, (_, name) => {
    if (!byName.has(name)) throw Error(`テキスト参照がありません: ${name}`);
    return resolve(byName.get(name), depth + 1);
  }).replace(/<EMIDJP ([^>]+)>/g, (_, name) => resolve(byName.get(`EnemyText_JP_NAME_${name}`), depth + 1))
    .replace(/<EMID ([^>]+)>/g, (_, name) => resolve(byName.get(`EnemyText_NAME_${name}`), depth + 1))
    .replace(/<\/?(?:COLOR|SIZE|FONT)(?: [^>]+)?>/g, '');
}
const localized = (guid) => ({ ja: resolve(texts[guid]?.ja) });
const itemKinds = ['consumable', 'tool', 'material', 'bowgun-ammo', 'bow-coating', 'point', 'mystery'];
const items = rows(load('Common/Item/itemData'), 'app.user_data.ItemData.cData')
  .filter((row) => row._ItemId > 1 && texts[row._RawName]?.ja && texts[row._RawName].ja !== '---')
  .map((row) => ({
    game_id: row._ItemId, names: localized(row._RawName), descriptions: localized(row._RawExplain),
    kind: itemKinds[row._Type], rarity: 19 - row._Rare, max_count: row._MaxCount,
    sell_price: row._SellPrice, buy_price: row._BuyPrice, recipes: [], out_box: row._OutBox,
  }));
const itemById = new Map(items.map((item) => [item.game_id, item]));
const itemUses = {};
function use(itemId, value) {
  if (!itemById.has(itemId)) throw Error(`素材アイテムがありません: ${itemId}`);
  if (!value.name || !(value.amount > 0)) throw Error('用途データが不正です');
  const entries = itemUses[itemId] ??= [];
  if (!entries.some((entry) => JSON.stringify(entry) === JSON.stringify(value))) entries.push(value);
}
for (const row of rows(load('Common/Item/ItemRecipe'), 'app.user_data.cItemRecipe.cData')) {
  if (!row._Num || row._ResultItem <= 1) continue;
  const item = itemById.get(row._ResultItem);
  if (!item) throw Error(`調合結果がありません: ${row._ResultItem}`);
  const materials = row._Item.filter((id) => id > 1);
  if (!materials.length) throw Error(`調合素材がありません: ${item.game_id}`);
  item.recipes.push({ amount: row._Num, inputs: materials });
  for (const id of new Set(materials)) use(id, { category: '調合', name: item.names.ja, amount: materials.filter((value) => value === id).length });
}
const stageEnums = load('Stage/Common/EnumMaker/Stage').instances.filter((row) => row?._EnumName);
const stageTextKeys = {
  ST101: '0000_0000', ST102: '0000_0001', ST103: '0000_0002', ST104: '0000_0003', ST105: '0000_0004',
  ST201: '0000_0005', ST202: '0001_0003', ST203: '0001_0004', ST204: '0001_0005',
  ST401: '9999_0000', ST402: '9999_0001', ST403: '9999_0003', ST404: '9999_0004',
};
const stages = stageEnums.filter((row) => stageTextKeys[row._EnumName]).map((row) => ({
  game_id: row._FixedID, names: { ja: resolve(byName.get(`RefEnvironment_${stageTextKeys[row._EnumName]}`)) },
  bitmask_value: 2 ** (row._EnumValue + 1),
}));
if (stages.some((stage) => !stage.names.ja)) throw Error('フィールド名がありません');
const species = rows(load('Common/Enemy/EnemySpecies'), 'app.user_data.EnemySpeciesData.cData')
  .map((row) => ({ game_id: row._EmSpecies, names: localized(row._EmSpeciesName) }));
const speciesById = new Map(species.map((row) => [row.game_id, row.names.ja]));
const partNames = rows(load('Common/Enemy/EnemyPartsTypeData'), 'app.user_data.EnemyPartsTypeData.cData')
  .map((row) => ({ game_id: row._EmPartsType, part: String(row._EmPartsType), names: localized(row._EmPartsName) }));
const partIds = new Set(partNames.map((row) => row.part));
const enumNames = new Map(load('Enemy/CommonData/EnumMaker/EmID').instances.filter((row) => row?._EnumName).map((row) => [row._FixedID, row._EnumName]));
const enemyData = new Map(rows(load('Common/Enemy/EnemyData'), 'app.user_data.EnemyData.cData').map((row) => [row._enemyId, row]));
const sizes = new Map(rows(load('Enemy/CommonData/Data/EmCommonSize'), 'app.user_data.EmParamSize.cSizeData').map((row) => [row._EmId, row]));
const bossData = load('Common/Enemy/EnemyReportBossData');
const badConditions = load('Enemy/CommonData/Data/EmParamBadCondition2');
const presets = load('Enemy/CommonData/Data/EmParamBadConditionPreset');
const presetByGuid = new Map(presets.instances.filter((row) => row?._InstanceGuid).map((row) => [row._InstanceGuid, row]));
const conditionsById = new Map(rows(badConditions, 'app.user_data.EmParamBadCondition2.EnemyBadConditionSetting').map((row) => [row._EmId, row]));
const elements = ['fire', 'water', 'thunder', 'ice', 'dragon'];
const statusFields = { ParalyzePriset: 'paralysis', PoisonPriset: 'poison', SleepPriset: 'sleep', StunPriset: 'stun', BlastPreset: 'blastblight', StaminaPreset: 'exhaust', FlashPriset: 'flash', EarPriset: 'noise' };
const effectiveness = { '-1279992448': 3, '-1937674624': 2, '1693907968': 1 };
const rewardKinds = { 2: 'carve', 3: 'carve-severed', 6: 'target-reward', 7: 'broken-part', 8: 'wound-destroyed', 911862272: 'carve-rotten', '-2122632576': 'carve-rotten-severed', '-1024798784': '歴戦傷口破壊' };
const monsters = [];
for (const boss of rows(bossData, 'app.user_data.EnemyReportBossData.cData')) {
  const enemy = enemyData.get(boss._EmID);
  const code = enumNames.get(boss._EmID);
  if (!enemy || !code) throw Error(`モンスターの参照がありません: ${boss._EmID}`);
  const [, number, variant] = code.match(/^EM(\d+)_(\d+)_\d+$/) ?? [];
  const data = loadSharedParts(number, variant, 'Parts');
  const settings = rows(data, 'app.user_data.EmParamParts')[0];
  const meats = new Map(rows(data, 'app.user_data.EmParamParts.cMeat').map((row) => [row._InstanceGuid, row]));
  const parts = rows(data, 'app.user_data.EmParamParts.cParts').map((row) => {
    const meat = meats.get(row._MeatGuidNormal);
    const part = String(scalar(data, row._PartsType));
    if (!meat || !partIds.has(part)) throw Error(`肉質または部位名がありません: ${code}/${part}`);
    return { part, base_health: ref(data, row._Vital[0])?._Value ?? null,
      kinsect_essence: String(row._RodExtract),
      multipliers: Object.fromEntries(Object.entries({ slash: '_Slash', blunt: '_Blow', pierce: '_Shot', fire: '_Fire', water: '_Water', thunder: '_Thunder', ice: '_Ice', dragon: '_Dragon' }).map(([key, field]) => [key, meat[field] / 100])),
    };
  });
  const breakData = loadSharedParts(number, variant, 'PartsBreakReward');
  const breakParts = new Map(rows(breakData, 'app.user_data.EmParamPartsBreakReward.cPartsBreakRewardSettingData').map((row) => [row.RewardTableIndex, String(scalar(breakData, row.PartsType))]));
  const rewardsData = load(`Common/Enemy/${code}`);
  const rewards = [];
  let kind, part;
  for (const row of rows(rewardsData, 'app.user_data.EnemyRewardData.cData')) {
    const type = scalar(rewardsData, row._rewardType);
    if (type !== 10) { kind = rewardKinds[type]; part = type === 7 ? breakParts.get(row._partsIndex) : undefined; }
    if (!kind) continue;
    const values = [['low', scalar(rewardsData, row._IdStory), row._RewardNumStory, row._probabilityStory],
      ['high', scalar(rewardsData, row._IdEx[0]), row._RewardNumEx[0], row._probabilityEx[0]]];
    for (const [rank, itemId, amount, chance] of values) {
      if (!amount || !chance || itemId <= 1) continue;
      if (!itemById.has(itemId)) throw Error(`報酬アイテムがありません: ${itemId}`);
      rewards.push({ rank, kind, item_id: itemId, amount, chance, ...(part ? { part } : {}) });
    }
  }
  const weaknessBits = ref(bossData, boss._RecoAttributeBit)._Value[0];
  const attributeOrder = ['fire', 'water', 'ice', 'thunder', 'dragon'];
  const weaknesses = attributeOrder.filter((_, index) => weaknessBits & (1 << (index + 1))).map((element) => ({ kind: 'element', element }));
  const resistances = elements.filter((element) => parts.every((part) => part.multipliers[element] === 0)).map((element) => ({ kind: 'element', element }));
  const condition = conditionsById.get(boss._EmID);
  if (!condition) throw Error(`状態異常の設定がありません: ${code}`);
  for (const [field, name] of Object.entries(statusFields)) {
    const guid = ref(badConditions, condition[field])?.Value;
    const preset = presetByGuid.get(guid);
    const entry = { kind: ['flash', 'noise'].includes(name) ? 'effect' : 'status', [['flash', 'noise'].includes(name) ? 'effect' : 'status']: name };
    if (!preset) {
      if (guid && guid !== '00000000-0000-0000-0000-000000000000') throw Error(`状態異常プリセットがありません: ${code}/${name}`);
      resistances.push(entry);
    } else {
      const level = effectiveness[scalar(presets, preset._EffectiveType)];
      weaknesses.push({ ...entry, ...(level ? { level } : {}) });
    }
  }
  const size = sizes.get(boss._EmID);
  if (!size || !Number.isFinite(settings?._BaseHealth)) throw Error(`サイズ・体力がありません: ${code}`);
  const stageBits = ref(bossData, boss._StageBit)._Value[0];
  monsters.push({ game_id: boss._EmID, names: localized(enemy._EnemyName), species: speciesById.get(enemy._Species),
    descriptions: localized(enemy._EnemyExp), features: localized(enemy._EnemyFeatures), tips: localized(enemy._EnemyTips),
    variants: [], base_health: settings._BaseHealth,
    size: { base: size._BaseSize, mini: size._BaseSize * size._CrownSize_Small / 100, silver: size._BaseSize * size._CrownSize_Big / 100, gold: size._BaseSize * size._CrownSize_King / 100 },
    locations: stages.filter((stage) => stageBits & stage.bitmask_value).map((stage) => stage.game_id),
    weaknesses, resistances, parts, rewards,
  });
}
const questFiles = [...parsed].filter((file) => /\/Mission\/[^/]+\/_Quest\/[^/]+_QuestData\.user\.3$/u.test(file));
const quests = [];
const stageIds = new Set(stages.map((stage) => stage.game_id));
const objectiveVerbs = { 1: '狩猟', 2: '討伐', 3: '捕獲', 5: '撃退', 6: '討伐' };
const questCategory = (file) => {
  const prefix = file.match(/\/Mission\/Mission(\d{3})\d{3}\//u)?.[1];
  if (!prefix) return 'その他';
  if (['001', '002', '003', '004', '005', '006', '007', '008', '009', '010', '011', '700', '720', '730', '740'].includes(prefix)) return '任務';
  if (['101', '102', '103', '104', '105', '106', '107', '109', '199'].includes(prefix)) return 'フリー';
  if (['204', '205'].includes(prefix)) return '闘技大会';
  if (prefix === '400') return 'その他';
  return 'その他';
};
for (const file of questFiles) {
  inputs.add(file);
  const data = read(path.join(cache, 'json', `${file}.json`));
  for (const row of rows(data, 'app.user_data.QuestData')) {
    const missionId = scalar(data, row._MissionId);
    const message = ref(data, row._QuestMsg);
    const title = message ? resolve(texts[message._TitleMsg]?.ja) : '';
    if (!missionId || !title || title === '---') continue;
    const stage = scalar(data, row._Stage);
    const orderCondition = ref(data, row._OrderCondition);
    const detail = message ? resolve(texts[message._DetailMsg]?.ja) : '';
    const clearCondition = ref(data, row._ClearCondition);
    const clearConditionMessage = message ? ref(data, message._ClearConditionMsg) : undefined;
    const manualObjective = clearConditionMessage && !clearConditionMessage._IsAuto
      ? resolve(texts[clearConditionMessage._MsgID]?.ja)
      : '';
    const targetMonsters = (clearCondition?._TargetInfoArray ?? []).flatMap((targetRef) => {
      const target = ref(data, targetRef);
      const monster = enemyData.get(target?._TargetIDValue);
      if (!monster) throw Error(`クエスト対象の参照がありません: ${missionId}/${target?._TargetIDValue}`);
      const nameGuid = target._LegendaryID === 1 ? monster._EnemyLegendaryName
        : target._LegendaryID === 2 ? monster._EnemyLegendaryKingName : monster._EnemyName;
      return [{ game_id: monster._enemyId, names: localized(texts[nameGuid]?.ja ? nameGuid : monster._EnemyName), amount: target._TargetValue }];
    });
    const verb = objectiveVerbs[clearCondition?._TargetType];
    if (!manualObjective && !verb) throw Error(`未対応のクエスト目的: ${missionId}/${clearCondition?._TargetType}`);
    const objective = manualObjective || targetMonsters.map((target) => {
      const count = clearCondition._TargetType !== 5 && target.amount > 0 ? ` ${target.amount} 体` : '';
      return `${target.names.ja}${count}の${verb}`;
    }).join('、');
    quests.push({
      game_id: missionId,
      names: { ja: title },
      descriptions: { ja: detail },
      category: questCategory(file),
      difficulty: row._QuestLv,
      locations: stage && stageIds.has(stage) ? [stage] : [],
      time_limit: row._TimeLimit,
      reward_money: row._RemMoney,
      hunter_rank_points: row._HRPoint,
      quest_type: row._QuestType,
      order_rank: orderCondition?._OrderHR ?? 0,
      target_monsters: targetMonsters,
      objective: { ja: objective },
      clear_condition_type: clearCondition?._TargetType ?? 0,
    });
  }
}
if (new Set(quests.map((quest) => quest.game_id)).size !== quests.length) throw Error('クエスト ID が重複しています');
const armorData = load('Common/Equip/ArmorData');
const armorByKey = new Map(rows(armorData, 'app.user_data.ArmorData.cData').map((row) => [`${scalar(armorData, row._Series)}:${scalar(armorData, row._PartsType)}`, row]));
for (const row of rows(load('Common/Equip/ArmorRecipeData'), 'app.user_data.ArmorRecipeData.cData')) {
  const item = armorByKey.get(`${row._SeriesId}:${row._PartsType}`);
  for (let i = 0; i < row._Item.length; i++) if (row._Item[i] > 1 && row._ItemNum[i] > 0) {
    if (!item) throw Error(`防具の参照がありません: ${row._SeriesId}/${row._PartsType}`);
    use(row._Item[i], { category: '防具生産', name: localized(item._Name).ja, amount: row._ItemNum[i] });
  }
}
const amuletData = load('Common/Equip/AmuletData');
const amulets = new Map(rows(amuletData, 'app.user_data.AmuletData.cData').map((row) => [`${scalar(amuletData, row._AmuletType)}:${row._Lv}`, row]));
for (const row of rows(load('Common/Equip/AmuletRecipeData'), 'app.user_data.AmuletRecipeData.cData')) {
  const item = amulets.get(`${row._AmuletType}:${row._Lv}`);
  for (let i = 0; i < row._ItemId.length; i++) if (row._ItemId[i] > 1 && row._ItemNum[i] > 0) {
    if (!item) throw Error(`護石の参照がありません: ${row._DataId}`);
    use(row._ItemId[i], { category: '護石生産', name: localized(item._Name).ja, amount: row._ItemNum[i] });
  }
}
const weapons = { LongSword: '大剣', ShortSword: '片手剣', TwinSword: '双剣', Tachi: '太刀', Hammer: 'ハンマー', Whistle: '狩猟笛', Lance: 'ランス', GunLance: 'ガンランス', SlashAxe: 'スラッシュアックス', ChargeAxe: 'チャージアックス', Rod: '操虫棍', Bow: '弓', HeavyBowgun: 'ヘビィボウガン', LightBowgun: 'ライトボウガン' };
for (const [code, category] of Object.entries(weapons)) {
  const names = new Map(rows(load(`Common/Weapon/${code}`), 'app.user_data.WeaponData.cData').map((row) => [row[`_${code}`], localized(row._Name).ja]));
  for (const row of rows(load(`Common/Weapon/${code}Recipe`), 'app.user_data.WeaponRecipeData.cData')) {
    for (let i = 0; i < row._Item.length; i++) if (row._Item[i] > 1 && row._ItemNum[i] > 0) {
      use(row._Item[i], { category: `${category}生産`, name: names.get(row[`_${code}`]), amount: row._ItemNum[i] });
    }
  }
}
for (const item of items) if (!item.kind || !item.names.ja || item.rarity < 1 || item.rarity > 18) throw Error(`アイテムデータが不正です: ${item.game_id}`);
for (const monster of monsters) if (!monster.names.ja || !monster.species || !monster.parts.length) throw Error(`モンスターデータが不正です: ${monster.game_id}`);
fs.mkdirSync(output, { recursive: true });
for (const [file, data] of Object.entries({ items, monsters, quests, lookups: { stages, species, partNames }, 'item-uses': itemUses })) fs.writeFileSync(path.join(output, `${file}.json`), JSON.stringify(data));
const gameFiles = [...inputs].sort();
fs.writeFileSync(path.join(cache, 'direct-inputs.json'), JSON.stringify(gameFiles, null, 2));
fs.writeFileSync(path.join(output, 'source.json'), JSON.stringify({ generatedAt: new Date().toISOString(), dataOrigin: 'Monster Hunter Wilds ゲームデータ', gameFiles }));
console.log(`直接抽出: ${items.length} アイテム、${monsters.length} モンスター、${quests.length} クエスト、${items.reduce((sum, item) => sum + item.recipes.length, 0)} 調合、${Object.values(itemUses).flat().length} 用途`);
