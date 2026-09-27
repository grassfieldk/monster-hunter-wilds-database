import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { parseMonsterEpithet } from '../../src/monsterEpithet.mjs';

const require = createRequire(import.meta.url);
const kuromoji = require('kuromoji');
const dataDirectory = path.resolve(process.argv[2] ?? 'public/data');
const read = (name) => JSON.parse(fs.readFileSync(path.join(dataDirectory, `${name}.json`), 'utf8'));
const write = (name, data) => fs.writeFileSync(path.join(dataDirectory, `${name}.json`), JSON.stringify(data));
const hiragana = (value) =>
  value.replace(/[ァ-ヶ]/gu, (character) => String.fromCharCode(character.charCodeAt(0) - 0x60));
const reviewedReadings = new Map([
  ['護闢獣', 'ごびゃくじゅう'],
  ['護雷顎竜', 'ごらいがくりゅう'],
  ['護兇爪竜', 'ごきょうそうりゅう'],
  ['護火竜', 'ごかりゅう'],
  ['闢獣', 'びゃくじゅう'],
  ['沼噴竜', 'しょうふんりゅう'],
  ['炎尾竜', 'えんびりゅう'],
  ['雌火竜', 'めすかりゅう'],
  ['怪鳥', 'かいちょう'],
  ['護竜', 'ごりゅう'],
  ['蒼雷晶', 'そうらいしょう'],
  ['蒼雷晶爪', 'そうらいしょうそう'],
  ['雷晶爪', 'らいしょうそう'],
  ['竜彫貨', 'りゅうちょうか'],
  ['塁鱗', 'るいりん'],
  ['光蟲', 'ひかりむし'],
  ['斬裂', 'ざんれつ'],
  ['竜撃', 'りゅうげき'],
  ['吸雷', 'きゅうらい'],
  ['赫炎', 'かくえん'],
  ['暴触手', 'ぼうしょくしゅ'],
  ['鋏角', 'きょうかく'],
  ['仄明るい', 'ほのあかるい'],
  ['爆炎', 'ばくえん'],
  ['咬魚', 'こうぎょ'],
  ['蝕攻', 'しょっこう'],
  ['巨骨', 'きょこつ'],
  ['接撃', 'せつげき'],
  ['強撃', 'きょうげき'],
  ['白耀', 'はくよう'],
  ['造龍玉', 'ぞうりゅうだま'],
  ['筋繊翼', 'きんせんよく'],
  ['上鎧玉', 'じょうよろいだま'],
  ['上錦ヒレ', 'じょうにしきひれ'],
  ['上毛皮', 'じょうけがわ'],
  ['上綿毛', 'じょうわたげ'],
  ['上繊毛', 'じょうせんもう'],
  ['上飛膜', 'じょうひまく'],
  ['上暗翼', 'じょうあんよく'],
  ['上触手', 'じょうしょくしゅ'],
  ['上鼻骨', 'じょうびこつ'],
  ['上滑液', 'じょうかつえき'],
  ['上尾棘', 'じょうびきょく'],
  ['上尾爪', 'じょうびそう'],
  ['上棘', 'じょうきょく'],
  ['上羽', 'じょうはね'],
  ['上ヒレ', 'じょうひれ'],
  ['上皮', 'じょうひ'],
  ['巨戟龍', 'きょげきりゅう'],
  ['堅胸殻', 'けんきょうかく'],
  ['堅鋏角', 'けんきょうかく'],
  ['堅鎧殻', 'けんがいかく'],
  ['堅頭殻', 'けんとうかく'],
  ['堅纏甲', 'けんてんこう'],
  ['堅甲', 'けんこう'],
  ['堅殻', 'けんかく'],
  ['上鱗', 'じょうりん'],
]);
const applyReviewedReadings = (value) =>
  [...reviewedReadings]
    .sort(([a], [b]) => b.length - a.length)
    .reduce((result, [surface, reading]) => result.replaceAll(surface, reading), value);
const visible = (value = '') => value.replace(/\r?\n/g, '').replace(/<[^>]*>/g, '');
const kanaReading = (tokenizer, value) =>
  hiragana(
    tokenizer
      .tokenize(applyReviewedReadings(value))
      .map((token) => (token.reading && token.reading !== '*' ? token.reading : token.surface_form))
      .join(''),
  );
const monsters = read('monsters');
const items = read('items');
const requireWasm = new Promise((resolve, reject) => {
  kuromoji
    .builder({ dicPath: path.resolve('node_modules/kuromoji/dict') })
    .build((error, tokenizer) => (error ? reject(error) : resolve(tokenizer)));
});
const tokenizer = await requireWasm;
const epithetReadings = new Map();
for (const monster of monsters) {
  const name = monster.names.ja;
  if (name.startsWith('護竜')) {
    monster.reading = `がーでぃあん${kanaReading(tokenizer, name.slice(2))}`;
  } else {
    monster.reading = kanaReading(tokenizer, name);
  }
  const value = [monster.features?.ja, monster.descriptions?.ja]
    .map((source) => parseMonsterEpithet(visible(source)))
    .find(Boolean);
  if (!value) continue;
  const reading = value.reading ?? kanaReading(tokenizer, value.name);
  epithetReadings.set(value.name, reading);
  if (name.startsWith('護竜')) {
    epithetReadings.set(`護${value.name}`, kanaReading(tokenizer, `護${value.name}`));
  }
}

for (const item of items) {
  const name = item.names.ja;
  const materialPrefix = name.includes('の') ? name.slice(0, name.indexOf('の')) : '';
  const knownPrefix = [...epithetReadings.keys()]
    .sort((a, b) => b.length - a.length)
    .find((prefix) => materialPrefix === prefix || materialPrefix.startsWith(prefix));
  if (knownPrefix) {
    const rest = name.slice(knownPrefix.length);
    item.reading = epithetReadings.get(knownPrefix) + kanaReading(tokenizer, rest);
  } else {
    item.reading = kanaReading(tokenizer, name);
  }
}

const unresolvedReadings = [...monsters, ...items].filter((entry) => /\p{Script=Han}/u.test(entry.reading));
if (unresolvedReadings.length > 0) {
  throw new Error(
    `Japanese readings contain unresolved kanji: ${unresolvedReadings
      .map((entry) => `${entry.names.ja} (${entry.reading})`)
      .join(', ')}`,
  );
}

write('monsters', monsters);
write('items', items);
