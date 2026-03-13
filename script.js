
// Data & Local Storage Helpers
const STORAGE_KEYS = {
    QUESTIONS: "quiz_questions",
    RESULTS: "quiz_results",
};
const defaultQuestions = [
    {
        text: "Which HTML tag is used to link an external CSS file?",
        options: ["<style>", "<link>", "<css>", "<script>"],
        correctIndex: 1,
    },
    {
        text: "Which language is used to add interactivity to a web page?",
        options: ["HTML", "CSS", "JavaScript", "Python"],
        correctIndex: 2,
    },
    {
        text: "Which of these is a version control system?",
        options: ["Node.js", "Git", "NPM", "React"],
        correctIndex: 1,
    },
];
function safeGetItem(key) {
    try {
        return localStorage.getItem(key);
    } catch (e) {
        console.warn("localStorage.getItem failed:", e);
        return null;
    }
}
function safeSetItem(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        console.warn("localStorage.setItem failed:", e);
    }
}
function loadQuestions() {
    const stored = safeGetItem(STORAGE_KEYS.QUESTIONS);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
// Basic validation: must be an array and each question must have text, options array, correctIndex
            if (!Array.isArray(parsed)) throw new Error("Not an array");
            const valid = parsed.every(
                (q) =>
                    q &&
                    typeof q.text === "string" &&
                    Array.isArray(q.options) &&
                    typeof q.correctIndex === "number"
            );
            if (!valid) throw new Error("Invalid format");
            return parsed;
        } catch (err) {
            console.warn("Invalid stored questions, restoring defaults:", err);
            safeSetItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(defaultQuestions));
            return [...defaultQuestions];
        }
    } else {
        safeSetItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(defaultQuestions));
        return [...defaultQuestions];
    }
}
function saveQuestions(questions) {
    safeSetItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questions));
}
function loadResults() {
    const stored = safeGetItem(STORAGE_KEYS.RESULTS);
    if (!stored) return [];
    try {
        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed)) throw new Error("Results not array");
        return parsed;
    } catch (err) {
        console.warn("Invalid stored results, clearing:", err);
        safeSetItem(STORAGE_KEYS.RESULTS, JSON.stringify([]));
        return [];
    }
}
function saveResults(results) {
    safeSetItem(STORAGE_KEYS.RESULTS, JSON.stringify(results));
}
// Global State
let questions = loadQuestions();
let currentQuestionIndex = 0;
let selectedAnswers = {}; // {questionIndex: optionIndex}
// Helpers
function escapeHTML(str) {
// simple escape to avoid XSS when rendering stored content
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
function getElement(id) {
    return document.getElementById(id);
}
// Navigation Between Sections (UPDATED)
const sections = document.querySelectorAll(".section");
const navButtons = document.querySelectorAll(".nav-btn");
navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
        const targetId = btn.dataset.target;
        sections.forEach((sec) => {
            sec.classList.toggle("active", sec.id === targetId);
        });
        if (targetId === "quiz-section") {
            startQuiz();
        }
//Render the question list when the Add section is active
        if (targetId === "add-section") {
            renderQuestionList();
        }
        if (targetId === "results-section") {
            renderResults();
        }
    });
});
// Quiz Logic
const quizInfoDiv = getElement("quiz-info");
const quizBox = getElement("quiz-box");
const questionTextEl = getElement("question-text");
const optionsForm = getElement("options-form");
const prevBtn = getElement("prev-btn");
const nextBtn = getElement("next-btn");
const submitQuizBtn = getElement("submit-quiz-btn");
const quizProgressEl = getElement("quiz-progress");
const actionMsg = getElement("action-msg"); // reuse if exists
function startQuiz() {
    questions = loadQuestions();
    selectedAnswers = {};
    currentQuestionIndex = 0;
    if (!questions.length) {
        if (quizInfoDiv) quizInfoDiv.textContent = "No questions available. Please add questions first.";
        if (quizBox) quizBox.classList.add("hidden");
        if (submitQuizBtn) submitQuizBtn.disabled = true;
        return;
    }
    if (quizInfoDiv) quizInfoDiv.textContent = `Total Questions: ${questions.length}`;
    if (quizBox) quizBox.classList.remove("hidden");
    if (submitQuizBtn) submitQuizBtn.disabled = false;
    renderCurrentQuestion();
}
function renderCurrentQuestion() {
    const q = questions[currentQuestionIndex];
    if (!q) {
        questionTextEl.textContent = "Question not found.";
        optionsForm.innerHTML = "";
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }
    questionTextEl.textContent = `${currentQuestionIndex + 1}. ${q.text}`;
    optionsForm.innerHTML = "";
    q.options.forEach((optionText, index) => {
// recommended DOM structure: label contains input + text for better hit area & accessibility
        const label = document.createElement("label");
        label.className = "option-label";
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "option";
        input.value = index;
        input.setAttribute("aria-label", `Option ${index + 1}`);
        if (selectedAnswers[currentQuestionIndex] === index) {
            input.checked = true;
        }
        label.appendChild(input);
// ensure plain text (avoid injecting raw HTML)
        label.appendChild(document.createTextNode(` ${optionText}`));
        optionsForm.appendChild(label);
    });
    prevBtn.disabled = currentQuestionIndex === 0;
    nextBtn.disabled = currentQuestionIndex === questions.length - 1;
    quizProgressEl.textContent = `Question ${currentQuestionIndex + 1} of ${questions.length}`;
}
function getSelectedOptionIndex() {
    const data = new FormData(optionsForm);
    const selected = data.get("option");
    if (selected === null) return null;
    return Number(selected);
}
prevBtn.addEventListener("click", () => {
    const selectedIdx = getSelectedOptionIndex();
    if (selectedIdx !== null) selectedAnswers[currentQuestionIndex] = selectedIdx;
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderCurrentQuestion();
    }
});
nextBtn.addEventListener("click", () => {
    const selectedIdx = getSelectedOptionIndex();
    if (selectedIdx !== null) selectedAnswers[currentQuestionIndex] = selectedIdx;
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        renderCurrentQuestion();
    }
});
submitQuizBtn.addEventListener("click", () => {
// save last selection
    const selectedIdx = getSelectedOptionIndex();
    if (selectedIdx !== null) selectedAnswers[currentQuestionIndex] = selectedIdx;
// Check if any unanswered
    const unanswered = questions.some((_, idx) => !(idx in selectedAnswers));
    if (unanswered) {
// Show a friendly message and confirm submit
        const confirmSubmit = confirm(
            "You have unanswered questions. Are you sure you want to submit the quiz?"
        );
        if (!confirmSubmit) return;
    }
    const total = questions.length;
    let correctCount = 0;
    questions.forEach((q, index) => {
        if (selectedAnswers[index] === q.correctIndex) {
            correctCount++;
        }
    });
    const percentage = total ? Math.round((correctCount / total) * 100) : 0;
// Save result
    const results = loadResults();
    const attempt = {
        timestamp: new Date().toISOString(),
        score: `${correctCount}/${total}`,
        correct: correctCount,
        total,
        percentage,
    };
    results.push(attempt);
    saveResults(results);
    alert(`Quiz Submitted!\n\nScore: ${correctCount}/${total}\nPercentage: ${percentage}%`);
// Switch to results view
    sections.forEach((sec) => sec.classList.remove("active"));
    const resultsSection = getElement("results-section");
    if (resultsSection) resultsSection.classList.add("active");
    renderResults();
});
// Add Question Logic
const addQuestionForm = getElement("add-question-form");
const addQuestionMsg = getElement("add-question-message");
// elements for managing/deleting questions
const questionListContainer = getElement("question-list-container");
const questionDeleteMsg = getElement("question-delete-message");
if (addQuestionForm) {
    addQuestionForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const textArea = getElement("new-question-text");
        const optionInputs = addQuestionForm.querySelectorAll(".new-option");
        const correctRadio = addQuestionForm.querySelector("input[name='correct-option']:checked");
        const questionText = textArea.value.trim();
        if (!questionText) {
            showAddMessage("Please enter the question text.", "error");
            return;
        }
        const options = [];
        optionInputs.forEach((input) => {
            options.push(input.value.trim());
        });
// Validation: at least 2 options and none empty
        if (options.length < 2) {
            showAddMessage("Please provide at least two options.", "error");
            return;
        }
        if (options.some((opt) => !opt)) {
            showAddMessage("All option fields are required.", "error");
            return;
        }
// Validation: duplicate option texts
        const uniqueOptions = Array.from(new Set(options.map((o) => o.toLowerCase())));
        if (uniqueOptions.length !== options.length) {
            showAddMessage("Options must be unique.", "error");
            return;
        }
        if (!correctRadio) {
            showAddMessage("Please select the correct option.", "error");
            return;
        }
        const correctIndex = Number(correctRadio.value);
        if (correctIndex < 0 || correctIndex >= options.length) {
            showAddMessage("Selected correct option is invalid.", "error");
            return;
        }
        const newQuestion = {
            text: questionText,
            options,
            correctIndex,
        };
        const currentQuestions = loadQuestions();
        currentQuestions.push(newQuestion);
        saveQuestions(currentQuestions);
// update in-memory so user can immediately start quiz without reload
        questions = currentQuestions;
        showAddMessage("Question added successfully!", "success");
// NEW: Re-render the list after adding
        renderQuestionList();
// Reset form fields
        textArea.value = "";
        optionInputs.forEach((input) => (input.value = ""));
// Reset radio button if one was checked
        if (correctRadio) correctRadio.checked = false;
    });
}
function showAddMessage(msg, type) {
    if (!addQuestionMsg) return;
    addQuestionMsg.textContent = msg;
    addQuestionMsg.style.color = type === "success" ? "green" : "red";
// clear after short delay
    setTimeout(() => {
        addQuestionMsg.textContent = "";
    }, 3000);
}
// Question Management Logic 
function renderQuestionList() {
    if (!questionListContainer) return;
// Ensure we load the latest set of questions
    const currentQuestions = loadQuestions();
    if (currentQuestions.length === 0) {
        questionListContainer.innerHTML = "<p>No custom questions yet. Add one above!</p>";
        return;
    }
// Build the list HTML
    questionListContainer.innerHTML = currentQuestions
        .map((q, index) => `
            <div class="question-item">
                <span class="question-text-preview">
                    ${index + 1}. ${escapeHTML(q.text.substring(0, 50))}...
                </span>
                <button type="button" class="delete-btn" data-index="${index}">
                    Delete
                </button>
            </div>
        `).join("");
// Add event listeners to the new delete buttons
    questionListContainer.querySelectorAll(".delete-btn").forEach(button => {
        button.addEventListener("click", handleDeleteQuestion);
    });
}
function handleDeleteQuestion(event) {
    const button = event.target;
// get the index from the data-index attribute
    const indexToDelete = Number(button.dataset.index);
    if (isNaN(indexToDelete)) {
        showDeleteMessage("Error: Invalid question index.", "error");
        return;
    }
    const currentQuestions = loadQuestions();
    if (indexToDelete < 0 || indexToDelete >= currentQuestions.length) {
        showDeleteMessage("Error: Question index is out of bounds.", "error");
        return;
    }
    const confirmDelete = confirm(`Are you sure you want to delete question #${indexToDelete + 1}?`);
    if (!confirmDelete) return;
// Remove the question from the array
    currentQuestions.splice(indexToDelete, 1);
// Save the updated list back to local storage
    saveQuestions(currentQuestions);
// Update the in-memory state
    questions = currentQuestions;
// Re-render the list to update the UI
    renderQuestionList();
    showDeleteMessage("Question deleted successfully!", "success");
}
function showDeleteMessage(msg, type) {
    if (!questionDeleteMsg) return;
    questionDeleteMsg.textContent = msg;
    questionDeleteMsg.style.color = type === "success" ? "green" : "red";
// clear after short delay
    setTimeout(() => {
        questionDeleteMsg.textContent = "";
    }, 3000);
}
// Results Rendering
const latestResultDiv = getElement("latest-result");
const resultsTableBody = document.querySelector("#results-table tbody");
function renderResults() {
    const results = loadResults();
    if (!latestResultDiv) return;
// Latest result box
    if (!results.length) {
        latestResultDiv.textContent = "No attempts yet. Take the quiz to see your results here.";
    } else {
        const latest = results[results.length - 1];
        const date = new Date(latest.timestamp);
        latestResultDiv.innerHTML = `
            <strong>Last Attempt:</strong><br/>
            Date & Time: ${escapeHTML(date.toLocaleString())}<br/>
            Score: ${escapeHTML(latest.score)}<br/>
            Correct: ${escapeHTML(String(latest.correct))}/${escapeHTML(String(latest.total))}<br/>
            Percentage: ${escapeHTML(String(latest.percentage))}%
        `;
    }
// History table
    if (!resultsTableBody) return;
    resultsTableBody.innerHTML = "";
    results.forEach((res, index) => {
        const tr = document.createElement("tr");
        const dt = new Date(res.timestamp);
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${escapeHTML(dt.toLocaleString())}</td>
            <td>${escapeHTML(res.score)}</td>
            <td>${escapeHTML(String(res.correct))}</td>
            <td>${escapeHTML(String(res.total))}</td>
            <td>${escapeHTML(String(res.percentage))}%</td>
        `;
        resultsTableBody.appendChild(tr);
    });
}
// Refresh Records (UI reload only)
const refreshResultBtn = getElement("refresh-result-btn");

if (refreshResultBtn) {
    refreshResultBtn.addEventListener("click", () => {
        renderResults(); // reload UI from storage

        if (actionMsg) {
            actionMsg.textContent = "Records refreshed!";
            actionMsg.style.color = "green";
            setTimeout(() => {
                actionMsg.textContent = "";
            }, 2000);
        }
    });
}
// Clear Attempt History (permanent)
const clearHistoryBtn = getElement("clear-history-btn");
if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener("click", () => {
        const conf = confirm("Are you sure you want to clear all attempt history? This action cannot be undone.");
        if (!conf) return;
// Delete only results storage
        try {
            localStorage.removeItem(STORAGE_KEYS.RESULTS);
        } catch (e) {
            console.warn("Failed to remove results:", e);
            safeSetItem(STORAGE_KEYS.RESULTS, JSON.stringify([]));
        }
        renderResults(); 
        if (actionMsg) {
            actionMsg.textContent = "Attempt history cleared!";
            actionMsg.style.color = "red";
            setTimeout(() => {
                actionMsg.textContent = "";
            }, 2000);
        }
    });
}
function resetToDefaults() {
    if (!confirm("Reset all questions to the original defaults? This will overwrite your saved questions.")) return;
    saveQuestions(defaultQuestions);
    questions = loadQuestions();
    if (actionMsg) {
        actionMsg.textContent = "Questions reset to defaults.";
        actionMsg.style.color = "green";
        setTimeout(() => { actionMsg.textContent = ""; }, 2000);
    }
}
// Footer year
const yearEl = getElement("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();