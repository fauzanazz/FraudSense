import os
import magic
from typing import Tuple, Optional
from fastapi import HTTPException, UploadFile
from .config import settings
import logging

logger = logging.getLogger(__name__)

def validate_audio_file(file: UploadFile) -> Tuple[bool, Optional[str]]:
    """
    Validate uploaded audio file for format and size
    Returns: (is_valid, error_message)
    """
    try:
        # Check file extension
        if not file.filename:
            return False, "Filename is required"
        
        file_ext = os.path.splitext(file.filename.lower())[1]
        if file_ext not in settings.ALLOWED_AUDIO_EXTENSIONS:
            return False, f"Unsupported file format. Allowed formats: {', '.join(settings.ALLOWED_AUDIO_EXTENSIONS)}"
        
        # Read file content to check size and MIME type
        file_content = file.file.read()
        file_size = len(file_content)
        
        # Reset file pointer
        file.file.seek(0)
        
        # Check file size
        if file_size > settings.MAX_AUDIO_FILE_SIZE:
            size_mb = file_size / (1024 * 1024)
            max_size_mb = settings.MAX_AUDIO_FILE_SIZE / (1024 * 1024)
            return False, f"File too large ({size_mb:.1f}MB). Maximum size: {max_size_mb}MB"
        
        # Check MIME type using python-magic
        try:
            file_mime = magic.from_buffer(file_content, mime=True)
            
            # Map extensions to expected MIME types
            mime_mapping = {
                '.flac': 'audio/flac',
                '.opus': 'audio/ogg',  # OPUS is usually in OGG container
                '.ogg': 'audio/ogg'
            }
            
            expected_mime = mime_mapping.get(file_ext)
            if expected_mime and not file_mime.startswith('audio/'):
                return False, f"Invalid file format. Expected audio file, got: {file_mime}"
            
            logger.info(f"Audio file validated: {file.filename} ({file_mime}, {file_size} bytes)")
            return True, None
            
        except Exception as mime_error:
            # If MIME detection fails, rely on file extension
            logger.warning(f"MIME type detection failed: {mime_error}, relying on file extension")
            return True, None
    
    except Exception as e:
        logger.error(f"Error validating audio file: {str(e)}")
        return False, f"File validation error: {str(e)}"

async def read_audio_file_content(file: UploadFile) -> bytes:
    """
    Read audio file content safely
    Returns: file content as bytes
    """
    try:
        content = await file.read()
        await file.seek(0)  # Reset file pointer for potential re-reading
        return content
    except Exception as e:
        logger.error(f"Error reading audio file: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error reading audio file: {str(e)}")

def get_file_info(file: UploadFile) -> dict:
    """
    Get basic file information
    Returns: dictionary with file metadata
    """
    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "size": file.size if hasattr(file, 'size') else None
    }

class AudioFileProcessor:
    """Audio file processing utilities"""
    
    @staticmethod
    def validate_and_prepare(file: UploadFile) -> Tuple[bool, Optional[str], Optional[bytes]]:
        """
        Validate audio file and prepare for processing
        Returns: (is_valid, error_message, file_content)
        """
        is_valid, error_msg = validate_audio_file(file)
        if not is_valid:
            return False, error_msg, None
        
        try:
            # Read file content
            file_content = file.file.read()
            file.file.seek(0)  # Reset pointer
            
            return True, None, file_content
        
        except Exception as e:
            return False, f"Error reading file: {str(e)}", None
    
    @staticmethod
    def get_audio_format_info(filename: str) -> dict:
        """Get information about audio format based on filename"""
        file_ext = os.path.splitext(filename.lower())[1]
        
        format_info = {
            '.flac': {
                'format': 'FLAC',
                'description': 'Free Lossless Audio Codec',
                'streaming_support': True
            },
            '.opus': {
                'format': 'OPUS',
                'description': 'Opus Interactive Audio Codec',
                'streaming_support': True
            },
            '.ogg': {
                'format': 'OGG/OPUS',
                'description': 'OGG container with OPUS codec',
                'streaming_support': True
            }
        }
        
        return format_info.get(file_ext, {
            'format': 'Unknown',
            'description': 'Unknown audio format',
            'streaming_support': False
        })