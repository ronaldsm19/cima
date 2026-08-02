# Handoff: Sistema interno — Oficina de topografía (planilla, clientes y proyectos)

## Overview

Aplicación web interna para una oficina de topografía en Costa Rica (2 personas la usan a
diario, ~6 h/día, en escritorio). Reemplaza hojas de Excel sueltas para tres cosas:

1. **Planilla** — cálculo quincenal con tres modalidades (semanal, quincenal, mensual),
   deducciones de ley de Costa Rica y control de quién ya cobró.
2. **Empleados** — ficha con contrato, historial de pagos y saldo de vacaciones.
3. **Clientes y proyectos** — monto acordado, prima pactada, abonos y saldo por cobrar.

Todos los montos en **colones (₡)**. Idioma: español de Costa Rica (voseo: "Registrá",
"Agregá", "Marcá").

---

## About the design files

Los archivos de este bundle son **referencias de diseño hechas en HTML**: prototipos que
muestran la apariencia y el comportamiento buscados, **no código de producción para copiar
tal cual**.

La tarea es **recrear estos diseños en el entorno del codebase destino** (React, Vue,
SwiftUI, lo que exista) usando sus patrones y librerías establecidas. Si todavía no hay
codebase, elegí el stack apropiado e implementá los diseños ahí. La recomendación por
defecto para este caso: **Next.js (App Router) + TypeScript + Tailwind + shadcn/ui**, con
los tokens que se incluyen en `tokens/`.

El prototipo corre 100 % en el cliente con datos de muestra en memoria. **No hay backend,
persistencia ni autenticación** — eso hay que construirlo.

## Fidelity

**Alta fidelidad (hifi).** Colores, tipografía, espaciado, estados y microinteracciones son
definitivos. Recreá la UI fielmente con las librerías del codebase. Los valores exactos
están en la sección *Design tokens* y en `tokens/tokens.css`.

Los datos (nombres, cédulas, fincas, montos) son **ficticios pero realistas** para Costa
Rica; se reemplazan por datos reales.

---

## Layout global (shell)

Tres zonas fijas, `display:flex` a nivel raíz, `min-height:100vh`:

| Zona | Medidas | Notas |
|---|---|---|
| Barra lateral | `width: 236px`, `flex: none` | fondo `#111E19` (verde casi negro), `padding: 18px 14px 16px`, columna con `gap: 22px` |
| Área principal | `flex: 1; min-width: 0` | columna: header fijo + contenido |
| Header | `height: 66px`, `flex: none` | fondo `#FFFFFF`, `border-bottom: 1px solid #E6EAE4`, `padding: 0 24px` |
| Contenido | `flex: 1; min-height: 0` | `padding: 20px 24px 24px`, `gap: 16px` |

### Barra lateral

- **Marca** (arriba): cuadro de 34×34, `border-radius: 10px`,
  `background: linear-gradient(160deg,#1B9E70,#0B5C41)`, ícono de teodolito/triángulo en
  `#EAF7F1`. Al lado: "Morales & Asoc." 13.5px/700 `#F2F7F4`, y
  "Topografía · CFIA IC-4482" 11px `#7E8D86`. Debajo `border-bottom: 1px solid rgba(255,255,255,0.08)`.
- **Grupos**: "Operación" (Panel, Planilla, Vacaciones) y "Registros" (Empleados, Clientes,
  Proyectos). Título de grupo: 10.5px/600, `letter-spacing: 0.09em`, uppercase, `#67766E`.
- **Ítem de nav**: alto 40px, `padding: 0 12px`, `border-radius: 10px`, `gap: 11px`,
  ícono 16×16 stroke 1.8, texto 13.5px.
  - inactivo: `background: transparent`, texto `#A9B6AF`, peso 500
  - activo: `background: rgba(255,255,255,0.10)`, texto `#F2F7F4`, peso 600
  - transición: `background-color 140ms, color 140ms`
- **Badge** (a la derecha del ítem, `margin-left: auto`): alto 20px, `padding: 0 8px`,
  `border-radius: 99px`, 11px/700.
  - neutro: fondo `rgba(255,255,255,0.08)`, texto `#8E9C95`
  - ámbar (pendientes de planilla): fondo `rgba(214,158,46,0.16)`, texto `#E0B357`
  - rojo (proyectos vencidos): fondo `rgba(214,90,70,0.18)`, texto `#E58C7C`
- **Pie**: selector de estado de demo (ver *Modos de demostración*) y avatar del usuario
  (círculo 32px, fondo `#1D3229`, iniciales `#7FD3AE` 12px/700).

### Header

- Izquierda: título de pantalla 17px/700 `letter-spacing: -0.02em`; subtítulo 12.5px `#6B766F`.
- Derecha: selector de período — contenedor `height: 38px`, `background: #F4F6F3`,
  `border: 1px solid #E6EAE4`, `border-radius: 10px`, ícono de calendario + `<select>` sin
  borde, 13px/600. Opciones: "Quincena 2 · 16–31 jul 2026", "Quincena 1 · 01–15 jul 2026",
  "Quincena 2 · 16–30 jun 2026".
- Extremo derecho: fecha/hora, IBM Plex Mono 12px `#8A938C`.

### Responsive

Desktop es la prioridad. Por debajo de **960px** (único breakpoint):
la barra lateral pasa a barra horizontal con scroll (se ocultan títulos de grupo, pie y
subtítulo de marca), las grillas de 2–4 columnas colapsan a 1 (métricas y cajetines a 2),
el panel lateral de detalle pasa a ancho completo debajo del contenido. Las tablas
mantienen `min-width` y hacen scroll horizontal.

---

## Pantallas

### 1 · Panel principal (`panel`)

**Propósito**: en un vistazo, cuánto hay que pagar, a quién falta pagarle y cuánto se
debe cobrar.

**Layout**: columna con `gap: 16px`.
1. Fila de 4 tarjetas de métrica: `grid-template-columns: repeat(4, minmax(0,1fr))`, `gap: 14px`.
2. Fila principal: `grid-template-columns: 1.4fr 1fr`, `gap: 16px`, `flex: 1`.

**Tarjeta de métrica**: fondo blanco, `border: 1px solid #E6EAE4`, `border-radius: 14px`,
`padding: 16px 18px 17px`, `box-shadow: 0 1px 2px rgba(19,26,23,0.04)`.
Encabezado: cuadro de ícono 28×28 `border-radius: 8px` + rótulo 12px/600 `#6B766F`.
Valor: IBM Plex Mono **26px/600**, `letter-spacing: -0.02em`, `font-variant-numeric: tabular-nums`.
Pie: 12px `#8A938C`.

| # | Rótulo | Valor | Tinte del ícono | Pie |
|---|---|---|---|---|
| 1 | Planilla del período | suma de netos | `#E9F3EE` / `#0E6B4E` | "N empleados · neto a pagar" |
| 2 | Falta pagarles | suma de netos no pagados, texto `#A8710A` | `#FBF1DC` / `#A8710A` | "N de M sin aplicar" |
| 3 | Cuentas por cobrar | suma de saldos de proyectos no cobrados | `#E9F3EE` / `#0E6B4E` | "5 proyectos · 1 vencido" |
| 4 | Proyectos abiertos | conteo | `#EDF0EC` / `#4A554E` | píldoras por estado |

**Panel "Falta pagarles"** (izquierda): tarjeta con encabezado de 54px
(`border-bottom: 1px solid #EEF1EC`) — título 14.5px/700, píldora de conteo ámbar, y botón
"Abrir planilla" a la derecha. Lista con `padding: 6px 8px`; cada fila mide 52px,
`border-radius: 10px`, hover `background: #F7F9F6`: avatar de iniciales 32px
(`#EDF2EF` / `#3E6B58`), nombre 13.5px/600, modalidad 11.5px `#8A938C`, monto en mono
13.5px/500 y botón "Marcar pagado" (30px, borde `#DDE3DC`; en hover se llena de
`#0E6B4E` con texto blanco).
**Estado vacío** de la lista: círculo verde con check (38px, `#E4F4EC` / `#157F55`),
"Todos los pagos están aplicados" 14px/600 + línea de apoyo.

**Panel "Cuentas por cobrar"** (derecha): encabezado con total en mono 13.5px/600. Filas
clicables (abren el formulario de proyecto): código en mono 11.5px `#8A938C` + píldora de
estado, cliente 13.5px/600, nota 11.5px (`vencido hace 33 días` o `entrega dd/mm/aaaa`),
saldo a la derecha en mono 14px/600.

### 2 · Planilla del período (`planilla`)

**Propósito**: calcular y aplicar la planilla de la quincena; editar horas extra y
adelantos en línea.

**Barra de acciones** (arriba, `gap: 12px`): píldora de selección a la izquierda
(alto 32px, `border-radius: 99px`; con selección `#E9F3EE`/`#0E6B4E`, sin selección
`#EDF0EC`/`#8A938C`; texto "N seleccionados · ₡X" o "Ninguna fila seleccionada").
A la derecha: **Agregar empleado** (ghost, con ícono +), **Marcar como pagado**
(ghost; deshabilitado si no hay selección), **Generar colillas** (ghost),
**Aprobar planilla** (primario con check).

**Tabla**: contenedor blanco, `border-radius: 14px`, `min-width: 1120px`, scroll interno.
Cabecera `position: sticky; top: 0`, fondo `#FBFCFA`, alto 42px, celdas 11.5px/600
`#8A938C` (la de "Neto" 700 `#4A554E`). Filas de **56px**,
`border-bottom: 1px solid #F0F3EF`, hover `#F7F9F6`, fila con detalle abierto `#F1F7F4`.

Columnas, en orden: checkbox · Empleado (avatar 28px + nombre 13.5px/600) · Modo ·
Base período · **H. extra** (input) · Bruto · CCSS · Renta · **Adelanto** (input) ·
Otras ded. · **Neto** (13.5px/600) · Estado (píldora).
Todas las columnas numéricas: IBM Plex Mono 13px, `tabular-nums`, alineadas a la derecha;
las de deducción en `#8A938C`.

**Inputs en celda**: 82×30, `border-radius: 8px`, borde y fondo transparentes; con error
`border: 1px solid #E5A99E`, `background: #FDF3F1`, texto `#B0392A`.
Un clic en la celda no debe abrir el detalle (`stopPropagation`).

**Fila de error bajo la fila afectada**: recuadro `#FDF3F1` / borde `#F2D2CB`,
`border-radius: 10px`, ícono de alerta + mensaje 12.5px `#8E3323`.

**Fila de totales** (última, `height: 52px`, fondo `#FBFCFA`): "Total · N empleados"
12.5px/700 y los totales por columna; el neto total en mono **15px/700**.

**Panel lateral de desglose** (se abre al hacer clic en una fila): ancho **392px**, fondo
blanco, `border-left: 1px solid #E6EAE4`, scroll propio.
Encabezado: avatar 40px, nombre 15.5px/700, cédula + puesto en mono 11.5px `#8A938C`,
botón de cerrar 30×30. Cuerpo: 8 líneas de desglose (etiqueta 13px, nota 11px `#A5AEA7`,
monto en mono 13px), separadas por `1px solid #F3F5F1`. Luego el bloque de neto:
fondo `#F1F7F4`, borde `#DCE9E3`, `border-radius: 12px`, `padding: 14px 16px`, con el neto
en mono **20px/700** `#0E6B4E`. Debajo, la cuenta IBAN en mono 11px. Acciones:
"Marcar como pagado" / "Revertir el pago" (primario/ghost según estado) y "Ver ficha".

### 3 · Ficha de empleado (`empleado`)

**Selector**: fila de chips (uno por empleado) + chip **"+ Agregar empleado"** con borde
punteado `#B9C7BD` y texto `#0E6B4E`.
Chip: alto 32px, `padding: 0 13px`, `border-radius: 99px`, 12.5px/600;
activo `background: #0E6B4E`, texto blanco; inactivo blanco con borde `#E0E6DF`, texto `#4A554E`.

**Encabezado de ficha**: tarjeta blanca. Franja superior (`padding: 18px 20px`,
`border-bottom: 1px solid #EEF1EC`): avatar 52px (17px/700), nombre **19px/700**
`letter-spacing: -0.02em`, píldora "Activo" (`#E4F4EC` / `#12704A` con punto `#157F55`),
y línea "puesto · desde dd/mm/aaaa" 13px `#6B766F`.
Debajo, **cajetín** de 4 celdas (`grid-template-columns: repeat(4,minmax(0,1fr))`,
divisores `1px solid #EEF1EC`, `padding: 14px 20px 16px`): Cédula, Modalidad, Salario base,
Saldo de vacaciones (este último en `#0E6B4E`). Rótulo 11.5px/600 `#8A938C`, valor 14.5px.

**Pestañas** (estilo segmented): contenedor `background: #EBEFE9`, `border-radius: 11px`,
`padding: 4px`, ancho al contenido. Pestaña activa: fondo blanco,
`box-shadow: 0 1px 2px rgba(19,26,23,0.10)`, `border-radius: 8px`, texto `#131A17`;
inactiva `#6B766F`.

- **Contrato** — dos tarjetas lado a lado. Izquierda "Contrato": puesto, modalidad, salario
  base, equivalente mensual, ingreso, teléfono, IBAN. Derecha "Deducciones fijas": CCSS,
  renta del período, solidarista, pensión alimenticia, adelantos vigentes; al pie una nota
  en caja `#F7F9F6` `border-radius: 10px`.
- **Historial de pagos** — tabla de 6 períodos: Período, Pagado el, Bruto, Deducciones,
  Neto, enlace "Ver colilla". Filas de 46px.
- **Vacaciones** — lista de períodos tomados (rango en mono, nota, píldora "N días") y
  botón "Abrir calendario". Estado vacío cuando el empleado nunca ha tomado vacaciones.

### 4 · Calendario de vacaciones (`vacaciones`)

**Layout**: `grid-template-columns: 1fr 350px`, `gap: 16px`.

**Calendario** (izquierda): encabezado con instrucción y botón "Limpiar". Dos meses
lado a lado (agosto y setiembre 2026) separados por `1px solid #EEF1EC`, cada uno
`padding: 18px 20px`. Grilla `repeat(7,1fr)`, `gap: 3px`, semana **de lunes a domingo**
(cabeceras L K M J V S D, 11px/600 `#A5AEA7`).

Día: alto 36px, `border-radius: 9px`, mono 12.5px, sin borde.

| Estado | Fondo | Texto |
|---|---|---|
| normal | `#FFFFFF` | `#131A17` |
| fin de semana | `#F1F3EF` | `#A5AEA7` |
| feriado de ley | `#FBF1DC` | `#8A5C08` /600 |
| dentro del rango | `#DCEDE5` | `#0E6B4E` /600 |
| extremo del rango | `#0E6B4E` | `#FFFFFF` /700 |

Leyenda al pie con tres muestras de 16×16.

**Panel derecho**: (a) tarjeta "Empleado" con `<select>` y tres cajas de saldo
(Acumulado, Tomados en `#F7F9F6`; Saldo en `#E9F3EE` con valor `#0E6B4E`);
(b) tarjeta "Rango solicitado" con Del / Al / Feriados dentro, bloque destacado
"Días hábiles" (mismo estilo del bloque de neto) y botón "Registrar vacaciones".
Si el rango excede el saldo: aviso rojo y botón deshabilitado.

### 5 · Ficha de cliente (`cliente`)

Chips de cliente arriba. Encabezado con ícono de edificio 46×46 (`#EDF2EF`,
`border-radius: 12px`), nombre 19px/700, contacto 13px, y a la derecha
"Saldo pendiente" con el monto en mono **22px/700** (rojo `#B0392A` si el cliente tiene
algún proyecto vencido). Cajetín de 4: Cédula jurídica, Teléfono, Contratado, Abonado
(este en `#157F55`).

Tabla "Proyectos" (`min-width: 920px`, filas de 52px, clicables): Código (mono) · Trabajo
(13.5px/600) · Finca / plano (mono 12px `#8A938C`) · Contratado · Abonado · Saldo
(13.5px/600) · Estado (píldora). Fila de totales al pie con el saldo en 15px/700.
Botón "Nuevo proyecto" (primario, 34px, con ícono +) en el encabezado.

### 6 · Formulario de proyecto (`proyecto`)

**Layout**: `grid-template-columns: 1fr 372px`, `gap: 16px`.

**Formulario** (izquierda): encabezado con el código en píldora mono. Campos en
`grid-template-columns: 1fr 1fr`, `gap: 14px`: Cliente (select), Tipo de trabajo (select:
Levantamiento topográfico, Segregación, Catastro, Visado municipal, Replanteo),
Número de finca, Fecha de entrega, Monto acordado (₡), Prima pactada (%).
Rótulo de campo 12px/600 `#6B766F`, `margin-bottom: 6px`.

**Registro de abonos** (debajo, tras `border-top: 1px solid #EEF1EC`): tabla de abonos
(Fecha · Referencia · Monto en `#157F55` · Saldo tras abono) y una fila de captura con
Fecha del abono, Referencia, Monto y botón primario "Registrar abono".
Sin abonos: caja punteada `border: 1px dashed #D8DFD7`, fondo `#F7F9F6`, con el texto
"Registrá la prima pactada de ₡X como primer abono."

**Panel "Saldo en vivo"** (derecha): cuatro líneas (Monto acordado, Prima pactada · N %,
Abonado a la fecha en `#157F55`, Prima cubierta), bloque destacado con el saldo en mono
**21px/700**, barra de progreso (alto 8px, `border-radius: 99px`, pista `#EDF0EC`, relleno
`linear-gradient(90deg,#1B9E70,#0E6B4E)`, `transition: width 300ms`), y bajo la barra
"N% cobrado" / "Entrega dd/mm/aaaa". Acciones: "Guardar proyecto" (primario) y "Ver cliente".

### Modal · Agregar empleado

Overlay `rgba(17,30,25,0.42)`, centrado, `padding: 24px`. Tarjeta `max-width: 620px`,
`max-height: 88vh` con scroll, `border-radius: 18px`,
`box-shadow: 0 32px 70px -24px rgba(9,20,15,0.55)`.

Encabezado: ícono 38×38 (`#E9F3EE` / `#0E6B4E`), título 17px/700, subtítulo
"Entra en la planilla del período actual apenas se guarde.", botón de cerrar 32×32.

Cuerpo en `grid-template-columns: 1fr 1fr`, `gap: 14px`:
Nombre completo (ancho completo) · Cédula · Puesto · Modalidad de pago (select:
Semanal / Quincenal / Mensual) · Salario base (el rótulo cambia a "(₡ por semana / quincena /
mes)" según la modalidad) · Fecha de ingreso · Cuenta IBAN · Deducciones opcionales
(Solidarista % y Pensión alimenticia ₡, ancho completo).
Al final, bloque **"Neto estimado del período"** que se recalcula en vivo mientras se
escribe (mismo estilo del bloque de neto: `#F1F7F4` / `#DCE9E3`, monto 17px/700 `#0E6B4E`);
muestra "—" mientras no haya salario base.

Acciones abajo a la derecha: "Cancelar" (ghost) y "Guardar empleado" (primario).

**Validación** (al guardar): nombre con al menos dos palabras, cédula no vacía y salario
base > 0. Si falta algo: los campos en falta toman el estilo de error y aparece un aviso
"Faltan datos" con la lista en prosa ("Hace falta el nombre completo, la cédula y el
salario base para poder calcular la planilla."). El empleado nuevo entra con
`vacAcum: 0`, `vacTom: 0`, queda seleccionado en la ficha y aparece de inmediato en la
planilla, en los totales y en los contadores del nav.

---

## Reglas de cálculo (planilla de Costa Rica)

Implementar en el backend y validar ahí también; el prototipo las calcula en el cliente.

```
mensualEquivalente = modo === 'mensual'   ? base
                   : modo === 'quincenal' ? base × 2
                   :                        base × 4.333        // semanal

basePeríodo        = modo === 'mensual'   ? base ÷ 2            // corte quincenal
                   : modo === 'quincenal' ? base
                   :                        base × 2            // dos semanas por corte

horaExtra          = (mensualEquivalente ÷ 240) × 1.5
extra              = horas × horaExtra
bruto              = basePeríodo + extra

ccss               = bruto × 10.67 %                            // obrero, configurable
renta              = ISR(mensualEquivalente + extra × 2) ÷ 2    // escala mensual, prorrateada
solidarista        = bruto × porcentajeDelEmpleado
embargo            = monto fijo por período (pensión alimenticia)

disponible         = bruto − ccss − renta − solidarista − embargo
neto               = disponible − adelanto
```

**Escala del impuesto sobre la renta** (mensual, marginal por tramos):

| Tramo mensual (₡) | Tasa |
|---|---|
| hasta 942 000 | 0 % |
| 942 000 – 1 381 000 | 10 % |
| 1 381 000 – 2 423 000 | 15 % |
| 2 423 000 – 4 845 000 | 20 % |
| más de 4 845 000 | 25 % |

⚠️ Los topes de la escala y la tasa de CCSS **cambian por ley cada año**: hay que poder
editarlos sin desplegar (tabla de parámetros por período fiscal, no constantes en código).
En el prototipo la tasa de CCSS es un parámetro configurable (`tasaCCSS`, default 10.67).

**Validación de adelanto**: si `adelanto > disponible`, la fila queda en error y no se
puede aprobar la planilla. Mensaje exacto:
> "El adelanto de ₡X supera el neto disponible de ₡Y. Bajá el monto o repartilo en dos períodos."

**Vacaciones**: los días hábiles del rango excluyen sábados, domingos y feriados de ley.
Si `díasHábiles > saldo`, se bloquea el registro:
> "El rango pide N días hábiles y {Nombre} tiene M. Recortá K días o pasá el resto a adelanto de vacaciones."

**Abonos**: no se acepta un abono ≤ 0 ni mayor al saldo pendiente.
> "El abono de ₡X supera el saldo pendiente de ₡Y. Registrá ₡Y para cerrar el proyecto, o corregí el monto acordado."

**Formato de moneda**: `₡` + miles con **punto** y decimales con **coma**
(`₡1.234.567,89`). Ojo: `toLocaleString('es-CR')` devuelve espacio como separador de miles
en algunos runtimes — en el prototipo se usa `'de-DE'`, que da el formato correcto. En
producción, mejor un formateador propio o `Intl.NumberFormat` verificado.

Los montos en el panel y en las tablas de proyectos van **sin decimales** (`fmt0`);
los de planilla y desglose van **con dos decimales** (`fmt`).

---

## Interacciones y comportamiento

- **Navegación**: los 6 ítems del nav cambian de pantalla. Al navegar se cierra el panel
  de detalle. Las filas de "Cuentas por cobrar" y de la tabla de proyectos abren el
  formulario de proyecto con ese proyecto cargado.
- **Selección múltiple** en planilla: checkbox por fila + checkbox de "todos" en la
  cabecera; la píldora muestra conteo y suma de netos; "Marcar como pagado" aplica a la
  selección y la limpia.
- **Edición en línea**: horas extra y adelantos recalculan bruto, CCSS, renta, neto, los
  totales de la tabla y las métricas del panel al instante (`onChange`).
- **Panel de detalle**: se abre al hacer clic en la fila; los clics sobre checkbox e
  inputs no lo abren.
- **Rango de vacaciones**: primer clic fija el inicio; segundo clic el fin (si es anterior,
  se invierte el rango); un tercer clic empieza un rango nuevo.
- **Toast**: abajo a la derecha, fondo `#131F1A`, `border-radius: 12px`,
  `box-shadow: 0 18px 40px -16px rgba(19,26,23,0.55)`, con check verde; se cierra solo a
  los **3 600 ms** o con la X. Se dispara al marcar pagos, aprobar planilla, generar
  colillas, registrar vacaciones, registrar abonos y guardar.
- **Transiciones**: 140 ms en hover/estados de UI; 300 ms en la barra de progreso. Nada más.
- **Foco en campos**: `border-color: #0E6B4E` + `box-shadow: 0 0 0 3px rgba(14,107,78,0.12)`.

### Modos de demostración (solo prototipo)

El selector del pie de la barra lateral alterna tres estados para poder revisar el diseño:
**Datos** (normal), **Vacío** (panel y planilla sin registros, con sus estados vacíos) y
**Error** (banner rojo de "No se pudo sincronizar con el banco" sobre el contenido).
**No es una función del producto** — en la implementación real, los estados vacíos y de
error se disparan por datos reales. Sirve como especificación de esos tres estados.

---

## Estado y datos

Estado de UI del prototipo (a mapear a rutas/URL donde corresponda):

| Variable | Tipo | Uso |
|---|---|---|
| `screen` | enum | pantalla activa (debería ser una ruta) |
| `periodo` | string | período seleccionado en el header |
| `sel` | string[] | ids de filas seleccionadas en planilla |
| `detalle` | string \| null | empleado con panel lateral abierto |
| `ajustes` | `{[empId]: {horas, adelanto}}` | ediciones en línea del período |
| `pagados` | `{[empId]: boolean}` | quién ya cobró en el período |
| `empId`, `cliId`, `proyId` | string | entidad activa en cada ficha |
| `tabEmp` | enum | pestaña de la ficha de empleado |
| `vacEmp`, `vacIni`, `vacFin` | string \| null | selección del calendario |
| `pf` | objeto | borrador editable del formulario de proyecto |
| `modalEmpleado`, `ne`, `neError` | — | modal de alta de empleado |
| `toast` | string | mensaje efímero |

### Modelo de datos sugerido

```ts
type Modalidad = 'semanal' | 'quincenal' | 'mensual';

interface Empleado {
  id: string;
  nombre: string;
  puesto: string;
  cedula: string;            // 1-0987-0333
  fechaIngreso: string;      // ISO en backend
  modalidad: Modalidad;
  salarioBase: number;       // en la unidad de su modalidad
  cuentaIban: string;
  solidarista: number;       // fracción, p. ej. 0.05
  embargo: number;           // ₡ por período
  vacacionesAcumuladas: number;
  vacacionesTomadas: number;
  telefono: string;
  activo: boolean;
}

interface PeriodoPlanilla {
  id: string;
  desde: string; hasta: string;
  estado: 'abierto' | 'aprobado' | 'cerrado';
  lineas: LineaPlanilla[];
}

interface LineaPlanilla {
  empleadoId: string;
  horasExtra: number;
  adelanto: number;
  pagado: boolean;
  fechaPago?: string;
  // los montos calculados se persisten al aprobar (foto histórica),
  // no se recalculan al leer un período cerrado
  snapshot?: { bruto: number; ccss: number; renta: number; otras: number; neto: number };
}

interface Cliente {
  id: string; nombre: string; cedulaJuridica: string;
  contacto: string; telefono: string;
}

interface Proyecto {
  id: string; clienteId: string;
  codigo: string;            // PT-2026-031
  tipo: string; finca: string;
  monto: number; primaPct: number;
  fechaEntrega: string;
  estado: 'en campo' | 'en dibujo' | 'en visado' | 'vencido' | 'cobrado';
  abonos: { fecha: string; referencia: string; monto: number }[];
}
```

**Nota importante**: al aprobar una planilla hay que **congelar los montos calculados**.
Si cambia la tasa de CCSS o el salario de alguien, los períodos ya aprobados no deben
moverse.

### Qué falta construir (no está en el prototipo)

- Backend, base de datos y persistencia.
- Autenticación y roles (hoy hay un solo perfil, "Dueño · acceso total"; la oficina son 2
  personas — conviene al menos dueño / asistente).
- Generación real de colillas en PDF y su envío.
- Conciliación bancaria (el estado de error del prototipo la asume existente).
- Aguinaldo, liquidaciones, cesantía, reportes anuales, planilla de la CCSS.
- Bitácora de cambios (quién editó qué monto y cuándo).

---

## Design tokens

Archivos listos en `tokens/`: `tokens.css` (variables CSS + remapeo de shadcn/ui) y
`tailwind.config.ts`.

> Nota: `tokens/` documenta la paleta base y la escala. La v2 (la vigente) usa el mismo
> verde de marca con superficies y radios más suaves; los valores que mandan son los de
> esta tabla y los del HTML.

### Color

| Token | Hex | Uso |
|---|---|---|
| Fondo de app | `#F4F6F3` | lienzo |
| Superficie | `#FFFFFF` | tarjetas, tablas, modales |
| Superficie sutil | `#FBFCFA` | cabeceras y filas de total |
| Hover de fila | `#F7F9F6` | tablas y listas |
| Tinte activo | `#F1F7F4` | fila con detalle abierto, bloques de resumen |
| Línea | `#E6EAE4` | bordes de tarjeta |
| Línea suave | `#EEF1EC` / `#F0F3EF` / `#F3F5F1` | divisores internos y de fila |
| Borde de control | `#DDE3DC` | inputs y botones ghost |
| Texto | `#131A17` | principal |
| Texto medio | `#6B766F` | secundario |
| Texto tenue | `#8A938C` | rótulos, unidades |
| Texto muy tenue | `#A5AEA7` | notas dentro de listas |
| **Marca** | `#0E6B4E` | acciones primarias, activos, énfasis |
| Marca hover | `#0A5239` | hover de botón primario |
| Marca clara | `#1B9E70` | degradado de marca, toast |
| Tinte de marca | `#E9F3EE` / `#DCEDE5` / `#F1F7F4` | fondos suaves |
| Verde de éxito | `#157F55` · tinte `#E4F4EC` · texto `#12704A` | pagado, cobrado, abonos |
| Ámbar | `#A8710A` · tinte `#FBF1DC` · texto `#8A5C08` | pendiente, feriados, en campo |
| Rojo | `#C0392B` · tinte `#FBEBE8` / `#FDF3F1` · borde `#F2D2CB` · texto `#B0392A` / `#A8321F` | vencido, errores |
| Sidebar | fondo `#111E19` · texto `#A9B6AF` · activo `#F2F7F4` · rótulo `#67766E` | navegación |

### Tipografía

- **UI**: Plus Jakarta Sans (400/500/600/700). Títulos con `letter-spacing: -0.02em`
  (17–19px) o `-0.01em` (14.5px).
- **Números**: IBM Plex Mono (400/500/600) con `font-variant-numeric: tabular-nums`,
  **obligatoria** en montos, cédulas, códigos, fincas, fechas de tabla y días del calendario.
- Escala: 11 · 11.5 · 12 · 12.5 · 13 · 13.5 · 14 · 14.5 · 17 · 19 · 20 · 21 · 22 · 26 px.
  Base 14px, `line-height: 1.5`.

### Radios, sombras, medidas

| Token | Valor |
|---|---|
| Radio · píldora | `99px` |
| Radio · control (input, botón) | `9–10px` |
| Radio · ícono / celda | `8–9px` |
| Radio · tarjeta | `14px` |
| Radio · modal | `18px` |
| Sombra · tarjeta | `0 1px 2px rgba(19,26,23,0.04)` |
| Sombra · tarjeta elevada | `0 1px 2px rgba(19,26,23,0.04), 0 18px 40px -30px rgba(19,26,23,0.5)` |
| Sombra · botón primario | `0 1px 2px rgba(14,107,78,0.35)` |
| Sombra · toast | `0 18px 40px -16px rgba(19,26,23,0.55)` |
| Sombra · modal | `0 32px 70px -24px rgba(9,20,15,0.55)` |
| Alto · fila de tabla | `56px` (planilla) · `52px` (listas) · `46px` (historial) |
| Alto · control | `38px` (32px en controles secundarios, 30px en celda) |
| Espaciado | múltiplos de 4; `gap` de sección 14–16px; padding de tarjeta 18–20px |

### Botones

| Variante | Estilo |
|---|---|
| Primario | alto 38, `background: #0E6B4E`, texto blanco 13.5px/600, radio 10, sombra de botón; hover `#0A5239` |
| Ghost | alto 38, blanco, `border: 1px solid #DDE3DC`, texto `#2C3A33`; hover fondo `#F4F6F3`, borde `#C6D0C7` |
| Deshabilitado | fondo `#F7F9F6`, borde `#EAEEE8`, texto `#A9B2AB`, `cursor: not-allowed` |

### Píldoras de estado

Alto 23px, `padding: 0 10px`, radio 99px, 11.5px/700, `text-transform: capitalize`.
pagado/cobrado `#E4F4EC`/`#12704A` · pendiente `#FBF1DC`/`#8A5C08` ·
vencido `#FBEBE8`/`#B0392A` · neutro `#EDF2EF`/`#4A6B5C`.

⚠️ En píldoras `inline-flex` que combinan un valor y una etiqueta hay que poner `gap`
explícito: el nodo de texto que solo contiene un espacio no se renderiza en un contenedor
flex y el número queda pegado a la palabra.

### Iconografía

Íconos de línea dibujados a mano en SVG inline, `stroke-width: 1.8–2.3`,
`stroke-linecap: round`, tamaños 13–21px, siempre `currentColor` salvo cuando llevan color
propio. En el codebase destino conviene reemplazarlos por la librería que ya se use
(Lucide es la equivalencia más cercana): layout-dashboard, table, calendar-days, user,
building, folder, chevron-right, check, plus, x, alert-triangle, credit-card, trending-up,
clock, user-plus.

---

## Assets

No hay imágenes ni fuentes locales. Todo es tipografía web + SVG inline.

- **Fuentes**: Google Fonts — Plus Jakarta Sans e IBM Plex Mono. En producción conviene
  auto-hospedarlas.
- **Logo**: placeholder (triángulo de teodolito sobre cuadro con degradado verde).
  **Reemplazar por el logo real de la oficina.**

---

## Archivos de este bundle

| Archivo | Qué es |
|---|---|
| `PROMPT_PARA_EL_AGENTE.md` | Prompt listo para pegar en la sesión del agente que implementa. |
| `screenshots/` | 10 capturas de las pantallas y estados (ver tabla abajo). |
| `Oficina de topografía - Sistema interno v2.dc.html` | **Diseño vigente.** Las 6 pantallas + modal de alta, funcional. Abrir en el navegador. |
| `Oficina de topografía - Sistema interno.dc.html` | v1, estética anterior (plano catastrado, más austera). Solo referencia histórica. |
| `support.js` | Runtime del prototipo. Necesario para que los HTML abran. |
| `tokens/tokens.css` | Variables CSS + remapeo de shadcn/ui. |
| `tokens/tailwind.config.ts` | Configuración de Tailwind con la escala y la paleta. |

Para revisar el diseño: abrir el HTML v2 en un navegador (con `support.js` al lado) y
recorrer las 6 pantallas desde la barra lateral. Vale la pena probar los tres modos del
pie de la barra lateral (Datos / Vacío / Error) para ver los estados.

### Capturas

| Archivo | Pantalla / estado |
|---|---|
| `01-panel-principal.png` | Panel con las 4 métricas, pendientes de pago y cuentas por cobrar |
| `02-planilla.png` | Tabla de planilla completa con totales |
| `03-planilla-desglose-lateral.png` | Planilla con el panel lateral de desglose abierto |
| `04-modal-agregar-empleado.png` | Modal de alta de empleado |
| `05-ficha-empleado.png` | Ficha de empleado, pestaña Contrato |
| `06-vacaciones-sin-rango.png` | Calendario sin selección |
| `07-vacaciones-rango-inicio.png` | Calendario con solo el día de inicio marcado |
| `08-vacaciones-rango-completo.png` | Calendario con rango completo y días hábiles calculados |
| `09-ficha-cliente.png` | Ficha de cliente con tabla de proyectos |
| `10-formulario-proyecto.png` | Formulario de proyecto con abonos y saldo en vivo |

Las capturas se tomaron a escala reducida para que entrara el ancho de escritorio completo;
algunos textos aparecen cortados o partidos en dos líneas por el capturador. **Los valores
que mandan son los de este README y el HTML**, no lo que se vea en la imagen.

---

## Orden de implementación sugerido

1. Modelo de datos + parámetros de planilla editables por período fiscal.
2. Motor de cálculo con pruebas unitarias por modalidad (los tres casos) y por tramo de
   renta. Es la pieza donde un error cuesta dinero real.
3. Planilla (pantalla 2) con edición en línea y aprobación que congela montos.
4. Panel (pantalla 1), que se alimenta de lo anterior.
5. Empleados + alta (pantalla 3 y modal).
6. Clientes y proyectos (pantallas 5 y 6).
7. Vacaciones (pantalla 4).
8. Colillas en PDF y conciliación bancaria.
