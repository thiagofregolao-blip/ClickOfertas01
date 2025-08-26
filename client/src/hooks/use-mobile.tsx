import * as React from "react"

// Configuração das versões da aplicação
export const APP_VERSIONS = {
  MOBILE: 'Click Ofertas Paraguai Mobile',
  DESKTOP: 'Click Ofertas Paraguai Desktop'
} as const

export type AppVersionType = 'mobile' | 'desktop'

// Breakpoint para detecção de dispositivos (768px = tablet/desktop)
const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

// Hook para obter informações da versão atual
export function useAppVersion() {
  const isMobile = useIsMobile()
  
  return {
    isMobile,
    isDesktop: !isMobile,
    version: isMobile ? 'mobile' as const : 'desktop' as const,
    versionName: isMobile ? APP_VERSIONS.MOBILE : APP_VERSIONS.DESKTOP,
    breakpoint: MOBILE_BREAKPOINT
  }
}
