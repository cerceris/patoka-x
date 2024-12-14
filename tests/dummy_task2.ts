import { Connection, Logger, HbpTaskContext } from 'patoka';

let counter = 0;

let execute = async (ctx: HbpTaskContext) => {
    const logger = ctx.logger;

    try {
        const taskUuid = ctx.taskUuid;
        const taskName = ctx.name;
        const page = ctx.page;

        logger.debug('Executing ' + taskName + ' [TASK UUID] ' + taskUuid);

        await page.goto('http://localhost:5000');

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
