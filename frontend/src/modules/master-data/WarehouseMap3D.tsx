import React, { useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MapControls, Grid, Text, Html, Line } from '@react-three/drei';
import * as THREE from 'three';

const CameraController = ({ focusedPos }: { focusedPos: [number, number, number] | null }) => {
  const targetRef = React.useRef<THREE.Vector3 | null>(null);
  const posRef = React.useRef<THREE.Vector3 | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (focusedPos) {
      targetRef.current = new THREE.Vector3(focusedPos[0], focusedPos[1], focusedPos[2]);
      posRef.current = new THREE.Vector3(focusedPos[0], focusedPos[1] + 3, focusedPos[2] + 5);
      setIsAnimating(true);
    }
  }, [focusedPos]);

  useFrame((state) => {
    if (isAnimating && targetRef.current && posRef.current && state.controls) {
      state.camera.position.lerp(posRef.current, 0.05);
      (state.controls as any).target.lerp(targetRef.current, 0.05);
      (state.controls as any).update();

      // Stop animating when close enough, handing control back to user
      if (state.camera.position.distanceTo(posRef.current) < 0.1) {
        setIsAnimating(false);
      }
    }
  });
  return null;
};

interface LocationItem {
  location_id: string;
  location_code: string;
  zone: string;
  coord_x: number;
  coord_y: number;
  level_z: number;
  max_weight_kg: number;
  current_weight_kg: number;
  is_full: boolean;
  status?: string;
  lpn_code?: string;
  product?: {
    id: number;
    name: string;
    color: string;
    shortName: string;
  } | null;
}

interface WarehouseMap3DProps {
  locations: LocationItem[];
  showInventory?: boolean;
  focusedLocationCode?: string;
  focusedLocationCodes?: string[];
}

// Hàm hỗ trợ để map từ tọa độ thực tế sang tọa độ 3D
// Kho 50x20, tọa độ trung tâm là (0,0) nên ta dịch chuyển tọa độ (1..50) thành (-25..25)
const mapCoordinates = (x: number, y: number, zLevel: number) => {
  const mapX = x - 25.5; // Tâm nằm ở 0
  const mapZ = y - 10.5; // Chiều sâu Y trong 2D chính là Z trong 3D
  const mapY = zLevel - 0.5; // Chiều cao Z trong 2D là Y trong 3D. Tầng 1 nằm ngay trên sàn.
  return [mapX, mapY, mapZ] as [number, number, number];
};

const groupLocations = (locations: LocationItem[]) => {
  const groups: Record<string, LocationItem[]> = {};
  locations.forEach(loc => {
    const key = `${loc.coord_x}_${loc.coord_y}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(loc);
  });
  return Object.values(groups);
};

// Phân hạng (Rank) ảo cho Frontend dựa trên tên
const getProductRank = (name?: string) => {
  if (!name) return 'N/A';
  if (['Mì Hảo Hảo', 'Sữa TH True Milk', 'Nước khoáng Lavie'].includes(name)) return 'A (Fast-moving)';
  return 'C (Slow-moving)';
};

// Component Rack Vật lý
const PhysicalRack = ({ group, onSelectSlot, showInventory, focusedLocationCodes }: { group: LocationItem[], onSelectSlot: (loc: LocationItem, pos: [number, number, number]) => void, showInventory?: boolean, focusedLocationCodes?: string[] }) => {
  if (group.length === 0) return null;
  const baseLoc = group[0]; // Lấy tọa độ X, Y từ phần tử đầu tiên
  const [x, , z] = mapCoordinates(baseLoc.coord_x, baseLoc.coord_y, 0);
  
  // Chiều cao kệ dựa trên số tầng lớn nhất
  const maxLevel = Math.max(...group.map(l => l.level_z));
  const rackHeight = maxLevel; // 1 level = 1m cao
  
  const getColor = (zone: string) => {
    switch(zone.toUpperCase()) {
      case 'A': return '#3b82f6';
      case 'B': return '#ef4444';
      case 'C': return '#f59e0b';
      case 'D': return '#10b981';
      default: return '#8b5cf6';
    }
  };

  const color = getColor(baseLoc.zone);

  return (
    <group position={[x, 0, z]}>
      {/* 4 Cột trụ (Pillars) */}
      <mesh position={[-0.9, rackHeight/2, -0.4]}>
        <boxGeometry args={[0.1, rackHeight, 0.1]} />
        <meshStandardMaterial color="#475569" transparent={!!(focusedLocationCodes && focusedLocationCodes.length > 0)} opacity={(focusedLocationCodes && focusedLocationCodes.length > 0) ? 0.2 : 1} />
      </mesh>
      <mesh position={[0.9, rackHeight/2, -0.4]}>
        <boxGeometry args={[0.1, rackHeight, 0.1]} />
        <meshStandardMaterial color="#475569" transparent={!!(focusedLocationCodes && focusedLocationCodes.length > 0)} opacity={(focusedLocationCodes && focusedLocationCodes.length > 0) ? 0.2 : 1} />
      </mesh>
      <mesh position={[-0.9, rackHeight/2, 0.4]}>
        <boxGeometry args={[0.1, rackHeight, 0.1]} />
        <meshStandardMaterial color="#475569" transparent={!!(focusedLocationCodes && focusedLocationCodes.length > 0)} opacity={(focusedLocationCodes && focusedLocationCodes.length > 0) ? 0.2 : 1} />
      </mesh>
      <mesh position={[0.9, rackHeight/2, 0.4]}>
        <boxGeometry args={[0.1, rackHeight, 0.1]} />
        <meshStandardMaterial color="#475569" transparent={!!(focusedLocationCodes && focusedLocationCodes.length > 0)} opacity={(focusedLocationCodes && focusedLocationCodes.length > 0) ? 0.2 : 1} />
      </mesh>

      {/* Các mặt mâm (Shelves) tương ứng với từng tầng (level_z) */}
      {Object.entries(
        group.reduce((acc, loc) => {
          if (!acc[loc.level_z]) acc[loc.level_z] = [];
          acc[loc.level_z].push(loc);
          return acc;
        }, {} as Record<number, LocationItem[]>)
      ).map(([levelStr, slots]) => {
        const zLevel = Number(levelStr);
        const shelfY = zLevel - 0.5; // Tâm của mâm nằm ở giữa mỗi tầng
        return (
          <group key={`shelf_${zLevel}`} position={[0, shelfY, 0]}>
            {/* Mâm kệ chung cho tầng này */}
            <mesh>
              <boxGeometry args={[1.9, 0.05, 0.9]} />
              <meshStandardMaterial color={color} transparent={!!(focusedLocationCodes && focusedLocationCodes.length > 0)} opacity={(focusedLocationCodes && focusedLocationCodes.length > 0) ? 0.2 : 1} />
            </mesh>
            
            {/* Render các Pallet/Khe cắm trên mâm này (tối đa 2 slot A, B) */}
            {slots.map(loc => {
              // Xác định vị trí dựa trên đuôi mã (A = Trái, B = Phải)
              const isSlotA = loc.location_code.endsWith('-A');
              const offsetX = isSlotA ? -0.45 : 0.45;

              return (
                <group 
                  key={loc.location_id} 
                  position={[offsetX, 0, 0]} 
                  onClick={(e) => {
                    e.stopPropagation();
                    // Tính toán tọa độ thế giới (World coordinates) để gắn Popup
                    onSelectSlot(loc, [x + offsetX, shelfY + 0.5, z]);
                  }}
                  onPointerOver={(e) => {
                    e.stopPropagation();
                    document.body.style.cursor = 'pointer';
                  }}
                  onPointerOut={(e) => {
                    document.body.style.cursor = 'auto';
                  }}
                >
                  {/* Hộp hàng giả lập (Pallet) với màu sắc và tên Sản phẩm */}
                  {showInventory && loc.current_weight_kg > 0 && loc.product && (
                    <group position={[0, 0.25, 0]}>
                      {focusedLocationCodes?.includes(loc.location_code) && (
                        <>
                          <pointLight color={loc.product.color} intensity={10} distance={8} decay={1.5} />
                          {/* Hào quang sáng bao quanh cell chứa pallet */}
                          <mesh position={[0, 0, 0]}>
                            <boxGeometry args={[0.9, 0.8, 0.8]} />
                            <meshStandardMaterial 
                              color={loc.product.color} 
                              emissive={loc.product.color} 
                              emissiveIntensity={2} 
                              transparent 
                              opacity={0.35} 
                              side={THREE.DoubleSide}
                            />
                          </mesh>
                        </>
                      )}
                      <mesh>
                        <boxGeometry args={[0.8, 0.4, 0.6]} />
                        <meshStandardMaterial 
                          color={focusedLocationCodes?.includes(loc.location_code) ? '#ffffff' : ((focusedLocationCodes && focusedLocationCodes.length > 0) ? '#1e293b' : loc.product.color)}
                          emissive={focusedLocationCodes?.includes(loc.location_code) ? '#ffffff' : '#000000'}
                          emissiveIntensity={focusedLocationCodes?.includes(loc.location_code) ? 0.8 : 0}
                          transparent={!!(focusedLocationCodes && focusedLocationCodes.length > 0) && !focusedLocationCodes?.includes(loc.location_code)}
                          opacity={(focusedLocationCodes && focusedLocationCodes.length > 0) && !focusedLocationCodes?.includes(loc.location_code) ? 0.2 : 1}
                        />
                      </mesh>
                      
                      {/* Tên sản phẩm in trên nóc thùng hàng */}
                      <Text
                        position={[0, 0.21, 0]}
                        rotation={[-Math.PI / 2, 0, 0]}
                        fontSize={0.12}
                        color="white"
                        fontWeight="bold"
                        anchorX="center"
                        anchorY="middle"
                      >
                        {loc.product.shortName}
                      </Text>
                    </group>
                  )}

                  {/* Nhãn mã vị trí */}
                  <Text
                    position={[0, 0.1, 0.46]}
                    fontSize={0.08}
                    color="white"
                    anchorX="center"
                    anchorY="middle"
                  >
                    {loc.location_code}
                  </Text>
                </group>
              );
            })}
          </group>
        );
      })}
    </group>
  );
};

const WarehouseMap3D: React.FC<WarehouseMap3DProps> = ({ locations, showInventory = true, focusedLocationCode, focusedLocationCodes: customFocusedCodes }) => {
  const [selectedLoc, setSelectedLoc] = React.useState<{ loc: LocationItem, pos: [number, number, number] } | null>(null);

  const handleSelectSlot = (loc: LocationItem, pos: [number, number, number]) => {
    setSelectedLoc({ loc, pos });
  };

  const focusedLocationCodes = customFocusedCodes || (focusedLocationCode ? [focusedLocationCode] : []);

  let focusedPos: [number, number, number] | null = null;
  let pathPoints: [number, number, number][] = [];

  const DOCK_INS = [[-15, 0.05, 9]] as [number, number, number][];
  const DOCK_OUTS = [[15, 0.05, 9]] as [number, number, number][];
  
  const closestDockIn = DOCK_INS[0];
  const closestDockOut = DOCK_OUTS[0];

  if (focusedLocationCodes.length === 1) {
    const focusedLoc = locations.find(l => l.location_code === focusedLocationCodes[0]);
    if (focusedLoc) {
      const isSlotA = focusedLoc.location_code.endsWith('-A');
      const offsetX = isSlotA ? -0.45 : 0.45;
      const [x, , z] = mapCoordinates(focusedLoc.coord_x, focusedLoc.coord_y, 0);
      const shelfY = focusedLoc.level_z - 0.5;
      focusedPos = [x + offsetX, shelfY + 0.25, z];

      // --- Tính toán đường đi ngắn nhất (Shortest Path) ---
      const palletFloorPos = [x + offsetX * 1.5, 0.02, z] as [number, number, number];
      
      // Tạo path chữ U/L qua trục Z=9
      pathPoints = [
        closestDockIn,
        [palletFloorPos[0], 0.02, closestDockIn[2]],
        palletFloorPos,
        [palletFloorPos[0], 0.02, closestDockOut[2]],
        closestDockOut
      ];
    }
  } else if (focusedLocationCodes.length > 1) {
    // Wave Picking Path cho nhiều Pallet
    const targets = focusedLocationCodes
      .map(code => locations.find(l => l.location_code === code))
      .filter((l): l is LocationItem => !!l)
      .sort((a, b) => {
        // Sắp xếp theo X tăng dần (từ Dock In sang Dock Out), sau đó Z
        if (a.coord_x !== b.coord_x) return a.coord_x - b.coord_x;
        return a.coord_y - b.coord_y;
      });

    if (targets.length > 0) {
      pathPoints.push(closestDockIn);
      
      let lastX: number | null = null;
      
      targets.forEach(loc => {
        const isSlotA = loc.location_code.endsWith('-A');
        const offsetX = isSlotA ? -0.45 : 0.45;
        const [x, , z] = mapCoordinates(loc.coord_x, loc.coord_y, 0);
        const palletFloorPos = [x + offsetX * 1.5, 0.02, z] as [number, number, number];

        // Rẽ vào hẻm mới từ hành lang chính
        if (lastX !== null && lastX !== x) {
          pathPoints.push([lastX + offsetX * 1.5, 0.02, closestDockIn[2]]);
        }
        
        pathPoints.push([palletFloorPos[0], 0.02, closestDockIn[2]]);
        pathPoints.push(palletFloorPos);
        pathPoints.push([palletFloorPos[0], 0.02, closestDockIn[2]]);
        
        lastX = x;
      });
      
      pathPoints.push(closestDockOut);

      // Focus camera bao quát ở giữa bản đồ khi gom đơn
      focusedPos = [0, 15, 15];
    }
  }

  return (
    <div id="warehouse-map-container" style={{ width: '100%', height: '500px', backgroundColor: focusedLocationCodes.length > 0 ? '#020617' : '#e2e8f0', borderRadius: '8px', overflow: 'hidden', position: 'relative', transition: 'background-color 0.5s' }}>
      <Canvas camera={{ position: [0, 15, 25], fov: 60 }} onPointerMissed={() => setSelectedLoc(null)}>
        <CameraController focusedPos={focusedPos} />
        {/* Ánh sáng */}
        <ambientLight intensity={focusedLocationCodes.length > 0 ? 0.05 : 0.5} />
        <directionalLight position={[10, 20, 10]} intensity={focusedLocationCodes.length > 0 ? 0.1 : 1} castShadow />
        
        {/* Lưới sàn kho (50x20) */}
        <Grid
          args={[50, 20]} // Kích thước lưới
          cellSize={1} // Mỗi ô là 1m
          cellThickness={1}
          cellColor={focusedLocationCodes.length > 0 ? "#1e293b" : "#94a3b8"}
          sectionSize={5}
          sectionThickness={1.5}
          sectionColor={focusedLocationCodes.length > 0 ? "#0f172a" : "#64748b"}
          position={[0, 0, 0]}
        />
        
        {/* Mặt phẳng đỡ (Tùy chọn) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <planeGeometry args={[50, 20]} />
          <meshStandardMaterial color={focusedLocationCodes.length > 0 ? "#020617" : "#f1f5f9"} />
        </mesh>

        {/* Vẽ Đường Chỉ Dẫn Dưới Sàn (Shortest Path) */}
        {pathPoints.length > 0 && (
          <Line 
            points={pathPoints} 
            color="#ffffff" 
            lineWidth={3} 
            dashed={true}
            dashScale={5}
            dashSize={1}
            dashOffset={0}
          />
        )}

        {/* --- DỰNG TƯỜNG (WALLS) --- */}
        {/* Tường Sau (Back Wall) */}
        <mesh position={[0, 3, -10.5]}>
          <boxGeometry args={[51, 6, 0.5]} />
          <meshStandardMaterial color="#cbd5e1" transparent opacity={0.6} />
        </mesh>
        {/* Tường Trái (Left Wall) */}
        <mesh position={[-25.5, 3, 0]}>
          <boxGeometry args={[0.5, 6, 20]} />
          <meshStandardMaterial color="#cbd5e1" transparent opacity={0.6} />
        </mesh>
        {/* Tường Phải (Right Wall) */}
        <mesh position={[25.5, 3, 0]}>
          <boxGeometry args={[0.5, 6, 20]} />
          <meshStandardMaterial color="#cbd5e1" transparent opacity={0.6} />
        </mesh>

        {/* --- DOCK IN & DOCK OUT (U-Shape Flow) --- */}
        {/* Khu vực DOCK IN (Cửa Nhập) ở phía trước bên trái */}
        <group position={[-15, 0.05, 9]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[8, 3]} />
            <meshStandardMaterial color="#22c55e" />
          </mesh>
          <Text position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={1.5} color="white" fontWeight="bold">
            DOCK IN
          </Text>
        </group>

        {/* Khu vực DOCK OUT (Cửa Xuất) ở phía trước bên phải */}
        <group position={[15, 0.05, 9]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[8, 3]} />
            <meshStandardMaterial color="#f97316" />
          </mesh>
          <Text position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={1.5} color="white" fontWeight="bold">
            DOCK OUT
          </Text>
        </group>

        {/* Group và render các kệ hàng vật lý */}
        {groupLocations(locations).map((group, index) => (
          <PhysicalRack key={index} group={group} onSelectSlot={handleSelectSlot} showInventory={showInventory} focusedLocationCodes={focusedLocationCodes} />
        ))}

        {/* Gắn Popup (Html) vào vị trí của khe kệ được click */}
        {selectedLoc && (
          <Html position={selectedLoc.pos} center zIndexRange={[100, 0]}>
            <div style={{ 
              backgroundColor: 'rgba(15, 23, 42, 0.95)', 
              color: 'white', 
              padding: '15px', 
              borderRadius: '8px', 
              boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
              width: '250px',
              fontFamily: 'sans-serif',
              pointerEvents: 'none'
            }}>
              <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #475569', paddingBottom: '5px', color: '#38bdf8' }}>
                📍 {selectedLoc.loc.location_code}
              </h4>
              <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                <p style={{ margin: 0 }}><strong>Trạng thái:</strong> {selectedLoc.loc.status}</p>
                <p style={{ margin: 0 }}><strong>Tải trọng:</strong> {selectedLoc.loc.current_weight_kg} / {selectedLoc.loc.max_weight_kg} kg</p>
                
                {showInventory && (
                  selectedLoc.loc.current_weight_kg > 0 && selectedLoc.loc.product ? (
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #475569' }}>
                      <p style={{ margin: 0 }}>📦 <strong>Sản phẩm:</strong> {selectedLoc.loc.product.name}</p>
                      <p style={{ margin: 0 }}>🏷️ <strong>Mã LPN:</strong> <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{selectedLoc.loc.lpn_code || 'LPN-MOCK-1234'}</span></p>
                      {selectedLoc.loc.lpns && selectedLoc.loc.lpns.length > 0 && selectedLoc.loc.lpns.find((l: any) => l.lpn_code === selectedLoc.loc.lpn_code) && (
                        <>
                          <p style={{ margin: 0 }}>🔢 <strong>Số lượng:</strong> {selectedLoc.loc.lpns.find((l: any) => l.lpn_code === selectedLoc.loc.lpn_code).items[0]?.qty || 0} Đơn vị</p>
                          <p style={{ margin: 0 }}>📅 <strong>Ngày nhập:</strong> {selectedLoc.loc.lpns.find((l: any) => l.lpn_code === selectedLoc.loc.lpn_code).inbound_receipt?.created_at ? new Date(selectedLoc.loc.lpns.find((l: any) => l.lpn_code === selectedLoc.loc.lpn_code).inbound_receipt.created_at).toLocaleString('vi-VN') : 'N/A'}</p>
                        </>
                      )}
                      <p style={{ margin: 0 }}>⭐ <strong>Phân hạng:</strong> {getProductRank(selectedLoc.loc.product.name)}</p>
                    </div>
                  ) : (
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #475569' }}>
                      <p style={{ margin: 0, color: '#94a3b8', fontStyle: 'italic' }}>Kệ trống, chưa có hàng.</p>
                    </div>
                  )
                )}
              </div>
            </div>
          </Html>
        )}

        {/* Trục tọa độ (Đỏ=X, Xanh Lá=Y, Xanh Dương=Z) */}
        <axesHelper args={[5]} />
        
        {/* Controls dạng bản đồ: Chuột trái kéo rê (Pan), Chuột phải xoay */}
        <MapControls 
          makeDefault 
          maxDistance={45} // Không cho zoom out quá xa
          minDistance={2}  // Không cho zoom in quá gần
          maxPolarAngle={Math.PI / 2 - 0.05} // Giới hạn góc nhìn mặt đất
        />
      </Canvas>
    </div>
  );
};

export default WarehouseMap3D;
