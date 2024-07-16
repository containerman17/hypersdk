import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { AbstractAction } from "../actions/AbstractAction";
import { Transaction } from "../chain/Transaction";
import { AuthIface } from "./AuthIface";
import { signTypedData, SignTypedDataVersion } from "@metamask/eth-sig-util";
import * as secp from '@noble/secp256k1';
import { safeChainId } from "../chain/Id";

export const toGoStyleIsoString = (date: Date) => {
    return date.toISOString().slice(0, -5) + 'Z'
}

export const formatBalance = (balance: bigint, decimals: number = 9): string => {
    //TODO: refactor
    const divisor = 10n ** BigInt(decimals);
    const quotient = balance / divisor;
    const remainder = balance % divisor;
    const paddedRemainder = remainder.toString().padStart(decimals, '0');
    return `${quotient}.${paddedRemainder}`;
}

export class EIP712PrivateKeySigner implements AuthIface {
    constructor(private readonly privateKeyHex: string) {

    }

    _getMsgParams(tx: Transaction) {
        if (tx.actions.length !== 1) {
            throw new Error("Only one action is supported for now")
        }
        const action = tx.actions[0]

        const ActionClass = action.constructor as typeof AbstractAction;

        const msgParams = {
            domain: {
                chainId: `0x${safeChainId(tx.chainId).toString(16)}` as unknown as number,//I love typescipt
                name: 'HyperSDK',
                verifyingContract: '0x0000000000000000000000000000000000000000',
                version: '1',
            },
            message: {
                expiration: toGoStyleIsoString(new Date(Number(tx.timestamp))),
                maxFee: formatBalance(tx.maxFee),
                action: ActionClass.actionName(),
                params:
                    JSON.parse(action.toJSON()),
            },
            primaryType: 'Transaction' as const,
            types: {
                EIP712Domain: [
                    { name: 'name', type: 'string' },
                    { name: 'version', type: 'string' },
                    { name: 'chainId', type: 'uint256' },
                    { name: 'verifyingContract', type: 'address' },
                ],
                "Transaction": [
                    { name: "expiration", type: "string" },
                    { name: "maxFee", type: "string" },
                    { name: "action", type: "string" },
                    { name: "params", type: "Params" },
                ],
                "Params": Object.keys(JSON.parse(action.toJSON())).map((key) => ({ name: key, type: "string" }))
            },
        };

        return msgParams
    }

    async getSigner() {
        const bytes = secp.getPublicKey(this.privateKeyHex, true)
        return bytes
    }

    getAuthIDByte() {
        return 4
    }

    async sign(tx: Transaction): Promise<Uint8Array> {
        const msgParams = this._getMsgParams(tx)
        const sigHex = await signTypedData({
            privateKey: Buffer.from(this.privateKeyHex, 'hex'),
            data: msgParams,
            version: SignTypedDataVersion.V4,
        })
        return hexToBytes(sigHex.slice(2))
    }
}