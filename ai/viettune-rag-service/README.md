# VietTune RAG Service

Python microservice using FastAPI for Embedding extraction and LLM text generation via Ollama. It complements the C# API for Local RAG chatbot implementations.

## Setup

1. Install [Ollama](https://ollama.com)
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

2. Pull the LLM model
```bash
ollama pull gemma3:4b
```

4. Run with Docker
```bash
# Build the image
docker build -t viettune-rag-service .

# Run the container (using host.docker.internal to connect to Ollama on Windows host)
docker run --name rag-service -p 8001:8001 -e OLLAMA_URL="http://host.docker.internal:11434" viettune-rag-service
```


> [!NOTE]
> If you are on Windows/macOS, use `host.docker.internal`. On Linux, you might need to use `--network="host"` or your actual host IP.

> [!TIP]
> If you get `ConnectError` in Docker after using `host.docker.internal`, you might need to configure Ollama on your Windows host to listen on all interfaces. Set the environment variable `OLLAMA_HOST=0.0.0.0` in Windows system settings and restart Ollama.
