import { AbstractAction } from "../actions/AbstractAction";
import { Transaction } from "../chain/Transaction";
import { AuthIface } from "./AuthIface";
import { signTypedData, SignTypedDataVersion, TypedDataUtils } from "@metamask/eth-sig-util";
import { safeChainId } from "../chain/Id";
import { SDKProvider } from "@metamask/sdk";
import { base58 } from "@scure/base";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils"

type InvokeSnapParams = {
    method: string;
    params?: Record<string, unknown>;
};


export async function invokeSnap(provider: SDKProvider, { method, params }: InvokeSnapParams): Promise<unknown> {
    return await provider.request({
        method: 'wallet_invokeSnap',
        params: {
            snapId: "local:http://localhost:8080",
            request: params ? { method, params } : { method },
        },
    });
}

export class MetamaskSnapSigner implements AuthIface {
    constructor(private provider: SDKProvider) {
    }

    protected _signer: Uint8Array | undefined
    async getSigner() {
        if (!this._signer) {
            throw new Error("Sign before getting signer")
        }
        return this._signer
    }

    getAuthIDByte() {
        return 0
    }

    async sign(tx: Transaction): Promise<Uint8Array> {
        const digest = tx.digest()
        const digestBase58 = base58.encode(digest)
        const invokeResult = await invokeSnap(this.provider, { method: 'signTransaction', params: { message: digestBase58, derivationPath: ["0'"] } }) as { publicKey: string, signature: string } | undefined
        if (!invokeResult) {
            throw new Error("Error signing transaction, no result")
        }
        const { publicKey: pubKeyBase58, signature: sigBase58 } = invokeResult
        if (!pubKeyBase58 || !sigBase58) {
            throw new Error("Error signing transaction, no public key or signature")
        }

        this._signer = base58.decode(pubKeyBase58)

        console.log("pubKeyBase58", pubKeyBase58)
        console.log("pubKeyHex", bytesToHex(this._signer))

        return base58.decode(sigBase58)
    }
}