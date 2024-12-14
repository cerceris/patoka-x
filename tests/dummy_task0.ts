import { Connection, Logger, TaskContext } from 'patoka';

let counter = 0;

let execute = async (ctx: TaskContext) => {
    try {
        const taskUuid = ctx.taskUuid;
        const params = ctx.params;
        const taskName = ctx.name;
        const logger = ctx.logger;

        logger.debug('Executing ' + taskName + ' [TASK UUID] ' + taskUuid);

        if (!params) {
            throw 'No params provided';
        }

        const delay = params.delay;

        if (delay > 0) {
            logger.debug(`Delay ${delay} ms`);

            await new Promise(r => setTimeout(r, delay));
        }

        if (params.throw_error) {
            logger.debug('Throw error');
            throw 'Dummy Error';
        }

        counter += 1;

        Connection.sendTaskResult(
            taskUuid,
            { 'counter': counter, 'ts': (new Date()).toTimeString() }
        );
    } catch (e) {
        Connection.sendMsgError('Failed to execute task: ' + e);
    }
}

module.exports = {
    execute
}
