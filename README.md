## Setup 
```
pip install git+https://github.com/openai/CLIP.git
pip install -r requirements.txt // For old CUDA version
pip install -r newer_cuda_reqs.txt // For latest CUDA version
```

## Run 
```
python app_fastapi.py
streamlit run app_streamlit.py
```

URL: http://0.0.0.0:5001/home?index=0