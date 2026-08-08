from fastapi import APIRouter, HTTPException, status
from app.models.search import SearchRequest, SearchResponse, SearchResultItem
from app.services.embedding_service import EmbeddingService
from app.services.vector_store import VectorStoreService
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Semantic Search"])

# Initialize services
embedding_service = EmbeddingService()
vector_store = VectorStoreService()

@router.post("/search", response_model=SearchResponse, status_code=status.HTTP_200_OK)
async def search_documents(request: SearchRequest):
    """
    Search across indexed documents by embedding the query and querying ChromaDB, scoped by document_id.
    """
    query_text = request.query.strip() if request.query else ""
    if not query_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query cannot be empty or contain only whitespace."
        )

    document_id = request.document_id.strip() if request.document_id else ""
    if not document_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="document_id is required and cannot be empty."
        )

    # Validate document existence
    if not vector_store.verify_document_exists(document_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid document_id: '{document_id}' does not match any indexed documents."
        )

    try:
        # 1. Embed query (reuses configured BAAI/bge-small-en-v1.5 model)
        embeddings = await embedding_service.generate_embeddings([query_text])
        if not embeddings or len(embeddings) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate embedding for the search query."
            )
        
        query_embedding = embeddings[0]

        # 2. Query ChromaDB for top 5 most similar chunks
        search_results = vector_store.search_similar_chunks(query_embedding, document_id, n_results=5)

        # 3. Format results into response models
        results = [
            SearchResultItem(
                text=res["text"],
                filename=res["filename"],
                page_number=res["page_number"],
                chunk_index=res["chunk_index"],
                score=res["score"]
            )
            for res in search_results
        ]

        return SearchResponse(
            query=query_text,
            results=results
        )

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error executing search query: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during search: {str(e)}"
        )
