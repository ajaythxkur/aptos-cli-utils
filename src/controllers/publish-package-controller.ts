import { Request, Response } from "express";
import { getMetadataAndByteCode } from "../utils/getMetadataAndByteCode";
import { publishPackageTxn } from "../utils/publishPackage";
export type Chain = "aptos" | "movement" | "supra"
export default {
    async getPublishPackageTxnData(req: Request, res: Response) {
        try {
            const chain = req.headers["x-chain"] ?? "aptos";
            const { 
                chainId,
                module_address,
                name, 
                symbol, 
                image, 
                description, 
                telegram, 
                twitter, 
                website,
                max_aptos,
                min_coins,
             } = req.body;
            if(!chainId || !module_address || !name || !symbol || !image || !description){
                throw new Error("Provide all the params");
            }
            const data = await getMetadataAndByteCode(
               chain as Chain,
               chainId,
               module_address,
               name, 
               symbol, 
               image, 
               description, 
               telegram, 
               twitter, 
               website,
               max_aptos,
               min_coins,
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
            res.status(500).json({ message: error.message })
        }
    }
}