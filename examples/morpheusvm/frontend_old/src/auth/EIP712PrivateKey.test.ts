import { expect, test } from "vitest"
import { Transaction } from "../chain/Transaction"
import { idStringToBigInt } from "../chain/Id"
import { TransferAction } from "../actions/TransferAction"
import { EIP712PrivateKeySigner } from "./EIP712PrivateKey"
import { bytesToHex } from "@noble/hashes/utils"

test('Tx with a transfer action signature', async () => {
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
    expect(
        bytesToHex(tx.digest())
    ).toBe(
        "0000018fcbcdeef0d36e467c73e2840140cc41b3d72f8a5a7446b2399c39b9c74d4cf077d250902400000002540be400010000c4cb545f748a28770042f893784ce85b107389004d6a0e0d6d7518eeae1292d90000001ca35f0e00"
    )

    const signer = new EIP712PrivateKeySigner("fad9c8855b740a0b7ed4c221dbad0f33a83a49cad6b3fe8d5817ac83d38b6a19")
    await tx.sign(signer)

    expect(
        bytesToHex(await signer.sign(tx))
    ).toBe(
        "c91e809201fdada92235637d3a570a4dac980a44322ee0b9b5e14b11c4cdc9cf064bc3e0f9f73dd7ec1051f50fc9298148151a7d99bf99ad88d3c4abab7e7dc41c"
    )

    expect(
        bytesToHex(tx.signedBytes!)
    ).toBe(
        "0000018fcbcdeef0d36e467c73e2840140cc41b3d72f8a5a7446b2399c39b9c74d4cf077d250902400000002540be400010000c4cb545f748a28770042f893784ce85b107389004d6a0e0d6d7518eeae1292d90000001ca35f0e0004039a7df67f79246283fdc93af76d4f8cdd62c4886e8cd870944e817dd0b97934fdc91e809201fdada92235637d3a570a4dac980a44322ee0b9b5e14b11c4cdc9cf064bc3e0f9f73dd7ec1051f50fc9298148151a7d99bf99ad88d3c4abab7e7dc41c"
    )
})
