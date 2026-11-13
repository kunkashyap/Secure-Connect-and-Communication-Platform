require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Note = require('../models/Note');
const Message = require('../models/Message');

const seedData = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/secure_connect_db';
    await mongoose.connect(mongoURI);
    console.log('[Seeder] Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Note.deleteMany({});
    await Message.deleteMany({});
    console.log('[Seeder] Cleared previous database records');

    // Create Admin User
    const adminUser = await User.create({
      name: 'System Admin',
      email: 'admin@secureconnect.local',
      password: 'AdminPassword123!',
      role: 'admin',
    });
    console.log(`[Seeder] Created Admin User: ${adminUser.email} (role: ${adminUser.role})`);

    // Create Standard User 1 (Alice)
    const aliceUser = await User.create({
      name: 'Alice Johnson',
      email: 'alice@secureconnect.local',
      password: 'AlicePassword123!',
      role: 'user',
    });
    console.log(`[Seeder] Created User 1: ${aliceUser.email} (role: ${aliceUser.role})`);

    // Create Standard User 2 (Bob)
    const bobUser = await User.create({
      name: 'Bob Smith',
      email: 'bob@secureconnect.local',
      password: 'BobPassword123!',
      role: 'user',
    });
    console.log(`[Seeder] Created User 2: ${bobUser.email} (role: ${bobUser.role})`);

    // Create Sample Notes for Alice
    const note1 = await Note.create({
      title: 'Lab 4 Architecture Notes',
      content: 'Remember to demonstrate JWT authentication, RBAC, and Socket.IO chat.',
      userId: aliceUser._id,
    });

    const note2 = await Note.create({
      title: 'Security Best Practices',
      content: 'Never store plain-text passwords and always enforce resource ownership at query level.',
      userId: aliceUser._id,
    });

    // Create Sample Note for Bob
    const note3 = await Note.create({
      title: "Bob's Confidential Project",
      content: 'Only Bob should be able to view and modify this note.',
      userId: bobUser._id,
    });

    console.log(`[Seeder] Created ${[note1, note2, note3].length} sample notes`);

    console.log('\n[Seeder] Database seeding completed successfully!');
    console.log('---------------------------------------------------------');
    console.log('Test Accounts Available:');
    console.log('1. Admin: admin@secureconnect.local / AdminPassword123!');
    console.log('2. User 1: alice@secureconnect.local / AlicePassword123!');
    console.log('3. User 2: bob@secureconnect.local / BobPassword123!');
    console.log('---------------------------------------------------------');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Seeder] Error seeding data:', error.message);
    process.exit(1);
  }
};

seedData();
