"""
Face Recognition Module using DeepFace and FaceNet
Provides accurate face detection, encoding, and verification
"""

import os
import cv2
import numpy as np
import logging
from typing import Optional, Tuple, List, Dict, Any
from deepface import DeepFace
from config import Config
import base64
from io import BytesIO
from PIL import Image

# Setup logging
logging.basicConfig(level=getattr(logging, Config.LOG_LEVEL))
logger = logging.getLogger(__name__)


class FaceRecognitionSystem:
    """Face recognition system using DeepFace and FaceNet"""

    def __init__(self):
        self.model_name = Config.FACE_MODEL
        self.detector_backend = Config.FACE_DETECTION_BACKEND
        self.similarity_threshold = Config.SIMILARITY_THRESHOLD
        self.min_face_size = Config.MIN_FACE_SIZE
        logger.info(f"✓ Face Recognition initialized: Model={self.model_name}, Detector={self.detector_backend}")

    def detect_face(self, image_path: str) -> Tuple[bool, Optional[np.ndarray], str]:
        """
        Detect face in image
        Returns: (success, face_array, message)
        """
        try:
            # Read image
            if not os.path.exists(image_path):
                return False, None, "Image file not found"

            img = cv2.imread(image_path)
            if img is None:
                return False, None, "Failed to read image"

            # Detect faces using DeepFace
            try:
                face_objs = DeepFace.extract_faces(
                    img_path=image_path,
                    detector_backend=self.detector_backend,
                    enforce_detection=True,
                    align=True
                )

                if not face_objs:
                    return False, None, "No face detected"

                if len(face_objs) > 1:
                    return False, None, "Multiple faces detected. Please ensure only one face is visible"

                # Get the detected face
                face_obj = face_objs[0]
                face_array = face_obj['face']

                # Check face size
                height, width = face_array.shape[:2]
                if height < self.min_face_size or width < self.min_face_size:
                    return False, None, f"Face too small. Minimum size: {self.min_face_size}x{self.min_face_size}"

                logger.info(f"✓ Face detected successfully: {width}x{height}")
                return True, face_array, "Face detected successfully"

            except ValueError as e:
                if "Face could not be detected" in str(e):
                    return False, None, "No face detected in the image"
                return False, None, f"Detection error: {str(e)}"

        except Exception as e:
            logger.error(f"Error detecting face: {e}")
            return False, None, f"Error: {str(e)}"

    def generate_face_encoding(self, image_path: str) -> Tuple[bool, Optional[List[float]], str]:
        """
        Generate face encoding using FaceNet
        Returns: (success, encoding, message)
        """
        try:
            # First detect face
            success, face_array, message = self.detect_face(image_path)
            if not success:
                return False, None, message

            # Generate embedding using DeepFace
            try:
                embedding_objs = DeepFace.represent(
                    img_path=image_path,
                    model_name=self.model_name,
                    detector_backend=self.detector_backend,
                    enforce_detection=True,
                    align=True
                )

                if not embedding_objs:
                    return False, None, "Failed to generate face encoding"

                # Get the first embedding (128-dimensional for FaceNet)
                embedding = embedding_objs[0]['embedding']

                logger.info(f"✓ Face encoding generated: {len(embedding)} dimensions")
                return True, embedding, "Encoding generated successfully"

            except Exception as e:
                return False, None, f"Encoding error: {str(e)}"

        except Exception as e:
            logger.error(f"Error generating encoding: {e}")
            return False, None, f"Error: {str(e)}"

    def verify_face(self, image_path: str, stored_encoding: List[float]) -> Tuple[bool, float, str]:
        """
        Verify face against stored encoding
        Returns: (is_match, similarity_score, message)
        """
        try:
            # Generate encoding for the current image
            success, current_encoding, message = self.generate_face_encoding(image_path)
            if not success:
                return False, 0.0, message

            # Calculate cosine similarity
            similarity = self._calculate_cosine_similarity(current_encoding, stored_encoding)

            # Convert similarity to distance (0 = same, 1 = different)
            distance = 1 - similarity

            # Check if match
            is_match = distance <= self.similarity_threshold

            logger.info(f"Face verification: Distance={distance:.4f}, Threshold={self.similarity_threshold}, Match={is_match}")

            if is_match:
                return True, similarity, f"Face verified successfully (similarity: {similarity:.2%})"
            else:
                return False, similarity, f"Face verification failed (similarity: {similarity:.2%})"

        except Exception as e:
            logger.error(f"Error verifying face: {e}")
            return False, 0.0, f"Error: {str(e)}"

    def find_matching_user(self, image_path: str, user_encodings: Dict[str, List[float]]) -> Tuple[Optional[str], float, str]:
        """
        Find matching user from a dictionary of encodings
        Returns: (username, similarity, message)
        """
        try:
            # Generate encoding for the current image
            success, current_encoding, message = self.generate_face_encoding(image_path)
            if not success:
                return None, 0.0, message

            best_match = None
            best_similarity = 0.0

            # Compare with all stored encodings
            for username, stored_encoding in user_encodings.items():
                similarity = self._calculate_cosine_similarity(current_encoding, stored_encoding)
                distance = 1 - similarity

                if distance <= self.similarity_threshold and similarity > best_similarity:
                    best_match = username
                    best_similarity = similarity

            if best_match:
                logger.info(f"✓ User identified: {best_match} (similarity: {best_similarity:.2%})")
                return best_match, best_similarity, f"User identified: {best_match}"
            else:
                return None, 0.0, "No matching user found"

        except Exception as e:
            logger.error(f"Error finding matching user: {e}")
            return None, 0.0, f"Error: {str(e)}"

    def _calculate_cosine_similarity(self, encoding1: List[float], encoding2: List[float]) -> float:
        """Calculate cosine similarity between two encodings"""
        try:
            # Convert to numpy arrays
            vec1 = np.array(encoding1)
            vec2 = np.array(encoding2)

            # Calculate cosine similarity
            dot_product = np.dot(vec1, vec2)
            norm1 = np.linalg.norm(vec1)
            norm2 = np.linalg.norm(vec2)

            if norm1 == 0 or norm2 == 0:
                return 0.0

            similarity = dot_product / (norm1 * norm2)
            return float(similarity)
        except Exception as e:
            logger.error(f"Error calculating similarity: {e}")
            return 0.0

    def enhance_image(self, image_path: str) -> bool:
        """
        Enhance image quality (handle overexposure, sharpen, adjust contrast)
        Returns: success status
        """
        try:
            img = cv2.imread(image_path)
            if img is None:
                return False

            # Convert to LAB color space for better processing
            lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)

            # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization) to L channel
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
            l = clahe.apply(l)

            # Merge channels back
            enhanced_lab = cv2.merge([l, a, b])
            enhanced = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)

            # Apply sharpening
            kernel = np.array([[-1,-1,-1],
                             [-1, 9,-1],
                             [-1,-1,-1]])
            sharpened = cv2.filter2D(enhanced, -1, kernel)

            # Adjust for overexposure - reduce brightness if too bright
            gray = cv2.cvtColor(sharpened, cv2.COLOR_BGR2GRAY)
            mean_brightness = np.mean(gray)

            if mean_brightness > 180:  # Image is overexposed
                # Reduce brightness significantly
                alpha = 1.3  # Increase contrast
                beta = -40   # Reduce brightness
            elif mean_brightness > 150:
                alpha = 1.2
                beta = -20
            elif mean_brightness < 80:  # Image is underexposed
                alpha = 1.3
                beta = 30
            else:  # Normal exposure
                alpha = 1.2
                beta = 10

            adjusted = cv2.convertScaleAbs(sharpened, alpha=alpha, beta=beta)

            # Apply bilateral filter to reduce noise while keeping edges
            final = cv2.bilateralFilter(adjusted, 9, 75, 75)

            # Save enhanced image
            cv2.imwrite(image_path, final)
            logger.info(f"✓ Image enhanced (brightness: {mean_brightness:.1f}): {image_path}")
            return True

        except Exception as e:
            logger.error(f"Error enhancing image: {e}")
            return False

    def save_face_image(self, image_data: str, username: str) -> Tuple[bool, Optional[str], str]:
        """
        Save base64 image data to file with automatic enhancement
        Returns: (success, filepath, message)
        """
        try:
            # Create user directory
            user_dir = os.path.join(Config.UPLOAD_FOLDER, username)
            os.makedirs(user_dir, exist_ok=True)

            # Decode base64 image
            if ',' in image_data:
                image_data = image_data.split(',')[1]

            image_bytes = base64.b64decode(image_data)
            image = Image.open(BytesIO(image_bytes))

            # Save image
            filepath = os.path.join(user_dir, f"face_{username}.jpg")
            image.save(filepath, 'JPEG', quality=95)

            # Enhance image automatically
            self.enhance_image(filepath)

            logger.info(f"✓ Face image saved and enhanced: {filepath}")
            return True, filepath, "Image saved successfully"

        except Exception as e:
            logger.error(f"Error saving image: {e}")
            return False, None, f"Error: {str(e)}"

    def validate_image_quality(self, image_path: str) -> Tuple[bool, str]:
        """
        Validate image quality for face recognition (very lenient for webcam compatibility)
        Returns: (is_valid, message)
        """
        try:
            img = cv2.imread(image_path)
            if img is None:
                return False, "Failed to read image"

            height, width = img.shape[:2]

            # Check minimum resolution (very low threshold)
            if height < 80 or width < 80:
                return False, "Image resolution too low (minimum 80x80)"

            # Skip blur check - enhancement handles this
            # Skip brightness check - enhancement handles this

            logger.info(f"✓ Image quality validated: {width}x{height}")
            return True, "Image quality is good"

        except Exception as e:
            logger.error(f"Error validating image: {e}")
            return False, f"Error: {str(e)}"


# Global face recognition instance
face_recognition = FaceRecognitionSystem()
