import { PrismaClient } from '@prisma/client';
import { AiCoreService } from '../ai-core/ai-core.service';

const prisma = new PrismaClient();

export class InboundService {
  private static instance: InboundService;
  private aiCoreService: AiCoreService;

  private constructor() {
    this.aiCoreService = new AiCoreService();
  }

  public static getInstance(): InboundService {
    if (!InboundService.instance) {
      InboundService.instance = new InboundService();
    }
    return InboundService.instance;
  }

  // B1: Khai báo ASN
  public async createReceipt(details: { product_id: number, expected_qty: number }[]) {
    if (!details || details.length === 0) {
      throw new Error('Chi tiết phiếu nhập không được để trống');
    }
    for (const d of details) {
      if (d.expected_qty <= 0) {
        throw new Error('Số lượng dự kiến phải lớn hơn 0');
      }
      // Kiểm tra product tồn tại
      // eslint-disable-next-line no-await-in-loop
      const prod = await prisma.product.findUnique({ where: { id: d.product_id } });
      if (!prod) {
        throw new Error(`Sản phẩm ID ${d.product_id} không tồn tại`);
      }
    }
    const receiptCode = 'ASN-' + Date.now();
    const receipt = await prisma.inboundReceipt.create({
      data: {
        receipt_code: receiptCode,
        status: 'NEW',
        lines: {
          create: details.map(d => ({
            product_id: d.product_id,
            expected_qty: d.expected_qty,
            actual_qty: 0
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
    return receipt;
  }

  public async getReceipts() {
    return await prisma.inboundReceipt.findMany({
      include: { 
        lpns: true,
        lines: {
          include: {
            product: true
          }
        }
      }
    });
  }

  // B2: Đóng Pallet (Palletization)
  public async palletize(receiptCode: string, actualQuantities: Record<number, { qty: number, weightPerPallet: number }>) {
    const receipt = await prisma.inboundReceipt.findUnique({
      where: { receipt_code: receiptCode },
      include: { lines: true }
    });
    if (!receipt) throw new Error('Receipt not found');
    if (receipt.status === 'COMPLETED') throw new Error('Receipt already completed');
    if (actualQuantities && Object.values(actualQuantities).some(v => v.qty <= 0)) {
      throw new Error('Số lượng thực tế phải lớn hơn 0');
    }

    await prisma.inboundReceipt.update({
      where: { id: receipt.id },
      data: { status: 'PROCESSING' }
    });

    const generatedLPNs = [];

    // Lặp qua các Product IDs có trong actualQuantities
    for (const [productIdStr, actual] of Object.entries(actualQuantities)) {
      const productId = parseInt(productIdStr, 10);
      if (actual.qty <= 0) continue;

      const lpnCode = 'PLT-' + Date.now() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      
      const newLpn = await prisma.lpn.create({
        data: {
          lpn_code: lpnCode,
          inbound_receipt_id: receipt.id,
          status: 'RECEIVING',
          items: {
            create: {
              product_id: productId,
              qty: actual.qty
            }
          }
        },
        include: { items: true }
      });

      // Update actual_qty in InboundReceiptLine
      const matchingLine = receipt.lines.find(l => l.product_id === productId);
      if (matchingLine) {
        await prisma.inboundReceiptLine.update({
          where: { id: matchingLine.id },
          data: { actual_qty: { increment: actual.qty } }
        });
      }
      
      generatedLPNs.push({
        lpn_code: newLpn.lpn_code,
        receipt_id: receipt.receipt_code,
        product_id: productId,
        quantity: actual.qty,
        weight_kg: actual.weightPerPallet,
        status: newLpn.status,
        location_id: 'DOCK_IN'
      });
    }

    return generatedLPNs;
  }

  public async getLPNs(page: number = 1, limit: number = 1000) {
    const skip = (page - 1) * limit;
    const whereCondition = {
      status: 'RECEIVING',
      workTasks: { none: {} } // Chỉ lấy những LPN chưa được AI gán lệnh
    };
    
    const [total, lpns] = await Promise.all([
      prisma.lpn.count({ where: whereCondition }),
      prisma.lpn.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        include: { items: true, location: true, inbound_receipt: true }
      })
    ]);
    const data = lpns.map(l => ({
      lpn_code: l.lpn_code,
      receipt_id: l.inbound_receipt?.receipt_code || '',
      product_id: l.items[0]?.product_id || 0,
      status: l.status,
      location_id: l.location?.location_code || 'DOCK_IN',
      weight_kg: 500
    }));
    return { data, total, page, limit };
  }

  public async getWorkTasks() {
    const tasks = await prisma.workTask.findMany({
      include: { 
        dest_location: true, 
        lpn: { include: { items: { include: { product: true } } } } 
      }
    });
    return tasks.map(t => ({
      task_id: t.id.toString(),
      task_type: t.task_type,
      status: t.status,
      lpn_code: t.lpn.lpn_code,
      product_name: t.lpn.items[0]?.product?.name || 'Sản phẩm',
      dest_location_code: t.dest_location.location_code,
      ai_reason: t.ai_reason
    }));
  }

  // B3: AI Gợi ý xếp chỗ
  public async generatePutawayTask(lpnCode: string) {
    const lpn = await prisma.lpn.findUnique({
      where: { lpn_code: lpnCode },
      include: { items: true }
    });
    
    if (!lpn) throw new Error('LPN not found');
    if (lpn.status === 'STORED') throw new Error('LPN is already stored');

    const existingTask = await prisma.workTask.findFirst({
      where: { lpn_id: lpn.id, task_type: 'PUTAWAY', status: 'TODO' },
      include: { dest_location: true }
    });
    
    if (existingTask) {
      return {
        task_id: existingTask.id.toString(),
        task_type: existingTask.task_type,
        status: existingTask.status,
        lpn_code: lpnCode,
        dest_location_code: existingTask.dest_location.location_code,
        ai_reason: existingTask.ai_reason
      };
    }

    const productId = lpn.items[0]?.product_id || 1;
    
    // Thu thập Ngữ cảnh Thực tế (Dynamic Context Sensors)
    const dynamicContext = await this.aiCoreService.buildDynamicContext();
    
    const aiDecision = await this.aiCoreService.simulateMCDM(productId, 500, dynamicContext); // 500kg mock

    const destLoc = await prisma.location.findUnique({
      where: { location_code: aiDecision.top_locations[0].location_code }
    });
    if (!destLoc) throw new Error('Dest location not found in DB');

    const newTask = await prisma.workTask.create({
      data: {
        task_type: 'PUTAWAY',
        lpn_id: lpn.id,
        dest_location_id: destLoc.id,
        status: 'TODO',
        ai_reason: aiDecision.ai_reason
      }
    });

    return {
      task_id: newTask.id.toString(),
      task_type: newTask.task_type,
      status: newTask.status,
      lpn_code: lpnCode,
      dest_location_code: destLoc.location_code,
      ai_reason: newTask.ai_reason
    };
  }

  // B4: Cất kệ thành công bằng Scanner
  public async confirmPutaway(taskIdStr: string, scannedLocationCode: string) {
    const taskId = parseInt(taskIdStr.replace('TASK-', ''), 10) || parseInt(taskIdStr, 10);
    const task = await prisma.workTask.findUnique({
      where: { id: taskId },
      include: { dest_location: true, lpn: { include: { items: true } } }
    });
    
    if (!task) throw new Error('Task not found');
    if (task.status === 'COMPLETED') throw new Error('Task already completed');

    const destLoc = await prisma.location.findUnique({
      where: { location_code: scannedLocationCode }
    });
    if (!destLoc) throw new Error(`Vị trí [${scannedLocationCode}] không tồn tại trong hệ thống!`);

    const weight = 500; // Mock

    // Validate capacity
    if (destLoc.is_full || (destLoc.max_weight_kg - destLoc.current_weight_kg < weight)) {
      return { 
        success: false, 
        needReAssign: true, 
        message: `Kệ [${scannedLocationCode}] báo đầy hoặc quá tải trọng! Cần phân luồng lại...` 
      };
    }

    let overrideWarning = '';
    if (task.dest_location.location_code !== scannedLocationCode) {
      overrideWarning = ` (Lưu ý: Đã cất lệch vị trí AI đề xuất ban đầu)`;
      // Update task to reflect the overridden destination
      await prisma.workTask.update({
        where: { id: task.id },
        data: { dest_location_id: destLoc.id }
      });
    }

    // Update location
    const newWeight = destLoc.current_weight_kg + weight;
    await prisma.location.update({
      where: { id: destLoc.id },
      data: {
        current_weight_kg: newWeight,
        is_full: newWeight >= destLoc.max_weight_kg * 0.9,
        product_id: task.lpn.items[0]?.product_id || null,
        lpn_code: task.lpn.lpn_code
      }
    });

    // Update LPN
    await prisma.lpn.update({
      where: { id: task.lpn.id },
      data: {
        status: 'STORED',
        location_id: destLoc.id
      }
    });

    // Complete Task
    await prisma.workTask.update({
      where: { id: task.id },
      data: { status: 'COMPLETED' }
    });

    // Check Receipt status
    const receiptLpns = await prisma.lpn.findMany({
      where: { inbound_receipt_id: task.lpn.inbound_receipt_id }
    });
    
    const isReceiptDone = receiptLpns.every(l => l.status === 'STORED');
    if (isReceiptDone) {
      await prisma.inboundReceipt.update({
        where: { id: task.lpn.inbound_receipt_id },
        data: { status: 'COMPLETED' }
      });
    }

    return { success: true, message: `Cất thành công LPN ${task.lpn.lpn_code} vào ${scannedLocationCode}${overrideWarning}` };
  }

  // Phân luồng lại
  public async reassignTask(taskIdStr: string, failedLocationCode: string) {
    const taskId = parseInt(taskIdStr.replace('TASK-', ''), 10) || parseInt(taskIdStr, 10);
    const task = await prisma.workTask.findUnique({
      where: { id: taskId },
      include: { lpn: { include: { items: true } } }
    });
    if (!task) throw new Error('Task not found');
    
    const productId = task.lpn.items[0]?.product_id || 1;
    
    const dynamicContext = await this.aiCoreService.buildDynamicContext();
    const fullContext = `Vị trí [${failedLocationCode}] đã báo đầy đột xuất hoặc quá tải trọng. ${dynamicContext}`;
    
    const aiDecision = await this.aiCoreService.simulateMCDM(productId, 500, fullContext);
    
    const newDestLoc = await prisma.location.findUnique({
      where: { location_code: aiDecision.top_locations[0].location_code }
    });
    if (!newDestLoc) throw new Error('AI không tìm được vị trí thay thế khả thi!');

    await prisma.workTask.update({
      where: { id: task.id },
      data: { dest_location_id: newDestLoc.id, ai_reason: aiDecision.ai_reason }
    });

    return { 
      success: true, 
      newDest: newDestLoc.location_code, 
      message: `AI đã tìm được kệ thay thế: ${newDestLoc.location_code}` 
    };
  }

  // B5: Nhập hàng lẻ
  public async looseReceipt(productId: number, qty: number) {
    // Lấy tỉ lệ quy đổi từ ProductUom
    const productUom = await prisma.productUom.findFirst({
      where: { product_id: productId, uom_level: 'PALLET' }
    });

    if (!productUom || !productUom.conversion_factor) {
      throw new Error('Sản phẩm chưa được cấu hình Tỉ lệ quy đổi Pallet. Vui lòng vào trang Quản lý Loại hàng để cấu hình trước khi nhập lẻ.');
    }
    // Kiểm tra tồn tại vị trí trống
    const emptyLoc = await prisma.location.findFirst({ where: { status: 'ACTIVE', is_full: false } });
    if (!emptyLoc) {
      throw new Error('Không có vị trí trống để lưu Pallet mới');
    }

    const conversion_factor = productUom.conversion_factor;

    // 1. Tìm các Pallet cũ còn khoảng trống
    const existingItems = await prisma.lpnItem.findMany({
      where: { 
        product_id: productId, 
        qty: { lt: conversion_factor },
        lpn: { status: 'STORED', location_id: { not: null } }
      },
      orderBy: { lpn: { inbound_receipt: { created_at: 'asc' } } },
      include: { lpn: { include: { inbound_receipt: true, location: true } } }
    });

    let remainingQty = qty;
    let messages: string[] = [];

    // 2. Dồn hàng vào Pallet cũ
    for (const item of existingItems) {
      if (remainingQty <= 0) break;
      const space = conversion_factor - item.qty;
      const fillQty = Math.min(space, remainingQty);
      
      await prisma.lpnItem.update({
        where: { id: item.id },
        data: { qty: item.qty + fillQty }
      });
      
      remainingQty -= fillQty;
      messages.push(`Cộng dồn ${fillQty} gói vào Pallet [${item.lpn.lpn_code}] tại kệ [${item.lpn.location?.location_code || 'Không rõ'}].`);
    }

    // 3. Nếu vẫn còn dư hàng, sinh Pallet mới
    if (remainingQty > 0) {
      const receipt = await prisma.inboundReceipt.create({
        data: {
          receipt_code: `ASN-LOOSE-${Date.now()}`,
          supplier_name: 'Khách lẻ',
          status: 'COMPLETED'
        }
      });

      const newLpn = await prisma.lpn.create({
        data: {
          lpn_code: `LPN-L-${Date.now()}`,
          inbound_receipt_id: receipt.id,
          status: 'STORED'
        }
      });

      await prisma.lpnItem.create({
        data: {
          lpn_id: newLpn.id,
          product_id: productId,
          qty: remainingQty
        }
      });

      // Tìm một kệ trống để cất tạm
      const emptyLoc = await prisma.location.findFirst({
        where: { status: 'ACTIVE', is_full: false, location_code: { not: 'REFACTOR_BUFFER' } }
      });

      if (emptyLoc) {
        await prisma.lpn.update({
          where: { id: newLpn.id },
          data: { location_id: emptyLoc.id }
        });
        await prisma.location.update({
          where: { id: emptyLoc.id },
          data: { lpn_code: newLpn.lpn_code, product_id: productId, current_weight_kg: 10, is_full: false }
        });
        messages.push(`Đã tạo Pallet mới [${newLpn.lpn_code}] chứa ${remainingQty} gói, cất tại kệ [${emptyLoc.location_code}].`);
      } else {
        const buffer = await prisma.location.findUnique({ where: { location_code: 'REFACTOR_BUFFER' } });
        if (buffer) {
          await prisma.lpn.update({
             where: { id: newLpn.id },
             data: { location_id: buffer.id }
          });
          messages.push(`Kho đã hết kệ trống. Tạm vứt Pallet mới [${newLpn.lpn_code}] chứa ${remainingQty} gói vào khu chờ quy hoạch.`);
        }
      }
    }

    return { success: true, messages };
  }
}
