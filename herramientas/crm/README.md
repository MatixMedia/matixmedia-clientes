# CRM MatixMedia

`CRM_MatixMedia.gs` es el script de la hoja central `_MatixMedia/CRM/MATIXMEDIA_CRM`: menú, panel lateral, panel web por cliente, lectura automática de formularios (Google, Meta, TikTok, web) y envíos a Meta, TikTok y ChatGPT. También crea la hoja de Google Ads de cada cliente.

**Instalar o actualizar:** en la hoja, Extensiones → Apps Script → pegar este archivo completo → Guardar → MatixMedia → Instalar o reparar el CRM.
Si la app web ya estaba implementada: Implementar → Administrar implementaciones → editar → Nueva versión. Así la URL no cambia.

Guía completa: `claude/GUIA_Retorno_Leads.md` (proyecto) y `12_Guia_Retorno_Leads` en Drive `GUIAS/`.

## Cómo entran los leads solos (v1.3.0)

| Fuente | Conexión | Dónde se configura |
|---|---|---|
| Formularios de Google Ads | Webhook nativo de Google → `doPost` | Google Ads: formulario → Integración de leads → Webhook. URL = app web; Clave = «Clave de formularios» del cliente (MatixMedia → Ver enlaces) |
| Formularios instantáneos de Meta | El CRM lee la página cada 15 min (Graph API `leadgen_forms` → `leads`) | MatixMedia → Conectar cliente → ID de página + token de página con `leads_retrieval` |
| Formularios de TikTok | Integración nativa de TikTok con Google Sheets → pestaña `TikTok · CLIENTE` → el CRM la importa cada 15 min | MatixMedia → Crear pestaña de entrada TikTok; luego TikTok Ads Manager → Herramientas → Leads → Conectar CRM → Google Sheets |
| Web / landing (Google búsqueda, ChatGPT, tráfico de Meta y TikTok) | Código `mmEnviarLead` en la web (guarda gclid, fbclid, ttclid, oppref y UTMs) | MatixMedia → Ver enlaces |
| WhatsApp y llamadas | A mano en el panel | Panel lateral o panel web del cliente |

MatixMedia → Activar automático crea dos activadores: lectura cada 15 min y envío diario 5–6 a. m.

## Fuente y pruebas (`fuente/`)

| Archivo | Qué es |
|---|---|
| `build_crm.py` | Define pestañas, columnas y fórmulas (probadas en Google Sheets). Genera un .xlsx |
| `spec.py` | Convierte ese .xlsx en la especificación JSON que el script usa para instalar |
| `crm_base.gs` · `app.html` · `app.css` · `conexiones.html` | Código del script y de las pantallas |
| `assemble.py` | Une todo en `CRM_MatixMedia.gs` |
| `test_crm.js` | Simulación de Apps Script con 20 pruebas (instalación, formularios, lectura de Google/Meta/TikTok, panel, permisos y envíos) |

Regenerar y probar:

```bash
cd fuente
python3 build_crm.py MATIXMEDIA_CRM.xlsx && python3 spec.py MATIXMEDIA_CRM.xlsx spec.json
python3 assemble.py ../CRM_MatixMedia.gs && cp ../CRM_MatixMedia.gs . && node test_crm.js
```

Sin tokens ni datos de clientes: los tokens viven en las propiedades del script de la hoja.
