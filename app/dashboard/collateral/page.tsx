'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UploadCloud, File, CheckCircle, AlertCircle, X } from 'lucide-react'

export default function CollateralPage() {
  const [file, setFile] = useState<File | null>(null)
  const [industry, setIndustry] = useState('')
  const [dealStage, setDealStage] = useState('')
  const [documentType, setDocumentType] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const supabase = createClient()

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
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        throw new Error('You must be logged in to upload collateral.')
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('industry', industry)
      formData.append('deal_stage', dealStage)
      formData.append('document_type', documentType)

      // Assume the edge function validates token
      const { data, error } = await supabase.functions.invoke('upload-collateral', {
        body: formData,
      })

      if (error || (data && !data.success)) {
        throw new Error(error?.message || data?.error || 'Upload failed')
      }

      setUploadStatus('success')
      setFile(null)
      setIndustry('')
      setDealStage('')
      setDocumentType('')
      
    } catch (err: any) {
      console.error(err)
      setUploadStatus('error')
      setErrorMessage(err.message || 'An unexpected error occurred.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Marketing Collateral</h1>
        <p className="text-sm text-slate-400 mt-1">Upload PDFs, decks, and case studies to arm the Pre-Sales agents.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <form onSubmit={handleUpload} className="space-y-6">
          
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-300">File Upload</label>
            <div className="mt-2 flex justify-center rounded-lg border border-dashed border-slate-700 px-6 py-10 hover:bg-slate-800/50 transition-colors">
              <div className="text-center">
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <File className="mx-auto h-12 w-12 text-blue-500" />
                    <div className="text-sm text-slate-300 font-medium">{file.name}</div>
                    <div className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                    <button 
                      type="button" 
                      onClick={() => setFile(null)}
                      className="mt-2 text-xs text-red-400 hover:text-red-300 flex items-center gap-1 mx-auto"
                    >
                      <X className="w-3 h-3" /> Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="mx-auto h-12 w-12 text-slate-500" aria-hidden="true" />
                    <div className="mt-4 flex text-sm leading-6 text-slate-400 justify-center">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer rounded-md bg-transparent font-semibold text-blue-500 focus-within:outline-none hover:text-blue-400"
                      >
                        <span>Upload a file</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".pdf,.doc,.docx,.ppt,.pptx" />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs leading-5 text-slate-500">PDF, DOCX, PPTX up to 10MB</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <label htmlFor="industry" className="block text-sm font-medium leading-6 text-slate-300">Industry</label>
              <div className="mt-2">
                <input
                  type="text"
                  name="industry"
                  id="industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="block w-full rounded-md border-0 bg-slate-800 py-1.5 text-white shadow-sm ring-1 ring-inset ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6 px-3"
                  placeholder="e.g. Healthcare"
                />
              </div>
            </div>

            <div>
              <label htmlFor="dealStage" className="block text-sm font-medium leading-6 text-slate-300">Deal Stage</label>
              <div className="mt-2">
                <select
                  id="dealStage"
                  name="dealStage"
                  value={dealStage}
                  onChange={(e) => setDealStage(e.target.value)}
                  className="block w-full rounded-md border-0 bg-slate-800 py-2 text-white shadow-sm ring-1 ring-inset ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6 px-3"
                >
                  <option value="">All Stages</option>
                  <option value="Discovery">Discovery</option>
                  <option value="Proposal">Proposal</option>
                  <option value="Negotiation">Negotiation</option>
                  <option value="Closed Won">Closed Won</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="documentType" className="block text-sm font-medium leading-6 text-slate-300">Document Type</label>
              <div className="mt-2">
                <select
                  id="documentType"
                  name="documentType"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="block w-full rounded-md border-0 bg-slate-800 py-2 text-white shadow-sm ring-1 ring-inset ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6 px-3"
                >
                  <option value="">Select Type...</option>
                  <option value="Case Study">Case Study</option>
                  <option value="Pitch Deck">Pitch Deck</option>
                  <option value="One Pager">One Pager</option>
                  <option value="Technical Specs">Technical Specs</option>
                </select>
              </div>
            </div>
          </div>

          {uploadStatus === 'error' && (
            <div className="rounded-md bg-red-900/30 p-4 border border-red-800">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-400">Upload failed</h3>
                  <div className="mt-2 text-sm text-red-300">
                    <p>{errorMessage}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {uploadStatus === 'success' && (
            <div className="rounded-md bg-green-900/30 p-4 border border-green-800">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-green-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-400">Upload successful</h3>
                  <div className="mt-2 text-sm text-green-300">
                    <p>Your collateral has been processed and is ready for use by agents.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={!file || isUploading}
              className="inline-flex justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Uploading & Processing...' : 'Upload Collateral'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
