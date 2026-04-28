'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { FileText, Download, CheckCircle, XCircle, MessageSquare, ShieldCheck, DollarSign } from 'lucide-react'
import { updateContractStatusAction } from './actions'

interface Contract {
  id: string
  total_value?: number | null
  status: string
  created_at: string
  leads?: {
    company_name?: string | null
    first_name?: string | null
    last_name?: string | null
    email?: string | null
  }
  terms?: {
    markdown_content?: string | null
  }
}

export function ClosingClient() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchContracts = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('contracts')
          .select('*, leads(company_name, first_name, last_name, email)')
          .order('created_at', { ascending: false })

        if (!error && data) {
          setContracts(data)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchContracts()
    const channel = supabase
      .channel('contract-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts' }, () => {
        fetchContracts()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  async function handleUpdateStatus(id: string, status: string) {
    try {
      await updateContractStatusAction(id, status)
    } catch (error) {
      console.error(error)
      alert("Failed to update status")
    }
  }

  function downloadContract(contract: Contract) {
    const content = contract.terms?.markdown_content || '# No Content'
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Contract_${contract.leads?.company_name.replace(/\s+/g, '_')}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-indigo-600" />
            Closing & Contracts
          </h1>
          <p className="text-gray-500 mt-2">
            Finalize deals, review AI-drafted negotiations, and manage service agreements.
          </p>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex items-center gap-4">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Pipeline Value</p>
            <p className="text-xl font-bold text-indigo-900">
              ${contracts.reduce((acc, curr) => acc + (curr.total_value || 0), 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : contracts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No active contracts</h3>
            <p className="text-gray-500 max-w-sm mx-auto mt-2">
              Move leads to the closing stage to generate automated service agreements and handle negotiations.
            </p>
          </div>
        ) : (
          <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Prospect</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Value</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <FileText className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{contract.leads?.company_name}</div>
                          <div className="text-xs text-gray-500">{contract.leads?.first_name} {contract.leads?.last_name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">${(contract.total_value || 0).toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        contract.status === 'signed' ? 'bg-green-100 text-green-800' :
                        contract.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {contract.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(contract.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => downloadContract(contract)}
                          className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                          title="Download Draft"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        {contract.status === 'draft' && (
                          <button
                            onClick={() => handleUpdateStatus(contract.id, 'sent')}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Send to Client"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        )}
                        {contract.status === 'sent' && (
                          <button
                            onClick={() => handleUpdateStatus(contract.id, 'signed')}
                            className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                            title="Mark as Signed"
                          >
                            <ShieldCheck className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleUpdateStatus(contract.id, 'cancelled')}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Cancel Deal"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Negotiation Section (derived from recent activity or similar) */}
      <div className="space-y-4 pt-8">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-amber-500" />
          Active Negotiations
        </h2>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="bg-amber-100 p-3 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-amber-900">AI Negotiation Support Active</h3>
              <p className="text-sm text-amber-800 mt-1">
                The Negotiation Crew is automatically drafting ROI justifications for any price-related objections detected in emails or WhatsApp messages.
                Review these drafts in the &quot;Actions Pending Approval&quot; carousel on the main dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface AlertTriangleProps {
  className?: string;
}

function AlertTriangle(props: AlertTriangleProps) {
  const { className, ...rest } = props;
  return (
    <svg
      {...rest}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  )
}
