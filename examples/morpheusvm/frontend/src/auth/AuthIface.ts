import { Transaction } from "../chain/Transaction";

export interface AuthIface {
    sign(tx: Transaction): Promise<Uint8Array>
    getSigner(): Promise<Uint8Array>
    getAuthIDByte(): number
}