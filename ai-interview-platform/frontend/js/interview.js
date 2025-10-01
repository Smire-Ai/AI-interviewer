// frontend/js/interview.js (NEW AND IMPROVED)

const API_URL = 'http://127.0.0.1:8000'; // IMPORTANT: Change this
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
let isListening = false; // This is our primary state flag
const appId = new URLSearchParams(window.location.search).get('appId');

// --- Web Speech API Initialization ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.continuous = false;
recognition.lang = 'en-US';
recognition.interimResults = false;

// --- Event Listeners ---
startBtn.addEventListener('click', initializeInterview);
endBtn.addEventListener('click', finalizeInterview);

// --- Core Functions ---

async function initializeInterview() {
    if (!appId) {
        alert('Error: No application ID found.');
        window.location.href = 'candidate_dashboard.html';
        return;
    }
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        videoEl.srcObject = localStream;
        enforceMediaStream();
        setupProctoring();
        aiStatusEl.textContent = 'Connecting to AI...';
        const response = await fetch(`${API_URL}/interview/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ application_id: appId })
        });
        if (!response.ok) throw new Error('Could not start the interview.');
        const data = await response.json();
        const firstQuestion = data.question;
        setupDiv.style.display = 'none';
        mainDiv.style.display = 'grid';
        endBtn.style.display = 'block';
        addToTranscript('assistant', firstQuestion);
        speak(firstQuestion);
    } catch (error) {
        alert(`Error: ${error.message}. Please ensure you have allowed camera and microphone access.`);
        console.error(error);
    }
}

function speak(text) {
    aiStatusEl.textContent = 'AI is speaking...';
    // **** FIX 1: ABORT any ongoing recognition before speaking ****
    // This prevents the AI from speaking while the app is trying to listen.
    if (isListening) {
        recognition.abort();
        isListening = false;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    conversationHistory.push({ role: 'assistant', content: text });

    utterance.onend = () => {
        // **** FIX 2: ROBUST START ****
        // Only start listening if we are not already in a listening state.
        if (!isListening) {
            aiStatusEl.textContent = 'Listening for your response...';
            try {
                recognition.start();
                isListening = true;
            } catch (e) {
                // This catch block handles the rare case where the state is still invalid.
                console.error("Error starting recognition on utterance end:", e);
                // We can try to recover by stopping and starting again after a short delay.
                recognition.stop(); 
            }
        }
    };

    // If the TTS engine itself has an error, we need to recover.
    utterance.onerror = (event) => {
        console.error("SpeechSynthesis error:", event.error);
        aiStatusEl.textContent = "Audio error. Retrying...";
        // Try to restart the listening process to un-stick the app.
        if (!isListening) {
            recognition.start();
            isListening = true;
        }
    };

    window.speechSynthesis.speak(utterance);
}

// --- Recognition Event Handlers ---

recognition.onresult = (event) => {
    // Check if we are in a listening state before processing.
    if (!isListening) return;

    isListening = false; // We have a result, so we are no longer listening.
    const userAnswer = event.results[0][0].transcript;
    aiStatusEl.textContent = 'Thinking...';
    
    addToTranscript('user', userAnswer);
    conversationHistory.push({ role: 'user', content: userAnswer });
    getNextAiQuestion();
};

recognition.onerror = (event) => {
    isListening = false; // An error occurred, so we are no longer listening.
    console.error('Speech recognition error:', event.error);

    // The 'no-speech' error is common if the user is silent. We can handle it gracefully.
    if (event.error === 'no-speech') {
        aiStatusEl.textContent = 'I didn\'t hear anything. Let me ask again.';
    } else if (event.error === 'aborted') {
        // This is a normal occurrence when we call recognition.abort(), so we don't need to show an error.
        console.log("Recognition aborted, likely by new 'speak' call.");
        return;
    } else {
        aiStatusEl.textContent = 'Sorry, there was a listening error.';
    }

    // After an error, it's safest to re-ask the last question to get the interview back on track.
    setTimeout(() => {
        const lastQuestion = conversationHistory[conversationHistory.length - 1].content;
        speak(lastQuestion);
    }, 1500); // A short delay before re-asking.
};

// **** FIX 3: ADD 'onend' HANDLER ****
// This is crucial. This event fires when recognition stops naturally (e.g., after the user stops talking).
// We must update our state flag here.
recognition.onend = () => {
    isListening = false;
    console.log("Recognition service ended.");
};


async function getNextAiQuestion() {
    // ... (This function remains the same)
    try {
        const response = await fetch(`${API_URL}/interview/respond`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                application_id: appId,
                conversation_history: conversationHistory.slice(0, -1),
                user_answer: conversationHistory[conversationHistory.length - 1].content
            })
        });
        if(!response.ok) throw new Error("Failed to get next question from AI.");
        const data = await response.json();
        const nextQuestion = data.next_question;
        addToTranscript('assistant', nextQuestion);
        speak(nextQuestion);
    } catch (error) {
        console.error(error);
        alert('Connection to AI lost. The interview will now end.');
        finalizeInterview();
    }
}

async function finalizeInterview() {
    // ... (This function remains the same)
    aiStatusEl.textContent = 'Finalizing... Please wait.';
    endBtn.disabled = true;
    if (isListening) {
        recognition.abort();
        isListening = false;
    }
    speechSynthesis.cancel();
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
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
    } finally {
        mainDiv.style.display = 'none';
        completeDiv.style.display = 'block';
    }
}

// --- Helper & Proctoring Functions ---
// ... (All helper and proctoring functions remain the same)

function addToTranscript(role, text) {
    const name = role === 'assistant' ? 'AI Interviewer' : 'You';
    transcriptEl.innerHTML += `<p><strong>${name}:</strong> ${text}</p>`;
    transcriptEl.scrollTop = transcriptEl.scrollHeight;
}

function logProctoringEvent(event) {
    proctoringLog.push({ timestamp: new Date().toISOString(), event: event });
    proctorAlertEl.textContent = event;
    proctorAlertEl.className = 'warning';
    setTimeout(() => {
        proctorAlertEl.textContent = 'OK';
        proctorAlertEl.className = '';
    }, 4000);
}

function enforceMediaStream() {
    const videoTrack = localStream.getVideoTracks()[0];
    videoTrack.onended = () => {
        alert("Camera stream lost. The interview has been terminated.");
        logProctoringEvent("Camera stream ended unexpectedly.");
        finalizeInterview();
    };
}

function setupProctoring() {
    const faceDetection = new FaceDetection({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4/${file}`
    });
    faceDetection.setOptions({ model: 'short', minDetectionConfidence: 0.5 });
    let noFaceCounter = 0;
    const NO_FACE_THRESHOLD = 60;
    faceDetection.onResults(results => {
        if (!results.detections || results.detections.length === 0) {
            noFaceCounter++;
            if (noFaceCounter > NO_FACE_THRESHOLD) {
                logProctoringEvent('Candidate face not detected.');
                noFaceCounter = 0;
            }
        } else if (results.detections.length > 1) {
            logProctoringEvent('Multiple faces detected.');
        } else {
            noFaceCounter = 0;
        }
    });
    const camera = new Camera(videoEl, {
        onFrame: async () => {
            await faceDetection.send({ image: videoEl });
        },
        width: 640,
        height: 480
    });
    camera.start();
}