import { ReactNode } from 'react'

interface TabsProps {
  tabs: Array<{
    label: string
    value: string
    icon?: ReactNode
  }>
  activeTab: string
  onTabChange: (value: string) => void
  children: ReactNode
}

export function Tabs({ tabs, activeTab, onTabChange, children }: TabsProps) {
  return (
    <div>
      <div className="inline-flex flex-wrap gap-2 rounded-xl border border-slate-700 bg-slate-900/70 p-1.5 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onTabChange(tab.value)}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
              activeTab === tab.value
                ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40'
                : 'text-slate-400 border border-transparent hover:text-slate-200 hover:bg-slate-800/70'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      {children}
    </div>
  )
}
