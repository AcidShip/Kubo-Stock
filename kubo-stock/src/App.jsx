import { useState } from 'react'
import KuboInventory from './kubo-inventory.jsx'
import KuboStudioSheets from './kubo-studio-sheets.jsx'
import KuboStudio from './kubo-studio.jsx'

const tabs = [
  { id: 'inventory', label: '📦 Inventaire', component: KuboInventory },
  { id: 'studio-sheets', label: '📋 Studio Sheets', component: KuboStudioSheets },
  { id: 'studio', label: '🎨 Studio', component: KuboStudio },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('inventory')

  const ActiveComponent = tabs.find(t => t.id === activeTab)?.component

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">🧊 Kubo Stock</h1>
          <nav className="flex gap-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {ActiveComponent && <ActiveComponent />}
      </main>
    </div>
  )
}
