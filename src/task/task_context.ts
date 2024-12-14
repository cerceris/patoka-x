import { Subject } from 'rxjs';

import { ControlMessage } from '../control/control_message';
import { Logger } from '../logger';
import { TaskManager } from './task_manager';

export class TaskContext {

    taskUuid = '';

    name = '';

    plugin = '';

    params: any = null;

    control = new Subject<ControlMessage>();

    logger: any = null;

    // Any data used by the task.
    storage: any = null;

    onStopFn = null;

    constructor(taskUuid: string, name: string, plugin: string) {
        this.taskUuid = taskUuid;
        this.name = name;
        this.plugin = plugin;
        this.init();
    }

    init() {
        this.logger = this.name ? Logger.getLogger(this.name) : Logger.logger;
    }

    stop(printLog = true) {
        if (printLog) {
            this.logger.info('STOP');
        }

        this.control.complete();
        this.control.unsubscribe();
        this.control = null;

        if (this.onStopFn) {
            this.onStopFn();
        }

        TaskManager.completed(this.taskUuid);
    }
}
