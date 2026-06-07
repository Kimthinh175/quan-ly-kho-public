import React, { useState, useEffect } from 'react';
import { Truck, Plus, Edit2, Trash2 } from 'lucide-react';
import api from '../../api';
import toast from 'react-hot-toast';

interface Equipment {
  id: number;
  equipment_code: string;
  equipment_type: string;
  name: string;
  max_weight_kg: number;
  length_m: number;
  width_m: number;
  min_aisle_width_m: number;
  max_pallets: number;
  quantity: number;
  status: string;
}

const EquipmentManagementPage: React.FC = () => {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    equipment_code: '',
    equipment_type: 'FORKLIFT',
    name: '',
    max_weight_kg: 1500,
    length_m: 2.0,
    width_m: 1.0,
    max_pallets: 1,
    quantity: 1,
    status: 'ACTIVE'
  });

  useEffect(() => {
    fetchEquipments();
  }, []);

  const fetchEquipments = async () => {
    try {
      const res = await api.get('/master-data/equipment');
      setEquipments(res.data);
    } catch (err) {
      toast.error('Lỗi khi tải danh sách thiết bị');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/master-data/equipment/${editingId}`, formData);
        toast.success('Cập nhật thiết bị thành công');
      } else {
        await api.post('/master-data/equipment', formData);
        toast.success('Thêm thiết bị mới thành công');
      }
      setShowModal(false);
      setEditingId(null);
      fetchEquipments();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi khi lưu thiết bị');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa thiết bị này?')) return;
    try {
      await api.delete(`/master-data/equipment/${id}`);
      toast.success('Xóa thiết bị thành công');
      fetchEquipments();
    } catch (err) {
      toast.error('Lỗi khi xóa thiết bị');
    }
  };

  const openEdit = (equip: Equipment) => {
    setEditingId(equip.id);
    setFormData({
      equipment_code: equip.equipment_code,
      equipment_type: equip.equipment_type,
      name: equip.name,
      max_weight_kg: equip.max_weight_kg,
      length_m: equip.length_m || 2.0,
      width_m: equip.width_m || 1.0,
      max_pallets: equip.max_pallets,
      quantity: equip.quantity,
      status: equip.status
    });
    setShowModal(true);
  };

  const openNew = () => {
    setEditingId(null);
    setFormData({
      equipment_code: `EQ-${Date.now().toString().slice(-4)}`,
      equipment_type: 'FORKLIFT',
      name: '',
      max_weight_kg: 1500,
      length_m: 2.0,
      width_m: 1.0,
      max_pallets: 1,
      quantity: 1,
      status: 'ACTIVE'
    });
    setShowModal(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">
            <Truck size={22} style={{ color: 'var(--accent)' }} />
            Quản Lý Phương Tiện & Thiết Bị
          </div>
          <p className="page-header-sub">Quản lý xe nâng, xe đẩy, sức tải tối đa để AI phân bổ nhiệm vụ hợp lý</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-0.5rem' }}>
        <button className="btn-primary" onClick={openNew}>
          <Plus size={16} /> Thêm Thiết Bị Mới
        </button>
      </div>

      <div className="custom-card" style={{ flex: 1, overflow: 'hidden' }}>
        <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="list-table" style={{ width: '100%', minWidth: '800px' }}>
            <thead>
              <tr>
                <th style={{ whiteSpace: 'nowrap' }}>Mã Xe</th>
                <th>Tên Gọi</th>
                <th>Loại Xe</th>
                <th style={{ whiteSpace: 'nowrap' }}>Tải Trọng</th>
                <th style={{ whiteSpace: 'nowrap' }}>Sức Chứa</th>
                <th style={{ whiteSpace: 'nowrap' }}>Dài x Rộng</th>
                <th style={{ whiteSpace: 'nowrap' }}>Góc Quay</th>
                <th style={{ whiteSpace: 'nowrap' }}>SL</th>
                <th style={{ whiteSpace: 'nowrap' }}>Trạng Thái</th>
                <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {equipments.map(eq => (
                <tr key={eq.id}>
                  <td style={{ fontWeight: 600, color: 'var(--accent)', whiteSpace: 'nowrap' }}>{eq.equipment_code}</td>
                  <td style={{ minWidth: '150px' }}>{eq.name}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span className="badge badge-purple">{eq.equipment_type}</span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{eq.max_weight_kg} kg</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{eq.max_pallets} pl</td>
                  <td style={{ whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{eq.length_m} x {eq.width_m} m</td>
                  <td style={{ whiteSpace: 'nowrap', fontWeight: 500, color: 'var(--text-primary)' }}>{eq.min_aisle_width_m} m</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{eq.quantity}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span className={`badge ${eq.status === 'ACTIVE' ? 'badge-green' : 'badge-orange'}`}>
                      {eq.status === 'ACTIVE' ? 'Hoạt động' : 'Bảo trì'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn-ghost" onClick={() => openEdit(eq)} style={{ padding: '4px 8px' }} title="Sửa">
                      <Edit2 size={14} />
                    </button>
                    <button className="btn-ghost" onClick={() => handleDelete(eq.id)} style={{ padding: '4px 8px', color: 'var(--red)' }} title="Xóa">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {equipments.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Chưa có thiết bị nào được cấu hình.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px', padding: 0, overflow: 'hidden' }}>
            <div className="card-header" style={{ background: 'var(--accent-subtle)' }}>
              <Truck size={16} style={{ color: 'var(--accent)' }} />
              <div><h2>{editingId ? 'Cập nhật Thiết Bị' : 'Thêm Thiết Bị Mới'}</h2></div>
            </div>
            <div className="card-body">
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Mã thiết bị / Biển số</label>
                  <input required value={formData.equipment_code} onChange={e => setFormData({...formData, equipment_code: e.target.value})} className="form-control" placeholder="VD: FL-01" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Tên gọi</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="form-control" placeholder="VD: Xe Nâng Điện Komatsu" />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1, margin: 0 }}>
                    <label>Loại thiết bị</label>
                    <select value={formData.equipment_type} onChange={e => setFormData({...formData, equipment_type: e.target.value})} className="form-control">
                      <option value="FORKLIFT">Xe nâng Forklift</option>
                      <option value="REACH_TRUCK">Xe nâng Reach Truck</option>
                      <option value="PALLET_JACK">Xe nâng tay</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1, margin: 0 }}>
                    <label>Trạng thái</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="form-control">
                      <option value="ACTIVE">Hoạt động</option>
                      <option value="MAINTENANCE">Bảo trì</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1, margin: 0 }}>
                    <label>Sức tải tối đa (kg)</label>
                    <input type="number" required min="100" value={formData.max_weight_kg} onChange={e => setFormData({...formData, max_weight_kg: Number(e.target.value)})} className="form-control" />
                  </div>
                  <div className="form-group" style={{ flex: 1, margin: 0 }}>
                    <label>Số lượng (chiếc)</label>
                    <input type="number" required min="1" value={formData.quantity} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} className="form-control" />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1, margin: 0 }}>
                    <label>Chiều dài xe (m)</label>
                    <input type="number" required min="0.5" step="0.1" value={formData.length_m} onChange={e => setFormData({...formData, length_m: Number(e.target.value)})} className="form-control" />
                  </div>
                  <div className="form-group" style={{ flex: 1, margin: 0 }}>
                    <label>Chiều rộng xe (m)</label>
                    <input type="number" required min="0.5" step="0.1" value={formData.width_m} onChange={e => setFormData({...formData, width_m: Number(e.target.value)})} className="form-control" />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1, margin: 0 }}>
                    <label>Sức chứa (Pallet)</label>
                    <input type="number" required min="1" value={formData.max_pallets} onChange={e => setFormData({...formData, max_pallets: Number(e.target.value)})} className="form-control" />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                  <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                  <button type="submit" className="btn-submit" style={{ width: 'auto' }}>Lưu Thiết Bị</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentManagementPage;
