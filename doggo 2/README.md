# Dog Go! — proyecto listo para producción

Esta es la versión de tu app conectada a una base de datos real (Supabase),
en vez de guardar todo en el navegador. Los datos ahora se comparten entre
todos los dispositivos y usuarios.

## 1. La base de datos ya está creada

Ya usé tu proyecto de Supabase (`hjtgagaevdkugnwcxncg`) y dejé sus datos
cargados en el archivo `.env` de este proyecto, así que no tenés que tocar
nada ahí para que funcione.

Si en algún momento creás un proyecto de Supabase nuevo, tenés que:
1. Ir a **SQL Editor** en tu dashboard de Supabase.
2. Pegar y ejecutar todo el contenido de `supabase/schema.sql`.
3. Reemplazar los valores de `.env` con la URL y anon key del proyecto nuevo.

## 2. Probarlo en tu computadora (opcional)

Necesitás tener [Node.js](https://nodejs.org) instalado. Después:

```bash
npm install
npm run dev
```

Se abre en `http://localhost:5173`.

## 3. Subirlo a internet gratis (Vercel)

1. Creá una cuenta gratis en [vercel.com](https://vercel.com) (podés entrar con GitHub).
2. Subí esta carpeta a un repositorio de GitHub (o usá "Deploy" arrastrando la carpeta
   directamente en Vercel si no querés usar GitHub).
3. En Vercel, al importar el proyecto, agregá estas dos variables de entorno
   (Settings → Environment Variables), con los mismos valores del archivo `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy. En un par de minutos tenés tu link público.

## Qué cambió respecto a la versión anterior

- **Datos compartidos de verdad**: todo se guarda en Supabase (Postgres), no en
  el navegador. Funciona igual entre celular, compu, cualquier usuario.
- **Diseño**: colores del logo (marrón + amarillo + cream), tipografía Baloo 2
  para títulos.
- **Entrada**: pantalla tipo login/registro para clientes, con accesos aparte
  para paseador y administrador.
- **Paquetes flexibles**: hasta 5 días por semana, no necesariamente seguidos.
  El cliente elige las fechas puntuales en un mini calendario semana por semana.
  Si el paquete es de 2 paseos al día, se piden los dos horarios.
- **Precios en colones (₡)**.
- **Fotos**: la foto de perfil del paseador se puede elegir de la galería.
  Marcar recogida/entrega del perro sigue exigiendo cámara en vivo (para
  que no se pueda "photoshopear" o subir cualquier imagen vieja).
- **Hotel de perros**: ahora también registra fechas de check-in / check-out
  de cada estadía, no solo la info general de cuidados.

## Cómo sigue creciendo esto

Ahora mismo cada "tabla" (clientes, paseadores, paquetes, etc.) se guarda como
una fila de tipo JSON en Supabase — es la forma más simple de pasar de
prototipo a real sin reescribir toda la lógica de datos. El día que quieras
más (por ejemplo login real con contraseña, o permisos distintos por rol),
se puede evolucionar a tablas relacionales de verdad en Supabase sin
perder nada de lo que ya está armado.
