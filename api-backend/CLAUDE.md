# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FraudSense API Backend is a Python-based backend service for fraud detection, integrating with ML models hosted on Vast.ai instances via vLLM.

## Architecture

- **Main Entry Point**: `main.py` - Simple Python script with basic structure
- **Package Management**: Uses `uv` as the Python package manager
- **Dependencies**: OpenAI client library and vLLM for ML model inference
- **Model Infrastructure**: External ML models hosted on Vast.ai instances:
  - `fauzanazz/sailor2-fraud-indo-8b-merged` (port 8000)  
  - `fauzanazz/qwen2-audio-indo-fraud-7b-merged` (port 8001)

## Development Commands

### Environment Setup
```bash
uv sync  # Install dependencies
```
ﬁﬁ
### Running the Application
```bash
python main.py  # Run the main application
```

## Vast.ai Model Management

### Finding Suitable Instances
```bash
vastai search offers 'compute_cap >= 800 gpu_name=L40S num_gpus=1 static_ip=true direct_port_count > 1 cuda_vers >= 12.4 inet_up>=800 inet_down>=800' -o 'dph+'
```

### Creating Model Instances
```bash
# For sailor2-fraud-indo model
vastai create instance <instance-id> --image vllm/vllm-openai:latest --env '-p 8000:8000' --disk 64 --args --model fauzanazz/sailor2-fraud-indo-8b-merged

# For qwen2-audio-indo-fraud model  
vastai create instance <instance-id> --image vllm/vllm-openai:latest --env '-p 8001:8000' --disk 64 --args --model fauzanazz/qwen2-audio-indo-fraud-7b-merged
```

### Testing Model Endpoints
```bash
# Test sailor2-fraud-indo model
curl -X POST http://<Instance-IP-Address>:8000/v1/completions -H "Content-Type: application/json" -d '{"model" : "fauzanazz/sailor2-fraud-indo-8b-merged", "prompt": "Hello, how are you?", "max_tokens": 50}'

# Test qwen2-audio-indo-fraud model
curl -X POST http://<Instance-IP-Address>:8001/v1/completions -H "Content-Type: application/json" -d '{"model" : "fauzanazz/qwen2-audio-indo-fraud-7b-merged", "prompt": "Hello, how are you?", "max_tokens": 50}'
```

## Key Dependencies

- `openai>=1.90.0` - OpenAI client for API interactions
- `vllm>=0.10.0` - vLLM for high-performance model inference
- Requires Python >=3.11