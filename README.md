# Secure Connect and Communication Platform
### Web Development III — Lab 4 Project

[![Node.js](https://img.shields.io/badge/Node.js-v22+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-v5.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-v9.x-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-v4.x-010101?logo=socket.io&logoColor=white)](https://socket.io/)
[![Security](https://img.shields.io/badge/Security-JWT%20%7C%20bcrypt%20%7C%20RBAC-blue)](#14-security-measures)
[![Tests](https://img.shields.io/badge/Tests-32%20Passing-brightgreen)](#18-postman--automated-testing-instructions)

---

## 1. Project Overview

The **Secure Connect and Communication Platform** is a secure, modular backend application built with **Node.js**, **Express.js**, **MongoDB**, and **Socket.IO**. It demonstrates practical, production-grade implementations of authentication, authorization, token-based state, secure personal notes management, role-based access control (RBAC), and real-time bidirectional communication.

The system enforces strict resource isolation at the database query level, manual authentication mechanics without reliance on external black-box auth services (e.g. Passport.js or Firebase Auth), and an decoupled in-process event-driven architecture using Node.js `EventEmitter`.

---

## 2. Problem Statement

Modern web applications handle sensitive user information and real-time communications across untrusted networks. Many academic and prototype implementations suffer from common security vulnerabilities:
- Storing plaintext or insufficiently hashed passwords.
- Relying entirely on client-side checks for access control and ownership.
- Exposing unauthorized endpoints and leaking internal hashes.
- Inadequate separation between system event logging and user-facing network protocols.
- Unprotected WebSocket / Socket.IO connections that bypass HTTP authentication.

This project addresses these challenges by building an end-to-end, defense-in-depth communication backend that protects both REST endpoints and real-time socket connections with verified JSON Web Tokens (JWT).

---

## 3. Project Objectives

1. **User Authentication**: Implement registration, bcrypt password hashing with salt rounds, and login generating signed JWTs.
2. **Access Control**: Enforce Role-Based Access Control (RBAC) distinguishing normal `user` and privileged `admin` accounts.
3. **Data Security & Ownership**: Implement a CRUD API for personal notes ensuring strict query-level ownership checks (users cannot view, edit, or delete other users' notes).
4. **Real-Time Communication**: Authenticate Socket.IO connections via JWT handshake and support room-based multi-user messaging with MongoDB message persistence.
5. **Decoupled Event Handling**: Use Node.js `EventEmitter` to process audit logs and system triggers separately from core request-response lifecycles.
6. **API Architecture**: Adhere to consistent JSON response formats, standard HTTP status codes, and centralized error handling.

---

## 4. Mandatory Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Runtime** | Node.js (v22+) | High-performance asynchronous JavaScript engine |
| **Web Framework** | Express.js (v5) | Modular routing, middleware pipeline, and REST API |
| **Database** | MongoDB & Mongoose | Persistent document storage and schema modeling |
| **Password Security**| `bcrypt` | Adaptive cryptographic hashing (salt factor 10) |
| **Token Authentication** | `jsonwebtoken` | Stateless JWT token issuance and signature verification |
| **Real-Time** | `socket.io` | Bidirectional WebSocket communication with JWT handshake |
| **Event-Driven Architecture** | Node.js `EventEmitter` | In-process decoupled application event logging |
| **Environment Config** | `dotenv` | Secure environment variable configuration |
| **Testing** | Node.js Test Suite & Postman | Comprehensive API & Socket test harness |

> **Strict Compliance**: No third-party auth kits, Passport.js, or Firebase are used. All authentication, token verification, and role middlewares are authored manually.

---

## 5. System Architecture

The project adheres to a clean, layered architectural pattern:

```
[ Client Applications ] (Browser UI / Postman / Mobile / Socket.IO Client)
           │
           ▼
[ Express Middleware Pipeline ]
   ├── CORS & JSON Body Parsers
   ├── Static Files (HTML/CSS UI)
   ├── Auth Middleware (Bearer JWT Verification)
   └── RBAC Role Middleware ('admin' / 'user' validation)
           │
           ▼
[ Controller Layer ] (authController, notesController, chatController, adminController)
   ├── Business Validation
   ├── Ownership Enforcement
   └── Event Dispatches via EventEmitter
           │
     ┌─────┴──────────────┐
     ▼                    ▼
[ Model Layer ]      [ EventService ]
(Mongoose Schemas)   (Node.js EventEmitter)
     │                    │
     ▼                    ▼
[ MongoDB Database ] [ Audit Activity Logs ]
(Users, Notes, Msgs)

┌────────────────────────────────────────────────────────┐
│             Socket.IO Real-Time Gateway                │
│  - Handshake Auth Middleware (JWT Token Verification)  │
│  - Room Management (join_room, leave_room)             │
│  - Real-Time Message Broadcast (receive_message)       │
│  - Persistence to MongoDB Message Collection           │
└────────────────────────────────────────────────────────┘
```

---

## 6. Folder Structure

```
secure-connect/
│
├── config/
│   ├── database.js              # MongoDB connection and lifecycle listeners
│   └── validateEnv.js           # Validates required environment variables on startup
│
├── controllers/
│   ├── authController.js        # Signup, login, profile retrieval
│   ├── notesController.js       # Notes CRUD with query-level ownership checks
│   ├── chatController.js        # Chat history REST endpoints
│   └── adminController.js       # RBAC admin endpoints and audit log retrieval
│
├── middleware/
│   ├── authMiddleware.js        # Extracts & verifies Bearer JWT, binds req.user
│   ├── roleMiddleware.js        # Factory verifying user roles (e.g. admin)
│   └── errorMiddleware.js       # Centralized 404 & error handlers
│
├── models/
│   ├── User.js                  # User schema with pre-save bcrypt hash & toJSON
│   ├── Note.js                  # Personal Note schema with userId foreign reference
│   └── Message.js               # Chat Message schema with roomId & timestamp
│
├── routes/
│   ├── authRoutes.js            # /api/auth routes
│   ├── notesRoutes.js           # /api/notes protected routes
│   ├── chatRoutes.js            # /api/chat protected routes
│   └── adminRoutes.js           # /api/admin privileged routes
│
├── services/
│   ├── tokenService.js          # Encapsulates JWT generation & verification
│   └── eventService.js          # Node.js EventEmitter instance & audit log listeners
│
├── sockets/
│   └── socketHandler.js         # Socket.IO JWT auth handshake & room events
│
├── utils/
│   └── generateToken.js         # JWT signing helper
│
├── public/                      # Browser test interface
│   ├── index.html               # Single-page interface for Auth, Notes & Chat
│   ├── styles.css               # Clean modern styles
│   └── app.js                   # Client-side API and Socket.IO interaction
│
├── scripts/
│   └── seed.js                  # Database seeder (Admin, Alice, Bob & sample notes)
│
├── tests/
│   └── runAllTests.js           # Comprehensive automated verification test suite
│
├── Secure_Connect_Platform.postman_collection.json # Exportable Postman collection
├── .env                         # Environment variables (git ignored)
├── .env.example                 # Template for required environment variables
├── .gitignore                   # Ignores .env, node_modules, data/
├── package.json                 # Project dependencies & scripts
├── server.js                    # HTTP server entrypoint and Socket.IO attachment
└── README.md                    # Complete documentation
```

---

## 7. Database Design

The system uses three MongoDB collections modeled via Mongoose schemas:

### Users Collection (`users`)
```javascript
{
  _id: ObjectId("..."),
  name: "Alice Johnson",
  email: "alice@secureconnect.local",  // Unique, lowercase, indexed
  password: "$2b$10$e8w...",          // Bcrypt hash (never returned in toJSON)
  role: "user",                        // 'user' | 'admin' (default: 'user')
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

### Notes Collection (`notes`)
```javascript
{
  _id: ObjectId("..."),
  title: "Lab 4 Architecture",
  content: "Detailed notes on JWT and RBAC...",
  userId: ObjectId("..."),             // References users._id (Indexed)
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

### Messages Collection (`messages`)
```javascript
{
  _id: ObjectId("..."),
  senderId: ObjectId("..."),           // References users._id (Indexed)
  senderName: "Alice Johnson",
  roomId: "general",                   // Indexed
  content: "Hello everyone!",
  timestamp: ISODate("...")            // Indexed
}
```

---

## 8. Authentication Workflow

```
Client                             Server                           MongoDB
  │                                   │                                │
  │─── POST /api/auth/signup ────────>│                                │
  │    { name, email, password }      │── Check duplicate email ──────>│
  │                                   │<── Result (null / found) ──────│
  │                                   │── Bcrypt hash password (10)    │
  │                                   │── Save new User (role='user') >│
  │                                   │── Emit EVENT: USER_REGISTERED  │
  │<── 201 Created { token, user } ───│                                │
  │                                   │                                │
  │─── POST /api/auth/login ─────────>│                                │
  │    { email, password }            │── Query user by email ────────>│
  │                                   │<── User document returned ─────│
  │                                   │── bcrypt.compare(pass, hash)   │
  │                                   │── Generate signed JWT          │
  │                                   │── Emit EVENT: USER_LOGGED_IN   │
  │<── 200 OK { token, user } ────────│                                │
```

---

## 9. JWT Authentication Explanation

JSON Web Tokens (JWT) provide stateless, tamper-evident authentication:
1. **Structure**: `header.payload.signature`
   - **Header**: Specifies the algorithm (`HS256`) and type (`JWT`).
   - **Payload**: Contains non-sensitive claims (`id`, `role`, `iat`, `exp`).
   - **Signature**: Generated by hashing `Base64(Header) + "." + Base64(Payload)` using `JWT_SECRET`.
2. **Expiration**: Tokens expire according to `JWT_EXPIRES_IN` (e.g. `1d`).
3. **Protection**:
   - The token cannot be modified by the client without invalidating the cryptographic signature.
   - The `authMiddleware.js` parses the `Authorization: Bearer <token>` header, verifies the signature using `jwt.verify`, retrieves the active user, and attaches it to `req.user`.

---

## 10. Role-Based Access Control (RBAC) Explanation

RBAC restricts resource access based on assigned user privileges:
- **`user` (Default)**: Has full CRUD permissions over their own personal notes and participation in public chat rooms.
- **`admin`**: In addition to standard privileges, has access to administrative endpoints (`/api/admin/users`, `/api/admin/stats`, `/api/admin/audit-logs`, `/api/admin/users/:id/role`).
- **Privilege Escalation Prevention**:
  - The public registration endpoint (`/api/auth/signup`) explicitly hardcodes `role: 'user'`, ignoring any client-supplied `role` attribute in the body.
  - Role verification occurs through `middleware/roleMiddleware.js`:
    ```javascript
    const authorizeRoles = (...allowedRoles) => (req, res, next) => {
      if (!req.user || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access forbidden: Insufficient administrative privileges'
        });
      }
      next();
    };
    ```

---

## 11. Notes CRUD API Documentation

All notes endpoints require the `Authorization: Bearer <token>` header.

| Method | Endpoint | Description | Status Codes |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/notes` | Create a new personal note | `201`, `400`, `401` |
| `GET` | `/api/notes` | Retrieve all notes owned by caller | `200`, `401` |
| `GET` | `/api/notes/:id` | Retrieve specific note by ID | `200`, `401`, `403`, `404` |
| `PUT` | `/api/notes/:id` | Update specific note by ID | `200`, `400`, `401`, `403`, `404` |
| `DELETE` | `/api/notes/:id` | Delete specific note by ID | `200`, `401`, `403`, `404` |

### Database-Level Ownership Enforcement
Ownership is validated directly against `note.userId`:
```javascript
const note = await Note.findById(req.params.id);
if (!note) {
  return res.status(404).json({ success: false, message: 'Note not found' });
}
if (note.userId.toString() !== req.user._id.toString()) {
  return res.status(403).json({
    success: false,
    message: 'Access forbidden: You do not have permission to access this note'
  });
}
```

---

## 12. Socket.IO Workflow

Real-time chat is established using WebSocket / Socket.IO with integrated JWT handshake authentication:

```
Client                                     Server
  │                                          │
  │── Socket.IO Connect { auth: {token} } ──>│
  │                                          │── io.use() Handshake Middleware
  │                                          │── Verify JWT token via tokenService
  │                                          │── Fetch user from DB; bind socket.user
  │<── Connection Accepted ──────────────────│
  │                                          │
  │── emit('join_room', { roomId }) ────────>│── socket.join(roomId)
  │                                          │── socket.to(roomId).emit('user_joined')
  │                                          │
  │── emit('send_message', { roomId, ... }) ─>│── Validate roomId & content
  │                                          │── Save Message to MongoDB
  │                                          │── Emit EVENT: MESSAGE_SENT (EventEmitter)
  │<── io.to(roomId).emit('receive_message')─│── Broadcast to room members
  │                                          │
  │── emit('leave_room', { roomId }) ───────>│── socket.leave(roomId)
  │                                          │── socket.to(roomId).emit('user_left')
```

### Supported Socket Events

#### Client → Server
- `join_room`: `{ roomId: "general" }`
- `send_message`: `{ roomId: "general", content: "Hello!" }`
- `leave_room`: `{ roomId: "general" }`

#### Server → Client
- `receive_message`: `{ id, senderId, senderName, roomId, content, timestamp }`
- `user_joined`: `{ userId, userName, roomId, timestamp }`
- `user_left`: `{ userId, userName, roomId, timestamp }`
- `message_error`: `{ message: "Error description" }`

---

## 13. EventEmitter Implementation & Difference from Socket.IO

### Node.js EventEmitter (`services/eventService.js`)
An in-process, asynchronous Publish/Subscribe mechanism native to the Node.js runtime.
- Emits events after core business operations: `USER_REGISTERED`, `USER_LOGGED_IN`, `NOTE_CREATED`, `NOTE_UPDATED`, `NOTE_DELETED`, `MESSAGE_SENT`.
- Registered listeners handle audit logging and telemetry independently from HTTP responses.

### Key Differences: EventEmitter vs. Socket.IO

| Characteristic | Node.js `EventEmitter` | `Socket.IO` |
| :--- | :--- | :--- |
| **Scope** | **In-Process / Server-Local** | **Client-Server / Network-Distributed** |
| **Communication** | Intra-server event passing | Bidirectional network messaging between browser and server |
| **Transport** | Memory function invocations | WebSocket / HTTP Long-Polling network protocols |
| **Target Audience** | Internal application services (auditing, metrics) | Connected human end-users and client devices |
| **State** | Server-side process only | Network sockets and active client connections |

---

## 14. Security Measures

1. **bcrypt Hashing**: Passwords hashed with salt factor 10. Plaintext passwords never stored.
2. **Password Redaction**: Mongoose schema `toJSON` removes `password` and `__v` attributes.
3. **Stateless JWT**: Cryptographically signed tokens with strict expiration and environment-secured secrets.
4. **Backend Resource Ownership**: Query and controller-level ownership checks preventing Insecure Direct Object References (IDOR).
5. **No Public Role Modification**: Signup endpoint forces role `user`.
6. **Socket Handshake Auth**: Unauthenticated socket connections are rejected at the connection phase.
7. **Environment Variable Validation**: The server will not boot if mandatory security secrets are missing.
8. **Centralized Error Handling**: Prevents stack trace leakage in production while delivering consistent error responses.

---

## 15. Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Ensure the following variables are defined:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/secure_connect_db
JWT_SECRET=super_secret_jwt_key_secure_connect_platform_2026_lab4
JWT_EXPIRES_IN=1d
```

---

## 16. Installation Instructions

1. Ensure **Node.js (v18+)** and **MongoDB** are installed and running locally.
2. Clone or open the project folder:
   ```bash
   cd "secure-connect"
   ```
3. Install production and development dependencies:
   ```bash
   npm install
   ```

---

## 17. Execution Instructions

### 1. Seed Initial Accounts & Notes
Populates the database with an Admin, Alice, Bob, and sample notes:
```bash
npm run seed
```

### 2. Start the Server
```bash
npm start
```
*For development with auto-reloading:*
```bash
npm run dev
```

The server will listen at: `http://localhost:5000`  
Interactive Browser Testing Interface: `http://localhost:5000`

---

## 18. Postman & Automated Testing Instructions

### Option A: Run the Automated Verification Suite
We have built an end-to-end automated verification script covering all 5 modules (32 test assertions):
```bash
npm test
```

### Option B: Postman / Thunder Client Collection
Import `Secure_Connect_Platform.postman_collection.json` into Postman.

#### Pre-configured Test Accounts:
- **Admin**: `admin@secureconnect.local` / `AdminPassword123!`
- **User 1 (Alice)**: `alice@secureconnect.local` / `AlicePassword123!`
- **User 2 (Bob)**: `bob@secureconnect.local` / `BobPassword123!`

#### Test Sequence in Postman:
1. Run `POST /api/auth/login` (Alice) — Token is automatically saved to collection variable `authToken`.
2. Run `POST /api/auth/login` (Admin) — Token is automatically saved to collection variable `adminToken`.
3. Execute `GET /api/auth/me` with `authToken` (Returns Alice's profile).
4. Execute `GET /api/admin/users` with `authToken` (Returns `403 Forbidden`).
5. Execute `GET /api/admin/users` with `adminToken` (Returns `200 OK` with user list).
6. Execute `POST /api/notes` (Creates note; saves `noteId`).
7. Execute `GET /api/notes` and `GET /api/notes/:id`.
8. Execute `PUT /api/notes/:id` (Updates title/content).
9. Switch authorization to Bob's token and execute `GET /api/notes/:id` (Returns `403 Forbidden` demonstrating ownership enforcement).
10. Execute `DELETE /api/notes/:id`.

---

## 19. Expected API Responses

### Successful Authentication Response (`200 OK`)
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "6af713a9a0e6fc6383a548cc",
      "name": "Alice Johnson",
      "email": "alice@secureconnect.local",
      "role": "user"
    }
  }
}
```

### Duplicate Registration Error (`409 Conflict`)
```json
{
  "success": false,
  "message": "A user account with this email address already exists"
}
```

### Missing or Expired Token (`401 Unauthorized`)
```json
{
  "success": false,
  "message": "Access denied: No authentication token provided"
}
```

### Insufficient Privileges / RBAC Error (`403 Forbidden`)
```json
{
  "success": false,
  "message": "Access forbidden: Insufficient administrative privileges"
}
```

### Cross-User Resource Access (`403 Forbidden`)
```json
{
  "success": false,
  "message": "Access forbidden: You do not have permission to view this note"
}
```

### Resource Created (`201 Created`)
```json
{
  "success": true,
  "message": "Note created successfully",
  "data": {
    "note": {
      "id": "6af713d33461042f15bf1dd9",
      "title": "Lab 4 Architecture",
      "content": "Personal note content...",
      "userId": "6af713a9a0e6fc6383a548cc",
      "createdAt": "2026-11-13T13:42:43.784Z",
      "updatedAt": "2026-11-13T13:42:43.784Z"
    }
  }
}
```

---

## 20. Code Responsibilities Summary

- `server.js`: Central application bootstrapper attaching Express, MongoDB, Socket.IO, and error handlers.
- `models/User.js`: Defines user schema, pre-save bcrypt hashing hook, password verification method, and output transformation.
- `models/Note.js`: Note schema storing user references and content.
- `models/Message.js`: Stores persistent chat messages across rooms.
- `middleware/authMiddleware.js`: Validates incoming Bearer JWT tokens.
- `middleware/roleMiddleware.js`: Restricts access to authorized roles.
- `middleware/errorMiddleware.js`: Formats all errors consistently according to API specifications.
- `services/eventService.js`: Implements decoupled audit logging with `EventEmitter`.
- `sockets/socketHandler.js`: Socket.IO handshake JWT authentication and room-based message broadcasting.
- `public/`: Standalone web UI allowing instructors and students to interactively test all capabilities in any browser.
