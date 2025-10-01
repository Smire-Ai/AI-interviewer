# backend/test_groq.py

import os
from dotenv import load_dotenv
from groq import Groq, AuthenticationError, APIConnectionError

print("--- Starting Groq API Key Test ---")

# Step 1: Load environment variables from .env file
print("Loading .env file...")
load_dotenv()
print(".env file loaded.")

# Step 2: Read the API key from the environment
print("Reading GROQ_API_KEY from environment...")
api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    print("\n--- TEST FAILED ---")
    print("REASON: The GROQ_API_KEY was not found in your .env file.")
    print("SOLUTION: Ensure your .env file is in the 'backend' folder and contains the line: GROQ_API_KEY='gsk_...'")
    exit()

if not api_key.startswith("gsk_"):
    print("\n--- TEST FAILED ---")
    print(f"REASON: The key found does not look like a valid Groq key. Key found: '{api_key[:10]}...'")
    print("SOLUTION: Go to your Groq dashboard, create a NEW key, and paste it correctly into the .env file.")
    exit()

print("API Key found and appears to be in the correct format.")

# Step 3: Initialize the Groq client and make a test call
try:
    print("Initializing Groq client...")
    # The client will automatically use the environment variable
    client = Groq()
    print("Client initialized.")
    
    print("Making a test API call to Groq...")
    chat_completion = client.chat.completions.create(
        messages=[{"role": "user", "content": "Hello, Groq!"}],
        model="qwen/qwen3-32b", # Using the smallest, fastest model for a quick test
    )
    
    print("\n--- TEST SUCCEEDED! ---")
    print("Successfully connected to the Groq API and received a response.")
    print("Your API key and environment are configured correctly.")
    print("AI Response:", chat_completion.choices[0].message.content)

except AuthenticationError as e:
    print("\n--- TEST FAILED: AUTHENTICATION ERROR ---")
    print("REASON: The Groq API rejected your key. It is invalid, expired, or has been revoked.")
    print("THIS IS THE MOST LIKELY PROBLEM.")
    print("DEFINITIVE SOLUTION: Go to your Groq dashboard (https://console.groq.com/keys), DELETE your old key, create a brand NEW one, and put the new key in your .env file.")
    
except APIConnectionError as e:
    print("\n--- TEST FAILED: CONNECTION ERROR ---")
    print("REASON: The script could not establish a connection to Groq's servers.")
    print("TROUBLESHOOTING: Check your internet connection. If you are on a corporate or school network, a firewall might be blocking the connection.")

except Exception as e:
    print("\n--- TEST FAILED: UNKNOWN ERROR ---")
    print("REASON: An unexpected error occurred.")
    print(f"ERROR DETAILS: {e}")