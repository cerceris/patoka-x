import { interval } from 'rxjs';

import {
    Connection, Guard, GuardCondition, GuardConditionCheckResult, Logger,
    TaskContext
} from 'patoka';

let counter = 0;

class GC implements GuardCondition {

    timerSubscription: any = null;

    canGo = false;

    logger: any = null;

    constructor() {
        this.logger = Logger.getLogger('dummy-task-guard-condition');
    }

    check(
        ctx: TaskContext,
        refresh = false
    ): Promise<GuardConditionCheckResult> {
        return new GuardConditionCheckResult(this.canGo, 'Let Me Go');
    }

    handleAnswer(
        ctx: TaskContext,
        answerData: any
    ): Promise<GuardConditionCheckResult> {
        this.logger.info('Answer received. canGo = '
            + (answerData ? 'TRUE' : 'FALSE')
        );

        this.canGo = answerData;
        if (this.canGo) {
            this.startValidityTimer();
        }
        return this.check(ctx);
    }


    private startValidityTimer() {
        // Permission is only valid for 10 secs.
        this.timerSubscription = interval(10000).subscribe(_ => {
            this.logger.info('Validity timer triggered. canGo = FALSE');

            this.canGo = false;

            this.timerSubscription.unsubscribe();
            this.timerSubscription = null;
        });
    }
}

const gc = new GC();
const guard = new Guard('dummy-task-guard');

let execute = async (ctx: TaskContext) => {
    const logger = ctx.logger;

    try {
        const taskUuid = ctx.taskUuid;
        const params = ctx.params;
        const taskName = ctx.name;

        logger.debug('Executing ' + taskName + ' [TASK UUID] ' + taskUuid);

        const canGo = await guard.resolve(ctx, gc);

        if (!canGo) {
            const msg = 'Got negative result from the Guard. Cannot proceed.';

            logger.warn(msg);

            Connection.sendMsgError(msg);

            return;
        }

        counter += 1;

        logger.debug('[COUNTER] ' + counter);

        Connection.sendTaskResult(
            taskUuid,
            { 'counter': counter, 'ts': (new Date()).toTimeString() }
        );
    } catch (e) {
        logger.error(e);
        Connection.sendMsgError('Failed to execute task: ' + e);
    }
}

module.exports = {
    execute
}
