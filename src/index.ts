import dotenv from "dotenv";
dotenv.config();
import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import http from "http";
import { allowedUrls } from "./utils/allowedUrls";
import { PORT } from "./utils/env";
import { baseRoutes } from "./routes/base-routes";

const app = express();
app.use(express.json());
app.use(cors({
    origin: allowedUrls,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-chain'],
}));
app.use(helmet());

app.get("/", async(_req: Request, res: Response)=>{
    res.json({ message: "success" })
})
app.use("/api", baseRoutes)
app.get("*", async(_req: Request, res: Response)=>{
    res.status(404).json({ message: "404 not found" })
})

const server =  http.createServer(app);
server.listen(PORT, function () {
    console.log(`[cli utils running at]: http://localhost:${PORT}`)
})