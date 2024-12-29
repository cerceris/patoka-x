import { Consts } from '../consts';
import { TaskContext } from '../task/task_context';
import { HbpSession } from './hbp_session';

/// Headless Browser Plugin Task Context.
export class HbpTaskContext extends TaskContext {

    page: any = null;

    session: HbpSession = null;

    acquireSharedPage = null;

    releaseSharedPage = null;

    constructor(taskUuid: string, name: string) {
        super(taskUuid, name, Consts.PLUGIN_HEADLESS_BROWSER);
    }

    stop() {
        this.logger.info('STOP');

        if (this.page) {
            this.session.releasePage(this.taskUuid, this.releaseSharedPage);
            this.page = null;
        }

        super.stop(false);
    }

    async preExec() {
        this.logger.info('PRE-EXEC');

        if (!this.page) {
            this.page = await this.session.getPage(
                this.taskUuid,
                this.acquireSharedPage,
                this.releaseSharedPage
            );
        }
    }

    async postExec() {
        this.logger.info('POST-EXEC');

        if (!this.params?.exec?.hold_page) {
            await this.session.releasePage(
                this.taskUuid,
                this.releaseSharedPage
            );

            this.page = null;
        }
    }
}
