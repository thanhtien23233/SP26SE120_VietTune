# PROMPT CHO AI AGENT: Nâng Cấp YAMNet Binary → Multi-Class

> **Mục đích**: Đưa prompt này cho AI agent (Claude Code, Cursor, Copilot...) để tự động cập nhật project YAMNet từ binary classification sang multi-class classification.
>
> **Điều kiện**: Project đã có sẵn 6 file Python (config.py, preprocess.py, extract_embeddings.py, build_model.py, train.py, export_onnx.py) theo cấu trúc binary classification.

---

## PROMPT BẮT ĐẦU TỪ ĐÂY

Tôi có project Python fine-tune YAMNet nhận diện nhạc cụ dân tộc Việt Nam, hiện đang dùng binary classification (1 nhạc cụ vs not_nhạc_cụ). Hãy nâng cấp sang multi-class classification để 1 model duy nhất nhận diện nhiều nhạc cụ cùng lúc.

### YÊU CẦU TỔNG QUAN

- Mỗi thư mục con trong `data/raw/` = 1 class (tên thư mục = tên class)
- Class names tự động detect từ tên thư mục, sort alphabet, không cần hardcode
- Thêm nhạc cụ mới = tạo thư mục mới + chạy lại pipeline, KHÔNG sửa code
- Output cuối: 1 file `.onnx` + 1 file `class_names.txt`

### THAY ĐỔI CẤU TRÚC THƯ MỤC DATA

Xóa cấu trúc cũ (cặp `dan_bau/` + `not_dan_bau/`), thay bằng:

```
data/raw/
├── dan_bau/        ← .wav đàn bầu
├── dan_tranh/      ← .wav đàn tranh
├── sao_truc/       ← .wav sáo trúc
└── background/     ← .wav tiếng ồn, giọng hát, nhạc cụ lạ
```

Mỗi thư mục cần file placeholder `PUT_WAV_HERE.txt`.

### THAY ĐỔI FILE 1/5: config.py

Thay đổi:
1. Xóa biến `TARGET_INSTRUMENT`
2. Xóa logic tạo `CLASS_NAMES` từ `TARGET_INSTRUMENT`
3. Thêm function `detect_classes(raw_dir)`:
   - Quét tất cả thư mục con trong `raw_dir`
   - Bỏ qua file và thư mục ẩn (bắt đầu bằng dấu chấm)
   - Sort alphabet
   - Return list tên thư mục
4. `CLASS_NAMES = detect_classes(RAW_DIR)`
5. `NUM_CLASSES = len(CLASS_NAMES)`
6. Thêm `CLASS_NAMES_FILE = os.path.join(PROCESSED_DIR, "class_names.txt")` vào phần output paths
7. In thông tin classes khi module được import

### THAY ĐỔI FILE 2/5: extract_embeddings.py

Thay đổi:
1. Import thêm `CLASS_NAMES_FILE`, `NUM_CLASSES` từ config
2. Xóa logic xử lý riêng positive_dir và negative_dir
3. Thay bằng 1 vòng lặp duy nhất qua tất cả classes:
```python
for class_idx, class_name in enumerate(CLASS_NAMES):
    class_dir = os.path.join(RAW_DIR, class_name)
    # ... load audio, extract embeddings ...
    all_labels.extend([class_idx] * num_frames)  # label = index, không phải 0/1
```
4. Kiểm tra `NUM_CLASSES < 2` ở đầu function → báo lỗi nếu thiếu class
5. Sau khi lưu embeddings.npy và labels.npy, lưu thêm `class_names.txt`:
```python
with open(CLASS_NAMES_FILE, "w", encoding="utf-8") as f:
    for name in CLASS_NAMES:
        f.write(name + "\n")
```
6. Phần tổng kết in số frames cho TỪNG class (dùng vòng lặp), không chỉ positive/negative

### THAY ĐỔI FILE 3/5: build_model.py

Thay đổi (QUAN TRỌNG NHẤT):
1. Output layer: `Dense(1, activation="sigmoid")` → `Dense(NUM_CLASSES, activation="softmax")`
2. Loss: `"binary_crossentropy"` → `"sparse_categorical_crossentropy"`
   - "sparse" vì labels là integer (0, 1, 2, 3...) không phải one-hot
3. Metrics: bỏ `Precision` và `Recall` riêng lẻ (không hỗ trợ multi-class trực tiếp trong keras), giữ `"accuracy"`
4. Đảm bảo `NUM_CLASSES` được import từ config

### THAY ĐỔI FILE 4/5: train.py

Thay đổi:
1. Thêm load `class_names.txt` khi load data (đọc file, strip whitespace)
2. Predict: thay `(y_pred_proba > 0.5).astype(int)` bằng `np.argmax(y_pred_proba, axis=1)`
3. `classification_report`: truyền `target_names=class_names` (đọc từ file, không dùng config trực tiếp — đảm bảo thứ tự khớp với lúc extract)
4. Confusion matrix: in dạng NxN với header là tên classes (không phải 2x2)
5. `model.evaluate` trả về 2 giá trị (loss, accuracy) thay vì 4 (không còn precision/recall)
6. Thêm per-class accuracy: với mỗi class, tính `mean(y_pred[mask] == idx)` trong đó `mask = (y_test == idx)`

### THAY ĐỔI FILE 5/5: export_onnx.py

Thay đổi:
1. Import thêm `CLASS_NAMES_FILE`, `CLASS_NAMES`, `NUM_CLASSES`, `MODELS_DIR`, `shutil`
2. Sau khi lưu .onnx, copy `class_names.txt` vào thư mục `models/`:
```python
shutil.copy2(CLASS_NAMES_FILE, os.path.join(MODELS_DIR, "class_names.txt"))
```
3. Cập nhật phần verify: kiểm tra output shape là `(5, NUM_CLASSES)` thay vì `(5,)`
4. Cập nhật C# code mẫu trong phần hướng dẫn:
   - Load class_names.txt
   - Output là array NUM_CLASSES phần tử
   - Dùng argmax tìm class có score cao nhất
   - In tên class + confidence

### FILE KHÔNG CẦN THAY ĐỔI

`preprocess.py` — Giữ nguyên 100%. Logic audio processing (load, normalize, augmentation) không phụ thuộc vào số classes.

### CẬP NHẬT README.md

Cập nhật hướng dẫn data structure: mỗi thư mục = 1 class, thêm nhạc cụ = tạo thư mục mới. Output gồm 2 file: `.onnx` + `class_names.txt`. Copy cả 2 vào project .NET.

### KIỂM TRA SAU KHI SỬA

Chạy lệnh sau để verify:
```bash
# 1. Kiểm tra config detect đúng classes
python -c "from src.config import CLASS_NAMES, NUM_CLASSES; print(f'{NUM_CLASSES} classes: {CLASS_NAMES}')"

# 2. Kiểm tra build_model output shape
python -c "from src.build_model import build_classifier; m = build_classifier(); print(f'Output shape: {m.output_shape}')"

# 3. Kiểm tra cấu trúc file
find . -name "*.py" -path "*/src/*" | sort
```

Kết quả mong đợi:
- Classes detect đúng từ thư mục (sort alphabet)
- Output shape: `(None, N)` với N = số thư mục trong data/raw/
- Đầy đủ 6 file .py trong src/
