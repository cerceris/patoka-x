/// Test server.

import * as zmq from 'zeromq';

let frontend = zmq.socket('router');

frontend.bindSync('tcp://*:3335');

let id = '';

frontend.on('message', (identity, msg, ...rest) => {
    console.log('RCV: ' + msg);

    try {
        const m = JSON.parse(msg);

        if (m.forward) {
            send(m.forward);
            return;
        }

        const data = m.data;

        if (data.subject === 'started') {
            id = identity;
            handleStarted();
        }
    } catch (e) {
        console.log(e.message);
    }
});

let send = (msg) => {
    const msgStr =  JSON.stringify(msg);

    console.log('SND: ' + msgStr);

    frontend.send([id, msgStr]);
}

let handleStarted = () => {
    console.log('started');
}

