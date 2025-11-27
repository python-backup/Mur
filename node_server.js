const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const InlineBot = require('./inline.js');

const app = express();
app.use(express.json());

console.log('Starting Node.js server...');

class ModuleLoader {
    constructor() {
        this.commands = new Map();
        this.watchers = new Map();
        this.adminManager = {
            allowedModules: [],
            isModuleAllowed: function(moduleName) {
                return this.allowedModules.includes(moduleName);
            },
            getAllowedModules: function() {
                return this.allowedModules;
            },
            updateAllowedModules: function() {
                this.allowedModules = this.getUserModules();
            },
            getUserModules: function() {
                try {
                    const userModulesPath = path.join(__dirname, 'modules', 'user');
                    if (!fs.existsSync(userModulesPath)) {
                        return [];
                    }
                    
                    const files = fs.readdirSync(userModulesPath);
                    return files
                        .filter(file => file.endsWith('.js'))
                        .map(file => file.replace('.js', ''));
                } catch (error) {
                    return [];
                }
            }
        };
        
        this.adminManager.updateAllowedModules();
        console.log('ModuleLoader initialized');
        this.loadModules();
        this.startWatching();
        this.startInlineBot();
    }

    async checkAdminRights(username) {
        try {
            const response = await axios.post('http://localhost:5000/auth/check_admin', {
                username: username
            }, { timeout: 5000 });
            return response.data.is_admin || false;
        } catch (error) {
            return false;
        }
    }

    async checkMasterRights(username) {
        try {
            const response = await axios.post('http://localhost:5000/auth/check_master', {
                username: username
            }, { timeout: 5000 });
            return response.data.is_master || false;
        } catch (error) {
            return false;
        }
    }

    async checkUserRights(username) {
        try {
            const isMaster = await this.checkMasterRights(username);
            const isAdmin = await this.checkAdminRights(username);
            
            return {
                isMaster: isMaster,
                isAdmin: isAdmin,
                isAuthorized: isMaster || isAdmin
            };
        } catch (error) {
            return {
                isMaster: false,
                isAdmin: false,
                isAuthorized: false
            };
        }
    }

    isSystemModule(moduleName) {
        const systemModules = [
            'admin_manager', 'install', 'servers', 'c_module_loader',
            'language_system', 'set_owner', 'info'
        ];
        return systemModules.includes(moduleName);
    }

    loadModules() {
        console.log('Scanning for modules...');
        
        const userModulesPath = path.join(__dirname, 'modules', 'user');
        const rootModulesPath = path.join(__dirname, 'modules', 'root');
        
        console.log('User modules path:', userModulesPath);
        console.log('Root modules path:', rootModulesPath);
        
        this.loadModulesFromDir(userModulesPath);
        this.loadModulesFromDir(rootModulesPath);
        
        console.log(`Total commands loaded: ${this.commands.size}`);
        
        if (this.commands.size === 0) {
            console.log('No commands found! Check if modules exist in modules/user/ folder');
        } else {
            console.log('Available commands:', [...this.commands.keys()].join(', '));
        }
    }

    loadModulesFromDir(dirPath) {
        console.log(`Loading from: ${dirPath}`);
        
        if (!fs.existsSync(dirPath)) {
            console.log(`Directory doesn't exist: ${dirPath}`);
            console.log(`Creating directory...`);
            fs.mkdirSync(dirPath, { recursive: true });
            return;
        }

        try {
            const files = fs.readdirSync(dirPath);
            console.log(`Files in directory: ${files.join(', ')}`);
            
            if (files.length === 0) {
                console.log('Directory is empty');
                return;
            }

            files.forEach(file => {
                if (file.endsWith('.js')) {
                    console.log(`Loading module: ${file}`);
                    this.loadModule(path.join(dirPath, file), file);
                } else {
                    console.log(`Skipping non-JS file: ${file}`);
                }
            });
        } catch (error) {
            console.error(`Error reading directory ${dirPath}:`, error.message);
        }
    }

    loadModule(modulePath, fileName) {
        const moduleName = path.basename(fileName, '.js');
        console.log(`Loading: ${moduleName} from ${modulePath}`);
        
        try {
            if (!fs.existsSync(modulePath)) {
                console.log(`File doesn't exist: ${modulePath}`);
                return;
            }

            console.log(`File exists: ${modulePath}`);

            if (require.cache[modulePath]) {
                delete require.cache[modulePath];
            }

            const module = require(modulePath);
            console.log(`Module loaded successfully: ${moduleName}`);

            if (module.commands && typeof module.commands === 'object') {
                const commandNames = Object.keys(module.commands);
                console.log(`Registering ${commandNames.length} commands from ${moduleName}: ${commandNames.join(', ')}`);
                
                Object.entries(module.commands).forEach(([command, handler]) => {
                    if (typeof handler === 'function') {
                        handler.__moduleName = moduleName;
                        handler.__modulePath = path.dirname(modulePath);
                        this.commands.set(command, handler);
                        console.log(`   Registered: ${command}`);
                    } else {
                        console.log(`   Invalid handler for command: ${command}`);
                    }
                });
            } else {
                console.log(`No 'commands' object found in module: ${moduleName}`);
            }

        } catch (error) {
            console.error(`Error loading module ${moduleName}:`, error.message);
            console.error(`   Full error:`, error);
        }
    }

    startWatching() {
        console.log('Starting file watchers for modules...');
        
        const userModulesPath = path.join(__dirname, 'modules', 'user');
        const rootModulesPath = path.join(__dirname, 'modules', 'root');
        
        this.watchDirectory(userModulesPath);
        this.watchDirectory(rootModulesPath);
    }

    watchDirectory(dirPath) {
        if (!fs.existsSync(dirPath)) {
            console.log(`Directory doesn't exist for watching: ${dirPath}`);
            return;
        }

        try {
            const watcher = fs.watch(dirPath, (eventType, filename) => {
                if (filename && filename.endsWith('.js')) {
                    console.log(`File change detected: ${filename} (${eventType})`);
                    console.log(`Reloading module: ${filename}`);
                    
                    const modulePath = path.join(dirPath, filename);
                    this.reloadModule(modulePath, filename);
                    
                    if (dirPath.includes('user')) {
                        this.adminManager.updateAllowedModules();
                        console.log('Updated admin allowed modules');
                    }
                }
            });

            this.watchers.set(dirPath, watcher);
            console.log(`Watching directory: ${dirPath}`);
            
        } catch (error) {
            console.error(`Error watching directory ${dirPath}:`, error.message);
        }
    }

    reloadModule(modulePath, fileName) {
        const moduleName = path.basename(fileName, '.js');
        
        try {
            console.log(`Reloading module: ${moduleName}`);
            
            if (require.cache[modulePath]) {
                delete require.cache[modulePath];
                console.log(`Cleared cache for: ${moduleName}`);
            }

            const oldCommands = [...this.commands.entries()]
                .filter(([_, handler]) => handler.__modulePath === modulePath)
                .map(([cmd]) => cmd);
            
            oldCommands.forEach(cmd => {
                this.commands.delete(cmd);
                console.log(`Removed old command: ${cmd}`);
            });

            const module = require(modulePath);

            if (module.commands && typeof module.commands === 'object') {
                const commandNames = Object.keys(module.commands);
                console.log(`Registering ${commandNames.length} commands from ${moduleName}: ${commandNames.join(', ')}`);
                
                Object.entries(module.commands).forEach(([command, handler]) => {
                    if (typeof handler === 'function') {
                        handler.__moduleName = moduleName;
                        handler.__modulePath = modulePath;
                        this.commands.set(command, handler);
                        console.log(`   Registered: ${command}`);
                    } else {
                        console.log(`   Invalid handler for command: ${command}`);
                    }
                });
            }

            console.log(`Module reloaded: ${moduleName}`);
            console.log(`Total commands now: ${this.commands.size}`);

        } catch (error) {
            console.error(`Error reloading module ${moduleName}:`, error.message);
        }
    }

    startInlineBot() {
        try {
            console.log('Starting inline bot...');
            this.inlineBot = new InlineBot(this);
            console.log('✅ Inline bot started successfully');
        } catch (error) {
            console.error('❌ Failed to start inline bot:', error.message);
        }
    }

    stopInlineBot() {
        if (this.inlineBot) {
            this.inlineBot.stop();
            console.log('🛑 Inline bot stopped');
        }
    }

    async executeCommand(command, data) {
        console.log(`Executing command: ${command}`);
        
        if (!this.commands.has(command)) {
            const available = [...this.commands.keys()].join(', ');
            throw new Error(`Command '${command}' not found. Available: ${available || 'none'}`);
        }

        const userRights = await this.checkUserRights(data.username);
        
        if (!userRights.isAuthorized) {
            throw new Error('Access denied. You are not authorized.');
        }

        const handler = this.commands.get(command);
        const moduleName = handler.__moduleName;
        
        if (userRights.isAdmin && !userRights.isMaster) {
            const isUserModule = handler.__modulePath.includes('user');
            if (!isUserModule) {
                const allowedModules = this.adminManager.getAllowedModules();
                throw new Error(`Админам запрещено использовать системные команды. Доступные модули: ${allowedModules.join(', ') || 'нет'}`);
            }
        }

        return await handler(data);
    }

    getAvailableCommands() {
        return Array.from(this.commands.keys());
    }

    getCommandsByUserType(username) {
        return new Promise(async (resolve) => {
            const userRights = await this.checkUserRights(username);
            const allCommands = this.getAvailableCommands();
            
            if (userRights.isMaster) {
                resolve({
                    userType: 'master',
                    commands: allCommands,
                    count: allCommands.length
                });
            } else if (userRights.isAdmin) {
                const adminCommands = allCommands.filter(cmd => {
                    const handler = this.commands.get(cmd);
                    return handler && handler.__modulePath && handler.__modulePath.includes('user');
                });
                resolve({
                    userType: 'admin',
                    commands: adminCommands,
                    count: adminCommands.length
                });
            } else {
                resolve({
                    userType: 'unauthorized',
                    commands: [],
                    count: 0
                });
            }
        });
    }

    stopWatching() {
        console.log('Stopping file watchers...');
        this.watchers.forEach((watcher, path) => {
            watcher.close();
            console.log(`Stopped watching: ${path}`);
        });
        this.watchers.clear();
    }
}

console.log('Initializing module loader...');
const moduleLoader = new ModuleLoader();

app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        commands: moduleLoader.getAvailableCommands(),
        count: moduleLoader.getAvailableCommands().length,
        timestamp: new Date().toISOString()
    });
});

app.get('/commands', (req, res) => {
    res.json({ 
        success: true,
        commands: moduleLoader.getAvailableCommands(),
        count: moduleLoader.getAvailableCommands().length
    });
});

app.post('/command/:command', async (req, res) => {
    try {
        const { command } = req.params;
        const { params, username, message } = req.body;

        console.log(`Received command: ${command}`);
        console.log(`From user: ${username || 'unknown'}`);
        console.log(`Params:`, params);

        const result = await moduleLoader.executeCommand(command, {
            username: username || 'unknown',
            params: params || {},
            message: message || null
        });

        console.log(`Command ${command} executed successfully`);
        res.json({ success: true, data: result });

    } catch (error) {
        console.error(`Command ${command} failed:`, error.message);
        res.status(400).json({ 
            success: false, 
            error: error.message,
            available_commands: moduleLoader.getAvailableCommands()
        });
    }
});

app.post('/user/commands', async (req, res) => {
    try {
        const { username } = req.body;
        
        if (!username) {
            return res.status(400).json({ error: 'Username required' });
        }

        const userCommands = await moduleLoader.getCommandsByUserType(username);
        res.json(userCommands);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/test-module', (req, res) => {
    const testModulePath = path.join(__dirname, 'modules', 'user', 'test.js');
    
    try {
        if (fs.existsSync(testModulePath)) {
            const module = require(testModulePath);
            res.json({
                exists: true,
                has_commands: !!module.commands,
                command_count: module.commands ? Object.keys(module.commands).length : 0,
                commands: module.commands ? Object.keys(module.commands) : []
            });
        } else {
            res.json({ exists: false, error: 'Test module not found' });
        }
    } catch (error) {
        res.json({ exists: true, error: error.message });
    }
});

app.post('/reload-modules', (req, res) => {
    console.log('Manual module reload requested');
    moduleLoader.loadModules();
    moduleLoader.adminManager.updateAllowedModules();
    res.json({ success: true, message: 'Modules reloaded', command_count: moduleLoader.getAvailableCommands().length });
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Node.js server running on http://0.0.0.0:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Commands: http://localhost:${PORT}/commands`);
    console.log(`Reload modules: http://localhost:${PORT}/reload-modules`);
    console.log(`Test module: http://localhost:${PORT}/test-module`);
    console.log(`Summary: ${moduleLoader.getAvailableCommands().length} commands loaded`);
    console.log(`File watchers active - modules will auto-reload on changes`);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down...');
    moduleLoader.stopWatching();
    moduleLoader.stopInlineBot();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down...');
    moduleLoader.stopWatching();
    moduleLoader.stopInlineBot();
    process.exit(0);
});