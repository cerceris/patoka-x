import { Subject } from 'rxjs';

import { Logger } from '../logger';

export class ImmediateTrigger {

    subject = new Subject<void>();

    logPrefix: string = '';

    constructor(prefix: string) {
        this.logPrefix = prefix + 'ImmediateTrigger ';

        this.subject.subscribe(() => {
            Logger.info('activated', this.logPrefix);
        });
    }

    restart() {
        Logger.info('restart', this.logPrefix);
        this.subject.next();
    }
}
