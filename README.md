# project30tr - Backend API

API quản lý tài khoản và ảnh nhật kí. Node.js + Express + Prisma + PostgreSQL.

## Yêu cầu môi trường

- Node.js >= 18
- PostgreSQL >= 14

## Cài đặt

```bash
npm install
cp .env.example .env      # sửa DATABASE_URL và JWT_SECRET cho đúng máy mình
```

Tạo database lần đầu:

```bash
createdb project30tr
```

Tạo bảng từ schema:

```bash
npm run prisma:generate
npm run prisma:migrate        # lần đầu dùng, tạo file migration
```

Các lần sau chỉ cần:

```bash
npm run prisma:deploy         # áp dụng migration đã có
```

Xem trực quan database:

```bash
npm run prisma:studio
```

## Chạy

```bash
npm run dev      # nodemon, port 8080
npm start        # production
```

API chạy tại `http://localhost:8080/api`.

## Cấu trúc

```
src/
├── config/
│   ├── env.js               # đọc + kiểm tra biến môi trường
│   └── db.js                # Prisma client singleton
├── middlewares/
│   ├── auth.js              # requireAuth, requireRole
│   ├── errorHandler.js      # bắt lỗi tập trung + dịch lỗi Prisma
│   └── notFound.js          # 404 endpoint
├── services/                # logic, gọi Prisma
├── controllers/             # đọc req, gọi service, trả res
├── routes/                  # định nghĩa endpoint
├── utils/                   # AppError, response, pagination, token, password, validate
├── app.js                   # cấu hình Express, mount route
└── server.js                # entry point
```

Luồng request: `routes -> middlewares -> controllers -> services -> prisma`
Lỗi: controller/service `throw` -> `express-async-errors` -> `errorHandler`.

## Format response

Thành công:

```json
{ "success": true, "message": "OK", "data": {}, "meta": { "page": 1, "pageSize": 10, "total": 42 } }
```

Thất bại:

```json
{ "success": false, "message": "Không tìm thấy người dùng", "code": "NOT_FOUND" }
```

Mã lỗi thường gặp: `BAD_REQUEST`, `INVALID_JSON`, `UNAUTHORIZED`, `MISSING_TOKEN`,
`INVALID_TOKEN`, `TOKEN_EXPIRED`, `INVALID_CREDENTIALS`, `FORBIDDEN`, `NOT_FOUND`,
`ROUTE_NOT_FOUND`, `CONFLICT`, `INTERNAL_ERROR`.

## Xác thực

Đăng nhập nhận về JWT, gửi kèm ở header:

```
Authorization: Bearer <token>
```

## API endpoints

### Auth

| Method | Endpoint | Auth | Mô tả |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | - | Đăng ký, trả `{ user, token }` |
| POST | `/api/auth/login` | - | Đăng nhập, trả `{ user, token }` |
| GET | `/api/auth/me` | token | Thông tin tài khoản đang đăng nhập |

### Users

| Method | Endpoint | Auth | Mô tả |
| --- | --- | --- | --- |
| GET | `/api/users` | ADMIN | Danh sách, hỗ trợ `?page=&pageSize=&username=&role=` |
| POST | `/api/users` | ADMIN | Tạo tài khoản |
| GET | `/api/users/:id` | token | Chi tiết một tài khoản |
| PUT | `/api/users/:id` | token | Cập nhật tài khoản |
| DELETE | `/api/users/:id` | ADMIN | Xoá tài khoản (xoá luôn ảnh nhật kí) |

### Journal images

| Method | Endpoint | Auth | Mô tả |
| --- | --- | --- | --- |
| GET | `/api/journal-images` | token | Danh sách, hỗ trợ `?page=&pageSize=&userId=&from=&to=` |
| POST | `/api/journal-images` | token | Thêm ảnh `{ imageUrl, capturedAt }` |
| GET | `/api/journal-images/:id` | token | Chi tiết ảnh |
| PUT | `/api/journal-images/:id` | token | Cập nhật ảnh |
| DELETE | `/api/journal-images/:id` | token | Xoá ảnh |

`from` / `to` là thời gian ISO 8601, ví dụ `2026-01-01T00:00:00.000Z`.

### Khác

| Method | Endpoint | Auth | Mô tả |
| --- | --- | --- | --- |
| GET | `/api/health` | - | Kiểm tra API còn sống |

## Thử nhanh

```bash
# 1. Đăng ký, lấy token
curl -X POST http://localhost:8080/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"testuser","password":"secret123"}'

# 2. Gán ADMIN cho tài khoản đầu tiên, dùng để test endpoint admin
#    Bảng trong DB tên là "users" (do @@map trong schema.prisma)
PGPASSWORD=123456 psql -U postgres -h 127.0.0.1 -d project30tr \
  -c "UPDATE users SET role='ADMIN' WHERE username='testuser';"

# 3. Đăng nhập
curl -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"testuser","password":"secret123"}'

# 4. Gọi endpoint cần token
curl http://localhost:8080/api/auth/me -H 'Authorization: Bearer <token>'
```

## Deploy

```bash
NODE_ENV=production
JWT_SECRET  # chuỗi ngẫu nhiên dài >= 32 ký tự, server sẽ từ chối start nếu quá ngắn
CORS_ORIGIN # chỉ định domain frontend, nhiều domain cách nhau bằng dấu phẩy
```

Chạy `npm run prisma:deploy` trước khi start.

## Mở rộng sau

Schema hiện có `User` và `JournalImage`. Các trường còn thiếu (nội dung nhật kí,
địa điểm, mood, bình luận, theo dõi...) thêm vào `prisma/schema.prisma` rồi
`npm run prisma:migrate`.
