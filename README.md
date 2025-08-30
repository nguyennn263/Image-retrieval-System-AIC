## Setup 
```
pip install git+https://github.com/openai/CLIP.git
pip install -r requirements.txt // For old CUDA version
pip install -r newer_cuda_reqs.txt // For latest CUDA version
```

# Images
Tạo 1 thư mục `images` sau đó copy keyframes vào thư mục images.
Copy `faiss_normal_ViT.bin` vào thư mục chính. 

Thay đổi đường dẫn video trong `app_improved.py`:
```python
VIDEO_FOLDER = os.getenv("VIDEO_FOLDER", "path_to_your_video_folder")
```

## Run 
```
python make_json_dir.py 
python app_improved.py
```

Chỉ cần vào url:

URL: http://127.0.0.1:8000/static/index.html