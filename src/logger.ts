import * as log4js from 'log4js';
import { Globals } from './globals';

export class Logger {

    static logger = null;

    static appenders: any = null;

    static categories: any = null;

    static logDir = '';

    static logLevel = 'debug';

    static loggersCreated = 0;

    static init(args: any) {
        this.logDir = args.log_dir ? args.log_dir : 'logs';
        this.logLevel = args.log_level ? args.log_level : 'debug';

        const logFilePath = this.logDir + '/worker_' + Globals.workerId
            + '.log';

        console.log("[LOG FILE] " + logFilePath + " [LOG LEVEL] "
            + this.logLevel);

        this.appenders = {
            file: { type: 'file', filename: logFilePath, flags: 'w' },
            console: { type: 'console' }
        };

        this.categories = {
            default: { appenders: ['file', 'console'], level: this.logLevel }
        };

        log4js.configure({
            appenders: this.appenders,
            categories: this.categories,
        });

        this.logger = log4js.getLogger();
    }

    static getLogger(name: string): any {
        //console.log(JSON.stringify(this.appenders));
        //console.log(JSON.stringify(this.categories));

        if (!this.categories[name]) {
            const logFilePath = this.logDir + '/' + name + '.log';

            this.appenders[name] = {
                type: 'file', filename: logFilePath, flags: 'w'
            };

            this.categories[name] = {
                appenders: [name, 'console'], level: this.logLevel
            };

            log4js.configure({
                appenders: this.appenders,
                categories: this.categories,
            });

            this.loggersCreated += 1;

            //this.logger = log4js.getLogger();
            this.logger.info('Created logger ' + name + '; total '
                + this.loggersCreated);
        }

        return log4js.getLogger(name);
    }

    static trace(msg: string, logPrefix: string = '') {
        this.logger.trace(logPrefix + msg);
    }

    static debug(msg: string, logPrefix: string = '') {
        this.logger.debug(logPrefix + msg);
    }

    static info(msg: string, logPrefix: string = '') {
        this.logger.info(logPrefix + msg);
    }

    static warn(msg: string, logPrefix: string = '') {
        this.logger.warn(logPrefix + msg);
    }

    static error(msg: string, logPrefix: string = '') {
        this.logger.error(logPrefix + msg);
    }
}
