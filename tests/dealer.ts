const zmq = require('zeromq');

const dispatcherAddress = 'tcp://127.0.0.1:3333';
const uuid = 'abcd1234';

let getBaseMessage = () => {
    return {
        worker_uuid: uuid,
        data: {},
        dest: 'test',
    }
};

const socket = zmq.socket('dealer');
socket.connect(dispatcherAddress);

socket.on('message', (msg) => {
    console.log("Received: " + msg);

    const m = JSON.parse(msg);


});

let send = (msg) => {
    socket.send(JSON.stringify(msg));
};

let sendMsgStarted = ()=> {
    let msg = getBaseMessage();
    send(msg);
};

sendMsgStarted();
