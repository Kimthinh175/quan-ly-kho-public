import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class MasterDataService {
  private static instance: MasterDataService;

  private constructor() {}

  public static getInstance(): MasterDataService {
    if (!MasterDataService.instance) {
      MasterDataService.instance = new MasterDataService();
    }
    return MasterDataService.instance;
  }

  // ==== CATEGORY ====
  async getAllCategories() {
    return await prisma.category.findMany();
  }

  async createCategory(data: any) {
    return await prisma.category.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description
      }
    });
  }

  async updateCategory(id: number, data: any) {
    return await prisma.category.update({
      where: { id },
      data: {
        code: data.code,
        name: data.name,
        description: data.description
      }
    });
  }

  // ==== PRODUCT ====

  async getAllProducts() {
    return await prisma.product.findMany({
      include: {
        category: true,
        productUoms: true
      }
    });
  }

  async createProduct(data: any) {
    const product = await prisma.product.create({
      data: {
        sku_code: data.sku_code,
        name: data.name,
        base_uom: data.base_uom,
        category_id: data.category_id || null,
        ai_total_weight_score: data.ai_total_weight_score || 50
      }
    });

    if (data.pallet_conversion_factor) {
      await prisma.productUom.create({
        data: {
          product_id: product.id,
          uom_level: 'PALLET',
          conversion_factor: data.pallet_conversion_factor,
          weight_kg: data.pallet_weight_kg || 0,
          volume_cbm: data.pallet_volume_cbm || 0
        }
      });
    }
    
    return product;
  }

  async updateProduct(id: number, data: any) {
    const product = await prisma.product.update({
      where: { id },
      data: {
        sku_code: data.sku_code,
        name: data.name,
        base_uom: data.base_uom,
        category_id: data.category_id || null,
        ai_total_weight_score: data.ai_total_weight_score || 50
      }
    });

    if (data.pallet_conversion_factor) {
      const existingUom = await prisma.productUom.findFirst({
        where: { product_id: id, uom_level: 'PALLET' }
      });
      if (existingUom) {
        await prisma.productUom.update({
          where: { id: existingUom.id },
          data: {
            conversion_factor: data.pallet_conversion_factor,
            weight_kg: data.pallet_weight_kg || existingUom.weight_kg,
            volume_cbm: data.pallet_volume_cbm || existingUom.volume_cbm
          }
        });
      } else {
        await prisma.productUom.create({
          data: {
            product_id: id,
            uom_level: 'PALLET',
            conversion_factor: data.pallet_conversion_factor,
            weight_kg: data.pallet_weight_kg || 0,
            volume_cbm: data.pallet_volume_cbm || 0
          }
        });
      }
    }
    return product;
  }

  async getAllLocations() {
    const locs = await prisma.location.findMany({
      include: { 
        product: true,
        lpns: {
          include: { items: true, inbound_receipt: true }
        }
      }
    });
    // Trả về dạng phù hợp với frontend đang dùng
    return locs.map((l: any) => ({
      ...l,
      location_id: l.id.toString()
    }));
  }

  async addLocation(data: any) {
    const newLocs = [];
    const slots = ['A', 'B'];
    for (const slot of slots) {
      const locCode = `${data.zone}-${data.coord_x.toString().padStart(2, '0')}-${data.coord_y.toString().padStart(2, '0')}-L${data.level_z}-${slot}`;
      const newLoc = await prisma.location.create({
        data: {
          location_code: locCode,
          zone: data.zone,
          coord_x: data.coord_x,
          coord_y: data.coord_y,
          level_z: data.level_z,
          max_weight_kg: data.max_weight_kg || 1000,
          current_weight_kg: 0,
          location_type: data.location_type || 'RACK',
          length_cm: data.length_cm ? Number(data.length_cm) : null,
          width_cm: data.width_cm ? Number(data.width_cm) : null,
          height_cm: data.height_cm ? Number(data.height_cm) : null,
          max_volume_cbm: (data.length_cm && data.width_cm && data.height_cm) 
            ? (Number(data.length_cm) * Number(data.width_cm) * Number(data.height_cm)) / 1000000 
            : null,
          picking_sequence: data.picking_sequence ? Number(data.picking_sequence) : null,
          is_full: false,
          status: 'ACTIVE'
        }
      });
      newLocs.push({ ...newLoc, location_id: newLoc.id.toString() });
    }
    return newLocs;
  }

  async updateLocation(location_id: string, updateData: any) {
    const idNum = parseInt(location_id, 10);
    if (isNaN(idNum)) return null;
    
    try {
      const payload: any = { ...updateData };
      
      // Auto compute max_volume_cbm if dimensions are provided in update
      if (payload.length_cm && payload.width_cm && payload.height_cm) {
        payload.max_volume_cbm = (Number(payload.length_cm) * Number(payload.width_cm) * Number(payload.height_cm)) / 1000000;
      }
      
      const updated = await prisma.location.update({
        where: { id: idNum },
        data: payload
      });
      return { ...updated, location_id: updated.id.toString() };
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  async importFromExcel(excelRows: any[]): Promise<number> {
    let count = 0;
    for (const row of excelRows) {
      if (!row.Zone || !row.X || !row.Y || !row.Level) continue;
      
      const slots = ['A', 'B'];
      for (const slot of slots) {
        const locCode = `${row.Zone}-${row.X.toString().padStart(2, '0')}-${row.Y.toString().padStart(2, '0')}-L${row.Level}-${slot}`;
        
        // Kiểm tra xem đã tồn tại chưa
        const exists = await prisma.location.findUnique({
          where: { location_code: locCode }
        });
        
        if (!exists) {
          await prisma.location.create({
            data: {
              location_code: locCode,
              zone: row.Zone,
              coord_x: Number(row.X),
              coord_y: Number(row.Y),
              level_z: Number(row.Level),
              max_weight_kg: Number(row.MaxWeight) || 1000,
              current_weight_kg: 0,
              is_full: false,
              status: 'ACTIVE'
            }
          });
          count++;
        }
      }
    }
    return count;
  }
  // Inventory Details
  public async getInventoryDetails(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const products = await prisma.product.findMany({
      where: {
        lpnItems: {
          some: {
            lpn: { status: 'STORED', location_id: { not: null } }
          }
        }
      },
      skip,
      take: limit,
      include: {
        productUoms: true,
        lpnItems: {
          where: {
            lpn: { status: 'STORED', location_id: { not: null } }
          },
          include: {
            lpn: {
              include: {
                location: true,
                inbound_receipt: true
              }
            }
          }
        }
      }
    });

    const total = await prisma.product.count({
      where: {
        lpnItems: {
          some: {
            lpn: { status: 'STORED', location_id: { not: null } }
          }
        }
      }
    });

    const formattedData = products.map((prod: any) => {
      let totalQty = 0;
      const palletDetails = prod.lpnItems.map((item: any) => {
        totalQty += item.qty;
        return {
          lpn_code: item.lpn.lpn_code,
          qty: item.qty,
          location: item.lpn.location?.location_code,
          import_date: item.lpn.inbound_receipt?.created_at
        };
      });

      const palletUom = prod.productUoms?.find((u: any) => u.uom_level === 'PALLET');
      const conversionFactor = palletUom ? palletUom.conversion_factor : 100;

      const pallets = Math.floor(totalQty / conversionFactor);
      const loose = totalQty % conversionFactor;

      return {
        id: prod.id,
        sku: prod.sku_code,
        name: prod.name,
        total_qty: totalQty,
        pallets: pallets,
        loose: loose,
        pallet_details: palletDetails
      };
    });

    return {
      data: formattedData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  // ==== EQUIPMENT ====
  async getAllEquipment() {
    return await prisma.equipment.findMany();
  }

  async createEquipment(data: any) {
    const length_m = data.length_m ? Number(data.length_m) : 2.0;
    const width_m = data.width_m ? Number(data.width_m) : 1.0;
    const min_aisle_width_m = Math.ceil((length_m + width_m + 0.5) * 10) / 10;

    return await prisma.equipment.create({
      data: {
        equipment_code: data.equipment_code,
        equipment_type: data.equipment_type,
        name: data.name,
        max_weight_kg: Number(data.max_weight_kg),
        length_m: length_m,
        width_m: width_m,
        min_aisle_width_m: min_aisle_width_m,
        max_pallets: data.max_pallets ? Number(data.max_pallets) : 1,
        quantity: Number(data.quantity),
        status: data.status || 'ACTIVE'
      }
    });
  }

  async updateEquipment(id: number, data: any) {
    let updateData: any = {
      equipment_code: data.equipment_code,
      equipment_type: data.equipment_type,
      name: data.name,
      max_weight_kg: data.max_weight_kg ? Number(data.max_weight_kg) : undefined,
      length_m: data.length_m ? Number(data.length_m) : undefined,
      width_m: data.width_m ? Number(data.width_m) : undefined,
      max_pallets: data.max_pallets ? Number(data.max_pallets) : undefined,
      quantity: data.quantity ? Number(data.quantity) : undefined,
      status: data.status
    };

    if (data.length_m !== undefined || data.width_m !== undefined) {
      // Need to fetch current to calculate if only one is provided
      const current = await prisma.equipment.findUnique({ where: { id } });
      if (current) {
        const l = data.length_m !== undefined ? Number(data.length_m) : current.length_m;
        const w = data.width_m !== undefined ? Number(data.width_m) : current.width_m;
        updateData.min_aisle_width_m = Math.ceil((l + w + 0.5) * 10) / 10;
      }
    }

    return await prisma.equipment.update({
      where: { id },
      data: updateData
    });
  }

  async deleteEquipment(id: number) {
    return await prisma.equipment.delete({
      where: { id }
    });
  }
}
