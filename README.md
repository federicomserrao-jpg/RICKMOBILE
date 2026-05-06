# 🏎️ Colección Ricky - Guía de Setup

## PASO 1: Supabase

1. Entrá a https://supabase.com y creá un proyecto nuevo (ej: "scalextric-ricky")
2. Anotá la **Project URL** y la **anon/public key** (están en Settings > API)
3. En el menú izquierdo andá a **SQL Editor**
4. Pegá TODO el contenido del archivo `SUPABASE_SETUP.sql` y ejecutalo (Run)
5. En el menú izquierdo andá a **Storage** y verificá que se creó el bucket `fotos-autos`

## PASO 2: GitHub

1. Creá un repo nuevo en GitHub (ej: `scalextric-ricky` - puede ser privado)
2. Subí TODOS estos archivos al repo (drag & drop en la interfaz web de GitHub):
   - `index.html`
   - `package.json`
   - `vite.config.js`
   - `.gitignore`
   - `seed.js`
   - `seed_data.json`
   - `src/main.js`
   - `src/style.css`

## PASO 3: Vercel

1. Entrá a https://vercel.com y conectá tu cuenta de GitHub
2. Importá el repo `scalextric-ricky`
3. Antes de deployar, en **Environment Variables** agregá:
   - `VITE_SUPABASE_URL` → tu Project URL de Supabase
   - `VITE_SUPABASE_ANON_KEY` → tu anon key de Supabase
4. Deploy!

## PASO 4: Cargar los 1203 autos (seed)

Una sola vez después del deploy:

1. En tu compu, instalá Node.js si no lo tenés: https://nodejs.org
2. Descargá los archivos del repo a tu compu
3. Creá un archivo `.env` con:
   ```
   VITE_SUPABASE_URL=https://tuproyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...tukey...
   ```
4. Ejecutá:
   ```bash
   npm install
   node --env-file=.env seed.js
   ```
5. Esperá que diga "✅ Seed completado!" - carga los 1203 autos

## ¡Listo! 🎉

Entrá a tu URL de Vercel desde el celu y ya tenés:
- Búsqueda instantánea por marca, modelo, referencia
- Filtros por categoría (F1, GT, LMP, Rally...)
- Ver detalle de cada auto
- Agregar fotos desde el celu (cámara o galería)
- Agregar autos nuevos con el botón "+"
- Editar y eliminar autos

---

## Estructura de la base de datos

Tabla `autos`:
- `id` → número único
- `fabricante` → Scalextric, SCX, Fly, Slot It, etc.
- `referencia` → código del fabricante
- `ed_especial` → si es edición limitada
- `año` → año de la carrera/auto
- `dorsal` → número del auto
- `marca` → Ferrari, Alfa Romeo, etc.
- `modelo` → F40, 8C, etc.
- `version` → descripción completa
- `categoria` → F1, GT, LMP, Rally, Calle, NASCAR, etc.
- `caja` → Si / No / Rocco
- `foto_url` → URL de la foto en Supabase Storage
- `notas` → notas personales
- `tengo` → true (todos los actuales los tenés)
