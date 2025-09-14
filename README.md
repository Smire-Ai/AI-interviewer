# AI Interviewer 🤖

A comprehensive AI-powered interview system that extracts resume data, compares it with job descriptions, and conducts intelligent interviews with automated scoring.

## Features

### 📄 Resume Processing
- **Multi-format Support**: Upload PDF, DOC, and DOCX files
- **Smart Extraction**: Automatically extracts skills, experience, education, and contact information
- **Skills Recognition**: Identifies technical and soft skills from resume content

### 💼 Job Description Management
- **JD Creation**: Create detailed job descriptions with required skills and experience levels
- **Skills Matching**: Compare resume skills with job requirements
- **Match Scoring**: Calculate compatibility percentage between candidate and role

### 🎤 AI-Powered Interviews
- **Dynamic Questions**: Generate relevant questions based on resume and JD comparison
- **Question Types**: Mix of technical, behavioral, and experience-based questions
- **Real-time Evaluation**: AI-powered answer scoring and feedback
- **Adaptive Difficulty**: Questions tailored to candidate's experience level

### 📊 Comprehensive Scoring
- **Multi-factor Evaluation**: Combines resume-JD match with interview performance
- **Detailed Feedback**: Provides strengths, weaknesses, and improvement areas
- **Grade System**: A+ to F grading with detailed explanations
- **HR Dashboard**: Easy-to-understand results for hiring decisions

## Technology Stack

- **Backend**: FastAPI (Python)
- **Frontend**: HTML5, CSS3, Bootstrap 5, Vanilla JavaScript
- **Database**: SQLite (upgradeable to PostgreSQL)
- **AI/ML**: OpenAI GPT-3.5 (with fallback options)
- **Resume Processing**: PyPDF2, python-docx
- **Text Analysis**: scikit-learn, NLTK

## Quick Start

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/Smire-Ai/AI-interviewer.git
cd AI-interviewer

# Install dependencies
pip install -r requirements.txt
```

### 2. Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your settings
# Add your OpenAI API key for enhanced AI features (optional)
OPENAI_API_KEY=your_api_key_here
```

### 3. Run the Application

```bash
# Start the server
python main.py

# Or using uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Access the Application

Open your browser and navigate to: `http://localhost:8000`

## Usage Guide

### Step 1: Upload Resume
1. Click on "Upload Resume" section
2. Select a PDF or DOCX resume file
3. The system will automatically extract skills, experience, and education

### Step 2: Create Job Description
1. Go to "Job Description" section
2. Fill in job title, description, required skills, and experience level
3. Save the job description

### Step 3: Start Interview
1. In the "Start Interview" section, select:
   - Resume from uploaded files
   - Job description from created JDs
   - Number of questions (5-20)
2. Click "Start Interview"

### Step 4: Answer Questions
1. The system generates relevant questions based on resume-JD analysis
2. Answer each question in the provided text area
3. Submit answers one by one to get immediate feedback

### Step 5: Complete Interview
1. After answering all questions, click "Complete Interview"
2. View comprehensive results including:
   - Overall score and grade
   - Resume-JD match percentage
   - Individual question scores
   - Detailed feedback and recommendations

### Step 6: Review Results
1. Check "Interview Results" section for detailed analysis
2. Use "Interview History" to review past interviews
3. Export or share results with HR team

## API Documentation

The application provides comprehensive REST APIs:

### Resume Endpoints
- `POST /api/resume/upload` - Upload and process resume
- `GET /api/resume/list` - List all resumes
- `GET /api/resume/{id}` - Get resume details
- `DELETE /api/resume/{id}` - Delete resume

### Job Description Endpoints
- `POST /api/resume/job-description` - Create job description
- `GET /api/resume/job-description/list` - List job descriptions
- `GET /api/resume/job-description/{id}` - Get JD details

### Interview Endpoints
- `POST /api/interview/start` - Start new interview
- `POST /api/interview/answer` - Submit answer
- `POST /api/interview/{id}/complete` - Complete interview
- `GET /api/interview/list` - List interviews
- `GET /api/interview/{id}` - Get interview details

## Configuration Options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for enhanced AI features | None (uses fallback) |
| `DATABASE_URL` | Database connection string | `sqlite:///./ai_interviewer.db` |
| `DEBUG` | Enable debug mode | `False` |
| `HOST` | Server host | `0.0.0.0` |
| `PORT` | Server port | `8000` |

### Scoring Configuration

The system uses weighted scoring:
- **Skills Match**: 60% weight
- **Content Similarity**: 40% weight
- **Final Score**: 70% interview performance + 30% resume-JD match

## AI Features

### With OpenAI API Key
- Dynamic question generation based on specific resume-JD analysis
- Intelligent answer evaluation with detailed feedback
- Context-aware follow-up questions
- Advanced natural language processing

### Without OpenAI API Key (Fallback Mode)
- Predefined question sets based on job types
- Rule-based answer evaluation
- Basic scoring algorithms
- Standard feedback templates

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@smire-ai.com or create an issue in the GitHub repository.

## Roadmap

- [ ] Video interview integration
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Integration with ATS systems
- [ ] Custom question templates
- [ ] Bulk interview processing
- [ ] Advanced reporting features
