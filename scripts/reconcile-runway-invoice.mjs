import 'dotenv/config';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const file = process.argv[2];
const invoiceId = process.env.RUNWAY_INVOICE_ID || '';
if (!file || !invoiceId) {
  console.error('Usage: RUNWAY_INVOICE_ID="invoice-or-statement-id" node scripts/reconcile-runway-invoice.mjs path/to/runway-usage.csv');
  process.exit(2);
}
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.'); process.exit(2); }

function parseCsv(input) {
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) {
      if (c === '"' && input[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell.replace(/\r$/, '')); if (row.some(v => v.trim())) rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (quoted) throw new Error('CSV has an unterminated quoted field.');
  if (cell.length || row.length) { row.push(cell.replace(/\r$/, '')); if (row.some(v => v.trim())) rows.push(row); }
  if (rows.length < 2) throw new Error('CSV must contain a header and at least one data row.');
  const headers = rows.shift().map(h => h.trim().toLowerCase().replace(/[\s-]+/g, '_'));
  return rows.map(values => Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ''])));
}
function field(row, candidates) { for (const key of candidates) if (row[key] !== undefined && String(row[key]).trim() !== '') return String(row[key]).trim(); return ''; }
function parseCost(value) {
  const n = Number(String(value).replace(/[$,\s]/g, '').replace(/^\((.*)\)$/, '-$1'));
  if (!Number.isFinite(n) || n < 0) throw new Error(`Invalid non-negative cost value: ${value}`);
  return n;
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const rows = parseCsv(fs.readFileSync(file, 'utf8'));
const duplicateOccurrences = new Map();
const normalized = rows.map((row, i) => {
  const taskId = field(row, ['task_id','provider_task_id','runway_task_id','generation_id','request_id']);
  const costRaw = field(row, ['cost_usd','actual_cost_usd','amount_usd','cost','amount','total_usd']);
  if (!taskId) throw new Error(`Row ${i + 2} has no task identifier. This importer deliberately refuses to guess which Avirzo job an invoice line belongs to.`);
  if (!costRaw) throw new Error(`Row ${i + 2} has no recognized cost column (cost_usd, actual_cost_usd, amount_usd, cost, amount, total_usd).`);
  const cost = parseCost(costRaw);
  const sourceLineId = field(row, ['line_item_id','line_id','usage_id','id']);
  const usageDateRaw = field(row, ['usage_date','created_at','timestamp','date']);
  const usageDate = usageDateRaw && !Number.isNaN(Date.parse(usageDateRaw)) ? new Date(usageDateRaw).toISOString() : null;
  const currency = (field(row, ['currency']) || process.env.RUNWAY_INVOICE_CURRENCY || '').toUpperCase();
  if (!currency) throw new Error(`Row ${i + 2} has no currency column. Set RUNWAY_INVOICE_CURRENCY explicitly only after confirming the invoice currency.`);
  if (currency !== 'USD') throw new Error(`Row ${i + 2} is in ${currency}; convert it to USD using the invoice's actual exchange/settlement basis before importing. No implicit FX conversion is performed.`);
  const canonicalRow = JSON.stringify(Object.keys(row).sort().map(k => [k, row[k]]));
  const occurrence = duplicateOccurrences.get(canonicalRow) || 0;
  duplicateOccurrences.set(canonicalRow, occurrence + 1);
  // Prefer a provider line ID. Otherwise include the occurrence number so two legitimate identical charge lines are not collapsed.
  const hashInput = sourceLineId ? `line:${sourceLineId}` : `row:${canonicalRow}:occurrence:${occurrence}`;
  const sourceHash = crypto.createHash('sha256').update(hashInput).digest('hex');
  return { taskId, cost, sourceLineId: sourceLineId || null, usageDate, currency, raw: row, sourceHash, description: field(row, ['description','product','model','type']) || null };
});

async function fetchAll(query) {
  const pageSize = 1000; let all = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) throw error;
    all = all.concat(data || []);
    if (!data || data.length < pageSize) return all;
  }
}
const jobs = await fetchAll(supabase.from('avirzo_jobs').select('id,provider_task_id,created_at').not('provider_task_id', 'is', null).order('created_at', { ascending: true }));
const jobByTask = new Map((jobs || []).map(j => [String(j.provider_task_id), j]));
const estimates = await fetchAll(supabase.from('avirzo_provider_budget_ledger').select('job_id,amount_usd,budget_date,state').in('state', ['charged','reserved']).order('budget_date', { ascending: true }));
const estimateByJob = new Map();
for (const item of estimates) {
  const id = String(item.job_id);
  estimateByJob.set(id, (estimateByJob.get(id) || 0) + Number(item.amount_usd || 0));
}
const invoiceRows = normalized.map(x => {
  const job = jobByTask.get(x.taskId);
  return { invoice_id: invoiceId, source_hash: x.sourceHash, source_line_id: x.sourceLineId, provider_task_id: x.taskId, job_id: job?.id || null, usage_date: x.usageDate, description: x.description, currency: x.currency, actual_cost_usd: x.cost, raw_line: x.raw };
});
const { error: importError } = await supabase.from('avirzo_runway_invoice_lines').upsert(invoiceRows, { onConflict: 'invoice_id,source_hash' });
if (importError) throw importError;

const totals = new Map();
for (const row of normalized) {
  const job = jobByTask.get(row.taskId);
  const key = job?.id || `UNMATCHED:${row.taskId}`;
  const current = totals.get(key) || { jobId: job?.id || null, taskId: row.taskId, actual: 0, lines: 0 };
  current.actual += row.cost; current.lines++; totals.set(key, current);
}
const report = [...totals.values()].map(x => {
  const estimate = x.jobId ? estimateByJob.get(x.jobId) : undefined;
  return { invoice_id: invoiceId, job_id: x.jobId || '', provider_task_id: x.taskId, estimated_usd: estimate ?? '', actual_usd: Number(x.actual.toFixed(6)), variance_usd: estimate === undefined ? '' : Number((x.actual - estimate).toFixed(6)), invoice_lines: x.lines, reconciliation_status: !x.jobId ? 'UNMATCHED_TASK_ID' : estimate === undefined ? 'NO_ESTIMATE_FOUND' : 'MATCHED' };
});
const out = `${file.replace(/\.csv$/i, '')}-avirzo-reconciliation.csv`;
const headers = ['invoice_id','job_id','provider_task_id','estimated_usd','actual_usd','variance_usd','invoice_lines','reconciliation_status'];
const escape = v => { const s = String(v ?? ''); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s; };
fs.writeFileSync(out, [headers.join(','), ...report.map(r => headers.map(h => escape(r[h])).join(','))].join('\n') + '\n');
const matched = report.filter(r => r.reconciliation_status === 'MATCHED');
const unmatched = report.filter(r => r.reconciliation_status !== 'MATCHED');
const estimateTotal = matched.reduce((sum, r) => sum + Number(r.estimated_usd), 0);
const actualMatched = matched.reduce((sum, r) => sum + Number(r.actual_usd), 0);
const actualAll = report.reduce((sum, r) => sum + Number(r.actual_usd), 0);
console.log(`Invoice ${invoiceId}: ${normalized.length} lines imported idempotently.`);
console.log(`Matched jobs: ${matched.length}; unmatched/no-estimate rows: ${unmatched.length}.`);
console.log(`Matched estimates: $${estimateTotal.toFixed(4)}; matched actual: $${actualMatched.toFixed(4)}; matched variance: $${(actualMatched-estimateTotal).toFixed(4)}.`);
console.log(`All imported actual charges: $${actualAll.toFixed(4)}. Reconciliation report: ${out}`);
if (unmatched.length) console.warn('ACTION REQUIRED: inspect unmatched rows; invoice lines without task identifiers cannot be safely allocated per job.');
