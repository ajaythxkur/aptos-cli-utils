import express from "express";
import publishPackageController from "../controllers/publish-package-controller";
const router = express.Router();

router.post("/build", publishPackageController.getPublishPackageTxnData);
export const publishPackageRoutes = router;