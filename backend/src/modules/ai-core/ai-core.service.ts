import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AiCoreService {
  private API_URL = 'https://aetman-wms.hf.space/v1/chat/completions';
  private MODEL_NAME = 'qwen';

  constructor() {}

  private async askAi(prompt: string): Promise<string> {
    try {
      const response = await axios.post(this.API_URL, {
        model: this.MODEL_NAME,
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0,
        max_tokens: 250 // Thay thế num_predict của Ollama
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('Error calling AI API (Hugging Face):', error);
      return 'AI is currently offline or unreachable.';
    }
  }

  public async buildDynamicContext(): Promise<string> {
    const contextParts: string[] = [];
    const now = new Date();
    const hour = now.getHours();

    // 1. Cảm biến Thời gian & SLA (Shift & SLA Sensor)
    if (hour >= 16 && hour <= 18) {
      contextParts.push(`Thời gian: ${hour}:00 - Đang là cuối ca làm, sắp đến giờ chốt xe tải (Cut-off Time). Áp lực xuất/nhập rất cao.`);
    } else if (hour >= 11 && hour <= 13) {
      contextParts.push(`Thời gian: ${hour}:00 - Giờ nghỉ trưa. Ưu tiên xử lý nhanh gọn.`);
    } else {
      contextParts.push(`Thời gian: ${hour}:00 - Đang trong ca làm việc bình thường.`);
    }

    // 2. Cảm biến Tải công việc & Nhân sự (Workload Sensor)
    const pendingTasksCount = await prisma.workTask.count({
      where: { status: 'TODO' }
    });
    // Giả định có 5 xe nâng
    const availableForklifts = 5; 
    const workloadRatio = pendingTasksCount / availableForklifts;
    
    if (workloadRatio > 5) {
      contextParts.push(`Workload: Quá tải! Có ${pendingTasksCount} task đang chờ xử lý mà chỉ có ${availableForklifts} xe nâng. Hệ thống đang bị kẹt xe (Congestion).`);
    } else if (workloadRatio > 2) {
      contextParts.push(`Workload: Khá đông, có ${pendingTasksCount} task đang chờ.`);
    } else {
      contextParts.push(`Workload: Rảnh rỗi, chỉ có ${pendingTasksCount} task đang chờ.`);
    }

    // 3. Cảm biến Dung lượng Kho (Space Sensor)
    const totalLocations = await prisma.location.count({ where: { status: 'ACTIVE' } });
    const fullLocations = await prisma.location.count({ where: { status: 'ACTIVE', is_full: true } });
    const capacityRatio = totalLocations > 0 ? (fullLocations / totalLocations) * 100 : 0;

    if (capacityRatio > 85) {
      contextParts.push(`Space: CẢNH BÁO - Kho đã lấp đầy ${capacityRatio.toFixed(1)}%. Bắt buộc phải tìm các khe hẹp để nhét hàng, tối ưu thể tích (Tetris rule).`);
    } else if (capacityRatio < 30) {
      contextParts.push(`Space: Rộng rãi, sức chứa mới dùng ${capacityRatio.toFixed(1)}%. Có thể để hàng thoải mái, ưu tiên tiện đường đi.`);
    }

    // 4. Các Cảm biến nâng cao (Mô phỏng/Mock)
    // Thực tế sẽ check API dự báo thời tiết hoặc Battery BMS của xe nâng
    contextParts.push(`Equipment: Pin của các xe nâng còn tốt (>60%).`);
    contextParts.push(`Environment: Nhiệt độ kho lạnh ổn định (-18°C). Trời quang mây tạnh.`);

    return contextParts.join(' ');
  }

  public async evaluateLayout(x: number, y: number): Promise<string> {
    const prompt = `Bạn là chuyên gia kho bãi. Kệ ở X=${x}, Y=${y}. DOCK ở Y=18,19,20. Đánh giá nhanh có hợp lý không?`;
    return this.askAi(prompt);
  }

  public async simulateMCDM(productId: number, weightKg: number, context: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });
    if (!product) throw new Error('Product not found');

    // 1. AI Phân tích Ngữ cảnh & Đưa ra Trọng số (Áp dụng Few-Shot Prompting để tăng độ thông minh)
    const prompt = `Bạn là Chuyên gia WMS AI. Phân tích Ngữ cảnh và Sản phẩm, chấm điểm tỷ trọng (0-100) cho 7 tiêu chí: W_WEIGHT (An toàn Tải trọng), W_SPEED (Tốc độ), W_ZONE (Gom nhóm/Tránh sự cố), W_TRAFFIC (Tránh kẹt xe), W_SPACE (Tối ưu không gian), W_DATE (Cận Date/FIFO), W_HAZMAT (Cách ly Hóa chất).

VÍ DỤ 1:
Ngữ cảnh: "Hàng phụ kiện điện thoại nhỏ lẻ, tận dụng nhét vào các khe kệ nhỏ để tiết kiệm không gian." / Nặng: 15kg
{"W_WEIGHT":0,"W_SPEED":0,"W_ZONE":0,"W_TRAFFIC":0,"W_SPACE":100,"W_DATE":0,"W_HAZMAT":0,"ai_reason":"Hàng siêu nhẹ và nhỏ lẻ, ưu tiên nhét vào khe hẹp tiết kiệm diện tích."}

VÍ DỤ 2:
Ngữ cảnh: "Hàng vừa xuống xe tải, chuyển ngay sang xe khác đang chờ ở DOCK OUT" / Nặng: 500kg
{"W_WEIGHT":0,"W_SPEED":100,"W_ZONE":0,"W_TRAFFIC":0,"W_SPACE":0,"W_DATE":0,"W_HAZMAT":0,"ai_reason":"Cross-docking khẩn cấp, tối đa hóa tốc độ xuất."}

VÍ DỤ 3:
Ngữ cảnh: "Đang nhập 10 pallet Nước ngọt chung 1 lô, cần xếp ở gần nhau." / Nặng: 500kg
{"W_WEIGHT":10,"W_SPEED":0,"W_ZONE":90,"W_TRAFFIC":0,"W_SPACE":0,"W_DATE":0,"W_HAZMAT":0,"ai_reason":"Gom nhóm lô hàng cùng loại vào một khu (Zone) để quản lý."}

NGỮ CẢNH HIỆN TẠI:
Ngữ cảnh: "${context}"
Sản phẩm: "${product.name}" (Nặng: ${weightKg}kg).
Lưu ý: Nặng > 1500kg là Siêu Nặng. Nhỏ/Nhẹ/Thể tích là W_SPACE. Gấp/Cross-docking là W_SPEED. Lô/Nhóm là W_ZONE. Độc hại/Cháy là W_HAZMAT.

Trả về CHỈ JSON, KHÔNG TEXT DƯ THỪA:
{ "W_WEIGHT":0, "W_SPEED":0, "W_ZONE":0, "W_TRAFFIC":0, "W_SPACE":0, "W_DATE":0, "W_HAZMAT":0, "ai_reason":"..." }`;

    let weights = {
      W_WEIGHT: 14, W_SPEED: 14, W_ZONE: 14, W_TRAFFIC: 14,
      W_SPACE: 14, W_DATE: 14, W_HAZMAT: 14
    };
    let aiReason = 'Dựa trên Thuật toán Đa tiêu chí MCDM cơ sở: Cân bằng tải trọng, Tối ưu khoảng cách di chuyển và Đảm bảo an toàn phân khu.';

    try {
      const rawResponse = await this.askAi(prompt);
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        let sanitizedJson = jsonMatch[0].replace(/\/\/.*$/gm, '').replace(/,(?=\s*[}\]])/g, '');
        const parsed = JSON.parse(sanitizedJson);
        weights = {
          W_WEIGHT: parsed.W_WEIGHT || 0,
          W_SPEED: parsed.W_SPEED || 0,
          W_ZONE: parsed.W_ZONE || 0,
          W_TRAFFIC: parsed.W_TRAFFIC || 0,
          W_SPACE: parsed.W_SPACE || 0,
          W_DATE: parsed.W_DATE || 0,
          W_HAZMAT: parsed.W_HAZMAT || 0
        };
        aiReason = parsed.ai_reason || 'Đã áp dụng các trọng số linh hoạt để tối ưu diện tích lưu trữ và tốc độ lấy hàng (Fallback).';
      }
    } catch (e) {
      console.error('LLM parsing failed for Weights, using default.', e);
    }

    // Rule-based Fallback: Bắt từ khóa để lấp lỗ hổng của AI 3B
    const ctxLower = context.toLowerCase();
    
    if (ctxLower.includes('kẹt xe') || ctxLower.includes('tắc nghẽn') || ctxLower.includes('đông người')) {
      weights.W_TRAFFIC = Math.max(weights.W_TRAFFIC, 60);
      weights.W_ZONE = Math.max(weights.W_ZONE, 20);
      if (!aiReason.includes('(Rule)')) aiReason += ' (Rule: Tránh kẹt xe).';
    }
    if (ctxLower.includes('nhanh') || ctxLower.includes('gấp') || ctxLower.includes('tốc độ') || ctxLower.includes('trưa') || ctxLower.includes('cross-docking') || ctxLower.includes('chạy kpi')) {
      weights.W_SPEED = Math.max(weights.W_SPEED, 60);
      if (!aiReason.includes('(Rule)')) aiReason += ' (Rule: Tối ưu tốc độ).';
    }
    if (ctxLower.includes('date') || ctxLower.includes('hết hạn') || ctxLower.includes('hạn sử dụng') || ctxLower.includes('tươi sống')) {
      weights.W_DATE = Math.max(weights.W_DATE, 60);
      if (!aiReason.includes('(Rule)')) aiReason += ' (Rule: Hàng cận Date).';
    }
    if (ctxLower.includes('nhỏ lẻ') || ctxLower.includes('tiết kiệm không gian') || ctxLower.includes('tối ưu thể tích') || ctxLower.includes('khe hẹp')) {
      weights.W_SPACE = Math.max(weights.W_SPACE, 60);
      if (!aiReason.includes('(Rule)')) aiReason += ' (Rule: Tối ưu Không Gian).';
    }
    if (ctxLower.includes('lô') || ctxLower.includes('gom nhóm') || ctxLower.includes('gần nhau')) {
      weights.W_ZONE = Math.max(weights.W_ZONE, 60);
      if (!aiReason.includes('(Rule)')) aiReason += ' (Rule: Gom nhóm Zone).';
    }
    if (weightKg > 1000 || ctxLower.includes('nặng') || ctxLower.includes('sập kệ')) {
      weights.W_WEIGHT = Math.max(weights.W_WEIGHT, 60);
      if (!aiReason.includes('(Rule)')) aiReason += ' (Rule: An toàn tải trọng).';
    }
    if (ctxLower.includes('hóa chất') || ctxLower.includes('cháy nổ') || ctxLower.includes('axit') || ctxLower.includes('độc hại')) {
      weights.W_HAZMAT = Math.max(weights.W_HAZMAT, 80);
      if (!aiReason.includes('(Rule)')) aiReason += ' (Rule: Cách ly Hóa Chất).';
    }

    // Chuẩn hóa lại tổng = 100%
    const totalW = Object.values(weights).reduce((a, b) => a + b, 0);
    if (totalW > 0) {
      for (const k in weights) {
        (weights as any)[k] = Math.round(((weights as any)[k] / totalW) * 100);
      }
    }

    // 2. Chạy thuật toán MCDM Chấm điểm Kệ
    // Tải toàn bộ kệ ACTIVE để tính tổng tải trọng cột đứng (Frame Weight)
    const allActiveLocs = await prisma.location.findMany({
      where: { status: 'ACTIVE' }
    });

    const MAX_FRAME_WEIGHT_KG = 8000; // Sức chịu tải tối đa của một cột đứng (8 tấn)
    const frameWeights: Record<string, number> = {};
    const validLocs = [];

    for (const loc of allActiveLocs) {
      const frameKey = `${loc.coord_x}_${loc.coord_y}`;
      frameWeights[frameKey] = (frameWeights[frameKey] || 0) + loc.current_weight_kg;
      if (!loc.is_full) validLocs.push(loc);
    }

    const finalValidLocs = validLocs.filter(loc => {
      const frameKey = `${loc.coord_x}_${loc.coord_y}`;
      const isCellValid = (loc.max_weight_kg - loc.current_weight_kg) >= weightKg;
      const isFrameValid = (frameWeights[frameKey] + weightKg) <= MAX_FRAME_WEIGHT_KG;
      return isCellValid && isFrameValid;
    });

    if (finalValidLocs.length === 0) throw new Error('Không còn vị trí trống nào đủ sức chịu tải (Thanh ngang hoặc Cột đứng) cho Pallet này!');

    const DOCK_X = 25; // Giả định Dock ở giữa ngang
    const DOCK_Y = 20; // Dock ở cuối nhà kho

    const scoredLocs = finalValidLocs.map(loc => {
      // W_SPEED (0-100): Càng gần DOCK càng tốt. Distance max ~ 50.
      const distance = Math.abs(loc.coord_x - DOCK_X) + Math.abs(loc.coord_y - DOCK_Y);
      const speedScore = Math.max(0, 100 - (distance * 2));

      // W_WEIGHT (0-100): Tầng trệt = 100, Tầng 4 = 25
      const weightScore = Math.max(0, 100 - (loc.level_z - 1) * 25);

      // W_HAZMAT: Trừ điểm cực mạnh nếu kệ ở Zone A (giả sử Zone A đang để Thực Phẩm) và SP là Hóa chất
      let hazmatScore = 100;
      const isChemical = product.name.toLowerCase().includes('javel') || product.name.toLowerCase().includes('hóa chất');
      if (isChemical && loc.zone === 'A') {
        hazmatScore = -9999; // Phạt chết
      }

      // Các tiêu chí khác: Giả lập ngẫu nhiên hoặc logic đơn giản cho Demo
      const zoneScore = loc.zone === 'B' ? 100 : 50; // Mock: Gom nhóm
      const trafficScore = Math.random() * 100; // Mock: Traffic
      const spaceScore = (loc.max_weight_kg < 1500) ? 100 : 30; // Mock: Ưu tiên nhét kệ nhỏ
      const dateScore = (loc.zone === 'C') ? 100 : 0; // Mock: Hàng Date mới -> nhét xa (Zone C)

      // Tổng điểm (SumProduct)
      const totalScore = 
        (speedScore * weights.W_SPEED / 100) +
        (weightScore * weights.W_WEIGHT / 100) +
        (zoneScore * weights.W_ZONE / 100) +
        (trafficScore * weights.W_TRAFFIC / 100) +
        (spaceScore * weights.W_SPACE / 100) +
        (dateScore * weights.W_DATE / 100) +
        (hazmatScore * weights.W_HAZMAT / 100);

      return {
        ...loc,
        scores: { speedScore, weightScore, hazmatScore, zoneScore, trafficScore, spaceScore, dateScore },
        totalScore
      };
    });

    // Sắp xếp Lấy Top 3
    scoredLocs.sort((a, b) => b.totalScore - a.totalScore);
    const topLocs = scoredLocs.slice(0, 3);

    return {
      product: product.name,
      context,
      ai_weights: weights,
      ai_reason: aiReason,
      top_locations: topLocs
    };
  }

  public generateOptimalLayout(params: {
    widthX: number;
    lengthY: number;
    aisleWidth: number;
    mainAisleX: number; // Tọa độ X của lối đi chính (cắt ngang kho)
    levels: number;
  }) {
    const { widthX, lengthY, aisleWidth, mainAisleX, levels } = params;
    const locations: any[] = [];
    let idCounter = 1;

    // Chừa khoảng trống (Perimeter Aisle & Staging Area)
    // - Cách tường sau: 2 unit
    // - Cách tường trước (Dock): 4 unit để xe nâng xoay trở
    // - Cách 2 bên hông: phải đủ rộng (ít nhất 4m hoặc rộng hơn đường giữa hẻm) để xe quay đầu vuông góc
    const rearClearance = 2;
    const frontClearance = 4;
    const sideClearance = Math.max(4, aisleWidth + 1); 

    // Xác định các hàng Y (Back-to-back)
    // Ví dụ: Kệ ở Y=3, Y=4. Lối đi Y=5, Y=6. Kệ Y=7, Y=8...
    const rackRowsY: number[] = [];
    let currentY = 1 + rearClearance;
    while (currentY <= lengthY - frontClearance) {
      rackRowsY.push(currentY); // Kệ 1
      if (currentY + 1 <= lengthY - frontClearance) rackRowsY.push(currentY + 1); // Kệ 2 (Back to back)
      currentY += 2 + aisleWidth; // Cách 1 khoảng lối đi
    }

    // Các cột X (trừ khoảng cách tường 2 bên)
    const rackColsX: number[] = [];
    for (let x = 1 + sideClearance; x <= widthX - sideClearance; x++) {
      // Có thể để các kệ liền sát nhau theo trục X (1 block dài)
      // Chỉ đặt kệ ở các tọa độ X chẵn (giả sử mỗi kệ rộng 2 unit)
      if (x % 2 !== 0) rackColsX.push(x);
    }

    // Dock mặc định ở Y = lengthY (Cuối kho)
    const DOCK_Y = lengthY;
    const DOCK_X = mainAisleX;

    for (const x of rackColsX) {
      for (const y of rackRowsY) {
        // Khoảng cách Manhattan tới DOCK
        const distance = Math.abs(x - DOCK_X) + Math.abs(y - DOCK_Y);
        // Chia Zone A, B, C dựa trên khoảng cách
        let zone = 'C';
        if (distance < (widthX + lengthY) * 0.3) zone = 'A';
        else if (distance < (widthX + lengthY) * 0.6) zone = 'B';

        for (let z = 1; z <= levels; z++) {
          const slots = ['A', 'B'];
          for (const slot of slots) {
            const locCode = `${zone}-${x.toString().padStart(2, '0')}-${y.toString().padStart(2, '0')}-L${z}-${slot}`;
            
            locations.push({
              location_id: `mock_new_${idCounter++}`, // Fake ID for preview
              location_code: locCode,
              zone,
              coord_x: x,
              coord_y: y,
              level_z: z,
              max_weight_kg: 1000, // Default tải trọng
              current_weight_kg: 0,
              is_full: false,
              status: 'PREVIEW'
            });
          }
        }
      }
    }

    return locations;
  }

  public async applyLayout(locations: any[]) {
    // Bước 1: Xóa TOÀN BỘ các lệnh công việc cũ (tránh lỗi Foreign Key constraint trên bảng WorkTask)
    await prisma.workTask.deleteMany();

    // Bước 2: Tìm hoặc tạo khu vực ảo REFACTOR_BUFFER
    let bufferLoc = await prisma.location.findUnique({ where: { location_code: 'REFACTOR_BUFFER' } });
    if (!bufferLoc) {
      bufferLoc = await prisma.location.create({
        data: {
          location_code: 'REFACTOR_BUFFER',
          zone: 'BUFFER',
          coord_x: 0, coord_y: 0, level_z: 0,
          max_weight_kg: 9999999,
          status: 'ACTIVE'
        }
      });
    }

    // Bước 3: Di dời toàn bộ LPN đang trên kệ vào REFACTOR_BUFFER
    await prisma.lpn.updateMany({
      where: { location_id: { not: null } },
      data: { location_id: bufferLoc.id }
    });

    // Bước 4: Xóa cứng toàn bộ các kệ cũ (TRỪ REFACTOR_BUFFER)
    await prisma.location.deleteMany({
      where: { location_code: { not: 'REFACTOR_BUFFER' } }
    });

    // Bước 5: Chuẩn bị data (Bỏ location_id giả đi để DB tự gen ID thật)
    const insertData = locations.map(loc => ({
      location_code: loc.location_code,
      zone: loc.zone,
      coord_x: loc.coord_x,
      coord_y: loc.coord_y,
      level_z: loc.level_z,
      max_weight_kg: loc.max_weight_kg,
      current_weight_kg: 0,
      is_full: false,
      status: 'ACTIVE'
    }));

    // Bước 6: Insert cục lượng lớn
    const chunkSize = 500;
    for (let i = 0; i < insertData.length; i += chunkSize) {
      const chunk = insertData.slice(i, i + chunkSize);
      await prisma.location.createMany({
        data: chunk
      });
    }

    // Bước 7: Tự động chạy thuật toán Tái phân bổ hàng hóa (AI Relocation) ngay lập tức
    let relocationResult = null;
    try {
      relocationResult = await this.relocateBufferInventory();
    } catch (e) {
      console.error('Tự động relocation gặp lỗi (có thể do không có hàng):', e);
    }

    return { success: true, count: insertData.length, relocation: relocationResult };
  }

  // ==========================================
  // HYBRID AI: REFACTORING & RELOCATION
  // ==========================================

  // 1. Thuật toán: ABC Slotting (Tối ưu Tốc độ xuất)
  private algoABCSlotting(lpns: any[], locations: any[]): any[] {
    const tasks: any[] = [];
    const availableLocs = [...locations];

    for (const lpn of lpns) {
      // Phân loại Rank
      const isFastMoving = lpn.items.some((item: any) => ['Mì Hảo Hảo', 'Sữa TH True Milk', 'Nước khoáng Lavie'].includes(item.product.name));
      
      // Sắp xếp Kệ theo Manhattan Distance
      availableLocs.sort((a, b) => {
        const distA = Math.abs(a.coord_x - 25) + Math.abs(a.coord_y - 20); // DOCK giả định ở (25, 20)
        const distB = Math.abs(b.coord_x - 25) + Math.abs(b.coord_y - 20);
        return distA - distB;
      });

      // Lấy kệ gần nhất nếu Rank A, kệ xa nhất nếu Rank C
      const chosenLocIndex = isFastMoving ? 0 : availableLocs.length - 1;
      const chosenLoc = availableLocs[chosenLocIndex];

      if (chosenLoc) {
        tasks.push({ lpn, location: chosenLoc, reason: isFastMoving ? 'Rank A -> Gần cửa xuất' : 'Rank C -> Đẩy ra xa' });
        availableLocs.splice(chosenLocIndex, 1);
      }
    }
    return tasks;
  }

  // 2. Thuật toán: Consolidation (Tiết kiệm Không gian)
  private algoConsolidation(lpns: any[], locations: any[]): any[] {
    const tasks: any[] = [];
    const availableLocs = [...locations];
    // Ưu tiên kệ Zone C (trong góc) để chừa Zone A cho tương lai
    availableLocs.sort((a, b) => {
      if (a.zone === 'C' && b.zone !== 'C') return -1;
      if (a.zone !== 'C' && b.zone === 'C') return 1;
      return 0;
    });

    for (const lpn of lpns) {
      const chosenLoc = availableLocs.shift();
      if (chosenLoc) {
        tasks.push({ lpn, location: chosenLoc, reason: 'Lấp đầy góc khuất (Zone C) để chừa mặt bằng Zone A' });
      }
    }
    return tasks;
  }

  // 3. Thuật toán: Load Balancing (Cân bằng lực)
  private algoLoadBalancing(lpns: any[], locations: any[]): any[] {
    const tasks: any[] = [];
    const availableLocs = [...locations];

    for (const lpn of lpns) {
      const totalWeight = lpn.items.reduce((sum: number, item: any) => sum + item.qty * (item.product.std_weight_kg || 1), 0);
      
      // Xếp theo Level (Tầng thấp cho đồ nặng)
      availableLocs.sort((a, b) => {
        if (totalWeight > 500) return a.level_z - b.level_z; // Nặng -> Ưu tiên tầng thấp (Level nhỏ)
        return b.level_z - a.level_z; // Nhẹ -> Ưu tiên tầng cao
      });

      const chosenLoc = availableLocs.shift();
      if (chosenLoc) {
        tasks.push({ lpn, location: chosenLoc, reason: totalWeight > 500 ? 'Hàng nặng -> Tầng trệt' : 'Hàng nhẹ -> Tầng cao' });
      }
    }
    return tasks;
  }

  // 4. Thuật toán: Spill-over (Vết dầu loang / Xả kho gấp)
  private algoSpillOver(lpns: any[], locations: any[]): any[] {
    const tasks: any[] = [];
    const availableLocs = [...locations];
    
    // Đơn giản là nhét vào vị trí trống đầu tiên tìm thấy
    for (const lpn of lpns) {
      const chosenLoc = availableLocs.shift();
      if (chosenLoc) {
        tasks.push({ lpn, location: chosenLoc, reason: 'Spill-over: Cất vào chỗ trống đầu tiên tìm thấy' });
      }
    }
    return tasks;
  }

  // Orchestrator: Thu thập dữ liệu, hỏi Qwen, bốc hàm
  public async relocateBufferInventory() {
    // 1. Lấy tất cả LPN trong BUFFER
    const bufferLoc = await prisma.location.findUnique({ where: { location_code: 'REFACTOR_BUFFER' } });
    if (!bufferLoc) throw new Error('Không tìm thấy REFACTOR_BUFFER. Bạn chưa Áp dụng sơ đồ?');

    const lpns = await prisma.lpn.findMany({
      where: { location_id: bufferLoc.id },
      include: { items: { include: { product: true } } }
    });

    if (lpns.length === 0) return { message: 'Không có hàng tồn kho nào cần dời.', count: 0 };

    // 2. Lấy Kệ trống
    const emptyLocations = await prisma.location.findMany({
      where: { status: 'ACTIVE', is_full: false, location_code: { not: 'REFACTOR_BUFFER' } }
    });

    if (emptyLocations.length < lpns.length) throw new Error(`Kho mới không đủ sức chứa! Cần ${lpns.length} kệ, nhưng chỉ có ${emptyLocations.length} kệ trống.`);

    // 3. Tính toán thông số gửi LLM
    const totalCapacity = await prisma.location.count({ where: { status: 'ACTIVE', location_code: { not: 'REFACTOR_BUFFER' } } });
    const occupancyRate = ((lpns.length / totalCapacity) * 100).toFixed(1);

    const prompt = `Bạn là một Tổng chỉ huy điều phối kho hàng (WMS Orchestrator).
Tình trạng kho hiện tại:
- Số lượng Pallet cần dời từ khu vực Buffer: ${lpns.length} Pallet.
- Tỷ lệ lấp đầy kho dự kiến sau khi dời: ${occupancyRate}%.

Bạn có 4 vũ khí (Thuật toán) trong tay. Hãy dựa vào tỷ lệ lấp đầy để ra quyết định chọn thuật toán:
1. ABC Slotting (Tối ưu Tốc độ): Dùng khi kho vắng (Tỷ lệ lấp đầy < 60%). Ưu tiên đẩy hàng Hot ra gần cửa để lấy cho nhanh.
2. Consolidation (Gom cụm Không gian): Dùng khi kho đang khá chật (Tỷ lệ lấp đầy từ 60% - 85%). Thuật toán này sẽ nhét hàng vào các góc sâu khuất để tiết kiệm mặt bằng phía ngoài cho các lô hàng tương lai.
3. Load Balancing (Cân bằng Tải trọng): Dùng khi kho chứa nhiều hàng nặng cần phân bổ đều lực xuống Tầng 1 để chống sập kệ.
4. Spill-over (Giải tỏa khẩn cấp): Dùng khi kho quá tải trầm trọng (Tỷ lệ lấp đầy > 85%). Thuật toán sẽ nhét hàng bừa vào bất kỳ lỗ trống nào gần nhất để dọn sàn khẩn cấp.

Nhiệm vụ của bạn: Hãy chọn 1 Thuật toán phù hợp nhất với tình trạng kho hiện tại (${occupancyRate}%).
Yêu cầu Output: CHỈ TRẢ VỀ CHÍNH XÁC MỘT ĐỐI TƯỢNG JSON (Không kèm text giải thích, không dùng markdown), định dạng:
{"algorithm_id": <1,2,3,4>, "reason": "<Viết lý do chi tiết tại sao bạn chọn thuật toán này dựa trên tỷ lệ lấp đầy>"}
`;

    let aiDecision = { algorithm_id: 1, reason: 'Kích hoạt Thuật toán cơ sở: Tối ưu khoảng cách di chuyển để đẩy nhanh tốc độ xuất nhập hàng.' };
    try {
      const rawResponse = await this.askAi(prompt);
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) aiDecision = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('LLM Orchestrator failed, using fallback.');
    }

    // 4. Bốc thuật toán tương ứng
    let tasksInfo: any[] = [];
    switch (Number(aiDecision.algorithm_id)) {
      case 1: tasksInfo = this.algoABCSlotting(lpns, emptyLocations); break;
      case 2: tasksInfo = this.algoConsolidation(lpns, emptyLocations); break;
      case 3: tasksInfo = this.algoLoadBalancing(lpns, emptyLocations); break;
      case 4: tasksInfo = this.algoSpillOver(lpns, emptyLocations); break;
      default: tasksInfo = this.algoABCSlotting(lpns, emptyLocations); break;
    }

    // 5. Cập nhật DB (Tạo WorkTask RESLOT)
    const workTasksData = tasksInfo.map(t => ({
      task_type: 'RESLOT',
      lpn_id: t.lpn.id,
      source_location_id: bufferLoc.id,
      dest_location_id: t.location.id,
      ai_reason: t.reason,
      status: 'TODO'
    }));

    // (Tuỳ chọn: Khóa luôn kệ đích thành is_full = true để người khác ko chiếm)
    const destLocIds = tasksInfo.map(t => t.location.id);
    await prisma.location.updateMany({
      where: { id: { in: destLocIds } },
      data: { is_full: true }
    });

    await prisma.workTask.createMany({ data: workTasksData });

    return {
      message: `Đã sinh ${tasksInfo.length} lệnh cất hàng.`,
      algorithm_id: aiDecision.algorithm_id,
      ai_reason: aiDecision.reason,
      count: tasksInfo.length
    };
  }

  // ==== TASK INTERLEAVING / GOD ORDER ====
  public async groupTasks() {
    // 1. Phân rã (Dissolve) các TaskGroup cũ đang ở trạng thái TODO (chưa có ai nhận)
    const pendingGroups = await prisma.taskGroup.findMany({
      where: { status: 'TODO', assigned_to: null }
    });

    if (pendingGroups.length > 0) {
      const groupIds = pendingGroups.map(g => g.id);
      // Gỡ liên kết trong WorkTask
      await prisma.workTask.updateMany({
        where: { task_group_id: { in: groupIds } },
        data: { task_group_id: null }
      });
      // Xóa Group
      await prisma.taskGroup.deleteMany({
        where: { id: { in: groupIds } }
      });
    }

    // 2. Lấy danh sách xe nâng khả dụng (Mặc định cho mỗi xe nâng gánh 2 pallet)
    // Ở bản nâng cao, ta có thể lấy xe nâng có max_weight lớn nhất. 
    // Hiện tại gộp 2 task làm 1 God Order.
    const MAX_TASKS_PER_GROUP = 2;

    // 3. Lấy tất cả WorkTask (PUTAWAY) đang TODO và chưa thuộc group nào
    const unassignedTasks = await prisma.workTask.findMany({
      where: { 
        status: 'TODO', 
        task_type: 'PUTAWAY',
        task_group_id: null 
      },
      include: {
        dest_location: true
      }
    });

    if (unassignedTasks.length === 0) return { message: 'Không có task nào cần gộp', groupsCreated: 0 };

    // Sắp xếp các task theo vị trí Z (cùng aisle) rồi đến X
    unassignedTasks.sort((a, b) => {
      if (a.dest_location.coord_y !== b.dest_location.coord_y) {
        return a.dest_location.coord_y - b.dest_location.coord_y;
      }
      return a.dest_location.coord_x - b.dest_location.coord_x;
    });

    let groupsCreated = 0;
    // Cứ 2 task gần nhau ném vào 1 group
    for (let i = 0; i < unassignedTasks.length; i += MAX_TASKS_PER_GROUP) {
      const chunk = unassignedTasks.slice(i, i + MAX_TASKS_PER_GROUP);
      
      const newGroup = await prisma.taskGroup.create({
        data: {
          group_code: `GOD-ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          task_type: 'PUTAWAY',
          status: 'TODO'
        }
      });

      await prisma.workTask.updateMany({
        where: { id: { in: chunk.map(t => t.id) } },
        data: { task_group_id: newGroup.id }
      });

      groupsCreated++;
    }

    return {
      message: `Đã gom thành công ${groupsCreated} nhóm đơn God Order.`,
      groupsCreated
    };
  }
}
