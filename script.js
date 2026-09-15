const API_URL = "/api/questions";
const AUTH_API_URL = "/api/auth";
const RESULTS_API_URL = "/api/results";
const QUIZ_API_URL = "/api/quizzes";
//  GLOBAL STATE 
let currentQuestionIndex = 0;
let selectedAnswers = {};
let quizId = null;
let quizSubmitted = false;
let currentQuiz = null;
let currentQuizQuestions = [];
let quizTimerInterval = null;
let quizExpired = false;
// HELPERS
function getElement(id) {

    return document.getElementById(id);
}
function escapeHTML(str) {

    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
function getToken() {

    return localStorage.getItem("token");
}
function getRole() {
    return localStorage.getItem("role");
}
// ==================== NAVIGATION ====================
const sections = document.querySelectorAll(".section");
const navButtons = document.querySelectorAll(".nav-btn");
const mobileMenuBtn = getElement("mobile-menu-btn");
const mainNav = getElement("main-nav");

function showSection(targetId) {

    const targetSection = getElement(targetId);

    if (!targetSection) {
        return;
    }
    sections.forEach((section) => {
        section.classList.toggle(
            "active",
            section.id === targetId
        );
    });
    document
        .querySelectorAll(".nav-btn[data-target]")
        .forEach((button) => {
            button.classList.toggle(
                "active-nav",
                button.dataset.target === targetId
            );
        });
    if (mainNav) {
        mainNav.classList.remove("open");
    }
}
// ==================== FEATURE CARD NAVIGATION ====================
const featureCards = document.querySelectorAll(".clickable-card");

featureCards.forEach((card) => {

    card.addEventListener("click", async () => {
        const targetId = card.dataset.target;
        if (!canAccessSection(targetId)) {
            alert(getAccessMessage(targetId));
            return;
        }
        showSection(targetId);
        if (targetId === "results-section") {
            await renderResults();
        }
        if (targetId === "create-quiz-section") {
            await renderCreateQuizQuestions();
        }
    });
});
// ==================== ROLE-BASED UI ====================
function updateAuthUI() {

    const token = getToken();
    const role = getRole();
    const guestElements = document.querySelectorAll(".guest-only");
    const authElements = document.querySelectorAll(".auth-only");
    const studentElements = document.querySelectorAll(".student-only");
    const authorElements = document.querySelectorAll(".author-only");
    // Hide everything first
    guestElements.forEach((element) => {
        element.classList.add("hidden");
    });
    authElements.forEach((element) => {
        element.classList.add("hidden");
    });
    studentElements.forEach((element) => {
        element.classList.add("hidden");
    });
    authorElements.forEach((element) => {
        element.classList.add("hidden");
    });
    // Guest UI
    if (!token) {
        guestElements.forEach((element) => {
            element.classList.remove("hidden");
        });
        return;
    }
    // Logged-in UI
    authElements.forEach((element) => {
        element.classList.remove("hidden");
    });
    // Student UI
    if (role === "user") {
        studentElements.forEach((element) => {
            element.classList.remove("hidden");
        });
    }
    // Author UI
    if (role === "admin") {
        authorElements.forEach((element) => {
            element.classList.remove("hidden");
        });
    }
}
// ==================== NAVIGATION ACCESS ====================
function canAccessSection(targetId) {

    const token = getToken();
    const role = getRole();
    // Student-only section
    if (targetId === "quiz-section") {
        return token && role === "user";
    }
    // Author-only sections
    if (
        targetId === "add-section" ||
        targetId === "create-quiz-section"
    ) {
        return token && role === "admin";
    }
    // Login required section
    if (targetId === "results-section") {
        return Boolean(token);
    }
    return true;
}

function getAccessMessage(targetId) {

    if (targetId === "quiz-section") {
        return "Only students can access quizzes.";
    }
    if (
        targetId === "add-section" ||
        targetId === "create-quiz-section"
    ) {
        return "Only authors can access this section.";
    }
    if (targetId === "results-section") {
        return "Please login to view results.";
    }
    return "You do not have access to this section.";
}
// ==================== NAVIGATION EVENTS ====================
navButtons.forEach((button) => {
    button.addEventListener("click", async () => {
        const targetId = button.dataset.target;
        // Buttons like logout do not have a target
        if (!targetId) {
            return;
        }
        if (!canAccessSection(targetId)) {
            alert(getAccessMessage(targetId));
            return;
        }
        showSection(targetId);
        if (targetId === "add-section") {
            await renderQuestionList();
        }
        if (targetId === "create-quiz-section") {
            await renderCreateQuizQuestions();
        }
        if (targetId === "results-section") {
            await renderResults();
        }
    });
});
// ==================== MOBILE NAVIGATION ====================
if (mobileMenuBtn && mainNav) {
    mobileMenuBtn.addEventListener("click", () => {
        mainNav.classList.toggle("open");
    });
}
// SIGNUP
const signupForm = getElement("signup-form");
const signupMessage = getElement("signup-message");
const signupRole = getElement("signup-role");
const signupRollContainer = getElement("signup-roll-container");

function updateSignupFields() {

    if (!signupRole) return;
    if (signupRole.value === "admin") {
        signupRollContainer.style.display ="none";
    } else {
        signupRollContainer.style.display ="block";
    }
}
if (signupRole) {
    signupRole.addEventListener(
        "change",
        updateSignupFields
    );
    updateSignupFields();
}
if (signupForm) {
    signupForm.addEventListener(
        "submit",
        async (e) => {
            e.preventDefault();

            const name = getElement("signup-name").value.trim();
            const role = getElement("signup-role").value;
            const rollNumber = getElement("signup-roll").value.trim();
            const username = getElement("signup-username").value.trim();
            const password = getElement("signup-password").value;
            try {
                const response = await fetch(
                        `${AUTH_API_URL}/signup`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },
                            body: JSON.stringify({
                                name,
                                rollNumber,
                                username,
                                password,
                                role
                            })
                        }
                    );

                const data =await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message ||
                        "Signup failed"
                    );
                }
                signupMessage.textContent =
                    "Account created successfully! Please login.";

                signupMessage.className =
                    "message success-message";
                signupForm.reset();
                updateSignupFields();
                // Automatically move to login
                setTimeout(() => {
                    showSection("login-section");

                    getElement("login-role").value =
                        role;
                    getElement(
                        "login-role"
                    ).value = role;
                }, 1000);
            } catch (error) {
                signupMessage.textContent =
                    error.message;

                signupMessage.className =
                    "message error-message";
            }
        }
    );
}
// LOGIN
const loginForm = getElement("login-form");
const loginMessage = getElement("login-message");
if (loginForm) {
    loginForm.addEventListener(
        "submit",
        async (e) => {
            e.preventDefault();
            loginMessage.textContent = "";
            loginMessage.className = "message";
            const username = getElement("login-username").value.trim();
            const password = getElement("login-password").value;
            const role = getElement("login-role")
                    .value;
            try {
                const response = await fetch(
                        `${AUTH_API_URL}/login`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },
                            body: JSON.stringify({
                                username,
                                password,
                                role
                            })
                        }
                    );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message ||
                        "Login failed"
                    );
                }
                localStorage.setItem( "token",data.token);
                localStorage.setItem("role", data.user.role);
                localStorage.setItem("username",data.user.username);
                localStorage.setItem("name",data.user.name);
                loginMessage.textContent =`Login successful! Welcome ${data.user.name}.`;
                loginMessage.className ="message success-message";

                updateAuthUI();

                setTimeout(() => {
                    showSection("home-section");
                }, 700);
            } catch (error) {
                loginMessage.textContent =error.message;
                loginMessage.className ="message error-message";
            }
        }
    );
}
// LOGOUT
const logoutBtn = getElement("logout-btn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        // Stop active quiz timer
        clearQuizTimer();
        // Reset quiz state
        currentQuiz = null;
        currentQuizQuestions = [];
        currentQuestionIndex = 0;
        selectedAnswers = {};
        quizId = null;
        quizSubmitted = false;
        quizExpired = false;
        // Clear login data
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("username");
        localStorage.removeItem("name");
        // Update UI
        updateAuthUI();

        showSection("home-section");

        alert("Logged out successfully.");
    });
} 
updateAuthUI();
// QUIZ CODE LOADING
const quizCodeForm = getElement("quiz-code-form");
const quizCodeMessage = getElement("quiz-code-message");
const quizInfo = getElement("quiz-info");
const quizBox = getElement("quiz-box");
const quizTimer = getElement("quiz-timer");
const questionTextEl = getElement("question-text");
const prevBtn = getElement("prev-btn");
const nextBtn = getElement("next-btn");
const optionsForm = getElement("options-form");
const quizProgressEl = getElement("quiz-progress");
const submitQuizBtn = getElement("submit-quiz-btn");
// CLEAR TIMER

function clearQuizTimer() {

    if (quizTimerInterval) {
        clearInterval(
            quizTimerInterval
        );
        quizTimerInterval = null;
    }
}
// FORMAT TIME
function formatTime(totalSeconds) {

    const safeSeconds = Math.max( 0,Math.floor(totalSeconds));
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;

    return (
        `${String(minutes).padStart(2, "0")}:` +
        `${String(seconds).padStart(2, "0")}`
    );

}

// =====================================================
// UPDATE TIMER
// =====================================================

function updateQuizTimer(expiresAt) {
    const expiration = new Date(expiresAt).getTime();
    const now = Date.now();

    // Calculate remaining seconds
    const remaining = Math.max(
        0,
        Math.ceil((expiration - now) / 1000)
    );

    // Update timer display
    if (quizTimer) {
        quizTimer.textContent =
            `Time Remaining: ${formatTime(remaining)}`;
    }

    // Time is over
    if (remaining <= 0) {
        clearQuizTimer();

        if (!quizExpired) {
            quizExpired = true;
            handleQuizTimeout();
        }

        return;
    }
}


// =====================================================
// START TIMER
// =====================================================

function startQuizTimer(expiresAt) {
    // Stop any existing timer
    clearQuizTimer();

    // Reset expiration state
    quizExpired = false;

    // Show timer immediately
    updateQuizTimer(expiresAt);

    // Update every second
    quizTimerInterval = setInterval(() => {
        updateQuizTimer(expiresAt);
    }, 1000);
}


// =====================================================
// TIMEOUT
// =====================================================

async function handleQuizTimeout() {

    // Prevent timeout submission if quiz is already submitted
    if (!currentQuiz || quizSubmitted) {
        return;
    }

    // Show zero time
    if (quizTimer) {
        quizTimer.textContent = "Time Remaining: 00:00";
    }

    // Automatically submit quiz
    // true = automatic submission
    await submitQuiz(true);
}


// =====================================================
// LOAD QUIZ BY CODE
// =====================================================

async function loadQuizByCode(
    code
) {

    const token =
        getToken();


    // =================================================
    // LOGIN REQUIRED
    // =================================================

    if (!token) {

        quizCodeMessage.textContent =
            "Please login as a student before taking a quiz.";

        quizCodeMessage.className =
            "message error-message";

        return;

    }


    if (
        getRole() !==
        "user"
    ) {

        quizCodeMessage.textContent =
            "Only student accounts can take quizzes.";

        quizCodeMessage.className =
            "message error-message";
    
        return;
    }
    try {
        clearQuizTimer();
        quizExpired = false;
        const response = await fetch(
                `/api/quizzes/code/${encodeURIComponent(
                    code.trim()
                )}`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );
        const data = await response.json();
        if (!response.ok) {
            throw new Error(
                data.message ||
                "Failed to load quiz"
            );
        }
        currentQuiz = data.quiz;
        quizId = data.quizId || data.quiz?._id;
        currentQuizQuestions = data.questions;

        currentQuestionIndex = 0;
        selectedAnswers = {};

        quizSubmitted = false;
        quizExpired = false;
        // SHOW QUIZ INFORMATION
        if (quizInfo) {
            quizInfo.innerHTML = `
                <strong>${escapeHTML(
                data.title
            )}</strong>
                <br>
                Questions:
                ${data.questions.length}
                <br>
                Time Limit:
                ${data.durationMinutes} minute(s)
            `;
        }
        if (quizBox) {
            quizBox.classList.remove(
                "hidden"
            );
        }
        // START SERVER-BASED TIMER

        startQuizTimer(
            data.expiresAt
        );
        renderCurrentQuestion();
        quizCodeMessage.textContent ="Quiz loaded successfully.";
        quizCodeMessage.className =
            "message success-message";
    } catch (error) {
        clearQuizTimer();
        if (quizBox) {
            quizBox.classList.add( "hidden");
        }
        quizCodeMessage.textContent = error.message;
        quizCodeMessage.className =
            "message error-message";
    }
}
if (quizCodeForm) {
    quizCodeForm.addEventListener(
        "submit",
        async (e) => {
            e.preventDefault();
            const code = getElement("quiz-code")
                    .value.trim()
                    .toUpperCase();
            if (!code) return;
            await loadQuizByCode(code);
        }
    );
}

// RENDER CURRENT QUESTION
function renderCurrentQuestion() {

    const q = currentQuizQuestions[currentQuestionIndex];
    if (!q) {
        questionTextEl.textContent ="Question not found.";
        optionsForm.innerHTML ="";
        prevBtn.disabled =true;
        nextBtn.disabled =true;
        return;
    }
    questionTextEl.textContent =
        `${currentQuestionIndex + 1}. ${q.question}`;
    optionsForm.innerHTML ="";
    q.options.forEach(
        (optionText, index) => {
            const label =document.createElement("label");
            label.className ="option-label";
            const input =document.createElement("input");

            input.type ="radio";
            input.name ="option";
            input.value =index;
            if (
                selectedAnswers[
                currentQuestionIndex
                ] === index
            ) {
                input.checked =true;
            }
            label.appendChild(
                input
            );
            label.appendChild(
                document.createTextNode(
                    ` ${optionText}`
                )
            );
            optionsForm.appendChild(
                label
            );
        }
    );
    prevBtn.disabled = currentQuestionIndex === 0;
    nextBtn.disabled = currentQuestionIndex ===
        currentQuizQuestions.length - 1;
    quizProgressEl.textContent = `Question ${currentQuestionIndex + 1} of ${currentQuizQuestions.length}`;
}
// SELECTED OPTION
function getSelectedOptionIndex() {

    const data = new FormData(optionsForm);
    const selected = data.get("option");

    if (selected === null) {
        return null;
    }
    return Number(selected);
}
// PREVIOUS
prevBtn.addEventListener(
    "click",
    () => {
        const selectedIdx = getSelectedOptionIndex();
        if (selectedIdx !== null) {
            selectedAnswers[
                currentQuestionIndex
            ] = selectedIdx;
        }
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            renderCurrentQuestion();
        }
    }
);
// NEXT
nextBtn.addEventListener(
    "click",
    () => {
        const selectedIdx = getSelectedOptionIndex();

        if (selectedIdx !== null) {
            selectedAnswers[
                currentQuestionIndex
            ] = selectedIdx;
        }
        if (
            currentQuestionIndex <
            currentQuizQuestions.length - 1
        ) {
            currentQuestionIndex++;
            renderCurrentQuestion();
        }
    }
);
// SUBMIT QUIZ
// ==================== SUBMIT QUIZ ====================

async function submitQuiz(isAutoSubmit = false) {

    // Prevent duplicate submission
    if (quizSubmitted) {
        return;
    }

    // Save answer of currently displayed question
    const selectedIdx = getSelectedOptionIndex();

    if (selectedIdx !== null) {
        selectedAnswers[currentQuestionIndex] = selectedIdx;
    }

    // Check unanswered questions
    const unanswered = currentQuizQuestions.some(
        (_, index) => !(index in selectedAnswers)
    );

    // Ask confirmation ONLY for manual submission
    if (unanswered && !isAutoSubmit) {

        const confirmSubmit = confirm(
            "You have unanswered questions. Are you sure you want to submit?"
        );

        if (!confirmSubmit) {
            return;
        }
    }

    // Validate quiz session
    if (!quizId) {
        alert("Quiz session is invalid.");
        return;
    }

    // Prevent duplicate submission
    quizSubmitted = true;

    // Disable submit button
    if (submitQuizBtn) {
        submitQuizBtn.disabled = true;
        submitQuizBtn.textContent = "Submitting...";
    }

    // Prepare answers
    const answers = currentQuizQuestions.map(
        (question, index) => ({
            questionId: question._id,
            answer: selectedAnswers[index] ?? null
        })
    );

    try {

        const response = await fetch(RESULTS_API_URL, {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getToken()}`
            },

            body: JSON.stringify({
                quizId,
                answers
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to submit quiz"
            );
        }

        // Stop timer after successful submission
        clearQuizTimer();

        const result = data.result;

        // Different message for timeout
        if (isAutoSubmit) {

            alert(
                `Time is up! Your quiz was submitted automatically.\n\n` +
                `Score: ${result.correct}/${result.total}\n` +
                `Percentage: ${result.percentage}%`
            );

        } else {

            alert(
                `Quiz Submitted Successfully!\n\n` +
                `Score: ${result.correct}/${result.total}\n` +
                `Percentage: ${result.percentage}%`
            );
        }

        // Show results
        showSection("results-section");

        await renderResults();

    } catch (error) {

        console.error("Error submitting quiz:", error);

        // Allow retry if submission failed
        quizSubmitted = false;

        if (submitQuizBtn) {
            submitQuizBtn.disabled = false;
            submitQuizBtn.textContent = "Submit Quiz";
        }

        alert(error.message);
    }
}


// Manual Submit Button

submitQuizBtn.addEventListener("click", () => {
    submitQuiz(false);
});
// ADD QUESTION
const addQuestionForm = getElement("add-question-form");
const addQuestionMsg = getElement("add-question-message");
const questionCategoryInput = getElement("new-question-category");
const questionDifficultyInput = getElement("new-question-difficulty");
const questionDeleteMsg = getElement("question-delete-message");
const questionListContainer = getElement("question-list-container");
if (addQuestionForm) {
    addQuestionForm.addEventListener(
        "submit",
        async (e) => {e.preventDefault();

            const textArea = getElement("new-question-text");
            const optionInputs = addQuestionForm.querySelectorAll(".new-option");
            const correctRadio = addQuestionForm.querySelector("input[name='correct-option']:checked");
            const questionText = textArea.value.trim();
            const category = questionCategoryInput.value.trim();
            const difficulty = questionDifficultyInput.value;

            if (!questionText) {
                showAddMessage(
                    "Please enter the question text.","error"
                );
                return;
            }
            if (!category) {
                showAddMessage(
                    "Please enter a category.","error"
                );
                return;
            }
            const options = [];
            optionInputs.forEach(
                input =>
                    options.push(
                        input.value.trim()
                    )
            );
            if (options.some(opt => !opt)){
                showAddMessage(
                    "All option fields are required.","error"
                );
                return;
            }
            const uniqueOptions =Array.from(new Set(options.map(o => o.toLowerCase())));
            if (uniqueOptions.length !==options.length){
                showAddMessage(
                    "Options must be unique.","error"
                );
                return;
            }
            if (!correctRadio) {
                showAddMessage(
                    "Please select the correct option.","error"
                );
                return;
            }
            const correctIndex =Number(correctRadio.value);
            const newQuestion = {
                question:questionText,
                options,
                correctAnswer:correctIndex,
                category,
                difficulty
            };
            try {

                const response = await fetch(API_URL,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json",
                                "Authorization":
                                    `Bearer ${getToken()}`
                            },
                            body:
                                JSON.stringify(
                                    newQuestion
                                )
                        }
                    );

                const data =await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message ||
                        "Failed to add question"
                    );
                }
                showAddMessage(
                    "Question added successfully!",
                    "success"
                );
                await renderQuestionList();
                textArea.value ="";
                optionInputs.forEach(
                    input =>
                        input.value =
                        ""
                );
                questionCategoryInput.value ="";
                questionDifficultyInput.value ="Medium";
                addQuestionForm
                    .querySelectorAll(
                        "input[name='correct-option']"
                    )
                    .forEach(radio =>radio.checked = false);
            } catch (error) {
                console.error("Error adding question:",error);
                showAddMessage(
                    error.message ||"Failed to add question.","error"
                );
            }
        }
    );
}

function showAddMessage(msg, type) {

    if (!addQuestionMsg) {
        return;
    }

    addQuestionMsg.textContent = msg;

    addQuestionMsg.className =
        `message ${type}-message`;

}

async function renderQuestionList() {

    if (!questionListContainer) {
        return;
    }
    questionListContainer.innerHTML =
        "<p>Loading questions...</p>";
    try {
        const response = await fetch(
                `${API_URL}/all`,
                {
                    headers: {
                        "Authorization":
                            `Bearer ${getToken()}`
                    }
                }
            );

        const currentQuestions = await response.json();

        if (!response.ok) {
            throw new Error(
                currentQuestions.message ||
                "Failed to load questions"
            );
        }
        if (currentQuestions.length === 0)
        {
            questionListContainer.innerHTML =
                "<p>No questions yet. Add one above!</p>";
            return;
        }
        questionListContainer.innerHTML =
            currentQuestions
                .map(
                    (q, index) => `
                    <div class="question-item">
                        <div>
                            <strong>
                                ${index + 1}.
                                ${escapeHTML(q.question)}
                            </strong>
                            <small>
                                Category:
                                ${escapeHTML(q.category || "N/A")}
                                |
                                Difficulty:
                                ${escapeHTML(q.difficulty || "Medium")}
                            </small>
                        </div>
                        <button
                            type="button"
                            class="delete-btn"
                            data-id="${q._id}">
                            Delete
                        </button>
                    </div>
                    `
                )
                .join("");
        questionListContainer
            .querySelectorAll(
                ".delete-btn"
            )
            .forEach(
                button =>
                    button.addEventListener(
                        "click",
                        handleDeleteQuestion
                    )
            );
    } catch (error) {
        console.error("Error loading question list:",error
        );
        questionListContainer.innerHTML =
            "<p>Failed to load questions.</p>";
    }
}
async function handleDeleteQuestion(
    event
) {
    const button = event.target;
    const questionId = button.dataset.id;
    const confirmDelete = confirm("Are you sure you want to delete this question?");

    if (!confirmDelete) {
        return;
    }
    try {
        const response =await fetch(
                `${API_URL}/${questionId}`,
                {
                    method: "DELETE",
                    headers: {
                        "Authorization":
                            `Bearer ${getToken()}`
                    }
                }
            );

        const data = await response.json();
        if (!response.ok) {
            throw new Error(
                data.message || "Failed to delete question"
            );
        }

        await renderQuestionList();

        showDeleteMessage(
            "Question deleted successfully!",
            "success"
        );
    } catch (error) {
        console.error("Error deleting question:",error);
        showDeleteMessage(
            error.message || "Failed to delete question.","error");
    }
}

function showDeleteMessage(msg, type) {

    if (!questionDeleteMsg) {
        return;
    }

    questionDeleteMsg.textContent = msg;

    questionDeleteMsg.className =
        `message ${type}-message`;

}
// AUTHOR GENERATE QUIZ
const createQuizForm = getElement("create-quiz-form");
const createQuizQuestionList = getElement("create-quiz-question-list");
const createQuizMessage = getElement("create-quiz-message");
const generatedCodeCard = getElement("generated-code-card");
const generatedQuizCode = getElement("generated-quiz-code");
const generatedQuizTitle = getElement("generated-quiz-title");

async function renderCreateQuizQuestions() {

    if (!createQuizQuestionList) {
        return;
    }
    createQuizQuestionList.innerHTML =
        "<p>Loading your questions...</p>";
    try {

        const response =await fetch(
                `${API_URL}/all`,
                {
                    headers: {
                        "Authorization":
                            `Bearer ${getToken()}`
                    }
                }
            );
        const data =await response.json();

        if (!response.ok) {
            throw new Error(
                data.message ||
                "Failed to load questions"
            );
        }
        if (!data.length) {
            createQuizQuestionList.innerHTML =
                "<p>You have no questions yet. Add questions first.</p>";
            return;
        }
        createQuizQuestionList.innerHTML =
            data.map(
                (q, index) => `
            <div class="quiz-question-selection">

                <input
                    type="checkbox"
                    class="quiz-question-checkbox"
                    value="${q._id}"
                    id="quiz-question-${q._id}"
                >

                <label
                    for="quiz-question-${q._id}"
                >

                    <strong>
                        ${index + 1}.
                        ${escapeHTML(q.question)}
                    </strong>

                    <small>
                        Category:
                        ${escapeHTML(q.category || "N/A")}
                        |
                        Difficulty:
                        ${escapeHTML(q.difficulty || "Medium")}
                    </small>

                </label>

            </div>
        `
            ).join("");
    } catch (error) {
        console.error("Error loading quiz questions:",error);
        createQuizQuestionList.innerHTML =
            "<p>Failed to load questions.</p>";
    }
}
if (createQuizForm) {
    createQuizForm.addEventListener(
        "submit",
        async (e) => {
            e.preventDefault();
            generatedCodeCard.classList.add("hidden");

            createQuizMessage.textContent = "";
            createQuizMessage.className = "message";

            const title =getElement("quiz-title").value.trim();
            const selectedCheckboxes =document.querySelectorAll(".quiz-question-checkbox:checked");
            const questionIds =Array.from(selectedCheckboxes).map(checkbox =>checkbox.value);

            if (!title) {
                createQuizMessage.textContent ="Please enter a quiz title.";
                createQuizMessage.className =
                    "message error-message";
                return;
            }
            if (!questionIds.length) {
                createQuizMessage.textContent ="Please select at least one question.";
                createQuizMessage.className =
                    "message error-message";
                return;
            }
            try {

                const response =await fetch(QUIZ_API_URL,{
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json",
                                "Authorization":
                                    `Bearer ${getToken()}`
                            },
                            body:
                                JSON.stringify({
                                    title,questionIds
                                })
                        }
                    );

                const data =await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message ||
                        "Failed to create quiz"
                    );
                }
                createQuizMessage.textContent ="Quiz generated successfully!";
                createQuizMessage.className = "message success-message";
                generatedQuizCode.textContent =data.quizCode;
                generatedQuizTitle.textContent =data.title;
                generatedCodeCard.classList.remove("hidden");
                // Clear selections
                document
                    .querySelectorAll(
                        ".quiz-question-checkbox"
                    )
                    .forEach(
                        checkbox =>
                            checkbox.checked =
                            false
                    );
            } catch (error) {
                console.error("Create quiz error:",error);
                createQuizMessage.textContent =
                    error.message ||
                    "Failed to create quiz";
                createQuizMessage.style.color =
                    "red";
            }
        }
    );
}
// RESULTS
const latestResultDiv = getElement("latest-result");
const resultsTableBody = document.querySelector("#results-table tbody");
const actionMsg = getElement("action-msg");

function updateResultsUI() {

    const role = getRole();

    const clearHistoryBtn =
        getElement("clear-history-btn");


    if (!clearHistoryBtn) {
        return;
    }


    // Only authors can clear attempt history

    if (role === "admin") {

        clearHistoryBtn.style.display =
            "inline-flex";

    } else {

        clearHistoryBtn.style.display =
            "none";

    }

}
async function renderResults() {

    if (!latestResultDiv) {
        return;
    }
    updateResultsUI();
    latestResultDiv.textContent =
        "Loading results...";
    try {
    
        const response = await fetch( RESULTS_API_URL,
                {
                    headers: {
                        "Authorization":
                            `Bearer ${getToken()}`
                    }
                }
            );

        const results = await response.json();

        if (!response.ok) {
            throw new Error(
                results.message ||
                "Failed to fetch results"
            );
        }
        if (!results.length) {
            latestResultDiv.textContent =
                "No attempts yet.";
        } else {

            const latest = results[0];
            const date =new Date(latest.createdAt);

            latestResultDiv.innerHTML =
                `
                <strong>
                    Last Attempt:
                </strong>
                <br/>
                Date & Time:
                ${escapeHTML(date.toLocaleString())}
                <br/>
                Score:
                ${latest.correct}/${latest.total}
                <br/>
                Percentage:
                ${escapeHTML(String(latest.percentage))}%
                `;
        }
        if (!resultsTableBody) {
            return;
        }
        resultsTableBody.innerHTML ="";
        results.forEach(
            (result, index) => {

                const tr = document.createElement("tr");
                const dt = new Date(result.createdAt);

                tr.innerHTML =
                    `
                    <td>${index + 1}</td>
                    <td>${escapeHTML(result.studentName ||"N/A")}</td>
                    <td>${escapeHTML(result.rollNumber ||"N/A")}</td>
                    <td>${escapeHTML(dt.toLocaleString())}</td>
                    <td>${result.correct}/${result.total}</td>
                    <td>${escapeHTML(String(result.percentage))}%</td>
                    `;
                resultsTableBody.appendChild(
                    tr
                );
            }
        );
    } catch (error) {
        console.error("Error loading results:",error);
        latestResultDiv.textContent =
            error.message ||
            "Failed to load results.";
    }
}
// REFRESH RESULTS
const refreshResultBtn = getElement("refresh-result-btn");

if (refreshResultBtn) {
    refreshResultBtn.addEventListener(
        "click",
        async () => {
            await renderResults();
            if (actionMsg) {
                actionMsg.textContent =
                    "Records refreshed!";

                actionMsg.className =
                    "message success-message";
            }
        }
    );
}
// CLEAR HISTORY
const clearHistoryBtn =getElement("clear-history-btn");

if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener(
        "click",
        async () => {
            if (getRole() !== "admin") {

                alert(
                    "Only authors can clear attempt history."
                );

                return;

            }
            const conf =confirm("Are you sure you want to clear all attempt history?");

            if (!conf) {
                return;
            }
            try {

                const response = await fetch(RESULTS_API_URL,{
                            method: "DELETE",
                            headers: {
                                "Authorization":
                                    `Bearer ${getToken()}`
                            }
                        }
                    );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message ||
                        "Failed to clear history"
                    );
                }
                await renderResults();
                if (actionMsg) {
                    actionMsg.textContent =
                        "Attempt history cleared!";

                    actionMsg.className =
                        "message success-message";
                }
            } catch (error) {
                console.error("Error clearing history:",error);
                if (actionMsg) {
                    actionMsg.textContent =
                        error.message ||
                        "Failed to clear attempt history.";
                    actionMsg.className =
                        "message error-message";
                }
            }
        }
    );
}
// FOOTER YEAR
const yearEl =getElement("year");

if (yearEl) {
    yearEl.textContent =new Date().getFullYear();
}