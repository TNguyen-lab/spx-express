# SPX-EXPRESS: Warehouse & Shipping Management System

Dự án Quản lý Kho hàng & Vận chuyển với kiến trúc Event-Driven Architecture (EDA)

## Công Nghệ

### Backend
- **Express.js** - Web framework
- **TypeScript** - Ngôn ngữ
- **Prisma** - ORM cho Neon PostgreSQL
- **Upstash Redis/QStach** - Message Queue
- **Cloudinary** - Media storage
- **JWT** - Authentication

### Frontend
- **React** - UI framework
- **Vite** - Build tool
- **Recharts** - Charts
- **Lucide React** - Icons

## 7 Quy Trình Nghiệp Vụ

| # | Tên Tiếng Việt | Tên Tiếng Anh | Endpoint |
|---|---------------|---------------|----------|
| 1 | Quy trình đặt hàng | Purchase Order | /orders |
| 2 | Quy trình nhập kho | Inbound | /inbounds |
| 3 | Quy trình xuất kho | Outbound | /outbounds |
| 4 | Quy trình đóng gói | Packing | /packings |
| 5 | Quy trình phân loại | Sorting | /sortings |
| 6 | Quy trình vận chuyển | Shipping | /shipments |
| 7 | Quy trình kiểm kê | Inventory Check | /inventory-checks |

## Cấu Trúc Dự Án

```
SPX-EXPRESS/
├── be/                    # Backend
│   ├── src/
│   │   ├── config/        # Database, Redis, Cloudinary
│   │   ├── events/        # Event types & emitter
│   │   ├── routes/        # API routes
│   │   ├── middleware/   # Auth middleware
│   │   ├── utils/         # JWT helpers
│   │   └── index.ts       # Entry point
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   └── package.json
│
├── fe/                    # Frontend
│   ├── src/
│   │   ├── components/    # Layout
│   │   ├── pages/        # Dashboard, Login
│   │   ├── services/      # API client
│   │   ├── context/      # Auth context
│   │   └── types/        # TypeScript types
│   └── package.json
│
└── README.md
```

## Cài Đặt

### Backend
```bash
cd be
npm install
cp .env.example .env
# Fill in your environment variables
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

### Frontend
```bash
cd fe
npm install
npm run dev
```

## Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://...
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
QSTASH_URL=https://...
QSTASH_TOKEN=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
JWT_SECRET=your-secret-key
PORT=3000
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000
```

## Tài Khoản Demo

| Email | Password | Role |
|-------|----------|------|
| admin@spx.com | 123456 | ADMIN |
| quality@spx.com | 123456 | QUALITY |
| accounting@spx.com | 123456 | ACCOUNTING |
| director@spx.com | 123456 | WAREHOUSE_DIRECTOR |
| staff@spx.com | 123456 | STAFF |
| driver@spx.com | 123456 | DRIVER |

## API Endpoints

### Auth
- POST /auth/login
- POST /auth/register
- GET /auth/me

### Orders (Đặt hàng)
- GET /orders
- POST /orders
- POST /orders/:id/send-to-accounting
- POST /orders/:id/confirm-accounting
- POST /orders/:id/approve
- POST /orders/:id/reject

### Inbounds (Nhập kho)
- GET /inbounds
- POST /inbounds
- POST /inbounds/:id/receive
- POST /inbounds/:id/qc
- POST /inbounds/:id/complete

### Outbounds (Xuất kho)
- GET /outbounds
- POST /outbounds
- POST /outbounds/:id/pick
- POST /outbounds/:id/move-to-packing

### Packings (Đóng gói)
- GET /packings
- POST /packings/:id/start
- POST /packings/:id/seal
- POST /packings/:id/move-to-sorting

### Sortings (Phân loại)
- GET /sortings
- POST /sortings/:id/start
- POST /sortings/:id/classify
- POST /sortings/:id/complete

### Shipments (Vận chuyển)
- GET /shipments
- POST /shipments
- POST /shipments/:id/select-carrier
- POST /shipments/:id/deliver

### Inventory Checks (Kiểm kê)
- GET /inventory-checks
- POST /inventory-checks
- POST /inventory-checks/:id/start
- POST /inventory-checks/:id/count
- POST /inventory-checks/:id/complete

## Deployment

### Backend - Vercel
```bash
cd be
npm run build
vercel deploy
```

### Frontend - Vercel/Cloudflare Pages
```bash
cd fe
npm run build
# Deploy the dist folder
```

## License

MIT - For educational purposes