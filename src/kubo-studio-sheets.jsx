import { useState, useEffect, useCallback } from "react";

const SHEET_ID = "1LLwXrfMMlhKUCXajb3y7uqoTO-9A4Ev_8a1K9iOo7A4";

// ─── Google Sheets API gviz parser ──────────────────────────────────────────
async function fetchSheet(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  const text = await res.text();
  // gviz wraps JSON in callback: google.visualization.Query.setResponse({...});
  const json = JSON.parse(text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?$/)[1]);
  return json.table;
}

function cellVal(cell) {
  if (!cell) return "";
  if (cell.f !== undefined && cell.f !== null) return cell.f;
  if (cell.v !== undefined && cell.v !== null) return cell.v;
  return "";
}

// Parse un onglet produit → { sku, nom, composants[], packaging[] }
function parseProductSheet(table, sheetName) {
  const rows = table.rows || [];
  const getValue = (r, c) => cellVal(rows[r]?.c?.[c]);

  const sku = getValue(6, 3);
  const nom = getValue(6, 8) || sheetName;

  // Composants impression (lignes 14→20 = rows[13→19])
  const composants = [];
  for (let r = 14; r <= 19; r++) {
    const part = getValue(r, 1);
    const qty = getValue(r, 2);
    const filament = getValue(r, 3);
    const grams = getValue(r, 7);
    const printer = getValue(r, 8);
    const hrs = getValue(r, 11);
    const min = getValue(r, 12);
    const buse = getValue(r, 13);
    const filCost = getValue(r, 14);
    if (part && String(part).trim()) {
      composants.push({ part: String(part).trim(), qty: Number(qty) || 1, filament: String(filament).trim(), grams: Number(grams) || 0, printer: String(printer).trim(), hrs: Number(hrs) || 0, min: Number(min) || 0, buse: String(buse), filCost: parseFloat(String(filCost).replace(",", ".")) || 0 });
    }
  }

  // Packaging (lignes 25→33 = rows[24→32])
  const packaging = [];
  for (let r = 25; r <= 33; r++) {
    const desc = getValue(r, 1);
    const qty = getValue(r, 3);
    const unitCost = getValue(r, 4);
    const total = getValue(r, 5);
    if (desc && String(desc).trim()) {
      packaging.push({ desc: String(desc).trim(), qty: Number(qty) || 1, unitCost: parseFloat(String(unitCost).replace(",", ".")) || 0, total: parseFloat(String(total).replace(",", ".")) || 0 });
    }
  }

  // Coûts totaux
  const coutRevient = parseFloat(String(getValue(26, 18)).replace(",", ".")) || 0;
  const prixB2C = parseFloat(String(getValue(28, 24)).replace(",", ".")) || 0;
  const prixB2B = parseFloat(String(getValue(28, 25)).replace(",", ".")) || 0;

  return { sku: String(sku).trim() || "—", nom: String(nom).trim(), composants, packaging, coutRevient, prixB2C, prixB2B };
}

// Parse onglet Materials → [{ nom, type, couleur, prixParKg, restant }]
function parseMaterialsSheet(table) {
  const rows = table.rows || [];
  const materials = [];
  for (let r = 1; r < rows.length; r++) {
    const nom = cellVal(rows[r]?.c?.[0]);
    const type = cellVal(rows[r]?.c?.[1]);
    const prix = cellVal(rows[r]?.c?.[2]);
    if (nom && String(nom).trim()) {
      materials.push({ id: `mat_${r}`, nom: String(nom).trim(), type: String(type).trim(), prixParKg: parseFloat(String(prix).replace(",", ".")) || 0, couleur: "#c8b89a", restant: 800, total: 1000 });
    }
  }
  return materials;
}

// ─── Couleurs filaments ───────────────────────────────────────────────────────
const filamentColors = {
  "transparent": "#d0eaf5", "traparent": "#d0eaf5", "blanc": "#f5f0e8", "white": "#f5f0e8",
  "noir": "#2a2a2a", "black": "#2a2a2a", "sable": "#c8b89a", "beige": "#d4c4a0",
  "terracotta": "#c4602a", "rouge": "#c04040", "bleu": "#4060c0", "vert": "#40a060",
  "gris": "#888888", "or": "#d4aa40", "gold": "#d4aa40",
};
function getFilamentColor(nom) {
  const lower = nom.toLowerCase();
  for (const [key, col] of Object.entries(filamentColors)) {
    if (lower.includes(key)) return col;
  }
  return "#c8b89a";
}

// ─── Données fallback (si le sheet n'est pas accessible) ─────────────────────
const FALLBACK_PRODUCTS = [
  { sku: "C0001", nom: "Lampe Canopée Transparent", composants: [{ part:"Top",qty:1,filament:"SUNLU PLA+ Transparent",grams:119,printer:"Bambu Lab P1S Combo",hrs:3,min:0,filCost:1.51},{part:"Pied",qty:1,filament:"SUNLU PLA+ Transparent",grams:187,printer:"Bambu Lab P1S",hrs:2,min:35,filCost:2.37},{part:"Couvercle",qty:1,filament:"SUNLU PLA",grams:9,printer:"Bambu Lab A1 mini",hrs:0,min:2,filCost:0.11},{part:"Cul",qty:1,filament:"SUNLU PLA",grams:50,printer:"Bambu Lab P1S",hrs:0,min:47,filCost:0.63},{part:"Invert",qty:1,filament:"SUNLU PLA+ Transparent",grams:23,printer:"Bambu Lab A1 mini",hrs:0,min:38,filCost:0.29}], packaging:[{desc:"Box",qty:1,unitCost:1.00,total:1.00},{desc:"Filling Material",qty:1,unitCost:0.25,total:0.25},{desc:"Label",qty:1,unitCost:0.20,total:0.20},{desc:"Sticker",qty:1,unitCost:0.10,total:0.10},{desc:"FIL ELECTRI",qty:1,unitCost:4.99,total:4.99}], coutRevient:16.83, prixB2C:117.81, prixB2B:67.32, stock:4, minStock:6 },
  { sku: "C0002", nom: "Vase Cépage Wood", composants:[{part:"Corps",qty:1,filament:"SUNLU PLA Wood",grams:150,printer:"Bambu Lab P1S",hrs:1,min:45,filCost:2.10},{part:"Col",qty:1,filament:"SUNLU PLA Wood",grams:40,printer:"Bambu Lab A1 mini",hrs:0,min:30,filCost:0.56}], packaging:[{desc:"Box",qty:1,unitCost:0.80,total:0.80}], coutRevient:8.50, prixB2C:59.00, prixB2B:34.00, stock:7, minStock:8 },
  { sku: "C0003", nom: "Vase Cépage Transparent", composants:[{part:"Corps",qty:1,filament:"SUNLU PLA+ Transparent",grams:145,printer:"Bambu Lab P1S",hrs:1,min:40,filCost:1.94},{part:"Col",qty:1,filament:"SUNLU PLA+ Transparent",grams:38,printer:"Bambu Lab A1 mini",hrs:0,min:28,filCost:0.51}], packaging:[{desc:"Box",qty:1,unitCost:0.80,total:0.80}], coutRevient:8.20, prixB2C:57.00, prixB2B:33.00, stock:5, minStock:8 },
];
const FALLBACK_FILAMENTS = [
  { id:"f1", nom:"SUNLU PLA+ Transparent", type:"PLA+", couleur:"#d0eaf5", restant:720, total:1000, prixParKg:22 },
  { id:"f2", nom:"SUNLU PLA", type:"PLA", couleur:"#f5f0e8", restant:450, total:1000, prixParKg:18 },
  { id:"f3", nom:"SUNLU PLA Wood", type:"PLA Wood", couleur:"#a08060", restant:300, total:500, prixParKg:28 },
  { id:"f4", nom:"SUNLU PLA Noir", type:"PLA", couleur:"#2a2a2a", restant:800, total:1000, prixParKg:18 },
];

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function KuboStudio() {
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [sheetStatus, setSheetStatus] = useState("idle"); // idle | loading | ok | error
  const [products, setProducts] = useState(FALLBACK_PRODUCTS);
  const [filaments, setFilaments] = useState(FALLBACK_FILAMENTS);
  const [stocks, setStocks] = useState({}); // { sku: { stock, minStock } }
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const showToast = (msg, type = "ok") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  // ── Charger depuis Google Sheets ──
  const loadFromSheets = useCallback(async () => {
    setSheetStatus("loading");
    setLoading(true);
    try {
      const PRODUCT_SHEETS = [
        "Lampe Canopé 2602_",
        "Vase Cepage 01 _Wood",
        "Copie de Vase Cepage 01 _Transparent",
      ];

      const loadedProducts = [];
      for (const sheetName of PRODUCT_SHEETS) {
        try {
          const table = await fetchSheet(sheetName);
          const prod = parseProductSheet(table, sheetName);
          if (prod.nom) {
            const existing = stocks[prod.sku] || {};
            loadedProducts.push({ ...prod, stock: existing.stock ?? 0, minStock: existing.minStock ?? 5 });
          }
        } catch (e) { console.warn(`Sheet "${sheetName}" non accessible:`, e); }
      }

      // Onglet Materials
      let loadedFilaments = [];
      try {
        const matTable = await fetchSheet("Materials");
        const parsed = parseMaterialsSheet(matTable);
        if (parsed.length > 0) {
          loadedFilaments = parsed.map(m => ({
            ...m,
            couleur: getFilamentColor(m.nom),
            restant: m.restant,
            total: m.total,
          }));
        }
      } catch (e) { console.warn("Onglet Materials non accessible:", e); loadedFilaments = FALLBACK_FILAMENTS; }

      if (loadedProducts.length > 0) {
        setProducts(loadedProducts);
        setFilaments(loadedFilaments.length > 0 ? loadedFilaments : FALLBACK_FILAMENTS);
        setSheetStatus("ok");
        showToast(`✓ ${loadedProducts.length} produits importés depuis Google Sheets`);
      } else {
        throw new Error("Aucun produit trouvé");
      }
    } catch (err) {
      console.error("Erreur chargement GSheet:", err);
      setSheetStatus("error");
      showToast("Impossible d'accéder au sheet — données de démo affichées", "warn");
    } finally {
      setLoading(false);
    }
  }, [stocks]);

  useEffect(() => { loadFromSheets(); }, []);

  // ── Listes dérivées ──
  const allFilaments = filaments.reduce((acc, f) => { acc[f.nom] = f; return acc; }, {});
  const pctFilament = (f) => Math.round((f.restant / f.total) * 100);
  const colFilament = (f) => { const p = pctFilament(f); return p > 50 ? "#4ade80" : p > 25 ? "#facc15" : "#f87171"; };

  const nbAfabriquer = products.filter(p => p.stock < p.minStock).reduce((s, p) => s + Math.max(0, p.minStock - p.stock), 0);
  const nbCritiques = products.filter(p => p.stock < p.minStock).length;
  const nbFilamentsBas = filaments.filter(f => pctFilament(f) < 30).length;

  const statusP = (p) => p.stock >= p.minStock ? "ok" : p.stock > 0 ? "low" : "out";
  const statusLabel = { ok: "En stock", low: "Stock bas", out: "Épuisé" };
  const statusStyle = {
    ok:  { bg: "#1a3a2a", color: "#4ade80", border: "#1f4a30" },
    low: { bg: "#3a2e0a", color: "#facc15", border: "#4a3a0a" },
    out: { bg: "#3a1010", color: "#f87171", border: "#4a1818" },
  };

  // ── Mise à jour stock ──
  const updateStock = (sku, delta) => {
    setProducts(prev => prev.map(p => p.sku === sku ? { ...p, stock: Math.max(0, p.stock + delta) } : p));
  };
  const setMinStock = (sku, val) => {
    setProducts(prev => prev.map(p => p.sku === sku ? { ...p, minStock: val } : p));
  };
  const updateFilament = (id, restant) => {
    setFilaments(prev => prev.map(f => f.id === id ? { ...f, restant } : f));
  };

  // ── Couleur imprimante ──
  const printerColor = (name) => {
    if (!name) return "#555";
    if (name.includes("P1S Combo")) return "#c8b89a";
    if (name.includes("P1S")) return "#60a5fa";
    if (name.includes("A1 mini")) return "#a78bfa";
    return "#888";
  };

  const navItems = [
    { id: "dashboard", icon: "◈", label: "Dashboard" },
    { id: "produits", icon: "◻", label: "Produits" },
    { id: "filaments", icon: "∿", label: "Filaments" },
    { id: "plan", icon: "⚙", label: "Production" },
    { id: "couts", icon: "€", label: "Coûts" },
    { id: "sync", icon: "↻", label: "Google Sheets" },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'DM Sans','Helvetica Neue',sans-serif", background: "#111", color: "#f0ede8", overflow: "hidden" }}>

      {/* ── SIDEBAR ── */}
      <aside style={{ width: 210, background: "#0c0c0c", borderRight: "1px solid #1f1f1f", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "22px 18px 16px", borderBottom: "1px solid #1f1f1f" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 34, height: 34, background: "linear-gradient(135deg,#c8b89a,#8a6040)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 15, color: "#0c0c0c", flexShrink: 0 }}>K</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 14, letterSpacing: -0.3 }}>Kubo Studio</div>
              <div style={{ fontSize: 10, color: "#444", letterSpacing: 0.8, textTransform: "uppercase" }}>Stock & Production</div>
            </div>
          </div>
          {/* Sheet status */}
          <div onClick={loadFromSheets} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", borderRadius: 6, background: "#161616", cursor: "pointer", marginTop: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: sheetStatus === "ok" ? "#4ade80" : sheetStatus === "error" ? "#f87171" : sheetStatus === "loading" ? "#facc15" : "#444", flexShrink: 0, animation: sheetStatus === "loading" ? "pulse 1s infinite" : "none" }} />
            <span style={{ fontSize: 11, color: sheetStatus === "ok" ? "#4ade80" : sheetStatus === "error" ? "#f87171" : "#888" }}>
              {sheetStatus === "ok" ? "Sheet connecté" : sheetStatus === "error" ? "Sheet déconnecté" : sheetStatus === "loading" ? "Chargement…" : "Non connecté"}
            </span>
          </div>
        </div>

        <nav style={{ padding: "12px 8px", flex: 1 }}>
          {navItems.map(n => (
            <button key={n.id} onClick={() => setTab(n.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", border: "none", borderRadius: 8, cursor: "pointer", marginBottom: 2, background: tab === n.id ? "#c8b89a18" : "transparent", color: tab === n.id ? "#c8b89a" : "#555", fontWeight: tab === n.id ? 700 : 500, fontSize: 13, textAlign: "left", borderLeft: `2px solid ${tab === n.id ? "#c8b89a" : "transparent"}` }}>
              <span style={{ fontSize: 15 }}>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>

        {/* Alertes sidebar */}
        <div style={{ margin: "0 8px 14px", padding: "12px", background: "#161616", borderRadius: 10, border: "1px solid #1f1f1f" }}>
          <div style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, fontWeight: 700 }}>Alertes</div>
          {[
            { label: "Manquants", val: nbAfabriquer, color: "#facc15" },
            { label: "Critiques", val: nbCritiques, color: "#f87171" },
            { label: "Filaments bas", val: nbFilamentsBas, color: "#fb923c" },
          ].map(a => (
            <div key={a.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: 12, color: "#666" }}>{a.label}</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: a.val > 0 ? a.color : "#333" }}>{a.val}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={{ flex: 1, overflow: "auto", padding: "28px 28px 28px" }}>

        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ margin: "0 0 2px", fontWeight: 900, fontSize: 24, letterSpacing: -0.8 }}>Bonjour, Robin 👋</h1>
              <p style={{ margin: 0, color: "#555", fontSize: 13 }}>Vue d'ensemble Kubo Studio · {products.length} produits · {filaments.length} filaments</p>
            </div>

            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Produits en stock", val: products.reduce((s,p)=>s+p.stock,0), accent: "#c8b89a", icon: "◻" },
                { label: "À fabriquer", val: nbAfabriquer, accent: "#facc15", icon: "⚙" },
                { label: "Valeur B2C", val: `${products.reduce((s,p)=>s+(p.stock*p.prixB2C),0).toFixed(0)} €`, accent: "#4ade80", icon: "€" },
                { label: "Filaments bas", val: nbFilamentsBas, accent: "#f87171", icon: "∿" },
              ].map((k,i) => (
                <div key={i} style={{ background: "#161616", borderRadius: 12, padding: 18, border: "1px solid #1f1f1f" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 700 }}>{k.label}</span>
                    <span style={{ color: k.accent, fontSize: 16 }}>{k.icon}</span>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: k.accent, letterSpacing: -1 }}>{k.val}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14 }}>
              {/* Produits */}
              <div style={{ background: "#161616", border: "1px solid #1f1f1f", borderRadius: 14, padding: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 16, color: "#c8b89a" }}>Produits finis</div>
                {products.map(p => {
                  const s = statusP(p);
                  const ss = statusStyle[s];
                  return (
                    <div key={p.sku} onClick={() => { setSelectedProduct(p); setTab("produits"); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #1a1a1a", cursor: "pointer" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{p.nom}</div>
                        <div style={{ fontSize: 11, color: "#555", marginTop: 1 }}>{p.sku}</div>
                        <div style={{ marginTop: 5, background: "#1a1a1a", borderRadius: 3, height: 5 }}>
                          <div style={{ width: `${Math.min(100, (p.stock / Math.max(1,p.minStock)) * 100)}%`, background: ss.color, height: "100%", borderRadius: 3 }} />
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 900, fontSize: 22, color: ss.color }}>{p.stock}</div>
                        <div style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: ss.bg, color: ss.color, border: `1px solid ${ss.border}`, fontWeight: 700, marginTop: 3 }}>{statusLabel[s]}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Filaments */}
              <div style={{ background: "#161616", border: "1px solid #1f1f1f", borderRadius: 14, padding: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 16, color: "#c8b89a" }}>Filaments</div>
                {filaments.map(f => {
                  const pct = pctFilament(f);
                  const col = colFilament(f);
                  return (
                    <div key={f.id} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <div style={{ width: 10, height: 10, borderRadius: "50%", background: f.couleur, border: "1px solid #333", flexShrink: 0 }} />
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{f.nom}</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 800, color: col }}>{f.restant}g</span>
                      </div>
                      <div style={{ background: "#1a1a1a", borderRadius: 3, height: 6 }}>
                        <div style={{ width: `${pct}%`, background: col, height: "100%", borderRadius: 3, transition: "width .4s" }} />
                      </div>
                      <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>{pct}% · {f.total}g total</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── PRODUITS ── */}
        {tab === "produits" && (
          <div>
            <h1 style={{ margin: "0 0 20px", fontWeight: 900, fontSize: 22, letterSpacing: -0.5 }}>Produits finis</h1>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 14 }}>
              {products.map(p => {
                const s = statusP(p);
                const ss = statusStyle[s];
                return (
                  <div key={p.sku} style={{ background: "#161616", borderRadius: 14, border: `1px solid ${ss.border}`, padding: 20 }}>
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 16 }}>{p.nom}</div>
                        <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>SKU: {p.sku}</div>
                      </div>
                      <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, background: ss.bg, color: ss.color, border: `1px solid ${ss.border}`, fontWeight: 700, whiteSpace: "nowrap" }}>{statusLabel[s]}</span>
                    </div>

                    {/* Stock control */}
                    <div style={{ background: "#1a1a1a", borderRadius: 10, padding: 14, marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 12, color: "#888" }}>Stock actuel</span>
                        <span style={{ fontSize: 12, color: "#888" }}>Minimum : {p.minStock}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                        <button onClick={() => updateStock(p.sku, -1)} style={{ width: 32, height: 32, border: "none", borderRadius: 8, background: "#2a1a1a", color: "#f87171", fontWeight: 900, fontSize: 18, cursor: "pointer" }}>-</button>
                        <span style={{ fontSize: 32, fontWeight: 900, color: ss.color }}>{p.stock}</span>
                        <button onClick={() => updateStock(p.sku, 1)} style={{ width: 32, height: 32, border: "none", borderRadius: 8, background: "#1a2a1a", color: "#4ade80", fontWeight: 900, fontSize: 18, cursor: "pointer" }}>+</button>
                      </div>
                      <div style={{ marginTop: 8, background: "#111", borderRadius: 4, height: 6 }}>
                        <div style={{ width: `${Math.min(100,(p.stock/Math.max(1,p.minStock))*100)}%`, background: ss.color, height: "100%", borderRadius: 4 }} />
                      </div>
                    </div>

                    {/* Composants */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, fontWeight: 700 }}>Pièces ({p.composants.length})</div>
                      {p.composants.map((c, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4, color: "#888" }}>
                          <span>{c.part} <span style={{ color: "#444" }}>× {c.qty}</span></span>
                          <span style={{ color: "#666" }}>{c.grams}g · {c.hrs}h{c.min > 0 ? `${c.min}m` : ""}</span>
                        </div>
                      ))}
                    </div>

                    {/* Prix */}
                    <div style={{ display: "flex", gap: 8, fontSize: 12 }}>
                      <div style={{ flex: 1, background: "#1a1a1a", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                        <div style={{ color: "#555" }}>Revient</div>
                        <div style={{ fontWeight: 800, color: "#f0ede8" }}>{p.coutRevient?.toFixed(2) ?? "—"} €</div>
                      </div>
                      <div style={{ flex: 1, background: "#1a2a1a", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                        <div style={{ color: "#555" }}>B2C</div>
                        <div style={{ fontWeight: 800, color: "#4ade80" }}>{p.prixB2C?.toFixed(2) ?? "—"} €</div>
                      </div>
                      <div style={{ flex: 1, background: "#1a1a2a", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                        <div style={{ color: "#555" }}>B2B</div>
                        <div style={{ fontWeight: 800, color: "#60a5fa" }}>{p.prixB2B?.toFixed(2) ?? "—"} €</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── FILAMENTS ── */}
        {tab === "filaments" && (
          <div>
            <h1 style={{ margin: "0 0 20px", fontWeight: 900, fontSize: 22, letterSpacing: -0.5 }}>Filaments & matériaux</h1>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
              {filaments.map(f => {
                const pct = pctFilament(f);
                const col = colFilament(f);
                return (
                  <div key={f.id} style={{ background: "#161616", border: `1px solid ${pct < 30 ? "#3a2000" : "#1f1f1f"}`, borderRadius: 14, padding: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                      <div style={{ width: 42, height: 42, borderRadius: "50%", background: f.couleur, border: "2px solid #2a2a2a", flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>{f.nom}</div>
                        <div style={{ fontSize: 11, color: "#555" }}>{f.type || "PLA"}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 28, fontWeight: 900, color: col }}>{f.restant}</span>
                      <span style={{ color: "#444", alignSelf: "flex-end", paddingBottom: 4 }}>/ {f.total} g</span>
                    </div>
                    <div style={{ background: "#1a1a1a", borderRadius: 5, height: 10, marginBottom: 8 }}>
                      <div style={{ width: `${pct}%`, background: col, height: "100%", borderRadius: 5, transition: "width .4s" }} />
                    </div>
                    <div style={{ fontSize: 11, color: "#555", marginBottom: 14 }}>{pct}% restant{f.prixParKg ? ` · ${f.prixParKg} €/kg` : ""}</div>
                    {/* Slider pour ajuster */}
                    <div style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>Ajuster le stock :</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input type="range" min="0" max={f.total} value={f.restant}
                        onChange={e => updateFilament(f.id, Number(e.target.value))}
                        style={{ flex: 1, accentColor: col }} />
                      <input type="number" min="0" max={f.total} value={f.restant}
                        onChange={e => updateFilament(f.id, Number(e.target.value))}
                        style={{ width: 64, padding: "4px 6px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6, color: col, fontWeight: 700, fontSize: 12, outline: "none" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── PLAN DE PRODUCTION ── */}
        {tab === "plan" && (
          <div>
            <h1 style={{ margin: "0 0 6px", fontWeight: 900, fontSize: 22, letterSpacing: -0.5 }}>Plan de production</h1>
            <p style={{ margin: "0 0 22px", color: "#555", fontSize: 13 }}>Ce qu'il faut fabriquer pour atteindre les stocks minimaux.</p>

            {products.filter(p => p.stock < p.minStock).length === 0 ? (
              <div style={{ background: "#161616", border: "1px solid #1f3020", borderRadius: 14, padding: 32, textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
                <div style={{ fontWeight: 800, color: "#4ade80" }}>Tous les stocks sont au niveau minimum !</div>
              </div>
            ) : products.filter(p => p.stock < p.minStock).map(p => {
              const need = p.minStock - p.stock;
              const totalFilament = p.composants.reduce((s, c) => {
                const key = c.filament;
                if (!s[key]) s[key] = 0;
                s[key] += c.grams * need;
                return s;
              }, {});
              const totalTime = p.composants.reduce((s, c) => s + (c.hrs * 60 + c.min), 0);
              return (
                <div key={p.sku} style={{ background: "#161616", border: "1px solid #3a2e0a", borderRadius: 14, padding: 20, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>{p.nom}</div>
                      <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>Stock : {p.stock} · Min : {p.minStock} · <span style={{ color: "#facc15" }}>À fabriquer : {need}</span></div>
                    </div>
                    <button onClick={() => updateStock(p.sku, need)} style={{ padding: "8px 16px", border: "none", borderRadius: 8, background: "#c8b89a", color: "#0c0c0c", fontWeight: 800, cursor: "pointer", fontSize: 13 }}>
                      ✓ Marquer fabriqué (+{need})
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, fontWeight: 700 }}>Pièces à imprimer (× {need})</div>
                      {p.composants.map((c, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#888", marginBottom: 4, padding: "4px 0", borderBottom: "1px solid #1a1a1a" }}>
                          <span>{c.part}</span>
                          <span style={{ color: printerColor(c.printer) }}>{c.grams * need}g · {c.printer.replace("Bambu Lab ", "")}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, fontWeight: 700 }}>Filaments nécessaires</div>
                      {Object.entries(totalFilament).map(([fil, g]) => {
                        const f = filaments.find(x => x.nom.toLowerCase().includes(fil.toLowerCase().replace("sunlu ", "").trim().substring(0, 10)));
                        const ok = !f || f.restant >= g;
                        return (
                          <div key={fil} style={{ fontSize: 12, marginBottom: 4, color: ok ? "#888" : "#f87171" }}>
                            {ok ? "✓" : "✗"} {fil.replace("SUNLU ", "")} : <strong style={{ color: ok ? "#c8b89a" : "#f87171" }}>{g}g</strong>
                            {f ? <span style={{ color: "#444" }}> (dispo: {f.restant}g)</span> : null}
                          </div>
                        );
                      })}
                      <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
                        ⏱ Temps estimé : <strong style={{ color: "#c8b89a" }}>{Math.floor(totalTime / 60)}h{totalTime % 60}m</strong> par unité
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── COÛTS ── */}
        {tab === "couts" && (
          <div>
            <h1 style={{ margin: "0 0 6px", fontWeight: 900, fontSize: 22, letterSpacing: -0.5 }}>Analyse des coûts</h1>
            <p style={{ margin: "0 0 22px", color: "#555", fontSize: 13 }}>Données importées depuis Google Sheets · Calcul coût de revient</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
              {products.map(p => {
                const marge = p.prixB2C ? ((p.prixB2C - p.coutRevient) / p.prixB2C * 100).toFixed(0) : 0;
                const totalFilG = p.composants.reduce((s, c) => s + c.grams, 0);
                const coutFil = p.composants.reduce((s, c) => s + c.filCost, 0);
                return (
                  <div key={p.sku} style={{ background: "#161616", border: "1px solid #1f1f1f", borderRadius: 14, padding: 20 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{p.nom}</div>
                    <div style={{ fontSize: 11, color: "#555", marginBottom: 16 }}>{p.sku}</div>
                    {[
                      { label: "Filament", val: `${coutFil.toFixed(2)} €`, sub: `${totalFilG}g`, color: "#c8b89a" },
                      { label: "Packaging", val: `${p.packaging.reduce((s,pk)=>s+pk.total,0).toFixed(2)} €`, sub: `${p.packaging.length} éléments`, color: "#60a5fa" },
                      { label: "Coût total", val: `${p.coutRevient?.toFixed(2) ?? "—"} €`, sub: "revient", color: "#f0ede8" },
                      { label: "Prix B2C", val: `${p.prixB2C?.toFixed(2) ?? "—"} €`, sub: `marge ${marge}%`, color: "#4ade80" },
                      { label: "Prix B2B", val: `${p.prixB2B?.toFixed(2) ?? "—"} €`, sub: "3× le revient", color: "#a78bfa" },
                    ].map(row => (
                      <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #1a1a1a" }}>
                        <div>
                          <div style={{ fontSize: 13 }}>{row.label}</div>
                          <div style={{ fontSize: 10, color: "#444" }}>{row.sub}</div>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: row.color }}>{row.val}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── SYNC GOOGLE SHEETS ── */}
        {tab === "sync" && (
          <div>
            <h1 style={{ margin: "0 0 6px", fontWeight: 900, fontSize: 22, letterSpacing: -0.5 }}>Connexion Google Sheets</h1>
            <p style={{ margin: "0 0 22px", color: "#555", fontSize: 13 }}>Synchronisation automatique de tes données produits et matériaux.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              {/* Status */}
              <div style={{ background: "#161616", border: "1px solid #1f1f1f", borderRadius: 14, padding: 24 }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16, color: "#c8b89a" }}>Statut de la connexion</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: sheetStatus === "ok" ? "#4ade80" : sheetStatus === "error" ? "#f87171" : "#facc15", flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, color: sheetStatus === "ok" ? "#4ade80" : sheetStatus === "error" ? "#f87171" : "#facc15" }}>
                    {sheetStatus === "ok" ? "Connecté" : sheetStatus === "error" ? "Erreur de connexion" : "Chargement…"}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#555", marginBottom: 8 }}>Sheet ID :</div>
                <div style={{ fontSize: 11, color: "#888", background: "#1a1a1a", padding: "8px 12px", borderRadius: 8, wordBreak: "break-all", marginBottom: 16 }}>{SHEET_ID}</div>
                <div style={{ fontSize: 12, color: "#555", marginBottom: 8 }}>Onglets importés :</div>
                {["Lampe Canopé 2602_", "Vase Cepage 01 _Wood", "Copie de Vase Cepage 01 _Transparent", "Materials"].map(s => (
                  <div key={s} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#888", marginBottom: 3 }}>
                    <span style={{ color: sheetStatus === "ok" ? "#4ade80" : "#444" }}>✓</span>{s}
                  </div>
                ))}
                <button onClick={loadFromSheets} disabled={loading} style={{ marginTop: 16, width: "100%", padding: "10px", border: "none", borderRadius: 9, cursor: loading ? "not-allowed" : "pointer", background: loading ? "#1a1a1a" : "#c8b89a", color: loading ? "#444" : "#0c0c0c", fontWeight: 800, fontSize: 13 }}>
                  {loading ? "⏳ Synchronisation…" : "↻ Resynchroniser"}
                </button>
              </div>

              {/* Instructions */}
              <div style={{ background: "#161616", border: "1px solid #1f1f1f", borderRadius: 14, padding: 24 }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16, color: "#c8b89a" }}>Comment ça marche</div>
                {[
                  { step: "1", title: "Lecture automatique", desc: "L'app lit ton sheet Google public à l'ouverture et extrait les produits, composants, coûts." },
                  { step: "2", title: "Structure reconnue", desc: "SKU, nom, pièces, filaments, heures d'impression, prix B2C/B2B sont tous importés." },
                  { step: "3", title: "Stock géré localement", desc: "Le stock actuel est mis à jour dans l'app. Tu peux le modifier manuellement dans l'onglet Produits." },
                  { step: "4", title: "Ajouter un produit", desc: "Crée un nouvel onglet dans ton sheet avec le même format — il sera détecté automatiquement." },
                ].map(item => (
                  <div key={item.step} style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#c8b89a20", border: "1px solid #c8b89a40", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#c8b89a", flexShrink: 0 }}>{item.step}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Onglet Stock à créer */}
            <div style={{ background: "#161616", border: "1px solid #2a1f10", borderRadius: 14, padding: 24 }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6, color: "#facc15" }}>💡 Prochaine étape : ajouter un onglet "Stock" dans ton sheet</div>
              <p style={{ fontSize: 13, color: "#666", marginBottom: 14, margin: "0 0 16px" }}>Pour synchroniser le stock en temps réel, crée un onglet nommé <strong style={{ color: "#c8b89a" }}>Stock</strong> dans ton Google Sheet avec ces colonnes :</p>
              <div style={{ background: "#1a1a1a", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", background: "#222", padding: "8px 16px" }}>
                  {["A: SKU", "B: Nom", "C: Stock actuel", "D: Stock minimum"].map(h => (
                    <div key={h} style={{ fontSize: 12, color: "#c8b89a", fontWeight: 700 }}>{h}</div>
                  ))}
                </div>
                {products.map(p => (
                  <div key={p.sku} style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", padding: "7px 16px", borderTop: "1px solid #1f1f1f" }}>
                    {[p.sku, p.nom, p.stock, p.minStock].map((v, i) => (
                      <div key={i} style={{ fontSize: 12, color: "#888" }}>{v}</div>
                    ))}
                  </div>
                ))}
              </div>
              <a href={`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", padding: "10px 20px", background: "#4285f420", border: "1px solid #4285f440", borderRadius: 9, color: "#4285f4", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
                ↗ Ouvrir le Google Sheet
              </a>
            </div>
          </div>
        )}
      </main>

      {/* ── TOAST ── */}
      {toast && (
        <div style={{ position: "fixed", bottom: 22, right: 22, padding: "11px 18px", borderRadius: 10, fontWeight: 700, fontSize: 13, zIndex: 300,
          background: toast.type === "err" ? "#3a1010" : toast.type === "warn" ? "#3a2e0a" : "#1a2a1a",
          color: toast.type === "err" ? "#f87171" : toast.type === "warn" ? "#facc15" : "#4ade80",
          border: `1px solid ${toast.type === "err" ? "#4a1818" : toast.type === "warn" ? "#4a3a0a" : "#1f3a22"}`,
          boxShadow: "0 8px 32px rgba(0,0,0,.6)" }}>
          {toast.msg}
        </div>
      )}

      <style>{`* { box-sizing: border-box; } ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 3px; } @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }`}</style>
    </div>
  );
}
