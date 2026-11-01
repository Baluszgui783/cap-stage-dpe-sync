import {test} from 'node:test';import assert from 'node:assert/strict';
import {buildCatalog,parisDate} from '../lib/catalog.mjs';
import {selectCompanies,SOURCE_PAGE} from '../lib/directory.mjs';
const now=new Date('2026-11-01T23:30:00Z');const checked='2026-11-02';
const company=(id,email='contact@example.test')=>({id,email,source:SOURCE_PAGE,checked,name:id,distance:1});
test('Paris date follows local midnight',()=>assert.equal(parisDate(now),checked));
test('Email changes preserve company ID, absent records and associated tracking are retained',()=>{
  const previous={companies:[company('exempledpe'),company('anciencabinet')],companyIds:{exempledpe:true,anciencabinet:true}};
  const tracking={anciencabinet:{notes:'Note de test',status:'Contacté',followUp:'2026-11-12',inclusion:'public',inclusionSource:'Source de test'}};
  const before=JSON.stringify({previous,tracking});
  const updated=buildCatalog(previous,[company('exempledpe','nouveau@example.test'),company('nouveaucabinet')],now,1);
  assert.equal(updated.companies.find(c=>c.id==='exempledpe').email,'nouveau@example.test');
  assert.equal(updated.companies.find(c=>c.id==='anciencabinet').directoryMissing,true);
  assert.equal(updated.companyIds.anciencabinet,true);assert.equal(updated.sync.added,1);
  assert.equal(JSON.stringify({previous,tracking}),before);assert.equal('tracking' in updated,false);
});
test('An anomalous drop, duplicate IDs or an invalid snapshot never yields a replacement',()=>{
  const previous={companies:Array.from({length:10},(_,i)=>company('cabinet'+i))};
  assert.throws(()=>buildCatalog(previous,[company('unseul')],now,1),/SOURCE_DROP_REJECTED/);
  assert.throws(()=>buildCatalog({companies:[]},[company('doublon'),company('doublon')],now,1),/SOURCE_INVALID/);
  assert.throws(()=>buildCatalog(previous,[],now),/SOURCE_DROP_REJECTED/);
});
test('Original parser retains current DPE only, all IDF departments, quoted separators and stable name IDs',()=>{
  const header='Societe;Adresse;CP;Ville;email;Tel1;Type de certificat;Date début validité;Date fin validité\n';
  const csv=header+'"Exemple; DPE";Adresse exemple;75001;Paris;a@example.test;0100000000;DPE;2026-01-01;2027-01-01\nHors region;Adresse;69001;Lyon;b@example.test;;DPE;2026-01-01;2027-01-01\nExpire;Adresse;93000;Bobigny;c@example.test;;DPE;2025-01-01;2025-12-31\nAutre;Adresse;94000;Creteil;d@example.test;;Amiante;2026-01-01;2027-01-01';
  const selected=selectCompanies(csv,[],checked);assert.equal(selected.length,1);assert.equal(selected[0].id,'exempledpe');
  assert.throws(()=>selectCompanies('Colonnes inconnues\n',[],checked),/Format/);
});
