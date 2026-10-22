import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const dir=await mkdtemp(join(tmpdir(),'rojbey-production-'));
const origin='http://127.0.0.1:3200';
const admin=randomBytes(24).toString('hex'),staff=randomBytes(24).toString('hex');
let server,logs='';
const env={...process.env,NODE_ENV:'production',CRM_DEMO_MODE:'false',CRM_SESSION_SECRET:randomBytes(48).toString('hex'),CRM_ADMIN_PASSWORD:admin,CRM_STAFF_PASSWORD:staff,CRM_DATA_DIR:dir,CRM_DATA_PROVIDER:'local',CRM_APP_ORIGIN:origin};
async function start(){server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3200'],{env,stdio:['ignore','pipe','pipe']});server.stdout.on('data',b=>logs+=b);server.stderr.on('data',b=>logs+=b);for(let i=0;i<100;i++){try{if((await fetch(origin+'/api/auth')).ok)return;}catch{}if(server.exitCode!==null)throw Error('Server exited during startup');await new Promise(r=>setTimeout(r,100));}throw Error('Server startup timed out');}
async function stop(){if(server&&server.exitCode===null){const exited=new Promise(r=>server.once('exit',r));server.kill('SIGTERM');await exited;}}
async function post(route,body,cookie){return fetch(origin+route,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});}
async function login(role,password){const r=await post('/api/auth',{role,password});assert.equal(r.status,200);const header=r.headers.get('set-cookie');assert.ok(header.includes('HttpOnly'));assert.ok(header.includes('Secure'));return header.split(';')[0];}
try{
 await start();assert.equal((await (await fetch(origin+'/api/auth')).json()).demo,false);
 assert.equal((await post('/api/auth',{demo:true,role:'admin'})).status,401);
 assert.equal((await post('/api/auth',{role:'admin',password:'incorrect-test-password'})).status,401);
 const cookie=await login('admin',admin);const added=await post('/api/crm',{action:'customer.add',name:'Production smoke test'},cookie);assert.equal(added.status,200);const {id}=await added.json();
 const staffCookie=await login('staff',staff);assert.equal((await post('/api/crm',{action:'customer.update',id,name:'Denied'},staffCookie)).status,403);
 const tampered=cookie.slice(0,-1)+(cookie.endsWith('a')?'b':'a');assert.equal((await fetch(origin+'/api/crm',{headers:{Cookie:tampered}})).status,401);
 await stop();await start();const persisted=await (await fetch(origin+'/api/crm',{headers:{Cookie:cookie}})).json();assert.ok(persisted.customers.some(c=>c.id===id));
 assert.equal((await fetch(origin+'/api/auth',{method:'DELETE',headers:{Origin:origin,Cookie:cookie}})).status,200);
 console.log('PASS: production build startup, password login, demo bypass rejection, secure cookie, staff permissions, tamper rejection, data and session persistence after restart, logout.');
}catch(e){console.error(e.message);console.error(logs);process.exitCode=1;}finally{await stop();await rm(dir,{recursive:true,force:true});}
