# Migración a Node.js / Express / MySQL y archivos propios

El dominio y la UI dependen de los puertos. Mantén sus contratos y los strings decimales/fechas ISO. Implementa las carpetas `src/adapters/httpApi/` y `src/adapters/serverStorage/`; no cambies `src/domain/`, `src/pages/` ni `src/components/`. Esas carpetas contendrán los módulos necesarios, no literalmente dos archivos.

## Contratos y cableado

1. `httpApi/auth.adapter.ts`: implementa `IAuth` con sesión HTTP, cookie `HttpOnly; Secure; SameSite` y endpoint `/session`. Provee el mismo usuario `{uid,email,emailVerified}` y suscripción a cambios. La autorización real de exactamente dos identidades ocurre en el servidor, no sólo en React.
2. `httpApi/repositories.adapter.ts`: implementa `Repositories` completo. Listar/guardar/desactivar catálogos, mezcla atómica, guardar tarifas y parámetros conjuntamente, clientes, páginas de 25 cotizaciones, alta de snapshot, estado, backup y seed idempotente. Devuelve los mismos DTOs o rechaza con mensajes de negocio.
3. `serverStorage/media.adapter.ts`: implementa `IMediaStorage.uploadImage(File)` por multipart autenticado y `getOptimizedUrl(url,mode)`. Conserva la respuesta `{imageUrl,imagePublicId}`. `imagePublicId` puede ser un UUID de archivo propio. Para PDF configura CORS para el origen de la aplicación y devuelve JPG. Valida MIME por contenido, ≤5 MB, nombres aleatorios, rutas fuera de la raíz ejecutable; evita path traversal. Genera tamaños web/PDF en servidor y limpia huérfanos con referencias comprobadas.
4. Agrega `http_api` y `server_fs` al esquema de `src/config/env.ts`, variables de URL de API y las ramas correspondientes de `src/services/container.ts`. Éste es el único cableado que cambia además de los nuevos adaptadores. Mantén Firebase como opción para transición.
5. PDF/WhatsApp/Excel siguen siendo client-side. `pdfService` usa el puerto de medios inyectado desde el contenedor.

## Esquema SQL de referencia (MySQL 8+)

Valores DECIMAL se envían desde el driver como **strings**, nunca `Number`. Configure UTC para conexión y sesión. `createdAt/updatedAt` del DTO se serializan con `toISOString()`. IDs semilla como `INS-01` caben en `VARCHAR(36)`; no asumas que todos son UUID.

```sql
CREATE TABLE settings (
 id VARCHAR(36) PRIMARY KEY,
 currency_code CHAR(3) NOT NULL DEFAULT 'MXN',
 default_margin_pct DECIMAL(8,4) NOT NULL CHECK(default_margin_pct >= 0 AND default_margin_pct < 1),
 default_iva_pct DECIMAL(8,4) NOT NULL CHECK(default_iva_pct IN (0,0.08,0.16)),
 drops_per_ml DECIMAL(12,6) NOT NULL CHECK(drops_per_ml > 0),
 max_drops_per_100g_wax DECIMAL(12,6) NOT NULL,
 monthly_target_profit DECIMAL(12,2) NOT NULL,
 active_mix_channel VARCHAR(255) NOT NULL,
 business_name VARCHAR(255) NOT NULL DEFAULT '',
 business_logo_url TEXT NULL,
 business_logo_public_id VARCHAR(255) NULL,
 quote_default_notes TEXT NOT NULL
);
CREATE TABLE materials (
 id VARCHAR(36) PRIMARY KEY, code VARCHAR(64) NOT NULL, name VARCHAR(255) NOT NULL,
 category ENUM('Insumos directos','Empaque','Costos indirectos') NOT NULL,
 unit ENUM('g','kg','ml','L','pza','m','kWh','min','hr','vela') NOT NULL,
 quantity_purchased DECIMAL(12,6) NOT NULL CHECK(quantity_purchased>0),
 total_price DECIMAL(12,2) NOT NULL CHECK(total_price>=0),
 is_wax BOOLEAN NOT NULL DEFAULT FALSE,
 system_role ENUM('NONE','ENERGY','LABOR') NOT NULL DEFAULT 'NONE',
 is_active BOOLEAN NOT NULL DEFAULT TRUE, supplier_name VARCHAR(255) NULL
);
CREATE TABLE models (
 id VARCHAR(36) PRIMARY KEY, code VARCHAR(64) NOT NULL,
 name VARCHAR(255) NOT NULL, presentation TEXT NOT NULL,
 candles_per_batch INT NOT NULL CHECK(candles_per_batch>=1),
 melt_pour_minutes_batch DECIMAL(12,6) NOT NULL,
 unmold_pack_minutes_batch DECIMAL(12,6) NOT NULL,
 curing_hours_passive DECIMAL(12,6) NOT NULL DEFAULT 24,
 energy_kwh_batch DECIMAL(12,6) NOT NULL,
 sales_mix_pct DECIMAL(8,4) NOT NULL CHECK(sales_mix_pct BETWEEN 0 AND 1),
 image_url TEXT NULL, image_public_id VARCHAR(255) NULL,
 is_reference_template BOOLEAN NOT NULL DEFAULT FALSE,
 is_active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE recipe_items (
 model_id VARCHAR(36) NOT NULL, material_id VARCHAR(36) NOT NULL,
 quantity_per_candle DECIMAL(12,6) NOT NULL CHECK(quantity_per_candle>=0),
 PRIMARY KEY(model_id,material_id),
 FOREIGN KEY(model_id) REFERENCES models(id),
 FOREIGN KEY(material_id) REFERENCES materials(id)
);
CREATE TABLE pricing_tiers (
 id VARCHAR(36) PRIMARY KEY, name VARCHAR(255) NOT NULL,
 min_qty INT NOT NULL, max_qty INT NULL,
 margin_pct DECIMAL(8,4) NOT NULL CHECK(margin_pct>=0 AND margin_pct<1),
 is_retail_base BOOLEAN NOT NULL, description TEXT NOT NULL, sort_order INT NOT NULL
);
CREATE TABLE fixed_costs (
 id VARCHAR(36) PRIMARY KEY, name VARCHAR(255) NOT NULL,
 monthly_amount DECIMAL(12,2) NOT NULL CHECK(monthly_amount>=0)
);
CREATE TABLE clients (
 id VARCHAR(36) PRIMARY KEY, name VARCHAR(255) NOT NULL,
 phone_whatsapp VARCHAR(64) NOT NULL, email VARCHAR(255) NOT NULL, notes TEXT NOT NULL
);
CREATE TABLE counters (
 id VARCHAR(36) PRIMARY KEY, year INT NOT NULL, seq INT NOT NULL
);
CREATE TABLE quotes (
 id VARCHAR(36) PRIMARY KEY, folio VARCHAR(64) NOT NULL UNIQUE,
 status ENUM('BORRADOR','ENVIADA','ACEPTADA','CANCELADA') NOT NULL,
 client_id VARCHAR(36) NULL, client_snapshot JSON NULL,
 pricing_tier_name VARCHAR(255) NOT NULL,
 margin_pct DECIMAL(8,4) NOT NULL, iva_pct DECIMAL(8,4) NOT NULL,
 subtotal DECIMAL(12,2) NOT NULL, iva DECIMAL(12,2) NOT NULL,
 total DECIMAL(12,2) NOT NULL, production_cost DECIMAL(12,2) NOT NULL,
 profit DECIMAL(12,2) NOT NULL, business_snapshot JSON NOT NULL,
 notes TEXT NOT NULL, created_at DATETIME(3) NOT NULL,
 updated_at DATETIME(3) NOT NULL, created_by_email VARCHAR(255) NOT NULL,
 FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE SET NULL,
 INDEX quote_page(created_at DESC,id DESC),
 INDEX quote_client(client_id,created_at DESC,id DESC),
 INDEX quote_status(status,created_at DESC,id DESC)
);
CREATE TABLE quote_items (
 id VARCHAR(36) PRIMARY KEY, quote_id VARCHAR(36) NOT NULL,
 model_id VARCHAR(36) NOT NULL, model_name VARCHAR(255) NOT NULL,
 presentation TEXT NOT NULL, image_url TEXT NULL, quantity INT NOT NULL,
 unit_price DECIMAL(12,6) NOT NULL, subtotal DECIMAL(12,2) NOT NULL,
 FOREIGN KEY(quote_id) REFERENCES quotes(id), FOREIGN KEY(model_id) REFERENCES models(id)
);
CREATE TABLE quote_cost_breakdown (
 quote_id VARCHAR(36) NOT NULL, material_id VARCHAR(36) NOT NULL,
 name VARCHAR(255) NOT NULL, category VARCHAR(64) NOT NULL, unit VARCHAR(16) NOT NULL,
 quantity_purchased DECIMAL(12,6) NOT NULL, total_price DECIMAL(12,2) NOT NULL,
 unit_cost DECIMAL(12,6) NOT NULL, quantity_per_candle DECIMAL(12,6) NOT NULL,
 cost DECIMAL(12,6) NOT NULL, profit DECIMAL(12,6) NOT NULL,
 PRIMARY KEY(quote_id,material_id), FOREIGN KEY(quote_id) REFERENCES quotes(id),
 FOREIGN KEY(material_id) REFERENCES materials(id)
);
```

Añade CHECK de no negativos a todos los tiempos y cantidades. El repositorio SQL impide borrar materiales/modelos físicamente; utiliza `is_active=false`. Los snapshots copian nombre, categoría, presentación, imagen, precios y cliente, nunca se reconstruyen con JOIN a los valores actuales del catálogo.

## Transacciones del servidor

- **Crear cotización**: validar Zod + dominio compartido, iniciar transacción, `SELECT ... FOR UPDATE` del contador `quotes`, reiniciar secuencia al cambiar año UTC, incrementar, formar `COT-YYYY-NNNN`, insertar cabecera/ítems/desglose, actualizar contador y COMMIT. Un índice UNIQUE sobre folio aporta una segunda protección. Idempotency por `quote.id`: un reintento devuelve la misma cotización. No confíes en totales del cliente sin verificar el snapshot.
- **Estado**: endpoint PATCH que sólo admite `status`, asigna updatedAt en servidor y rechaza modificaciones de todos los otros campos. Permisos DB/trigger pueden reforzar la inmutabilidad; backups autorizados insertan snapshots faltantes, nunca los alteran.
- **Desactivar insumo**: bloquear fila e inspeccionar receta de modelos activos con cantidad >0; incluir dependencia automática de ENERGY/LABOR. Devuelve nombres exactos de modelos que impiden desactivar. Coordina con guardado de modelos en la misma transacción/locks para evitar carreras.
- **Tarifas + mezcla**: validar todos los escalones y parámetros juntos; guardar en una transacción. Verificar suma mezcla de activos igual a 1 dentro de tolerancia. Los insumos/modelos no tienen límite de cuatro/veinte filas; respeta límites de carga razonables por petición.
- **Paginación**: cursor opaco con `(created_at,id)` y cláusula lexicográfica descendente, LIMIT 25. Aplica filtros exactos de estado/cliente/folio con índices apropiados.
- **Backups**: validador completo y restauración en transacción SQL; conservar contador ≥ mayor secuencia de los snapshots. Evita registrar datos internos en logs públicos.

## Traslado de datos y corte

1. Ejecuta pruebas del dominio sin cambios y conserva el Excel v4 como referencia.
2. Exporta JSON completo desde Firebase. Respalda también las imágenes originales desde Cloudinary y las identidades autorizadas por un canal administrativo.
3. Importa respetando IDs y orden de claves foráneas: settings/materials/models/recipes/tiers/fixed/clients/quotes/items/breakdown/counters. Si un cliente ya fue eliminado, usa client_id NULL y preserva client_snapshot.
4. Migra imágenes al nuevo servidor y mapea URLs, conservando copias de recursos referenciados por snapshots anteriores; no reescribas snapshots sin un proceso explícito de migración auditado.
5. Ejecuta la misma batería de contratos contra ambos adaptadores: 18 insumos, cuatro modelos, tarifas, mezcla, snapshots, paginación, duplicado, restricciones de bajas, backup y dos altas concurrentes con folios distintos.
6. Configura providers HTTP/archivos en una copia de la app y valida Auth, CORS, PDF con foto y navegación móvil/escritorio. Sustituye persistencia offline por IndexedDB/cola propia si se quiere mantener ese extra; los puertos no exponen tipos de Firebase.
7. Congela escrituras de ambas usuarias durante exportación final/importación, compara conteos, sumas y último folio, cambia Hosting/API y abre la operación. Conserva el respaldo y un plan de reversión; nunca dejes dos sistemas emitiendo folios al mismo tiempo.
