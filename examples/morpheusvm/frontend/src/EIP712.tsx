import { useState } from "react"
import { ETHAddrToEIP712Str } from "./chain/Address"
import { getBalance } from "./api"
import { formatBalance } from "./utils/formatBalance"
import { getProvider } from "./sharedUI";
import { Button } from "./Btn";



export function EIP712({ onHyperAddrChange, snapAddr }: {
    onHyperAddrChange: (hyperAddr: string) => void
    snapAddr: string
}) {
    const [log, setLog] = useState("")
    const logMessage = (message: string, type: "success" | "error" | "info") => {
        setLog(log => log.trim() + "\n" + (type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️") + " " + message)
    }


    const [hyperAddr, setHyperAddr] = useState("")

    const [balance, setBalance] = useState("Not loaded yet")
    async function refreshBalance() {
        try {
            setBalance("Refreshing...")
            const balanceBigInt = await getBalance(hyperAddr)
            setBalance(formatBalance(balanceBigInt))
        } catch (e) {
            setBalance("Failed to refresh balance")
            console.error(e)
            logMessage("Failed to refresh balance: " + e, "error")
        }
    }

    async function connectWallet() {
        try {
            const provider = await getProvider()

            logMessage("Requesting accounts...", "info")
            const accounts = await provider.request({ method: "eth_requestAccounts" }) as string[] | undefined
            if (!accounts || accounts?.length === 0) {
                logMessage("Failed to get accounts", "error")
                return
            }
            logMessage("Connected to wallet: " + accounts[0], "success")

            const hyperAddr = ETHAddrToEIP712Str(accounts[0])
            setHyperAddr(hyperAddr)
            onHyperAddrChange(hyperAddr)
        } catch (e) {
            logMessage("Failed to connect wallet: " + e, "error")
            console.error(e)
        }
    }

    return (<>
        {!hyperAddr &&
            (<div className="mt-8">
                <Button onClick={connectWallet}>
                    Connect wallet
                </Button>
            </div>)
        }
        {
            hyperAddr &&
            <>
                <div className="mt-4">
                    <div className="text-lg font-bold">My Address</div>
                    <pre className="text-sm">{hyperAddr}</pre>
                </div >

                <div className="mt-4">
                    <div className="text-lg font-bold">My Balance</div>
                    <pre className="text-sm">{balance}</pre>
                </div >

                <div className="mt-4">
                    <Button onClick={refreshBalance} variant="secondary">
                        Refresh balance
                    </Button>
                    <Button onClick={refreshBalance} variant="primary" disabled={!snapAddr}>
                        Send tokens to the Snap address
                    </Button>
                </div >
            </>
        }
        {log && <div className="mt-8">
            <pre className="bg-white rounded-md border border-gray-200 p-4 text-sm overflow-auto whitespace-pre-wrap">{log}</pre>
        </div>}
    </>)
}