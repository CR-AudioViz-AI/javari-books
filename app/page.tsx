// app/page.tsx - Javari Books — AI Writing Suite
// CR AudioViz AI · EIN 39-3646201 · May 2026
"use client";
import { useState } from "react";

const TOOLS = [
  { href:"/outline",      icon:"📋", label:"Book Outline",       desc:"Full chapter-by-chapter outline in minutes" },
  { href:"/chapter",      icon:"✍️",  label:"Chapter Writer",     desc:"Write compelling chapters with AI" },
  { href:"/blurb",        icon:"📖", label:"Back Cover Blurb",   desc:"Hook readers with the perfect description" },
  { href:"/query-letter", icon:"📬", label:"Query Letter",       desc:"Get literary agent attention" },
  { href:"/title",        icon:"💡", label:"Title Generator",    desc:"Find the perfect title and subtitle" },
  { href:"/synopsis",     icon:"📝", label:"Synopsis Writer",    desc:"One-page synopsis for publishers" },
];

const GENRES = ["Fiction","Non-Fiction","Memoir","Business","Self-Help","Children","Romance","Thriller","Fantasy","Sci-Fi"];

export default function BooksHome() {
  const [prompt, setPrompt] = useState("");
  const [genre, setGenre] = useState("Fiction");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function quickOutline() {
    if (!prompt.trim()) return;
    setLoading(true); setResult("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role:"user", content:`Write a 10-chapter outline for a ${genre} book about: ${prompt}. Include chapter titles and 2-3 sentence descriptions of what happens in each chapter.` }],
          stream: false,
          systemOverride: "You are a professional book editor and bestselling author. Create compelling, marketable book outlines with strong narrative arcs and memorable characters."
        }),
      });
      const data = await res.json();
      setResult(data?.choices?.[0]?.message?.content || data?.content || "Error.");
    } catch { setResult("Connection error."); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight:"100vh", background:"#040912", color:"#e2e8f0", fontFamily:"system-ui" }}>
      <nav style={{ background:"#1E3A5F", padding:"0 20px", height:52, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:20 }}>📚</span>
          <span style={{ fontWeight:800, color:"#00B4D8", fontSize:15 }}>Javari Books</span>
          <span style={{ color:"#374151", fontSize:11 }}>· AI Writing Suite</span>
        </div>
        <a href="https://craudiovizai.com/auth/signup" style={{ background:"#FF0800", color:"#fff", borderRadius:7, padding:"5px 14px", fontSize:12, fontWeight:700, textDecoration:"none" }}>Sign Up Free</a>
      </nav>

      <section style={{ background:"linear-gradient(135deg,#1E3A5F,#040912)", padding:"64px 24px 56px", textAlign:"center" }}>
        <div style={{ maxWidth:640, margin:"0 auto" }}>
          <h1 style={{ fontSize:"clamp(26px,4vw,48px)", fontWeight:900, color:"#fff", margin:"0 0 14px", lineHeight:1.05 }}>
            Write Your Book with<br /><span style={{ color:"#00B4D8" }}>AI That Understands Story</span>
          </h1>
          <p style={{ color:"rgba(255,255,255,0.7)", fontSize:15, lineHeight:1.65, margin:"0 0 32px" }}>
            From first idea to published book. Outlines, chapters, blurbs, query letters — everything an author needs.
          </p>
          <div style={{ display:"flex", gap:8, maxWidth:560, margin:"0 auto", flexWrap:"wrap", justifyContent:"center" }}>
            <select value={genre} onChange={e=>setGenre(e.target.value)}
              style={{ background:"rgba(15,31,50,0.9)", border:"1px solid rgba(0,180,216,0.3)", borderRadius:8, padding:"12px 14px", color:"#e2e8f0", fontSize:14, outline:"none", fontFamily:"system-ui" }}>
              {GENRES.map(g=><option key={g}>{g}</option>)}
            </select>
            <input value={prompt} onChange={e=>setPrompt(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&quickOutline()}
              placeholder="Describe your book idea..."
              style={{ flex:1, minWidth:220, background:"rgba(15,31,50,0.9)", border:"1px solid rgba(0,180,216,0.3)", borderRadius:8, padding:"12px 14px", color:"#e2e8f0", fontSize:14, outline:"none", fontFamily:"system-ui" }} />
            <button onClick={quickOutline} disabled={loading||!prompt.trim()}
              style={{ background: loading||!prompt.trim()?"#0F1F32":"#FF0800", color: loading||!prompt.trim()?"#374151":"#fff", border:"none", borderRadius:8, padding:"12px 20px", fontSize:14, fontWeight:700, cursor: loading||!prompt.trim()?"not-allowed":"pointer", fontFamily:"system-ui", whiteSpace:"nowrap" }}>
              {loading?"Writing...":"📋 Quick Outline"}
            </button>
          </div>
        </div>
      </section>

      {result && (
        <div style={{ maxWidth:800, margin:"32px auto", padding:"0 20px" }}>
          <div style={{ background:"#0F1F32", border:"1px solid rgba(0,180,216,0.12)", borderRadius:14, padding:24 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <h3 style={{ margin:0, color:"#00B4D8", fontSize:15, fontWeight:700 }}>Your Outline</h3>
              <button onClick={()=>navigator.clipboard?.writeText(result)}
                style={{ background:"transparent", color:"#6B7280", border:"1px solid rgba(255,255,255,0.08)", borderRadius:6, padding:"4px 12px", fontSize:12, cursor:"pointer", fontFamily:"system-ui" }}>Copy</button>
            </div>
            <pre style={{ whiteSpace:"pre-wrap", wordBreak:"break-word", color:"#e2e8f0", fontSize:14, lineHeight:1.7, margin:0, fontFamily:"system-ui" }}>{result}</pre>
          </div>
        </div>
      )}

      <section style={{ maxWidth:960, margin:"0 auto", padding:"48px 20px 72px" }}>
        <h2 style={{ textAlign:"center", fontSize:"clamp(18px,3vw,28px)", fontWeight:800, color:"#fff", margin:"0 0 32px" }}>All Writing Tools</h2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:12 }}>
          {TOOLS.map(t => (
            <a key={t.href} href={t.href} style={{ background:"#0F1F32", border:"1px solid rgba(0,180,216,0.08)", borderRadius:14, padding:"20px 18px", textDecoration:"none", display:"block" }}>
              <span style={{ fontSize:30, display:"block", marginBottom:8 }}>{t.icon}</span>
              <div style={{ fontWeight:700, fontSize:14, color:"#e2e8f0", marginBottom:5 }}>{t.label}</div>
              <div style={{ fontSize:12, color:"#6B7280", lineHeight:1.5 }}>{t.desc}</div>
            </a>
          ))}
        </div>
      </section>

      <footer style={{ borderTop:"1px solid rgba(0,180,216,0.08)", padding:"14px 24px", textAlign:"center" }}>
        <p style={{ color:"#374151", fontSize:11, margin:0 }}>© 2026 CR AudioViz AI, LLC — EIN: 39-3646201 · <a href="https://craudiovizai.com/auth/signup" style={{ color:"#FF0800", textDecoration:"none", fontWeight:600 }}>Sign Up Free</a></p>
      </footer>
    </div>
  );
}