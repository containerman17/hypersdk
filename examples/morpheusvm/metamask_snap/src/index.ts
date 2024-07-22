import type { Json, OnRpcRequestHandler } from '@metamask/snaps-sdk';
import { panel, text, heading, divider, copyable } from '@metamask/snaps-sdk';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import { SLIP10Node } from '@metamask/key-tree';

export const onRpcRequest: OnRpcRequestHandler = async ({
    origin,
    request,
}) => {
    console.log('OnRpcRequestHandler', JSON.stringify({
        request, origin
    }, null, 2));
    const handler = handlers[request.method];
    if (!handler) {
        throw new Error('Method not found.');
    }
    return handler({ origin, request });
};

const handlers: Record<string, OnRpcRequestHandler> = {};

/*
This is a defenition of OnRpcRequestHandler:
export declare type OnRpcRequestHandler<Params extends JsonRpcParams = JsonRpcParams> = (args: {
    origin: string;
    request: JsonRpcRequest<Params>;
}) => Promise<Json>;
*/

handlers['getPublicKey'] = async ({ origin, request }) => {
    const dappHost = (new URL(origin))?.host;

    const { derivationPath, confirm = false } = (request.params || {}) as { derivationPath?: string[], confirm?: boolean };

    assertIsBoolean(confirm);

    const keyPair = await deriveKeyPair(derivationPath || []);

    const pubkey = bs58.encode(keyPair.publicKey);

    if (confirm) {
        const accepted = await renderGetPublicKey(dappHost, pubkey);
        assertConfirmation(!!accepted);
    }

    return pubkey;
};

handlers['signTransaction'] = async ({ origin, request }) => {
    const dappHost = (new URL(origin))?.host;

    const { derivationPath, message } = (request.params || {}) as { derivationPath?: string[], message?: string };

    assertInput(message);
    assertIsString(message);

    const keyPair = await deriveKeyPair(derivationPath || []);

    const accepted = await renderSignTransaction(dappHost, message || "");
    assertConfirmation(!!accepted);

    const signature = nacl.sign.detached(bs58.decode(message || ""), keyPair.secretKey);

    return {
        publicKey: bs58.encode(keyPair.publicKey),
        signature: bs58.encode(signature)
    };
}

handlers['hello'] = ({ origin, request }) => {
    return snap.request({
        method: 'snap_dialog',
        params: {
            type: 'confirmation',
            content: panel([
                text(`Hello, **${origin}**!`),
                text('This custom confirmation is just for display purposes.'),
                text(
                    'But you can edit the snap source code to make it do something, if you want to!',
                ),
            ]),
        },
    });
};


function assertIsBoolean(input: any) {
    if (typeof input !== 'boolean') {
        throw {
            code: -32000,
            message: 'assertIsBoolean: Invalid input.'
        };
    }
}

function assertIsString(input: any) {
    if (typeof input !== 'string') {
        throw {
            code: -32000,
            message: 'assertIsString: Invalid input.'
        };
    }
}

async function deriveKeyPair(path: string[]) {
    assertIsArray(path);
    assertInput(path.length);
    assertInput(path.every((segment) => isValidSegment(segment)));

    const rootNode = await snap.request({
        method: 'snap_getBip32Entropy',
        params: {
            path: [`m`, `44'`, `9000'`],
            curve: 'ed25519'
        }
    });

    const node = await SLIP10Node.fromJSON(rootNode);

    const keypair = await node.derive(path.map((segment) => `slip10:${segment}`) as `slip10:${number}'`[]);
    if (!keypair.privateKeyBytes) {
        throw {
            code: -32000,
            message: 'error deriving key pair'
        };
    }

    return nacl.sign.keyPair.fromSeed(Uint8Array.from(keypair.privateKeyBytes));
}

export function assertIsArray(input: any[]) {
    if (!Array.isArray(input)) {
        throw {
            code: -32000,
            message: 'assertIsArray: Invalid input.'
        };
    }
}

function assertInput(path: any) {
    if (!path) {
        throw {
            code: -32000,
            message: 'assertInput: Invalid input.'
        };
    }
}


function isValidSegment(segment: string) {
    if (typeof segment !== 'string') {
        return false;
    }

    if (!segment.match(/^[0-9]+'$/)) {
        return false;
    }

    const index = segment.slice(0, -1);

    if (parseInt(index).toString() !== index) {
        return false;
    }

    return true;
}

function renderGetPublicKey(host: string, pubkey: string) {
    return snap.request({
        method: 'snap_dialog',
        params: {
            type: 'confirmation',
            content: panel([
                heading('Confirm access'),
                text(host),
                divider(),
                text(pubkey)
            ])
        }
    });
}

function assertConfirmation(confirmed: boolean) {
    if (!confirmed) {
        throw {
            code: 4001,
            message: 'User rejected the request.'
        };
    }
}

function renderSignTransaction(host: string, message: string) {
    return snap.request({
        method: 'snap_dialog',
        params: {
            type: 'confirmation',
            content: panel([
                heading('Sign transaction'),
                text(host),
                divider(),
                text("Receiver"),
                copyable("Welcome to template-snap"),
                divider(),
                copyable(message),
            ])
        }
    });
}