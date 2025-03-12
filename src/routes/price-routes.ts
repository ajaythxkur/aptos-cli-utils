import express from "express";
import priceController from "../controllers/price-controller";
const router = express.Router();

router.get("/get", priceController.getPrice);
router.get("/get/:symbol", priceController.getPriceBySymbol)
export const priceRoutes = router;