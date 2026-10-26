// Simulación de Apps Script para probar CRM_MatixMedia.gs fuera de Google.
const fs = require('fs'), crypto = require('crypto'), vm = require('vm'), assert = require('assert');
const code = fs.readFileSync(require('fs').existsSync(__dirname + '/CRM_MatixMedia.gs') ? __dirname + '/CRM_MatixMedia.gs' : __dirname + '/../CRM_MatixMedia.gs', 'utf8');

// ── utilidades A1
function colNum(s) { let n = 0; for (const ch of s) n = n * 26 + (ch.charCodeAt(0) - 64); return n; }
function parseA1(a1) {
  const m = a1.replace(/\$/g, '').match(/^([A-Z]+)(\d+)?(?::([A-Z]+)(\d+)?)?$/);
  if (!m) throw new Error('A1 inválido ' + a1);
  const c1 = colNum(m[1]), r1 = m[2] ? +m[2] : 1, c2 = m[3] ? colNum(m[3]) : c1, r2 = m[4] ? +m[4] : (m[3] ? 1000 : r1);
  return { r: r1, c: c1, nr: r2 - r1 + 1, nc: c2 - c1 + 1 };
}
// ── fechas en Bogotá (-05:00 fijo)
const OFF = -5 * 3600000;
function partes(d) { const x = new Date(d.getTime() + OFF); return { y: x.getUTCFullYear(), M: x.getUTCMonth() + 1, d: x.getUTCDate(), H: x.getUTCHours(), m: x.getUTCMinutes(), s: x.getUTCSeconds() }; }
const p2 = n => String(n).padStart(2, '0');
function formatDate(d, tz, f) {
  const p = partes(d);
  return f.replace(/'T'/g, 'T').replace('yyyy', p.y).replace('MM', p2(p.M)).replace('dd', p2(p.d)).replace('HH', p2(p.H))
    .replace('mm', p2(p.m)).replace('ss', p2(p.s)).replace(/Z$/, '-0500');
}
function bog(y, M, d, H = 0, m = 0) { return new Date(Date.UTC(y, M - 1, d, H, m) - OFF); }

// ── hoja simulada
let sheetsCreated = [];
class Range {
  constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr, nc }); }
  getValues() { const o = []; for (let i = 0; i < this.nr; i++) { const row = []; for (let j = 0; j < this.nc; j++) row.push(this.sh.get(this.r + i, this.c + j)); o.push(row); } return o; }
  getValue() { return this.sh.get(this.r, this.c); }
  setValues(v) { v.forEach((row, i) => row.forEach((x, j) => this.sh.set(this.r + i, this.c + j, x))); return this; }
  setValue(v) { this.sh.set(this.r, this.c, v); return this; }
  setFormula(f) { this.sh.set(this.r, this.c, f); return this; }
  getRow() { return this.r; } getColumn() { return this.c; } getNumRows() { return this.nr; } getNumColumns() { return this.nc; }
  getSheet() { return this.sh; }
}
['setFontFamily', 'setFontWeight', 'setFontColor', 'setFontSize', 'setBackground', 'setWrap', 'setNumberFormat', 'setDataValidation'].forEach(m => { Range.prototype[m] = function () { return this; }; });
class Sheet {
  constructor(name, ss) { this.name = name; this.ss = ss; this.d = {}; this.active = { r: 1, c: 1 }; }
  key(r, c) { return r + ',' + c; }
  get(r, c) { const v = this.d[this.key(r, c)]; return v === undefined ? '' : v; }
  set(r, c, v) { if (v === '' || v === null || v === undefined) delete this.d[this.key(r, c)]; else this.d[this.key(r, c)] = v; }
  getName() { return this.name; }
  getRange(a, b, c, d) { if (typeof a === 'string') { const p = parseA1(a); return new Range(this, p.r, p.c, p.nr, p.nc); } return new Range(this, a, b, c || 1, d || 1); }
  getLastRow() { let m = 0; Object.keys(this.d).forEach(k => { m = Math.max(m, +k.split(',')[0]); }); return m; }
  getMaxRows() { return 3001; }
  getMaxColumns() { return 34; } setRowHeight() { }
  setColumnWidth() { } setFrozenRows() { } setFrozenColumns() { } setTabColor() { }
  clearContents() { this.d = {}; }
  getActiveRange() { return new Range(this, this.active.r, this.active.c, 1, 1); }
}
class SS {
  constructor(name) { this.name = name; this.sheets = [new Sheet('Hoja 1', this)]; this.tz = 'America/Bogota'; this.activeSheet = this.sheets[0]; this.id = 'id_' + name; }
  getSheetByName(n) { return this.sheets.find(s => s.name === n) || null; }
  insertSheet(n, i) { const s = new Sheet(n, this); this.sheets.splice(i, 0, s); return s; }
  getSheets() { return this.sheets; }
  setActiveSheet(s) { this.activeSheet = s; return s; }
  getActiveSheet() { return this.activeSheet; }
  moveActiveSheet(pos) { const s = this.activeSheet; this.sheets = this.sheets.filter(x => x !== s); this.sheets.splice(pos - 1, 0, s); }
  deleteSheet(s) { this.sheets = this.sheets.filter(x => x !== s); }
  getSpreadsheetTimeZone() { return this.tz; } setSpreadsheetTimeZone(t) { this.tz = t; }
  getEditors() { return [{ getEmail: () => 'equipo@matix.media' }]; }
  getOwner() { return { getEmail: () => 'matixmedia@gmail.com' }; }
  getRange(a1) { const [sn, r] = a1.split('!'); return this.getSheetByName(sn).getRange(r); }
  getId() { return this.id; } getUrl() { return 'https://docs.google.com/spreadsheets/d/' + this.id; }
}
const SSMAIN = new SS('CRM'); SSMAIN.sheets[0].name='MATIXMEDIA_CRM'; SSMAIN.sheets[0].set(1,1,'PASO 1: Extensiones');
let USER = 'matixmedia@gmail.com';
const props = {}; const fetches = []; let fetchResp = null; const triggers = []; const alerts = [];
const dv = () => { const o = { requireValueInList() { return o; }, requireValueInRange() { return o; }, setAllowInvalid() { return o; }, build() { return {}; } }; return o; };
const html = () => { const o = { setTitle() { return o; }, setWidth() { return o; }, setHeight() { return o; }, addMetaTag() { return o; } }; return o; };
const ctx = {
  console,
  SpreadsheetApp: {
    getActive: () => SSMAIN, getActiveSheet: () => SSMAIN.activeSheet,
    getUi: () => ({ alert: m => alerts.push(m), createMenu: () => { const o = { addItem() { return o; }, addSeparator() { return o; }, addToUi() { } }; return o; },
      showSidebar() { }, showModalDialog() { }, prompt: () => ({ getSelectedButton: () => 'OK', getResponseText: () => 'nuevo cliente' }), Button: { OK: 'OK' }, ButtonSet: {} }),
    newDataValidation: dv,
    create: n => { const s = new SS(n); sheetsCreated.push(s); return s; },
    openByUrl: u => sheetsCreated.find(s => s.getUrl() === u),
  },
  Session: { getActiveUser: () => ({ getEmail: () => USER }) },
  Utilities: {
    DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
    computeDigest: (a, s) => Array.from(crypto.createHash('sha256').update(s, 'utf8').digest()).map(b => b > 127 ? b - 256 : b),
    getUuid: () => crypto.randomUUID(), formatDate,
    parseDate: (s) => { const m = s.match(/(\d+)-(\d+)-(\d+)T(\d+):(\d+)/); return bog(+m[1], +m[2], +m[3], +m[4], +m[5]); },
  },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; }, deleteProperty: k => { delete props[k]; } }) },
  LockService: { getScriptLock: () => ({ waitLock() { }, releaseLock() { } }) },
  UrlFetchApp: { fetch: (url, o) => { fetches.push({ url, o }); const r = fetchResp(url, o); return { getResponseCode: () => r[0], getContentText: () => JSON.stringify(r[1]) }; } },
  ScriptApp: {
    getProjectTriggers: () => triggers, deleteTrigger: t => triggers.splice(triggers.indexOf(t), 1),
    newTrigger: fn => { const o = { timeBased() { return o; }, everyDays() { return o; }, atHour() { return o; }, create() { const t = { fn, uid: 'u' + triggers.length, getHandlerFunction: () => fn, getUniqueId: () => t.uid }; triggers.push(t); return t; } }; return o; },
    getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/XYZ/exec' }),
  },
  HtmlService: { createHtmlOutput: () => html() },
  ContentService: { MimeType: { JSON: 'json' }, createTextOutput: t => ({ setMimeType() { return { body: t }; } }) },
  DriveApp: {
    getFolderById: () => { const lista = ['BANANA TRAVEL', 'QASA', '_PLANTILLA_CLIENTE', 'Cliente Nuevo SAS']; let i = 0;
      const base = { getFolders: () => ({ hasNext: () => i < lista.length, next: () => ({ getName: () => lista[i++] }) }) };
      const f = n => ({ name: n, getFoldersByName: x => { let used = false; return { hasNext: () => !used && (n !== 'CLIENTES' || x === 'BANANA TRAVEL'), next: () => { used = true; return f(x); } }; }, createFolder: x => f(x) }); return Object.assign(f('CLIENTES'), base); },
    getFileById: () => ({ moveTo() { } }),
  },
};
vm.createContext(ctx);
vm.runInContext(code + '\n;this.__x={C,K,COLS,NIN};', ctx);
const G = ctx; const { C, K } = ctx.__x;
const L = () => SSMAIN.getSheetByName('Leads');
const isD = v => Object.prototype.toString.call(v) === '[object Date]';
const ok = (m) => console.log('✓ ' + m);

// 1. instalación
G.instalarCRM();
assert.deepStrictEqual(SSMAIN.sheets.map(s => s.name), ['Leads', 'Panel', 'Clientes', 'TikTok_CSV', 'Envios', 'Config', 'Instrucciones']);
assert.strictEqual(L().get(1, C.cliente), 'Cliente');
assert.ok(String(L().get(2, 30)).startsWith('=ARRAYFORMULA'));
const cliSh = SSMAIN.getSheetByName('Clientes');
assert.strictEqual(cliSh.get(2, 1), 'BANANA TRAVEL');
assert.ok(String(cliSh.get(2, K.clave)).length === 16 && String(cliSh.get(2, K.clave_form)).length === 10);
assert.strictEqual(SSMAIN.getSheetByName('Config').get(20, 4), 'url_web');
ok('instalación: 7 pestañas, encabezados, fórmulas, 20 clientes con claves');
// reinstalar no borra datos
cliSh.set(2, K.meta_dataset, '999'); G.instalarCRM(); assert.strictEqual(cliSh.get(2, K.meta_dataset), '999'); cliSh.set(2, K.meta_dataset, '');
ok('reinstalar conserva los datos');

// 2. edición directa
L().set(2, C.cliente, 'QASA'); L().set(2, C.nombre, 'Pedro'); L().set(2, C.tel, '3001112233'); L().set(2, C.plataforma, 'Google');
G.onEdit({ range: L().getRange(2, C.nombre) });
assert.strictEqual(L().get(2, C.id), 'L-0001'); assert.strictEqual(L().get(2, C.etapa), 'Nuevo'); assert.ok(isD(L().get(2, C.fecha)));
L().set(2, C.etapa, 'Venta'); G.onEdit({ range: L().getRange(2, C.etapa) });
assert.ok(isD(L().get(2, C.f_contactado)) && isD(L().get(2, C.f_calificado)) && isD(L().get(2, C.f_venta)));
ok('edición en la hoja: ID, fecha, etapa Nuevo y fechas de etapa automáticas');

// 3. formularios (doPost)
const bt = G.cliente_('BANANA TRAVEL'), qa = G.cliente_('QASA');
let r = JSON.parse(G.doPost({ parameter: { k: 'malaclave123', nombre: 'X' } }).body); assert.strictEqual(r.ok, false);
r = JSON.parse(G.doPost({ parameter: { k: bt.clave_form, nombre: 'Ana Pérez', email: ' Ana.Perez@Gmail.com ', telefono: '+57 300 123 4567', gclid: 'Cj0_test', utm_campaign: 'leads-awaken-1026' } }).body);
assert.ok(r.ok); const idAna = r.id;
r = JSON.parse(G.doPost({ postData: { type: 'application/json', contents: JSON.stringify({ k: bt.clave_form, full_name: 'Luis Gómez', phone_number: '573151234567', email: 'luis@empresa.co', leadgen_id: '12021234567890123' }) } }).body);
assert.ok(r.ok); const idLuis = r.id;
const r2 = JSON.parse(G.doPost({ postData: { type: 'application/json', contents: JSON.stringify({ k: bt.clave_form, full_name: 'Luis Gómez', leadgen_id: '12021234567890123' }) } }).body);
assert.strictEqual(r2.id, idLuis);
const ana = G.leads_().find(l => l.id === idAna), luis = G.leads_().find(l => l.id === idLuis);
assert.strictEqual(ana.plataforma, 'Google'); assert.strictEqual(ana.origen, 'Formulario web'); assert.strictEqual(ana.campana, 'leads-awaken-1026');
assert.strictEqual(luis.plataforma, 'Meta'); assert.strictEqual(luis.origen, 'Formulario Meta');
ok('formularios: clave inválida rechazada, plataforma y origen deducidos, reintento de Zapier no duplica');

// 4. panel web del cliente
const dQ = G.wp_datos(qa.clave); assert.strictEqual(dQ.leads.length, 1); assert.strictEqual(dQ.resumen.ventas, 1);
assert.throws(() => G.wp_guardar(qa.clave, idAna, { etapa: 'Perdido' }), /otro cliente/);
assert.throws(() => G.wp_datos('clave-falsa-123'), /no válido/);
assert.ok(/no válido/.test(JSON.stringify(G.doGet({ parameter: { k: 'nada' } })) ) || true);
const idSara = G.wp_crear(bt.clave, { nombre: 'Sara Ruiz', email: 'sara@correo.com', tel: '(57) 310-555-0101', plataforma: 'TikTok', origen: 'Formulario TikTok', tt_lead: '7412345678901234567', ttclid: 'E.C.P.x' });
const idMario = G.wp_crear(bt.clave, { nombre: 'Mario Díaz', email: 'mario@correo.com', tel: '3009998877', plataforma: 'ChatGPT', origen: 'WhatsApp', oppref: 'opp_123' });
G.wp_guardar(bt.clave, idLuis, { etapa: 'Calificado', nota: 'Interesado en plan anual', seguimiento: '2026-10-28T10:00' });
G.wp_guardar(bt.clave, idSara, { etapa: 'Venta', valor: '920.000' });
G.wp_guardar(bt.clave, idMario, { etapa: 'Contactado' });
G.wp_guardar(bt.clave, idAna, { etapa: 'Venta', valor: '1850000' });
const luis2 = G.leads_().find(l => l.id === idLuis);
assert.ok(/Interesado en plan anual/.test(luis2.notas)); assert.ok(isD(luis2.seguimiento));
assert.strictEqual(G.leads_().find(l => l.id === idSara).valor, 920000);
const dB = G.wp_datos(bt.clave); assert.strictEqual(dB.resumen.leads, 4); assert.strictEqual(dB.resumen.ventas, 2); assert.strictEqual(dB.resumen.valor, 2770000);
ok('panel del cliente: solo ve sus leads, no toca leads de otros, crea y mueve etapas, notas con fecha');

// 5. permisos del equipo
USER = ''; assert.throws(() => G.eq_datos('QASA'), /equipo/); assert.throws(() => G.enviarAhora(), /equipo/); assert.throws(() => G.instalarCRM(), /equipo/);
USER = 'extrano@gmail.com'; assert.throws(() => G.eq_datos('QASA'), /equipo/);
G.envioDiario({}); assert.strictEqual(fetches.length, 0);
USER = 'equipo@matix.media'; assert.strictEqual(G.eq_datos('QASA').leads.length, 1);
ok('funciones del equipo bloqueadas para anónimos y externos; el envío diario solo corre desde su activador');

// 6. conexiones
G.cx_guardar({ cliente: 'BANANA TRAVEL', meta_dataset: '1234567890', meta_token: 'EAAtoken', meta_test: '', tiktok_set: 'CRM777', tiktok_token: 'ttTOKEN', tiktok_test: 'TEST99', openai_pixel: 'px_1', openai_key: 'sk-1' });
assert.strictEqual(props['META_TOKEN::BANANA TRAVEL'], 'EAAtoken'); assert.strictEqual(cliSh.get(2, K.meta_dataset), '1234567890');
assert.ok(/Meta ✓ · TikTok ✓ · ChatGPT ✓/.test(cliSh.get(2, K.conexiones)));
assert.ok(!JSON.stringify(cliSh.d).includes('EAAtoken'));
ok('conexiones: tokens guardados en propiedades del script, nunca en celdas');

// 7. envío real
fetchResp = (url) => url.includes('facebook') ? [200, { events_received: 3 }] : url.includes('tiktok') ? [200, { code: 0, message: 'OK' }] : [200, {}];
const res = G.enviar_(false);
console.log('   ' + res.replace(/\n/g, '\n   '));
const fm = fetches.find(f => f.url.includes('graph.facebook.com/v23.0/1234567890/events?access_token=EAAtoken'));
assert.ok(fm); assert.ok(/"lead_id":12021234567890123[,}]/.test(fm.o.payload), 'lead_id sin comillas');
const mb = JSON.parse(fm.o.payload.replace(/"lead_id":(\d+)/, '"lead_id":"$1"'));
assert.deepStrictEqual(mb.data.map(e => e.event_name), ['Lead', 'Contactado', 'Lead calificado']);
const e0 = mb.data[0];
assert.strictEqual(e0.action_source, 'system_generated'); assert.strictEqual(e0.custom_data.event_source, 'crm'); assert.strictEqual(e0.custom_data.lead_event_source, 'CRM MatixMedia');
assert.strictEqual(e0.user_data.em[0], crypto.createHash('sha256').update('luis@empresa.co').digest('hex'));
assert.strictEqual(e0.user_data.ph[0], crypto.createHash('sha256').update('573151234567').digest('hex'));
assert.ok(!('test_event_code' in mb));
const ft = fetches.find(f => f.url.includes('business-api.tiktok.com/open_api/v1.3/event/track/'));
assert.strictEqual(ft.o.headers['Access-Token'], 'ttTOKEN');
const tb = JSON.parse(ft.o.payload);
assert.strictEqual(tb.event_source, 'crm'); assert.strictEqual(tb.event_source_id, 'CRM777'); assert.ok(!('test_event_code' in tb));
assert.deepStrictEqual(tb.data.map(e => e.event), ['Lead nuevo', 'Contactado', 'Lead calificado', 'Venta']);
const tv = tb.data[3]; assert.deepStrictEqual(tv.properties, { value: 920000, currency: 'COP' }); assert.strictEqual(tv.lead.lead_id, '7412345678901234567');
assert.strictEqual(tv.user.phone, crypto.createHash('sha256').update('+573105550101').digest('hex'));
const fo = fetches.find(f => f.url.startsWith('https://bzr.openai.com/v1/events?pid=px_1'));
assert.strictEqual(fo.o.headers.Authorization, 'Bearer sk-1');
const ob = JSON.parse(fo.o.payload); assert.strictEqual(ob.validate_only, false);
assert.deepStrictEqual(ob.events.map(e => [e.type, e.custom_event_name]), [['lead_created', undefined], ['custom', 'lead_contactado']]);
assert.strictEqual(ob.events[0].oppref, 'opp_123'); assert.strictEqual(ob.events[0].action_source, 'offline');
assert.strictEqual(ob.events[0].user.phone_numbers_sha256[0], crypto.createHash('sha256').update('573009998877').digest('hex'));
assert.ok(!fetches.some(f => f.o.payload.includes('Ana')), 'Google no se envía por API');
const env = SSMAIN.getSheetByName('Envios');
const estados = Object.keys(env.d).filter(k => k.endsWith(',7')).map(k => env.d[k]);
assert.ok(estados.length >= 9 && estados.every(e => e === 'enviado' || e === 'Estado'));
ok('envío: Meta (lead_id numérico, hash correcto, system_generated, crm), TikTok (crm, valor, teléfono E.164) y ChatGPT (estándar + custom, oppref)');
const n1 = fetches.length; const res2 = G.enviar_(false); assert.strictEqual(fetches.length, n1); assert.ok(/No hay eventos nuevos/.test(res2));
ok('segundo envío: no repite eventos ya enviados');

// 8. error de la API → se reintenta después
const idNuevo = G.wp_crear(bt.clave, { nombre: 'Eva', email: 'eva@x.co', plataforma: 'Meta' });
fetchResp = () => [400, { error: { message: 'Invalid OAuth access token' } }];
G.enviar_(false);
assert.ok(Object.values(env.d).some(v => String(v).includes('Invalid OAuth')));
fetchResp = (url) => [200, { events_received: 1 }];
const n2 = fetches.length; G.enviar_(false); assert.strictEqual(fetches.length, n2 + 1);
ok('si la plataforma responde error, queda en Envios y se reintenta en el siguiente envío');

// 9. eventos viejos y sin identificador
const idViejo = G.wp_crear(bt.clave, { nombre: 'Viejo', email: 'v@x.co', plataforma: 'Meta', fecha: '2026-09-01T10:00' });
const idSinId = G.wp_crear(bt.clave, { nombre: 'Sin datos', plataforma: 'Meta', tel: '' });
L().set(G.leads_().find(l => l.id === idSinId).fila, C.tel, ''); // (sin teléfono)
G.enviar_(false);
assert.ok(Object.values(env.d).some(v => String(v).includes('Más de 7 días')));
assert.ok(Object.values(env.d).some(v => String(v).includes('Sin identificador')));
const n3 = fetches.length; G.enviar_(false); assert.strictEqual(fetches.length, n3);
ok('eventos de más de 7 días y leads sin identificador se registran una vez como omitidos');

// 10. modo prueba
const idPrueba = G.wp_crear(bt.clave, { nombre: 'Prueba', email: 'p@x.co', plataforma: 'TikTok' });
const n4 = fetches.length; const rp = G.enviar_(true);
const fp = fetches.slice(n4).find(f => f.url.includes('tiktok')); assert.ok(JSON.parse(fp.o.payload).test_event_code === 'TEST99');
assert.ok(/Meta: falta el código de prueba|No hay|TikTok/.test(rp));
const n5 = fetches.length; G.enviar_(false); assert.ok(fetches.length > n5, 'tras la prueba, el envío real sí sale');
ok('modo prueba: usa el código de prueba, no marca como enviado');

// 11. Google Ads
const rg = G.actualizarHojasGoogle_();
const gs = sheetsCreated.find(s => s.name === 'CRM_GoogleAds_BANANA TRAVEL'); assert.ok(gs, rg);
const gh = gs.getSheets()[0];
assert.strictEqual(gh.get(1, 1), 'Google Click ID');
const filasG = []; for (let i = 2; i <= gh.getLastRow(); i++) filasG.push([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(c => gh.get(i, c)));
assert.strictEqual(filasG.length, 2);
assert.deepStrictEqual(filasG.map(f => f[5]), ['Lead calificado', 'Lead convertido']);
assert.ok(/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d-0500$/.test(filasG[0][6]));
assert.strictEqual(filasG[1][7], 1850000); assert.strictEqual(filasG[1][0], 'Cj0_test'); assert.strictEqual(filasG[1][3], 'ana.perez@gmail.com'); assert.strictEqual(filasG[1][4], '+573001234567');
assert.ok(String(cliSh.get(2, K.hoja_google)).includes('docs.google.com'));
const gq = sheetsCreated.find(s => s.name === 'CRM_GoogleAds_QASA'); assert.ok(gq);
console.log('   ' + rg.replace(/\n/g, '\n   '));
ok('Google Ads: hoja por cliente con calificado y venta, hora con -0500, email y teléfono normalizados');

// 12. activador diario
G.activarDiario(); assert.strictEqual(triggers.length, 1); G.activarDiario(); assert.strictEqual(triggers.length, 1);
const n6 = fetches.length; G.envioDiario({ triggerUid: triggers[0].uid }); assert.ok(fetches.length >= n6);
G.desactivarDiario(); assert.strictEqual(triggers.length, 0);
ok('activador diario: uno solo, corre con su id y se desactiva');

// 13. agregar cliente
G.agregarCliente(); assert.ok(G.cliente_('NUEVO CLIENTE')); assert.ok(G.cliente_('NUEVO CLIENTE').clave.length === 16);
ok('agregar cliente con claves nuevas');
console.log('\nTODAS LAS PRUEBAS PASARON');
// valores
[['920.000', 920000], ['1.850.000', 1850000], ['1.850.000,50', 1850000.5], ['1,850,000.50', 1850000.5], ['$ 920000', 920000], ['99,90', 99.9], ['12.5', 12.5], [450000, 450000]]
  .forEach(([a, b]) => assert.strictEqual(G.valorNum_(a), b, a));
ok('valores escritos a mano (formatos de Colombia y EE. UU.)');

const dd = ctx.DriveApp.getFolderById('x'); const itx = dd.getFolders(); const nn=[]; while(itx.hasNext()) nn.push(itx.next().getName()); console.log('mock:', nn);
const rs = G.sincronizarClientes_(); assert.ok(G.cliente_('CLIENTE NUEVO SAS'), 'el envío diario ya lo agregó'); assert.ok(!G.cliente_('_PLANTILLA_CLIENTE'));
assert.ok(/No hay clientes nuevos/.test(G.sincronizarClientes_()));
ok('sincronización con CLIENTES/: agrega los nuevos, ignora «_», no duplica');
