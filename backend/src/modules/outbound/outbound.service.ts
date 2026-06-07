import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class OutboundService {
  private static instance: OutboundService;

  private constructor() {}

  public static getInstance(): OutboundService {
    if (!OutboundService.instance) {
      OutboundService.instance = new OutboundService();
    }
    return OutboundService.instance;
  }

  // B1: Khai báo Đơn Xuất
  public async createOrder(details: { product_id: number, requested_qty: number }[]) {
    if (!details || details.length === 0) {
      throw new Error('Chi tiết đơn xuất không được để trống');
    }
    for (const d of details) {
      if (d.requested_qty <= 0) {
        throw new Error('Số lượng yêu cầu phải lớn hơn 0');
      }
      const prod = await prisma.product.findUnique({ where: { id: d.product_id } });
      if (!prod) {
        throw new Error(`Sản phẩm ID ${d.product_id} không tồn tại`);
      }
    }
    const orderCode = 'OUT-' + Date.now();
    const order = await prisma.outboundOrder.create({
      data: {
        order_code: orderCode,
        status: 'PENDING',
        lines: {
          create: details.map(d => ({
            product_id: d.product_id,
            requested_qty: d.requested_qty
          }))
        }
      },
      include: {
        lines: {
          include: {
            product: true
          }
        }
      }
    });
    return order;
  }

  public async getOrders() {
    return await prisma.outboundOrder.findMany({
      include: { 
        lines: {
          include: {
            product: true
          }
        }
      }
    });
  }

  // B2: Tạo Nhiệm vụ Nhặt hàng (Picking Task) dựa trên FIFO
  public async generatePickingTask(orderCode: string, driverId?: number) {
    const order = await prisma.outboundOrder.findUnique({
      where: { order_code: orderCode },
      include: { lines: true }
    });
    
    if (!order) throw new Error('Order not found');
    if (order.status !== 'PENDING') throw new Error('Order is not in PENDING status');

    await prisma.outboundOrder.update({
      where: { id: order.id },
      data: { status: 'PICKING' }
    });

    // Tạo (hoặc lấy) vị trí DOCK_OUT làm điểm đến
    let dockOut = await prisma.location.findUnique({ where: { location_code: 'DOCK_OUT' } });
    if (!dockOut) {
      dockOut = await prisma.location.create({
        data: {
          location_code: 'DOCK_OUT',
          zone: 'OUTBOUND',
          coord_x: 0,
          coord_y: 0,
          level_z: 0,
          max_weight_kg: 99999,
          current_weight_kg: 0,
          is_full: false,
          status: 'ACTIVE'
        }
      });
    }

    const tasks = [];

    // Duyệt qua từng sản phẩm cần xuất
    for (const line of order.lines) {
      let remainingQty = line.requested_qty;

      // Tìm tất cả LPN (Pallet) chứa sản phẩm này đang nằm trên Kệ (STORED)
      // Sắp xếp theo id ASC để đảm bảo FIFO (Nhập trước xuất trước)
      const storedLpns = await prisma.lpn.findMany({
        where: {
          status: 'STORED',
          items: {
            some: { product_id: line.product_id }
          }
        },
        orderBy: { id: 'asc' },
        include: { items: true, location: true }
      });

      for (const lpn of storedLpns) {
        if (remainingQty <= 0) break;
        if (!lpn.location_id) continue;

        // Giả sử mỗi LPN chỉ chứa 1 dòng item (vì lúc Inbound ta tạo thế)
        const item = lpn.items.find(i => i.product_id === line.product_id);
        if (!item) continue;

        // Tạo WorkTask lấy Pallet này
        const task = await prisma.workTask.create({
          data: {
            task_type: 'PICKING',
            lpn_id: lpn.id,
            source_location_id: lpn.location_id,
            dest_location_id: dockOut.id,
            assigned_to: driverId || null,
            ai_reason: 'Nguyên tắc FIFO: Ưu tiên xuất Pallet cũ nhất trong kho.',
            status: 'TODO'
          }
        });
        tasks.push(task);
        
        remainingQty -= item.qty; // Trừ dần số lượng cần xuất (Đơn giản hóa: xuất nguyên Pallet)
      }

      if (remainingQty > 0) {
        console.warn(`Lưu ý: Không đủ hàng trong kho cho sản phẩm ID ${line.product_id}. Còn thiếu ${remainingQty}.`);
      }
    }

    return tasks;
  }

  // B3: Xác nhận Nhặt hàng (Cập nhật DB)
  public async confirmPick(taskId: number) {
    const task = await prisma.workTask.findUnique({
      where: { id: taskId },
      include: { lpn: { include: { items: true } }, source_location: true }
    });

    if (!task) throw new Error('Task not found');
    if (task.status === 'COMPLETED') throw new Error('Task already completed');
    if (task.task_type !== 'PICKING') throw new Error('Task is not PICKING');

    // Cập nhật trạng thái Task
    const updatedTask = await prisma.workTask.update({
      where: { id: taskId },
      data: { status: 'COMPLETED' }
    });

    // Cập nhật trạng thái LPN thành OUTBOUND
    await prisma.lpn.update({
      where: { id: task.lpn_id },
      data: { 
        status: 'OUTBOUND',
        location_id: null // Đã rời khỏi kệ
      }
    });

    // Giảm tải trọng của Kệ nguồn (Source Location)
    if (task.source_location_id && task.source_location) {
      // Tính tổng khối lượng của LPN này (cần join với ProductUom/Product để lấy khối lượng thực)
      // Để đơn giản và nhanh, ta query lại tổng khối lượng của Kệ dựa trên các LPN còn lại
      const remainingLpns = await prisma.lpn.findMany({
        where: { location_id: task.source_location_id, status: 'STORED' },
        include: { items: { include: { product: { include: { productUoms: true } } } } }
      });

      let totalWeight = 0;
      for (const rl of remainingLpns) {
        for (const i of rl.items) {
          const baseWeight = i.product.productUoms.length > 0 ? i.product.productUoms[0].weight_kg : 0;
          totalWeight += baseWeight * i.qty;
        }
      }

      await prisma.location.update({
        where: { id: task.source_location_id },
        data: { 
          current_weight_kg: totalWeight,
          is_full: false // Rút 1 pallet ra thì kệ không thể full
        }
      });
    }

    return updatedTask;
  }
}
