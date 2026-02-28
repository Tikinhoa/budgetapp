import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Wallet, Plus, Minus, PieChart, Home, Settings, Camera, ArrowUpDown,
  Trash2, Edit3, Check, X, ChevronDown, ChevronLeft, TrendingUp,
  TrendingDown, DollarSign, CreditCard, Banknote, PiggyBank,
  Calendar, Tag, RefreshCw, Upload, Eye, BarChart3, ArrowRight,
  Clock, Repeat, Search, Filter, ScanLine, Receipt, Globe, Moon, Sun
} from "lucide-react";
import {
  PieChart as RechartsPie, Pie, Cell, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area,
  BarChart, Bar
} from "recharts";

// ─── Constants ───────────────────────────────────────────────────────
const CURRENCIES = { MUR: "Rs", EUR: "€", USD: "$" };
const ACCOUNT_TYPES = [
  { id: "cash", label: "Cash", icon: "Banknote" },
  { id: "bank", label: "Banque", icon: "CreditCard" },
  { id: "savings", label: "Épargne", icon: "PiggyBank" },
  { id: "crypto", label: "Crypto", icon: "Globe" },
];
const EXPENSE_CATEGORIES = [
  { id: "food", label: "Alimentation", emoji: "🍕", color: "#f97316" },
  { id: "transport", label: "Transport", emoji: "🚗", color: "#3b82f6" },
  { id: "housing", label: "Logement", emoji: "🏠", color: "#8b5cf6" },
  { id: "health", label: "Santé", emoji: "💊", color: "#ef4444" },
  { id: "entertainment", label: "Loisirs", emoji: "🎮", color: "#ec4899" },
  { id: "shopping", label: "Shopping", emoji: "🛍️", color: "#f59e0b" },
  { id: "utilities", label: "Factures", emoji: "💡", color: "#6366f1" },
  { id: "education", label: "Éducation", emoji: "📚", color: "#14b8a6" },
  { id: "subscriptions", label: "Abonnements", emoji: "📱", color: "#a855f7" },
  { id: "other", label: "Autre", emoji: "📌", color: "#6b7280" },
];
const INCOME_CATEGORIES = [
  { id: "salary", label: "Salaire", emoji: "💰", color: "#10b981" },
  { id: "freelance", label: "Freelance", emoji: "💻", color: "#06b6d4" },
  { id: "investment", label: "Investissement", emoji: "📈", color: "#8b5cf6" },
  { id: "gift", label: "Cadeau", emoji: "🎁", color: "#f43f5e" },
  { id: "refund", label: "Remboursement", emoji: "↩️", color: "#64748b" },
  { id: "other_income", label: "Autre", emoji: "📌", color: "#6b7280" },
];

const MOCK_RATES = { EUR: 1, USD: 1.08, MUR: 48.5 };

// ─── DB Helper (IndexedDB wrapper) ──────────────────────────────────
const DB_NAME = "BudgetAppDB";
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("accounts"))
        db.createObjectStore("accounts", { keyPath: "id" });
      if (!db.objectStoreNames.contains("transactions")) {
        const ts = db.createObjectStore("transactions", { keyPath: "id" });
        ts.createIndex("date", "date");
        ts.createIndex("accountId", "accountId");
      }
      if (!db.objectStoreNames.contains("settings"))
        db.createObjectStore("settings", { keyPath: "key" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGetAll(store) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(store, data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(data);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function dbDelete(store, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Utility Helpers ─────────────────────────────────────────────────
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const fmt = (amount, currency = "EUR") => {
  const sym = CURRENCIES[currency] || "€";
  const abs = Math.abs(amount).toFixed(2);
  return `${amount < 0 ? "-" : ""}${sym}${abs}`;
};
const toEUR = (amount, currency, rates) => amount / (rates[currency] || 1);
const today = () => new Date().toISOString().split("T")[0];
const getWeek = (d) => {
  const date = new Date(d);
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay() + 1);
  return start.toISOString().split("T")[0];
};

// ─── Sub-components ──────────────────────────────────────────────────
function AccountIcon({ type, size = 20 }) {
  const props = { size, strokeWidth: 1.5 };
  switch (type) {
    case "cash": return <Banknote {...props} />;
    case "savings": return <PiggyBank {...props} />;
    case "crypto": return <Globe {...props} />;
    default: return <CreditCard {...props} />;
  }
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#1a1d23] border border-white/10 rounded-t-3xl sm:rounded-2xl p-6 pb-8 animate-slideUp"
        style={{ animation: "slideUp .3s ease-out" }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/60">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function TabBar({ active, onChange, tabs }) {
  return (
    <div className="flex bg-white/5 rounded-xl p-1 gap-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
            active === t.id
              ? "bg-emerald-500/20 text-emerald-400 shadow-inner"
              : "text-white/50 hover:text-white/70"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function InputField({ label, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-xs font-medium text-white/50 uppercase tracking-wider">{label}</label>}
      <input
        {...props}
        className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition ${props.className || ""}`}
      />
    </div>
  );
}

function SelectField({ label, options, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-xs font-medium text-white/50 uppercase tracking-wider">{label}</label>}
      <select
        {...props}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 appearance-none transition"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#1a1d23]">{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function Btn({ children, variant = "primary", className = "", ...props }) {
  const base = "flex items-center justify-center gap-2 font-semibold rounded-xl px-5 py-3.5 transition-all active:scale-[0.97] disabled:opacity-40 text-sm";
  const variants = {
    primary: "bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/25",
    secondary: "bg-white/10 text-white hover:bg-white/15",
    danger: "bg-red-500/20 text-red-400 hover:bg-red-500/30",
    ghost: "text-white/60 hover:text-white hover:bg-white/5",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props}>{children}</button>;
}

// ─── MAIN APP ────────────────────────────────────────────────────────
export default function BudgetApp() {
  // ── State ──
  const [page, setPage] = useState("home");
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [rates, setRates] = useState(MOCK_RATES);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [editAccount, setEditAccount] = useState(null);
  const [showAddTx, setShowAddTx] = useState(false);
  const [txType, setTxType] = useState("expense");
  const [showScan, setShowScan] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState("month");
  const [loaded, setLoaded] = useState(false);

  // ── Form states ──
  const [accForm, setAccForm] = useState({ name: "", type: "bank", currency: "EUR", balance: "" });
  const [txForm, setTxForm] = useState({ amount: "", category: "", accountId: "", note: "", date: today(), recurring: "none" });
  const fileInputRef = useRef(null);

  // ── Load from IndexedDB ──
  useEffect(() => {
    (async () => {
      try {
        const [accs, txs] = await Promise.all([dbGetAll("accounts"), dbGetAll("transactions")]);
        setAccounts(accs || []);
        setTransactions(txs || []);
      } catch {
        const accs = JSON.parse(localStorage.getItem("ba_accounts") || "[]");
        const txs = JSON.parse(localStorage.getItem("ba_transactions") || "[]");
        setAccounts(accs);
        setTransactions(txs);
      }
      setLoaded(true);
    })();
  }, []);

  // ── Persist ──
  const persist = useCallback(async (accs, txs) => {
    try {
      for (const a of accs) await dbPut("accounts", a);
      for (const t of txs) await dbPut("transactions", t);
    } catch {
      localStorage.setItem("ba_accounts", JSON.stringify(accs));
      localStorage.setItem("ba_transactions", JSON.stringify(txs));
    }
  }, []);

  // ── Fetch live rates ──
  useEffect(() => {
    fetch("https://api.exchangerate-api.com/v4/latest/EUR")
      .then((r) => r.json())
      .then((d) => {
        if (d.rates) setRates({ EUR: 1, USD: d.rates.USD || 1.08, MUR: d.rates.MUR || 48.5 });
      })
      .catch(() => {});
  }, []);

  // ── Process recurring transactions ──
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const newTxs = [];
    transactions.forEach((tx) => {
      if (tx.recurring && tx.recurring !== "none") {
        const lastDate = new Date(tx.date);
        let nextDate = new Date(lastDate);
        if (tx.recurring === "weekly") nextDate.setDate(nextDate.getDate() + 7);
        else if (tx.recurring === "monthly") nextDate.setMonth(nextDate.getMonth() + 1);
        while (nextDate <= now) {
          const exists = transactions.find(
            (t) => t.recurringParent === tx.id && t.date === nextDate.toISOString().split("T")[0]
          );
          if (!exists) {
            newTxs.push({
              ...tx,
              id: uid(),
              date: nextDate.toISOString().split("T")[0],
              recurringParent: tx.id,
              recurring: "none",
            });
          }
          if (tx.recurring === "weekly") nextDate.setDate(nextDate.getDate() + 7);
          else nextDate.setMonth(nextDate.getMonth() + 1);
        }
      }
    });
    if (newTxs.length > 0) {
      const updated = [...transactions, ...newTxs];
      setTransactions(updated);
      persist(accounts, updated);
    }
  }, [loaded]);

  // ── Computed values ──
  const totalEUR = useMemo(() => {
    return accounts.reduce((sum, acc) => {
      const accTxs = transactions.filter((t) => t.accountId === acc.id);
      const balance = accTxs.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), parseFloat(acc.initialBalance || 0));
      return sum + toEUR(balance, acc.currency, rates);
    }, 0);
  }, [accounts, transactions, rates]);

  const getAccountBalance = (acc) => {
    const accTxs = transactions.filter((t) => t.accountId === acc.id);
    return accTxs.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), parseFloat(acc.initialBalance || 0));
  };

  const filteredTx = useMemo(() => {
    const now = new Date();
    const start = new Date();
    if (statsPeriod === "day") start.setHours(0, 0, 0, 0);
    else if (statsPeriod === "week") start.setDate(now.getDate() - 7);
    else start.setMonth(now.getMonth() - 1);
    return transactions.filter((t) => new Date(t.date) >= start && new Date(t.date) <= now);
  }, [transactions, statsPeriod]);

  const categoryBreakdown = useMemo(() => {
    const map = {};
    filteredTx
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const cat = EXPENSE_CATEGORIES.find((c) => c.id === t.category) || EXPENSE_CATEGORIES[9];
        map[cat.id] = map[cat.id] || { ...cat, total: 0 };
        map[cat.id].total += t.amount;
      });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredTx]);

  const balanceOverTime = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    let running = accounts.reduce((s, a) => s + toEUR(parseFloat(a.initialBalance || 0), a.currency, rates), 0);
    const points = [];
    sorted.forEach((t) => {
      const acc = accounts.find((a) => a.id === t.accountId);
      const cur = acc ? acc.currency : "EUR";
      const eurAmt = toEUR(t.amount, cur, rates);
      running += t.type === "income" ? eurAmt : -eurAmt;
      points.push({ date: t.date, balance: Math.round(running * 100) / 100 });
    });
    return points.slice(-30);
  }, [transactions, accounts, rates]);

  const monthlyIncome = filteredTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const monthlyExpense = filteredTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const dailyData = useMemo(() => {
    const map = {};
    filteredTx.forEach((t) => {
      const key = t.date;
      if (!map[key]) map[key] = { date: key, income: 0, expense: 0 };
      if (t.type === "income") map[key].income += t.amount;
      else map[key].expense += t.amount;
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredTx]);

  // ── Handlers ──
  const saveAccount = () => {
    const acc = {
      id: editAccount ? editAccount.id : uid(),
      name: accForm.name || "Mon Compte",
      type: accForm.type,
      currency: accForm.currency,
      initialBalance: parseFloat(accForm.balance) || 0,
      createdAt: editAccount ? editAccount.createdAt : new Date().toISOString(),
    };
    const updated = editAccount ? accounts.map((a) => (a.id === acc.id ? acc : a)) : [...accounts, acc];
    setAccounts(updated);
    persist(updated, transactions);
    setShowAddAccount(false);
    setEditAccount(null);
    setAccForm({ name: "", type: "bank", currency: "EUR", balance: "" });
  };

  const deleteAccount = (id) => {
    const updated = accounts.filter((a) => a.id !== id);
    const updTx = transactions.filter((t) => t.accountId !== id);
    setAccounts(updated);
    setTransactions(updTx);
    persist(updated, updTx);
    dbDelete("accounts", id).catch(() => {});
  };

  const saveTx = () => {
    const tx = {
      id: uid(),
      type: txType,
      amount: parseFloat(txForm.amount) || 0,
      category: txForm.category || (txType === "expense" ? "other" : "other_income"),
      accountId: txForm.accountId || (accounts[0] && accounts[0].id),
      note: txForm.note,
      date: txForm.date || today(),
      recurring: txForm.recurring || "none",
      createdAt: new Date().toISOString(),
    };
    if (tx.amount <= 0) return;
    const updated = [...transactions, tx];
    setTransactions(updated);
    persist(accounts, updated);
    setShowAddTx(false);
    setTxForm({ amount: "", category: "", accountId: "", note: "", date: today(), recurring: "none" });
  };

  const deleteTx = (id) => {
    const updated = transactions.filter((t) => t.id !== id);
    setTransactions(updated);
    persist(accounts, updated);
    dbDelete("transactions", id).catch(() => {});
  };

  // ── OCR scan ──
  const handleScan = async (file) => {
    if (!file) return;
    setScanning(true);
    try {
      const text = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const Tesseract = await import("https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.esm.min.js");
            const { data } = await Tesseract.recognize(e.target.result, "fra+eng");
            resolve(data.text);
          } catch {
            resolve(extractFromImage(e.target.result));
          }
        };
        reader.readAsDataURL(file);
      });
      const amounts = text.match(/(\d+[.,]\d{2})/g);
      const dates = text.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/g);
      const amount = amounts ? Math.max(...amounts.map((a) => parseFloat(a.replace(",", ".")))) : 0;
      let date = today();
      if (dates && dates[0]) {
        const parts = dates[0].split(/[\/\-\.]/);
        if (parts.length === 3) {
          const y = parts[2].length === 2 ? "20" + parts[2] : parts[2];
          date = `${y}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        }
      }
      setScanResult({ amount: amount.toFixed(2), date, rawText: text });
      setTxForm((f) => ({ ...f, amount: amount.toFixed(2), date }));
    } catch (err) {
      setScanResult({ amount: "0.00", date: today(), rawText: "Erreur OCR: " + err.message });
    }
    setScanning(false);
  };

  function extractFromImage(dataUrl) {
    return "OCR non disponible - veuillez entrer le montant manuellement";
  }

  // ── Recent transactions ──
  const recentTx = [...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt?.localeCompare(a.createdAt)).slice(0, 20);

  // ── PAGES ──
  const renderHome = () => (
    <div className="space-y-6 animate-fadeIn">
      {/* Total Balance Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-400 p-6 shadow-2xl shadow-emerald-500/20">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <p className="text-emerald-100 text-sm font-medium mb-1">Solde Total en EUR</p>
        <p className="text-4xl font-bold text-white tracking-tight">€{totalEUR.toFixed(2)}</p>
        <div className="flex gap-6 mt-4">
          <div>
            <p className="text-emerald-100 text-xs">Revenus</p>
            <p className="text-white font-semibold flex items-center gap-1">
              <TrendingUp size={14} /> €{toEUR(monthlyIncome, "EUR", rates).toFixed(0)}
            </p>
          </div>
          <div>
            <p className="text-emerald-100 text-xs">Dépenses</p>
            <p className="text-white font-semibold flex items-center gap-1">
              <TrendingDown size={14} /> €{toEUR(monthlyExpense, "EUR", rates).toFixed(0)}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => { setTxType("expense"); setShowAddTx(true); }}
          className="flex flex-col items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 transition active:scale-95"
        >
          <div className="w-11 h-11 rounded-full bg-red-500/20 flex items-center justify-center">
            <Minus size={20} className="text-red-400" />
          </div>
          <span className="text-xs text-white/70 font-medium">Dépense</span>
        </button>
        <button
          onClick={() => { setTxType("income"); setShowAddTx(true); }}
          className="flex flex-col items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 transition active:scale-95"
        >
          <div className="w-11 h-11 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Plus size={20} className="text-emerald-400" />
          </div>
          <span className="text-xs text-white/70 font-medium">Revenu</span>
        </button>
        <button
          onClick={() => setShowScan(true)}
          className="flex flex-col items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 transition active:scale-95"
        >
          <div className="w-11 h-11 rounded-full bg-blue-500/20 flex items-center justify-center">
            <Camera size={20} className="text-blue-400" />
          </div>
          <span className="text-xs text-white/70 font-medium">Scanner</span>
        </button>
      </div>

      {/* Accounts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold">Mes Comptes</h2>
          <button onClick={() => { setAccForm({ name: "", type: "bank", currency: "EUR", balance: "" }); setEditAccount(null); setShowAddAccount(true); }} className="text-emerald-400 text-sm font-medium flex items-center gap-1">
            <Plus size={16} /> Ajouter
          </button>
        </div>
        {accounts.length === 0 ? (
          <div className="text-center py-8 bg-white/5 rounded-2xl border border-dashed border-white/10">
            <Wallet size={32} className="mx-auto text-white/20 mb-2" />
            <p className="text-white/40 text-sm">Aucun compte. Ajoutez votre premier compte.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {accounts.map((acc) => {
              const bal = getAccountBalance(acc);
              return (
                <div key={acc.id} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/[0.07] transition">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    acc.type === "cash" ? "bg-amber-500/20 text-amber-400" :
                    acc.type === "savings" ? "bg-purple-500/20 text-purple-400" :
                    acc.type === "crypto" ? "bg-blue-500/20 text-blue-400" :
                    "bg-emerald-500/20 text-emerald-400"
                  }`}>
                    <AccountIcon type={acc.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{acc.name}</p>
                    <p className="text-white/40 text-xs">{ACCOUNT_TYPES.find((t) => t.id === acc.type)?.label} · {acc.currency}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold text-sm ${bal >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {fmt(bal, acc.currency)}
                    </p>
                    <p className="text-white/30 text-xs">≈ €{toEUR(bal, acc.currency, rates).toFixed(2)}</p>
                  </div>
                  <div className="flex gap-1 ml-1">
                    <button
                      onClick={() => {
                        setEditAccount(acc);
                        setAccForm({ name: acc.name, type: acc.type, currency: acc.currency, balance: String(acc.initialBalance) });
                        setShowAddAccount(true);
                      }}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/40"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => deleteAccount(acc.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold">Dernières Transactions</h2>
          <button onClick={() => setPage("transactions")} className="text-emerald-400 text-sm font-medium">Tout voir →</button>
        </div>
        {recentTx.length === 0 ? (
          <div className="text-center py-6 bg-white/5 rounded-2xl border border-dashed border-white/10">
            <Receipt size={28} className="mx-auto text-white/20 mb-2" />
            <p className="text-white/40 text-sm">Aucune transaction</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTx.slice(0, 5).map((tx) => {
              const cats = tx.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
              const cat = cats.find((c) => c.id === tx.category) || cats[cats.length - 1];
              const acc = accounts.find((a) => a.id === tx.accountId);
              return (
                <div key={tx.id} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-3.5 transition">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: cat.color + "20" }}>
                    {cat.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{cat.label}</p>
                    <p className="text-white/40 text-xs">{tx.note || (acc ? acc.name : "")} · {tx.date}</p>
                  </div>
                  <p className={`font-semibold text-sm ${tx.type === "income" ? "text-emerald-400" : "text-red-400"}`}>
                    {tx.type === "income" ? "+" : "-"}{fmt(tx.amount, acc?.currency)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const renderTransactions = () => (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Transactions</h2>
        <div className="flex gap-2">
          <button
            onClick={() => { setTxType("expense"); setShowAddTx(true); }}
            className="p-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
          >
            <Minus size={18} />
          </button>
          <button
            onClick={() => { setTxType("income"); setShowAddTx(true); }}
            className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {recentTx.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
          <ArrowUpDown size={40} className="mx-auto text-white/15 mb-3" />
          <p className="text-white/40">Aucune transaction enregistrée</p>
        </div>
      ) : (
        <div className="space-y-2">
          {recentTx.map((tx) => {
            const cats = tx.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
            const cat = cats.find((c) => c.id === tx.category) || cats[cats.length - 1];
            const acc = accounts.find((a) => a.id === tx.accountId);
            return (
              <div key={tx.id} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-3.5 group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: cat.color + "20" }}>
                  {cat.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{cat.label}</p>
                  <p className="text-white/40 text-xs">
                    {tx.note ? tx.note + " · " : ""}{acc ? acc.name : ""} · {tx.date}
                    {tx.recurring && tx.recurring !== "none" && (
                      <span className="ml-1 text-blue-400"><Repeat size={10} className="inline" /> {tx.recurring === "weekly" ? "Hebdo" : "Mensuel"}</span>
                    )}
                  </p>
                </div>
                <p className={`font-semibold text-sm ${tx.type === "income" ? "text-emerald-400" : "text-red-400"}`}>
                  {tx.type === "income" ? "+" : "-"}{fmt(tx.amount, acc?.currency)}
                </p>
                <button
                  onClick={() => deleteTx(tx.id)}
                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-white/30 hover:text-red-400 transition"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderStats = () => {
    const totalExp = categoryBreakdown.reduce((s, c) => s + c.total, 0);
    const PIE_COLORS = categoryBreakdown.map((c) => c.color);

    return (
      <div className="space-y-6 animate-fadeIn">
        <h2 className="text-xl font-bold text-white">Statistiques</h2>

        <TabBar
          active={statsPeriod}
          onChange={setStatsPeriod}
          tabs={[
            { id: "day", label: "Jour" },
            { id: "week", label: "Semaine" },
            { id: "month", label: "Mois" },
          ]}
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
            <p className="text-emerald-400 text-xs font-medium mb-1">Revenus</p>
            <p className="text-emerald-300 text-xl font-bold">€{monthlyIncome.toFixed(0)}</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
            <p className="text-red-400 text-xs font-medium mb-1">Dépenses</p>
            <p className="text-red-300 text-xl font-bold">€{monthlyExpense.toFixed(0)}</p>
          </div>
        </div>

        {/* Pie Chart */}
        {categoryBreakdown.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4">Répartition des Dépenses</h3>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="total"
                    nameKey="label"
                    stroke="none"
                  >
                    {categoryBreakdown.map((entry, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#1a1d23", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff", fontSize: 13 }}
                    formatter={(val) => [`€${val.toFixed(2)}`, ""]}
                  />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {categoryBreakdown.map((cat) => (
                <div key={cat.id} className="flex items-center gap-3">
                  <span className="text-base">{cat.emoji}</span>
                  <span className="text-white/70 text-sm flex-1">{cat.label}</span>
                  <span className="text-white text-sm font-medium">€{cat.total.toFixed(2)}</span>
                  <span className="text-white/40 text-xs w-10 text-right">{totalExp > 0 ? ((cat.total / totalExp) * 100).toFixed(0) : 0}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Balance Evolution */}
        {balanceOverTime.length > 1 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4">Évolution du Solde</h3>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={balanceOverTime}>
                  <defs>
                    <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: "#1a1d23", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff", fontSize: 13 }}
                    formatter={(val) => [`€${val}`, "Solde"]}
                  />
                  <Area type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={2} fill="url(#balGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Daily Bar Chart */}
        {dailyData.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4">Revenus vs Dépenses</h3>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: "#1a1d23", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff", fontSize: 13 }}
                  />
                  <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenus" />
                  <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Dépenses" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSettings = () => (
    <div className="space-y-6 animate-fadeIn">
      <h2 className="text-xl font-bold text-white">Paramètres</h2>
      <div className="bg-white/5 border border-white/10 rounded-2xl divide-y divide-white/5">
        <div className="p-4 flex items-center justify-between">
          <div>
            <p className="text-white font-medium text-sm">Taux de change</p>
            <p className="text-white/40 text-xs mt-0.5">Dernière mise à jour automatique</p>
          </div>
          <RefreshCw size={18} className="text-white/40" />
        </div>
        <div className="p-4">
          <p className="text-white/40 text-xs mb-2">Taux actuels (base EUR)</p>
          <div className="flex gap-4">
            <span className="text-white text-sm">1 € = {rates.USD?.toFixed(2)} $</span>
            <span className="text-white text-sm">1 € = {rates.MUR?.toFixed(2)} Rs</span>
          </div>
        </div>
        <div className="p-4 flex items-center justify-between">
          <div>
            <p className="text-white font-medium text-sm">Comptes</p>
            <p className="text-white/40 text-xs mt-0.5">{accounts.length} compte{accounts.length !== 1 ? "s" : ""} configuré{accounts.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <div className="p-4 flex items-center justify-between">
          <div>
            <p className="text-white font-medium text-sm">Transactions</p>
            <p className="text-white/40 text-xs mt-0.5">{transactions.length} transaction{transactions.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <div className="p-4">
          <Btn
            variant="danger"
            className="w-full"
            onClick={() => {
              if (confirm("Supprimer toutes les données ? Cette action est irréversible.")) {
                setAccounts([]);
                setTransactions([]);
                indexedDB.deleteDatabase(DB_NAME);
                localStorage.removeItem("ba_accounts");
                localStorage.removeItem("ba_transactions");
              }
            }}
          >
            <Trash2 size={16} /> Réinitialiser toutes les données
          </Btn>
        </div>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
        <p className="text-white/30 text-xs">BudgetApp v1.0</p>
        <p className="text-white/20 text-xs mt-1">PWA · Données stockées localement</p>
      </div>
    </div>
  );

  // ── Layout ──
  return (
    <div className="min-h-screen bg-[#0f1117] text-white" style={{ fontFamily: "'DM Sans', 'SF Pro Display', -apple-system, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        .animate-fadeIn { animation: fadeIn .35s ease-out }
        * { -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { width: 0; height: 0; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        select { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0f1117]/80 backdrop-blur-xl border-b border-white/5 px-5 pt-3 pb-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Wallet size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">BudgetApp</span>
          </div>
          <div className="text-white/40 text-xs">
            {new Date().toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-5 py-5 pb-28">
        {page === "home" && renderHome()}
        {page === "transactions" && renderTransactions()}
        {page === "stats" && renderStats()}
        {page === "settings" && renderSettings()}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[#0f1117]/90 backdrop-blur-xl border-t border-white/5 pb-[env(safe-area-inset-bottom)]">
        <div className="flex max-w-lg mx-auto">
          {[
            { id: "home", icon: Home, label: "Accueil" },
            { id: "transactions", icon: ArrowUpDown, label: "Transactions" },
            { id: "stats", icon: BarChart3, label: "Stats" },
            { id: "settings", icon: Settings, label: "Réglages" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition ${
                page === item.id ? "text-emerald-400" : "text-white/30"
              }`}
            >
              <item.icon size={22} strokeWidth={page === item.id ? 2 : 1.5} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* ── MODALS ── */}

      {/* Add/Edit Account Modal */}
      <Modal open={showAddAccount} onClose={() => { setShowAddAccount(false); setEditAccount(null); }} title={editAccount ? "Modifier le Compte" : "Nouveau Compte"}>
        <div className="space-y-4">
          <InputField label="Nom du compte" placeholder="Ex: Compte courant" value={accForm.name} onChange={(e) => setAccForm({ ...accForm, name: e.target.value })} />
          <SelectField
            label="Type de compte"
            value={accForm.type}
            onChange={(e) => setAccForm({ ...accForm, type: e.target.value })}
            options={ACCOUNT_TYPES.map((t) => ({ value: t.id, label: t.label }))}
          />
          <SelectField
            label="Devise"
            value={accForm.currency}
            onChange={(e) => setAccForm({ ...accForm, currency: e.target.value })}
            options={Object.entries(CURRENCIES).map(([k, v]) => ({ value: k, label: `${k} (${v})` }))}
          />
          <InputField label="Solde initial" type="number" step="0.01" placeholder="0.00" value={accForm.balance} onChange={(e) => setAccForm({ ...accForm, balance: e.target.value })} />
          <Btn onClick={saveAccount} className="w-full mt-2">
            <Check size={18} /> {editAccount ? "Enregistrer" : "Créer le Compte"}
          </Btn>
        </div>
      </Modal>

      {/* Add Transaction Modal */}
      <Modal open={showAddTx} onClose={() => { setShowAddTx(false); setScanResult(null); }} title={txType === "income" ? "Nouveau Revenu" : "Nouvelle Dépense"}>
        <div className="space-y-4">
          <TabBar
            active={txType}
            onChange={setTxType}
            tabs={[
              { id: "expense", label: "Dépense" },
              { id: "income", label: "Revenu" },
            ]}
          />

          <InputField
            label="Montant"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={txForm.amount}
            onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
            className="text-2xl font-bold"
          />

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Catégorie</label>
            <div className="grid grid-cols-5 gap-2">
              {(txType === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setTxForm({ ...txForm, category: cat.id })}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border transition text-center ${
                    txForm.category === cat.id
                      ? "border-emerald-500/50 bg-emerald-500/10"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <span className="text-lg">{cat.emoji}</span>
                  <span className="text-[9px] text-white/60 leading-tight">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <SelectField
            label="Compte"
            value={txForm.accountId}
            onChange={(e) => setTxForm({ ...txForm, accountId: e.target.value })}
            options={[
              { value: "", label: "Sélectionner un compte..." },
              ...accounts.map((a) => ({ value: a.id, label: `${a.name} (${a.currency})` })),
            ]}
          />

          <InputField label="Date" type="date" value={txForm.date} onChange={(e) => setTxForm({ ...txForm, date: e.target.value })} />

          <InputField label="Note (optionnel)" placeholder="Ajouter une note..." value={txForm.note} onChange={(e) => setTxForm({ ...txForm, note: e.target.value })} />

          <SelectField
            label="Récurrence"
            value={txForm.recurring}
            onChange={(e) => setTxForm({ ...txForm, recurring: e.target.value })}
            options={[
              { value: "none", label: "Aucune" },
              { value: "weekly", label: "Hebdomadaire" },
              { value: "monthly", label: "Mensuelle" },
            ]}
          />

          <Btn onClick={saveTx} className="w-full mt-2" disabled={!txForm.amount || !txForm.accountId}>
            <Check size={18} /> Enregistrer
          </Btn>
        </div>
      </Modal>

      {/* Scan Receipt Modal */}
      <Modal open={showScan} onClose={() => { setShowScan(false); setScanResult(null); setScanning(false); }} title="Scanner un Reçu">
        <div className="space-y-4">
          <div className="text-center">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="mx-auto w-full py-12 border-2 border-dashed border-white/20 rounded-2xl hover:border-emerald-500/50 hover:bg-emerald-500/5 transition cursor-pointer"
            >
              {scanning ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-white/60 text-sm">Analyse en cours...</p>
                </div>
              ) : (
                <>
                  <ScanLine size={40} className="mx-auto text-white/30 mb-3" />
                  <p className="text-white/60 text-sm">Prendre une photo ou choisir un fichier</p>
                  <p className="text-white/30 text-xs mt-1">JPG, PNG acceptés</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleScan(e.target.files[0])}
            />
          </div>

          {scanResult && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 space-y-3">
              <p className="text-blue-400 text-xs font-medium uppercase tracking-wider">Résultat OCR</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-white/50 text-xs">Montant détecté</p>
                  <p className="text-white font-bold text-xl">€{scanResult.amount}</p>
                </div>
                <div>
                  <p className="text-white/50 text-xs">Date détectée</p>
                  <p className="text-white font-semibold">{scanResult.date}</p>
                </div>
              </div>
              <details className="text-xs">
                <summary className="text-white/30 cursor-pointer">Texte brut détecté</summary>
                <pre className="mt-2 text-white/40 whitespace-pre-wrap text-[10px] max-h-32 overflow-y-auto">{scanResult.rawText}</pre>
              </details>
              <Btn
                className="w-full"
                onClick={() => {
                  setTxType("expense");
                  setTxForm({
                    ...txForm,
                    amount: scanResult.amount,
                    date: scanResult.date,
                  });
                  setShowScan(false);
                  setShowAddTx(true);
                  setScanResult(null);
                }}
              >
                <Check size={16} /> Vérifier et Valider
              </Btn>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
