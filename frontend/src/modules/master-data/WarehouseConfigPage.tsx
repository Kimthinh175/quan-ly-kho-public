import React, { useState } from 'react';
import { Settings, Map, Truck } from 'lucide-react';
import LayoutManagementPage from './LayoutManagementPage';
import EquipmentManagementPage from './EquipmentManagementPage';

const WarehouseConfigPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'layout' | 'equipment'>('layout');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">
            <Settings size={22} style={{ color: 'var(--accent)' }} />
            Cấu Hình Kho & Thiết Bị
          </div>
          <p className="page-header-sub">Quản lý sơ đồ 3D và phương tiện vận hành trong kho</p>
        </div>
      </div>

      <div className="tabs" style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        <button 
          className={`btn-ghost ${activeTab === 'layout' ? 'active' : ''}`}
          style={{ borderBottom: activeTab === 'layout' ? '2px solid var(--accent)' : 'none', borderRadius: 0, paddingBottom: '0.5rem' }}
          onClick={() => setActiveTab('layout')}
        >
          <Map size={16} /> Sơ Đồ Kho 3D
        </button>
        <button 
          className={`btn-ghost ${activeTab === 'equipment' ? 'active' : ''}`}
          style={{ borderBottom: activeTab === 'equipment' ? '2px solid var(--accent)' : 'none', borderRadius: 0, paddingBottom: '0.5rem' }}
          onClick={() => setActiveTab('equipment')}
        >
          <Truck size={16} /> Thiết Bị (Xe Nâng)
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        {activeTab === 'layout' ? <LayoutManagementPage /> : <EquipmentManagementPage />}
      </div>
    </div>
  );
};

export default WarehouseConfigPage;
