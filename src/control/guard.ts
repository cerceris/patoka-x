import { interval, Subject } from 'rxjs';

import { Connection } from '../connection';
import { ControlMessage } from './control_message';

import {
    GuardCondition, GuardConditionCheckResult, TaskGuardPair
} from './guard_condition';

import { Logger } from '../logger';
import { TaskContext } from '../task/task_context';

export class Guard {

    logger: any = null;

    subject: Subject<boolean> = null;

    controlSubscription = null;

    questionTaskUuid = '';

    // Task UUID --> TaskGuardPair
    pendingTasks = new Map<string, TaskGuardPair>();

    constructor(public name: string) {
        this.logger = Logger.getLogger(name);
    }

    async resolve(ctx: TaskContext, gc: GuardCondition): Promise<boolean> {
        if (this.questionTaskUuid) {
            // The quard is already waiting for the task answer.
            this.addPendingTask(ctx, gc);
            return this.subject.asObservable().toPromise();
        }

        const r = await gc.check(ctx);

        if (r.passed) {
            this.logger.info('PASSED [TASK UUID] ' + ctx.taskUuid);
            return true;
        }

        this.logger.info('NOT PASSED [TASK UUID] ' + ctx.taskUuid);

        if (!r.questionData) {
            this.logger.info('No question to send [TASK UUID] '
                + ctx.taskUuid);

            return false;
        }

        this.subject = new Subject();

        this.addPendingTask(ctx, gc);
        this.sendTaskQuestion(ctx, r.questionData);

        return this.subject.asObservable().toPromise();
    }

    private addPendingTask(ctx: TaskContext, gc: GuardCondition) {
        if (this.pendingTasks.has(ctx.taskUuid)) {
            const errMsg = '[TASK UUID] ' + ctx.taskUuid + ' is already being'
                + ' processed by the guard.';

            this.logger.error(errMsg);
            throw errMsg;
        }

        ctx.onStopFn = () => this.taskStopped(ctx.taskUuid);

        this.pendingTasks.set(ctx.taskUuid, new TaskGuardPair(ctx, gc));

        this.logger.info('Added pending [TASK UUID] ' + ctx.taskUuid
            + ' [TOTAL] ' + this.pendingTasks.size);
    }

    private finallyResolve(result: boolean) {
        this.logger.info(
            result ? '[RESOLVED POSITIVE]' : '[RESOLVED NEGATIVE]'
        );

        this.questionTaskUuid = '';
        this.subject.next(result);
        this.pendingTasks.clear();
        this.clearSubject();
        this.clearControlSubscription();
    }

    private sendTaskQuestion(ctx: TaskContext, question: any) {
        if (this.questionTaskUuid !== ctx.taskUuid) {
            this.clearControlSubscription();

            this.controlSubscription =
                ctx.control.subscribe(msg => this.handleControlMsg(msg));
        }

        this.questionTaskUuid = ctx.taskUuid;

        this.logger.info('Send task question [TASK UUID] ' + ctx.taskUuid
            + ' [QUESTION] ' + JSON.stringify(question));

        Connection.sendTaskQuestion(ctx.taskUuid, question);
    }

    private async handleControlMsg(msg: ControlMessage) {
        if (msg.cmd !== 'task_answer') {
            return;
        }

        this.logger.debug('[CMD REQ] ' + msg.debugStr());

        // First check the task in question.
        const pt = this.pendingTasks.get(this.questionTaskUuid);
        if (!pt) {
            const errMsg = 'Could not get the task in question [TASK UUID] '
                + this.questionTaskUuid;

            this.logger.error(errMsg);
            Connection.sendControlResponseError(msg, errMsg);
            throw errMsg;
        }

        const r = await pt.gc.handleAnswer(pt.ctx, msg.data);
        if (!r.passed) {
            this.logger.info('ANSWER NOT PASSED task in question  [TASK UUID] '
                + pt.ctx.taskUuid);

            if (!r.questionData) {
                this.logger.info('No question to send [TASK UUID] '
                    + pt.ctx.taskUuid);

                this.finallyResolve(false);
                Connection.sendControlResponseOk(msg);
                return;
            }

            Connection.sendControlResponseOk(msg);
            this.sendTaskQuestion(pt.ctx, r.questionData);
            return;
        }

        this.logger.info('ANSWER PASSED task in question  [TASK UUID] '
                + pt.ctx.taskUuid);

        // Check the rest of tasks.
        for (const pt of this.pendingTasks.values()) {
            if (pt.ctx.taskUuid === this.questionTaskUuid) {
                continue;
            }

            // Refresh = true.
            const r = await pt.gc.check(pt.ctx, true);
            if (!r.passed) {
                this.logger.info('NOT PASSED [TASK UUID]' + pt.ctx.taskUuid);

                if (!r.questionData) {
                    this.logger.info('No question to send [TASK UUID] '
                        + pt.ctx.taskUuid);

                    this.finallyResolve(false);
                    Connection.sendControlResponseOk(msg);
                    return;
                }

                Connection.sendControlResponseOk(msg);
                this.sendTaskQuestion(pt.ctx, r.questionData);
                return;
            }

            this.logger.info('PASSED [TASK UUID] ' + pt.ctx.taskUuid);
        }

        this.logger.info("All tasks' guard conditions PASSED");
        this.finallyResolve(true);
        Connection.sendControlResponseOk(msg);
    }

    private clearControlSubscription() {
        if (this.controlSubscription) {
            this.controlSubscription.unsubscribe();
            this.controlSubscription = null;
        }
    }

    private clearSubject() {
        if (this.subject) {
            this.subject.complete();
            this.subject.unsubscribe();
            this.subject = null;
        }
    }

    private taskStopped(taskUuid: string) {
        if (this.pendingTasks.delete(taskUuid)) {
            this.logger.info('Removed pending [TASK UUID] '
                + taskUuid + ' since it has been stopped. [TOTAL] '
                + this.pendingTasks.size);

            if (this.questionTaskUuid === taskUuid) {
                this.finallyResolve(false);
            }
        }
    }
}
