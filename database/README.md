# Base de datos - Prode

## Objetivo

Esta carpeta contiene toda la estructura de la base de datos del proyecto.

## Archivos

### schema.sql

Contiene la creación de tablas, relaciones, índices y restricciones.

### seed.sql

Contiene datos iniciales necesarios para comenzar a trabajar.

Ejemplos:

- Grupos de Prode
- Competiciones
- Configuración inicial

## Restaurar la base

1. Crear un proyecto nuevo en Supabase.

2. Ejecutar:

schema.sql

3. Ejecutar:

seed.sql

4. La base queda lista para usar.

## Regla del proyecto

Nunca modificar datos manualmente desde Supabase.

Toda modificación deberá realizarse mediante migraciones SQL o desde la aplicación.