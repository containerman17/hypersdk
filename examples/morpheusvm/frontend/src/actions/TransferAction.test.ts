import { expect, test } from 'vitest'
import { Uint8ArrToHex } from '../utils/hex'
import { TransferAction } from './TransferAction'
import { idStringToBigInt } from '../chain/Id'
import { Transaction } from '../chain/Transaction'


test('Transfer action bytes', () => {
    const expectedBytesHex = "00c4cb545f748a28770042f893784ce85b107389004d6a0e0d6d7518eeae1292d90000001ca35f0e00"

    const action = new TransferAction(
        "morpheus1qrzvk4zlwj9zsacqgtufx7zvapd3quufqpxk5rsdd4633m4wz2fdjk97rwu",
        123n * (10n ** 9n)
    )

    expect(
        Uint8ArrToHex(action.toBytes())
    ).toBe(expectedBytesHex);
})



test('Tx with a transfer action digest', () => {
    const expectedDigest = "0000018fcbcdeef0d36e467c73e2840140cc41b3d72f8a5a7446b2399c39b9c74d4cf077d250902400000002540be400010000c4cb545f748a28770042f893784ce85b107389004d6a0e0d6d7518eeae1292d90000001ca35f0e00"

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

    expect(
        Uint8ArrToHex(tx.digest())
    ).toBe(expectedDigest);
})