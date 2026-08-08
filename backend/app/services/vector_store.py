import os
import uuid
import logging
import chromadb
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class VectorStoreService:
    def __init__(self):
        # Resolve the storage path: defaults to a persistent folder 'chroma_db' in the backend workspace
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        default_db_path = os.path.join(base_dir, "chroma_db")
        db_path = os.getenv("CHROMA_DB_PATH", default_db_path)
        
        logger.info(f"Initializing persistent ChromaDB client at: {db_path}")
        self.client = chromadb.PersistentClient(path=db_path)
        
        # Collection name configuration
        collection_name = os.getenv("CHROMA_COLLECTION_NAME", "research_papers")
        
        # Retrieve or create collection
        self.collection = self.client.get_or_create_collection(
            name=collection_name
        )

    def add_chunks(
        self, 
        filename: str, 
        document_id: str,
        chunks: List[Dict[str, Any]], 
        embeddings: List[List[float]]
    ) -> None:
        """
        Inject chunk texts, metadata containing document_id, pre-computed embeddings, and unique IDs into the collection.
        """
        documents = []
        metadatas = []
        ids = []

        for i, chunk in enumerate(chunks):
            documents.append(chunk["text"])
            metadatas.append({
                "filename": filename,
                "document_id": document_id,
                "page_number": int(chunk["page_number"]),
                "chunk_index": int(chunk["chunk_index"])
            })
            # Generate a clean unique tracking ID for each chunk
            clean_filename = filename.replace(" ", "_").replace("/", "_")
            unique_suffix = uuid.uuid4().hex[:8]
            ids.append(f"{clean_filename}_chunk_{chunk['chunk_index']}_{unique_suffix}")

        try:
            # Insert batch into ChromaDB collection
            self.collection.add(
                documents=documents,
                embeddings=embeddings,
                metadatas=metadatas,
                ids=ids
            )
            logger.info(f"Successfully added {len(chunks)} chunks for {filename} (ID: {document_id}) to ChromaDB.")
        except Exception as e:
            logger.error(f"Error adding chunks to ChromaDB collection: {str(e)}")
            raise e

    def search_similar_chunks(
        self, 
        query_embedding: List[float], 
        document_id: str,
        n_results: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Query ChromaDB using the pre-computed query embedding, filtered by document_id.
        Returns a list of dicts containing chunk text, metadata, and distance.
        """
        # If no documents are indexed, return empty list
        if self.collection.count() == 0:
            return []
            
        try:
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                where={"document_id": document_id}
            )
            
            # Format results
            formatted_results = []
            if results and results["ids"] and len(results["ids"][0]) > 0:
                ids = results["ids"][0]
                documents = results["documents"][0]
                metadatas = results["metadatas"][0]
                distances = results["distances"][0]
                
                for i in range(len(ids)):
                    formatted_results.append({
                        "text": documents[i],
                        "filename": metadatas[i].get("filename", "Unknown"),
                        "page_number": int(metadatas[i].get("page_number", 0)),
                        "chunk_index": int(metadatas[i].get("chunk_index", 0)),
                        "score": float(distances[i])
                    })
                    
            return formatted_results
        except Exception as e:
            logger.error(f"Error querying ChromaDB: {str(e)}")
            raise e

    def verify_document_exists(self, document_id: str) -> bool:
        """
        Check if any chunks exist in the ChromaDB collection with the given document_id.
        """
        try:
            results = self.collection.get(
                where={"document_id": document_id},
                limit=1
            )
            return results and results["ids"] and len(results["ids"]) > 0
        except Exception as e:
            logger.error(f"Error checking document existence for ID {document_id}: {str(e)}")
            return False
