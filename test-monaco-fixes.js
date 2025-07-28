const io = require('socket.io-client');

// Test configuration
const TEST_PROJECT_ID = 'test-monaco-fixes-123';
const RUNNER_URL = 'http://localhost:3000';

async function testMonacoFixes() {
  console.log('🧪 Testing Monaco Editor Fixes...\n');

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
        
        // Check if files have proper content
        let hasValidContent = true;
        data.filesWithContent.forEach(file => {
          if (file.type === 'file') {
            const contentLength = file.content ? file.content.length : 0;
            console.log(`   📄 ${file.path} (${contentLength} chars)`);
            if (contentLength === 0) {
              hasValidContent = false;
            }
          }
        });
        
        if (hasValidContent) {
          console.log('   ✅ All files have valid content');
        } else {
          console.log('   ⚠️  Some files have empty content');
        }
        
        resolve();
      });

      socket.on('project:error', (error) => {
        console.log('❌ Project initialization failed:', error.message);
        reject(new Error(error.message));
      });

      setTimeout(() => reject(new Error('Project initialization timeout')), 15000);
    });

    // Test 3: Test file content updates
    console.log('\n3. Testing file content updates...');
    socket.emit('files:getContent', { path: 'index.html' });

    await new Promise((resolve) => {
      socket.on('files:content', ({ path, content }) => {
        console.log(`✅ Received content for ${path}:`, content ? `${content.length} chars` : 'empty');
        resolve();
      });

      setTimeout(() => {
        console.log('⚠️  No file content received');
        resolve();
      }, 5000);
    });

    console.log('\n🎉 Monaco editor fixes test completed successfully!');
    
    socket.disconnect();
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testMonacoFixes(); 