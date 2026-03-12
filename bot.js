const mineflayer = require('mineflayer');
const fileConfig = require('./config.json');

class MinecraftBot {
    constructor(options = {}) {
        this.options = options;
        this.bot = null;
        this.isMoving = false;
        this.followInterval = null;

        this.config = options.configOverride || fileConfig;
        this.log = typeof options.logger === 'function' ? options.logger : console.log;
    }

    async connect() {
        try {
            this.log('Connecting to Minecraft server...');
            
            const cfg = this.config;
            const host = cfg?.server?.host;
            const port = cfg?.server?.port;
            const username = cfg?.bot?.username;

            if (!host || !port || !username) {
                throw new Error('Missing config: server.host, server.port, bot.username');
            }

            // Add random delay to seem more human
            const delay = Math.random() * 8000 + 4000; // 4-12 seconds
            this.log(`Waiting ${Math.round(delay/1000)}s before connecting...`);
            await new Promise(resolve => setTimeout(resolve, delay));

            this.bot = mineflayer.createBot({
                host,
                port,
                username,
                password: cfg?.bot?.password || undefined,
                auth: cfg?.bot?.auth || 'offline',
                version: cfg?.server?.version || false,
                hideErrors: false,
                connectTimeout: 30000, // 30 second timeout
                checkTimeoutInterval: 45*1000,
                closeTimeout: 90*1000,
                keepAlive: true,
                noPingResponse: false,
                closeOnError: false
            });

            this.setupEventListeners();
            return new Promise((resolve, reject) => {
                this.bot.once('login', () => {
                    this.log(`Bot connected as ${this.bot.username}`);
                    resolve();
                });

                this.bot.once('error', (err) => {
                    this.log(`Connection error: ${err?.message || err}`);
                    reject(err);
                });
            });
        } catch (error) {
            this.log(`Failed to connect: ${error?.message || error}`);
            throw error;
        }
    }

    setupEventListeners() {
        this.bot.on('chat', (username, message) => {
            if (username === this.bot.username) return;

            this.log(`[Chat] ${username}: ${message}`);
            this.handleChatCommand(username, message);
        });

        this.bot.on('spawn', () => {
            this.log('Bot spawned in world');
        });

        this.bot.on('death', () => {
            this.log('Bot died!');
        });

        this.bot.on('respawn', () => {
            this.log('Bot respawned!');
        });

        this.bot.on('error', (err) => {
            this.log(`Bot error: ${err?.message || err}`);
        });

        this.bot.on('end', (reason) => {
            this.log(`Bot disconnected. Reason: ${reason || 'unknown'}`);
            
            // Exponential backoff retry
            if (!this.retryCount) this.retryCount = 0;
            this.retryCount++;
            
            if (this.retryCount <= 3) {
                const backoff = Math.pow(2, this.retryCount) * 5000; // 5s, 10s, 20s, 40s
                this.log(`Retrying in ${backoff/1000}s... (attempt ${this.retryCount}/3)`);
                
                setTimeout(() => {
                    this.connect().catch(err => {
                        this.log(`Retry failed: ${err?.message || err}`);
                    });
                }, backoff);
            } else {
                this.log('Max retries reached. Please check server settings.');
            }
        });

        this.bot.on('kicked', (reason, loggedIn) => {
            this.log(`Bot kicked. Reason: ${reason} Logged in: ${loggedIn}`);
        });
    }

    handleChatCommand(username, message) {
        const args = message.split(' ');
        const command = args[0].toLowerCase();

        switch (command) {
            case '!follow':
                this.followPlayer(args[1]);
                break;
            case '!stop':
                this.stopMovement();
                break;
            case '!come':
                this.comeToPlayer(username);
                break;
            case '!walk':
                this.walk(parseInt(args[1]) || 10);
                break;
            case '!jump':
                this.jump();
                break;
            case '!look':
                this.lookAtPlayer(username);
                break;
            case '!say':
                this.chat(args.slice(1).join(' '));
                break;
            case '!cmd':
                this.executeCommand(args.slice(1).join(' '));
                break;
            case '!help':
                this.showHelp();
                break;
        }
    }

    async walk(distance) {
        if (this.isMoving) {
            this.chat("I'm already moving!");
            return;
        }

        this.isMoving = true;
        this.log(`Walking ${distance} blocks forward`);

        const controlState = { forward: true };
        this.bot.setControlState('forward', true);

        setTimeout(() => {
            this.bot.setControlState('forward', false);
            this.isMoving = false;
            this.log('Stopped walking');
        }, distance * 1000);
    }

    jump() {
        this.bot.setControlState('jump', true);
        setTimeout(() => {
            this.bot.setControlState('jump', false);
        }, 500);
        this.log('Jumped!');
    }

    stopMovement() {
        this.bot.clearControlStates();
        this.isMoving = false;
        this.log('Stopped all movement');
        this.chat('Stopped!');
    }

    async followPlayer(playerName) {
        if (!playerName) {
            this.chat('Please specify a player name: !follow <player>');
            return;
        }

        const player = this.bot.players[playerName];
        if (!player) {
            this.chat(`Player ${playerName} not found`);
            return;
        }

        this.chat(`Following ${playerName}`);
        this.log(`Following player: ${playerName}`);

        const follow = () => {
            if (!player || !player.entity) return;

            const distance = this.bot.entity.position.distanceTo(player.entity.position);
            if (distance > 3) {
                this.bot.lookAt(player.entity.position);
                this.bot.setControlState('forward', true);
            } else {
                this.bot.setControlState('forward', false);
            }
        };

        this.followInterval = setInterval(follow, 100);
    }

    async comeToPlayer(playerName) {
        const player = this.bot.players[playerName];
        if (!player) {
            this.chat(`Player ${playerName} not found`);
            return;
        }

        this.chat(`Coming to ${playerName}`);
        this.log(`Moving to player: ${playerName}`);

        try {
            await this.bot.pathfinder.goto(player.entity.position);
            this.chat(`I'm here, ${playerName}!`);
        } catch (error) {
            this.log(`Failed to reach player: ${error?.message || error}`);
            this.chat('I cannot reach you!');
        }
    }

    lookAtPlayer(playerName) {
        const player = this.bot.players[playerName];
        if (!player) {
            this.chat(`Player ${playerName} not found`);
            return;
        }

        this.bot.lookAt(player.entity.position);
        this.chat(`Looking at ${playerName}`);
    }

    chat(message) {
        if (this.bot && message) {
            this.bot.chat(message);
            this.log(`[Bot] ${message}`);
        }
    }

    executeCommand(command) {
        if (!command) {
            this.chat('Please provide a command: !cmd <command>');
            return;
        }

        this.log(`Executing command: ${command}`);
        this.bot.chat(`/${command}`);
    }

    showHelp() {
        const helpMessage = `
Available commands:
!follow <player> - Follow a player
!stop - Stop all movement
!come - Come to you
!walk <distance> - Walk forward (default: 10 blocks)
!jump - Jump
!look <player> - Look at a player
!say <message> - Say something
!cmd <command> - Execute a server command
!help - Show this help message
`;
        this.chat(helpMessage.trim());
    }

    disconnect() {
        if (this.followInterval) {
            clearInterval(this.followInterval);
            this.followInterval = null;
        }
        if (this.bot) {
            this.bot.end();
        }
        this.log('Bot disconnected');
    }
}

module.exports = MinecraftBot;

if (require.main === module) {
    (async () => {
        const bot = new MinecraftBot();
        try {
            await bot.connect();

            process.on('SIGINT', () => {
                bot.log('Shutting down bot...');
                bot.disconnect();
                process.exit(0);
            });
        } catch (error) {
            bot.log(`Failed to start bot: ${error?.message || error}`);
            process.exit(1);
        }
    })().catch((e) => {
        console.error(e);
        process.exit(1);
    });
}
