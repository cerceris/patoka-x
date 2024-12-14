import { Connection } from '../connection';
import { Consts } from '../consts';
import { Logger } from '../logger';
import { TaskContext } from '../task/task_context';
import { TaskManager } from '../task/task_manager';
const importFresh = require('import-fresh');

let init = (params) => {
    Logger.debug("Loading plugin 'basic' with [PARAMS] "
        + JSON.stringify(params));
}

let execute = (taskUuid, task) => {
    Logger.debug("Plugin 'basic' is executing [TASK UUID] " + taskUuid + ": "
        + JSON.stringify(task));

    try {
        let executor = importFresh(task.executor_path);

        if (!executor.execute) {
            throw 'Invalid executor format';
        }

        const e = TaskManager.getExecutor(taskUuid, task.name, true);

        e.taskContext = new TaskContext(
            taskUuid,
            task.name,
            Consts.PLUGIN_BASIC
        );

        e.taskContext.params = task.params;
        e.execFn = executor.execute;

        if (executor.init) {
            Logger.debug("Call 'init' function [TASK UUID] " + taskUuid);
            executor.init(e.taskContext);
        }

        e.start();
    }
    catch (e) {
        Logger.error(e);
        const errMsg = 'Failed to execute task: ' + e;
        Connection.sendMsgError(errMsg);
    };

}

module.exports = {
    init,
    execute,
}
