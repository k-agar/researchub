import React from 'react';
import { HelpCircle, MessageSquare } from 'lucide-react';

const FAQS = [
  "What is the core contribution of this paper?",
  "Explain the methodology and approach used.",
  "What are the key results or experimental findings?",
  "What limitations or weaknesses do the authors identify?",
  "Suggest potential future research directions based on this work."
];

export default function ResearchFAQs({ onSelectQuestion, disabled }) {
  return (
    <div className="glass-card faq-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 600 }}>
        <HelpCircle size={18} style={{ color: 'var(--text-secondary)' }} />
        <span>Suggested Questions</span>
      </div>
      
      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
        Select a suggested question to load it into the chat once a document has been uploaded.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {FAQS.map((faq, index) => (
          <button
            key={index}
            onClick={() => onSelectQuestion(faq)}
            disabled={disabled}
            style={{
              textAlign: 'left',
              background: 'var(--bg-dark)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '0.75rem 1rem',
              color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
              fontSize: '0.825rem',
              lineHeight: '1.4',
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              width: '100%'
            }}
            className="faq-btn"
            title={disabled ? "Upload a PDF first to ask questions" : ""}
          >
            <MessageSquare size={14} style={{ marginTop: '2px', flexShrink: 0, color: 'var(--text-muted)' }} />
            <span>{faq}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
