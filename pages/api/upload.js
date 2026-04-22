import { useState, useEffect } from 'react'

export default function Submit() {
  const [cue, setCue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [s, setS] = useState({ title: '', bpm: '', key: '', instruments: '', duration: '' })
  const [mp3File, setMp3File] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('id')
    if (id) fetchCue(id)
  }, [])

  async function fetchCue(id) {
    const { data } = await supabase.from('cues').select('*').eq('id', id).single()
    setCue(data)
    setLoading(false)
  }

  async function submit() {
    if (!cue) return
    if (!mp3File) { setMsg('Please attach an MP3 file before submitting.'); return }
    setUploading(true)
    setMsg('Uploading MP3...')
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: mp3File.name, contentType: mp3File.type }),
      })
      const { presignedUrl, publicUrl } = await res.json()

      await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mp3File.type },
        body: mp3File,
      })

      setMsg('Saving submission...')
      const updates = {}
      if (s.title) updates.title = s.title
      if (s.bpm) updates.bpm = s.bpm
      if (s.key) updates.key = s.key
      if (s.instruments) updates.instruments = s.instruments
      if (s.duration) updates.duration = s.duration
      updates.mp3_url = publicUrl
      updates.mp3_name = mp3File.name
      updates.stage = 'pending mixouts'
      const { error } = await supabase.from('cues').update(updates).eq('id', cue.id)
      if (error) { setMsg('Something went wrong saving your submission.'); setUploading(false); return }
      setSubmitted(true)
    } catch (e) {
      setMsg('Upload failed. Please try again.')
      setUploading(false)
    }
  }

  const inp = { width: '100%', fontSize: 14, padding: '9px 12px', border: '0.5px solid #ddd', borderRadius: 8, background: '#fff', color: '#111', marginTop: 3, boxSizing: 'border-box' }
  const lbl = { display: 'block', fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 2, marginTop: 16 }

  if (loading) return <div style={{ fontFamily: 'system-ui', padding: '3rem', textAlign: 'center', color: '#aaa' }}>Loading...</div>
  if (!cue) return <div style={{ fontFamily: 'system-ui', padding: '3rem', textAlign: 'center', color: '#aaa' }}>Assignment not found.</div>

  if (submitted) return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 540, margin: '4rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
      <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: 8 }}>Submitted!</h1>
      <p style={{ color: '#888', fontSize: 14 }}>Your delivery has been received. We will be in touch.</p>
    </div>
  )

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 540, margin: '0 auto', padding: '2rem 1.5rem', color: '#111' }}>
      <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>song<span style={{ color: '#1D9E75' }}>tracker</span></div>
      <div style={{ fontSize: 12, color: '#aaa', marginBottom: 16 }}>Producer submission form</div>

      <div style={{ background: '#f5f5f3', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Assignment details</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
          {[['Project', cue.project], ['Assignment', cue.assignment], ['Producer', cue.composer], ['Deadline', cue.deadline ? new Date(cue.deadline).toLocaleDateString() : '—'], ['Priority', cue.priority], ['Lead', cue.lead]].map(([label, val]) => (
            <div key={label}>
              <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: 2 }}>{label}</div>
              <div>{val || '—'}</div>
            </div>
          ))}
        </div>
        {cue.brief && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '0.5px solid #e5e5e5' }}>
            <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: 6 }}>Creative brief</div>
            <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{cue.brief}</div>
          </div>
        )}
      </div>

      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>Your delivery</div>
      <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Fill in your track details and attach your MP3.</div>

      <label style={lbl}>Track title</label>
      <input value={s.title} onChange={e => setS(x => ({...x, title: e.target.value}))} style={inp} placeholder="e.g. Late Night Drive" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div><label style={lbl}>BPM</label><input value={s.bpm} onChange={e => setS(x => ({...x, bpm: e.target.value}))} style={inp} placeholder="e.g. 92" /></div>
        <div><label style={lbl}>Key</label><input value={s.key} onChange={e => setS(x => ({...x, key: e.target.value}))} style={inp} placeholder="e.g. F minor" /></div>
      </div>

      <label style={lbl}>Featured instruments</label>
      <input value={s.instruments} onChange={e => setS(x => ({...x, instruments: e.target.value}))} style={inp} placeholder="e.g. Guitar, Bass, Drums" />

      <label style={lbl}>Duration</label>
      <input value={s.duration} onChange={e => setS(x => ({...x, duration: e.target.value}))} style={inp} placeholder="e.g. 1:32" />

      <label style={lbl}>MP3 file</label>
      <div style={{ marginTop: 3, border: '1px dashed #ddd', borderRadius: 8, padding: '1rem', textAlign: 'center', cursor: 'pointer', background: mp3File ? '#E1F5EE' : '#fafaf8' }} onClick={() => document.getElementById('mp3input').click()}>
        <input id="mp3input" type="file" accept="audio/mp3,audio/mpeg" style={{ display: 'none' }} onChange={e => setMp3File(e.target.files[0])} />
        {mp3File ? (
          <div style={{ fontSize: 13, color: '#0F6E56', fontWeight: 500 }}>{mp3File.name}</div>
        ) : (
          <div style={{ fontSize: 13, color: '#aaa' }}>Click to select your MP3 file</div>
        )}
      </div>

      {msg && <div style={{ fontSize: 13, color: uploading ? '#854F0B' : '#A32D2D', marginTop: 12 }}>{msg}</div>}

      <button onClick={submit} disabled={uploading} style={{ marginTop: 24, width: '100%', height: 44, background: uploading ? '#aaa' : '#1D9E75', color: 'white', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: uploading ? 'not-allowed' : 'pointer' }}>
        {uploading ? 'Uploading...' : 'Submit delivery'}
      </button>
    </div>
  )
}
