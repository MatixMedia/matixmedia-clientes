# CRM MatixMedia

`CRM_MatixMedia.gs` es el script de la hoja central `_MatixMedia/CRM/MATIXMEDIA_CRM`: menú, panel lateral, panel web por cliente, receptor de formularios y envíos a Meta, TikTok y ChatGPT. También crea la hoja de Google Ads de cada cliente.

**Instalar o actualizar:** en la hoja, Extensiones → Apps Script → pegar este archivo completo → Guardar → MatixMedia → Instalar o reparar el CRM.
Si la app web ya estaba implementada: Implementar → Administrar implementaciones → editar → Nueva versión. Así la URL no cambia.

Guía completa: `claude/GUIA_Retorno_Leads.md` (proyecto) y `12_Guia_Retorno_Leads` en Drive `GUIAS/`.

## Fuente y pruebas (`fuente/`)

| Archivo | Qué es |
|---|---|
| `build_crm.py` | Define pestañas, columnas y fórmulas (probadas en Google Sheets). Genera un .xlsx |
| `spec.py` | Convierte ese .xlsx en la especificación JSON que el script usa para instalar |
| `crm_base.gs` · `app.html` · `app.css` · `conexiones.html` | Código del script y de las pantallas |
| `assemble.py` | Une todo en `CRM_MatixMedia.gs` |
| `test_crm.js` | Simulación de Apps Script con 17 pruebas (instalación, formularios, panel, permisos y envíos) |

Regenerar y probar:

```bash
cd fuente
python3 build_crm.py MATIXMEDIA_CRM.xlsx && python3 spec.py MATIXMEDIA_CRM.xlsx spec.json
python3 assemble.py ../CRM_MatixMedia.gs && cp ../CRM_MatixMedia.gs . && node test_crm.js
```

Sin tokens ni datos de clientes: los tokens viven en las propiedades del script de la hoja.
