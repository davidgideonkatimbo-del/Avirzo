export function registerRoutes(app, ctx) {
  const { APP_VERSION, supabase, supabaseAdmin, FFMPEG_AVAILABLE, africanProfiles, jobs } = ctx;

  app.get('/api/african-profiles', (req, res) =>
    res.json(Object.entries(africanProfiles).map(([id, x]) => ({ id, ...x })))
  );

  app.get('/api/health', async (req, res) => {
    let queueDepth = null;
    let workerLastSeenAt = null;
    let workerOnline = false;
    let workerProjectRef = null;

    if (jobs?.durable && supabaseAdmin) {
      try {
        queueDepth = await jobs.queueDepth();
      } catch {
        queueDepth = null;
      }
      const { data } = await supabaseAdmin
        .from('avirzo_worker_heartbeats')
        .select('last_seen_at, project_ref')
        .eq('service_name', 'avirzo-worker')
        .maybeSingle();
      workerLastSeenAt = data?.last_seen_at || null;
      workerProjectRef = data?.project_ref || null;
      workerOnline = Boolean(
        workerLastSeenAt &&
        Date.now() - Date.parse(workerLastSeenAt) < 30000 &&
        workerProjectRef === supabaseProjectRef()
      );
    }

    res.json({
      ok: true,
      app: 'Avirzo',
      version: APP_VERSION,
      videoProvider: 'runway',
      configured: Boolean(process.env.RUNWAYML_API_SECRET),
      voiceProvider: 'elevenlabs',
      voiceConfigured: Boolean(process.env.ELEVENLABS_API_KEY),
      cloud: Boolean(supabase),
      cloudMode: supabase ? 'supabase' : 'local',
      environment: process.env.NODE_ENV || 'development',
      ffmpeg: FFMPEG_AVAILABLE,
      workerConfigured: Boolean(supabaseAdmin && process.env.RUNWAYML_API_SECRET),
      workerOnline,
      workerLastSeenAt,
      workerProjectRef,
      queueDepth
    });
  });
}

function supabaseProjectRef() {
  try {
    return new URL(process.env.SUPABASE_URL || '').hostname.split('.')[0] || null;
  } catch {
    return null;
  }
}
