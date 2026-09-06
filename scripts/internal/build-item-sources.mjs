import fs from 'node:fs';
import path from 'node:path';

const input = path.resolve(process.argv[2] ?? '.cache/direct');
const dataDirectory = path.resolve(process.argv[3] ?? 'public/data');
const output = path.join(dataDirectory, 'item-sources.json');
const report = JSON.parse(fs.readFileSync(path.join(input, 'parse-report.json'), 'utf8'));
const sourceInputs = new Set();
const read = (file) => {
  const relative = path.relative(path.join(input, 'json'), path.resolve(file)).split(path.sep).join('/');
  if (relative.startsWith('natives/')) {
    const name = relative.replace(/\.json$/, '');
    if (!report.ok.includes(name)) throw new Error(`Data was not parsed: ${name}`);
    sourceInputs.add(name);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
};
const items = new Map(read(path.join(dataDirectory, 'items.json')).map((item) => [item.game_id, item]));
const stages = new Map(read(path.join(dataDirectory, 'lookups.json')).stages.map((stage) => [stage.game_id, stage.names.ja]));
const texts = read(path.join(input, 'texts.json'));
const textsByName = new Map(Object.values(texts).map((entry) => [entry.name, entry.ja]));
const prefix = 'natives/STM/GameDesign/';
const file = (name) => path.join(input, 'json', `${prefix}${name}.json`);
const load = (name) => {
  if (!report.ok.includes(`${prefix}${name}`)) throw new Error(`Data was not parsed: ${name}`);
  return read(file(name));
};
const rows = (name) => load(name).instances.filter(Boolean);
const stageEnums = rows('Stage/Common/EnumMaker/Stage.user.3').filter((row) => row._EnumName);
const sources = {};
const evidence = [];
function add(itemId, source, origin) {
  if (!items.has(itemId)) return;
  const list = sources[itemId] ??= [];
  if (!list.some((existing) => JSON.stringify(existing) === JSON.stringify(source))) list.push(source);
  evidence.push({ itemId, source, origin });
}
function resolveText(value, depth = 0) {
  if (!value || depth > 8) return value;
  return value.replace(/<REF Item_IT_(\d+)>/g, (_, id) => items.get(Number(id))?.names.ja ?? '')
    .replace(/<REF ([^>]+)>/g, (tag, key) => resolveText(textsByName.get(key), depth + 1) ?? tag)
    .replace(/<EMID ([^>]+)>/g, (tag, key) => textsByName.get(`EnemyText_NAME_${key}`) ?? tag)
    .replace(/<\/?COLOR(?: [^>]+)?>/g, '').trim();
}
const gimmickNames = new Map(rows('Common/Gimmick/GimmickTextData.user.3').map((row) => [row._GimmickId, resolveText(texts[row._Name]?.ja)]));
const placements = new Map();
for (const stage of stageEnums.filter((row) => /^ST10[1-5]$/.test(row._EnumName))) {
  const code = stage._EnumName.toLowerCase();
  const scene = load(`Stage/${code}/Layout/Loaded/Gimmick/${code}_Loaded_Gimmick.scn.21`);
  for (const graph of scene.instances.filter((row) => row?.$type === 'via.pointgraph.PointGraph')) {
    const resource = graph.v0_Resource ?? graph.v0;
    if (typeof resource !== 'string') throw new Error('PointGraph resource is missing');
    sourceInputs.add(`natives/STM/${resource}.0`);
    const list = fs.readFileSync(path.join(input, 'raw', 'natives/STM', `${resource}.0`));
    if (list.toString('ascii', 0, 4) !== 'PGL\0') throw new Error('Invalid point list');
    for (let i = 0; i < list.readUInt32LE(8); i++) {
      const offset = Number(list.readBigUInt64LE(24 + i * 8));
      let end = offset;
      while (list.readUInt16LE(end)) end += 2;
      const name = `natives/STM/${list.toString('utf16le', offset, end)}.12`;
      const data = read(path.join(input, 'json', `${name}.json`));
      const defaults = data.defaults?.instances[data.defaults.objects[0]];
      if (defaults?.IsDevelop) continue;
      for (const index of data.objects) {
        const row = data.instances[index];
        if (row?.$type !== 'app.point_graph_data.ContextLayoutGimmick') continue;
        const id = data.instances[row._GmID.$ref]?._Value;
        if (!id) continue;
        const entries = placements.get(id) ?? [];
        const environment = data.instances[row._WeatherAdaptedType.$ref];
        const mission = data.instances[row._MissionParam.$ref];
        if (environment?._EnvironmentFlags === 0 && !environment._ExEventSerializable) continue;
        if (!mission?._IsDefaultEnable) continue;
        if (!entries.some((entry) => entry.stageId === stage._FixedID)) entries.push({ stageId: stage._FixedID, origin: name });
        placements.set(id, entries);
      }
    }
  }
}
for (const rewardFile of ['Gimmick/Common/GimmickRewardData.user.3', 'Gimmick/Common/GimmickRewardAddData.user.3']) {
for (const row of rows(rewardFile).filter((entry) => entry._itemId)) {
  for (const placement of placements.get(row._gimmickId) ?? []) {
    if (stages.has(row._stageId) && row._stageId !== placement.stageId) continue;
    const name = gimmickNames.get(row._gimmickId);
    if (!name || name.includes('<')) continue;
    for (let rank = 0; rank < 2; rank++) {
      if (row._normalProbability[rank] <= 0 || row._normalRewardNum[rank] <= 0) continue;
      add(row._itemId[rank], {
        location: stages.get(placement.stageId),
        method: `採取: ${name}${rewardFile.includes('AddData') ? '（追加報酬）' : ''}`,
        rank: ['下位', '上位'][rank],
        amount: row._normalRewardNum[rank],
        chance: row._normalProbability[rank],
      }, [rewardFile, placement.origin]);
    }
  }
}
}
for (const row of rows('Facility/ItemShopData.user.3').filter((entry) => entry._ItemId > 0)) {
  add(row._ItemId, { location: '物資補給所', method: '購入', condition: row._StoryPackage >= 0 ? 'ストーリー進行で解放' : undefined }, ['Facility/ItemShopData.user.3']);
}
const collection = load('Facility/CollectionItemData.user.3');
const tables = load('Facility/CollectionTable.user.3');
const deref = (data, ref) => data.instances[ref?.$ref];
const numTypes = tables.instances.filter((row) => row?.$type === 'app.user_data.CollectionTable.cNumTypeData');
for (const row of collection.instances.filter((entry) => entry?.$type === 'app.user_data.CollectionItemData.cData')) {
  const itemId = deref(collection, row._ItemId)._Value;
  const table = numTypes.find((entry) => deref(tables, entry._NumType)._Value === deref(collection, row._NumType)._Value);
  if (!table) throw new Error('Missing collection quantity table');
  for (const stage of stageEnums.filter((entry) => /^ST10[1-5]$/.test(entry._EnumName))) {
    const conditions = [];
    for (const [key, label] of [['_RuinLevel', '荒廃期'], ['_AbnormalLevel', '異常気象'], ['_FertilityLevel', '豊穣期']]) {
      const level = deref(collection, row[key][stage._EnumValue])._Value;
      const quantity = table._Table.map((ref) => deref(tables, ref)).find((entry) => deref(tables, entry._Level)._Value === level);
      if (!quantity) throw new Error('Missing collection level');
      if (quantity._Data.some((ref) => { const entry = deref(tables, ref); return entry._Num > 0 && entry._Probability > 0; })) conditions.push(label);
    }
    if (conditions.length) add(itemId, { location: stages.get(stage._FixedID), method: '素材採集依頼', condition: conditions.length === 3 ? 'ストーリー進行で解放' : conditions.join('・') }, ['Facility/CollectionItemData.user.3', 'Facility/CollectionTable.user.3']);
  }
}
const missionNames = new Map();
for (const name of report.ok.filter((entry) => entry.endsWith('_MsData.user.3'))) {
  const data = read(path.join(input, 'json', `${name}.json`));
  const mission = data.instances[data.objects[0]];
  if (mission?.$type !== 'app.user_data.MissionData') continue;
  const title = resolveText(texts[deref(data, mission._SetLGuideMsgData)?.SetMsgID]?.ja);
  if (title && !title.includes('<')) missionNames.set(deref(data, mission._MissionIDSerial)._Value, { title, origin: name });
}
const quests = new Map();
for (const name of report.ok.filter((entry) => entry.endsWith('_QuestData.user.3'))) {
  const data = read(path.join(input, 'json', `${name}.json`));
  for (const quest of data.objects.map((index) => data.instances[index])) {
    if (quest?.$type !== 'app.user_data.QuestData') continue;
    const title = resolveText(texts[deref(data, quest._QuestMsg)?._TitleMsg]?.ja);
    if (!title || title.includes('<') || title.includes('#Rejected#')) continue;
    quests.set(deref(data, quest._MissionId)._Value, { title, origin: name });
  }
}
const settings = load('Mission/_UserData/_Reward/QuestRewardSetting.user.3');
const commonRewards = load('Mission/_UserData/_Reward/CommonRewardData.user.3');
const addRewards = load('Mission/_UserData/_Reward/AddRewardData.user.3');
for (const row of settings.instances.filter((entry) => entry?._missionID)) {
  const quest = quests.get(deref(settings, row._missionID)._Value);
  if (!quest) continue;
  for (const [tableId, data, method] of [
    [row._commonRewardTableId, commonRewards, 'クエスト報酬'],
    [row._targetAddRewardTableId, addRewards, '追加報酬'],
    [row._questAddRewardTableId, addRewards, '追加報酬'],
  ]) {
    if (!tableId) continue;
    for (const reward of data.instances.filter((entry) => entry?._tableId === tableId && entry._num > 0 && entry._probability > 0)) {
      add(deref(data, reward._itemId)._Value, { location: quest.title, method, amount: reward._num, chance: reward._probability, condition: '報酬 1 枠あたり' }, [quest.origin, 'Mission/_UserData/_Reward/QuestRewardSetting.user.3', method === 'クエスト報酬' ? 'Mission/_UserData/_Reward/CommonRewardData.user.3' : 'Mission/_UserData/_Reward/AddRewardData.user.3']);
    }
  }
}
const missionRewards = load('Mission/_UserData/_Reward/MissionRewardData.user.3');
for (const row of missionRewards.instances.filter((entry) => entry?._MissonId)) {
  const mission = missionNames.get(deref(missionRewards, row._MissonId)._Value);
  if (!mission) continue;
  row._ItemId.forEach((ref, index) => {
    if (row._ItemNum[index] > 0) add(deref(missionRewards, ref)._Value, { location: mission.title, method: 'ミッション報酬', amount: row._ItemNum[index] }, [mission.origin, 'Mission/_UserData/_Reward/MissionRewardData.user.3']);
  });
}
for (const row of rows('Mission/_UserData/SupplyItemData.user.3').filter((entry) => entry._ItemId > 0 && entry._ItemCount > 0)) {
  add(row._ItemId, { location: stages.get(row._Stage) ?? 'クエスト', method: '支給品', condition: 'クエスト・支給条件による' }, ['Mission/_UserData/SupplyItemData.user.3']);
}
for (const name of report.ok.filter((entry) => /Common\/Enemy\/EM[15]\d{3}_\d{2}_\d\.user\.3$/.test(entry))) {
  const code = path.basename(name).split('.')[0];
  const title = resolveText(textsByName.get(`EnemyText_NAME_${code}`));
  if (!title || title.includes('<')) continue;
  const data = read(path.join(input, 'json', `${name}.json`));
  for (const row of data.instances.filter((entry) => entry?.$type === 'app.user_data.EnemyRewardData.cData')) {
    if (row._probabilityStory > 0 && row._RewardNumStory > 0) add(deref(data, row._IdStory)._Value, { location: title, method: 'モンスター報酬', rank: '下位', amount: row._RewardNumStory, chance: row._probabilityStory }, [name]);
    row._IdEx.forEach((ref, index) => {
      if (row._probabilityEx[index] > 0 && row._RewardNumEx[index] > 0) add(deref(data, ref)._Value, { location: title, method: 'モンスター報酬', rank: '上位', amount: row._RewardNumEx[index], chance: row._probabilityEx[index] }, [name]);
    });
  }
}
const bonus = load('Facility/CollectionBonusItemData.user.3');
for (const row of bonus.instances.filter((entry) => entry?._ItemId)) {
  row._ItemId.forEach((ref, index) => {
    if (row._ItemNum[index] > 0 && row._Probability[index] > 0) add(deref(bonus, ref)._Value, { location: '素材採集依頼', method: '追加報酬', condition: '依頼先・設備の発展状況による', amount: row._ItemNum[index] }, ['Facility/CollectionBonusItemData.user.3']);
  });
}
for (const row of rows('Facility/ItemExchange.user.3').filter((entry) => entry._RewardItemId > 0 && entry._RewardNum > 0)) {
  const payment = items.get(row._PayItemId)?.names.ja;
  if (payment) add(row._RewardItemId, { location: 'アイテム交換', method: `${payment} ${row._PayNum} 個と交換`, amount: row._RewardNum }, ['Facility/ItemExchange.user.3']);
}
for (const row of rows('Facility/BarterData.user.3').filter((entry) => entry._Request > 0 && entry._MaxCount > 0)) {
  const payment = items.get(row._Request)?.names.ja;
  const npc = resolveText(textsByName.get(`NpcName_NN_${row._NpcId < 0 ? `m${-row._NpcId}` : row._NpcId}`));
  const stage = stages.get(row._Stage);
  if (!payment || (!npc && !stage)) continue;
  row._Reward.forEach((itemId, index) => {
    if (row._RewardNum[index] > 0) add(itemId, { location: [stage, npc].filter(Boolean).join(' / '), method: `もちもの交換: ${payment} ${row._RequestNum} 個`, amount: row._RewardNum[index], condition: 'ストーリー進行・環境により品揃えが変化' }, ['Facility/BarterData.user.3']);
  });
}
const workshop = load('Facility/LargeWorkshopResultData.user.3');
for (const row of workshop.instances.filter((entry) => entry?.$type === 'app.user_data.LargeWorkshopResultData.cResultItemData')) {
  add(deref(workshop, row._ItemId)._Value, { location: '油涌き谷 / 大窯', method: '精錬', condition: '精錬の結果による' }, ['Facility/LargeWorkshopResultData.user.3']);
}
for (const row of rows('Common/Item/FixItems.user.3').filter((entry) => entry._ItemId > 0)) {
  add(row._ItemId, { location: '基本装備', method: '常備アイテム', condition: row._StoryPackage >= 0 ? 'ストーリー進行で解放' : undefined }, ['Common/Item/FixItems.user.3']);
}
for (const row of rows('Facility/GrillData.user.3').filter((entry) => entry._RewardItemId)) {
  const material = items.get(row._ItemId)?.names.ja;
  if (!material) continue;
  row._RewardItemId.forEach((id, index) => {
    if (row._RewardItemNum[index] > 0 && row._RewardItemRate[index] > 0) add(id, { location: '焚き火焼き', method: `${material}を焼く`, amount: row._RewardItemNum[index], chance: row._RewardItemRate[index], condition: '追加報酬 1 枠あたり' }, ['Facility/GrillData.user.3']);
  });
}
for (const row of rows('Facility/MakaData.user.3').filter((entry) => entry._ItemId > 0)) {
  add(row._ItemId, { location: 'マカ錬金', method: '錬金', condition: `${row._NeedPoint} ポイント / ストーリー進行で解放` }, ['Facility/MakaData.user.3']);
}
for (const row of rows('Facility/SupportShipData.user.3').filter((entry) => entry._ItemId > 0 && entry._StockNum > 0 && entry._Rate > 0)) {
  add(row._ItemId, { location: '補給船', method: '購入', condition: `${row._Point} ポイント / 品揃えによる` }, ['Facility/SupportShipData.user.3']);
}
for (const [name, method] of [['MoriverSwopReward', '交換'], ['MoriverSharingData', 'おすそわけ']]) {
  for (const row of rows(`Facility/${name}.user.3`).filter((entry) => entry._ItemId > 0 && entry._ItemNum > 0 && entry._Rate > 0)) {
    add(row._ItemId, { location: '緋の森 / モリバー', method, amount: row._ItemNum }, [`Facility/${name}.user.3`]);
  }
}
const bounties = load('Facility/BountyData.user.3');
for (const row of bounties.instances.filter((entry) => entry?._BountyName)) {
  const title = resolveText(texts[row._BountyName]?.ja);
  if (!title || title.includes('<')) continue;
  row._Reward.forEach((ref, index) => {
    if (row._RewardNum[index] > 0) add(deref(bounties, ref)._Value, { location: title, method: '依頼報酬', amount: row._RewardNum[index] }, ['Facility/BountyData.user.3']);
  });
}
for (const source of Object.values(sources).flat()) {
  if (!source.location || !source.method || source.location.includes('<') || source.method.includes('<')) throw new Error('Invalid source label');
  if (source.amount !== undefined && (!Number.isFinite(source.amount) || source.amount <= 0)) throw new Error('Invalid source quantity');
  if (source.chance !== undefined && (!Number.isFinite(source.chance) || source.chance <= 0 || source.chance > 100)) throw new Error('Invalid source probability');
}
fs.writeFileSync(output, JSON.stringify(sources));
fs.writeFileSync(path.join(input, 'source-inputs.json'), JSON.stringify([...sourceInputs].sort()));
fs.writeFileSync(path.join(input, 'source-evidence.json'), JSON.stringify(evidence, null, 2));
const monsterRewards = new Set(read(path.join(dataDirectory, 'monsters.json')).flatMap((monster) => monster.rewards.map((reward) => reward.item_id)));
const missing = [...items.values()].filter((item) => !item.recipes.length && !monsterRewards.has(item.game_id) && !sources[item.game_id]).map((item) => ({ id: item.game_id, name: item.names.ja }));
fs.writeFileSync(path.join(input, 'missing-sources.json'), JSON.stringify(missing, null, 2));
console.log(`入手先を生成: ${Object.keys(sources).length} アイテム、${Object.values(sources).flat().length} 件（入手先未特定: ${missing.length} アイテム）`);
