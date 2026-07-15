import { useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'pulsechat-state-v1';

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

function buildRoomKey(memberIds) {
  return [...memberIds].sort().join('-');
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
  const [roomMeta, setRoomMeta] = useState({});
  const [activeRoomKey, setActiveRoomKey] = useState(null);
  const [draft, setDraft] = useState('');
  const [messageError, setMessageError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [selectedImage, setSelectedImage] = useState('');
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  const [renameTargetRoomKey, setRenameTargetRoomKey] = useState(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [selectedProfileUserId, setSelectedProfileUserId] = useState(null);
  const [detectiveMode, setDetectiveMode] = useState(false);
  const [impersonatedUserId, setImpersonatedUserId] = useState(null);
  const [friendFeedback, setFriendFeedback] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUsers(parsed.users || []);
        setCurrentUser(parsed.currentUser || null);
        setChats(parsed.chats || {});
        setRoomMeta(parsed.roomMeta || {});
        setActiveRoomKey(parsed.activeRoomKey || null);
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
      roomMeta,
      activeRoomKey,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [ready, users, currentUser, chats, roomMeta, activeRoomKey]);

  useEffect(() => {
    if (!currentUser || !users.length) return;

    if (!activeRoomKey || !roomList.some((room) => room.roomKey === activeRoomKey)) {
      const fallback = roomList[0];
      if (fallback) {
        setActiveRoomKey(fallback.roomKey);
      }
    }
  }, [currentUser, users, roomList, activeRoomKey]);

  function seedDemoData() {
    const userAva = {
      id: 'user-ava',
      name: 'Ava Carter',
      username: 'ava',
      email: 'ava@example.com',
      password: 'pass123',
      role: 'Focused Builder',
      color: '#7c6cf7',
      rooms: ['user-ava-user-lee', 'user-ava-user-zara'],
      createdAt: new Date('2026-01-12').toISOString(),
    };

    const userLee = {
      id: 'user-lee',
      name: 'Lee Santos',
      username: 'lee',
      email: 'lee@example.com',
      password: 'pass123',
      role: 'Product Designer',
      color: '#24c0cb',
      rooms: ['user-ava-user-lee'],
      createdAt: new Date('2026-02-03').toISOString(),
    };

    const userZara = {
      id: 'user-zara',
      name: 'Zara Kim',
      username: 'zara',
      email: 'zara@example.com',
      password: 'pass123',
      role: 'Community Lead',
      color: '#ff7c5c',
      rooms: ['user-ava-user-zara'],
      createdAt: new Date('2026-03-08').toISOString(),
    };

    setUsers([userAva, userLee, userZara]);
    setChats({
      'user-ava-user-lee': [
        {
          id: createId('msg'),
          senderId: 'user-lee',
          text: 'Hey Ava, are you free for a quick sync?',
          image: '',
          createdAt: new Date('2026-07-01T09:30:00').toISOString(),
        },
        {
          id: createId('msg'),
          senderId: 'user-ava',
          text: 'Sure! Let’s chat in 10 minutes.',
          image: '',
          createdAt: new Date('2026-07-01T09:35:00').toISOString(),
        },
      ],
      'user-ava-user-zara': [
        {
          id: createId('msg'),
          senderId: 'user-zara',
          text: 'I updated the event agenda draft.',
          image: '',
          createdAt: new Date('2026-07-02T14:20:00').toISOString(),
        },
      ],
    });
    setRoomMeta({});
    setCurrentUser(userAva);
    setActiveRoomKey('user-ava-user-lee');
  }

  const contacts = useMemo(() => {
    if (!currentUser) return [];
    return users.filter((user) => user.id !== currentUser.id);
  }, [currentUser, users]);

  const roomList = useMemo(() => {
    if (!currentUser) return [];

    const joinedRoomKeys = new Set(currentUser.rooms || []);

    const directRooms = contacts.map((contact) => {
      const roomKey = buildRoomKey([currentUser.id, contact.id]);
      const meta = roomMeta[roomKey] || {
        type: 'direct',
        name: contact.name,
        memberIds: [currentUser.id, contact.id],
      };

      return {
        roomKey,
        type: meta.type || 'direct',
        name: meta.name || contact.name,
        memberIds: meta.memberIds || [currentUser.id, contact.id],
        contactId: contact.id,
      };
    });

    const groupRooms = Object.entries(roomMeta)
      .filter(([, meta]) => meta.type === 'group')
      .filter(([roomKey, meta]) => meta.memberIds?.includes(currentUser.id) || joinedRoomKeys.has(roomKey))
      .map(([roomKey, meta]) => ({
        roomKey,
        type: 'group',
        name: meta.name || 'Group chat',
        memberIds: meta.memberIds || [],
        contactId: null,
      }));

    return [...directRooms, ...groupRooms];
  }, [contacts, currentUser, roomMeta]);

  const activeRoom = useMemo(() => {
    return roomList.find((room) => room.roomKey === activeRoomKey) || roomList[0] || null;
  }, [activeRoomKey, roomList]);

  const activeMessages = useMemo(() => {
    if (!activeRoom || !currentUser) return [];
    return chats[activeRoom.roomKey] || [];
  }, [activeRoom, chats, currentUser]);

  const availableUsers = useMemo(() => {
    if (!currentUser) return [];
    return [currentUser, ...contacts];
  }, [contacts, currentUser]);

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
        rooms: [],
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
    if (!currentUser || !activeRoom) return;

    const cleanText = draft.trim();
    if (!cleanText && !selectedImage) {
      setMessageError('Add a note or choose an image before sending.');
      return;
    }

    setMessageError('');
    const roomKey = activeRoom.roomKey;
    const senderId = detectiveMode ? impersonatedUserId || currentUser.id : currentUser.id;
    const outgoingMessage = {
      id: createId('msg'),
      senderId,
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
    setActiveRoomKey(null);
    setFeedback('Signed out.');
  }

  function toggleGroupMember(contactId) {
    setSelectedGroupMembers((previous) => {
      if (previous.includes(contactId)) {
        return previous.filter((memberId) => memberId !== contactId);
      }
      return [...previous, contactId];
    });
  }

  function handleCreateGroup() {
    if (!currentUser) return;

    if (selectedGroupMembers.length < 2) {
      setMessageError('Choose at least 2 people to start a group chat.');
      return;
    }

    const roomKey = buildRoomKey([currentUser.id, ...selectedGroupMembers]);
    const cleanedName = groupName.trim() || 'New group';

    const memberIds = [currentUser.id, ...selectedGroupMembers];

    setRoomMeta((previous) => ({
      ...previous,
      [roomKey]: {
        type: 'group',
        name: cleanedName,
        memberIds,
      },
    }));
    setChats((previous) => ({
      ...previous,
      [roomKey]: previous[roomKey] || [],
    }));
    memberIds.forEach((memberId) => addRoomToUser(memberId, roomKey));
    setActiveRoomKey(roomKey);
    setGroupModalOpen(false);
    setGroupName('');
    setSelectedGroupMembers([]);
    setFeedback(`${cleanedName} is ready.`);
    setMessageError('');
  }

  function handleAddFriend() {
    setFriendFeedback('Friend management is coming soon.');
  }

  function handleDetectiveAccess() {
    if (detectiveMode) {
      setDetectiveMode(false);
      setImpersonatedUserId(null);
      setFeedback('Detective mode disabled.');
      return;
    }

    const password = window.prompt('Enter detective password');
    if (password === 'snake') {
      setDetectiveMode(true);
      setImpersonatedUserId(currentUser.id);
      setFeedback('Detective mode enabled.');
    } else {
      setFeedback('Incorrect password.');
    }
  }

  function handleDeleteMessage(messageId) {
    if (!activeRoom) return;

    setChats((previous) => ({
      ...previous,
      [activeRoom.roomKey]: (previous[activeRoom.roomKey] || []).filter((message) => message.id !== messageId),
    }));
    setFeedback('Message deleted.');
  }

  function addRoomToUser(userId, roomKey) {
    setUsers((previous) =>
      previous.map((user) => {
        if (user.id !== userId) return user;
        const existingRooms = user.rooms || [];
        return {
          ...user,
          rooms: existingRooms.includes(roomKey) ? existingRooms : [...existingRooms, roomKey],
        };
      })
    );

    setCurrentUser((previous) => {
      if (!previous || previous.id !== userId) return previous;
      const existingRooms = previous.rooms || [];
      return {
        ...previous,
        rooms: existingRooms.includes(roomKey) ? existingRooms : [...existingRooms, roomKey],
      };
    });
  }

  function openRenameMenu(roomKey, currentName) {
    setRenameTargetRoomKey(roomKey);
    setRenameDraft(currentName);
  }

  function saveRoomRename() {
    if (!renameTargetRoomKey || !renameDraft.trim()) return;

    setRoomMeta((previous) => ({
      ...previous,
      [renameTargetRoomKey]: {
        ...(previous[renameTargetRoomKey] || {}),
        name: renameDraft.trim(),
      },
    }));
    setRenameTargetRoomKey(null);
    setRenameDraft('');
  }

  function cancelRoomRename() {
    setRenameTargetRoomKey(null);
    setRenameDraft('');
  }

  function closeProfileModal() {
    setSelectedProfileUserId(null);
  }

  const selectedProfileUser = selectedProfileUserId
    ? users.find((user) => user.id === selectedProfileUserId)
    : null;

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
          <div className="toolbar-buttons">
            <button className="ghost-btn" onClick={handleAddFriend}>Add Friend</button>
            <button className="ghost-btn" onClick={handleLogout}>Logout</button>
          </div>
        </div>

        {friendFeedback && <p className="status success small">{friendFeedback}</p>}

        <div className="contact-list">
          {roomList.map((room) => {
            const roomMessages = chats[room.roomKey] || [];
            const lastMessage = roomMessages[roomMessages.length - 1];
            const isActive = activeRoom?.roomKey === room.roomKey;
            const roomColor = room.type === 'group' ? '#24c0cb' : '#7c6cf7';

            return (
              <div key={room.roomKey} className={isActive ? 'contact-card active' : 'contact-card'}>
                <button
                  className="room-select-btn"
                  onClick={() => setActiveRoomKey(room.roomKey)}
                >
                  <div className="avatar small" style={{ backgroundColor: roomColor }}>
                    {getInitials(room.name)}
                  </div>
                  <div className="contact-body">
                    <div className="contact-topline">
                      <strong>{room.name}</strong>
                      <span>{lastMessage ? formatTime(lastMessage.createdAt) : 'Now'}</span>
                    </div>
                    <p>
                      {room.type === 'group'
                        ? `${room.memberIds.length} members`
                        : lastMessage?.text || 'Start a fresh conversation'}
                    </p>
                  </div>
                </button>
                {room.type === 'direct' && (
                  <button
                    type="button"
                    className="room-menu-btn profile-action-btn"
                    aria-label={`View ${room.name} profile`}
                    title={`View ${room.name} profile`}
                    onClick={() => setSelectedProfileUserId(room.contactId)}
                  >
                    View profile
                  </button>
                )}
                {room.type === 'group' && (
                  <button
                    type="button"
                    className="room-menu-btn"
                    aria-label={`Rename ${room.name}`}
                    onClick={() => openRenameMenu(room.roomKey, room.name)}
                  >
                    ⋯
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      <main className="chat-panel">
        <header className="chat-header">
          <div>
            <p className="eyebrow">{activeRoom?.type === 'group' ? 'Group chat' : 'Direct message'}</p>
            <h2>{activeRoom ? activeRoom.name : 'Select a room'}</h2>
            {activeRoom?.type === 'group' && (
              <p className="room-subtitle">
                {activeRoom.memberIds
                  .map((memberId) => users.find((user) => user.id === memberId)?.name)
                  .filter(Boolean)
                  .join(', ')}
              </p>
            )}
          </div>
          <div className="header-actions">
            <button className="ghost-btn" onClick={() => setGroupModalOpen(true)}>
              Select Accounts
            </button>
            {detectiveMode && (
              <label className="detective-controls">
                <span>Send as</span>
                <select
                  value={impersonatedUserId || currentUser.id}
                  onChange={(event) => setImpersonatedUserId(event.target.value)}
                >
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button className={detectiveMode ? 'ghost-btn detective-active' : 'ghost-btn'} onClick={handleDetectiveAccess}>
              {detectiveMode ? 'Detective On' : 'Detective'}
            </button>
            <div className="header-badge">Live • Responsive</div>
          </div>
        </header>

        <div className="message-list">
          {activeRoom ? (
            activeMessages.map((message) => {
              const isMine = message.senderId === currentUser.id;
              return (
                <div key={message.id} className={isMine ? 'message-row mine' : 'message-row'}>
                  <div className={isMine ? 'bubble mine' : 'bubble'}>
                    {message.text && <p>{message.text}</p>}
                    {message.image && <img src={message.image} alt="Shared content" />}
                    <div className="bubble-footer">
                      <span>{formatTime(message.createdAt)}</span>
                      {detectiveMode && (
                        <button type="button" className="delete-btn" onClick={() => handleDeleteMessage(message.id)}>
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-state">Pick a room to begin chatting.</div>
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

      {renameTargetRoomKey && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Rename group</h3>
              <button type="button" className="ghost-btn" onClick={cancelRoomRename}>
                Close
              </button>
            </div>
            <label className="modal-label">
              Group name
              <input
                value={renameDraft}
                onChange={(event) => setRenameDraft(event.target.value)}
                placeholder="Enter a new name"
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="ghost-btn" onClick={cancelRoomRename}>
                Cancel
              </button>
              <button type="button" className="primary-btn" onClick={saveRoomRename}>
                Save name
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedProfileUser && (
        <div className="modal-backdrop" onClick={closeProfileModal}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedProfileUser.name}</h3>
              <button type="button" className="ghost-btn" onClick={closeProfileModal}>
                Close
              </button>
            </div>
            <div className="profile-detail-card">
              <div className="profile-detail-row">
                <span className="profile-detail-label">Role</span>
                <strong>{selectedProfileUser.role || 'Focused Builder'}</strong>
              </div>
              <div className="profile-detail-row">
                <span className="profile-detail-label">Username</span>
                <strong>{selectedProfileUser.username}</strong>
              </div>
              <div className="profile-detail-row">
                <span className="profile-detail-label">Email</span>
                <strong>{selectedProfileUser.email}</strong>
              </div>
              <div className="profile-detail-row">
                <span className="profile-detail-label">Member since</span>
                <strong>{selectedProfileUser.createdAt ? new Date(selectedProfileUser.createdAt).toLocaleDateString() : 'Unknown'}</strong>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="primary-btn" onClick={closeProfileModal}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {groupModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Select accounts</h3>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  setGroupModalOpen(false);
                  setGroupName('');
                  setSelectedGroupMembers([]);
                }}
              >
                Close
              </button>
            </div>

            <label className="modal-label">
              Group name
              <input
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="Team ideas"
              />
            </label>

            <p className="modal-help">Choose at least 2 accounts to add to the group chat.</p>

            <div className="member-picker">
              {contacts.map((contact) => {
                const checked = selectedGroupMembers.includes(contact.id);
                return (
                  <label key={contact.id} className={checked ? 'member-option selected' : 'member-option'}>
                    <input type="checkbox" checked={checked} onChange={() => toggleGroupMember(contact.id)} />
                    <span>{contact.name}</span>
                  </label>
                );
              })}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  setGroupModalOpen(false);
                  setGroupName('');
                  setSelectedGroupMembers([]);
                }}
              >
                Cancel
              </button>
              <button type="button" className="primary-btn" onClick={handleCreateGroup}>
                Create group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
