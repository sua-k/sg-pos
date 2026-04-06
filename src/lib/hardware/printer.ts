export interface PrinterConfig {
  host: string
  port?: number
}

function buildPrintXml(receiptHtml: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<StarWebPrint xmlns="http://www.star-m.jp" xmlns:i="http://www.star-m.jp/StarWebPRNT/image">
  <SetEncoding value="UTF-8"/>
  <SetCharacterSpace value="0"/>
  <PrintHTML>${receiptHtml}</PrintHTML>
  <CutPaper feed="true"/>
</StarWebPrint>`
}

function buildCashDrawerXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<StarWebPrint xmlns="http://www.star-m.jp" xmlns:i="http://www.star-m.jp/StarWebPRNT/image">
  <SetEncoding value="UTF-8"/>
  <PeripheralChannel number="1"/>
</StarWebPrint>`
}

function getEndpoint(config: PrinterConfig): string {
  const port = config.port ?? 80
  return `http://${config.host}:${port}/StarWebPRNT/SendMessage`
}

export async function printReceipt(
  config: PrinterConfig,
  receiptHtml: string
): Promise<boolean> {
  if (typeof window === "undefined") return false
  try {
    const response = await fetch(getEndpoint(config), {
      method: "POST",
      headers: { "Content-Type": "application/xml" },
      body: buildPrintXml(receiptHtml),
    })
    return response.ok
  } catch {
    return false
  }
}

export async function openCashDrawer(config: PrinterConfig): Promise<boolean> {
  if (typeof window === "undefined") return false
  try {
    const response = await fetch(getEndpoint(config), {
      method: "POST",
      headers: { "Content-Type": "application/xml" },
      body: buildCashDrawerXml(),
    })
    return response.ok
  } catch {
    return false
  }
}

export async function isPrinterAvailable(
  config: PrinterConfig
): Promise<boolean> {
  if (typeof window === "undefined") return false
  try {
    const response = await fetch(getEndpoint(config), {
      method: "HEAD",
      signal: AbortSignal.timeout(3000),
    })
    return response.ok
  } catch {
    return false
  }
}
