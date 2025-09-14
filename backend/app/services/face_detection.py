"""
MediaPipe-based face detection service for interview attention tracking
"""

import cv2
import numpy as np
import mediapipe as mp
import base64
from typing import Dict, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class FaceDetectionService:
    """Face detection and attention analysis using MediaPipe"""
    
    def __init__(self):
        self.mp_face_detection = mp.solutions.face_detection
        self.mp_face_mesh = mp.solutions.face_mesh
        self.mp_drawing = mp.solutions.drawing_utils
        
        # Initialize MediaPipe models
        self.face_detection = self.mp_face_detection.FaceDetection(
            model_selection=0, min_detection_confidence=0.5
        )
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        
        # Eye landmarks for gaze detection
        self.LEFT_EYE_LANDMARKS = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
        self.RIGHT_EYE_LANDMARKS = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]
        
    def decode_base64_image(self, base64_string: str) -> Optional[np.ndarray]:
        """Decode base64 image string to OpenCV format"""
        try:
            # Remove data URL prefix if present
            if base64_string.startswith('data:image'):
                base64_string = base64_string.split(',')[1]
            
            # Decode base64
            image_data = base64.b64decode(base64_string)
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            return image
        except Exception as e:
            logger.error(f"Error decoding base64 image: {e}")
            return None
    
    def detect_face(self, image: np.ndarray) -> Dict:
        """Detect face in image and return basic metrics"""
        if image is None:
            return {"face_detected": False, "confidence": 0.0}
        
        # Convert BGR to RGB
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Detect faces
        results = self.face_detection.process(rgb_image)
        
        if results.detections:
            detection = results.detections[0]  # Use first detection
            confidence = detection.score[0]
            
            # Get bounding box
            bbox = detection.location_data.relative_bounding_box
            
            return {
                "face_detected": True,
                "confidence": float(confidence),
                "bbox": {
                    "x": float(bbox.xmin),
                    "y": float(bbox.ymin),
                    "width": float(bbox.width),
                    "height": float(bbox.height)
                }
            }
        
        return {"face_detected": False, "confidence": 0.0}
    
    def analyze_eye_gaze(self, image: np.ndarray) -> Dict:
        """Analyze eye gaze direction using face mesh"""
        if image is None:
            return {"gaze_detected": False, "looking_at_camera": False, "gaze_score": 0.0}
        
        # Convert BGR to RGB
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Process with face mesh
        results = self.face_mesh.process(rgb_image)
        
        if results.multi_face_landmarks:
            landmarks = results.multi_face_landmarks[0]
            
            # Get image dimensions
            h, w = image.shape[:2]
            
            # Extract eye landmarks
            left_eye_points = []
            right_eye_points = []
            
            for idx in self.LEFT_EYE_LANDMARKS:
                landmark = landmarks.landmark[idx]
                left_eye_points.append([int(landmark.x * w), int(landmark.y * h)])
            
            for idx in self.RIGHT_EYE_LANDMARKS:
                landmark = landmarks.landmark[idx]
                right_eye_points.append([int(landmark.x * w), int(landmark.y * h)])
            
            # Calculate eye centers
            left_eye_center = np.mean(left_eye_points, axis=0).astype(int)
            right_eye_center = np.mean(right_eye_points, axis=0).astype(int)
            
            # Calculate gaze direction (simplified)
            eye_center = (left_eye_center + right_eye_center) / 2
            image_center = np.array([w // 2, h // 2])
            
            # Distance from center
            distance = np.linalg.norm(eye_center - image_center)
            max_distance = min(w, h) * 0.3  # 30% of image dimension
            
            # Gaze score (higher when looking at camera)
            gaze_score = max(0, 1 - (distance / max_distance))
            looking_at_camera = gaze_score > 0.7
            
            return {
                "gaze_detected": True,
                "looking_at_camera": looking_at_camera,
                "gaze_score": float(gaze_score),
                "eye_center": eye_center.tolist(),
                "distance_from_center": float(distance)
            }
        
        return {"gaze_detected": False, "looking_at_camera": False, "gaze_score": 0.0}
    
    def analyze_head_pose(self, image: np.ndarray) -> Dict:
        """Analyze head pose and orientation"""
        if image is None:
            return {"pose_detected": False, "pose_score": 0.0}
        
        # Convert BGR to RGB
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Process with face mesh
        results = self.face_mesh.process(rgb_image)
        
        if results.multi_face_landmarks:
            landmarks = results.multi_face_landmarks[0]
            
            # Get key points for pose estimation
            h, w = image.shape[:2]
            
            # Nose tip, chin, left and right eye corners
            nose_tip = landmarks.landmark[1]
            chin = landmarks.landmark[18]
            left_eye = landmarks.landmark[33]
            right_eye = landmarks.landmark[362]
            
            # Convert to pixel coordinates
            nose_tip_px = [int(nose_tip.x * w), int(nose_tip.y * h)]
            chin_px = [int(chin.x * w), int(chin.y * h)]
            left_eye_px = [int(left_eye.x * w), int(left_eye.y * h)]
            right_eye_px = [int(right_eye.x * w), int(right_eye.y * h)]
            
            # Calculate face orientation
            eye_center = [(left_eye_px[0] + right_eye_px[0]) // 2, 
                         (left_eye_px[1] + right_eye_px[1]) // 2]
            
            # Vertical alignment (head tilt)
            vertical_alignment = abs(left_eye_px[1] - right_eye_px[1]) / w
            
            # Horizontal alignment (head turn)
            face_center_x = (nose_tip_px[0] + chin_px[0]) // 2
            horizontal_deviation = abs(face_center_x - w // 2) / w
            
            # Overall pose score (higher is better alignment)
            pose_score = max(0, 1 - vertical_alignment * 2 - horizontal_deviation * 2)
            
            return {
                "pose_detected": True,
                "pose_score": float(pose_score),
                "vertical_alignment": float(vertical_alignment),
                "horizontal_deviation": float(horizontal_deviation),
                "well_aligned": pose_score > 0.6
            }
        
        return {"pose_detected": False, "pose_score": 0.0}
    
    async def analyze_attention(self, face_data: str) -> float:
        """
        Main function to analyze attention level from face data
        Returns attention score from 0.0 to 1.0
        """
        try:
            # Decode image
            image = self.decode_base64_image(face_data)
            if image is None:
                return 0.0
            
            # Perform all analyses
            face_result = self.detect_face(image)
            gaze_result = self.analyze_eye_gaze(image)
            pose_result = self.analyze_head_pose(image)
            
            # Calculate combined attention score
            attention_factors = []
            
            # Face detection confidence
            if face_result["face_detected"]:
                attention_factors.append(face_result["confidence"])
            else:
                return 0.0  # No face detected
            
            # Gaze score
            if gaze_result["gaze_detected"]:
                attention_factors.append(gaze_result["gaze_score"])
            
            # Pose score
            if pose_result["pose_detected"]:
                attention_factors.append(pose_result["pose_score"])
            
            # Calculate weighted average
            if attention_factors:
                # Weight: face detection (0.3), gaze (0.4), pose (0.3)
                weights = [0.3, 0.4, 0.3][:len(attention_factors)]
                weighted_sum = sum(score * weight for score, weight in zip(attention_factors, weights))
                total_weight = sum(weights)
                attention_score = weighted_sum / total_weight
            else:
                attention_score = 0.0
            
            return min(1.0, max(0.0, attention_score))
            
        except Exception as e:
            logger.error(f"Error in attention analysis: {e}")
            return 0.0
    
    def get_detailed_analysis(self, face_data: str) -> Dict:
        """Get detailed face analysis for debugging/monitoring"""
        try:
            image = self.decode_base64_image(face_data)
            if image is None:
                return {"error": "Could not decode image"}
            
            face_result = self.detect_face(image)
            gaze_result = self.analyze_eye_gaze(image)
            pose_result = self.analyze_head_pose(image)
            attention_score = self.analyze_attention(face_data)
            
            return {
                "face_detection": face_result,
                "gaze_analysis": gaze_result,
                "pose_analysis": pose_result,
                "overall_attention_score": attention_score,
                "image_shape": image.shape,
                "timestamp": cv2.getTickCount()
            }
            
        except Exception as e:
            logger.error(f"Error in detailed analysis: {e}")
            return {"error": str(e)}
    
    def cleanup(self):
        """Cleanup MediaPipe resources"""
        if hasattr(self, 'face_detection'):
            self.face_detection.close()
        if hasattr(self, 'face_mesh'):
            self.face_mesh.close()