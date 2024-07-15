import { expect, test } from 'vitest'
import { idStringToBigInt } from './Id'
import { Transaction } from './Transaction'

test('Empty transaction', () => {
    const expectedDigestHex = "0000018fcbcdeef0d36e467c73e2840140cc41b3d72f8a5a7446b2399c39b9c74d4cf077d250902400000002540be40000"

    const chainId = idStringToBigInt("2c7iUW3kCDwRA9ZFd5bjZZc8iDy68uAsFSBahjqSZGttiTDSNH")

    const tx = new Transaction(
        1717111222000n,
        chainId,
        10n * (10n ** 9n),
        [],
    )

    const digestHex = tx.digest().reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
    expect(digestHex).toBe(expectedDigestHex);
})
