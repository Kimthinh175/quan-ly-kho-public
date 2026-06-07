# 🏭 AuraFlow WMS - Hệ Thống Quản Lý Kho Thông Minh

> Warehouse Management System (WMS) tích hợp AI, sử dụng kiến trúc **Monorepo** với npm workspaces.

---

## 📖 Giới Thiệu

AuraFlow WMS là hệ thống quản lý kho hàng toàn diện, được xây dựng với mục tiêu:

- **Quản lý Master Data**: Sản phẩm, loại hàng, đơn vị tính (UOM), vị trí kho (Locations).
- **Quản lý Nhập/Xuất kho (Inbound/Outbound)**: Phiếu nhập, tạo Pallet (LPN), cất hàng lên kệ, tạo đơn xuất và nhặt hàng.
- **Trực quan hóa sơ đồ kho 3D**: Sử dụng Three.js để hiển thị bản đồ kho theo thời gian thực.
- **AI Core**: Thuật toán tối ưu vị trí cất hàng (Smart Putaway), đánh giá layout kho, sinh layout tự động, và di dời vùng đệm.

### Công Nghệ Sử Dụng

| Thành phần | Công nghệ |
|---|---|
| **Backend** | Express.js 5, TypeScript, Prisma ORM |
| **Database** | SQLite (file-based, phát triển local) |
| **Frontend** | React 19, Vite 8, TypeScript |
| **3D Visualization** | Three.js, React Three Fiber, React Three Drei |
| **Routing** | React Router DOM v7 |
| **Icons** | Lucide React |
| **HTTP Client** | Axios |
| **File Processing** | Multer (upload), SheetJS/xlsx (đọc file Excel) |
| **AI/ML Training** | Qwen 2.5 (LoRA fine-tuning - tài liệu tham khảo) |

---

## 📋 Yêu Cầu Hệ Thống

Trước khi bắt đầu, hãy đảm bảo máy tính đã cài đặt:

- **Node.js** v18 trở lên ([Tải tại đây](https://nodejs.org/))
- **npm** v9 trở lên (đi kèm với Node.js)
- **Git** (để clone source code)

Kiểm tra phiên bản:
```bash
node -v    # Kết quả mong đợi: v18.x.x hoặc cao hơn
npm -v     # Kết quả mong đợi: 9.x.x hoặc cao hơn
```

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### Bước 1: Clone Dự Án

```bash
git clone <repository-url>
cd quan-ly-kho
```

### Bước 2: Cài Đặt Dependencies

Chạy **một lệnh duy nhất** tại thư mục gốc — npm workspaces sẽ tự động cài đặt cho cả `backend/` và `frontend/`:

```bash
npm install
```

> **Lưu ý**: Nếu gặp lỗi liên quan đến `xlsx`, hãy đảm bảo kết nối internet ổn định vì package này được tải từ CDN SheetJS.

### Bước 3: Cấu Hình Biến Môi Trường (Backend)

File `.env` đã được tạo sẵn tại `backend/.env`. Kiểm tra nội dung:

```env
PORT=5000
DATABASE_URL="file:./dev.db"
```

Hoặc copy từ file mẫu:
```bash
cp backend/.env.example backend/.env
```

### Bước 4: Khởi Tạo Cơ Sở Dữ Liệu

```bash
cd backend

# Sinh Prisma Client từ schema
npx prisma generate

# Đồng bộ schema vào file SQLite (tạo file dev.db nếu chưa có)
npx prisma db push

# (Tùy chọn) Seed dữ liệu mẫu: 3 sản phẩm + ~1280 vị trí kệ kho
npx prisma db seed

# Quay lại thư mục gốc
cd ..
```

### Bước 5: Khởi Chạy Dự Án

Chạy **cả Backend và Frontend cùng lúc** chỉ với một lệnh:

```bash
npm run dev
```

Hệ thống sẽ khởi động:

| Dịch vụ | URL | Mô tả |
|---|---|---|
| **Backend API** | http://localhost:5000 | REST API server |
| **Frontend App** | http://localhost:5173 | Giao diện web (Vite dev server) |
| **Health Check** | http://localhost:5000/health | Kiểm tra backend hoạt động |

> 💡 **Mẹo**: Cả hai dịch vụ đều hỗ trợ **Hot Reload** — thay đổi code sẽ tự động cập nhật mà không cần restart.

---

## 🛠️ Các Lệnh Hữu Ích

### Khởi Chạy

| Lệnh | Mô tả |
|---|---|
| `npm run dev` | Chạy cả Backend + Frontend đồng thời |
| `npm run dev --workspace backend` | Chạy riêng Backend |
| `npm run dev --workspace frontend` | Chạy riêng Frontend |

### Quản Lý Database (Prisma)

| Lệnh | Mô tả |
|---|---|
| `cd backend && npx prisma studio` | Mở trình quản lý DB trực quan tại http://localhost:5555 |
| `cd backend && npx prisma generate` | Sinh lại Prisma Client sau khi thay đổi schema |
| `cd backend && npx prisma db push` | Đồng bộ schema mới vào database |
| `cd backend && npx prisma db seed` | Chạy seed dữ liệu mẫu |

### Build Production

| Lệnh | Mô tả |
|---|---|
| `cd frontend && npm run build` | Build frontend thành file tĩnh |
| `cd backend && npm run build` | Biên dịch TypeScript sang JavaScript |
| `cd backend && npm run start` | Chạy backend từ bản build |

---

## 📂 Cấu Trúc Dự Án

```text
quan-ly-kho/
├── package.json                        # Cấu hình npm workspaces (root)
├── erd.dbml                            # Sơ đồ ERD dạng DBML
├── README.md                           # Hướng dẫn này
│
├── backend/                            # ── BACKEND (Express.js + Prisma) ──
│   ├── .env                            # Biến môi trường (PORT, DATABASE_URL)
│   ├── .env.example                    # File mẫu biến môi trường
│   ├── package.json                    # Dependencies backend
│   ├── tsconfig.json                   # Cấu hình TypeScript
│   ├── prisma/
│   │   ├── schema.prisma              # Định nghĩa database models
│   │   ├── seed.ts                    # Script seed dữ liệu mẫu
│   │   ├── sync-categories.ts         # Script đồng bộ categories
│   │   └── dev.db                     # SQLite database file (auto-generated)
│   └── src/
│       ├── server.ts                  # Entry point - khởi tạo Express server
│       └── modules/
│           ├── app.module.ts          # Router gốc, gắn kết các module
│           ├── master-data/           # CRUD sản phẩm, loại hàng, vị trí kho
│           │   ├── master-data.module.ts
│           │   ├── master-data.controller.ts
│           │   ├── master-data.service.ts
│           │   └── interfaces/
│           ├── ai-core/               # Thuật toán AI: Smart Putaway, Layout
│           │   ├── ai-core.module.ts
│           │   ├── ai-core.controller.ts
│           │   └── ai-core.service.ts
│           ├── inbound/               # Nhập kho: phiếu nhập, LPN, WorkTask
│           │   ├── inbound.module.ts
│           │   ├── inbound.controller.ts
│           │   ├── inbound.service.ts
│           │   └── interfaces/
│           ├── inbound-outbound/      # API mock nhập/xuất nhanh
│           │   └── routes.ts
│           └── inventory-alerts/      # API tra cứu tồn kho, dead-stock
│               └── routes.ts
│
├── frontend/                           # ── FRONTEND (React + Vite + Three.js) ──
│   ├── package.json                    # Dependencies frontend
│   ├── index.html                      # HTML entry point
│   ├── vite.config.ts                  # Cấu hình Vite
│   ├── tsconfig.json                   # Cấu hình TypeScript
│   ├── public/                         # Static assets
│   └── src/
│       ├── main.tsx                   # React entry point
│       ├── App.tsx                    # Root component + Routing
│       ├── App.css                    # Styles chính
│       ├── index.css                  # Global styles
│       ├── api.ts                     # Axios instance (baseURL: localhost:5000)
│       └── modules/
│           ├── master-data/           # UI quản lý dữ liệu
│           │   ├── ProductInventoryHub.tsx    # Trang tồn kho thực tế
│           │   ├── ProductManagementPage.tsx  # Quản lý loại hàng & sản phẩm
│           │   ├── LayoutManagementPage.tsx   # Quản lý sơ đồ vị trí kho
│           │   └── WarehouseMap3D.tsx         # Bản đồ kho 3D (Three.js)
│           ├── inbound-outbound/      # UI nhập/xuất kho
│           │   └── InboundOutboundPage.tsx
│           └── ai-core/               # UI tính năng AI
│               └── AICorePage.tsx
│
└── ai-training-materials/              # Tài liệu huấn luyện AI model
    ├── README.md                       # Hướng dẫn training
    ├── Train_WMS_Qwen2_5.ipynb        # Notebook fine-tuning Qwen 2.5
    ├── wms_dataset.jsonl              # Dataset huấn luyện
    ├── adapter_config.json            # Cấu hình LoRA adapter
    ├── adapter_model.safetensors      # Model weights (~85MB)
    └── training_args.bin              # Training arguments
```

---

## 🌐 Danh Sách API Endpoints

### Health Check
| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/health` | Kiểm tra server đang hoạt động |

### Master Data (`/api/master-data/...`)
| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/master-data/categories` | Lấy danh sách loại hàng |
| `POST` | `/api/master-data/categories` | Tạo loại hàng mới |
| `PUT` | `/api/master-data/categories/:id` | Cập nhật loại hàng |
| `GET` | `/api/master-data/products` | Lấy danh sách sản phẩm |
| `POST` | `/api/master-data/products` | Tạo sản phẩm mới |
| `PUT` | `/api/master-data/products/:id` | Cập nhật sản phẩm |
| `GET` | `/api/master-data/locations` | Lấy danh sách vị trí kho |
| `POST` | `/api/master-data/locations` | Tạo vị trí kho mới |
| `PUT` | `/api/master-data/locations/:id` | Cập nhật vị trí kho |
| `POST` | `/api/master-data/locations/import` | Import vị trí kho từ file Excel |
| `GET` | `/api/master-data/inventory/details` | Xem chi tiết tồn kho |

### Inbound - Nhập Kho (`/api/inbound/...`)
| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/inbound/receipts` | Tạo phiếu nhập kho |
| `GET` | `/api/inbound/receipts` | Lấy danh sách phiếu nhập |
| `POST` | `/api/inbound/palletize` | Tạo Pallet (LPN) cho hàng nhập |
| `GET` | `/api/inbound/lpns` | Lấy danh sách LPN/Pallet |
| `POST` | `/api/inbound/tasks/generate` | Tạo work task (AI gợi ý vị trí cất) |
| `GET` | `/api/inbound/tasks` | Xem danh sách work tasks |
| `POST` | `/api/inbound/tasks/confirm` | Xác nhận cất hàng lên kệ |
| `POST` | `/api/inbound/loose-receipt` | Nhập hàng lẻ (không qua pallet) |

### AI Core (`/api/ai/...`)
| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/ai/evaluate-layout` | Đánh giá hiệu quả layout kho hiện tại |
| `POST` | `/api/ai/smart-putaway` | AI gợi ý vị trí cất hàng tối ưu |
| `POST` | `/api/ai/generate-layout` | AI sinh layout kho tự động |
| `POST` | `/api/ai/apply-layout` | Áp dụng layout AI đề xuất |
| `POST` | `/api/ai/relocate-buffer` | Di dời hàng trong vùng đệm |

### Inventory (`/api/inventory/...`)
| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/inventory` | Tra cứu số dư tồn kho |
| `POST` | `/api/inventory/adjust` | Cập nhật kiểm kê (điều chỉnh tồn) |
| `GET` | `/api/inventory/dead-stock` | Quét hàng chậm luân chuyển |

### Inbound/Outbound Mock (`/api/inbound/...` & `/api/outbound/...`)
| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/inbound/receipts` | Tạo phiếu nhập (mock) |
| `POST` | `/api/inbound/putaway` | Xác nhận cất hàng (mock) |
| `POST` | `/api/outbound/orders` | Tạo đơn xuất (mock) |
| `POST` | `/api/outbound/pick` | Xác nhận nhặt hàng (mock) |

---

## 🖥️ Các Trang Giao Diện (Frontend)

| Trang | URL | Mô tả |
|---|---|---|
| **Tồn kho Thực tế** | `/product-inventory` | Dashboard tồn kho theo sản phẩm và vị trí |
| **Quản lý Loại hàng** | `/product-management` | CRUD Categories + Products, quản lý UOM |
| **Quản lý Sơ đồ kho** | `/layout-management` | Xem/thêm/sửa vị trí kệ, hiển thị bản đồ kho 3D |
| **Inbound & Outbound** | `/inbound-outbound` | Quy trình nhập kho đầy đủ: phiếu nhập → pallet → cất hàng |
| **AI Core** | `/ai-core` | Giao diện các tính năng AI: đánh giá layout, smart putaway |

---

## 🗄️ Mô Hình Dữ Liệu (Database)

Hệ thống sử dụng **SQLite** với **Prisma ORM**, gồm các bảng chính:

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Category   │◄───│   Product    │───►│  ProductUom  │
│  (Loại hàng) │    │  (Sản phẩm)  │    │ (Đơn vị tính)│
└──────────────┘    └──────┬───────┘    └──────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Location   │◄───│     LPN      │───►│   LpnItem    │
│  (Vị trí kệ) │    │  (Pallet)    │    │ (Hàng trên   │
│              │    │              │    │   pallet)     │
└──────┬───────┘    └──────┬───────┘    └──────────────┘
       │                   │
       ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   WorkTask   │    │InboundReceipt│    │OutboundOrder │
│ (Tác vụ kho) │    │ (Phiếu nhập) │    │ (Đơn xuất)   │
└──────────────┘    └──────────────┘    └──────┬───────┘
                                               │
                                        ┌──────────────┐
                                        │OutboundLine  │
                                        │(Chi tiết xuất)│
                                        └──────────────┘
```

Xem schema chi tiết tại: [`backend/prisma/schema.prisma`](./backend/prisma/schema.prisma)  
Xem sơ đồ ERD tại: [`erd.dbml`](./erd.dbml)

---

## ❓ Xử Lý Lỗi Thường Gặp

### 1. Lỗi `prisma: command not found`
```bash
cd backend
npx prisma generate
```

### 2. Lỗi `Cannot find module '@prisma/client'`
```bash
cd backend
npx prisma generate
```

### 3. Lỗi `ENOENT: no such file or directory 'dev.db'`
```bash
cd backend
npx prisma db push
```

### 4. Lỗi `EADDRINUSE: port 5000 already in use`
Đổi port trong `backend/.env`:
```env
PORT=5001
```

### 5. Lỗi khi cài `xlsx` package
Package `xlsx` được tải từ CDN SheetJS. Đảm bảo:
- Kết nối internet ổn định
- Thử xóa `node_modules` và cài lại:
```bash
rm -rf node_modules backend/node_modules frontend/node_modules
npm install
```

### 6. Frontend không kết nối được Backend
- Đảm bảo Backend đang chạy trên port 5000
- Kiểm tra file `frontend/src/api.ts` — baseURL đang trỏ tới `http://localhost:5000/api`
- Nếu đổi port backend, cần cập nhật tương ứng trong `api.ts`

---

## 🔄 Quy Trình Nghiệp Vụ Chính

### Quy trình Nhập Kho (Inbound)
```
1. Tạo Phiếu nhập (Receipt)
   └─► 2. Tạo Pallet/LPN cho hàng nhập
       └─► 3. AI gợi ý vị trí cất hàng (Smart Putaway)
           └─► 4. Tài xế xác nhận cất hàng lên kệ
               └─► 5. Cập nhật tồn kho tự động
```

### Quy trình Xuất Kho (Outbound)
```
1. Tạo Đơn xuất (Order)
   └─► 2. Hệ thống khóa số lượng tồn
       └─► 3. Tạo task nhặt hàng (Picking)
           └─► 4. Xác nhận nhặt hàng
               └─► 5. Trừ tồn kho và cập nhật trạng thái
```

---

## 📜 Giấy Phép

Dự án được phát triển cho mục đích học tập và nghiên cứu.

---

> 📌 **Cần hỗ trợ?** Mở issue trên repository hoặc liên hệ nhóm phát triển.
