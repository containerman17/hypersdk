import MetaMaskSDK from '@metamask/sdk'

const metamaskSDK = new MetaMaskSDK({
    dappMetadata: {
        name: "Pure JS example",
        url: window.location.host,
    },
    logging: {
        sdk: true,
    }
});


const CHAIN_ID = "2c7iUW3kCDwRA9ZFd5bjZZc8iDy68uAsFSBahjqSZGttiTDSNH"

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

import { TransferAction } from './actions/TransferAction';
import { idStringToBigInt } from './chain/Id';


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


async function startTests() {
    try {
        const addr1 = "morpheus1qypqxpq9qcrsszg2pvxq6rs0zqqqqqqqqqqqqqqqqqqqqqqqqqqqql22w7h"

        const action = new TransferAction(
            "morpheus1qrzvk4zlwj9zsacqgtufx7zvapd3quufqpxk5rsdd4633m4wz2fdjk97rwu",
            "123.000000000",

            {
                _timestamp: 1717111222000n,
                _chainId: idStringToBigInt(CHAIN_ID),
                _maxFee: 10n * (10n ** 9n),
            })

        log("Checking balance of " + addr1 + "...");
        log("Balance: " + (await getBalance(addr1)).toString(), false)

        log("Testing packing of base binary...")
        const expectedString = "0000018fcbcdeef0d36e467c73e2840140cc41b3d72f8a5a7446b2399c39b9c74d4cf077d250902400000002540be400"
        log("Expected: " + expectedString, false)
        log("Actual__: " + action.baseBinary(), false)
        if (action.baseBinary() !== expectedString) {
            throw new Error("Actual binary is not equal to expected")
        } else {
            log("✅ Base binary bytes match", false)
        }

        log("testing digest")
        const expectedDigest = "0000018fcbcdeef0d36e467c73e2840140cc41b3d72f8a5a7446b2399c39b9c74d4cf077d250902400000002540be400010000c4cb545f748a28770042f893784ce85b107389004d6a0e0d6d7518eeae1292d900000001ca35f0e00"
        const gotDigest = action.digest()
        log("Expected: " + expectedDigest, false)
        log("Actual__: " + gotDigest, false)

    } catch (e: any) {
        console.error(e)
        log(e?.message || String(e), true)
    }
}

startTests()