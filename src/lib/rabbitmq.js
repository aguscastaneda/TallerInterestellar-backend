const amqp = require('amqplib');

const amqpUrl = process.env.RABBITMQ_URL;
const amqpHost = process.env.RABBITMQ_HOST;
const amqpUser = process.env.RABBITMQ_USER;
const amqpPass = process.env.RABBITMQ_PASSWORD;
const amqpVhost = process.env.RABBITMQ_VHOST || '/';

let connection;
let channel;

function resolveUrl() {
    if (amqpUrl) return amqpUrl;
    const creds = `${encodeURIComponent(amqpUser)}:${encodeURIComponent(amqpPass)}`;
    return `amqps://${creds}@${amqpHost}/${encodeURIComponent(amqpVhost)}`;
}

async function getChannel() {
    if (channel) return channel;
    const url = resolveUrl();
    connection = await amqp.connect(url);
    channel = await connection.createChannel();
    connection.on('close', () => {
        channel = null;
        connection = null;
        console.warn('[amqp] connection closed');
    });
    console.log('[amqp] connected');
    return channel;
}

async function closeRabbit() {
    try {
        if (channel) await channel.close();
        if (connection) await connection.close();
    } catch (e) {
        console.error('[amqp] error on close', e);
    } finally {
        channel = null;
        connection = null;
    }
}

module.exports = { getChannel, closeRabbit };


