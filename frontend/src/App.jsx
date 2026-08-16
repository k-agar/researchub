import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ResearchFAQs from './components/ResearchFAQs';
import { 
  FileText, 
  Upload, 
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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

  // Typeset math equations whenever messages change or finish loading
  useEffect(() => {
    if (window.MathJax && window.MathJax.typesetPromise) {
      const timer = setTimeout(() => {
        window.MathJax.typesetPromise()
          .catch((err) => console.warn("MathJax typesetting failed:", err));
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [chatMessages, chatLoading, uploadResult]);

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
          <FileText size={22} style={{ color: 'var(--text-primary)' }} />
          <span className="logo-text">ResearchHub</span>
        </div>
      </header>

      <main>
        <div className="dashboard-grid">
          {/* FAQ Panel */}
          <ResearchFAQs 
            onSelectQuestion={(faq) => {
              setChatInput(faq);
              setActiveTab('chat');
            }}
            disabled={!currentDocumentId}
          />

          {/* Core Upload and Result Workspace */}
          <div className="glass-card workspace-card">
            
            {/* Tab Navigation */}
            <div className="tab-navigation" style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', gap: '0.5rem' }}>
              <button 
                className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
                onClick={() => setActiveTab('upload')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: activeTab === 'upload' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  borderBottom: activeTab === 'upload' ? '2px solid var(--text-primary)' : '2px solid transparent',
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Upload size={14} />
                Upload PDF
              </button>
              <button 
                className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveTab('chat')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: activeTab === 'chat' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  borderBottom: activeTab === 'chat' ? '2px solid var(--text-primary)' : '2px solid transparent',
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <MessageSquare size={14} />
                Chat
              </button>
            </div>

            {activeTab === 'upload' && (
              <>
                {/* 1. INITIAL UPLOAD INTERFACE */}
                {!uploading && !uploadResult && (
                  <div className="upload-container" onDragEnter={handleDrag}>
                    <div className="panel-title" style={{ marginBottom: '1.5rem' }}>
                      <Upload size={18} style={{ color: 'var(--text-secondary)' }} />
                      <span>Upload Document</span>
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
                          <Upload size={20} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                            {selectedFile ? 'Change PDF file' : 'Select a PDF document'}
                          </h3>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                            Drag and drop your PDF here, or click to browse
                          </p>
                        </div>
                        
                        {selectedFile && (
                          <div className="selected-file-badge">
                            <File size={14} />
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
                          <AlertCircle size={16} />
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
                          Upload Document
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* 2. LOADING STATE */}
                {uploading && (
                  <div className="loading-container">
                    <Loader2 className="spinner-icon" size={32} style={{ color: 'var(--text-secondary)' }} />
                    <h3 style={{ fontWeight: 500 }}>Processing PDF</h3>
                    <p style={{ fontSize: '0.875rem' }}>Extracting and reading document text. Please wait...</p>
                  </div>
                )}

                {/* 3. UPLOAD SUCCESS RESULTS / CHUNK PREVIEW */}
                {uploadResult && (
                  <div className="results-container">
                    <div className="results-header">
                      <div className="success-icon-badge">
                        <CheckCircle size={20} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="success-label">UPLOAD SUCCESSFUL</span>
                          {uploadResult.indexed && (
                            <span className="badge" style={{ fontSize: '0.65rem' }}>
                              Ready
                            </span>
                          )}
                        </div>
                        <h2 className="doc-title" style={{ fontSize: '1.2rem', fontWeight: 600 }}>{uploadResult.filename}</h2>
                      </div>
                    </div>

                    <div className="stats-dashboard">
                      <div className="stat-card">
                        <BookOpen size={16} className="icon-blue" />
                        <div className="stat-card-info">
                          <span className="card-val" style={{ fontSize: '1.25rem' }}>{uploadResult.number_of_pages}</span>
                          <span className="card-lbl">Total Pages</span>
                        </div>
                      </div>
                      <div className="stat-card">
                        <Layers size={16} className="icon-purple" />
                        <div className="stat-card-info">
                          <span className="card-val" style={{ fontSize: '1.25rem' }}>{uploadResult.number_of_chunks}</span>
                          <span className="card-lbl">Sections</span>
                        </div>
                      </div>
                    </div>

                    <div className="chunks-section">
                      <h3 className="section-title" style={{ fontSize: '1rem', fontWeight: 500 }}>
                        <Layers size={14} style={{ color: 'var(--text-secondary)' }} /> Content Preview (first 3 sections)
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
                    </div>                    <button className="btn btn-outline" onClick={resetUpload} style={{ marginTop: '2rem' }}>
                      <ArrowLeft size={14} /> Upload another file
                    </button>
                  </div>
                )}
              </>
            )}

            {activeTab === 'chat' && (
              <div className="chat-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '480px' }}>
                <div className="panel-title" style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageSquare size={18} style={{ color: 'var(--text-secondary)' }} />
                    <span>Document Chat</span>
                  </div>
                  {currentFilename && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '26px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>•</span>
                      <span>Active file: <strong style={{ color: 'var(--text-primary)' }}>{currentFilename}</strong></span>
                    </div>
                  )}
                </div>
                
                {/* Chat History View */}
                <div className="chat-history" style={{ 
                  flex: 1, 
                  overflowY: 'auto', 
                  maxHeight: '420px',
                  padding: '1.2rem', 
                  background: 'var(--bg-dark)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '8px',
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
                      <Upload size={32} style={{ color: 'var(--text-muted)', opacity: 0.5, marginBottom: '0.75rem' }} />
                      <h4 style={{ fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.25rem', fontSize: '0.9rem' }}>No active document</h4>
                      <p style={{ fontSize: '0.8rem', maxWidth: '300px', lineHeight: '1.4' }}>
                        Please upload a PDF document under the "Upload PDF" tab to start chatting.
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
                      <BookOpen size={32} style={{ color: 'var(--text-muted)', opacity: 0.5, marginBottom: '0.75rem' }} />
                      <h4 style={{ fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Ask a question about the document</h4>
                      <p style={{ fontSize: '0.8rem', maxWidth: '300px', lineHeight: '1.4' }}>
                        Answers are generated using the content of the uploaded PDF file.
                      </p>
                    </div>
                  ) : (
                    chatMessages.map((msg, idx) => (
                      <div key={idx} style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        width: '100%',
                        animation: 'fadeIn 0.2s ease-out'
                      }}>
                        {/* Bubble */}
                        <div style={{
                          maxWidth: '85%',
                          padding: '0.75rem 1rem',
                          borderRadius: msg.role === 'user' ? '6px 6px 2px 6px' : '6px 6px 6px 2px',
                          background: msg.role === 'user' ? 'var(--text-primary)' : 'var(--bg-card-hover)',
                          color: msg.role === 'user' ? 'var(--bg-dark)' : 'var(--text-primary)',
                          fontSize: '0.875rem',
                          lineHeight: '1.5',
                          border: msg.role === 'user' ? 'none' : '1px solid var(--border-color)'
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
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Sources:</span>
                            {msg.sources.map((src, sIdx) => (
                              <span 
                                key={sIdx} 
                                style={{ 
                                  fontSize: '0.7rem', 
                                  color: 'var(--text-primary)', 
                                  background: 'var(--bg-card-hover)',
                                  border: '1px solid var(--border-color)',
                                  padding: '0.1rem 0.4rem', 
                                  borderRadius: '4px',
                                  display: 'inline-flex',
                                  alignItems: 'center'
                                }}
                                title={`Section #${src.chunk_index}`}
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
                      <Loader2 className="spinner-icon" size={12} />
                      <span>Searching document...</span>
                    </div>
                  )}
                </div>

                {/* Error Banner */}
                {chatError && (
                  <div className="error-alert" style={{ marginBottom: '1.25rem' }}>
                    <AlertCircle size={16} />
                    <span>{chatError}</span>
                  </div>
                )}

                {/* Chat Input Box */}
                <form onSubmit={handleChatSubmit} style={{ display: 'flex', gap: '10px' }}>
                  <input 
                    type="text" 
                    placeholder={currentDocumentId ? "Ask a question about the document..." : "Upload a PDF to start"} 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={chatLoading || !currentDocumentId}
                    style={{
                      flex: 1,
                      padding: '0.6rem 1rem',
                      background: 'var(--bg-dark)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                      outline: 'none',
                      transition: 'border-color 0.15s ease',
                      opacity: currentDocumentId ? 1 : 0.5,
                      cursor: currentDocumentId ? 'text' : 'not-allowed'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--border-active)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                  />
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={chatLoading || !chatInput.trim() || !currentDocumentId}
                    style={{ padding: '0.6rem 1.2rem', borderRadius: '6px' }}
                  >
                    Ask
                  </button>
                </form>
              </div>
            )}

          </div>
        </div>
      </main>

      <footer>
        <p>© 2026 ResearchHub. Built with React and FastAPI.</p>
      </footer>
    </div>
  );
}
