interface AlertProps {
  type: 'success' | 'error' | 'info'
  title: string
  message: string
  onClose?: () => void
}

const colors = {
  success: 'bg-green-500/10 border-green-500/30 text-green-300',
  error: 'bg-red-500/10 border-red-500/30 text-red-300',
  info: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200',
}

export function Alert({ type, title, message, onClose }: AlertProps) {
  return (
    <div className={`${colors[type]} border rounded-lg p-4 mb-4 flex justify-between items-start gap-3`}>
      <div>
        <h4 className="font-bold tracking-wide">{title}</h4>
        <p className="text-sm mt-1 opacity-90">{message}</p>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-xl opacity-50 hover:opacity-100 leading-none"
        >
          ×
        </button>
      )}
    </div>
  )
}
