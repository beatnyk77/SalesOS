'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Send, Edit3, CheckCircle, XCircle, MessageSquare } from 'lucide-react'
import { approveWhatsAppMessageAction, rejectWhatsAppMessageAction } from './actions'

interface WhatsAppLead {
  first_name: string | null
  last_name: string | null
  company_name: string | null
}

interface WhatsAppMessage {
  id: string
  message_body: string
  reasoning: string
  phone_number: string
  status: string
  created_at: string
  updated_at: string
  leads: WhatsAppLead
}

export function WhatsAppClient() {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')
  const supabase = createClientComponentClient()

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*, leads(first_name, last_name, company_name)')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setMessages(data)
      }
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    const handleFetchMessages = async () => {
      await fetchMessages()
    }

    handleFetchMessages()

    const channel = supabase
      .channel('whatsapp-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_messages' }, () => {
        handleFetchMessages()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchMessages])

  async function handleApprove(id: string) {
    try {
      const body = editingId === id ? editBody : undefined
      await approveWhatsAppMessageAction(id, body)
      setEditingId(null)
    } catch (error) {
      console.error(error)
      alert("Failed to approve message")
    }
  }

  async function handleReject(id: string) {
    try {
      await rejectWhatsAppMessageAction(id)
      setEditingId(null)
    } catch (error) {
      console.error(error)
      alert("Failed to reject message")
    }
  }

  function startEdit(msg: WhatsAppMessage) {
    setEditingId(msg.id)
    setEditBody(msg.message_body)
  }

  const pendingMessages = messages.filter(m => m.status === 'draft')
  const historyMessages = messages.filter(m => m.status !== 'draft')

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-green-600" />
          WhatsApp Nurturer
        </h1>
        <p className="text-gray-500 mt-2">
          Review and approve AI-generated WhatsApp follow-ups before they are sent to prospects.
        </p>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Pending Approval ({pendingMessages.length})</h2>
        {loading ? (
          <div className="text-sm text-gray-500 animate-pulse">Loading queued messages...</div>
        ) : pendingMessages.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900">No pending messages</h3>
            <p className="text-sm text-gray-500 mt-1">Your AI Nurturer has no queued follow-ups.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingMessages.map(msg => (
              <div key={msg.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md">
                <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {msg.leads?.first_name} {msg.leads?.last_name}
                    </h3>
                    <p className="text-sm text-gray-500">{msg.leads?.company_name}</p>
                    <p className="text-xs text-gray-400 mt-1 font-mono">{msg.phone_number}</p>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                    Draft
                  </span>
                </div>
                
                <div className="p-5 flex-1 flex flex-col gap-3">
                  <div className="text-xs text-gray-500 bg-blue-50/50 p-2 rounded border border-blue-100">
                    <span className="font-semibold text-blue-700">AI Reasoning:</span> {msg.reasoning}
                  </div>
                  
                  {editingId === msg.id ? (
                    <textarea
                      value={editBody}
                      onChange={e => setEditBody(e.target.value)}
                      className="w-full text-sm text-gray-800 p-3 rounded-lg border border-green-300 focus:ring-green-500 focus:border-green-500 resize-none h-32"
                    />
                  ) : (
                    <div className="bg-green-50 rounded-lg p-3 text-sm text-gray-800 whitespace-pre-wrap flex-1 border border-green-100 relative group">
                      {msg.message_body}
                      <button 
                        onClick={() => startEdit(msg)}
                        className="absolute top-2 right-2 p-1.5 bg-white rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50 text-gray-500"
                        title="Edit message"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                  <button
                    onClick={() => handleApprove(msg.id)}
                    className="flex-1 inline-flex justify-center items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    Approve & Send
                  </button>
                  <button
                    onClick={() => handleReject(msg.id)}
                    className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                    title="Reject"
                  >
                    <XCircle className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {historyMessages.length > 0 && (
        <div className="space-y-4 pt-8">
          <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">History</h2>
          <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
            <ul role="list" className="divide-y divide-gray-200">
              {historyMessages.map(msg => (
                <li key={msg.id}>
                  <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {msg.status === 'sent' ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {msg.leads?.first_name} {msg.leads?.last_name} ({msg.leads?.company_name})
                        </p>
                      </div>
                      <div className="ml-2 flex-shrink-0 flex">
                        <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          msg.status === 'sent' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {msg.status.charAt(0).toUpperCase() + msg.status.slice(1)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500 truncate max-w-2xl">
                          {msg.message_body}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <p>
                          {new Date(msg.updated_at).toLocaleDateString()} {new Date(msg.updated_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
