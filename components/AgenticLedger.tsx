import { Log } from '@/types/ledger';
import {
  CheckCircle2,
  XCircle,
  DollarSign,
  Activity,
  Search,
  Clock,
  TrendingUp,
} from 'lucide-react';

// Mock data for demonstration - in real app, this would come from Supabase
const mockLogs: Log[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    agentName: 'LinkedIn Validator',
    action: 'linkedin_validation',
    outcome: 'VALIDATED',
    details: {
      linkedinUrl: 'https://linkedin.com/in/johndoe',
      score: 85,
      isActive: true,
      profileQuality: 90,
      linkedInQualityScore: 88,
      exaSearchDepth: 3,
      costSaved: 12.50,
      reasoning: 'LinkedIn profile validated successfully with score 85/100.'
    },
    costSaved: 12.50
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    agentName: 'LinkedIn Validator',
    action: 'linkedin_validation',
    outcome: 'REJECTED',
    details: {
      linkedinUrl: 'https://linkedin.com/in/ghostlead',
      score: 25,
      isActive: false,
      profileQuality: 30,
      linkedInQualityScore: 28,
      exaSearchDepth: 1,
      reasoning: 'LinkedIn profile appears inactive or low quality (score: 25/100).'
    }
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    agentName: 'LinkedIn Validator',
    action: 'linkedin_validation',
    outcome: 'VALIDATED',
    details: {
      linkedinUrl: 'https://linkedin.com/in/smithj',
      score: 92,
      isActive: true,
      profileQuality: 95,
      linkedInQualityScore: 94,
      exaSearchDepth: 4,
      costSaved: 18.75,
      reasoning: 'LinkedIn profile validated successfully with score 92/100.'
    },
    costSaved: 18.75
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    agentName: 'LinkedIn Validator',
    action: 'linkedin_validation',
    outcome: 'REJECTED',
    details: {
      linkedinUrl: 'https://linkedin.com/in/fakeprofile',
      score: 15,
      isActive: false,
      profileQuality: 20,
      linkedInQualityScore: 18,
      exaSearchDepth: 1,
      reasoning: 'LinkedIn profile appears inactive or low quality (score: 15/100).'
    }
  },
  {
    id: '5',
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    agentName: 'LinkedIn Validator',
    action: 'linkedin_validation',
    outcome: 'VALIDATED',
    details: {
      linkedinUrl: 'https://linkedin.com/in/WilsonA',
      score: 78,
      isActive: true,
      profileQuality: 82,
      linkedInQualityScore: 80,
      exaSearchDepth: 2,
      costSaved: 9.25,
      reasoning: 'LinkedIn profile validated successfully with score 78/100.'
    },
    costSaved: 9.25
  }
];

export default function AgenticLedger() {
  return (
    <div className="bg-gray-900 text-gray-100 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            Agentic Ledger
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Real-time AI validation audit trail • Last updated: {new Date().toLocaleTimeString()}
          </p>
        </header>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-700/50 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <div>
                    <p className="text-xs text-gray-400">Validated</p>
                    <p className="text-lg font-semibold">{mockLogs.filter(l => l.outcome === 'VALIDATED').length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-700/50 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <XCircle className="h-4 w-4 text-rose-400" />
                  <div>
                    <p className="text-xs text-gray-400">Rejected</p>
                    <p className="text-lg font-semibold">{mockLogs.filter(l => l.outcome === 'REJECTED').length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-700/50 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-4 w-4 text-amber-400" />
                  <div>
                    <p className="text-xs text-gray-400">Cost Saved</p>
                    <p className="text-lg font-semibold">
                      ${mockLogs.reduce((sum, log) => sum + (log.costSaved || 0), 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-700/50 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <Activity className="h-4 w-4 text-blue-400" />
                  <div>
                    <p className="text-xs text-gray-400">Avg. Quality</p>
                    <p className="text-lg font-semibold">
                      {Math.round(
                        mockLogs.reduce((sum, log) => sum + (log.details?.linkedInQualityScore || 0), 0) /
                          mockLogs.length
                      )}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Logs Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-700/50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Agent
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Outcome
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      LinkedIn Quality
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Exa Depth
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Cost Saved
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {mockLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <Clock className="h-4 w-4 text-gray-500 mr-2" />
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 bg-gray-700 rounded-full flex items-center justify-center">
                            <div className="h-4 w-4 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full" />
                          </div>
                          <span className="font-medium">{log.agentName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-300">
                        {log.action}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap flex items-center">
                        {log.outcome === 'VALIDATED' ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-emerald-400 mr-2" />
                            <span className="text-emerald-300">VALIDATED</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-rose-400 mr-2" />
                            <span className="text-rose-300">REJECTED</span>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-blue-400" />
                          <span className="font-mono">
                            {log.details?.linkedInQualityScore ?? 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Search className="h-4 w-4 text-purple-400" />
                          <span className="font-mono">
                            {log.details?.exaSearchDepth ?? 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {log.costSaved ? (
                          <div className="flex items-center gap-2 bg-amber-900/30 px-3 py-1 rounded text-amber-300">
                            <DollarSign className="h-4 w-4" />
                            <span className="font-medium">${log.costSaved.toFixed(2)}</span>
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm max-w-xs">
                        <p className="line-clamp-2">{log.details?.reasoning || ''}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <footer className="mt-8 text-center text-xs text-gray-500">
          <p>
            AI Mission Control • Powered by Exa Research • {' '}
            <a href="#" className="hover:text-gray-300">
              View Documentation
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}