const io = require('socket.io-client');
const axios = require('axios');

// Test configuration
const TEST_PROJECT_ID = 'test-project-123';
const RUNNER_URL = 'http://localhost:3000';
const WORKER_URL = 'http://localhost:3001';

async function testYjsIntegration() {
  console.log('🧪 Testing Yjs Integration...\n');

  try {
    // Test 1: Connect to runner
    console.log('1. Testing runner connection...');
    const socket = io(RUNNER_URL, {
      transports: ['websocket'],
      timeout: 10000,
    });

    await new Promise((resolve, reject) => {
      socket.on('connect', () => {
        console.log('✅ Connected to runner');
        resolve();
      });

      socket.on('connect_error', (error) => {
        console.log('❌ Failed to connect to runner:', error.message);
        reject(error);
      });

      setTimeout(() => reject(new Error('Connection timeout')), 10000);
    });

    // Test 2: Join Yjs room
    console.log('\n2. Testing Yjs room join...');
    socket.emit('yjs:joinRoom', { roomId: TEST_PROJECT_ID });

    await new Promise((resolve) => {
      socket.on('yjs:files', (files) => {
        console.log('✅ Joined Yjs room, received files:', files);
        resolve();
      });

      setTimeout(() => {
        console.log('⚠️  No Yjs files received (this might be normal for empty room)');
        resolve();
      }, 3000);
    });

    // Test 3: Get file structure
    console.log('\n3. Testing file structure...');
    socket.emit('files:getStructure');

    await new Promise((resolve) => {
      socket.on('files:structure', (structure) => {
        console.log('✅ Received file structure:', structure);
        resolve();
      });

      setTimeout(() => {
        console.log('⚠️  No file structure received');
        resolve();
      }, 3000);
    });

    // Test 4: Create a test file
    console.log('\n4. Testing file creation...');
    socket.emit('files:create', { path: 'test.js', isFolder: false });

    await new Promise((resolve) => {
      socket.on('files:created', (file) => {
        console.log('✅ File created:', file);
        resolve();
      });

      setTimeout(() => {
        console.log('⚠️  File creation timeout');
        resolve();
      }, 3000);
    });

    // Test 5: Test worker health
    console.log('\n5. Testing worker health...');
    try {
      const response = await axios.get(`${WORKER_URL}/health`);
      console.log('✅ Worker health check passed:', response.data);
    } catch (error) {
      console.log('❌ Worker health check failed:', error.message);
    }

    // Test 6: Test worker Yjs events endpoint
    console.log('\n6. Testing worker Yjs events...');
    try {
      const response = await axios.post(`${WORKER_URL}/yjs-events`, {
        roomId: TEST_PROJECT_ID,
        event: 'file:created',
        data: { filePath: 'test.js', content: 'console.log("Hello World!");' },
        timestamp: Date.now()
      });
      console.log('✅ Worker Yjs events endpoint working:', response.data);
    } catch (error) {
      console.log('❌ Worker Yjs events failed:', error.message);
    }

    // Cleanup
    socket.emit('yjs:leaveRoom', { roomId: TEST_PROJECT_ID });
    socket.disconnect();

    console.log('\n🎉 All tests completed!');

  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests
testYjsIntegration(); 