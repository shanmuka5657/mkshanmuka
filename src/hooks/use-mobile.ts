"use client"

import * as React from "react"

export function useIsMobile(breakpoint: number = 768) {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkSize = () => setIsMobile(window.innerWidth <= breakpoint)

    checkSize() // run on mount
    window.addEventListener("resize", checkSize)

    return () => window.removeEventListener("resize", checkSize)
  }, [breakpoint])

  return isMobile
}
