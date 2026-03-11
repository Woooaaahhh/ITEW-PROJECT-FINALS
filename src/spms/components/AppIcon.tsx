export function AppIcon({ className }: { className?: string }) {
  return (
    <div
      className={className}
      style={{
        borderRadius: 16,
        padding: 10,
        background: 'rgba(37, 99, 235, .18)',
        border: '1px solid rgba(37, 99, 235, .25)',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <i className="bi bi-mortarboard-fill text-white" />
    </div>
  )
}

