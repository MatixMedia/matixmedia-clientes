"""hub_tool.py — Lee y edita los datos del Hub de Contenido (contenido_hub.html).

Los datos del hub van DENTRO del HTML, en un objeto {clientes, contenido}.
    import hub_tool
    html = open("contenido_hub.html", encoding="utf-8").read()
    hub  = hub_tool.leer(html)                    # dict {clientes:[…], contenido:{…}}
    informe = hub_tool.aplicar_parche(hub, parche)  # parche exportado desde la página
    nuevo = hub_tool.escribir(html, hub)          # HTML con los datos nuevos
Requiere `node` para leer (evalúa el objeto JS). Solo biblioteca estándar de Python.
"""
import json, re, subprocess

ANCLA = re.compile(r'\b[A-Za-z_$][\w$]*=\{"?clientes"?:\[')
ESTADOS = ['En producción', 'En revisión', 'Aprobado', 'Programado', 'Publicado']


def ubicar(html):
    m = ANCLA.search(html)
    assert m, "No se encontró el bloque {clientes:[…]} — el bundle cambió, revisar a mano"
    ini = html.index("{", m.start())
    prof, i, q = 0, ini, None
    while i < len(html):
        c = html[i]
        if q:
            if c == '\\': i += 2; continue
            if c == q: q = None
        elif c in '"\'`': q = c
        elif c == '{': prof += 1
        elif c == '}':
            prof -= 1
            if prof == 0: return ini, i + 1
        i += 1
    raise ValueError("Bloque sin cerrar")


def leer(html):
    a, b = ubicar(html)
    out = subprocess.run(
        ["node", "-e", "process.stdout.write(JSON.stringify(eval('('+require('fs').readFileSync(0,'utf8')+')')))"],
        input=html[a:b], capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def escribir(html, data):
    a, b = ubicar(html)
    return html[:a] + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + html[b:]


def ids(hub):
    return {p["id"]: mes for mes, piezas in hub["contenido"].items() for p in piezas if p}


def validar_guion(g):
    errores, avisos = [], []
    for c in ['id', 'titulo', 'formato', 'plataformas', 'estado', 'blocks', 'copy']:
        if c not in g: errores.append(f"Falta: '{c}'")
    if g.get('estado') not in ESTADOS:
        errores.append(f"Estado inválido: '{g.get('estado')}'")
    blocks = g.get('blocks', [])
    if len(blocks) < 2: errores.append("Mínimo 2 bloques")
    for i, b in enumerate(blocks):
        if 'label' not in b: errores.append(f"Block {i}: falta 'label'")
        if 'audio' not in b: errores.append(f"Block {i}: falta 'audio'")
    if not g.get('copy'): avisos.append("Sin copy para publicación")
    if not g.get('produccion'): avisos.append("Sin notas de producción")
    return errores, avisos


def aplicar_parche(hub, parche):
    """Aplica el bloque que exporta la página del hub:
       {"v":1,"generado":"…","piezas":[…],"eliminadas":[…]}
       piezas: {"mes","pieza"} = pieza nueva · {"id","mes","desde","cambios"} = cambios (valor null borra el campo;
       mes ≠ desde = mover de mes). Modifica `hub` y devuelve un informe en texto."""
    assert parche.get("v") == 1, f"Versión de parche desconocida: {parche.get('v')}"
    donde = ids(hub); lineas = []
    for it in parche.get("piezas", []):
        if "pieza" in it:                                   # pieza nueva completa
            p, mes = it["pieza"], it["mes"]
            if p["id"] in donde:
                lst = hub["contenido"][donde[p["id"]]]
                lst[[x["id"] for x in lst].index(p["id"])] = p
                lineas.append(f"reemplazada  {p['id']} ({donde[p['id']]})")
            else:
                hub["contenido"].setdefault(mes, []).insert(0, p); donde[p["id"]] = mes
                lineas.append(f"nueva        {p['id']} → {mes}")
            continue
        pid, mes = it["id"], it["mes"]
        assert pid in donde, f"La pieza '{pid}' no existe en el hub publicado"
        origen = donde[pid]
        lst = hub["contenido"][origen]; i = [x["id"] for x in lst].index(pid); pieza = lst[i]
        for k, v in (it.get("cambios") or {}).items():
            if k == "estado": assert v in ESTADOS, f"Estado inválido: {v}"
            antes = pieza.get(k)
            if v is None: pieza.pop(k, None)
            else: pieza[k] = v
            if k == "estado": lineas.append(f"estado       {pid}: {antes} → {v}")
            else: lineas.append(f"campo        {pid}.{k} {'borrado' if v is None else 'actualizado'}")
        if mes != origen:
            lst.pop(i); hub["contenido"].setdefault(mes, []).append(pieza); donde[pid] = mes
            lineas.append(f"movida       {pid}: {origen} → {mes}")
    for pid in parche.get("eliminadas", []):
        if pid in donde:
            hub["contenido"][donde[pid]] = [x for x in hub["contenido"][donde[pid]] if x["id"] != pid]
            lineas.append(f"ELIMINADA    {pid} ({donde.pop(pid)})")
        else:
            lineas.append(f"(ya no estaba) {pid}")
    return "\n".join(lineas) or "Sin cambios"


if __name__ == "__main__":
    import sys
    h = open(sys.argv[1], encoding="utf-8").read()
    d = leer(h)
    print({k: len(v) for k, v in d["contenido"].items()}, [c["id"] for c in d["clientes"]])
    assert leer(escribir(h, d)) == d
    print("roundtrip OK")
