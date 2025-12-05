import express from "express";
import { addSubject, getSubjects, updateSubject, deleteSubject } from "../controllers/subjectController.js";

const router = express.Router();

router.post("/", addSubject);
router.get("/", getSubjects);
router.put("/:id", updateSubject);
router.delete("/:id", deleteSubject);

export default router;
