"""
Kokoro TTS service for multi-voice audio feedback
"""

import os
import torch
import torchaudio
from transformers import pipeline
import soundfile as sf
import numpy as np
from typing import Dict, Optional, List
import logging
import asyncio
from pathlib import Path
import uuid

logger = logging.getLogger(__name__)

class KokoroTTSService:
    """Multi-voice TTS service using Kokoro TTS via Hugging Face"""
    
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.audio_dir = Path("../frontend/static/audio")
        self.audio_dir.mkdir(parents=True, exist_ok=True)
        
        # Voice configurations
        self.voices = {
            "professional": {
                "name": "Professional Voice",
                "model": "facebook/fastspeech2-en-ljspeech",
                "vocoder": "facebook/hifigan-ljspeech",
                "description": "Clear, professional tone for formal questions",
                "pitch_shift": 0.0,
                "speed": 1.0
            },
            "encouraging": {
                "name": "Encouraging Voice",
                "model": "facebook/fastspeech2-en-ljspeech",
                "vocoder": "facebook/hifigan-ljspeech", 
                "description": "Warm, encouraging tone for feedback",
                "pitch_shift": 0.1,
                "speed": 0.9
            },
            "neutral": {
                "name": "Neutral Voice",
                "model": "facebook/fastspeech2-en-ljspeech",
                "vocoder": "facebook/hifigan-ljspeech",
                "description": "Neutral tone for instructions",
                "pitch_shift": 0.0,
                "speed": 1.0
            },
            "friendly": {
                "name": "Friendly Voice",
                "model": "facebook/fastspeech2-en-ljspeech", 
                "vocoder": "facebook/hifigan-ljspeech",
                "description": "Friendly, approachable tone",
                "pitch_shift": 0.05,
                "speed": 0.95
            }
        }
        
        self.loaded_models = {}
        self.sample_rate = 22050
        
        # Initialize with a simple TTS pipeline as fallback
        try:
            self.fallback_tts = pipeline(
                "text-to-speech",
                model="microsoft/speecht5_tts",
                device=0 if torch.cuda.is_available() else -1
            )
            logger.info("Initialized fallback TTS pipeline")
        except Exception as e:
            logger.warning(f"Could not initialize fallback TTS: {e}")
            self.fallback_tts = None
    
    async def load_voice_model(self, voice_type: str) -> bool:
        """Load a specific voice model"""
        if voice_type not in self.voices:
            logger.error(f"Unknown voice type: {voice_type}")
            return False
        
        if voice_type in self.loaded_models:
            return True
        
        try:
            voice_config = self.voices[voice_type]
            
            # For now, we'll use a simplified approach with the fallback TTS
            # In a production environment, you'd load the specific Kokoro models
            self.loaded_models[voice_type] = {
                "model": self.fallback_tts,
                "config": voice_config
            }
            
            logger.info(f"Loaded voice model: {voice_type}")
            return True
            
        except Exception as e:
            logger.error(f"Error loading voice model {voice_type}: {e}")
            return False
    
    def apply_voice_effects(self, audio: np.ndarray, voice_config: Dict) -> np.ndarray:
        """Apply voice effects based on configuration"""
        try:
            # Convert to tensor for processing
            audio_tensor = torch.from_numpy(audio)
            
            # Speed adjustment
            if voice_config.get("speed", 1.0) != 1.0:
                speed = voice_config["speed"]
                audio_tensor = torchaudio.functional.speed(audio_tensor, speed)
            
            # Pitch shift
            if voice_config.get("pitch_shift", 0.0) != 0.0:
                pitch_shift = voice_config["pitch_shift"]
                audio_tensor = torchaudio.functional.pitch_shift(
                    audio_tensor, 
                    sample_rate=self.sample_rate,
                    n_steps=pitch_shift * 12  # Convert to semitones
                )
            
            return audio_tensor.numpy()
            
        except Exception as e:
            logger.warning(f"Error applying voice effects: {e}")
            return audio
    
    async def generate_speech(self, text: str, voice_type: str = "professional") -> Optional[str]:
        """
        Generate speech from text using specified voice
        Returns path to generated audio file
        """
        try:
            # Validate inputs
            if not text or not text.strip():
                logger.error("Empty text provided for TTS")
                return None
            
            if voice_type not in self.voices:
                logger.warning(f"Unknown voice type {voice_type}, using professional")
                voice_type = "professional"
            
            # Load voice model if not already loaded
            if not await self.load_voice_model(voice_type):
                logger.error(f"Failed to load voice model: {voice_type}")
                return None
            
            # Generate unique filename
            filename = f"tts_{voice_type}_{uuid.uuid4().hex[:8]}.wav"
            filepath = self.audio_dir / filename
            
            # Get voice configuration
            voice_config = self.voices[voice_type]
            model_info = self.loaded_models[voice_type]
            
            # Generate speech
            if self.fallback_tts:
                # Use the fallback TTS pipeline
                result = self.fallback_tts(text)
                
                # Extract audio data
                if isinstance(result, dict) and "audio" in result:
                    audio = result["audio"]
                    sample_rate = result.get("sampling_rate", self.sample_rate)
                else:
                    # Handle different pipeline formats
                    audio = result
                    sample_rate = self.sample_rate
                
                # Ensure audio is numpy array
                if isinstance(audio, torch.Tensor):
                    audio = audio.cpu().numpy()
                
                # Apply voice effects
                audio = self.apply_voice_effects(audio, voice_config)
                
                # Save audio file
                sf.write(str(filepath), audio, sample_rate)
                
                logger.info(f"Generated TTS audio: {filename}")
                return f"static/audio/{filename}"
            
            else:
                # Fallback to simple text file (for development)
                with open(str(filepath).replace('.wav', '.txt'), 'w') as f:
                    f.write(f"Voice: {voice_type}\nText: {text}")
                logger.warning("TTS not available, created text file instead")
                return f"static/audio/{filename.replace('.wav', '.txt')}"
                
        except Exception as e:
            logger.error(f"Error generating speech: {e}")
            return None
    
    async def generate_batch_speech(self, texts: List[Dict[str, str]]) -> List[Optional[str]]:
        """
        Generate multiple speech files in batch
        texts: List of {"text": str, "voice_type": str} dictionaries
        """
        tasks = []
        for item in texts:
            text = item.get("text", "")
            voice_type = item.get("voice_type", "professional")
            tasks.append(self.generate_speech(text, voice_type))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle exceptions
        processed_results = []
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Batch TTS error: {result}")
                processed_results.append(None)
            else:
                processed_results.append(result)
        
        return processed_results
    
    def get_voice_info(self, voice_type: str) -> Optional[Dict]:
        """Get information about a specific voice"""
        if voice_type in self.voices:
            return self.voices[voice_type].copy()
        return None
    
    def list_available_voices(self) -> List[Dict]:
        """List all available voices with their information"""
        return [
            {
                "id": voice_id,
                "name": config["name"],
                "description": config["description"]
            }
            for voice_id, config in self.voices.items()
        ]
    
    async def generate_interview_prompts(self, session_data: Dict) -> Dict[str, str]:
        """Generate common interview audio prompts for a session"""
        job_title = session_data.get("job_title", "this position")
        candidate_name = session_data.get("candidate_name", "")
        
        prompts = {
            "welcome": f"Welcome to your interview for {job_title}. Please make sure your camera and microphone are working properly.",
            "question_prompt": "Here's your next question. Please take your time to think before answering.",
            "answer_received": "Thank you for your answer. Let me ask you another question.",
            "technical_transition": "Now let's move on to some technical questions related to the role.",
            "behavioral_transition": "I'd like to ask you some behavioral questions to understand your work style.",
            "closing": "Thank you for taking the time to interview with us. We'll be in touch soon with next steps.",
            "time_warning": "You have about 2 minutes remaining for this question.",
            "encouragement": "You're doing great! Take your time with the next question."
        }
        
        # Generate audio files for all prompts
        batch_requests = [
            {"text": text, "voice_type": "professional"}
            for text in prompts.values()
        ]
        
        audio_files = await self.generate_batch_speech(batch_requests)
        
        # Map prompts to audio files
        result = {}
        for i, (prompt_type, _) in enumerate(prompts.items()):
            result[prompt_type] = audio_files[i] if audio_files[i] else None
        
        return result
    
    async def generate_feedback_audio(self, feedback_text: str, tone: str = "encouraging") -> Optional[str]:
        """Generate audio feedback with appropriate tone"""
        if not feedback_text:
            return None
        
        # Map tone to voice type
        tone_mapping = {
            "encouraging": "encouraging",
            "professional": "professional", 
            "neutral": "neutral",
            "friendly": "friendly",
            "positive": "encouraging",
            "constructive": "professional"
        }
        
        voice_type = tone_mapping.get(tone, "professional")
        
        # Limit feedback length for audio generation
        if len(feedback_text) > 200:
            feedback_text = feedback_text[:197] + "..."
        
        return await self.generate_speech(feedback_text, voice_type)
    
    def cleanup_old_files(self, max_age_hours: int = 24):
        """Clean up old audio files to save disk space"""
        try:
            import time
            current_time = time.time()
            max_age_seconds = max_age_hours * 3600
            
            for file_path in self.audio_dir.glob("tts_*.wav"):
                file_age = current_time - file_path.stat().st_mtime
                if file_age > max_age_seconds:
                    file_path.unlink()
                    logger.info(f"Cleaned up old audio file: {file_path.name}")
                    
        except Exception as e:
            logger.error(f"Error cleaning up audio files: {e}")
    
    def get_stats(self) -> Dict:
        """Get TTS service statistics"""
        try:
            total_files = len(list(self.audio_dir.glob("tts_*.wav")))
            total_size_mb = sum(
                f.stat().st_size for f in self.audio_dir.glob("tts_*.wav")
            ) / (1024 * 1024)
            
            return {
                "device": self.device,
                "loaded_voices": list(self.loaded_models.keys()),
                "available_voices": len(self.voices),
                "total_audio_files": total_files,
                "total_size_mb": round(total_size_mb, 2),
                "audio_directory": str(self.audio_dir)
            }
        except Exception as e:
            logger.error(f"Error getting TTS stats: {e}")
            return {"error": str(e)}