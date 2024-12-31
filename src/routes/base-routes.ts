import express from "express";
import { publishPackageRoutes } from "./publish-package-routes";
const app = express();

app.use("/publish-package-txn", publishPackageRoutes);

export const baseRoutes = app;