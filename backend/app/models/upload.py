from pydantic import BaseModel, Field
from typing import List

class DocumentChunk(BaseModel):
    text: str = Field(..., description="The textual content of the chunk")
    page_number: int = Field(..., description="The page number in the PDF (1-indexed) where this text was extracted")
    chunk_index: int = Field(..., description="The chronological index of the chunk in the document")

class UploadResponse(BaseModel):
    document_id: str = Field(..., description="Unique ID generated for this document")
    filename: str = Field(..., description="Name of the uploaded PDF file")
    number_of_pages: int = Field(..., description="Total number of pages in the PDF")
    number_of_chunks: int = Field(..., description="Total number of chunks generated")
    chunks: List[DocumentChunk] = Field(..., description="The list of extracted chunks with metadata")
    indexed: bool = Field(..., description="Indicates if the document chunks were successfully indexed in the vector database")
    message: str = Field(..., description="Confirmation indexing message")
