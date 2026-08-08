from fastapi import APIRouter, HTTPException, status
from app.models.chat import ChatRequest, ChatResponse, ChatSource
from app.services.embedding_service import EmbeddingService
from app.services.vector_store import VectorStoreService
from app.services.llm_service import LLMService
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["RAG Chat"])

# Initialize services
embedding_service = EmbeddingService()
vector_store = VectorStoreService()
llm_service = LLMService()

@router.post("/chat", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def chat_with_docs(request: ChatRequest):
    """
    RAG Chat endpoint that embeds the user question, retrieves the top 5 chunks from ChromaDB,
    scoped by document_id, prompts Qwen to generate a grounded answer, and returns it with sources.
    """
    query_text = request.query.strip() if request.query else ""
    if not query_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chat query cannot be empty or contain only whitespace."
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
        # 1. Embed user query using same configuration model
        embeddings = await embedding_service.generate_embeddings([query_text])
        if not embeddings or len(embeddings) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate embedding for the chat query."
            )
        query_embedding = embeddings[0]

        # 2. Search ChromaDB collection for top 5 closest chunks
        search_results = vector_store.search_similar_chunks(query_embedding, document_id, n_results=5)

        # 3. Handle case when database is empty / no documents ingested
        if not search_results:
            return ChatResponse(
                answer="No documents are currently indexed. Please ingest PDF documents under the 'Document Ingestion' tab before starting the chat.",
                sources=[]
            )

        # 4. Generate grounded answer using LLMService
        answer = await llm_service.generate_answer(query_text, search_results)

        # 5. Build unique list of source citations
        sources = []
        seen_sources = set()
        for res in search_results:
            source_key = (res["filename"], res["page_number"], res["chunk_index"])
            if source_key not in seen_sources:
                seen_sources.add(source_key)
                sources.append(
                    ChatSource(
                        filename=res["filename"],
                        page_number=res["page_number"],
                        chunk_index=res["chunk_index"]
                    )
                )

        return ChatResponse(
            answer=answer,
            sources=sources
        )

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error in RAG generation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during answer generation: {str(e)}"
        )
