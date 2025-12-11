
import React, { useEffect, useRef, useState } from 'react';
import Logo from './assets/commander_logo.png';
import 'event-source-polyfill'; // ensures EventSource works in some environments

export default function App(){
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [mode, setMode] = useState('friendly');
  const evtRef = useRef(null);

  useEffect(()=>{
    fetch('/api/history').then(r=>r.json()).then(data=>setMessages(data || []));
  },[]);

  function startStream(userMsg){
    setIsStreaming(true);
    // Use fetch to start SSE by POSTing to /api/stream - but EventSource doesn't support POST.
    // We will use a small trick: create a form that sends message id and then open EventSource to /api/stream?sid=...
    // For simplicity in this scaffold we start a POST fetch to initiate server-side stream and then open EventSource.
    // The server manages incoming requests by reading the POST body; client opens EventSource to receive the stream.
    const sid = Date.now() + '_' + Math.floor(Math.random()*1000);
    // Start the stream by POST to /api/stream (server will stream back on the same request — but browsers can't open SSE from POST easily).
    // To keep client simple, we call fetch to /api/stream and then read server-sent events directly via TextDecoder here.
    (async ()=>{
      try {
        const resp = await fetch('/api/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMsg, mode })
        });
        if (!resp.ok) {
          console.error('stream failed', resp.status);
          setIsStreaming(false);
          return;
        }
        const reader = resp.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let assistantText = '';
        // add placeholder assistant message
        setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true, createdAt: new Date().toISOString() }]);
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          // server sends JSON per SSE 'data: ...' lines; extract tokens heuristically
          // We'll append raw chunk
          assistantText += chunk;
          setMessages(prev => {
            const last = prev[prev.length-1];
            if (last && last.role === 'assistant' && last.streaming) {
              const copy = [...prev];
              copy[copy.length-1] = { ...last, content: last.content + chunk };
              return copy;
            } else {
              return [...prev, { role: 'assistant', content: chunk, streaming: true, createdAt: new Date().toISOString() }];
            }
          });
        }
        // finalize
        setMessages(prev => prev.map(m => m.streaming ? { ...m, streaming: false } : m));
      } catch (err) {
        console.error(err);
      } finally {
        setIsStreaming(false);
      }
    })();
  }

  async function sendMessage(){
    if(!input.trim()) return;
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg, createdAt: new Date().toISOString() }]);
    setInput('');
    startStream(userMsg);
  }

  return (
    <div className="app">
      <div className="sidebar">
        <img src={Logo} alt="Commander AI" style={{ width:56, borderRadius:10 }} />
        <h2 style={{ marginTop:12 }}>Commander AI</h2>
        <div style={{ marginTop:20 }}>
          <button className="button" onClick={()=>setMode('friendly')} style={{ display:'block', marginBottom:8 }}>Friendly</button>
          <button className="button" onClick={()=>setMode('robotic')} style={{ display:'block', marginBottom:8 }}>Robotic</button>
          <button className="button" onClick={()=>setMode('strict')} style={{ display:'block', marginBottom:8 }}>Strict</button>
        </div>
      </div>

      <div className="main">
        <div className="chat-window" id="chat-window">
          {messages.map((m,i)=>(
            <div key={i} className={`msg ${m.role==='user' ? 'user' : 'assistant'}`}>
              <div style={{ whiteSpace:'pre-wrap' }}>{m.content}</div>
              <div style={{ fontSize:11, color:'#8892a0', marginTop:8 }}>{new Date(m.createdAt).toLocaleString()}</div>
            </div>
          ))}
          {isStreaming && <div style={{ color:'#9aa4b2' }}>Streaming…</div>}
        </div>

        <div className="input-area">
          <div className="input-box">
            <textarea rows={2} value={input} onChange={e=>setInput(e.target.value)} placeholder="Type your message..." style={{ background:'transparent', border:'none', color:'inherit', outline:'none', resize:'none' }} />
            <div className="signature">— aakaash —</div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <button className="button" onClick={sendMessage}>Send</button>
            <button className="button" onClick={()=>{ /* cancel logic placeholder */ }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
