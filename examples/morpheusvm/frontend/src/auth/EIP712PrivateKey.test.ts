import { expect, test } from "vitest"
import { Transaction } from "../chain/Transaction"
import { idStringToBigInt } from "../chain/Id"
import { TransferAction } from "../actions/TransferAction"
import { EIP712Signer } from "./EIP712PrivateKey"
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

    const signer = new EIP712Signer("fad9c8855b740a0b7ed4c221dbad0f33a83a49cad6b3fe8d5817ac83d38b6a19")
    await tx.sign(signer)

    expect(
        bytesToHex(await signer.sign(tx))
    ).toBe(
        "d67f92c8889a190991db0f0830cb19efeb12e058a7d099a15384eafcd9859b054fda4ce67cb49f8ec27635dd2f00050ec0c09ada185a32d0ff914e3ed930e2d41c"
    )

    expect(
        bytesToHex(tx.signedBytes!)
    ).toBe(
        "0000018fcbcdeef0d36e467c73e2840140cc41b3d72f8a5a7446b2399c39b9c74d4cf077d250902400000002540be400010000c4cb545f748a28770042f893784ce85b107389004d6a0e0d6d7518eeae1292d90000001ca35f0e0004049a7df67f79246283fdc93af76d4f8cdd62c4886e8cd870944e817dd0b97934fdd7719d0810951e03418205868a5c1b40b192451367f28e0088dd75e15de40c05d67f92c8889a190991db0f0830cb19efeb12e058a7d099a15384eafcd9859b054fda4ce67cb49f8ec27635dd2f00050ec0c09ada185a32d0ff914e3ed930e2d41c"
    )
})
