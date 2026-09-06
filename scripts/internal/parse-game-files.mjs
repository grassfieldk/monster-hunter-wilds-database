import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
const root = path.resolve('.cache/direct');
const bundled = path.resolve('scripts/data');
function readDefinition(name) {
    const archive = path.join(bundled, `${name}.gz`);
    return JSON.parse(gunzipSync(fs.readFileSync(archive)).toString('utf8'));
}
const layouts = readDefinition('layouts.json');
const variants = readDefinition('layout-variants.json');
const current = readDefinition('layouts-current.json');
export function parse(b, base = b.indexOf(Buffer.from('RSZ\0')), end = b.length, overrides = {}) {
    if (base < 0)
        throw Error('Missing RSZ');
    const count = b.readUInt32LE(base + 12), objects = b.readUInt32LE(base + 8), external = b.readUInt32LE(base + 16);
    const info = base + Number(b.readBigUInt64LE(base + 24));
    let pos = base + Number(b.readBigUInt64LE(base + 32));
    const instances = [null], types = [];
    const align = n => { pos = Math.ceil(pos / n) * n; };
    const refs = [];
    function value(f) {
        align(f.align);
        const start = pos;
        let v;
        if (['String', 'Resource'].includes(f.type)) {
            const n = b.readUInt32LE(pos);
            pos += 4;
            if (n > 1e6 || pos + n * 2 > b.length)
                throw Error('String length');
            v = b.toString('utf16le', pos, pos + n * 2).replace(/\0$/, '');
            pos += n * 2;
            return v;
        }
        if (pos + f.size > b.length)
            throw Error('Field exceeds file');
        switch (f.type) {
            case 'Object':
            case 'UserData':
                v = { $ref: b.readInt32LE(pos) };
                refs.push(v);
                break;
            case 'S32':
                v = b.readInt32LE(pos);
                break;
            case 'U32':
                v = b.readUInt32LE(pos);
                break;
            case 'F32':
                v = b.readFloatLE(pos);
                break;
            case 'Bool':
                v = !!b[pos];
                break;
            case 'U8':
                v = b[pos];
                break;
            case 'S8':
                v = b.readInt8(pos);
                break;
            case 'U16':
                v = b.readUInt16LE(pos);
                break;
            case 'S16':
                v = b.readInt16LE(pos);
                break;
            case 'U64':
                v = b.readBigUInt64LE(pos).toString();
                break;
            case 'S64':
                v = b.readBigInt64LE(pos).toString();
                break;
            case 'F64':
                v = b.readDoubleLE(pos);
                break;
            case 'Guid':
                v = `${b.readUInt32LE(pos).toString(16).padStart(8, '0')}-${b.readUInt16LE(pos + 4).toString(16).padStart(4, '0')}-${b.readUInt16LE(pos + 6).toString(16).padStart(4, '0')}-${b.subarray(pos + 8, pos + 10).toString('hex')}-${b.subarray(pos + 10, pos + 16).toString('hex')}`;
                break;
            default: v = { type: f.type, hex: b.subarray(pos, pos + f.size).toString('hex') };
        }
        pos = start + f.size;
        return v;
    }
    const ext = new Map();
    const extPos = base + Number(b.readBigUInt64LE(base + 40));
    for (let i = 0; i < external; i++) {
        const at = extPos + i * 16, index = b.readUInt32LE(at), off = base + Number(b.readBigUInt64LE(at + 8));
        let end = off;
        while (b.readUInt16LE(end) !== 0)
            end += 2;
        ext.set(index, b.toString('utf16le', off, end));
    }
    for (let i = 1; i < count; i++) {
        if (ext.has(i)) {
            instances.push({ $resource: ext.get(i) });
            continue;
        }
        const id = b.readUInt32LE(info + i * 8).toString(16), crc = b.readUInt32LE(info + i * 8 + 4).toString(16), schema = overrides[id + ':' + crc] ?? variants[id + ':' + crc] ?? (current[id]?.crc === crc ? current[id] : layouts[id]);
        if (!schema)
            throw Error(`Unknown type ${id}`);
        if (schema.crc !== crc && !(schema.name === 'app.user_data.QuestData' && crc === '7d4aa93c' && JSON.stringify(schema.fields) === JSON.stringify(current[id]?.fields)))
            throw Error(`CRC mismatch ${schema.name}: ${crc}/${schema.crc}`);
        const row = { $type: schema.name };
        types.push(schema.name);
        for (const f of schema.fields)
            try {
                if (f.array) {
                    align(4);
                    const n = b.readUInt32LE(pos);
                    pos += 4;
                    if (n > 1e6)
                        throw Error(`Array count ${n}`);
                    row[f.name] = Array.from({ length: n }, () => value(f));
                }
                else
                    row[f.name] = value(f);
            }
            catch (e) {
                throw Error(`${schema.name}.${f.name} at ${pos}: ${e.message}`);
            }
        instances.push(row);
    }
    if (pos !== end)
        throw Error(`Trailing bytes ${end - pos}`);
    for (const ref of refs)
        if (ref.$ref < 0 || ref.$ref >= instances.length)
            throw Error(`Reference bounds ${ref.$ref}`);
    return { objects: Array.from({ length: objects }, (_, i) => b.readInt32LE(base + 48 + i * 4)), instances };
}
if (path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
    const report = { ok: [], errors: [] };
    for (const name of Object.keys(manifest)) {
        if (name.includes('.msg.') || name.includes('.poglst.'))
            continue;
        try {
            const b = fs.readFileSync(path.join(root, 'raw', name));
            let result;
            if (name.includes('.pog.')) {
                const start = Number(b.readBigUInt64LE(56)), end = Number(b.readBigUInt64LE(64)), subStart = Number(b.readBigUInt64LE(72)), subEnd = Number(b.readBigUInt64LE(80));
                result = start ? parse(b, start, end) : { objects: [], instances: [null] };
                result.defaults = subStart ? parse(b, subStart, subEnd) : null;
            }
            else
                result = parse(b);
            const output = path.join(root, 'json', name + '.json');
            fs.mkdirSync(path.dirname(output), { recursive: true });
            fs.writeFileSync(output, JSON.stringify(result, null, 2));
            report.ok.push(name);
        }
        catch (e) {
            report.errors.push({ name, error: e.message });
        }
    }
    fs.writeFileSync(path.join(root, 'parse-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ ok: report.ok.length, failed: report.errors.length, examples: report.errors.slice(0, 10) }, null, 2));
    if (report.errors.length) process.exitCode = 1;
}
