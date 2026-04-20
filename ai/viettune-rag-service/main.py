from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import httpx
import os

app = FastAPI()

# Load embedding model 1 lần khi startup (cache trong memory)
embed_model = SentenceTransformer("all-MiniLM-L6-v2")

# Ollama settings (Docker needs host.docker.internal to reach Windows host)
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
LLM_MODEL = os.getenv("LLM_MODEL", "gemma3:4b")

# === Endpoint 1: Embedding ===
class EmbedRequest(BaseModel):
    text: str

class EmbedResponse(BaseModel):
    embedding: list[float]

@app.post("/embed", response_model=EmbedResponse)
async def embed(req: EmbedRequest):
    vector = embed_model.encode(req.text).tolist()
    return EmbedResponse(embedding=vector)

# === Endpoint 2: LLM Generation ===
class ChatMessage(BaseModel):
    role: str       # "user" hoặc "assistant"
    content: str

class GenerateRequest(BaseModel):
    system_prompt: str
    user_prompt: str
    history: list[ChatMessage] | None = None

class GenerateResponse(BaseModel):
    content: str

@app.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest):
    print(f"--- Incoming generate request for model: {LLM_MODEL} ---")
    messages = []
    
    # System prompt
    messages.append({"role": "system", "content": req.system_prompt})
    
    # Conversation history (nếu có)
    if req.history:
        for msg in req.history:
            messages.append({"role": msg.role, "content": msg.content})
    
    # User prompt hiện tại
    messages.append({"role": "user", "content": req.user_prompt})
    
    print(f"Connecting to Ollama at: {OLLAMA_URL}/api/chat ...")
    
    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(
                f"{OLLAMA_URL}/api/chat",
                json={
                    "model": LLM_MODEL,
                    "messages": messages,
                    "stream": False,
                    "options": {
                        "temperature": 0.3,
                        "num_predict": 1024,
                    }
                }
            )
            print(f"Ollama responded with status: {response.status_code}")
            response.raise_for_status()
            data = response.json()
            print("Successfully received content from Ollama.")
            return GenerateResponse(content=data["message"]["content"])
    except httpx.ConnectError:
        print(f"ERROR: Connection failed to {OLLAMA_URL}. Ensure Ollama is running and OLLAMA_HOST=0.0.0.0 is set on the host.")
        return GenerateResponse(content="Error: Could not connect to Ollama.")
    except httpx.TimeoutException:
        print("ERROR: Ollama request timed out after 180 seconds.")
        return GenerateResponse(content="Error: Ollama request timed out.")
    except Exception as e:
        print(f"ERROR in generate: {str(e)}")
        return GenerateResponse(content=f"Error: {str(e)}")

# === Health check ===
@app.get("/health")
async def health():
    # Kiểm tra Ollama có đang chạy không
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{OLLAMA_URL}/api/tags")
            models = [m["name"] for m in r.json().get("models", [])]
            return {"status": "ok", "ollama": True, "models": models}
    except Exception:
        return {"status": "degraded", "ollama": False, "models": []}
