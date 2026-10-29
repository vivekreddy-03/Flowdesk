const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('health, auth, record CRUD and account isolation', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowdesk-test-'));
  const port = 31000 + Math.floor(Math.random() * 20000);
  const server = spawn(process.execPath, ['src/server.js'], {
    cwd: process.cwd(),
    env: {...process.env, PORT:String(port), NODE_ENV:'test', DB_PATH:path.join(dir,'test.sqlite'), DATA_DIR:dir, SESSION_SECRET:'test-secret-that-is-long-enough-for-this-suite'},
    stdio:'ignore'
  });
  const base = 'http://127.0.0.1:' + port;
  async function waitForServer() {
    for (let i=0;i<60;i++) {
      try { const r=await fetch(base+'/api/health'); if(r.ok)return; } catch {}
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    throw new Error('Server did not start');
  }
  async function request(url, options={}) {
    const r=await fetch(base+url,{...options,headers:{...(options.body?{'content-type':'application/json'}:{}),...(options.headers||{})}});
    return {status:r.status,body:await r.json().catch(()=>({})),cookie:r.headers.get('set-cookie')};
  }
  function cookieValue(setCookie){return setCookie ? setCookie.split(';')[0] : '';}
  t.after(()=>{server.kill('SIGTERM');fs.rmSync(dir,{recursive:true,force:true});});
  await waitForServer();
  assert.equal((await request('/api/health')).status,200);
  const a=await request('/api/auth/register',{method:'POST',body:JSON.stringify({name:'Pilot A',email:'a@example.com',password:'a-long-password-123'})});
  assert.equal(a.status,201);
  const cookieA=cookieValue(a.cookie);
  const b=await request('/api/auth/register',{method:'POST',body:JSON.stringify({name:'Pilot B',email:'b@example.com',password:'b-long-password-123'})});
  assert.equal(b.status,201);
  const cookieB=cookieValue(b.cookie);
  const created=await request('/api/records',{method:'POST',headers:{cookie:cookieA},body:JSON.stringify({workspace:'service',kind:'transaction',title:'Test income',amount:100,status:'Paid',flow_type:'income'})});
  assert.equal(created.status,201);
  const own=await request('/api/records?workspace=service',{headers:{cookie:cookieA}});
  assert.equal(own.body.records.length,1);
  const other=await request('/api/records?workspace=service',{headers:{cookie:cookieB}});
  assert.equal(other.body.records.length,0);
  const id=created.body.record.id;
  assert.equal((await request('/api/records/'+id,{method:'PATCH',headers:{cookie:cookieA},body:JSON.stringify({status:'Reconciled'})})).status,200);
  assert.equal((await request('/api/records/'+id,{method:'DELETE',headers:{cookie:cookieA}})).status,200);
});
