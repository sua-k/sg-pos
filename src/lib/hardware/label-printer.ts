export interface LabelData {
  productName: string
  strainType?: string
  thc?: number
  cbd?: number
  weight?: number
  pricePerGram?: number
  expiryDate?: string
  batchNumber?: string
}

function buildLabelPayload(label: LabelData): Record<string, string> {
  const lines: string[] = []

  lines.push(label.productName)
  if (label.strainType) lines.push(`Type: ${label.strainType}`)
  if (label.thc !== undefined) lines.push(`THC: ${label.thc}%`)
  if (label.cbd !== undefined) lines.push(`CBD: ${label.cbd}%`)
  if (label.weight !== undefined) lines.push(`Weight: ${label.weight}g`)
  if (label.pricePerGram !== undefined)
    lines.push(`Price: ฿${label.pricePerGram}/g`)
  if (label.expiryDate) lines.push(`Exp: ${label.expiryDate}`)
  if (label.batchNumber) lines.push(`Batch: ${label.batchNumber}`)

  return {
    text: lines.join("\n"),
    productName: label.productName,
    strainType: label.strainType ?? "",
    thc: label.thc?.toString() ?? "",
    cbd: label.cbd?.toString() ?? "",
    weight: label.weight?.toString() ?? "",
    pricePerGram: label.pricePerGram?.toString() ?? "",
    expiryDate: label.expiryDate ?? "",
    batchNumber: label.batchNumber ?? "",
  }
}

export async function printLabel(
  host: string,
  label: LabelData
): Promise<boolean> {
  if (typeof window === "undefined") return false

  try {
    const payload = buildLabelPayload(label)

    // Brother QL-820NWB accepts POST requests to its embedded web server
    const response = await fetch(`http://${host}/print`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    return response.ok
  } catch {
    return false
  }
}
