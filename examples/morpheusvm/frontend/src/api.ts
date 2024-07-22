

export async function getBalance(address: string): Promise<bigint> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
        const response = await fetch(`http://localhost:9650/ext/bc/morpheusvm/morpheusapi`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "morpheusvm.balance",
                params: { address },
                id: parseInt(String(Math.random()).slice(2))
            }),
            signal: controller.signal
        });

        const json = await response.json();
        if (json?.error?.message) {
            throw new Error(json.error.message)
        }
        return BigInt(json.result.amount);
    } catch (error: any) {
        if (error.name === 'AbortError') {
            throw new Error('Request timed out after 3 seconds');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}
