# Valores legales a verificar antes de usar el sistema con plata real

Todo lo que sigue está **sembrado con valores de referencia**, no confirmados contra
la normativa vigente ni contra el Excel que la oficina usa hoy. El sistema los toma
de la base de datos, así que **se corrigen desde Configuración → Parámetros de
planilla, sin tocar código ni volver a desplegar**.

Mientras no se verifiquen, tratá los números como un borrador: cuadralos contra una
planilla real ya pagada antes de confiar en ellos.

## 0. Valores alineados al Excel de la oficina ✓

Los parámetros que trae el sistema **ya son los del Excel de referencia** de la oficina
(`Simulador_Planilla_CCSS_Costa_Rica.xlsx`, que cita "Ministerio de Hacienda, tramos de
renta 2026"). Se reemplazaron los del prototipo de diseño, que eran ficticios:

| Concepto | Antes (prototipo) | Ahora (Excel) |
|---|---|---|
| Cargas del trabajador | 10,67 % | **10,83 %** |
| Tramo exento mensual | ₡942.000 | **₡918.000** |
| Límite tramo 10 % | ₡1.381.000 | **₡1.347.000** |
| Límite tramo 15 % | ₡2.423.000 | **₡2.364.000** |
| Límite tramo 20 % | ₡4.845.000 | **₡4.727.000** |
| Crédito por hijo | ₡0 | **₡1.710 / mes** |
| Crédito por cónyuge | ₡0 | **₡2.590 / mes** |
| Cargas patronales | no existía | **26,83 %** |

Los períodos ya aprobados **no cambiaron**: rinden desde su foto congelada, no desde los
parámetros. Solo se recalculan los períodos en borrador.

### Lo único que quedó inferido

El Excel da el **total** del trabajador (10,83 %) pero no su desglose, y la colilla sí
muestra las tres partes. El sistema reparte así:

| Parte | Tasa | Estado |
|---|---|---|
| SEM (Enfermedad y Maternidad) | 5,50 % | del reparto habitual |
| IVM (Invalidez, Vejez y Muerte) | **4,33 %** | **inferido** — acá cae la diferencia |
| Ley del Banco Popular | 1,00 % | del reparto habitual |

El total deducido es correcto; lo que falta confirmar con la CCSS es **cómo se reparte**,
porque es lo que ve el empleado en su colilla. Se corrige en Configuración sin desplegar.

## 1. Deducciones del trabajador (CCSS)

| Concepto | Valor vigente | Estado |
|---|---|---|
| SEM (Seguro de Enfermedad y Maternidad) | 5,50 % | a verificar el desglose |
| IVM (Invalidez, Vejez y Muerte) | 4,33 % | inferido |
| Ley del Banco Popular | 1,00 % | a verificar el desglose |
| **Total obrero** | **10,83 %** | ✓ confirmado contra el Excel |

El sistema redondea cada parte por separado para que el desglose de la colilla sume
exacto. Si la CCSS reparte distinto, se cambia en Configuración.

## 2. Impuesto sobre la renta al salario

Tramos mensuales vigentes en el sistema (Hacienda los actualiza por decreto **cada
año**, así que en enero hay que revisarlos):

| Desde | Hasta | Tasa |
|---|---|---|
| ₡0 | ₡918.000 | 0 % |
| ₡918.000 | ₡1.347.000 | 10 % |
| ₡1.347.000 | ₡2.364.000 | 15 % |
| ₡2.364.000 | ₡4.727.000 | 20 % |
| ₡4.727.000 | — | 25 % |

Créditos fiscales cargados: **₡1.710 por hijo** y **₡2.590 por cónyuge**, mensuales. El
motor los resta del impuesto y nunca deja la renta en negativo ni genera devolución.

## 3. Feriados

Los 12 feriados de 2026 están cargados con una marca de pago obligatorio y de
traslado a lunes que **hay que contrastar con el artículo 148 del Código de
Trabajo**. Los dudosos:

- **2 de agosto (Virgen de los Ángeles)** — sembrado como *no* obligatorio.
- **12 de octubre (Día de las Culturas)** — sembrado como *no* obligatorio y trasladable.
- **1 de diciembre (Abolición del Ejército)** — sembrado como obligatorio.
- **Jueves y Viernes Santo** — fecha móvil. Para 2026 quedaron el 2 y 3 de abril;
  **cada año hay que registrarlos a mano** (el duplicado de año los salta a propósito
  y avisa cuáles faltan).

## 4. Vacaciones

Acumulación sembrada en **1 día por mes trabajado**, como aproximación al artículo
153 (dos semanas por cada 50 semanas continuas). Es un parámetro configurable: si la
oficina es más generosa o usa otro esquema, se cambia sin tocar código.

Los saldos iniciales de los 8 empleados salieron de los datos de demostración del
prototipo. Antes de arrancar con datos reales hay que **cargar el saldo real de cada
persona** con un ajuste manual (queda en la bitácora con su motivo).

## 5. Lo que el sistema todavía no calcula

Está en el modelo de datos pero no implementado, porque necesita reglas confirmadas:

- **Liquidaciones**: preaviso y cesantía según años de servicio y causal.
- **Cargas patronales** (~26–27 % adicional): el sistema calcula lo que se le deduce
  al trabajador y lo que se le paga, no el costo patronal total todavía.
- **Reportes en el formato oficial de la CCSS**.
- **Horas extra dobles** (feriados y días de descanso): hoy aplica un único factor
  configurable de ×1,5.

## Cómo verificarlo en la práctica

1. Tomá una quincena que la oficina ya pagó, con sus montos reales.
2. Cargá esos empleados con su salario y modalidad, y generá el período.
3. Compará línea por línea contra el Excel viejo.
4. Donde no cuadre, ajustá el parámetro en Configuración y volvé a comparar. El
   panel de desglose de cada empleado muestra qué parámetro se aplicó, sobre qué
   base y cuánto dio, así que la diferencia se ubica rápido.

Una vez que cuadre, aprobá el período: a partir de ahí los montos quedan congelados
y ningún cambio posterior de tasas los mueve.
