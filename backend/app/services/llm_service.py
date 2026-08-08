import os
import logging
from huggingface_hub import AsyncInferenceClient
from fastapi import HTTPException, status
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self):
        # Retrieve HF configs from environment
        self.token = os.getenv("HF_TOKEN")
        self.model = os.getenv("HF_LLM_MODEL", "Qwen/Qwen2.5-7B-Instruct")
        
        if self.token:
            self.token = self.token.strip()
            
        # Initialize the asynchronous Inference Client
        self.client = AsyncInferenceClient(token=self.token)

    async def generate_answer(self, query: str, context_chunks: List[Dict[str, Any]]) -> str:
        """
        Generate a grounded answer using Qwen/Qwen2.5-7B-Instruct chat completions.
        """
        if not self.token:
            logger.error("Hugging Face API token (HF_TOKEN) is not configured.")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="LLM service configuration error: HF_TOKEN is missing."
            )

        # 1. Format the retrieved context chunks with metadata
        formatted_context = ""
        for idx, chunk in enumerate(context_chunks):
            formatted_context += f"--- Context Chunk {idx + 1} (Source: {chunk['filename']}, Page: {chunk['page_number']}) ---\n"
            formatted_context += f"{chunk['text']}\n\n"

        # 2. Strict system guidelines for fact-grounded responses
        system_prompt = (
            "You are a helpful and precise research-paper assistant.\n"
            "Your task is to answer the user's question ONLY using the supplied context snippets below.\n"
            "Strict Guidelines:\n"
            "1. Answer ONLY based on the facts directly mentioned in the context.\n"
            "2. Do NOT invent facts, extrapolate, or assume anything not explicitly stated in the context.\n"
            "3. If the context does not contain enough information to answer the question, state clearly and explicitly: "
            "'The paper context does not provide enough information to answer this question.'\n"
            "4. Do not pretend to know information that is not in the retrieved chunks.\n"
            "5. Provide concise but useful answers.\n"
            "6. Cite the relevant source and page number in your response when making a claim, using the format: "
            "[Source: <filename>, Page <page_number>].\n"
        )

        # 3. User prompt
        user_message = (
            f"Retrieved context snippets:\n\n{formatted_context}\n"
            f"User's Question: {query}\n"
            f"Concise, grounded answer with page citations:"
        )

        try:
            # Together AI provider routes Qwen, only supporting conversational completions
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                max_tokens=800,
                temperature=0.0  # Set temperature to 0.0 for deterministic factual reasoning
            )
            
            return response.choices[0].message.content

        except Exception as e:
            # Safely log errors by redacting the token if printed
            err_msg = str(e)
            if self.token and self.token in err_msg:
                err_msg = err_msg.replace(self.token, "[REDACTED_HF_TOKEN]")
                
            logger.error(f"Error generating answer from Qwen: {err_msg}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Hugging Face Inference API LLM failure: {err_msg}"
            )
