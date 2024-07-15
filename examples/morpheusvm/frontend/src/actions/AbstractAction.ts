export abstract class AbstractAction {
    abstract toJSON(): string;
    abstract toBytes(): Uint8Array;

    static actionId(): Byte {
        throw new Error("Method has to be overridden")
    }

    static actionName(): string {
        throw new Error("Method has to be overridden")
    }
}

export class Byte {
    constructor(
        public readonly value: number,
    ) {
        if (value < 0 || value > 255) {
            throw new Error("Invalid byte value")
        }
    }
}