const { getChannel } = require('../lib/rabbitmq');

const QUEUE = process.env.EMAIL_QUEUE_NAME || 'email_queue';

async function assertQueue() {
    const ch = await getChannel();
    await ch.assertQueue(QUEUE, { durable: true });
    return ch;
}

async function enqueueEmail(job) {
    const ch = await assertQueue();
    const payload = Buffer.from(JSON.stringify(job));
    const ok = ch.sendToQueue(QUEUE, payload, { persistent: true, contentType: 'application/json' });
    if (!ok) throw new Error('Failed to enqueue email job');
}

module.exports = { enqueueEmail, QUEUE };


