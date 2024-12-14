import * as zmq from 'zeromq';
import * as log4js from 'log4js';
import * as commandLineArgs from 'command-line-args';
import { interval } from 'rxjs';

import { Consts } from './consts';
import { Connection } from './connection';
import { Control } from './control/control';
import { Globals } from './globals';
import { Logger } from './logger';
import { Message/*, ControlMessage*/ } from './message';
import { Plugin } from './plugin/plugin';
import { TaskManager } from './task/task_manager';

const argsDefinitions = [
    { name: 'worker_id', type: String, required: true },
    { name: 'controller', type: String, required: true },
    { name: 'controller_aux', type: String },
    { name: 'log_dir', type: String },
    { name: 'log_level', type: String },
    { name: 'active_heartbeat_interval', type: Number },
];

const args = commandLineArgs(argsDefinitions);

Globals.workerId = args.worker_id;
const controllerAddress = args.controller;

const valid = Globals.workerId && controllerAddress;

if (!valid) {
    console.log("Invalid or missing arguments: " + JSON.stringify(args));
    process.exit(0);
}

// Needed by log4js to add loggers dynamically.
process.setMaxListeners(Infinity);

Logger.init(args);

Connection.init(controllerAddress);

if (args.controller_aux) {
    Connection.initAux(args.controller_aux);
}

const activeHeartbeatInterval = args.active_heartbeat_interval;

if (activeHeartbeatInterval > 0) {
    Logger.info('Sending heartbeat messages with interval '
        + activeHeartbeatInterval + ' ms.');

    interval(activeHeartbeatInterval).subscribe(() => {
        Connection.sendHeartbeatResponse();
    });
}

let handleControlMessage = (subject, details) => {
    if (subject === 'heartbeat_request') {
        Connection.sendHeartbeatResponse();
    } else if (subject === 'send_ready') {
        Connection.sendMsgReady();
    } else if (subject === 'control_request') {
        Control.handle(details);
    } else if (subject === 'stop_all') {
        Control.stopAll();
    } else {
        Logger.warn('Unknown [SUBJECT] ' + subject);
    }
}

let handleMessage = (msg) => {
    const m = JSON.parse(msg);

    if (m.dest != Consts.DEST_WORKER) {
        Logger.warn("Ignore message with [DEST] " + m.dest);
        return;
    }

    if (Globals.workerId != m.worker_id) {
        Logger.warn("Message from unknown [WORKER ID] " + msg.worker_id
            + ". Accepting messages from [WORKER ID] " + Globals.workerId
            + " only.");
        return;
    }

    let data = m.data;
    if (data.plugin) {
        Plugin.setupPlugin(data.plugin);
    }
    else if (data.task) {
        Plugin.execute(m.task_uuid, m.plugin, data.task);

        if (data.task.params?.exec
            && data.task.params.exec.exclusive === false)
        {
            // Task is not exlusive. Send 'Ready' immediately.
            Connection.sendMsgReady();
        }
    }
    else if (data.subject) {
        handleControlMessage(data.subject, data.details);
    }
    else {
        Logger.warn('Unsupported message type');
    }
}

Connection.socket.on('message', (msg) => {
    Logger.trace("Received: " + msg);

    handleMessage(msg);
});

/// Manual control.
if (Connection.socketAux) {
    Connection.socketAux.on('message', (msg) => {
        Logger.info('Received AUX: ' + msg);

        handleMessage(msg);
    });
}

Connection.sendMsgStarted();
