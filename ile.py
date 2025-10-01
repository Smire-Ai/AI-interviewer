import os

# Define the project structure
structure = {
    "ai-interview-platform": {
        "backend": {
            "app": {
                "api": {
                    "endpoints": {
                        "auth.py": "",
                        "candidate.py": "",
                        "interviewer.py": "",
                        "interview.py": ""
                    },
                    "deps.py": ""
                },
                "core": {
                    "config.py": "",
                    "security.py": ""
                },
                "db": {
                    "supabase_client.py": ""
                },
                "models": {
                    "pydantic_models.py": ""
                },
                "services": {
                    "ai_services.py": "",
                    "pdf_generator.py": ""
                },
                "main.py": ""
            },
            ".env": "# Add your environment variables here\n",
            "requirements.txt": "# Add your dependencies here\n",
            "vercel.json": "{\n  // Vercel config\n}\n"
        },
        "frontend": {
            "css": {
                "style.css": "/* Add your CSS here */\n"
            },
            "js": {
                "auth.js": "// Auth logic\n",
                "candidate.js": "// Candidate dashboard logic\n",
                "interviewer.js": "// Interviewer dashboard logic\n",
                "interview.js": "// Interview logic\n"
            },
            "images": {
                "logo.png": None  # Placeholder for logo
            },
            "candidate_dashboard.html": "<!-- Candidate Dashboard HTML -->\n",
            "index.html": "<!-- Landing Page -->\n",
            "interview.html": "<!-- Interview Page -->\n",
            "interviewer_dashboard.html": "<!-- Interviewer Dashboard HTML -->\n"
        },
        "README.md": "# AI Interview Platform\n\nProject description here.\n"
    }
}


def create_structure(base_path, structure):
    for name, content in structure.items():
        path = os.path.join(base_path, name)
        if isinstance(content, dict):
            os.makedirs(path, exist_ok=True)
            create_structure(path, content)
        else:
            # If content is None, create an empty file (like logo.png placeholder)
            with open(path, "wb" if name.endswith(".png") else "w", encoding=None if name.endswith(".png") else "utf-8") as f:
                if content:
                    if not name.endswith(".png"):  # Don't write text to image placeholder
                        f.write(content)


# Run the script
base_dir = os.getcwd()  # Current directory
create_structure(base_dir, structure)

print("✅ Project structure created successfully!")