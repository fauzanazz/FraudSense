from openai import OpenAI
from typing import Iterator
import logging
from .config import settings

logger = logging.getLogger(__name__)

class FraudDetectionClients:
    """OpenAI clients for fraud detection models"""
    
    def __init__(self):
        self.sailor2_client = OpenAI(
            base_url=f"{settings.SAILOR2_BASE_URL}/v1",
            api_key="dummy-key"  # vLLM doesn't require real API key
        )
        
        self.qwen2_client = OpenAI(
            base_url=f"{settings.QWEN2_BASE_URL}/v1", 
            api_key="dummy-key"  # vLLM doesn't require real API key
        )
        
        logger.info(f"Initialized clients with endpoints:")
        logger.info(f"  Sailor2: {settings.SAILOR2_BASE_URL}")
        logger.info(f"  Qwen2: {settings.QWEN2_BASE_URL}")
    
    def get_text_prediction(self, text: str) -> int:
        """
        Get fraud prediction for text using Sailor2 model with Indonesian prompt template
        Returns: 1 (normal conversation) or 2 (telecom fraud)
        """
        try:
            # Indonesian inference prompt template
            inference_prompt_template = """Berdasarkan percakapan 2 orang melalui telepon berikut, klasifikasikan label yang 1 untuk percakapan biasa dan 2 untuk penipuan telekom:
{}

Klasifikasi yang benar adalah: kelas """
            
            formatted_prompt = inference_prompt_template.format(text)
            
            response = self.sailor2_client.completions.create(
                model=settings.SAILOR2_MODEL_NAME,
                prompt=formatted_prompt,
                max_tokens=10,
                temperature=0.1,
                timeout=settings.REQUEST_TIMEOUT
            )
            
            # Extract prediction from response
            prediction_text = response.choices[0].text.strip()
            
            # Parse the prediction - expect 1 or 2
            try:
                prediction = int(prediction_text.split()[0])  # Take first number found
                if prediction in [1, 2]:
                    return prediction
                else:
                    logger.warning(f"Invalid prediction value: {prediction}, defaulting to 1")
                    return 1  # Default to normal conversation
            except (ValueError, IndexError):
                logger.warning(f"Could not parse prediction: {prediction_text}, defaulting to 1")
                return 1  # Default to normal conversation
                
        except Exception as e:
            logger.error(f"Error getting text prediction: {str(e)}")
            # Return safe default (normal conversation)
            return 1
    
    def get_audio_prediction_stream(self, audio_content: bytes, filename: str) -> Iterator[str]:
        """
        Get streaming fraud prediction for audio using Qwen2 model with conversation format
        Yields: streaming response chunks
        """
        try:
            # For audio processing with Qwen2, we need to use chat completions with conversation format
            import base64
            
            # Encode audio content to base64
            audio_b64 = base64.b64encode(audio_content).decode('utf-8')
            
            # Create conversation with system message and audio input
            conversation = [
                {
                    "role": "system", 
                    "content": "Kamu adalah model yang menentukan apakah percakapan yang dimasukkan dari dua orang dalam telepon tersebut adalah penipuan telekom atau tidak."
                },
                {
                    "role": "user", 
                    "content": [
                        {"type": "audio", "audio": audio_b64},
                        {"type": "text", "text": "Klasifikasi apakah tipe percakapan termasuk ke penipuan telekom"}
                    ]
                }
            ]
            
            # Use chat completions for conversation format with streaming
            response = self.qwen2_client.chat.completions.create(
                model=settings.QWEN2_MODEL_NAME,
                messages=conversation,
                max_tokens=200,
                temperature=0.1,
                stream=True,
                timeout=settings.REQUEST_TIMEOUT
            )
            
            for chunk in response:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            logger.error(f"Error getting audio prediction: {str(e)}")
            yield f"Error processing audio: {str(e)}"
            yield "0"  # Safe default (normal conversation for Qwen2)
    
    async def health_check(self) -> dict:
        """Check health of both model endpoints"""
        health_status = {
            "sailor2": {"status": "unknown", "error": None},
            "qwen2": {"status": "unknown", "error": None}
        }
        
        # Check Sailor2 endpoint
        try:
            self.sailor2_client.completions.create(
                model=settings.SAILOR2_MODEL_NAME,
                prompt="Health check",
                max_tokens=1,
                timeout=5
            )
            health_status["sailor2"]["status"] = "healthy"
        except Exception as e:
            health_status["sailor2"]["status"] = "unhealthy"
            health_status["sailor2"]["error"] = str(e)
        
        # Check Qwen2 endpoint
        try:
            self.qwen2_client.completions.create(
                model=settings.QWEN2_MODEL_NAME,
                prompt="Health check",
                max_tokens=1,
                timeout=5
            )
            health_status["qwen2"]["status"] = "healthy"
        except Exception as e:
            health_status["qwen2"]["status"] = "unhealthy" 
            health_status["qwen2"]["error"] = str(e)
        
        return health_status

# Global client instance
fraud_clients = FraudDetectionClients()