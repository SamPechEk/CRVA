# Comprobaciones realizadas

- `npm test`: 36 pruebas aprobadas; una suite de reglas requiere el emulador y se omite fuera de él.
- `npm run build`: TypeScript estricto y Vite aprobados, sin advertencias de compilación.
- Dominio: costos exactos de los cuatro modelos, categorías VEL-01, tarifas 15–40%, inversión total y activa, IVA/pedido, mezcla y meta, PE individual y ponderado, esencia, anti-inversión y validación de mezcla.
- Testing Library: sugerencia por volumen mantiene margen hasta acción explícita; guardado produce snapshot y bloquea duplicado accidental; vista cliente excluye desglose interno; captura inválida de 100% y mezcla incompleta bloquean guardar.
- Repositorio local: bloqueo de baja de insumo referenciado, inmutabilidad al cambiar precios actuales, estado, seed idempotente, respaldo/restauración con esquema y rechazo de alteraciones a snapshots al restaurar.
- Salidas comerciales: payload de PDF y texto de WhatsApp excluyen campos y cifras internas. ExcelJS produce un XLSX válido con seis nombres exactos y fórmulas SUM, SUMIF, INDEX/MATCH y ROUNDUP.
- Recalculo independiente del XLSX con LibreOffice: cero celdas con error. Costos 22.5583333333333 / 20.3836666666667 / 115.895 / 133.485; margen base 30%; precio ponderado 73.4978095238095; PE 23 y 1690.44961904762; meta 159 y 11686.1517142857. Coinciden con los valores cacheados del Excel original.
- Separación de infraestructura: SDK Firebase restringido a `src/adapters/`; puertos, dominio, hooks y páginas usan DTOs propios.

## Comprobaciones pendientes por infraestructura externa

La red del entorno devuelve **403 Domain forbidden** al descargar el JAR oficial del emulador Firestore. La suite `npm run test:rules` está incluida pero no pudo ejecutarse aquí. No se afirma que sus pruebas hayan pasado.

El navegador de la sesión rechazó la apertura de localhost por su política de URL. La revisión visual real de 375 px/1280 px y el flujo de PDF con foto quedan pendientes. Las pruebas de formularios usan jsdom, no sustituyen un navegador real.

Firebase Auth/Firestore/Hosting reales y Cloudinary requieren configuración del negocio. No se crearon cuentas, proyectos, presets ni despliegues. El adaptador Firebase utiliza transacciones para folios; la prueba de concurrencia está en la suite del emulador pendiente. El modo local no representa concurrencia entre dos computadoras.

## Autorización por UID

Se eliminó la lista de correos de código y entorno. Las reglas consultan `accessUsers/{uid}.active` y exigen correo verificado. Los permisos sólo se administran con Firebase Console o Admin SDK; el cliente sólo puede leer su propio documento. Las pruebas del adaptador cubren acceso activo, permiso ausente/inactivo, Google, verificación por email y suscripciones canceladas. La suite del emulador incluye una segunda membresía, revocación y rechazo de autoasignación de permisos; sigue pendiente su ejecución por el bloqueo de descarga del JAR indicado arriba.

Los cambios de repositorio no publican reglas en Firebase automáticamente. Es necesario desplegar las reglas actualizadas y crear los documentos de acceso para habilitar las cuentas reales.
