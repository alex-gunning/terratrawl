import winston from 'winston';
const { combine, timestamp, json } = winston.format;

const logger = winston.createLogger({
  level: "info",
  format: combine(timestamp(), json()),
  transports: [
    new winston.transports.Console({
      level: 'info',
      format: winston.format.combine(
        new Set(['dev', 'tst', 'stg', 'prd']).has(process.env.DD_ENV!) ? winston.format.json() : winston.format.colorize(),
        winston.format.simple()
      )
    })
  ],
});
export const extractError = ({ message, name, stack }: Error) => ({ error: { message, kind: name, stack } });

export { logger };
