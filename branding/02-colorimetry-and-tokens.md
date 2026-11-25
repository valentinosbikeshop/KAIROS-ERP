# 02 · Colorimetría, Superficies & Glassmorfismo — FIGURA

## 1. Filosofía Cromática: *Obsidian & Champagne Glass*

La paleta de **FIGURA** abandona los azules genéricos de SaaS y los neones artificiales para adoptar materiales propios de la **arquitectura contemporánea y la alta relojería**: obsidiana mineral profunda, vidrio ahumado con refracción especular, latón champagne cepillado y acentos técnicos minerales de alta legibilidad.

---

## 2. Paleta Oficial (HEX · RGB · HSL)

### A. Superficies Obsidian (Fondos & Profundidad)

| Token | HEX | RGB | HSL | Uso |
| :--- | :--- | :--- | :--- | :--- |
| `--obsidian-void` | `#06070A` | `6, 7, 10` | `225° 25% 3%` | Lienzo principal oscuro, fondo base editorial |
| `--obsidian-deep` | `#0B0D13` | `11, 13, 19` | `225° 27% 6%` | Secciones alternas, contenedores estructurales |
| `--obsidian-elevated` | `#121620` | `18, 22, 32` | `223° 28% 10%` | Tarjetas base, paneles modales |
| `--obsidian-border` | `#232A3B` | `35, 42, 59` | `223° 25% 18%` | Líneas divisorias sutiles |

### B. Metales Nobles & Identidad (Acentos Primarios)

| Token | HEX | RGB | HSL | Uso |
| :--- | :--- | :--- | :--- | :--- |
| `--champagne-gold` | `#D8C39E` | `216, 195, 158` | `38° 42% 73%` | Acento insignia, palabras clave serif, nodos de calibración, bordes activos |
| `--champagne-bright` | `#EDE0C8` | `237, 224, 200` | `39° 51% 86%` | Brillo especular en botones/iconos, texto destacado sobre negro |
| `--champagne-deep` | `#9A8460` | `154, 132, 96` | `37° 23% 49%` | Micro-etiquetas, bordes secundarios, iconos inactivos cálidos |

### C. Tipografía & Neutros Luminosos

| Token | HEX | RGB | HSL | Contraste sobre `#06070A` |
| :--- | :--- | :--- | :--- | :--- |
| `--platinum-ink` | `#EEF1F6` | `238, 241, 246` | `218° 31% 95%` | **17.4 : 1** (WCAG AAA) — Titulares y valores CLP |
| `--slate-mist` | `#96A1B5` | `150, 161, 181` | `219° 16% 65%` | **7.4 : 1** (WCAG AAA) — Párrafos y descripciones |
| `--ash-muted` | `#646F84` | `100, 111, 132` | `219° 14% 45%` | **3.9 : 1** — Solo micro-labels `>= 12px` bold o bordes |

### D. Acentos Semánticos Financieros

| Token | HEX | RGB | HSL | Significado en el ERP |
| :--- | :--- | :--- | :--- | :--- |
| `--emerald-ledger` | `#4FA88B` | `79, 168, 139` | `160° 36% 48%` | Utilidad neta, IVA Crédito recuperado, estado aprobado |
| `--mineral-cobalt` | `#5E89E8` | `94, 137, 232` | `221° 75% 64%` | Proyección SII F29, indicadores de IA OCR, estado activo |
| `--amber-retention` | `#D49B54` | `212, 155, 84` | `33° 60% 58%` | Alertas de margen bajo, retención 15,25% honorarios |
| `--crimson-deficit` | `#D46A6A` | `212, 106, 106` | `0° 55% 62%` | Desviación de costo, saldo vencido, anulación |

---

## 3. Receta Oficial de Glassmorfismo Multicapa

Para lograr profundidad cristalina auténtica (sin aspecto plástico o opaco):

1. **Cristal Ahumado Base (`obsidian-glass`):**
   - Fondo: `linear-gradient(145deg, rgba(20, 24, 34, 0.72) 0%, rgba(11, 14, 21, 0.56) 100%)`
   - Filtro: `backdrop-filter: blur(22px) saturate(145%)`
   - Borde exterior: `1px solid rgba(255, 255, 255, 0.09)`
   - Reflejo superior interno: `inset 0 1px 0 rgba(255, 255, 255, 0.14)`
   - Sombra ambiental: `0 24px 60px -20px rgba(0, 0, 0, 0.65)`

2. **Cristal Ejecutivo Champagne (`obsidian-glass-luxury`):**
   - Fondo: `linear-gradient(145deg, rgba(28, 32, 44, 0.84) 0%, rgba(14, 17, 25, 0.74) 100%)`
   - Borde exterior: `1px solid rgba(216, 195, 158, 0.28)`
   - Reflejo superior interno: `inset 0 1px 0 rgba(237, 224, 200, 0.22)`
   - Luz reactiva al cursor (`--mx`, `--my`): radial sutil `rgba(216, 195, 158, 0.09)` con radio `420px`.

---

## 4. Proporción de Uso Cromático (Regla 70 / 22 / 8)

- **70% Superficies Obsidian & Cristal Ahumado** (`#06070A` – `#121620`)
- **22% Tipografía Platinum & Slate Mist** (`#EEF1F6` – `#96A1B5`)
- **8% Acentos Nobles & Semánticos** (`#D8C39E` Champagne, `#4FA88B` Emerald, `#5E89E8` Cobalt)
