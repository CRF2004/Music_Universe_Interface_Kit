import type { MusicWorldProjectTrack } from '../../project/musicWorldProject';

export async function identifyAudioFile(file: File): Promise<NonNullable<MusicWorldProjectTrack['file']>> {
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return { name: file.name, sizeBytes: file.size, sha256: Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('') };
}

export function localTrackRecord(file: NonNullable<MusicWorldProjectTrack['file']>, duration: number): MusicWorldProjectTrack {
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('The song has no readable duration.');
  return {
    source: 'local-file', title: file.name, expectedDurationSeconds: duration, file,
    rights: { licenseRef: 'LicenseRef-User-Provided-Unverified', attribution: `${file.name} — user-provided audio; rights unverified; private local preview.` },
  };
}

export function assertMatchingAudio(expected: MusicWorldProjectTrack, file: NonNullable<MusicWorldProjectTrack['file']>, duration: number) {
  if (!expected.file) throw new Error('This older project has no song fingerprint. Use Replace music to link your file.');
  if (expected.file.sha256 !== file.sha256 || expected.file.sizeBytes !== file.sizeBytes) throw new Error(`This file does not match ${expected.file.name}. Choose the original song or use Replace music.`);
  if (!expected.expectedDurationSeconds || Math.abs(expected.expectedDurationSeconds - duration) > 0.25) throw new Error('This song has a different duration. Choose the original file or use Replace music.');
}
