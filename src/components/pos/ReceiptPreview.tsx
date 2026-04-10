'use client'

import { format } from 'date-fns'
import { formatTHB } from '@/lib/utils/format'
import { Button } from '@/components/ui/button'
import { Printer, X } from 'lucide-react'
import Decimal from 'decimal.js'

export interface ReceiptData {
  receiptNumber: string
  createdAt: string
  branch: {
    name: string
    code: string
    address: string | null
    phone: string | null
  }
  customer: {
    name: string
    maskedId: string
  }
  cashier: string
  items: Array<{
    name: string
    quantity: string
    unitPrice: string
    weightGrams: string | null
    pricePerGram: string | null
    subtotal: string
    vat: string
    total: string
  }>
  subtotalTHB: string
  vatTHB: string
  vatRate: string
  totalTHB: string
  paymentMethod: string
  status: string
  taxInfo: {
    companyName: string
    taxId: string
  }
  receiptHeader?: string | null
  receiptFooter?: string | null
}

interface ReceiptPreviewProps {
  receipt: ReceiptData
  onClose?: () => void
  onPrint?: () => void
}

const DASH_LINE = '- - - - - - - - - - - - - - - - - -'

export function ReceiptPreview({ receipt, onClose, onPrint }: ReceiptPreviewProps) {
  const handlePrint = () => {
    if (onPrint) {
      onPrint()
    } else {
      window.print()
    }
  }

  const dateObj = new Date(receipt.createdAt)
  const formattedDate = format(dateObj, 'dd/MM/yyyy HH:mm')
  const vatRateNum = new Decimal(receipt.vatRate).toNumber()

  const paymentLabel: Record<string, string> = {
    cash: 'Cash',
    card: 'Card',
    transfer: 'Transfer',
  }

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          body > *:not(#receipt-print-area) { display: none !important; }
          #receipt-print-area { display: block !important; position: fixed; top: 0; left: 0; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex flex-col gap-4">
        {/* Action buttons (hidden when printing) */}
        <div className="no-print flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4 mr-1" />
              Close
            </Button>
          )}
        </div>

        {/* Receipt body */}
        <div
          id="receipt-print-area"
          className="bg-white text-black mx-auto"
          style={{
            width: '300px',
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '12px',
            lineHeight: '1.4',
            padding: '12px',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '4px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
              {receipt.taxInfo.companyName}
            </div>
            <div>{receipt.branch.name}</div>
            {receipt.branch.address && (
              <div style={{ fontSize: '11px' }}>{receipt.branch.address}</div>
            )}
            {receipt.branch.phone && (
              <div style={{ fontSize: '11px' }}>Tel: {receipt.branch.phone}</div>
            )}
            <div style={{ fontSize: '11px' }}>
              Tax ID: {receipt.taxInfo.taxId}
            </div>
          </div>

          {receipt.receiptHeader && (
            <div style={{ textAlign: 'center', fontSize: '11px', marginBottom: '4px', whiteSpace: 'pre-line' }}>
              {receipt.receiptHeader}
            </div>
          )}

          <div style={{ textAlign: 'center', color: '#555', fontSize: '11px', marginBottom: '4px' }}>
            {DASH_LINE}
          </div>

          {/* Transaction info */}
          <div style={{ marginBottom: '4px' }}>
            <div>Receipt #: {receipt.receiptNumber}</div>
            <div>Date: {formattedDate}</div>
            <div>Cashier: {receipt.cashier}</div>
            <div>Payment: {paymentLabel[receipt.paymentMethod] ?? receipt.paymentMethod}</div>
          </div>

          <div style={{ textAlign: 'center', color: '#555', fontSize: '11px', marginBottom: '4px' }}>
            {DASH_LINE}
          </div>

          {/* Items */}
          <div style={{ marginBottom: '4px' }}>
            {receipt.items.map((item, idx) => {
              const isWeightBased = item.weightGrams !== null && item.pricePerGram !== null
              const total = formatTHB(item.total)

              return (
                <div key={idx} style={{ marginBottom: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ flex: 1, marginRight: '4px' }}>{item.name}</span>
                    <span style={{ whiteSpace: 'nowrap' }}>{total}</span>
                  </div>
                  {isWeightBased ? (
                    <div style={{ paddingLeft: '8px', fontSize: '11px', color: '#444' }}>
                      {new Decimal(item.weightGrams!).toFixed(2)}g &times;{' '}
                      {formatTHB(item.pricePerGram!)}/g
                    </div>
                  ) : (
                    <div style={{ paddingLeft: '8px', fontSize: '11px', color: '#444' }}>
                      {new Decimal(item.quantity).toFixed(0)} &times;{' '}
                      {formatTHB(item.unitPrice)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div style={{ textAlign: 'center', color: '#555', fontSize: '11px', marginBottom: '4px' }}>
            {DASH_LINE}
          </div>

          {/* Totals */}
          <div style={{ marginBottom: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal (ex-VAT):</span>
              <span>{formatTHB(receipt.subtotalTHB)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>VAT {vatRateNum}%:</span>
              <span>{formatTHB(receipt.vatTHB)}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 'bold',
                fontSize: '14px',
                marginTop: '4px',
              }}
            >
              <span>TOTAL:</span>
              <span>{formatTHB(receipt.totalTHB)}</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', color: '#555', fontSize: '11px', marginBottom: '4px' }}>
            {DASH_LINE}
          </div>

          {/* Customer info */}
          {(receipt.customer.maskedId || receipt.customer.name) && (
            <div style={{ marginBottom: '4px', fontSize: '11px' }}>
              {receipt.customer.name && (
                <div>Customer: {receipt.customer.name}</div>
              )}
              {receipt.customer.maskedId && (
                <div>ID: {receipt.customer.maskedId}</div>
              )}
              <div style={{ color: '#888', fontSize: '10px' }}>
                Prescription ref: — (Phase 2)
              </div>
            </div>
          )}

          {receipt.status === 'voided' && (
            <div
              style={{
                textAlign: 'center',
                color: 'red',
                fontWeight: 'bold',
                fontSize: '16px',
                border: '2px solid red',
                padding: '4px',
                marginBottom: '4px',
              }}
            >
              *** VOIDED ***
            </div>
          )}

          <div style={{ textAlign: 'center', color: '#555', fontSize: '11px', marginBottom: '4px' }}>
            {DASH_LINE}
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', fontSize: '11px', whiteSpace: 'pre-line' }}>
            {receipt.receiptFooter
              ? receipt.receiptFooter
              : (<><div>ขอบคุณที่ใช้บริการ</div><div>Thank you for your purchase</div></>)
            }
          </div>

          <div style={{ textAlign: 'center', color: '#555', fontSize: '11px', marginTop: '4px' }}>
            {DASH_LINE}
          </div>
        </div>
      </div>
    </>
  )
}

