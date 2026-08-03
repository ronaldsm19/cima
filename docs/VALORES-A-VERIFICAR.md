# Valores legales a verificar antes de usar el sistema con plata real

Todo lo que sigue está **sembrado con valores de referencia**, no confirmados contra
la normativa vigente ni contra el Excel que la oficina usa hoy. El sistema los toma
de la base de datos, así que **se corrigen desde Configuración → Parámetros de
planilla, sin tocar código ni volver a desplegar**.

Mientras no se verifiquen, tratá los números como un borrador: cuadralos contra una
planilla real ya pagada antes de confiar en ellos.

## 0. Discrepancia pendiente de resolver ⚠️

El Excel de referencia que pasó la oficina
(`Simulador_Planilla_CCSS_Costa_Rica.xlsx`, citando "Ministerio de Hacienda, tramos de
renta 2026") **no coincide con los valores sembrados**, que vienen del prototipo de
diseño:

| Concepto | Sembrado en el sistema | Excel de referencia |
|---|---|---|
| Cargas del trabajador | 10,67 % | **10,83 %** |
| Tramo exento mensual | ₡942.000 | **₡918.000** |
| Límite tramo 10 % | ₡1.381.000 | **₡1.347.000** |
| Límite tramo 15 % | ₡2.423.000 | **₡2.364.000** |
| Límite tramo 20 % | ₡4.845.000 | **₡4.727.000** |
| Crédito por hijo | ₡0 | **₡1.710 / mes** |
| Crédito por cónyuge | ₡0 | **₡2.590 / mes** |
| Cargas patronales | no existía | **26,83 %** |

Los datos del prototipo eran ficticios; los del Excel citan la fuente. **Lo más probable
es que manden los del Excel**, pero cambiarlos mueve plata real, así que la decisión es
de la oficina. Se aplican creando un período fiscal nuevo en Configuración → Parámetros
de planilla (los períodos ya aprobados conservan los suyos).

Las cargas patronales (26,83 %) ya se agregaron al sistema y las usa el simulador para
mostrar el costo total de cada empleado.

## 1. Deducciones del trabajador (CCSS)

| Concepto | Valor sembrado | Estado |
|---|---|---|
| SEM (Seguro de Enfermedad y Maternidad) | 5,50 % | a verificar |
| IVM (Invalidez, Vejez y Muerte) | 4,17 % | a verificar |
| Ley del Banco Popular | 1,00 % | a verificar |
| **Total obrero** | **10,67 %** | a verificar — el Excel dice 10,83 % |

El desglose en tres partes sale del reparto habitual; lo que el prototipo daba por
bueno era solo el total de 10,67 %. Si la oficina usa otro reparto, cambialo: el
sistema redondea cada parte por separado para que el desglose de la colilla sume
exacto.

## 2. Impuesto sobre la renta al salario

Tramos mensuales sembrados (Ministerio de Hacienda actualiza por decreto **cada año**):

| Desde | Hasta | Tasa |
|---|---|---|
| ₡0 | ₡942.000 | 0 % |
| ₡942.000 | ₡1.381.000 | 10 % |
| ₡1.381.000 | ₡2.423.000 | 15 % |
| ₡2.423.000 | ₡4.845.000 | 20 % |
| ₡4.845.000 | — | 25 % |

**Créditos fiscales por hijo y por cónyuge quedaron en ₡0** porque no se confirmó el
monto vigente. Si la oficina los aplica, cargalos en Configuración; el motor ya los
resta del impuesto mensual y nunca deja la renta en negativo.

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
