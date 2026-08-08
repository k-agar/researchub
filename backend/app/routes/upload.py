from fastapi import APIRouter, File, UploadFile, HTTPException, status
from app.models.upload import UploadResponse
from app.services.pdf_service import validate_pdf_file, extract_and_chunk_pdf
from app.services.embedding_service import EmbeddingService
from app.services.vector_store import VectorStoreService

router = APIRouter(tags=["Document Ingestion"])

# Initialize services
embedding_service = EmbeddingService()
vector_store = VectorStoreService()

@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_200_OK)
async def upload_pdf(file: UploadFile = File(...)):
    """
    Ingest a PDF research paper, validate its format, extract page-by-page text,
    segment it into chunks, generate embeddings, and index them in ChromaDB.
    """
    if not file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file uploaded."
        )

    try:
        content = await file.read()
        
        # 1. Validate File
        validate_pdf_file(content, file.filename)
        
        # 2. Extract and Chunk PDF
        number_of_pages, chunks = extract_and_chunk_pdf(content, file.filename)
        
        # 3. Generate Embeddings (calls Hugging Face Inference API asynchronously)
        chunk_texts = [chunk.text for chunk in chunks]
        embeddings = await embedding_service.generate_embeddings(chunk_texts)
        
        # 4. Generate unique document ID
        import uuid
        document_id = uuid.uuid4().hex
        
        # 5. Store in ChromaDB vector database
        chunk_dicts = [
            {
                "text": chunk.text,
                "page_number": chunk.page_number,
                "chunk_index": chunk.chunk_index
            }
            for chunk in chunks
        ]
        vector_store.add_chunks(file.filename, document_id, chunk_dicts, embeddings)
        
        return UploadResponse(
            document_id=document_id,
            filename=file.filename,
            number_of_pages=number_of_pages,
            number_of_chunks=len(chunks),
            chunks=chunks,
            indexed=True,
            message=f"Document '{file.filename}' (ID: {document_id}) successfully ingested, chunked, and indexed in ChromaDB."
        )

    except HTTPException as he:
        # Re-raise HTTP exceptions to preserve correct status codes/details
        raise he
    except Exception as e:
        # Catch unexpected errors during reading/processing
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while processing the upload: {str(e)}"
        )
    finally:
        # Ensure file handle is closed
        await file.close()
