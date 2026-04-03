import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 1. Create 5 branches
  const branches = await Promise.all([
    prisma.branch.create({ data: { name: 'Siam Green PP', code: 'PP', address: 'Phrom Phong, Bangkok', phone: '02-XXX-0001' } }),
    prisma.branch.create({ data: { name: 'Siam Green SL', code: 'SL', address: 'Sala Daeng, Bangkok', phone: '02-XXX-0002' } }),
    prisma.branch.create({ data: { name: 'Siam Green CT', code: 'CT', address: 'Chatuchak, Bangkok', phone: '02-XXX-0003' } }),
    prisma.branch.create({ data: { name: 'Siam Green CW', code: 'CW', address: 'Charoen Krung, Bangkok', phone: '02-XXX-0004' } }),
    prisma.branch.create({ data: { name: 'Siam Green NN', code: 'NN', address: 'Nonthaburi, Bangkok', phone: '02-XXX-0005' } }),
  ])

  // 2. Create 6 categories
  const categories = await Promise.all([
    prisma.category.create({ data: { name: 'Flowers', soldByWeight: true } }),
    prisma.category.create({ data: { name: 'Edibles', soldByWeight: false } }),
    prisma.category.create({ data: { name: 'CBD Oil', soldByWeight: false } }),
    prisma.category.create({ data: { name: 'Beverages', soldByWeight: false } }),
    prisma.category.create({ data: { name: 'Papers', soldByWeight: false } }),
    prisma.category.create({ data: { name: 'Bongs & Pipes', soldByWeight: false } }),
  ])

  // 3. Create 2 suppliers
  const suppliers = await Promise.all([
    prisma.supplier.create({ data: { name: 'Green Valley Farm', licenseNo: 'SUP-001', contactName: 'Somchai', phone: '081-XXX-0001' } }),
    prisma.supplier.create({ data: { name: 'Highland Organics', licenseNo: 'SUP-002', contactName: 'Nattapong', phone: '081-XXX-0002' } }),
  ])

  // 4. Create 10 products (mix of weight-based flowers and fixed-price items)
  const products = await Promise.all([
    // Flowers (sold by weight)
    prisma.product.create({ data: { name: 'OG Kush', strainType: 'indica', sku: 'FL-001', priceTHB: 500, pricePerGram: 500, costTHB: 250, costPerGram: 250, soldByWeight: true, thcPercentage: 22.5, cbdPercentage: 0.5, categoryId: categories[0].id, supplierId: suppliers[0].id, batchNumber: 'B2026-001', expiryDate: new Date('2026-07-01') } }),
    prisma.product.create({ data: { name: 'Blue Dream', strainType: 'hybrid', sku: 'FL-002', priceTHB: 450, pricePerGram: 450, costTHB: 220, costPerGram: 220, soldByWeight: true, thcPercentage: 21.0, cbdPercentage: 2.0, categoryId: categories[0].id, supplierId: suppliers[0].id, batchNumber: 'B2026-002', expiryDate: new Date('2026-08-15') } }),
    prisma.product.create({ data: { name: 'Sour Diesel', strainType: 'sativa', sku: 'FL-003', priceTHB: 550, pricePerGram: 550, costTHB: 280, costPerGram: 280, soldByWeight: true, thcPercentage: 25.0, cbdPercentage: 0.3, categoryId: categories[0].id, supplierId: suppliers[1].id, batchNumber: 'B2026-003', expiryDate: new Date('2026-06-30') } }),
    prisma.product.create({ data: { name: 'Northern Lights', strainType: 'indica', sku: 'FL-004', priceTHB: 480, pricePerGram: 480, costTHB: 240, costPerGram: 240, soldByWeight: true, thcPercentage: 18.0, cbdPercentage: 1.0, categoryId: categories[0].id, supplierId: suppliers[0].id, batchNumber: 'B2026-004', expiryDate: new Date('2026-09-01') } }),
    prisma.product.create({ data: { name: 'Jack Herer', strainType: 'sativa', sku: 'FL-005', priceTHB: 520, pricePerGram: 520, costTHB: 260, costPerGram: 260, soldByWeight: true, thcPercentage: 23.0, cbdPercentage: 0.8, categoryId: categories[0].id, supplierId: suppliers[1].id, batchNumber: 'B2026-005', expiryDate: new Date('2026-07-15') } }),
    // Edibles
    prisma.product.create({ data: { name: 'THC Gummies (10pc)', sku: 'ED-001', priceTHB: 350, costTHB: 150, soldByWeight: false, thcPercentage: 10.0, cbdPercentage: 0, categoryId: categories[1].id, supplierId: suppliers[0].id, expiryDate: new Date('2026-12-01') } }),
    prisma.product.create({ data: { name: 'CBD Brownie', sku: 'ED-002', priceTHB: 180, costTHB: 80, soldByWeight: false, thcPercentage: 0.3, cbdPercentage: 15.0, categoryId: categories[1].id, supplierId: suppliers[1].id, expiryDate: new Date('2026-10-15') } }),
    // CBD Oil
    prisma.product.create({ data: { name: 'Full Spectrum CBD Oil 30ml', sku: 'CBD-001', priceTHB: 1200, costTHB: 600, soldByWeight: false, thcPercentage: 0.2, cbdPercentage: 30.0, categoryId: categories[2].id, supplierId: suppliers[0].id, expiryDate: new Date('2027-01-01') } }),
    // Beverages
    prisma.product.create({ data: { name: 'CBD Sparkling Water', sku: 'BEV-001', priceTHB: 120, costTHB: 50, soldByWeight: false, cbdPercentage: 5.0, categoryId: categories[3].id, supplierId: suppliers[1].id, expiryDate: new Date('2026-11-01') } }),
    // Papers
    prisma.product.create({ data: { name: 'RAW King Size Papers', sku: 'PAP-001', priceTHB: 80, costTHB: 35, soldByWeight: false, categoryId: categories[4].id, supplierId: suppliers[0].id } }),
  ])

  // 5. Create inventory for PP branch (all products)
  for (const product of products) {
    await prisma.inventory.create({
      data: { productId: product.id, branchId: branches[0].id, quantity: product.soldByWeight ? 50 : 20 }
    })
  }

  // 6. Create cost layers for PP branch products (for FIFO)
  for (const product of products) {
    await prisma.costLayer.create({
      data: {
        productId: product.id,
        branchId: branches[0].id,
        quantityInitial: product.soldByWeight ? 50 : 20,
        quantityRemaining: product.soldByWeight ? 50 : 20,
        unitCostTHB: product.costTHB ?? 0,
        receivedAt: new Date('2026-03-15'),
        batchNumber: product.batchNumber,
      }
    })
  }

  // 7. Create 3 customers with Thai IDs and DOBs
  const customers = await Promise.all([
    prisma.customer.create({ data: { idNumber: '1100700123456', idType: 'national_id', name: 'Somchai Jaidee', dateOfBirth: new Date('1990-05-15'), nationality: 'Thai', phone: '089-XXX-1111' } }),
    prisma.customer.create({ data: { idNumber: '1100700789012', idType: 'national_id', name: 'Natthaya Srisuwan', dateOfBirth: new Date('1985-11-22'), nationality: 'Thai', phone: '089-XXX-2222' } }),
    prisma.customer.create({ data: { idNumber: 'P12345678', idType: 'passport', name: 'John Smith', dateOfBirth: new Date('1988-03-10'), nationality: 'American', phone: '089-XXX-3333' } }),
  ])

  // 8. Create 2 prescribers
  const prescribers = await Promise.all([
    prisma.prescriber.create({ data: { name: 'นพ. สมศักดิ์ รักษาดี', licenseNo: 'พท.ป. 12345', licenseType: 'พท.ป.', professionType: 'thai_traditional', address: '123 Sukhumvit Rd, Bangkok' } }),
    prisma.prescriber.create({ data: { name: 'พญ. วิภา สุขใจ', licenseNo: 'พว. 67890', licenseType: 'พว.', professionType: 'medical', address: '456 Silom Rd, Bangkok' } }),
  ])

  // 9. Create 2 prescriptions
  const prescriptions = await Promise.all([
    prisma.prescription.create({ data: { customerId: customers[0].id, prescriptionNo: 'RX-PP-20260401-001', prescriberId: prescribers[0].id, issuedDate: new Date('2026-04-01'), expiryDate: new Date('2026-05-01'), dailyDosageG: 1.0, numDays: 30, totalAllowedG: 30.0, consumedG: 0, diagnosis: 'นอนไม่หลับเรื้อรัง', createdInPos: true, branchId: branches[0].id } }),
    prisma.prescription.create({ data: { customerId: customers[1].id, prescriptionNo: 'RX-PP-20260402-001', prescriberId: prescribers[1].id, issuedDate: new Date('2026-04-02'), expiryDate: new Date('2026-05-02'), dailyDosageG: 0.5, numDays: 30, totalAllowedG: 15.0, consumedG: 0, diagnosis: 'ปวดเรื้อรัง', createdInPos: true, branchId: branches[0].id } }),
  ])

  // 10. Create 3 users (IMPORTANT: these are placeholders — real users will come from Supabase Auth)
  // Using placeholder authUserIds since we don't have Supabase Auth set up yet
  await Promise.all([
    prisma.user.create({ data: { authUserId: 'placeholder-admin-001', email: 'admin@siamgreen.co', name: 'Admin User', role: 'admin', branchId: branches[0].id } }),
    prisma.user.create({ data: { authUserId: 'placeholder-manager-001', email: 'manager@siamgreen.co', name: 'Manager PP', role: 'manager', branchId: branches[0].id } }),
    prisma.user.create({ data: { authUserId: 'placeholder-staff-001', email: 'staff@siamgreen.co', name: 'Staff PP', role: 'staff', branchId: branches[0].id } }),
  ])

  console.log('Seed completed successfully!')
  console.log(`Created: 5 branches, 6 categories, 2 suppliers, 10 products, inventory + cost layers for PP, 3 customers, 2 prescribers, 2 prescriptions, 3 users`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
