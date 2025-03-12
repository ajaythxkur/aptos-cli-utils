import express from "express";
import "../scheduler/price-scheduler"
import { nodeCache } from "../cache/node-cache";
export default {
    async getPrice(req: express.Request, res: express.Response) {
        try {
            const data = nodeCache.getValue("usd");
            console.log(data)
            res.json({ data })
        } catch (error: any) {
            res.status(500).json({ data: error.message })
        }
    },
    async getPriceBySymbol(req: express.Request, res: express.Response) {
        try {
            const symbol = req.params.symbol;
            const data = nodeCache.getValue("usd")
            if(!Array.isArray(data)) {
                throw new Error("Error fetching cache! Data not an array")
            };
            const exists = data.find((v) => v.symbol === symbol.toUpperCase());
            if(!exists) {
                throw new Error("Symbol not found")
            };
            res.json({ data: exists })
        } catch (error: any) {
            res.status(500).json({ data: error.message })
        }
    }
}