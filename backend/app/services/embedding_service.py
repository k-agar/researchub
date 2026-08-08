import os
import logging
import asyncio
from typing import List
from huggingface_hub import AsyncInferenceClient
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

class EmbeddingService:
    def __init__(self):
        # Retrieve configuration from environment
        self.token = os.getenv("HF_TOKEN")
        self.model = os.getenv("HF_EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
        
        # Clean strip whitespace if present
        if self.token:
            self.token = self.token.strip()
            
        # Initialize the asynchronous Inference Client (safe; does not log token)
        self.client = AsyncInferenceClient(token=self.token)
        
        # Concurrency semaphore to bound API parallel hits to 5
        self.semaphore = asyncio.Semaphore(5)

    async def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embedding vectors for a list of string chunks.
        Returns a list of lists of floats.
        """
        if not self.token:
            logger.error("Hugging Face API token (HF_TOKEN) is not configured.")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Embedding service configuration error: HF_TOKEN is missing."
            )

        async def _get_single_embedding(index: int, text: str) -> List[float]:
            async with self.semaphore:
                try:
                    # Request feature extraction (embeddings)
                    res = await self.client.feature_extraction(text, model=self.model)
                    
                    # Convert response formats (can be NumPy array, nested list, or list)
                    if hasattr(res, "tolist"):
                        embedding = res.tolist()
                    elif isinstance(res, list):
                        # API feature extraction can sometimes wrap results in an extra dimension: [[f, f, ...]]
                        if len(res) > 0 and isinstance(res[0], list):
                            embedding = res[0]
                        else:
                            embedding = res
                    else:
                        embedding = list(res)
                        
                    # Cast all components explicitly to float
                    return [float(val) for val in embedding]
                    
                except Exception as e:
                    # Log error details but ensure token value is NEVER printed
                    err_msg = str(e)
                    # Redact token from error message if accidentally included
                    if self.token and self.token in err_msg:
                        err_msg = err_msg.replace(self.token, "[REDACTED_HF_TOKEN]")
                        
                    logger.error(f"Error generating embedding for chunk {index}: {err_msg}")
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Hugging Face Inference API failed for chunk {index}: {err_msg}"
                    )

        # Launch all tasks concurrently, respecting the semaphore limit
        tasks = [_get_single_embedding(i, text) for i, text in enumerate(texts)]
        embeddings = await asyncio.gather(*tasks)
        return embeddings
