import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Truck, ArrowRight, CheckCircle2, AlertCircle, ShoppingCart, List, Compass, Map } from 'lucide-react';
import WarehouseMap3D from '../master-data/WarehouseMap3D';

interface OutboundLine {
  id: number;
  product_id: number;
  requested_qty: number;
  product: { id: number, name: string, sku_code: string };
}

interface OutboundOrder {
  id: number;
  order_code: string;
  status: 'PENDING' | 'PICKING' | 'DISPATCHED';
  created_at: string;
  lines: OutboundLine[];
}

const OutboundPage: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<OutboundOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<number>(1);

  // Form State
  const [outProduct, setOutProduct] = useState<string>('');
  const [outQty, setOutQty] = useState<number>(10);
  
  // Pick State
  const [pickingTasks, setPickingTasks] = useState<any[]>([]);
  const [scannedTask, setScannedTask] = useState<string>('');
  
  // Wave Picking Map State
  const [showWaveMap, setShowWaveMap] = useState<boolean>(false);
  const [locations, setLocations] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const pRes = await api.get('/master-data/products');
      setProducts(pRes.data);
      const oRes = await api.get('/outbound/orders');
      setOrders(oRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outProduct) return alert('Vui lòng chọn sản phẩm');
    if (outQty <= 0) return alert('Số lượng xuất phải lớn hơn 0');

    try {
      const payload = {
        details: [{ product_id: Number(outProduct), requested_qty: outQty }]
      };
      await api.post('/outbound/orders', payload);
      alert('Tạo đơn xuất thành công!');
      fetchData();
      setOutProduct('');
      setOutQty(10);
    } catch (err: any) {
      alert('Lỗi: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleGeneratePick = async (orderCode: string) => {
    try {
      const res = await api.post('/outbound/picking/generate', { orderCode });
      alert(`Đã cấp phát ${res.data.length} công việc lấy hàng! (FIFO)`);
      fetchData();
      // Load picking tasks into state
      setPickingTasks(prev => [...prev, ...res.data]);
      setActiveStep(2); // Chuyển sang tab Nhặt Hàng
    } catch (err: any) {
      alert('Lỗi: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleConfirmPick = async (e: React.FormEvent, taskId: number) => {
    e.preventDefault();
    try {
      await api.post('/outbound/picking/confirm', { taskId });
      alert('Đã xác nhận nhặt hàng thành công!');
      // Xóa task khỏi danh sách UI
      setPickingTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err: any) {
      alert('Lỗi: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleShowWaveMap = async () => {
    if (locations.length === 0) {
      setLoading(true);
      try {
        const res = await api.get('/master-data/locations');
        setLocations(res.data);
      } catch (err) {
        console.error(err);
        alert('Lỗi tải dữ liệu kho!');
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    setShowWaveMap(!showWaveMap);
  };

  return (
    <div className="inbound-container">
      <div className="header-section">
        <div className="header-info">
          <h1>Xuất Kho (Outbound)</h1>
          <p>Quy trình: Tạo Đơn Xuất ➜ Phân bổ Kệ (FIFO) ➜ Quét Nhặt Hàng ➜ Giao Hàng</p>
        </div>
      </div>

      <div className="stepper-nav">
        <button onClick={() => setActiveStep(1)} className={`step-item ${activeStep === 1 ? 'active' : ''}`}>
          <span style={{ fontSize: '1.2rem', marginRight: '0.25rem' }}>①</span> Quản lý Đơn Xuất
        </button>
        <button onClick={() => setActiveStep(2)} className={`step-item ${activeStep === 2 ? 'active' : ''}`}>
          <span style={{ fontSize: '1.2rem', marginRight: '0.25rem' }}>②</span> Nhặt Hàng (Picking)
        </button>
      </div>

      {activeStep === 1 && (
        <div className="panel-container">
          <div className="custom-card">
            <div className="card-header">
              <ShoppingCart size={20} style={{ color: '#2563eb' }} />
              <div><h2>Tạo Đơn Xuất Hàng Mới</h2></div>
            </div>
            <div className="card-body">
              <form onSubmit={handleCreateOrder}>
                <div className="form-group">
                  <label>Chọn mặt hàng xuất</label>
                  <select value={outProduct} onChange={e => setOutProduct(e.target.value)} className="form-control" required>
                    <option value="">-- Chọn sản phẩm --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku_code})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Số lượng yêu cầu</label>
                  <input type="number" value={outQty} onChange={e => setOutQty(Number(e.target.value))} className="form-control" min={1} required />
                </div>
                <button type="submit" className="btn-submit">
                  Khởi tạo Đơn Xuất
                </button>
              </form>
            </div>
          </div>

          <div className="custom-card">
            <div className="card-header">
              <List size={20} style={{ color: '#f59e0b' }} />
              <div><h2>Danh sách Đơn Xuất</h2></div>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="list-table">
                  <thead>
                    <tr>
                      <th>Mã Đơn</th>
                      <th>Trạng Thái</th>
                      <th>Hàng Hóa</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id}>
                        <td style={{ fontWeight: 600 }}>{o.order_code}</td>
                        <td>
                          <span className={`badge badge-${o.status === 'PENDING' ? 'yellow' : o.status === 'PICKING' ? 'blue' : 'green'}`}>
                            {o.status}
                          </span>
                        </td>
                        <td>
                          {o.lines.map((l, idx) => (
                            <div key={idx}>{l.product.name} (x{l.requested_qty})</div>
                          ))}
                        </td>
                        <td>
                          {o.status === 'PENDING' && (
                            <button onClick={() => handleGeneratePick(o.order_code)} className="ai-action-btn" style={{ padding: '0.4rem 0.8rem', backgroundColor: '#e0f2fe', color: '#0369a1' }}>
                              Phân bổ Lấy Hàng
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Chưa có đơn xuất nào</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeStep === 2 && (
        <div className="panel-container" style={{ gridTemplateColumns: '1fr' }}>
          <div className="custom-card">
            <div className="card-header" style={{ backgroundColor: '#ecfdf5', borderBottom: '1px solid #a7f3d0', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Compass size={20} style={{ color: '#059669' }} />
                <div><h2>Màn Hình Scanner Lấy Hàng (Picking)</h2></div>
              </div>
              {pickingTasks.length > 0 && (
                <button className="btn-primary" onClick={handleShowWaveMap} style={{ background: 'linear-gradient(to right, #0ea5e9, #3b82f6)', border: 'none' }}>
                  <Map size={16} /> {showWaveMap ? 'Đóng Bản Đồ 3D' : 'Xem Quỹ Đạo Gom Đơn 3D'}
                </button>
              )}
            </div>
            
            {showWaveMap && pickingTasks.length > 0 && (
              <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <h3 style={{ marginBottom: '1rem', color: '#0f172a' }}>🗺️ Quỹ đạo lấy hàng Wave Picking (TSP Route)</h3>
                <WarehouseMap3D 
                  locations={locations} 
                  showInventory={true} 
                  focusedLocationCodes={pickingTasks.map(t => t.source_location_id)} 
                />
              </div>
            )}

            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {pickingTasks.map(task => (
                  <div key={task.id} className="task-card">
                    <div className="task-info-grid">
                      <div><div className="task-label">TASK ID</div><div className="task-value" style={{ color: '#047857' }}>{task.id}</div></div>
                      <div><div className="task-label">LPN CẦN LẤY</div><div className="task-value">{task.lpn_id}</div></div>
                    </div>
                    <div className="task-dest-box">
                      <div className="task-label">TỪ KỆ KHO</div>
                      <div className="task-dest-code">{task.source_location_id || 'UNKNOWN'}</div>
                    </div>
                    <div className="ai-reason-box" style={{ background: '#fef3c7' }}>
                      <strong>Chiến thuật:</strong> {task.ai_reason}
                    </div>
                    <form onSubmit={e => handleConfirmPick(e, task.id)} style={{ display: 'flex', gap: '0.5rem' }}>
                      <button type="submit" className="btn-submit" style={{ width: '100%', backgroundColor: '#10b981', background: 'linear-gradient(to right, #10b981, #059669)' }}>
                        Xác nhận Đã Lấy Hàng
                      </button>
                    </form>
                  </div>
                ))}
                {pickingTasks.length === 0 && (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    <CheckCircle2 size={36} style={{ margin: '0 auto 0.75rem', display: 'block', color: '#10b981' }} />
                    <span style={{ fontWeight: '600', color: '#475569', fontSize: '1rem', display: 'block', marginBottom: '0.25rem' }}>Tất cả công việc đã hoàn thành!</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutboundPage;
