import path from 'node:path';
import * as nodeFs from 'node:fs';
import { assertSafeUrl, safeFetchBuffer } from './safeFetch.js';

export function outputSize(format) {
  return format === '9:16' ? { w: 720, h: 1280 } : { w: 1280, h: 720 };
}

// Merge dialogue intervals so the ducking expression stays small (ffmpeg expressions have no loops).
export function mergeIntervals(intervals, maxCount = 120) {
  const sorted = intervals.filter(x => x[1] > x[0]).map(x => [x[0], x[1]]).sort((a, b) => a[0] - b[0]);
  for (const gap of [0.4, 1, 2, 5, 15, 60]) {
    const out = [];
    for (const iv of sorted) {
      const last = out[out.length - 1];
      if (last && iv[0] - last[1] <= gap) last[1] = Math.max(last[1], iv[1]); else out.push([...iv]);
    }
    if (out.length <= maxCount) return out;
  }
  return [[sorted[0][0], sorted[sorted.length - 1][1]]];
}

// Gain curve: 1 normally, ducked to `duck` while dialogue plays, with a short attack and release (no abrupt jumps).
// Evaluated per frame against the stream timeline, so it must run AFTER adelay.
export function buildDuckingGain(intervals, { duck = 0.28, attack = 0.25, release = 0.5 } = {}) {
  const merged = mergeIntervals(intervals);
  if (!merged.length) return null;
  const f = n => Number(n.toFixed(3));
  const terms = merged.map(([a, b]) => `clip(min((t-${f(Math.max(0, a - attack))})/${attack},(${f(b + release)}-t)/${release}),0,1)`);
  const depth = terms.reduce((acc, t) => (acc ? `max(${acc},${t})` : t), '');
  return `1-${f(1 - duck)}*${depth}`;
}

const escFilterPath = p => String(p).replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");

export function buildSubtitleFilter(captionPath, format) {
  const portrait = format === '9:16';
  const style = portrait ? 'FontSize=9,MarginV=70,Outline=1,Shadow=0,Alignment=2' : 'FontSize=16,MarginV=22,Outline=1,Shadow=0,Alignment=2';
  return `subtitles=filename='${escFilterPath(captionPath)}':force_style='${style}'`;
}

export async function processFilmExport({ payload, user, ctx, onProgress = async () => {}, isCanceled = async () => false, fetchBuffer = safeFetchBuffer }) {
  const { IS_PRODUCTION, supabaseAdmin, toSrtTime } = ctx;
  const scenes = Array.isArray(payload.scenes) ? payload.scenes : [];
  const audioTracks = Array.isArray(payload.audioTracks) ? payload.audioTracks : [];
  const captions = Array.isArray(payload.captions) ? payload.captions : [];
  const duckMusic = payload.duckMusic !== false;
  const format = payload.format === '9:16' ? '9:16' : '16:9';
  const { w: outW, h: outH } = outputSize(format);
  const captionMode = ['soft','none'].includes(payload.captionMode) ? payload.captionMode : 'burn';
  const quality = payload.quality === 'high' ? 'high' : payload.quality === 'draft' ? 'draft' : 'standard';
  const MAX_TOTAL_BYTES = Math.max(50, Number(process.env.EXPORT_MAX_TOTAL_MB || 2000)) * 1024 * 1024;
  const MAX_UPLOAD_BYTES = Math.max(10, Number(process.env.EXPORT_MAX_UPLOAD_MB || 500)) * 1024 * 1024;
  let totalBytes = 0;
  const countBytes = n => { totalBytes += n; if (totalBytes > MAX_TOTAL_BYTES) throw new Error('Export media is too large to process (disk limit reached).'); };
  if (!scenes.length) throw new Error('At least one rendered scene is required.');
  if (scenes.length > 30) throw new Error('Export is limited to 30 scenes per job.');
  if (IS_PRODUCTION && !supabaseAdmin) throw new Error('Production exports require Supabase Storage.');
  for (const scene of scenes) {
    if (scene?.assetId) continue;
    const url = String(scene?.videoUrl || '').trim();
    if (!url) throw new Error('Every export scene needs an archived asset or a video URL. Re-generate any missing scene.');
    assertSafeUrl(url);
  }
  const MAX_EXPORT_DURATION_SECONDS = 15 * 60;
  const ensureActive = async () => { if (await isCanceled()) throw new Error('Export canceled by user.'); };
  await ensureActive();
  await onProgress(5);
  const safeTracks = audioTracks.map((t, i) => ({
    id: String(t.id || `audio-${i}`), name: String(t.name || `Track ${i+1}`).slice(0,120),
    type: ['dialogue','narration','ambience','music','sfx'].includes(t.type) ? t.type : 'sfx',
    src: String(t.src || '').trim(), start: Math.max(0, Number(t.start) || 0), duration: Math.max(0, Number(t.duration) || 0),
    volume: Math.max(0, Math.min(2, Number(t.volume) || 1)), fadeIn: Math.max(0, Number(t.fadeIn) || 0), fadeOut: Math.max(0, Number(t.fadeOut) || 0)
  })).filter(t => /^data:audio\//i.test(t.src) || (() => { try { assertSafeUrl(t.src); return true; } catch { return false; } })());
  const safeCaptions = captions.map(c => ({
    start: Math.max(0, Number(c.start) || 0), end: Math.max(0, Number(c.end) || 0), text: String(c.text || '').replace(/[\r\n]+/g,' ').trim().slice(0,500)
  })).filter(c => c.text && c.end > c.start);
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const execFileRaw = promisify(execFile);
  // Local files only for ffmpeg/ffprobe inputs (no network protocols), bounded output and runtime.
  // A watcher polls for cancellation and kills any running ffmpeg immediately.
  const abort = new AbortController();
  const cancelWatcher = setInterval(async () => { try { if (await isCanceled()) abort.abort(); } catch {} }, 3000);
  const execFileAsync = async (cmd, args) => {
    const safe = [];
    for (const a of args) { if (a === '-i') safe.push('-protocol_whitelist', 'file'); safe.push(a); }
    try { return await execFileRaw(cmd, safe, { maxBuffer: 64 * 1024 * 1024, timeout: 10 * 60 * 1000, signal: abort.signal }); }
    catch (error) {
      if (abort.signal.aborted) throw new Error('Export canceled by user.');
      const detail = String(error?.stderr || error?.message || '').split('\n').filter(Boolean).slice(-3).join(' | ').slice(0, 400);
      throw new Error(`Media processing failed: ${detail || 'unknown error'}`);
    }
  };
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'avirzo-film-'));
  const files = [];
  const audioFiles = [];
  try {
    const resolveAudioSource = async (src, index) => {
      if (/^data:audio\//i.test(src)) {
        const match = src.match(/^data:audio\/[^;]+;base64,(.+)$/i);
        if (!match) throw new Error(`Audio track ${index + 1} has an invalid data URL.`);
        const file = path.join(dir, `audio-${String(index + 1).padStart(3,'0')}.mp3`);
        await fs.writeFile(file, Buffer.from(match[1], 'base64'));
        return file;
      }
      const fetched = await fetchBuffer(src, { maxBytes: 100 * 1024 * 1024, timeoutMs: 30000 });
      countBytes(fetched.buffer.length);
      const file = path.join(dir, `audio-${String(index + 1).padStart(3,'0')}.bin`);
      await fs.writeFile(file, fetched.buffer);
      return file;
    };
    async function resolveSceneSource(scene) {
      if (scene?.assetId && supabaseAdmin) {
        const { data: asset, error } = await supabaseAdmin.from('avirzo_assets').select('storage_path').eq('id', scene.assetId).eq('user_id', user.id).maybeSingle();
        if (error) throw error;
        if (!asset?.storage_path) throw new Error('Referenced scene asset was not found or is not owned by this user.');
        const { data, error: signedError } = await supabaseAdmin.storage.from('avirzo-media').createSignedUrl(asset.storage_path, 3600);
        if (signedError || !data?.signedUrl) throw signedError || new Error('Could not create a fresh scene media URL.');
        return data.signedUrl;
      }
      const url = String(scene?.videoUrl || '');
      assertSafeUrl(url);
      return url;
    }
    for (let i = 0; i < scenes.length; i++) {
      await ensureActive();
      let fetched;
      try { fetched = await fetchBuffer(await resolveSceneSource(scenes[i]), { maxBytes: 300 * 1024 * 1024, timeoutMs: 30000 }); }
      catch (e) { throw new Error(`Could not download scene ${i + 1}: ${e.message}`); }
      const file = path.join(dir, `scene-${String(i + 1).padStart(3,'0')}.mp4`);
      countBytes(fetched.buffer.length);
      await fs.writeFile(file, fetched.buffer);
      await ensureActive();
      const normalized = path.join(dir, `norm-${String(i + 1).padStart(3,'0')}.mp4`);
      await execFileAsync('ffmpeg', ['-y','-i',file,'-vf',`scale=${outW}:${outH}:force_original_aspect_ratio=decrease,pad=${outW}:${outH}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1`,'-r','24','-c:v','libx264','-preset','veryfast','-pix_fmt','yuv420p','-c:a','aac','-ar','48000','-ac','2',normalized]);
      files.push(normalized);
      await ensureActive();
      await onProgress(10 + Math.round(((i + 1) / Math.max(scenes.length, 1)) * 45));
    }
    await ensureActive();
    const list = path.join(dir, 'concat.txt');
    await fs.writeFile(list, files.map(f => `file '${f.replace(/'/g,"'\\''")}'`).join('\n'));
    const videoOnly = path.join(dir, 'video-only.mp4');
    await execFileAsync('ffmpeg', ['-y','-f','concat','-safe','0','-i',list,'-c','copy',videoOnly]);
    const { stdout: durationOut } = await execFileAsync('ffprobe', ['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',videoOnly]);
    const videoDuration = Number.parseFloat(durationOut.trim()) || 0;
    if (videoDuration > MAX_EXPORT_DURATION_SECONDS) throw new Error(`Export duration exceeds the ${MAX_EXPORT_DURATION_SECONDS / 60}-minute limit.`);

    await ensureActive();
    const finalInputs = ['-i', videoOnly];
    const filters = [];
    const dialogueIntervals = safeTracks.filter(t => t.type === 'dialogue').map(t => [t.start, t.start + t.duration]).filter(x => x[1] > x[0]);
    const duckGain = duckMusic ? buildDuckingGain(dialogueIntervals) : null;
    for (let i = 0; i < safeTracks.length; i++) {
      const t = safeTracks[i];
      const af = [];
      if (t.duration > 0) af.push(`atrim=0:${t.duration}`);
      af.push('asetpts=PTS-STARTPTS');
      af.push(`volume=${t.volume}`);
      if (t.fadeIn > 0) af.push(`afade=t=in:st=0:d=${Math.min(t.fadeIn, Math.max(t.duration,0.01))}`);
      if (t.fadeOut > 0 && t.duration > t.fadeOut) af.push(`afade=t=out:st=${Math.max(0,t.duration-t.fadeOut)}:d=${t.fadeOut}`);
      af.push(`adelay=${Math.round(t.start*1000)}|${Math.round(t.start*1000)}`);
      // Ducking must come after adelay so dialogue times line up with the film timeline, and needs per-frame evaluation.
      if (duckGain && (t.type === 'music' || t.type === 'ambience')) af.push(`volume=volume='${duckGain}':eval=frame`);
      audioFiles.push(t);
      const audioInputIndex = audioFiles.length;
      filters.push(`[${audioInputIndex}:a]${af.join(',')}[a${i}]`);
    }
    const audioLabels = audioFiles.map((_,i)=>`[a${i}]`).join('');
    const captionPath = path.join(dir, 'captions.srt');
    const srt = safeCaptions.map((c,i)=>`${i+1}\n${toSrtTime(c.start)} --> ${toSrtTime(c.end)}\n${c.text}\n`).join('\n');
    await fs.writeFile(captionPath, srt);
    // burn = burned-in (visible everywhere); soft = selectable mov_text track; none = video only.
    let canBurn = false;
    if (safeCaptions.length && captionMode === 'burn') {
      try { const { stdout } = await execFileRaw('ffmpeg', ['-hide_banner', '-filters'], { maxBuffer: 8 * 1024 * 1024, timeout: 20000 }); canBurn = /\bsubtitles\b/.test(stdout); } catch { canBurn = false; }
    }
    const burn = safeCaptions.length > 0 && captionMode === 'burn' && canBurn;
    const soft = safeCaptions.length > 0 && (captionMode === 'soft' || (captionMode === 'burn' && !canBurn));
    const finalOutput = path.join(dir, 'avirzo-film-final.mp4');
    await ensureActive();
    const encodePresets = {
      draft: ['-c:v','libx264','-preset','ultrafast','-crf','28','-pix_fmt','yuv420p'],
      standard: ['-c:v','libx264','-preset','veryfast','-crf','21','-pix_fmt','yuv420p'],
      high: ['-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p']
    };
    const videoEncode = encodePresets[quality] || encodePresets.standard;
    // Provenance: every export is labeled as containing AI-generated media (not optional, so the label cannot be stripped by a client).
    const provenance = 'Created with Avirzo. Contains AI-generated video and synthetic voice. Cultural and historical content should be reviewed with community knowledge-holders.';
    const tail = ['-movflags','+faststart','-metadata',`comment=${provenance}`,'-metadata','encoded_by=Avirzo','-metadata','description=AI-generated media'];
    if (audioFiles.length) {
      filters.push(`${audioLabels}amix=inputs=${audioFiles.length}:duration=longest:dropout_transition=2:normalize=0[aout]`);
      if (burn) filters.push(`[0:v]${buildSubtitleFilter(captionPath, format)}[vout]`);
      const trackInputs = [];
      for (let i = 0; i < audioFiles.length; i++) trackInputs.push('-i', await resolveAudioSource(audioFiles[i].src, i));
      const args = ['-y','-i',videoOnly,...trackInputs];
      if (soft) args.push('-i',captionPath);
      args.push('-filter_complex',filters.join(';'),'-map',burn ? '[vout]' : '0:v:0','-map','[aout]',...(burn ? videoEncode : ['-c:v','copy']),'-c:a','aac','-b:a','192k','-t',String(videoDuration));
      if (soft) args.push('-map',`${audioFiles.length + 1}:0`,'-c:s','mov_text');
      await execFileAsync('ffmpeg', args.concat(tail, [finalOutput]));
    } else {
      const args=['-y','-i',videoOnly];
      if (burn) args.push('-vf',buildSubtitleFilter(captionPath, format),'-map','0:v:0','-map','0:a?',...videoEncode,'-c:a','copy');
      else if (soft) args.push('-i',captionPath,'-map','0:v:0','-map','0:a?','-map','1:0','-c:v','copy','-c:a','copy','-c:s','mov_text');
      else args.push('-c','copy');
      await execFileAsync('ffmpeg', args.concat(tail, [finalOutput]));
    }
    await ensureActive();
    let deliverableOutput = finalOutput;
    if (payload.aiEndCard === true) {
      const endCard = path.join(dir, 'avirzo-end-card.mp4');
      const endCardText = path.join(dir, 'end-card.txt');
      await fs.writeFile(endCardText, 'Created with Avirzo\nAI-assisted filmmaking', 'utf8');
      let hasAudio = false;
      try { const { stdout } = await execFileAsync('ffprobe', ['-v','error','-select_streams','a:0','-show_entries','stream=index','-of','csv=p=0', finalOutput]); hasAudio = Boolean(stdout.trim()); } catch {}
      const cardArgs = ['-y','-f','lavfi','-i',`color=c=black:s=${outW}x${outH}:d=4:r=24`];
      if (hasAudio) cardArgs.push('-f','lavfi','-i','anullsrc=r=48000:cl=stereo');
      cardArgs.push('-vf',`drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:textfile='${escFilterPath(endCardText)}':fontcolor=white:fontsize=${format==='9:16'?34:42}:line_spacing=12:x=(w-text_w)/2:y=(h-text_h)/2`, '-c:v','libx264','-preset','veryfast','-pix_fmt','yuv420p');
      if (hasAudio) cardArgs.push('-c:a','aac','-shortest'); else cardArgs.push('-an');
      await execFileAsync('ffmpeg', cardArgs.concat([endCard]));
      const joined = path.join(dir, 'avirzo-film-deliverable.mp4');
      const concatList = path.join(dir, 'deliverable-concat.txt');
      await fs.writeFile(concatList, `file '${finalOutput.replace(/'/g,"'\\''")}\nfile '${endCard.replace(/'/g,"'\\''")}\n`);
      await execFileAsync('ffmpeg', ['-y','-f','concat','-safe','0','-i',concatList,'-c','copy',joined]);
      deliverableOutput = joined;
    }
    const finalName = `avirzo-film-${Date.now()}.mp4`;
    let downloadUrl = null;
    let assetId = null;
    if (IS_PRODUCTION) {
      if (!supabaseAdmin) throw new Error('Production exports require Supabase Storage and SUPABASE_SERVICE_ROLE_KEY.');
      const { size: finalSize } = await fs.stat(deliverableOutput);
      if (finalSize > MAX_UPLOAD_BYTES) throw new Error(`Final export is ${Math.round(finalSize / 1048576)} MB, above the ${Math.round(MAX_UPLOAD_BYTES / 1048576)} MB archive limit. Try fewer scenes or a shorter film.`);
      // File-backed Blob (Node 19.8+) avoids holding the whole film in memory; fall back to a buffer on older runtimes.
      const bytes = typeof nodeFs.openAsBlob === 'function' ? await nodeFs.openAsBlob(deliverableOutput, { type: 'video/mp4' }) : await fs.readFile(deliverableOutput);
      const projectId = String(payload.projectId || 'unassigned').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,120) || 'unassigned';
      const storagePath = `${user.id}/${projectId}/export/${Date.now()}-${finalName}`;
      const { error: uploadError } = await supabaseAdmin.storage.from('avirzo-media').upload(storagePath, bytes, { contentType: 'video/mp4', upsert: false });
      if (uploadError) throw uploadError;
      const { data: asset, error: assetError } = await supabaseAdmin.from('avirzo_assets').insert({ user_id: user.id, project_id: payload.projectId || null, kind: 'export', name: finalName, storage_path: storagePath, mime_type: 'video/mp4', size_bytes: finalSize, source_provider: 'avirzo-ffmpeg' }).select().single();
      if (assetError) throw assetError;
      assetId = asset.id;
      const { data: signed, error: signedError } = await supabaseAdmin.storage.from('avirzo-media').createSignedUrl(storagePath, 3600);
      if (signedError) throw signedError;
      downloadUrl = signed.signedUrl;
    } else {
      const publicDir = path.join(process.cwd(), 'exports');
      await fs.mkdir(publicDir, { recursive: true });
      await fs.copyFile(deliverableOutput, path.join(publicDir, finalName));
      downloadUrl = `/exports/${finalName}`;
    }
    await ensureActive();
    await onProgress(95);
    const resolvedCaptionMode = burn ? 'burned-in' : soft ? 'soft-track' : 'none';
    const includeSrt = payload.includeSrt !== false && safeCaptions.length > 0;
    return {
      status: 'ready',
      downloadUrl,
      assetId,
      scenes: scenes.length,
      audioTracks: safeTracks.length,
      captions: safeCaptions.length,
      aiDisclosure: true, aiEndCard: payload.aiEndCard === true, ducking: !!duckGain && safeTracks.some(t => t.type === 'music' || t.type === 'ambience'),
      format,
      quality,
      captionMode: resolvedCaptionMode,
      srt: includeSrt ? srt : null,
      message: `Final film exported${IS_PRODUCTION ? ' and archived' : ''} (${quality} quality, captions ${resolvedCaptionMode}) with ${safeTracks.length} audio track(s) and ${safeCaptions.length} caption cue(s).`
    };
  } finally {
    clearInterval(cancelWatcher);
    try { await fs.rm(dir, { recursive: true, force: true }); } catch {}
  }
}
