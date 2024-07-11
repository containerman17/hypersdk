

import * as sigUtil from "@metamask/eth-sig-util";

async function start() {
    const msgParams = {
        domain: {
            chainId: 1,
            name: 'Ether Mail',
            verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
            version: '1',
        },
        message: {
            contents: 'Hello, Bob!',
            from: {
                name: 'Cow',
                wallets: [
                    '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
                    '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF',
                ],
            },
            to: [
                {
                    name: 'Bob',
                    wallets: [
                        '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
                        '0xB0BdaBea57B0BDABeA57b0bdABEA57b0BDabEa57',
                        '0xB0B0b0b0b0b0B000000000000000000000000000',
                    ],
                },
            ],
            attachment: '0x',
        },
        primaryType: 'Mail' ,
        types: {
            EIP712Domain: [
                { name: 'name', type: 'string' },
                { name: 'version', type: 'string' },
                { name: 'chainId', type: 'uint256' },
                { name: 'verifyingContract', type: 'address' },
            ],
            Group: [
                { name: 'name', type: 'string' },
                { name: 'members', type: 'Person[]' },
            ],
            Mail: [
                { name: 'from', type: 'Person' },
                { name: 'to', type: 'Person[]' },
                { name: 'contents', type: 'string' },
                { name: 'attachment', type: 'bytes' },
            ],
            Person: [
                { name: 'name', type: 'string' },
                { name: 'wallets', type: 'address[]' },
            ],
        },
    };

    const privateKey = "fad9c8855b740a0b7ed4c221dbad0f33a83a49cad6b3fe8d5817ac83d38b6a19"
    const sig = sigUtil.signTypedData({
        privateKey: Buffer.from(privateKey, 'hex'),
        data: msgParams,
        version: sigUtil.SignTypedDataVersion.V4,
    })

    const expectedSignature = "0xba81cb7af061d4e2ef7f698f9e78eacaf7cab8e965bec85dae1caee4655d9e3425fc832c30544a20d46c3d856928fb458a5e0d1785f8d6e07ed92285d621e4771b"

    if(sig !== expectedSignature){
        console.error("❌ Signature mismatch!")
    } else{
        console.log("✅ Signature match!")
    }

    const expectedRecoveredAddr = "0x96216849c49358b10257cb55b28ea603c874b05e"
    const recoveredAddr = sigUtil.recoverTypedSignature({
        signature: sig,
        data: msgParams,
        version: sigUtil.SignTypedDataVersion.V4,
    })

    if(recoveredAddr !== expectedRecoveredAddr){
        console.error("❌ Recovered address mismatch!")
    } else{
        console.log("✅ Recovered address match!")
    }

}

start().then(console.log)
