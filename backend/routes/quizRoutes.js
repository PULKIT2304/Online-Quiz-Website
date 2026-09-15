const express = require("express");
const crypto = require("crypto");
const Quiz = require("../models/Quiz");
const Question = require("../models/Question");
const QuizAttempt = require("../models/QuizAttempt");
const {authenticateToken,requireAdmin} = require("../middleware/authMiddleware");
const router = express.Router();

// CREATE QUIZ — AUTHOR ONLY
router.post("/",authenticateToken,requireAdmin,async (req, res) => {
        try {
            const {title,questionIds} = req.body;
            // Basic validation
            if (
                !title ||
                !Array.isArray(questionIds) ||
                questionIds.length === 0
            ) {
                return res.status(400).json({
                    message:"Title and questions are required"
                });
            }
            // Maximum 30 questions
            if (questionIds.length > 30) {
                return res.status(400).json({
                    message: "A quiz can contain a maximum of 30 questions"
                });
            }
            // TIMER CALCULATION
            let durationMinutes;

            if (questionIds.length <= 5) {
                durationMinutes = 5;
            } else if (questionIds.length <= 10) {
                durationMinutes = 10;
            } else if (questionIds.length <= 20) {
                durationMinutes = 15;
            } else {
                durationMinutes = 20;
            }
            // MAKE SURE QUESTIONS BELONG TO THIS AUTHOR
            const questions = await Question.find({
                    _id: {
                        $in: questionIds
                    },
                    authorId:req.user.userId
                });
            if (
                questions.length !==
                questionIds.length
            ) {
                return res.status(403).json({
                    message:"You can only use your own questions"
                });
            }
            // GENERATE UNIQUE QUIZ CODE
            let quizCode;
            do {
                quizCode =
                    crypto
                        .randomBytes(4)
                        .toString("hex")
                        .toUpperCase();
            } while (
                await Quiz.exists({
                    quizCode
                })
            );
            // CREATE QUIZ
            const quiz = await Quiz.create({
                    title: title.trim(),
                    quizCode,
                    authorId: req.user.userId,
                    questionIds,
                    durationMinutes
                });
            return res.status(201).json(
                quiz
            );
        } catch (error) {
            console.error("Create quiz error:",error);
            return res.status(500).json({
                message:"Failed to create quiz"
            });
        }
    }
);
// AUTHOR'S QUIZZES
router.get( "/my",authenticateToken,requireAdmin, async (req, res) => {
        try {
            const quizzes = await Quiz.find({
                    authorId:
                        req.user.userId
                })
                    .sort({
                        createdAt: -1
                    });
            return res.json(
                quizzes
            );
        } catch (error) {
            console.error("Fetch author quizzes error:", error
            );
            return res.status(500).json({
                message:"Failed to fetch quizzes"
            });
        }
    }
);
// STUDENT GETS QUIZ BY CODE
router.get( "/code/:code", authenticateToken, async (req, res) => {
        try {
            // Only students can take quizzes
            if (
                req.user.role !== "user"
            ) {
                return res.status(403).json({
                    message: "Only students can take quizzes"
                });
            }
            const quiz = await Quiz.findOne({
                    quizCode:
                        req.params.code
                            .toUpperCase()
                });
            if (!quiz) {
                return res.status(404).json({
                    message:"Invalid quiz code"
                });
            }
            // GET OR CREATE QUIZ ATTEMPT
            const now = new Date();

            let attempt = await QuizAttempt.findOne({
                    quizId: quiz._id,
                    userId: req.user.userId
                });
            if (!attempt) {
                attempt = await QuizAttempt.create({
                        quizId:  quiz._id,
                        userId: req.user.userId,
                        startedAt:now,
                        expiresAt:
                            new Date(
                                now.getTime() +
                                quiz.durationMinutes *
                                60 *
                                1000
                            )
                    });
            }
            // GET QUESTIONS
            // NEVER SEND CORRECT ANSWER TO STUDENT
            const questions = await Question.find({

                    _id: {
                        $in:
                            quiz.questionIds
                    }
                }).select(
                    "-correctAnswer"
                );

            const safeQuestions = questions.map(
                    q => ({
                        _id:q._id,
                        question:q.question,
                        options:q.options,
                        category: q.category,
                        difficulty:q.difficulty
                    })
                );
            return res.json({
                quizId:quiz._id,
                title:quiz.title,
                quizCode:quiz.quizCode,
                questions:safeQuestions,
                durationMinutes:quiz.durationMinutes,
                startedAt:attempt.startedAt,
                expiresAt:attempt.expiresAt
            });
        } catch (error) {
            console.error( "Quiz code error:", error
            );
            return res.status(500).json({
                message:"Failed to load quiz"
            });
        }
    }
);
module.exports = router;