const workspaceValues = ['service', 'creator'];
const kindValues = ['booking', 'client', 'deal', 'transaction'];
const flowValues = ['income', 'expense', 'none'];
const fail = (path, message) => ({ success: false, error: { issues: [{ path: path ? [path] : [], message }] } });
const ok = data => ({ success: true, data });
const obj = v => v && typeof v === 'object' && !Array.isArray(v);
const text = (v, max, min = 1) => typeof v === 'string' && v.trim().length >= min && v.trim().length <= max;
const emailValid = v => typeof v === 'string' && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const validDate = v => { if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false; const d = new Date(v + 'T00:00:00.000Z'); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,10) === v; };
function detailsValid(v) { return obj(v) && Object.values(v).every(x => x === null || ['string','number','boolean'].includes(typeof x)) && Object.values(v).every(x => typeof x !== 'string' || x.length <= 1000); }
const workspace = { safeParse(v) { return workspaceValues.includes(v) ? ok(v) : fail('workspace', 'Invalid workspace'); } };
const kind = { safeParse(v) { return kindValues.includes(v) ? ok(v) : fail('kind', 'Invalid record type'); } };
const register = { safeParse(v) { if (!obj(v) || Object.keys(v).some(k => !['name','email','password'].includes(k))) return fail('input','Invalid registration fields'); if (!text(v.name,80)) return fail('name','Name is required (max 80 characters)'); if (!emailValid(v.email)) return fail('email','Enter a valid email address'); if (typeof v.password !== 'string' || v.password.length < 10 || v.password.length > 128) return fail('password','Password must be 10–128 characters'); return ok({ name:v.name.trim(), email:v.email.trim().toLowerCase(), password:v.password }); } };
const login = { safeParse(v) { if (!obj(v) || Object.keys(v).some(k => !['email','password'].includes(k))) return fail('input','Invalid login fields'); if (!emailValid(v.email)) return fail('email','Enter a valid email address'); if (typeof v.password !== 'string' || !v.password.length || v.password.length > 128) return fail('password','Password is required'); return ok({email:v.email.trim().toLowerCase(),password:v.password}); } };
const recordCreate = { safeParse(v) {
  if (!obj(v) || Object.keys(v).some(k => !['workspace','kind','title','details','amount','flow_type','status','record_date'].includes(k))) return fail('input','Unexpected record field');
  if (!workspaceValues.includes(v.workspace)) return fail('workspace','Invalid workspace');
  if (!kindValues.includes(v.kind)) return fail('kind','Invalid record type');
  if ((v.workspace === 'service' && v.kind === 'deal') || (v.workspace === 'creator' && ['booking','client'].includes(v.kind))) return fail('kind','This record type is not available in the selected workspace');
  if (!text(v.title,240)) return fail('title','Title is required (max 240 characters)');
  const details = v.details === undefined ? {} : v.details; if (!detailsValid(details)) return fail('details','Details must contain simple values only');
  const amount = v.amount === undefined ? 0 : Number(v.amount); if (!Number.isFinite(amount) || amount < 0 || amount > 1e9) return fail('amount','Amount must be between 0 and 1,000,000,000');
  const flow_type = v.flow_type === undefined ? 'none' : v.flow_type; if (!flowValues.includes(flow_type)) return fail('flow_type','Invalid flow type');
  const status = v.status === undefined ? 'Active' : v.status; if (!text(status,60)) return fail('status','Status is required (max 60 characters)');
  const record_date = v.record_date === undefined ? null : v.record_date; if (record_date !== null && (!validDate(record_date))) return fail('record_date','Date must use YYYY-MM-DD');
  return ok({workspace:v.workspace,kind:v.kind,title:v.title.trim(),details,amount,flow_type,status:status.trim(),record_date});
} };
const recordPatch = { safeParse(v) {
  if (!obj(v) || Object.keys(v).some(k => !['title','details','amount','flow_type','status','record_date'].includes(k)) || !Object.keys(v).length) return fail('input','Invalid update fields');
  const out={};
  if ('title' in v) { if(!text(v.title,240)) return fail('title','Title is required (max 240 characters)'); out.title=v.title.trim(); }
  if ('details' in v) { if(!detailsValid(v.details)) return fail('details','Details must contain simple values only'); out.details=v.details; }
  if ('amount' in v) { const n=Number(v.amount); if(!Number.isFinite(n)||n<0||n>1e9) return fail('amount','Invalid amount'); out.amount=n; }
  if ('flow_type' in v) { if(!flowValues.includes(v.flow_type)) return fail('flow_type','Invalid flow type'); out.flow_type=v.flow_type; }
  if ('status' in v) { if(!text(v.status,60)) return fail('status','Invalid status'); out.status=v.status.trim(); }
  if ('record_date' in v) { if(v.record_date!==null&&(!validDate(v.record_date))) return fail('record_date','Date must use YYYY-MM-DD'); out.record_date=v.record_date; }
  return ok(out);
} };
module.exports = { workspace, kind, recordCreate, recordPatch, register, login };
