#!/usr/bin/env node

/**
 * Prestart guard script
 * Fails fast if port 4001 is already in use
 * Prevents "ghost" servers and confusing states
 */

const net = require('net');

const PORT = 4001;
const HOST = '0.0.0.0';

function checkPort(port, host) {
    return new Promise((resolve, reject) => {
        const server = net.createServer();

        server.listen(port, host, () => {
            server.once('close', () => {
                resolve(true);
            });
            server.close();
        });

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                reject(new Error(`Port ${port} is already in use. Please kill the existing process first.`));
            } else {
                reject(err);
            }
        });
    });
}

async function main() {
    try {
        console.log(`🔍 Checking if port ${PORT} is available...`);
        await checkPort(PORT, HOST);
        console.log(`✅ Port ${PORT} is available`);
        process.exit(0);
    } catch (error) {
        console.error(`❌ ${error.message}`);
        console.error(`💡 To kill existing processes on port ${PORT}:`);
        console.error(`   lsof -ti:${PORT} | xargs kill -9`);
        console.error(`   or`);
        console.error(`   pkill -f "node.*server"`);
        process.exit(1);
    }
}

main();

