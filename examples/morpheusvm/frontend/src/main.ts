import MetaMaskSDK from '@metamask/sdk'

const sdk = new MetaMaskSDK({
    dappMetadata: {
        name: "Pure JS example",
        url: window.location.host,
    },
    logging: {
        sdk: true,
    }
});

const toGoStyleIsoString = (date: Date) => date.toISOString().slice(0, -5) + 'Z'

abstract class Action {
    abstract toJSON(): string;
}
const DECIMALS = 9;

class Transaction extends Action {
    public readonly to: string;
    public readonly value: number;
    constructor(
        _to: string,
        _value: number,
    ) {
        super();
        this.to = _to;
        this.value = Math.floor(parseFloat(_value.toString()) * 10 ** DECIMALS);
    }

    toJSON(): string {
        return JSON.stringify({
            to: this.to,
            value: (this.value / 10 ** DECIMALS).toFixed(DECIMALS),//FIXME: might loose precision
        })
    }
}

console.log(new Transaction("morpheus1qypqxpq9qcrsszg2pvxq6rs0zqqqqqqqqqqqqqqqqqqqqqqqqqqqql22w7h", 123).toJSON());

const CHAIN_ID = "kF3cvAzriLGjFjCTzVPeJcQqoW8kMYX1PLisuZdQ5R4URPxE2"

await getBalance("morpheus1qypqxpq9qcrsszg2pvxq6rs0zqqqqqqqqqqqqqqqqqqqqqqqqqqqql22w7h").then(console.log)

async function getBalance(address: string): Promise<bigint> {
    const response = await fetch(`http://127.0.0.1:9650/ext/bc/${CHAIN_ID}/morpheusapi`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            jsonrpc: "2.0",
            method: "morpheusvm.balance",
            params: { address },
            id: parseInt(String(Math.random()).slice(2))
        })
    });

    const json = await response.json();
    return BigInt(json.result.amount);
}