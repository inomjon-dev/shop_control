const PHONE_CATALOG = {
    "Apple": ["iPhone 16 Pro Max", "iPhone 16 Pro", "iPhone 16", "iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15", "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 13 Pro", "iPhone 13", "iPhone 12"],
    "Samsung": ["Galaxy S24 Ultra", "Galaxy S24+", "Galaxy S24", "Galaxy S23 Ultra", "Galaxy S23", "Galaxy A55 5G", "Galaxy Z Fold 6"],
    "Xiaomi / Redmi": ["Xiaomi 14 Ultra", "Xiaomi 14", "Redmi Note 13 Pro+", "Redmi Note 13 Pro", "Poco X6 Pro"],
    "Honor": ["Honor Magic 6 Pro", "Honor 200 Pro", "Honor X9c", "Honor X9b"],
    "Google Pixel": ["Pixel 9 Pro XL", "Pixel 9 Pro", "Pixel 8 Pro", "Pixel 8"]
};

const initialUsers = [
    { id: 1, username: "admin", password: "123", name: "Inomjon (Egasi)", phone: "+998 90 111-22-33", avatar: "", role: "admin", branch: "Barcha filiallar", bonusPercent: 0, active: true, lastLogin: "17.11.2026, 21:30", activeMinutes: 145, isOnline: true },
    { id: 2, username: "sardor", password: "123", name: "Sardor (Sotuvchi)", phone: "+998 91 222-33-44", avatar: "", role: "staff", branch: "Asosiy filial", bonusPercent: 2, active: true, lastLogin: "17.11.2026, 18:10", activeMinutes: 210, isOnline: true },
    { id: 3, username: "jasur", password: "123", name: "Jasur (2-filial)", phone: "+998 93 333-44-55", avatar: "", role: "staff", branch: "2-filial (Markaz)", bonusPercent: 2.5, active: true, lastLogin: "17.11.2026, 15:40", activeMinutes: 95, isOnline: false }
];

const initialPhones = [
    {
        id: 1, brand: "Apple", model: "iPhone 15 Pro Max", storage: "8/256 GB", color: "Natural Titanium", region: "LL/A (eSIM)",
        imei: "356789012345601", battery: 98, condition: "Ideal (99%)", boxStatus: "Bor (Full)",
        note: "Ustada bo'lmagan, FaceID va TrueTone 100% ishlaydi.",
        sellerName: "Malika Optom (Ta'minotchi)", sellerPhone: "+998 90 555-00-11", sellerPassport: "AD 4512890",
        image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=400&q=80",
        costPrice: 1020, minPrice: 1110, sellPrice: 1150, branch: "Asosiy filial", addedDate: "2026-11-12", addedBy: "Inomjon (Egasi)", status: "available"
    },
    {
        id: 2, brand: "Samsung", model: "Galaxy S24 Ultra", storage: "12/512 GB", color: "Titanium Black", region: "Global (2 SIM)",
        imei: "358912045678912", battery: 100, condition: "Yangi (Upakovka)", boxStatus: "Bor (Full)",
        note: "Plombasi ochilmagan yangi quti, 1 yil rasmiy kafolat.",
        sellerName: "Rasmiy Distribyutor", sellerPhone: "+998 71 200-11-22", sellerPassport: "Korporativ",
        image: "https://images.unsplash.com/photo-1707227156484-4a8363506150?auto=format&fit=crop&w=400&q=80",
        costPrice: 1080, minPrice: 1180, sellPrice: 1220, branch: "Asosiy filial", addedDate: "2026-10-05", addedBy: "Inomjon (Egasi)", status: "available"
    },
    {
        id: 3, brand: "Apple", model: "iPhone 13 Pro", storage: "6/128 GB", color: "Sierra Blue", region: "KH/A (1 SIM)",
        imei: "354123987654321", battery: 86, condition: "Yaxshi", boxStatus: "Faqat telefon",
        note: "Korpus chetida kichik tirnalish bor, ekrani radnoy.",
        sellerName: "Otabek Karimov", sellerPhone: "+998 94 412-88-77", sellerPassport: "AC 9981234",
        image: "https://images.unsplash.com/photo-1632661674596-df8be070a5c5?auto=format&fit=crop&w=400&q=80",
        costPrice: 540, minPrice: 600, sellPrice: 630, branch: "2-filial (Markaz)", addedDate: "2026-09-10", addedBy: "Jasur (2-filial)", status: "available"
    }
];

const initialSales = [
    {
        id: 101, receiptNo: "PC-8841", date: "2026-11-17 14:20", model: "iPhone 14 Pro (6/256 GB)", imei: "359876543210112",
        conditionAtSale: "Ideal (99%) • AKB 91% • Korobka bor",
        boughtFrom: "Dilshod Tursunov (+998 90 700-11-22 | Pasport: AB 1122334)",
        customerName: "Alisher Valiyev", customerPhone: "+998 90 123-45-67", customerPassport: "AD 7654321",
        seller: "Sardor (Sotuvchi)", branch: "Asosiy filial", paymentType: "Nasiya", warrantyDays: 30,
        costPrice: 720, soldPrice: 810, paidAmount: 500, debtAmount: 310, dueDate: "2026-12-01"
    }
];

const initialExpenses = [
    { id: 1, date: "2026-11-15", title: "Do'kon ijarasi va kommunal", amount: 350, branch: "Asosiy filial", actor: "Inomjon (Egasi)" },
    { id: 2, date: "2026-11-16", title: "Kuryer va tushlik xarajati", amount: 25, branch: "2-filial (Markaz)", actor: "Jasur (2-filial)" }
];

const initialApprovals = [];
const initialLogs = [
    { id: 1, time: "17.11.2026, 14:20", actor: "Sardor (Sotuvchi)", branch: "Asosiy filial", action: "Sotuv (Nasiya)", detail: "iPhone 14 Pro $810 ga sotildi ($310 qarz)", type: "sale" }
];

function getStoreData() {
    if (!localStorage.getItem('pc_users')) localStorage.setItem('pc_users', JSON.stringify(initialUsers));
    if (!localStorage.getItem('pc_phones')) localStorage.setItem('pc_phones', JSON.stringify(initialPhones));
    if (!localStorage.getItem('pc_sales')) localStorage.setItem('pc_sales', JSON.stringify(initialSales));
    if (!localStorage.getItem('pc_expenses')) localStorage.setItem('pc_expenses', JSON.stringify(initialExpenses));
    if (!localStorage.getItem('pc_approvals')) localStorage.setItem('pc_approvals', JSON.stringify(initialApprovals));
    if (!localStorage.getItem('pc_logs')) localStorage.setItem('pc_logs', JSON.stringify(initialLogs));
    if (!localStorage.getItem('pc_rate')) localStorage.setItem('pc_rate', '12850');

    return {
        users: JSON.parse(localStorage.getItem('pc_users')),
        phones: JSON.parse(localStorage.getItem('pc_phones')),
        sales: JSON.parse(localStorage.getItem('pc_sales')),
        expenses: JSON.parse(localStorage.getItem('pc_expenses')),
        approvals: JSON.parse(localStorage.getItem('pc_approvals')),
        logs: JSON.parse(localStorage.getItem('pc_logs')),
        rate: Number(localStorage.getItem('pc_rate'))
    };
}

function saveStoreData({ users, phones, sales, expenses, approvals, logs, rate }) {
    if (users) localStorage.setItem('pc_users', JSON.stringify(users));
    if (phones) localStorage.setItem('pc_phones', JSON.stringify(phones));
    if (sales) localStorage.setItem('pc_sales', JSON.stringify(sales));
    if (expenses) localStorage.setItem('pc_expenses', JSON.stringify(expenses));
    if (approvals) localStorage.setItem('pc_approvals', JSON.stringify(approvals));
    if (logs) localStorage.setItem('pc_logs', JSON.stringify(logs));
    if (rate) localStorage.setItem('pc_rate', String(rate));
}

function addAuditLog(actor, branch, action, detail, type = "info") {
    const data = getStoreData();
    const now = new Date().toLocaleString('uz-UZ', { hour12: false }).slice(0, 17);
    data.logs.unshift({ id: Date.now(), time: now, actor, branch, action, detail, type });
    saveStoreData({ logs: data.logs });
}