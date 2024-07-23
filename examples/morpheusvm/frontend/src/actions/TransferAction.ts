import { MiniPacker } from "../utils/MiniPacker";
import { parseBech32 } from "../utils/bech32";
import { formatBalance } from "../utils/formatBalance";
import { AbstractAction, Byte } from "./AbstractAction";


export class TransferAction extends AbstractAction {
    constructor(
        public readonly to: string,
        public readonly value: bigint,
    ) {
        super()
    }

    static actionId(): Byte {
        return new Byte(0)
    }

    static actionName(): string {
        return "Transfer"
    }

    toJSON(): string {
        return JSON.stringify({
            to: this.to,
            value: formatBalance(this.value),
        })
    }

    toBytes(): Uint8Array {
        const packer = new MiniPacker()

        const [, addrBytes] = parseBech32(this.to)

        packer.packFixedBytes(addrBytes)
        packer.packUint64(this.value)

        return packer.bytes()
    }
}