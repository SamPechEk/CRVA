# CRVA · Cotizador de velas artesanales

[![Validaciones](https://github.com/SamPechEk/CRVA/actions/workflows/ci.yml/badge.svg)](https://github.com/SamPechEk/CRVA/actions/workflows/ci.yml)

Aplicación en español para calcular costos reales, cotizar por volumen y conservar cotizaciones inmutables. React 18 + TypeScript + Vite, Firebase Spark y Cloudinary Free. El código se encuentra en [`cotizador-velas-app/`](./cotizador-velas-app/).

## Ejecutar localmente

Requiere Node.js 22 y npm. Para los emuladores, también Java 21.

```sh
git clone https://github.com/SamPechEk/CRVA.git
cd CRVA/cotizador-velas-app
npm ci
cp .env.example .env
npm run dev
```

Sin credenciales remotas puedes abrir voluntariamente el modo de prueba local e inicializar los datos reales del Excel v4. Los datos permanecen en ese navegador y los folios llevan el prefijo DEMO.

## Documentación

- [Configuración de Firebase, Cloudinary, emuladores y despliegue](./cotizador-velas-app/README.md)
- [Migración a Express, MySQL y almacenamiento propio](./cotizador-velas-app/MIGRATION_MYSQL.md)
- [Comprobaciones realizadas y límites de verificación](./cotizador-velas-app/VALIDATION.md)
- [Sistema de diseño](./cotizador-velas-app/design-system/cotizador-de-velas/MASTER.md)
- [Excel exportado de ejemplo, con fórmulas vivas](./cotizador-velas-app/examples/cotizador-v4-exportado.xlsx)

## Comprobaciones

Desde `cotizador-velas-app/`:

```sh
npm test
npm run build
npm run test:rules
```

GitHub Actions ejecuta pruebas y compilación, además de una comprobación independiente de las reglas con Firestore Emulator. La compilación se conserva como artefacto para inspección; no se despliega automáticamente.

## Configuración del repositorio

- `main` contiene la versión inicial del proyecto.
- `.github/workflows/ci.yml` valida pushes, pull requests y ejecuciones manuales con permisos de lectura.
- Dependabot revisa semanalmente dependencias npm y GitHub Actions.
- Las plantillas de incidencias y pull requests están en español.
- `.gitignore` excluye credenciales, dependencias, compilaciones y respaldos locales de configuración. Sólo se publica `.env.example`, sin secretos.

El acceso se administra en Firebase mediante `accessUsers/{uid}` con `active: true`. No hay listas de correos ni límites de usuarios compilados en la aplicación. Configura Firebase y Cloudinary siguiendo la guía antes de publicar. El repositorio no contiene credenciales ni un proyecto de producción preconfigurado.
