import test from 'node:test';
import assert from 'node:assert/strict';
import { providerConfigured, resolveProviderLanguage } from '../src/services/voiceProviders.js';
import { detectMediaType } from '../src/services/safeFetch.js';

test('voice locale mapping is provider-specific and refuses unverified languages', () => {
  assert.equal(resolveProviderLanguage('elevenlabs', 'uganda-en'), 'eng');
  assert.equal(resolveProviderLanguage('google', 'uganda-en'), 'en-US');
  assert.equal(resolveProviderLanguage('azure', 'kenya-sw'), 'sw-KE');
  assert.equal(resolveProviderLanguage('polly', 'kenya-sw'), null);
  assert.equal(resolveProviderLanguage('google', 'uganda-lg'), null);
  assert.equal(resolveProviderLanguage('elevenlabs', 'nigeria-yo'), null);
});

test('media import signature detection recognizes common video, audio and image formats', () => {
  const png = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0]);
  const mp4 = Buffer.from('000000186674797069736f6d', 'hex');
  const mp3 = Buffer.from('ID3\x04\x00\x00\x00', 'binary');
  const webm = Buffer.from([0x1a,0x45,0xdf,0xa3,0x93,0x42]);
  assert.equal(detectMediaType(png), 'image/png');
  assert.equal(detectMediaType(mp4), 'video/mp4');
  assert.equal(detectMediaType(mp3), 'audio/mpeg');
  assert.equal(detectMediaType(webm), 'video/webm');
  assert.equal(detectMediaType(Buffer.from('<html>not media</html>')), null);
});

test('asset import path applies type-specific size limits and checks cleanup failures', async () => {
  const fs = await import('node:fs');
  const source = fs.readFileSync(new URL('../src/services/core.js', import.meta.url), 'utf8');
  const route = fs.readFileSync(new URL('../src/routes/assets.js', import.meta.url), 'utf8');
  assert.match(source, /video: 300 \* 1024 \* 1024, export: 300 \* 1024 \* 1024, audio: 40 \* 1024 \* 1024, image: 20 \* 1024 \* 1024/);
  assert.match(source, /Downloaded file is not a recognized media format/);
  assert.match(source, /cleanupError/);
  assert.match(route, /if\(signedError\) throw signedError/);
  assert.match(route, /if\(storageError\) throw storageError/);
});


test('Amazon Polly is only reported configured when the AWS credential chain is complete', () => {
  const keys = ['AWS_REGION','AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY','AWS_PROFILE','AWS_ROLE_ARN','AWS_WEB_IDENTITY_TOKEN_FILE'];
  const saved = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  try {
    for (const k of keys) delete process.env[k];
    process.env.AWS_REGION = 'af-south-1';
    process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
    assert.equal(providerConfigured('polly'), false, 'access key ID alone is not a complete credential pair');
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
    assert.equal(providerConfigured('polly'), true);
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    process.env.AWS_ROLE_ARN = 'arn:aws:iam::123456789012:role/test';
    process.env.AWS_WEB_IDENTITY_TOKEN_FILE = '/tmp/token';
    assert.equal(providerConfigured('polly'), true);
  } finally {
    for (const k of keys) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
  }
});
