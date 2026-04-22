import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Submit() {
  const [cue, setCue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [s, setS] = useState({ title: '', bpm: '', key: '', instruments: '', duration: '', mp3_url: '' })
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
    const updates = {}
    if (s.title) updates.title = s.title
    if (s.bpm) updates.bpm = s.bpm
    if (s.key) updates.key = s.key
    if (s.instruments) updates.instruments = s.instruments
    if (s.duration) updates.duration = s.duration
    if (s.mp3_url) { updates.mp3_url = s.mp3_url; updates.mp3_name = s.mp3_url }
    updates.stage = 'pending mixouts'
    const { error } = await supabase.from('cues').update(updates).eq('id', cue.id)
    if (error) { setMsg('Something went wrong. Please try again.'); return }
    setSubmitted(true)
  }

  const inp = { width: '100%', fontSize: 14, padding: '9px 12px', border: '0.5px solid #ddd', borderRadius: 8, background: '#fff', color: '#111', marginTop: 3, boxSizing: 'border-box' }
  const lbl = { display: 'block', fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 2, marginTop: 16 }

  if (loading) return <div style={{ fontF
