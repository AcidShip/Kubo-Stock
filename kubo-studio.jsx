import { useState } from "react";

// ─── DATA ────────────────────────────────────────────────────────────────────

// ─── DONNÉES IMPORTÉES DEPUIS GOOGLE SHEET "Calcul Cout revient Kubo" ────────
// Dernière synchro : 02/03/2026

const initFilaments = [
  // Source : onglet Materials + colonnes Filament du Sheet
  { id: "f1", nom: "SUNLU PLA+ Transparent", couleur: "#d6eef8", restant: 750,  total: 1000, unite: "g", prixKg: 12.68 },
  { id: "f2", nom: "SUNLU PLA (blanc)",       couleur: "#f2ede4", restant: 620,  total: 1000, unite: "g", prixKg: 12.40 },
  { id: "f3", nom: "SUNLU PLA+ Wood",         couleur: "#b5833a", restant: 480,  total: 1000, unite: "g", prixKg: 14.90 },
  { id: "f4", nom: "SUNLU PLA Noir",          couleur: "#1e1e1e", restant: 900,  total: 1000, unite: "g", prixKg: 12.40 },
  { id: "f5", nom: "SUNLU PLA Terracotta",    couleur: "#c4602a", restant: 350,  total: 1000, unite: "g", prixKg: 13.50 },
];

// Parties (composants) — poids issus des colonnes "Filament (g)" du Sheet
const initComposants = [
  // ── Lampe Canopée Transparent (C0001) ──
  { id: "c1",  nom: "Top (Canopée)",          stock: 5,  minStock: 4, filamentId: "f1", filamentQte: 119, useDans: ["p1","p2"] },
  { id: "c2",  nom: "Pied (Canopée)",         stock: 3,  minStock: 4, filamentId: "f1", filamentQte: 187, useDans: ["p1","p2"] },
  { id: "c3",  nom: "Couvercle (Canopée)",    stock: 8,  minStock: 4, filamentId: "f2", filamentQte: 9,   useDans: ["p1","p2"] },
  { id: "c4",  nom: "Cul (Canopée)",          stock: 5,  minStock: 4, filamentId: "f2", filamentQte: 50,  useDans: ["p1","p2"] },
  { id: "c5",  nom: "Invert (Canopée)",       stock: 4,  minStock: 4, filamentId: "f1", filamentQte: 23,  useDans: ["p1","p2"] },
  // ── Vase Cépage Wood ──
  { id: "c6",  nom: "Corps Cépage (Wood)",    stock: 6,  minStock: 5, filamentId: "f3", filamentQte: 210, useDans: ["p3"] },
  { id: "c7",  nom: "Col Cépage (Wood)",      stock: 6,  minStock: 5, filamentId: "f3", filamentQte: 45,  useDans: ["p3"] },
  // ── Vase Cépage Transparent ──
  { id: "c8",  nom: "Corps Cépage (Transp.)", stock: 4,  minStock: 5, filamentId: "f1", filamentQte: 210, useDans: ["p4"] },
  { id: "c9",  nom: "Col Cépage (Transp.)",   stock: 4,  minStock: 5, filamentId: "f1", filamentQte: 45,  useDans: ["p4"] },
];

// Produits finis — prixRevient, prixB2C, prixB2B issus du Sheet
const initProduits = [
  {
    id: "p1", sku: "C0001",
    nom: "Lampe Canopée Transparent",
    categorie: "Lampe", image: "🪔",
    stock: 4, minStock: 6,
    composants: ["c1","c2","c3","c4","c5"],
    prixRevient: 16.83, prixB2C: 117.81, prixB2B: 67.32,
    markupB2C: 600, markupB2B: 300,
  },
  {
    id: "p2", sku: "C0002",
    nom: "Lampe Canopée Wood",
    categorie: "Lampe", image: "🪔",
    stock: 2, minStock: 5,
    composants: ["c2","c3","c4","c5"],
    prixRevient: null, prixB2C: null, prixB2B: null,
    markupB2C: 600, markupB2B: 300,
  },
  {
    id: "p3", sku: "V0001",
    nom: "Vase Cépage Wood",
    categorie: "Vase", image: "🏺",
    stock: 6, minStock: 8,
    composants: ["c6","c7"],
    prixRevient: null, prixB2C: null, prixB2B: null,
    markupB2C: 600, markupB2B: 300,
  },
  {
    id: "p4", sku: "V0002",
    nom: "Vase Cépage Transparent",
    categorie: "Vase", image: "🏺",
    stock: 3, minStock: 8,
    composants: ["c8","c9"],
    prixRevient: null, prixB2C: null, prixB2B: null,
    markupB2C: 600, markupB2B: 300,
  },
];

const CATEGORIES_PRODUIT = ["Lampe", "Vase", "Bougeoir", "Autre"];
const EMOJIS = ["🪔","💡","🏺","🫙","🕯️","🌿","🪴","🧊","🌸","💎","⭐","🎨","🔮","🫶","🌙"];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function maxFabricable(produit, composants) {
  if (!produit.composants.length) return 999;
  return Math.min(...produit.composants.map(cid => {
    const c = composants.find(x => x.id === cid);
    return c ? c.stock : 0;
  }));
}

function statusProduit(p, composants) {
  const fab = maxFabricable(p, composants);
  const total = p.stock + fab;
  if (p.stock >= p.minStock) return "ok";
  if (total >= p.minStock) return "fabricable";
  return "critique";
}

// ─── APP ─────────────────────────────────────────────────────────────────────

export default function KuboStudio() {
  const [tab, setTab] = useState("dashboard");
  const [produits, setProduits] = useState(initProduits);
  const [composants, setComposants] = useState(initComposants);
  const [filaments, setFilaments] = useState(initFilaments);
  const [cat, setCat] = useState("Tout");
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);

  const showToast = (msg, type = "ok") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3200); };

  const aFabriquer = produits.filter(p => p.stock < p.minStock).reduce((s, p) => s + Math.max(0, p.minStock - p.stock), 0);
  const critique = produits.filter(p => statusProduit(p, composants) === "critique").length;
  const filamentBas = filaments.filter(f => f.restant / f.total < 0.3).length;

  // Valeur du stock B2C (produits avec prix connu)
  const valeurStockB2C = produits.reduce((s, p) => s + (p.prixB2C || 0) * p.stock, 0);
  const valeurStockCout = produits.reduce((s, p) => s + (p.prixRevient || 0) * p.stock, 0);

  const fabriquerProduit = (produit, qte) => {
    const fab = maxFabricable(produit, composants);
    if (fab < qte) { showToast("Pas assez de composants !", "err"); return; }
    setComposants(composants.map(c =>
      produit.composants.includes(c.id) ? { ...c, stock: c.stock - qte } : c
    ));
    setProduits(produits.map(p => p.id === produit.id ? { ...p, stock: p.stock + qte } : p));
    showToast(`+${qte} ${produit.nom} fabriqué(s) ✓`);
  };

  const fabriquerComposant = (comp, qte) => {
    const f = filaments.find(x => x.id === comp.filamentId);
    const besoin = comp.filamentQte * qte;
    if (!f || f.restant < besoin) { showToast("Pas assez de filament !", "err"); return; }
    setFilaments(filaments.map(fil => fil.id === f.id ? { ...fil, restant: fil.restant - besoin } : fil));
    setComposants(composants.map(c => c.id === comp.id ? { ...c, stock: c.stock + qte } : c));
    showToast(`+${qte} "${comp.nom}" fabriqué(s), -${besoin}${f.unite} ${f.nom} ✓`);
  };

  // CRUD Produits
  const saveProduit = (data, editId) => {
    if (editId) {
      setProduits(produits.map(p => p.id === editId ? { ...p, ...data } : p));
      showToast("Produit mis à jour ✓");
    } else {
      setProduits([...produits, { ...data, id: "p" + Date.now(), stock: 0 }]);
      showToast("Produit créé ✓");
    }
  };
  const deleteProduit = (id) => {
    setProduits(produits.filter(p => p.id !== id));
    setComposants(composants.map(c => ({ ...c, useDans: c.useDans.filter(pid => pid !== id) })));
    showToast("Produit supprimé", "warn");
  };

  // CRUD Composants
  const saveComposant = (data, editId) => {
    if (editId) {
      setComposants(composants.map(c => c.id === editId ? { ...c, ...data } : c));
      showToast("Composant mis à jour ✓");
    } else {
      setComposants([...composants, { ...data, id: "c" + Date.now() }]);
      showToast("Composant créé ✓");
    }
  };
  const deleteComposant = (id) => {
    setComposants(composants.filter(c => c.id !== id));
    setProduits(produits.map(p => ({ ...p, composants: p.composants.filter(cid => cid !== id) })));
    showToast("Composant supprimé", "warn");
  };

  // CRUD Filaments
  const saveFilament = (data, editId) => {
    if (editId) {
      setFilaments(filaments.map(f => f.id === editId ? { ...f, ...data } : f));
      showToast("Filament mis à jour ✓");
    } else {
      setFilaments(prev => [...prev, { id: "f" + Date.now(), ...data }]);
      showToast("Filament ajouté ✓");
    }
  };
  const deleteFilament = (id) => {
    setFilaments(filaments.filter(f => f.id !== id));
    setComposants(composants.map(c => c.filamentId === id ? { ...c, filamentId: "" } : c));
    showToast("Filament supprimé", "warn");
  };

  const filtered = produits.filter(p => cat === "Tout" || p.categorie === cat);

  const badge = (s) => ({
    ok:         { bg: "#e6f4ee", color: "#1a6b40", label: "En stock" },
    fabricable: { bg: "#fff3cd", color: "#7a4f00", label: "À fabriquer" },
    critique:   { bg: "#fde8e8", color: "#9b1c1c", label: "Critique" },
  }[s] || {});

  const filamentBar = (f) => {
    const pct = (f.restant / f.total) * 100;
    const col = pct > 50 ? "#4ade80" : pct > 25 ? "#facc15" : "#f87171";
    return { pct, col };
  };

  const CATEGORIES_ALL = ["Tout", ...CATEGORIES_PRODUIT];

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", background: "#141414", color: "#f0ede8" }}>

      {/* ── SIDEBAR ── */}
      <aside style={{ width: 220, background: "#0e0e0e", borderRight: "1px solid #242424", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "28px 20px 20px", borderBottom: "1px solid #242424" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,#c8b89a,#8a6a40)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 15, color: "#0e0e0e" }}>K</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 15, letterSpacing: -0.5, color: "#f0ede8" }}>Kubo Studio</div>
              <div style={{ fontSize: 10, color: "#555", letterSpacing: 1, textTransform: "uppercase" }}>Gestion stock</div>
            </div>
          </div>
        </div>

        <nav style={{ padding: "16px 10px", flex: 1 }}>
          {[
            { id: "dashboard",  icon: "◈", label: "Vue d'ensemble" },
            { id: "produits",   icon: "◻", label: "Produits finis" },
            { id: "composants", icon: "⬡", label: "Composants" },
            { id: "filaments",  icon: "∿", label: "Filaments" },
            { id: "fabriquer",  icon: "⚙", label: "Fabriquer" },
          ].map(n => (
            <button key={n.id} onClick={() => setTab(n.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", border: "none", borderRadius: 8, cursor: "pointer", marginBottom: 2, background: tab === n.id ? "#c8b89a18" : "transparent", color: tab === n.id ? "#c8b89a" : "#555", fontWeight: tab === n.id ? 700 : 500, fontSize: 14, textAlign: "left", transition: "all .15s", borderLeft: tab === n.id ? "2px solid #c8b89a" : "2px solid transparent" }}>
              <span style={{ fontSize: 16 }}>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: "12px", margin: "0 10px 16px", background: "#1a1a1a", borderRadius: 12, border: "1px solid #2a2a2a" }}>
          <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Alertes</div>
          {[
            { label: "À fabriquer", val: aFabriquer, color: "#facc15" },
            { label: "Critiques",   val: critique,   color: "#f87171" },
            { label: "Filament bas",val: filamentBas, color: "#fb923c" },
          ].map(a => (
            <div key={a.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: "#888" }}>{a.label}</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: a.val > 0 ? a.color : "#444" }}>{a.val}</span>
            </div>
          ))}
        </div>

        <div style={{ padding: "10px 12px", margin: "0 10px 16px", background: "#0d1f12", borderRadius: 10, border: "1px solid #1a3320" }}>
          <div style={{ fontSize: 10, color: "#4ade80", fontWeight: 700, marginBottom: 3 }}>✓ Google Sheet sync</div>
          <div style={{ fontSize: 10, color: "#2a5535" }}>Calcul Cout revient Kubo</div>
          <div style={{ fontSize: 10, color: "#2a5535", marginTop: 2 }}>02/03/2026 · 4 produits · 9 parties</div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={{ flex: 1, overflow: "auto", padding: 32 }}>

        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && (
          <div>
            <h1 style={{ margin: "0 0 4px", fontWeight: 900, fontSize: 26, letterSpacing: -1 }}>Bonjour, Robin 👋</h1>
            <p style={{ margin: "0 0 28px", color: "#555", fontSize: 14 }}>Voici l'état de ton atelier aujourd'hui.</p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Produits finis", val: produits.reduce((s,p)=>s+p.stock,0), sub: `${produits.length} références`, icon: "◻", accent: "#c8b89a" },
                { label: "Valeur stock B2C", val: valeurStockB2C > 0 ? `${valeurStockB2C.toFixed(0)}€` : "—", sub: `Coût: ${valeurStockCout.toFixed(0)}€`, icon: "€", accent: "#4ade80" },
                { label: "À fabriquer",   val: aFabriquer, sub: "pour atteindre les mins", icon: "⚙", accent: "#facc15" },
                { label: "Filaments",     val: `${filaments.reduce((s,f)=>s+f.restant,0)}g`, sub: `${filamentBas} bobine(s) basses`, icon: "∿", accent: filamentBas > 0 ? "#fb923c" : "#60a5fa" },
              ].map((k,i) => (
                <div key={i} style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 14, padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700 }}>{k.label}</div>
                    <span style={{ color: k.accent, fontSize: 18 }}>{k.icon}</span>
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1, color: k.accent }}>{k.val}</div>
                  <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>{k.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
              <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 14, padding: 22 }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 18, color: "#f0ede8" }}>Statut des produits</div>
                {produits.map(p => {
                  const s = statusProduit(p, composants);
                  const b = badge(s);
                  const fab = maxFabricable(p, composants);
                  const need = Math.max(0, p.minStock - p.stock);
                  return (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #222" }}>
                      <span style={{ fontSize: 22 }}>{p.image}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{p.nom}</div>
                        <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
                          {need > 0 ? <span style={{ color: "#facc15" }}>⚙ {need} à fabriquer · </span> : null}
                          {fab > 0 ? <span style={{ color: "#60a5fa" }}>{fab} faisable(s)</span> : <span style={{ color: "#f87171" }}>composants manquants</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 900, fontSize: 20 }}>{p.stock}</div>
                        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: b.bg, color: b.color, fontWeight: 700 }}>{b.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 14, padding: 22 }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 18, color: "#f0ede8" }}>Filaments & résines</div>
                {filaments.map(f => {
                  const { pct, col } = filamentBar(f);
                  return (
                    <div key={f.id} style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 12, height: 12, borderRadius: "50%", background: f.couleur, border: "1px solid #333" }} />
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{f.nom}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 800, color: col }}>{f.restant}{f.unite}</span>
                      </div>
                      <div style={{ background: "#2a2a2a", borderRadius: 4, height: 6 }}>
                        <div style={{ width: `${pct}%`, background: col, height: "100%", borderRadius: 4, transition: "width .4s" }} />
                      </div>
                      <div style={{ fontSize: 10, color: "#444", marginTop: 3 }}>{Math.round(pct)}% restant</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── PRODUITS FINIS ── */}
        {tab === "produits" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h1 style={{ margin: 0, fontWeight: 900, fontSize: 24, letterSpacing: -0.5 }}>Produits finis</h1>
              <div style={{ display: "flex", gap: 8 }}>
                {CATEGORIES_ALL.map(c => (
                  <button key={c} onClick={() => setCat(c)} style={{ padding: "7px 16px", border: "1px solid #2a2a2a", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13, background: cat === c ? "#c8b89a" : "#1a1a1a", color: cat === c ? "#0e0e0e" : "#555" }}>{c}</button>
                ))}
                <button onClick={() => setModal({ type: "edit_produit", data: null })} style={{ padding: "7px 18px", border: "none", borderRadius: 8, cursor: "pointer", background: "#c8b89a", color: "#0e0e0e", fontWeight: 800, fontSize: 13 }}>+ Nouveau</button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
              {filtered.map(p => {
                const s = statusProduit(p, composants);
                const b = badge(s);
                const fab = maxFabricable(p, composants);
                const need = Math.max(0, p.minStock - p.stock);
                return (
                  <div key={p.id} style={{ background: "#1a1a1a", border: `1px solid ${s === "critique" ? "#4a1f1f" : s === "fabricable" ? "#3a3010" : "#2a2a2a"}`, borderRadius: 14, padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <span style={{ fontSize: 32 }}>{p.image}</span>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, background: b.bg, color: b.color, fontWeight: 700 }}>{b.label}</span>
                        <button onClick={() => setModal({ type: "edit_produit", data: p })} title="Modifier" style={{ padding: "4px 8px", border: "1px solid #2a2a2a", borderRadius: 6, cursor: "pointer", background: "transparent", color: "#c8b89a", fontSize: 13 }}>✎</button>
                        <button onClick={() => deleteProduit(p.id)} title="Supprimer" style={{ padding: "4px 8px", border: "1px solid #2a2a2a", borderRadius: 6, cursor: "pointer", background: "transparent", color: "#f87171", fontSize: 13 }}>✕</button>
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 2 }}>{p.nom}</div>
                    <div style={{ fontSize: 12, color: "#555", marginBottom: 14, display: "flex", gap: 8 }}>
                      <span>{p.categorie}</span>
                      {p.sku && <span style={{ color: "#c8b89a", fontWeight: 700 }}>#{p.sku}</span>}
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                      <div style={{ flex: 1, background: "#2a2a2a", borderRadius: 4, height: 8 }}>
                        <div style={{ width: `${Math.min(100, (p.stock / p.minStock) * 100)}%`, background: s === "ok" ? "#4ade80" : s === "fabricable" ? "#facc15" : "#f87171", height: "100%", borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 800 }}>{p.stock}<span style={{ color: "#444", fontWeight: 400 }}>/{p.minStock}</span></span>
                    </div>

                    <div style={{ fontSize: 12, color: "#555", marginBottom: 14 }}>
                      {need > 0 ? <span style={{ color: "#facc15" }}>⚙ {need} à fabriquer · </span> : null}
                      <span style={{ color: fab > 0 ? "#60a5fa" : "#f87171" }}>{fab} réalisable{fab > 1 ? "s" : ""}</span>
                    </div>

                    <div style={{ borderTop: "1px solid #242424", paddingTop: 12, marginBottom: 14 }}>
                      <div style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Composants nécessaires</div>
                      {p.composants.length === 0 && <div style={{ fontSize: 12, color: "#444" }}>Aucun composant défini</div>}
                      {p.composants.map(cid => {
                        const c = composants.find(x => x.id === cid);
                        if (!c) return null;
                        const ok = c.stock >= 1;
                        return (
                          <div key={cid} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                            <span style={{ color: ok ? "#888" : "#f87171" }}>{ok ? "✓" : "✗"} {c.nom}</span>
                            <span style={{ fontWeight: 700, color: ok ? "#888" : "#f87171" }}>{c.stock} dispo</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* ── Coût de revient ── */}
                    {p.prixRevient ? (
                      <div style={{ borderTop: "1px solid #242424", paddingTop: 12, marginBottom: 14 }}>
                        <div style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>💰 Coût de revient · Sheet</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, textAlign: "center" }}>
                          {[
                            { label: "Revient", val: p.prixRevient, color: "#888" },
                            { label: "B2C", val: p.prixB2C, color: "#4ade80" },
                            { label: "B2B", val: p.prixB2B, color: "#60a5fa" },
                          ].map(({ label, val, color }) => (
                            <div key={label} style={{ background: "#111", borderRadius: 8, padding: "6px 4px" }}>
                              <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
                              <div style={{ fontSize: 14, fontWeight: 900, color }}>{val?.toFixed(2)}€</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ fontSize: 10, color: "#333", textAlign: "center", marginTop: 6 }}>
                          ×{p.markupB2C}% B2C · ×{p.markupB2B}% B2B
                        </div>
                      </div>
                    ) : (
                      <div style={{ borderTop: "1px solid #242424", paddingTop: 12, marginBottom: 14 }}>
                        <div style={{ fontSize: 11, color: "#333", fontStyle: "italic" }}>
                          Coût non calculé — ajouter dans le Sheet
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => setModal({ type: "fabriquer_produit", data: p })}
                      disabled={fab === 0}
                      style={{ width: "100%", padding: "10px", border: "none", borderRadius: 8, cursor: fab > 0 ? "pointer" : "not-allowed", background: fab > 0 ? "#c8b89a" : "#1f1f1f", color: fab > 0 ? "#0e0e0e" : "#333", fontWeight: 800, fontSize: 13 }}>
                      ⚙ Fabriquer un lot
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── COMPOSANTS ── */}
        {tab === "composants" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h1 style={{ margin: 0, fontWeight: 900, fontSize: 24, letterSpacing: -0.5 }}>Composants partagés</h1>
              <button onClick={() => setModal({ type: "edit_composant", data: null })} style={{ padding: "9px 18px", border: "none", borderRadius: 9, cursor: "pointer", background: "#c8b89a", color: "#0e0e0e", fontWeight: 800, fontSize: 13 }}>+ Nouveau</button>
            </div>
            <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 14, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                    {["Composant","Stock","Min.","Filament requis","Utilisé dans","Statut","Actions"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: "#444", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {composants.map(c => {
                    const f = filaments.find(x => x.id === c.filamentId);
                    const peutFabriquer = f ? Math.floor(f.restant / c.filamentQte) : 0;
                    const s = c.stock >= c.minStock ? "ok" : c.stock > 0 ? "bas" : "vide";
                    const bColors = { ok: ["#e6f4ee","#1a6b40"], bas: ["#fff3cd","#7a4f00"], vide: ["#fde8e8","#9b1c1c"] };
                    const [bg, col] = bColors[s];
                    const produitsConcerned = c.useDans.map(pid => produits.find(p => p.id === pid)?.nom).filter(Boolean);
                    return (
                      <tr key={c.id} style={{ borderBottom: "1px solid #1f1f1f" }}>
                        <td style={{ padding: "12px 16px", fontWeight: 700, fontSize: 14 }}>{c.nom}</td>
                        <td style={{ padding: "12px 16px", fontWeight: 900, fontSize: 20 }}>{c.stock}</td>
                        <td style={{ padding: "12px 16px", color: "#555" }}>{c.minStock}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13 }}>
                          {f ? (
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: f.couleur, border: "1px solid #333" }} />
                                <span style={{ color: "#888" }}>{f.nom}</span>
                              </div>
                              <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>{c.filamentQte}{f.unite} / pièce · <span style={{ color: "#60a5fa" }}>{peutFabriquer} faisable(s)</span></div>
                            </div>
                          ) : <span style={{ color: "#f87171" }}>Non défini</span>}
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 12, color: "#555" }}>
                          {produitsConcerned.length ? produitsConcerned.map(nom => <div key={nom}>• {nom}</div>) : <span style={{ color: "#333" }}>—</span>}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, background: bg, color: col, fontWeight: 700 }}>
                            {s === "ok" ? "OK" : s === "bas" ? "BAS" : "VIDE"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => setModal({ type: "fabriquer_composant", data: c })} disabled={peutFabriquer === 0} style={{ padding: "5px 12px", border: "none", borderRadius: 7, cursor: peutFabriquer > 0 ? "pointer" : "not-allowed", background: peutFabriquer > 0 ? "#c8b89a" : "#1f1f1f", color: peutFabriquer > 0 ? "#0e0e0e" : "#333", fontWeight: 800, fontSize: 12 }}>+ Fabriquer</button>
                            <button onClick={() => setModal({ type: "edit_composant", data: c })} style={{ padding: "5px 10px", border: "1px solid #2a2a2a", borderRadius: 7, cursor: "pointer", background: "transparent", color: "#c8b89a", fontSize: 12 }}>✎</button>
                            <button onClick={() => deleteComposant(c.id)} style={{ padding: "5px 10px", border: "1px solid #2a2a2a", borderRadius: 7, cursor: "pointer", background: "transparent", color: "#f87171", fontSize: 12 }}>✕</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── FILAMENTS ── */}
        {tab === "filaments" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h1 style={{ margin: 0, fontWeight: 900, fontSize: 24, letterSpacing: -0.5 }}>Filaments & résines</h1>
              <button onClick={() => setModal({ type: "edit_filament", data: null })} style={{ padding: "9px 18px", border: "none", borderRadius: 9, cursor: "pointer", background: "#c8b89a", color: "#0e0e0e", fontWeight: 800, fontSize: 13 }}>+ Ajouter</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
              {filaments.map(f => {
                const { pct, col } = filamentBar(f);
                const composantsUsing = composants.filter(c => c.filamentId === f.id);
                return (
                  <div key={f.id} style={{ background: "#1a1a1a", border: `1px solid ${pct < 30 ? "#4a2500" : "#2a2a2a"}`, borderRadius: 14, padding: 22 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: "50%", background: f.couleur, border: "2px solid #333", flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 15 }}>{f.nom}</div>
                          <div style={{ fontSize: 11, color: "#555" }}>{f.unite === "g" ? "Filament" : "Résine"}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 5 }}>
                        <button onClick={() => setModal({ type: "edit_filament", data: f })} style={{ padding: "4px 8px", border: "1px solid #2a2a2a", borderRadius: 6, cursor: "pointer", background: "transparent", color: "#c8b89a", fontSize: 13 }}>✎</button>
                        <button onClick={() => deleteFilament(f.id)} style={{ padding: "4px 8px", border: "1px solid #2a2a2a", borderRadius: 6, cursor: "pointer", background: "transparent", color: "#f87171", fontSize: 13 }}>✕</button>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 32, fontWeight: 900, color: col }}>{f.restant}</span>
                      <span style={{ fontSize: 14, color: "#444", alignSelf: "flex-end", paddingBottom: 6 }}>/ {f.total} {f.unite}</span>
                    </div>
                    <div style={{ background: "#2a2a2a", borderRadius: 6, height: 10, marginBottom: 12 }}>
                      <div style={{ width: `${pct}%`, background: col, height: "100%", borderRadius: 6, transition: "width .4s" }} />
                    </div>
                    <div style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>Utilisé pour : {composantsUsing.map(c => c.nom).join(", ") || "—"}</div>
                    <button onClick={() => setModal({ type: "recharger_filament", data: f })} style={{ width: "100%", padding: "9px", border: "1px solid #2a2a2a", borderRadius: 8, cursor: "pointer", background: "transparent", color: "#c8b89a", fontWeight: 700, fontSize: 13 }}>
                      + Recharger
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── FABRIQUER ── */}
        {tab === "fabriquer" && (
          <div>
            <h1 style={{ margin: "0 0 8px", fontWeight: 900, fontSize: 24, letterSpacing: -0.5 }}>Plan de production</h1>
            <p style={{ margin: "0 0 24px", color: "#555", fontSize: 14 }}>Ce qu'il faut fabriquer pour atteindre tes stocks minimaux.</p>

            <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 14, padding: 22, marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 18 }}>① Produits à compléter</div>
              {produits.filter(p => p.stock < p.minStock).length === 0
                ? <div style={{ color: "#444", fontSize: 14 }}>🎉 Tous les stocks sont au niveau minimum !</div>
                : produits.filter(p => p.stock < p.minStock).map(p => {
                    const need = p.minStock - p.stock;
                    const fab = maxFabricable(p, composants);
                    const canDo = Math.min(need, fab);
                    return (
                      <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: "1px solid #222" }}>
                        <span style={{ fontSize: 28 }}>{p.image}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>{p.nom}</div>
                          <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
                            Stock : {p.stock} · Minimum : {p.minStock} · <span style={{ color: "#facc15" }}>Manque : {need}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 12, color: canDo > 0 ? "#60a5fa" : "#f87171", marginBottom: 6 }}>
                            {canDo > 0 ? `✓ Peut faire ${canDo}/${need}` : "✗ Composants insuffisants"}
                          </div>
                          <button onClick={() => setModal({ type: "fabriquer_produit", data: p })} disabled={canDo === 0} style={{ padding: "6px 14px", border: "none", borderRadius: 7, cursor: canDo > 0 ? "pointer" : "not-allowed", background: canDo > 0 ? "#c8b89a" : "#1f1f1f", color: canDo > 0 ? "#0e0e0e" : "#333", fontWeight: 800, fontSize: 13 }}>
                            Fabriquer
                          </button>
                        </div>
                      </div>
                    );
                  })
              }
            </div>

            <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 14, padding: 22 }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 18 }}>② Composants à imprimer</div>
              {composants.filter(c => c.stock < c.minStock).length === 0
                ? <div style={{ color: "#444", fontSize: 14 }}>🎉 Tous les composants sont au niveau minimum !</div>
                : composants.filter(c => c.stock < c.minStock).map(c => {
                    const f = filaments.find(x => x.id === c.filamentId);
                    const need = c.minStock - c.stock;
                    const peutFabriquer = f ? Math.floor(f.restant / c.filamentQte) : 0;
                    const canDo = Math.min(need, peutFabriquer);
                    return (
                      <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: "1px solid #222" }}>
                        <div style={{ width: 40, height: 40, background: "#2a2a2a", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>⬡</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>{c.nom}</div>
                          <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
                            Stock : {c.stock} · Min : {c.minStock} · <span style={{ color: "#facc15" }}>Manque : {need}</span>
                          </div>
                          {f && <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>{c.filamentQte * need}{f.unite} nécessaires · {f.restant}{f.unite} dispo dans {f.nom}</div>}
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 12, color: canDo > 0 ? "#60a5fa" : "#f87171", marginBottom: 6 }}>
                            {canDo > 0 ? `✓ Peut faire ${canDo}/${need}` : "✗ Filament insuffisant"}
                          </div>
                          <button onClick={() => setModal({ type: "fabriquer_composant", data: c })} disabled={canDo === 0} style={{ padding: "6px 14px", border: "none", borderRadius: 7, cursor: canDo > 0 ? "pointer" : "not-allowed", background: canDo > 0 ? "#c8b89a" : "#1f1f1f", color: canDo > 0 ? "#0e0e0e" : "#333", fontWeight: 800, fontSize: 13 }}>
                            Imprimer
                          </button>
                        </div>
                      </div>
                    );
                  })
              }
            </div>
          </div>
        )}
      </main>

      {/* ── MODALS ── */}
      {modal && (
        <ModalOverlay
          modal={modal}
          setModal={setModal}
          produits={produits}
          composants={composants}
          filaments={filaments}
          fabriquerProduit={fabriquerProduit}
          fabriquerComposant={fabriquerComposant}
          setFilaments={setFilaments}
          saveProduit={saveProduit}
          saveComposant={saveComposant}
          saveFilament={saveFilament}
          showToast={showToast}
        />
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, padding: "12px 20px", borderRadius: 12, fontWeight: 700, fontSize: 14, zIndex: 300, background: toast.type === "err" ? "#7f1d1d" : toast.type === "warn" ? "#451a03" : "#1a2a1a", color: toast.type === "err" ? "#fca5a5" : toast.type === "warn" ? "#fdba74" : "#86efac", border: `1px solid ${toast.type === "err" ? "#991b1b" : toast.type === "warn" ? "#92400e" : "#166534"}`, boxShadow: "0 8px 32px rgba(0,0,0,.5)" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── MODAL OVERLAY ────────────────────────────────────────────────────────────

function ModalOverlay({ modal, setModal, produits, composants, filaments, fabriquerProduit, fabriquerComposant, setFilaments, saveProduit, saveComposant, saveFilament, showToast }) {
  const [qty, setQty] = useState(1);
  const [rechargeQte, setRechargeQte] = useState(500);

  // Formulaire produit
  const emptyProduit = { nom: "", categorie: "Vase", image: "🏺", minStock: 5, composants: [] };
  const [formProduit, setFormProduit] = useState(modal.data && modal.type === "edit_produit" ? { ...modal.data } : emptyProduit);

  // Formulaire composant
  const emptyComposant = { nom: "", filamentId: "", filamentQte: 50, minStock: 5, stock: 0, useDans: [] };
  const [formComp, setFormComp] = useState(modal.data && modal.type === "edit_composant" ? { ...modal.data } : emptyComposant);
  const [showQuickFil, setShowQuickFil] = useState(false);
  const emptyQuickFil = { nom: "", couleur: "#c8b89a", total: 1000, restant: 1000, unite: "g" };
  const [quickFil, setQuickFil] = useState(emptyQuickFil);
  const QUICK_PALETTE = ["#f5f0e8","#c8b89a","#2a2a2a","#c4602a","#d0eaf5","#4ade80","#60a5fa","#f87171","#facc15","#e879f9","#8b5cf6","#f97316"];

  // Formulaire filament
  const emptyFilament = { nom: "", couleur: "#c8b89a", total: 1000, restant: 1000, unite: "g" };
  const [formFil, setFormFil] = useState(modal.data && modal.type === "edit_filament" ? { ...modal.data } : emptyFilament);

  const close = () => setModal(null);

  const inputStyle = { width: "100%", padding: "9px 12px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 9, fontSize: 14, color: "#f0ede8", outline: "none", boxSizing: "border-box" };
  const labelStyle = { display: "block", fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4, marginTop: 12 };
  const btnCancel = { flex: 1, padding: 12, border: "1px solid #2a2a2a", borderRadius: 10, background: "transparent", color: "#888", cursor: "pointer", fontWeight: 700 };
  const btnConfirm = { flex: 2, padding: 12, border: "none", borderRadius: 10, background: "#c8b89a", color: "#0e0e0e", cursor: "pointer", fontWeight: 800, fontSize: 15 };

  const content = () => {

    // ── FABRIQUER PRODUIT ──
    if (modal.type === "fabriquer_produit") {
      const p = modal.data;
      const fab = p.composants.length ? Math.min(...p.composants.map(cid => {
        const c = composants.find(x => x.id === cid);
        return c ? c.stock : 0;
      })) : 999;
      return (
        <div>
          <div style={{ fontSize: 36, marginBottom: 8 }}>{p.image}</div>
          <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 4 }}>{p.nom}</div>
          <div style={{ fontSize: 13, color: "#555", marginBottom: 20 }}>Max réalisable : <strong style={{ color: "#c8b89a" }}>{fab}</strong></div>
          <label style={labelStyle}>Quantité à fabriquer</label>
          <input type="number" min="1" max={fab} value={qty} onChange={e => setQty(Math.min(fab, Math.max(1, parseInt(e.target.value)||1)))}
            style={{ ...inputStyle, fontSize: 28, fontWeight: 900, textAlign: "center", color: "#c8b89a", marginTop: 8, marginBottom: 12 }} />
          <div style={{ fontSize: 12, color: "#444", marginBottom: 20 }}>
            Composants consommés :
            {p.composants.map(cid => {
              const c = composants.find(x => x.id === cid);
              return c ? <div key={cid} style={{ color: "#888", marginTop: 4 }}>• {c.nom} : {qty} pièce(s)</div> : null;
            })}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={close} style={btnCancel}>Annuler</button>
            <button onClick={() => { fabriquerProduit(p, qty); close(); }} style={btnConfirm}>✓ Confirmer</button>
          </div>
        </div>
      );
    }

    // ── FABRIQUER COMPOSANT ──
    if (modal.type === "fabriquer_composant") {
      const c = modal.data;
      const f = filaments.find(x => x.id === c.filamentId);
      const maxPossible = f ? Math.floor(f.restant / c.filamentQte) : 0;
      const filamentNeed = qty * c.filamentQte;
      return (
        <div>
          <div style={{ fontSize: 36, marginBottom: 8 }}>⬡</div>
          <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 4 }}>{c.nom}</div>
          {f && <div style={{ fontSize: 13, color: "#555", marginBottom: 20 }}>
            {f.nom} · {f.restant}{f.unite} dispo · Max : <strong style={{ color: "#c8b89a" }}>{maxPossible}</strong>
          </div>}
          <label style={labelStyle}>Quantité à imprimer</label>
          <input type="number" min="1" max={maxPossible} value={qty} onChange={e => setQty(Math.min(maxPossible, Math.max(1, parseInt(e.target.value)||1)))}
            style={{ ...inputStyle, fontSize: 28, fontWeight: 900, textAlign: "center", color: "#c8b89a", marginTop: 8, marginBottom: 8 }} />
          {f && <div style={{ fontSize: 13, color: "#555", marginBottom: 20, textAlign: "center" }}>
            Consomme <strong style={{ color: "#f87171" }}>{filamentNeed}{f.unite}</strong> de {f.nom}
          </div>}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={close} style={btnCancel}>Annuler</button>
            <button onClick={() => { fabriquerComposant(c, qty); close(); }} disabled={maxPossible === 0} style={{ ...btnConfirm, background: maxPossible > 0 ? "#c8b89a" : "#1f1f1f", color: maxPossible > 0 ? "#0e0e0e" : "#333", cursor: maxPossible > 0 ? "pointer" : "not-allowed" }}>✓ Confirmer</button>
          </div>
        </div>
      );
    }

    // ── RECHARGER FILAMENT ──
    if (modal.type === "recharger_filament") {
      const f = modal.data;
      return (
        <div>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: f.couleur, border: "2px solid #333", marginBottom: 16 }} />
          <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 4 }}>{f.nom}</div>
          <div style={{ fontSize: 13, color: "#555", marginBottom: 20 }}>Actuellement : {f.restant}{f.unite} / {f.total}{f.unite}</div>
          <label style={labelStyle}>Quantité ajoutée ({f.unite})</label>
          <input type="number" min="1" value={rechargeQte} onChange={e => setRechargeQte(parseInt(e.target.value)||0)}
            style={{ ...inputStyle, fontSize: 28, fontWeight: 900, textAlign: "center", color: "#4ade80", marginTop: 8, marginBottom: 20 }} />
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={close} style={btnCancel}>Annuler</button>
            <button onClick={() => {
              setFilaments(prev => prev.map(fil => fil.id === f.id ? { ...fil, restant: Math.min(fil.total, fil.restant + rechargeQte), total: Math.max(fil.total, fil.restant + rechargeQte) } : fil));
              showToast(`+${rechargeQte}${f.unite} ajouté à ${f.nom} ✓`);
              close();
            }} style={{ ...btnConfirm, background: "#4ade80" }}>✓ Recharger</button>
          </div>
        </div>
      );
    }

    // ── EDIT / NOUVEAU PRODUIT ──
    if (modal.type === "edit_produit") {
      const isEdit = !!modal.data;
      const toggleComp = (cid) => {
        const has = formProduit.composants.includes(cid);
        setFormProduit({ ...formProduit, composants: has ? formProduit.composants.filter(x => x !== cid) : [...formProduit.composants, cid] });
      };
      return (
        <div>
          <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 20 }}>{isEdit ? "✎ Modifier le produit" : "+ Nouveau produit"}</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={labelStyle}>Nom du produit</label>
              <input value={formProduit.nom} onChange={e => setFormProduit({...formProduit, nom: e.target.value})} placeholder="ex: Vase Cépage XL" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Catégorie</label>
              <select value={formProduit.categorie} onChange={e => setFormProduit({...formProduit, categorie: e.target.value})} style={{ ...inputStyle, cursor: "pointer" }}>
                {["Lampe","Vase","Bougeoir","Autre"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Stock minimum</label>
              <input type="number" min="0" value={formProduit.minStock} onChange={e => setFormProduit({...formProduit, minStock: parseInt(e.target.value)||0})} style={inputStyle} />
            </div>
          </div>

          <label style={labelStyle}>Emoji / Icône</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
            {EMOJIS.map(e => (
              <button key={e} onClick={() => setFormProduit({...formProduit, image: e})}
                style={{ width: 36, height: 36, border: formProduit.image === e ? "2px solid #c8b89a" : "1px solid #2a2a2a", borderRadius: 8, background: formProduit.image === e ? "#c8b89a18" : "transparent", fontSize: 18, cursor: "pointer" }}>
                {e}
              </button>
            ))}
          </div>

          <label style={labelStyle}>Composants nécessaires</label>
          <div style={{ maxHeight: 160, overflow: "auto", border: "1px solid #2a2a2a", borderRadius: 9, padding: "6px 4px" }}>
            {composants.length === 0 && <div style={{ fontSize: 12, color: "#444", padding: "8px 12px" }}>Aucun composant disponible</div>}
            {composants.map(c => {
              const f = filaments.find(x => x.id === c.filamentId);
              const checked = formProduit.composants.includes(c.id);
              return (
                <div key={c.id} onClick={() => toggleComp(c.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 7, cursor: "pointer", background: checked ? "#c8b89a12" : "transparent", marginBottom: 2 }}>
                  <div style={{ width: 16, height: 16, borderRadius: 4, border: checked ? "2px solid #c8b89a" : "1px solid #444", background: checked ? "#c8b89a" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {checked && <span style={{ fontSize: 10, color: "#0e0e0e", fontWeight: 900 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: checked ? "#c8b89a" : "#888" }}>{c.nom}</span>
                    {f && <span style={{ fontSize: 11, color: "#444", marginLeft: 6 }}>({f.nom})</span>}
                  </div>
                  <span style={{ fontSize: 12, color: "#444" }}>{c.stock} dispo</span>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button onClick={close} style={btnCancel}>Annuler</button>
            <button onClick={() => { if (!formProduit.nom) return; saveProduit(formProduit, modal.data?.id); close(); }} style={{ ...btnConfirm, opacity: formProduit.nom ? 1 : 0.5, cursor: formProduit.nom ? "pointer" : "not-allowed" }}>
              {isEdit ? "✓ Enregistrer" : "✓ Créer"}
            </button>
          </div>
        </div>
      );
    }

    // ── EDIT / NOUVEAU COMPOSANT ──
    if (modal.type === "edit_composant") {
      const isEdit = !!modal.data;
      return (
        <div>
          <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 20 }}>{isEdit ? "✎ Modifier le composant" : "+ Nouveau composant"}</div>

          <label style={labelStyle}>Nom du composant</label>
          <input value={formComp.nom} onChange={e => setFormComp({...formComp, nom: e.target.value})} placeholder="ex: Socle rond Ø10cm" style={inputStyle} />

          <label style={labelStyle}>Filament utilisé</label>
          {/* Sélecteur + bouton ajout rapide */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select value={formComp.filamentId} onChange={e => setFormComp({...formComp, filamentId: e.target.value})} style={{ ...inputStyle, flex: 1, cursor: "pointer" }}>
              <option value="">— Choisir un filament —</option>
              {filaments.map(f => (
                <option key={f.id} value={f.id}>{f.nom} ({f.restant}{f.unite} dispo)</option>
              ))}
            </select>
            <button
              onClick={() => { setShowQuickFil(!showQuickFil); setQuickFil(emptyQuickFil); }}
              title="Créer un nouveau filament"
              style={{ flexShrink: 0, width: 36, height: 36, border: `1px solid ${showQuickFil ? "#c8b89a" : "#2a2a2a"}`, borderRadius: 8, cursor: "pointer", background: showQuickFil ? "#c8b89a18" : "transparent", color: showQuickFil ? "#c8b89a" : "#555", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}>
              {showQuickFil ? "✕" : "+"}
            </button>
          </div>

          {/* Aperçu filament sélectionné */}
          {formComp.filamentId && !showQuickFil && (() => {
            const sel = filaments.find(f => f.id === formComp.filamentId);
            if (!sel) return null;
            const pct = Math.round((sel.restant / sel.total) * 100);
            const col = pct > 50 ? "#4ade80" : pct > 25 ? "#facc15" : "#f87171";
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#1f1f1f", borderRadius: 8, marginTop: 6, border: "1px solid #2a2a2a" }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: sel.couleur, border: "1px solid #333", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#f0ede8" }}>{sel.nom}</div>
                  <div style={{ background: "#2a2a2a", borderRadius: 3, height: 4, marginTop: 4 }}>
                    <div style={{ width: `${pct}%`, background: col, height: "100%", borderRadius: 3 }} />
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: col }}>{sel.restant}{sel.unite}</span>
              </div>
            );
          })()}

          {/* ── MINI FORMULAIRE FILAMENT RAPIDE ── */}
          {showQuickFil && (
            <div style={{ marginTop: 8, padding: 16, background: "#111", border: "1px solid #c8b89a30", borderRadius: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#c8b89a", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>∿ Nouveau filament</div>

              <label style={{ ...labelStyle, marginTop: 0 }}>Nom</label>
              <input value={quickFil.nom} onChange={e => setQuickFil({...quickFil, nom: e.target.value})} placeholder="ex: PLA Vert Sauge" style={{ ...inputStyle, background: "#1a1a1a" }} />

              <label style={labelStyle}>Couleur</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4, marginBottom: 8 }}>
                <input type="color" value={quickFil.couleur} onChange={e => setQuickFil({...quickFil, couleur: e.target.value})}
                  style={{ width: 44, height: 34, border: "none", borderRadius: 8, cursor: "pointer", background: "transparent", padding: 0, flexShrink: 0 }} />
                <input value={quickFil.couleur} onChange={e => setQuickFil({...quickFil, couleur: e.target.value})}
                  style={{ ...inputStyle, background: "#1a1a1a", flex: 1 }} />
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: quickFil.couleur, border: "2px solid #333", flexShrink: 0 }} />
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                {QUICK_PALETTE.map(col => (
                  <button key={col} onClick={() => setQuickFil({...quickFil, couleur: col})}
                    style={{ width: 22, height: 22, borderRadius: "50%", border: quickFil.couleur === col ? "2px solid #c8b89a" : "1px solid #333", background: col, cursor: "pointer", outline: "none", padding: 0 }} />
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div>
                  <label style={{ ...labelStyle, marginTop: 0 }}>Unité</label>
                  <select value={quickFil.unite} onChange={e => setQuickFil({...quickFil, unite: e.target.value})} style={{ ...inputStyle, background: "#1a1a1a", cursor: "pointer" }}>
                    <option value="g">g (filament)</option>
                    <option value="ml">ml (résine)</option>
                  </select>
                </div>
                <div>
                  <label style={{ ...labelStyle, marginTop: 0 }}>Total</label>
                  <input type="number" min="1" value={quickFil.total} onChange={e => setQuickFil({...quickFil, total: parseInt(e.target.value)||0})} style={{ ...inputStyle, background: "#1a1a1a" }} />
                </div>
                <div>
                  <label style={{ ...labelStyle, marginTop: 0 }}>Restant</label>
                  <input type="number" min="0" value={quickFil.restant} onChange={e => setQuickFil({...quickFil, restant: parseInt(e.target.value)||0})} style={{ ...inputStyle, background: "#1a1a1a" }} />
                </div>
              </div>

              <button
                disabled={!quickFil.nom}
                onClick={() => {
                  if (!quickFil.nom) return;
                  const newId = "f" + Date.now();
                  saveFilament({ ...quickFil, id: newId }, null);
                  setFormComp({ ...formComp, filamentId: newId });
                  setShowQuickFil(false);
                  showToast(`Filament "${quickFil.nom}" créé et sélectionné ✓`);
                }}
                style={{ width: "100%", marginTop: 12, padding: "9px", border: "none", borderRadius: 8, cursor: quickFil.nom ? "pointer" : "not-allowed", background: quickFil.nom ? "#c8b89a" : "#1f1f1f", color: quickFil.nom ? "#0e0e0e" : "#333", fontWeight: 800, fontSize: 13, transition: "all .15s" }}>
                ✓ Créer et sélectionner
              </button>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>Qté filament/pièce</label>
              <input type="number" min="1" value={formComp.filamentQte} onChange={e => setFormComp({...formComp, filamentQte: parseInt(e.target.value)||0})} style={inputStyle} />
              {formComp.filamentId && <div style={{ fontSize: 10, color: "#444", marginTop: 3 }}>{filaments.find(f => f.id === formComp.filamentId)?.unite || "g"}</div>}
            </div>
            <div>
              <label style={labelStyle}>Stock initial</label>
              <input type="number" min="0" value={formComp.stock} onChange={e => setFormComp({...formComp, stock: parseInt(e.target.value)||0})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Stock min.</label>
              <input type="number" min="0" value={formComp.minStock} onChange={e => setFormComp({...formComp, minStock: parseInt(e.target.value)||0})} style={inputStyle} />
            </div>
          </div>

          <label style={labelStyle}>Utilisé dans les produits</label>
          <div style={{ maxHeight: 130, overflow: "auto", border: "1px solid #2a2a2a", borderRadius: 9, padding: "4px" }}>
            {produits.map(p => {
              const checked = formComp.useDans.includes(p.id);
              const toggle = () => setFormComp({...formComp, useDans: checked ? formComp.useDans.filter(x => x !== p.id) : [...formComp.useDans, p.id]});
              return (
                <div key={p.id} onClick={toggle} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 7, cursor: "pointer", background: checked ? "#c8b89a12" : "transparent" }}>
                  <div style={{ width: 14, height: 14, borderRadius: 3, border: checked ? "2px solid #c8b89a" : "1px solid #444", background: checked ? "#c8b89a" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {checked && <span style={{ fontSize: 9, color: "#0e0e0e", fontWeight: 900 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: checked ? "#c8b89a" : "#888" }}>{p.image} {p.nom}</span>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button onClick={close} style={btnCancel}>Annuler</button>
            <button onClick={() => { if (!formComp.nom) return; saveComposant(formComp, modal.data?.id); close(); }} style={{ ...btnConfirm, opacity: formComp.nom ? 1 : 0.5, cursor: formComp.nom ? "pointer" : "not-allowed" }}>
              {isEdit ? "✓ Enregistrer" : "✓ Créer"}
            </button>
          </div>
        </div>
      );
    }

    // ── EDIT / NOUVEAU FILAMENT ──
    if (modal.type === "edit_filament") {
      const isEdit = !!modal.data;
      return (
        <div>
          <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 20 }}>{isEdit ? "✎ Modifier le filament" : "+ Nouveau filament"}</div>

          <label style={labelStyle}>Nom</label>
          <input value={formFil.nom} onChange={e => setFormFil({...formFil, nom: e.target.value})} placeholder="ex: PLA Vert Sauge" style={inputStyle} />

          <label style={labelStyle}>Couleur</label>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4 }}>
            <input type="color" value={formFil.couleur} onChange={e => setFormFil({...formFil, couleur: e.target.value})}
              style={{ width: 56, height: 40, border: "none", borderRadius: 8, cursor: "pointer", background: "transparent", padding: 0 }} />
            <div style={{ flex: 1 }}>
              <input value={formFil.couleur} onChange={e => setFormFil({...formFil, couleur: e.target.value})} placeholder="#c8b89a" style={inputStyle} />
            </div>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: formFil.couleur, border: "2px solid #333", flexShrink: 0 }} />
          </div>

          {/* Palette rapide */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10, marginBottom: 4 }}>
            {["#f5f0e8","#c8b89a","#2a2a2a","#c4602a","#d0eaf5","#4ade80","#60a5fa","#f87171","#facc15","#e879f9","#8b5cf6","#f97316"].map(col => (
              <button key={col} onClick={() => setFormFil({...formFil, couleur: col})}
                style={{ width: 26, height: 26, borderRadius: "50%", border: formFil.couleur === col ? "2px solid #c8b89a" : "1px solid #333", background: col, cursor: "pointer", outline: "none" }} />
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>Unité</label>
              <select value={formFil.unite} onChange={e => setFormFil({...formFil, unite: e.target.value})} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="g">g (filament)</option>
                <option value="ml">ml (résine)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Total bobine</label>
              <input type="number" min="1" value={formFil.total} onChange={e => setFormFil({...formFil, total: parseInt(e.target.value)||0})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Restant</label>
              <input type="number" min="0" value={formFil.restant} onChange={e => setFormFil({...formFil, restant: parseInt(e.target.value)||0})} style={inputStyle} />
            </div>
          </div>

          {/* Aperçu barre */}
          {formFil.total > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: "#444" }}>Aperçu</span>
                <span style={{ fontSize: 11, color: "#444" }}>{Math.round((formFil.restant/formFil.total)*100)}%</span>
              </div>
              <div style={{ background: "#2a2a2a", borderRadius: 6, height: 10 }}>
                <div style={{ width: `${Math.min(100,(formFil.restant/formFil.total)*100)}%`, background: formFil.couleur, height: "100%", borderRadius: 6, transition: "width .3s" }} />
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button onClick={close} style={btnCancel}>Annuler</button>
            <button onClick={() => { if (!formFil.nom) return; saveFilament(formFil, modal.data?.id); close(); }} style={{ ...btnConfirm, opacity: formFil.nom ? 1 : 0.5, cursor: formFil.nom ? "pointer" : "not-allowed" }}>
              {isEdit ? "✓ Enregistrer" : "✓ Ajouter"}
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={close}>
      <div style={{ background: "#141414", border: "1px solid #2a2a2a", borderRadius: 20, padding: 32, width: 460, maxWidth: "92vw", maxHeight: "90vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
        {content()}
      </div>
    </div>
  );
}
