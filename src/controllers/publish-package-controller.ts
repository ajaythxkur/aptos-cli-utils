import { Request, Response } from "express";
import { getMetadataAndByteCode } from "../utils/getMetadataAndByteCode";
import { publishPackageTxn } from "../utils/publishPackage";
export type Chain = "aptos" | "movement" | "supra"
export default {
    async getPublishPackageTxnData(req: Request, res: Response) {
        try {
            const chain = req.headers["x-chain"] ?? "aptos";
            const { module_address, symbol } = req.body;
            if(!module_address || !symbol){
                throw new Error("Module address and symbol not provided");
            }
            const data = await getMetadataAndByteCode(
                module_address,
                symbol,
                chain as Chain
            )
            res.json({ data })
        } catch (error: any) {
            res.status(500).json({ data: error.message })
        }
    },
    async publishPackage(req: Request, res: Response) {
        try {
            const chain = req.headers["x-chain"] ?? "aptos";
            const {
                pk,
                metadataBytes,
                moduleBytecode,
                network,
                rpc,
                indexer
            } = req.body;
            if(!pk || !metadataBytes || !moduleBytecode) throw new Error("pk, metadataBytes, moduleBytecode required");
            const hash = await publishPackageTxn(
                chain as Chain,
                pk,
                metadataBytes,
                moduleBytecode,
                network,
                rpc,
                indexer
            )
            res.json({ data: hash })
        } catch (error: any) {
            res.status(500).json({ data: error.message })
        }
    }
}