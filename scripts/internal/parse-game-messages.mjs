import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('.cache/direct');
const guid = (b, p) => `${b.readUInt32LE(p).toString(16).padStart(8, '0')}-${b.readUInt16LE(p + 4).toString(16).padStart(4, '0')}-${b.readUInt16LE(p + 6).toString(16).padStart(4, '0')}-${b.subarray(p + 8, p + 10).toString('hex')}-${b.subarray(p + 10, p + 16).toString('hex')}`;
const texts = {};
const key = Buffer.from('cfcef bf8ec0a336693a91d9350395f09'.replaceAll(' ', ''), 'hex');
for (const name of Object.keys(JSON.parse(fs.readFileSync(path.join(root, 'manifest.json')))).filter(s => s.endsWith('.msg.23'))) {
    const b = fs.readFileSync(path.join(root, 'raw', name));
    if (b.toString('ascii', 4, 8) !== 'GMSG')
        throw Error('MSG magic');
    const count = b.readUInt32LE(16), langs = b.readUInt32LE(24), start = Number(b.readBigUInt64LE(32)), lo = Number(b.readBigUInt64LE(48));
    let prev = 0;
    for (let i = start; i < b.length; i++) {
        const cur = b[i];
        b[i] = cur ^ prev ^ key[(i - start) % 16];
        prev = cur;
    }
    const lang = Array.from({ length: langs }, (_, i) => b.readInt32LE(lo + i * 4)).indexOf(0);
    if (lang < 0)
        throw Error('Japanese language missing');
    function str(off) { if (off < start || off >= b.length)
        throw Error('String offset'); let end = off; while (end + 2 <= b.length && b.readUInt16LE(end) !== 0)
        end += 2; return b.toString('utf16le', off, end); }
    for (let i = 0; i < count; i++) {
        const p = Number(b.readBigUInt64LE(72 + i * 8));
        texts[guid(b, p)] = { name: str(Number(b.readBigUInt64LE(p + 24))), ja: str(Number(b.readBigUInt64LE(p + 40 + lang * 8))) };
    }
}
fs.writeFileSync(path.join(root, 'texts.json'), JSON.stringify(texts, null, 2));
console.log(`Japanese texts: ${Object.keys(texts).length}`);
