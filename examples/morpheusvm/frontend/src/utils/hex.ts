export const Uint8ArrToHex = (arr: Uint8Array): string => {
    return arr.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
}