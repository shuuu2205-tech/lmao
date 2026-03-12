# Minecraft Bot

A Minecraft bot that can connect to servers, move, chat, and execute commands using the mineflayer library.

## Features

- **Server Connection**: Connect to any Minecraft server
- **Movement**: Walk, jump, follow players, and navigate
- **Chat**: Send messages and respond to chat commands
- **Command Execution**: Execute server commands
- **Player Interaction**: Follow, come to, and look at players

## Installation

1. Install Node.js if you haven't already
2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

Edit `config.json` to set your server details:

```json
{
  "server": {
    "host": "localhost",
    "port": 25565,
    "version": false
  },
  "bot": {
    "username": "BotPlayer",
    "password": "",
    "auth": "offline"
  }
}
```

- `host`: Server IP address
- `port`: Server port (default: 25565)
- `version`: Minecraft version (false for auto-detect)
- `username`: Bot's display name
- `password`: Leave empty for offline mode, or your Minecraft password for online mode
- `auth`: Set to "microsoft" for Microsoft accounts, "mojang" for Mojang accounts, or "offline" for cracked servers

## Usage

Start the bot:
```bash
npm start
```

## Web Control Panel

This project includes a web control panel.

### Run locally

```bash
npm install
npm start
```

Then open:

- http://localhost:3000

### API endpoints

- `GET /api/status`
- `POST /api/start`
- `POST /api/stop`
- `POST /api/chat`
- `POST /api/command`
- `GET /api/logs` (Server-Sent Events stream)

### Security (recommended)

Set an environment variable `BOT_CONTROL_TOKEN` on the server.
Then, in the panel, enter the same token in **Control Token**.

### Render deployment notes

On Render, set:

- `BOT_CONTROL_TOKEN` (recommended)
- `PORT` is set automatically by Render

## Chat Commands

Once in-game, use these commands in chat:

- `!follow <player>` - Follow a specific player
- `!stop` - Stop all movement
- `!come` - Make the bot come to your position
- `!walk <distance>` - Walk forward (default: 10 blocks)
- `!jump` - Jump
- `!look <player>` - Look at a specific player
- `!say <message>` - Make the bot say something
- `!cmd <command>` - Execute a server command (e.g., `!cmd gamemode creative`)
- `!help` - Show all available commands

## Examples

- Make the bot follow you: `!follow YourUsername`
- Make the bot come to you: `!come`
- Make the bot say hello: `!say Hello everyone!`
- Execute a server command: `!cmd time set day`

## Requirements

- Node.js 14 or higher
- Minecraft server access
- Internet connection (for online mode)

## Notes

- The bot works in both online and offline mode
- Make sure the server allows bots (some servers have anti-bot plugins)
- Use Ctrl+C to stop the bot gracefully
- The bot will automatically respawn if it dies

## Troubleshooting

- **Connection failed**: Check your server IP and port in config.json
- **Authentication failed**: Make sure your password is correct for online mode
- **Bot can't move**: Check if the server has movement restrictions or anti-cheat plugins
- **Commands not working**: Make sure you're using the correct command format with `!` prefix
