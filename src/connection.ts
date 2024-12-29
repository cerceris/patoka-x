import * as zmq from 'zeromq/v5-compat';

import { Consts } from './consts';
import { Globals } from './globals';
import { Logger } from './logger';
import { Message } from './message';
import { ControlMessage } from './control/control_message';

export class Connection {
    static socket = null;

    static socketAux = null;

    static init(controllerAddress: string) {
        Logger.debug("[WORKER ID] " + Globals.workerId
            + " connecting to [CONTROLLER ADDRESS] " + controllerAddress);

        this.socket = zmq.socket('dealer');
        this.socket.connect(controllerAddress);
    }

    static initAux(controllerAuxAddress: string) {
        Logger.debug("[WORKER ID] " + Globals.workerId
            + " connecting to [CONTROLLER AUX ADDRESS] "
            + controllerAuxAddress);

        this.socketAux = zmq.socket('dealer');
        this.socketAux.connect(controllerAuxAddress);
    }

    static send(msg: Message) {
        const m = JSON.stringify(msg.toJson());
        Logger.trace('Send : ' + m);
        this.socket.send(m);
    }

    static sendAux(msg: Message) {
        const m = JSON.stringify(msg.toJson());
        Logger.trace('Send AUX: ' + m);
        this.socketAux.send(m);
    }

    static sendTaskResult(taskUuid, result) {
        let msg = Message.createBaseMessage(Consts.DEST_CLIENT, taskUuid);
        msg.data['task_result'] = result;
        this.send(msg);
    }

    static sendTaskError(taskUuid, details) {
        let msg = Message.createBaseMessage(Consts.DEST_CLIENT, taskUuid);
        msg.data['error'] = details;
        this.send(msg);
    }

    static sendMsgError(message) {
        Logger.warn('ERROR');
        let msg = Message.createControllerMessage('error');
        msg.data['details'].message = message;
        this.send(msg);
    }

    static sendMsgStarted() {
        Logger.info('STARTED');
        let msg = Message.createControllerMessage('started');
        Connection.send(msg);

        if (this.socketAux) {
            Connection.sendAux(msg);
        }
    }

    static sendMsgReady() {
        Logger.info('READY');
        let msg = Message.createControllerMessage('ready');
        Connection.send(msg);
    }

    static sendPluginReady(plugin: string) {
        Logger.info('PLUGIN READY');
        let msg = Message.createControllerMessage('plugin_ready');
        msg.data['details']['name'] = plugin;
        Connection.send(msg);
    }

    static sendControlResponseOk(msg: ControlMessage, details: string = '') {
        const data = { 'result': 'ok', 'details' : details };
        this.sendControlResponse(msg, data);
    }

    static sendControlResponseError(
        msg: ControlMessage,
        details: string = ''
    ) {
        Logger.warn(`Control response error '${details}'`
            + ` for command ${msg.debugStr()}`);

        const data = { 'result': 'error', 'details' : details };
        this.sendControlResponse(msg, data);
    }

    private static sendControlResponse(msg: ControlMessage, data: any) {
        msg.response(data);

        this.send(Message.createControllerMessage(
            'control_response',
            msg.toJson()
        ));
    }

    static sendTaskQuestion(taskUuid, question) {
        let msg = Message.createBaseMessage(Consts.DEST_CLIENT, taskUuid);
        msg.data['task_question'] = question;
        this.send(msg);
    }

    static sendHeartbeatResponse() {
        //Logger.debug('Send heartbeat response.');
        let msg = Message.createControllerMessage('heartbeat_response');
        this.send(msg);
    }
}
