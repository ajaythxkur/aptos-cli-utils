import { Request, Response } from "express";
import { getMetadataAndByteCode } from "../utils/getMetadataAndByteCode";
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
}