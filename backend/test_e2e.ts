import { PrismaClient } from '@prisma/client';
import { InboundService } from './src/modules/inbound/inbound.service';
import { OutboundService } from './src/modules/outbound/outbound.service';
import { AiCoreService } from './src/modules/ai-core/ai-core.service';

const prisma = new PrismaClient();

async function runE2E() {
  console.log("=== BẮT ĐẦU TEST E2E: NHẬP -> CẤT KỆ -> XUẤT ===");
  const inbound = InboundService.getInstance();
  const outbound = OutboundService.getInstance();

  try {
    // 1. Dọn dẹp dữ liệu cũ (Tùy chọn)
    await prisma.workTask.deleteMany({});
    await prisma.lpnItem.deleteMany({});
    await prisma.lpn.deleteMany({});
    await prisma.inboundReceiptLine.deleteMany({});
    await prisma.inboundReceipt.deleteMany({});
    await prisma.outboundLine.deleteMany({});
    await prisma.outboundOrder.deleteMany({});
    await prisma.location.updateMany({ data: { current_weight_kg: 0, is_full: false } });

    // Lấy 1 sản phẩm mẫu
    const product = await prisma.product.findFirst();
    if (!product) throw new Error("Database không có sản phẩm nào để test!");
    console.log(`[1] Đã chọn sản phẩm Test: ${product.name} (ID: ${product.id})`);

    // --- QUY TRÌNH INBOUND ---
    // 2. Tạo ASN
    const asn = await inbound.createReceipt([{ product_id: product.id, expected_qty: 100 }]);
    console.log(`[2] Tạo ASN thành công: ${asn.receipt_code}`);

    // 3. Palletize (Đóng gói)
    const lpns = await inbound.palletize(asn.receipt_code, {
      [product.id]: { qty: 100, weightPerPallet: 500 }
    });
    console.log(`[3] Palletize thành công: Sinh ra LPN ${lpns[0].lpn_code}`);

    // 4. Gọi AI tìm Kệ (Dù AI offline cũng sẽ dùng thuật toán fallback)
    console.log(`[4] Đang gọi thuật toán AI MCDM (Fallback Mode)...`);
    let destLocId = null;
    let aiReason = '';
    const aiService = new AiCoreService();
    const decision = await aiService.simulateMCDM(product.id, 500, "Bão sale");
    
    // Giả lập logic của Inbound Controller gọi hàm InboundService (không có sẵn ở InboundService)
    // Tạo WorkTask Putaway
    const loc = await prisma.location.findUnique({ where: { location_code: decision.top_locations[0].location_code } });
    if (!loc) throw new Error("Location do thuật toán trả về không tồn tại!");
    
    const realLpn = await prisma.lpn.findUnique({ where: { lpn_code: lpns[0].lpn_code } });
    if (!realLpn) throw new Error("Không tìm thấy LPN");

    const putawayTask = await prisma.workTask.create({
      data: {
        task_type: 'PUTAWAY',
        lpn_id: realLpn.id,
        dest_location_id: loc.id,
        ai_reason: decision.ai_reason,
        status: 'TODO'
      }
    });
    console.log(`    -> Thuật toán chọn Kệ: ${loc.location_code} (Lý do: ${decision.ai_reason})`);

    // 5. Quét Cất Kệ (Xác nhận tài xế đã bỏ hàng vào kệ)
    console.log(`[5] Tài xế xác nhận cất hàng vào kệ ${loc.location_code}...`);
    // Cập nhật thủ công vì confirmPutaway controller logic
    await prisma.lpn.update({
      where: { id: realLpn.id },
      data: { status: 'STORED', location_id: loc.id }
    });
    await prisma.location.update({
      where: { id: loc.id },
      data: { current_weight_kg: { increment: 500 } }
    });
    await prisma.workTask.update({ where: { id: putawayTask.id }, data: { status: 'COMPLETED' } });
    console.log(`    -> Cất kệ hoàn tất. Kệ ${loc.location_code} đã nhận thêm 500kg.`);

    // --- QUY TRÌNH OUTBOUND ---
    console.log(`\n--- BẮT ĐẦU XUẤT KHO ---`);
    // 6. Tạo đơn xuất
    const order = await outbound.createOrder([{ product_id: product.id, requested_qty: 100 }]);
    console.log(`[6] Tạo Đơn Xuất thành công: ${order.order_code}`);

    // 7. Sinh Picking Task (Nhặt hàng)
    const pickingTasks = await outbound.generatePickingTask(order.order_code);
    console.log(`[7] Phân bổ lấy hàng thành công (FIFO): Sinh ra ${pickingTasks.length} task.`);
    console.log(`    -> Task chỉ định ra kệ: ${pickingTasks[0].source_location_id} lấy LPN ${pickingTasks[0].lpn_id}`);

    // 8. Tài xế xác nhận Nhặt hàng
    console.log(`[8] Tài xế xác nhận đã lấy hàng...`);
    await outbound.confirmPick(pickingTasks[0].id);

    // KẾT THÚC KIỂM TRA
    const finalLoc = await prisma.location.findUnique({ where: { id: loc.id } });
    console.log(`[9] Kiểm tra tải trọng kệ ${finalLoc?.location_code} sau khi xuất: ${finalLoc?.current_weight_kg}kg`);
    
    if (finalLoc?.current_weight_kg === 0) {
      console.log(`✅ TEST E2E THÀNH CÔNG RỰC RỠ! Toàn bộ luồng Nhập -> Cất -> Nhặt -> Xuất hoàn hảo.`);
    } else {
      console.error(`❌ CÓ LỖI: Khối lượng kệ sau khi xuất không trở về 0!`);
    }

  } catch (error) {
    console.error("❌ E2E TEST THẤT BẠI:", error);
  } finally {
    await prisma.$disconnect();
  }
}

runE2E();
