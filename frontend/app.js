const API_URL = '/api/tasks';

document.addEventListener('DOMContentLoaded', () => {
  fetchTasks();
  document.getElementById('task-form').addEventListener('submit', addTask);
  document.getElementById('filter-input').addEventListener('input', filterTasks);
});

async function fetchTasks() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Error al obtener las tareas');
    }
    if (!Array.isArray(data)) {
      throw new Error('Respuesta inesperada del servidor');
    }

    hideError();
    renderTasks(data);
  } catch (err) {
    console.error('Error en fetchTasks:', err);
    showError('No se pudieron cargar las tareas. Intenta de nuevo en unos segundos.');
  }
}

function showError(message) {
  let banner = document.getElementById('error-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'error-banner';
    banner.className = 'error-banner';
    document.querySelector('.container').insertBefore(banner, document.getElementById('task-list'));
  }
  banner.textContent = message;
  banner.style.display = 'block';
}

function hideError() {
  const banner = document.getElementById('error-banner');
  if (banner) banner.style.display = 'none';
}

function renderTasks(tasks) {
  const list = document.getElementById('task-list');
  list.innerHTML = '';
  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = task.completed ? 'completed' : '';
    li.dataset.title = task.title.toLowerCase();
    
    li.innerHTML = `
      <span>
        <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${task.id}, ${!task.completed})">
        ${escapeHtml(task.title)}
      </span>
      <button class="delete-btn" onclick="deleteTask(${task.id})">Eliminar</button>
    `;
    list.appendChild(li);
  });
}

async function addTask(e) {
  e.preventDefault();
  const input = document.getElementById('task-input');
  const title = input.value.trim();
  if (!title) return;

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Error al agregar la tarea');
    }
    input.value = '';
    fetchTasks();
  } catch (err) {
    console.error('Error en addTask:', err);
    showError('No se pudo agregar la tarea. Intenta de nuevo.');
  }
}

async function toggleTask(id, completed) {
  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed })
    });
    if (!res.ok) throw new Error('Error al actualizar la tarea');
    fetchTasks();
  } catch (err) {
    console.error('Error en toggleTask:', err);
    showError('No se pudo actualizar la tarea. Intenta de nuevo.');
  }
}

async function deleteTask(id) {
  try {
    const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al eliminar la tarea');
    fetchTasks();
  } catch (err) {
    console.error('Error en deleteTask:', err);
    showError('No se pudo eliminar la tarea. Intenta de nuevo.');
  }
}

// Filtro en tiempo real
function filterTasks(e) {
  const text = e.target.value.toLowerCase();
  document.querySelectorAll('#task-list li').forEach(item => {
    const title = item.dataset.title;
    item.style.display = title.includes(text) ? 'flex' : 'none';
  });
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}
