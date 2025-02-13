import express from "express";
import publishPackageController from "../controllers/publish-package-controller";
const router = express.Router();

router.post("/build", publishPackageController.getPublishPackageTxnData);
router.post("/publish", publishPackageController.publishPackage)
export const publishPackageRoutes = router;