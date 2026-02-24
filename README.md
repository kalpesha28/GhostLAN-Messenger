# 🛡️ GhostLAN Messenger

**GhostLAN** is a highly secure, air-gapped Local Area Network (LAN) communication platform designed for enterprise and defense environments. 

Unlike traditional messaging apps that route data through public internet servers (like AWS or Google Cloud), GhostLAN keeps 100% of its data inside the local network. It operates flawlessly without an active internet connection, making it completely immune to external internet outages and outside cyber threats.

---

## ✨ Key Features

* **🚫 True Air-Gapped Functionality:** Operates entirely over local Wi-Fi/LAN. No internet connection required.
* **🔥 Ephemeral Messaging (Self-Destruct):** "View Once" payload system for text, images, videos, and documents. Messages are permanently purged from the database via a hard SQL `DELETE` upon closing.
* **🔐 Military-Grade Encryption:** * Passwords hashed using `bcryptjs`.
    * Chat messages encrypted at rest in the database using `AES-256`.
* **⚡ Real-Time Full-Duplex Chat:** Powered by WebSockets (`Socket.io`) for instant, stateful communication without polling.
* **👥 Role-Based Access Control (RBAC):** Supports Admin broadcasts, Department Groups, and secure Direct Messaging.
* **💻 Progressive Web App (PWA):** Fully installable as a standalone native Desktop Application (macOS/Windows) with zero browser UI.
* **🔔 Native Desktop Integrations:** Features auto-reconnect logic, background audio notifications, and native OS pop-up alerts.

---

## 🛠️ Tech Stack

### **Frontend**
* **React.js** (Built with Vite & TypeScript)
* **Tailwind CSS** & **Shadcn UI** (For sleek, modern, responsive design)
* **Context API** (For global state management and Optimistic UI updates)
* **Vite PWA Plugin** (For Service Workers and Desktop installation)

### **Backend**
* **Node.js** & **Express.js** (REST API architecture)
* **Socket.io** (Real-time WebSocket engine)
* **SQLite3** (Serverless, file-based database—ideal for rapid, isolated local deployment)
* **Crypto (Node native)** (For AES-256 database encryption)

---

## 🚀 Installation & Setup

### Prerequisites
* Node.js (v18+ recommended)
* A local network (Wi-Fi router or Mobile Hotspot)

### 1. Clone the Repository
\`\`\`bash
git clone https://github.com/kalpesha28/GhostLAN-Messenger.git
cd GhostLAN-Messenger
\`\`\`

### 2. Backend Setup
\`\`\`bash
cd backend
npm install
\`\`\`
Create a `.env` file in the `backend` directory and add your AES-256 Encryption Key (Must be exactly 32 characters):
\`\`\`env
PORT=3000
ENCRYPTION_KEY=Your_32_Character_Secure_Key_Here!
\`\`\`
Start the backend server:
\`\`\`bash
npm start
\`\`\`

### 3. Frontend Setup
Open a new terminal window and navigate to the frontend directory:
\`\`\`bash
cd frontend
npm install
\`\`\`
Configure the API connection in `src/config.ts` (or your config file) to point to your backend IP:
\`\`\`typescript
export const API_URL = 'http://localhost:3000'; // Change to your IPv4 address for LAN testing
\`\`\`
Start the frontend development server:
\`\`\`bash
npm run dev -- --host
\`\`\`

*(To test the PWA Desktop installation locally, build the app and run the preview server: `npm run build && npm run preview -- --host`)*

---

## 🧪 How to Run the "Air-Gap Test"

To prove the system's security, you can test it entirely off-the-grid:
1. Turn **OFF** Cellular Data and standard Wi-Fi on your mobile phone.
2. Turn **ON** your phone's Personal Hotspot (creating an internet-free local router).
3. Connect your host computer (running the GhostLAN servers) to the Hotspot.
4. Find your computer's new Local IP Address (`ipconfig` on Windows or `ifconfig` on Mac).
5. Update your frontend config to use this new IP, and restart both servers.
6. Connect any other device to the Hotspot, navigate to the IP address in a browser, and enjoy instant, secure messaging with zero internet connection.

---

## 🔒 Security Architecture Overview

* **No Third-Party Hosting:** File uploads (images, documents) are stored directly on the host machine's physical `/uploads` directory, completely avoiding cloud buckets like AWS S3.
* **Optimistic UI:** "Burned" messages are instantly removed from the React DOM while the backend asynchronously executes the SQL deletion, preventing visual lag or accidental exposure.
* **Cipher Implementation:** AES-256 encryption utilizes a unique, randomly generated 16-byte Initialization Vector (IV) for every single message, preventing pattern-recognition attacks on the database file.

---

## 👨‍💻 Author

**Kalpesha Saner** *Developed as a secure, real-time communication prototype for enterprise and defense applications.*
