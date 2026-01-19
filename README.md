# Smart Home App

Ứng dụng điều khiển nhà thông minh sử dụng MQTT v5.

## Cài đặt

1. Cài đặt dependencies:
```bash
npm install
```

2. **QUAN TRỌNG**: Copy các file ảnh từ project cũ (`my-smart-home/assets/images/`) vào `assets/images/`:
   - `logo.jpg` - **Bắt buộc** (được sử dụng trong dashboard và settings)
   - `favicon.png` - **Bắt buộc** (cho web)
   - Các file icon khác nếu cần

3. Chạy ứng dụng:
```bash
npm start
# hoặc
npm run android  # cho Android
npm run ios      # cho iOS
npm run web      # cho Web
```

## Tính năng

- **Bảng điều khiển**: Hiển thị trạng thái cảm biến và điều khiển thiết bị (Quạt, Máy bơm, Đèn)
- **Cài đặt**: Cấu hình ngưỡng, chế độ tự động/thủ công, và thời gian tự tắt

## MQTT Configuration

- Broker: `broker.emqx.io:8083`
- Protocol: MQTT v5
- Topics:
  - `greenhouse/esp32` - Nhận dữ liệu cảm biến
  - `greenhouse/esp32/control` - Gửi lệnh điều khiển
  - `greenhouse/esp32/state` - Nhận trạng thái thiết bị

## Cấu trúc Project

```
smart-home-app/
├── app/
│   ├── (tabs)/
│   │   ├── dashboard.tsx    # Màn hình bảng điều khiển
│   │   └── settings.tsx     # Màn hình cài đặt
│   ├── _layout.tsx         # Root layout
│   ├── index.tsx           # Entry point redirect
│   └── modal.tsx           # Modal screen
├── components/             # Reusable components
├── hooks/                  # Custom hooks
├── constants/              # Constants và theme
└── assets/                 # Images và assets
```
