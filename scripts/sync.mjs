import {initializeApp,deleteApp} from 'firebase/app';
import {getAuth,signInWithEmailAndPassword,signOut} from 'firebase/auth';
import {getDatabase,get,ref,set} from 'firebase/database';
import {selectCompanies,SOURCE} from '../lib/directory.mjs';
import {buildCatalog,parisDate} from '../lib/catalog.mjs';

async function download(url,json=false){
  let failure;
  for(let attempt=0;attempt<3;attempt++){
    try{const r=await fetch(url,{signal:AbortSignal.timeout(90000)});if(!r.ok)throw new Error('SOURCE_UNAVAILABLE');if(Number(r.headers.get('content-length'))>100000000)throw new Error('SOURCE_TOO_LARGE');return json?await r.json():await r.text();}
    catch(e){failure=e;if(attempt<2)await new Promise(resolve=>setTimeout(resolve,2000*(attempt+1)));}
  }
  throw new Error('SOURCE_UNAVAILABLE');
}
async function main(){
  const config=JSON.parse(process.env.SYNC_CONFIG||'{}');
  if(!config.apiKey||!config.databaseURL||!config.projectId||!process.env.SYNC_PASSWORD)throw new Error('CONFIGURATION_MISSING');
  const app=initializeApp(config);const auth=getAuth(app);const db=getDatabase(app);
  try{
    try{await signInWithEmailAndPassword(auth,'sync@cap-stage-dpe.invalid',process.env.SYNC_PASSWORD);}catch{throw new Error('AUTHENTICATION_FAILED');}
    if(auth.currentUser?.uid!=='cap-stage-updater')throw new Error('IDENTITY_REJECTED');
    // Only /catalog is writable. /tracking (notes, status, history, reminders) is never read or written.
    const previous=(await get(ref(db,'catalog'))).val();
    const [csv,...groups]=await Promise.all([download(SOURCE),...['75','77','78','91','92','93','94','95'].map(dep=>download(`https://geo.api.gouv.fr/departements/${dep}/communes?fields=nom,codesPostaux,centre&format=json&geometry=centre`,true))]);
    if(groups.some(g=>!Array.isArray(g)||!g.length))throw new Error('GEOGRAPHY_INVALID');
    const now=new Date();const incoming=selectCompanies(csv,groups.flat(),parisDate(now));
    const catalog=buildCatalog(previous,incoming,now);
    await set(ref(db,'catalog'),catalog);
    console.log(JSON.stringify({success:true,active:catalog.sync.sourceCount,added:catalog.sync.added,missing:catalog.sync.missingCount,checked:catalog.sync.success}));
  }finally{await signOut(auth).catch(()=>{});await deleteApp(app);}
}
main().catch(e=>{console.error(/^[A-Z_]+$/.test(e.message)?e.message:'SYNC_FAILED');process.exitCode=1;});
