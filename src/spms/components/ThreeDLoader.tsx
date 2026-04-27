import type { CSSProperties } from 'react'

type ThreeDLoaderProps = {
  size?: number
  label?: string
  className?: string
}

export function ThreeDLoader({ size = 36, label = 'Loading', className }: ThreeDLoaderProps) {
  const px = `${size}px`

  return (
    <span className={['spms-3d-loader', className].filter(Boolean).join(' ')} style={{ ['--spms-3d-size' as any]: px } as CSSProperties}>
      <span className="visually-hidden">{label}</span>
      <span className="spms-3d-loader__scene" aria-hidden="true">
        <span className="spms-3d-loader__ring spms-3d-loader__ring--a" />
        <span className="spms-3d-loader__ring spms-3d-loader__ring--b" />
        <span className="spms-3d-loader__ring spms-3d-loader__ring--c" />
        <span className="spms-3d-loader__core" />
      </span>
    </span>
  )
}
