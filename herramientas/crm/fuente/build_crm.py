"""MATIXMEDIA_CRM · CRM central de leads, con panel y conexiones por cliente.
Destino: Google Sheets nativo (fórmulas con sintaxis de Google Sheets).
El script CRM_MatixMedia.gs usa ESTAS columnas: si se cambian aquí, cambiar COLS en el script.
uso: python3 build_crm.py salida.xlsx [--muestra] [--test]
"""
import sys, datetime as dt
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.utils import get_column_letter as LET

out = sys.argv[1]
MUESTRA = "--muestra" in sys.argv
F = "DM Sans"
NAVY, GOLD, GREEN, GREY, SOFT = "04050A", "E8C046", "199477", "5A5A52", "FBF6E3"
N = 3000

def fill(c): return PatternFill("solid", fgColor=c)

def header(ws, cols, widths, colors=None):
    for i, (c, w) in enumerate(zip(cols, widths), 1):
        col = (colors or [NAVY] * len(cols))[i - 1]
        cell = ws.cell(row=1, column=i, value=c)
        cell.font = Font(name=F, bold=True, size=10, color=NAVY if col == GOLD else "FFFFFF")
        cell.fill = fill(col)
        cell.alignment = Alignment(vertical="center", wrap_text=True)
        ws.column_dimensions[cell.column_letter].width = w
    ws.row_dimensions[1].height = 32

cfg = [
    ("Zona horaria de la hoja (ISO)", "-05:00", "Debe coincidir con Archivo → Configuración → Zona horaria (Bogotá)", "tz_iso"),
    ("Indicativo por defecto", "57", "Si el cliente no tiene uno en Clientes", "indicativo"),
    ("Nombre del CRM", "CRM MatixMedia", "Va como lead_event_source en Meta y TikTok", "crm"),
    ("Carpeta CLIENTES (ID de Drive)", "14woLLnzG_y6yveQJrwYfaBoDnkyWbSmu", "Ahí busca la carpeta de cada cliente para su hoja de Google Ads", "carpeta_clientes"),
    ("Días máximos para enviar", 7, "Meta y ChatGPT no aceptan eventos de más de 7 días", "dias"),
    ("Versión de la API de Meta", "v23.0", "Cambiar cuando Meta la retire", "meta_version"),
    ("Meta · evento lead nuevo", "Lead", "Meta pide el lead nuevo + al menos 2 etapas", "meta_lead"),
    ("Meta · evento contactado", "Contactado", "", "meta_contactado"),
    ("Meta · evento calificado", "Lead calificado", "Se elige como objetivo en Meta", "meta_calificado"),
    ("Meta · evento venta", "Venta", "", "meta_venta"),
    ("TikTok · evento lead nuevo", "Lead nuevo", "Se mapean a las 4 etapas en Events Manager", "tiktok_lead"),
    ("TikTok · evento contactado", "Contactado", "", "tiktok_contactado"),
    ("TikTok · evento calificado", "Lead calificado", "", "tiktok_calificado"),
    ("TikTok · evento venta", "Venta", "", "tiktok_venta"),
    ("ChatGPT · evento lead nuevo", "lead_created", "Estándar (optimizable)", "chatgpt_lead"),
    ("ChatGPT · evento contactado", "lead_contactado", "Personalizado: se mide, no optimiza", "chatgpt_contactado"),
    ("ChatGPT · evento calificado", "lead_calificado", "Personalizado: se mide, no optimiza", "chatgpt_calificado"),
    ("ChatGPT · evento venta", "order_created", "Estándar. appointment_scheduled si es una cita", "chatgpt_venta"),
    ("URL de la app web", "", "La pega el script o tú, al implementar la app web (termina en /exec)", "url_web"),
]
CROW = {k: i for i, (_, _, _, k) in enumerate(cfg, 2)}
def CFG(k): return f"Config!$B${CROW[k]}"

wb = Workbook(); wb.remove(wb.active)

# ───────────── Leads ─────────────
LEADS = [  # (clave, encabezado, ancho, color)
    ("id", "ID lead", 10, NAVY), ("cliente", "Cliente", 18, NAVY), ("fecha", "Fecha y hora del lead", 17, NAVY),
    ("origen", "Origen", 15, NAVY), ("plataforma", "Plataforma", 11, NAVY), ("campana", "Campaña", 18, NAVY),
    ("nombre", "Nombre", 20, NAVY), ("email", "Email", 24, NAVY), ("tel", "Teléfono con indicativo", 17, NAVY),
    ("ciudad", "Ciudad", 12, NAVY), ("interes", "Interés / producto", 18, NAVY), ("responsable", "Responsable", 13, NAVY),
    ("etapa", "Etapa", 12, GOLD), ("seguimiento", "Próximo seguimiento", 15, GOLD), ("notas", "Notas", 30, GOLD),
    ("f_contactado", "Fecha contactado", 16, GOLD), ("f_calificado", "Fecha calificado", 16, GOLD),
    ("f_venta", "Fecha venta", 16, GOLD), ("valor", "Valor de la venta", 13, GOLD), ("motivo", "Motivo de pérdida", 18, GOLD),
    ("gclid", "gclid", 16, GREY), ("gbraid", "gbraid", 12, GREY), ("wbraid", "wbraid", 12, GREY),
    ("meta_lead", "Meta lead_id", 17, GREY), ("fbclid", "fbclid", 16, GREY), ("tt_lead", "TikTok lead_id", 17, GREY),
    ("ttclid", "ttclid", 16, GREY), ("oppref", "oppref", 16, GREY), ("actualizado", "Última actualización", 17, GREY),
    ("email_norm", "email_norm", 22, GREEN), ("tel_e164", "telefono_e164", 15, GREEN), ("iso_lead", "iso_lead", 22, GREEN),
    ("iso_calificado", "iso_calificado", 22, GREEN), ("iso_venta", "iso_venta", 22, GREEN),
]
C = {k: LET(i) for i, (k, *_) in enumerate(LEADS, 1)}
L = "Leads"
wl = wb.create_sheet(L)
header(wl, [x[1] for x in LEADS], [x[2] for x in LEADS], [x[3] for x in LEADS])
wl.freeze_panes = "C2"

def rng(k): return f"{C[k]}2:{C[k]}{N + 1}"
def ref(k): return f"{L}!{C[k]}2:{C[k]}{N + 1}"
# indicativo por cliente: BUSCARV en Clientes
indic = f'IFERROR(VLOOKUP({rng("cliente")},Clientes!$A$2:$D,4,FALSE),{CFG("indicativo")})'
wl[f'{C["email_norm"]}2'] = f'=ARRAYFORMULA(IF({rng("email")}="","",LOWER(TRIM({rng("email")}))))'
wl[f'{C["tel_e164"]}2'] = (f'=ARRAYFORMULA(IF({rng("tel")}="","","+"&IF(LEN(REGEXREPLACE(TO_TEXT({rng("tel")}),"[^0-9]",""))<=10,{indic}&REGEXREPLACE(TO_TEXT({rng("tel")}),"[^0-9]",""),REGEXREPLACE(TO_TEXT({rng("tel")}),"[^0-9]",""))))')
for k, src in (("iso_lead", "fecha"), ("iso_calificado", "f_calificado"), ("iso_venta", "f_venta")):
    wl[f'{C[k]}2'] = (f'=ARRAYFORMULA(IF({rng(src)}="","",TEXT({rng(src)},"yyyy-mm-dd")&"T"&TEXT({rng(src)},"hh:mm:ss")&{CFG("tz_iso")}))')

def lista(ws, vals, cr):
    dv = DataValidation(type="list", formula1='"' + ",".join(vals) + '"', allow_blank=True)
    ws.add_data_validation(dv); dv.add(cr)
ORIGENES = ["WhatsApp", "Formulario web", "Formulario Meta", "Formulario TikTok", "Llamada", "Venta directa", "Otro"]
PLATAFORMAS = ["Google", "Meta", "TikTok", "ChatGPT", "Orgánico", "Otra"]
ETAPAS = ["Nuevo", "Contactado", "Calificado", "Venta", "Perdido"]
lista(wl, ORIGENES, f'{C["origen"]}2:{C["origen"]}{N+1}')
lista(wl, PLATAFORMAS, f'{C["plataforma"]}2:{C["plataforma"]}{N+1}')
lista(wl, ETAPAS, f'{C["etapa"]}2:{C["etapa"]}{N+1}')
dvc = DataValidation(type="list", formula1="=Clientes!$A$2:$A$200", allow_blank=True)
wl.add_data_validation(dvc); dvc.add(f'{C["cliente"]}2:{C["cliente"]}{N+1}')
for k in ("fecha", "seguimiento", "f_contactado", "f_calificado", "f_venta", "actualizado"):
    for r in range(2, 4):
        wl[f"{C[k]}{r}"].number_format = "yyyy-mm-dd hh:mm"

# ───────────── Clientes ─────────────
CLI = [  # (encabezado, ancho, color)
    ("Cliente", 22, NAVY), ("Activo", 8, NAVY), ("Moneda", 8, NAVY), ("Indicativo", 9, NAVY),
    ("Meta · ID del conjunto de datos", 20, NAVY), ("TikTok · ID del conjunto de eventos CRM", 20, NAVY),
    ("ChatGPT · Pixel ID", 18, NAVY), ("Google · conversión calificado", 18, NAVY), ("Google · conversión venta", 18, NAVY),
    ("Google · valor del lead calificado", 14, NAVY),
    ("Hoja para Google Ads (la crea el script)", 30, GREY), ("Clave del panel (la crea el script)", 16, GREY), ("Clave de formularios (la crea el script)", 16, GREY),
    ("Enlace del panel (lo crea el script)", 34, GREY), ("Conexiones (lo llena el script)", 34, GREY), ("Notas", 24, NAVY),
]
wcl = wb.create_sheet("Clientes")
header(wcl, [x[0] for x in CLI], [x[1] for x in CLI], [x[2] for x in CLI])
wcl.freeze_panes = "B2"
lista(wcl, ["Sí", "No"], "B2:B200")
CLIENTES = ["BANANA TRAVEL", "BIMEL BY MANUB", "CAFÉ ESCOBAR", "DENTIPLAN PLUS", "DIOS TODO LO HACE NUEVO",
            "HALS LILIANA JONES", "HOTEL CABO DE LA VELA", "HUA NATURALS", "INFINITE THERAPY SOLUTIONS",
            "JAIRO GOOGLE ADS", "LOVELY HOUNDS", "MATIXMEDIA", "MEGAPAGOS", "PROVENZA", "QASA", "RHA",
            "THE GOATFATHER", "THE PINK ROOM", "TIENDA MARIAMAR", "TOMEDELLÍN"]
for i, c in enumerate(CLIENTES, 2):
    for j, v in enumerate([c, "Sí", "COP", "57", "", "", "", "Lead calificado", "Lead convertido", ""], 1):
        cell = wcl.cell(row=i, column=j, value=v); cell.font = Font(name=F, size=10)
        if j > 1: cell.fill = fill(SOFT)

# ───────────── Panel ─────────────
wp = wb.create_sheet("Panel")
wp.column_dimensions["A"].width = 30
for c in "BCDEFG": wp.column_dimensions[c].width = 15
wp["A1"] = "PANEL DEL CRM"; wp["A1"].font = Font(name=F, bold=True, size=14, color=NAVY)
wp["A2"] = "Cliente (elegir) →"; wp["A2"].font = Font(name=F, bold=True, size=11, color=NAVY)
wp["B2"] = CLIENTES[0]; wp["B2"].fill = fill(SOFT); wp["B2"].font = Font(name=F, bold=True, size=11)
dvp = DataValidation(type="list", formula1="=Clientes!$A$2:$A$200", allow_blank=False)
wp.add_data_validation(dvp); dvp.add("B2")
wp["D2"] = '="Actualizado: "&TEXT(NOW(),"yyyy-mm-dd hh:mm")'; wp["D2"].font = Font(name=F, size=9, color="5B6170")
SEL = "$B$2"
def H(row, vals, color=NAVY):
    for j, v in enumerate(vals, 1):
        c = wp.cell(row=row, column=j, value=v)
        c.font = Font(name=F, bold=True, size=10, color=NAVY if color == GOLD else "FFFFFF"); c.fill = fill(color)
def W(cell, v, fmt=None):
    wp[cell] = v; wp[cell].font = Font(name=F, size=10)
    if fmt: wp[cell].number_format = fmt
cli = f'{ref("cliente")},{SEL}'
H(4, ["Embudo del cliente", "Cantidad", "% de los leads"])
for i, (k, f) in enumerate([
        ("Leads", f'=COUNTIF({ref("cliente")},{SEL})'),
        ("Contactados", f'=COUNTIFS({cli},{ref("f_contactado")},"<>")'),
        ("Calificados", f'=COUNTIFS({cli},{ref("f_calificado")},"<>")'),
        ("Ventas", f'=COUNTIFS({cli},{ref("f_venta")},"<>")'),
        ("Perdidos", f'=COUNTIFS({cli},{ref("etapa")},"Perdido")')], 5):
    W(f"A{i}", k); W(f"B{i}", f); W(f"C{i}", f"=IFERROR(B{i}/$B$5,0)", "0.0%")
W("A10", "Valor total de ventas"); W("B10", f'=SUMIFS({ref("valor")},{cli})', "#,##0")
W("A11", "Ticket promedio"); W("B11", "=IFERROR(B10/B8,0)", "#,##0")
H(13, ["Por plataforma", "Leads", "Calificados", "Ventas", "% calificación", "% venta", "Valor ventas"])
for i, p in enumerate(PLATAFORMAS, 14):
    W(f"A{i}", p)
    W(f"B{i}", f'=COUNTIFS({cli},{ref("plataforma")},A{i})')
    W(f"C{i}", f'=COUNTIFS({cli},{ref("plataforma")},A{i},{ref("f_calificado")},"<>")')
    W(f"D{i}", f'=COUNTIFS({cli},{ref("plataforma")},A{i},{ref("f_venta")},"<>")')
    W(f"E{i}", f"=IFERROR(C{i}/B{i},0)", "0.0%"); W(f"F{i}", f"=IFERROR(D{i}/B{i},0)", "0.0%")
    W(f"G{i}", f'=SUMIFS({ref("valor")},{cli},{ref("plataforma")},A{i})', "#,##0")
H(21, ["Por origen", "Leads", "Calificados", "Ventas"])
for i, o in enumerate(ORIGENES, 22):
    W(f"A{i}", o)
    W(f"B{i}", f'=COUNTIFS({cli},{ref("origen")},A{i})')
    W(f"C{i}", f'=COUNTIFS({cli},{ref("origen")},A{i},{ref("f_calificado")},"<>")')
    W(f"D{i}", f'=COUNTIFS({cli},{ref("origen")},A{i},{ref("f_venta")},"<>")')
H(30, ["Seguimientos para hoy o atrasados", "Nombre", "Teléfono", "Responsable", "Etapa", "Seguimiento"], GOLD)
cols = ",".join(ref(k) for k in ("id", "nombre", "tel", "responsable", "etapa", "seguimiento"))
W("A31", (f'=IFERROR(SORT(FILTER({{{cols}}},{ref("cliente")}={SEL},{ref("seguimiento")}<>"",'
          f'{ref("seguimiento")}<INT(TODAY())+1,{ref("etapa")}<>"Venta",{ref("etapa")}<>"Perdido"),6,TRUE),'
          f'"Sin seguimientos pendientes")'))
wp["F31"].number_format = "yyyy-mm-dd hh:mm"
# Resumen de todos los clientes (columna I en adelante)
for c, w in zip("IJKLMN", (24, 10, 12, 10, 14, 10)): wp.column_dimensions[c].width = w
for j, v in enumerate(["Todos los clientes", "Leads", "Calificados", "Ventas", "Valor ventas", "% venta"], 9):
    c = wp.cell(row=4, column=j, value=v); c.font = Font(name=F, bold=True, size=10, color="FFFFFF"); c.fill = fill(GREEN)
wp["I5"] = '=FILTER(Clientes!A2:A200,Clientes!A2:A200<>"",Clientes!B2:B200<>"No")'
TODOS = "I5:I40"
W("J5", f'=MAP({TODOS},LAMBDA(c,IF(c="","",COUNTIF({ref("cliente")},c))))')
W("K5", f'=MAP({TODOS},LAMBDA(c,IF(c="","",COUNTIFS({ref("cliente")},c,{ref("f_calificado")},"<>"))))')
W("L5", f'=MAP({TODOS},LAMBDA(c,IF(c="","",COUNTIFS({ref("cliente")},c,{ref("f_venta")},"<>"))))')
W("M5", f'=MAP({TODOS},LAMBDA(c,IF(c="","",SUMIFS({ref("valor")},{ref("cliente")},c))))')
W("N5", '=MAP(J5:J40,L5:L40,LAMBDA(j,l,IF(j="","",IFERROR(l/j,0))))')
for r in range(5, 41):
    wp[f"M{r}"].number_format = "#,##0"; wp[f"N{r}"].number_format = "0.0%"

# ───────────── TikTok_CSV (del cliente elegido en Panel) ─────────────
wt = wb.create_sheet("TikTok_CSV")
header(wt, ["Event_type", "Timestamp", "lead_id", "Email", "Phone", "click_id", "Value", "Currency", "Order_id"],
       [18, 26, 22, 26, 16, 24, 12, 10, 18], [GREEN] * 9)
wt.freeze_panes = "A2"
def IFD(k, v): return f'IF({ref(k)}<>"",{v},"")'
mon = f'IFERROR(VLOOKUP(Panel!{SEL},Clientes!$A$2:$C,3,FALSE),"COP")'
tid = f'(({ref("tt_lead")}<>"")+({ref("ttclid")}<>"")+({ref("email_norm")}<>"")+({ref("tel_e164")}<>""))'
partes = []
for fk, iso, nombre, valor, suf in (("fecha", "iso_lead", CFG("tiktok_lead"), '""', "-lead"),
                                    ("f_calificado", "iso_calificado", CFG("tiktok_calificado"), '""', "-calificado"),
                                    ("f_venta", "iso_venta", CFG("tiktok_venta"), IFD("f_venta", ref("valor")), "-venta")):
    ex = [IFD(fk, nombre), IFD(fk, ref(iso)), ref("tt_lead"), ref("email_norm"), ref("tel_e164"), ref("ttclid"), valor,
          IFD(fk, mon), f'{ref("id")}&"{suf}"']
    cond = f'({ref("cliente")}=Panel!{SEL})*({ref("plataforma")}="TikTok")*({ref(fk)}<>"")*({tid}>0)'
    partes.append(f'IFERROR(FILTER(HSTACK({",".join(ex)}),{cond}),"")')
stack = f'IFERROR(VSTACK({",".join(partes)}),"")'
wt["A2"] = f'=IFERROR(FILTER({stack},INDEX({stack},0,1)<>""),"")'

# ───────────── Envios ─────────────
we = wb.create_sheet("Envios")
header(we, ["ID del evento", "Cliente", "Plataforma", "Evento", "Fecha del evento", "Enviado el", "Estado", "Detalle"],
       [22, 18, 11, 18, 17, 17, 11, 60], [GREY] * 8)
we.freeze_panes = "A2"

# ───────────── Config (general, no secreta) ─────────────
wc = wb.create_sheet("Config")
header(wc, ["Ajuste", "Valor", "Para qué", "clave"], [34, 26, 64, 16], [GREY] * 4)
for i, (a, b, c, k) in enumerate(cfg, 2):
    wc.cell(row=i, column=1, value=a).font = Font(name=F, bold=True, size=10)
    v = wc.cell(row=i, column=2, value=b); v.fill = fill(SOFT); v.font = Font(name=F, size=10)
    wc.cell(row=i, column=3, value=c).font = Font(name=F, size=9, color="5B6170")
    wc.cell(row=i, column=4, value=k).font = Font(name=F, size=8, color="A0A4AD")

# ───────────── Instrucciones ─────────────
wi = wb.create_sheet("Instrucciones")
wi.column_dimensions["A"].width = 110
txt = [("CRM DE LEADS · MatixMedia", "t"),
       ("Todos los leads de todos los clientes. Cada cliente tiene su panel y sus propias conexiones a Meta, TikTok, ChatGPT y Google.", ""),
       ("", ""), ("USO", "h"),
       ("• Menú MatixMedia → Panel lateral: crear leads y moverlos de etapa. Al cambiar la Etapa en Leads, su fecha se llena sola.", ""),
       ("• Panel: elegir el cliente en B2. TikTok_CSV muestra el CSV de ese cliente.", ""),
       ("• Cada cliente puede usar su enlace privado del panel web (columna M de Clientes).", ""),
       ("", ""), ("NO TOCAR", "h"),
       ("• No insertar ni mover columnas en Leads ni en Clientes. Las columnas verdes y grises las llenan fórmulas o el script.", ""),
       ("• Los tokens nunca van en celdas: se cargan con MatixMedia → Conectar cliente.", ""),
       ("", ""), ("Paso a paso: guía 12_Guia_Retorno_Leads en _MatixMedia/GUIAS/. Datos personales: no compartir esta hoja con clientes (ellos usan su enlace).", "")]
for i, (t, kind) in enumerate(txt, 1):
    c = wi.cell(row=i, column=1, value=t); c.alignment = Alignment(wrap_text=True, vertical="top")
    c.font = Font(name=F, bold=kind in ("t", "h"), size=14 if kind == "t" else 10,
                  color=NAVY if kind == "t" else (GOLD if kind == "h" else "000000"))

if MUESTRA:
    d = dt.datetime
    rows = [  # en el orden de LEADS (sin calculadas)
        ["L-0001", "BANANA TRAVEL", d(2026, 10, 20, 9, 15), "Formulario web", "Google", "leads-awaken-1026", "Ana Pérez", " Ana.Perez@Gmail.com ", "+57 300 123 4567", "Bogotá", "Plan", "Laura",
         "Venta", None, "", d(2026, 10, 20, 11, 0), d(2026, 10, 21, 11, 0), d(2026, 10, 24, 16, 30), 1850000, "", "Cj0KCQjw_ejemplo", "", "", "", "", "", "", "", None],
        ["L-0002", "BANANA TRAVEL", d(2026, 10, 20, 10, 5), "Formulario Meta", "Meta", "leads-awaken-1026", "Luis Gómez", "luis@empresa.co", "573151234567", "Medellín", "", "Laura",
         "Calificado", d(2026, 10, 26, 9, 0), "", d(2026, 10, 21, 9, 0), d(2026, 10, 22, 9, 0), None, None, "", "", "", "", "120212345678901", "", "", "", "", None],
        ["L-0003", "BANANA TRAVEL", d(2026, 10, 21, 18, 40), "Formulario TikTok", "TikTok", "leads-awaken-1026", "Sara Ruiz", "sara@correo.com", "(57) 310-555-0101", "Cali", "", "Cliente",
         "Venta", None, "", None, d(2026, 10, 22, 10, 0), d(2026, 10, 25, 12, 0), 920000, "", "", "", "", "", "", "7412345678901234567", "E.C.P.ttclid_ejemplo", "", None],
        ["L-0004", "QASA", d(2026, 10, 22, 8, 0), "WhatsApp", "ChatGPT", "", "Mario Díaz", "mario@correo.com", "3009998877", "Bogotá", "", "Laura",
         "Calificado", None, "", None, d(2026, 10, 23, 15, 0), None, None, "", "", "", "", "", "", "", "", "oppref_ejemplo", None],
        ["L-0005", "QASA", d(2026, 10, 22, 9, 0), "Llamada", "Google", "", "Sin datos", "", "", "", "", "",
         "Perdido", None, "", None, None, None, None, "No contestó", "", "", "", "", "", "", "", "", None],
    ]
    for i, row in enumerate(rows, 2):
        for j, v in enumerate(row, 1):
            wl.cell(row=i, column=j, value=v)

orden = ["Leads", "Panel", "Clientes", "TikTok_CSV", "Envios", "Config", "Instrucciones"]
wb._sheets = [wb[n] for n in orden]
for w, col in zip(wb.worksheets, (GOLD, NAVY, NAVY, GREEN, GREY, GREY, NAVY)):
    w.sheet_properties.tabColor = col
if "--test" in sys.argv:
    wb.remove(wb["Instrucciones"])
    tt = wb.create_sheet("TEST", 0)
    tt["A1"] = (f'=IFERROR(VSTACK(TikTok_CSV!A1:I6,Leads!{C["email_norm"]}1:{C["iso_venta"]}6,Panel!A4:G19,Panel!A30:F32,Panel!I4:N8),"")')
wb.save(out)
print("ok", wb.sheetnames, "cols", len(LEADS), {k: C[k] for k in ("cliente", "etapa", "valor", "actualizado", "iso_venta")})
