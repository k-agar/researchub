import React, { useState, useRef } from 'react';
import axios from 'axios';
import HealthStatus from './components/HealthStatus';
import { 
  FileText, 
  Upload, 
  Sparkles, 
  AlertCircle, 
  Loader2, 
  CheckCircle, 
  File,
  RefreshCw,
  BookOpen,
  Layers,
  ArrowLeft,
  Search,
  MessageSquare
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export default function App() {
  // Navigation tab state
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' or 'chat'

  // File upload states
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  
  // Chat states
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState(null);
  const [currentDocumentId, setCurrentDocumentId] = useState(null);
  const [currentFilename, setCurrentFilename] = useState(null);
  
  // Drag and drop states
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // File selection handlers
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
      setUploadResult(null);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        setSelectedFile(file);
        setError(null);
        setUploadResult(null);
      } else {
        setError("Only PDF files are supported.");
      }
    }
  };

  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  // Upload trigger
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post(`${API_URL}/api/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setUploadResult(response.data);
      setCurrentDocumentId(response.data.document_id);
      setCurrentFilename(response.data.filename);
      setChatMessages([]); // reset chat history for new document
    } catch (err) {
      console.error("Upload error details:", err);
      const errMsg = err.response?.data?.detail || "Connection lost or server failed to process the PDF. Please ensure the file is not empty or corrupted.";
      setError(errMsg);
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setError(null);
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    const queryVal = chatInput.trim();
    if (!queryVal) return;

    const userMsg = { role: 'user', content: queryVal };
    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setChatInput('');
    setChatLoading(true);
    setChatError(null);

    try {
      const response = await axios.post(`${API_URL}/api/chat`, {
        query: queryVal,
        document_id: currentDocumentId
      });
      setChatMessages([
        ...updatedMessages,
        { 
          role: 'assistant', 
          content: response.data.answer, 
          sources: response.data.sources 
        }
      ]);
    } catch (err) {
      console.error("Chat API error:", err);
      const errMsg = err.response?.data?.detail || "Connection lost or server failed to generate an answer. Please try again.";
      setChatError(errMsg);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header>
        <div className="logo-container">
          <FileText size={28} className="text-primary" style={{ color: 'var(--primary)' }} />
          <span className="logo-text">ResearchHub</span>
          <span className="badge">Ingestion active</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          <Sparkles size={16} style={{ color: 'var(--accent)' }} />
          <span>AI Research Companion</span>
        </div>
      </header>

      <main>
        <div className="dashboard-grid">
          {/* Connection Status Panel */}
          <HealthStatus />

          {/* Core Upload and Result Workspace */}
          <div className="glass-card workspace-card">
            
            {/* Tab Navigation */}
            <div className="tab-navigation" style={{ display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '1.5rem', gap: '0.5rem' }}>
              <button 
                className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
                onClick={() => setActiveTab('upload')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: activeTab === 'upload' ? 'var(--primary)' : 'var(--text-muted)',
                  borderBottom: activeTab === 'upload' ? '2px solid var(--primary)' : '2px solid transparent',
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Upload size={16} />
                Document Ingestion
              </button>
              <button 
                className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveTab('chat')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: activeTab === 'chat' ? 'var(--primary)' : 'var(--text-muted)',
                  borderBottom: activeTab === 'chat' ? '2px solid var(--primary)' : '2px solid transparent',
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <MessageSquare size={16} />
                Research Chat
              </button>
            </div>

            {activeTab === 'upload' && (
              <>
                {/* 1. INITIAL UPLOAD INTERFACE */}
                {!uploading && !uploadResult && (
                  <div className="upload-container" onDragEnter={handleDrag}>
                    <div className="panel-title" style={{ marginBottom: '1.5rem' }}>
                      <Upload size={20} style={{ color: 'var(--primary)' }} />
                      <span>PDF Ingestion Portal</span>
                    </div>

                    <form onSubmit={handleUpload} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}>
                      <input 
                        ref={fileInputRef}
                        type="file" 
                        id="pdf-file-input" 
                        accept=".pdf" 
                        onChange={handleFileChange} 
                        style={{ display: 'none' }}
                      />
                      
                      <div className={`dropzone-placeholder ${dragActive ? 'drag-active' : ''}`} style={{ cursor: 'pointer' }} onClick={onButtonClick}>
                        <div className="icon-wrapper">
                          <Upload size={28} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                            {selectedFile ? 'Change PDF file' : 'Upload your research paper'}
                          </h3>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            Drag and drop your PDF here, or click to browse
                          </p>
                        </div>
                        
                        {selectedFile && (
                          <div className="selected-file-badge">
                            <File size={16} />
                            <span>{selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                          </div>
                        )}

                        <div className="meta-info">
                          <span>PDF format only</span>
                          <span>•</span>
                          <span>Max size: 32MB</span>
                        </div>
                      </div>

                      {error && (
                        <div className="error-alert">
                          <AlertCircle size={18} />
                          <span>{error}</span>
                        </div>
                      )}

                      <div className="button-group">
                        <button 
                          type="submit" 
                          className="btn btn-primary"
                          disabled={!selectedFile}
                          style={{ width: '100%' }}
                        >
                          <Sparkles size={16} />
                          Ingest Document
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* 2. LOADING STATE */}
                {uploading && (
                  <div className="loading-container">
                    <Loader2 className="spinner-icon" size={48} />
                    <h3>Ingesting & Indexing Document</h3>
                    <p>Extracting text, partitioning chunks, generating Hugging Face embeddings, and indexing into ChromaDB...</p>
                  </div>
                )}

                {/* 3. UPLOAD SUCCESS RESULTS / CHUNK PREVIEW */}
                {uploadResult && (
                  <div className="results-container">
                    <div className="results-header">
                      <div className="success-icon-badge">
                        <CheckCircle size={24} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="success-label">INGESTION COMPLETE</span>
                          {uploadResult.indexed && (
                            <span className="badge" style={{ background: 'var(--success-glow)', color: 'var(--success)', borderColor: 'rgba(16, 185, 129, 0.2)', padding: '0.1rem 0.5rem', fontSize: '0.65rem', textTransform: 'none' }}>
                              Indexed in Vector DB
                            </span>
                          )}
                        </div>
                        <h2 className="doc-title">{uploadResult.filename}</h2>
                      </div>
                    </div>

                    <div className="stats-dashboard">
                      <div className="stat-card">
                        <BookOpen size={20} className="icon-blue" />
                        <div className="stat-card-info">
                          <span className="card-val">{uploadResult.number_of_pages}</span>
                          <span className="card-lbl">Total Pages</span>
                        </div>
                      </div>
                      <div className="stat-card">
                        <Layers size={20} className="icon-purple" />
                        <div className="stat-card-info">
                          <span className="card-val">{uploadResult.number_of_chunks}</span>
                          <span className="card-lbl">Generated Chunks</span>
                        </div>
                      </div>
                    </div>

                    <div className="chunks-section">
                      <h3 className="section-title">
                        <Layers size={16} /> Chunks Preview (showing first 3 of {uploadResult.number_of_chunks})
                      </h3>
                      <div className="chunks-list">
                        {uploadResult.chunks.slice(0, 3).map((chunk) => (
                          <div key={chunk.chunk_index} className="chunk-card">
                            <div className="chunk-meta">
                              <span className="chunk-badge">Index #{chunk.chunk_index}</span>
                              <span className="chunk-page">Page {chunk.page_number}</span>
                            </div>
                            <div className="chunk-body">
                              {chunk.text}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button className="btn btn-outline" onClick={resetUpload} style={{ marginTop: '2rem' }}>
                      <ArrowLeft size={16} /> Ingest Another Document
                    </button>
                  </div>
                )}
              </>
            )}            {activeTab === 'chat' && (
              <div className="chat-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '480px' }}>
                <div className="panel-title" style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageSquare size={20} style={{ color: 'var(--primary)' }} />
                    <span>Research RAG Assistant</span>
                  </div>
                  {currentFilename && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '28px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--accent)' }}>•</span>
                      <span>Chatting about: <strong style={{ color: 'var(--text-secondary)' }}>{currentFilename}</strong></span>
                    </div>
                  )}
                </div>
                
                {/* Chat History View */}
                <div className="chat-history" style={{ 
                  flex: 1, 
                  overflowY: 'auto', 
                  maxHeight: '420px',
                  padding: '1.2rem', 
                  background: 'rgba(255, 255, 255, 0.01)', 
                  border: '1px solid rgba(255, 255, 255, 0.05)', 
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  marginBottom: '1.25rem',
                  minHeight: '260px'
                }}>
                  {!currentDocumentId ? (
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      margin: 'auto',
                      color: 'var(--text-muted)',
                      textAlign: 'center',
                      padding: '2rem 1rem'
                    }}>
                      <Upload size={40} style={{ color: 'var(--primary)', opacity: 0.4, marginBottom: '0.75rem' }} />
                      <h4 style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem', fontSize: '0.95rem' }}>No Active Document</h4>
                      <p style={{ fontSize: '0.82rem', maxWidth: '360px', lineHeight: '1.4' }}>
                        Please ingest a PDF research paper under the "Document Ingestion" tab to start chatting.
                      </p>
                    </div>
                  ) : chatMessages.length === 0 ? (
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      margin: 'auto',
                      color: 'var(--text-muted)',
                      textAlign: 'center',
                      padding: '2rem 1rem'
                    }}>
                      <BookOpen size={40} style={{ color: 'var(--primary)', opacity: 0.4, marginBottom: '0.75rem' }} />
                      <h4 style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem', fontSize: '0.95rem' }}>Ask your Research Companion</h4>
                      <p style={{ fontSize: '0.82rem', maxWidth: '360px', lineHeight: '1.4' }}>
                        Ask questions about the uploaded paper. Responses are strictly grounded on the extracted text and cite references.
                      </p>
                    </div>
                  ) : (
                    chatMessages.map((msg, idx) => (
                      <div key={idx} style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        width: '100%',
                        animation: 'fadeIn 0.25s ease-out'
                      }}>
                        {/* Bubble */}
                        <div style={{
                          maxWidth: '85%',
                          padding: '0.8rem 1rem',
                          borderRadius: msg.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                          background: msg.role === 'user' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.03)',
                          color: 'var(--text)',
                          fontSize: '0.9rem',
                          lineHeight: '1.45',
                          border: msg.role === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.05)'
                        }}>
                          {msg.content}
                        </div>
                        
                        {/* Citations & Sources list */}
                        {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                          <div style={{
                            marginTop: '0.4rem',
                            paddingLeft: '0.2rem',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '6px',
                            alignItems: 'center'
                          }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sources:</span>
                            {msg.sources.map((src, sIdx) => (
                              <span 
                                key={sIdx} 
                                style={{ 
                                  fontSize: '0.7rem', 
                                  color: '#818cf8', 
                                  background: 'rgba(99, 102, 241, 0.06)',
                                  border: '1px solid rgba(99, 102, 241, 0.12)',
                                  padding: '0.1rem 0.4rem', 
                                  borderRadius: '4px',
                                  display: 'inline-flex',
                                  alignItems: 'center'
                                }}
                                title={`Chunk #${src.chunk_index}`}
                              >
                                {src.filename} (Page {src.page_number})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}

                  {/* Chat Loading message */}
                  {chatLoading && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.8rem', paddingLeft: '0.2rem' }}>
                      <Loader2 className="spinner-icon" size={14} />
                      <span>Retrieving chunks and reasoning...</span>
                    </div>
                  )}
                </div>

                {/* Error Banner */}
                {chatError && (
                  <div className="error-alert" style={{ marginBottom: '1.25rem' }}>
                    <AlertCircle size={18} />
                    <span>{chatError}</span>
                  </div>
                )}

                {/* Chat Input Box */}
                <form onSubmit={handleChatSubmit} style={{ display: 'flex', gap: '10px' }}>
                  <input 
                    type="text" 
                    placeholder={currentDocumentId ? "Ask a question about the active paper..." : "Ingest a PDF to enable chat"} 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={chatLoading || !currentDocumentId}
                    style={{
                      flex: 1,
                      padding: '0.75rem 1.1rem',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '12px',
                      color: 'var(--text)',
                      fontSize: '0.92rem',
                      outline: 'none',
                      transition: 'border-color 0.2s ease',
                      opacity: currentDocumentId ? 1 : 0.6,
                      cursor: currentDocumentId ? 'text' : 'not-allowed'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.06)'}
                  />
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={chatLoading || !chatInput.trim() || !currentDocumentId}
                    style={{ padding: '0.75rem 1.6rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span>Ask</span>
                    <Sparkles size={14} />
                  </button>
                </form>
              </div>
            )}

          </div>
        </div>
      </main>

      <footer>
        <p>© 2026 ResearchHub Ingestion Engine. Built with PyMuPDF, FastAPI and React.</p>
      </footer>
    </div>
  );
}
