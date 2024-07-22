import { useState } from "react"
import MetaMaskSDK, { SDKProvider } from "@metamask/sdk"
import { ETHAddrToEIP712Str } from "./chain/Address"
import { getBalance } from "./api"
import { formatBalance } from "./utils/formatBalance"

export async function getProvider(): Promise<SDKProvider> {
    const metamaskSDK = new MetaMaskSDK()
    await metamaskSDK.connect()
    const provider = metamaskSDK.getProvider()
    if (!provider) {
        throw new Error("Failed to get provider")
    }
    return provider
}

interface ButtonProps {
    onClick: () => void;
    children: React.ReactNode;
    variant?: 'primary' | 'secondary';
}

const Button: React.FC<ButtonProps> = ({ onClick, children, variant = 'primary' }) => {
    const baseClasses = "rounded-md px-3 py-2 text-sm font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
    const variantClasses = variant === 'primary'
        ? "bg-blue-600 text-white hover:bg-blue-500 focus-visible:outline-blue-600"
        : "bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50";

    return (
        <button
            onClick={onClick}
            className={`${baseClasses} ${variantClasses}`}
        >
            {children}
        </button>
    );
};

interface EIP712Props {
    onHyperAddrChange: (hyperAddr: string) => void
}

export function EIP712({ onHyperAddrChange }: EIP712Props) {
    const [log, setLog] = useState("log:")
    const [hyperAddr, setHyperAddr] = useState("")
    const [balance, setBalance] = useState("Not loaded yet")

    function logMessage(message: string) {
        setLog(log => log + "\n" + message)
    }

    async function refreshBalance() {
        try {
            setBalance("Refreshing...")
            const balanceBigInt = await getBalance(hyperAddr)
            setBalance(formatBalance(balanceBigInt))
        } catch (e) {
            setBalance("Failed to refresh balance")
            console.error(e)
            logMessage("Failed to refresh balance: " + e)
        }
    }

    async function connectWallet() {
        try {
            const provider = await getProvider()

            logMessage("Requesting accounts...")
            const accounts = await provider.request({ method: "eth_requestAccounts" }) as string[] | undefined
            if (!accounts || accounts?.length === 0) {
                logMessage("Failed to get accounts")
                return
            }
            logMessage("Connected to wallet: " + accounts[0])

            const hyperAddr = ETHAddrToEIP712Str(accounts[0])
            setHyperAddr(hyperAddr)
            onHyperAddrChange(hyperAddr)
            logMessage("Wallet Connected: " + hyperAddr)
        } catch (e) {
            logMessage("Failed to connect wallet: " + e)
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
        }{
            hyperAddr &&
            <>
                <div className="mt-4">
                    <div className="text-lg font-bold">My Hyper Address</div>
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
                </div >
            </>
        }
        <div className="mt-8">
            <pre className="bg-white rounded-md border border-gray-200 p-4 text-sm overflow-auto whitespace-pre-wrap">{log}</pre>
        </div>
    </>)
}