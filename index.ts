import * as Discord from 'discord.js';
import * as dotenv from 'dotenv';
import puppeteer from 'puppeteer'

dotenv.config();

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
            message.channel.send(`Looking up stats for ${context}, this may take a while...`);
            const stats = await getNewWorldStatusHtml(context);
            if (stats) {
                message.channel.send(`Stats for ${stats.name}:\nQueue: ${stats.population} | Wait Time: ${stats.waitTime}`)
            } else {
                message.channel.send(`Unable to retrieve server stats for ${context}`);
            }
        }
    }
})

interface IServerStatus {
    population: string;
    waitTime: string;
    name: string;
}
const getNewWorldStatusHtml = async (serverName: string): Promise<IServerStatus | null> => {
    try {
        const url = 'https://newworldstatus.com/';
        const browser = await puppeteer.launch({headless: true});
        const page = await browser.newPage();
        await page.goto(url);
        await page.waitForSelector('.text-end');
        const stuff = await page.evaluate(() => {
            let rows: any[] = [];
            window.document.querySelectorAll("table#db76b9e516bd > tbody > tr").forEach(rowNode => {
                const el: (string | null)[] = [];
                rowNode.querySelectorAll('td').forEach(cell => el.push(cell.textContent));
                rows.push(el)
            })
            return rows;
        });
        const myServer = stuff.find(x => x[1].toLocaleLowerCase() === serverName.toLocaleLowerCase());
        console.log(myServer);
        if (!myServer || !myServer.length) {
            return null;
        }
        return {
            name: myServer[1] as string,
            population: myServer[5] as string,
            waitTime: myServer[6] as string
        } as IServerStatus
    } catch (e) {
        return null;
    }
}

