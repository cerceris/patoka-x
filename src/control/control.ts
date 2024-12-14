import { Connection } from '../connection';
import { ControlMessage } from './control_message';
import { Logger } from '../logger';
import { TaskManager } from '../task/task_manager';

export class Control {

    static handle(data: any) {
        const msg = new ControlMessage(data);

        Logger.debug(`Control message ${msg.debugStr()}`);

        const taskUuid = msg.destId;

        const e = TaskManager.getExecutor(taskUuid);
        if (!e) {
            Connection.sendControlResponseError(
                msg,
                'Unknown [TASK UUID] ' + taskUuid
            );

            return;
        }

        e.handleControlMsg(msg);
    }

    static stopAll() {
        Logger.info('STOP ALL');

        TaskManager.stopAll();
    }
}
