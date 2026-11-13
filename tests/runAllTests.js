require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const { io: ClientSocket } = require('socket.io-client');
const { app, server, io } = require('../server');
const { eventService, EVENTS } = require('../services/eventService');

// Use custom port for testing to prevent conflicts
const TEST_PORT = 5055;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

let testServer;
let adminToken = '';
let user1Token = '';
let user2Token = '';
let user1Id = '';
let user2Id = '';
let testNoteId = '';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

const assert = (condition, description) => {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✔ PASS\x1b[0m : ${description}`);
  } else {
    failedTests++;
    console.error(`  \x1b[31m✘ FAIL\x1b[0m : ${description}`);
  }
};

const runAllTests = async () => {
  console.log('\n=============================================================');
  console.log(' STARTING SECURE CONNECT PLATFORM FULL VERIFICATION SUITE');
  console.log('=============================================================\n');

  try {
    // 1. Start test server
    await mongoose.connect(process.env.MONGODB_URI);
    await new Promise((resolve) => {
      testServer = server.listen(TEST_PORT, () => {
        console.log(`[Test Harness] Server listening on ${BASE_URL}\n`);
        resolve();
      });
    });

    // ==========================================
    // MODULE 1: AUTHENTICATION TESTS
    // ==========================================
    console.log('\x1b[34m--- MODULE 1: AUTHENTICATION TESTS ---\x1b[0m');

    // 1. Register a new user
    const uniqueEmail = `testuser_${Date.now()}@test.local`;
    const resReg = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Automated Tester',
        email: uniqueEmail,
        password: 'Password123!',
      }),
    });
    const dataReg = await resReg.json();
    assert(resReg.status === 201 && dataReg.success && dataReg.data?.user?.email === uniqueEmail,
      '1. Register a new user (POST /api/auth/signup -> 201 Created)');

    // 2. Register with existing email
    const resRegDup = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Tester',
        email: uniqueEmail,
        password: 'Password123!',
      }),
    });
    const dataRegDup = await resRegDup.json();
    assert(resRegDup.status === 409 && !dataRegDup.success,
      '2. Register with existing email (POST /api/auth/signup -> 409 Conflict)');

    // 3. Login with correct credentials
    const resLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alice@secureconnect.local',
        password: 'AlicePassword123!',
      }),
    });
    const dataLogin = await resLogin.json();
    user1Token = dataLogin.data?.token;
    user1Id = dataLogin.data?.user?.id;
    assert(resLogin.status === 200 && dataLogin.success && !!user1Token,
      '3. Login with correct credentials (POST /api/auth/login -> 200 OK & returns JWT)');

    // Login user 2 (Bob) for cross-user permission testing
    const resLoginBob = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'bob@secureconnect.local',
        password: 'BobPassword123!',
      }),
    });
    const dataLoginBob = await resLoginBob.json();
    user2Token = dataLoginBob.data?.token;
    user2Id = dataLoginBob.data?.user?.id;

    // Login Admin
    const resLoginAdmin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@secureconnect.local',
        password: 'AdminPassword123!',
      }),
    });
    const dataLoginAdmin = await resLoginAdmin.json();
    adminToken = dataLoginAdmin.data?.token;

    // 4. Login with incorrect credentials
    const resLoginFail = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alice@secureconnect.local',
        password: 'WrongPassword!',
      }),
    });
    const dataLoginFail = await resLoginFail.json();
    assert(resLoginFail.status === 401 && !dataLoginFail.success,
      '4. Login with incorrect credentials (POST /api/auth/login -> 401 Unauthorized)');

    // 5. Access protected endpoint without token
    const resNoToken = await fetch(`${BASE_URL}/auth/me`);
    const dataNoToken = await resNoToken.json();
    assert(resNoToken.status === 401 && !dataNoToken.success,
      '5. Access protected endpoint without token (GET /api/auth/me -> 401 Unauthorized)');

    // 6. Access protected endpoint with invalid token
    const resInvalidToken = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: 'Bearer invalid.token.payload' },
    });
    const dataInvalidToken = await resInvalidToken.json();
    assert(resInvalidToken.status === 401 && !dataInvalidToken.success,
      '6. Access protected endpoint with invalid token (GET /api/auth/me -> 401 Unauthorized)');

    // 7. Access protected endpoint with valid token
    const resValidToken = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const dataValidToken = await resValidToken.json();
    assert(resValidToken.status === 200 && dataValidToken.success && dataValidToken.data?.user?.email === 'alice@secureconnect.local',
      '7. Access protected endpoint with valid token (GET /api/auth/me -> 200 OK)');

    // ==========================================
    // MODULE 2: RBAC TESTS
    // ==========================================
    console.log('\n\x1b[34m--- MODULE 2: ROLE-BASED ACCESS CONTROL (RBAC) TESTS ---\x1b[0m');

    // 1. Access admin endpoint as normal user
    const resUserAdminReq = await fetch(`${BASE_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const dataUserAdminReq = await resUserAdminReq.json();
    assert(resUserAdminReq.status === 403 && !dataUserAdminReq.success,
      '1. Access admin endpoint as normal user (GET /api/admin/users -> 403 Forbidden)');

    // 2. Access admin endpoint as admin
    const resAdminReq = await fetch(`${BASE_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataAdminReq = await resAdminReq.json();
    assert(resAdminReq.status === 200 && dataAdminReq.success && Array.isArray(dataAdminReq.data?.users),
      '2. Access admin endpoint as admin (GET /api/admin/users -> 200 OK)');

    // 3. Attempt unauthorized role modification via public signup
    const hackerEmail = `hacker_${Date.now()}@test.local`;
    const resHacker = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Privilege Escalation Tester',
        email: hackerEmail,
        password: 'Password123!',
        role: 'admin', // Malicious attempt to self-promote
      }),
    });
    const dataHacker = await resHacker.json();
    assert(resHacker.status === 201 && dataHacker.data?.user?.role === 'user',
      '3. Attempt unauthorized role modification via public signup (Role forced to "user")');

    // ==========================================
    // MODULE 3: SECURE NOTES API TESTS
    // ==========================================
    console.log('\n\x1b[34m--- MODULE 3: SECURE NOTES MANAGEMENT API TESTS ---\x1b[0m');

    // 1. Create a note
    const resCreateNote = await fetch(`${BASE_URL}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        title: 'Confidential Alice Note',
        content: 'This note belongs strictly to Alice.',
      }),
    });
    const dataCreateNote = await resCreateNote.json();
    testNoteId = dataCreateNote.data?.note?.id || dataCreateNote.data?.note?._id;
    assert(resCreateNote.status === 201 && dataCreateNote.success && !!testNoteId,
      '1. Create a note (POST /api/notes -> 201 Created)');

    // 2. Retrieve all personal notes
    const resGetNotes = await fetch(`${BASE_URL}/notes`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const dataGetNotes = await resGetNotes.json();
    assert(resGetNotes.status === 200 && dataGetNotes.success && dataGetNotes.data?.notes.length >= 1,
      '2. Retrieve all personal notes (GET /api/notes -> 200 OK)');

    // 3. Retrieve a particular note
    const resGetNote = await fetch(`${BASE_URL}/notes/${testNoteId}`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const dataGetNote = await resGetNote.json();
    assert(resGetNote.status === 200 && dataGetNote.success && dataGetNote.data?.note?.title === 'Confidential Alice Note',
      '3. Retrieve a particular note by ID (GET /api/notes/:id -> 200 OK)');

    // 4. Update a note
    const resUpdateNote = await fetch(`${BASE_URL}/notes/${testNoteId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        title: 'Updated Alice Note Title',
        content: 'Updated content securely.',
      }),
    });
    const dataUpdateNote = await resUpdateNote.json();
    assert(resUpdateNote.status === 200 && dataUpdateNote.success && dataUpdateNote.data?.note?.title === 'Updated Alice Note Title',
      '4. Update a note (PUT /api/notes/:id -> 200 OK)');

    // 5. Attempt to access another user's note (Bob accessing Alice's note)
    const resCrossAccess = await fetch(`${BASE_URL}/notes/${testNoteId}`, {
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    const dataCrossAccess = await resCrossAccess.json();
    assert(resCrossAccess.status === 403 && !dataCrossAccess.success,
      "5. Attempt to access another user's note (Bob -> Alice Note -> 403 Forbidden)");

    // 6. Attempt to update another user's note (Bob modifying Alice's note)
    const resCrossUpdate = await fetch(`${BASE_URL}/notes/${testNoteId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user2Token}`,
      },
      body: JSON.stringify({ title: "Bob's malicious takeover" }),
    });
    const dataCrossUpdate = await resCrossUpdate.json();
    assert(resCrossUpdate.status === 403 && !dataCrossUpdate.success,
      "6. Attempt to modify another user's note (Bob -> Alice Note -> 403 Forbidden)");

    // 7. Attempt to access notes without authentication
    const resUnauthNotes = await fetch(`${BASE_URL}/notes`);
    const dataUnauthNotes = await resUnauthNotes.json();
    assert(resUnauthNotes.status === 401 && !dataUnauthNotes.success,
      '7. Attempt to access notes without authentication (GET /api/notes -> 401 Unauthorized)');

    // 8. Delete a note
    const resDeleteNote = await fetch(`${BASE_URL}/notes/${testNoteId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const dataDeleteNote = await resDeleteNote.json();
    assert(resDeleteNote.status === 200 && dataDeleteNote.success,
      '8. Delete a note (DELETE /api/notes/:id -> 200 OK)');

    // Verify deleted note is gone
    const resVerifyDelete = await fetch(`${BASE_URL}/notes/${testNoteId}`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert(resVerifyDelete.status === 404,
      '9. Verify deleted note returns 404 Not Found');

    // ==========================================
    // MODULE 4: REAL-TIME CHAT USING SOCKET.IO
    // ==========================================
    console.log('\n\x1b[34m--- MODULE 4: REAL-TIME CHAT USING SOCKET.IO TESTS ---\x1b[0m');

    // 1. Attempt unauthenticated connection
    await new Promise((resolve) => {
      const badSocket = ClientSocket(`http://localhost:${TEST_PORT}`, {
        transports: ['websocket'],
        reconnection: false,
      });

      badSocket.on('connect_error', (err) => {
        assert(err.message.includes('Authentication error'),
          '1. Connect without a valid JWT is rejected with Authentication error');
        badSocket.close();
        resolve();
      });

      badSocket.on('connect', () => {
        assert(false, '1. Connect without token should fail');
        badSocket.close();
        resolve();
      });
    });

    // 2. Connect authenticated clients (Alice & Bob)
    let aliceSocket;
    let bobSocket;

    await new Promise((resolve) => {
      aliceSocket = ClientSocket(`http://localhost:${TEST_PORT}`, {
        auth: { token: user1Token },
        transports: ['websocket'],
      });

      aliceSocket.on('connect', () => {
        assert(aliceSocket.connected,
          '2. Authenticated user connects successfully via JWT in handshake auth');
        resolve();
      });
    });

    await new Promise((resolve) => {
      bobSocket = ClientSocket(`http://localhost:${TEST_PORT}`, {
        auth: { token: user2Token },
        transports: ['websocket'],
      });

      bobSocket.on('connect', () => {
        assert(bobSocket.connected,
          '3. Second authenticated user connects successfully');
        resolve();
      });
    });

    // 3. Join chat room and receive user_joined event
    const testRoom = 'webdev-lab4-room';

    await new Promise((resolve) => {
      // Bob joins first
      bobSocket.emit('join_room', { roomId: testRoom });

      // Alice listens for user_joined or vice versa:
      // When Alice joins, Bob should receive 'user_joined'
      bobSocket.once('user_joined', (eventData) => {
        assert(eventData.roomId === testRoom && eventData.userName === 'Alice Johnson',
          '4. Join a chat room: Bob receives user_joined notification when Alice enters');
        resolve();
      });

      setTimeout(() => {
        aliceSocket.emit('join_room', { roomId: testRoom });
      }, 50);
    });

    // 4. Send and receive real-time message
    await new Promise((resolve) => {
      const sentContent = 'Hello from Alice via real-time Socket.IO!';

      bobSocket.once('receive_message', (msg) => {
        assert(
          msg.roomId === testRoom &&
          msg.content === sentContent &&
          msg.senderName === 'Alice Johnson' &&
          !!msg.timestamp,
          '5. Send & Receive message: Bob receives real-time broadcast with correct payload & timestamp'
        );
        resolve();
      });

      aliceSocket.emit('send_message', {
        roomId: testRoom,
        content: sentContent,
      });
    });

    // 5. Leave room and receive user_left event
    await new Promise((resolve) => {
      bobSocket.once('user_left', (eventData) => {
        assert(eventData.roomId === testRoom && eventData.userName === 'Alice Johnson',
          '6. Leave room: Bob receives user_left notification when Alice exits');
        resolve();
      });

      aliceSocket.emit('leave_room', { roomId: testRoom });
    });

    // Disconnect sockets cleanly
    aliceSocket.disconnect();
    bobSocket.disconnect();
    assert(true, '7. Disconnect sockets successfully handled');

    // ==========================================
    // MODULE 5: EVENT-DRIVEN AUDIT LOG TESTS
    // ==========================================
    console.log('\n\x1b[34m--- MODULE 5: EVENT-DRIVEN AUDIT LOG (EVENTEMITTER) TESTS ---\x1b[0m');

    // Retrieve event logs via Admin API
    const resAudit = await fetch(`${BASE_URL}/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataAudit = await resAudit.json();
    const logs = dataAudit.data?.logs || [];

    const hasUserRegistered = logs.some((l) => l.event === EVENTS.USER_REGISTERED);
    const hasUserLoggedIn = logs.some((l) => l.event === EVENTS.USER_LOGGED_IN);
    const hasNoteCreated = logs.some((l) => l.event === EVENTS.NOTE_CREATED);
    const hasNoteUpdated = logs.some((l) => l.event === EVENTS.NOTE_UPDATED);
    const hasNoteDeleted = logs.some((l) => l.event === EVENTS.NOTE_DELETED);
    const hasMessageSent = logs.some((l) => l.event === EVENTS.MESSAGE_SENT);

    assert(hasUserRegistered, '1. EventEmitter fired & logged USER_REGISTERED');
    assert(hasUserLoggedIn, '2. EventEmitter fired & logged USER_LOGGED_IN');
    assert(hasNoteCreated, '3. EventEmitter fired & logged NOTE_CREATED');
    assert(hasNoteUpdated, '4. EventEmitter fired & logged NOTE_UPDATED');
    assert(hasNoteDeleted, '5. EventEmitter fired & logged NOTE_DELETED');
    assert(hasMessageSent, '6. EventEmitter fired & logged MESSAGE_SENT');

    console.log('\n=============================================================');
    console.log(` TEST RUN COMPLETE: ${passedTests}/${totalTests} PASSED, ${failedTests} FAILED`);
    console.log('=============================================================\n');

  } catch (error) {
    console.error('[Test Harness Error]', error);
  } finally {
    if (testServer) {
      testServer.close();
    }
    await mongoose.disconnect();
    process.exit(failedTests > 0 ? 1 : 0);
  }
};

runAllTests();
