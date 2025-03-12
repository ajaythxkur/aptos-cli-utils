import { Account, Aptos, AptosConfig, Ed25519PrivateKey, NetworkToNetworkName, PrivateKey, PrivateKeyVariants } from "@aptos-labs/ts-sdk"
import { Chain } from "../controllers/publish-package-controller";
import { SupraClient, SupraAccount, HexString } from "supra-l1-sdk"
export async function publishPackageTxn(
    chain: Chain,
    pk: string,
    metadataBytes: string,
    moduleBytecode: string[],
    network?: string,
    rpc?: string,
    indexer?: string
) {
    try {
        if (chain === "aptos") {
            return (await aptosPublishPackage(
                pk,
                metadataBytes,
                moduleBytecode,
                network
            ))
        }
        if (chain === "movement") {
            return (await movementPublishPackage(
                pk,
                metadataBytes,
                moduleBytecode,
                network,
                rpc,
                indexer
            ))
        }
        if (chain === "supra") {
            return (await supraPublishPackage(
                pk,
                metadataBytes,
                moduleBytecode,
                rpc
            ))
        }
    } catch (error: any) {
        throw new Error(error.message)
    }
}

async function aptosPublishPackage(
    pk: string,
    metadataBytes: string,
    moduleBytecode: string[],
    network?: string,
) {
    try {
        if (!network) throw new Error(`Network required for aptos`);
        const aptosConfig = new AptosConfig({
            network: NetworkToNetworkName[network],
        });
        const aptosClient = new Aptos(aptosConfig);
        const pvtKey = PrivateKey.formatPrivateKey(pk, PrivateKeyVariants.Ed25519);
        const account = Account.fromPrivateKey({ privateKey: new Ed25519PrivateKey(pvtKey) });
        const transaction = await aptosClient.publishPackageTransaction({
            account: account.accountAddress,
            metadataBytes,
            moduleBytecode
        });
        const pendingTxn = await aptosClient.signAndSubmitTransaction({
            signer: account,
            transaction
        })
        await aptosClient.waitForTransaction({
            transactionHash: pendingTxn.hash
        })
        return pendingTxn.hash
    } catch (error: any) {
        throw new Error(error.message)
    }
}

async function movementPublishPackage(
    pk: string,
    metadataBytes: string,
    moduleBytecode: string[],
    network?: string,
    rpc?: string,
    indexer?: string
) {
    try {
        if (!network || !rpc || !indexer) throw new Error(`Network, rpc and indexer url required for movement`);
        const aptosConfig = new AptosConfig({
            network: NetworkToNetworkName[network],
            fullnode: rpc,
            indexer,
        });
        const aptosClient = new Aptos(aptosConfig);
        const pvtKey = PrivateKey.formatPrivateKey(pk, PrivateKeyVariants.Ed25519);
        const account = Account.fromPrivateKey({ privateKey: new Ed25519PrivateKey(pvtKey) });
        const transaction = await aptosClient.publishPackageTransaction({
            account: account.accountAddress,
            metadataBytes,
            moduleBytecode
        });
        console.log({transaction})
        const pendingTxn = await aptosClient.signAndSubmitTransaction({
            signer: account,
            transaction
        })
        await aptosClient.waitForTransaction({
            transactionHash: pendingTxn.hash
        })
        return pendingTxn.hash
    } catch (error: any) {
        throw new Error(error.message)
    }
}

async function supraPublishPackage(
    pk: string,
    metadataBytes: string,
    moduleBytecode: string[],
    rpc?: string,
) {
    try {
        if (!rpc) throw new Error(`Rpc required for supra`);
        const supraClient = new SupraClient(
            rpc
        );
        if (pk.startsWith("0x")) {
            pk = pk.slice(2)
        }
        const account = new SupraAccount(Buffer.from(pk, "hex"));
        const packageMetadata = new HexString(metadataBytes).toUint8Array();
        const modulesCode = [];
        for (const e of moduleBytecode) {
            modulesCode.push(new HexString(e).toUint8Array())
        }
        const response = await supraClient.publishPackage(
            account,
            packageMetadata,
            modulesCode,
            {
                enableTransactionWaitAndSimulationArgs: {
                    enableTransactionSimulation: true,
                    enableWaitForTransaction: true
                }
            }
        )
        return response.txHash;
    } catch (error: any) {
        throw new Error(error.message)
    }
}