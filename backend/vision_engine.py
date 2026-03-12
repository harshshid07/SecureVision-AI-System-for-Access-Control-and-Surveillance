"""
Vision Engine for SecureVision
Handles all face recognition, anti-spoofing, and validation logic using DeepFace
Integrated with image enhancement from old project for better webcam accuracy
"""
from deepface import DeepFace  # type: ignore
from typing import Dict, Any, List, Tuple, Optional
import numpy as np  # type: ignore
import base64
import cv2  # type: ignore
from io import BytesIO
from PIL import Image  # type: ignore
from config import settings  # type: ignore
import warnings
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Check if PyTorch is available for anti-spoofing
ANTI_SPOOFING_AVAILABLE = False
try:
    import torch  # type: ignore
    ANTI_SPOOFING_AVAILABLE = True
except ImportError:
    warnings.warn(
        "PyTorch not installed. Anti-spoofing will be disabled. "
        "Install with: pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu"
    )


class VisionEngine:
    """
    Core facial recognition engine with multi-layer security:
    1. Image enhancement (CLAHE, sharpening, brightness adjustment)
    2. Single face enforcement
    3. Quality validation
    4. Passive anti-spoofing (optional, requires PyTorch)
    5. Face matching with cosine similarity
    """
    
    def __init__(self):
        self.model_name = settings.DEEPFACE_MODEL  # "Facenet"
        self.detector_backend = settings.DEEPFACE_DETECTOR  # "retinaface"
        self.threshold = settings.FACE_MATCH_THRESHOLD  # 0.4 (stricter)
        self.min_face_size = getattr(settings, 'MIN_FACE_SIZE', 80)  # 80px min
        
        logger.info(f"✓ Face Recognition initialized: Model={self.model_name}, Detector={self.detector_backend}")
        logger.info(f"✓ Threshold={self.threshold}, Min Face Size={self.min_face_size}")
        
        # Log anti-spoofing status
        if ANTI_SPOOFING_AVAILABLE:
            print("✅ Anti-spoofing enabled (PyTorch available)")
        else:
            print("⚠️  Anti-spoofing disabled (PyTorch not available)")
            print("   Install PyTorch to enable: pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu")
    
    def enhance_image(self, img: np.ndarray) -> np.ndarray:
        """
        Enhance image quality for better face recognition
        Includes: CLAHE, sharpening, brightness adjustment, bilateral filtering
        From old project: face_recognition.py
        """
        try:
            if img is None:
                return img
            
            # Convert to LAB color space for better processing
            lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            
            # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization) to L channel
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
            l = clahe.apply(l)
            
            # Merge channels back
            enhanced_lab = cv2.merge([l, a, b])
            enhanced = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)
            
            # Apply sharpening kernel
            kernel = np.array([[-1, -1, -1],
                              [-1,  9, -1],
                              [-1, -1, -1]])
            sharpened = cv2.filter2D(enhanced, -1, kernel)
            
            # Adjust for overexposure - reduce brightness if too bright
            gray = cv2.cvtColor(sharpened, cv2.COLOR_BGR2GRAY)
            mean_brightness = np.mean(gray)
            
            if mean_brightness > 180:  # Image is overexposed
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
            
            logger.info(f"✓ Image enhanced (brightness: {mean_brightness:.1f})")
            return final
            
        except Exception as e:
            logger.error(f"Error enhancing image: {e}")
            return img  # Return original if enhancement fails
    
    def validate_image_quality(self, img: np.ndarray) -> Tuple[bool, str]:
        """
        Validate image quality for face recognition (lenient for webcam compatibility)
        Returns: (is_valid, message)
        """
        try:
            if img is None:
                return False, "Failed to read image"
            
            height, width = img.shape[:2]
            
            # Check minimum resolution (very low threshold for webcam)
            if height < 80 or width < 80:
                return False, "Image resolution too low (minimum 80x80)"
            
            logger.info(f"✓ Image quality validated: {width}x{height}")
            return True, "Image quality is good"
            
        except Exception as e:
            logger.error(f"Error validating image: {e}")
            return False, f"Error: {str(e)}"
    
    def _base64_to_image(self, base64_string: str) -> np.ndarray:
        """Convert base64 string to numpy array with enhancement"""
        try:
            # Remove data URL prefix if present
            if "," in base64_string and "data:image" in base64_string:
                base64_string = base64_string.split(",", 1)[1]
            
            # Decode base64 to bytes
            image_bytes = base64.b64decode(base64_string)
            
            # Try PIL first
            try:
                image = Image.open(BytesIO(image_bytes))
                
                # Convert RGBA to RGB if needed
                if image.mode == 'RGBA':
                    rgb_image = Image.new('RGB', image.size, (255, 255, 255))
                    rgb_image.paste(image, mask=image.split()[3])
                    image = rgb_image
                elif image.mode != 'RGB':
                    image = image.convert('RGB')
                
                # Convert PIL Image to numpy array
                image_np = np.array(image)
                
                # Convert RGB to BGR for OpenCV
                img = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)
                
            except Exception as pil_error:
                # Fallback: Try OpenCV imdecode directly
                nparr = np.frombuffer(image_bytes, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                if img is None:
                    raise ValueError("Failed to decode image")
            
            # Apply image enhancement (from old project)
            enhanced_img = self.enhance_image(img)
            
            return enhanced_img
                
        except Exception as e:
            logger.error(f"❌ Base64 decode FAILED: {str(e)}")
            raise ValueError(f"Failed to decode base64 image: {str(e)}")
    
    def extract_single_face_embedding(self, image_base64: str) -> Dict[str, Any]:
        """
        Extract face embedding with strict validation:
        - Image quality check
        - Image enhancement
        - Only 1 face allowed
        - Face size check
        - Anti-spoofing check (if PyTorch available)
        """
        try:
            # Convert base64 to enhanced image
            img = self._base64_to_image(image_base64)
            
            # Validate image quality
            is_valid, quality_msg = self.validate_image_quality(img)
            if not is_valid:
                return {
                    "success": False,
                    "embedding": None,
                    "error": quality_msg,
                    "face_count": 0,
                    "is_real": None
                }
            
            # Extract faces with optional anti-spoofing
            use_anti_spoofing = ANTI_SPOOFING_AVAILABLE
            
            try:
                faces = DeepFace.extract_faces(
                    img_path=img,
                    detector_backend=self.detector_backend,
                    enforce_detection=True,
                    align=True,
                    anti_spoofing=use_anti_spoofing
                )
            except ValueError as e:
                if "Face could not be detected" in str(e):
                    return {
                        "success": False,
                        "embedding": None,
                        "error": "No face detected in the image",
                        "face_count": 0,
                        "is_real": None
                    }
                raise
            
            # Single face enforcement
            if len(faces) == 0:
                return {
                    "success": False,
                    "embedding": None,
                    "error": "No face detected. Please position your face in the camera.",
                    "face_count": 0,
                    "is_real": None
                }
            
            if len(faces) > 1:
                return {
                    "success": False,
                    "embedding": None,
                    "error": "Multiple faces detected. Only one person allowed.",
                    "face_count": len(faces),
                    "is_real": None
                }
            
            # Check face size
            face_data = faces[0]
            face_array = face_data.get('face')
            if face_array is not None:
                height, width = face_array.shape[:2]
                if height < self.min_face_size or width < self.min_face_size:
                    return {
                        "success": False,
                        "embedding": None,
                        "error": f"Face too small. Minimum size: {self.min_face_size}x{self.min_face_size}",
                        "face_count": 1,
                        "is_real": None
                    }
            
            # Anti-spoofing check (only if available)
            is_real = face_data.get("is_real", True)
            
            if use_anti_spoofing and not is_real:
                return {
                    "success": False,
                    "embedding": None,
                    "error": "Anti-spoofing failed. Live presence required.",
                    "face_count": 1,
                    "is_real": False
                }
            
            # Generate embedding
            embedding_result = DeepFace.represent(
                img_path=img,
                model_name=self.model_name,
                detector_backend=self.detector_backend,
                enforce_detection=True,
                align=True
            )
            
            if not embedding_result:
                return {
                    "success": False,
                    "embedding": None,
                    "error": "Failed to generate face encoding",
                    "face_count": 1,
                    "is_real": is_real if use_anti_spoofing else None
                }
            
            # Extract the embedding vector (128-d for FaceNet)
            embedding = embedding_result[0]["embedding"]
            
            logger.info(f"✓ Face encoding generated: {len(embedding)} dimensions")
            
            return {
                "success": True,
                "embedding": embedding,
                "error": None,
                "face_count": 1,
                "is_real": is_real if use_anti_spoofing else None
            }
            
        except ValueError as e:
            return {
                "success": False,
                "embedding": None,
                "error": f"Face detection failed: {str(e)}",
                "face_count": 0,
                "is_real": None
            }
        except Exception as e:
            return {
                "success": False,
                "embedding": None,
                "error": f"Vision engine error: {str(e)}",
                "face_count": 0,
                "is_real": None
            }
    
    def verify_access(
        self,
        live_image_base64: str,
        stored_embedding: List[float]
    ) -> Dict[str, Any]:
        """
        Complete verification pipeline:
        1. Extract face from live image (with enhancement)
        2. Check single face
        3. Check anti-spoofing
        4. Compare with stored embedding using cosine similarity
        
        Uses distance threshold (1 - similarity) like old project
        """
        # Extract live face embedding with all validations
        extraction_result = self.extract_single_face_embedding(live_image_base64)
        
        if not extraction_result["success"]:
            return {
                "verified": False,
                "similarity_score": 0.0,
                "is_real": extraction_result["is_real"],
                "face_count": extraction_result["face_count"],
                "error": extraction_result["error"]
            }
        
        live_embedding = extraction_result["embedding"]
        
        # Calculate cosine similarity
        similarity = self._cosine_similarity(live_embedding, stored_embedding)
        
        # Convert similarity to distance (0 = same, 1 = different)
        # This matches the old project's logic
        distance = 1 - similarity
        
        # Verify based on threshold (distance should be <= threshold for match)
        # threshold of 0.4 means similarity must be >= 0.6
        verified = distance <= self.threshold
        
        logger.info(f"Face verification: Distance={distance:.4f}, Threshold={self.threshold}, Match={verified}")
        
        if not verified:
            return {
                "verified": False,
                "similarity_score": similarity,
                "is_real": True,
                "face_count": 1,
                "error": f"Face verification failed (similarity: {similarity:.2%})"
            }
        
        return {
            "verified": True,
            "similarity_score": similarity,
            "is_real": True,
            "face_count": 1,
            "error": None
        }
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two encodings"""
        try:
            vec1 = np.array(vec1)
            vec2 = np.array(vec2)
            
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


# Singleton instance
vision_engine = VisionEngine()
