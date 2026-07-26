const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Conexión a la base de datos de Supabase mediante variable de entorno
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Helmet agrega cabeceras HTTP de seguridad estándar (protección contra
// sniffing de tipo MIME, clickjacking, XSS básico, etc.)
app.use(helmet());

// CORS restringido: solo se permiten peticiones desde los dominios indicados
// en la variable de entorno ALLOWED_ORIGINS (separados por coma). Si no se
// define, se usa la propia URL de Render como valor por defecto.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'https://todo-app-kpng.onrender.com')
  .split(',')
  .map(origin => origin.trim());

app.use(cors({
  origin: function (origin, callback) {
    // Permite peticiones sin "origin" (por ejemplo, llamadas desde Postman o
    // el propio servidor) y las que vienen de un dominio autorizado.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por la política de CORS'));
    }
  }
}));

// Rate limiting: máximo 100 peticiones por IP cada 15 minutos hacia la API,
// para evitar abuso o saturación del servicio.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones, intenta de nuevo más tarde.' }
});
app.use('/api/', apiLimiter);

app.use(express.json());

// Servir los archivos estáticos de la Single Page Application (Frontend)
app.use(express.static(path.join(__dirname, '../frontend')));

// Crea la tabla "tasks" automáticamente si todavía no existe en la base de datos.
// Esta era la causa de los errores 500: el backend intentaba hacer SELECT/INSERT
// sobre una tabla que nunca se había creado en Supabase.
async function ensureSchema() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        completed BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✔ Tabla "tasks" verificada/creada correctamente.');
  } catch (err) {
    console.error('✖ No se pudo verificar/crear la tabla "tasks":', err.message);
  }
}

// Endpoint GET: Obtener todas las tareas
app.get('/api/tasks', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint POST: Crear una tarea nueva
app.post('/api/tasks', async (req, res) => {
  try {
    const { title } = req.body;

    if (typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'El título es obligatorio y debe ser texto.' });
    }
    if (title.length > 200) {
      return res.status(400).json({ error: 'El título no puede superar los 200 caracteres.' });
    }

    const result = await pool.query(
      'INSERT INTO tasks (title) VALUES ($1) RETURNING *',
      [title.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint PUT: Marcar tarea como completada o pendiente
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { completed } = req.body;

    if (!Number.isInteger(Number(id))) {
      return res.status(400).json({ error: 'ID de tarea inválido.' });
    }
    if (typeof completed !== 'boolean') {
      return res.status(400).json({ error: 'El campo "completed" debe ser true o false.' });
    }

    const result = await pool.query(
      'UPDATE tasks SET completed = $1 WHERE id = $2 RETURNING *',
      [completed, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint DELETE: Eliminar una tarea
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.json({ message: 'Tarea eliminada exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

ensureSchema().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor activo corriendo en el puerto ${PORT}`);
  });
});
