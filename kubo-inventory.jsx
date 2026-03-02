import { useState, useEffect } from "react";

const initialProducts = [
  { id: 1, name: "Chaise Nordic", sku: "CHR-001", category: "Mobilier", stock: 42, minStock: 10, price: 299.99, supplier: "Nordik Co.", location: "A1-01", status: "ok" },
  { id: 2, name: "Table Basse Loft", sku: "TBL-002", category: "Mobilier", stock: 7, minStock: 10, price: 549.00, supplier: "Urban Design", location: "A1-02", status: "low" },
  { id: 3, name: "Lampe Arco Gold", sku: "LMP-003", category: "Éclairage", stock: 23, minStock: 5, price: 189.50, supplier: "Lumièra", location: "B2-01", status: "ok" },
  { id: 4, name: "Vase Céramique S", sku: "VAS-004", category: "Déco", stock: 0, minStock: 8, price: 45.00, supplier: "Artisans FR", location: "C3-04", status: "out" },
  { id: 5, name: "Miroir Hexagonal", sku: "MIR-005", category: "Déco", stock: 15, minStock: 5, price: 129.99, supplier: "ReflexDesign", location: "B2-03", status: "ok" },
  { id: 6, name: "Canapé Velours", sku: "CAN-006", category: "Mobilier", stock: 3, minStock: 4, price: 1299.00, supplier: "Sofàlux", location: "A2-01", status: "low" },
  { id: 7, name: "Tapis Berbère 160", sku: "TAP-007", category: "Textile", stock: 11, minStock: 3, price: 399.00, supplier: "Atlas Craft", location: "D1-01", status: "ok" },
  { id: 8, name: "Bougie Parfumée", sku: "BOU-008", category: "Déco", stock: 88, minStock: 20, price: 24.90, supplier: "WaxLab", location: "C3-01", status: "ok" },
];

const movements = [
  { id: 1, product: "Chaise Nordic", type: "in", qty: 20, date: "2026-02-28", user: "Marie L." },
  { id: 2, product: "Vase Céramique S", type: "out", qty: 5, date: "2026-02-27", user: "Thomas B." },
  { id: 3, product: "Table Basse Loft", type: "out", qty: 3, date: "2026-02-26", user: "Léa M." },
  { id: 4, product: "Lampe Arco Gold", type: "in", qty: 10, date: "2026-02-25", user: "Marie L." },
  { id: 5, product: "Bougie Parfumée", type: "in", qty: 50, date: "2026-02-24", user: "Thomas B." },
  { id: 6, product: "Canapé Velours", type: "out", qty: 2, date: "2026-02-23", user: "Léa M." },
];

const CATEGORIES = ["Tous", "Mobilier", "Éclairage", "Déco", "Textile"];

export default function KuboInventory() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Tous");
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [showMvtModal, setShowMvtModal] = useState(false);
  const [mvtProduct, setMvtProduct] = useState(null);
  const [mvtType, setMvtType] = useState("in");
  const [mvtQty, setMvtQty] = useState(1);
  const [allMovements, setAllMovements] = useState(movements);
  const [form, setForm] = useState({ name: "", sku: "", category: "Mobilier", stock: 0, minStock: 5, price: 0, supplier: "", location: "" });
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const totalValue = products.reduce((s, p) => s + p.stock * p.price, 0);
  const lowStock = products.filter(p => p.status === "low" || p.status === "out").length;
  const outOfStock = products.filter(p => p.status === "out").length;
  const totalProducts = products.length;

  const filtered = products.filter(p => {
    const matchCat = category === "Tous" || p.category === category;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const openAdd = () => { setEditProduct(null); setForm({ name: "", sku: "", category: "Mobilier", stock: 0, minStock: 5, price: 0, supplier: "", location: "" }); setShowModal(true); };
  const openEdit = (p) => { setEditProduct(p); setForm({ ...p }); setShowModal(true); };
  const saveProduct = () => {
    if (!form.name || !form.sku) return;
    const status = form.stock === 0 ? "out" : form.stock < form.minStock ? "low" : "ok";
    if (editProduct) {
      setProducts(products.map(p => p.id === editProduct.id ? { ...p, ...form, status } : p));
      showToast("Produit mis à jour ✓");
    } else {
      setProducts([...products, { ...form, id: Date.now(), status }]);
      showToast("Produit ajouté ✓");
    }
    setShowModal(false);
  };
  const deleteProduct = (id) => { setProducts(products.filter(p => p.id !== id)); showToast("Produit supprimé", "warning"); };
  const openMvt = (p, type) => { setMvtProduct(p); setMvtType(type); setMvtQty(1); setShowMvtModal(true); };
  const saveMvt = () => {
    const qty = parseInt(mvtQty);
    setProducts(products.map(p => {
      if (p.id !== mvtProduct.id) return p;
      const newStock = mvtType === "in" ? p.stock + qty : Math.max(0, p.stock - qty);
      const status = newStock === 0 ? "out" : newStock < p.minStock ? "low" : "ok";
      return { ...p, stock: newStock, status };
    }));
    setAllMovements([{ id: Date.now(), product: mvtProduct.name, type: mvtType, qty, date: new Date().toISOString().split("T")[0], user: "Vous" }, ...allMovements]);
    showToast(mvtType === "in" ? `+${qty} ajouté ✓` : `-${qty} retiré ✓`);
    setShowMvtModal(false);
  };

  const statusBadge = (s) => {
    if (s === "ok") return <span style={{ background: "#d1fae5", color: "#065f46", fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>OK</span>;
    if (s === "low") return <span style={{ background: "#fef3c7", color: "#92400e", fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>BAS</span>;
    return <span style={{ background: "#fee2e2", color: "#991b1b", fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>ÉPUISÉ</span>;
  };

  const navItems = [
    { id: "dashboard", icon: "⊞", label: "Dashboard" },
    { id: "inventory", icon: "◫", label: "Inventaire" },
    { id: "movements", icon: "↕", label: "Mouvements" },
    { id: "suppliers", icon: "◈", label: "Fournisseurs" },
    { id: "reports", icon: "◻", label: "Rapports" },
  ];

  const suppliers = [...new Set(products.map(p => p.supplier))].map(s => ({
    name: s, products: products.filter(p => p.supplier === s).length,
    value: products.filter(p => p.supplier === s).reduce((acc, p) => acc + p.stock * p.price, 0)
  }));

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", background: "#f0f0ef", color: "#1a1a1a", overflow: "hidden" }}>
      {/* Sidebar */}
      <div style={{ width: sidebarOpen ? 220 : 64, background: "#0f0f0f", color: "#fff", display: "flex", flexDirection: "column", transition: "width .3s ease", overflow: "hidden", flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ padding: "24px 16px", borderBottom: "1px solid #222", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setSidebarOpen(!sidebarOpen)}>
          <div style={{ width: 32, height: 32, background: "#FF5C00", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16, flexShrink: 0 }}>K</div>
          {sidebarOpen && <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: -0.5, whiteSpace: "nowrap" }}>Kubo</span>}
        </div>
        {/* Nav */}
        <nav style={{ flex: 1, padding: "16px 8px" }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 10px", border: "none", borderRadius: 8, cursor: "pointer", marginBottom: 2, background: activeTab === item.id ? "#FF5C00" : "transparent", color: activeTab === item.id ? "#fff" : "#888", fontWeight: 600, fontSize: 14, textAlign: "left", transition: "all .2s" }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
              {sidebarOpen && <span style={{ whiteSpace: "nowrap" }}>{item.label}</span>}
            </button>
          ))}
        </nav>
        {/* User */}
        <div style={{ padding: "16px", borderTop: "1px solid #222", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "#FF5C00", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>ML</div>
          {sidebarOpen && <div><div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Marie L.</div><div style={{ fontSize: 11, color: "#555" }}>Admin</div></div>}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Topbar */}
        <div style={{ background: "#fff", borderBottom: "1px solid #e5e5e5", padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: -0.5 }}>{navItems.find(n => n.id === activeTab)?.label}</div>
            <div style={{ fontSize: 11, color: "#888" }}>Lundi 2 Mars 2026</div>
          </div>
          {activeTab === "inventory" && (
            <button onClick={openAdd} style={{ background: "#FF5C00", color: "#fff", border: "none", padding: "8px 20px", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              + Nouveau produit
            </button>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: 32 }}>

          {/* DASHBOARD */}
          {activeTab === "dashboard" && (
            <div>
              {/* KPIs */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
                {[
                  { label: "Valeur totale", value: `${totalValue.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`, icon: "◈", color: "#FF5C00" },
                  { label: "Produits", value: totalProducts, icon: "◫", color: "#6366f1" },
                  { label: "Stock faible", value: lowStock, icon: "▲", color: "#f59e0b" },
                  { label: "Épuisés", value: outOfStock, icon: "●", color: "#ef4444" },
                ].map((kpi, i) => (
                  <div key={i} style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #e5e5e5" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div style={{ fontSize: 12, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{kpi.label}</div>
                      <div style={{ width: 36, height: 36, background: kpi.color + "15", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: kpi.color, fontSize: 16 }}>{kpi.icon}</div>
                    </div>
                    <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: -1, color: "#1a1a1a" }}>{kpi.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Alertes */}
                <div style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #e5e5e5" }}>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>⚠ Alertes Stock</div>
                  {products.filter(p => p.status !== "ok").map(p => (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f5f5f5" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: "#888" }}>{p.sku}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 800, fontSize: 16 }}>{p.stock}</span>
                        {statusBadge(p.status)}
                      </div>
                    </div>
                  ))}
                  {products.filter(p => p.status !== "ok").length === 0 && <div style={{ color: "#888", fontSize: 14 }}>Aucune alerte 🎉</div>}
                </div>

                {/* Derniers mouvements */}
                <div style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #e5e5e5" }}>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>↕ Derniers Mouvements</div>
                  {allMovements.slice(0, 6).map(m => (
                    <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f5f5f5" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{m.product}</div>
                        <div style={{ fontSize: 11, color: "#888" }}>{m.date} · {m.user}</div>
                      </div>
                      <span style={{ background: m.type === "in" ? "#d1fae5" : "#fee2e2", color: m.type === "in" ? "#065f46" : "#991b1b", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                        {m.type === "in" ? "+" : "-"}{m.qty}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Catégories */}
              <div style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #e5e5e5", marginTop: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>Répartition par Catégorie</div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {CATEGORIES.filter(c => c !== "Tous").map(cat => {
                    const catProducts = products.filter(p => p.category === cat);
                    const catValue = catProducts.reduce((s, p) => s + p.stock * p.price, 0);
                    const pct = totalValue > 0 ? Math.round((catValue / totalValue) * 100) : 0;
                    return (
                      <div key={cat} style={{ flex: 1, minWidth: 140, background: "#f8f8f8", borderRadius: 12, padding: 16 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{cat}</div>
                        <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>{catProducts.length} produits</div>
                        <div style={{ background: "#e5e5e5", borderRadius: 4, height: 6, marginBottom: 8 }}>
                          <div style={{ width: `${pct}%`, background: "#FF5C00", height: "100%", borderRadius: 4 }} />
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>{catValue.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* INVENTORY */}
          {activeTab === "inventory" && (
            <div>
              {/* Filters */}
              <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher produit, SKU..." style={{ flex: 1, padding: "10px 16px", border: "1px solid #e5e5e5", borderRadius: 10, fontSize: 14, background: "#fff", outline: "none" }} />
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => setCategory(c)} style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, background: category === c ? "#FF5C00" : "#fff", color: category === c ? "#fff" : "#888", border: "1px solid #e5e5e5" }}>{c}</button>
                ))}
              </div>

              {/* Table */}
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e5e5", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8f8f8", borderBottom: "1px solid #e5e5e5" }}>
                      {["Produit", "SKU", "Catégorie", "Stock", "Stock min.", "Prix", "Emplacement", "Statut", "Actions"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => (
                      <tr key={p.id} style={{ borderBottom: "1px solid #f5f5f5" }} onMouseEnter={e => e.currentTarget.style.background = "#fafafa"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <td style={{ padding: "12px 16px", fontWeight: 700, fontSize: 14 }}>{p.name}</td>
                        <td style={{ padding: "12px 16px", color: "#888", fontSize: 13 }}>{p.sku}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13 }}>{p.category}</td>
                        <td style={{ padding: "12px 16px", fontWeight: 800, fontSize: 16 }}>{p.stock}</td>
                        <td style={{ padding: "12px 16px", color: "#888", fontSize: 13 }}>{p.minStock}</td>
                        <td style={{ padding: "12px 16px", fontWeight: 700, fontSize: 14 }}>{p.price.toFixed(2)} €</td>
                        <td style={{ padding: "12px 16px", color: "#888", fontSize: 13 }}>{p.location}</td>
                        <td style={{ padding: "12px 16px" }}>{statusBadge(p.status)}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => openMvt(p, "in")} title="Entrée" style={{ padding: "4px 8px", background: "#d1fae5", color: "#065f46", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 12 }}>+</button>
                            <button onClick={() => openMvt(p, "out")} title="Sortie" style={{ padding: "4px 8px", background: "#fee2e2", color: "#991b1b", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 12 }}>-</button>
                            <button onClick={() => openEdit(p)} title="Modifier" style={{ padding: "4px 8px", background: "#f0f0ff", color: "#6366f1", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 12 }}>✎</button>
                            <button onClick={() => deleteProduct(p.id)} title="Supprimer" style={{ padding: "4px 8px", background: "#f5f5f5", color: "#888", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 12 }}>✕</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "#888" }}>Aucun produit trouvé</div>}
              </div>
              <div style={{ marginTop: 12, fontSize: 13, color: "#888" }}>{filtered.length} produit(s) affiché(s)</div>
            </div>
          )}

          {/* MOVEMENTS */}
          {activeTab === "movements" && (
            <div>
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e5e5", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8f8f8", borderBottom: "1px solid #e5e5e5" }}>
                      {["Produit", "Type", "Quantité", "Date", "Utilisateur"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allMovements.map(m => (
                      <tr key={m.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                        <td style={{ padding: "12px 16px", fontWeight: 700 }}>{m.product}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ background: m.type === "in" ? "#d1fae5" : "#fee2e2", color: m.type === "in" ? "#065f46" : "#991b1b", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                            {m.type === "in" ? "↑ Entrée" : "↓ Sortie"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", fontWeight: 800, fontSize: 16, color: m.type === "in" ? "#065f46" : "#991b1b" }}>
                          {m.type === "in" ? "+" : "-"}{m.qty}
                        </td>
                        <td style={{ padding: "12px 16px", color: "#888", fontSize: 13 }}>{m.date}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13 }}>{m.user}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUPPLIERS */}
          {activeTab === "suppliers" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {suppliers.map((s, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #e5e5e5" }}>
                  <div style={{ width: 44, height: 44, background: "#FF5C0015", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <span style={{ fontSize: 20 }}>◈</span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{s.name}</div>
                  <div style={{ color: "#888", fontSize: 13, marginBottom: 16 }}>{s.products} produit(s)</div>
                  <div style={{ fontWeight: 800, fontSize: 22, color: "#FF5C00" }}>{s.value.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €</div>
                  <div style={{ fontSize: 12, color: "#888" }}>valeur en stock</div>
                </div>
              ))}
            </div>
          )}

          {/* REPORTS */}
          {activeTab === "reports" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #e5e5e5" }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 20 }}>Valeur par catégorie</div>
                {CATEGORIES.filter(c => c !== "Tous").map(cat => {
                  const catV = products.filter(p => p.category === cat).reduce((s, p) => s + p.stock * p.price, 0);
                  const pct = totalValue > 0 ? (catV / totalValue) * 100 : 0;
                  return (
                    <div key={cat} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{cat}</span>
                        <span style={{ fontWeight: 800, fontSize: 14 }}>{catV.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €</span>
                      </div>
                      <div style={{ background: "#f0f0f0", borderRadius: 4, height: 8 }}>
                        <div style={{ width: `${pct}%`, background: "#FF5C00", height: "100%", borderRadius: 4, transition: "width .5s" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #e5e5e5" }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 20 }}>Résumé global</div>
                {[
                  ["Produits total", totalProducts],
                  ["Valeur totale", `${totalValue.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`],
                  ["Alertes actives", lowStock],
                  ["Épuisés", outOfStock],
                  ["Mouvements", allMovements.length],
                  ["Fournisseurs", suppliers.length],
                ].map(([label, val], i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #f5f5f5" }}>
                    <span style={{ color: "#888", fontSize: 14 }}>{label}</span>
                    <span style={{ fontWeight: 800, fontSize: 14 }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Produit */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 32, width: 480, maxWidth: "90vw" }}>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 24 }}>{editProduct ? "Modifier produit" : "Nouveau produit"}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              {[
                { label: "Nom", key: "name", type: "text" },
                { label: "SKU", key: "sku", type: "text" },
                { label: "Stock", key: "stock", type: "number" },
                { label: "Stock minimum", key: "minStock", type: "number" },
                { label: "Prix (€)", key: "price", type: "number" },
                { label: "Emplacement", key: "location", type: "text" },
                { label: "Fournisseur", key: "supplier", type: "text" },
              ].map(({ label, key, type }) => (
                <div key={key} style={{ gridColumn: key === "name" || key === "supplier" ? "1/-1" : undefined }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#888", marginBottom: 4, textTransform: "uppercase" }}>{label}</label>
                  <input type={type} value={form[key]} onChange={e => setForm({ ...form, [key]: type === "number" ? parseFloat(e.target.value) || 0 : e.target.value })} style={{ width: "100%", padding: "10px 12px", border: "1px solid #e5e5e5", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#888", marginBottom: 4, textTransform: "uppercase" }}>Catégorie</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={{ width: "100%", padding: "10px 12px", border: "1px solid #e5e5e5", borderRadius: 8, fontSize: 14, outline: "none", background: "#fff" }}>
                  {CATEGORIES.filter(c => c !== "Tous").map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: "12px", border: "1px solid #e5e5e5", borderRadius: 10, background: "#fff", cursor: "pointer", fontWeight: 700 }}>Annuler</button>
              <button onClick={saveProduct} style={{ flex: 2, padding: "12px", border: "none", borderRadius: 10, background: "#FF5C00", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 15 }}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Mouvement */}
      {showMvtModal && mvtProduct && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 32, width: 360 }}>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>{mvtType === "in" ? "↑ Entrée de stock" : "↓ Sortie de stock"}</div>
            <div style={{ color: "#888", fontSize: 14, marginBottom: 24 }}>{mvtProduct.name} · Stock actuel: <strong>{mvtProduct.stock}</strong></div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase" }}>Quantité</label>
            <input type="number" min="1" value={mvtQty} onChange={e => setMvtQty(e.target.value)} style={{ width: "100%", padding: "12px", border: "1px solid #e5e5e5", borderRadius: 10, fontSize: 20, fontWeight: 800, textAlign: "center", marginTop: 8, marginBottom: 20, outline: "none", boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowMvtModal(false)} style={{ flex: 1, padding: "12px", border: "1px solid #e5e5e5", borderRadius: 10, background: "#fff", cursor: "pointer", fontWeight: 700 }}>Annuler</button>
              <button onClick={saveMvt} style={{ flex: 2, padding: "12px", border: "none", borderRadius: 10, background: mvtType === "in" ? "#059669" : "#dc2626", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 15 }}>Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: toast.type === "warning" ? "#f59e0b" : "#0f0f0f", color: "#fff", padding: "12px 20px", borderRadius: 12, fontWeight: 700, fontSize: 14, zIndex: 200, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
