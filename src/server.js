const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
function loadEnv(file) { try { for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, ''); } } catch {} }
loadEnv(path.join(process.cwd(), '.env'));
const crypto = require('node:crypto');
const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';
const configuredSessionSecret = process.env.SESSION_SECRET;
if (isProduction && (!configuredSessionSecret || configuredSessionSecret.length < 32 || configuredSessionSecret === 'replace-this-with-a-long-random-secret')) {
  throw new Error('Set SESSION_SECRET to a unique random value of at least 32 characters in production.');
}
const sessionSecret = configuredSessionSecret || 'local-development-only-secret-change-before-deploy';
const db = require('./db');
const { recordCreate, recordPatch, register: registerSchema, login: loginSchema, workspace: workspaceSchema, kind: kindSchema } = require('./validation');
const PUBLIC = path.join(__dirname, '..', 'public');
const COOKIE = 'flowdesk.sid';
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const authAttempts = new Map();
const apiAttempts = new Map();
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon'};
const userById = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?');
const selectRecord = `SELECT id, user_id, workspace, kind, title, details, amount, flow_type, status, record_date, created_at, updated_at FROM records`;
function json(res, status, data, headers={}) { const body=JSON.stringify(data); res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Content-Length':Buffer.byteLength(body), 'Cache-Control':'no-store', ...headers}); res.end(body); }
function securityHeaders(res) { res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('X-Frame-Options','DENY'); res.setHeader('Referrer-Policy','no-referrer'); res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()'); res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data:; connect-src 'self'; font-src 'self' data: https://fonts.gstatic.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"); if(isProduction) res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains'); }
function parseCookies(req) { const out={}; for(const part of (req.headers.cookie||'').split(';')) { const i=part.indexOf('='); if(i>0) { try { out[part.slice(0,i).trim()]=decodeURIComponent(part.slice(i+1).trim()); } catch { /* Ignore malformed cookie values instead of failing the request. */ } } } return out; }
function tokenHash(token) { return crypto.createHmac('sha256',sessionSecret).update(token).digest('hex'); }
function sessionCookie(token, clear=false) { const parts=[`${COOKIE}=${clear?'':encodeURIComponent(token)}`,'Path=/','HttpOnly','SameSite=Lax']; if(isProduction) parts.push('Secure'); parts.push(`Max-Age=${clear?0:Math.floor(SESSION_MS/1000)}`); return parts.join('; '); }
function createSession(userId) { const token=crypto.randomBytes(32).toString('base64url'); db.prepare('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)').run(tokenHash(token),userId,Date.now()+SESSION_MS); return token; }
function getUser(req) { const token=parseCookies(req)[COOKIE]; if(!token) return null; const row=db.prepare('SELECT user_id,expires_at FROM sessions WHERE token_hash=?').get(tokenHash(token)); if(!row) return null; if(row.expires_at<Date.now()) { db.prepare('DELETE FROM sessions WHERE token_hash=?').run(tokenHash(token)); return null; } return userById.get(row.user_id)||null; }
function destroySession(req) { const token=parseCookies(req)[COOKIE]; if(token) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(tokenHash(token)); }
function parse(schema,input) { const r=schema.safeParse(input); if(!r.success) return {error:r.error.issues.map(i=>`${i.path.join('.')||'input'}: ${i.message}`).join('; ')}; return {data:r.data}; }
function serialize(row) { return {...row,amount:Number(row.amount),details:JSON.parse(row.details||'{}')}; }
function isUuid(v) { return typeof v==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v); }
async function readBody(req) { let raw=''; for await (const chunk of req) { raw+=chunk; if(Buffer.byteLength(raw)>65536) throw Object.assign(new Error('Request body is too large.'),{status:413}); } if(!raw) return {}; try { return JSON.parse(raw); } catch { throw Object.assign(new Error('Request body must be valid JSON.'),{status:400}); } }
function limited(map, key, max, windowMs) { const now=Date.now(), old=map.get(key); if(!old||now-old.start>windowMs) map.set(key,{start:now,count:1}); else old.count++; for(const [k,v] of map) if(now-v.start>windowMs*2) map.delete(k); return map.get(key).count>max; }
function passwordHash(password, salt=crypto.randomBytes(16).toString('hex')) { const hash=crypto.scryptSync(password,salt,64).toString('hex'); return `scrypt$${salt}$${hash}`; }
function passwordMatches(password, stored) { try { const [algo,salt,hex]=stored.split('$'); if(algo!=='scrypt'||!salt||!hex) return false; const actual=crypto.scryptSync(password,salt,64); const expected=Buffer.from(hex,'hex'); return actual.length===expected.length&&crypto.timingSafeEqual(actual,expected); } catch { return false; } }
function requireAuth(req,res) { const user=getUser(req); if(!user) { json(res,401,{error:'Please sign in to continue.'}); return null; } return user; }
async function handleApi(req,res,url) {
  const ip=req.socket.remoteAddress||'unknown';
  const mutating=['POST','PATCH','DELETE'].includes(req.method);
  if (mutating && url.pathname !== '/api/health') {
    if (req.method === 'POST' || req.method === 'PATCH') {
      const contentType=(req.headers['content-type']||'').split(';')[0].trim().toLowerCase();
      if (contentType !== 'application/json') return json(res,415,{error:'Content-Type must be application/json.'});
    }
    if (isProduction) {
      if (req.headers['sec-fetch-site'] === 'cross-site') return json(res,403,{error:'Cross-site requests are not allowed.'});
      const origin=req.headers.origin;
      if (!origin) return json(res,403,{error:'A same-origin request is required.'});
      try { if (new URL(origin).host !== req.headers.host) return json(res,403,{error:'Request origin is not allowed.'}); }
      catch { return json(res,403,{error:'Request origin is not allowed.'}); }
    }
  }
  if(limited(apiAttempts,ip,180,60000)) return json(res,429,{error:'Too many requests. Please try again shortly.'});
  if(req.method==='GET'&&url.pathname==='/api/health') return json(res,200,{ok:true,service:'flowdesk',timestamp:new Date().toISOString()});
  if(['POST'].includes(req.method)&&['/api/auth/register','/api/auth/login'].includes(url.pathname)) {
    if(limited(authAttempts,ip,15,15*60*1000)) return json(res,429,{error:'Too many attempts. Please wait a little and try again.'});
    const body=await readBody(req);
    if(url.pathname==='/api/auth/register') {
      const p=parse(registerSchema,body); if(p.error) return json(res,400,{error:p.error});
      if(db.prepare('SELECT id FROM users WHERE email=? COLLATE NOCASE').get(p.data.email)) return json(res,409,{error:'An account with this email already exists. Sign in instead.'});
      let result; try { result=db.prepare('INSERT INTO users (name,email,password_hash) VALUES (?,?,?)').run(p.data.name,p.data.email,passwordHash(p.data.password)); } catch(e) { if(String(e.code).includes('CONSTRAINT')) return json(res,409,{error:'An account with this email already exists.'}); throw e; }
      destroySession(req); const token=createSession(Number(result.lastInsertRowid)); return json(res,201,{user:userById.get(Number(result.lastInsertRowid))},{'Set-Cookie':sessionCookie(token)});
    }
    const p=parse(loginSchema,body); if(p.error) return json(res,400,{error:p.error});
    const user=db.prepare('SELECT id,name,email,password_hash,created_at FROM users WHERE email=? COLLATE NOCASE').get(p.data.email);
    if(!user||!passwordMatches(p.data.password,user.password_hash)) return json(res,401,{error:'Email or password is incorrect.'});
    destroySession(req); const token=createSession(user.id); return json(res,200,{user:userById.get(user.id)},{'Set-Cookie':sessionCookie(token)});
  }
  if(req.method==='POST'&&url.pathname==='/api/auth/logout') { const user=requireAuth(req,res); if(!user)return; destroySession(req); return json(res,200,{ok:true},{'Set-Cookie':sessionCookie('',true)}); }
  if(req.method==='GET'&&url.pathname==='/api/auth/me') { const user=requireAuth(req,res); if(!user)return; return json(res,200,{user}); }
  if(url.pathname==='/api/records'&&req.method==='GET') {
    const user=requireAuth(req,res); if(!user)return;
    const ws=workspaceSchema.safeParse(url.searchParams.get('workspace')||'service'); if(!ws.success)return json(res,400,{error:'Workspace must be service or creator.'});
    const where=['user_id=?','workspace=?'],params=[user.id,ws.data]; const k=url.searchParams.get('kind');
    if(k){const kr=kindSchema.safeParse(k);if(!kr.success)return json(res,400,{error:'Invalid record type.'});where.push('kind=?');params.push(kr.data);}
    const q=(url.searchParams.get('search')||'').trim().slice(0,100);if(q){where.push('(title LIKE ? OR details LIKE ? OR status LIKE ?)');params.push(`%${q}%`,`%${q}%`,`%${q}%`);}
    const rows=db.prepare(`${selectRecord} WHERE ${where.join(' AND ')} ORDER BY COALESCE(record_date,'9999-12-31') ASC, created_at DESC LIMIT 500`).all(...params);return json(res,200,{records:rows.map(serialize)});
  }
  if(url.pathname==='/api/records'&&req.method==='POST') {
    const user=requireAuth(req,res);if(!user)return;const body=await readBody(req),p=parse(recordCreate,body);if(p.error)return json(res,400,{error:p.error});const d=p.data,id=crypto.randomUUID();
    db.prepare('INSERT INTO records (id,user_id,workspace,kind,title,details,amount,flow_type,status,record_date) VALUES (?,?,?,?,?,?,?,?,?,?)').run(id,user.id,d.workspace,d.kind,d.title,JSON.stringify(d.details),d.amount,d.flow_type,d.status,d.record_date);
    return json(res,201,{record:serialize(db.prepare(`${selectRecord} WHERE id=? AND user_id=?`).get(id,user.id))});
  }
  const match=url.pathname.match(/^\/api\/records\/([^/]+)$/);
  if(match&&req.method==='PATCH') {
    const user=requireAuth(req,res);if(!user)return;const id=decodeURIComponent(match[1]);if(!isUuid(id))return json(res,400,{error:'Invalid record id.'});const body=await readBody(req),p=parse(recordPatch,body);if(p.error)return json(res,400,{error:p.error});const cols={title:'title',details:'details',amount:'amount',flow_type:'flow_type',status:'status',record_date:'record_date'},sets=[],values=[];
    for(const [k,v] of Object.entries(p.data)){sets.push(`${cols[k]}=?`);values.push(k==='details'?JSON.stringify(v):v??null);}sets.push("updated_at=datetime('now')");values.push(id,user.id);
    const result=db.prepare(`UPDATE records SET ${sets.join(',')} WHERE id=? AND user_id=?`).run(...values);if(!result.changes)return json(res,404,{error:'Record not found.'});return json(res,200,{record:serialize(db.prepare(`${selectRecord} WHERE id=? AND user_id=?`).get(id,user.id))});
  }
  if(match&&req.method==='DELETE') {const user=requireAuth(req,res);if(!user)return;const id=decodeURIComponent(match[1]);if(!isUuid(id))return json(res,400,{error:'Invalid record id.'});const r=db.prepare('DELETE FROM records WHERE id=? AND user_id=?').run(id,user.id);if(!r.changes)return json(res,404,{error:'Record not found.'});return json(res,200,{ok:true});}
  if(req.method==='POST'&&url.pathname==='/api/demo-data') {
    const user=requireAuth(req,res);if(!user)return;const body=await readBody(req),p=workspaceSchema.safeParse(body.workspace||'service');if(!p.success)return json(res,400,{error:'Invalid workspace.'});const ws=p.data,today=new Date(),date=n=>{const d=new Date(today);d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);};
    const samples=ws==='service'?[{kind:'booking',title:'Sample — Brand photography',details:{client:'Sample Client A',service:'Brand photography',time:'10:30 AM'},amount:8500,status:'Confirmed',record_date:date(1)},{kind:'client',title:'Sample Client A',details:{name:'Sample Client A',email:'client@example.com',company:'Sample Studio'},status:'Active'},{kind:'transaction',title:'Sample — Client payment',details:{category:'Client payment'},amount:18500,flow_type:'income',status:'Paid',record_date:date(0)},{kind:'transaction',title:'Sample — Equipment',details:{category:'Equipment'},amount:4200,flow_type:'expense',status:'Paid',record_date:date(0)}]:[{kind:'deal',title:'Sample — Northstar',details:{brand:'Northstar',campaign:'Autumn campaign',platform:'Instagram'},amount:24000,status:'In progress',record_date:date(7)},{kind:'transaction',title:'Sample — Brand campaign',details:{category:'Brand deal'},amount:24000,flow_type:'income',status:'Paid',record_date:date(0)}];
    const insert=db.prepare('INSERT INTO records (id,user_id,workspace,kind,title,details,amount,flow_type,status,record_date) VALUES (?,?,?,?,?,?,?,?,?,?)'),added=[];for(const s of samples){const id=crypto.randomUUID();insert.run(id,user.id,ws,s.kind,s.title,JSON.stringify(s.details),s.amount||0,s.flow_type||'none',s.status,s.record_date||null);added.push(serialize(db.prepare(`${selectRecord} WHERE id=? AND user_id=?`).get(id,user.id)));}return json(res,201,{added:added.length,records:added});
  }
  return json(res,404,{error:'API route not found.'});
}
function serveStatic(req,res,url) { let pathname=decodeURIComponent(url.pathname); if(pathname==='/')pathname='/index.html'; const resolved=path.resolve(PUBLIC,'.'+pathname); if(!resolved.startsWith(PUBLIC+path.sep)&&resolved!==PUBLIC)return json(res,403,{error:'Forbidden'}); fs.stat(resolved,(err,stat)=>{if(err||!stat.isFile()){if(path.extname(pathname))return json(res,404,{error:'Not found'});return fs.createReadStream(path.join(PUBLIC,'index.html')).on('error',()=>json(res,500,{error:'Unable to load application'})).pipe(res);}res.writeHead(200,{'Content-Type':mime[path.extname(resolved)]||'application/octet-stream','Cache-Control':'no-cache'});fs.createReadStream(resolved).pipe(res);}); }
const server=http.createServer(async(req,res)=>{securityHeaders(res);try{const url=new URL(req.url,'http://localhost');if(url.pathname.startsWith('/api/')){if(!['GET','POST','PATCH','DELETE'].includes(req.method))return json(res,405,{error:'Method not allowed.'},{Allow:'GET, POST, PATCH, DELETE'});return await handleApi(req,res,url);}return serveStatic(req,res,url);}catch(e){console.error('Flowdesk request error:',e);if(!res.headersSent)return json(res,e.status||500,{error:e.status?e.message:'Something went wrong. Please try again.'});res.destroy();}});
server.listen(PORT,()=>console.log(`Flowdesk running at http://localhost:${PORT}`));
function shutdown(){server.close(()=>{db.close();process.exit(0);});}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
module.exports={server};
