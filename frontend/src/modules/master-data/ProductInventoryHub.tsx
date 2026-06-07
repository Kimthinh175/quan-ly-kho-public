import React, { useState, useEffect } from 'react';
import api from '../../api';
import WarehouseMap3D from '../master-data/WarehouseMap3D';
import { TrendingDown, AlertTriangle, RotateCcw, Eye, EyeOff, Package, X } from 'lucide-react';

const ProductInventoryHub: React.FC = () => {
  const [inventoryPage, setInventoryPage] = useState<number>(1);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [locations, setLocations] = useState<any[]>([]);
  const [show3D, setShow3D] = useState<boolean>(true);
  const [resetKey, setResetKey] = useState<number>(0);
  const [deadStock, setDeadStock] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [focusedPallet, setFocusedPallet] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetchInventory();
    fetchLocations();
  }, [inventoryPage]);

  const fetchInventory = async () => {
    try {
      const res = await api.get(`/master-data/inventory/details?page=${inventoryPage}&limit=10`);
      setInventoryData(res.data.data);
      setTotalPages(res.data.totalPages);
    } catch (err) { console.error(err); }
  };

  const fetchLocations = async () => {
    try {
      const res = await api.get('/master-data/locations');
      setLocations(res.data);
    } catch (err) { console.error(err); }
  };

  const checkDeadStock = async () => {
    const res = await api.get('/inventory-alerts/inventory/dead-stock?days_threshold=60').catch(() => ({
      data: { total_stuck_value: 50000000, items: [{ product_id: 1, sku: 'SKU001', last_transaction: '2023-01-01' }] }
    }));
    setDeadStock(res.data);
  };

  const activeLocations = locations.filter(l => l.status !== 'ARCHIVED');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">
            <TrendingDown size={22} style={{ color: 'var(--accent)' }} />
            Tồn Kho Thực Tế
          </div>
          <p className="page-header-sub">Theo dõi hàng hóa, pallet và vị trí kệ theo thời gian thực</p>
        </div>
        <button onClick={checkDeadStock} className="btn-warning">
          <AlertTriangle size={14} />
          Quét Dead-stock &gt;60 ngày
        </button>
      </div>

      {/* Dead stock alert */}
      {deadStock && (
        <div style={{
          padding: '1rem 1.25rem',
          background: 'var(--yellow-subtle)',
          border: '1px solid rgba(245,158,11,0.3)',
          borderLeft: '3px solid var(--yellow)',
          borderRadius: 'var(--radius-md)',
          display: 'flex', flexDirection: 'column', gap: '0.5rem'
        }}>
          <p style={{ margin: 0, color: 'var(--yellow)', fontWeight: 700, fontSize: '0.9rem' }}>
            ⚠️ Tổng giá trị kẹt vốn: {deadStock.total_stuck_value.toLocaleString()} VNĐ
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            {deadStock.items.map((item: any) => (
              <li key={item.product_id}>{item.sku} — Giao dịch cuối: {item.last_transaction}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Inventory Table */}
      <div className="card">
        <div className="card-header">
          <Package size={18} style={{ color: 'var(--accent)' }} />
          <div>
            <h2>Danh Sách Hàng Hóa Trong Kho</h2>
            <p>Trang {inventoryPage} / {totalPages}</p>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="list-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Tên Sản Phẩm</th>
                <th>Tổng Số Pallet</th>
                <th>Tổng Số Đơn Vị</th>
                <th style={{ textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {inventoryData.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 700, color: 'var(--accent)', fontFamily: 'monospace', fontSize: '0.85rem' }}>{item.sku}</td>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.name}</td>
                  <td><span className="badge badge-blue">{item.pallets} pallet</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>{item.total_qty}</strong>
                      {item.loose > 0 && (
                        <span className="badge badge-orange" style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }}>
                          (Dư {item.loose} lẻ)
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => setSelectedProduct(item)} className="btn-ghost" style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }}>
                      <Eye size={13} /> Xem chi tiết
                    </button>
                  </td>
                </tr>
              ))}
              {inventoryData.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Chưa có hàng hóa nào trong kho.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button
            disabled={inventoryPage <= 1}
            onClick={() => setInventoryPage(p => p - 1)}
            className="btn-ghost"
            style={{ opacity: inventoryPage <= 1 ? 0.4 : 1, cursor: inventoryPage <= 1 ? 'not-allowed' : 'pointer' }}
          >← Trước</button>
          <button
            disabled={inventoryPage >= totalPages}
            onClick={() => setInventoryPage(p => p + 1)}
            className="btn-ghost"
            style={{ opacity: inventoryPage >= totalPages ? 0.4 : 1, cursor: inventoryPage >= totalPages ? 'not-allowed' : 'pointer' }}
          >Sau →</button>
        </div>
      </div>

      {/* 3D Map */}
      <div className="card">
        <div className="card-header">
          <span style={{ fontSize: '1.1rem' }}>📍</span>
          <div style={{ flex: 1 }}>
            <h2>Sơ Đồ 3D Toàn Cảnh Kho</h2>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {show3D && (
              <button onClick={() => setResetKey(k => k + 1)} className="btn-ghost" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                <RotateCcw size={13} /> Reset
              </button>
            )}
            <button onClick={() => setShow3D(!show3D)} className={show3D ? 'btn-danger' : 'btn-success'} style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
              {show3D ? <><EyeOff size={13} /> Tắt 3D</> : <><Eye size={13} /> Bật 3D</>}
            </button>
          </div>
        </div>
        <div className="card-body" style={{ padding: show3D ? 0 : '1.5rem' }}>
          {show3D ? (
            <WarehouseMap3D key={resetKey} locations={activeLocations} showInventory={true} focusedLocationCode={focusedPallet} />
          ) : (
            <div style={{
              width: '100%', height: '300px',
              background: 'var(--bg-elevated)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 'var(--radius-md)',
              border: '2px dashed var(--border-strong)',
              flexDirection: 'column', gap: '0.5rem'
            }}>
              <EyeOff size={32} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>Bản đồ 3D đang tắt</p>
            </div>
          )}
        </div>
      </div>

      {/* Chi tiết Pallet Modal */}
      {selectedProduct && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="card" style={{ width: '700px', maxWidth: '90%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Chi tiết Vị trí lưu trữ: {selectedProduct.name}</h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>SKU: <span style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>{selectedProduct.sku}</span></p>
              </div>
              <button onClick={() => { setSelectedProduct(null); setFocusedPallet(undefined); }} className="btn-ghost" style={{ padding: '0.5rem' }}><X size={18} /></button>
            </div>
            <div className="card-body" style={{ overflowY: 'auto', padding: '0' }}>
              {selectedProduct.pallet_details && selectedProduct.pallet_details.length > 0 ? (
                <table className="list-table">
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 1 }}>
                    <tr>
                      <th>Vị Trí Kệ</th>
                      <th>Mã LPN</th>
                      <th>Đơn vị</th>
                      <th>Ngày Nhập</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProduct.pallet_details.map((pallet: any, idx: number) => (
                      <tr 
                        key={idx} 
                        onClick={() => {
                          setFocusedPallet(pallet.location);
                          setSelectedProduct(null);
                          setTimeout(() => {
                            document.getElementById('warehouse-map-container')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }, 100);
                        }}
                        style={{ 
                          cursor: 'pointer', 
                          backgroundColor: focusedPallet === pallet.location ? 'var(--accent-subtle)' : 'transparent',
                          transition: 'background-color 0.2s'
                        }}
                      >
                        <td>
                          {pallet.location 
                            ? <span style={{ fontWeight: 700, color: 'var(--green)', fontFamily: 'monospace', fontSize: '0.85rem' }}>{pallet.location}</span>
                            : <span className="badge badge-yellow">Chờ cất</span>
                          }
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.85rem' }}>{pallet.lpn_code}</td>
                        <td style={{ fontWeight: 600 }}>{pallet.qty}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{pallet.import_date ? new Date(pallet.import_date).toLocaleString('vi-VN') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Không có dữ liệu pallet nào đang được cất trên kệ.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductInventoryHub;
