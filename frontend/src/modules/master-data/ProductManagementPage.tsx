import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Package, Tag, Plus, Pencil, Save, X } from 'lucide-react';

const ProductManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'CATEGORIES'>('PRODUCTS');
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Product form
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProdId, setEditingProdId] = useState<number | null>(null);
  const [skuCode, setSkuCode] = useState('');
  const [name, setName] = useState('');
  const [baseUom, setBaseUom] = useState('Đơn vị');
  const [conversionFactor, setConversionFactor] = useState<number>(100);
  const [categoryId, setCategoryId] = useState<string>('');

  // Category form
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [catCode, setCatCode] = useState('');
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get('/master-data/products'),
        api.get('/master-data/categories')
      ]);
      setProducts(prodRes.data);
      setCategories(catRes.data);
    } catch (err) { console.error(err); }
  };

  const handleEditProduct = (prod: any) => {
    setEditingProdId(prod.id);
    setSkuCode(prod.sku_code);
    setName(prod.name);
    setBaseUom(prod.base_uom);
    setCategoryId(prod.category_id ? prod.category_id.toString() : '');
    const palletUom = prod.productUoms?.find((u: any) => u.uom_level === 'PALLET');
    setConversionFactor(palletUom ? palletUom.conversion_factor : 100);
    setShowProductForm(true);
  };

  const handleCreateNewProduct = () => {
    setEditingProdId(null); setSkuCode(''); setName(''); setBaseUom('Đơn vị');
    setConversionFactor(100); setCategoryId(''); setShowProductForm(true);
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skuCode || !name || !baseUom || !conversionFactor || !categoryId)
      return alert('Vui lòng điền đầy đủ thông tin và chọn Nhóm hàng!');
    const payload = { sku_code: skuCode, name, base_uom: baseUom, category_id: Number(categoryId), pallet_conversion_factor: conversionFactor, ai_total_weight_score: 50 };
    try {
      if (editingProdId) { await api.put(`/master-data/products/${editingProdId}`, payload); alert('Cập nhật thành công!'); }
      else { await api.post('/master-data/products', payload); alert('Thêm thành công!'); }
      setShowProductForm(false); fetchData();
    } catch (err: any) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
  };

  const handleEditCategory = (cat: any) => {
    setEditingCatId(cat.id); setCatCode(cat.code); setCatName(cat.name); setCatDesc(cat.description || '');
    setShowCategoryForm(true);
  };

  const handleCreateNewCategory = () => {
    setEditingCatId(null); setCatCode(''); setCatName(''); setCatDesc(''); setShowCategoryForm(true);
  };

  const handleSubmitCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catCode || !catName) return alert('Điền đủ Mã và Tên nhóm hàng!');
    const payload = { code: catCode, name: catName, description: catDesc };
    try {
      if (editingCatId) { await api.put(`/master-data/categories/${editingCatId}`, payload); alert('Cập nhật thành công!'); }
      else { await api.post('/master-data/categories', payload); alert('Thêm thành công!'); }
      setShowCategoryForm(false); fetchData();
    } catch (err: any) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">
            <Package size={22} style={{ color: 'var(--accent)' }} />
            Quản Lý Hàng Hoá
          </div>
          <p className="page-header-sub">Cấu hình danh mục, SKU và tỉ lệ quy đổi pallet để AI tính toán tối ưu</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="stepper-nav" style={{ marginBottom: 0 }}>
        <button onClick={() => setActiveTab('PRODUCTS')} className={`step-item ${activeTab === 'PRODUCTS' ? 'active' : ''}`}>
          <Package size={14} /> Danh Sách Mặt Hàng
        </button>
        <button onClick={() => setActiveTab('CATEGORIES')} className={`step-item ${activeTab === 'CATEGORIES' ? 'active' : ''}`}>
          <Tag size={14} /> Quản Lý Nhóm Loại Hàng
        </button>
      </div>

      {/* ===== PRODUCTS TAB ===== */}
      {activeTab === 'PRODUCTS' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handleCreateNewProduct} className="btn-primary">
              <Plus size={15} /> Thêm Mặt Hàng Mới
            </button>
          </div>

          {showProductForm && (
            <div className="card" style={{ border: '1px solid var(--border-accent)' }}>
              <div className="card-header" style={{ background: 'var(--accent-subtle)' }}>
                <Package size={16} style={{ color: 'var(--accent)' }} />
                <div><h2>{editingProdId ? 'Chỉnh sửa mặt hàng' : 'Thêm mặt hàng mới'}</h2></div>
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmitProduct}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Mã hàng (SKU)</label>
                      <input type="text" value={skuCode} onChange={e => setSkuCode(e.target.value)} placeholder="VD: SKU-001" className="form-control" required />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Tên mặt hàng</label>
                      <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="VD: Mì Hảo Hảo" className="form-control" required />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Nhóm loại hàng</label>
                      <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="form-control" required>
                        <option value="">-- Chọn Nhóm --</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Đơn vị cơ sở</label>
                      <input type="text" value={baseUom} disabled className="form-control" style={{ backgroundColor: '#f8fafc', color: '#94a3b8' }} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Tỉ lệ pallet (1 Pallet = ? Đơn vị)</label>
                      <input type="number" value={conversionFactor} onChange={e => setConversionFactor(Number(e.target.value))} className="form-control" required />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="submit" className="btn-success"><Save size={14} /> Lưu</button>
                    <button type="button" onClick={() => setShowProductForm(false)} className="btn-ghost"><X size={14} /> Hủy</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="card">
            <div style={{ overflowX: 'auto' }}>
              <table className="list-table">
                <thead>
                  <tr>
                    <th>Mã SKU</th><th>Tên Mặt Hàng</th><th>Nhóm Loại</th>
                    <th>ĐV Cơ Sở</th><th>Tỉ Lệ Pallet</th><th style={{ textAlign: 'right' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((prod) => {
                    const palletUom = prod.productUoms?.find((u: any) => u.uom_level === 'PALLET');
                    return (
                      <tr key={prod.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent)', fontSize: '0.85rem' }}>{prod.sku_code}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{prod.name}</td>
                        <td><span className="badge badge-purple">{prod.category?.name || '—'}</span></td>
                        <td style={{ color: 'var(--text-secondary)' }}>{prod.base_uom}</td>
                        <td>
                          {palletUom
                            ? <span style={{ color: 'var(--green)', fontWeight: 600, fontSize: '0.85rem' }}>1 Pallet = {palletUom.conversion_factor} {prod.base_uom}</span>
                            : <span className="badge badge-yellow">⚠ Chưa cấu hình</span>
                          }
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button onClick={() => handleEditProduct(prod)} className="btn-ghost" style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }}>
                            <Pencil size={13} /> Sửa
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ===== CATEGORIES TAB ===== */}
      {activeTab === 'CATEGORIES' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handleCreateNewCategory} className="btn-primary" style={{ background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)' }}>
              <Plus size={15} /> Thêm Nhóm Hàng Mới
            </button>
          </div>

          {showCategoryForm && (
            <div className="card" style={{ border: '1px solid rgba(139,92,246,0.3)' }}>
              <div className="card-header" style={{ background: 'var(--purple-subtle)' }}>
                <Tag size={16} style={{ color: 'var(--purple)' }} />
                <div><h2>{editingCatId ? 'Chỉnh sửa nhóm hàng' : 'Thêm nhóm hàng mới'}</h2></div>
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmitCategory}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Mã Nhóm (Code)</label>
                      <input type="text" value={catCode} onChange={e => setCatCode(e.target.value)} placeholder="VD: FOOD" className="form-control" required />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Tên Nhóm Hàng</label>
                      <input type="text" value={catName} onChange={e => setCatName(e.target.value)} placeholder="VD: Thực phẩm" className="form-control" required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Mô tả thêm</label>
                    <input type="text" value={catDesc} onChange={e => setCatDesc(e.target.value)} placeholder="VD: Các loại đồ ăn nhanh..." className="form-control" />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="submit" className="btn-success"><Save size={14} /> Lưu</button>
                    <button type="button" onClick={() => setShowCategoryForm(false)} className="btn-ghost"><X size={14} /> Hủy</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="card">
            <div style={{ overflowX: 'auto' }}>
              <table className="list-table">
                <thead>
                  <tr>
                    <th>Mã Nhóm</th><th>Tên Nhóm</th><th>Mô Tả</th><th style={{ textAlign: 'right' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr key={cat.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--purple)', fontSize: '0.85rem' }}>{cat.code}</td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cat.name}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{cat.description}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button onClick={() => handleEditCategory(cat)} className="btn-ghost" style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }}>
                          <Pencil size={13} /> Sửa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProductManagementPage;
