# Venturia — Backend

API del proyecto **Venturia**, una plataforma tipo *kickstarter* que conecta a personas con ideas, desarrolladores y empresas financistas.

- **Creador** (persona natural): publica un proyecto y busca financiamiento.
- **Empresa**: aporta financiamiento; varias empresas pueden co-financiar un proyecto hasta alcanzar la meta.
- **Desarrollador** (persona natural): postula a los roles del proyecto una vez que consigue financiamiento y abre su equipo.

Un índice de afinidad (perfil × proyecto) ordena el feed de proyectos recomendados.

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | NestJS 11 (TypeScript) |
| Base de datos | PostgreSQL 16 + TypeORM 0.3 (migraciones, `synchronize: false`) |
| Cache / colas | Redis 7 + BullMQ (cálculo de afinidad asíncrono) |
| Almacenamiento | MinIO (S3-compatible) para CVs y multimedia |
| Auth | JWT (access + refresh en cookie HttpOnly) + Google OAuth 2.0 |
| Docs | Swagger / OpenAPI |
| Gestor de paquetes | **pnpm** |

## Arquitectura

Módulos por feature en `src/modules/<feature>/` (auth, users, companies, catalogs, projects, funding, applications, affinity, feed, notifications, storage). La infraestructura compartida vive en `src/config`, `src/database` y `src/common`.

- Entidades en `src/modules/<feature>/entities/*.entity.ts`, registradas en `src/database/entities.ts`.
- Migraciones en `src/database/migrations/`, registradas manualmente en `src/database/migrations/index.ts`.
- Configuración validada con Joi (`src/config/validation.schema.ts`).

## Requisitos previos

- Node.js 20+
- pnpm
- Docker + Docker Compose (para Postgres, Redis y MinIO)

## Puesta en marcha local

```bash
# 1. Instalar dependencias
pnpm install

# 2. Crear el archivo .env a partir del ejemplo y completar los valores
cp .env.example .env

# 3. Levantar la infraestructura (Postgres, Redis, MinIO, Adminer)
docker compose up -d postgres redis minio adminer

# 4. Aplicar las migraciones
pnpm run migration:run

# 5. Ejecutar en modo desarrollo (watch)
pnpm run start:dev
```

La API queda en `http://localhost:3000` y la documentación Swagger en `http://localhost:3000/api/docs`.

- Adminer (UI de la BD): `http://localhost:8080`
- Consola de MinIO: `http://localhost:9001`

## Comandos

```bash
pnpm run start:dev        # desarrollo con watch
pnpm run build            # compila a dist/
pnpm run lint             # eslint --fix
pnpm run format           # prettier

pnpm run test             # pruebas unitarias (jest)
pnpm run test:e2e         # pruebas end-to-end
pnpm run test -- --coverage   # cobertura

pnpm run migration:generate src/database/migrations/<Nombre>
pnpm run migration:run
pnpm run migration:revert
```

## Pruebas

Suite unitaria con repositorios y transacciones mockeados (sin BD real), cubriendo la lógica de negocio: afinidad, autorización (guards), financiamiento, postulaciones y proyectos. Ver el reporte de cobertura con `pnpm run test -- --coverage`.

## Despliegue

Despliegue continuo vía GitLab CI (`.gitlab-ci.yml`) sobre dos hosts (EC2 y VPS). Cada host corre la pila completa con `docker-compose.prod.yml` (Postgres, Redis, MinIO, API y nginx como reverse proxy con HTTPS). Las migraciones se ejecutan automáticamente al arrancar el contenedor de la API.

## Variables de entorno

Ver `.env.example`. Las principales: conexión a Postgres, secretos JWT, credenciales de Google OAuth, configuración de MinIO, SMTP para notificaciones y `FRONTEND_URL`.
