import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

for (const relativePath of ['.cache', 'dist']) {
  await rm(path.join(projectDirectory, relativePath), { recursive: true, force: true });
}
