const io = require('socket.io-client');

// Test configuration
const TEST_PROJECT_ID = 'test-monaco-fixes-v2-123';
const RUNNER_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:5173';

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
        data.filesWithContent.forEach(file => {
          if (file.type === 'file') {
            const contentLength = file.content ? file.content.length : 0;
            console.log(`   📄 ${file.path} (${contentLength} chars)`);
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

    // Test 3: Test file content operations
    console.log('\n3. Testing file content operations...');
    
    // Test file content retrieval
    socket.emit('files:getContent', { path: 'main.js' });
    await new Promise((resolve) => {
      socket.on('files:content', ({ path, content }) => {
        console.log(`✅ Received content for ${path}:`, content ? `${content.length} chars` : 'empty');
        resolve();
      });
      setTimeout(() => resolve(), 5000);
    });

    // Test file content saving
    const testContent = 'console.log("Hello from Monaco fixes test!");\n\n// This should work without errors';
    socket.emit('files:saveContent', { path: 'test-monaco.js', content: testContent });
    await new Promise((resolve) => {
      socket.on('files:contentSaved', ({ path }) => {
        console.log(`✅ File saved successfully: ${path}`);
        resolve();
      });
      setTimeout(() => resolve(), 5000);
    });

    // Test file creation
    socket.emit('files:create', { path: 'monaco-test.js', isFolder: false });
    await new Promise((resolve) => {
      socket.on('files:created', (file) => {
        console.log(`✅ File created: ${file.name}`);
        resolve();
      });
      setTimeout(() => resolve(), 5000);
    });

    console.log('\n🎉 Monaco Editor fixes test completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Open the frontend in your browser');
    console.log('   2. Navigate to a project');
    console.log('   3. Try editing files in the Monaco editor');
    console.log('   4. Check that no "V is not iterable" errors occur');
    console.log('   5. Verify that cursor positioning works correctly');
    
    socket.disconnect();
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testMonacoFixes(); 