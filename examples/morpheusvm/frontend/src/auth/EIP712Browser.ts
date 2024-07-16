import { hexToBytes } from "@noble/hashes/utils";
import { Transaction } from "../chain/Transaction";
import { SignTypedDataVersion, TypedDataUtils } from "@metamask/eth-sig-util";
import { EIP712PrivateKeySigner, recoverPublicKey } from "./EIP712PrivateKey";
import { SDKProvider } from "@metamask/sdk";


import { Buffer as BufferPolyfill } from 'buffer'
globalThis.Buffer = BufferPolyfill//TODO: try to switch to ethers to avoid this


export class EIP712BrowserSigner extends EIP712PrivateKeySigner {
    constructor(private provider: SDKProvider) {
        super("")
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

        const messageHash = TypedDataUtils.eip712Hash(msgParams, SignTypedDataVersion.V4)
        const publicKey = recoverPublicKey(messageHash, sigHex);
        this._signer = publicKey

        return hexToBytes(sigHex.slice(2))
    }
}