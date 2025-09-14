import PyPDF2
import docx
import json
import re
from typing import Dict, List, Optional
from io import BytesIO

class ResumeExtractor:
    def __init__(self):
        self.skills_keywords = [
            'python', 'java', 'javascript', 'c++', 'c#', 'react', 'angular', 'vue',
            'node.js', 'django', 'flask', 'spring', 'sql', 'mongodb', 'postgresql',
            'aws', 'azure', 'docker', 'kubernetes', 'git', 'machine learning',
            'data science', 'artificial intelligence', 'deep learning', 'tensorflow',
            'pytorch', 'opencv', 'pandas', 'numpy', 'scikit-learn', 'html', 'css',
            'bootstrap', 'jquery', 'php', 'ruby', 'golang', 'rust', 'scala',
            'devops', 'ci/cd', 'jenkins', 'linux', 'unix', 'agile', 'scrum'
        ]
        
    def extract_from_pdf(self, file_content: bytes) -> str:
        """Extract text from PDF file"""
        try:
            pdf_reader = PyPDF2.PdfReader(BytesIO(file_content))
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            return text.strip()
        except Exception as e:
            raise Exception(f"Error extracting PDF: {str(e)}")
    
    def extract_from_docx(self, file_content: bytes) -> str:
        """Extract text from DOCX file"""
        try:
            doc = docx.Document(BytesIO(file_content))
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            return text.strip()
        except Exception as e:
            raise Exception(f"Error extracting DOCX: {str(e)}")
    
    def extract_contact_info(self, text: str) -> Dict[str, Optional[str]]:
        """Extract contact information from resume text"""
        contact_info = {
            "email": None,
            "phone": None,
            "linkedin": None,
            "github": None
        }
        
        # Email extraction
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, text)
        if emails:
            contact_info["email"] = emails[0]
        
        # Phone extraction
        phone_pattern = r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
        phones = re.findall(phone_pattern, text)
        if phones:
            contact_info["phone"] = ''.join(phones[0]) if isinstance(phones[0], tuple) else phones[0]
        
        # LinkedIn extraction
        linkedin_pattern = r'linkedin\.com/in/[A-Za-z0-9-]+'
        linkedin = re.search(linkedin_pattern, text.lower())
        if linkedin:
            contact_info["linkedin"] = linkedin.group()
        
        # GitHub extraction
        github_pattern = r'github\.com/[A-Za-z0-9-]+'
        github = re.search(github_pattern, text.lower())
        if github:
            contact_info["github"] = github.group()
            
        return contact_info
    
    def extract_skills(self, text: str) -> List[str]:
        """Extract skills from resume text"""
        text_lower = text.lower()
        found_skills = []
        
        for skill in self.skills_keywords:
            if skill.lower() in text_lower:
                found_skills.append(skill)
        
        # Look for skills section
        skills_section = re.search(r'skills?:?\s*([^\n]*(?:\n[^\n]*)*?)(?:\n\s*\n|\n[A-Z]|$)', text, re.IGNORECASE)
        if skills_section:
            skills_text = skills_section.group(1)
            # Extract comma-separated or bullet-pointed skills
            additional_skills = re.findall(r'[•\-\*]?\s*([A-Za-z0-9+#\.\s]+?)(?:[,\n]|$)', skills_text)
            for skill in additional_skills:
                clean_skill = skill.strip().strip('•-*').strip()
                if clean_skill and len(clean_skill) > 1:
                    found_skills.append(clean_skill)
        
        return list(set(found_skills))  # Remove duplicates
    
    def extract_experience(self, text: str) -> str:
        """Extract work experience from resume text"""
        # Look for experience section
        experience_patterns = [
            r'experience:?\s*([^\n]*(?:\n[^\n]*)*?)(?:\n\s*\n|\neducation|\nskills|$)',
            r'work\s+experience:?\s*([^\n]*(?:\n[^\n]*)*?)(?:\n\s*\n|\neducation|\nskills|$)',
            r'employment:?\s*([^\n]*(?:\n[^\n]*)*?)(?:\n\s*\n|\neducation|\nskills|$)'
        ]
        
        for pattern in experience_patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                return match.group(1).strip()
        
        return ""
    
    def extract_education(self, text: str) -> str:
        """Extract education information from resume text"""
        # Look for education section
        education_patterns = [
            r'education:?\s*([^\n]*(?:\n[^\n]*)*?)(?:\n\s*\n|\nexperience|\nskills|$)',
            r'academic\s+background:?\s*([^\n]*(?:\n[^\n]*)*?)(?:\n\s*\n|\nexperience|\nskills|$)'
        ]
        
        for pattern in education_patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                return match.group(1).strip()
        
        return ""
    
    def process_resume(self, file_content: bytes, filename: str) -> Dict:
        """Process resume file and extract all information"""
        # Determine file type and extract text
        file_extension = filename.lower().split('.')[-1]
        
        if file_extension == 'pdf':
            text_content = self.extract_from_pdf(file_content)
        elif file_extension in ['docx', 'doc']:
            text_content = self.extract_from_docx(file_content)
        else:
            raise ValueError("Unsupported file format. Please upload PDF or DOCX files.")
        
        # Extract information
        contact_info = self.extract_contact_info(text_content)
        skills = self.extract_skills(text_content)
        experience = self.extract_experience(text_content)
        education = self.extract_education(text_content)
        
        return {
            "content": text_content,
            "contact_info": json.dumps(contact_info),
            "skills": json.dumps(skills),
            "experience": experience,
            "education": education
        }