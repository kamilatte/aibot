import { Client, GatewayIntentBits } from 'discord.js';
import fetch from 'node-fetch';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const OLLAMA_ENDPOINT = 'http://localhost:11434/api/generate/';

const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:128.0) Gecko/20100101 Firefox/128.0',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Referer': 'http://localhost:5173/',
    'Content-Type': 'application/json',
    'Origin': 'http://localhost:5173',
    'DNT': '1',
    'Sec-GPC': '1',
    'Connection': 'keep-alive',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site',
    'Priority': 'u=4'
};

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    try {
        // Log all messages received
        console.log(`Message from ${message.author.tag}: ${message.content}`);

        // Check if the message starts with the prefix 'n!'
        if (!message.content.startsWith('n!')) return;

        // Ignore messages from bots
        if (message.author.bot) return;

        // Extract the command without the prefix 'n!'
        const query = message.content.slice('n!'.length).trim();
        console.log(`Command received: ${query}`);

        // Call function to fetch response from Ollama API
        const responseMessage = await getOllamaResponses(query);

        if (responseMessage) {
            await message.reply(responseMessage);
            console.log(`Response sent to ${message.channel.name}: ${responseMessage}`);
        } else {
            console.log(`No response generated for query: ${query}`);
        }
    } catch (error) {
        console.error(`Error processing message: ${error}`);
    }
});

async function getOllamaResponses(query) {
    try {
        const response = await fetch(OLLAMA_ENDPOINT, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                model: 'llama2-uncensored:latest',
                prompt: query
            })
        });

        if (!response.ok) {
            console.error(`Ollama server responded with status ${response.status}`);
            return `Error: Ollama server responded with status ${response.status}`;
        }

        let responseData = ''; // Variable to accumulate response data

        // Read response body as text
        const rawResponse = await response.text();

        // Split raw response by newline characters to handle potential concatenated JSON objects
        const responseArray = rawResponse.trim().split('\n').filter(Boolean);

        // Process each JSON object in the array
        let finalResponse = '';
        for (const jsonString of responseArray) {
            try {
                const jsonData = JSON.parse(jsonString);
                if (jsonData.response) {
                    finalResponse += jsonData.response + '';
                } else {
                    console.error('Invalid JSON format: Missing "response" field');
                }
            } catch (error) {
                console.error(`Error parsing JSON response: ${error}`);
            }
        }

        console.log(`Final Ollama response received: ${finalResponse.trim()}`); // Log the final combined response

        return finalResponse.trim(); // Return trimmed response
    } catch (error) {
        console.error(`Error connecting to Ollama server: ${error}`);
        return `Error connecting to Ollama server: ${error}`;
    }
}

client.login(TOKEN).catch((error) => console.error(`Failed to log in: ${error}`));
