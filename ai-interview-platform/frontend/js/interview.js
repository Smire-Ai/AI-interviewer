const API_URL = 'http://127.0.0.1:8000'; // IMPORTANT: Change this to your Vercel backend URL after deployment
const token = localStorage.getItem('accessToken');

// --- DOM Elements ---
const setupDiv = document.getElementById('interview-setup');
const mainDiv = document.getElementById('interview-main');
const completeDiv = document.getElementById('interview-complete');
const startBtn = document.getElementById('start-interview-btn');
const endBtn = document.getElementById('end-interview-btn');
const videoEl = document.getElementById('user-video');
const aiStatusEl = document.getElementById('ai-status');
const proctorAlertEl = document.getElementById('proctor-alert');
const transcriptEl = document.getElementById('transcript');

// --- State Variables ---
let localStream;
let conversationHistory = [];
let proctoringLog = [];
let isListening = false;
const appId = new URLSearchParams(window.location.search).get('appId');

// --- Web Speech API Initialization ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
    alert("Your browser does not support the Web Speech API. Please use Chrome or Firefox.");
}
const recognition = new SpeechRecognition();
recognition.continuous = false; // Process speech after user pauses
recognition.lang = 'en-US';
recognition.interimResults = false;

// --- Event Listeners ---
startBtn.addEventListener('click', initializeInterview);
endBtn.addEventListener('click', finalizeInterview);

// --- Core Functions ---

/**
 * Sets up camera/mic, proctoring, and fetches the first question from the backend.
 */
async function initializeInterview() {
    if (!appId) {
        alert('Error: No application ID found. Redirecting to dashboard.');
        window.location.href = 'candidate_dashboard.html';
        return;
    }

    try {
        // 1. Get camera and microphone permissions
        aiStatusEl.textContent = 'Requesting permissions...';
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        videoEl.srcObject = localStream;
        enforceMediaStream(); // Start monitoring the stream for disconnection

        // 2. Setup Proctoring with MediaPipe
        setupProctoring();

        // 3. Get the first question from the backend
        aiStatusEl.textContent = 'Connecting to AI Interviewer...';
        const response = await fetch(`${API_URL}/interview/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ application_id: appId })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Could not start the interview.');
        }
        
        const data = await response.json();
        const firstQuestion = data.question;

        // 4. Update UI and start the conversation loop
        setupDiv.style.display = 'none';
        mainDiv.style.display = 'grid';
        endBtn.style.display = 'block';

        addToTranscript('assistant', firstQuestion);
        speak(firstQuestion);

    } catch (error) {
        alert(`Setup Failed: ${error.message}. Please ensure you allow camera and microphone access.`);
        console.error(error);
    }
}

/**
 * Uses browser's TTS engine to speak the provided text.
 * @param {string} text - The text for the AI to speak.
 */
function speak(text) {
    aiStatusEl.textContent = 'AI is speaking...';
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Push the AI's question to our official conversation history
    conversationHistory.push({ role: 'assistant', content: text });

    utterance.onend = () => {
        aiStatusEl.textContent = 'Listening for your response...';
        if (!isListening) {
            recognition.start();
            isListening = true;
        }
    };
    window.speechSynthesis.speak(utterance);
}

// --- Speech Recognition Event Handlers ---

recognition.onresult = (event) => {
    isListening = false;
    const userAnswer = event.results[0][0].transcript;
    aiStatusEl.textContent = 'Processing your answer...';
    
    addToTranscript('user', userAnswer);
    conversationHistory.push({ role: 'user', content: userAnswer });

    // Send the answer to the backend to get the next question
    getNextAiQuestion();
};

recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    isListening = false;
    aiStatusEl.textContent = 'Sorry, I didn\'t catch that. Let me ask again.';
    // Ask the last question again to recover the conversation flow
    const lastQuestion = conversationHistory[conversationHistory.length - 1].content;
    speak(lastQuestion);
};

/**
 * Sends the conversation history to the backend and gets the next question.
 */
async function getNextAiQuestion() {
    try {
        // We send the entire history and the backend determines the next question
        const response = await fetch(`${API_URL}/interview/respond`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                application_id: appId,
                // The backend API was designed to take the last answer separately
                conversation_history: conversationHistory.slice(0, -1),
                user_answer: conversationHistory[conversationHistory.length - 1].content
            })
        });

        if(!response.ok) throw new Error("Failed to get the next question from the AI.");

        const data = await response.json();
        const nextQuestion = data.next_question;
        
        addToTranscript('assistant', nextQuestion);
        speak(nextQuestion);

    } catch (error) {
        console.error(error);
        alert('A connection error occurred with the AI. The interview will now be finalized with the current transcript.');
        finalizeInterview();
    }
}

/**
 * Ends the interview, stops media, and sends all data to the backend for reporting.
 */
async function finalizeInterview() {
    aiStatusEl.textContent = 'Finalizing... Please wait.';
    endBtn.disabled = true;
    endBtn.textContent = 'Saving...';

    // Stop all media streams and recognition processes
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    recognition.stop();
    speechSynthesis.cancel();

    try {
         await fetch(`${API_URL}/interview/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                application_id: appId,
                transcript: conversationHistory,
                proctoring_notes: proctoringLog
            })
        });
    } catch (error) {
        console.error("Failed to submit final report:", error);
        alert("There was an issue submitting your final report, but your interview is complete.");
    } finally {
        // Always show the completion screen to the user
        mainDiv.style.display = 'none';
        completeDiv.style.display = 'block';
    }
}

// --- Helper & Proctoring Functions ---

function addToTranscript(role, text) {
    const name = role === 'assistant' ? 'AI Interviewer' : 'You';
    transcriptEl.innerHTML += `<p><strong>${name}:</strong> ${text}</p>`;
    transcriptEl.scrollTop = transcriptEl.scrollHeight; // Auto-scroll to the bottom
}

function logProctoringEvent(event) {
    console.warn("Proctoring Event:", event);
    proctoringLog.push({ timestamp: new Date().toISOString(), event: event });
    proctorAlertEl.textContent = event;
    proctorAlertEl.className = 'warning';
    
    // Reset warning color after a few seconds for better UX
    setTimeout(() => {
        if(proctorAlertEl.className === 'warning') {
            proctorAlertEl.textContent = 'OK';
            proctorAlertEl.className = '';
        }
    }, 4000);
}

function enforceMediaStream() {
    // This function adds a listener that triggers if the user revokes permission
    // or unplugs the camera mid-interview.
    const videoTrack = localStream.getVideoTracks()[0];
    videoTrack.onended = () => {
        logProctoringEvent("Camera stream ended unexpectedly.");
        alert("Your camera was disconnected. The interview has been terminated and this event has been logged.");
        finalizeInterview();
    };
}

function setupProctoring() {
    const faceDetection = new FaceDetection({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4/${file}`
    });
    faceDetection.setOptions({ model: 'short', minDetectionConfidence: 0.5 });

    let noFaceCounter = 0;
    const NO_FACE_THRESHOLD = 90; // Approx 3 seconds of no face before logging

    faceDetection.onResults(results => {
        if (!videoEl.paused) { // Only run if video is active
            if (!results.detections || results.detections.length === 0) {
                noFaceCounter++;
                if (noFaceCounter > NO_FACE_THRESHOLD) {
                    logProctoringEvent('Candidate face not detected.');
                    noFaceCounter = 0; // Reset after logging to avoid spamming
                }
            } else if (results.detections.length > 1) {
                logProctoringEvent('Multiple faces detected.');
            } else {
                noFaceCounter = 0; // Reset counter if a single face is visible
            }
        }
    });

    // Use MediaPipe's camera utils to create the processing loop
    const camera = new Camera(videoEl, {
        onFrame: async () => {
            if (videoEl.readyState >= 2) { // Ensure video is ready
                 await faceDetection.send({ image: videoEl });
            }
        },
        width: 640,
        height: 480
    });
    camera.start();
}