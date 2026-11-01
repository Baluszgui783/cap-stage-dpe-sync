export const SOURCE = 'https://www.data.gouv.fr/api/1/datasets/r/7987214d-949e-4245-b005-5cc4e7a5df36';
export const SOURCE_PAGE = 'https://www.data.gouv.fr/datasets/annuaire-des-diagnostiqueurs-immobiliers';
export const normalize = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const organisations = [
  ['socotec','SOCOTEC','group'],['apave','APAVE','group'],['bureauveritas','Bureau Veritas','group'],['dekra','DEKRA','group'],['qualiconsult','Qualiconsult','group'],['acenvironnement','AC Environnement','group'],['adxgroupe','ADX Groupe','group'],['adxformation','ADX Groupe','group'],
  ['diagamter','Diagamter','network'],['agenda','AGENDA Diagnostics','network'],['exim','EX’IM','network'],['activexpertise','Activ’Expertise','network'],['arliane','Arliane','network'],['dimodiagnostic','Dimo Diagnostic','network']
];
export function organisation(name) { const key=normalize(name);const item=organisations.find(([token])=>key.includes(token));return item?{organisation:item[1],organisationType:item[2]}:{organisation:'Structure à qualifier',organisationType:'unverified'}; }
export function* csvRows(text) {
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted; }
    else if (!quoted && c === ';') { row.push(field); field = ''; }
    else if (!quoted && (c === '\n' || c === '\r')) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); if (row.some(Boolean)) yield row; row = []; field = '';
    } else field += c;
  }
  if (quoted) throw new Error('CSV tronqué : guillemets non fermés');
  if (field || row.length) { row.push(field); yield row; }
}
export function distance(lat, lon) {
  const rad = n => n * Math.PI / 180;
  const a = Math.sin(rad(lat - 48.9143) / 2) ** 2 + Math.cos(rad(48.9143)) * Math.cos(rad(lat)) * Math.sin(rad(lon - 2.3819) / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}
export function selectCompanies(text, communes, today = new Date().toISOString().slice(0, 10)) {
  const rows = csvRows(text); const header = rows.next().value?.map(h => h.replace(/^\uFEFF/, ''));
  const columns = ['Societe', 'Adresse', 'CP', 'Ville', 'email', 'Tel1', 'Type de certificat', 'Date début validité', 'Date fin validité'];
  if (!header || columns.some(h => !header.includes(h))) throw new Error('Format de l’annuaire officiel modifié');
  const ix = Object.fromEntries(header.map((h, i) => [h, i])); const seen = new Set(); const mails = new Set(); const result = [];
  for (const r of rows) {
    const get = k => (r[ix[k]] || '').trim(); const name = get('Societe'); const email = get('email').toLowerCase(); const cp = get('CP');
    if (!/^(75|77|78|91|92|93|94|95)\d{3}$/.test(cp) || !get('Type de certificat').includes('DPE') || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) continue;
    if (get('Date début validité') > today || get('Date fin validité') < today || !get('Date début validité') || !get('Date fin validité')) continue;
    const id = normalize(name); if (id.length < 3 || /^(noncommunique|neant|aucun|sans|independant|particulier|nc)$/.test(id) || seen.has(id) || mails.has(email)) continue;
    const commune = communes.find(c => c.codesPostaux.includes(cp) && normalize(c.nom) === normalize(get('Ville'))) || communes.find(c => c.codesPostaux.includes(cp));
    const [lon, lat] = commune?.centre?.coordinates || [null, null];
    result.push({ id, name, ...organisation(name), address: get('Adresse'), postcode: cp, city: get('Ville'), email, phone: get('Tel1'), certification: get('Type de certificat'), validUntil: get('Date fin validité'), lat, lon, distance: lat === null ? null : distance(lat, lon), source: SOURCE_PAGE, checked: today });
    seen.add(id); mails.add(email);
  }
  return result.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
}
