export type { PrinterConfig } from "./printer"
export { printReceipt, openCashDrawer, isPrinterAvailable } from "./printer"

export type { ScaleReading } from "./scale"
export { connectScale, onWeightChange, disconnectScale } from "./scale"

export type { LabelData } from "./label-printer"
export { printLabel } from "./label-printer"

export interface HardwareConfig {
  printer?: import("./printer").PrinterConfig
  scale?: { enabled: boolean }
  labelPrinter?: { host: string }
  cashDrawer?: { autoOpen: boolean }
}
