import MetaMaskSDK from '@metamask/sdk'
import { cb58 } from './utils/cb58';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
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
    const response = await fetch(`http://127.0.0.1:9650/ext/bc/${CHAIN_ID}/morpheusapi`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            jsonrpc: "2.0",
            method: "morpheusvm.balance",
            params: { address },
            id: parseInt(String(Math.random()).slice(2))
        })
    });

    const json = await response.json();
    return BigInt(json.result.amount);
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


const CHAIN_ID = "2c7iUW3kCDwRA9ZFd5bjZZc8iDy68uAsFSBahjqSZGttiTDSNH"


async function startTests() {
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
                chainName: "Matic Mainnet",
                nativeCurrency: {
                    name: "MATIC",
                    symbol: "MATIC",
                    decimals: 18
                },
                blockExplorerUrls: ["https://polygonscan.com/"]
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

        const pubKey = await txSigner.getSigner()
        log(`Got a signer ${bytesToHex(pubKey)}, ${pubKey.length} bytes`)

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

startTests()