## Setup 
```
pip install git+https://github.com/openai/CLIP.git
pip install -r requirements.txt // For old CUDA version
pip install -r newer_cuda_reqs.txt // For latest CUDA version
```

# Images
Tạo 1 thư mục `images` sau đó copy keyframes vào thư mục images.
Copy `faiss_normal_ViT.bin` vào thư mục chính. 

## Run 
```
python make_json_dir.py 
python app_improved.py
```

Chỉ cần vào url:

URL: http://127.0.0.1:8000/static/index.html