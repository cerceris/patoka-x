import { v4  as uuid  } from 'uuid';

export enum ControlMessageType {
    REQUEST = "REQUEST",
    RESPONSE = "RESPONSE",
    UNKNOWN = "UNKNOWN",
}

export class ControlMessage {

    uuid = '';

    type: ControlMessageType = ControlMessageType.UNKNOWN;

    destId = '';

    origId = '';

    cmd = '';

    data: any = null;

    constructor(data?: any) {
        if (data) {
            this.init(data);
        }
    }

    init(data: any) {
        this.uuid = data.uuid || '';
        this.setType(data.type);
        this.destId = data.dest_id || '';
        this.origId = data.orig_id || '';
        this.cmd = data.cmd || '';
        this.data = data.data;
    }

    setType(type: string) {
        if (!type) {
            this.type = ControlMessageType.UNKNOWN;
            return;
        }

        this.type = (<any>ControlMessageType)[type.toUpperCase()]
            || ControlMessageType.UNKNOWN;
    }

    debugStr(): string {
        return '[UUID] ' + this.uuid + ' [TYPE] ' + this.type + ' [DEST ID] '
            + this.destId + ' [ORIG ID] ' + this.origId + ' [CMD] ' + this.cmd
            + ' [DATA] ' + JSON.stringify(this.data);
    }

    toJson(): any {
        return {
            uuid: this.uuid,
            type: this.type.toLowerCase(),
            dest_id: this.destId,
            orig_id: this.origId,
            cmd: this.cmd,
            data: this.data,
        };
    }

    response(data: any) {
        this.type = ControlMessageType.RESPONSE;
        this.data = data;
    }

    static request(
        destId: string,
        origId: string,
        cmd: string,
        data: any = null
    ): ControlMessage {
        const msg = new ControlMessage();

        msg.uuid = uuid();
        msg.type = ControlMessageType.REQUEST;
        msg.destId = destId;
        msg.origId = origId;
        msg.cmd = cmd;
        msg.data = data;

        return msg;
    }
}
