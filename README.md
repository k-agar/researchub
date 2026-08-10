# ResearchHub

An AI-powered research paper assistant that lets you upload research papers, search their content semantically, and ask questions using Retrieval-Augmented Generation (RAG).

ResearchHub uses open-source models through the Hugging Face Inference API and ChromaDB for vector search.

---

## Features

- Upload research papers in PDF format
- Extract text from PDF documents
- Split documents into overlapping chunks
- Generate semantic embeddings using an open-source embedding model
- Store embeddings and metadata in ChromaDB
- Perform semantic similarity search
- Ask questions about uploaded research papers
- Generate grounded answers using an open-source instruction-tuned LLM
- Display source information and page references for retrieved content

---

## Tech Stack

### Frontend
- React
- Vite
- Axios

### Backend
- Python
- FastAPI
- PyMuPDF

### AI / RAG
- Hugging Face Inference API
- `BAAI/bge-small-en-v1.5` — embedding model
- `Qwen/Qwen2.5-7B-Instruct` — language model

### Vector Database
- ChromaDB

---

## Architecture

```text
                    ResearchHub
                        │
                        ▼
                   Upload PDF
                        │
                        ▼
                 PDF Text Extraction
                     PyMuPDF
                        │
                        ▼
                     Chunking
                        │
                        ▼
              BGE-small Embeddings
                        │
                        ▼
                    ChromaDB
                        │
              ┌─────────┴─────────┐
              │                   │
              ▼                   ▼
        User Question       Stored Chunks
              │                   │
              ▼                   │
       Query Embedding            │
              │                   │
              └─────────┬─────────┘
                        ▼
                 Similarity Search
                        │
                        ▼
                 Relevant Chunks
                        │
                        ▼
              Qwen2.5-7B-Instruct
                        │
                        ▼
                Grounded Answer
                        │
                        ▼
                Sources / Citations
