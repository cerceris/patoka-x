import { HbpSession } from'./hbp_session';
import { HbpTaskContext } from './hbp_task_context';
import { Logger } from '../logger';
import { Connection } from '../connection';
import { TaskManager } from '../task/task_manager';
const importFresh = require('import-fresh');

const session = new HbpSession();

let init = async (params) => {
    if (session.browser) {
        throw 'Headless Browser Plugin session is already running';
    }

    let browserParams = [];

    Logger.debug("Loading plugin 'headless_browser' with [PARAMS] "
        + JSON.stringify(params));

    if (!params.user_agent) {
        throw "User agent must be specified";
    }

    browserParams.push('--user-agent=' + params.user_agent);

    if (params.proxy_server) {
        browserParams.push('--proxy-server=' + params.proxy_server);
        browserParams.push(`--proxy-bypass-list=127.0.0.1;localhost`);
    }

    browserParams.push('--ignore-certificate-errors');

    Logger.debug("[BROWSER PARAMS] " + browserParams);

    const devTools = (params.dev_tools === 'yes');

    await session.init(browserParams, devTools);
}

let execute = async (taskUuid, task) => {
    Logger.debug("Plugin 'headless_browser' is executing [TASK UUID] "
        + taskUuid + ": " + JSON.stringify(task));

    try {
        let executor = importFresh(task.executor_path);

        if (!executor.execute) {
            throw "Invalid executor format";
        }

        const e = TaskManager.getExecutor(taskUuid, task.name, true);

        e.taskContext = new HbpTaskContext(taskUuid, task.name);
        e.taskContext.params = task.params;

        e.taskContext.acquireSharedPage = task.params.exec
            ? task.params.exec.acquire_shared_page
            : null;

        e.taskContext.releaseSharedPage = task.params.exec
            ? task.params.exec.release_shared_page
            : null;

        e.taskContext.page = await session.getPage(
            taskUuid,
            e.taskContext.acquireSharedPage,
            e.taskContext.releaseSharedPage
        );

        e.taskContext.session = session;

        e.execFn = async (ctx: HbpTaskContext) => {
            await ctx.preExec();
            await executor.execute(ctx);
            await ctx.postExec();
        };

        if (executor.init) {
            Logger.debug("Call 'init' function [TASK UUID] " + taskUuid);
            executor.init(e.taskContext);
        }

        e.start();
    }
    catch (e) {
        Logger.error(e);
        const errMsg = "Failed to execute task: " + e;
        Connection.sendMsgError(errMsg);
    };

}

module.exports = {
    init,
    execute,
}
