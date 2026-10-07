/** Actual @vercel/node packaging and plain-Node imports from isolated Lambda output. No env/auth/provider. */
import {cp,readFile,writeFile,mkdir,rm,mkdtemp} from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {tmpdir} from 'node:os';
const backend=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'), root=path.resolve(backend,'..');
const variant=process.argv.includes('--builder20')?'vercel-builder-20':'vercel-builder';
const loader=createRequire(path.join(backend,'.local',variant,'package.json'));
const builder=loader('@vercel/node');
const nativeLoader=createRequire(loader.resolve('@vercel/node'));
const {FileFsRef}=nativeLoader('@vercel/build-utils');
const settings=JSON.parse(await readFile(path.join(root,'vercel.json'),'utf8')).functions['api/*.ts'];
const checks=[];
const check=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);};
let failure;
// Vite watches tsconfig creation even below ignored .local. Keep the complete
// build mirror and Lambda artifacts outside the live repository to preserve drafts.
const folder=await mkdtemp(path.join(tmpdir(),'pflege-dashboard-vercel-artifact-')),
 mirror=path.join(folder,'source');
try{
 await mkdir(mirror,{recursive:true,mode:0o700});
 for(const name of ['package.json','package-lock.json','tsconfig.json','api','types','backend/package.json','backend/tsconfig.json','backend/runtime']){
  await mkdir(path.dirname(path.join(mirror,name)),{recursive:true});await cp(path.join(root,name),path.join(mirror,name),{recursive:true});
 }
 // Physical clone, not a symlink to source/env files outside the packaging boundary.
 await cp(path.join(root,'node_modules'),path.join(mirror,'node_modules'),{recursive:true,mode:constants.COPYFILE_FICLONE});
 for(const route of ['health','session','chat-stream','not-found']){
  const entrypoint=`api/${route}.ts`;
  // isDev ONLY skips upload/dependency reinstall. compile/tracing/Lambda construction is the actual builder.
  const result=await builder.build({files:{[entrypoint]:new FileFsRef({fsPath:path.join(mirror,entrypoint)})},entrypoint,workPath:mirror,repoRootPath:mirror,
   config:{...settings,zeroConfig:true},meta:{isDev:true,skipDownload:true}});
  const artifact=path.join(folder,route);await mkdir(artifact,{recursive:true});
  check(result.output.launcherType==='Nodejs',`${route}: actual Node Lambda output`);
  check(Object.hasOwn(result.output.files,'backend/runtime/cloud.js'),`${route}: compiled cloud.js packaged`);
  check(!Object.keys(result.output.files).some(f=>/(^|\/)\.env(?:\.|$)|env\.md$|backend\/\.local\//.test(f)),`${route}: no env/local files packaged`);
  for(const [name,file]of Object.entries(result.output.files)){
   const destination=path.resolve(artifact,name);check(destination.startsWith(artifact+path.sep),`${route}: artifact path inside own folder`);
   await mkdir(path.dirname(destination),{recursive:true});
   const bytes=file.type==='FileBlob'?Buffer.from(file.data):await readFile(file.fsPath);await writeFile(destination,bytes);
  }
  const code=`import entry from ${JSON.stringify(pathToFileURL(path.join(artifact,result.output.handler)).href)};
   const base='https://pflege-dashboard-puce.vercel.app';
   const request=new Request(base+${JSON.stringify(route==='not-found'?'/api/unknown':`/api/${route}`)},{method:${JSON.stringify(route==='health'?'GET':'POST')}});
   const response=await entry.fetch(request);console.log(JSON.stringify({status:response.status,body:await response.json()}));`;
  const {stdout}=await promisify(execFile)(process.execPath,['--input-type=module','-e',code],{cwd:artifact,timeout:20000,
   env:{PATH:process.env.PATH,HOME:process.env.HOME,LANG:'en_US.UTF-8'}});
  const response=JSON.parse(stdout);
  check(response.status===(route==='health'?200:route==='not-found'?404:401),`${route}: packaged entry executes expected HTTP response`);
  check(route==='health'?response.body.ok===true:response.body.error.code===(route==='not-found'?'RESOURCE_NOT_FOUND':'AUTH_REQUIRED'),`${route}: packaged JSON contract`);
 }
}catch(error){failure=error;}
finally {
 // Also covers failed clone/build/import checks, not just the successful path.
 try { await rm(folder,{recursive:true,force:true}); } catch(error) { failure??=error; }
}
const summary={passed:!failure,builder:nativeLoader('@vercel/node/package.json').version,node:process.version,checks:checks.filter(c=>!c.includes('artifact path')),allAssertions:checks.length,
 providerCalls:0,accountsCreated:0,serverStarted:false};
await writeFile(path.join(backend,`.local/vercel-artifact-${variant}-result.json`),JSON.stringify(summary,null,2)+'\n',{mode:0o600});
if(failure){console.error('Vercel-Paketprüfung fehlgeschlagen: '+failure.message);process.exitCode=1;}
else console.log(`${summary.checks.length} Vercel-Paketprüfungen bestanden, alle vier gebauten Einstiege tatsächlich ausgeführt; Prüfspeicher bereinigt.`);
