# Terminal Integration Documentation

## Overview
The terminal integration allows users to run shell commands directly in the Codevo cloud IDE. Each user gets their own terminal session per project, enabling collaborative development with isolated shell environments.

## Features

### Core Functionality
- **Real-time Terminal**: Full-featured terminal using xterm.js
- **Per-User Sessions**: Each user gets their own terminal session per project
- **Session Persistence**: Terminal sessions persist across page refreshes
- **Auto-reconnection**: Automatic reconnection to existing sessions
- **Responsive Design**: Terminal adapts to container size changes

### Terminal Controls
- **Clear Terminal**: Clear the terminal output
- **Restart Terminal**: Kill current session and start a new one
- **Reconnect**: Attempt to reconnect to existing session
- **Connection Status**: Visual indicator of connection status

### Special Commands
The terminal supports special commands for file management:
- `sync` - Sync files from `/workspace` to the editor
- `files` - Show current files in the editor

## Technical Implementation

### Frontend (Shell.tsx)
- **xterm.js**: Terminal emulator with WebGL acceleration
- **Socket.io**: Real-time communication with runner
- **Addons**: Fit, WebLinks, and WebGL addons for enhanced functionality
- **Responsive**: Auto-resize on window changes

### Backend (terminalManager.ts)
- **node-pty**: PTY (pseudo-terminal) creation and management
- **Session Management**: Track user sessions per project
- **Auto-cleanup**: Clean up inactive sessions after 30 minutes
- **Reconnection**: Support for session reconnection

### Socket Events

#### Client → Server
- `terminal:start` - Start a new terminal session
- `terminal:input` - Send user input to terminal
- `terminal:resize` - Resize terminal dimensions
- `terminal:clear` - Clear terminal session
- `terminal:reconnect` - Attempt to reconnect to existing session

#### Server → Client
- `terminal:data` - Terminal output data
- `terminal:info` - Terminal session information

## Usage

### Starting a Terminal
1. Open a project in Codevo
2. Click on the "Shell" tab in the terminal panel
3. Terminal automatically connects and shows the shell prompt

### Running Commands
- Type commands as you would in a regular terminal
- Use `ls`, `cd`, `npm`, `python`, `node`, `git`, etc.
- Special commands: `sync` and `files`

### File System Integration
- Terminal operates in `/workspace` directory
- Changes made in terminal are reflected in the file explorer
- Use `sync` command to sync terminal changes to editor

## Configuration

### Terminal Settings
- Font: Consolas, Courier New, monospace
- Font Size: 14px
- Theme: Dark theme optimized for development
- Scrollback: 1000 lines
- Default size: 80x24 columns

### Session Management
- Inactive session timeout: 30 minutes
- Cleanup interval: 10 minutes
- Reconnection window: 10 seconds after disconnect

## Troubleshooting

### Common Issues
1. **Terminal not connecting**: Check socket connection status
2. **Commands not working**: Ensure you're in the correct directory (`/workspace`)
3. **Session lost**: Use reconnect button or restart terminal
4. **Performance issues**: WebGL addon should improve rendering performance

### Debug Information
- Check browser console for terminal-related logs
- Look for `[Shell]` and `[TerminalManager]` log messages
- Verify socket connection status in terminal controls

## Future Enhancements
- Terminal themes customization
- Multiple terminal tabs
- Terminal history persistence
- Command auto-completion
- Terminal sharing between users 