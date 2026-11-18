import { v2 as cloudinary } from 'cloudinary';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { demoMode } from '../utils/config';

const demoDirectory = path.resolve(process.env.DEMO_STORAGE_DIR || '.demo-files');
const assetKeyPattern = /^[a-f0-9-]{36}\.(pdf|docx|txt)$/;
const cloudConfigured = [
  process.env.CLOUDINARY_CLOUD_NAME,
  process.env.CLOUDINARY_API_KEY,
  process.env.CLOUDINARY_API_SECRET,
].every(value => value && !value.startsWith('your-'));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export class StorageUnavailableError extends Error {
  constructor() {
    super('Contract storage is unavailable. Check storage configuration or try again later.');
  }
}

export async function storeContract(buffer: Buffer, extension: string) {
  const key = randomUUID() + extension;
  if (!assetKeyPattern.test(key)) throw new StorageUnavailableError();
  if (demoMode) {
    await mkdir(demoDirectory, { recursive: true });
    await writeFile(path.join(demoDirectory, key), buffer, { flag: 'wx' });
    return 'demo:' + key;
  }
  if (!cloudConfigured) throw new StorageUnavailableError();
  const publicId = 'contracts/' + key;
  return new Promise<string>((resolve, reject) => {
    cloudinary.uploader.upload_stream({
      public_id: publicId,
      resource_type: 'raw',
      type: 'authenticated',
      overwrite: false,
    }, (error, result) => {
      if (error || !result) return reject(new StorageUnavailableError());
      resolve('cloudinary:' + result.public_id);
    }).end(buffer);
  });
}

export async function discardContract(reference: string) {
  const demoKey = reference.slice('demo:'.length);
  if (reference.startsWith('demo:') && assetKeyPattern.test(demoKey)) {
    await unlink(path.join(demoDirectory, demoKey));
  } else if (reference.startsWith('cloudinary:contracts/')) {
    await cloudinary.uploader.destroy(reference.slice('cloudinary:'.length), { type: 'authenticated', resource_type: 'raw' });
  }
}

export async function readContract(reference: string) {
  let downloadUrl: string;
  if (reference.startsWith('demo:')) {
    const key = reference.slice('demo:'.length);
    if (!demoMode || !assetKeyPattern.test(key)) return null;
    return { buffer: await readFile(path.join(demoDirectory, key)), extension: path.extname(key) };
  }

  if (reference.startsWith('cloudinary:contracts/')) {
    if (!cloudConfigured) throw new StorageUnavailableError();
    const publicId = reference.slice('cloudinary:'.length);
    downloadUrl = cloudinary.url(publicId, { type: 'authenticated', resource_type: 'raw', sign_url: true, secure: true });
  } else {
    // Existing contracts may still point to the previous delivery format.
    const legacy = new URL(reference);
    if (legacy.protocol !== 'https:' || legacy.host !== 'res.cloudinary.com') return null;
    if (!legacy.pathname.includes('/raw/upload/') || legacy.pathname.startsWith('/fallback-contracts/')) return null;
    downloadUrl = legacy.toString();
  }

  const response = await fetch(downloadUrl, { signal: AbortSignal.timeout(15000), redirect: 'error' });
  if (response.status === 404) return null;
  if (!response.ok) throw new StorageUnavailableError();
  return { buffer: Buffer.from(await response.arrayBuffer()), extension: path.extname(new URL(downloadUrl).pathname) };
}
