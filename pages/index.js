import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const STAGES = ['work in progress', 'pending mixouts', 'pending client review', 'complete']
const PRIORITIES = ['High', 'Medium', 'Low']
const QCS = ['', 'PASS', 'FAIL', 'HOLD']

function parseDate(s) {
  if (!s) return null
  const d = new Date(s)
  return isNaN(d) ? null : d
}

function isOverdue(c) {
  const d = parseDate(c.deadline)
  const today = new Date(); today.setHours(0,0,0,0)
  return d && d < today && c.stage !== 'complete'
}

function StageBadge({ stage }) {
  const styles = {
    'work in progress': { background: '#E6F1FB', color: '#185FA5' },
    'pending mixouts': { background: '#FAEEDA', color: '#854F0B' },
    'pending client review': { background: '#EEEDFE', color: '#534AB7' },
    'complete': { background: '#E1F5EE', color: '#0F6E56' },
  }
  const labels = {
    'work in progress': 'WIP',
    'pending mixouts': 'mixouts',
    'pending client review': 'in review',
    'complete': 'complete',
  }
  const s = styles[stage] || {}
  return <span style={{ ...s, padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 500 }}>{labels[stage] || stage}</span>
}

function PriBadge({ priority }) {
  const styles = { High: { background: '#FCEBEB', color: '#A32D2D' }, Medium: { background: '#FAEEDA', color: '#854F0B' }, Low: { background: '#EAF3DE', color: '#3B6D11' } }
  const s = styles[priority] || {}
  return <span style={{ ...s, padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 500 }}>{priority}</span>
}

function QcBadge({ qc }) {
  if (!qc) return <span style={{ color: '#aaa' }}>—</span>
  const styles = { PASS: { background: '#E1F5EE', color: '#0F6E56' }, FAIL: { background: '#FCEBEB', color: '#A32D2D' }, HOLD: { background: '#FAEEDA', color: '#854F0B' } }
  const s = styles[qc] || {}
  return <span style={{ ...s, padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 500 }}>{qc}</span>
}

export default function Home() {
  const [cues, setCues] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [filterPri, setFilterPri] = useState('')
  const [filterComp, setFilterComp] = useState('')
  const [filterCo, setFilterCo] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(null)
  const [submitForm, setSubmitForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState('0:00')

  useEffect(() => { fetchCues() }, [])

  async function fetchCues() {
    setLoading(true)
    const { data, error } = await supabase.from('cues').select('*').order('id', { ascending: false })
    if (!error) setCues(data || [])
    setLoading(false)
  }

  async function saveCue(data, isNew) {
    setSaving(true)
    if (isNew) {
      const maxId = cues.length ? Math.max(...cues.map(c => c.id || 0)) : 19000
      data.id = maxId + 1
      await supabase.from('cues').insert([data])
    } else {
      await supabase.from('cues').update(data).eq('id', data.id)
    }
    await fetchCues()
    setSaving(false)
    setForm(null)
  }

  async function deleteCue(id) {
    if (!confirm('Delete this cue? This cannot be undone.')) return
    await supabase.from('cues').delete().eq('id', id)
    await fetchCues()
    setModal(null)
  }

  const today = new Date(); today.setHours(0,0,0,0)
  const total = cues.length
  const active = cues.filter(c => c.stage !== 'complete').length
  const overdue = cues.filter(isOverdue).length
  const complete = cues.filter(c => c.stage === 'complete').length

  const producers = [...new Set(cues.map(c => c.composer).filter(Boolean))]
  const companies = [...new Set(cues.map(c => c.company).filter(Boolean))]

  const filtered = cues.filter(c => {
    if (activeTab === 'wip' && c.stage !== 'work in progress') return false
    if (activeTab === 'pending' && !c.stage?.startsWith('pending')) return false
    if (activeTab === 'complete' && c.stage !== 'complete') return false
    if (filterPri && c.priority !== filterPri) return false
    if (filterComp && c.composer !== filterComp) return false
    if (filterCo && c.company !== filterCo) return false
    if (search && !`${c.id} ${c.title} ${c.project} ${c.assignment} ${c.company}`.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  function openDetail(c) { setModal(c) }
  function openEdit(c) { setForm({ ...c, _isNew: false }) }
  function openNew() {
    setForm({ _isNew: true, stage: 'work in progress', priority: 'Medium', id: '', title: '', company: '', project: '', assignment: '', composer: '', lead: '', assigned: '', deadline: '', qc: '', bpm: '', key: '', instruments: '', duration: '', brief: '', mp3_name: '', mp3_url: '' })
  }

  function togglePlay() {
    if (!audioRef.current) return
    if (playing) { audioRef.current.pause(); setPlaying(false) }
    else { audioRef.current.play(); setPlaying(true) }
  }

  const inp = { width: '100%', fontSize: 13, padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 8, background: '#fff', color: '#111', marginTop: 2 }
  const lbl = { display: 'block', fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: 2 }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'system-ui, sans-serif', color: '#111' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 20, fontWeight: 500 }}>song<span style={{ color: '#1D9E75' }}>tracker</span></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setSubmitForm(true)} style={{ height: 32, padding: '0 12px', fontSize: 13, background: 'transparent', border: '0.5px solid #ccc', borderRadius: 8, cursor: 'pointer' }}>producer portal</button>
          <button onClick={openNew} style={{ height: 32, padding: '0 14px', fontSize: 13, fontWeight: 500, background: '#1D9E75', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>+ new cue</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: '1.25rem' }}>
        {[['Total', total, false], ['Active', active, false], ['Overdue', overdue, overdue > 0], ['Complete', complete, false]].map(([label, val, red]) => (
          <div key={label} style={{ background: '#f5f5f3', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 500, color: red ? '#A32D2D' : '#111' }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', borderBottom: '0.5px solid #e5e5e5', marginBottom: '1rem' }}>
        {[['all','All'],['wip','WIP'],['pending','Pending'],['complete','Complete']].map(([k,l]) => (
          <div key={k} onClick={() => setActiveTab(k)} style={{ padding: '7px 13px', fontSize: 13, cursor: 'pointer', color: activeTab===k ? '#1D9E75' : '#888', borderBottom: activeTab===k ? '2px solid #1D9E75' : '2px solid transparent', fontWeight: activeTab===k ? 500 : 400, marginBottom: -0.5 }}>{l}</div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, project, assignment..." style={{ ...inp, flex: 1, minWidth: 140, marginTop: 0 }} />
        <select value={filterPri} onChange={e => setFilterPri(e.target.value)} style={{ ...inp, width: 'auto', marginTop: 0 }}>
          <option value="">All priorities</option>
          {PRIORITIES.map(p => <option key={p}>{p}</option>)}
        </select>
        <select value={filterComp} onChange={e => setFilterComp(e.target.value)} style={{ ...inp, width: 'auto', marginTop: 0 }}>
          <option value="">All producers</option>
          {producers.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={filterCo} onChange={e => setFilterCo(e.target.value)} style={{ ...inp, width: 'auto', marginTop: 0 }}>
          <option value="">All companies</option>
          {companies.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ border: '0.5px solid #e5e5e5', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? <div style={{ padding: '2rem', textAlign: 'center', color: '#aaa' }}>Loading...</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f5f3' }}>
                {[['#',55],['Title',155],['Assignment',130],['Stage',105],['Priority',72],['Due',85],['QC',55],['♪',40]].map(([h,w]) => (
                  <th key={h} style={{ width: w, padding: '9px 10px', textAlign: 'left', fontWeight: 500, fontSize: 11, color: '#888', borderBottom: '0.5px solid #e5e5e5', textTransform: 'uppercase', letterSpacing: '.3px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: '#bbb' }}>No cues match your filters.</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} onClick={() => openDetail(c)} style={{ borderBottom: '0.5px solid #e5e5e5', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background='#f9f9f7'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <td style={{ padding: '9px 10px', color: '#aaa', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.id}</td>
                  <td style={{ padding: '9px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title || <span style={{ color: '#ccc' }}>untitled</span>}</td>
                  <td style={{ padding: '9px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.assignment}</td>
                  <td style={{ padding: '9px 10px' }}><StageBadge stage={c.stage} /></td>
                  <td style={{ padding: '9px 10px' }}><PriBadge priority={c.priority} /></td>
                  <td style={{ padding: '9px 10px', color: isOverdue(c) ? '#A32D2D' : '#111', fontWeight: isOverdue(c) ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.deadline ? new Date(c.deadline).toLocaleDateString('en-US',{month:'numeric',day:'numeric',year:'numeric'}) : '—'}</td>
                  <td style={{ padding: '9px 10px' }}><QcBadge qc={c.qc} /></td>
                  <td style={{ padding: '9px 10px', textAlign: 'center', color: c.mp3_url ? '#1D9E75' : '#ddd' }}>▶</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '3rem 1rem', zIndex: 100 }} onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #e5e5e5', width: 580, maxHeight: '85vh', overflowY: 'auto', padding: '1.5rem' }}>
            <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: '1rem' }}>{modal.title || 'Untitled cue'} <span style={{ fontSize: 13, fontWeight: 400, color: '#aaa' }}>#{modal.id}</span></h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: '1rem' }}>
              {[['Company', modal.company],['Project', modal.project],['Assignment', modal.assignment],['Stage', null, <StageBadge stage={modal.stage} />],['Priority', null, <PriBadge priority={modal.priority} />],['QC', null, <QcBadge qc={modal.qc} />],['Producer', modal.composer],['Lead', modal.lead],['Assigned', modal.assigned ? new Date(modal.assigned).toLocaleDateString() : '—'],['Deadline', modal.deadline ? new Date(modal.deadline).toLocaleDateString() : '—', null, isOverdue(modal)],['BPM', modal.bpm],['Key', modal.key],['Duration', modal.duration],['Instruments', modal.instruments]].map(([label, val, node, od]) => (
                <div key={label} style={{ fontSize: 13 }}>
                  <span style={{ display: 'block', fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: 2 }}>{label}</span>
                  {node || <span style={{ color: od ? '#A32D2D' : '#111', fontWeight: od ? 500 : 400 }}>{val || '—'}</span>}
                </div>
              ))}
            </div>
            {modal.brief && <>
              <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: 4 }}>Creative brief</div>
              <div style={{ background: '#f5f5f3', borderRadius: 8, padding: 12, fontSize: 13, color: '#555', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 180, overflowY: 'auto', marginBottom: '1rem' }}>{modal.brief}</div>
            </>}
            {modal.mp3_url && <>
              <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: 6 }}>MP3</div>
              <div style={{ background: '#f5f5f3', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
                <button onClick={togglePlay} style={{ width: 32, height: 32, borderRadius: '50%', background: '#1D9E75', border: 'none', cursor: 'pointer', color: 'white', fontSize: 12 }}>{playing ? '⏸' : '▶'}</button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6 }}>{modal.mp3_name}</div>
                  <div style={{ height: 3, background: '#ddd', borderRadius: 2 }}><div style={{ height: '100%', width: `${progress}%`, background: '#1D9E75', borderRadius: 2 }} /></div>
                </div>
                <div style={{ fontSize: 11, color: '#aaa' }}>{currentTime}</div>
                <audio ref={audioRef} src={modal.mp3_url} onTimeUpdate={() => { if (audioRef.current) { const p = audioRef.current.duration ? audioRef.current.currentTime / audioRef.current.duration * 100 : 0; setProgress(p); const t = Math.floor(audioRef.current.currentTime); setCurrentTime(Math.floor(t/60)+':'+(t%60<10?'0':'')+t%60) } }} onEnded={() => setPlaying(false)} />
              </div>
            </>}
            <div style={{ background: '#f5f5f3', borderRadius: 8, padding: '12px 14px', marginBottom: '1rem' }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Producer submission link</div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Share with your producer to submit track details.</div>
              <div style={{ fontSize: 12, color: '#185FA5', background: '#fff', borderRadius: 6, padding: '8px 10px', border: '0.5px solid #ddd', wordBreak: 'break-all', cursor: 'pointer' }} onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/submit?id=${modal.id}`)}>
                {typeof window !== 'undefined' ? `${window.location.origin}/submit?id=${modal.id}` : `/submit?id=${modal.id}`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '0.5px solid #e5e5e5' }}>
              <button onClick={() => deleteCue(modal.id)} style={{ height: 32, padding: '0 12px', fontSize: 13, background: 'transparent', border: '0.5px solid #F09595', borderRadius: 8, cursor: 'pointer', color: '#A32D2D', marginRight: 'auto' }}>Delete</button>
              <button onClick={() => setModal(null)} style={{ height: 32, padding: '0 12px', fontSize: 13, background: 'transparent', border: '0.5px solid #ddd', borderRadius: 8, cursor: 'pointer' }}>Close</button>
              <button onClick={() => { setModal(null); openEdit(modal) }} style={{ height: 32, padding: '0 14px', fontSize: 13, fontWeight: 500, background: '#1D9E75', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Edit</button>
            </div>
          </div>
        </div>
      )}

      {form && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '3rem 1rem', zIndex: 100 }} onClick={e => { if (e.target === e.currentTarget) setForm(null) }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #e5e5e5', width: 580, maxHeight: '85vh', overflowY: 'auto', padding: '1.5rem' }}>
            <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: '1rem' }}>{form._isNew ? 'New cue' : `Edit cue #${form.id}`}</h2>
            {[
              [['Seq #','id','text',!form._isNew],['Track title','title','text',false]],
              [['Company','company','text',false],['Project','project','text',false]],
            ].map((row,ri) => (
              <div key={ri} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '.85rem' }}>
                {row.map(([label,field,type,ro]) => (
                  <div key={field}>
                    <label style={lbl}>{label}</label>
                    <input type={type} value={form[field]||''} readOnly={ro} onChange={e => setForm(f => ({...f,[field]:e.target.value}))} style={{...inp,background:ro?'#f5f5f3':'#fff'}} />
                  </div>
                ))}
              </div>
            ))}
            <div style={{ marginBottom: '.85rem' }}>
              <label style={lbl}>Assignment / genre</label>
              <input value={form.assignment||''} onChange={e => setForm(f=>({...f,assignment:e.target.value}))} style={inp} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '.85rem' }}>
              <div><label style={lbl}>Stage</label><select value={form.stage||'work in progress'} onChange={e=>setForm(f=>({...f,stage:e.target.value}))} style={inp}>{STAGES.map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label style={lbl}>Priority</label><select value={form.priority||'Medium'} onChange={e=>setForm(f=>({...f,priority:e.target.value}))} style={inp}>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</select></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '.85rem' }}>
              <div><label style={lbl}>Producer</label><input value={form.composer||''} onChange={e=>setForm(f=>({...f,composer:e.target.value}))} style={inp} /></div>
              <div><label style={lbl}>Lead</label><input value={form.lead||''} onChange={e=>setForm(f=>({...f,lead:e.target.value}))} style={inp} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '.85rem' }}>
              <div><label style={lbl}>Assigned</label><input type="date" value={form.assigned||''} onChange={e=>setForm(f=>({...f,assigned:e.target.value}))} style={inp} /></div>
              <div><label style={lbl}>Deadline</label><input type="date" value={form.deadline||''} onChange={e=>setForm(f=>({...f,deadline:e.target.value}))} style={inp} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '.85rem' }}>
              <div><label style={lbl}>BPM</label><input value={form.bpm||''} onChange={e=>setForm(f=>({...f,bpm:e.target.value}))} style={inp} /></div>
              <div><label style={lbl}>Key</label><input value={form.key||''} onChange={e=>setForm(f=>({...f,key:e.target.value}))} style={inp} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '.85rem' }}>
              <div><label style={lbl}>Duration</label><input value={form.duration||''} onChange={e=>setForm(f=>({...f,duration:e.target.value}))} style={inp} placeholder="1:30" /></div>
              <div><label style={lbl}>QC</label><select value={form.qc||''} onChange={e=>setForm(f=>({...f,qc:e.target.value}))} style={inp}>{QCS.map(q=><option key={q} value={q}>{q||'—'}</option>)}</select></div>
            </div>
            <div style={{ marginBottom: '.85rem' }}>
              <label style={lbl}>Featured instruments</label>
              <input value={form.instruments||''} onChange={e=>setForm(f=>({...f,instruments:e.target.value}))} style={inp} />
            </div>
            <div style={{ marginBottom: '.85rem' }}>
              <label style={lbl}>Creative brief</label>
              <textarea value={form.brief||''} onChange={e=>setForm(f=>({...f,brief:e.target.value}))} style={{...inp,minHeight:80,lineHeight:1.5,resize:'vertical'}} />
            </div>
            <div style={{ marginBottom: '.85rem' }}>
              <label style={lbl}>MP3 URL</label>
              <input value={form.mp3_url||''} onChange={e=>setForm(f=>({...f,mp3_url:e.target.value}))} style={inp} placeholder="https://..." />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '0.5px solid #e5e5e5' }}>
              {!form._isNew && <button onClick={() => { deleteCue(form.id); setForm(null) }} style={{ height: 32, padding: '0 12px', fontSize: 13, background: 'transparent', border: '0.5px solid #F09595', borderRadius: 8, cursor: 'pointer', color: '#A32D2D', marginRight: 'auto' }}>Delete</button>}
              <button onClick={() => setForm(null)} style={{ height: 32, padding: '0 12px', fontSize: 13, background: 'transparent', border: '0.5px solid #ddd', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => saveCue(form, form._isNew)} disabled={saving} style={{ height: 32, padding: '0 14px', fontSize: 13, fontWeight: 500, background: '#1D9E75', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', opacity: saving ? .7 : 1 }}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {submitForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '3rem 1rem', zIndex: 100 }} onClick={e => { if (e.target === e.currentTarget) setSubmitForm(false) }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #e5e5e5', width: 500, maxHeight: '85vh', overflowY: 'auto', padding: '1.5rem' }}>
            <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: '.5rem' }}>Producer submission portal</h2>
            <p style={{ fontSize: 13, color: '#888', marginBottom: '1rem', lineHeight: 1.6 }}>Producers fill this in to submit completed track details.</p>
            <SubmitFormContent onDone={async () => { await fetchCues(); setSubmitForm(false) }} />
          </div>
        </div>
      )}
    </div>
  )
}

function SubmitFormContent({ onDone }) {
  const [s, setS] = useState({ id: '', title: '', bpm: '', key: '', instruments: '', duration: '', mp3_url: '' })
  const [msg, setMsg] = useState('')
  const inp = { width: '100%', fontSize: 13, padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 8, background: '#fff', color: '#111', marginTop: 2 }
  const lbl = { display: 'block', fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: 2 }

  async function submit() {
    const id = parseInt(s.id)
    if (!id) { setMsg('Please enter a valid cue #'); return }
    const updates = {}
    if (s.title) updates.title = s.title
    if (s.bpm) updates.bpm = s.bpm
    if (s.key) updates.key = s.key
    if (s.instruments) updates.instruments = s.instruments
    if (s.duration) updates.duration = s.duration
    if (s.mp3_url) { updates.mp3_url = s.mp3_url; updates.mp3_name = s.mp3_url }
    updates.stage = 'pending mixouts'
    const { error } = await supabase.from('cues').update(updates).eq('id', id)
    if (error) { setMsg('Error: cue #' + id + ' not found'); return }
    setMsg('Submitted! Cue #' + id + ' updated.')
    setTimeout(onDone, 1500)
  }

  return <>
    <div style={{ marginBottom: '.85rem' }}><label style={lbl}>Cue # (seq)</label><input value={s.id} onChange={e=>setS(x=>({...x,id:e.target.value}))} style={inp} placeholder="e.g. 19266" /></div>
    <div style={{ marginBottom: '.85rem' }}><label style={lbl}>Track title</label><input value={s.title} onChange={e=>setS(x=>({...x,title:e.target.value}))} style={inp} /></div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '.85rem' }}>
      <div><label style={lbl}>BPM</label><input value={s.bpm} onChange={e=>setS(x=>({...x,bpm:e.target.value}))} style={inp} /></div>
      <div><label style={lbl}>Key</label><input value={s.key} onChange={e=>setS(x=>({...x,key:e.target.value}))} style={inp} /></div>
    </div>
    <div style={{ marginBottom: '.85rem' }}><label style={lbl}>Featured instruments</label><input value={s.instruments} onChange={e=>setS(x=>({...x,instruments:e.target.value}))} style={inp} /></div>
    <div style={{ marginBottom: '.85rem' }}><label style={lbl}>Duration</label><input value={s.duration} onChange={e=>setS(x=>({...x,duration:e.target.value}))} style={inp} placeholder="1:30" /></div>
    <div style={{ marginBottom: '.85rem' }}><label style={lbl}>MP3 URL</label><input value={s.mp3_url} onChange={e=>setS(x=>({...x,mp3_url:e.target.value}))} style={inp} placeholder="Paste a link to your MP3" /></div>
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '0.5px solid #e5e5e5' }}>
      {msg && <span style={{ fontSize: 13, color: '#1D9E75', alignSelf: 'center', marginRight: 'auto' }}>{msg}</span>}
      <button onClick={submit} style={{ height: 32, padding: '0 14px', fontSize: 13, fontWeight: 500, background: '#1D9E75', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Submit</button>
    </div>
  </>
}
