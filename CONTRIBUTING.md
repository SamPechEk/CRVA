# Colaborar en CRVA

1. Crea una rama desde `main`.
2. Instala con `npm ci` dentro de `cotizador-velas-app/`.
3. Usa el modo local o los emuladores para desarrollo. Nunca uses datos reales de clientes en fixtures, issues o PRs.
4. Mantén las fórmulas monetarias en `src/domain/` con Decimal.js; conserva los valores de regresión de v4.
5. Mantén las importaciones Firebase dentro de `src/adapters/`. Páginas y hooks deben depender de puertos y servicios.
6. Ejecuta `npm test` y `npm run build`. Si cambias reglas, adaptadores o folios, ejecuta también `npm run test:rules` con Java 21.
7. Abre un pull request con el problema concreto, los cambios y la validación. Conserva visibles las limitaciones no verificadas.

No publiques `.env`, contraseñas, service accounts, backups reales ni secretos de Cloudinary. La configuración de referencia es `.env.example`. El despliegue de Firebase es manual y se documenta en la guía de la app.
