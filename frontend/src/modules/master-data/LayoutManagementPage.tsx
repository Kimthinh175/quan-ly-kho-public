import React, { useState, useEffect, useRef } from 'react';
import api from '../../api';
import WarehouseMap3D from './WarehouseMap3D';

const LayoutManagementPage: React.FC = () => {
  const [locations, setLocations] = useState<any[]>([]);
  const [show3D, setShow3D] = useState<boolean>(false);
  const [resetKey, setResetKey] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'add' | 'dock' | 'search' | 'ai'>('add');

  // State for Add Rack Form
  const [newLoc, setNewLoc] = useState({
    zone: 'A', coord_x: 1, coord_y: 1, level_z: 1, max_weight_kg: 1000,
    location_type: 'RACK', length_cm: 120, width_cm: 100, height_cm: 150, picking_sequence: 1
  });

  // State for Search and Edit Rack
  const [searchCode, setSearchCode] = useState<string>('');
  const [editingLoc, setEditingLoc] = useState<any | null>(null);

  // Ref for Excel file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Layout State
  const [layoutParams, setLayoutParams] = useState({
    widthX: 50, lengthY: 20, aisleWidth: 2, mainAisleX: 25, levels: 4
  });
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewLocations, setPreviewLocations] = useState<any[]>([]);

  // Dock-In State
  const [dockInList, setDockInList] = useState<any[]>([]);
  const [newDockIn, setNewDockIn] = useState({
    zone: 'DOCK_IN', coord_x: 0, coord_y: 0, level_z: 1,
    max_weight_kg: 5000, location_type: 'STAGING',
    length_cm: 300, width_cm: 400, height_cm: 200, picking_sequence: 0,
    dock_name: '', dock_number: 1, vehicle_type: 'TRUCK'
  });

  // Dock-Out State
  const [dockOutList, setDockOutList] = useState<any[]>([]);
  const [newDockOut, setNewDockOut] = useState({
    zone: 'DOCK_OUT', coord_x: 0, coord_y: 0, level_z: 1,
    max_weight_kg: 5000, location_type: 'STAGING',
    length_cm: 300, width_cm: 400, height_cm: 200, picking_sequence: 0,
    dock_name: '', dock_number: 1, vehicle_type: 'TRUCK'
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    setDockInList(locations.filter(l => l.zone === 'DOCK_IN' && l.status !== 'ARCHIVED'));
    setDockOutList(locations.filter(l => l.zone === 'DOCK_OUT' && l.status !== 'ARCHIVED'));
  }, [locations]);

  const fetchLocations = async () => {
    try {
      const res = await api.get('/master-data/locations');
      setLocations(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const addLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/master-data/locations', newLoc);
      alert('Thêm kệ hàng thành công! Hệ thống đã tự động sinh mã kệ.');
      fetchLocations();
    } catch (err: any) {
      alert('Lỗi khi thêm kệ: ' + (err.response?.data?.error || err.message));
    }
  };

  const addDockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        zone: 'DOCK_IN',
        coord_x: newDockIn.coord_x,
        coord_y: newDockIn.coord_y,
        level_z: 1,
        max_weight_kg: newDockIn.max_weight_kg,
        location_type: 'STAGING',
        length_cm: newDockIn.length_cm,
        width_cm: newDockIn.width_cm,
        height_cm: newDockIn.height_cm,
        picking_sequence: newDockIn.dock_number,
      };
      await api.post('/master-data/locations', payload);
      alert(`✅ Đã thêm Dock-In #${newDockIn.dock_number} thành công!`);
      fetchLocations();
    } catch (err: any) {
      alert('Lỗi khi thêm Dock-In: ' + (err.response?.data?.error || err.message));
    }
  };

  const addDockOut = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        zone: 'DOCK_OUT',
        coord_x: newDockOut.coord_x,
        coord_y: newDockOut.coord_y,
        level_z: 1,
        max_weight_kg: newDockOut.max_weight_kg,
        location_type: 'STAGING',
        length_cm: newDockOut.length_cm,
        width_cm: newDockOut.width_cm,
        height_cm: newDockOut.height_cm,
        picking_sequence: newDockOut.dock_number,
      };
      await api.post('/master-data/locations', payload);
      alert(`✅ Đã thêm Dock-Out #${newDockOut.dock_number} thành công!`);
      fetchLocations();
    } catch (err: any) {
      alert('Lỗi khi thêm Dock-Out: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleSearch = () => {
    const found = locations.find(l => l.location_code === searchCode);
    if (found) {
      setEditingLoc(found);
    } else {
      alert('Không tìm thấy kệ có mã: ' + searchCode);
      setEditingLoc(null);
    }
  };

  const handleUpdateLoc = async (status: string, extraData?: any) => {
    if (!editingLoc) return;
    try {
      const payload: any = { status, ...extraData };
      await api.put(`/master-data/locations/${editingLoc.location_id}`, payload);
      alert('Cập nhật kệ thành công!');
      setEditingLoc(null);
      setSearchCode('');
      fetchLocations();
    } catch (err: any) {
      alert('Lỗi cập nhật: ' + err.message);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/master-data/locations/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert(res.data.message);
      fetchLocations();
    } catch (err: any) {
      alert('Lỗi Import Excel: ' + (err.response?.data?.error || err.message));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReset3D = () => {
    setResetKey(prev => prev + 1);
  };

  const handleGenerateLayout = async () => {
    try {
      const res = await api.post('/ai/generate-layout', layoutParams);
      setPreviewLocations(res.data);
      setIsPreviewing(true);
      setShow3D(true);
      alert('Đã tạo sơ đồ tạm (Preview). Cuộn xuống bản đồ 3D để xem trước!');
    } catch (err: any) {
      alert('Lỗi AI: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleApplyLayout = async () => {
    if (!window.confirm('CẢNH BÁO: Thao tác này sẽ thiết lập sơ đồ kệ mới. Các kệ cũ sẽ bị xóa hoàn toàn. Hàng hóa hiện tại (nếu có) sẽ được AI tự động tái phân bổ vào sơ đồ mới. Tiếp tục?')) return;
    try {
      const res = await api.post('/ai/apply-layout', { locations: previewLocations });
      let msg = 'Thành công! Đã thiết lập sơ đồ kho mới.';
      if (res.data.relocation && res.data.relocation.count > 0) {
        msg += `\n\n🤖 AI ĐÃ TỰ ĐỘNG TÁI PHÂN BỔ HÀNG HÓA!\n- Thuật toán chọn: ${res.data.relocation.algorithm_id}\n- Lý do: ${res.data.relocation.ai_reason}\n- Đã sinh ra ${res.data.relocation.count} lệnh cất hàng (WorkTasks) để dời hàng lên kệ mới.`;
      }
      alert(msg);
      setIsPreviewing(false);
      fetchLocations();
    } catch (err: any) {
      alert('Lỗi Lưu: ' + (err.response?.data?.error || err.message));
    }
  };

  const cancelPreview = () => {
    setIsPreviewing(false);
    setPreviewLocations([]);
  };

  const activeLocations = isPreviewing ? previewLocations : locations.filter(l => l.status !== 'ARCHIVED');
  const activeCount = locations.filter(l => l.status === 'ACTIVE').length;
  const dockInCount = dockInList.length;
  const dockOutCount = dockOutList.length;

  const vehicleTypes = ['TRUCK', 'CONTAINER_20FT', 'CONTAINER_40FT', 'VAN', 'MOTORBIKE'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ─── Page Header ─── */}
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">
            <span style={{ fontSize: '1.3rem' }}>🗺️</span> Quản Lý Sơ Đồ Kho
          </div>
          <p className="page-header-sub">Thiết kế layout, quản lý kệ, Dock-In / Dock-Out và bản đồ 3D toàn cảnh kho</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="badge badge-blue">{activeCount} kệ Active</span>
          <span className="badge badge-green">{dockInCount} Dock-In</span>
          <span className="badge badge-yellow">{dockOutCount} Dock-Out</span>
          <span className="badge badge-gray">{locations.length} tổng</span>
        </div>
      </div>

      {/* ─── Tab Navigation ─── */}
      <div style={{
        display: 'flex', gap: '0.25rem',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '0.35rem',
      }}>
        {[
          { key: 'add', icon: '🛠️', label: 'Thêm Kệ' },
          { key: 'dock', icon: '🚛', label: 'Dock-In / Out' },
          { key: 'search', icon: '🔍', label: 'Tìm & Sửa Kệ' },
          { key: 'ai', icon: '🤖', label: 'AI Thiết Kế' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              flex: 1, padding: '0.6rem 0.5rem', border: 'none', cursor: 'pointer',
              borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.85rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
              transition: 'all 0.2s ease',
              background: activeTab === tab.key ? 'var(--accent)' : 'transparent',
              color: activeTab === tab.key ? '#fff' : 'var(--text-secondary)',
              boxShadow: activeTab === tab.key ? '0 2px 8px rgba(99,102,241,0.35)' : 'none',
            }}
          >
            <span>{tab.icon}</span>
            <span style={{ display: 'none', }}>{tab.label}</span>
            <span style={{ display: 'block' }}>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ─── TAB: Thêm Kệ ─── */}
      {activeTab === 'add' && (
        <div className="card">
          <div className="card-header">
            <span>🛠️</span>
            <div><h2>Thêm Kệ Hàng Mới</h2><p>Tự động sinh mã kệ theo vị trí Zone - X - Y - Level</p></div>
          </div>
          <div className="card-body">
            <form onSubmit={addLocation} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Zone (Khu vực)</label>
                <input type="text" value={newLoc.zone} onChange={e => setNewLoc({...newLoc, zone: e.target.value})} className="form-control" placeholder="A, B, C..." required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Tọa độ X</label>
                  <input type="number" value={newLoc.coord_x} onChange={e => setNewLoc({...newLoc, coord_x: Number(e.target.value)})} className="form-control" required />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Tọa độ Y</label>
                  <input type="number" value={newLoc.coord_y} onChange={e => setNewLoc({...newLoc, coord_y: Number(e.target.value)})} className="form-control" required />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Tầng (Level)</label>
                  <input type="number" value={newLoc.level_z} onChange={e => setNewLoc({...newLoc, level_z: Number(e.target.value)})} className="form-control" required />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Loại vị trí</label>
                  <select value={newLoc.location_type} onChange={e => setNewLoc({...newLoc, location_type: e.target.value})} className="form-control" required>
                    <option value="RACK">RACK (Kệ tiêu chuẩn)</option>
                    <option value="FLOOR">FLOOR (Để trệt)</option>
                    <option value="BIN">BIN (Hộp/Khay)</option>
                    <option value="STAGING">STAGING (Trung chuyển)</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Dài (cm)</label>
                  <input type="number" value={newLoc.length_cm} onChange={e => setNewLoc({...newLoc, length_cm: Number(e.target.value)})} className="form-control" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Rộng (cm)</label>
                  <input type="number" value={newLoc.width_cm} onChange={e => setNewLoc({...newLoc, width_cm: Number(e.target.value)})} className="form-control" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Cao (cm)</label>
                  <input type="number" value={newLoc.height_cm} onChange={e => setNewLoc({...newLoc, height_cm: Number(e.target.value)})} className="form-control" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Thể tích (CBM)</label>
                  <input type="number" value={((newLoc.length_cm * newLoc.width_cm * newLoc.height_cm) / 1000000).toFixed(2)} className="form-control" disabled style={{ opacity: 0.7, cursor: 'not-allowed' }} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Trọng tải (kg)</label>
                  <input type="number" value={newLoc.max_weight_kg} onChange={e => setNewLoc({...newLoc, max_weight_kg: Number(e.target.value)})} className="form-control" required />
                </div>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Thứ tự lấy hàng (Picking Seq)</label>
                <input type="number" value={newLoc.picking_sequence} onChange={e => setNewLoc({...newLoc, picking_sequence: Number(e.target.value)})} className="form-control" />
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: '0.25rem' }}>
                + Tạo Kệ (Tự sinh mã)
              </button>
            </form>

            <div style={{ borderTop: '1px solid var(--border)', margin: '1.25rem 0' }} />
            <div>
              <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>📁 Import từ Excel</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Cột bắt buộc: Zone, X, Y, Level, MaxWeight</p>
              <input type="file" accept=".xlsx,.xls" ref={fileInputRef} onChange={handleImportExcel} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }} />
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: Dock-In / Dock-Out ─── */}
      {activeTab === 'dock' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,150,105,0.08) 100%)',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 'var(--radius-lg)', padding: '1.25rem',
              display: 'flex', alignItems: 'center', gap: '1rem'
            }}>
              <div style={{ fontSize: '2rem' }}>📥</div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--green)', letterSpacing: '0.05em' }}>Dock-In</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>{dockInCount}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>cổng nhập hàng đang hoạt động</div>
              </div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(217,119,6,0.08) 100%)',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 'var(--radius-lg)', padding: '1.25rem',
              display: 'flex', alignItems: 'center', gap: '1rem'
            }}>
              <div style={{ fontSize: '2rem' }}>📤</div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#f59e0b', letterSpacing: '0.05em' }}>Dock-Out</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>{dockOutCount}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>cổng xuất hàng đang hoạt động</div>
              </div>
            </div>
          </div>

          {/* Two-column: Dock-In form + Dock-Out form */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

            {/* DOCK-IN FORM */}
            <div className="card" style={{ border: '1px solid rgba(16,185,129,0.25)' }}>
              <div className="card-header" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, transparent 100%)', borderBottom: '1px solid rgba(16,185,129,0.2)' }}>
                <span style={{ fontSize: '1.5rem' }}>📥</span>
                <div>
                  <h2 style={{ color: 'var(--green)' }}>Thêm Dock-In</h2>
                  <p>Cổng nhập hàng từ xe vào kho</p>
                </div>
              </div>
              <div className="card-body">
                <form onSubmit={addDockIn} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Số Dock</label>
                      <input type="number" min={1} value={newDockIn.dock_number}
                        onChange={e => setNewDockIn({...newDockIn, dock_number: Number(e.target.value)})}
                        className="form-control" placeholder="1, 2, 3..." required />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Loại xe</label>
                      <select value={newDockIn.vehicle_type}
                        onChange={e => setNewDockIn({...newDockIn, vehicle_type: e.target.value})}
                        className="form-control">
                        {vehicleTypes.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Tọa độ X</label>
                      <input type="number" value={newDockIn.coord_x}
                        onChange={e => setNewDockIn({...newDockIn, coord_x: Number(e.target.value)})}
                        className="form-control" required />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Tọa độ Y</label>
                      <input type="number" value={newDockIn.coord_y}
                        onChange={e => setNewDockIn({...newDockIn, coord_y: Number(e.target.value)})}
                        className="form-control" required />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Dài (cm)</label>
                      <input type="number" value={newDockIn.length_cm}
                        onChange={e => setNewDockIn({...newDockIn, length_cm: Number(e.target.value)})}
                        className="form-control" />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Rộng (cm)</label>
                      <input type="number" value={newDockIn.width_cm}
                        onChange={e => setNewDockIn({...newDockIn, width_cm: Number(e.target.value)})}
                        className="form-control" />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Cao (cm)</label>
                      <input type="number" value={newDockIn.height_cm}
                        onChange={e => setNewDockIn({...newDockIn, height_cm: Number(e.target.value)})}
                        className="form-control" />
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Tải trọng tối đa (kg)</label>
                    <input type="number" value={newDockIn.max_weight_kg}
                      onChange={e => setNewDockIn({...newDockIn, max_weight_kg: Number(e.target.value)})}
                      className="form-control" required />
                  </div>
                  <button type="submit" className="btn-success" style={{ marginTop: '0.25rem' }}>
                    📥 Thêm Dock-In
                  </button>
                </form>

                {/* Dock-In List */}
                {dockInList.length > 0 && (
                  <div style={{ marginTop: '1.25rem' }}>
                    <p style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      Danh sách Dock-In ({dockInList.length})
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {dockInList.map(d => (
                        <div key={d.location_id} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '0.5rem 0.75rem',
                          background: 'rgba(16,185,129,0.08)',
                          border: '1px solid rgba(16,185,129,0.2)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.82rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1rem' }}>📥</span>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--green)' }}>{d.location_code}</span>
                          </div>
                          <span className="badge badge-green">{d.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* DOCK-OUT FORM */}
            <div className="card" style={{ border: '1px solid rgba(245,158,11,0.25)' }}>
              <div className="card-header" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, transparent 100%)', borderBottom: '1px solid rgba(245,158,11,0.2)' }}>
                <span style={{ fontSize: '1.5rem' }}>📤</span>
                <div>
                  <h2 style={{ color: '#f59e0b' }}>Thêm Dock-Out</h2>
                  <p>Cổng xuất hàng từ kho ra xe</p>
                </div>
              </div>
              <div className="card-body">
                <form onSubmit={addDockOut} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Số Dock</label>
                      <input type="number" min={1} value={newDockOut.dock_number}
                        onChange={e => setNewDockOut({...newDockOut, dock_number: Number(e.target.value)})}
                        className="form-control" placeholder="1, 2, 3..." required />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Loại xe</label>
                      <select value={newDockOut.vehicle_type}
                        onChange={e => setNewDockOut({...newDockOut, vehicle_type: e.target.value})}
                        className="form-control">
                        {vehicleTypes.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Tọa độ X</label>
                      <input type="number" value={newDockOut.coord_x}
                        onChange={e => setNewDockOut({...newDockOut, coord_x: Number(e.target.value)})}
                        className="form-control" required />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Tọa độ Y</label>
                      <input type="number" value={newDockOut.coord_y}
                        onChange={e => setNewDockOut({...newDockOut, coord_y: Number(e.target.value)})}
                        className="form-control" required />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Dài (cm)</label>
                      <input type="number" value={newDockOut.length_cm}
                        onChange={e => setNewDockOut({...newDockOut, length_cm: Number(e.target.value)})}
                        className="form-control" />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Rộng (cm)</label>
                      <input type="number" value={newDockOut.width_cm}
                        onChange={e => setNewDockOut({...newDockOut, width_cm: Number(e.target.value)})}
                        className="form-control" />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Cao (cm)</label>
                      <input type="number" value={newDockOut.height_cm}
                        onChange={e => setNewDockOut({...newDockOut, height_cm: Number(e.target.value)})}
                        className="form-control" />
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Tải trọng tối đa (kg)</label>
                    <input type="number" value={newDockOut.max_weight_kg}
                      onChange={e => setNewDockOut({...newDockOut, max_weight_kg: Number(e.target.value)})}
                      className="form-control" required />
                  </div>
                  <button type="submit" className="btn-warning" style={{ marginTop: '0.25rem' }}>
                    📤 Thêm Dock-Out
                  </button>
                </form>

                {/* Dock-Out List */}
                {dockOutList.length > 0 && (
                  <div style={{ marginTop: '1.25rem' }}>
                    <p style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      Danh sách Dock-Out ({dockOutList.length})
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {dockOutList.map(d => (
                        <div key={d.location_id} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '0.5rem 0.75rem',
                          background: 'rgba(245,158,11,0.08)',
                          border: '1px solid rgba(245,158,11,0.2)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.82rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1rem' }}>📤</span>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f59e0b' }}>{d.location_code}</span>
                          </div>
                          <span className="badge badge-yellow">{d.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: Tìm & Sửa Kệ ─── */}
      {activeTab === 'search' && (
        <div className="card">
          <div className="card-header">
            <span>🔍</span>
            <div><h2>Tìm Kiếm & Sửa Kệ</h2><p>Tìm theo mã kệ, thay đổi trạng thái và thông số</p></div>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <input
                type="text"
                placeholder="Nhập mã kệ (VD: A-01-01-L1-A)"
                value={searchCode}
                onChange={e => setSearchCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="form-control"
                style={{ flex: 1 }}
              />
              <button onClick={handleSearch} className="btn-warning" style={{ whiteSpace: 'nowrap' }}>🔍 Tìm</button>
            </div>

            {editingLoc && (
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <h4 style={{ margin: 0, fontFamily: 'monospace', color: 'var(--accent)', fontSize: '1.1rem' }}>{editingLoc.location_code}</h4>
                  <span className={`badge badge-${editingLoc.status === 'ACTIVE' ? 'green' : editingLoc.status === 'INACTIVE' ? 'yellow' : 'red'}`}>{editingLoc.status}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Loại vị trí</label>
                    <select value={editingLoc.location_type || 'RACK'} onChange={e => setEditingLoc({...editingLoc, location_type: e.target.value})} className="form-control">
                      <option value="RACK">RACK</option>
                      <option value="FLOOR">FLOOR</option>
                      <option value="BIN">BIN</option>
                      <option value="STAGING">STAGING</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Trọng Tải (kg)</label>
                    <input type="number" value={editingLoc.max_weight_kg} onChange={e => setEditingLoc({...editingLoc, max_weight_kg: Number(e.target.value)})} className="form-control" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Dài (cm)</label>
                    <input type="number" value={editingLoc.length_cm || ''} onChange={e => setEditingLoc({...editingLoc, length_cm: Number(e.target.value)})} className="form-control" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Rộng (cm)</label>
                    <input type="number" value={editingLoc.width_cm || ''} onChange={e => setEditingLoc({...editingLoc, width_cm: Number(e.target.value)})} className="form-control" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Cao (cm)</label>
                    <input type="number" value={editingLoc.height_cm || ''} onChange={e => setEditingLoc({...editingLoc, height_cm: Number(e.target.value)})} className="form-control" />
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label>Thứ tự lấy hàng</label>
                  <input type="number" value={editingLoc.picking_sequence || ''} onChange={e => setEditingLoc({...editingLoc, picking_sequence: Number(e.target.value)})} className="form-control" />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                  <button onClick={() => handleUpdateLoc('ACTIVE', {
                    max_weight_kg: editingLoc.max_weight_kg, location_type: editingLoc.location_type,
                    length_cm: editingLoc.length_cm, width_cm: editingLoc.width_cm,
                    height_cm: editingLoc.height_cm, picking_sequence: editingLoc.picking_sequence
                  })} className="btn-success" style={{ flex: 1 }}>✅ Active</button>
                  <button onClick={() => handleUpdateLoc('INACTIVE', {
                    max_weight_kg: editingLoc.max_weight_kg, location_type: editingLoc.location_type,
                    length_cm: editingLoc.length_cm, width_cm: editingLoc.width_cm,
                    height_cm: editingLoc.height_cm, picking_sequence: editingLoc.picking_sequence
                  })} className="btn-warning" style={{ flex: 1 }}>🔧 Inactive</button>
                  <button onClick={() => handleUpdateLoc('ARCHIVED')} className="btn-danger" style={{ width: '100%', marginTop: '0.25rem' }}>🗑️ Tháo Dỡ (Archive)</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB: AI Thiết Kế ─── */}
      {activeTab === 'ai' && (
        <div className="card" style={{ border: '1px solid rgba(16,185,129,0.25)' }}>
          <div className="card-header" style={{ background: 'var(--green-subtle)', borderBottom: '1px solid rgba(16,185,129,0.2)' }}>
            <span>🤖</span>
            <div>
              <h2 style={{ color: 'var(--green)' }}>AI Tự Động Thiết Kế Sơ Đồ Kho</h2>
              <p>Nhập thông số mặt bằng — AI tự bố trí dãy kệ Back-to-Back tối ưu và phân Zone</p>
            </div>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              {[
                { label: 'Chiều dài kho (X)', key: 'widthX', disabled: true },
                { label: 'Chiều sâu kho (Y)', key: 'lengthY', disabled: true },
                { label: 'Rộng lối đi xe nâng', key: 'aisleWidth', disabled: false },
                { label: 'Tọa độ cửa DOCK (X)', key: 'mainAisleX', disabled: false },
                { label: 'Số tầng kệ', key: 'levels', disabled: false },
              ].map(({ label, key, disabled }) => (
                <div key={key} className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.72rem' }}>{label}</label>
                  <input
                    type="number"
                    value={(layoutParams as any)[key]}
                    disabled={disabled}
                    onChange={e => !disabled && setLayoutParams({ ...layoutParams, [key]: Number(e.target.value) })}
                    className="form-control"
                    style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button onClick={handleGenerateLayout} className="btn-success">✨ Chạy AI Tính Toán</button>
              {isPreviewing && (
                <>
                  <button onClick={handleApplyLayout} className="btn-primary">💾 Lưu & Áp Dụng</button>
                  <button onClick={cancelPreview} className="btn-ghost">❌ Hủy</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── 3D Map Card (always visible) ─── */}
      <div className="card">
        <div className="card-header">
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span>📍</span><h2>Bản Đồ 3D Sơ Đồ Kho</h2>
            {isPreviewing && <span className="badge badge-yellow" style={{ animation: 'pulse 1.5s infinite' }}>● PREVIEW</span>}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {show3D && <button onClick={handleReset3D} className="btn-ghost" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>🔄 Reset</button>}
            <button onClick={() => setShow3D(!show3D)} className={show3D ? 'btn-danger' : 'btn-success'} style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
              {show3D ? '🔴 Tắt 3D' : '🟢 Bật 3D'}
            </button>
          </div>
        </div>
        <div style={{ padding: show3D ? 0 : '1.5rem' }}>
          {show3D ? (
            <WarehouseMap3D key={resetKey} locations={activeLocations} showInventory={false} />
          ) : (
            <div style={{
              width: '100%', height: '400px',
              background: 'var(--bg-elevated)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              borderRadius: 'var(--radius-md)', border: '2px dashed var(--border-strong)', gap: '0.5rem'
            }}>
              <span style={{ fontSize: '2rem', opacity: 0.3 }}>🏭</span>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>Bản đồ 3D đang tắt. Bấm Bật 3D để xem toàn cảnh kho.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LayoutManagementPage;
