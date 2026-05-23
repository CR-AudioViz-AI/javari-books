// app/outline/page.tsx — Book Outline Generator
// app/chapter/page.tsx — Chapter Writer
// Merged into one file: chapter writer with outline seed
// CR AudioViz AI · EIN 39-3646201 · May 2026
"use client";
import { useState } from "react";

const POVS = ["First Person","Third Person Limited","Third Person Omniscient","Second Person"];
const TONES = ["Literary","Commercial/Thriller","Cozy/Warm","Dark/Gritty","Humorous","Inspirational"];
const GENRES = ["Fiction","Mystery/Thriller","Romance","Fantasy","Sci-Fi","Non-Fiction","Memoir","Business","Self-Help"];

export default function ChapterWriter() {
  const [genre, setGenre] = useState("Fiction");
  const [pov, setPov] = useState("Third Person Limited");
  const [tone, setTone] = useState("Literary");
  const [title, setTitle] = useState("");
  const [premise, setPremise] = useState("");
  const [chapterNum, setChapterNum] = useState("1");
  const [chapterGoal, setChapterGoal] = useState("");
  const [wordCount, setWordCount] = useState("1500");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<"outline"|"chapter">("outline");
  const [loading, setLoading] = useState(false);

  async function generate() {
    if (!premise.trim()) return;
    setLoading(true); setOutput("");
    const prompt = mode === "outline"
      ? `Create a detailed 10-chapter outline for a ${genre} book.
Title: ${title || "Untitled"}
Premise: ${premise}
POV: ${pov}
Tone: ${tone}

For each chapter provide:
- Chapter title
- Word count target
- Scene breakdown (3-4 key scenes)
- Character development beats
- Plot advancement
- Chapter ending hook

Make it compelling and commercially viable.`
      : `Write Chapter ${chapterNum} of a ${genre} book.
Title: ${title || "Untitled"}
Premise: ${premise}
Chapter Goal: ${chapterGoal || "Advance the plot"}
POV: ${pov}
Tone: ${tone}
Target Length: approximately ${wordCount} words

Write the complete chapter. Start in media res. Use strong sensory details.
End on a hook that compels the reader to continue.`;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          stream: false,
          systemOverride: `You are a bestselling ${genre} author and writing coach. Write compelling, professional-quality fiction and non-fiction. Your prose is specific, sensory, and emotionally resonant. Never generic.`,
        }),
      });
      const data = await res.json();
      setOutput(data?.choices?.[0]?.message?.content || data?.content || "Error generating content.");
    } catch { setOutput("Connection error. Please try again."); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight:"100vh", background:"#040912", color:"#e2e8f0", fontFamily:"system-ui" }}>
      <nav style={{ background:"#1E3A5F", padding:"0 20px", height:52, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <a href="/" style={{ color:"#9CA3AF", textDecoration:"none", fontSize:13 }}>📚 Javari Books</a>
          <span style={{ color:"#374151" }}>·</span>
          <span style={{ color:"#00B4D8", fontWeight:700 }}>{mode === "outline" ? "Outline Generator" : "Chapter Writer"}</span>
        </div>
        <a href="https://craudiovizai.com/auth/signup" style={{ background:"#FF0800", color:"#fff", borderRadius:7, padding:"5px 14px", fontSize:12, fontWeight:700, textDecoration:"none" }}>Sign Up</a>
      </nav>

      <div style={{ maxWidth:1000, margin:"0 auto", padding:"28px 20px 72px", display:"grid", gridTemplateColumns:"300px 1fr", gap:24 }}>
        {/* Controls */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {/* Mode toggle */}
          <div style={{ display:"flex", gap:6 }}>
            {[["outline","📋 Outline"],["chapter","✍️ Chapter"]].map(([m,l]) => (
              <button key={m} onClick={() => setMode(m as any)}
                style={{ flex:1, background: mode===m ? "rgba(0,180,216,0.2)" : "#0F1F32", color: mode===m ? "#00B4D8" : "#9CA3AF", border:`1px solid ${mode===m ? "rgba(0,180,216,0.3)" : "rgba(255,255,255,0.07)"}`, borderRadius:8, padding:"8px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"system-ui" }}>
                {l}
              </button>
            ))}
          </div>

          {[["Genre","genre",GENRES,genre,setGenre],["POV","pov",POVS,pov,setPov],["Tone","tone",TONES,tone,setTone]].map(([label, key, opts, val, setter]) => (
            <div key={key as string}>
              <p style={{ fontSize:11, fontWeight:700, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.05em", margin:"0 0 6px" }}>{label as string}</p>
              <select value={val as string} onChange={e => (setter as Function)(e.target.value)}
                style={{ width:"100%", background:"#0F1F32", border:"1px solid rgba(0,180,216,0.15)", borderRadius:8, padding:"9px 12px", color:"#e2e8f0", fontSize:13, outline:"none", fontFamily:"system-ui" }}>
                {(opts as string[]).map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}

          <div>
            <p style={{ fontSize:11, fontWeight:700, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.05em", margin:"0 0 6px" }}>Book Title</p>
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Optional"
              style={{ width:"100%", background:"#0F1F32", border:"1px solid rgba(0,180,216,0.15)", borderRadius:8, padding:"9px 12px", color:"#e2e8f0", fontSize:13, outline:"none", fontFamily:"system-ui", boxSizing:"border-box" }} />
          </div>

          <div>
            <p style={{ fontSize:11, fontWeight:700, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.05em", margin:"0 0 6px" }}>Premise / Synopsis</p>
            <textarea value={premise} onChange={e=>setPremise(e.target.value)} rows={3} placeholder="Your story premise..."
              style={{ width:"100%", background:"#0F1F32", border:"1px solid rgba(0,180,216,0.15)", borderRadius:8, padding:"9px 12px", color:"#e2e8f0", fontSize:13, outline:"none", fontFamily:"system-ui", boxSizing:"border-box", resize:"vertical" }} />
          </div>

          {mode === "chapter" && (
            <>
              <div style={{ display:"flex", gap:8 }}>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:11, fontWeight:700, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.05em", margin:"0 0 6px" }}>Chapter #</p>
                  <input value={chapterNum} onChange={e=>setChapterNum(e.target.value)} type="number" min="1"
                    style={{ width:"100%", background:"#0F1F32", border:"1px solid rgba(0,180,216,0.15)", borderRadius:8, padding:"9px 12px", color:"#e2e8f0", fontSize:13, outline:"none", fontFamily:"system-ui", boxSizing:"border-box" }} />
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:11, fontWeight:700, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.05em", margin:"0 0 6px" }}>Word Count</p>
                  <select value={wordCount} onChange={e=>setWordCount(e.target.value)}
                    style={{ width:"100%", background:"#0F1F32", border:"1px solid rgba(0,180,216,0.15)", borderRadius:8, padding:"9px 12px", color:"#e2e8f0", fontSize:13, outline:"none", fontFamily:"system-ui" }}>
                    {["500","1000","1500","2000","3000","5000"].map(w=><option key={w}>{w}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <p style={{ fontSize:11, fontWeight:700, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.05em", margin:"0 0 6px" }}>Chapter Goal</p>
                <input value={chapterGoal} onChange={e=>setChapterGoal(e.target.value)} placeholder="What must this chapter accomplish?"
                  style={{ width:"100%", background:"#0F1F32", border:"1px solid rgba(0,180,216,0.15)", borderRadius:8, padding:"9px 12px", color:"#e2e8f0", fontSize:13, outline:"none", fontFamily:"system-ui", boxSizing:"border-box" }} />
              </div>
            </>
          )}

          <button onClick={generate} disabled={loading||!premise.trim()}
            style={{ background: loading||!premise.trim() ? "#0F1F32" : "linear-gradient(135deg,#1E3A5F,#00B4D8)", color: loading||!premise.trim() ? "#374151" : "#fff", border:"none", borderRadius:10, padding:"13px", fontSize:14, fontWeight:700, cursor: loading||!premise.trim() ? "not-allowed":"pointer", fontFamily:"system-ui" }}>
            {loading ? "Writing..." : mode === "outline" ? "📋 Generate Outline" : "✍️ Write Chapter"}
          </button>
        </div>

        {/* Output */}
        <div>
          {output ? (
            <div style={{ background:"#0F1F32", border:"1px solid rgba(0,180,216,0.12)", borderRadius:14, padding:"20px 24px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
                <span style={{ fontSize:13, fontWeight:700, color:"#00B4D8" }}>
                  {mode === "outline" ? "📋 Book Outline" : `✍️ Chapter ${chapterNum}`}
                </span>
                <button onClick={() => navigator.clipboard?.writeText(output)}
                  style={{ background:"transparent", color:"#6B7280", border:"1px solid rgba(255,255,255,0.08)", borderRadius:6, padding:"3px 10px", fontSize:12, cursor:"pointer", fontFamily:"system-ui" }}>Copy</button>
              </div>
              <pre style={{ margin:0, fontSize:13, color:"#e2e8f0", lineHeight:1.75, whiteSpace:"pre-wrap", fontFamily:"system-ui" }}>{output}</pre>
            </div>
          ) : (
            <div style={{ background:"#0F1F32", border:"1px solid rgba(0,180,216,0.06)", borderRadius:14, padding:"80px 24px", textAlign:"center", color:"#374151" }}>
              <div style={{ fontSize:48, marginBottom:16 }}>{mode === "outline" ? "📋" : "✍️"}</div>
              <p style={{ fontSize:14 }}>{mode === "outline" ? "Your 10-chapter outline" : `Chapter ${chapterNum} content`} will appear here</p>
              {loading && <p style={{ fontSize:12, marginTop:8, color:"#6B7280" }}>Writing your {mode === "outline" ? "outline" : "chapter"}...</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}