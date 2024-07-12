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
    constructor(
        public readonly timestamp: bigint,
        public readonly chainId: bigint,
        public readonly maxFee: bigint,
    ) {
    }
    baseBinary() {
        const packer = new MiniPacker(new Uint8Array([]));
        packer.packUint64(this.timestamp);
        packer.packUint256(this.chainId);
        packer.packUint64(this.maxFee);
        return Array.from(packer.bytes()).map(b => b.toString(16).padStart(2, '0')).join('')
    }
}
const DECIMALS = 9;

class EmptyAction extends Action {
    constructor(
        {
            _timestamp,
            _chainId,
            _maxFee,
        }: {
            _timestamp: bigint,
            _chainId: bigint,
            _maxFee: bigint,
        },
    ) {
        super(_timestamp, _chainId, _maxFee);
    }

    toJSON(): string {
        return "{}"
    }
}

class Transaction extends Action {
    constructor(
        public readonly to: string,
        public readonly value: string,
        {
            _timestamp,
            _chainId,
            _maxFee,
        }: {
            _timestamp: bigint,
            _chainId: bigint,
            _maxFee: bigint,
        },
    ) {
        super(_timestamp, _chainId, _maxFee);

        if (value.split('.').length !== 2 || value.split('.')[1].length !== DECIMALS) {
            throw new Error('Invalid value. It has to be a number with ' + DECIMALS + ' decimals');
        }
    }

    toJSON(): string {
        return JSON.stringify({
            to: this.to,
            value: this.value,
        })
    }
}

const CHAIN_ID = "kF3cvAzriLGjFjCTzVPeJcQqoW8kMYX1PLisuZdQ5R4URPxE2"

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


function log(message: string, isError: boolean = false) {
    const div = document.createElement('div');
    div.innerText = currentTime() + ": " + message;
    if (isError) {
        div.style.color = 'red';
    }
    document.getElementById('log')?.appendChild(div);
}

const currentTime = () => {
    const date = new Date();
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`
}

class MiniPacker {
    private _bytes: Uint8Array;

    constructor(bytes: Uint8Array) {
        this._bytes = bytes;
    }
    private packUintGeneric(value: bigint, byteLength: number): void {
        const buffer = new ArrayBuffer(byteLength);
        const view = new DataView(buffer);
        for (let i = 0; i < byteLength; i++) {
            view.setUint8(byteLength - 1 - i, Number(value & 255n));
            value >>= 8n;
        }
        const newBytes = new Uint8Array(buffer);
        this._bytes = new Uint8Array([...this._bytes, ...newBytes]);
    }

    packUint64(value: bigint): void {
        this.packUintGeneric(value, 8);
    }

    packUint256(value: bigint): void {
        this.packUintGeneric(value, 32);
    }

    bytes(): Uint8Array {
        return this._bytes;
    }
}

async function startTests() {
    try {
        const addr1 = "morpheus1qypqxpq9qcrsszg2pvxq6rs0zqqqqqqqqqqqqqqqqqqqqqqqqqqqql22w7h"

        log("Checking balance of " + addr1 + "...");
        log("Balance: " + (await getBalance(addr1)).toString(), false)

        log("Testing packing of base binary...")
        const expectedString = "0000018fcbcdeef0622fc5a40deee96bfb1f1ccfc7ac73668d7598aa9df3796fd6681dbb21bb465a00000002540be400"
        // const expectedString = "0000018fcbcdeef0"
        const action = new EmptyAction({
            _timestamp: 1717111222000n,
            _chainId: 1n, // cb decode kF3cvAzriLGjFjCTzVPeJcQqoW8kMYX1PLisuZdQ5R4URPxE2
            _maxFee: 10n * (10n ** 9n),
        })
        log("Expected: " + expectedString, false)
        log("Actual__: " + action.baseBinary(), false)
        if (action.baseBinary() !== expectedString) {
            throw new Error("Actual binary is not equal to expected")
        }
    } catch (e: any) {
        console.error(e)
        log(e?.message || String(e), true)
    }
}

startTests()