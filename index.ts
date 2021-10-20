import * as Discord from 'discord.js';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const newWorldBearer = 'Bearer ' + process.env.NEW_WORLD_STATUS_API_KEY;
const serverId = process.env.SERVER
const client = new Discord.Client();

client.login(process.env.TOKEN);

const serverCommand = '!nw'
interface IServerCommand {
    command: string | null;
    context: string | null;
}

export const parseServerCommand = (content: string): IServerCommand => {
    const normalized = content.toLocaleLowerCase().trim();
    const splitMessage = normalized ? normalized.split(' ') : [];
    if (!splitMessage[0] || splitMessage[0] !== serverCommand) {
        return {} as IServerCommand;
    }

    return {command: splitMessage[1] ? splitMessage[1].toLocaleLowerCase().trim() : null, context: splitMessage[2] ? splitMessage[2].toLocaleLowerCase().trim() : null}
}

let lastMessageTime: number | null = null
const sec = 2; // Seconds to wait between messages.

client.on('message', async (message) => {
    // don't respond to messages from self
    if (message.author.id === client.user?.id) {
        return;
    }
    if (message && message.content) {
        if (lastMessageTime && message.createdTimestamp - (sec * 1000) < lastMessageTime) {
            return;
        }
        lastMessageTime = message.createdTimestamp;
        const {context, command} = parseServerCommand(message.content);
        if (command === 'stats' && context) {
            message.channel.send(`Looking up stats for ${context}...`);
            const stats = await getNewWorldStatusHtml(context);
            if (stats) {
                message.channel.send(`Stats for ${stats.name}:\nQueue: ${stats.queueLength}\nWait Time: ${stats.waitTime}\nCurrent Player Count: ${stats.population}`)
            } else {
                message.channel.send(`Unable to retrieve server stats for ${context}`);
            }
        }
    }
})

interface INewWorldApiResponseDataMessage {
    players_current: number,
    players_maximum: number,
    queue_current: number,
    queue_wait_time_minutes: number,
    status_enum: string
}
interface INewWorldApiResponseData {
    success: boolean,
    via: string,
    message: INewWorldApiResponseDataMessage
}
interface IServerStatus {
    population: number;
    waitTime: number;
    name: string;
    queueLength: number
}

async function apiRequest(serverName: string): Promise<INewWorldApiResponseData | null> {
    const response = await fetch(`https://firstlight.newworldstatus.com/ext/v1/worlds/${serverName.toLowerCase()}`, {
        method: 'GET',
        headers: {
            'Authorization': newWorldBearer,
            'Content-Type': 'application/json'
        }
    });
    if (!response.ok) {
        console.log(JSON.stringify(response));
        console.log(response.status);
        console.log(response.statusText);
        return null;
    }
   return response.json() as Promise<INewWorldApiResponseData>
}

const getNewWorldStatusHtml = async (serverName: string): Promise<IServerStatus | null> => {
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
        } as IServerStatus
    } catch (e) {
        console.log(e);
        return null;
    }
}

