import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { FILM_FINISHES, resolveFinish, buildAudioFinish } from '../src/services/exporter.js';

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

test('film finish defaults: filmic for normal exports, none for drafts, unknown values are ignored', () => {
  assert.equal(resolveFinish(undefined, 'standard'), 'filmic');
  assert.equal(resolveFinish('', 'high'), 'filmic');
  assert.equal(resolveFinish(undefined, 'draft'), 'none');
  assert.equal(resolveFinish('warm', 'draft'), 'warm');
  assert.equal(resolveFinish('WARM', 'standard'), 'warm');
  assert.equal(resolveFinish('rm -rf /;', 'standard'), 'filmic');
  assert.equal(resolveFinish('constructor', 'standard'), 'filmic'); // not an own property of the preset table
  assert.deepEqual(Object.keys(FILM_FINISHES), ['none', 'natural', 'filmic', 'warm', 'cool']);
  assert.equal(FILM_FINISHES.none, null);
});

test('audio finish: loudness normalisation plus an end fade for films longer than 3 seconds', () => {
  assert.deepEqual(buildAudioFinish(2), ['loudnorm=I=-16:TP=-1.5:LRA=11']);
  assert.deepEqual(buildAudioFinish(10), ['loudnorm=I=-16:TP=-1.5:LRA=11', 'afade=t=out:st=9.00:d=1']);
  assert.deepEqual(buildAudioFinish(10, { normalize: false }), ['afade=t=out:st=9.00:d=1']);
  assert.deepEqual(buildAudioFinish(2, { normalize: false }), []);
});

test('exporter applies the finish per scene at the chosen quality, and mixes with the audio finish', () => {
  const src = fs.readFileSync(new URL('../src/services/exporter.js', import.meta.url), 'utf8');
  assert.match(src, /finishFilter \? ',' \+ finishFilter : ''/);
  assert.match(src, /'-r','24',\.\.\.sceneEncode/);          // scenes now honour draft / standard / high quality
  assert.match(src, /\[amixed\]\$\{audioFinish\.join\(','\)\}\[aout\]/);
  assert.match(src, /payload\.normalizeLoudness !== false/);
});

test('every finish preset really runs in ffmpeg and keeps the picture size', { skip: !hasFfmpeg && 'ffmpeg not installed' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'avirzo-finish-'));
  try {
    const src = path.join(dir, 'src.mp4');
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=d=1:s=640x360:r=24', '-pix_fmt', 'yuv420p', src]);
    for (const [name, filter] of Object.entries(FILM_FINISHES)) {
      const out = path.join(dir, `${name}.mp4`);
      execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', src, '-vf', `scale=640:360,setsar=1${filter ? ',' + filter : ''}`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', out]);
      const size = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', out], { encoding: 'utf8' }).trim();
      assert.equal(size, '640,360', name);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('the export route passes the finish, loudness and picture-size choices to the exporter', () => {
  const route = fs.readFileSync(new URL('../src/routes/export.js', import.meta.url), 'utf8');
  assert.match(route, /finish: String\(req\.body\?\.finish/);
  assert.match(route, /normalizeLoudness: req\.body\?\.normalizeLoudness !== false/);
  assert.match(route, /resolution: req\.body\?\.resolution === '1080p' \? '1080p' : '720p'/);
  assert.match(route, /plan === 'free'\) payload\.resolution = '720p'/);
});

test('1080p export sizes and plan limits', async () => {
  const { outputSize, resolveResolution } = await import('../src/services/exporter.js');
  assert.deepEqual(outputSize('16:9'), { w: 1280, h: 720 });
  assert.deepEqual(outputSize('9:16'), { w: 720, h: 1280 });
  assert.deepEqual(outputSize('16:9', '1080p'), { w: 1920, h: 1080 });
  assert.deepEqual(outputSize('9:16', '1080p'), { w: 1080, h: 1920 });
  assert.equal(resolveResolution('1080p', 'creator'), '1080p');
  assert.equal(resolveResolution('1080p', 'studio'), '1080p');
  assert.equal(resolveResolution('1080p', 'free'), '720p');
  assert.equal(resolveResolution('4k', 'studio'), '720p');
  assert.equal(resolveResolution(undefined, 'studio'), '720p');
});

test('the 1080p scale-and-sharpen chain runs in ffmpeg', { skip: !hasFfmpeg && 'ffmpeg not installed' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'avirzo-hd-'));
  try {
    const src = path.join(dir, 'src.mp4');
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=d=1:s=1280x720:r=24', '-pix_fmt', 'yuv420p', src]);
    const out = path.join(dir, 'hd.mp4');
    const vf = `scale=1920:1080:force_original_aspect_ratio=decrease:flags=lanczos,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,unsharp=5:5:0.5:5:5:0.0,${FILM_FINISHES.filmic}`;
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', src, '-vf', vf, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', out]);
    assert.equal(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', out], { encoding: 'utf8' }).trim(), '1920,1080');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
