interface LoadingProps {
  message?: string
}

export function Loading({ message = "Running simulation..." }: LoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute inset-0 border-4 border-slate-700 rounded-full" />
        <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin" />
      </div>
      <p className="text-slate-300 text-lg">{message}</p>
    </div>
  )
}
