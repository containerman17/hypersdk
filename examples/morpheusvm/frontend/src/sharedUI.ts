import MetaMaskSDK, { SDKProvider } from "@metamask/sdk"

let cachedProviderPromise: Promise<SDKProvider> | null = null;

export async function getProvider(): Promise<SDKProvider> {
    if (!cachedProviderPromise) {
        cachedProviderPromise = (async () => {
            const metamaskSDK = new MetaMaskSDK();
            await metamaskSDK.connect();
            const provider = metamaskSDK.getProvider();
            if (!provider) {
                throw new Error("Failed to get provider");
            }
            return provider;
        })();
    }
    return cachedProviderPromise;
}