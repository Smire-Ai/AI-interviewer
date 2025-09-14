# AI Interview Platform

A comprehensive role-based AI Interview Platform that supports HR professionals and job seekers with advanced AI features including MediaPipe-based face detection, ATS scoring, and multi-voice audio feedback using Kokoro TTS.

## 🚀 Features

### Core Functionality
- **Role-based Access Control**: Separate dashboards and permissions for HR and candidates
- **Real-time Video Interviews**: Live video interviews with WebRTC support
- **Session Management**: Complete interview lifecycle management

### AI-Powered Features
- **MediaPipe Face Detection**: Real-time attention tracking and engagement analysis
- **Multi-Voice Audio Feedback**: Kokoro TTS integration with multiple voice types
- **ATS Scoring System**: Comprehensive applicant tracking with detailed analytics
- **Interview AI Analysis**: Natural language processing for response evaluation

### Technical Features
- **WebSocket Support**: Real-time communication during interviews
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **RESTful API**: Complete API for all platform functionality
- **Database Integration**: SQLAlchemy with SQLite for development

## 🏗️ Architecture

```
AI-interviewer/
├── backend/                    # FastAPI backend application
│   ├── main.py                # Main application entry point
│   └── app/
│       ├── models/            # Database models
│       │   └── database.py    # SQLAlchemy models and configuration
│       ├── routes/            # API route handlers
│       │   ├── auth.py        # Authentication endpoints
│       │   ├── interview.py   # Interview session management
│       │   ├── ats.py         # ATS scoring endpoints
│       │   └── admin.py       # Admin functionality
│       └── services/          # AI and business logic services
│           ├── face_detection.py   # MediaPipe face detection
│           ├── kokoro_tts.py      # Multi-voice TTS service
│           ├── interview_ai.py    # Interview analysis AI
│           └── ats_service.py     # ATS scoring algorithms
├── frontend/                  # Frontend templates and assets
│   ├── templates/            # Jinja2 HTML templates
│   │   ├── base.html         # Base template with auth
│   │   ├── index.html        # Landing page
│   │   ├── hr_dashboard.html # HR management interface
│   │   ├── candidate_dashboard.html # Candidate portal
│   │   └── interview_room.html # Real-time interview interface
│   └── static/
│       ├── css/              # Custom styling
│       └── js/               # JavaScript functionality
├── requirements.txt          # Python dependencies
└── README.md                # This file
```

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd AI-interviewer
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the application**
   ```bash
   cd backend
   python main.py
   ```

4. **Access the platform**
   - Open your browser to `http://localhost:8000`
   - Register as either HR or Candidate
   - Start using the platform!

## 📋 Requirements

### System Requirements
- Python 3.8+
- Modern web browser with WebRTC support
- Camera and microphone for video interviews

### Python Dependencies
- **FastAPI**: Web framework and API
- **SQLAlchemy**: Database ORM
- **MediaPipe**: Computer vision for face detection
- **Transformers**: Hugging Face models for AI analysis
- **PyTorch**: Machine learning framework
- **OpenCV**: Computer vision processing

## 🎯 User Roles

### HR Users
- Create and manage interview sessions
- Configure AI features (face detection, TTS, ATS scoring)
- Start/end interviews and ask questions
- View comprehensive candidate reports
- Access analytics and system administration

### Candidates
- View scheduled interviews
- Join interview sessions with camera/mic testing
- Receive real-time AI feedback
- View performance results and ATS scores
- Track interview history and progress

## 🤖 AI Features Explained

### MediaPipe Face Detection
- **Attention Tracking**: Monitors candidate engagement during interviews
- **Gaze Analysis**: Detects eye contact and focus direction
- **Head Pose Estimation**: Analyzes head position and orientation
- **Real-time Scoring**: Provides live attention score feedback

### Kokoro TTS Multi-Voice System
- **Professional Voice**: For formal questions and instructions
- **Encouraging Voice**: For positive feedback and motivation
- **Neutral Voice**: For general information and transitions
- **Friendly Voice**: For casual interactions and ice-breaking

### ATS Scoring Algorithm
- **Technical Skills Assessment**: Keyword matching and competency analysis
- **Behavioral Evaluation**: Soft skills and cultural fit analysis
- **Communication Scoring**: Clarity, structure, and effectiveness
- **Overall Candidate Rating**: Weighted composite score with recommendations

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/token` - Login and token generation
- `GET /api/auth/me` - Get current user info

### Interview Management
- `POST /api/interview/sessions` - Create interview session
- `GET /api/interview/sessions` - List user's sessions
- `POST /api/interview/sessions/{id}/start` - Start interview
- `POST /api/interview/sessions/{id}/end` - End interview
- `WebSocket /api/interview/ws/{id}` - Real-time communication

### ATS Scoring
- `GET /api/ats/scores/{session_id}` - Get ATS score
- `POST /api/ats/scores/{session_id}/generate` - Generate ATS score
- `GET /api/ats/reports/{session_id}` - Full ATS report

### Administration
- `GET /api/admin/stats` - System statistics
- `GET /api/admin/users` - User management
- `GET /api/admin/analytics/usage` - Usage analytics

## 🎨 UI Components

### Dashboard Features
- **Statistics Cards**: Key metrics and performance indicators
- **Session Management**: Interview scheduling and status tracking
- **Real-time Updates**: Live session status and notifications
- **Responsive Design**: Optimized for all device sizes

### Interview Room
- **Video Interface**: Dual video streams with controls
- **AI Feedback Panel**: Real-time analysis and suggestions
- **Question Management**: Dynamic question delivery and response collection
- **Attention Monitoring**: Live engagement tracking with visual indicators

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Granular permissions by user type
- **Input Validation**: Comprehensive request validation
- **CORS Protection**: Cross-origin request security
- **Password Hashing**: bcrypt password protection

## 📊 Analytics & Reporting

### HR Analytics
- Interview completion rates
- Average candidate scores
- Feature usage statistics
- Performance trends over time

### Candidate Insights
- Personal performance metrics
- Strength and weakness analysis
- Interview history tracking
- Improvement recommendations

## 🚀 Deployment

### Production Considerations
1. **Environment Variables**: Configure secrets and database URLs
2. **Database Migration**: Use PostgreSQL for production
3. **Media Storage**: Configure file storage for audio/video
4. **Load Balancing**: Scale with multiple FastAPI instances
5. **WebSocket Scaling**: Use Redis for WebSocket session management

### Docker Deployment
```dockerfile
# Example Dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation wiki
- Review the API documentation at `/docs` when running the application

## 🔮 Future Enhancements

- **Multi-language Support**: Internationalization for global use
- **Advanced AI Models**: Integration with GPT and other LLMs
- **Video Recording**: Session recording and playback
- **Integration APIs**: Connect with popular ATS systems
- **Mobile Apps**: Native iOS and Android applications
- **Advanced Analytics**: Machine learning-powered insights

---

Built with ❤️ using FastAPI, MediaPipe, and modern web technologies.
