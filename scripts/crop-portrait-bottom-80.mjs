import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const inputPath = path.join(projectRoot, 'public', 'images', 'portrait.png');
const outputPath = path.join(projectRoot, 'public', 'images', 'portrait.cropped.png');

async function cropBottomPixels(pixelsToRemove = 80) {
  try {
    await fs.access(inputPath);
  } catch {
    throw new Error(`Input file is missing: ${inputPath}`);
  }

  const img = sharp(inputPath);
  const meta = await img.metadata();
  if (!meta.width || !meta.height) throw new Error('Could not read image dimensions.');

  const width = meta.width;
  const height = meta.height;
  const newHeight = Math.max(1, height - pixelsToRemove);

  await img.extract({ left: 0, top: 0, width, height: newHeight }).toFile(outputPath);
  return { width, height, newHeight, outputPath };
}

try {
  const res = await cropBottomPixels(80);
  console.log(`Cropped bottom 80px: ${res.width}x${res.height} -> ${res.width}x${res.newHeight}`);
  console.log(`Output: ${res.outputPath}`);
} catch (err) {
  console.error('Crop failed:', err.message);
  process.exitCode = 1;
} 