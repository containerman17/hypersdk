


import MetaMaskSDK, { SDKProvider } from '@metamask/sdk'
import { bytesToHex } from '@noble/hashes/utils';
import { EIP712BrowserSigner } from './auth/EIP712Browser';
import { TransferAction } from './actions/TransferAction';
import { idStringToBigInt } from './chain/Id';
import { Transaction } from "./chain/Transaction"
import { safeChainId } from "./chain/Id"

const metamaskSDK = new MetaMaskSDK({
    dappMetadata: {
        name: "Pure JS example",
        url: window.location.origin,
    },
    logging: {
        sdk: true,
    }
});


async function getBalance(address: string): Promise<bigint> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
        const response = await fetch(`http://localhost:9650/ext/bc/morpheusvm/morpheusapi`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "morpheusvm.balance",
                params: { address },
                id: parseInt(String(Math.random()).slice(2))
            }),
            signal: controller.signal
        });

        const json = await response.json();
        return BigInt(json.result.amount);
    } catch (error: any) {
        if (error.name === 'AbortError') {
            throw new Error('Request timed out after 3 seconds');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}


async function getNetwork(): Promise<{ networkId: number, subnetId: string, chainId: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
        const response = await fetch(`http://localhost:9650/ext/bc/morpheusvm/coreapi`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "hypersdk.network",
                params: {},
                id: parseInt(String(Math.random()).slice(2))
            }),
            signal: controller.signal
        });

        return (await response.json()).result as { networkId: number, subnetId: string, chainId: string }
    } catch (error: any) {
        if (error.name === 'AbortError') {
            throw new Error('Request timed out after 3 seconds');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

import { base64 } from '@scure/base';
import { formatBalance, fromFormattedBalance } from './auth/EIP712PrivateKey';
import { ETHAddrToEIP712Str } from './chain/Address';

async function sendTx(txBytes: Uint8Array): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const bytesBase64 = base64.encode(txBytes);

    try {
        const response = await fetch(`http://localhost:9650/ext/bc/morpheusvm/coreapi`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "hypersdk.submitTx",
                params: { tx: bytesBase64 },
                id: parseInt(String(Math.random()).slice(2))
            }),
            signal: controller.signal
        });

        const json = await response.json();
        if (json?.error?.message) {
            throw new Error(json.error.message)
        }
    } catch (error: any) {
        if (error.name === 'AbortError') {
            throw new Error('Request timed out after 3 seconds');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}



export { base58 } from '@scure/base';


function log(message: string, isError: boolean = false) {
    const div = document.createElement('div');
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
    div.innerText = currentTime + ": " + message;
    if (isError) {
        div.style.color = 'red';
    }
    document.getElementById('log')?.appendChild(div);
}



async function testSignatures() {
    try {
        log('Connecting SDK...')
        await metamaskSDK.connect()
        log('SDK connected')
        log('Requesting provider...')
        const provider = await metamaskSDK.getProvider()
        if (!provider) {
            throw new Error("No provider")
        }
        log('Got provider')

        const chainId = idStringToBigInt("2c7iUW3kCDwRA9ZFd5bjZZc8iDy68uAsFSBahjqSZGttiTDSNH")
        const chainIdSafe = safeChainId(chainId)

        //add chain
        await provider.request({
            method: "wallet_addEthereumChain",
            params: [{
                chainId: `0x${chainIdSafe.toString(16)}`,
                rpcUrls: ["https://chain-id-echo.glitch.me/" + chainIdSafe],
                chainName: "HyperSDK Custom",
            }]
        });

        log("Chain added")

        await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${chainIdSafe.toString(16)}` }],
        });

        log("Switched to the new chain")


        const txSigner = new EIP712BrowserSigner(provider)

        const action = new TransferAction(
            "morpheus1qrzvk4zlwj9zsacqgtufx7zvapd3quufqpxk5rsdd4633m4wz2fdjk97rwu",
            123n * (10n ** 9n)
        )


        const tx = new Transaction(
            1717111222000n,
            chainId,
            10n * (10n ** 9n),
            [action],
        )

        //check digest just to make sure
        const expectedDigest = "0000018fcbcdeef0d36e467c73e2840140cc41b3d72f8a5a7446b2399c39b9c74d4cf077d250902400000002540be400010000c4cb545f748a28770042f893784ce85b107389004d6a0e0d6d7518eeae1292d90000001ca35f0e00";
        const actualDigest = bytesToHex(tx.digest());
        if (actualDigest !== expectedDigest) {
            throw new Error(`Digest mismatch. Expected: ${expectedDigest}, Actual: ${actualDigest}`);
        }
        log("Digest check successful");

        await tx.sign(txSigner);

        const expectedSignature = "c91e809201fdada92235637d3a570a4dac980a44322ee0b9b5e14b11c4cdc9cf064bc3e0f9f73dd7ec1051f50fc9298148151a7d99bf99ad88d3c4abab7e7dc41c";
        const actualSignature = bytesToHex(await txSigner.sign(tx));
        if (actualSignature !== expectedSignature) {
            throw new Error(`Signature mismatch. Expected: ${expectedSignature}, Actual: ${actualSignature}`);
        }
        log("Signature check successful");

        const expectedSignedBytes = "0000018fcbcdeef0d36e467c73e2840140cc41b3d72f8a5a7446b2399c39b9c74d4cf077d250902400000002540be400010000c4cb545f748a28770042f893784ce85b107389004d6a0e0d6d7518eeae1292d90000001ca35f0e0004039a7df67f79246283fdc93af76d4f8cdd62c4886e8cd870944e817dd0b97934fdc91e809201fdada92235637d3a570a4dac980a44322ee0b9b5e14b11c4cdc9cf064bc3e0f9f73dd7ec1051f50fc9298148151a7d99bf99ad88d3c4abab7e7dc41c";
        const actualSignedBytes = bytesToHex(tx.signedBytes!);
        if (actualSignedBytes !== expectedSignedBytes) {
            throw new Error(`Signed bytes mismatch. Expected: ${expectedSignedBytes}, Actual: ${actualSignedBytes}`);
        }
        log("Signed bytes check successful");
    } catch (e: any) {
        console.error(e)
        log(e?.message || String(e), true)
    }
}


document.getElementById("connect-wallet-btn")?.addEventListener("click", async (e) => {
    e.preventDefault()
    try {
        document.getElementById("tx-signing-form")!.style.display = "block"

        log('Connecting SDK...')
        await metamaskSDK.connect()
        log('SDK connected')

        log('Requesting provider...')
        provider = await metamaskSDK.getProvider()
        if (!provider) {
            throw new Error("No provider")
        }
        log('Got provider')

        const myAddress = (await provider.request({
            method: "eth_accounts",
        })) as string[]
        if (!myAddress || myAddress.length === 0) {
            throw new Error("No address")
        }

        (document.getElementById("wallet-address-eth") as HTMLInputElement).value = myAddress[0]

        const hyperAddr = ETHAddrToEIP712Str(myAddress[0]);

        (document.getElementById("wallet-address-hyper") as HTMLInputElement).value = hyperAddr
    } catch (e: any) {
        log(e?.message || String(e), true)
    }
})

let provider: SDKProvider | undefined = undefined

document.getElementById("sign-and-send-tx")?.addEventListener("click", async (e) => {
    e.preventDefault();

    try {
        if (!provider) {
            throw new Error("No provider")
        }

        const receiversAddress = (document.getElementById("receivers-address") as HTMLInputElement).value
        const senderAddress = (document.getElementById("wallet-address-hyper") as HTMLInputElement).value

        log(`Receiver's balance: ${formatBalance(await getBalance(receiversAddress))}`)
        log(`Sender's balance: ${formatBalance(await getBalance(senderAddress))}`)

        const chainIdStr = (await getNetwork()).chainId
        const chainId = idStringToBigInt(chainIdStr)
        const chainIdSafe = safeChainId(chainId)

        //add chain
        await provider.request({
            method: "wallet_addEthereumChain",
            params: [{
                chainId: `0x${chainIdSafe.toString(16)}`,
                rpcUrls: ["https://chain-id-echo.glitch.me/" + chainIdSafe],
                chainName: "HyperSDK Custom",
            }]
        });

        log("Chain added")

        await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${chainIdSafe.toString(16)}` }],
        });

        log("Switched to the new chain")

        const txSigner = new EIP712BrowserSigner(provider)

        const action = new TransferAction(
            receiversAddress,
            fromFormattedBalance((document.getElementById("amount") as HTMLInputElement).value)
        )

        const tx = new Transaction(
            BigInt(Math.floor((new Date().getTime() + 1000 * 60 * 1) / 1000)) * 1000n,
            chainId,
            fromFormattedBalance((document.getElementById("max-fee") as HTMLInputElement).value),
            [action],
        )

        await tx.sign(txSigner);
        const debugMsg = `EIP712 JSON: ${JSON.stringify(await txSigner._getMsgParams(tx), null, 2)}`
        const eip712JsonElement = document.getElementById("eip712-json")
        if (eip712JsonElement) {
            eip712JsonElement.innerText = debugMsg
        }

        const sendersBalanceBeforeSend = await getBalance(senderAddress)

        await sendTx(tx.signedBytes!)
        log("Tx sent")

        log("Waiting for balance change...")
        let changed = false
        for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const sendersBalanceAfterSend = await getBalance(senderAddress);
            if (sendersBalanceBeforeSend !== sendersBalanceAfterSend) {
                log(`Sender's balance changed`)
                changed = true
                break
            }
        }
        if (!changed) {
            throw new Error("Balance did not change")
        }

        log(`Receiver's balance: ${formatBalance(await getBalance(receiversAddress))}`)
        log(`Sender's balance: ${formatBalance(await getBalance(senderAddress))}`)

        log("Test complete")
    } catch (e: any) {
        console.error(e)
        log(e?.message || String(e), true)
    }
})

// testSignatures()
// testTransfer()