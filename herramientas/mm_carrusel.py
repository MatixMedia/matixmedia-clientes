#!/usr/bin/env python3
"""mm_carrusel.py — carruseles e imagen de blog con la identidad de un cliente (sistema MatixMedia).

Uso:
  python3 mm_carrusel.py generar guion.json [--salida carpeta]
      -> carrusel.html, lamina_01.png…, carrusel.pdf, muestra.jpg y, si el guion trae "blog",
         imagen_blog_<formato>.png
  python3 mm_carrusel.py unir carpeta_tiles --cols 3 --filas 2 --salida imagen.png
      -> une capturas t_<col>_<fila>.png (todas del mismo tamaño) en una sola imagen
  python3 mm_carrusel.py identidad nombre        -> imprime la identidad guardada

El guion es un JSON (ver el skill mm_carrusel). Las identidades viven en identidades/<nombre>.json
junto a este archivo (o en la URL raw del repo). Necesita Python 3 + Playwright (Chromium) para
los PNG y el PDF; sin Playwright deja solo el HTML. Pillow es opcional (muestra y unir).
"""
import base64, html, json, os, pathlib, re, subprocess, sys, urllib.request

AQUI = pathlib.Path(__file__).resolve().parent
RAW = "https://raw.githubusercontent.com/MatixMedia/matixmedia-clientes/main/herramientas/"
CACHE = pathlib.Path(os.environ.get("MM_CACHE", pathlib.Path.home() / ".cache" / "mm_carrusel"))
FORMATOS = {"4:5": (1080, 1350), "3:4": (1080, 1440), "1:1": (1080, 1080)}
BLOG = {"horizontal": (1200, 630), "cuadrada": (1200, 1200), "vertical": (1080, 1350)}


# ───────────────────────── utilidades ─────────────────────────
def _bajar(url, destino):
    destino.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(url, timeout=60) as r:
        destino.write_bytes(r.read())
    return destino


def _archivo(ref, base):
    """Ruta local de un recurso: ruta absoluta/relativa, nombre en identidades/ o URL."""
    if ref.startswith("http"):
        return _bajar(ref, CACHE / "recursos" / re.sub(r"[^\w.-]", "_", ref.split("/")[-1]))
    for cand in (pathlib.Path(ref), base / ref, AQUI / "identidades" / ref):
        if cand.exists():
            return cand
    return _bajar(RAW + "identidades/" + ref, CACHE / "identidades" / ref)


def _data_uri(p):
    ext = p.suffix.lower().lstrip(".")
    mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp", "svg": "image/svg+xml"}.get(ext, "image/png")
    return f"data:{mime};base64," + base64.b64encode(p.read_bytes()).decode()


def _txt(s):
    """Escapa HTML y convierte *palabras* en el color de acento."""
    s = html.escape(s or "", quote=False)
    return re.sub(r"\*(.+?)\*", r"<em>\1</em>", s)


def cargar_identidad(ref, base=AQUI):
    if isinstance(ref, dict):
        return ref
    p = _archivo(ref if ref.endswith(".json") else ref + ".json", base)
    return json.loads(p.read_text(encoding="utf-8"))


# ───────────────────────── fuentes ─────────────────────────
def fuente_css(familia):
    """@font-face de una familia de Google Fonts (variable), descargada del repo google/fonts."""
    slug = re.sub(r"[^a-z0-9]", "", familia.lower())
    caja = CACHE / "fuentes" / slug
    meta = caja / "METADATA.pb"
    if not meta.exists():
        for lic in ("ofl", "apache", "ufl"):
            try:
                _bajar(f"https://raw.githubusercontent.com/google/fonts/main/{lic}/{slug}/METADATA.pb", meta)
                (caja / "LIC").write_text(lic)
                break
            except Exception:
                continue
    if not meta.exists():
        print(f"⚠️ No encontré la fuente {familia}; se usará una del sistema.", file=sys.stderr)
        return ""
    lic = (caja / "LIC").read_text().strip()
    css, vistos = [], set()
    for bloque in re.findall(r"fonts \{(.*?)\n\}", meta.read_text(encoding="utf-8"), re.S):
        fn = re.search(r'filename: "([^"]+)"', bloque).group(1)
        estilo = re.search(r'style: "([^"]+)"', bloque).group(1)
        peso = re.search(r"weight: (\d+)", bloque).group(1)
        destino = caja / fn
        if not destino.exists():
            _bajar(f"https://raw.githubusercontent.com/google/fonts/main/{lic}/{slug}/{urllib.request.quote(fn)}", destino)
        variable = "[" in fn
        clave = (fn, estilo if variable else peso)
        if clave in vistos:
            continue
        vistos.add(clave)
        rango = "100 1000" if variable else peso
        css.append(f'@font-face{{font-family:"{familia}";font-style:{estilo};font-weight:{rango};src:url("{destino.as_uri()}")}}')
    return "\n".join(css)


# ───────────────────────── piezas ─────────────────────────
CHECK = '<svg viewBox="0 0 24 24" width="36" height="36"><circle cx="12" cy="12" r="11" fill="var(--pos)"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="var(--bg)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
ICONOS = {"luna": '<svg viewBox="0 0 24 24" width="34" height="34"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" fill="var(--ink)"/></svg>'}
COLOR = {"acento": "acc", "positivo": "pos", "negativo": "neg", "texto": "ink"}


class Carrusel:
    def __init__(self, guion, base):
        self.g, self.base = guion, base
        self.idn = cargar_identidad(guion["identidad"], base)
        self.W, self.H = FORMATOS[guion.get("formato", "4:5")]
        self.imgs = {k: _data_uri(_archivo(v, base)) for k, v in guion.get("imagenes", {}).items()}
        logo = self.idn.get("logo")
        self.logo = _data_uri(_archivo(logo, base)) if logo else ""
        self.total = len(guion["laminas"])

    # — partes comunes —
    def top(self, n):
        logo = f'<img class="logo" src="{self.logo}" alt="{html.escape(self.idn.get("marca", ""))}">' if self.logo else f'<b class="marca">{html.escape(self.idn.get("marca", ""))}</b>'
        return f'<div class="top">{logo}<span class="count">{n:02d} / {self.total:02d}</span></div>'

    def foot(self, n, lam):
        pie = self.g.get("pie", {})
        izq = lam.get("pie_izq", pie.get("izq", self.idn.get("web", "")))
        der = lam.get("pie_der", pie.get("der_ultima" if n == self.total else "der", "Desliza →"))
        return f'<div class="foot"><span>{_txt(izq)}</span><span class="swipe">{_txt(der)}</span></div>'

    def kicker(self, t):
        return f'<p class="kicker"><span class="dash"></span>{_txt(t)}</p>' if t else ""

    def consejo(self, c):
        if not c:
            return ""
        if isinstance(c, str):
            c = {"texto": c}
        pre = f'<b>{_txt(c.get("pre", ""))}</b> ' if c.get("pre") else ""
        return f'<div class="tip">{CHECK}<p>{pre}{_txt(c["texto"])}</p></div>'

    def adorno(self, a):
        if not a:
            return ""
        src = self.imgs.get(a["imagen"], "")
        tr = []
        if a.get("espejo"):
            tr.append("scaleX(-1)")
        if a.get("giro"):
            tr.append(f'rotate({a["giro"]}deg)')
        est = f'width:{a.get("ancho", 220)}px;' + (f'transform:{" ".join(tr)};' if tr else "")
        for k in ("top", "right", "bottom", "left"):
            if k in a:
                est += f"{k}:{a[k]}px;"
        mezcla = "" if a.get("transparente", True) else " opaco"
        return f'<img class="adorno a-{a.get("lugar", "abajo-derecha")}{mezcla}" style="{est}" src="{src}" alt="">'

    def tarjeta(self, inner, clase=""):
        franja = "".join(f'<i style="background:{c}"></i>' for c in self.idn.get("franja", []))
        return f'<div class="card {clase}"><div class="stripe">{franja}</div>{inner}</div>'

    # — tipos de lámina —
    def portada(self, n, l):
        img = self.imgs.get(l.get("imagen", ""), "")
        fondo = f'<img class="cover-img" src="{img}" alt=""><div class="cover-fade"></div>' if img else ""
        return f'''{fondo}{self.top(n)}<div class="cover-text">{self.kicker(l.get("etiqueta"))}
<h1>{_txt(l["titulo"])}</h1>{f'<p class="sub">{_txt(l["texto"])}</p>' if l.get("texto") else ""}</div>{self.adorno(l.get("adorno"))}{self.foot(n, l)}''', "cover"

    def _cabeza(self, n, l, grande=False):
        est = f' style="max-width:{l["titulo_ancho"]}px"' if l.get("titulo_ancho") else ""
        return f'{self.top(n)}{self.kicker(l.get("etiqueta"))}<h2 class="{"big" if grande else ""}"{est}>{_txt(l["titulo"])}</h2>'

    def _cierre(self, n, l):
        return f'{self.consejo(l.get("consejo"))}{self.foot(n, l)}'

    def _aplica(self, l, lugar):
        a = l.get("adorno")
        return self.adorno(a) if a and a.get("lugar") == lugar else ""

    def datos(self, n, l):
        t = l["tarjeta"]
        celdas = []
        for i, d in enumerate(t["datos"]):
            extra = self._aplica(l, "en-dato") if i == len(t["datos"]) - 1 else ""
            celdas.append(f'<div class="tile"><span class="stat-k">{_txt(d["k"])}</span><span class="stat-v {COLOR.get(d.get("color", "acento"), "acc")}">{_txt(d["v"])}</span>{extra}</div>')
        inner = f'<p class="card-label">{_txt(t.get("etiqueta", ""))}</p><div class="stats">{"".join(celdas)}</div>'
        if t.get("nota"):
            inner += f'<p class="card-note">{_txt(t["nota"])}</p>'
        return self._cabeza(n, l) + self.tarjeta(inner, self._clase_tarjeta(l)) + self._afuera(l) + self._cierre(n, l), self._clase_pag(l)

    def barras(self, n, l):
        t = l["tarjeta"]
        vals = t["valores"]
        tope = max(vals) or 1
        umbral = t.get("umbral", tope * 0.45)
        barras = "".join(f'<i class="{"hot" if v > umbral else ""}" style="height:{v / tope * 100:.1f}%"></i>' for v in vals)
        marca = ""
        if t.get("marca"):
            marca = f'<span class="mark">{ICONOS.get(t.get("icono", ""), "")}<b>{_txt(t["marca"])}</b></span>'
        eje = "".join(f"<span>{_txt(e)}</span>" for e in t.get("eje", []))
        inner = f'<div class="card-row"><p class="card-label">{_txt(t.get("etiqueta", ""))}</p>{marca}</div><div class="bars">{barras}</div>{self._aplica(l, "sobre-grafico")}<div class="axis">{eje}</div>'
        return self._cabeza(n, l) + self.tarjeta(inner, self._clase_tarjeta(l)) + self._afuera(l) + self._cierre(n, l), self._clase_pag(l)

    def lista(self, n, l):
        t = l["tarjeta"]
        filas = "".join(f'<div class="row"><span class="av"></span><span class="lines"><i></i><i class="short"></i></span><span class="pill">{_txt(f.get("estado", ""))}</span></div>' for f in t["filas"])
        inner = f'<p class="card-label">{_txt(t.get("etiqueta", ""))}</p>{filas}'
        return self._cabeza(n, l) + self.tarjeta(inner, self._clase_tarjeta(l)) + self._afuera(l) + self._cierre(n, l), self._clase_pag(l)

    def comparacion(self, n, l):
        t = l["tarjeta"]

        def lado(d):
            return f'<div><span class="stat-k">{_txt(d["k"])}</span><span class="stat-v {COLOR.get(d.get("color", "acento"), "acc")}">{_txt(d["v"])}</span><span class="stat-s">{_txt(d.get("s", ""))}</span></div>'
        inner = f'<div class="vs">{lado(t["izq"])}<span class="vs-mid">{_txt(t.get("medio", "vs"))}</span>{lado(t["der"])}</div>'
        return self._cabeza(n, l) + self.tarjeta(inner, self._clase_tarjeta(l)) + self._afuera(l) + self._cierre(n, l), self._clase_pag(l)

    def anuncio(self, n, l):
        t = l["tarjeta"]
        m, tend = t.get("metrica", {}), t.get("tendencia", {})
        y0, y1 = (14, 98) if tend.get("direccion", "baja") == "baja" else (98, 14)
        col = "var(--neg)" if tend.get("direccion", "baja") == "baja" else "var(--pos)"
        spark = f'<svg class="spark" viewBox="0 0 300 110"><polyline points="6,{y0} 70,{y0 + (y1 - y0) * .15:.0f} 130,{y0 + (y1 - y0) * .36:.0f} 190,{y0 + (y1 - y0) * .67:.0f} 250,{y0 + (y1 - y0) * .88:.0f} 294,{y1}" fill="none" stroke="{col}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        inner = f'''<div class="ad"><div class="ad-thumb">{self._aplica(l, "en-miniatura")}<span>{_txt(t.get("miniatura", ""))}</span></div>
<div class="ad-stats"><div><span class="stat-k">{_txt(m.get("k", ""))}</span><span class="stat-v sm {COLOR.get(m.get("color", "negativo"), "neg")}">{_txt(m.get("v", ""))}</span></div>
<div><span class="stat-k">{_txt(tend.get("k", ""))}</span>{spark}<span class="spark-l"><b>{_txt(tend.get("desde", ""))}</b><b class="neg">{_txt(tend.get("hasta", ""))}</b></span></div></div></div>'''
        return self._cabeza(n, l) + self.tarjeta(inner, self._clase_tarjeta(l)) + self._afuera(l) + self._cierre(n, l), self._clase_pag(l)

    def frase(self, n, l):
        texto = f'<p class="sub wide">{_txt(l["texto"])}</p>' if l.get("texto") else ""
        return self._cabeza(n, l, grande=True) + texto + self.adorno(l.get("adorno")) + self.foot(n, l), "frase"

    def cta(self, n, l):
        texto = f'<p class="sub wide">{_txt(l["texto"])}</p>' if l.get("texto") else ""
        boton = f'<div class="btn">{_txt(l["boton"])}</div>' if l.get("boton") else ""
        return self._cabeza(n, l, grande=True) + texto + boton + self.adorno(l.get("adorno")) + self.foot(n, l), "cta"

    # — posiciones de adorno que dependen de la tarjeta —
    def _clase_tarjeta(self, l):
        lugar = (l.get("adorno") or {}).get("lugar")
        return "ov" if lugar in ("esquina-tarjeta", "bajo-tarjeta") else ""

    def _afuera(self, l):
        return ""

    def _clase_pag(self, l):
        lugar = (l.get("adorno") or {}).get("lugar")
        return "con-bajo" if lugar == "bajo-tarjeta" else ""

    def lamina(self, n, l):
        cuerpo, clase = getattr(self, l["tipo"])(n, l)
        if l["tipo"] not in ("portada", "frase", "cta"):
            lugar = (l.get("adorno") or {}).get("lugar")
            if lugar in ("esquina-tarjeta", "bajo-tarjeta"):
                # el adorno va dentro de la tarjeta para que siga su posición
                cuerpo = cuerpo.replace('<div class="stripe">', self.adorno(l["adorno"]) + '<div class="stripe">', 1)
            elif lugar == "abajo-derecha":
                cuerpo += self.adorno(l["adorno"])
        return f'<section class="page {clase} {l.get("clase", "")}" data-document-role="page" data-label="Lámina {n}">{cuerpo}</section>'

    # — documento —
    def css(self):
        c, f = self.idn["colores"], self.idn["fuentes"]
        ft, fx = f["titulos"]["familia"], f["texto"]["familia"]
        pt = f["titulos"].get("peso", 600)
        fuentes = fuente_css(ft) + "\n" + (fuente_css(fx) if fx != ft else "")
        brillos = ",".join(f'radial-gradient(620px 540px at {b["pos"]},{_rgba(b["color"], b.get("alfa", .18))},transparent 70%)' for b in self.idn.get("brillos", []))
        btn = self.idn.get("boton", {"de": c["positivo"], "a": c["positivo"], "texto": c["fondo"]})
        logo_r = "50%" if self.idn.get("logo_redondo", True) else "0"
        W, H = self.W, self.H
        return fuentes + f'''
:root{{--bg:{c["fondo"]};--ink:{c["texto"]};--ink2:{c["texto2"]};--muted:{c["suave"]};--acc:{c["acento"]};--pos:{c["positivo"]};--neg:{c["negativo"]}}}
@page{{size:{W}px {H}px;margin:0}}
*{{box-sizing:border-box;margin:0;padding:0}}
html,body{{background:#111}}
body{{font-family:"{fx}",system-ui,sans-serif;color:var(--ink)}}
.page{{position:relative;width:{W}px;height:{H}px;overflow:hidden;break-after:page;padding:0 88px;background:{brillos + "," if brillos else ""}var(--bg)}}
.top{{position:absolute;left:88px;right:88px;top:64px;display:flex;justify-content:space-between;align-items:center;z-index:5}}
.logo{{height:62px;width:auto;border-radius:{logo_r}}}
.marca{{font-family:"{ft}",serif;font-size:34px}}
.count{{font-size:24px;color:var(--muted);letter-spacing:.06em;font-weight:500}}
.kicker{{display:flex;align-items:center;gap:18px;color:var(--acc);font-size:30px;font-weight:500;margin-top:228px}}
.dash{{display:inline-block;width:46px;height:3px;background:var(--acc);border-radius:2px;flex:none}}
h1,h2{{font-family:"{ft}",serif;font-weight:{pt};letter-spacing:-.015em}}
h1 em,h2 em{{font-style:normal;color:var(--acc)}}
h2{{font-size:78px;line-height:1.04;margin-top:30px;max-width:904px}}
h2.big{{font-size:96px;line-height:1.02}}
.sub{{font-size:34px;line-height:1.4;color:var(--ink2);margin-top:30px;max-width:840px}}
.sub.wide{{max-width:880px}}
.card{{position:relative;margin-top:64px;border:2px solid rgba(255,255,255,.14);border-radius:36px;padding:60px 56px 54px;background:linear-gradient(180deg,rgba(255,255,255,.075),rgba(255,255,255,.025));overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.45)}}
.card.ov{{overflow:visible}}
.stripe{{position:absolute;left:0;right:0;top:0;height:9px;display:flex;border-radius:34px 34px 0 0;overflow:hidden}}
.stripe i{{flex:1}}
.card-label{{font-size:24px;color:var(--muted);letter-spacing:.12em;text-transform:uppercase;font-weight:600}}
.card-row{{display:flex;justify-content:space-between;align-items:center;gap:20px}}
.card-note{{margin-top:32px;font-size:28px;color:var(--ink2)}}
.stats{{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:28px;margin-top:26px}}
.tile,.vs>div{{position:relative;border:2px solid rgba(255,255,255,.10);border-radius:26px;padding:28px 30px;background:rgba(0,0,0,.35)}}
.stat-k{{display:block;font-size:28px;color:var(--ink2);font-weight:500}}
.stat-v{{display:block;font-family:"{ft}",serif;font-weight:{pt};font-size:150px;line-height:1.05;margin-top:8px}}
.stat-v.sm{{font-size:96px}}
.stat-s{{display:block;font-size:24px;color:var(--muted)}}
.acc{{color:var(--acc)}} .pos{{color:var(--pos)}} .neg{{color:var(--neg)}} .ink{{color:var(--ink)}}
.mark{{display:flex;align-items:center;gap:10px;font-size:24px;white-space:nowrap}}
.bars{{display:flex;align-items:flex-end;gap:9px;height:236px;margin-top:32px}}
.bars i{{flex:1;background:rgba(255,255,255,.22);border-radius:6px 6px 2px 2px}}
.bars i.hot{{background:var(--neg)}}
.axis{{display:flex;justify-content:space-between;margin-top:16px;font-size:20px;color:var(--muted)}}
.row{{display:flex;align-items:center;gap:22px;padding:30px 0;border-top:1px solid rgba(255,255,255,.08)}}
.row:first-of-type{{border-top:0;margin-top:14px}}
.av{{width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,.18);flex:none}}
.lines{{flex:1;display:flex;flex-direction:column;gap:12px}}
.lines i{{display:block;height:14px;border-radius:8px;background:rgba(255,255,255,.30);width:80%}}
.lines i.short{{width:55%;background:rgba(255,255,255,.16)}}
.pill{{font-size:22px;font-weight:600;color:var(--ink);background:color-mix(in srgb,var(--neg) 30%,transparent);border:1.5px solid color-mix(in srgb,var(--neg) 70%,transparent);padding:9px 18px;border-radius:999px;white-space:nowrap}}
.vs{{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:24px}}
.vs-mid{{font-family:"{ft}",serif;font-size:40px;color:var(--muted)}}
.ad{{display:grid;grid-template-columns:330px 1fr;gap:36px}}
.ad-thumb{{position:relative;overflow:hidden;border-radius:24px;min-height:300px;display:flex;align-items:flex-end;padding:20px;background:linear-gradient(160deg,color-mix(in srgb,var(--acc) 30%,transparent),color-mix(in srgb,var(--pos) 18%,transparent) 60%,color-mix(in srgb,var(--neg) 20%,transparent))}}
.ad-thumb span{{position:relative;z-index:6;font-size:20px;font-weight:600;background:rgba(0,0,0,.7);padding:8px 14px;border-radius:999px}}
.ad-stats{{display:flex;flex-direction:column;gap:22px}}
.spark{{width:100%;height:96px;margin-top:6px}}
.spark-l{{display:flex;justify-content:space-between;font-size:24px}}
.tip{{display:flex;gap:22px;align-items:flex-start;margin-top:60px;max-width:900px}}
.tip svg{{flex:none;margin-top:4px}}
.tip p{{font-size:33px;line-height:1.42;color:var(--ink2)}}
.tip b{{color:var(--pos);font-weight:600}}
.con-bajo .tip{{margin-top:118px}}
.foot{{position:absolute;left:88px;right:88px;bottom:66px;display:flex;justify-content:space-between;font-size:24px;color:var(--muted);z-index:5}}
.swipe{{color:var(--acc);font-weight:600}}
.cover{{padding:0}}
.cover-img{{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}}
.cover-fade{{position:absolute;left:0;right:0;bottom:0;height:56%;background:linear-gradient(180deg,transparent 0%,color-mix(in srgb,var(--bg) 85%,transparent) 38%,var(--bg) 62%)}}
.cover-text{{position:absolute;left:88px;right:88px;bottom:170px;z-index:4}}
.cover .kicker{{margin-top:0}}
.cover h1{{font-size:104px;line-height:1.0;margin-top:26px}}
.cta .kicker{{margin-top:{max(228, (H - 560) // 2)}px}}
.btn{{position:relative;z-index:4;display:inline-flex;margin-top:40px;background:linear-gradient(180deg,{btn["de"]},{btn["a"]});color:{btn["texto"]};font-weight:700;font-size:34px;padding:28px 56px;border-radius:999px;box-shadow:0 14px 40px color-mix(in srgb,{btn["de"]} 35%,transparent)}}
.adorno{{position:absolute;z-index:4;mix-blend-mode:lighten;pointer-events:none}}
.adorno.opaco{{mix-blend-mode:normal}}
.a-en-dato{{right:6px;bottom:-6px}}
.a-sobre-grafico{{right:150px;top:88px}}
.a-esquina-tarjeta{{right:-30px;top:-196px}}
.a-bajo-tarjeta{{left:-58px;bottom:-104px}}
.a-en-miniatura{{left:40px;top:14px}}
.a-abajo-derecha{{right:10px;bottom:96px}}
'''

    def html(self):
        paginas = "".join(self.lamina(i + 1, l) for i, l in enumerate(self.g["laminas"]))
        titulo = html.escape(self.g.get("titulo", "Carrusel"))
        return f'<!doctype html><html lang="es"><head><meta charset="utf-8"><title>{titulo}</title><style>{self.css()}</style></head><body>{paginas}</body></html>'

    def html_blog(self):
        b = self.g["blog"]
        W, H = BLOG[b.get("formato", "horizontal")]
        img = self.imgs.get(b.get("imagen", ""), "")
        forma = b.get("formato", "horizontal")
        c = self.idn["colores"]
        ft = self.idn["fuentes"]["titulos"]["familia"]
        if forma == "horizontal":
            capa = f'<img class="bimg h" src="{img}" alt=""><div class="bfade h"></div>' if img else ""
            caja = 'left:72px;right:46%;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center'
            tam = 64
        else:
            capa = f'<img class="bimg v" src="{img}" alt=""><div class="bfade v"></div>' if img else ""
            caja = 'left:80px;right:80px;bottom:120px'
            tam = 92 if forma == "cuadrada" else 104
        logo = f'<img class="blogo" src="{self.logo}" alt="">' if self.logo else ""
        css = self.css().split("@page")[0] + f'''
*{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:"{self.idn["fuentes"]["texto"]["familia"]}",sans-serif;color:{c["texto"]}}}
.bpage{{position:relative;width:{W}px;height:{H}px;overflow:hidden;background:{",".join(f'radial-gradient(560px 480px at {x["pos"]},{_rgba(x["color"], x.get("alfa", .18))},transparent 70%)' for x in self.idn.get("brillos", []))}{"," if self.idn.get("brillos") else ""}{c["fondo"]}}}
.bimg{{position:absolute;object-fit:cover}}
.bimg.h{{right:0;top:0;width:58%;height:100%}}
.bimg.v{{left:0;top:0;width:100%;height:62%}}
.bfade{{position:absolute}}
.bfade.h{{right:0;top:0;width:58%;height:100%;background:linear-gradient(90deg,{c["fondo"]} 0%,transparent 45%)}}
.bfade.v{{left:0;top:0;width:100%;height:62%;background:linear-gradient(180deg,transparent 40%,{c["fondo"]} 100%)}}
.bstripe{{position:absolute;left:0;right:0;top:0;height:8px;display:flex}} .bstripe i{{flex:1}}
.blogo{{position:absolute;top:48px;left:{72 if forma == "horizontal" else 80}px;height:64px;border-radius:50%;z-index:3}}
.btxt{{position:absolute;{caja};z-index:3}}
.bk{{display:flex;align-items:center;gap:16px;color:{c["acento"]};font-size:26px;font-weight:500}}
.bk i{{width:40px;height:3px;background:{c["acento"]}}}
.bt{{font-family:"{ft}",serif;font-weight:{self.idn["fuentes"]["titulos"].get("peso", 600)};font-size:{tam}px;line-height:1.04;margin-top:22px;letter-spacing:-.015em}}
.bt em{{font-style:normal;color:{c["acento"]}}}
.bw{{margin-top:26px;font-size:24px;color:{c["suave"]}}}
'''
        franja = "".join(f'<i style="background:{x}"></i>' for x in self.idn.get("franja", []))
        cuerpo = f'''<div class="bpage">{capa}<div class="bstripe">{franja}</div>{logo}<div class="btxt">
<p class="bk"><i></i>{_txt(b.get("etiqueta", ""))}</p><p class="bt">{_txt(b["titulo"])}</p><p class="bw">{_txt(self.idn.get("web", ""))}</p></div></div>'''
        return f'<!doctype html><html lang="es"><head><meta charset="utf-8"><style>{css}</style></head><body>{cuerpo}</body></html>', (W, H)


def _rgba(hexa, a):
    h = hexa.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return f"rgba({r},{g},{b},{a})"


# ───────────────────────── render ─────────────────────────
def renderizar(html_path, salida, W, H, n_paginas, pdf=True, prefijo="lamina_"):
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("⚠️ Sin Playwright: queda solo el HTML. Instalar con: pip install playwright && playwright install chromium", file=sys.stderr)
        return []
    pngs = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": W, "height": H})
        pg.goto(html_path.as_uri())
        pg.wait_for_timeout(900)
        sel = ".page" if prefijo == "lamina_" else ".bpage"
        for i in range(pg.locator(sel).count()):
            f = salida / (f"{prefijo}{i + 1:02d}.png" if prefijo == "lamina_" else prefijo)
            pg.locator(sel).nth(i).screenshot(path=str(f))
            pngs.append(f)
        if pdf:
            pg.pdf(path=str(salida / "carrusel.pdf"), width=f"{W}px", height=f"{H}px", print_background=True)
        # revisión: nada se sale de la lámina ni pisa el pie
        if prefijo == "lamina_":
            prob = pg.evaluate('''()=>[...document.querySelectorAll('.page')].map((p,i)=>{
              const t=p.getBoundingClientRect().top, f=p.querySelector('.foot'); if(!f) return null;
              const pie=f.getBoundingClientRect().top-t; let maxb=0;
              p.querySelectorAll('.tip,.card,.btn,.sub,h2,h1').forEach(e=>{maxb=Math.max(maxb,e.getBoundingClientRect().bottom-t)});
              return pie-maxb<30?`Lámina ${i+1}: el contenido llega a ${Math.round(maxb)} px y el pie empieza en ${Math.round(pie)} px`:null}).filter(Boolean)''')
            for x in prob:
                print("⚠️ " + x)
        b.close()
    return pngs


def muestra(pngs, destino, cols=4):
    try:
        from PIL import Image
    except ImportError:
        return None
    ims = [Image.open(p).convert("RGB") for p in pngs]
    w, h = 540, int(540 * ims[0].height / ims[0].width)
    filas = (len(ims) + cols - 1) // cols
    hoja = Image.new("RGB", (cols * (w + 16) + 16, filas * (h + 16) + 16), (34, 34, 34))
    for i, im in enumerate(ims):
        hoja.paste(im.resize((w, h), Image.LANCZOS), (16 + (i % cols) * (w + 16), 16 + (i // cols) * (h + 16)))
    hoja.save(destino, quality=88)
    return destino


def generar(guion_path, salida=None):
    guion_path = pathlib.Path(guion_path).resolve()
    guion = json.loads(guion_path.read_text(encoding="utf-8"))
    salida = pathlib.Path(salida or guion_path.parent / "salida").resolve()
    salida.mkdir(parents=True, exist_ok=True)
    c = Carrusel(guion, guion_path.parent)
    h = salida / "carrusel.html"
    h.write_text(c.html(), encoding="utf-8")
    pngs = renderizar(h, salida, c.W, c.H, c.total)
    if pngs:
        muestra(pngs, salida / "muestra.jpg")
    if guion.get("blog"):
        hb, (W, H) = c.html_blog()
        fb = salida / "imagen_blog.html"
        fb.write_text(hb, encoding="utf-8")
        renderizar(fb, salida, W, H, 1, pdf=False, prefijo=f'imagen_blog_{guion["blog"].get("formato", "horizontal")}.png')
    print(f"✅ {len(pngs)} láminas en {salida}")
    return salida


def unir(carpeta, cols, filas, destino):
    from PIL import Image
    carpeta = pathlib.Path(carpeta)
    t0 = Image.open(carpeta / "t_0_0.png")
    w, h = t0.size
    hoja = Image.new("RGB", (w * cols, h * filas))
    for i in range(cols):
        for j in range(filas):
            f = carpeta / f"t_{i}_{j}.png"
            if f.exists():
                hoja.paste(Image.open(f).convert("RGB"), (i * w, j * h))
    hoja.save(destino, quality=92)
    print("✅", destino, hoja.size)


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a:
        print(__doc__)
    elif a[0] == "generar":
        generar(a[1], a[a.index("--salida") + 1] if "--salida" in a else None)
    elif a[0] == "unir":
        unir(a[1], int(a[a.index("--cols") + 1]), int(a[a.index("--filas") + 1]), a[a.index("--salida") + 1])
    elif a[0] == "identidad":
        print(json.dumps(cargar_identidad(a[1]), ensure_ascii=False, indent=2))
    else:
        print(__doc__)
