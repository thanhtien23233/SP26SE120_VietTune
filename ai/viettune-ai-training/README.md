# VietTune AI Training — YAMNet Fine-tune Nhận Diện Nhạc Cụ

## Yêu Cầu Hệ Thống

- Python 3.10 hoặc 3.11 (TensorFlow 2.15 chưa hỗ trợ 3.12+)
- RAM: tối thiểu 8GB
- GPU: KHÔNG bắt buộc (CPU đủ cho pipeline này)
- Disk: ~2GB (cho dependencies + model cache)

## Cài Đặt

```bash
python -m venv venv
source venv/bin/activate        # Linux/Mac
# venv\Scripts\activate         # Windows
pip install --upgrade pip
pip install -r requirements.txt
```

## Chuẩn Bị Data

Đặt file audio (.wav khuyến nghị) vào:

```
data/raw/
├── dan_bau/        ← .wav đàn bầu
├── dan_tranh/      ← .wav đàn tranh
├── sao_truc/       ← .wav sáo trúc
└── background/     ← .wav tiếng ồn, giọng hát, nhạc cụ lạ
```

Yêu cầu:
- Tên class tự động nhận diện từ tên thư mục (vui lòng đặt tên thư mục không dấu, dùng gạch dưới).
- Khuyến nghị tối thiểu: 5 file mỗi class, mỗi file 1-3 phút.

## Chạy Pipeline

```bash
# Bước 1: Extract YAMNet embeddings (~5-10 phút)
python src/extract_embeddings.py

# Bước 2: Train classifier (~2-5 phút)
python src/train.py

# Bước 3: Export sang ONNX (~30 giây)
python src/export_onnx.py
```

## Kết Quả

- `models/best_model.keras`          — Keras model (dùng trong Python)
- `models/instrument_detector.onnx`  — ONNX model (dùng trong C#/.NET)
- `models/class_names.txt`           — Danh sách classes (dùng trong C#/.NET)
- `models/training_history.png`      — Biểu đồ training

## Thêm Nhạc Cụ Mới

Bạn chỉ cần:
1. Tạo một thư mục mới trong `data/raw/` (ví dụ: `data/raw/dan_nguyet`).
2. Đưa các file audio tương ứng vào thư mục đó.
3. Chạy lại Pipeline (bước 1 -> 3).
Mã nguồn sẽ tự động nhận diện thư mục dưới dạng class mới.
