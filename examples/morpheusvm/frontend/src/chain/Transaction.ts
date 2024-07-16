import { bytesToHex } from "@noble/hashes/utils";
import { AbstractAction } from "../actions/AbstractAction";
import { AuthIface } from "../auth/AuthIface";
import { MiniPacker } from "../utils/MiniPacker"

export class Transaction {
    constructor(
        public readonly timestamp: bigint,
        public readonly chainId: bigint,
        public readonly maxFee: bigint,
        public readonly actions: AbstractAction[]
    ) {
        if (actions.length > 1) {
            throw new Error("Transaction having zero or more than one action are not implemented yet")
        }

        if (timestamp < new Date(2020, 0, 1).getTime()) {
            throw new Error("Timestamp must be greater than 2020-01-01")
        } else if (timestamp > new Date(2030, 0, 1).getTime()) {
            throw new Error("Timestamp must be less than 2030-01-01")
        }
    }

    public digest(): Uint8Array {
        //add base
        const packer = new MiniPacker();
        packer.packUint64(this.timestamp);
        packer.packUint256(this.chainId);
        packer.packUint64(this.maxFee);

        //add action count 
        packer.packUint8(BigInt(this.actions.length))

        for (const action of this.actions) {
            const ActionClass = action.constructor as typeof AbstractAction;
            const actionId = ActionClass.actionId()// Call static method on the class
            packer.packFixedBytes(new Uint8Array([actionId.value]));//pack action id
            packer.packFixedBytes(action.toBytes())//pack action bytes
        }
        return packer.bytes()
    }

    private _signature: Uint8Array = new Uint8Array(0)
    private _signer: Uint8Array = new Uint8Array(0)
    private _authIDByte: number = 0

    get signature(): Uint8Array {
        return this._signature
    }
    get signedBytes(): Uint8Array {
        return new Uint8Array([...this.digest(), this._authIDByte, ... this._signer, ...this._signature])
    }

    public async sign(provider: AuthIface) {
        this._signature = await provider.sign(this)
        this._signer = await provider.getSigner()
        this._authIDByte = provider.getAuthIDByte()
    }
}