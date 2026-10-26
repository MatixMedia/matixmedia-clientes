import json, sys
base = open('crm_base.gs').read()
spec = open('spec.json').read()
css = open('app.css').read(); app = open('app.html').read(); conex = open('conexiones.html').read()
for ph, val in (("/*__SPEC__*/[]", spec), ("/*__CSS__*/''", json.dumps(css, ensure_ascii=False)),
                ("/*__APP__*/''", json.dumps(app, ensure_ascii=False)), ("/*__CONEX__*/''", json.dumps(conex, ensure_ascii=False))):
    assert base.count(ph) == 1, ph
    base = base.replace(ph, val)
open(sys.argv[1], 'w').write(base)
print(len(base), 'chars')
