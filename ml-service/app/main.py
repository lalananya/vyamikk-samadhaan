"""
Vyaamik Samadhaan ML Service

A FastAPI microservice for text embeddings and similarity scoring.

Usage examples:
  # Health check
  curl http://127.0.0.1:8000/health

  # Generate embeddings
  curl -X POST http://127.0.0.1:8000/embed \
    -H "Content-Type: application/json" \
    -d '{"texts": ["injection moulding operator", "lathe fitter"]}'

  # Score similarity pairs
  curl -X POST http://127.0.0.1:8000/score \
    -H "Content-Type: application/json" \
    -d '{"pairs": [{"user_vec": [0.1, 0.2], "item_vec": [0.3, 0.4]}]}'
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import time
import os
import numpy as np

from utils import get_model, cosine_similarity, dot_product, time_ms

# Global ranker model cache
_ranker_model = None
_ranker_session = None

def get_ranker():
    """Lazy-load the ONNX ranker model"""
    global _ranker_model, _ranker_session
    
    if _ranker_model is None:
        try:
            import onnxruntime as ort
            model_path = './models/ranker.onnx'
            
            if os.path.exists(model_path):
                print(f"Loading ONNX ranker from: {model_path}")
                _ranker_session = ort.InferenceSession(model_path)
                _ranker_model = "onnx"
                print("✅ ONNX ranker loaded successfully")
            else:
                print(f"ONNX model not found at {model_path}, using fallback")
                _ranker_model = "fallback"
        except Exception as e:
            print(f"Failed to load ONNX ranker: {e}, using fallback")
            _ranker_model = "fallback"
    
    return _ranker_model, _ranker_session

app = FastAPI(
    title="Vyaamik Samadhaan ML Service",
    description="Text embeddings and similarity scoring for job matching",
    version="1.0.0"
)

# Request/Response models
class EmbedRequest(BaseModel):
    texts: List[str] = Field(..., min_items=1, max_items=512, description="List of texts to embed")
    normalize: bool = Field(True, description="Whether to normalize the embeddings")

class EmbedResponse(BaseModel):
    vectors: List[List[float]] = Field(..., description="Embedding vectors")
    dims: int = Field(..., description="Dimension of each vector")
    model: str = Field(..., description="Model name used")
    took_ms: int = Field(..., description="Processing time in milliseconds")

class VectorPair(BaseModel):
    user_vec: List[float] = Field(..., description="User embedding vector")
    item_vec: List[float] = Field(..., description="Item embedding vector")

class ScoreRequest(BaseModel):
    pairs: List[VectorPair] = Field(..., min_items=1, max_items=512, description="Pairs of vectors to score")
    method: Literal["cosine", "dot"] = Field("cosine", description="Similarity method")

class ScoreResponse(BaseModel):
    scores: List[float] = Field(..., description="Similarity scores")
    took_ms: int = Field(..., description="Processing time in milliseconds")

class RankRequest(BaseModel):
    features: List[List[float]] = Field(..., min_items=1, max_items=512, description="Feature vectors for ranking")

class RankResponse(BaseModel):
    scores: List[float] = Field(..., description="Ranking scores")
    model: str = Field(..., description="Model used for ranking")
    took_ms: int = Field(..., description="Processing time in milliseconds")

class HealthResponse(BaseModel):
    ok: bool
    model: str
    ready: bool

class RankerHealthResponse(BaseModel):
    ok: bool
    model: str
    dimsExpected: int

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint
    """
    try:
        model = get_model()
        return HealthResponse(
            ok=True,
            model=model.model_name if hasattr(model, 'model_name') else 'paraphrase-multilingual-MiniLM-L12-v2',
            ready=True
        )
    except Exception as e:
        return HealthResponse(
            ok=False,
            model="error",
            ready=False
        )

@app.post("/embed", response_model=EmbedResponse)
async def embed_texts(request: EmbedRequest):
    """
    Generate embeddings for a list of texts
    """
    start_time = time_ms()
    
    try:
        model = get_model()
        
        # Generate embeddings
        embeddings = model.encode(
            request.texts,
            normalize_embeddings=request.normalize,
            convert_to_numpy=True
        )
        
        # Convert to list of lists
        vectors = embeddings.tolist()
        dims = len(vectors[0]) if vectors else 0
        
        took_ms = time_ms() - start_time
        
        return EmbedResponse(
            vectors=vectors,
            dims=dims,
            model=model.model_name if hasattr(model, 'model_name') else 'paraphrase-multilingual-MiniLM-L12-v2',
            took_ms=took_ms
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding generation failed: {str(e)}")

@app.post("/score", response_model=ScoreResponse)
async def score_pairs(request: ScoreRequest):
    """
    Compute similarity scores for pairs of vectors
    """
    start_time = time_ms()
    
    try:
        scores = []
        
        for pair in request.pairs:
            if len(pair.user_vec) != len(pair.item_vec):
                raise HTTPException(
                    status_code=400, 
                    detail="Vector dimensions must match"
                )
            
            if request.method == "cosine":
                score = cosine_similarity(pair.user_vec, pair.item_vec)
            elif request.method == "dot":
                score = dot_product(pair.user_vec, pair.item_vec)
            else:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid method. Use 'cosine' or 'dot'"
                )
            
            scores.append(score)
        
        took_ms = time_ms() - start_time
        
        return ScoreResponse(
            scores=scores,
            took_ms=took_ms
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scoring failed: {str(e)}")

@app.post("/rank", response_model=RankResponse)
async def rank_candidates(request: RankRequest):
    """
    Re-rank candidates using ML model or fallback
    """
    start_time = time_ms()
    
    try:
        model_type, session = get_ranker()
        
        if model_type == "onnx" and session is not None:
            # Use ONNX model
            features_array = np.array(request.features, dtype=np.float32)
            
            # Get input name (usually 'input' or first input)
            input_name = session.get_inputs()[0].name
            
            # Run inference
            scores = session.run(None, {input_name: features_array})[0]
            scores = scores.flatten().tolist()
            
        else:
            # Fallback: simple linear combination
            # Default weights: [similarity, recency, trust, geo]
            weights = [1.0, 0.2, 0.2, 0.2]  # Documented fallback weights
            
            scores = []
            for features in request.features:
                if len(features) != 4:
                    raise HTTPException(
                        status_code=400,
                        detail="Expected 4 features per candidate"
                    )
                
                # Linear combination
                score = sum(w * f for w, f in zip(weights, features))
                scores.append(score)
        
        took_ms = time_ms() - start_time
        
        return RankResponse(
            scores=scores,
            model=model_type,
            took_ms=took_ms
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ranking failed: {str(e)}")

@app.get("/ranker/health", response_model=RankerHealthResponse)
async def ranker_health():
    """
    Ranker health check endpoint
    """
    try:
        model_type, _ = get_ranker()
        return RankerHealthResponse(
            ok=True,
            model=model_type,
            dimsExpected=4
        )
    except Exception as e:
        return RankerHealthResponse(
            ok=False,
            model="error",
            dimsExpected=4
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
