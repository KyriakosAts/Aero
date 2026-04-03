import { ReactNode } from 'react'

interface CardProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export function Card({ title, description, children, className = '' }: CardProps) {
  return (
    <div className={`card p-6 ${className}`}>
      <h3 className="text-xl md:text-2xl font-bold mb-2">{title}</h3>
      {description && <p className="text-slate-300 text-sm mb-4">{description}</p>}
      {children}
    </div>
  )
}
