import axios from "axios";
import { nodeCache } from "../cache/node-cache";
async function binanceApiSymbolInUsd(symbol: string) {
    try {
        const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`);
        if (!response.ok) {
            throw new Error("Response not ok")
        }
        const data = await response.json();
        return { symbol: symbol, price : data.price }
    } catch (error) {
        console.log(`Fatal error in fetching price of ${symbol}: ${error}`)
    }
}
interface CatalogTradingPairInput {
    instrumentTypeId: string
    instrumentId: string
    doraType: string
    instrumentPairDisplayName: string
    createdAtStart: string
    createdAtEnd: string
    interval: number
    providerId: string
    forceUpdate?: boolean
}
async function cerberusApiSymbolInUsd(symbol: string) {
    const query = `
    query GetCatalogTradingPairPricesGraph($input: CatalogTradingPairPricesAndGraphInput) {
        catalogTradingPairPricesGraph(input: $input) {
            average
            median
            high
            low
            timestamp
            __typename
        }
    }
    `;
    try {
        const now = new Date()
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

        const input: CatalogTradingPairInput = {
            instrumentTypeId: "1",
            instrumentId: "1009",
            doraType: "2",
            instrumentPairDisplayName: `${symbol}/USDT`,
            createdAtStart: oneMonthAgo.toISOString(),
            createdAtEnd: now.toISOString(),
            interval: 7200,
            providerId: "20",
            forceUpdate: false,
        }
        const operations = {
            operationName: "GetCatalogTradingPairPricesGraph",
            query,
            variables: { input },
        };
        const CERBERUS_API_ENDPOINT = "https://prod-api.cerberus.supra.com/graphql"
        const response = await axios.post(CERBERUS_API_ENDPOINT, operations)
        if (Array.isArray(response.data) && response.data[0].errors) {
            throw new Error("Supra GraphQL request failed")
        }
        if (response.data.data.catalogTradingPairPricesGraph.length > 0) {
            const latestPrice = response.data.data.catalogTradingPairPricesGraph[0]
            return { symbol: symbol, price: latestPrice.average };
        } else {
            throw new Error("No price data received")
        }
    } catch (error) {
        console.error("Error fetching supra price:", error)
        if (axios.isAxiosError(error)) {
        }
    }
}

type Price = { symbol: string, price: string };
async function pollPrices() {
    try {
        console.log(`Initialized price scheduler`)
        let arr: Array<Price> = [];
        arr.push(await binanceApiSymbolInUsd("APT") as Price);
        arr.push(await binanceApiSymbolInUsd("MOVE") as Price);
        arr.push(await cerberusApiSymbolInUsd("SUPRA") as Price);
        nodeCache.setValue("usd", arr);
        console.log(`Prices Fetched at ${Date.now()}: =>`)
        console.log(arr)
    } catch (error) {
        console.log(`Fatal error in polling prices: ${error}`)
    }
}
pollPrices()
setInterval(()=>{
    pollPrices()
},60000)
