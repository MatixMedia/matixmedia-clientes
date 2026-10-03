"""mm_github.py — Escribir en GitHub por la API cuando la sesión NO tiene `git`.

Uso (en el entorno de código del chat):
    import mm_github as gh
    gh.TOKEN = "<token de las instrucciones del proyecto>"
    gh.probar()                                   # True si hay red y el token sirve
    gh.subir("matixmedia-clientes", "clientes/QASA/informes/Informe_QASA.html",
             "Informe_QASA.html", "feat: informe QASA — Septiembre 2026")
    gh.listar("matixmedia-clientes", "clientes")  # nombres de una carpeta
    gh.leer("matixmedia-clientes", "CNAME")       # bytes de un archivo
    gh.borrar("matixmedia-bandeja-drive", "drive/CLIENTES/QASA/…", "limpiar bandeja")
    gh.descargar_carpeta("matixmedia-bandeja-drive", "kits/mm_contratos", "mm_contratos")

Solo usa la biblioteca estándar de Python. Soporta archivos de hasta ~50 MB.
"""
import base64, json, os, urllib.error, urllib.parse, urllib.request

OWNER = "MatixMedia"
BRANCH = "main"
TOKEN = ""            # se asigna desde las instrucciones del proyecto; nunca se escribe en archivos
API = "https://api.github.com"


class GitHubError(RuntimeError):
    pass


def _req(metodo, url, datos=None, accept="application/vnd.github+json", timeout=180):
    assert TOKEN, "Falta mm_github.TOKEN (está en las instrucciones del proyecto, sección GITHUB)"
    cuerpo = json.dumps(datos).encode() if datos is not None else None
    r = urllib.request.Request(url, data=cuerpo, method=metodo, headers={
        "Authorization": "Bearer " + TOKEN,
        "Accept": accept,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "matixmedia-claude",
        "Content-Type": "application/json",
    })
    try:
        with urllib.request.urlopen(r, timeout=timeout) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def _url(repo, ruta):
    return f"{API}/repos/{OWNER}/{repo}/contents/{urllib.parse.quote(ruta.strip('/'))}"


def probar(repo="matixmedia-clientes"):
    """True si la API responde y el token puede leer el repo."""
    try:
        cod, _ = _req("GET", f"{API}/repos/{OWNER}/{repo}", timeout=30)
    except Exception as e:                      # sin red hacia api.github.com
        print("Sin conexión con api.github.com:", e)
        return False
    if cod != 200:
        print(f"GitHub respondió {cod}: token vencido, sin permiso o repo inexistente")
    return cod == 200


def sha_de(repo, ruta):
    """SHA del archivo si existe; None si no existe."""
    cod, cuerpo = _req("GET", _url(repo, ruta) + f"?ref={BRANCH}",
                       accept="application/vnd.github.object+json")
    if cod == 404:
        return None
    if cod != 200:
        raise GitHubError(f"No se pudo consultar {ruta}: {cod} {cuerpo[:200]!r}")
    d = json.loads(cuerpo)
    if isinstance(d, list) or d.get("type") == "dir":
        raise GitHubError(f"{ruta} es una carpeta, no un archivo")
    return d["sha"]


def subir(repo, ruta, archivo_local=None, mensaje="", contenido=None):
    """Crea o reemplaza un archivo. Devuelve el SHA corto del commit."""
    if contenido is None:
        contenido = open(archivo_local, "rb").read()
    elif isinstance(contenido, str):
        contenido = contenido.encode("utf-8")
    datos = {"message": mensaje or f"subir {ruta}", "branch": BRANCH,
             "content": base64.b64encode(contenido).decode()}
    sha = sha_de(repo, ruta)
    if sha:
        datos["sha"] = sha
    cod, cuerpo = _req("PUT", _url(repo, ruta), datos)
    if cod == 409:                              # alguien subió algo a la vez: reintentar una vez
        sha = sha_de(repo, ruta)
        if sha:
            datos["sha"] = sha
        cod, cuerpo = _req("PUT", _url(repo, ruta), datos)
    if cod not in (200, 201):
        raise GitHubError(f"No se pudo subir {ruta}: {cod} {cuerpo[:300]!r}")
    return json.loads(cuerpo)["commit"]["sha"][:7]


def borrar(repo, ruta, mensaje=""):
    """Borra un archivo. Devuelve True si existía."""
    sha = sha_de(repo, ruta)
    if not sha:
        return False
    cod, cuerpo = _req("DELETE", _url(repo, ruta),
                       {"message": mensaje or f"borrar {ruta}", "branch": BRANCH, "sha": sha})
    if cod != 200:
        raise GitHubError(f"No se pudo borrar {ruta}: {cod} {cuerpo[:300]!r}")
    return True


def listar(repo, carpeta=""):
    """[(nombre, 'file'|'dir', tamaño)] de una carpeta. [] si no existe."""
    cod, cuerpo = _req("GET", _url(repo, carpeta) + f"?ref={BRANCH}")
    if cod == 404:
        return []
    if cod != 200:
        raise GitHubError(f"No se pudo listar {carpeta}: {cod} {cuerpo[:200]!r}")
    d = json.loads(cuerpo)
    if isinstance(d, dict):
        raise GitHubError(f"{carpeta} es un archivo, no una carpeta")
    return [(x["name"], x["type"], x.get("size", 0)) for x in d]


def leer(repo, ruta):
    """Contenido (bytes) de un archivo de cualquier tamaño, también en repos privados."""
    cod, cuerpo = _req("GET", _url(repo, ruta) + f"?ref={BRANCH}",
                       accept="application/vnd.github.raw")
    if cod != 200:
        raise GitHubError(f"No se pudo leer {ruta}: {cod} {cuerpo[:200]!r}")
    return cuerpo


def descargar_carpeta(repo, carpeta, destino):
    """Baja una carpeta completa (con subcarpetas) a `destino`. Devuelve cuántos archivos bajó."""
    n = 0
    for nombre, tipo, _ in listar(repo, carpeta):
        ruta = f"{carpeta.strip('/')}/{nombre}"
        if tipo == "dir":
            n += descargar_carpeta(repo, ruta, os.path.join(destino, nombre))
        else:
            os.makedirs(destino, exist_ok=True)
            with open(os.path.join(destino, nombre), "wb") as f:
                f.write(leer(repo, ruta))
            n += 1
    return n
