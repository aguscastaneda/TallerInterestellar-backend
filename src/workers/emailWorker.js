require('dotenv').config();
const { getChannel } = require('../lib/rabbitmq');
const { QUEUE } = require('../queues/emailQueue');
const emailService = require('../services/emailService');

async function handleJob(job) {
    const { type, payload } = job;
    switch (type) {
        case 'sendEmail':
            return emailService.sendEmail(payload);
        case 'welcomeEmail':
            return emailService.sendWelcomeEmail(payload.email, payload.name, payload.roleName);
        case 'registrationConfirmation':
            return emailService.sendRegistrationConfirmation(payload.email, payload.name, payload.loginDateTime);
        case 'passwordReset':
            return emailService.sendPasswordResetEmail(payload.email, payload.name, payload.token);
        case 'carStateChange':
            return emailService.sendCarStateChangeNotification(payload.carData, payload.previousState || null);
        case 'budgetEmail':
            return emailService.sendBudgetEmail(payload.carData, payload.budgetData);
        case 'testEmail':
            return emailService.sendTestEmail(payload.email);
        default:
            throw new Error(`Unknown email job type: ${type}`);
    }
}

async function start() {
    const ch = await getChannel();
    await ch.assertQueue(QUEUE, { durable: true });
    ch.prefetch(5);
    console.log(`[worker] email worker consuming ${QUEUE}`);

    ch.consume(QUEUE, async (msg) => {
        if (!msg) return;
        try {
            const job = JSON.parse(msg.content.toString());
            await handleJob(job);
            ch.ack(msg);
        } catch (err) {
            console.error('[worker] email job failed', err.message);
            ch.nack(msg, false, false);
        }
    }, { noAck: false });
}

start().catch((e) => {
    console.error('[worker] failed to start', e);
    process.exit(1);
});


