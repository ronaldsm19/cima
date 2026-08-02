# Prompt para el agente que va a implementar

Copiá **todo** lo que está debajo de la línea y pegalo como primer mensaje en la sesión de
Claude Code, con la carpeta `design_handoff_sistema_topografia/` dentro del proyecto (o
adjuntá el zip). El prompt asume que el agente puede leer los archivos de la carpeta.

---

Vas a construir una aplicación web interna para una oficina de topografía en Costa Rica.
En `design_handoff_sistema_topografia/` tenés el paquete de diseño completo.

**Antes de escribir código, leé en este orden:**

1. `design_handoff_sistema_topografia/README.md` — la especificación completa: layouts,
   medidas exactas, colores, tipografía, estados, reglas de cálculo de planilla, modelo de
   datos y validaciones. Es la fuente de verdad.
2. `design_handoff_sistema_topografia/screenshots/` — las 10 capturas de las pantallas y
   estados, numeradas.
3. `design_handoff_sistema_topografia/Oficina de topografía - Sistema interno v2.dc.html` —
   el prototipo navegable. Abrilo en el navegador (necesita `support.js` al lado) y recorré
   las 6 pantallas para entender el comportamiento antes de implementar.
4. `design_handoff_sistema_topografia/tokens/` — `tokens.css` y `tailwind.config.ts` con la
   paleta y la escala.

**Sobre los archivos HTML**: son *referencias de diseño*, no código para copiar. Muestran
la apariencia y el comportamiento buscados. Tu trabajo es recrear esos diseños en un
codebase real y bien estructurado; no portees el HTML tal cual ni su runtime.

## Qué construir

Un sistema interno con seis pantallas, todas descritas en el README:

1. **Panel principal** — métricas del período, lista de "falta pagarles", cuentas por cobrar.
2. **Planilla del período** — tabla editable en línea, selección múltiple, aprobación.
3. **Ficha de empleado** — cajetín de datos + pestañas (contrato, historial de pagos, vacaciones).
4. **Calendario de vacaciones** — selección de rango sobre dos meses, cálculo de días hábiles.
5. **Ficha de cliente** — datos + tabla de proyectos con saldos.
6. **Formulario de proyecto** — datos, registro de abonos, panel de saldo en vivo.

Más el **modal de alta de empleado** (descrito en el README, captura 04).

## Stack

Si el proyecto ya tiene un stack, usá ese y sus patrones. Si arrancás de cero:
**Next.js (App Router) + TypeScript + Tailwind + shadcn/ui**, con Postgres y Prisma o
Drizzle. Los tokens de `tokens/` están preparados para esa combinación. Íconos: Lucide (el
README lista la equivalencia de cada ícono del diseño).

## Prioridades, en orden

1. **El motor de cálculo de planilla, con pruebas unitarias, antes que cualquier UI.**
   Está especificado en el README, sección *Reglas de cálculo*. Cubrí con tests las tres
   modalidades (semanal, quincenal, mensual), cada tramo de renta, horas extra, y los
   límites de adelanto. Es la única parte donde un error cuesta dinero real: dos personas
   van a confiar en estos números para pagarle a ocho.
2. **La tasa de CCSS y los topes de renta van en una tabla de parámetros por período
   fiscal, editables sin desplegar.** Cambian por ley cada año. No las pongas como
   constantes en el código.
3. **Al aprobar una planilla, congelá los montos calculados** (snapshot por línea). Si
   después cambia un salario o una tasa, los períodos ya aprobados no se pueden mover.
4. Planilla (pantalla 2) → Panel (1) → Empleados + alta (3) → Clientes y proyectos (5 y 6)
   → Vacaciones (4).

## Reglas de implementación

- **Fidelidad alta**: respetá los valores del README (colores hex, tamaños, radios, altos
  de fila, pesos tipográficos). Si tu librería de componentes impone algo distinto,
  ajustala con los tokens en vez de aceptar su default.
- **Los números siempre en monoespaciada con `tabular-nums`** y alineados a la derecha:
  montos, cédulas, códigos de proyecto, números de finca, fechas en tabla, días del
  calendario. Es lo que hace legible una tabla de planilla.
- **Formato de moneda**: `₡` + miles con punto + decimales con coma → `₡1.234.567,89`.
  Cuidado: `toLocaleString('es-CR')` devuelve espacio como separador de miles en varios
  runtimes. Escribí un formateador propio y probalo.
- **Todo el texto de interfaz en español de Costa Rica, con voseo** ("Registrá", "Agregá",
  "Marcá", "Bajá el monto"). El README trae los mensajes de error y los textos de estado
  vacío redactados; usalos literalmente.
- **Desktop primero.** Dos personas, escritorio, seis horas al día. Un solo breakpoint en
  960px y lo único que tiene que pasar ahí es que nada se rompa.
- Los estados vacíos y de error del prototipo (el selector "Datos / Vacío / Error" del pie
  de la barra lateral) **no son una función del producto**: son la especificación de esos
  estados. Implementalos como consecuencia de datos reales, y no incluyas el selector.
- Los datos del prototipo (nombres, cédulas, montos, fincas) son ficticios. Usalos como
  seed de desarrollo.

## Lo que el prototipo no cubre y hay que construir

Backend y persistencia; autenticación con al menos dos roles (dueño y asistente);
generación de colillas en PDF; conciliación bancaria; aguinaldo, liquidaciones y cesantía;
reportes para la CCSS; bitácora de quién cambió qué monto y cuándo.

## Antes de empezar a codear

Hacé un plan corto y mostrámelo: stack elegido, esquema de base de datos, y en qué orden
vas a construir. Si algo del README te parece ambiguo o contradictorio, preguntá en vez de
asumir — sobre todo si es una regla de cálculo.
