let currentUser = null;
let currentToken = localStorage.getItem('token') || null;
let socket = null;
let activeRoom = 'general';

const API_BASE = '/api';

// Toast Notification Helper
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast toast-${type}`;
  setTimeout(() => {
    toast.className = 'toast hidden';
  }, 4000);
}

// Quick Fill Login Helper
function quickFill(email, password) {
  document.getElementById('login-email').value = email;
  document.getElementById('login-password').value = password;
}

// Initial Boot
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  if (currentToken) {
    verifySession();
  }
});

function setupEventListeners() {
  // Auth Form Handlers
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('signup-form').addEventListener('submit', handleSignup);
  document.getElementById('logout-btn').addEventListener('click', handleLogout);

  // Tabs
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Notes
  document.getElementById('create-note-form').addEventListener('submit', handleCreateNote);
  document.getElementById('refresh-notes-btn').addEventListener('click', loadNotes);

  // Chat
  document.getElementById('switch-room-btn').addEventListener('click', () => {
    const selected = document.getElementById('chat-room-select').value;
    joinChatRoom(selected);
  });
  document.getElementById('chat-form').addEventListener('submit', handleSendMessage);
}

async function verifySession() {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${currentToken}` },
    });
    const data = await res.json();
    if (res.ok && data.success) {
      currentUser = data.data.user;
      renderAuthenticatedState();
    } else {
      handleLogout();
    }
  } catch (err) {
    handleLogout();
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      currentToken = data.data.token;
      currentUser = data.data.user;
      localStorage.setItem('token', currentToken);
      showToast('Logged in successfully!');
      renderAuthenticatedState();
    } else {
      showToast(data.message || 'Login failed', 'error');
    }
  } catch (err) {
    showToast('Failed to connect to server', 'error');
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;

  try {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      showToast('Account created successfully! You can now log in.');
      document.getElementById('signup-form').reset();
      quickFill(email, password);
    } else {
      showToast(data.message || 'Signup failed', 'error');
    }
  } catch (err) {
    showToast('Failed to connect to server', 'error');
  }
}

function handleLogout() {
  currentToken = null;
  currentUser = null;
  localStorage.removeItem('token');
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  document.getElementById('auth-section').classList.remove('hidden');
  document.getElementById('dashboard-section').classList.add('hidden');
  document.getElementById('user-badge').classList.add('hidden');
  showToast('Logged out');
}

function renderAuthenticatedState() {
  document.getElementById('auth-section').classList.add('hidden');
  document.getElementById('dashboard-section').classList.remove('hidden');

  // Header Badge
  const userBadge = document.getElementById('user-badge');
  userBadge.classList.remove('hidden');
  document.getElementById('badge-name').textContent = currentUser.name;
  const rolePill = document.getElementById('badge-role');
  rolePill.textContent = currentUser.role;
  rolePill.className = `role-pill ${currentUser.role}`;

  // Admin Tab visibility
  const adminTabBtn = document.getElementById('admin-tab-btn');
  if (currentUser.role === 'admin') {
    adminTabBtn.style.display = 'block';
  } else {
    adminTabBtn.style.display = 'none';
  }

  // Load Initial Data
  loadNotes();
  initSocketConnection();
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-pane').forEach((pane) => {
    pane.classList.toggle('active', pane.id === tabId);
  });

  if (tabId === 'admin-tab' && currentUser?.role === 'admin') {
    loadAdminData();
  }
}

// ==========================================
// NOTES MODULE (CRUD)
// ==========================================
async function loadNotes() {
  const container = document.getElementById('notes-list');
  container.innerHTML = '<p class="empty-state">Loading notes...</p>';

  try {
    const res = await fetch(`${API_BASE}/notes`, {
      headers: { Authorization: `Bearer ${currentToken}` },
    });
    const data = await res.json();

    if (res.ok && data.success) {
      const notes = data.data.notes || [];
      if (notes.length === 0) {
        container.innerHTML = '<p class="empty-state">No notes found. Create your first note above!</p>';
        return;
      }

      container.innerHTML = notes
        .map(
          (note) => `
        <div class="note-item" id="note-${note.id || note._id}">
          <div class="note-header">
            <h4 class="note-title">${escapeHtml(note.title)}</h4>
            <button class="btn btn-sm btn-outline" onclick="deleteNote('${note.id || note._id}')">🗑️ Delete</button>
          </div>
          <p class="note-content">${escapeHtml(note.content)}</p>
          <span class="note-date">Updated: ${new Date(note.updatedAt || note.createdAt).toLocaleString()}</span>
        </div>
      `
        )
        .join('');
    } else {
      container.innerHTML = `<p class="empty-state">${data.message || 'Error loading notes'}</p>`;
    }
  } catch (err) {
    container.innerHTML = '<p class="empty-state">Error loading notes</p>';
  }
}

async function handleCreateNote(e) {
  e.preventDefault();
  const title = document.getElementById('note-title').value;
  const content = document.getElementById('note-content').value;

  try {
    const res = await fetch(`${API_BASE}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentToken}`,
      },
      body: JSON.stringify({ title, content }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      showToast('Note created successfully!');
      document.getElementById('create-note-form').reset();
      loadNotes();
    } else {
      showToast(data.message || 'Failed to create note', 'error');
    }
  } catch (err) {
    showToast('Failed to connect to server', 'error');
  }
}

async function deleteNote(noteId) {
  if (!confirm('Are you sure you want to delete this note?')) return;

  try {
    const res = await fetch(`${API_BASE}/notes/${noteId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${currentToken}` },
    });

    const data = await res.json();
    if (res.ok && data.success) {
      showToast('Note deleted successfully');
      loadNotes();
    } else {
      showToast(data.message || 'Failed to delete note', 'error');
    }
  } catch (err) {
    showToast('Failed to connect to server', 'error');
  }
}

// ==========================================
// SOCKET.IO REAL-TIME CHAT
// ==========================================
function initSocketConnection() {
  if (socket) {
    socket.disconnect();
  }

  socket = io({
    auth: { token: currentToken },
  });

  socket.on('connect', () => {
    appendSystemMessage(`Connected to live chat server as ${currentUser.name}`);
    joinChatRoom(activeRoom);
  });

  socket.on('connect_error', (err) => {
    appendSystemMessage(`Socket connection error: ${err.message}`);
  });

  socket.on('receive_message', (msg) => {
    appendChatMessage(msg);
  });

  socket.on('user_joined', (data) => {
    appendSystemMessage(`🔔 ${data.userName} joined the room`);
  });

  socket.on('user_left', (data) => {
    appendSystemMessage(`🚪 ${data.userName} left the room`);
  });

  socket.on('message_error', (err) => {
    showToast(err.message || 'Chat error', 'error');
  });
}

function joinChatRoom(room) {
  if (!socket || !socket.connected) return;

  if (activeRoom) {
    socket.emit('leave_room', { roomId: activeRoom });
  }

  activeRoom = room;
  document.getElementById('chat-room-select').value = room;
  socket.emit('join_room', { roomId: activeRoom });

  // Clear messages container and fetch history
  const chatMessages = document.getElementById('chat-messages');
  chatMessages.innerHTML = '';
  appendSystemMessage(`Joined room #${activeRoom}`);
  loadRoomMessages(room);
}

async function loadRoomMessages(roomId) {
  try {
    const res = await fetch(`${API_BASE}/chat/rooms/${roomId}/messages`, {
      headers: { Authorization: `Bearer ${currentToken}` },
    });
    const data = await res.json();
    if (res.ok && data.success) {
      data.data.messages.forEach((msg) => appendChatMessage(msg));
    }
  } catch (err) {
    console.error('Failed to load message history', err);
  }
}

function handleSendMessage(e) {
  e.preventDefault();
  const input = document.getElementById('chat-input');
  const content = input.value.trim();
  if (!content || !socket || !socket.connected) return;

  socket.emit('send_message', {
    roomId: activeRoom,
    content,
  });

  input.value = '';
}

function appendChatMessage(msg) {
  const container = document.getElementById('chat-messages');
  const isMine = msg.senderId === (currentUser.id || currentUser._id);

  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${isMine ? 'mine' : 'theirs'}`;

  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  bubble.innerHTML = `
    ${!isMine ? `<div class="msg-sender">${escapeHtml(msg.senderName)}</div>` : ''}
    <div class="msg-text">${escapeHtml(msg.content)}</div>
    <span class="msg-time">${time}</span>
  `;

  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

function appendSystemMessage(text) {
  const container = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'system-message';
  div.textContent = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// ==========================================
// ADMIN DASHBOARD (RBAC)
// ==========================================
async function loadAdminData() {
  if (currentUser?.role !== 'admin') return;

  try {
    // 1. Fetch Stats
    const resStats = await fetch(`${API_BASE}/admin/stats`, {
      headers: { Authorization: `Bearer ${currentToken}` },
    });
    const dataStats = await resStats.json();
    if (resStats.ok && dataStats.success) {
      document.getElementById('stat-users').textContent = dataStats.data.users;
      document.getElementById('stat-notes').textContent = dataStats.data.notes;
      document.getElementById('stat-messages').textContent = dataStats.data.messages;
    }

    // 2. Fetch Users
    const resUsers = await fetch(`${API_BASE}/admin/users`, {
      headers: { Authorization: `Bearer ${currentToken}` },
    });
    const dataUsers = await resUsers.json();
    if (resUsers.ok && dataUsers.success) {
      const tbody = document.getElementById('admin-users-table');
      tbody.innerHTML = dataUsers.data.users
        .map(
          (u) => `
        <tr>
          <td><code>${(u.id || u._id).substring(0, 8)}...</code></td>
          <td>${escapeHtml(u.name)}</td>
          <td>${escapeHtml(u.email)}</td>
          <td><span class="role-pill ${u.role}">${u.role}</span></td>
          <td>${new Date(u.createdAt).toLocaleDateString()}</td>
        </tr>
      `
        )
        .join('');
    }

    // 3. Fetch Audit Logs (EventEmitter)
    const resLogs = await fetch(`${API_BASE}/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${currentToken}` },
    });
    const dataLogs = await resLogs.json();
    if (resLogs.ok && dataLogs.success) {
      const viewer = document.getElementById('admin-audit-logs');
      const logs = dataLogs.data.logs || [];
      if (logs.length === 0) {
        viewer.textContent = 'No event logs registered yet.';
      } else {
        viewer.innerHTML = logs
          .slice()
          .reverse()
          .map((l) => `[${l.timestamp}] [${l.event}] ${JSON.stringify(l.payload)}`)
          .join('\n');
      }
    }
  } catch (err) {
    console.error('Failed to load admin data', err);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
