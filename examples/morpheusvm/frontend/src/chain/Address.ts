import { bech32 } from '@scure/base';
import { getAddress } from 'ethers';

// Constants
const EIP712ID = 0x04; // Replace with the actual EIP712ID value
const ED25519 = 0x00;
const AddressLen = 33;

export function EIP712AddrToETHAddr(addr: Uint8Array): string {
    // Check if the first byte is the correct ID
    if (addr[0] !== EIP712ID) {
        throw new Error("invalid EIP712 address: incorrect ID");
    }

    // Check if the bytes between 1 and last 20 are zeros
    for (let i = 1; i < AddressLen - 20; i++) {
        if (addr[i] !== 0) {
            throw new Error("invalid EIP712 address: non-zero bytes in padding");
        }
    }

    // Extract the last 20 bytes
    const ethAddrBytes = addr.slice(AddressLen - 20);
    // Convert to hex string with "0x" prefix
    const hexString = '0x' + Array.from(ethAddrBytes, byte => byte.toString(16).padStart(2, '0')).join('');

    // Use ethers' getAddress function to normalize and validate the address
    return getAddress(hexString);
}

export function ETHAddrToEIP712Addr(addr: string): Uint8Array {
    // Remove "0x" prefix if present
    addr = addr.startsWith('0x') ? addr.slice(2) : addr;

    // Decode the hex string
    const ethAddr = Uint8Array.from(Buffer.from(addr, 'hex'));

    // Check if the address is 20 bytes long
    if (ethAddr.length !== 20) {
        throw new Error(`invalid ETH address length: expected 20 bytes, got ${ethAddr.length}`);
    }

    // Create a new Uint8Array with 33 elements
    const eip712Addr = new Uint8Array(AddressLen);

    // Set the first byte to EIP712ID
    eip712Addr[0] = EIP712ID;

    // Copy the ETH address to the last 20 bytes of the EIP712 address
    eip712Addr.set(ethAddr, AddressLen - 20);

    return eip712Addr;
}

const HRP = 'morpheus';

export function ETHAddrToEIP712Str(ethAddr: string): string {
    const eip712Addr = ETHAddrToEIP712Addr(ethAddr);
    return bech32.encode(HRP, bech32.toWords(eip712Addr));
}
import { base58 } from '@scure/base';

export function Base58PubKeyToED25519Addr(base58str: string): string {
    const pubKeyBytes = base58.decode(base58str);
    const eip712Addr = new Uint8Array(AddressLen);
    eip712Addr[0] = ED25519;
    eip712Addr.set(pubKeyBytes, 1);
    return bech32.encode(HRP, bech32.toWords(eip712Addr));
}