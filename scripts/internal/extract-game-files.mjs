import fs from 'node:fs';
import path from 'node:path';
import { inflateRawSync, zstdDecompressSync } from 'node:zlib';
const root = path.resolve('.cache/direct');
fs.mkdirSync(root, { recursive: true });
const modulus = Buffer.from('7d0bf8c17c23fd3bd47516d23321d81071f97cd13493ba7726fcab2ceedad91c89e7297bdd8aae5039b6016d21895da5a13ea2c08c93133665ebe8df06176796062bac23ed8cb78b90adea71c440449d1c7bbac4b62dd6d24b62d626fc742007ece3599ae6afb9a8358be0e8d3cd4565b091c4951bf3231ec671cf3e352d6be300', 'hex');
const intLE = b => BigInt('0x' + Buffer.from(b).reverse().toString('hex'));
function modpow(b, e, m) { let r = 1n; for (; e; e >>= 1n, b = b * b % m)
    if (e & 1n)
        r = r * b % m; return r; }
function decryptResource(b) { const m = intLE(Buffer.from('13d79c8988914810d7aa78aef859df7d3c43a0d0bb3677b5f05c02af65d8770300', 'hex')), e = intLE(Buffer.from('c0c2771f5b346a01c7d4d7852e422b3b163a171316ea833030df3ff42593200100', 'hex')); const out = Buffer.alloc(Math.floor((b.length - 8) / 128) * 8); for (let p = 8, j = 0; p + 128 <= b.length; p += 128, j += 8) {
    const q = intLE(b.subarray(p + 64, p + 128)) / modpow(intLE(b.subarray(p, p + 64)), e, m);
    out.writeBigUInt64LE(q & 0xffffffffffffffffn, j);
} const n = Number(b.readBigUInt64LE(0)); if (n > out.length)
    throw Error('Resource size'); return out.subarray(0, n); }
const rot = (v, n) => (v << n) | (v >>> (32 - n));
function hash(s) {
    const b = Buffer.from(s, 'utf16le');
    let h = -1, i = 0, k;
    for (; i + 4 <= b.length; i += 4) {
        k = b.readUInt32LE(i);
        k = Math.imul(rot(Math.imul(k, 0xcc9e2d51), 15), 0x1b873593);
        h = Math.imul(rot(h ^ k, 13), 5) + 0xe6546b64 | 0;
    }
    k = 0;
    for (let j = i; j < b.length; j++)
        k |= b[j] << ((j - i) * 8);
    if (i < b.length)
        h ^= Math.imul(rot(Math.imul(k, 0xcc9e2d51), 15), 0x1b873593);
    h ^= b.length;
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return (h ^ (h >>> 16)) >>> 0;
}
const listFile = path.join(root, 'files.list');
if (!fs.existsSync(listFile)) {
    const r = await fetch('https://raw.githubusercontent.com/LartTyler/mhdb-wilds-data/c50a1eb892f4a1ad9bb35c147801658804be2cc2/tools/ree-pak-gui/ree-pak-tools/filelist/remote/MHWs_STM_Release.list');
    if (!r.ok)
        throw Error(r.status);
    fs.writeFileSync(listFile, await r.text());
}
const filter = new RegExp(process.argv[3] || 'GameDesign/.*(Reward|SupplyItem|Gather|Collect|GimmickBasic|GimmickText|GmID|ItemData).*\\.user\\.3$', 'i');
const names = new Map(fs.readFileSync(listFile, 'utf8').split(/\r?\n/).filter(s => filter.test(s)).map(s => [`${hash(s.toUpperCase())}:${hash(s.toLowerCase())}`, s]));
const game = process.argv[2];
const manifestPath = path.join(root, 'manifest.json');
const records = new Map(!process.argv.includes('--fresh') && fs.existsSync(manifestPath) ? Object.entries(JSON.parse(fs.readFileSync(manifestPath, 'utf8'))) : []);
const archives = fs.readdirSync(game).filter(s => s.endsWith('.pak')).sort((a, b) => { const p = s => Number(s.match(/patch_(\d+)/)?.[1] || 0); return p(a) - p(b) || a.localeCompare(b); });
function read(fd, len, pos) { const b = Buffer.alloc(len); if (fs.readSync(fd, b, 0, len, pos) !== len)
    throw Error('Short read'); return b; }
for (const archive of archives) {
    const fd = fs.openSync(path.join(game, archive), 'r');
    try {
        const h = read(fd, 16, 0);
        if (h.toString('ascii', 0, 4) !== 'KPKA' || h[4] !== 4)
            throw Error('Header');
        const flags = h.readUInt16LE(6), count = h.readUInt32LE(8);
        if (flags & ~40)
            throw Error(`Unsupported flags ${flags}`);
        const toc = read(fd, count * 48, 16);
        if (flags & 8) {
            const keyInt = modpow(intLE(read(fd, 128, 16 + toc.length)), 65537n, intLE(modulus));
            const hex = keyInt.toString(16).padStart(256, '0');
            const key = Buffer.from(hex, 'hex').reverse();
            for (let i = 0; i < toc.length; i++)
                toc[i] ^= (i + key[i % 32] * key[i % 29]) & 255;
        }
        const chunks = [];
        let block = 0;
        if (flags & 32) {
            const pos = 16 + toc.length + (flags & 8 ? 128 : 0), ch = read(fd, 8, pos);
            block = ch.readUInt32LE(0);
            const cb = read(fd, ch.readUInt32LE(4) * 8, pos + 8);
            let high = 0, prev = 0;
            for (let j = 0; j < cb.length; j += 8) {
                const low = cb.readUInt32LE(j);
                if (low < prev)
                    high += 2 ** 32;
                chunks.push({ start: high + low, size: cb.readUInt32LE(j + 4) >>> 10 });
                prev = low;
            }
        }
        let matched = 0;
        for (let i = 0; i < count; i++) {
            const p = i * 48;
            const name = names.get(`${toc.readUInt32LE(p + 4)}:${toc.readUInt32LE(p)}`);
            if (!name)
                continue;
            const offset = Number(toc.readBigUInt64LE(p + 8)), size = Number(toc.readBigUInt64LE(p + 16)), expanded = Number(toc.readBigUInt64LE(p + 24)), attr = toc.readUInt32LE(p + 32);
            let data;
            if (attr & 0x1000000) {
                const parts = [];
                for (let j = 0; j < Math.ceil(expanded / block); j++) {
                    const c = chunks[offset + j];
                    let b = read(fd, c.size, c.start);
                    if (c.size !== block)
                        b = zstdDecompressSync(b);
                    if (b.length !== block)
                        throw Error('Chunk length');
                    parts.push(b);
                }
                data = Buffer.concat(parts).subarray(0, expanded);
            }
            else {
                data = read(fd, size, offset);
                if (attr & 0xff0000)
                    data = decryptResource(data);
                if ((attr & 15) === 1)
                    data = inflateRawSync(data);
                else if ((attr & 15) === 2)
                    data = zstdDecompressSync(data);
                else if ((attr & 15) !== 0)
                    throw Error('Compression');
            }
            if (data.length !== expanded)
                throw Error('Expanded size mismatch');
            const out = path.resolve(root, 'raw', name);
            if (!out.startsWith(path.resolve(root, 'raw') + path.sep))
                throw Error('Unsafe name');
            fs.mkdirSync(path.dirname(out), { recursive: true });
            fs.writeFileSync(out, data);
            records.set(name, { archive, size: expanded });
            matched++;
        }
        console.log(`${archive}: ${matched}`);
    }
    finally {
        fs.closeSync(fd);
    }
}
fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify(Object.fromEntries(records), null, 2));
console.log(`Extracted ${records.size} distinct files`);
