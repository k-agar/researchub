import fitz  # PyMuPDF
from typing import List, Tuple
from fastapi import HTTPException, status
from app.models.upload import DocumentChunk

def validate_pdf_file(file_content: bytes, filename: str) -> None:
    """
    Validates that the file has a PDF extension and starts with the PDF magic bytes (%PDF-).
    """
    if not filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file extension. Only PDF files are allowed."
        )
    
    # Check PDF magic bytes (should start with %PDF)
    if not file_content.startswith(b'%PDF'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. The file signature does not match a PDF document."
        )

def extract_and_chunk_pdf(file_content: bytes, filename: str) -> Tuple[int, List[DocumentChunk]]:
    """
    Parses a PDF from bytes, extracts text page-by-page, and chunks it.
    Returns (number_of_pages, list_of_chunks).
    """
    try:
        # Open PDF in-memory from bytes
        doc = fitz.open(stream=file_content, filetype="pdf")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse PDF file. It may be corrupted or invalid: {str(e)}"
        )

    number_of_pages = len(doc)
    if number_of_pages == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded PDF contains no pages."
        )

    chunks: List[DocumentChunk] = []
    chunk_index = 0
    chunk_size = 800
    chunk_overlap = 100

    for page_idx in range(number_of_pages):
        page_num = page_idx + 1
        try:
            page = doc[page_idx]
            page_text = page.get_text().strip()
        except Exception as e:
            # Handle extraction failure for specific pages
            continue

        if not page_text:
            continue

        # Chunk the page text
        if len(page_text) <= chunk_size:
            chunks.append(
                DocumentChunk(
                    text=page_text,
                    page_number=page_num,
                    chunk_index=chunk_index
                )
            )
            chunk_index += 1
        else:
            start = 0
            page_chunks = []
            while start < len(page_text):
                end = start + chunk_size
                chunk_content = page_text[start:end]
                
                # If this is a tiny trailing chunk, merge it with the last page chunk to maintain flow
                if len(chunk_content) < 150 and len(page_chunks) > 0:
                    page_chunks[-1].text = (page_chunks[-1].text + " " + chunk_content).strip()
                    break

                new_chunk = DocumentChunk(
                    text=chunk_content,
                    page_number=page_num,
                    chunk_index=chunk_index
                )
                page_chunks.append(new_chunk)
                chunks.append(new_chunk)
                chunk_index += 1
                
                start += (chunk_size - chunk_overlap)

    # Close document
    doc.close()

    # Raise an exception if no text was found in the entire document (e.g. all images/empty)
    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The PDF contains no extractable text. It might be empty or scanned (image-only)."
        )

    return number_of_pages, chunks
