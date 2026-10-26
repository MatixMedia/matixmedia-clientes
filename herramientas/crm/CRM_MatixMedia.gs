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
const SPEC = [{"n":"Leads","tab":"E8C046","frz":"C2","w":{"A":10,"B":18,"C":17,"D":15,"E":11,"F":18,"G":20,"H":24,"I":17,"J":12,"K":18,"M":12,"N":15,"O":30,"P":16,"Q":16,"R":16,"T":18,"U":16,"V":12,"W":12,"X":17,"Y":16,"Z":17,"AA":16,"AB":16,"AC":17,"AD":22,"AE":15,"AF":22,"AG":22,"AH":22},"c":[{"a":"A1","v":"ID lead","b":1,"fc":"FFFFFF","bg":"04050A","wr":1},{"a":"B1","v":"Cliente","b":1,"fc":"FFFFFF","bg":"04050A","wr":1},{"a":"C1","v":"Fecha y hora del lead","b":1,"fc":"FFFFFF","bg":"04050A","wr":1},{"a":"D1","v":"Origen","b":1,"fc":"FFFFFF","bg":"04050A","wr":1},{"a":"E1","v":"Plataforma","b":1,"fc":"FFFFFF","bg":"04050A","wr":1},{"a":"F1","v":"Campaña","b":1,"fc":"FFFFFF","bg":"04050A","wr":1},{"a":"G1","v":"Nombre","b":1,"fc":"FFFFFF","bg":"04050A","wr":1},{"a":"H1","v":"Email","b":1,"fc":"FFFFFF","bg":"04050A","wr":1},{"a":"I1","v":"Teléfono con indicativo","b":1,"fc":"FFFFFF","bg":"04050A","wr":1},{"a":"J1","v":"Ciudad","b":1,"fc":"FFFFFF","bg":"04050A","wr":1},{"a":"K1","v":"Interés / producto","b":1,"fc":"FFFFFF","bg":"04050A","wr":1},{"a":"L1","v":"Responsable","b":1,"fc":"FFFFFF","bg":"04050A","wr":1},{"a":"M1","v":"Etapa","b":1,"fc":"04050A","bg":"E8C046","wr":1},{"a":"N1","v":"Próximo seguimiento","b":1,"fc":"04050A","bg":"E8C046","wr":1},{"a":"O1","v":"Notas","b":1,"fc":"04050A","bg":"E8C046","wr":1},{"a":"P1","v":"Fecha contactado","b":1,"fc":"04050A","bg":"E8C046","wr":1},{"a":"Q1","v":"Fecha calificado","b":1,"fc":"04050A","bg":"E8C046","wr":1},{"a":"R1","v":"Fecha venta","b":1,"fc":"04050A","bg":"E8C046","wr":1},{"a":"S1","v":"Valor de la venta","b":1,"fc":"04050A","bg":"E8C046","wr":1},{"a":"T1","v":"Motivo de pérdida","b":1,"fc":"04050A","bg":"E8C046","wr":1},{"a":"U1","v":"gclid","b":1,"fc":"FFFFFF","bg":"5A5A52","wr":1},{"a":"V1","v":"gbraid","b":1,"fc":"FFFFFF","bg":"5A5A52","wr":1},{"a":"W1","v":"wbraid","b":1,"fc":"FFFFFF","bg":"5A5A52","wr":1},{"a":"X1","v":"Meta lead_id","b":1,"fc":"FFFFFF","bg":"5A5A52","wr":1},{"a":"Y1","v":"fbclid","b":1,"fc":"FFFFFF","bg":"5A5A52","wr":1},{"a":"Z1","v":"TikTok lead_id","b":1,"fc":"FFFFFF","bg":"5A5A52","wr":1},{"a":"AA1","v":"ttclid","b":1,"fc":"FFFFFF","bg":"5A5A52","wr":1},{"a":"AB1","v":"oppref","b":1,"fc":"FFFFFF","bg":"5A5A52","wr":1},{"a":"AC1","v":"Última actualización","b":1,"fc":"FFFFFF","bg":"5A5A52","wr":1},{"a":"AD1","v":"email_norm","b":1,"fc":"FFFFFF","bg":"199477","wr":1},{"a":"AE1","v":"telefono_e164","b":1,"fc":"FFFFFF","bg":"199477","wr":1},{"a":"AF1","v":"iso_lead","b":1,"fc":"FFFFFF","bg":"199477","wr":1},{"a":"AG1","v":"iso_calificado","b":1,"fc":"FFFFFF","bg":"199477","wr":1},{"a":"AH1","v":"iso_venta","b":1,"fc":"FFFFFF","bg":"199477","wr":1},{"a":"AD2","v":"=ARRAYFORMULA(IF(H2:H3001=\"\",\"\",LOWER(TRIM(H2:H3001))))","fs":11},{"a":"AE2","v":"=ARRAYFORMULA(IF(I2:I3001=\"\",\"\",\"+\"&IF(LEN(REGEXREPLACE(TO_TEXT(I2:I3001),\"[^0-9]\",\"\"))<=10,IFERROR(VLOOKUP(B2:B3001,Clientes!$A$2:$D,4,FALSE),Config!$B$3)&REGEXREPLACE(TO_TEXT(I2:I3001),\"[^0-9]\",\"\"),REGEXREPLACE(TO_TEXT(I2:I3001),\"[^0-9]\",\"\"))))","fs":11},{"a":"AF2","v":"=ARRAYFORMULA(IF(C2:C3001=\"\",\"\",TEXT(C2:C3001,\"yyyy-mm-dd\")&\"T\"&TEXT(C2:C3001,\"hh:mm:ss\")&Config!$B$2))","fs":11},{"a":"AG2","v":"=ARRAYFORMULA(IF(Q2:Q3001=\"\",\"\",TEXT(Q2:Q3001,\"yyyy-mm-dd\")&\"T\"&TEXT(Q2:Q3001,\"hh:mm:ss\")&Config!$B$2))","fs":11},{"a":"AH2","v":"=ARRAYFORMULA(IF(R2:R3001=\"\",\"\",TEXT(R2:R3001,\"yyyy-mm-dd\")&\"T\"&TEXT(R2:R3001,\"hh:mm:ss\")&Config!$B$2))","fs":11}],"dv":[{"r":"D2:D3001","f":"\"WhatsApp,Formulario web,Formulario Google,Formulario Meta,Formulario TikTok,Llamada,Venta directa,Otro\""},{"r":"E2:E3001","f":"\"Google,Meta,TikTok,ChatGPT,Orgánico,Otra\""},{"r":"M2:M3001","f":"\"Nuevo,Contactado,Calificado,Venta,Perdido\""},{"r":"B2:B3001","f":"=Clientes!$A$2:$A$200"}]},{"n":"Panel","tab":"04050A","frz":null,"w":{"A":30,"B":15,"C":15,"D":15,"E":15,"F":15,"G":15,"I":24,"J":10,"K":12,"L":10,"M":14,"N":10},"c":[{"a":"A1","v":"PANEL DEL CRM","b":1,"fc":"04050A","fs":14},{"a":"A2","v":"Cliente (elegir) →","b":1,"fc":"04050A","fs":11},{"a":"B2","v":"BANANA TRAVEL","b":1,"fs":11,"bg":"FBF6E3"},{"a":"D2","v":"=\"Actualizado: \"&TEXT(NOW(),\"yyyy-mm-dd hh:mm\")","fc":"5B6170","fs":9},{"a":"A4","v":"Embudo del cliente","b":1,"fc":"FFFFFF","bg":"04050A"},{"a":"B4","v":"Cantidad","b":1,"fc":"FFFFFF","bg":"04050A"},{"a":"C4","v":"% de los leads","b":1,"fc":"FFFFFF","bg":"04050A"},{"a":"I4","v":"Todos los clientes","b":1,"fc":"FFFFFF","bg":"199477"},{"a":"J4","v":"Leads","b":1,"fc":"FFFFFF","bg":"199477"},{"a":"K4","v":"Calificados","b":1,"fc":"FFFFFF","bg":"199477"},{"a":"L4","v":"Ventas","b":1,"fc":"FFFFFF","bg":"199477"},{"a":"M4","v":"Valor ventas","b":1,"fc":"FFFFFF","bg":"199477"},{"a":"N4","v":"% venta","b":1,"fc":"FFFFFF","bg":"199477"},{"a":"A5","v":"Leads"},{"a":"B5","v":"=COUNTIF(Leads!B2:B3001,$B$2)"},{"a":"C5","v":"=IFERROR(B5/$B$5,0)","nf":"0.0%"},{"a":"I5","v":"=FILTER(Clientes!A2:A200,Clientes!A2:A200<>\"\",Clientes!B2:B200<>\"No\")","fs":11},{"a":"J5","v":"=MAP(I5:I40,LAMBDA(c,IF(c=\"\",\"\",COUNTIF(Leads!B2:B3001,c))))"},{"a":"K5","v":"=MAP(I5:I40,LAMBDA(c,IF(c=\"\",\"\",COUNTIFS(Leads!B2:B3001,c,Leads!Q2:Q3001,\"<>\"))))"},{"a":"L5","v":"=MAP(I5:I40,LAMBDA(c,IF(c=\"\",\"\",COUNTIFS(Leads!B2:B3001,c,Leads!R2:R3001,\"<>\"))))"},{"a":"M5","v":"=MAP(I5:I40,LAMBDA(c,IF(c=\"\",\"\",SUMIFS(Leads!S2:S3001,Leads!B2:B3001,c))))","nf":"#,##0"},{"a":"N5","v":"=MAP(J5:J40,L5:L40,LAMBDA(j,l,IF(j=\"\",\"\",IFERROR(l/j,0))))","nf":"0.0%"},{"a":"A6","v":"Contactados"},{"a":"B6","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!P2:P3001,\"<>\")"},{"a":"C6","v":"=IFERROR(B6/$B$5,0)","nf":"0.0%"},{"a":"A7","v":"Calificados"},{"a":"B7","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!Q2:Q3001,\"<>\")"},{"a":"C7","v":"=IFERROR(B7/$B$5,0)","nf":"0.0%"},{"a":"A8","v":"Ventas"},{"a":"B8","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!R2:R3001,\"<>\")"},{"a":"C8","v":"=IFERROR(B8/$B$5,0)","nf":"0.0%"},{"a":"A9","v":"Perdidos"},{"a":"B9","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!M2:M3001,\"Perdido\")"},{"a":"C9","v":"=IFERROR(B9/$B$5,0)","nf":"0.0%"},{"a":"A10","v":"Valor total de ventas"},{"a":"B10","v":"=SUMIFS(Leads!S2:S3001,Leads!B2:B3001,$B$2)","nf":"#,##0"},{"a":"A11","v":"Ticket promedio"},{"a":"B11","v":"=IFERROR(B10/B8,0)","nf":"#,##0"},{"a":"A13","v":"Por plataforma","b":1,"fc":"FFFFFF","bg":"04050A"},{"a":"B13","v":"Leads","b":1,"fc":"FFFFFF","bg":"04050A"},{"a":"C13","v":"Calificados","b":1,"fc":"FFFFFF","bg":"04050A"},{"a":"D13","v":"Ventas","b":1,"fc":"FFFFFF","bg":"04050A"},{"a":"E13","v":"% calificación","b":1,"fc":"FFFFFF","bg":"04050A"},{"a":"F13","v":"% venta","b":1,"fc":"FFFFFF","bg":"04050A"},{"a":"G13","v":"Valor ventas","b":1,"fc":"FFFFFF","bg":"04050A"},{"a":"A14","v":"Google"},{"a":"B14","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!E2:E3001,A14)"},{"a":"C14","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!E2:E3001,A14,Leads!Q2:Q3001,\"<>\")"},{"a":"D14","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!E2:E3001,A14,Leads!R2:R3001,\"<>\")"},{"a":"E14","v":"=IFERROR(C14/B14,0)","nf":"0.0%"},{"a":"F14","v":"=IFERROR(D14/B14,0)","nf":"0.0%"},{"a":"G14","v":"=SUMIFS(Leads!S2:S3001,Leads!B2:B3001,$B$2,Leads!E2:E3001,A14)","nf":"#,##0"},{"a":"A15","v":"Meta"},{"a":"B15","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!E2:E3001,A15)"},{"a":"C15","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!E2:E3001,A15,Leads!Q2:Q3001,\"<>\")"},{"a":"D15","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!E2:E3001,A15,Leads!R2:R3001,\"<>\")"},{"a":"E15","v":"=IFERROR(C15/B15,0)","nf":"0.0%"},{"a":"F15","v":"=IFERROR(D15/B15,0)","nf":"0.0%"},{"a":"G15","v":"=SUMIFS(Leads!S2:S3001,Leads!B2:B3001,$B$2,Leads!E2:E3001,A15)","nf":"#,##0"},{"a":"A16","v":"TikTok"},{"a":"B16","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!E2:E3001,A16)"},{"a":"C16","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!E2:E3001,A16,Leads!Q2:Q3001,\"<>\")"},{"a":"D16","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!E2:E3001,A16,Leads!R2:R3001,\"<>\")"},{"a":"E16","v":"=IFERROR(C16/B16,0)","nf":"0.0%"},{"a":"F16","v":"=IFERROR(D16/B16,0)","nf":"0.0%"},{"a":"G16","v":"=SUMIFS(Leads!S2:S3001,Leads!B2:B3001,$B$2,Leads!E2:E3001,A16)","nf":"#,##0"},{"a":"A17","v":"ChatGPT"},{"a":"B17","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!E2:E3001,A17)"},{"a":"C17","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!E2:E3001,A17,Leads!Q2:Q3001,\"<>\")"},{"a":"D17","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!E2:E3001,A17,Leads!R2:R3001,\"<>\")"},{"a":"E17","v":"=IFERROR(C17/B17,0)","nf":"0.0%"},{"a":"F17","v":"=IFERROR(D17/B17,0)","nf":"0.0%"},{"a":"G17","v":"=SUMIFS(Leads!S2:S3001,Leads!B2:B3001,$B$2,Leads!E2:E3001,A17)","nf":"#,##0"},{"a":"A18","v":"Orgánico"},{"a":"B18","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!E2:E3001,A18)"},{"a":"C18","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!E2:E3001,A18,Leads!Q2:Q3001,\"<>\")"},{"a":"D18","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!E2:E3001,A18,Leads!R2:R3001,\"<>\")"},{"a":"E18","v":"=IFERROR(C18/B18,0)","nf":"0.0%"},{"a":"F18","v":"=IFERROR(D18/B18,0)","nf":"0.0%"},{"a":"G18","v":"=SUMIFS(Leads!S2:S3001,Leads!B2:B3001,$B$2,Leads!E2:E3001,A18)","nf":"#,##0"},{"a":"A19","v":"Otra"},{"a":"B19","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!E2:E3001,A19)"},{"a":"C19","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!E2:E3001,A19,Leads!Q2:Q3001,\"<>\")"},{"a":"D19","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!E2:E3001,A19,Leads!R2:R3001,\"<>\")"},{"a":"E19","v":"=IFERROR(C19/B19,0)","nf":"0.0%"},{"a":"F19","v":"=IFERROR(D19/B19,0)","nf":"0.0%"},{"a":"G19","v":"=SUMIFS(Leads!S2:S3001,Leads!B2:B3001,$B$2,Leads!E2:E3001,A19)","nf":"#,##0"},{"a":"A21","v":"Por origen","b":1,"fc":"FFFFFF","bg":"04050A"},{"a":"B21","v":"Leads","b":1,"fc":"FFFFFF","bg":"04050A"},{"a":"C21","v":"Calificados","b":1,"fc":"FFFFFF","bg":"04050A"},{"a":"D21","v":"Ventas","b":1,"fc":"FFFFFF","bg":"04050A"},{"a":"A22","v":"WhatsApp"},{"a":"B22","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!D2:D3001,A22)"},{"a":"C22","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!D2:D3001,A22,Leads!Q2:Q3001,\"<>\")"},{"a":"D22","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!D2:D3001,A22,Leads!R2:R3001,\"<>\")"},{"a":"A23","v":"Formulario web"},{"a":"B23","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!D2:D3001,A23)"},{"a":"C23","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!D2:D3001,A23,Leads!Q2:Q3001,\"<>\")"},{"a":"D23","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!D2:D3001,A23,Leads!R2:R3001,\"<>\")"},{"a":"A24","v":"Formulario Google"},{"a":"B24","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!D2:D3001,A24)"},{"a":"C24","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!D2:D3001,A24,Leads!Q2:Q3001,\"<>\")"},{"a":"D24","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!D2:D3001,A24,Leads!R2:R3001,\"<>\")"},{"a":"A25","v":"Formulario Meta"},{"a":"B25","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!D2:D3001,A25)"},{"a":"C25","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!D2:D3001,A25,Leads!Q2:Q3001,\"<>\")"},{"a":"D25","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!D2:D3001,A25,Leads!R2:R3001,\"<>\")"},{"a":"A26","v":"Formulario TikTok"},{"a":"B26","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!D2:D3001,A26)"},{"a":"C26","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!D2:D3001,A26,Leads!Q2:Q3001,\"<>\")"},{"a":"D26","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!D2:D3001,A26,Leads!R2:R3001,\"<>\")"},{"a":"A27","v":"Llamada"},{"a":"B27","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!D2:D3001,A27)"},{"a":"C27","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!D2:D3001,A27,Leads!Q2:Q3001,\"<>\")"},{"a":"D27","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!D2:D3001,A27,Leads!R2:R3001,\"<>\")"},{"a":"A28","v":"Venta directa"},{"a":"B28","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!D2:D3001,A28)"},{"a":"C28","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!D2:D3001,A28,Leads!Q2:Q3001,\"<>\")"},{"a":"D28","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!D2:D3001,A28,Leads!R2:R3001,\"<>\")"},{"a":"A29","v":"Otro"},{"a":"B29","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!D2:D3001,A29)"},{"a":"C29","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!D2:D3001,A29,Leads!Q2:Q3001,\"<>\")"},{"a":"D29","v":"=COUNTIFS(Leads!B2:B3001,$B$2,Leads!D2:D3001,A29,Leads!R2:R3001,\"<>\")"},{"a":"A30","v":"Seguimientos para hoy o atrasados","b":1,"fc":"04050A","bg":"E8C046"},{"a":"B30","v":"Nombre","b":1,"fc":"04050A","bg":"E8C046"},{"a":"C30","v":"Teléfono","b":1,"fc":"04050A","bg":"E8C046"},{"a":"D30","v":"Responsable","b":1,"fc":"04050A","bg":"E8C046"},{"a":"E30","v":"Etapa","b":1,"fc":"04050A","bg":"E8C046"},{"a":"F30","v":"Seguimiento","b":1,"fc":"04050A","bg":"E8C046"},{"a":"A31","v":"=IFERROR(SORT(FILTER({Leads!A2:A3001,Leads!G2:G3001,Leads!I2:I3001,Leads!L2:L3001,Leads!M2:M3001,Leads!N2:N3001},Leads!B2:B3001=$B$2,Leads!N2:N3001<>\"\",Leads!N2:N3001<INT(TODAY())+1,Leads!M2:M3001<>\"Venta\",Leads!M2:M3001<>\"Perdido\"),6,TRUE),\"Sin seguimientos pendientes\")"}],"dv":[{"r":"B2","f":"=Clientes!$A$2:$A$200"}]},{"n":"Clientes","tab":"04050A","frz":"B2","w":{"A":22,"B":8,"C":8,"D":9,"E":20,"F":20,"G":18,"H":18,"I":18,"J":14,"K":30,"L":16,"M":16,"N":34,"O":34,"P":24},"c":[{"a":"A1","v":"Cliente","b":1,"fc":"FFFFFF","bg":"04050A","wr":1},{"a":"B1","v":"Activo","b":1,"fc":"FFFFFF","bg":"04050A","wr":1},{"a":"C1","v":"Moneda","b":1,"fc":"FFFFFF","bg":"04050A","wr":1},{"a":"D1","v":"Indicativo","b":1,"fc":"FFFFFF","bg":"04050A","wr":1},{"a":"E1","v":"Meta · ID del conjunto de datos","b":1,"fc":"FFFFFF","bg":"04050A","wr":1},{"a":"F1","v":"TikTok · ID del conjunto de eventos CRM","b":1,"fc":"FFFFFF","bg":"04050A","wr":1},{"a":"G1","v":"ChatGPT · Pixel ID","b":1,"fc":"FFFFFF","bg":"04050A","wr":1},{"a":"H1","v":"Google · conversión calificado","b":1,"fc":"FFFFFF","bg":"04050A","wr":1},{"a":"I1","v":"Google · conversión venta","b":1,"fc":"FFFFFF","bg":"04050A","wr":1},{"a":"J1","v":"Google · valor del lead calificado","b":1,"fc":"FFFFFF","bg":"04050A","wr":1},{"a":"K1","v":"Hoja para Google Ads (la crea el script)","b":1,"fc":"FFFFFF","bg":"5A5A52","wr":1},{"a":"L1","v":"Clave del panel (la crea el script)","b":1,"fc":"FFFFFF","bg":"5A5A52","wr":1},{"a":"M1","v":"Clave de formularios (la crea el script)","b":1,"fc":"FFFFFF","bg":"5A5A52","wr":1},{"a":"N1","v":"Enlace del panel (lo crea el script)","b":1,"fc":"FFFFFF","bg":"5A5A52","wr":1},{"a":"O1","v":"Conexiones (lo llena el script)","b":1,"fc":"FFFFFF","bg":"5A5A52","wr":1},{"a":"P1","v":"Notas","b":1,"fc":"FFFFFF","bg":"04050A","wr":1},{"a":"A2","v":"BANANA TRAVEL"},{"a":"B2","v":"Sí","bg":"FBF6E3"},{"a":"C2","v":"COP","bg":"FBF6E3"},{"a":"D2","v":"57","bg":"FBF6E3"},{"a":"E2","bg":"FBF6E3"},{"a":"F2","bg":"FBF6E3"},{"a":"G2","bg":"FBF6E3"},{"a":"H2","v":"Lead calificado","bg":"FBF6E3"},{"a":"I2","v":"Lead convertido","bg":"FBF6E3"},{"a":"J2","bg":"FBF6E3"},{"a":"A3","v":"BIMEL BY MANUB"},{"a":"B3","v":"Sí","bg":"FBF6E3"},{"a":"C3","v":"COP","bg":"FBF6E3"},{"a":"D3","v":"57","bg":"FBF6E3"},{"a":"E3","bg":"FBF6E3"},{"a":"F3","bg":"FBF6E3"},{"a":"G3","bg":"FBF6E3"},{"a":"H3","v":"Lead calificado","bg":"FBF6E3"},{"a":"I3","v":"Lead convertido","bg":"FBF6E3"},{"a":"J3","bg":"FBF6E3"},{"a":"A4","v":"CAFÉ ESCOBAR"},{"a":"B4","v":"Sí","bg":"FBF6E3"},{"a":"C4","v":"COP","bg":"FBF6E3"},{"a":"D4","v":"57","bg":"FBF6E3"},{"a":"E4","bg":"FBF6E3"},{"a":"F4","bg":"FBF6E3"},{"a":"G4","bg":"FBF6E3"},{"a":"H4","v":"Lead calificado","bg":"FBF6E3"},{"a":"I4","v":"Lead convertido","bg":"FBF6E3"},{"a":"J4","bg":"FBF6E3"},{"a":"A5","v":"DENTIPLAN PLUS"},{"a":"B5","v":"Sí","bg":"FBF6E3"},{"a":"C5","v":"COP","bg":"FBF6E3"},{"a":"D5","v":"57","bg":"FBF6E3"},{"a":"E5","bg":"FBF6E3"},{"a":"F5","bg":"FBF6E3"},{"a":"G5","bg":"FBF6E3"},{"a":"H5","v":"Lead calificado","bg":"FBF6E3"},{"a":"I5","v":"Lead convertido","bg":"FBF6E3"},{"a":"J5","bg":"FBF6E3"},{"a":"A6","v":"DIOS TODO LO HACE NUEVO"},{"a":"B6","v":"Sí","bg":"FBF6E3"},{"a":"C6","v":"COP","bg":"FBF6E3"},{"a":"D6","v":"57","bg":"FBF6E3"},{"a":"E6","bg":"FBF6E3"},{"a":"F6","bg":"FBF6E3"},{"a":"G6","bg":"FBF6E3"},{"a":"H6","v":"Lead calificado","bg":"FBF6E3"},{"a":"I6","v":"Lead convertido","bg":"FBF6E3"},{"a":"J6","bg":"FBF6E3"},{"a":"A7","v":"HALS LILIANA JONES"},{"a":"B7","v":"Sí","bg":"FBF6E3"},{"a":"C7","v":"COP","bg":"FBF6E3"},{"a":"D7","v":"57","bg":"FBF6E3"},{"a":"E7","bg":"FBF6E3"},{"a":"F7","bg":"FBF6E3"},{"a":"G7","bg":"FBF6E3"},{"a":"H7","v":"Lead calificado","bg":"FBF6E3"},{"a":"I7","v":"Lead convertido","bg":"FBF6E3"},{"a":"J7","bg":"FBF6E3"},{"a":"A8","v":"HOTEL CABO DE LA VELA"},{"a":"B8","v":"Sí","bg":"FBF6E3"},{"a":"C8","v":"COP","bg":"FBF6E3"},{"a":"D8","v":"57","bg":"FBF6E3"},{"a":"E8","bg":"FBF6E3"},{"a":"F8","bg":"FBF6E3"},{"a":"G8","bg":"FBF6E3"},{"a":"H8","v":"Lead calificado","bg":"FBF6E3"},{"a":"I8","v":"Lead convertido","bg":"FBF6E3"},{"a":"J8","bg":"FBF6E3"},{"a":"A9","v":"HUA NATURALS"},{"a":"B9","v":"Sí","bg":"FBF6E3"},{"a":"C9","v":"COP","bg":"FBF6E3"},{"a":"D9","v":"57","bg":"FBF6E3"},{"a":"E9","bg":"FBF6E3"},{"a":"F9","bg":"FBF6E3"},{"a":"G9","bg":"FBF6E3"},{"a":"H9","v":"Lead calificado","bg":"FBF6E3"},{"a":"I9","v":"Lead convertido","bg":"FBF6E3"},{"a":"J9","bg":"FBF6E3"},{"a":"A10","v":"INFINITE THERAPY SOLUTIONS"},{"a":"B10","v":"Sí","bg":"FBF6E3"},{"a":"C10","v":"COP","bg":"FBF6E3"},{"a":"D10","v":"57","bg":"FBF6E3"},{"a":"E10","bg":"FBF6E3"},{"a":"F10","bg":"FBF6E3"},{"a":"G10","bg":"FBF6E3"},{"a":"H10","v":"Lead calificado","bg":"FBF6E3"},{"a":"I10","v":"Lead convertido","bg":"FBF6E3"},{"a":"J10","bg":"FBF6E3"},{"a":"A11","v":"JAIRO GOOGLE ADS"},{"a":"B11","v":"Sí","bg":"FBF6E3"},{"a":"C11","v":"COP","bg":"FBF6E3"},{"a":"D11","v":"57","bg":"FBF6E3"},{"a":"E11","bg":"FBF6E3"},{"a":"F11","bg":"FBF6E3"},{"a":"G11","bg":"FBF6E3"},{"a":"H11","v":"Lead calificado","bg":"FBF6E3"},{"a":"I11","v":"Lead convertido","bg":"FBF6E3"},{"a":"J11","bg":"FBF6E3"},{"a":"A12","v":"LOVELY HOUNDS"},{"a":"B12","v":"Sí","bg":"FBF6E3"},{"a":"C12","v":"COP","bg":"FBF6E3"},{"a":"D12","v":"57","bg":"FBF6E3"},{"a":"E12","bg":"FBF6E3"},{"a":"F12","bg":"FBF6E3"},{"a":"G12","bg":"FBF6E3"},{"a":"H12","v":"Lead calificado","bg":"FBF6E3"},{"a":"I12","v":"Lead convertido","bg":"FBF6E3"},{"a":"J12","bg":"FBF6E3"},{"a":"A13","v":"MATIXMEDIA"},{"a":"B13","v":"Sí","bg":"FBF6E3"},{"a":"C13","v":"COP","bg":"FBF6E3"},{"a":"D13","v":"57","bg":"FBF6E3"},{"a":"E13","bg":"FBF6E3"},{"a":"F13","bg":"FBF6E3"},{"a":"G13","bg":"FBF6E3"},{"a":"H13","v":"Lead calificado","bg":"FBF6E3"},{"a":"I13","v":"Lead convertido","bg":"FBF6E3"},{"a":"J13","bg":"FBF6E3"},{"a":"A14","v":"MEGAPAGOS"},{"a":"B14","v":"Sí","bg":"FBF6E3"},{"a":"C14","v":"COP","bg":"FBF6E3"},{"a":"D14","v":"57","bg":"FBF6E3"},{"a":"E14","bg":"FBF6E3"},{"a":"F14","bg":"FBF6E3"},{"a":"G14","bg":"FBF6E3"},{"a":"H14","v":"Lead calificado","bg":"FBF6E3"},{"a":"I14","v":"Lead convertido","bg":"FBF6E3"},{"a":"J14","bg":"FBF6E3"},{"a":"A15","v":"PROVENZA"},{"a":"B15","v":"Sí","bg":"FBF6E3"},{"a":"C15","v":"COP","bg":"FBF6E3"},{"a":"D15","v":"57","bg":"FBF6E3"},{"a":"E15","bg":"FBF6E3"},{"a":"F15","bg":"FBF6E3"},{"a":"G15","bg":"FBF6E3"},{"a":"H15","v":"Lead calificado","bg":"FBF6E3"},{"a":"I15","v":"Lead convertido","bg":"FBF6E3"},{"a":"J15","bg":"FBF6E3"},{"a":"A16","v":"QASA"},{"a":"B16","v":"Sí","bg":"FBF6E3"},{"a":"C16","v":"COP","bg":"FBF6E3"},{"a":"D16","v":"57","bg":"FBF6E3"},{"a":"E16","bg":"FBF6E3"},{"a":"F16","bg":"FBF6E3"},{"a":"G16","bg":"FBF6E3"},{"a":"H16","v":"Lead calificado","bg":"FBF6E3"},{"a":"I16","v":"Lead convertido","bg":"FBF6E3"},{"a":"J16","bg":"FBF6E3"},{"a":"A17","v":"RHA"},{"a":"B17","v":"Sí","bg":"FBF6E3"},{"a":"C17","v":"COP","bg":"FBF6E3"},{"a":"D17","v":"57","bg":"FBF6E3"},{"a":"E17","bg":"FBF6E3"},{"a":"F17","bg":"FBF6E3"},{"a":"G17","bg":"FBF6E3"},{"a":"H17","v":"Lead calificado","bg":"FBF6E3"},{"a":"I17","v":"Lead convertido","bg":"FBF6E3"},{"a":"J17","bg":"FBF6E3"},{"a":"A18","v":"THE GOATFATHER"},{"a":"B18","v":"Sí","bg":"FBF6E3"},{"a":"C18","v":"COP","bg":"FBF6E3"},{"a":"D18","v":"57","bg":"FBF6E3"},{"a":"E18","bg":"FBF6E3"},{"a":"F18","bg":"FBF6E3"},{"a":"G18","bg":"FBF6E3"},{"a":"H18","v":"Lead calificado","bg":"FBF6E3"},{"a":"I18","v":"Lead convertido","bg":"FBF6E3"},{"a":"J18","bg":"FBF6E3"},{"a":"A19","v":"THE PINK ROOM"},{"a":"B19","v":"Sí","bg":"FBF6E3"},{"a":"C19","v":"COP","bg":"FBF6E3"},{"a":"D19","v":"57","bg":"FBF6E3"},{"a":"E19","bg":"FBF6E3"},{"a":"F19","bg":"FBF6E3"},{"a":"G19","bg":"FBF6E3"},{"a":"H19","v":"Lead calificado","bg":"FBF6E3"},{"a":"I19","v":"Lead convertido","bg":"FBF6E3"},{"a":"J19","bg":"FBF6E3"},{"a":"A20","v":"TIENDA MARIAMAR"},{"a":"B20","v":"Sí","bg":"FBF6E3"},{"a":"C20","v":"COP","bg":"FBF6E3"},{"a":"D20","v":"57","bg":"FBF6E3"},{"a":"E20","bg":"FBF6E3"},{"a":"F20","bg":"FBF6E3"},{"a":"G20","bg":"FBF6E3"},{"a":"H20","v":"Lead calificado","bg":"FBF6E3"},{"a":"I20","v":"Lead convertido","bg":"FBF6E3"},{"a":"J20","bg":"FBF6E3"},{"a":"A21","v":"TOMEDELLÍN"},{"a":"B21","v":"Sí","bg":"FBF6E3"},{"a":"C21","v":"COP","bg":"FBF6E3"},{"a":"D21","v":"57","bg":"FBF6E3"},{"a":"E21","bg":"FBF6E3"},{"a":"F21","bg":"FBF6E3"},{"a":"G21","bg":"FBF6E3"},{"a":"H21","v":"Lead calificado","bg":"FBF6E3"},{"a":"I21","v":"Lead convertido","bg":"FBF6E3"},{"a":"J21","bg":"FBF6E3"}],"dv":[{"r":"B2:B200","f":"\"Sí,No\""}]},{"n":"TikTok_CSV","tab":"199477","frz":"A2","w":{"A":18,"B":26,"C":22,"D":26,"E":16,"F":24,"G":12,"H":10,"I":18},"c":[{"a":"A1","v":"Event_type","b":1,"fc":"FFFFFF","bg":"199477","wr":1},{"a":"B1","v":"Timestamp","b":1,"fc":"FFFFFF","bg":"199477","wr":1},{"a":"C1","v":"lead_id","b":1,"fc":"FFFFFF","bg":"199477","wr":1},{"a":"D1","v":"Email","b":1,"fc":"FFFFFF","bg":"199477","wr":1},{"a":"E1","v":"Phone","b":1,"fc":"FFFFFF","bg":"199477","wr":1},{"a":"F1","v":"click_id","b":1,"fc":"FFFFFF","bg":"199477","wr":1},{"a":"G1","v":"Value","b":1,"fc":"FFFFFF","bg":"199477","wr":1},{"a":"H1","v":"Currency","b":1,"fc":"FFFFFF","bg":"199477","wr":1},{"a":"I1","v":"Order_id","b":1,"fc":"FFFFFF","bg":"199477","wr":1},{"a":"A2","v":"=IFERROR(FILTER(IFERROR(VSTACK(IFERROR(FILTER(HSTACK(IF(Leads!C2:C3001<>\"\",Config!$B$12,\"\"),IF(Leads!C2:C3001<>\"\",Leads!AF2:AF3001,\"\"),Leads!Z2:Z3001,Leads!AD2:AD3001,Leads!AE2:AE3001,Leads!AA2:AA3001,\"\",IF(Leads!C2:C3001<>\"\",IFERROR(VLOOKUP(Panel!$B$2,Clientes!$A$2:$C,3,FALSE),\"COP\"),\"\"),Leads!A2:A3001&\"-lead\"),(Leads!B2:B3001=Panel!$B$2)*(Leads!E2:E3001=\"TikTok\")*(Leads!C2:C3001<>\"\")*(((Leads!Z2:Z3001<>\"\")+(Leads!AA2:AA3001<>\"\")+(Leads!AD2:AD3001<>\"\")+(Leads!AE2:AE3001<>\"\"))>0)),\"\"),IFERROR(FILTER(HSTACK(IF(Leads!Q2:Q3001<>\"\",Config!$B$14,\"\"),IF(Leads!Q2:Q3001<>\"\",Leads!AG2:AG3001,\"\"),Leads!Z2:Z3001,Leads!AD2:AD3001,Leads!AE2:AE3001,Leads!AA2:AA3001,\"\",IF(Leads!Q2:Q3001<>\"\",IFERROR(VLOOKUP(Panel!$B$2,Clientes!$A$2:$C,3,FALSE),\"COP\"),\"\"),Leads!A2:A3001&\"-calificado\"),(Leads!B2:B3001=Panel!$B$2)*(Leads!E2:E3001=\"TikTok\")*(Leads!Q2:Q3001<>\"\")*(((Leads!Z2:Z3001<>\"\")+(Leads!AA2:AA3001<>\"\")+(Leads!AD2:AD3001<>\"\")+(Leads!AE2:AE3001<>\"\"))>0)),\"\"),IFERROR(FILTER(HSTACK(IF(Leads!R2:R3001<>\"\",Config!$B$15,\"\"),IF(Leads!R2:R3001<>\"\",Leads!AH2:AH3001,\"\"),Leads!Z2:Z3001,Leads!AD2:AD3001,Leads!AE2:AE3001,Leads!AA2:AA3001,IF(Leads!R2:R3001<>\"\",Leads!S2:S3001,\"\"),IF(Leads!R2:R3001<>\"\",IFERROR(VLOOKUP(Panel!$B$2,Clientes!$A$2:$C,3,FALSE),\"COP\"),\"\"),Leads!A2:A3001&\"-venta\"),(Leads!B2:B3001=Panel!$B$2)*(Leads!E2:E3001=\"TikTok\")*(Leads!R2:R3001<>\"\")*(((Leads!Z2:Z3001<>\"\")+(Leads!AA2:AA3001<>\"\")+(Leads!AD2:AD3001<>\"\")+(Leads!AE2:AE3001<>\"\"))>0)),\"\")),\"\"),INDEX(IFERROR(VSTACK(IFERROR(FILTER(HSTACK(IF(Leads!C2:C3001<>\"\",Config!$B$12,\"\"),IF(Leads!C2:C3001<>\"\",Leads!AF2:AF3001,\"\"),Leads!Z2:Z3001,Leads!AD2:AD3001,Leads!AE2:AE3001,Leads!AA2:AA3001,\"\",IF(Leads!C2:C3001<>\"\",IFERROR(VLOOKUP(Panel!$B$2,Clientes!$A$2:$C,3,FALSE),\"COP\"),\"\"),Leads!A2:A3001&\"-lead\"),(Leads!B2:B3001=Panel!$B$2)*(Leads!E2:E3001=\"TikTok\")*(Leads!C2:C3001<>\"\")*(((Leads!Z2:Z3001<>\"\")+(Leads!AA2:AA3001<>\"\")+(Leads!AD2:AD3001<>\"\")+(Leads!AE2:AE3001<>\"\"))>0)),\"\"),IFERROR(FILTER(HSTACK(IF(Leads!Q2:Q3001<>\"\",Config!$B$14,\"\"),IF(Leads!Q2:Q3001<>\"\",Leads!AG2:AG3001,\"\"),Leads!Z2:Z3001,Leads!AD2:AD3001,Leads!AE2:AE3001,Leads!AA2:AA3001,\"\",IF(Leads!Q2:Q3001<>\"\",IFERROR(VLOOKUP(Panel!$B$2,Clientes!$A$2:$C,3,FALSE),\"COP\"),\"\"),Leads!A2:A3001&\"-calificado\"),(Leads!B2:B3001=Panel!$B$2)*(Leads!E2:E3001=\"TikTok\")*(Leads!Q2:Q3001<>\"\")*(((Leads!Z2:Z3001<>\"\")+(Leads!AA2:AA3001<>\"\")+(Leads!AD2:AD3001<>\"\")+(Leads!AE2:AE3001<>\"\"))>0)),\"\"),IFERROR(FILTER(HSTACK(IF(Leads!R2:R3001<>\"\",Config!$B$15,\"\"),IF(Leads!R2:R3001<>\"\",Leads!AH2:AH3001,\"\"),Leads!Z2:Z3001,Leads!AD2:AD3001,Leads!AE2:AE3001,Leads!AA2:AA3001,IF(Leads!R2:R3001<>\"\",Leads!S2:S3001,\"\"),IF(Leads!R2:R3001<>\"\",IFERROR(VLOOKUP(Panel!$B$2,Clientes!$A$2:$C,3,FALSE),\"COP\"),\"\"),Leads!A2:A3001&\"-venta\"),(Leads!B2:B3001=Panel!$B$2)*(Leads!E2:E3001=\"TikTok\")*(Leads!R2:R3001<>\"\")*(((Leads!Z2:Z3001<>\"\")+(Leads!AA2:AA3001<>\"\")+(Leads!AD2:AD3001<>\"\")+(Leads!AE2:AE3001<>\"\"))>0)),\"\")),\"\"),0,1)<>\"\"),\"\")","fs":11}],"dv":[]},{"n":"Envios","tab":"5A5A52","frz":"A2","w":{"A":22,"B":18,"C":11,"D":18,"E":17,"F":17,"G":11,"H":60},"c":[{"a":"A1","v":"ID del evento","b":1,"fc":"FFFFFF","bg":"5A5A52","wr":1},{"a":"B1","v":"Cliente","b":1,"fc":"FFFFFF","bg":"5A5A52","wr":1},{"a":"C1","v":"Plataforma","b":1,"fc":"FFFFFF","bg":"5A5A52","wr":1},{"a":"D1","v":"Evento","b":1,"fc":"FFFFFF","bg":"5A5A52","wr":1},{"a":"E1","v":"Fecha del evento","b":1,"fc":"FFFFFF","bg":"5A5A52","wr":1},{"a":"F1","v":"Enviado el","b":1,"fc":"FFFFFF","bg":"5A5A52","wr":1},{"a":"G1","v":"Estado","b":1,"fc":"FFFFFF","bg":"5A5A52","wr":1},{"a":"H1","v":"Detalle","b":1,"fc":"FFFFFF","bg":"5A5A52","wr":1}],"dv":[]},{"n":"Config","tab":"5A5A52","frz":null,"w":{"A":34,"B":26,"C":64,"D":16},"c":[{"a":"A1","v":"Ajuste","b":1,"fc":"FFFFFF","bg":"5A5A52","wr":1},{"a":"B1","v":"Valor","b":1,"fc":"FFFFFF","bg":"5A5A52","wr":1},{"a":"C1","v":"Para qué","b":1,"fc":"FFFFFF","bg":"5A5A52","wr":1},{"a":"D1","v":"clave","b":1,"fc":"FFFFFF","bg":"5A5A52","wr":1},{"a":"A2","v":"Zona horaria de la hoja (ISO)","b":1},{"a":"B2","v":"-05:00","bg":"FBF6E3"},{"a":"C2","v":"Debe coincidir con Archivo → Configuración → Zona horaria (Bogotá)","fc":"5B6170","fs":9},{"a":"D2","v":"tz_iso","fc":"A0A4AD","fs":8},{"a":"A3","v":"Indicativo por defecto","b":1},{"a":"B3","v":"57","bg":"FBF6E3"},{"a":"C3","v":"Si el cliente no tiene uno en Clientes","fc":"5B6170","fs":9},{"a":"D3","v":"indicativo","fc":"A0A4AD","fs":8},{"a":"A4","v":"Nombre del CRM","b":1},{"a":"B4","v":"CRM MatixMedia","bg":"FBF6E3"},{"a":"C4","v":"Va como lead_event_source en Meta y TikTok","fc":"5B6170","fs":9},{"a":"D4","v":"crm","fc":"A0A4AD","fs":8},{"a":"A5","v":"Carpeta CLIENTES (ID de Drive)","b":1},{"a":"B5","v":"14woLLnzG_y6yveQJrwYfaBoDnkyWbSmu","bg":"FBF6E3"},{"a":"C5","v":"Ahí busca la carpeta de cada cliente para su hoja de Google Ads","fc":"5B6170","fs":9},{"a":"D5","v":"carpeta_clientes","fc":"A0A4AD","fs":8},{"a":"A6","v":"Días máximos para enviar","b":1},{"a":"B6","v":7,"bg":"FBF6E3"},{"a":"C6","v":"Meta y ChatGPT no aceptan eventos de más de 7 días","fc":"5B6170","fs":9},{"a":"D6","v":"dias","fc":"A0A4AD","fs":8},{"a":"A7","v":"Versión de la API de Meta","b":1},{"a":"B7","v":"v23.0","bg":"FBF6E3"},{"a":"C7","v":"Cambiar cuando Meta la retire","fc":"5B6170","fs":9},{"a":"D7","v":"meta_version","fc":"A0A4AD","fs":8},{"a":"A8","v":"Meta · evento lead nuevo","b":1},{"a":"B8","v":"Lead","bg":"FBF6E3"},{"a":"C8","v":"Meta pide el lead nuevo + al menos 2 etapas","fc":"5B6170","fs":9},{"a":"D8","v":"meta_lead","fc":"A0A4AD","fs":8},{"a":"A9","v":"Meta · evento contactado","b":1},{"a":"B9","v":"Contactado","bg":"FBF6E3"},{"a":"D9","v":"meta_contactado","fc":"A0A4AD","fs":8},{"a":"A10","v":"Meta · evento calificado","b":1},{"a":"B10","v":"Lead calificado","bg":"FBF6E3"},{"a":"C10","v":"Se elige como objetivo en Meta","fc":"5B6170","fs":9},{"a":"D10","v":"meta_calificado","fc":"A0A4AD","fs":8},{"a":"A11","v":"Meta · evento venta","b":1},{"a":"B11","v":"Venta","bg":"FBF6E3"},{"a":"D11","v":"meta_venta","fc":"A0A4AD","fs":8},{"a":"A12","v":"TikTok · evento lead nuevo","b":1},{"a":"B12","v":"Lead nuevo","bg":"FBF6E3"},{"a":"C12","v":"Se mapean a las 4 etapas en Events Manager","fc":"5B6170","fs":9},{"a":"D12","v":"tiktok_lead","fc":"A0A4AD","fs":8},{"a":"A13","v":"TikTok · evento contactado","b":1},{"a":"B13","v":"Contactado","bg":"FBF6E3"},{"a":"D13","v":"tiktok_contactado","fc":"A0A4AD","fs":8},{"a":"A14","v":"TikTok · evento calificado","b":1},{"a":"B14","v":"Lead calificado","bg":"FBF6E3"},{"a":"D14","v":"tiktok_calificado","fc":"A0A4AD","fs":8},{"a":"A15","v":"TikTok · evento venta","b":1},{"a":"B15","v":"Venta","bg":"FBF6E3"},{"a":"D15","v":"tiktok_venta","fc":"A0A4AD","fs":8},{"a":"A16","v":"ChatGPT · evento lead nuevo","b":1},{"a":"B16","v":"lead_created","bg":"FBF6E3"},{"a":"C16","v":"Estándar (optimizable)","fc":"5B6170","fs":9},{"a":"D16","v":"chatgpt_lead","fc":"A0A4AD","fs":8},{"a":"A17","v":"ChatGPT · evento contactado","b":1},{"a":"B17","v":"lead_contactado","bg":"FBF6E3"},{"a":"C17","v":"Personalizado: se mide, no optimiza","fc":"5B6170","fs":9},{"a":"D17","v":"chatgpt_contactado","fc":"A0A4AD","fs":8},{"a":"A18","v":"ChatGPT · evento calificado","b":1},{"a":"B18","v":"lead_calificado","bg":"FBF6E3"},{"a":"C18","v":"Personalizado: se mide, no optimiza","fc":"5B6170","fs":9},{"a":"D18","v":"chatgpt_calificado","fc":"A0A4AD","fs":8},{"a":"A19","v":"ChatGPT · evento venta","b":1},{"a":"B19","v":"order_created","bg":"FBF6E3"},{"a":"C19","v":"Estándar. appointment_scheduled si es una cita","fc":"5B6170","fs":9},{"a":"D19","v":"chatgpt_venta","fc":"A0A4AD","fs":8},{"a":"A20","v":"URL de la app web","b":1},{"a":"B20","bg":"FBF6E3"},{"a":"C20","v":"La pega el script o tú, al implementar la app web (termina en /exec)","fc":"5B6170","fs":9},{"a":"D20","v":"url_web","fc":"A0A4AD","fs":8}],"dv":[]},{"n":"Instrucciones","tab":"04050A","frz":null,"w":{"A":110},"c":[{"a":"A1","v":"CRM DE LEADS · MatixMedia","b":1,"fc":"04050A","fs":14,"wr":1},{"a":"A2","v":"Todos los leads de todos los clientes. Cada cliente tiene su panel y sus propias conexiones a Meta, TikTok, ChatGPT y Google.","wr":1},{"a":"A4","v":"USO","b":1,"fc":"E8C046","wr":1},{"a":"A5","v":"• Menú MatixMedia → Panel lateral: crear leads y moverlos de etapa. Al cambiar la Etapa en Leads, su fecha se llena sola.","wr":1},{"a":"A6","v":"• Panel: elegir el cliente en B2. TikTok_CSV muestra el CSV de ese cliente.","wr":1},{"a":"A7","v":"• Cada cliente puede usar su enlace privado del panel web (columna M de Clientes).","wr":1},{"a":"A9","v":"NO TOCAR","b":1,"fc":"E8C046","wr":1},{"a":"A10","v":"• No insertar ni mover columnas en Leads ni en Clientes. Las columnas verdes y grises las llenan fórmulas o el script.","wr":1},{"a":"A11","v":"• Los tokens nunca van en celdas: se cargan con MatixMedia → Conectar cliente.","wr":1},{"a":"A13","v":"Paso a paso: guía 12_Guia_Retorno_Leads en _MatixMedia/GUIAS/. Datos personales: no compartir esta hoja con clientes (ellos usan su enlace).","wr":1}],"dv":[]}];

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
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_top">' + "<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n<link href=\"https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;1,9..144,300;1,9..144,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@400;500&display=swap\" rel=\"stylesheet\">\n<style>\n/* Identidad MatixMedia (misma base que matixmedia.com.co): vidrio oscuro, Fraunces + DM Sans, dorado y franja tricolor */\n:root{\n  --bg:#04050A;--ink:#FDFCF7;--ink2:#C8C7C0;--muted:#8D8B80;--mute2:#5A5A52;\n  --gold:#E8C046;--green:#22B088;--red:#CF343A;--blue:#4A9EE0;\n  --glass:rgba(10,11,16,.58);--edge:rgba(255,255,255,.14);--edge2:rgba(255,255,255,.22);\n  --sheen:linear-gradient(145deg,rgba(255,255,255,.06),rgba(255,255,255,.012) 48%,rgba(255,255,255,.03));\n  --blur:blur(18px) saturate(160%);--hi:inset 0 1px 0 rgba(255,255,255,.18);\n  color-scheme:dark\n}\n*{box-sizing:border-box}\nhtml{background:var(--bg)}\nbody{margin:0;min-height:100vh;color:var(--ink);font:400 13.5px/1.5 'DM Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased;background:var(--bg)}\n/* brillos de marca fijos detrás del vidrio */\nbody::before{content:'';position:fixed;inset:0;z-index:-1;pointer-events:none;\n  background:radial-gradient(55vmax 40vmax at 100% 0%,rgba(34,176,136,.30),transparent 62%),\n             radial-gradient(50vmax 38vmax at 0% 100%,rgba(207,52,58,.24),transparent 62%),\n             radial-gradient(40vmax 30vmax at 85% 92%,rgba(232,192,70,.08),transparent 65%),var(--bg)}\n.franja{height:4px;background:linear-gradient(90deg,var(--gold) 0 33.4%,var(--red) 33.4% 66.7%,var(--green) 66.7%)}\n.top{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:12px;padding:12px 16px;\n  background:rgba(4,5,10,.72);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border-bottom:1px solid rgba(255,255,255,.08)}\n.top img{width:38px;height:38px;border-radius:50%;flex:none;box-shadow:0 0 0 1px rgba(255,255,255,.18)}\n.top small{display:block;color:var(--gold);font:500 10px 'DM Mono',monospace;letter-spacing:2px;text-transform:uppercase}\n.top h1{margin:2px 0 0;font:300 21px/1.15 'Fraunces',Georgia,serif;letter-spacing:-.2px}\n.top h1 em{color:var(--gold);font-style:italic}\n.wrap{max-width:1040px;margin:0 auto;padding:14px 14px 56px}\n\n/* vidrio base */\n.vidrio,.chip,.lead,.form,.sel-cli{position:relative;isolation:isolate;border:1px solid var(--edge);\n  background-color:var(--glass);background-image:var(--sheen);\n  -webkit-backdrop-filter:var(--blur);backdrop-filter:var(--blur);box-shadow:var(--hi)}\n.chip::after,.lead::after,.form::after{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:-1;\n  background:linear-gradient(115deg,transparent 28%,rgba(255,255,255,.05) 40%,transparent 52%),linear-gradient(180deg,rgba(255,255,255,.05),transparent 30%)}\n\n.sel-cli{border-radius:18px;padding:4px 14px 12px;margin-top:12px}\n.chips{display:grid;grid-template-columns:repeat(auto-fit,minmax(104px,1fr));gap:10px;margin:14px 0}\n.chip{--c:255,255,255;border-radius:18px;padding:14px 10px 12px;text-align:center;overflow:hidden;\n  background-image:radial-gradient(120% 90% at 100% 0%,rgba(var(--c),.16),transparent 62%),var(--sheen)}\n.chip b{display:block;font:300 26px/1.1 'Fraunces',Georgia,serif}\n.chip span{font:500 9.5px 'DM Mono',monospace;color:var(--muted);text-transform:uppercase;letter-spacing:1.2px}\n.chip.c0{--c:74,158,224}.chip.c1{--c:232,192,70}.chip.c2{--c:34,176,136}.chip.c3{--c:34,176,136}.chip.c4{--c:232,192,70}\n.chip.c4 b{color:var(--gold)}\n\n.bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:12px 0}\ninput,select,textarea{font:inherit;color:var(--ink);width:100%;outline:none;border-radius:12px;padding:10px 12px;\n  border:1px solid var(--edge);background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02));\n  -webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);box-shadow:inset 0 1px 0 rgba(255,255,255,.08);transition:border-color .2s}\ninput:focus,select:focus,textarea:focus{border-color:rgba(232,192,70,.75)}\ninput::placeholder,textarea::placeholder{color:var(--mute2)}\nselect option{background:#14151C}\ntextarea{min-height:60px;resize:vertical}\nlabel{display:block;font:500 9.5px 'DM Mono',monospace;color:var(--muted);text-transform:uppercase;letter-spacing:1.2px;margin:12px 0 5px}\n\n/* botones como en la web */\nbutton{position:relative;isolation:isolate;overflow:hidden;font:600 13px 'DM Sans',system-ui,sans-serif;border-radius:999px;min-height:40px;padding:0 18px;cursor:pointer;\n  color:var(--ink);border:1px solid rgba(255,255,255,.18);\n  background:linear-gradient(180deg,rgba(255,255,255,.09),rgba(255,255,255,.025));\n  -webkit-backdrop-filter:blur(14px) saturate(160%);backdrop-filter:blur(14px) saturate(160%);\n  box-shadow:inset 0 1px 0 rgba(255,255,255,.22),inset 0 -1px 0 rgba(255,255,255,.04);transition:border-color .2s,background .2s,box-shadow .25s,background-position .45s}\nbutton:hover{border-color:rgba(255,255,255,.32)}\nbutton.pri,button.ok{color:var(--bg);border-color:rgba(255,255,255,.22);\n  background:linear-gradient(115deg,#1A9473 0%,#22B088 45%,#5ED3AE 100%);background-size:180% 100%;background-position:0 50%;\n  box-shadow:inset 0 1px 0 rgba(255,255,255,.40),inset 0 -1px 0 rgba(0,0,0,.14),0 8px 22px rgba(34,176,136,.20)}\nbutton.pri:hover,button.ok:hover{background-position:100% 50%;box-shadow:inset 0 1px 0 rgba(255,255,255,.45),inset 0 -1px 0 rgba(0,0,0,.14),0 10px 28px rgba(34,176,136,.32)}\nbutton.pri::after,button.ok::after{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:-1;background:linear-gradient(180deg,rgba(255,255,255,.22),rgba(255,255,255,0) 55%)}\nbutton.sel{border-color:rgba(232,192,70,.75);color:var(--gold);background:linear-gradient(180deg,rgba(232,192,70,.14),rgba(232,192,70,.03))}\nbutton:disabled{opacity:.55;cursor:wait}\n.filtros button{min-height:34px;padding:0 14px;font-weight:500;font-size:12.5px}\n\n/* leads */\n.lead{--c:74,158,224;border-radius:20px;margin:10px 0;overflow:hidden;\n  background-image:radial-gradient(90% 120% at 100% 0%,rgba(var(--c),.12),transparent 55%),var(--sheen)}\n.lead.st-Contactado{--c:232,192,70}.lead.st-Calificado,.lead.st-Venta{--c:34,176,136}.lead.st-Perdido{--c:207,52,58}\n.lead.abierto{border-color:rgba(232,192,70,.45)}\n.lead .cab{display:flex;justify-content:space-between;gap:10px;padding:14px 16px;cursor:pointer}\n.lead .cab b{font-weight:600;font-size:14px}\n.lead .meta{font-size:12px;color:var(--muted);margin-top:3px}\n.badge{display:inline-flex;align-items:center;height:24px;border-radius:999px;padding:0 11px;font:500 10.5px 'DM Mono',monospace;letter-spacing:.3px;white-space:nowrap;\n  border:1px solid rgba(var(--c),.45);background:rgba(var(--c),.14);color:rgb(var(--c))}\n.lead.st-Venta .badge{background:var(--green);border-color:var(--green);color:var(--bg)}\n.det{border-top:1px solid rgba(255,255,255,.08);padding:4px 16px 16px;display:none;background:rgba(4,5,10,.25)}\n.lead.abierto .det{display:block}\n.etapas{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}\n.etapas button{min-height:34px;padding:0 14px;font-weight:500}\n.grid2{display:grid;grid-template-columns:1fr 1fr;gap:0 12px}\n.notas{white-space:pre-wrap;font-size:12px;color:var(--ink2);border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);border-radius:12px;padding:10px;margin-top:10px;max-height:140px;overflow:auto}\n.form{border-radius:22px;padding:18px 16px 16px;margin:12px 0;display:none;overflow:hidden;\n  background-image:radial-gradient(110% 80% at 100% 0%,rgba(34,176,136,.18),transparent 60%),radial-gradient(80% 60% at 0% 100%,rgba(232,192,70,.07),transparent 70%),var(--sheen)}\n.form::before{content:'';position:absolute;left:0;right:0;top:0;height:4px;background:linear-gradient(90deg,var(--gold) 0 33.4%,var(--red) 33.4% 66.7%,var(--green) 66.7%)}\n.form.vis{display:block}\n.form>b{font:300 20px 'Fraunces',Georgia,serif}\ndetails summary{cursor:pointer;color:var(--muted);font-size:12.5px;margin-top:12px}\n.msg{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:30;display:none;padding:10px 18px;border-radius:999px;font-size:12.5px;\n  color:var(--ink);border:1px solid rgba(232,192,70,.6);background:rgba(10,11,16,.85);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}\n.vacio{color:var(--muted);text-align:center;padding:30px;font:italic 300 16px 'Fraunces',Georgia,serif}\na.wa{color:var(--green);text-decoration:none;font-weight:600}\n.pie{margin-top:32px;text-align:center;font:500 9.5px 'DM Mono',monospace;letter-spacing:1.6px;color:var(--mute2);text-transform:uppercase}\n::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-thumb{background:#1E1F28;border-radius:4px}\n@media (max-width:420px){.grid2{grid-template-columns:1fr}.top h1{font-size:18px}.chip b{font-size:22px}}\n</style>\n" + '</head><body data-modo="' + modo + '" data-k="' + k + '">' +
    "<div class=\"franja\"></div><div class=\"top\"><img src=\"data:image/webp;base64,UklGRgoJAABXRUJQVlA4IP4IAADQKQCdASpIAEgAPj0WiUMiISEYWnb8IAPEtgBdmaq/i+b85Cx/2jkUUM9d+PD1E/mD/Ve4B+o/SK8wH7R+sZ/gPUR/kvUA/t3/A6wD0AP1r9V7/b/+H/P/Br+y/7h/Al+vv/v7P/NX/zvRR+Q/aLlM89+ZP8e+3n238wfW7/IeBvvR1AvxH+d/5b8jPyq5AcAH1F/1v5jeYDqKXon+n4zDxz2AP5h/aP+1/ZvXB/0f8V/jv+R/ufat+df3X/mf434Cf5R/Tv9F/e/3s/y/fx/Zv2O/2N//6rR/BsIyov0eStN5tkvFaXNlhsOezDBoVEjwpX+varLD+7cWBGzlmqVnDBvogeknZpQ3ckiuuV7pvfzxnQW7qOP84eNaBYEe9KoesCAkgnNa7NGF791KWZJbWhjfDf8Q5GT7g8jK7po/UAmcJF3qPX7PtVVlMVajT/wE6RYrHWAAAP7//iseyTXyhGSqDN/HZC/hmSSmNU5YMQ3itNjrQZq3mzXhwi4bBRTOGa4mj2+iHtmCfkQVbLuhdGPphTvOBww0unK4vOJ9RgyLCsTLDgY+XGK/XmVFPk7qzUD6JKuUH5bpcUSINorW5jsrou6N5osuZBBCat5L7q4JrCXM8BgDIak6mn82VfTexzj1TM1L3Jf5nBJGcfjxWFychHuBWkuxfYPUPiWxCue/2DOBxw8NZI+bDYyaGLWd9L9sM597mnU2jyXeu224HLCuGgzyUKmM/TJGvSE9+c9oPONfo6VlFrQhn6V5q5ERewbhD8i5NYsxOSAHRqNxZXensnF9UDJGTUKxZ9XwfEheHXnrh7clAndPnqvh8UV4VlENbRpScR02KjnFjVWymhwwMzLdtS/1Ue1p5QIdTAfbcBEHsYmyAK7qnghpVya4w1aSVZH4wDHGC8zqFtafrIPoT+EXZkN6fxDD/y55wcHWODL2HPz2z2rDo02D98h9/qX4biH7Ad8gLCSHvjXr8GJB/yg1X3CPkiqowC9rHpwl0OrIysDZqfv6rvuBZ45UlozkGZ6lVCf9CgQp1fgYTFKqDCCdIjNBdqujqgVg8So8r8sWsYg/68FHHLBALbqiSO9KHoanD/kEt4bMzFCFrTBzOG8rIroI8F+eD+NOcLW2f0w/vICtW5F7LQCE2TSXSCMYo+Rq+hSKYJKjE0/fJtRQCn8RHqXxTe4eBP6PGZ04fPdYdfBHDatfLwbp3MSpucFM38O3uQnf1poa/4g1/+7gTkCmuVxXO8u2LWEJDMtC/AyEF8gL3VvvFq4D+PI6R+fsYJ5gXcW41ratgomqmX+Oo6Zcns7eAwBtrllrjF5Q7GUPtmh9dUoRME2NF+XS9Fnv/Gmc5ALgWtD6fqaJGBdIt0BaoCmY/sgld0lEYdRWhuKCrVDqDCnqUV8VZ0abdp1WtVTyoRpq9Wt2XrvEJ82nRhQev70LkjjW5s09sdsRxaY3gP4O2kKjVLl9jCHKr4m+aSuG83Z0G9NzhnD2sOQ+Ut9oppRjDrp948ZvIrHzRjkGvoKDD/zrrWusKSzjzrq532j8tgBsdcZl6cGoTCePFLVTf5rT/DbZTJiGfWxwCjI7XMMJdXmivOB4Er9c5b/fVJu+n/USueipYm+zV8GdX93JwDNZpPzC2dbT1Ky0yW/441aA5tYqjFRHOp3IBM6BlvfOZ7aY4/heIHrInnV+KFH+4suoW08QZHILyHSfpuaEzPWoDbssJpeRq0Yfu3/xrqMez28qNATXtx6WVOkEI0eTyNeKpsutbBm89Svli1iP/i17+FY+buK/qHxBfo9JzRaVLr7xxT8eaFBMknOShK1fEzw25CoZm9l2mMTO5Blkq+d2MYWk6wyjl8DeT4zw4EjFhnYdprLESkrl29QPb5/hAxjojfsmXMJSRdTVqPaT7bRIz/sbVMnO4vh0+HbHsW3QY5Esmu+es/C3z6FFM3x1YSKmf8D5zen68//sH7AMMjbDI5Dw+strmj9sDlU+UTbS4pCvt+qZdRCcN13S8gGFVw1XvPPueXizzpguFN8lrTjlQItUVPfhfkkQv60CqAxdgvT2RmGfJMre2MXnSSVE23dfRhuZVWX/ahOdDGt63i0Huu1jYM7V/YHh4x96hd1q8AWLK67fxdhW7wPgYe2LbSbc01sVnfaD2gX7+rD+fPLoyYRGfYWPfi8irRzw9DZvl6r74RVlTkdVhlCOlKmYVlzlgQYccCjwOnWggNbhMPcC85vVQO506uWOXxtSKd1Vn76uc96u0Pswymr6CMVKLxIT60MZMgZV38VRH6FXeQus3C5IJe/8IbOg0JZ1TLUGfPcht/Lr9Lr6LfJSsxsToEGS+TnQd0pUeIPNlbDcS8/kJBkbuMZZOkxwEh863ULB+bKnW90sUuGUtPk6+7gGXM40CVDrVDi2quudRyQM7ON75WM/M9fz1cSv8tB3z0+dV2eb1UyG6IEPohpR9w2NPTEUgHoV03OHYYyHo+E7Nlb3iye04VN0wlLV6BUvn/ukovnycQzzoJNBIMB5JbWpj7x0aNSv/Jb9kkF7yI946h8fxTUZ35tU35PKv4Et9cUqkuwZFgvXjwnTTxx4kJWpLTBK0iu+HE2DAzjz6tfg41R9t8yHHAMT3cWeFhVjGP6B37Fn9XzY58dHOw6si039AKYVeG/ejDKOgwURh4HP8FyJcb4j343Id5Wrlme2JTNVCn+e80iAb1UJjenyx1SAkyYutwA7HtYnB+P/kfWNfD2GW+f+SEJvJ82UY7/o5laQZIWbbw865CMQtWIGNYfU9PEwXCZ58l44YqLojgER7liMMZIYrTkqKzLDOqxUuT0+FrJAc40EqnTFePFfwxcwJlhdCDncQhp4ataX8VHvvaYezuucGeUhMvVu3nkfKuAVEMq5CGHgzlC21CsQhwAKfwN1pb71q8Z37v1KU/g8HmgT+28TNoWdK6wPYsC9LJSQdd/pBTqUfCbj+M0G/8U2TSrdDHzw0lBfaxBnjlghDN666V0nZdgt9/HkW8WGnnzGSfDw/gAIENWAO7p1lqTfdd9n0xk+DQuJLFzmu4mCuvdXm3gPl4AA\" alt=\"MatixMedia\"><div><small>MatixMedia · CRM de leads</small><h1 id=\"titulo\">Cargando…</h1></div></div>\n<div class=\"wrap\">\n  <div id=\"selCli\" class=\"sel-cli\" style=\"display:none\"><label>Cliente</label><select id=\"cliente\"></select></div>\n  <div class=\"chips\" id=\"chips\"></div>\n  <div class=\"bar\">\n    <button class=\"pri\" id=\"btnNuevo\">+ Nuevo lead</button>\n    <input id=\"buscar\" placeholder=\"Buscar nombre, teléfono o email\" style=\"flex:1;min-width:150px\">\n  </div>\n  <div class=\"bar filtros\" id=\"filtros\"></div>\n  <div class=\"form\" id=\"formNuevo\">\n    <b>Nuevo lead</b>\n    <div class=\"grid2\">\n      <div><label>Nombre</label><input id=\"n_nombre\"></div>\n      <div><label>Teléfono (con indicativo)</label><input id=\"n_tel\" inputmode=\"tel\"></div>\n      <div><label>Email</label><input id=\"n_email\" type=\"email\"></div>\n      <div><label>Ciudad</label><input id=\"n_ciudad\"></div>\n      <div><label>Origen</label><select id=\"n_origen\"></select></div>\n      <div><label>Plataforma del anuncio</label><select id=\"n_plataforma\"></select></div>\n      <div><label>Campaña</label><input id=\"n_campana\"></div>\n      <div><label>Interés / producto</label><input id=\"n_interes\"></div>\n      <div><label>Responsable</label><input id=\"n_responsable\"></div>\n      <div><label>Fecha del lead (vacío = ahora)</label><input id=\"n_fecha\" type=\"datetime-local\"></div>\n    </div>\n    <label>Notas</label><textarea id=\"n_notas\"></textarea>\n    <details><summary>Identificadores de anuncios (si los tienes)</summary>\n      <div class=\"grid2\">\n        <div><label>gclid (Google)</label><input id=\"n_gclid\"></div>\n        <div><label>fbclid (Meta, web)</label><input id=\"n_fbclid\"></div>\n        <div><label>Meta lead_id</label><input id=\"n_meta_lead\"></div>\n        <div><label>TikTok lead_id</label><input id=\"n_tt_lead\"></div>\n        <div><label>ttclid (TikTok, web)</label><input id=\"n_ttclid\"></div>\n        <div><label>oppref (ChatGPT)</label><input id=\"n_oppref\"></div>\n      </div>\n    </details>\n    <div class=\"bar\" style=\"margin-top:10px\"><button class=\"ok\" id=\"btnCrear\">Guardar lead</button><button id=\"btnCancelar\">Cancelar</button></div>\n  </div>\n  <div id=\"lista\"><div class=\"vacio\">Cargando…</div></div>\n  <div class=\"pie\">MatixMedia · matixmedia.com.co</div>\n</div>\n<div class=\"msg\" id=\"msg\"></div>\n<script>\n(function(){\nvar MODO=document.body.getAttribute('data-modo'), K=document.body.getAttribute('data-k');\nvar D=null, filtro='Abiertos', abierto=null, CLIENTE='';\nfunction $(i){return document.getElementById(i);}\nfunction esc(s){return String(s==null?'':s).replace(/[&<>\"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c];});}\nfunction msg(t){var m=$('msg');m.textContent=t;m.style.display='block';clearTimeout(m._t);m._t=setTimeout(function(){m.style.display='none';},2600);}\nfunction fmt(n){return (Number(n)||0).toLocaleString('es-CO');}\nfunction run(fn,args,ok){var r=google.script.run.withSuccessHandler(ok).withFailureHandler(function(e){msg('Error: '+(e.message||e));document.querySelectorAll('button').forEach(function(b){b.disabled=false;});});\n  if(MODO==='cliente'){args=[K].concat(args);fn='wp_'+fn;}else{fn='eq_'+fn;}\n  r[fn].apply(r,args);}\nfunction cargar(){ $('lista').innerHTML='<div class=\"vacio\">Cargando…</div>';\n  run('datos',MODO==='cliente'?[]:[CLIENTE],function(d){D=d;pintar();});}\nfunction opciones(sel,arr,vacio){sel.innerHTML=(vacio?'<option value=\"\">'+vacio+'</option>':'')+arr.map(function(x){return '<option>'+esc(x)+'</option>';}).join('');}\nfunction pintar(){\n  $('titulo').innerHTML='Leads de <em>'+esc(D.cliente)+'</em>';\n  var r=D.resumen;\n  $('chips').innerHTML=[['Leads',r.leads],['Contactados',r.contactados],['Calificados',r.calificados],['Ventas',r.ventas],['Valor ventas',fmt(r.valor)]]\n    .map(function(c,i){return '<div class=\"chip c'+i+'\"><b>'+c[1]+'</b><span>'+c[0]+'</span></div>';}).join('');\n  opciones($('n_origen'),D.origenes); opciones($('n_plataforma'),D.plataformas);\n  var fs=['Abiertos','Todos'].concat(D.etapas);\n  $('filtros').innerHTML=fs.map(function(f){return '<button data-f=\"'+f+'\" class=\"'+(f===filtro?'sel':'')+'\">'+f+'</button>';}).join('');\n  lista();\n}\nfunction lista(){\n  var q=$('buscar').value.trim().toLowerCase();\n  var ls=D.leads.filter(function(l){\n    if(filtro==='Abiertos'&&(l.etapa==='Venta'||l.etapa==='Perdido'))return false;\n    if(filtro!=='Abiertos'&&filtro!=='Todos'&&l.etapa!==filtro)return false;\n    if(q&&(l.nombre+' '+l.tel+' '+l.email).toLowerCase().indexOf(q)<0)return false;return true;});\n  if(!ls.length){$('lista').innerHTML='<div class=\"vacio\">No hay leads en esta vista.</div>';return;}\n  $('lista').innerHTML=ls.map(card).join('');\n}\nfunction wa(t){var d=String(t||'').replace(/\\D/g,'');return d?'<a class=\"wa\" target=\"_blank\" href=\"https://wa.me/'+d+'\">WhatsApp</a>':'';}\nfunction card(l){\n  var seg=l.seguimiento?' · seguimiento '+l.seguimiento.replace('T',' '):'';\n  return '<div class=\"lead st-'+esc(l.etapa)+(abierto===l.id?' abierto':'')+'\" id=\"L_'+l.id+'\"><div class=\"cab\" data-id=\"'+l.id+'\"><div><b>'+esc(l.nombre||'(sin nombre)')+'</b>'+\n  '<div class=\"meta\">'+esc(l.id)+' · '+esc(l.fecha.replace('T',' '))+' · '+esc(l.plataforma||'')+' / '+esc(l.origen||'')+seg+'</div></div>'+\n  '<span class=\"badge e-'+esc(l.etapa)+'\">'+esc(l.etapa)+'</span></div>'+\n  '<div class=\"det\"><div class=\"meta\">'+esc(l.tel)+' '+wa(l.tel)+(l.email?' · '+esc(l.email):'')+(l.interes?' · '+esc(l.interes):'')+(l.campana?' · '+esc(l.campana):'')+'</div>'+\n  '<label>Etapa</label><div class=\"etapas\">'+D.etapas.map(function(e){return '<button data-et=\"'+e+'\" class=\"'+(e===l.etapa?'sel':'')+'\">'+e+'</button>';}).join('')+'</div>'+\n  '<div class=\"grid2\"><div><label>Valor de la venta</label><input class=\"f_valor\" inputmode=\"numeric\" value=\"'+esc(l.valor)+'\"></div>'+\n  '<div><label>Motivo de pérdida</label><input class=\"f_motivo\" value=\"'+esc(l.motivo)+'\"></div>'+\n  '<div><label>Próximo seguimiento</label><input class=\"f_seg\" type=\"datetime-local\" value=\"'+esc(l.seguimiento)+'\"></div>'+\n  '<div><label>Responsable</label><input class=\"f_resp\" value=\"'+esc(l.responsable)+'\"></div></div>'+\n  '<label>Agregar nota</label><textarea class=\"f_nota\"></textarea>'+\n  (l.notas?'<div class=\"notas\">'+esc(l.notas)+'</div>':'')+\n  '<div class=\"bar\" style=\"margin-top:8px\"><button class=\"ok b_guardar\" data-id=\"'+l.id+'\">Guardar</button></div></div></div>';\n}\ndocument.addEventListener('click',function(ev){\n  var t=ev.target;\n  if(t.dataset.f){filtro=t.dataset.f;pintar();return;}\n  var cab=t.closest('.cab'); if(cab){abierto=abierto===cab.dataset.id?null:cab.dataset.id;lista();return;}\n  if(t.dataset.et){var box=t.closest('.etapas');box.querySelectorAll('button').forEach(function(b){b.classList.remove('sel');});t.classList.add('sel');return;}\n  if(t.classList.contains('b_guardar')){\n    var c=t.closest('.lead'), id=t.dataset.id, s=c.querySelector('.etapas .sel');\n    var cambios={etapa:s?s.dataset.et:'',valor:c.querySelector('.f_valor').value,motivo:c.querySelector('.f_motivo').value,\n      seguimiento:c.querySelector('.f_seg').value,responsable:c.querySelector('.f_resp').value,nota:c.querySelector('.f_nota').value.trim()};\n    if(cambios.etapa==='Venta'&&!cambios.valor){msg('Escribe el valor de la venta');return;}\n    t.disabled=true; run('guardar',[id,cambios],function(){msg('Guardado');cargar();});\n  }\n});\n$('buscar').addEventListener('input',function(){if(D)lista();});\n$('btnNuevo').onclick=function(){$('formNuevo').classList.toggle('vis');};\n$('btnCancelar').onclick=function(){$('formNuevo').classList.remove('vis');};\n$('btnCrear').onclick=function(){\n  var d={cliente:CLIENTE};\n  ['nombre','tel','email','ciudad','origen','plataforma','campana','interes','responsable','fecha','notas','gclid','fbclid','meta_lead','tt_lead','ttclid','oppref']\n    .forEach(function(k){var v=$('n_'+k).value.trim();if(v)d[k]=v;});\n  if(!d.nombre&&!d.tel&&!d.email){msg('Escribe al menos nombre, teléfono o email');return;}\n  $('btnCrear').disabled=true;\n  run('crear',[d],function(id){msg('Lead '+id+' creado');$('btnCrear').disabled=false;$('formNuevo').classList.remove('vis');\n    document.querySelectorAll('#formNuevo input,#formNuevo textarea').forEach(function(i){i.value='';});cargar();});\n};\nif(MODO==='equipo'){\n  $('selCli').style.display='block';\n  google.script.run.withSuccessHandler(function(r){opciones($('cliente'),r.clientes);CLIENTE=r.elegido||r.clientes[0]||'';$('cliente').value=CLIENTE;cargar();})\n   .withFailureHandler(function(e){msg('Error: '+(e.message||e));}).eq_inicio();\n  $('cliente').onchange=function(){CLIENTE=this.value;abierto=null;cargar();};\n}else{cargar();}\n})();\n</script>\n" + '</body></html>';
}

function htmlConexiones_() {
  return "<!DOCTYPE html><html><head><base target=\"_top\"><meta charset=\"utf-8\"><link href=\"https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300&family=DM+Sans:opsz,wght@9..40,400;9..40,600&family=DM+Mono:wght@500&display=swap\" rel=\"stylesheet\"><style>\nbody{font-family:'DM Sans',Arial,sans-serif;font-size:13px;color:#FDFCF7;background:#04050A;margin:0;padding:0 14px 14px}\n.franja{height:3px;margin:0 -14px 10px;background:linear-gradient(90deg,#E8C046 0 33.3%,#CF343A 33.3% 66.6%,#22B088 66.6%)}\nlabel{display:block;font:500 9.5px 'DM Mono',monospace;color:#A8A598;text-transform:uppercase;letter-spacing:1px;margin:10px 0 4px}\ninput,select{font:inherit;width:100%;box-sizing:border-box;color:#FDFCF7;background:#0C0D13;border:1px solid rgba(255,255,255,.14);border-radius:6px;padding:8px;outline:none}\ninput:focus,select:focus{border-color:#E8C046} select option{background:#14151C}\nh3{margin:18px 0 2px;font:300 16px 'Fraunces',Georgia,serif;color:#FDFCF7;border-bottom:1px solid rgba(232,192,70,.35);padding-bottom:5px}\n.ok{color:#22B088;font-weight:600}.no{color:#CF343A}\nbutton{font:600 13px 'DM Sans',Arial,sans-serif;border:0;border-radius:6px;padding:10px 16px;background:linear-gradient(180deg,#2BC498,#1A9C78);color:#04050A;cursor:pointer;margin-top:14px}\nsmall{color:#8D8B80;font-size:11.5px}\n</style></head><body><div class=\"franja\"></div>\n<label>Cliente</label><select id=\"cli\"></select>\n<h3>Meta · leer formularios instantáneos</h3>\n<small>Lee solo los leads de los formularios de la página cada 15 min. Token de página con permiso leads_retrieval (usuario del sistema del Business Manager del cliente).</small>\n<label>ID de la página de Facebook</label><input id=\"meta_page\">\n<label>Token de la página <span id=\"s_page\"></span></label><input id=\"meta_page_token\" type=\"password\" placeholder=\"Vacío = no cambiar\">\n<h3>Meta (Conversions API para CRM)</h3>\n<small>Events Manager → conjunto de datos del cliente → Configuración → Conversions API → Generar token.</small>\n<label>ID del conjunto de datos (píxel)</label><input id=\"meta_dataset\">\n<label>Token de acceso <span id=\"s_meta\"></span></label><input id=\"meta_token\" type=\"password\" placeholder=\"Vacío = no cambiar\">\n<label>Código de prueba (Eventos de prueba, opcional)</label><input id=\"meta_test\">\n<h3>TikTok (eventos de CRM)</h3>\n<small>Ads Manager → Herramientas → Eventos → CRM → configuración manual → Generar token.</small>\n<label>ID del conjunto de eventos CRM</label><input id=\"tiktok_set\">\n<label>Token de acceso <span id=\"s_tiktok\"></span></label><input id=\"tiktok_token\" type=\"password\" placeholder=\"Vacío = no cambiar\">\n<label>Código de prueba (opcional)</label><input id=\"tiktok_test\">\n<h3>ChatGPT Ads (Conversions API)</h3>\n<label>Pixel ID</label><input id=\"openai_pixel\">\n<label>API key <span id=\"s_openai\"></span></label><input id=\"openai_key\" type=\"password\" placeholder=\"Vacío = no cambiar\">\n<small>Para borrar un token guardado escribe BORRAR en su campo.</small><br>\n<button id=\"g\">Guardar conexiones</button> <span id=\"m\"></span>\n<script>\nvar DATA=[];\nfunction $(i){return document.getElementById(i);}\nfunction pintar(){var c=DATA.filter(function(x){return x.cliente===$('cli').value;})[0]; if(!c)return;\n ['meta_dataset','tiktok_set','openai_pixel','meta_test','tiktok_test','meta_page'].forEach(function(k){$(k).value=c[k]||'';});\n ['meta_token','tiktok_token','openai_key','meta_page_token'].forEach(function(k){$(k).value='';});\n $('s_page').innerHTML=c.meta_page_token?'<span class=\"ok\">✓ guardado</span>':'<span class=\"no\">sin token</span>';\n $('s_meta').innerHTML=c.meta_token?'<span class=\"ok\">✓ guardado</span>':'<span class=\"no\">sin token</span>';\n $('s_tiktok').innerHTML=c.tiktok_token?'<span class=\"ok\">✓ guardado</span>':'<span class=\"no\">sin token</span>';\n $('s_openai').innerHTML=c.openai_key?'<span class=\"ok\">✓ guardada</span>':'<span class=\"no\">sin key</span>';}\ngoogle.script.run.withSuccessHandler(function(d){DATA=d;$('cli').innerHTML=d.map(function(c){return '<option>'+c.cliente+'</option>';}).join('');pintar();}).cx_inicio();\n$('cli').onchange=pintar;\n$('g').onclick=function(){var o={cliente:$('cli').value};\n ['meta_dataset','tiktok_set','openai_pixel','meta_test','tiktok_test','meta_page'].forEach(function(k){o[k]=$(k).value.trim();});\n ['meta_token','tiktok_token','openai_key','meta_page_token'].forEach(function(k){var v=$(k).value.trim();o[k]=v==='BORRAR'?'__BORRAR__':v;});\n $('g').disabled=true;$('m').textContent='Guardando…';\n google.script.run.withSuccessHandler(function(){google.script.run.withSuccessHandler(function(d){DATA=d;pintar();$('g').disabled=false;$('m').innerHTML='<span class=\"ok\">Guardado</span>';}).cx_inicio();})\n  .withFailureHandler(function(e){$('g').disabled=false;$('m').textContent='Error: '+e.message;}).cx_guardar(o);};\n</script></body></html>\n";
}
