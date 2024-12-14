import { Connection } from '../connection';
import { Logger } from '../logger';
import { Message } from '../message';
import { Executor } from '../executor/executor';

export class TaskManager {

    // The worker is `ready` when there are no active tasks.
    // Task UUID --> Executor
    static tasks = new Map<string, Executor>();

    static totalTasksProcessed = 0;

    static getExecutor(
        taskUuid: string,
        name: string = '',
        createIfNotExist = false
    ): Executor {
        let e = this.tasks.get(taskUuid);
        if (!e && createIfNotExist) {
            e = new Executor(taskUuid, name);
            this.tasks.set(taskUuid, e);

            Logger.debug('Created executor for [TASK UUID] ' + taskUuid
                + ' [NAME] ' + name);

            Logger.debug('There are ' + this.tasks.size + ' active tasks.');

            this.totalTasksProcessed += 1;
            Logger.debug(`Total tasks processed: ${this.totalTasksProcessed}`);
        }

        return e;
    }

    static completed(taskUuid: string = '') {
        if (this.tasks.delete(taskUuid)) {
            Logger.debug('Task completed [TASK UUID] ' + taskUuid);
        } else {
            Logger.warn('Called completed for unknown task [TASK UUID] '
                + taskUuid);
        }

        if (this.tasks.size > 0) {
            Logger.debug('There are ' + this.tasks.size + ' active tasks.');
            return;
        }

        Logger.debug('No active tasks. The worker is ready now.');

        Connection.sendMsgReady();
    }

    static stopAll() {
        if (this.tasks.size < 1) {
            Logger.debug('No active tasks. The worker is ready now.');

            Connection.sendMsgReady();
        }

        for (const e of this.tasks.values()) {
            e.stop();
        }
    }
}
