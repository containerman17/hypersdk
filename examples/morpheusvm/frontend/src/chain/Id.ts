import { cb58 } from "../utils/cb58";

export function idStringToBigInt(id: string): bigint {
    const bytes = cb58.decode(id);
    return BigInt(`0x${bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '')}`);
}