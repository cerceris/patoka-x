import * as zmq from 'zeromq/v5-compat';
import * as fs from 'fs';

if (process.argv.length < 3) {
    console.log('File with a message must be provided.');
    process.exit();
}

const file = 'data/' + process.argv[2] + '.json';

const addr = 'tcp://127.0.0.1:3335';

let socket = zmq.socket('dealer');
socket.connect(addr);

socket.on('message', (msg) => {
    console.log("RCV: " + msg);

    const m = JSON.parse(msg);
});

let send = (msg) => {
    const msgStr = JSON.stringify(msg);
    console.log('Sending message:\n' + msgStr);
    socket.send(msgStr);
};

let run = () => {
    console.log('Loading message body from file ' + file);
    const msgBody = JSON.parse(fs.readFileSync(file).toString());

    const msg = {
        forward: msgBody
    };

    send(msg);

    socket.close();
};

run();
