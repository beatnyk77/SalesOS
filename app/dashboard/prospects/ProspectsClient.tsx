'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UploadCloud, File, CheckCircle, AlertCircle, X, Loader2, Play, Users } from 'lucide-react'
import { evaluateProspectListAction } from './actions'

interface ProspectList {
  id: string
  name: string
  total_count: number
  processed_count: number
  status: string
  created_at: string
}

export function ProspectsClient() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isEvaluating, setIsEvaluating] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [prospectLists, setProspectLists] = useState<ProspectList[]>([])
  
  const supabase = createClient()

  useEffect(() => {
    fetchProspectLists()
    
    // Subscribe to changes
    const channel = supabase
      .channel('prospect_lists_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prospect_lists' }, () => {
        fetchProspectLists()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchProspectLists = async () => {
    const { data, error } = await supabase
      .from('prospect_lists')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setProspectLists(data)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setUploadStatus('idle')
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setIsUploading(true)
    setUploadStatus('idle')
    setErrorMessage('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not logged in')

      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', file.name.split('.')[0])

      const { data, error } = await supabase.functions.invoke('process-bulk-prospects', {
        body: formData,
      })

      if (error || (data && !data.success)) {
        throw new Error(error?.message || data?.error || 'Upload failed')
      }

      setUploadStatus('success')
      setFile(null)
      fetchProspectLists()
      
    } catch (err: any) {
      setUploadStatus('error')
      setErrorMessage(err.message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleEvaluate = async (listId: string) => {
    setIsEvaluating(listId)
    try {
      await evaluateProspectListAction(listId)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsEvaluating(null)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-500" />
          Bulk Prospect Upload
        </h1>
        <p className="text-sm text-slate-400 mt-1">Upload CSV lists of prospects to enrich, score, and qualify in bulk.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Column */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-slate-300 mb-4">New Upload</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="flex justify-center rounded-lg border border-dashed border-slate-700 px-6 py-8 hover:bg-slate-800/50 transition-colors cursor-pointer relative">
                <input 
                  type="file" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={handleFileChange} 
                  accept=".csv" 
                />
                <div className="text-center">
                  {file ? (
                    <div className="flex flex-col items-center gap-1">
                      <File className="h-8 w-8 text-blue-500" />
                      <div className="text-xs text-slate-300 font-medium truncate max-w-[150px]">{file.name}</div>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="mx-auto h-8 w-8 text-slate-500" />
                      <div className="mt-2 text-xs text-slate-400">
                        <span className="text-blue-500 font-semibold">Click to upload</span> or drag
                      </div>
                      <p className="text-[10px] text-slate-600 mt-1">CSV only (max 5MB)</p>
                    </>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={!file || isUploading}
                className="w-full inline-flex justify-center rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
              >
                {isUploading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null}
                {isUploading ? 'Parsing...' : 'Upload & Parse'}
              </button>
            </form>

            {uploadStatus === 'error' && (
              <div className="mt-4 text-[11px] text-red-400 bg-red-900/20 p-2 rounded border border-red-800/50">
                {errorMessage}
              </div>
            )}
          </div>
        </div>

        {/* List Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-slate-300">Upload History</h2>
              <span className="text-[10px] text-slate-500">{prospectLists.length} lists total</span>
            </div>
            
            <div className="divide-y divide-slate-800">
              {prospectLists.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-sm text-slate-500">No uploads yet.</p>
                </div>
              ) : (
                prospectLists.map((list) => (
                  <div key={list.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-slate-200">{list.name}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2">
                        <span>{new Date(list.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <CheckCircle className={`w-3 h-3 ${list.status === 'completed' ? 'text-green-500' : 'text-yellow-500'}`} />
                          {list.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right space-y-1">
                        <div className="text-xs font-semibold text-slate-300">
                          {list.processed_count} / {list.total_count}
                        </div>
                        <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 transition-all duration-500" 
                            style={{ width: `${(list.processed_count / (list.total_count || 1)) * 100}%` }}
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => handleEvaluate(list.id)}
                        disabled={list.status === 'processing' || isEvaluating === list.id}
                        className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-blue-400 hover:bg-slate-700 disabled:opacity-30 transition-all"
                        title="Run AI Evaluation"
                      >
                        {isEvaluating === list.id || list.status === 'processing' ? (
                          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        ) : (
                          <Play className="w-4 h-4 fill-current" />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
