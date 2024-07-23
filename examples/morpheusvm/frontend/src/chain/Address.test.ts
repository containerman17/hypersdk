import { describe, it, expect } from 'vitest';
import { Base58PubKeyToED25519Addr, EIP712AddrToETHAddr, ETHAddrToEIP712Addr, ETHAddrToEIP712Str } from './Address';
import { bech32 } from '@scure/base';

describe('EIP712AddrToETHAddr', () => {
    it('should convert a valid EIP712 address to ETH address', () => {
        const addr = new Uint8Array(33);
        addr[0] = 0x04;
        addr.set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], 13);
        const result = EIP712AddrToETHAddr(addr);
        expect(result).toBe('0x0102030405060708090a0B0c0d0e0f1011121314');
    });

    it('should throw an error for an EIP712 address with incorrect ID', () => {
        const addr = new Uint8Array(33);
        addr[0] = 0x00;
        expect(() => EIP712AddrToETHAddr(addr)).toThrow('invalid EIP712 address: incorrect ID');
    });

    it('should throw an error for an EIP712 address with non-zero byte where zero expected', () => {
        const addr = new Uint8Array(33);
        addr[0] = 0x04;
        addr[1] = 0x01;
        expect(() => EIP712AddrToETHAddr(addr)).toThrow('invalid EIP712 address: non-zero bytes in padding');
    });
});

describe('ETHAddrToEIP712Addr', () => {
    it('should convert a valid ETH address to EIP712 address', () => {
        const addr = '0x0102030405060708090a0b0c0d0e0f1011121314';
        const result = ETHAddrToEIP712Addr(addr);
        const expected = new Uint8Array(33);
        expected[0] = 0x04;
        expected.set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], 13);
        expect(result).toEqual(expected);
    });

    it('should throw an error for an ETH address with incorrect length', () => {
        const addr = '0x01020304';
        expect(() => ETHAddrToEIP712Addr(addr)).toThrow('invalid ETH address length: expected 20 bytes, got 4');
    });
});

describe('ETHAddrSpec', () => {
    it('should convert ETH address to EIP712 address and back', () => {
        const ethAddr = '0x96216849c49358B10257cb55b28eA603c874b05E';
        const eip712Addr = ETHAddrToEIP712Addr(ethAddr);
        const ethAddrReversed = EIP712AddrToETHAddr(eip712Addr);
        expect(ethAddrReversed).toBe(ethAddr);
    });
});


describe('ETHAddrToEIP712Str', () => {
    it('should convert ETH address to EIP712 Bech32 string and back', () => {
        const ethAddr = '0x96216849c49358B10257cb55b28eA603c874b05E';

        // Convert ETH address to EIP712 Bech32 string
        const eip712AddrStr = ETHAddrToEIP712Str(ethAddr);
        expect(eip712AddrStr).toBe('morpheus1qsqqqqqqqqqqqqqqqqqqp93pdpyufy6ckyp90j64k282vq7gwjc9u7lsetm');

        // Convert EIP712 Bech32 string back to ETH address
        const eip712Addr = bech32.fromWords(bech32.decode(eip712AddrStr).words);
        const ethAddrReversed = EIP712AddrToETHAddr(new Uint8Array(eip712Addr));
        expect(ethAddrReversed).toBe(ethAddr);
    });
});

describe('Base58PubKeyToED25519Addr', () => {
    it.only('should follow specs', () => {
        const pubKeyBase58 = '2wqEBtJdxxWxAxpuy7Duu7TCvDm7H3ydEg6vZ7Ry4TeP'
        const expectedAddress = 'morpheus1qztfzd0eeyp4evm6w6lede688pxry662n2kwewc0094p7r89ws56wm0u542'

        expect(Base58PubKeyToED25519Addr(pubKeyBase58)).toBe(expectedAddress)
    })
})