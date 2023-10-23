import pino from 'pino';

const logger = pino({
    transport: {
        target: 'pino-pretty',
        option: {
            translateTime: true,
            ignore: ''
        }
    }
});

export default logger;