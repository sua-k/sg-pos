"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { PrinterConfig } from "@/lib/hardware/printer"
import type { ScaleReading } from "@/lib/hardware/scale"

const STORAGE_KEY_PRINTER = "sg_pos_printer_config"
const STORAGE_KEY_SCALE_ENABLED = "sg_pos_scale_enabled"

function loadPrinterConfig(): PrinterConfig | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRINTER)
    if (!raw) return null
    return JSON.parse(raw) as PrinterConfig
  } catch {
    return null
  }
}

export function useHardware() {
  const [printerConfig] = useState<PrinterConfig | null>(() =>
    loadPrinterConfig()
  )
  const [scaleWeight, setScaleWeight] = useState<number | null>(null)
  const [scaleConnected, setScaleConnected] = useState(false)
  const deviceRef = useRef<BluetoothDevice | null>(null)

  // Lazy-import hardware modules only on client to avoid SSR issues
  const printReceipt = useCallback(
    async (receiptHtml: string): Promise<boolean> => {
      if (typeof window === "undefined") return false
      if (!printerConfig) return false
      const { printReceipt: _print } = await import("@/lib/hardware/printer")
      return _print(printerConfig, receiptHtml)
    },
    [printerConfig]
  )

  const openCashDrawer = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return false
    if (!printerConfig) return false
    const { openCashDrawer: _open } = await import("@/lib/hardware/printer")
    return _open(printerConfig)
  }, [printerConfig])

  const connectScale = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return false
    const { connectScale: _connect, onWeightChange } = await import(
      "@/lib/hardware/scale"
    )
    const device = await _connect()
    if (!device) return false

    deviceRef.current = device
    setScaleConnected(true)

    onWeightChange(device, (reading: ScaleReading) => {
      if (reading.stable) {
        setScaleWeight(reading.weight)
      }
    })

    device.addEventListener("gattserverdisconnected", () => {
      setScaleConnected(false)
      setScaleWeight(null)
      deviceRef.current = null
    })

    return true
  }, [])

  // Disconnect scale on unmount
  useEffect(() => {
    return () => {
      const device = deviceRef.current
      if (!device) return
      if (typeof window === "undefined") return
      import("@/lib/hardware/scale").then(({ disconnectScale }) => {
        disconnectScale(device)
      })
    }
  }, [])

  // Restore scale-enabled preference
  useEffect(() => {
    if (typeof window === "undefined") return
    const scaleEnabled = localStorage.getItem(STORAGE_KEY_SCALE_ENABLED)
    if (scaleEnabled === "true") {
      connectScale()
    }
  }, [connectScale])

  return {
    printReceipt,
    openCashDrawer,
    scaleWeight,
    scaleConnected,
    connectScale,
  }
}
