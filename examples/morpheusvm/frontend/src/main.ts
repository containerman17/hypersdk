import MetaMaskSDK from '@metamask/sdk'
import { cb58 } from './utils/cb58';
import { bytesToHex } from '@noble/hashes/utils';
import { EIP712BrowserSigner } from './auth/EIP712Browser';
import { TransferAction } from './actions/TransferAction';
import { idStringToBigInt } from './chain/Id';
import { Transaction } from "./chain/Transaction"

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

const METAMASK_MAX_SAFE_CHAIN_ID = 4503599627370476n;


const CHAIN_ID = "2c7iUW3kCDwRA9ZFd5bjZZc8iDy68uAsFSBahjqSZGttiTDSNH"
const chainIdBytes = cb58.decode(CHAIN_ID)
const chainIdBigint = BigInt('0x' + bytesToHex(chainIdBytes))
const safeChainId = chainIdBigint % METAMASK_MAX_SAFE_CHAIN_ID

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

        const txSigner = new EIP712BrowserSigner(provider)

        const action = new TransferAction(
            "morpheus1qrzvk4zlwj9zsacqgtufx7zvapd3quufqpxk5rsdd4633m4wz2fdjk97rwu",
            123n * (10n ** 9n)
        )

        const chainId = idStringToBigInt("2c7iUW3kCDwRA9ZFd5bjZZc8iDy68uAsFSBahjqSZGttiTDSNH")

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

        const expectedSignature = "d67f92c8889a190991db0f0830cb19efeb12e058a7d099a15384eafcd9859b054fda4ce67cb49f8ec27635dd2f00050ec0c09ada185a32d0ff914e3ed930e2d41c";
        const actualSignature = bytesToHex(await txSigner.sign(tx));
        if (actualSignature !== expectedSignature) {
            throw new Error(`Signature mismatch. Expected: ${expectedSignature}, Actual: ${actualSignature}`);
        }
        log("Signature check successful");

        const expectedSignedBytes = "0000018fcbcdeef0d36e467c73e2840140cc41b3d72f8a5a7446b2399c39b9c74d4cf077d250902400000002540be400010000c4cb545f748a28770042f893784ce85b107389004d6a0e0d6d7518eeae1292d90000001ca35f0e0004049a7df67f79246283fdc93af76d4f8cdd62c4886e8cd870944e817dd0b97934fdd7719d0810951e03418205868a5c1b40b192451367f28e0088dd75e15de40c05d67f92c8889a190991db0f0830cb19efeb12e058a7d099a15384eafcd9859b054fda4ce67cb49f8ec27635dd2f00050ec0c09ada185a32d0ff914e3ed930e2d41c";
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