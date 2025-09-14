"""
Utility functions for ML service
"""
import time
import numpy as np
from typing import List, Optional
from sentence_transformers import SentenceTransformer

# Global model cache
_model: Optional[SentenceTransformer] = None

def get_model() -> SentenceTransformer:
    """
    Lazy-load the sentence transformer model
    Returns the cached model or loads it on first call
    """
    global _model
    if _model is None:
        print("Loading sentence transformer model...")
        start_time = time.time()
        _model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
        load_time = (time.time() - start_time) * 1000
        print(f"Model loaded in {load_time:.2f}ms")
    return _model

def cosine_similarity(a: List[float], b: List[float]) -> float:
    """
    Compute cosine similarity between two vectors
    """
    a_np = np.array(a)
    b_np = np.array(b)
    
    # Normalize vectors
    a_norm = a_np / np.linalg.norm(a_np)
    b_norm = b_np / np.linalg.norm(b_np)
    
    return float(np.dot(a_norm, b_norm))

def dot_product(a: List[float], b: List[float]) -> float:
    """
    Compute dot product between two vectors
    """
    a_np = np.array(a)
    b_np = np.array(b)
    return float(np.dot(a_np, b_np))

def time_ms() -> int:
    """
    Get current time in milliseconds
    """
    return int(time.time() * 1000)
