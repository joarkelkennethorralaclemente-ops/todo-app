const API_URL = '/api/tasks';

document.addEventListener('DOMContentLoaded', () => {
  fetchTasks();
  document.getElementById('task-form').addEventListener('submit', addTask);
  document.getElementById('filter-input').addEventListener('input', filterTasks);
});

async function fetchTasks() {
  const res = await fetch(API_URL);
  const tasks = await res.json();
  renderTasks(tasks);
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

  await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });

  input.value = '';
  fetchTasks();
}

async function toggleTask(id, completed) {
  await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed })
  });
  fetchTasks();
}

async function deleteTask(id) {
  await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
  fetchTasks();
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