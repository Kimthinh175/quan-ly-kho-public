import React, { useState } from 'react';
import api from '../../api';
import { Cpu, Sparkles, Zap, Trophy, BarChart2, Brain } from 'lucide-react';

const WEIGHT_LABELS: Record<string, string> = {
  W_WEIGHT: 'An toàn Tải trọng',
  W_SPEED: 'Tốc độ (Gần Dock)',
  W_ZONE: 'Gom nhóm hàng',
  W_TRAFFIC: 'Tránh kẹt xe',
  W_SPACE: 'Tận dụng kệ nhỏ',
  W_DATE: 'FIFO (Date)',
  W_HAZMAT: 'Cách ly Hóa chất',
};

const AICorePage: React.FC = () => {
  const [context, setContext] = useState('');
  const [productId, setProductId] = useState(1);
  const [weightKg, setWeightKg] = useState(500);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const simulate = async () => {
    setLoading(true);
    try {
      const res = await api.post('/ai/mcdm-simulate', { productId, weightKg, context });
      setResult(res.data);
    } catch (e) {
      alert('Lỗi: Không thể gọi AI Engine');
    }
    setLoading(false);
  };

  const generateHardCase = () => {
    setContext('Kho đang ngập 95%, chuẩn bị có bão nên cần nhập gấp Hóa chất Javel siêu nặng, xe tải đang xếp hàng ở cửa DOCK.');
    setProductId(3);
    setWeightKg(1500);
  };

  return (
    <div className="ai-core-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">
            <Cpu size={22} style={{ color: 'var(--accent)' }} />
            AI Core Engine
            <span className="header-badge"><Sparkles size={10} /> MCDM 7-Criteria</span>
          </div>
          <p className="page-header-sub">Thuật toán ra quyết định đa tiêu chí — AI tự phân tích ngữ cảnh và đề xuất vị trí kệ tối ưu</p>
        </div>
      </div>

      {/* Input Form */}
      <div className="card">
        <div className="card-header">
          <Brain size={18} style={{ color: 'var(--accent)' }} />
          <div><h2>Báo Cáo Tình Hình Kho Cho AI</h2><p>Mô tả ngữ cảnh càng chi tiết, AI phân tích càng chính xác</p></div>
        </div>
        <div className="card-body">
          <div className="form-group">
            <label>Ngữ cảnh kho hiện tại</label>
            <textarea
              value={context}
              onChange={e => setContext(e.target.value)}
              placeholder="Ví dụ: Bão Sale 11.11, kho đang ngập 85%, xe đang kẹt ở cổng A..."
              rows={3}
              className="form-control"
              style={{ resize: 'vertical', minHeight: '90px' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>ID Sản Phẩm</label>
              <input type="number" value={productId} onChange={e => setProductId(Number(e.target.value))} className="form-control" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Khối Lượng (kg)</label>
              <input type="number" value={weightKg} onChange={e => setWeightKg(Number(e.target.value))} className="form-control" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={generateHardCase} className="btn-ghost">
              <Zap size={14} /> Demo: Tình Huống Cực Khó
            </button>
            <button onClick={simulate} disabled={loading} className="btn-primary">
              {loading
                ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', marginRight: '0.4rem' }}>⟳</span> AI Đang Suy Nghĩ...</>
                : <><Cpu size={14} /> Giao Việc Cho AI Chỉ Huy</>
              }
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="result-container">
          {/* AI Reason */}
          <div className="card">
            <div className="card-header" style={{ borderLeft: '3px solid var(--accent)' }}>
              <Brain size={18} style={{ color: 'var(--accent)' }} />
              <div><h2>Phân Tích Của Não AI (Qwen)</h2></div>
            </div>
            <div className="card-body">
              <div className="ai-reason-card">
                <p style={{ margin: 0, fontStyle: 'italic', fontSize: '0.95rem', lineHeight: '1.7', color: 'var(--text-secondary)' }}>
                  "{result.ai_reason}"
                </p>
              </div>

              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem', marginTop: '1.25rem' }}>
                <BarChart2 size={14} style={{ display: 'inline', marginRight: '0.4rem', verticalAlign: 'middle' }} />
                Biểu Đồ Trọng Số AI Tự Động
              </h3>
              <div className="weights-grid">
                {Object.keys(result.ai_weights).map(key => {
                  const pct = result.ai_weights[key];
                  const color = pct > 60 ? 'var(--red)' : pct > 30 ? 'var(--accent)' : 'var(--green)';
                  return (
                    <div key={key} className="weight-bar-container">
                      <div className="weight-label">
                        <span>{WEIGHT_LABELS[key] || key.replace('W_', '')}</span>
                        <span style={{ color: color, fontWeight: 700 }}>{pct}%</span>
                      </div>
                      <div className="progress-bg">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Top Locations */}
          <div className="card">
            <div className="card-header">
              <Trophy size={18} style={{ color: 'var(--yellow)' }} />
              <div><h2>Top 3 Kệ Được Đề Cử — Thuật Toán MCDM 7 Tiêu Chí</h2></div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="list-table">
                <thead>
                  <tr>
                    <th>Hạng</th>
                    <th>Mã Kệ</th>
                    <th>Khu Vực</th>
                    <th>Tổng Điểm</th>
                    <th>Chi Tiết (Speed / Weight / Hazmat)</th>
                  </tr>
                </thead>
                <tbody>
                  {result.top_locations.map((loc: any, idx: number) => (
                    <tr key={loc.location_code}>
                      <td>
                        {idx === 0
                          ? <span style={{ fontSize: '1.2rem' }}>🥇</span>
                          : idx === 1
                          ? <span style={{ fontSize: '1.2rem' }}>🥈</span>
                          : <span style={{ fontSize: '1.2rem' }}>🥉</span>
                        }
                      </td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1rem', color: idx === 0 ? 'var(--green)' : 'var(--text-primary)' }}>
                        {loc.location_code}
                      </td>
                      <td><span className="badge badge-blue">Zone {loc.zone}</span></td>
                      <td>
                        <span className={`badge ${idx === 0 ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: '0.85rem', padding: '0.3rem 0.7rem' }}>
                          {loc.totalScore.toFixed(1)} điểm
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        S:{loc.scores.speedScore.toFixed(0)} | W:{loc.scores.weightScore.toFixed(0)} | H:{loc.scores.hazmatScore}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default AICorePage;
