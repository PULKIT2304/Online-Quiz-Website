const express = require("express");

const router = express.Router();
const Question = require("../models/Question");

const {authenticateToken, requireAdmin} = require("../middleware/authMiddleware");
// GET RANDOM QUESTIONS
// GET ALL QUESTIONS - ADMIN ONLY
router.get("/all",authenticateToken,requireAdmin,async (req, res) => {
        try {
            const questions =
                await Question.find({
                    authorId: req.user.userId
                }).sort({
                    createdAt: -1
                });
            const safeQuestions =
                questions.map(q => ({
                    _id: q._id,
                    question: q.question,
                    options: q.options,
                    category: q.category,
                    difficulty: q.difficulty
                }));
            res.json(safeQuestions);
        } catch (error) {
            console.error(
                "Error fetching all questions:",
                error
            );
            res.status(500).json({
                message:
                    "Failed to fetch questions"
            });
        }
    }
);
// ADD QUESTION
router.post("/",authenticateToken, requireAdmin,async (req, res) => {
    try {
        const {
            question,
            options,
            correctAnswer,
            category,
            difficulty
        } = req.body;
        // Backend validation
        if (
            typeof question !== "string" ||
            !question.trim()
        ) {
            return res.status(400).json({
                message: "Question text is required"
            });
        }
        if (!Array.isArray(options)) {
            return res.status(400).json({
                message: "Options must be an array"
            });
        }
        if (options.length !== 4) {
            return res.status(400).json({
                message: "Exactly 4 options are required"
            });
        }
        if (
            options.some(
                option =>
                    typeof option !== "string" ||
                    !option.trim()
            )
        ) {
            return res.status(400).json({
                message: "All options are required"
            });
        }
        const normalizedOptions =
            options.map(option =>
                option.trim().toLowerCase()
            );
        if (
            new Set(normalizedOptions).size !==
            normalizedOptions.length
        ) {
            return res.status(400).json({
                message: "Options must be unique"
            });
        }
        if (
            !Number.isInteger(correctAnswer) ||
            correctAnswer < 0 ||
            correctAnswer > 3
        ) {
            return res.status(400).json({
                message:
                    "Correct answer must be between 0 and 3"
            });
        }
        if (
            typeof category !== "string" ||
            !category.trim()
        ) {
            return res.status(400).json({
                message: "Category is required"
            });
        }
        const validDifficulties = [
            "Easy",
            "Medium",
            "Hard"
        ];
        if (!validDifficulties.includes(difficulty)) {
            return res.status(400).json({
                message: "Invalid difficulty"
            });
        }
        const newQuestion = await Question.create({
            question: question.trim(),
            options: options.map(option => option.trim()),
            correctAnswer,
            category: category.trim(),
            difficulty,
            authorId: req.user.userId
        });
        res.status(201).json(newQuestion);
    } catch (error) {
        console.error("Error creating question:", error);
        res.status(500).json({
            message: "Failed to create question"
        });
    }
});
// DELETE QUESTION
router.delete("/:id",authenticateToken,requireAdmin,async (req, res) => {
    try {
        const deletedQuestion =
            await Question.findOneAndDelete({
                _id: req.params.id,
                authorId: req.user.userId
            });
        if (!deletedQuestion) {
            return res.status(404).json({
                message: "Question not found"
            });
        }
        res.json({
            message: "Question deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting question:", error);
        res.status(500).json({
            message: "Failed to delete question"
        });
    }
});
module.exports = router;