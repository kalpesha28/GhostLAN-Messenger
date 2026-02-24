const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// --- 1. SETUP UPLOADS ---
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
app.use('/uploads', express.static(UPLOAD_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- 2. SQLITE DATABASE SETUP ---
const DB_PATH = path.join(__dirname, 'ghostlan.db');
const db = new sqlite3.Database(DB_PATH);

// Helper to run queries as Promises (cleaner code)
const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) {
    if (err) reject(err);
    else resolve(this);
  });
});

const get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) reject(err);
    else resolve(row);
  });
});

const all = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});

// INITIALIZE TABLES
db.serialize(async () => {
  await run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    role TEXT,
    department TEXT,
    password TEXT
  )`);

  await run(`CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    name TEXT,
    type TEXT,
    participants TEXT, -- JSON Array
    hiddenBy TEXT      -- JSON Array
  )`);

  await run(`CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    chatId TEXT,
    senderId TEXT,
    content TEXT,
    type TEXT,
    timestamp TEXT,
    isSecret INTEGER, -- 0 or 1
    replyTo TEXT,     -- JSON Object
    reactions TEXT,   -- JSON Object
    readBy TEXT,      -- JSON Array
    status TEXT
  )`);

  console.log("✅ Database Tables Ready");
  checkAndSeedData();
});

// --- 3. HEAVY USER DATA SEEDER (500 Users, 200 Messages) ---
async function checkAndSeedData() {
  const userCount = await get("SELECT count(*) as count FROM users");
  
  if (userCount.count === 0) {
    console.log("⚠️ Database Empty! Seeding 500+ Users for Enterprise Demo...");
    
    // 1. Create Real Key Users (The bosses)
    const realUsers = [
      ['11-001', 'Vikram Malhotra', 'head', 'IT', 'pass123'],
      ['90001', 'Rajesh Verma', 'officer', 'HR', 'pass123'],
      ['90002', 'Suresh Nair', 'head', 'Finance', 'pass123'],
      ['10001', 'Arjun Mehta', 'worker', 'Manufacturing', 'pass123'],
      ['10002', 'Priya Singh', 'worker', 'Legal', 'pass123']
    ];
    
    for (const u of realUsers) {
      await run("INSERT INTO users VALUES (?, ?, ?, ?, ?)", u);
    }

    // 2. Create 500 Dummy Users with Random Departments
    const departments = ['IT', 'HR', 'Sales', 'Legal', 'Operations', 'Finance', 'R&D', 'Logistics'];
    
    console.log("... Generating 500 Employee Profiles ...");
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        const stmt = db.prepare("INSERT INTO users VALUES (?, ?, ?, ?, ?)");
        
        for (let i = 1; i <= 500; i++) {
          const dept = departments[Math.floor(Math.random() * departments.length)];
          const role = i % 10 === 0 ? 'manager' : 'worker'; // Every 10th user is a manager
          
          stmt.run(
            `EMP-${i.toString().padStart(4, '0')}`, // IDs like EMP-0001
            `Employee ${i}`, 
            role, 
            dept, 
            'pass123'
          );
        }
        stmt.finalize();
        db.run("COMMIT");
    });

    // 3. Create General Broadcast
    await run("INSERT INTO chats VALUES (?, ?, ?, ?, ?)", 
      ['broadcast-1', 'General Announcements', 'broadcast', '[]', '[]']
    );

    // 4. Create IT Group
    const itParticipants = JSON.stringify(['11-001', '90001', 'EMP-0001', 'EMP-0002']);
    await run("INSERT INTO chats VALUES (?, ?, ?, ?, ?)", 
      ['group-it', 'IT Department', 'group', itParticipants, '[]']
    );

    // 5. INJECT 200 DUMMY MESSAGES (Just enough to show history)
    console.log("... Injecting 200 Sample Messages ...");
    
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");
      const stmt = db.prepare("INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
      
      for (let i = 0; i < 200; i++) {
        const isBroadcast = i % 5 === 0; 
        const chatId = isBroadcast ? 'broadcast-1' : 'group-it';
        const senderId = isBroadcast ? '11-001' : (i % 2 === 0 ? '90001' : 'EMP-0001');
        
        stmt.run(
          `msg-${i}`,
          chatId,
          senderId,
          `Enterprise system test message #${i}. System status: OK.`,
          'text',
          new Date(Date.now() - (200 - i) * 600000).toISOString(), // Spread over hours
          0, // Not secret
          null, // No reply
          '{}', // No reactions
          '[]', // Not read
          'sent'
        );
      }
      stmt.finalize();
      db.run("COMMIT");
    });
    
    console.log("✅ ENTERPRISE SEEDING COMPLETE: 505 Users & 200 Messages Ready!");
  }
}

// --- 4. DATA HELPERS ---
async function getUsers() {
  return await all("SELECT id, name, role, department FROM users");
}

async function getFullChatHistory() {
  const chats = await all("SELECT * FROM chats");
  const messages = await all("SELECT * FROM messages");

  // Transform SQL rows back into the JSON structure React expects
  return chats.map(chat => {
    const chatMsgs = messages.filter(m => m.chatId === chat.id).map(parseMessage);
    return {
      ...chat,
      participants: JSON.parse(chat.participants || '[]'),
      hiddenBy: JSON.parse(chat.hiddenBy || '[]'),
      messages: chatMsgs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    };
  });
}

function parseMessage(msg) {
  return {
    ...msg,
    isSecret: msg.isSecret === 1,
    replyTo: msg.replyTo ? JSON.parse(msg.replyTo) : null,
    reactions: JSON.parse(msg.reactions || '{}'),
    readBy: JSON.parse(msg.readBy || '[]')
  };
}

// --- 5. API ROUTES ---
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false });
  res.json({ success: true, fileUrl: `http://${req.headers.host}/uploads/${req.file.filename}`, fileType: req.file.mimetype });
});

app.get('/contacts', async (req, res) => {
  res.json(await getUsers());
});

app.post('/login', async (req, res) => {
  const { id, password } = req.body;
  const user = await get("SELECT * FROM users WHERE id = ? AND password = ?", [id, password]);
  if (user) {
    res.json({ success: true, ...user });
  } else {
    res.json({ success: false, message: 'Invalid Credentials' });
  }
});

app.post('/change-password', async (req, res) => {
  const { employeeId, oldPassword, newPassword } = req.body;
  const user = await get("SELECT * FROM users WHERE id = ? AND password = ?", [employeeId, oldPassword]);
  if (!user) return res.json({ success: false, message: "Incorrect Old Password" });

  await run("UPDATE users SET password = ? WHERE id = ?", [newPassword, employeeId]);
  res.json({ success: true });
});

// --- 6. SOCKET LOGIC ---

// ✅ SECURE REFRESH HELPER: Safely pushes updated chat lists to specific users
async function refreshDataForUsers(userIds) {
  const users = await getUsers();
  const onlineUsers = users.map(u => ({...u, isOnline: true}));
  const allChats = await getFullChatHistory();

  userIds.forEach(userId => {
    const secureChats = allChats.filter(c => 
      c.type === 'broadcast' || (c.participants && c.participants.includes(userId))
    );
    io.to(userId).emit('initialData', { users: onlineUsers, chats: secureChats });
  });
}

io.on('connection', (socket) => {
  console.log(`Socket Connected: ${socket.id}`);

  // SECURE REGISTRATION
  socket.on('register', async (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their secure room.`);
    await refreshDataForUsers([userId]);
  });

  // ✅ FIX: CREATE GROUP
  socket.on('createGroup', async ({ name, participants }) => {
    const newGroup = {
      id: Date.now().toString(),
      name,
      type: 'group',
      participants: JSON.stringify(participants),
      hiddenBy: '[]'
    };
    
    await run("INSERT INTO chats VALUES (?, ?, ?, ?, ?)", Object.values(newGroup));

    // 1. Refresh the sidebar data for everyone in the group
    await refreshDataForUsers(participants);
    
    // 2. Open the chat on the creator's screen
    const groupForClient = { ...newGroup, participants: participants, hiddenBy: [], messages: [] };
    participants.forEach(pId => io.to(pId).emit('openChat', groupForClient));
  });

  // ✅ FIX: CREATE DIRECT CHAT
  socket.on('createDirectChat', async ({ senderId, participantId }) => {
    const allChats = await getFullChatHistory();
    let targetChat = allChats.find(c => 
      c.type === 'direct' && 
      c.participants.includes(senderId) && 
      c.participants.includes(participantId)
    );

    if (!targetChat) {
      const newChat = {
        id: Date.now().toString(),
        name: "Direct Message",
        type: "direct",
        participants: JSON.stringify([senderId, participantId]),
        hiddenBy: '[]'
      };
      await run("INSERT INTO chats VALUES (?, ?, ?, ?, ?)", Object.values(newChat));
      targetChat = { ...newChat, participants: [senderId, participantId], hiddenBy: [], messages: [] };
      
      // Update both users' sidebars
      await refreshDataForUsers([senderId, participantId]);
    }
    
    socket.emit('openChat', targetChat);
  });

  socket.on('send_message', async (data) => {
    const { chatId, content, senderId, type, isSecret, replyTo } = data;
    const newMessage = {
      id: Date.now().toString(),
      chatId,
      senderId,
      content,
      type,
      timestamp: new Date().toISOString(),
      isSecret: isSecret ? 1 : 0,
      replyTo: replyTo ? JSON.stringify(replyTo) : null,
      reactions: '{}',
      readBy: '[]',
      status: 'sent'
    };

    await run("INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", Object.values(newMessage));
    await run("UPDATE chats SET hiddenBy = '[]' WHERE id = ?", [chatId]);

    const msgForClient = parseMessage(newMessage);
    const chat = await get("SELECT * FROM chats WHERE id = ?", [chatId]);
    if (chat) {
        if (chat.type === 'broadcast') {
            io.emit('receiveMessage', msgForClient);
        } else {
            const parts = JSON.parse(chat.participants);
            parts.forEach(pId => io.to(pId).emit('receiveMessage', msgForClient));
        }
    }
  });

  socket.on('mark_messages_read', async ({ chatId, userId }) => {
    const messages = await all("SELECT * FROM messages WHERE chatId = ?", [chatId]);
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        messages.forEach(msg => {
            let readBy = JSON.parse(msg.readBy || '[]');
            if (msg.senderId !== userId && !readBy.includes(userId)) {
                readBy.push(userId);
                db.run("UPDATE messages SET readBy = ?, status = 'read' WHERE id = ?", [JSON.stringify(readBy), msg.id]);
            }
        });
        db.run("COMMIT");
    });
    
    const chat = await get("SELECT * FROM chats WHERE id = ?", [chatId]);
    if (chat && chat.type !== 'broadcast') {
         const parts = JSON.parse(chat.participants);
         parts.forEach(pId => io.to(pId).emit('messages_read_update', { chatId, userId }));
    }
  });
  
  socket.on('add_reaction', async ({ chatId, messageId, emoji, userId }) => {
    const msg = await get("SELECT * FROM messages WHERE id = ?", [messageId]);
    if (msg) {
        let reactions = JSON.parse(msg.reactions || '{}');
        if (!reactions[emoji]) reactions[emoji] = [];
        
        if (reactions[emoji].includes(userId)) {
            reactions[emoji] = reactions[emoji].filter(id => id !== userId);
            if (reactions[emoji].length === 0) delete reactions[emoji];
        } else {
            reactions[emoji].push(userId);
        }
        
        await run("UPDATE messages SET reactions = ? WHERE id = ?", [JSON.stringify(reactions), messageId]);
        
        const chat = await get("SELECT * FROM chats WHERE id = ?", [chatId]);
        if (chat) {
            if (chat.type === 'broadcast') {
                 io.emit('reactionUpdated', { chatId, messageId, reactions });
            } else {
                 const parts = JSON.parse(chat.participants);
                 parts.forEach(pId => io.to(pId).emit('reactionUpdated', { chatId, messageId, reactions }));
            }
        }
    }
  });

  socket.on('delete_message', async ({ chatId, messageId }) => {
      await run("DELETE FROM messages WHERE id = ?", [messageId]);
      const chat = await get("SELECT * FROM chats WHERE id = ?", [chatId]);
      if(chat) {
          const parts = JSON.parse(chat.participants || '[]');
          await refreshDataForUsers(parts); 
      }
  });
  
  // ✅ FIX: DELETE CHAT CONVERSATION
  socket.on('delete_chat', async ({ chatId, userId, type }) => {
    const chat = await get("SELECT * FROM chats WHERE id = ?", [chatId]);
    if (chat) {
        if (chat.type === 'broadcast' && type === 'hard') return; // Prevent broadcast deletion
        
        const parts = JSON.parse(chat.participants || '[]');
        
        if (type === 'hard') {
            await run("DELETE FROM chats WHERE id = ?", [chatId]);
            await run("DELETE FROM messages WHERE chatId = ?", [chatId]);
        } else if (type === 'soft') {
            let hiddenBy = JSON.parse(chat.hiddenBy || '[]');
            if (!hiddenBy.includes(userId)) {
                hiddenBy.push(userId);
                await run("UPDATE chats SET hiddenBy = ? WHERE id = ?", [JSON.stringify(hiddenBy), chatId]);
            }
        }
        await refreshDataForUsers(parts);
    }
  });
});

const PORT = 3001;
server.listen(PORT, '0.0.0.0', () => console.log(`SERVER RUNNING ON PORT ${PORT}`));