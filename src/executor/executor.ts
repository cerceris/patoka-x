import { defer, merge, of } from 'rxjs';
import { filter, mergeMap, tap } from 'rxjs/operators';

import { Connection } from '../connection';
import { ControlMessage } from '../control/control_message';
import { ImmediateTrigger } from './immediate_trigger';
import { Logger } from '../logger';
import { TaskManager } from '../task/task_manager';
import { TimerTrigger } from './timer_trigger';

export class Executor {

    taskContext: any = null;

    execFn: any = null;

    iTrigger = null;

    tTrigger = null;

    subscription: any = null;

    logPrefix: string = '';

    shotInProgress = false;

    constructor(taskUuid: string, name: string) {
        const prefix = `<${name} ${taskUuid}> `;
        this.logPrefix = prefix + 'Executor ';
        this.iTrigger = new ImmediateTrigger(prefix);
        this.tTrigger = new TimerTrigger(prefix);
    }

    start() {
        Logger.debug('started', this.logPrefix);

        this.subscription =
            merge(
                this.iTrigger.subject,
                this.tTrigger.subject
            ).pipe(
                tap(() => this.shotStarted()),
                filter(() => !this.shotInProgress),
                mergeMap(_ => this.shot()),
                tap(() => this.shotCompleted())
            )
            .subscribe(() => {
            });

        // Execution parameters.
        this.updateTriggers();

        // Single shot if other triggers are not active.
        if (this.tTrigger.interval < 1) {
            this.iTrigger.restart();
        }
    }

    shot() {
        return defer(() => {
            if (this.shotInProgress) {
                Logger.warn('tried to call exec while a shot is in progress',
                    this.logPrefix);

                return of({});
            }

            this.shotInProgress = true;
            return this.execFn(this.taskContext);
        });
    }

    shotStarted() {
        if (this.shotInProgress) {
            Logger.warn('attempting to start another shot while a shot is in'
                + ' progress', this.logPrefix);

            return;
        }

        Logger.debug('shot started', this.logPrefix);

        this.tTrigger.stop();
    }

    shotCompleted() {
        if (!this.shotInProgress) {
            Logger.warn('attempting to complete shot while a shot is not in'
                + ' progress', this.logPrefix);

            return;
        }

        this.shotInProgress = false;

        Logger.debug('shot completed', this.logPrefix);

        // Restart triggers.
        this.tTrigger.restart();
    }

    updateTriggers() {
        const exec = this.taskContext.params.exec;
        if (!exec) {
            return;
        }

        Logger.debug('update triggers [EXEC] ' + JSON.stringify(exec),
            this.logPrefix);

        this.tTrigger.update(exec);
    }

    update(params: any) {
        Logger.debug('update params [PARAMS] ' + JSON.stringify(params),
            this.logPrefix);

        this.taskContext.params = params;
        this.updateTriggers();
    }

    handleControlMsg(msg: ControlMessage) {
        Logger.debug('[CMD REQ] ' + msg.debugStr(), this.logPrefix);

        if (msg.cmd === 'update_params') {
            this.update(msg.data);

            Connection.sendControlResponseOk(
                msg,
                'Successfully updated task parameters'
            );
        } else if (msg.cmd === 'stop_task') {
            this.stop();
        } else {
            this.taskContext.control.next(msg);
        }
    }

    stop() {
        Logger.info('STOP', this.logPrefix);

        this.tTrigger.stop();
        this.subscription.unsubscribe();
        this.subscription = null;
        this.taskContext.stop();
    }
}
