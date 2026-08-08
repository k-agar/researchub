from pydantic import BaseModel, Field
from typing import List

class SearchRequest(BaseModel):
    query: str = Field(..., description="The search query text")
    document_id: str = Field(..., description="The unique ID of the document to restrict the search to")

class SearchResultItem(BaseModel):
    text: str = Field(..., description="The chunk text content")
    filename: str = Field(..., description="The source filename this chunk belongs to")
    page_number: int = Field(..., description="The page number where the chunk resides")
    chunk_index: int = Field(..., description="The index position of the chunk in the document")
    score: float = Field(..., description="The relevance distance score from ChromaDB")

class SearchResponse(BaseModel):
    query: str = Field(..., description="The original search query text")
    results: List[SearchResultItem] = Field(..., description="The top retrieved document chunks")
