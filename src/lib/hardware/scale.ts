export interface ScaleReading {
  weight: number
  stable: boolean
  unit: "g" | "oz"
}

// Sunford C1 BLE service/characteristic UUIDs (weight scale profile)
const WEIGHT_SCALE_SERVICE = "0000181d-0000-1000-8000-00805f9b34fb"
const WEIGHT_MEASUREMENT_CHARACTERISTIC = "00002a9d-0000-1000-8000-00805f9b34fb"

function parseWeightNotification(data: DataView): ScaleReading {
  // Weight Scale Measurement (Bluetooth SIG 0x2A9D) flags byte
  const flags = data.getUint8(0)
  const isImperial = (flags & 0x01) !== 0
  const stable = (flags & 0x04) !== 0

  // Weight is a uint16 at offset 1, in units of 5g (metric) or 0.01lb (imperial)
  const rawWeight = data.getUint16(1, true)

  if (isImperial) {
    const weightOz = rawWeight * 0.01 * 16 // lbs * 16 = oz
    return { weight: Math.round(weightOz * 10) / 10, stable, unit: "oz" }
  }

  const weightGrams = rawWeight * 5
  return { weight: weightGrams, stable, unit: "g" }
}

export async function connectScale(): Promise<BluetoothDevice | null> {
  if (typeof window === "undefined") return null
  if (!navigator.bluetooth) return null

  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [WEIGHT_SCALE_SERVICE] }],
      optionalServices: [WEIGHT_SCALE_SERVICE],
    })
    return device
  } catch {
    return null
  }
}

export function onWeightChange(
  device: BluetoothDevice,
  callback: (reading: ScaleReading) => void
): void {
  if (typeof window === "undefined") return
  if (!navigator.bluetooth) return

  async function subscribe() {
    try {
      const server = await device.gatt?.connect()
      if (!server) return

      const service = await server.getPrimaryService(WEIGHT_SCALE_SERVICE)
      const characteristic = await service.getCharacteristic(
        WEIGHT_MEASUREMENT_CHARACTERISTIC
      )

      await characteristic.startNotifications()
      characteristic.addEventListener(
        "characteristicvaluechanged",
        (event: Event) => {
          const target = event.target as BluetoothRemoteGATTCharacteristic
          if (target.value) {
            callback(parseWeightNotification(target.value))
          }
        }
      )
    } catch {
      // Device unreachable or BLE unavailable — silently ignore
    }
  }

  subscribe()
}

export function disconnectScale(device: BluetoothDevice): void {
  if (typeof window === "undefined") return
  try {
    device.gatt?.disconnect()
  } catch {
    // Ignore disconnect errors
  }
}
