import { hexToBytes } from "@noble/hashes/utils";
import { AbstractAction } from "../actions/AbstractAction";
import { Transaction } from "../chain/Transaction";
import { AuthIface } from "./AuthIface";
import { signTypedData, SignTypedDataVersion } from "@metamask/eth-sig-util";
import * as secp from '@noble/secp256k1';
import { EIP712PrivateKeySigner } from "./EIP712PrivateKey";
import { SDKProvider } from "@metamask/sdk";
import { base64 } from '@scure/base';

export class EIP712BrowserSigner extends EIP712PrivateKeySigner {
    constructor(private provider: SDKProvider) {
        super("")
    }

    private _signerCache: Record<string, Uint8Array> = {}
    async getSigner() {
        const selectedAddress = ((await this.provider.request({ "method": "eth_accounts" })) as string[])[0]
        if (!this._signerCache[selectedAddress]) {
            const pubKeyBase64 = await this.provider.request({
                "method": "eth_getEncryptionPublicKey",
                "params": [
                    selectedAddress
                ]
            });
            if (!pubKeyBase64) {
                throw new Error("Failed to get encryption public key")
            }
            this._signerCache[selectedAddress] = base64.decode(pubKeyBase64 as string)
        }
        console.debug(this._signerCache)
        return this._signerCache[selectedAddress]
    }

    getAuthIDByte() {
        return 4
    }

    async sign(tx: Transaction): Promise<Uint8Array> {
        const msgParams = this._getMsgParams(tx)
        const selectedAddress = ((await this.provider.request({ "method": "eth_accounts" })) as string[])[0]

        const sigHex: string = await new Promise((resolve, reject) => {
            this.provider // Or window.ethereum if you don't support EIP-6963.
                .sendAsync(
                    {
                        method: "eth_signTypedData_v4",
                        params: [selectedAddress, msgParams],
                        jsonrpc: "2.0",
                        id: 1,
                    },
                    function (err: Error | null, result?: { error?: any; result?: any; }) {
                        if (err) return reject(err)
                        if (result?.error) {
                            return reject(result.error)
                        }
                        if (!result?.result) {
                            throw "Signing result is empty"
                        }
                        return resolve(result?.result)
                    }
                );
        })

        return hexToBytes(sigHex.slice(2))
    }
}