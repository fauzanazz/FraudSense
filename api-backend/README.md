# FraudSense API Backend

FastAPI server for Indonesian telecom fraud detection using ML models hosted on Vast.ai instances.

## Features

- **Text Analysis**: Fraud detection for conversation transcripts using Sailor2 model
- **Audio Analysis**: Real-time streaming fraud detection for audio files using Qwen2 model
- **Supported Formats**: FLAC and OPUS audio files (max 50MB)
- **Production Ready**: CORS support, error handling, health checks, and auto-generated OpenAPI docs

## Architecture

- **FastAPI**: Modern Python web framework with automatic API documentation
- **vLLM**: High-performance inference for language models on Vast.ai
- **OpenAI Client**: Compatible API interface for model communication
- **Streaming**: Real-time audio processing with server-sent events

## Installation

### 1. Install Dependencies
```bash
uv sync
```

### 2. Set Up Vast.ai Instances

#### Find Suitable Instances
```bash
vastai search offers 'compute_cap >= 800 gpu_name=L40S num_gpus=1 static_ip=true direct_port_count > 1 cuda_vers >= 12.4 inet_up>=800 inet_down>=800' -o 'dph+'
```

#### Create Model Instances
```bash
# Sailor2 model for text analysis (port 8000)
vastai create instance <instance-id> --image vllm/vllm-openai:latest --env '-p 8000:8000' --disk 64 --args --model fauzanazz/sailor2-fraud-indo-8b-merged

# Qwen2 model for audio analysis (port 8001) 
vastai create instance <instance-id> --image vllm/vllm-openai:latest --env '-p 8001:8000' --disk 64 --args --model fauzanazz/qwen2-audio-indo-fraud-7b-merged
```

#### Test Model Endpoints
```bash
# Test Sailor2 text model
curl -X POST http://<Instance-IP-Address>:8000/v1/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "fauzanazz/sailor2-fraud-indo-8b-merged", "prompt": "Hello, how are you?", "max_tokens": 50}'

# Test Qwen2 audio model  
curl -X POST http://<Instance-IP-Address>:8001/v1/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "fauzanazz/qwen2-audio-indo-fraud-7b-merged", "prompt": "Hello, how are you?", "max_tokens": 50}'
```

### 3. Configure Environment Variables

```bash
export SAILOR2_BASE_URL=http://<vast-ai-ip>:8000
export QWEN2_BASE_URL=http://<vast-ai-ip>:8001
```

### 4. Run the API Server

```bash
python main.py
```

The server will start on `http://localhost:8000`

## API Endpoints

### 📝 Text Fraud Detection
**POST** `/predict/text`

Analyze conversation transcripts for telecom fraud using Sailor2 model.

**Request:**
```json
{
  "text": "Conversation transcript here..."
}
```

**Response:**
```json
{
  "prediction": 1  // 1=Normal conversation, 2=Telecom fraud
}
```

### 🎵 Audio Fraud Detection  
**POST** `/predict/audio`

Real-time streaming analysis of audio files using Qwen2 model.

**Request:** Multipart form data with audio file (FLAC/OPUS, max 50MB)

**Response:** Streaming text with analysis and final classification
```
data: Analyzing audio...
data: Detected conversation patterns...
data: Final classification: 0
data: [DONE]
```

Classification: `0=Normal conversation, 1=Telecom scam`

### 🏥 Health Check
**GET** `/health`

Check API and model endpoint status.

### 📚 Documentation
- **Interactive Docs**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## Model Details

### Sailor2 Text Model
- **Model**: `fauzanazz/sailor2-fraud-indo-8b-merged`
- **Input**: Indonesian conversation transcripts
- **Output**: `1` (Normal) or `2` (Fraud)
- **Prompt**: Uses Indonesian classification template

### Qwen2 Audio Model
- **Model**: `fauzanazz/qwen2-audio-indo-fraud-7b-merged`  
- **Input**: FLAC/OPUS audio files
- **Output**: `0` (Normal) or `1` (Scam)
- **Features**: Streaming response, conversation format

## Development

### File Structure
```
app/
├── main.py          # FastAPI application
├── models.py        # Pydantic request/response models
├── clients.py       # OpenAI clients for Vast.ai models  
├── config.py        # Environment configuration
└── utils.py         # Audio validation utilities
```

### Testing
```bash
# Test text endpoint
curl -X POST http://localhost:8000/predict/text \
  -H "Content-Type: application/json" \
  -d '{"text": "Selamat siang, ini dari bank. Rekening Anda bermasalah."}'

# Test audio endpoint
curl -X POST http://localhost:8000/predict/audio \
  -F "file=@sample.flac"

# Health check
curl http://localhost:8000/health
```

## Production Deployment

For production deployment, consider:
- Set proper CORS origins in config
- Use environment-specific configuration
- Add authentication if needed  
- Monitor model endpoint health
- Set up logging and metrics

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SAILOR2_BASE_URL` | Sailor2 model endpoint | `http://localhost:8000` |
| `QWEN2_BASE_URL` | Qwen2 model endpoint | `http://localhost:8001` |