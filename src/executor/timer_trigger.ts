import { timer, Subject } from 'rxjs';
import { Logger } from '../logger';

export class TimerTrigger {

    subject = new Subject<void>();

    subscription: any = null;

    logPrefix: string = '';

    /// ms
    interval = -1;

    /// If `intervalWindow` > 0, the actual interval would be a random value
    /// from the range [`interval`; `interval` + `intervalWindow`].
    intervalWindow = 0;

    constructor(prefix: string, data?: any) {
        this.logPrefix = prefix + 'TimerTrigger ';
        if (data) {
            this.update(data);
        }

        this.subject.subscribe(() => {
            Logger.info('activated', this.logPrefix);
        });
    }

    update(data) {
        if (data.interval === null) {
            return;
        }

        const prev = this.interval;
        if (prev === data.interval) {
            return;
        }

        this.interval = data.interval;
        this.intervalWindow = data.interval_window || 0;

        Logger.info(`interval update: ${prev} --> ${this.interval};`
            + ` interval window: ${this.intervalWindow}`,
            this.logPrefix
        );

        if (prev < 0 && this.interval >= 0) {
            Logger.info('wake up', this.logPrefix);
            this.subject.next();
            return;
        }

        this.restart();
    }

    restart() {
        this.stop();

        if (this.interval < 0) {
            Logger.info('paused', this.logPrefix);
            return;
        }

        const interval = this.getInterval();

        this.subscription = timer(interval).subscribe(
            () => { this.subject.next(); this.restart(); }
        );

        Logger.info('started with interval ' + interval, this.logPrefix);
    }

    stop() {
        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = null;
        }
    }

    getInterval(): number {
        if (this.intervalWindow > 0) {
            return Math.floor(
                this.interval + Math.random() * (this.intervalWindow + 1)
            );
        }

        return this.interval;
    }
}
