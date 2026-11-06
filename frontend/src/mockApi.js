// Client-side storage engine for GitHub Pages & offline fallback
const STORAGE_PREFIX = "medistock_demo_";

function getStorage(key, defaultValue) {
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStorage(key, value) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error("Storage error:", e);
  }
}

// Initial sample data
const DEFAULT_SUPPLIERS = [
  { _id: "sup_1", name: "Apex Healthcare Logistics", contactPerson: "Sarah Jenkins", email: "orders@apexhealth.com", phone: "+1 (555) 234-8901", address: "1402 Pharma Way, Suite 300, Chicago, IL" },
  { _id: "sup_2", name: "MediSource Distributors", contactPerson: "David Chen", email: "dchen@medisource.com", phone: "+1 (555) 876-5432", address: "880 Industrial Pkwy, Dallas, TX" },
  { _id: "sup_3", name: "BioGen Supply Co.", contactPerson: "Elena Rostova", email: "supply@biogenrx.com", phone: "+1 (555) 432-1098", address: "45 Innovation Blvd, Boston, MA" }
];

const now = Date.now();
const day = 86400000;

const DEFAULT_MEDICINES = [
  { _id: "med_1", name: "Amoxicillin 500mg", brand: "Amoxil", genericName: "Amoxicillin", sku: "MED-AMX-500", category: "Antibiotics", dosageForm: "Capsule", strength: "500mg", purchasePrice: 12, sellingPrice: 22, quantity: 85, lowStockThreshold: 20, batchNumber: "BX2026-09", expiryDate: new Date(now + 180 * day).toISOString(), supplier: "sup_1" },
  { _id: "med_2", name: "Paracetamol 650mg", brand: "Dolo", genericName: "Acetaminophen", sku: "MED-PCM-650", category: "Pain relief", dosageForm: "Tablet", strength: "650mg", purchasePrice: 3, sellingPrice: 7, quantity: 14, lowStockThreshold: 25, batchNumber: "BX2026-11", expiryDate: new Date(now + 240 * day).toISOString(), supplier: "sup_2" },
  { _id: "med_3", name: "Ibuprofen 400mg", brand: "Advil", genericName: "Ibuprofen", sku: "MED-IBU-400", category: "Pain relief", dosageForm: "Tablet", strength: "400mg", purchasePrice: 5, sellingPrice: 11, quantity: 120, lowStockThreshold: 30, batchNumber: "BX2026-05", expiryDate: new Date(now + 45 * day).toISOString(), supplier: "sup_1" },
  { _id: "med_4", name: "Metformin 500mg", brand: "Glucophage", genericName: "Metformin Hydrochloride", sku: "MED-MET-500", category: "Prescription", dosageForm: "Tablet", strength: "500mg", purchasePrice: 8, sellingPrice: 16, quantity: 9, lowStockThreshold: 15, batchNumber: "BX2026-08", expiryDate: new Date(now + 300 * day).toISOString(), supplier: "sup_3" },
  { _id: "med_5", name: "Cetirizine 10mg", brand: "Zyrtec", genericName: "Cetirizine HCl", sku: "MED-CET-010", category: "Cold & flu", dosageForm: "Tablet", strength: "10mg", purchasePrice: 4, sellingPrice: 9, quantity: 65, lowStockThreshold: 20, batchNumber: "BX2026-03", expiryDate: new Date(now + 60 * day).toISOString(), supplier: "sup_2" },
  { _id: "med_6", name: "Vitamin C 1000mg", brand: "C-Garde", genericName: "Ascorbic Acid", sku: "MED-VTC-100", category: "Vitamins & supplements", dosageForm: "Tablet", strength: "1000mg", purchasePrice: 6, sellingPrice: 14, quantity: 210, lowStockThreshold: 40, batchNumber: "BX2027-01", expiryDate: new Date(now + 400 * day).toISOString(), supplier: "sup_3" }
];

const DEFAULT_SALES = [
  { _id: "sale_1", invoiceNumber: "MS-98210341-22", customerName: "Eleanor Vance", items: [{ medicine: "med_1", medicineName: "Amoxicillin 500mg", sku: "MED-AMX-500", quantity: 2, unitPrice: 22 }, { medicine: "med_2", medicineName: "Paracetamol 650mg", sku: "MED-PCM-650", quantity: 3, unitPrice: 7 }], subtotal: 65, discount: 5, total: 60, paymentMethod: "Card", soldBy: { name: "Pranitha (Admin)" }, createdAt: new Date(now - 2 * day).toISOString() },
  { _id: "sale_2", invoiceNumber: "MS-98214512-84", customerName: "Marcus Brody", items: [{ medicine: "med_3", medicineName: "Ibuprofen 400mg", sku: "MED-IBU-400", quantity: 1, unitPrice: 11 }, { medicine: "med_6", medicineName: "Vitamin C 1000mg", sku: "MED-VTC-100", quantity: 2, unitPrice: 14 }], subtotal: 39, discount: 0, total: 39, paymentMethod: "Cash", soldBy: { name: "Pranitha (Admin)" }, createdAt: new Date(now - 1 * day).toISOString() }
];

export function initDemoData() {
  if (!getStorage("initialized", false)) {
    setStorage("suppliers", DEFAULT_SUPPLIERS);
    setStorage("medicines", DEFAULT_MEDICINES);
    setStorage("sales", DEFAULT_SALES);
    setStorage("staff", [{ id: "usr_1", name: "Pranitha (Admin)", email: "admin@medistock.com", role: "admin", createdAt: new Date().toISOString() }]);
    setStorage("initialized", true);
  }
}

export async function mockRequest(path, { method = "GET", body, token } = {}) {
  initDemoData();
  const parsedBody = body ? (typeof body === "string" ? JSON.parse(body) : body) : {};
  const [urlPath, queryString] = path.split("?");
  const query = new URLSearchParams(queryString || "");

  // Auth
  if (urlPath === "/auth/setup-status") {
    return { needsSetup: false };
  }
  if (urlPath === "/auth/setup" || urlPath === "/auth/register" || urlPath === "/auth/login") {
    const name = parsedBody.name || "Pharmacy Member";
    const email = parsedBody.email || "staff@medistock.com";
    const user = { id: "usr_" + Date.now(), name, email, role: "admin" };
    setStorage("currentUser", user);
    return { token: "demo-jwt-token-" + Date.now(), user };
  }
  if (urlPath === "/auth/me") {
    const user = getStorage("currentUser", { id: "usr_1", name: "Pranitha (Admin)", email: "admin@medistock.com", role: "admin" });
    return { user };
  }
  if (urlPath === "/auth/staff") {
    const staff = getStorage("staff", []);
    if (method === "POST") {
      const newUser = { id: "usr_" + Date.now(), name: parsedBody.name, email: parsedBody.email, role: parsedBody.role || "staff", createdAt: new Date().toISOString() };
      staff.push(newUser);
      setStorage("staff", staff);
      return { user: newUser };
    }
    return { staff };
  }

  // Dashboard
  if (urlPath === "/dashboard") {
    const medicines = getStorage("medicines", DEFAULT_MEDICINES);
    const sales = getStorage("sales", DEFAULT_SALES);
    const lowStock = medicines.filter(m => m.quantity <= (m.lowStockThreshold || 10));
    const expiring = medicines.filter(m => new Date(m.expiryDate) <= new Date(now + 90 * day));
    const totalRev = sales.reduce((sum, s) => sum + (s.total || 0), 0);

    const salesByMonth = [
      { _id: { month: 7 }, revenue: 1450, orders: 42 },
      { _id: { month: 8 }, revenue: 2100, orders: 58 },
      { _id: { month: 9 }, revenue: 1980, orders: 50 },
      { _id: { month: 10 }, revenue: 2600, orders: 67 },
      { _id: { month: 11 }, revenue: totalRev + 1200, orders: sales.length + 35 }
    ];

    return {
      stats: { inventory: medicines.length, lowStock: lowStock.length, expiring: expiring.length, revenue: totalRev + 1200, orders: sales.length + 35 },
      salesByMonth,
      recentSales: sales.slice(-6).reverse(),
      topMedicines: medicines.slice(0, 5).map(m => ({ _id: m.name, units: 45, revenue: m.sellingPrice * 45 })),
      lowStockItems: lowStock.slice(0, 5),
      expiringItems: expiring.slice(0, 5)
    };
  }

  // Medicines
  if (urlPath === "/medicines" || urlPath.startsWith("/medicines/")) {
    const medicines = getStorage("medicines", DEFAULT_MEDICINES);
    const suppliers = getStorage("suppliers", DEFAULT_SUPPLIERS);

    if (method === "GET") {
      const search = (query.get("search") || "").toLowerCase();
      const category = query.get("category");
      const status = query.get("status");

      let filtered = medicines.map(m => ({
        ...m,
        supplier: suppliers.find(s => s._id === m.supplier) || { name: "Direct Supply" }
      }));

      if (search) {
        filtered = filtered.filter(m => m.name.toLowerCase().includes(search) || m.brand.toLowerCase().includes(search) || m.sku.toLowerCase().includes(search));
      }
      if (category && category !== "All categories") {
        filtered = filtered.filter(m => m.category === category);
      }
      if (status === "Low stock") {
        filtered = filtered.filter(m => m.quantity <= (m.lowStockThreshold || 10));
      }
      if (status === "Expiring soon") {
        filtered = filtered.filter(m => new Date(m.expiryDate) <= new Date(now + 90 * day));
      }
      return { medicines: filtered };
    }

    if (method === "POST") {
      const newMed = { _id: "med_" + Date.now(), ...parsedBody, quantity: Number(parsedBody.quantity) || 0, purchasePrice: Number(parsedBody.purchasePrice) || 0, sellingPrice: Number(parsedBody.sellingPrice) || 0, lowStockThreshold: Number(parsedBody.lowStockThreshold) || 10 };
      medicines.unshift(newMed);
      setStorage("medicines", medicines);
      return { medicine: newMed };
    }

    const id = urlPath.replace("/medicines/", "");
    if (method === "PUT") {
      const index = medicines.findIndex(m => m._id === id);
      if (index !== -1) {
        medicines[index] = { ...medicines[index], ...parsedBody };
        setStorage("medicines", medicines);
        return { medicine: medicines[index] };
      }
      throw new Error("Medicine not found");
    }

    if (method === "DELETE") {
      const updated = medicines.filter(m => m._id !== id);
      setStorage("medicines", updated);
      return { message: "Medicine deleted" };
    }
  }

  // Suppliers
  if (urlPath === "/suppliers" || urlPath.startsWith("/suppliers/")) {
    const suppliers = getStorage("suppliers", DEFAULT_SUPPLIERS);
    if (method === "GET") {
      return { suppliers };
    }
    if (method === "POST") {
      const newSup = { _id: "sup_" + Date.now(), ...parsedBody };
      suppliers.unshift(newSup);
      setStorage("suppliers", suppliers);
      return { supplier: newSup };
    }
    const id = urlPath.replace("/suppliers/", "");
    if (method === "PUT") {
      const idx = suppliers.findIndex(s => s._id === id);
      if (idx !== -1) {
        suppliers[idx] = { ...suppliers[idx], ...parsedBody };
        setStorage("suppliers", suppliers);
        return { supplier: suppliers[idx] };
      }
      throw new Error("Supplier not found");
    }
    if (method === "DELETE") {
      const updated = suppliers.filter(s => s._id !== id);
      setStorage("suppliers", updated);
      return { message: "Supplier deleted" };
    }
  }

  // Sales
  if (urlPath === "/sales") {
    const sales = getStorage("sales", DEFAULT_SALES);
    const medicines = getStorage("medicines", DEFAULT_MEDICINES);

    if (method === "GET") {
      const search = (query.get("search") || "").toLowerCase();
      let filtered = sales;
      if (search) {
        filtered = sales.filter(s => s.invoiceNumber.toLowerCase().includes(search) || s.customerName.toLowerCase().includes(search));
      }
      return { sales: filtered.slice().reverse() };
    }

    if (method === "POST") {
      const { customerName, paymentMethod, discount = 0, items = [] } = parsedBody;
      let subtotal = 0;
      const saleItems = [];

      for (const item of items) {
        const med = medicines.find(m => m._id === item.medicine);
        if (med) {
          med.quantity = Math.max(0, med.quantity - item.quantity);
          const price = med.sellingPrice || 10;
          subtotal += price * item.quantity;
          saleItems.push({ medicine: med._id, medicineName: med.name, sku: med.sku, quantity: item.quantity, unitPrice: price });
        }
      }
      setStorage("medicines", medicines);

      const user = getStorage("currentUser", { name: "Pranitha" });
      const newSale = {
        _id: "sale_" + Date.now(),
        invoiceNumber: `MS-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 90 + 10)}`,
        customerName: customerName || "Walk-in customer",
        items: saleItems,
        subtotal,
        discount: Number(discount) || 0,
        total: Math.max(0, subtotal - (Number(discount) || 0)),
        paymentMethod: paymentMethod || "Cash",
        soldBy: { name: user.name },
        createdAt: new Date().toISOString()
      };

      sales.push(newSale);
      setStorage("sales", sales);
      return { sale: newSale };
    }
  }

  // Reports
  if (urlPath === "/reports") {
    const sales = getStorage("sales", DEFAULT_SALES);
    const medicines = getStorage("medicines", DEFAULT_MEDICINES);
    const rev = sales.reduce((sum, s) => sum + s.total, 0);

    const salesByDay = [
      { _id: "2026-11-01", orders: 12, revenue: 340 },
      { _id: "2026-11-02", orders: 15, revenue: 490 },
      { _id: "2026-11-03", orders: 18, revenue: 520 },
      { _id: "2026-11-04", orders: 22, revenue: 680 },
      { _id: "2026-11-05", orders: 14, revenue: 410 }
    ];

    return {
      summary: { revenue: rev || 2440, orders: sales.length || 81, averageOrder: 30 },
      salesByDay,
      topMedicines: medicines.slice(0, 6).map(m => ({ _id: m.name, units: 35, revenue: m.sellingPrice * 35 }))
    };
  }

  return {};
}
