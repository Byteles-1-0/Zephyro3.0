import React, { useState, useEffect, useRef } from 'react';

const API_BASE = 'http://localhost:5000/api';

function ChatWidget({ mapRef }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Ciao! Sono il tuo assistente per la qualità dell\'aria. Chiedimi tutto su PM10, PM2.5, inquinamento e salute! 🌿' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('Llama-3.3-70B-Instruct');
  const [configured, setConfigured] = useState(true);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch available models on mount
  useEffect(() => {
    fetch(`${API_BASE}/chat/models`)
      .then(r => r.json())
      .then(data => {
        setModels(data.models || []);
        setSelectedModel(data.current || 'Llama-3.3-70B-Instruct');
        setConfigured(data.configured !== false);
      })
      .catch(() => {});
  }, []);

  // Scroll to bottom when new message arrives
  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage = { role: 'user', content: text };
    const newMessages = [...messages.filter(m => m.role !== 'assistant' || messages.indexOf(m) > 0), userMessage];
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Build conversation history (exclude first assistant greeting)
      const history = [...messages.slice(1), userMessage];
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, model: selectedModel })
      });
      const data = await res.json();

      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${data.error}` }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
        
        // Handle map action if provided
        if (data.map_action && data.map_action.type === 'flyTo' && mapRef && mapRef.current) {
          mapRef.current.flyTo(
            [data.map_action.lat, data.map_action.lng], 
            data.map_action.zoom || 13, 
            { animate: true, duration: 1.5 }
          );
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Errore di connessione al server.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating AI Button */}
      <button
        id="chat-ai-btn"
        onClick={() => setIsOpen(prev => !prev)}
        title="Apri chat AI Regolo"
        aria-label="Apri assistente AI"
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          border: 'none',
          background: isOpen
            ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
            : 'var(--bg-color)',
          color: isOpen ? '#fff' : 'var(--text-color)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 32px var(--shadow-color)',
          zIndex: 1200,
          transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
        }}
      >
        {/* Zephyro PNG Logo with Dynamic Effects */}
        <div style={{ 
          position: 'relative', 
          width: '32px', 
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: !isOpen ? 'zephyro-pulse 3s infinite ease-in-out' : 'none'
        }}>
          <img 
            src="/assets/ZEPHYRO.png" 
            alt="Zephyro Logo"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              filter: !isOpen ? 'drop-shadow(0 0 4px rgba(255,255,255,0.8))' : 'none',
              transition: 'all 0.4s ease',
            }}
          />
          
          {/* Subtle orbit dot for idle effect */}
          {!isOpen && (
            <div style={{
              position: 'absolute',
              width: '4px',
              height: '4px',
              background: '#fff',
              borderRadius: '50%',
              boxShadow: '0 0 8px #fff',
              animation: 'zephyro-orbit 4s infinite linear'
            }} />
          )}
        </div>
      </button>

      {/* Chat Window */}
      <div
        style={{
          position: 'fixed',
          bottom: '96px',
          left: '24px',
          width: '380px',
          height: 'min(600px, calc(100vh - 120px))',
          background: 'var(--bg-color)',
          borderRadius: '24px',
          boxShadow: '0 12px 40px var(--shadow-color)',
          zIndex: 1200,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
          pointerEvents: isOpen ? 'all' : 'none',
          transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          transformOrigin: 'bottom left',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 16px',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.2)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <img 
                src="/assets/ZEPHYRO.png" 
                alt="Zephyro" 
                style={{ width: '20px', height: '20px', objectFit: 'contain' }} 
              />
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>Assistente AQI</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>Powered by Regolo.ai</div>
            </div>
          </div>

          {/* Model selector button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowModelSelector(p => !p)}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                borderRadius: '8px',
                padding: '4px 8px',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                maxWidth: '110px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={selectedModel}
            >
              {selectedModel.split('-')[0]} ▾
            </button>

            {showModelSelector && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                background: 'var(--bg-color)',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: '10px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                zIndex: 10,
                minWidth: '200px',
                overflow: 'hidden',
              }}>
                {models.map(m => (
                  <button
                    key={m}
                    onClick={() => { setSelectedModel(m); setShowModelSelector(false); }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '9px 14px',
                      textAlign: 'left',
                      background: m === selectedModel ? 'rgba(99,102,241,0.1)' : 'transparent',
                      border: 'none',
                      color: 'var(--text-color)',
                      fontSize: '12px',
                      fontWeight: m === selectedModel ? 700 : 500,
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(0,0,0,0.05)',
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          {!configured && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '10px', padding: '10px 12px', fontSize: '12px',
              color: '#ef4444', fontWeight: 600,
            }}>
              ⚠️ Configura <code>REGOLO_API_KEY</code> in <code>app.py</code> per usare la chat.
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}>
              <div style={{
                maxWidth: '85%',
                padding: '9px 13px',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : 'rgba(107,114,128,0.1)',
                color: msg.role === 'user' ? '#fff' : 'var(--text-color)',
                fontSize: '13px',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                padding: '10px 14px',
                borderRadius: '16px 16px 16px 4px',
                background: 'rgba(107,114,128,0.1)',
                display: 'flex',
                gap: '4px',
                alignItems: 'center',
              }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: '#6366f1',
                    animation: `bounce 1s ease-in-out ${i * 0.15}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: '12px 14px',
          borderTop: '1px solid rgba(0,0,0,0.07)',
          display: 'flex',
          gap: '8px',
          flexShrink: 0,
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Scrivi un messaggio..."
            rows={1}
            style={{
              flex: 1,
              border: '1px solid rgba(99,102,241,0.25)',
              borderRadius: '12px',
              padding: '8px 12px',
              fontSize: '13px',
              background: 'var(--bg-color)',
              color: 'var(--text-color)',
              outline: 'none',
              resize: 'none',
              lineHeight: '1.5',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            style={{
              width: '38px', height: '38px',
              borderRadius: '12px',
              border: 'none',
              background: loading || !input.trim()
                ? 'rgba(99,102,241,0.3)'
                : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.2s ease',
            }}
            aria-label="Invia messaggio"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Bounce animation keyframes */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes zephyro-pulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 0px #8b5cf6); }
          50% { transform: scale(1.05); filter: drop-shadow(0 0 15px #8b5cf6); }
        }
        @keyframes zephyro-orbit {
          0% { transform: rotate(0deg) translateX(18px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(18px) rotate(-360deg); }
        }
      `}</style>
    </>
  );
}

export default ChatWidget;
