import { useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'pulsechat-state-v1';
const demoUsers = [];

function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function getInitials(name) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
  });
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [chats, setChats] = useState({});
  const [activeContactId, setActiveContactId] = useState(null);
  const [draft, setDraft] = useState('');
  const [messageError, setMessageError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [selectedImage, setSelectedImage] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUsers(parsed.users || []);
        setCurrentUser(parsed.currentUser || null);
        setChats(parsed.chats || {});
        setActiveContactId(parsed.activeContactId || null);
      } catch {
        seedDemoData();
      }
    } else {
      seedDemoData();
    }

    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;

    const payload = {
      users,
      currentUser,
      chats,
      activeContactId,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [ready, users, currentUser, chats, activeContactId]);

  useEffect(() => {
    if (!currentUser || !users.length) return;

    if (!activeContactId) {
      const fallback = users.find((user) => user.id !== currentUser.id);
      if (fallback) {
        setActiveContactId(fallback.id);
      }
    }
  }, [currentUser, users, activeContactId]);

  function seedDemoData() {
    setUsers([]);
    setChats({});
    setCurrentUser(null);
    setActiveContactId(null);
  }

  const contacts = useMemo(() => {
    if (!currentUser) return [];
    return users.filter((user) => user.id !== currentUser.id);
  }, [currentUser, users]);

  const activeContact = useMemo(() => {
    return contacts.find((contact) => contact.id === activeContactId) || contacts[0] || null;
  }, [activeContactId, contacts]);

  const activeMessages = useMemo(() => {
    if (!activeContact || !currentUser) return [];
    const roomKey = [currentUser.id, activeContact.id].sort().join('-');
    return chats[roomKey] || [];
  }, [activeContact, chats, currentUser]);

  function resetForm() {
    setForm({ name: '', username: '', email: '', password: '' });
  }

  function handleAuthSubmit(event) {
    event.preventDefault();
    setMessageError('');
    setFeedback('');

    if (mode === 'signup') {
      if (!form.name || !form.username || !form.email || !form.password) {
        setMessageError('Please fill every field to create your account.');
        return;
      }

      const duplicate = users.find(
        (user) => user.username === form.username || user.email === form.email
      );
      if (duplicate) {
        setMessageError('That username or email is already in use.');
        return;
      }

      const user = {
        id: createId('user'),
        name: form.name,
        username: form.username,
        email: form.email,
        password: form.password,
        role: 'Focused Builder',
        color: ['#7c6cf7', '#24c0cb', '#ff7c5c', '#f1b84b'][users.length % 4],
      };

      setUsers((previous) => [...previous, user]);
      setCurrentUser(user);
      setFeedback('Account created. Welcome to PulseChat.');
      resetForm();
      return;
    }

    const found = users.find(
      (user) =>
        (user.username === form.username || user.email === form.username) &&
        user.password === form.password
    );

    if (!found) {
      setMessageError('We could not find that account. Try signing up first.');
      return;
    }

    setCurrentUser(found);
    setFeedback(`Welcome back, ${found.name.split(' ')[0]}.`);
    resetForm();
  }

  function handleSend(event) {
    event.preventDefault();
    if (!currentUser || !activeContact) return;

    const cleanText = draft.trim();
    if (!cleanText && !selectedImage) {
      setMessageError('Add a note or choose an image before sending.');
      return;
    }

    setMessageError('');
    const roomKey = [currentUser.id, activeContact.id].sort().join('-');
    const outgoingMessage = {
      id: createId('msg'),
      senderId: currentUser.id,
      text: cleanText,
      image: selectedImage || '',
      createdAt: new Date().toISOString(),
    };

    setChats((previous) => ({
      ...previous,
      [roomKey]: [...(previous[roomKey] || []), outgoingMessage],
    }));
    setDraft('');
    setSelectedImage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleImageSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function handleLogout() {
    setCurrentUser(null);
    setActiveContactId(null);
    setFeedback('Signed out.');
  }

  if (!ready) {
    return (
      <div className="app-shell">
        <div className="loading-card">Preparing PulseChat…</div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="app-shell auth-shell">
        <div className="auth-card">
          <div className="brand-block">
            <div className="brand-mark">✦</div>
            <div>
              <p className="eyebrow">Realtime collaboration</p>
              <h1>PulseChat</h1>
            </div>
          </div>

          <div className="toggle-row">
            <button
              className={mode === 'login' ? 'toggle active' : 'toggle'}
              onClick={() => {
                setMode('login');
                setMessageError('');
                setFeedback('');
              }}
            >
              Log in
            </button>
            <button
              className={mode === 'signup' ? 'toggle active' : 'toggle'}
              onClick={() => {
                setMode('signup');
                setMessageError('');
                setFeedback('');
              }}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="auth-form">
            {mode === 'signup' && (
              <label>
                Full name
                <input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="Jordan Rivera"
                />
              </label>
            )}
            <label>
              Username or email
              <input
                value={form.username}
                onChange={(event) => setForm({ ...form, username: event.target.value })}
                placeholder={mode === 'login' ? 'jordan' : 'jordan'}
              />
            </label>
            {mode === 'signup' && (
              <label>
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  placeholder="jordan@example.com"
                />
              </label>
            )}
            <label>
              Password
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                placeholder="••••••••"
              />
            </label>
            <button className="primary-btn" type="submit">
              {mode === 'login' ? 'Enter workspace' : 'Create account'}
            </button>
          </form>

          {messageError && <p className="status error">{messageError}</p>}
          {feedback && <p className="status success">{feedback}</p>}
          <p className="helper-text">
            Demo credentials: username <strong>ava</strong> and password <strong>pass123</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell dashboard-shell">
      <aside className="sidebar">
        <div className="profile-card">
          <div className="avatar" style={{ backgroundColor: currentUser.color }}>
            {getInitials(currentUser.name)}
          </div>
          <div>
            <h2>{currentUser.name}</h2>
            <p>{currentUser.role}</p>
            <span className="online-pill">● Online</span>
          </div>
        </div>

        <div className="section-header">
          <h3>Active rooms</h3>
          <button className="ghost-btn" onClick={handleLogout}>Logout</button>
        </div>

        <div className="contact-list">
          {contacts.map((contact) => {
            const roomKey = [currentUser.id, contact.id].sort().join('-');
            const roomMessages = chats[roomKey] || [];
            const lastMessage = roomMessages[roomMessages.length - 1];
            const isActive = activeContact?.id === contact.id;

            return (
              <button
                key={contact.id}
                className={isActive ? 'contact-card active' : 'contact-card'}
                onClick={() => setActiveContactId(contact.id)}
              >
                <div className="avatar small" style={{ backgroundColor: contact.color }}>
                  {getInitials(contact.name)}
                </div>
                <div className="contact-body">
                  <div className="contact-topline">
                    <strong>{contact.name}</strong>
                    <span>{lastMessage ? formatTime(lastMessage.createdAt) : 'Now'}</span>
                  </div>
                  <p>{lastMessage?.text || 'Start a fresh conversation'}</p>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <main className="chat-panel">
        <header className="chat-header">
          <div>
            <p className="eyebrow">Direct message</p>
            <h2>{activeContact ? activeContact.name : 'Select a room'}</h2>
          </div>
          <div className="header-badge">Live • Responsive</div>
        </header>

        <div className="message-list">
          {activeContact ? (
            activeMessages.map((message) => {
              const isMine = message.senderId === currentUser.id;
              return (
                <div key={message.id} className={isMine ? 'message-row mine' : 'message-row'}>
                  <div className={isMine ? 'bubble mine' : 'bubble'}>
                    {message.text && <p>{message.text}</p>}
                    {message.image && <img src={message.image} alt="Shared content" />}
                    <span>{formatTime(message.createdAt)}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-state">Pick a contact to begin chatting.</div>
          )}

        </div>

        <form className="composer" onSubmit={handleSend}>
          {selectedImage && (
            <div className="preview-card">
              <img src={selectedImage} alt="Preview" />
              <button type="button" className="ghost-btn" onClick={() => setSelectedImage('')}>
                Remove
              </button>
            </div>
          )}

          <div className="input-row">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Write a message…"
            />
            <label className="upload-btn">
              + Image
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} />
            </label>
            <button className="primary-btn" type="submit">Send</button>
          </div>
        </form>
        {messageError && <p className="status error">{messageError}</p>}
      </main>
    </div>
  );
}
