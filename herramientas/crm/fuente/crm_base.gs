/**
 * CRM MatixMedia · v1.3.0 (lectura automática de formularios)
 * Un CRM central para todos los clientes, con panel y conexiones propias por cliente.
 *
 * INSTALACIÓN (una sola vez):
 *  1. En la hoja MATIXMEDIA_CRM: Extensiones → Apps Script.
 *  2. Borrar lo que haya en Código.gs, pegar TODO este archivo y Guardar.
 *  3. Volver a la hoja y recargarla. Aparece el menú «MatixMedia».
 *  4. MatixMedia → Instalar o reparar el CRM (autorizar cuando lo pida).
 *  5. Para el panel web de clientes y los formularios: Implementar → Nueva implementación →
 *     Tipo «Aplicación web» → Ejecutar como «Yo» → Acceso «Cualquier persona» → Implementar.
 *     Copiar la URL que termina en /exec y pegarla en Config → «URL de la app web».
 *
 * Los tokens de Meta, TikTok y ChatGPT NUNCA van en celdas: se guardan en las propiedades
 * del script con MatixMedia → Conectar cliente.
 */
const CRM_VERSION = '1.3.0';
const HOJA = { leads: 'Leads', panel: 'Panel', clientes: 'Clientes', tiktok: 'TikTok_CSV', envios: 'Envios', config: 'Config' };
const COLS = ['id', 'cliente', 'fecha', 'origen', 'plataforma', 'campana', 'nombre', 'email', 'tel', 'ciudad', 'interes',
  'responsable', 'etapa', 'seguimiento', 'notas', 'f_contactado', 'f_calificado', 'f_venta', 'valor', 'motivo',
  'gclid', 'gbraid', 'wbraid', 'meta_lead', 'fbclid', 'tt_lead', 'ttclid', 'oppref', 'actualizado'];
const C = {}; COLS.forEach(function (k, i) { C[k] = i + 1; });
const NIN = COLS.length;
const CLI = ['cliente', 'activo', 'moneda', 'indicativo', 'meta_dataset', 'tiktok_set', 'openai_pixel', 'g_calificado',
  'g_venta', 'g_valor_cal', 'hoja_google', 'clave', 'clave_form', 'enlace', 'conexiones', 'notas'];
const K = {}; CLI.forEach(function (k, i) { K[k] = i + 1; });
const ETAPAS = ['Nuevo', 'Contactado', 'Calificado', 'Venta', 'Perdido'];
const ORIGENES = ['WhatsApp', 'Formulario web', 'Formulario Google', 'Formulario Meta', 'Formulario TikTok', 'Llamada', 'Venta directa', 'Otro'];
const PLATAFORMAS = ['Google', 'Meta', 'TikTok', 'ChatGPT', 'Orgánico', 'Otra'];
const ETAPA_FECHA = { Contactado: 'f_contactado', Calificado: 'f_calificado', Venta: 'f_venta' };
const PREVIAS = { Contactado: [], Calificado: ['f_contactado'], Venta: ['f_contactado', 'f_calificado'] };
const ESTADOS_FINALES = ['enviado', 'omitido'];
const SPEC = /*__SPEC__*/[];

/* ───────────────────────── Menú y permisos ───────────────────────── */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('MatixMedia')
    .addItem('Panel lateral del CRM', 'abrirPanelLateral')
    .addSeparator()
    .addItem('Agregar cliente', 'agregarCliente')
    .addItem('Sincronizar clientes con Drive (CLIENTES/)', 'sincronizarClientes')
    .addItem('Conectar cliente (Meta, TikTok, ChatGPT)', 'abrirConexiones')
    .addItem('Ver enlaces del cliente elegido en Panel', 'verEnlaces')
    .addItem('Crear pestaña de entrada TikTok (cliente elegido en Panel)', 'crearEntradaTikTok')
    .addItem('Leer formularios ahora', 'leerFormularios')
    .addSeparator()
    .addItem('Enviar ahora', 'enviarAhora')
    .addItem('Enviar en modo prueba', 'enviarPrueba')
    .addItem('Actualizar hojas de Google Ads', 'actualizarHojasGoogle')
    .addSeparator()
    .addItem('Activar automático (lectura cada 15 min + envío diario)', 'activarDiario')
    .addItem('Desactivar automático', 'desactivarDiario')
    .addItem('Instalar o reparar el CRM', 'instalarCRM')
    .addToUi();
}

/** Solo personas con edición en la hoja (bloquea llamadas anónimas desde la app web). */
function soloEquipo_() {
  const email = (Session.getActiveUser().getEmail() || '').toLowerCase();
  if (!email) throw new Error('Acceso solo para el equipo.');
  const ss = SpreadsheetApp.getActive();
  const permitidos = ss.getEditors().map(function (u) { return u.getEmail().toLowerCase(); });
  if (ss.getOwner()) permitidos.push(ss.getOwner().getEmail().toLowerCase());
  if (permitidos.indexOf(email) < 0) throw new Error('Acceso solo para el equipo.');
  return email;
}

function avisar_(msg) {
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) { console.log(msg); }
}

/* ───────────────────────── Instalación ───────────────────────── */

function instalarCRM() {
  soloEquipo_();
  const ss = SpreadsheetApp.getActive();
  if (!ss.getSheetByName(HOJA.leads)) ss.setSpreadsheetTimeZone('America/Bogota');
  const nuevas = {};
  SPEC.forEach(function (s, idx) {
    if (!ss.getSheetByName(s.n)) { ss.insertSheet(s.n, idx); nuevas[s.n] = true; }
  });
  SPEC.forEach(function (s) {
    const sh = ss.getSheetByName(s.n);
    const nueva = !!nuevas[s.n];
    s.c.forEach(function (e) {
      const r = sh.getRange(e.a);
      const esFormula = typeof e.v === 'string' && e.v.charAt(0) === '=';
      const fila1 = /^[A-Z]+1$/.test(e.a);
      if (e.v !== undefined) {
        if (esFormula) r.setFormula(e.v);
        else if (nueva || fila1 || r.getValue() === '') r.setValue(e.v);
      }
      if (nueva || fila1 || esFormula) {
        if (e.b) r.setFontWeight('bold');
        if (e.fc) r.setFontColor('#' + e.fc);
        if (e.fs && e.fs !== 11) r.setFontSize(e.fs);
        if (e.bg) r.setBackground('#' + e.bg);
        if (e.wr) r.setWrap(true);
      }
      if (e.nf) r.setNumberFormat(e.nf);
    });
    Object.keys(s.w).forEach(function (col) {
      sh.setColumnWidth(sh.getRange(col + '1').getColumn(), Math.round(s.w[col] * 7 + 5));
    });
    if (s.frz) {
      const fr = sh.getRange(s.frz);
      sh.setFrozenRows(fr.getRow() - 1); sh.setFrozenColumns(fr.getColumn() - 1);
    }
    if (s.tab) sh.setTabColor('#' + s.tab);
    // identidad MatixMedia: DM Sans en todo, Fraunces en los títulos, encabezado alto
    sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).setFontFamily('DM Sans');
    sh.setRowHeight(1, 34);
    s.dv.forEach(function (d) {
      const rule = d.f.charAt(0) === '='
        ? SpreadsheetApp.newDataValidation().requireValueInRange(ss.getRange(d.f.slice(1).replace(/\$/g, '')), true)
        : SpreadsheetApp.newDataValidation().requireValueInList(d.f.replace(/^"|"$/g, '').split(','), true);
      sh.getRange(d.r).setDataValidation(rule.setAllowInvalid(true).build());
    });
  });
  // formatos de fecha y números que la importación no siempre respeta
  const L = ss.getSheetByName(HOJA.leads);
  ['fecha', 'seguimiento', 'f_contactado', 'f_calificado', 'f_venta', 'actualizado'].forEach(function (k) {
    L.getRange(2, C[k], L.getMaxRows() - 1, 1).setNumberFormat('yyyy-mm-dd hh:mm');
  });
  L.getRange(2, C.valor, L.getMaxRows() - 1, 1).setNumberFormat('#,##0');
  L.getRange(2, C.tel, L.getMaxRows() - 1, 1).setNumberFormat('@');
  const P = ss.getSheetByName(HOJA.panel);
  P.getRange('C5:C9').setNumberFormat('0.0%'); P.getRange('E14:F19').setNumberFormat('0.0%');
  P.getRange('B10:B11').setNumberFormat('#,##0'); P.getRange('G14:G19').setNumberFormat('#,##0');
  P.getRange('F31:F80').setNumberFormat('yyyy-mm-dd hh:mm');
  P.getRange('M5:M40').setNumberFormat('#,##0'); P.getRange('N5:N40').setNumberFormat('0.0%');
  [[HOJA.panel, 'A1'], ['Instrucciones', 'A1']].forEach(function (x) {
    const h = ss.getSheetByName(x[0]); if (h) h.getRange(x[1]).setFontFamily('Fraunces').setFontSize(18).setFontWeight('normal');
  });
  // orden de pestañas
  SPEC.forEach(function (s, idx) { ss.setActiveSheet(ss.getSheetByName(s.n)); ss.moveActiveSheet(idx + 1); });
  const propias = SPEC.map(function (s) { return s.n; });
  ss.getSheets().forEach(function (h) {
    if (propias.indexOf(h.getName()) >= 0 || ss.getSheets().length <= 1) return;
    const a1 = String(h.getRange('A1').getValue() || '');
    if (h.getLastRow() === 0 || a1.indexOf('PASO 1:') === 0) ss.deleteSheet(h);
  });
  asegurarClaves_();
  ss.setActiveSheet(L);
  avisar_('CRM instalado (v' + CRM_VERSION + '). Siguiente paso: MatixMedia → Conectar cliente.');
}

/* ───────────────────────── Utilidades ───────────────────────── */

function hoja_(n) { return SpreadsheetApp.getActive().getSheetByName(n); }

function config_() {
  const v = hoja_(HOJA.config).getRange(2, 1, 40, 4).getValues();
  const o = {};
  v.forEach(function (r) { if (r[3]) o[r[3]] = r[1]; });
  o.dias = Number(o.dias) || 7;
  o.meta_version = o.meta_version || 'v23.0';
  o.crm = o.crm || 'CRM MatixMedia';
  return o;
}

function clientes_() {
  const sh = hoja_(HOJA.clientes);
  const n = Math.max(sh.getLastRow() - 1, 0);
  if (!n) return [];
  return sh.getRange(2, 1, n, CLI.length).getValues().map(function (r, i) {
    const o = { fila: i + 2 };
    CLI.forEach(function (k, j) { o[k] = r[j]; });
    o.cliente = String(o.cliente || '').trim();
    return o;
  }).filter(function (o) { return o.cliente; });
}

function cliente_(nombre) {
  const n = String(nombre || '').trim().toUpperCase();
  return clientes_().filter(function (c) { return c.cliente.toUpperCase() === n; })[0] || null;
}

function asegurarClaves_() {
  const sh = hoja_(HOJA.clientes);
  clientes_().forEach(function (c) {
    if (!c.clave) sh.getRange(c.fila, K.clave).setValue(clave_(16));
    if (!c.clave_form) sh.getRange(c.fila, K.clave_form).setValue(clave_(10));
  });
}

function clave_(n) {
  return Utilities.getUuid().replace(/-/g, '').slice(0, n);
}

function leads_() {
  const sh = hoja_(HOJA.leads);
  const n = Math.max(sh.getLastRow() - 1, 0);
  if (!n) return [];
  return sh.getRange(2, 1, n, NIN).getValues().map(function (r, i) {
    const o = { fila: i + 2 };
    COLS.forEach(function (k, j) { o[k] = r[j]; });
    return o;
  }).filter(function (o) { return o.id; });
}

function sha256_(s) {
  const b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8);
  return b.map(function (x) { const v = (x < 0 ? x + 256 : x).toString(16); return v.length === 1 ? '0' + v : v; }).join('');
}

function emailNorm_(e) {
  const s = String(e || '').trim().toLowerCase();
  return s.indexOf('@') > 0 ? s : '';
}

/** Dígitos con indicativo, sin '+' (Meta y ChatGPT). */
function telDigitos_(t, indicativo) {
  let d = String(t || '').replace(/[^0-9]/g, '').replace(/^0+/, '');
  if (!d) return '';
  if (d.length <= 10) d = String(indicativo || '57') + d;
  return d.length >= 8 && d.length <= 15 ? d : '';
}

/** Lee valores escritos a mano: 920.000 · 1.850.000,50 · 1,850,000.50 · $ 920000 */
function valorNum_(v) {
  if (typeof v === 'number') return v;
  let s = String(v || '').replace(/[^0-9.,-]/g, '');
  if (!s) return '';
  const p = s.lastIndexOf('.'), c = s.lastIndexOf(',');
  if (p >= 0 && c >= 0) {
    s = p > c ? s.replace(/,/g, '') : s.replace(/\./g, '').replace(',', '.');
  } else if (p >= 0) {
    if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  } else if (c >= 0) {
    s = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
  }
  const n = Number(s);
  return isNaN(n) ? '' : n;
}

function esFecha_(v) { return Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime()); }

function nuevoId_(sh) {
  const ids = sh.getRange(2, C.id, Math.max(sh.getLastRow() - 1, 1), 1).getValues();
  let max = 0;
  ids.forEach(function (r) { const m = String(r[0]).match(/^L-(\d+)$/); if (m) max = Math.max(max, Number(m[1])); });
  return 'L-' + String(max + 1).padStart(4, '0');
}

/** Llena fechas de etapa (y de las etapas previas si faltan). */
function marcarEtapa_(row, etapa, ahora) {
  const k = ETAPA_FECHA[etapa];
  if (!k) return;
  PREVIAS[etapa].forEach(function (p) { if (!esFecha_(row[C[p] - 1])) row[C[p] - 1] = ahora; });
  if (!esFecha_(row[C[k] - 1])) row[C[k] - 1] = ahora;
}

function normalizar_(v, lista) {
  const s = String(v || '').trim().toLowerCase();
  return lista.filter(function (x) { return x.toLowerCase() === s; })[0] || '';
}

/* ───────────────────────── Edición directa en la hoja ───────────────────────── */

function onEdit(e) {
  try {
    const sh = e.range.getSheet();
    if (sh.getName() !== HOJA.leads) return;
    const r0 = e.range.getRow(), nr = e.range.getNumRows();
    if (e.range.getColumn() > NIN || r0 + nr - 1 < 2) return;
    const ahora = new Date();
    for (let r = Math.max(2, r0); r < r0 + nr && r < r0 + 200; r++) {
      const rg = sh.getRange(r, 1, 1, NIN);
      const row = rg.getValues()[0];
      if (!row[C.nombre - 1] && !row[C.email - 1] && !row[C.tel - 1] && !row[C.id - 1]) continue;
      if (!row[C.id - 1]) row[C.id - 1] = nuevoId_(sh);
      if (!esFecha_(row[C.fecha - 1])) row[C.fecha - 1] = ahora;
      if (!row[C.etapa - 1]) row[C.etapa - 1] = 'Nuevo';
      marcarEtapa_(row, row[C.etapa - 1], ahora);
      row[C.actualizado - 1] = ahora;
      rg.setValues([row]);
    }
  } catch (err) { console.log('onEdit: ' + err); }
}

/* ───────────────────────── Operaciones de leads (equipo y panel web) ───────────────────────── */

function crearLead_(d, clienteFijo) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const sh = hoja_(HOJA.leads);
    const cli = cliente_(clienteFijo || d.cliente);
    if (!cli) throw new Error('Cliente no encontrado: ' + (clienteFijo || d.cliente));
    // evita duplicados de formularios instantáneos (reintentos de Zapier/Make)
    if (d.meta_lead || d.tt_lead) {
      const dup = leads_().filter(function (l) {
        return (d.meta_lead && String(l.meta_lead) === String(d.meta_lead)) || (d.tt_lead && String(l.tt_lead) === String(d.tt_lead));
      })[0];
      if (dup) return dup.id;
    }
    const ahora = new Date();
    const row = COLS.map(function () { return ''; });
    COLS.forEach(function (k, j) { if (d[k] !== undefined && d[k] !== null) row[j] = d[k]; });
    row[C.id - 1] = nuevoId_(sh);
    row[C.cliente - 1] = cli.cliente;
    row[C.fecha - 1] = esFecha_(d.fecha) ? d.fecha : ahora;
    row[C.origen - 1] = normalizar_(d.origen, ORIGENES) || 'Otro';
    row[C.plataforma - 1] = normalizar_(d.plataforma, PLATAFORMAS) || inferirPlataforma_(d);
    row[C.etapa - 1] = normalizar_(d.etapa, ETAPAS) || 'Nuevo';
    if (d.tel) row[C.tel - 1] = String(d.tel);
    if (d.valor !== undefined && d.valor !== '') row[C.valor - 1] = valorNum_(d.valor);
    marcarEtapa_(row, row[C.etapa - 1], ahora);
    row[C.actualizado - 1] = ahora;
    sh.getRange(sh.getLastRow() + 1, 1, 1, NIN).setValues([row]);
    return row[C.id - 1];
  } finally { lock.releaseLock(); }
}

function inferirPlataforma_(d) {
  if (d.gclid || d.gbraid || d.wbraid) return 'Google';
  if (d.meta_lead || d.fbclid) return 'Meta';
  if (d.tt_lead || d.ttclid) return 'TikTok';
  if (d.oppref) return 'ChatGPT';
  const s = String(d.utm_source || '').toLowerCase();
  if (/google|adwords/.test(s)) return 'Google';
  if (/facebook|instagram|meta|^fb|^ig/.test(s)) return 'Meta';
  if (/tiktok/.test(s)) return 'TikTok';
  if (/chatgpt|openai/.test(s)) return 'ChatGPT';
  return s ? 'Otra' : 'Orgánico';
}

/** cambios: {etapa, valor, motivo, seguimiento (Date|''), nota, responsable, interes} */
function actualizarLead_(id, cambios, clienteFijo) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const l = leads_().filter(function (x) { return x.id === id; })[0];
    if (!l) throw new Error('Lead no encontrado: ' + id);
    if (clienteFijo && String(l.cliente).toUpperCase() !== String(clienteFijo).toUpperCase()) throw new Error('Lead de otro cliente.');
    const sh = hoja_(HOJA.leads);
    const rg = sh.getRange(l.fila, 1, 1, NIN);
    const row = rg.getValues()[0];
    const ahora = new Date();
    const etapa = normalizar_(cambios.etapa, ETAPAS);
    if (etapa) { row[C.etapa - 1] = etapa; marcarEtapa_(row, etapa, ahora); }
    if (cambios.valor !== undefined && cambios.valor !== '') row[C.valor - 1] = valorNum_(cambios.valor);
    if (cambios.motivo !== undefined) row[C.motivo - 1] = cambios.motivo;
    if (cambios.seguimiento !== undefined) row[C.seguimiento - 1] = cambios.seguimiento;
    if (cambios.responsable !== undefined) row[C.responsable - 1] = cambios.responsable;
    if (cambios.interes !== undefined) row[C.interes - 1] = cambios.interes;
    if (cambios.nota) {
      const sello = Utilities.formatDate(ahora, SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 'yyyy-MM-dd HH:mm');
      row[C.notas - 1] = (row[C.notas - 1] ? row[C.notas - 1] + '\n' : '') + sello + ' · ' + cambios.nota;
    }
    row[C.actualizado - 1] = ahora;
    rg.setValues([row]);
    return true;
  } finally { lock.releaseLock(); }
}

function leadPublico_(l, tz) {
  const f = function (d) { return esFecha_(d) ? Utilities.formatDate(d, tz, "yyyy-MM-dd'T'HH:mm") : ''; };
  return { id: l.id, cliente: l.cliente, fecha: f(l.fecha), origen: l.origen, plataforma: l.plataforma, campana: l.campana,
    nombre: l.nombre, email: l.email, tel: String(l.tel || ''), ciudad: l.ciudad, interes: l.interes, responsable: l.responsable,
    etapa: l.etapa, seguimiento: f(l.seguimiento), notas: l.notas, valor: l.valor, motivo: l.motivo,
    f_contactado: f(l.f_contactado), f_calificado: f(l.f_calificado), f_venta: f(l.f_venta) };
}

function parseFechaLocal_(s) {
  if (!s) return '';
  return Utilities.parseDate(String(s).slice(0, 16), SpreadsheetApp.getActive().getSpreadsheetTimeZone(), "yyyy-MM-dd'T'HH:mm");
}

function datosCliente_(nombre) {
  const tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
  const ls = leads_().filter(function (l) { return String(l.cliente).toUpperCase() === nombre.toUpperCase(); });
  const res = { leads: ls.length, contactados: 0, calificados: 0, ventas: 0, perdidos: 0, valor: 0 };
  ls.forEach(function (l) {
    if (esFecha_(l.f_contactado)) res.contactados++;
    if (esFecha_(l.f_calificado)) res.calificados++;
    if (esFecha_(l.f_venta)) { res.ventas++; res.valor += Number(l.valor) || 0; }
    if (l.etapa === 'Perdido') res.perdidos++;
  });
  ls.sort(function (a, b) { return (b.fecha || 0) - (a.fecha || 0); });
  return { cliente: nombre, resumen: res, leads: ls.slice(0, 500).map(function (l) { return leadPublico_(l, tz); }),
    etapas: ETAPAS, origenes: ORIGENES, plataformas: PLATAFORMAS };
}

/* ───────────────────────── Panel lateral (equipo) ───────────────────────── */

function abrirPanelLateral() {
  soloEquipo_();
  const html = HtmlService.createHtmlOutput(htmlApp_('equipo', '')).setTitle('CRM MatixMedia');
  SpreadsheetApp.getUi().showSidebar(html);
}

function eq_inicio() {
  soloEquipo_();
  const sh = SpreadsheetApp.getActiveSheet();
  let elegido = String(hoja_(HOJA.panel).getRange('B2').getValue() || '');
  if (sh.getName() === HOJA.leads && sh.getActiveRange().getRow() >= 2) {
    const c = sh.getRange(sh.getActiveRange().getRow(), C.cliente).getValue();
    if (c) elegido = String(c);
  }
  return { clientes: clientes_().map(function (c) { return c.cliente; }), elegido: elegido };
}
function eq_datos(cliente) { soloEquipo_(); return datosCliente_(cliente); }
function eq_crear(d) { soloEquipo_(); d.fecha = d.fecha ? parseFechaLocal_(d.fecha) : ''; return crearLead_(d, d.cliente); }
function eq_guardar(id, cambios) {
  soloEquipo_();
  if (cambios.seguimiento !== undefined) cambios.seguimiento = parseFechaLocal_(cambios.seguimiento);
  return actualizarLead_(id, cambios, null);
}

/* ───────────────────────── App web: panel del cliente y receptor de formularios ───────────────────────── */

function clientePorClave_(k, campo) {
  if (!k || String(k).length < 8) return null;
  return clientes_().filter(function (c) { return String(c[campo]) === String(k) && c.activo !== 'No'; })[0] || null;
}

function doGet(e) {
  const k = (e && e.parameter && e.parameter.k) || '';
  const cli = clientePorClave_(k, 'clave');
  const out = cli ? htmlApp_('cliente', k) : '<p style="font-family:sans-serif;padding:24px">Enlace no válido o vencido. Pídele uno nuevo a MatixMedia.</p>';
  return HtmlService.createHtmlOutput(out).setTitle(cli ? 'CRM · ' + cli.cliente : 'CRM MatixMedia')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
function wp_datos(k) { const c = clientePorClave_(k, 'clave'); if (!c) throw new Error('Enlace no válido'); return datosCliente_(c.cliente); }
function wp_crear(k, d) {
  const c = clientePorClave_(k, 'clave'); if (!c) throw new Error('Enlace no válido');
  d.fecha = d.fecha ? parseFechaLocal_(d.fecha) : '';
  return crearLead_(d, c.cliente);
}
function wp_guardar(k, id, cambios) {
  const c = clientePorClave_(k, 'clave'); if (!c) throw new Error('Enlace no válido');
  if (cambios.seguimiento !== undefined) cambios.seguimiento = parseFechaLocal_(cambios.seguimiento);
  return actualizarLead_(id, cambios, c.cliente);
}

/** Recibe leads de formularios web, Zapier o Make. Campo obligatorio: k (clave de formularios del cliente). */
function doPost(e) {
  let p = {};
  try {
    if (e.postData && /json/.test(e.postData.type || '')) p = JSON.parse(e.postData.contents || '{}');
    else p = e.parameter || {};
  } catch (err) { p = e.parameter || {}; }
  const resp = function (o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); };
  if (p.user_column_data || p.google_key !== undefined) return resp(leadGoogle_(p));
  const cli = clientePorClave_(p.k || p.clave, 'clave_form');
  if (!cli) return resp({ ok: false, error: 'clave inválida' });
  const pick = function () { for (let i = 0; i < arguments.length; i++) { const v = p[arguments[i]]; if (v !== undefined && v !== '') return String(v).slice(0, 500); } return ''; };
  const d = {
    nombre: pick('nombre', 'name', 'full_name', 'first_name'), email: pick('email', 'correo'),
    tel: pick('telefono', 'tel', 'phone', 'phone_number', 'whatsapp'), ciudad: pick('ciudad', 'city'),
    interes: pick('interes', 'producto', 'servicio', 'product'), campana: pick('campana', 'utm_campaign', 'campaign', 'campaign_name'),
    origen: pick('origen') || (pick('meta_lead_id', 'leadgen_id') ? 'Formulario Meta' : (pick('tiktok_lead_id') ? 'Formulario TikTok' : 'Formulario web')),
    plataforma: pick('plataforma'), gclid: pick('gclid'), gbraid: pick('gbraid'), wbraid: pick('wbraid'),
    meta_lead: pick('meta_lead_id', 'leadgen_id', 'meta_lead'), fbclid: pick('fbclid'), tt_lead: pick('tiktok_lead_id', 'tt_lead'),
    ttclid: pick('ttclid'), oppref: pick('oppref'), utm_source: pick('utm_source'), notas: pick('notas', 'mensaje', 'message'),
    responsable: pick('responsable')
  };
  if (!d.nombre && !d.email && !d.tel) return resp({ ok: false, error: 'sin datos de contacto' });
  try { return resp({ ok: true, id: crearLead_(d, cli.cliente) }); }
  catch (err) { return resp({ ok: false, error: String(err.message || err) }); }
}

/** Webhook de formularios de Google Ads. En Google Ads: URL = URL de la app web; Clave = «Clave de formularios» del cliente. */
function leadGoogle_(p) {
  const cli = clientePorClave_(p.google_key, 'clave_form');
  if (!cli) return { message: 'google_key inválida' };
  const col = {}, extra = [];
  (p.user_column_data || []).forEach(function (c) {
    const id = String(c.column_id || ''), v = String(c.string_value || '').slice(0, 500);
    if (['FULL_NAME', 'FIRST_NAME', 'LAST_NAME', 'EMAIL', 'WORK_EMAIL', 'PHONE_NUMBER', 'WORK_PHONE', 'CITY'].indexOf(id) >= 0) col[id] = v;
    else if (v) extra.push((c.column_name || id) + ': ' + v);
  });
  const gid = String(p.lead_id || '').trim();
  if (gid && leads_().some(function (l) { return String(l.notas).indexOf('lead_id Google: ' + gid) >= 0; })) return {};
  const d = {
    nombre: col.FULL_NAME || [col.FIRST_NAME, col.LAST_NAME].filter(String).join(' '),
    email: col.EMAIL || col.WORK_EMAIL || '', tel: col.PHONE_NUMBER || col.WORK_PHONE || '', ciudad: col.CITY || '',
    gclid: String(p.gcl_id || ''), origen: 'Formulario Google', plataforma: 'Google',
    campana: p.campaign_id ? 'Campaña ' + p.campaign_id : '',
    notas: (p.is_test ? 'PRUEBA enviada desde Google Ads · ' : '') + (gid ? 'lead_id Google: ' + gid : '') + (extra.length ? '\n' + extra.join('\n') : '')
  };
  if (!d.nombre && !d.email && !d.tel) return { message: 'sin datos de contacto' };
  crearLead_(d, cli.cliente);
  return {};
}

/* ───────────────────────── Lectura automática de formularios ───────────────────────── */

function leerFormularios() { soloEquipo_(); avisar_(leerFormularios_()); }

function leerFormularios_() {
  const out = [];
  clientes_().forEach(function (c) {
    if (c.activo === 'No') return;
    try { const r = leerMeta_(c); if (r) out.push(r); } catch (e) { out.push(c.cliente + ' · Meta: error ' + (e.message || e)); }
  });
  try { const r = importarEntradas_(); if (r) out.push(r); } catch (e) { out.push('TikTok: error ' + (e.message || e)); }
  return out.length ? out.join('\n') : 'No hay formularios nuevos.';
}

function fechaMeta_(s) {
  const d = new Date(String(s || '').replace(/([+-]\d{2})(\d{2})$/, '$1:$2'));
  return isNaN(d.getTime()) ? new Date() : d;
}

function getJson_(url) {
  const r = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  let j = null; try { j = JSON.parse(r.getContentText()); } catch (e) { }
  if (r.getResponseCode() !== 200 || !j) throw new Error((j && j.error && j.error.message) || ('HTTP ' + r.getResponseCode()));
  return j;
}

/** Formularios instantáneos de Meta: lee la página del cliente con su token de página (permiso leads_retrieval). */
function leerMeta_(c) {
  const props = PropertiesService.getScriptProperties();
  const page = props.getProperty('META_PAGE::' + c.cliente), tok = props.getProperty('META_PAGE_TOKEN::' + c.cliente);
  if (!page || !tok) return '';
  const ver = String(config_().meta_version || 'v23.0');
  const base = 'https://graph.facebook.com/' + ver + '/';
  const desde = Number(props.getProperty('META_ULT::' + c.cliente)) || Math.floor(Date.now() / 1000) - 3 * 86400;
  const inicio = Math.floor(Date.now() / 1000);
  const forms = getJson_(base + encodeURIComponent(page) + '/leadgen_forms?fields=id,name&limit=200&access_token=' + encodeURIComponent(tok)).data || [];
  const filtro = encodeURIComponent(JSON.stringify([{ field: 'time_created', operator: 'GREATER_THAN', value: desde - 3600 }]));
  let n = 0;
  forms.forEach(function (f) {
    let url = base + f.id + '/leads?fields=id,created_time,field_data,campaign_name,ad_name,is_organic&limit=200&filtering=' + filtro + '&access_token=' + encodeURIComponent(tok);
    for (let pag = 0; url && pag < 20; pag++) {
      const j = getJson_(url);
      (j.data || []).forEach(function (ld) {
        const v = {}, extra = [];
        (ld.field_data || []).forEach(function (x) {
          const val = (x.values || []).join(', ');
          const k = String(x.name || '').toLowerCase();
          if (['full_name', 'first_name', 'last_name', 'email', 'phone_number', 'city'].indexOf(k) >= 0) v[k] = val; else if (val) extra.push(x.name + ': ' + val);
        });
        const d = { nombre: v.full_name || [v.first_name, v.last_name].filter(String).join(' '), email: v.email || '', tel: v.phone_number || '',
          ciudad: v.city || '', meta_lead: String(ld.id), fecha: fechaMeta_(ld.created_time), origen: 'Formulario Meta', plataforma: 'Meta',
          campana: ld.campaign_name || '', notas: 'Formulario: ' + (f.name || f.id) + (ld.is_organic ? ' (orgánico)' : '') + (extra.length ? '\n' + extra.join('\n') : '') };
        const antes = leads_().length;
        crearLead_(d, c.cliente);
        if (leads_().length > antes) n++;
      });
      url = j.paging && j.paging.next ? j.paging.next : '';
    }
  });
  props.setProperty('META_ULT::' + c.cliente, String(inicio));
  return n ? c.cliente + ' · Meta: ' + n + ' lead(s) nuevo(s)' : '';
}

const PREF_TT = 'TikTok · ';
const ENC_TT = ['Nombre', 'Email', 'Teléfono', 'Ciudad', 'Interés', 'Campaña', 'Lead ID', 'Importado al CRM'];

/** Crea la pestaña donde la integración nativa de TikTok (Herramientas → Leads → Conectar CRM → Google Sheets) escribe los leads del cliente. */
function crearEntradaTikTok() {
  soloEquipo_();
  const nombre = String(hoja_(HOJA.panel).getRange('B2').getValue() || '');
  const c = cliente_(nombre);
  if (!c) return avisar_('Elige un cliente en Panel → B2.');
  const ss = SpreadsheetApp.getActive(), n = PREF_TT + c.cliente;
  let sh = ss.getSheetByName(n);
  if (!sh) sh = ss.insertSheet(n, ss.getSheets().length);
  sh.getRange(1, 1, 1, ENC_TT.length).setValues([ENC_TT]).setFontWeight('bold');
  sh.setFrozenRows(1);
  avisar_('Pestaña «' + n + '» lista.\n\nEn TikTok Ads Manager: Herramientas → Leads → Conectar CRM → Google Sheets → elige esta hoja (MATIXMEDIA_CRM) y la pestaña «' + n +
    '». Une cada pregunta del formulario con su columna. No escribas en «Importado al CRM»: la llena el CRM.');
}

/** Pasa al CRM las filas nuevas de las pestañas «TikTok · CLIENTE». */
function importarEntradas_() {
  const ss = SpreadsheetApp.getActive();
  const alias = { nombre: /^(nombre|name|full.?name|nombre completo)$/i, email: /^(email|e-?mail|correo)/i, tel: /^(tel|tel[eé]fono|phone|celular|whatsapp)/i,
    ciudad: /^(ciudad|city)/i, interes: /^(inter[eé]s|producto|servicio)/i, campana: /^(campa[ñn]a|campaign)/i, tt_lead: /^(lead.?id|id del lead)$/i };
  const out = [];
  ss.getSheets().forEach(function (sh) {
    const nom = sh.getName();
    if (nom.indexOf(PREF_TT) !== 0) return;
    const cli = cliente_(nom.slice(PREF_TT.length));
    if (!cli) return;
    const last = sh.getLastRow(), nc = Math.max(sh.getMaxColumns(), ENC_TT.length);
    if (last < 2) return;
    const datos = sh.getRange(1, 1, last, nc).getValues();
    const enc = datos[0].map(function (h) { return String(h).trim(); });
    let colImp = enc.indexOf('Importado al CRM');
    if (colImp < 0) { colImp = enc.filter(String).length; sh.getRange(1, colImp + 1).setValue('Importado al CRM'); }
    let n = 0;
    for (let i = 1; i < datos.length; i++) {
      const fila = datos[i];
      if (String(fila[colImp] || '').trim()) continue;
      if (!fila.some(function (x) { return String(x).trim(); })) continue;
      const d = { origen: 'Formulario TikTok', plataforma: 'TikTok' }, extra = [];
      enc.forEach(function (h, j) {
        if (j === colImp || !h) return;
        const v = fila[j] === '' || fila[j] === null ? '' : String(fila[j]).trim();
        if (!v) return;
        const k = Object.keys(alias).filter(function (a) { return alias[a].test(h); })[0];
        if (k && !d[k]) d[k] = v; else extra.push(h + ': ' + v);
      });
      if (extra.length) d.notas = extra.join('\n');
      if (!d.nombre && !d.email && !d.tel) continue;
      const id = crearLead_(d, cli.cliente);
      sh.getRange(i + 1, colImp + 1).setValue(id);
      n++;
    }
    if (n) out.push(cli.cliente + ' · TikTok: ' + n + ' lead(s) nuevo(s)');
  });
  return out.join('\n');
}

function urlWeb_() {
  const u = String(config_().url_web || '').trim();
  if (u) return u;
  try { return ScriptApp.getService().getUrl() || ''; } catch (e) { return ''; }
}

function verEnlaces() {
  soloEquipo_();
  asegurarClaves_();
  const nombre = String(hoja_(HOJA.panel).getRange('B2').getValue() || '');
  const c = cliente_(nombre);
  if (!c) return avisar_('Elige un cliente en Panel → B2.');
  const url = urlWeb_();
  if (!url) return avisar_('Primero implementa la app web (Implementar → Nueva implementación → Aplicación web, ejecutar como «Yo», acceso «Cualquier persona») y pega la URL /exec en Config → «URL de la app web».');
  const enlace = url + '?k=' + c.clave;
  hoja_(HOJA.clientes).getRange(c.fila, K.enlace).setValue(enlace);
  const snippet = '<script>\n(function(){\n  var URL_CRM="' + url + '", CLAVE="' + c.clave_form + '";\n' +
    '  var ids=["gclid","gbraid","wbraid","fbclid","ttclid","oppref","utm_source","utm_campaign"];\n' +
    '  var q=new URLSearchParams(location.search);\n' +
    '  ids.forEach(function(k){ if(q.get(k)) try{ localStorage.setItem("mm_"+k,q.get(k)); }catch(e){} });\n' +
    '  window.mmEnviarLead=function(datos){\n' +
    '    ids.forEach(function(k){ var v; try{ v=localStorage.getItem("mm_"+k); }catch(e){} if(v&&!datos[k]) datos[k]=v; });\n' +
    '    datos.k=CLAVE;\n' +
    '    return fetch(URL_CRM,{method:"POST",mode:"no-cors",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams(datos)});\n' +
    '  };\n})();\n</script>';
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
  const html = '<div style="font-family:Arial,sans-serif;font-size:13px;line-height:1.5">' +
    '<p><b>Panel del cliente ' + esc(c.cliente) + '</b> (enlace privado, compártelo solo con el cliente):</p>' +
    '<textarea style="width:100%;height:46px">' + esc(enlace) + '</textarea>' +
    '<p><b>Formularios web</b>: pega este código en la web y, al enviar el formulario, llama a <code>mmEnviarLead({nombre, email, telefono, interes})</code>.</p>' +
    '<textarea style="width:100%;height:190px;font-family:monospace;font-size:11px">' + esc(snippet) + '</textarea>' +
    '<p><b>Formularios de Google Ads</b> (recurso de formulario → Integración de leads → Webhook): URL del webhook = <code>' + esc(url) + '</code> · Clave = <code>' + esc(c.clave_form) + '</code>. Usa «Enviar datos de prueba» para comprobarlo.</p>' +
    '<p><b>Zapier / Make</b> (opcional, si no usas la lectura directa): POST a la URL de arriba (sin <code>?k=</code>) con los campos <code>k=' + esc(c.clave_form) +
    '</code>, nombre, email, telefono, campana y <code>meta_lead_id</code> o <code>tiktok_lead_id</code>.</p></div>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(620).setHeight(600), 'Enlaces de ' + c.cliente);
}

/* ───────────────────────── Clientes y conexiones ───────────────────────── */

function agregarCliente() {
  soloEquipo_();
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('Agregar cliente', 'Nombre oficial (igual que su carpeta en Drive, en MAYÚSCULAS):', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const nombre = r.getResponseText().trim().toUpperCase();
  if (!nombre) return;
  if (cliente_(nombre)) return avisar_('Ese cliente ya existe.');
  agregarClienteNombre_(nombre);
  avisar_('Cliente ' + nombre + ' agregado. Ahora: MatixMedia → Conectar cliente.');
}

function agregarClienteNombre_(nombre) {
  const sh = hoja_(HOJA.clientes);
  const row = CLI.map(function () { return ''; });
  row[K.cliente - 1] = nombre; row[K.activo - 1] = 'Sí'; row[K.moneda - 1] = 'COP'; row[K.indicativo - 1] = '57';
  row[K.g_calificado - 1] = 'Lead calificado'; row[K.g_venta - 1] = 'Lead convertido';
  row[K.clave - 1] = clave_(16); row[K.clave_form - 1] = clave_(10);
  sh.getRange(sh.getLastRow() + 1, 1, 1, CLI.length).setValues([row]);
}

function sincronizarClientes() { soloEquipo_(); avisar_(sincronizarClientes_()); }

/** Agrega al CRM las carpetas nuevas de CLIENTES/ (ignora las que empiezan con «_»). Nunca borra clientes. */
function sincronizarClientes_() {
  const cfg = config_();
  const it = DriveApp.getFolderById(String(cfg.carpeta_clientes)).getFolders();
  const nuevos = [];
  while (it.hasNext()) {
    const n = it.next().getName().trim();
    if (!n || n.charAt(0) === '_' || cliente_(n)) continue;
    agregarClienteNombre_(n.toUpperCase());
    nuevos.push(n.toUpperCase());
  }
  return nuevos.length ? 'Clientes nuevos en el CRM: ' + nuevos.join(', ') : 'No hay clientes nuevos en CLIENTES/.';
}

function abrirConexiones() {
  soloEquipo_();
  const html = HtmlService.createHtmlOutput(htmlConexiones_()).setWidth(460).setHeight(680);
  SpreadsheetApp.getUi().showModalDialog(html, 'Conectar cliente');
}

function cx_inicio() {
  soloEquipo_();
  const props = PropertiesService.getScriptProperties();
  return clientes_().map(function (c) {
    return { cliente: c.cliente, meta_dataset: String(c.meta_dataset || ''), tiktok_set: String(c.tiktok_set || ''), openai_pixel: String(c.openai_pixel || ''),
      meta_token: !!props.getProperty('META_TOKEN::' + c.cliente), tiktok_token: !!props.getProperty('TIKTOK_TOKEN::' + c.cliente),
      openai_key: !!props.getProperty('OPENAI_KEY::' + c.cliente), meta_test: props.getProperty('META_TEST::' + c.cliente) || '',
      tiktok_test: props.getProperty('TIKTOK_TEST::' + c.cliente) || '', meta_page: props.getProperty('META_PAGE::' + c.cliente) || '',
      meta_page_token: !!props.getProperty('META_PAGE_TOKEN::' + c.cliente) };
  });
}

function cx_guardar(d) {
  soloEquipo_();
  const c = cliente_(d.cliente);
  if (!c) throw new Error('Cliente no encontrado');
  const sh = hoja_(HOJA.clientes);
  [['meta_dataset', 'meta_dataset'], ['tiktok_set', 'tiktok_set'], ['openai_pixel', 'openai_pixel']].forEach(function (p) {
    if (d[p[0]] !== undefined) sh.getRange(c.fila, K[p[1]]).setNumberFormat('@').setValue(String(d[p[0]]).trim());
  });
  const props = PropertiesService.getScriptProperties();
  [['meta_token', 'META_TOKEN::'], ['tiktok_token', 'TIKTOK_TOKEN::'], ['openai_key', 'OPENAI_KEY::'], ['meta_page_token', 'META_PAGE_TOKEN::']].forEach(function (p) {
    if (d[p[0]] === '__BORRAR__') props.deleteProperty(p[1] + c.cliente);
    else if (d[p[0]]) props.setProperty(p[1] + c.cliente, String(d[p[0]]).trim());
  });
  [['meta_test', 'META_TEST::'], ['tiktok_test', 'TIKTOK_TEST::'], ['meta_page', 'META_PAGE::']].forEach(function (p) {
    if (d[p[0]] !== undefined) {
      if (String(d[p[0]]).trim()) props.setProperty(p[1] + c.cliente, String(d[p[0]]).trim());
      else props.deleteProperty(p[1] + c.cliente);
    }
  });
  actualizarEstadoConexiones_();
  return true;
}

function actualizarEstadoConexiones_() {
  const sh = hoja_(HOJA.clientes);
  const props = PropertiesService.getScriptProperties();
  clientes_().forEach(function (c) {
    const m = c.meta_dataset && props.getProperty('META_TOKEN::' + c.cliente);
    const t = c.tiktok_set && props.getProperty('TIKTOK_TOKEN::' + c.cliente);
    const o = c.openai_pixel && props.getProperty('OPENAI_KEY::' + c.cliente);
    const g = c.hoja_google;
    const f = props.getProperty('META_PAGE::' + c.cliente) && props.getProperty('META_PAGE_TOKEN::' + c.cliente);
    const tt = !!SpreadsheetApp.getActive().getSheetByName(PREF_TT + c.cliente);
    sh.getRange(c.fila, K.conexiones).setValue('Envío: Meta ' + (m ? '✓' : '—') + ' · TikTok ' + (t ? '✓' : '—') +
      ' · ChatGPT ' + (o ? '✓' : '—') + ' · Google ' + (g ? '✓' : '—') + ' | Lectura: Meta ' + (f ? '✓' : '—') + ' · TikTok ' + (tt ? '✓' : '—'));
  });
}

/* ───────────────────────── Envíos a las plataformas ───────────────────────── */

function enviarAhora() { soloEquipo_(); avisar_(enviar_(false)); }
function enviarPrueba() { soloEquipo_(); avisar_(enviar_(true)); }
function envioDiario(e) {
  // solo desde el activador diario (evita que alguien lo dispare desde la app web)
  const uid = e && e.triggerUid;
  if (!uid || !ScriptApp.getProjectTriggers().some(function (t) { return t.getUniqueId() === String(uid); })) return;
  try { console.log(sincronizarClientes_()); } catch (e) { console.log('clientes: ' + e); }
  try { console.log(enviar_(false)); } catch (e) { console.log('envío: ' + e); }
  try { console.log(actualizarHojasGoogle_()); } catch (e) { console.log('google: ' + e); }
}

function lecturaFrecuente(e) {
  const uid = e && e.triggerUid;
  if (!uid || !ScriptApp.getProjectTriggers().some(function (t) { return t.getUniqueId() === String(uid); })) return;
  console.log(leerFormularios_());
}

function activarDiario() {
  soloEquipo_();
  desactivarDiario_();
  ScriptApp.newTrigger('envioDiario').timeBased().everyDays(1).atHour(5).create();
  ScriptApp.newTrigger('lecturaFrecuente').timeBased().everyMinutes(15).create();
  avisar_('Automático activado: lee los formularios cada 15 minutos y envía la calidad a las plataformas todos los días (5–6 a. m.).');
}
function desactivarDiario() { soloEquipo_(); desactivarDiario_(); avisar_('Automático desactivado.'); }
function desactivarDiario_() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (['envioDiario', 'lecturaFrecuente'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t); });
}

function registro_() {
  const sh = hoja_(HOJA.envios);
  const n = Math.max(sh.getLastRow() - 1, 0);
  const hechos = {};
  if (n) sh.getRange(2, 1, n, 7).getValues().forEach(function (r) {
    if (ESTADOS_FINALES.indexOf(r[6]) >= 0) hechos[r[0] + '|' + r[2]] = r[6];
  });
  return hechos;
}

/** Arma los eventos pendientes por cliente y plataforma. Devuelve {clave: {cli, plat, eventos:[{eid, etapa, t, l}]}} */
function pendientes_(cfg, hechos, ahora) {
  const limite = ahora.getTime() - cfg.dias * 86400000;
  const grupos = {}, omitidos = [];
  const etapas = [['lead', 'fecha'], ['contactado', 'f_contactado'], ['calificado', 'f_calificado'], ['venta', 'f_venta']];
  const clientes = {};
  clientes_().forEach(function (c) { clientes[c.cliente.toUpperCase()] = c; });
  leads_().forEach(function (l) {
    const plat = l.plataforma;
    if (['Meta', 'TikTok', 'ChatGPT'].indexOf(plat) < 0) return;
    const cli = clientes[String(l.cliente).toUpperCase()];
    if (!cli || cli.activo === 'No') return;
    etapas.forEach(function (et) {
      const t = l[et[1]];
      if (!esFecha_(t)) return;
      const eid = l.id + '-' + et[0];
      if (hechos[eid + '|' + plat]) return;
      if (t.getTime() < limite) { omitidos.push([eid, cli.cliente, plat, et[0], t, 'omitido', 'Más de ' + cfg.dias + ' días: la plataforma ya no lo acepta']); return; }
      if (t.getTime() > ahora.getTime() + 600000) return;
      const g = cli.cliente + '|' + plat;
      if (!grupos[g]) grupos[g] = { cli: cli, plat: plat, eventos: [] };
      grupos[g].eventos.push({ eid: eid, etapa: et[0], t: t, l: l });
    });
  });
  return { grupos: grupos, omitidos: omitidos };
}

function eventoMeta_(ev, cli, cfg) {
  const l = ev.l, ud = {};
  if (/^\d{15,17}$/.test(String(l.meta_lead).trim())) ud.lead_id = '__LID__' + String(l.meta_lead).trim();
  const em = emailNorm_(l.email); if (em) ud.em = [sha256_(em)];
  const ph = telDigitos_(l.tel, cli.indicativo); if (ph) ud.ph = [sha256_(ph)];
  if (l.fbclid && esFecha_(l.fecha)) ud.fbc = 'fb.1.' + l.fecha.getTime() + '.' + String(l.fbclid).trim();
  if (!Object.keys(ud).length) return null;
  const cd = { event_source: 'crm', lead_event_source: cfg.crm };
  if (ev.etapa === 'venta' && Number(l.valor)) { cd.value = Number(l.valor); cd.currency = cli.moneda || 'COP'; }
  return { event_name: cfg['meta_' + ev.etapa], event_time: Math.floor(ev.t.getTime() / 1000), action_source: 'system_generated',
    event_id: ev.eid, user_data: ud, custom_data: cd };
}

function eventoTikTok_(ev, cli, cfg) {
  const l = ev.l, user = {};
  const em = emailNorm_(l.email); if (em) user.email = sha256_(em);
  const ph = telDigitos_(l.tel, cli.indicativo); if (ph) user.phone = sha256_('+' + ph);
  if (l.ttclid) user.ttclid = String(l.ttclid).trim();
  const lead = l.tt_lead ? { lead_id: String(l.tt_lead).trim(), lead_event_source: cfg.crm } : null;
  if (!Object.keys(user).length && !lead) return null;
  const o = { event: cfg['tiktok_' + ev.etapa], event_time: Math.floor(ev.t.getTime() / 1000), event_id: ev.eid, user: user };
  if (lead) o.lead = lead;
  if (ev.etapa === 'venta' && Number(l.valor)) o.properties = { value: Number(l.valor), currency: cli.moneda || 'COP' };
  return o;
}

function eventoChatGPT_(ev, cli, cfg) {
  const l = ev.l, user = {};
  const em = emailNorm_(l.email); if (em) user.emails_sha256 = [sha256_(em)];
  const ph = telDigitos_(l.tel, cli.indicativo); if (ph) user.phone_numbers_sha256 = [sha256_(ph)];
  const oppref = String(l.oppref || '').trim();
  if (!Object.keys(user).length && !oppref) return null;
  const nombre = String(cfg['chatgpt_' + ev.etapa] || '');
  const estandar = ['lead_created', 'order_created', 'appointment_scheduled', 'registration_completed', 'subscription_created', 'trial_started', 'checkout_started'];
  const o = { id: ev.eid, timestamp_ms: ev.t.getTime(), action_source: l.origen === 'Llamada' ? 'phone_call' : 'offline', user: user };
  if (estandar.indexOf(nombre) >= 0) o.type = nombre; else { o.type = 'custom'; o.custom_event_name = nombre.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64); }
  if (oppref) o.oppref = oppref;
  if (ev.etapa === 'venta' && Number(l.valor)) o.data = { type: 'contents', amount: Math.round(Number(l.valor) * 100), currency: cli.moneda || 'COP' };
  return o;
}

function postJson_(url, body, headers) {
  const r = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: body, headers: headers || {}, muteHttpExceptions: true });
  let j = null; try { j = JSON.parse(r.getContentText()); } catch (e) { }
  return { code: r.getResponseCode(), json: j, text: r.getContentText().slice(0, 400) };
}

function enviarGrupo_(g, cfg, prueba) {
  const props = PropertiesService.getScriptProperties();
  const cli = g.cli, filas = [], ahora = new Date();
  const log = function (ev, estado, detalle) { filas.push([ev.eid, cli.cliente, g.plat, ev.etapa, ev.t, ahora, estado, String(detalle).slice(0, 500)]); };
  let url, armar, cuerpo, headers = {}, ok;
  if (g.plat === 'Meta') {
    const token = props.getProperty('META_TOKEN::' + cli.cliente);
    if (!cli.meta_dataset || !token) return { filas: [], nota: cli.cliente + ' · Meta: sin conectar' };
    url = 'https://graph.facebook.com/' + cfg.meta_version + '/' + String(cli.meta_dataset).trim() + '/events?access_token=' + encodeURIComponent(token);
    armar = eventoMeta_;
    cuerpo = function (evs) {
      const b = { data: evs }; const tc = props.getProperty('META_TEST::' + cli.cliente);
      if (prueba) { if (!tc) return null; b.test_event_code = tc; }
      return JSON.stringify(b).replace(/"lead_id":"__LID__(\d{15,17})"/g, '"lead_id":$1');
    };
    ok = function (r) { return r.code === 200 && r.json && r.json.events_received >= 0; };
  } else if (g.plat === 'TikTok') {
    const token = props.getProperty('TIKTOK_TOKEN::' + cli.cliente);
    if (!cli.tiktok_set || !token) return { filas: [], nota: cli.cliente + ' · TikTok: sin conectar' };
    url = 'https://business-api.tiktok.com/open_api/v1.3/event/track/';
    headers = { 'Access-Token': token };
    armar = eventoTikTok_;
    cuerpo = function (evs) {
      const b = { event_source: 'crm', event_source_id: String(cli.tiktok_set).trim(), data: evs };
      const tc = props.getProperty('TIKTOK_TEST::' + cli.cliente);
      if (prueba) { if (!tc) return null; b.test_event_code = tc; }
      return JSON.stringify(b);
    };
    ok = function (r) { return r.code === 200 && r.json && r.json.code === 0; };
  } else {
    const key = props.getProperty('OPENAI_KEY::' + cli.cliente);
    if (!cli.openai_pixel || !key) return { filas: [], nota: cli.cliente + ' · ChatGPT: sin conectar' };
    url = 'https://bzr.openai.com/v1/events?pid=' + encodeURIComponent(String(cli.openai_pixel).trim());
    headers = { Authorization: 'Bearer ' + key };
    armar = eventoChatGPT_;
    cuerpo = function (evs) { return JSON.stringify({ validate_only: !!prueba, integration_source: 'matixmedia_crm', events: evs }); };
    ok = function (r) { return r.code >= 200 && r.code < 300; };
  }
  const validos = [];
  g.eventos.forEach(function (ev) {
    const o = armar(ev, cli, cfg);
    if (!o) { if (!prueba) log(ev, 'omitido', 'Sin identificador (lead_id, email, teléfono o clic)'); }
    else validos.push({ ev: ev, o: o });
  });
  let enviados = 0, errores = 0;
  for (let i = 0; i < validos.length; i += 500) {
    const lote = validos.slice(i, i + 500);
    const body = cuerpo(lote.map(function (x) { return x.o; }));
    if (body === null) return { filas: filas, nota: cli.cliente + ' · ' + g.plat + ': falta el código de prueba (Conectar cliente)' };
    const r = postJson_(url, body, headers);
    const bien = ok(r);
    lote.forEach(function (x) {
      log(x.ev, prueba ? (bien ? 'prueba ok' : 'prueba error') : (bien ? 'enviado' : 'error'), bien ? (prueba ? 'Modo prueba' : 'OK') : (r.code + ' ' + r.text));
    });
    if (bien) enviados += lote.length; else errores += lote.length;
  }
  return { filas: filas, nota: cli.cliente + ' · ' + g.plat + ': ' + enviados + (prueba ? ' en prueba' : ' enviados') + (errores ? ', ' + errores + ' con error' : '') };
}

function enviar_(prueba) {
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const cfg = config_(), ahora = new Date();
    const p = pendientes_(cfg, registro_(), ahora);
    let filas = prueba ? [] : p.omitidos.map(function (o) { return [o[0], o[1], o[2], o[3], o[4], ahora, o[5], o[6]]; });
    const notas = [];
    Object.keys(p.grupos).forEach(function (k) {
      try {
        const r = enviarGrupo_(p.grupos[k], cfg, prueba);
        filas = filas.concat(r.filas); notas.push(r.nota);
      } catch (e) { notas.push(k + ': ' + e); }
    });
    if (filas.length) {
      const sh = hoja_(HOJA.envios);
      sh.getRange(sh.getLastRow() + 1, 1, filas.length, 8).setValues(filas);
    }
    return (prueba ? 'MODO PRUEBA\n' : '') + (notas.length ? notas.join('\n') : 'No hay eventos nuevos para enviar.');
  } finally { lock.releaseLock(); }
}

/* ───────────────────────── Google Ads: una hoja por cliente para Data Manager ───────────────────────── */

function actualizarHojasGoogle() { soloEquipo_(); avisar_(actualizarHojasGoogle_()); }

function actualizarHojasGoogle_() {
  const cfg = config_(), tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
  const sh = hoja_(HOJA.clientes);
  const limite = Date.now() - 90 * 86400000;
  const todos = leads_();
  const notas = [];
  clientes_().forEach(function (c) {
    if (c.activo === 'No') return;
    const filas = [];
    todos.forEach(function (l) {
      if (String(l.cliente).toUpperCase() !== c.cliente.toUpperCase() || l.plataforma !== 'Google') return;
      const em = emailNorm_(l.email), ph = telDigitos_(l.tel, c.indicativo);
      if (!l.gclid && !l.gbraid && !l.wbraid && !em && !ph) return;
      [['f_calificado', c.g_calificado || 'Lead calificado', c.g_valor_cal, '-calificado'],
       ['f_venta', c.g_venta || 'Lead convertido', l.valor, '-venta']].forEach(function (x) {
        const t = l[x[0]];
        if (!esFecha_(t) || t.getTime() < limite) return;
        filas.push([String(l.gclid || ''), String(l.gbraid || ''), String(l.wbraid || ''), em, ph ? '+' + ph : '', x[1],
          Utilities.formatDate(t, tz, 'yyyy-MM-dd HH:mm:ssZ'), x[2] === '' || x[2] === undefined ? '' : Number(x[2]) || '',
          c.moneda || 'COP', l.id + x[3]]);
      });
    });
    if (!filas.length && !c.hoja_google) return;
    let ss2;
    if (c.hoja_google) { try { ss2 = SpreadsheetApp.openByUrl(String(c.hoja_google)); } catch (e) { ss2 = null; } }
    if (!ss2) {
      ss2 = SpreadsheetApp.create('CRM_GoogleAds_' + c.cliente);
      try { DriveApp.getFileById(ss2.getId()).moveTo(carpetaCliente_(c.cliente, cfg)); } catch (e) { notas.push(c.cliente + ': hoja creada en Mi unidad (' + e.message + ')'); }
      sh.getRange(c.fila, K.hoja_google).setValue(ss2.getUrl());
    }
    const h = ss2.getSheets()[0];
    h.clearContents();
    const enc = ['Google Click ID', 'GBRAID', 'WBRAID', 'Email', 'Phone Number', 'Conversion Name', 'Conversion Time', 'Conversion Value', 'Conversion Currency', 'Order ID'];
    h.getRange(1, 1, 1, enc.length).setValues([enc]);
    if (filas.length) {
      h.getRange(2, 1, filas.length, 7).setNumberFormat('@'); h.getRange(2, 10, filas.length, 1).setNumberFormat('@');
      h.getRange(2, 1, filas.length, enc.length).setValues(filas);
    }
    notas.push(c.cliente + ': ' + filas.length + ' conversiones');
  });
  actualizarEstadoConexiones_();
  return notas.length ? 'Hojas de Google Ads actualizadas\n' + notas.join('\n') : 'No hay conversiones de Google para exportar.';
}

/** CLIENTES/<cliente>/Documentos/Reportes/Retorno_Leads (crea las subcarpetas que falten, nunca la del cliente). */
function carpetaCliente_(nombre, cfg) {
  const raiz = DriveApp.getFolderById(String(cfg.carpeta_clientes));
  const it = raiz.getFoldersByName(nombre);
  if (!it.hasNext()) throw new Error('no existe la carpeta del cliente en CLIENTES/');
  let f = it.next();
  ['Documentos', 'Reportes', 'Retorno_Leads'].forEach(function (n) {
    const s = f.getFoldersByName(n);
    f = s.hasNext() ? s.next() : f.createFolder(n);
  });
  return f;
}

/* ───────────────────────── HTML ───────────────────────── */

function htmlApp_(modo, k) {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_top">' + /*__CSS__*/'' + '</head><body data-modo="' + modo + '" data-k="' + k + '">' +
    /*__APP__*/'' + '</body></html>';
}

function htmlConexiones_() {
  return /*__CONEX__*/'';
}
