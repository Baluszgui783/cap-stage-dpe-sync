import {spawnSync} from 'node:child_process';
import {writeFile,unlink} from 'node:fs/promises';
// The official gh client uses the job's normal repository-scoped authentication.
// No credential retrieval or authenticated HTTP logging is performed here.
const repo=process.env.GITHUB_REPOSITORY;
if(repo!=='Baluszgui783/cap-stage-dpe-sync')throw new Error('REPOSITORY_REJECTED');
const resource=`repos/${repo}/contents/automation-status.json`;
const old=spawnSync('gh',['api',resource,'--jq','.sha'],{encoding:'utf8'});
const status={lastAttempt:new Date().toISOString(),result:process.env.SYNC_RESULT||'unknown',runId:process.env.GITHUB_RUN_ID};
const request={message:'chore: record weekly automation status',content:Buffer.from(JSON.stringify(status,null,2)+'\n').toString('base64'),...(old.status===0?{sha:old.stdout.trim()}:{})};
await writeFile('.heartbeat-request.json',JSON.stringify(request));
const result=spawnSync('gh',['api','--method','PUT',resource,'--input','.heartbeat-request.json','--silent'],{stdio:['ignore','ignore','ignore']});
await unlink('.heartbeat-request.json');
if(result.status!==0)throw new Error('HEARTBEAT_FAILED');
console.log('Technical status recorded; no business or personal data published.');
