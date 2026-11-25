# 03 · Tipografía, Escala & Sistema Espacial — FIGURA

## 1. Familias Tipográficas Oficiales

FIGURA utiliza exclusivamente **2 familias tipográficas complementarias** cargadas de forma local/auto-hospedada vía `next/font/google`:

1. **Primaria de Interfaz & Arquitectura:** `Plus Jakarta Sans` (`400`, `500`, `600`, `700`)
   - Elegida por su geometría abierta, piernas limpias y claridad excepcional en densidades ejecutivas.
   - **Cifras Tabulares Obligatorias:** Todo monto en CLP, UF, USD o porcentaje utiliza `font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1, "zero" 0;` (sin ceros tachados ni fuentes monoespaciadas cuadradas que rompan la elegancia editorial).
2. **Acento Editorial:** `Instrument Serif` (`400 italic`)
   - Reservada estrictamente para **1 o 2 palabras de énfasis** por titular de sección o Hero, generalmente acompañada de `--champagne-gold` (`#D8C39E`). Nunca se utiliza en párrafos largos, formularios o tablas.

---

## 2. Escala Tipográfica Modular

| Nivel | Tamaño Desktop | Peso | Tracking | Line Height | Uso |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display Hero** | `48px – 60px` (`3rem – 3.75rem`) | `600` (`Instrument Serif 400 italic` en acento) | `-0.035em` | `1.04` | Titular principal de `/welcome` |
| **H1 / Sección** | `32px – 40px` (`2rem – 2.5rem`) | `600` | `-0.03em` | `1.12` | Cabeceras de módulo / landing |
| **H2 / Tarjeta** | `20px – 24px` | `600` | `-0.02em` | `1.22` | Títulos de consola, planes y tarjetas |
| **H3 / Subtítulo** | `16px – 18px` | `600` | `-0.015em` | `1.3` | Ítems de capacidades y modales |
| **Body** | `14px – 16px` | `400 / 500` | `0` | `1.55` | Copy descriptivo |
| **Eyebrow / Micro** | `10px – 11px` | `600` | `+0.16em` | `1.3` | Etiquetas uppercase de arquitectura |

---

## 3. Grilla Espacial de 8pt & Física de Movimiento

### Espaciado
- Base estricta en múltiplos de `4px` / `8px`: `8px` (micro-gaps), `16px` (padding interno compacto), `24px` (padding de cards glassmórficos), `32px` (separación de bloques), `64px – 96px` (respiro entre secciones).
- **Densidad Ejecutiva:** Los contenedores de landing mantienen `max-w-7xl` (`1280px` / `1400px`) con alta densidad informativa sin bloques inflados ni scroll excesivo.

### Principios de Animación Reactiva
- **Curva maestra:** `cubic-bezier(0.16, 1, 0.3, 1)` (desaceleración arquitectónica nítida, sin rebotes infantiles).
- **Micro-interacciones táctiles:** `scale(0.985)` en `active` (`160ms`).
- **Reactividad al puntero:** Seguimiento suave por variables CSS (`--mx`, `--my`) limitado a reflejos especulares finos en bordes y superficie de vidrio.
- **Accesibilidad:** Respeta obligatoriamente `@media (prefers-reduced-motion: reduce)` anulando desplazamientos y brillos continuos.
