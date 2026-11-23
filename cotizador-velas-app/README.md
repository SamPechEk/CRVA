# Cotizador de velas artesanales

Aplicación SPA en español que reproduce el dominio del libro `cotizador_velas_editable-v4.xlsx`. React 18, TypeScript estricto, Vite, Tailwind, React Router 6, TanStack Query, Recharts, Decimal.js, Firebase Spark y Cloudinary unsigned. No requiere backend ni Firebase Storage.

## Inicio rápido

Requiere Node 22+ y npm. Desde este directorio:

```sh
npm ci
cp .env.example .env
npm run dev
```

Abre la URL que imprime Vite. Sin configuración remota, la pantalla de acceso permite **Abrir modo de prueba local**. Inicializa después los datos v4. Este modo usa localStorage en ese navegador, sin autenticación ni sincronización, y folios `DEMO-…`. Se activa voluntariamente por sesión; también puede usarse `VITE_DATA_PROVIDER=demo` durante desarrollo. No lo uses como sistema de producción compartido. Salir de este modo conserva los datos locales para la siguiente sesión. El proveedor de producción por defecto es Firebase.

## Configurar Firebase Spark sin tarjeta

1. Crea un proyecto en Firebase Console y conserva el plan Spark. Registra una app web. Copia API key, Auth domain, Project ID y App ID a las variables `VITE_FIREBASE_*` de `.env`.
2. Activa Authentication → Sign-in method → Email/Password y/o Google. Crea las dos cuentas y verifica sus correos (Google entrega correo verificado). La app no crea cuentas públicas ni contiene contraseñas. Añade los dominios de Hosting y localhost a Authorized domains cuando corresponda.
3. Crea Cloud Firestore en modo producción y elige su región. No actives Storage, Functions ni facturación para este proyecto.
4. **Sustituye los dos correos de ejemplo en `firestore.rules` por los dos correos reales verificados**, en minúsculas. Configura exactamente la misma pareja en `VITE_ALLOWED_EMAILS`, separados por coma. La aplicación requiere dos valores distintos. No publiques las reglas con los correos de ejemplo.
5. Instala dependencias y usa el CLI incluido:

```sh
npx firebase login
npx firebase use --add
npx firebase deploy --only firestore:rules,firestore:indexes
npm run build
npx firebase deploy --only hosting
```

6. Entra con una cuenta autorizada y pulsa **Cargar datos iniciales del Excel (v4)**. Es una transacción: no sobreescribe catálogos existentes. Se incluyen únicamente los 18 insumos, cuatro modelos, seis fijos y cuatro tarifas del Excel. Clientes, fotos, proveedores e identidad comercial quedan vacíos.

Las claves web de Firebase son configuración pública; las reglas constituyen la autorización. Nunca pongas credenciales de servicio en variables `VITE_*`. `.env` se excluye de Git.

## Cloudinary Free

1. Crea una cuenta Cloudinary Free. En Settings → Upload crea un **Unsigned Upload Preset**. Restringe formatos a JPG/PNG/WebP y tamaño a 5 MB también en el preset. Deshabilita sobrescritura y configura una carpeta dedicada.
2. Copia cloud name y preset a `VITE_CLOUDINARY_CLOUD_NAME` y `VITE_CLOUDINARY_UPLOAD_PRESET`. No se usa API secret en frontend.
3. Desde Modelos o Parámetros sube una foto/logo. La app valida MIME y tamaño, envía un FormData por fetch y guarda sólo URL y public ID en Firestore.
4. Visualización: `f_auto,q_auto,w_800,c_limit`. PDF: `f_jpg,q_85,w_400,c_limit`, con CORS anónimo y fallback sin foto cuando falla.

Al quitar/reemplazar fotos sólo cambia la referencia. Un preset unsigned no permite destruir imágenes remotas de forma segura: limpia imágenes huérfanas desde Cloudinary. Al migrar a servidor propio, automatiza la limpieza con credenciales del servidor. Un preset unsigned es público por diseño; las restricciones del preset y la cuota de Cloudinary son relevantes.

## Desarrollo con emuladores

Requiere Java 21+. Usa un proyecto demo para evitar acceso accidental a producción:

```sh
npx firebase emulators:start --project demo-cotizador
```

Configura `VITE_USE_FIREBASE_EMULATORS=true`, `VITE_FIREBASE_PROJECT_ID=demo-cotizador`, un API key de prueba no vacío y `VITE_FIREBASE_AUTH_DOMAIN=demo-cotizador.firebaseapp.com`. Mantén `VITE_DATA_PROVIDER=firebase`. En Auth Emulator crea dos usuarios con los correos de las reglas y `emailVerified=true`. Reinicia Vite al cambiar `.env`.

Puertos: Auth 9099, Firestore 8787, Hosting 5000, UI 4001, hub 4401, logging 4501. Los mismos puertos están en `firebase.json`, el adaptador y la suite de reglas. Nunca despliegues con la variable de emuladores activada.

```sh
npm test                 # dominio, exportaciones, repos local y formularios
npm run test:rules       # emulador aislado: identidad, permisos, snapshot y concurrencia
npm run build            # TypeScript + compilación estática en dist/
```

Si tu entorno tiene el home de sólo lectura, configura `npm_config_cache=/tmp/npm-cache`, `FIREBASE_EMULATORS_PATH=/tmp/firebase-emulators` y `XDG_CONFIG_HOME=/tmp/firebase-config`. El primer uso del emulador descarga un JAR oficial de Google.

## Operación

- **Cotizador:** modelo, cantidad, margen e IVA explícitos. La cantidad sugiere una tarifa; sólo se aplica al pulsar su botón. Cambiar insumos actualiza los costos derivados, nunca los snapshots guardados. El cálculo usa margen bruto real `costo / (1 − margen)`.
- **Modelos:** crear, duplicar, desactivar, foto, receta y lote. Energía y trabajo se calculan automáticamente desde el lote; el reposo cuesta cero. Las ceras usan g o kg y el asistente convierte a gramos. Selecciona la esencia en ml antes de aplicar la sugerencia.
- **Insumos:** costo unitario = precio del paquete / cantidad real comprada. La edición de cantidades y precios se realiza en el diálogo Editar. Se bloquea desactivar un insumo usado, mostrando los modelos afectados. Energía/mano de obra son roles únicos, siempre vinculados a modelos activos.
- **Mayoreo:** rangos continuos y márgenes estrictamente decrecientes. La base hereda el margen configurado. Cambiar la base a un margen menor puede exigir ajustar primero los demás niveles en esa misma pantalla. Mezcla de modelos activos debe sumar 100%, tolerancia 0.0001.
- **Historial:** páginas de 25 con cursor estable, filtros exactos por folio/cliente/estado. Sólo se cambia el estado. Duplicar conserva el snapshot comercial y crea un borrador con nuevo folio; nuevas condiciones se cotizan desde el Cotizador.
- **PDF y WhatsApp:** payload comercial explícito, excluye costos, recetas, márgenes y utilidad. Notas y nombres son texto libre visible para el cliente: revisa Vista cliente. Se permite PDF preliminar con `SIN GUARDAR`; guarda para asignar folio definitivo. Los PDFs se regeneran desde el snapshot, no se almacenan. Las fotos son referencias a recursos remotos y su disponibilidad puede afectar su inclusión en una descarga posterior.
- **Offline:** Firestore persistentLocalCache con soporte multitab y caché TanStack Query de cinco minutos. Sin listeners sobre colecciones crecientes. Consultas previamente cargadas pueden estar disponibles; la primera visita requiere conexión. Guardar una cotización exige conexión para la transacción del contador. Cambios de catálogo pueden esperar sincronización de Firestore. La app no instala service worker: tras cerrar/recargar sin red el navegador puede no cargar la SPA. El indicador expresa conectividad del navegador, no confirma el estado de sincronización remoto.

## Respaldo y restauración

Descarga un JSON completo desde Parámetros antes de cambios importantes. Incluye todas las colecciones operativas, configuración y contador. No incluye binarios de imágenes ni cuentas Auth: las URLs siguen dependiendo de Cloudinary.

La restauración valida Zod, referencias y coherencia antes de solicitar escribir **RESTAURAR**. Es una restauración por IDs: actualiza catálogo/configuración y añade documentos faltantes, conserva documentos no incluidos. Nunca modifica el snapshot de una cotización ya existente; si tiene el mismo ID y contenido interno diferente, detiene la operación antes de escribir. Los estados actuales de cotizaciones existentes se conservan. En Firebase reserva primero el contador sin retrocederlo y escribe lotes de hasta 400 documentos; no es una transacción global. Evita otras ediciones durante la restauración. Si se interrumpe, conserva el archivo y repite: las escrituras por ID son idempotentes. Conserva siempre un respaldo anterior. El modo local sigue la misma política de combinar por IDs y conservar snapshots.

## Seguridad y límites

Las reglas rechazan cuentas no autorizadas/no verificadas, borrado físico de modelos/insumos/cotizaciones y cambios al snapshot de una cotización. Validan campos numéricos, categorías, roles, IVA, lote y margen de tarifas frente a Menudeo. La lógica de referencias cruzadas de recetas, sumas de mezcla, escalones completos y fórmulas se valida en el dominio/repositorios del cliente. Firestore Rules no ejecuta consultas inversas ni recorre listas arbitrarias: no equivale a constraints SQL para esos invariantes ante escritura manual de una cuenta autorizada. Las dos cuentas son administradoras de confianza; no edites documentos directamente. Para un modelo de usuarios hostiles se requiere otro diseño de datos/servicio autoritativo. Los folios concurrentes de la aplicación se asignan exclusivamente con `runTransaction` sobre `counters/quotes`; las reglas no distinguen una transacción SDK de otras escrituras atómicas.

La restauración/exportación completa hace lecturas/escrituras proporcionales al tamaño del respaldo; úsala con conciencia de las cuotas Spark. Los catálogos se cargan una vez cada cinco minutos y se invalidan al mutar. El historial usa índices compuestos incluidos. No se han configurado una cuenta Firebase real ni un preset Cloudinary en este repositorio: requieren los valores del negocio. No se ha publicado ningún sitio.

## Arquitectura y diseño

`domain/` sólo usa TS + Decimal + Zod. `ports/` define repositorios, Auth y medios; `services/container.ts` inyecta adaptadores. Fuera de `adapters/` no se importan SDKs Firebase. Las fechas son ISO UTC; cantidades y dinero viajan como strings decimales. Precisión persistida: hasta seis decimales en cantidades/unitarios, cuatro en porcentajes y dos en totales. El dominio conserva precisión completa al calcular; la presentación usa centavos.

Se aplicó [UI/UX PRO MAX](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill). Las decisiones están en `design-system/cotizador-de-velas/MASTER.md`: crema, terracota, texto carbón, título editorial, cifras tabulares, foco visible, objetivos táctiles de 44 px, menú móvil, diálogos nativos y reduced-motion. El navegador de la sesión bloqueó la vista local: la comprobación visual a 375 px/1280 px queda pendiente, aunque existen estilos responsivos y pruebas de formularios con Testing Library.

Consulta `MIGRATION_MYSQL.md` para implementar nuevos adaptadores sin cambiar páginas ni dominio.
