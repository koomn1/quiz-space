import { registerPlugin } from '@capacitor/core';

export type NativeDownloadState = 'pending' | 'running' | 'complete' | 'failed' | 'missing' | 'unknown';

export interface NativeDownloadStatus {
  state: NativeDownloadState;
  downloadId: string;
  downloadedBytes?: number;
  totalBytes?: number;
  progress?: number;
  localUri?: string;
  reason?: number;
}

interface QuizSpaceUpdatePlugin {
  enqueue(options: { url: string; fileName: string }): Promise<{ downloadId: string; fileName: string }>;
  status(options: { downloadId: string }): Promise<NativeDownloadStatus>;
  sha256(options: { fileName: string }): Promise<{ sha256: string; fileName: string }>;
  openInstaller(options: { fileName: string }): Promise<void>;
}

export const QuizSpaceUpdate = registerPlugin<QuizSpaceUpdatePlugin>('QuizSpaceUpdate');

export interface LatestMobileRelease {
  tagName: string;
  version: string;
  apkUrl: string;
  checksumUrl: string;
}

const RELEASES_URL = 'https://api.github.com/repos/koomn1/quiz-space/releases/latest';
const MIN_NATIVE_VERSION: [number, number, number] = [3, 0, 0];
const TRUSTED_DOWNLOAD_HOSTS = new Set(['github.com', 'objects.githubusercontent.com']);

function isTrustedDownloadUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && TRUSTED_DOWNLOAD_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function isAtLeastNativeVersion(value: string): boolean {
  const parsed = parseVersion(value);
  if (!parsed) return false;
  return parsed[0] > MIN_NATIVE_VERSION[0]
    || (parsed[0] === MIN_NATIVE_VERSION[0] && (parsed[1] > MIN_NATIVE_VERSION[1]
      || (parsed[1] === MIN_NATIVE_VERSION[1] && parsed[2] >= MIN_NATIVE_VERSION[2])));
}

export function parseVersion(value: string): [number, number, number] | null {
  const match = value.trim().replace(/^v/i, '').match(/^(\d+)\.(\d+)\.(\d+)$/);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

export function isVersionNewer(latest: string, current: string): boolean {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  if (!a || !b) return false;
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index];
  }
  return false;
}

export async function findLatestMobileRelease(signal?: AbortSignal): Promise<LatestMobileRelease | null> {
  const response = await fetch(RELEASES_URL, {
    signal,
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!response.ok) throw new Error('تعذر فحص تحديث التطبيق الآن.');
  const release = await response.json() as { tag_name?: string; assets?: Array<{ name?: string; browser_download_url?: string }> };
  const tagName = (release.tag_name || '').trim();
  const version = tagName.replace(/^mobile-v/i, '');
  const apk = release.assets?.find((asset) => asset.name === 'quizspace-mobile.apk')?.browser_download_url;
  const checksum = release.assets?.find((asset) => asset.name === 'quizspace-mobile.apk.sha256')?.browser_download_url;
  if (!tagName || !isAtLeastNativeVersion(version) || !apk || !checksum) return null;
  if (!isTrustedDownloadUrl(apk) || !isTrustedDownloadUrl(checksum)) return null;
  return { tagName, version, apkUrl: apk, checksumUrl: checksum };
}

export async function fetchExpectedSha256(url: string): Promise<string> {
  if (!isTrustedDownloadUrl(url)) throw new Error('رابط التحديث غير موثوق.');
  const response = await fetch(url, { headers: { Accept: 'text/plain' } });
  if (!response.ok) throw new Error('تعذر التحقق من ملف التحديث.');
  const text = await response.text();
  const match = text.match(/[a-f0-9]{64}/i);
  if (!match) throw new Error('ملف التحديث غير صالح.');
  return match[0].toLowerCase();
}

export function updateCacheKey(tagName: string): string {
  return `quizspace-native-update:${tagName}`;
}
