import React, { useState, useEffect } from 'react';
import api from '../../api';
import {
  PlusCircle,
  Layers,
  Compass,
  PackageCheck,
  Cpu,
  Barcode,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Truck,
  HelpCircle,
  Inbox,
  RotateCcw,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface ReceiptLine {
  id: number;
  product_id: number;
  expected_qty: number;
  actual_qty: number;
  product: {
    id: number;
    sku_code: string;
    name: string;
    base_uom: string;
  };
}

interface Receipt {
  id: number;
  receipt_code: string;
  supplier_name: string | null;
  status: 'NEW' | 'PROCESSING' | 'COMPLETED';
  created_at: string;
  lines: ReceiptLine[];
  lpns: any[];
}

const InboundOutboundPage: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [lpns, setLpns] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [generatingAI, setGeneratingAI] = useState<Record<string, boolean>>({});
  const [reassigning, setReassigning] = useState<Record<string, boolean>>({});
  const [lpnPage, setLpnPage] = useState<number>(1);
  const [lpnTotalPages, setLpnTotalPages] = useState<number>(1);
  const [totalLpns, setTotalLpns] = useState<number>(0);
  const lpnItemsPerPage = 5;

  // Step 1 Form State
  const [asnProduct, setAsnProduct] = useState<string>('');
  const [asnQty, setAsnQty] = useState<number>(10);
  const [supplierName, setSupplierName] = useState<string>('');

  // Step 2 Form State
  const [selectedReceiptCode, setSelectedReceiptCode] = useState<string>('');
  const [actualQty, setActualQty] = useState<number>(10);
  const [weightPerPallet, setWeightPerPallet] = useState<number>(500);

  // Step 3/4 Form State
  const [scannedCodes, setScannedCodes] = useState<Record<string, string>>({});

  // Step 5 Form State (Loose Receiving)
  const [looseProduct, setLooseProduct] = useState<string>('');
  const [looseQty, setLooseQty] = useState<number>(10);
  const [looseLogs, setLooseLogs] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchLpns();
  }, [lpnPage]);

  const fetchLpns = async () => {
    try {
      const lRes = await api.get(`/inbound/lpns?page=${lpnPage}&limit=${lpnItemsPerPage}`);
      setLpns(lRes.data.data || []);
      setTotalLpns(lRes.data.total || 0);
      setLpnTotalPages(Math.max(1, Math.ceil((lRes.data.total || 0) / lpnItemsPerPage)));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const pRes = await api.get('/master-data/products');
      setProducts(pRes.data);
      const rRes = await api.get('/inbound/receipts');
      setReceipts(rRes.data);
      await fetchLpns();
      const tRes = await api.get('/inbound/tasks');
      setTasks(tRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateASN = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asnProduct) return alert('Vui lòng chọn sản phẩm');
    if (asnQty <= 0) return alert('Số lượng dự kiến phải lớn hơn 0');

    const product = products.find(p => p.id === Number(asnProduct));
    const palletUom = product?.productUoms?.find((u: any) => u.uom_level === 'PALLET');
    const factor = palletUom ? palletUom.conversion_factor : 100;
    const totalExpectedQty = asnQty * factor;

    try {
      const payload = {
        details: [{ product_id: Number(asnProduct), expected_qty: totalExpectedQty }]
      };
      await api.post('/inbound/receipts', payload);
      alert('Đã khai báo phiếu ASN thành công!');
      setAsnProduct('');
      setAsnQty(10);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handlePalletize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReceiptCode) return alert('Vui lòng chọn một phiếu nhập');
    
    try {
      await api.post('/inbound/palletize', {
        receiptId: selectedReceiptCode,
        qty: actualQty,
        weight: weightPerPallet
      });
      alert('Đã tạo LPN thành công!');
      setSelectedReceiptCode('');
      setActualQty(10);
      setWeightPerPallet(500);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleGenerateAI = async (lpnCode: string) => {
    try {
      setGeneratingAI(prev => ({ ...prev, [lpnCode]: true }));
      await api.post('/inbound/tasks/generate', { lpnCode });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setGeneratingAI(prev => ({ ...prev, [lpnCode]: false }));
    }
  };

  const handleGroupTasks = async () => {
    try {
      const res = await api.post('/ai-core/group-tasks');
      toast.success(res.data.message);
      fetchTasks();
    } catch (err) {
      toast.error('Lỗi khi gom đơn');
    }
  };

  const handleConfirm = async (e: React.FormEvent, taskId: string, destCode: string) => {
    e.preventDefault();
    const codeToConfirm = scannedCodes[taskId] !== undefined ? scannedCodes[taskId] : destCode;
    if (!codeToConfirm) return alert('Vui lòng quét (hoặc nhập) mã kệ để xác nhận!');
    try {
      const res = await api.post('/inbound/tasks/confirm', {
        taskId,
        scannedLocationCode: codeToConfirm.trim()
      });
      if (res.data.needReAssign) {
        setReassigning(prev => ({ ...prev, [taskId]: true }));
        try {
          const reassignRes = await api.post('/inbound/tasks/reassign', {
            taskId,
            failedLocationCode: codeToConfirm.trim()
          });
          alert('⚠️ ' + res.data.message + '\n\n' + reassignRes.data.message);
          setScannedCodes(prev => ({ ...prev, [taskId]: reassignRes.data.newDest }));
        } catch (reassignErr: any) {
          alert('Lỗi phân luồng: ' + (reassignErr.response?.data?.error || reassignErr.message));
        } finally {
          setReassigning(prev => ({ ...prev, [taskId]: false }));
        }
      } else {
        alert('Thành công! ' + res.data.message);
        setScannedCodes(prev => ({ ...prev, [taskId]: '' }));
      }
      fetchData();
    } catch (err: any) {
      alert('Lỗi: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleLooseReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!looseProduct || looseQty <= 0) return alert('Vui lòng chọn sản phẩm và nhập số lượng hợp lệ!');

    try {
      const res = await api.post('/inbound/loose-receipt', {
        productId: Number(looseProduct),
        qty: looseQty
      });
      setLooseLogs(res.data.messages || []);
      alert(' Đã xử lý Nhập Lẻ thành công!');
      setLooseProduct('');
      setLooseQty(10);
      fetchData();
    } catch (err: any) {
      alert('Lỗi nhập lẻ: ' + (err.response?.data?.error || err.message));
    }
  };

  // Get status badges
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW':
        return <span className="badge badge-blue">Chờ Nhận</span>;
      case 'PROCESSING':
        return <span className="badge badge-orange">Đang Nhận</span>;
      case 'COMPLETED':
        return <span className="badge badge-green">Hoàn Thành</span>;
      default:
        return <span className="badge badge-gray">{status}</span>;
    }
  };

  return (
    <div className="inbound-container">


      {/* Header */}
      <div className="header-section">
        <div className="header-info">
          <h1><Truck size={28} /> Hệ thống Quản lý Nhập Kho</h1>
          <p>Khai báo ASN, pallet hóa thông minh dưới sự hướng dẫn của AI Core và hoàn tất cất hàng.</p>
        </div>
        <button className="refresh-btn" onClick={fetchData} disabled={loading}>
          <RotateCcw size={16} /> {loading ? 'Đang tải...' : 'Làm mới'}
        </button>
      </div>

      {/* Statistics Row */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><PlusCircle size={24} /></div>
          <div className="stat-data">
            <h3>{receipts.length}</h3>
            <p>Tổng phiếu ASN</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow"><Layers size={24} /></div>
          <div className="stat-data">
            <h3>{totalLpns}</h3>
            <p>Pallet tại DOCK_IN</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><PackageCheck size={24} /></div>
          <div className="stat-data">
            <h3>{receipts.filter(r => r.status === 'COMPLETED').length}</h3>
            <p>Đã nhập kho xong</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><Compass size={24} /></div>
          <div className="stat-data">
            <h3>{tasks.filter(t => t.status === 'TODO').length}</h3>
            <p>Lệnh cất kệ chờ</p>
          </div>
        </div>
      </div>

      {/* Stepper Navigation */}
      <div className="stepper-nav">
        <button
          onClick={() => setActiveStep(1)}
          className={`step-item ${activeStep === 1 ? 'active' : ''}`}
        >
          <span style={{ fontSize: '1.2rem', marginRight: '0.25rem' }}>①</span>
          Khai báo ASN
        </button>
        <button
          onClick={() => setActiveStep(2)}
          className={`step-item ${activeStep === 2 ? 'active' : ''}`}
        >
          <span style={{ fontSize: '1.2rem', marginRight: '0.25rem' }}>②</span>
          Pallet hóa & AI
        </button>
        <button
          onClick={() => setActiveStep(3)}
          className={`step-item ${activeStep === 3 ? 'active' : ''}`}
        >
          <span style={{ fontSize: '1.2rem', marginRight: '0.25rem' }}>③</span>
          Xác nhận Cất Kệ
        </button>
        <button
          onClick={() => setActiveStep(4)}
          className={`step-item ${activeStep === 4 ? 'active' : ''}`}
        >
          <span style={{ fontSize: '1.2rem', marginRight: '0.25rem' }}>④</span>
          Nhập Hàng Lẻ
        </button>
      </div>

      {/* Main Panel views depending on Active Step */}

      {activeStep === 1 && (
        <div className="panel-container">
          <div className="custom-card">
            <div className="card-header">
              <PlusCircle size={20} style={{ color: '#2563eb' }} />
              <div>
                <h2>Tạo Phiếu Nhập Dự Kiến (ASN)</h2>
                <p>Khai báo trước thông tin hàng từ nhà cung cấp</p>
              </div>
            </div>
            <div className="card-body">
              <form onSubmit={handleCreateASN}>
                <div className="form-group">
                  <label>Nhà cung cấp / Đối tác</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Công ty ABC"
                    value={supplierName}
                    onChange={e => setSupplierName(e.target.value)}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>Sản phẩm nhập</label>
                  <select
                    value={asnProduct}
                    onChange={e => setAsnProduct(e.target.value)}
                    className="form-control"
                    required
                  >
                    <option value="">-- Chọn sản phẩm --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku_code})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Số lượng Pallet dự kiến</label>
                  <input
                    type="number"
                    value={asnQty}
                    onChange={e => setAsnQty(Number(e.target.value))}
                    className="form-control"
                    min={1}
                    required
                  />
                  {asnProduct && (() => {
                    const product = products.find(p => p.id === Number(asnProduct));
                    const palletUom = product?.productUoms?.find((u: any) => u.uom_level === 'PALLET');
                    const factor = palletUom ? palletUom.conversion_factor : 100;
                    return (
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.35rem' }}>
                        👉 Quy đổi thực tế: <strong>{asnQty}</strong> Pallet = <strong style={{ color: '#2563eb' }}>{asnQty * factor}</strong> {product?.base_uom || 'đơn vị'}
                      </div>
                    );
                  })()}
                </div>
                <button type="submit" className="btn-submit" style={{ marginTop: '0.75rem' }}>
                  Tạo Phiếu ASN <ArrowRight size={16} />
                </button>
              </form>
            </div>
          </div>

          <div className="custom-card">
            <div className="card-header">
              <Barcode size={20} style={{ color: '#2563eb' }} />
              <div>
                <h2>Danh Sách Phiếu ASN Chờ Nhận</h2>
                <p>Theo dõi các lô hàng sắp về hoặc đang ở bãi đỗ</p>
              </div>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="list-table">
                  <thead>
                    <tr>
                      <th>Mã ASN</th>
                      <th>Sản phẩm & SL Dự Kiến</th>
                      <th>Trạng thái</th>
                      <th>Ngày Tạo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.filter(r => r.status === 'NEW').map(r => (
                      <tr key={r.receipt_code}>
                        <td style={{ fontWeight: '700', color: '#1e3a8a' }}>{r.receipt_code}</td>
                        <td>
                          {r.lines && r.lines.length > 0 ? (
                            <div>
                              <span style={{ fontWeight: '500' }}>{r.lines[0].product?.name}</span>
                              <span style={{ color: '#64748b', marginLeft: '0.5rem' }}>
                                (SL: {r.lines[0].expected_qty} {r.lines[0].product?.base_uom || 'cái'})
                              </span>
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>Chưa có dòng hàng</span>
                          )}
                        </td>
                        <td>{getStatusBadge(r.status)}</td>
                        <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {new Date(r.created_at).toLocaleString('vi-VN')}
                        </td>
                      </tr>
                    ))}
                    {receipts.filter(r => r.status === 'NEW').length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                          <Inbox size={32} style={{ margin: '0 auto 0.5rem', display: 'block', opacity: 0.5 }} />
                          Không có phiếu ASN nào đang chờ nhận.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeStep === 2 && (
        <div className="panel-container">
          <div className="custom-card">
            <div className="card-header">
              <Layers size={20} style={{ color: '#d97706' }} />
              <div>
                <h2>Kiểm Đếm & Đóng Pallet</h2>
                <p>Nhận hàng tại DOCK_IN và gắn mã Pallet (LPN)</p>
              </div>
            </div>
            <div className="card-body">
              <form onSubmit={handlePalletize}>
                <div className="form-group">
                  <label>Chọn phiếu ASN để kiểm nhận</label>
                  <select
                    value={selectedReceiptCode}
                    onChange={e => {
                      setSelectedReceiptCode(e.target.value);
                      const receipt = receipts.find(r => r.receipt_code === e.target.value);
                      if (receipt && receipt.lines && receipt.lines.length > 0) {
                        // Tự động fill max = expected_qty của phiếu ASN
                        setActualQty(receipt.lines[0].expected_qty);
                      } else {
                        setActualQty(10);
                      }
                    }}
                    className="form-control"
                    required
                  >
                    <option value="">-- Chọn phiếu ASN (NEW) --</option>
                    {receipts.filter(r => r.status === 'NEW').map(r => (
                      <option key={r.receipt_code} value={r.receipt_code}>
                        {r.receipt_code} - {r.lines?.[0]?.product?.name || 'Sản phẩm'}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedReceiptCode && (
                  <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                    {(() => {
                      const receipt = receipts.find(r => r.receipt_code === selectedReceiptCode);
                      const line = receipt?.lines?.[0];
                      if (!line) return null;
                      return (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                            <span style={{ color: '#64748b' }}>Hàng dự kiến:</span>
                            <strong style={{ color: '#0f172a' }}>{line.product?.name}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>Số lượng ASN yêu cầu:</span>
                            <strong style={{ color: '#2563eb' }}>{line.expected_qty} {line.product?.base_uom}</strong>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ margin: 0 }}>Số lượng đếm thực tế</label>
                    {selectedReceiptCode && (() => {
                      const receipt = receipts.find(r => r.receipt_code === selectedReceiptCode);
                      const maxQty = receipt?.lines?.[0]?.expected_qty;
                      return maxQty ? (
                        <button
                          type="button"
                          onClick={() => setActualQty(maxQty)}
                          style={{
                            padding: '0.2rem 0.6rem', fontSize: '0.75rem', fontWeight: 700,
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            color: '#fff', border: 'none', borderRadius: '0.375rem',
                            cursor: 'pointer', letterSpacing: '0.02em'
                          }}
                        >
                          ⚡ Điền Max ({maxQty})
                        </button>
                      ) : null;
                    })()}
                  </div>
                  <input
                    type="number"
                    value={actualQty}
                    onChange={e => setActualQty(Number(e.target.value))}
                    className="form-control"
                    min={1}
                    required
                    placeholder={(() => {
                      const receipt = receipts.find(r => r.receipt_code === selectedReceiptCode);
                      const maxQty = receipt?.lines?.[0]?.expected_qty;
                      return maxQty ? `Max: ${maxQty} đơn vị` : 'Nhập số lượng thực tế';
                    })()}
                  />
                </div>
                <div className="form-group">
                  <label>Tổng khối lượng kiện hàng (kg)</label>
                  <input
                    type="number"
                    value={weightPerPallet}
                    onChange={e => setWeightPerPallet(Number(e.target.value))}
                    className="form-control"
                    min={1}
                    required
                  />
                </div>
                <button type="submit" className="btn-submit" style={{ backgroundColor: '#d97706', background: 'linear-gradient(to right, #d97706, #f59e0b)' }}>
                  Đóng Pallet & Sinh LPN <ArrowRight size={16} />
                </button>
              </form>
            </div>
          </div>

          <div className="custom-card">
            <div className="card-header">
              <Cpu size={20} style={{ color: '#7c3aed' }} />
              <div>
                <h2>Pallet đang ở vùng đệm DOCK_IN</h2>
                <p>Cần bấm nút AI để xác định vị trí lưu trữ trên kệ</p>
              </div>
            </div>
            <div className="card-body">
              {(() => {
                const receivingLpns = lpns.filter(l => l.status === 'RECEIVING');

                return (
                  <>
                    {receivingLpns.map(l => {
                      const hasTask = tasks.some(t => t.lpn_code === l.lpn_code);
                      const prodName = products.find(p => p.id === l.product_id)?.name || 'Sản phẩm';
                      return (
                        <div key={l.lpn_code} className="dock-item">
                          <div>
                            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {l.lpn_code}
                              <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#64748b' }}>({l.weight_kg} kg)</span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.2rem' }}>
                              Sản phẩm: <strong>{prodName}</strong>
                            </div>
                          </div>

                          <div>
                            {hasTask ? (
                              <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <CheckCircle2 size={12} /> Đã tính vị trí
                              </span>
                            ) : (
                              <button 
                                onClick={() => handleGenerateAI(l.lpn_code)} 
                                className="ai-action-btn"
                                disabled={generatingAI[l.lpn_code]}
                                style={generatingAI[l.lpn_code] ? { opacity: 0.7, cursor: 'wait' } : {}}
                              >
                                {generatingAI[l.lpn_code] ? (
                                  <>⏳ Đang tính toán...</>
                                ) : (
                                  <><Sparkles size={14} /> AI Tính Vị Trí</>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {lpnTotalPages > 1 && (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                        <button 
                          onClick={() => setLpnPage(p => Math.max(1, p - 1))} 
                          disabled={lpnPage === 1}
                          style={{ padding: '0.4rem 1rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', backgroundColor: lpnPage === 1 ? '#f8fafc' : 'white', color: lpnPage === 1 ? '#94a3b8' : '#334155', cursor: lpnPage === 1 ? 'not-allowed' : 'pointer' }}
                        >
                          Trang trước
                        </button>
                        <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                          Trang {lpnPage} / {lpnTotalPages}
                        </span>
                        <button 
                          onClick={() => setLpnPage(p => Math.min(lpnTotalPages, p + 1))} 
                          disabled={lpnPage === lpnTotalPages}
                          style={{ padding: '0.4rem 1rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', backgroundColor: lpnPage === lpnTotalPages ? '#f8fafc' : 'white', color: lpnPage === lpnTotalPages ? '#94a3b8' : '#334155', cursor: lpnPage === lpnTotalPages ? 'not-allowed' : 'pointer' }}
                        >
                          Trang sau
                        </button>
                      </div>
                    )}

                    {receivingLpns.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                        <Inbox size={32} style={{ margin: '0 auto 0.5rem', display: 'block', opacity: 0.5 }} />
                        Khu vực DOCK_IN trống. Không có Pallet nào đang chờ xử lý.
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {activeStep === 3 && (
        <div className="panel-container" style={{ gridTemplateColumns: '1fr' }}>
          <div className="custom-card">
            <div className="card-header" style={{ backgroundColor: 'rgba(5, 150, 105, 0.1)', borderBottom: '1px solid rgba(5, 150, 105, 0.2)', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Compass size={20} style={{ color: '#10b981' }} />
                <div>
                  <h2 style={{ color: '#34d399' }}>Màn Hình Scanner Cho Tài Xế Xe Nâng (Putaway)</h2>
                  <p style={{ color: '#a7f3d0' }}>Di chuyển Pallet đến đúng vị trí kệ kho được chỉ định bởi AI và quét xác nhận</p>
                </div>
              </div>
              <button className="btn-primary" onClick={handleGroupTasks} style={{ background: 'linear-gradient(to right, #7c3aed, #6366f1)', border: 'none' }}>
                <Sparkles size={16} /> Gom Đơn Tối Ưu (God Order)
              </button>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {tasks.filter(t => t.status === 'TODO').map(task => {
                  return (
                    <div key={task.task_id} className="task-card">
                      <div className="task-info-grid">
                        <div>
                          <div className="task-label">MÃ TÁC VỤ</div>
                          <div className="task-value" style={{ color: '#047857' }}>TASK-{task.task_id}</div>
                        </div>
                        <div>
                          <div className="task-label">MÃ PALLET (LPN)</div>
                          <div className="task-value">{task.lpn_code}</div>
                        </div>
                      </div>

                      {task.task_group_id && (
                        <div style={{ marginBottom: '0.5rem' }}>
                          <span className="badge badge-purple" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                            ⭐ God Order #{task.task_group_id}
                          </span>
                        </div>
                      )}

                      <div style={{ marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                        Hàng hóa: <strong style={{ color: '#0f172a' }}>{task.product_name || 'Đang tải...'}</strong>
                      </div>

                      <div className="task-dest-box">
                        <div className="task-label">CẤT VÀO VỊ TRÍ KỆ KHO</div>
                        <div className="task-dest-code">{task.dest_location_code}</div>
                      </div>

                      <div className="ai-reason-box">
                        <Sparkles size={16} style={{ color: '#8b5cf6', flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <strong>AI phân tích:</strong> {task.ai_reason || 'Gợi ý dựa trên thuật toán tối ưu hóa không gian lưu trữ và luồng di chuyển.'}
                        </div>
                      </div>

                      <form onSubmit={e => handleConfirm(e, task.task_id, task.dest_location_code)} style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                          type="text"
                          placeholder="Quét hoặc nhập mã Kệ..."
                          value={scannedCodes[task.task_id] !== undefined ? scannedCodes[task.task_id] : task.dest_location_code}
                          onChange={e => setScannedCodes(prev => ({ ...prev, [task.task_id]: e.target.value }))}
                          className="form-control"
                          style={{ flex: 1, borderColor: '#10b981' }}
                          required
                        />
                        <button 
                          type="submit" 
                          className="btn-submit" 
                          disabled={reassigning[task.task_id]}
                          style={{ 
                            width: 'auto', 
                            background: reassigning[task.task_id] ? '#94a3b8' : 'linear-gradient(to right, #10b981, #059669)',
                            cursor: reassigning[task.task_id] ? 'wait' : 'pointer'
                          }}
                        >
                          {reassigning[task.task_id] ? '⏳ Đang tìm kệ khác...' : 'Xác nhận Cất Kệ'}
                        </button>
                      </form>
                    </div>
                  );
                })}
                {tasks.filter(t => t.status === 'TODO').length === 0 && (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#94a3b8', background: '#fafafa', borderRadius: '0.5rem', border: '1px dashed #cbd5e1' }}>
                    <CheckCircle2 size={36} style={{ margin: '0 auto 0.75rem', display: 'block', color: '#10b981' }} />
                    <span style={{ fontWeight: '600', color: '#475569', fontSize: '1rem', display: 'block', marginBottom: '0.25rem' }}>Tất cả công việc đã hoàn thành!</span>
                    Hiện tại chưa có yêu cầu hoặc tác vụ cất hàng (Putaway) nào cần thực hiện.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeStep === 4 && (
        <div className="panel-container">
          <div className="custom-card">
            <div className="card-header">
              <Inbox size={20} style={{ color: '#d946ef' }} />
              <div>
                <h2>Nhập Hàng Lẻ</h2>
                <p>Cộng dồn số lượng nhỏ vào các Pallet cũ còn trống kệ</p>
              </div>
            </div>
            <div className="card-body">
              <form onSubmit={handleLooseReceipt}>
                <div className="form-group">
                  <label>Chọn mặt hàng nhập lẻ</label>
                  <select
                    value={looseProduct}
                    onChange={e => setLooseProduct(e.target.value)}
                    className="form-control"
                    required
                  >
                    <option value="">-- Chọn sản phẩm lẻ --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku_code})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Số lượng lẻ (bao/gói/hộp)</label>
                  <input
                    type="number"
                    value={looseQty}
                    onChange={e => setLooseQty(Number(e.target.value))}
                    className="form-control"
                    min={1}
                    required
                  />
                </div>
                <button type="submit" className="btn-submit" style={{ backgroundColor: '#d946ef', background: 'linear-gradient(to right, #d946ef, #c084fc)' }}>
                  Xác nhận Nhập Lẻ
                </button>
              </form>
            </div>
          </div>

          <div className="custom-card">
            <div className="card-header" style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155' }}>
              <Barcode size={20} style={{ color: '#38bdf8' }} />
              <div>
                <h2 style={{ color: 'white' }}>Lịch sử & Kết quả cộng dồn hàng lẻ</h2>
                <p style={{ color: '#94a3b8' }}>Tiến trình xử lý phân bổ tự động vào kệ</p>
              </div>
            </div>
            <div className="card-body" style={{ backgroundColor: '#0f172a' }}>
              <div className="console-logs">
                {looseLogs.map((log, idx) => (
                  <div key={idx} className="console-line">
                    &gt; {log}
                  </div>
                ))}
                {looseLogs.length === 0 && (
                  <div className="empty-logs">
                    Console trống. Hãy thực hiện nhập hàng lẻ để xem quá trình phân phối của AI.
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

export default InboundOutboundPage;
