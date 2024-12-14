import { Consts } from './consts';
import { Globals } from './globals';
import { Plugin } from './plugin/plugin';

export class Message {

    dest = '';

    workerId = '';

    taskUuid = '';

    plugin = '';

    data: any = {};

    constructor(
        dest: string,
        workerId: string,
        taskUuid: string,
        plugin: string,
        data: any
    ) {
        this.dest = dest;
        this.workerId = workerId;
        this.taskUuid = taskUuid;
        this.plugin = plugin;
        this.data = data;
    }

    toJson() {
        return {
            dest: this.dest,
            worker_id: this.workerId,
            task_uuid: this.taskUuid,
            plugin: this.plugin,
            data: this.data
        };
    }

    static createBaseMessage(dest: string, taskUuid = ''): Message {
        return new Message(
            dest,
            Globals.workerId,
            taskUuid,
            Plugin.activePlugin,
            {}
        );
    }

    static createControllerMessage(subject: string, details: any = {}) {
        const msg = this.createBaseMessage(Consts.DEST_CONTROLLER);
        msg.data['subject'] = subject;
        msg.data['details'] = details;
        return msg;
    }
}
