import { Connection } from '../connection';
import { Logger } from '../logger';
import { Message } from '../message';
import { TaskManager } from '../task/task_manager';

export class Plugin {

    static plugin = null;

    static activePlugin = '';

    static async setupPlugin(pluginSettings) {
        let pluginName = pluginSettings.name;

        if (pluginName === this.activePlugin) {
            Connection.sendPluginReady(this.activePlugin);
            return;
        }

        let pluginPath = pluginSettings.path;
        let pluginParams = pluginSettings.params;

        try {
            const plugin = require(pluginPath);

            if (!plugin.init || !plugin.execute) {
                throw "Invalid plugin format";
            }

            this.plugin = plugin;

            await this.plugin.init(pluginParams);

            this.activePlugin = pluginName;
            Connection.sendPluginReady(this.activePlugin);
        }
        catch (e) {
            this.plugin = null;
            this.activePlugin = '';

            const errMsg = "Failed to load [PLUGIN] " + pluginName + ": " + e;

            Logger.error(errMsg);
            Connection.sendMsgError(errMsg);
        };
    }

    static execute(taskUuid: string, taskPlugin: string, task: any) {
        const e = TaskManager.getExecutor(taskUuid, task.name);
        if (e) {
            Logger.debug('[TASK UUID] ' + taskUuid + ' is already running.'
                + ' Updating it.');

            e.update(task.params);
            return;
        }

        if (taskPlugin !== this.activePlugin) {
            const errMsg = 'Proper plugin has not been set for task'
                + ' [TASK UUID] ' + taskUuid + ' [PLUGIN] ' + taskPlugin
                + ' [ACTIVE PLUGIN] ' + this.activePlugin;

            Logger.error(errMsg);
            Connection.sendMsgError(errMsg);

            return;
        }

        this.plugin.execute(taskUuid, task);
    }
}
