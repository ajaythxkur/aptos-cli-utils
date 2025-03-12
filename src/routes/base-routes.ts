import express from "express";
import { publishPackageRoutes } from "./publish-package-routes";
import { priceRoutes } from "./price-routes";
const app = express();

app.use("/publish-package-txn", publishPackageRoutes);
app.use("/price", priceRoutes);

export const baseRoutes = app;