"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseServerCommand = void 0;
const Discord = __importStar(require("discord.js"));
const dotenv = __importStar(require("dotenv"));
const node_fetch_1 = __importDefault(require("node-fetch"));
dotenv.config();
console.log('oh look im a server');
const newWorldBearer = 'Bearer ' + process.env.NEW_WORLD_STATUS_API_KEY;
const serverId = process.env.SERVER;
const client = new Discord.Client();
client.login(process.env.TOKEN);
const serverCommand = '!nw';
const parseServerCommand = (content) => {
    const normalized = content.toLocaleLowerCase().trim();
    const splitMessage = normalized ? normalized.split(' ') : [];
    if (!splitMessage[0] || splitMessage[0] !== serverCommand) {
        return {};
    }
    return { command: splitMessage[1] ? splitMessage[1].toLocaleLowerCase().trim() : null, context: splitMessage[2] ? splitMessage[2].toLocaleLowerCase().trim() : null };
};
exports.parseServerCommand = parseServerCommand;
let lastMessageTime = null;
const sec = 2; // Seconds to wait between messages.
client.on('message', async (message) => {
    console.log('got a message!');
    // don't respond to messages from self
    if (message.author.id === client.user?.id) {
        return;
    }
    if (message && message.content) {
        if (lastMessageTime && message.createdTimestamp - (sec * 1000) < lastMessageTime) {
            return;
        }
        lastMessageTime = message.createdTimestamp;
        const { context, command } = (0, exports.parseServerCommand)(message.content);
        if (command === 'stats' && context) {
            message.channel.send(`Looking up stats for ${context}...`);
            const stats = await getNewWorldStatusHtml(context);
            if (stats) {
                message.channel.send(`Stats for ${stats.name}:\nQueue: ${stats.queueLength}\nWait Time: ${stats.waitTime}\nCurrent Player Count: ${stats.population}`);
            }
            else {
                message.channel.send(`Unable to retrieve server stats for ${context}`);
            }
        }
    }
});
async function apiRequest(serverName) {
    const response = await (0, node_fetch_1.default)(`https://firstlight.newworldstatus.com/ext/v1/worlds/${serverName.toLowerCase()}`, {
        method: 'GET',
        headers: {
            'Authorization': newWorldBearer,
            'Content-Type': 'application/json'
        }
    });
    if (!response.ok) {
        const foo = await response.text();
        console.log(foo);
        console.log(response);
        console.log(response.headers);
        console.log(response.url);
        console.log(response.status);
        console.log(response.statusText);
        return null;
    }
    return response.json();
}
const getNewWorldStatusHtml = async (serverName) => {
    try {
        const data = await apiRequest(serverName);
        if (!data?.success) {
            console.log('data was returned but was not successful');
            console.log(data);
            return null;
        }
        return {
            name: serverName,
            population: data.message.players_current,
            waitTime: data.message.queue_wait_time_minutes,
            queueLength: data.message.queue_current
        };
    }
    catch (e) {
        console.log(e);
        return null;
    }
};
