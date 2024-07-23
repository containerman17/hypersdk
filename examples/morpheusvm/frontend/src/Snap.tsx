import { useState } from "react"
import { getProvider } from "./sharedUI"
import { Button } from "./Btn"
import { getBalance, getNetwork, sendTx } from "./api";
import { formatBalance, fromFormattedBalance } from "./utils/formatBalance";
import { Base58PubKeyToED25519Addr } from "./chain/Address";
import { MetamaskSnapSigner, invokeSnap } from "./auth/MetamaskSnap";
import { idStringToBigInt } from "./chain/Id";
import { TransferAction } from "./actions/TransferAction";
import { Transaction } from "./chain/Transaction";



type Snap = {
    permissionName: string;
    id: string;
    version: string;
    initialPermissions: Record<string, unknown>;
};
type GetSnapsResponse = Record<string, Snap>;

interface SnapProps {
    eip712HyperAddr: string
    onAddrChanged: (addr: string) => void
}
export function Snap({ eip712HyperAddr, onAddrChanged }: SnapProps) {
    const [log, setLog] = useState("")
    const logMessage = (message: string, type: "success" | "error" | "info") => {
        setLog(log => log.trim() + "\n" + (type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️") + " " + message)
    }

    async function sendTransaction() {
        try {

            const provider = await getProvider()

            const chainIdStr = (await getNetwork()).chainId
            const chainId = idStringToBigInt(chainIdStr)

            const txSigner = new MetamaskSnapSigner(provider)

            const action = new TransferAction(
                eip712HyperAddr,
                fromFormattedBalance("1.0")
            )

            const tx = new Transaction(
                BigInt(Math.floor((new Date().getTime() + 1000 * 60 * 1) / 1000)) * 1000n,
                chainId,
                fromFormattedBalance("0.1"),
                [action],
            )

            const receiverBalanceBefore = formatBalance(await getBalance(eip712HyperAddr))

            await tx.sign(txSigner);
            logMessage(`Signed transaction`, "success")

            await sendTx(tx.signedBytes!)

            logMessage("Transaction sent", "success")
            logMessage(`Waiting for receiver balance to increase from ${receiverBalanceBefore}`, "info")

            const startTime = Number(new Date())
            for (let i = 0; i < 200; i++) {
                await new Promise(resolve => setTimeout(resolve, 100));
                const receiverBalanceAfter = formatBalance(await getBalance(eip712HyperAddr))
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

            const providerversion = (await provider?.request({ method: "web3_clientVersion" })) as string || ""
            if (!providerversion.includes("flask")) {
                throw new Error("Please install MetaMask Flask!")
            }
            logMessage(`Flask detected! ${providerversion}`, "success")

            const snaps = (await provider.request({
                method: 'wallet_getSnaps',
            })) as GetSnapsResponse;

            if (Object.keys(snaps).length > 0) {
                logMessage('Snap is already installed', "success")
            } else {
                logMessage('Installing snap...', "info")
                await provider.request({
                    method: 'wallet_requestSnaps',
                    params: {
                        ['local:http://localhost:8080']: {},
                    },
                })
                logMessage(`Snap installed`, "success")

                const snaps = (await provider.request({
                    method: 'wallet_getSnaps',
                })) as GetSnapsResponse;

                if (Object.keys(snaps).length > 0) {
                    logMessage(`Snap installed`, "success")
                } else {
                    logMessage(`Snap not installed`, "error")
                }
            }

            logMessage(`Getting public key...`, "info")
            const pubKey = await invokeSnap(provider, { method: 'getPublicKey', params: { derivationPath: ["0'"], confirm: false } }) as string | undefined


            if (pubKey) {
                const address = Base58PubKeyToED25519Addr(pubKey)
                setMyAddress(address)
                onAddrChanged(address)
            } else {
                throw "Failed to get public key"
            }

            logMessage(`Got public key: ${pubKey}`, "success")
        } catch (e) {
            const errorMessage = (e as Error).message || String(e);
            logMessage(errorMessage, "error");
        }
    }

    const [myAddress, setMyAddress] = useState<string>("")


    const [balance, setBalance] = useState("Not loaded yet")
    async function refreshBalance() {
        try {
            setBalance("Refreshing...")
            const balanceBigInt = await getBalance(myAddress)
            setBalance(formatBalance(balanceBigInt))
        } catch (e) {
            setBalance("Failed to refresh balance")
            console.error(e)
            logMessage("Failed to refresh balance: " + e, "error")
        }
    }

    return (<>
        {!myAddress &&
            (<div className="mt-8">
                <Button onClick={connectWallet}>
                    Install & connect snap
                </Button>
            </div>)
        }
        {
            myAddress &&
            (<>

                <div className="mt-4">
                    <div className="text-lg font-bold">My Address</div>
                    <pre className="text-sm">{myAddress}</pre>
                </div >

                <div className="mt-4">
                    <div className="text-lg font-bold">My Balance</div>
                    <pre className="text-sm">{balance}</pre>
                </div >

                <div className="mt-4">
                    <Button onClick={refreshBalance} variant="secondary">
                        Refresh balance
                    </Button>
                    <Button onClick={sendTransaction} variant="primary" disabled={!eip712HyperAddr}>
                        Send 1 TKN
                    </Button>
                </div >
            </>)
        }

        {log && <div className="mt-8">
            <pre className="bg-white rounded-md border border-gray-200 p-4 text-sm overflow-auto whitespace-pre-wrap">{log}</pre>
        </div>}
    </>)
}