import { useState } from "react"
import { ETHAddrToEIP712Str } from "./chain/Address"
import { getBalance, getNetwork, sendTx } from "./api"
import { formatBalance, fromFormattedBalance } from "./utils/formatBalance"
import { getProvider } from "./sharedUI";
import { Button } from "./Btn";
import { METAMASK_MAX_SAFE_CHAIN_ID, idStringToBigInt, safeChainId } from "./chain/Id";
import { EIP712BrowserSigner } from "./auth/EIP712Browser";
import { TransferAction } from "./actions/TransferAction";
import { Transaction } from "./chain/Transaction";



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

    async function sendTransaction() {
        try {

            const provider = await getProvider()

            const chainIdStr = (await getNetwork()).chainId
            const chainId = idStringToBigInt(chainIdStr)

            const txSigner = new EIP712BrowserSigner(provider)

            const action = new TransferAction(
                snapAddr,
                fromFormattedBalance("1.0")
            )

            const tx = new Transaction(
                BigInt(Math.floor((new Date().getTime() + 1000 * 60 * 1) / 1000)) * 1000n,
                chainId,
                fromFormattedBalance("0.1"),
                [action],
            )

            const receiverBalanceBefore = formatBalance(await getBalance(snapAddr))

            await tx.sign(txSigner);
            logMessage(`Signed transaction`, "success")

            await sendTx(tx.signedBytes!)

            logMessage("Transaction sent", "success")
            logMessage(`Waiting for receiver balance to increase from ${receiverBalanceBefore}`, "info")

            const startTime = Number(new Date())
            for (let i = 0; i < 200; i++) {
                await new Promise(resolve => setTimeout(resolve, 100));
                const receiverBalanceAfter = formatBalance(await getBalance(snapAddr))
                if (receiverBalanceAfter !== receiverBalanceBefore) {
                    logMessage(`Receiver balance increased from ${receiverBalanceBefore} to ${receiverBalanceAfter} in ${((Number(new Date()) - startTime) / 1000).toFixed(2)}s`, "success")
                    break
                }
            }
        } catch (e) {
            logMessage("Failed to send transaction: " + e, "error")
            console.error(e)
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

            const chainIdStr = (await getNetwork()).chainId
            const chainId = idStringToBigInt(chainIdStr)
            logMessage("Got chain ID: " + chainIdStr, "info")
            const chainIdSafe = safeChainId(chainId)
            logMessage("Got safe chain ID: " + chainIdSafe + " by dividing by " + METAMASK_MAX_SAFE_CHAIN_ID, "info")

            //add chain
            await provider.request({
                method: "wallet_addEthereumChain",
                params: [{
                    chainId: `0x${chainIdSafe.toString(16)}`,
                    rpcUrls: ["https://chain-id-echo.glitch.me/" + chainIdSafe],
                    chainName: "HyperSDK Custom",
                }]
            });

            logMessage("Chain added", "success")

            await provider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: `0x${chainIdSafe.toString(16)}` }],
            });

            logMessage(`Switched to the new chain 0x${chainIdSafe.toString(16)}`, "success")

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
                    <Button onClick={sendTransaction} variant="primary" disabled={!snapAddr}>
                        Transfer 1 TKN
                    </Button>
                </div >
            </>
        }
        {log && <div className="mt-8">
            <pre className="bg-white rounded-md border border-gray-200 p-4 text-sm overflow-auto whitespace-pre-wrap">{log}</pre>
        </div>}
    </>)
}