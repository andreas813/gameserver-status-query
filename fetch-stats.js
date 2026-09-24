const fs = require('fs/promises');
const { GameDig } = require('gamedig');
const ftp = require('basic-ftp');
require('dotenv').config();

const OUTPUT_PATH = './stats.json';

const gamedigServers = [
    { id: 'arma', type: 'arma3', host: process.env.IP_ARMA, port: parseInt(process.env.PORT_ARMA) },
    // { id: 'mc_vanilla', type: 'minecraft', host: process.env.IP_MC_VANILLA, port: parseInt(process.env.PORT_MC_VANILLA) },
    // { id: 'mc_mod1', type: 'minecraft', host: process.env.IP_MC_MOD1, port: parseInt(process.env.PORT_MC_MOD1) },
    // { id: 'mc_mod2', type: 'minecraft', host: process.env.IP_MC_MOD2, port: parseInt(process.env.PORT_MC_MOD2) },
    // { id: 'mc_hc', type: 'minecraft', host: process.env.IP_MC_HC, port: parseInt(process.env.PORT_MC_HC) },
    { id: 'valheim', type: 'valheim', host: process.env.IP_VALHEIM, port: parseInt(process.env.PORT_VALHEIM) },
    { id: 'teamspeak', type: 'teamspeak3', host: process.env.IP_TEAMSPEAK, port: parseInt(process.env.PORT_TEAMSPEAK) },

    // Palworld (mit REST-API Credentials)
    {
        id: 'palworld',
        type: 'palworld',
        host: process.env.IP_PALWORLD,
        port: parseInt(process.env.PORT_PALWORLD),
        username: 'admin',
        password: process.env.PALWORLD_ADMIN_PASS
    },

    // Trackmania (mit XML-RPC Login)
    // {
    //     id: 'trackmania',
    //     type: 'trackmaniaforever',
    //     host: process.env.IP_TRACKMANIA,
    //     port: parseInt(process.env.PORT_TRACKMANIA),
    //     login: process.env.TM_LOGIN,
    //     password: process.env.TM_PASS
    // },

    // Discord (ohne IP/Port, nur Guild ID)
    {
        id: 'discord',
        type: 'discord',
        guildId: process.env.DISCORD_GUILD_ID
    }
];

async function uploadToWebhosting() {
    const client = new ftp.Client();
    try {
        await client.access({
            host: process.env.FTP_HOST,
            user: process.env.FTP_USER,
            password: process.env.FTP_PASS,
            secure: true
        });
        await client.cd(process.env.FTP_REMOTE_DIR);
        await client.uploadFrom(OUTPUT_PATH, 'stats.json');
        console.log('Upload zum Webhosting erfolgreich.');
    } catch (err) {
        console.error('FTP Upload-Fehler:', err.message);
    } finally {
        client.close();
    }
}

async function generateStats() {
    console.log('Starte Server-Abfragen...');
    const results = {};

    const queries = gamedigServers.map(server => {
        // Basis-Optionen für GameDig
        const queryOptions = {
            type: server.type,
            maxAttempts: 1,
            socketTimeout: 2000
        };

        // Dynamische Parameter anhängen
        if (server.host) queryOptions.host = server.host;
        if (server.port) queryOptions.port = server.port;
        if (server.guildId) queryOptions.guildId = server.guildId;
        if (server.username) queryOptions.username = server.username;
        if (server.login) queryOptions.login = server.login;
        if (server.password) queryOptions.password = server.password;

        return GameDig.query(queryOptions).then(state => ({
            id: server.id,
            status: 'online',
            players: state.players ? state.players.length : 0,
            maxPlayers: state.maxplayers || 0,
            map: state.map || 'N/A'
        })).catch((err) => {
            console.log(`[DEBUG] ${server.id} offline: ${err.message}`);
            return { id: server.id, status: 'offline' };
        });
    });

    const settledQueries = await Promise.allSettled(queries);
    settledQueries.forEach(result => {
        if (result.status === 'fulfilled') {
            const data = result.value;
            results[data.id] = data;
        }
    });

    try {
        await fs.writeFile(OUTPUT_PATH, JSON.stringify(results, null, 2));
        console.log('Lokale stats.json aktualisiert.');
        await uploadToWebhosting();
    } catch (error) {
        console.error('Fehler beim Schreiben der JSON-Datei:', error);
    }
}

generateStats();