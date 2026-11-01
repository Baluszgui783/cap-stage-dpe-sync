export function parisDate(now){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(p=>[p.type,p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export function buildCatalog(previous,incoming,now=new Date(),minimum=1000){
  if(!previous||!Array.isArray(previous.companies)||!Array.isArray(incoming))throw new Error('CATALOG_INVALID');
  const active=previous.companies.filter(c=>!c.directoryMissing).length;
  if(incoming.length<minimum||incoming.length<active*0.7)throw new Error('SOURCE_DROP_REJECTED');
  const ids=new Set();
  for(const c of incoming){
    if(!/^[a-z0-9]{3,200}$/.test(c.id)||ids.has(c.id)||!c.email||!c.source||c.checked!==parisDate(now))throw new Error('SOURCE_INVALID');
    ids.add(c.id);
  }
  const old=new Map(previous.companies.map(c=>[c.id,c]));
  const fresh=incoming.map(c=>({...c,directoryMissing:false}));
  // Never match companies by approximate names, or transfer a person's notes.
  // Retain absent records with their original IDs so followed companies remain available.
  const missing=previous.companies.filter(c=>!ids.has(c.id)).map(c=>({...c,directoryMissing:true}));
  const companies=[...fresh,...missing].sort((a,b)=>(a.distance??999)-(b.distance??999));
  const summary={active:incoming.length,added:incoming.filter(c=>!old.has(c.id)).length,missing:missing.length};
  return {companies,companyIds:Object.fromEntries(companies.map(c=>[c.id,true])),sync:{success:now.toISOString(),status:'idle',count:companies.length,sourceCount:summary.active,added:summary.added,missingCount:summary.missing,frequency:'weekly',day:'monday',timezone:'Europe/Paris'}};
}
