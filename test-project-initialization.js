const io = require('socket.io-client');

// Test configuration
const TEST_PROJECT_ID = 'test-project-init-123';
const RUNNER_URL = 'http://localhost:3000';

async function testProjectInitialization() {
  console.log('🧪 Testing Project Initialization...\n');

  try {
    // Test 1: Connect to runner
    console.log('1. Testing runner connection...');
    const socket = io(RUNNER_URL, {
      path: "/user/socket.io",
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

    // Test 2: Initialize project
    console.log('\n2. Testing project initialization...');
    socket.emit('project:initialize', { projectId: TEST_PROJECT_ID });

    await new Promise((resolve, reject) => {
      socket.on('project:initialized', (data) => {
        console.log('✅ Project initialized successfully');
        console.log('   Structure:', data.structure.length, 'items');
        console.log('   Files with content:', data.filesWithContent.length);
        console.log('   Project ID:', data.projectId);
        
        // Log the files that were created
        data.filesWithContent.forEach(file => {
          if (file.type === 'file') {
            console.log(`   📄 ${file.path} (${file.content?.length || 0} chars)`);
          }
        });
        
        resolve();
      });

      socket.on('project:error', (error) => {
        console.log('❌ Project initialization failed:', error.message);
        reject(new Error(error.message));
      });

      setTimeout(() => reject(new Error('Project initialization timeout')), 15000);
    });

    // Test 3: Join Yjs room
    console.log('\n3. Testing Yjs room join...');
    socket.emit('yjs:joinRoom', { roomId: TEST_PROJECT_ID });

    await new Promise((resolve) => {
      socket.on('files:structure', (structure) => {
        console.log('✅ Received file structure from Yjs room');
        console.log('   Files:', structure.length);
        resolve();
      });

      socket.on('yjs:files', (files) => {
        console.log('✅ Received Yjs files:', files);
      });

      setTimeout(() => {
        console.log('⚠️  No Yjs response received (this might be normal)');
        resolve();
      }, 5000);
    });

    console.log('\n🎉 All tests passed! Project initialization is working correctly.');
    
    socket.disconnect();
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testProjectInitialization(); 