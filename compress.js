import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const SKIP_DIRS = new Set(['node_modules', '.git']);
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) yield* walk(fullPath);
    } else if (entry.isFile()) {
      yield fullPath;
    }
  }
}

function compressPipeline(input, ext) {
  let pipeline = sharp(input);

  switch (ext) {
    case '.png':
      pipeline = pipeline.png({ compressionLevel: 9, effort: 10 });
      break;
    case '.jpg':
    case '.jpeg':
      pipeline = pipeline.jpeg({ quality: 80, mozjpeg: true });
      break;
    case '.webp':
      pipeline = pipeline.webp({ quality: 80, effort: 6 });
      break;
  }

  return pipeline;
}

async function main() {
  for (const input of walk(rootDir)) {
    const ext = path.extname(input).toLowerCase();
    if (!IMAGE_EXTS.has(ext)) continue;

    const base = path.basename(input, ext);
    if (base.startsWith('c-')) continue;

    const output = path.join(path.dirname(input), `c-${base}${ext}`);
    const tmp = `${output}.tmp`;

    await compressPipeline(input, ext).toFile(tmp);
    fs.unlinkSync(input);
    fs.renameSync(tmp, output);

    console.log(`${path.relative(rootDir, input)} -> ${path.relative(rootDir, output)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
