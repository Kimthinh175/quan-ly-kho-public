import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import {
  Package, LayoutGrid, Warehouse, PackagePlus, PackageMinus,
  Cpu, Box, TrendingDown
} from 'lucide-react';
import ProductInventoryHub from './modules/master-data/ProductInventoryHub';
import LayoutManagementPage from './modules/master-data/LayoutManagementPage';
import EquipmentManagementPage from './modules/master-data/EquipmentManagementPage';
import InboundOutboundPage from './modules/inbound-outbound/InboundOutboundPage';
import AICorePage from './modules/ai-core/AICorePage';
import ProductManagementPage from './modules/master-data/ProductManagementPage';
import OutboundPage from './modules/inbound-outbound/OutboundPage';
import './index.css';

const NavItem: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
  >
    <span className="nav-item-icon">{icon}</span>
    {label}
  </NavLink>
);

const App: React.FC = () => {
  const [configOpen, setConfigOpen] = React.useState(true);

  return (
    <Router>
      <div className="app-container">
        {/* ====== SIDEBAR ====== */}
        <aside className="sidebar">
          {/* Logo */}
          <div className="sidebar-logo">
            <div className="sidebar-logo-inner">
              <div className="sidebar-logo-icon">
                <Warehouse size={18} color="white" />
              </div>
              <div className="sidebar-logo-text">
                <h1>WMS AI</h1>
                <span>Warehouse Platform</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="sidebar-nav">
            <div className="nav-group-label">Kho hàng</div>
            <NavItem to="/product-inventory"  icon={<TrendingDown size={15}/>} label="Tồn Kho Thực Tế" />
            <NavItem to="/product-management" icon={<Package size={15}/>}      label="Quản Lý Hàng Hoá" />
            
            <div 
              className={`nav-item`}
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
              onClick={() => setConfigOpen(!configOpen)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="nav-item-icon"><LayoutGrid size={15}/></span>
                Cấu Hình Kho
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{configOpen ? '▼' : '▶'}</span>
            </div>
            
            {configOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '1.5rem', marginTop: '-2px', marginBottom: '4px' }}>
                <NavLink to="/config/layout" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', minHeight: '32px' }}>
                  Sơ Đồ Kho 3D
                </NavLink>
                <NavLink to="/config/equipment" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', minHeight: '32px' }}>
                  Thiết Bị (Xe Nâng)
                </NavLink>
              </div>
            )}

            <div className="nav-group-label">Vận hành</div>
            <NavItem to="/inbound"  icon={<PackagePlus size={15}/>}  label="Nhập Kho (Inbound)" />
            <NavItem to="/outbound" icon={<PackageMinus size={15}/>} label="Xuất Kho (Outbound)" />

            <div className="nav-group-label">Trí tuệ nhân tạo</div>
            <NavItem to="/ai-core" icon={<Cpu size={15}/>} label="AI Core Engine" />
          </nav>

          {/* Footer badge */}
          <div className="sidebar-footer">
            <div className="ai-status-badge">
              <div className="ai-status-dot" />
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>
                AI Engine — Training
              </span>
            </div>
          </div>
        </aside>

        {/* ====== MAIN CONTENT ====== */}
        <main className="main-content">
          <Routes>
            <Route path="/"                   element={<ProductInventoryHub />} />
            <Route path="/product-inventory"  element={<ProductInventoryHub />} />
            <Route path="/product-management" element={<ProductManagementPage />} />
            <Route path="/config/layout"      element={<LayoutManagementPage />} />
            <Route path="/config/equipment"   element={<EquipmentManagementPage />} />
            <Route path="/inbound"            element={<InboundOutboundPage />} />
            <Route path="/outbound"           element={<OutboundPage />} />
            <Route path="/ai-core"            element={<AICorePage />} />
          </Routes>
        </main>
      </div>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-strong)',
            fontSize: '0.875rem',
          },
          success: { iconTheme: { primary: 'var(--green)', secondary: 'var(--bg-card)' } },
          error: { iconTheme: { primary: 'var(--red)', secondary: 'var(--bg-card)' } },
        }}
      />
    </Router>
  );
};

export default App;
