from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
import json
import cv2
import numpy as np
import os
from dotenv import load_dotenv
from PIL import Image
import logging
import traceback

# Try to import utils, with fallback
try:
    from utils.query_processing import Translation
    from utils.faiss import Myfaiss
    UTILS_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Could not import utils: {e}")
    UTILS_AVAILABLE = False

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Image Search API")

# Setup templates
templates = Jinja2Templates(directory="static")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load image paths
try:
    with open('image_path.json') as json_file:
        json_dict = json.load(json_file)
    
    DictImagePath = {int(key): value for key, value in json_dict.items()}
    LenDictPath = len(DictImagePath)
    logger.info(f"Loaded {LenDictPath} image paths")
except Exception as e:
    logger.error(f"Error loading image_path.json: {e}")
    DictImagePath = {}
    LenDictPath = 0

# Initialize FAISS
MyFaiss = None
if UTILS_AVAILABLE:
    try:
        bin_file = 'faiss_normal_ViT.bin'
        MyFaiss = Myfaiss(bin_file, DictImagePath, 'cpu', Translation(), "ViT-B/32")
        logger.info("FAISS initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing FAISS: {e}")
        MyFaiss = None

# Load .env
load_dotenv()
VIDEO_FOLDER = os.getenv("VIDEO_FOLDER", "path_to_your_video_folder")

# Mount static files - order matters!
app.mount("/images", StaticFiles(directory="images"), name="images")
app.mount("/videos", StaticFiles(directory=VIDEO_FOLDER), name="videos")
app.mount("/static", StaticFiles(directory="static"), name="static")

# Pydantic models-
class ImageSearchRequest(BaseModel):
    image_id: int
    k: int = 200

class TextSearchRequest(BaseModel):
    query: str
    k: int = 200

class SearchResult(BaseModel):
    id: int
    path: str
    score: float = 0.0

# Routes
@app.get("/", response_class=HTMLResponse)
async def index():
    return FileResponse("static/index.html")

@app.get("/view", response_class=HTMLResponse)
async def view_frame():
    return FileResponse("static/view_new.html")

@app.get("/view", response_class=HTMLResponse)
async def view_image(request: Request, keyframe: str):
    return templates.TemplateResponse("view.html", {
        "request": request,
        "keyframe": keyframe
    })

@app.get("/vid", response_class=HTMLResponse)
async def view_video():
    return FileResponse("static/vid_new.html")

@app.get("/api/image_paths")
async def get_image_paths():
    """Get all image paths"""
    return {
        "image_paths": DictImagePath,
        "total_count": LenDictPath
    }

@app.post("/api/image_search")
async def image_search(request: ImageSearchRequest):
    """Search similar images by image ID"""
    if MyFaiss is None:
        raise HTTPException(status_code=500, detail="FAISS not initialized")
    
    if request.image_id < 0 or request.image_id >= LenDictPath:
        raise HTTPException(status_code=400, detail="Invalid image ID")
    
    try:
        scores, list_ids, _, list_image_paths = MyFaiss.image_search(request.image_id, k=request.k)
        
        results = []
        for i, (img_path, img_id, score) in enumerate(zip(list_image_paths, list_ids, scores[0])):
            results.append(SearchResult(
                id=int(img_id),
                path=img_path,
                score=float(score)
            ))
        
        return {"results": results}
    except Exception as e:
        logger.error(f"Error in image search: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/text_search")
async def text_search(request: TextSearchRequest):
    """Search images by text query"""
    if MyFaiss is None:
        raise HTTPException(status_code=500, detail="FAISS not initialized")
    
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    
    try:
        scores, list_ids, _, list_image_paths = MyFaiss.text_search(request.query, k=request.k)
        
        results = []
        for i, (img_path, img_id, score) in enumerate(zip(list_image_paths, list_ids, scores[0])):
            results.append(SearchResult(
                id=int(img_id),
                path=img_path,
                score=float(score)
            ))
        
        return {"results": results}
    except Exception as e:
        logger.error(f"Error in text search: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload_search")
async def upload_search(image: UploadFile = File(...), k: int = 200):
    """Search similar images by uploading an image"""
    if MyFaiss is None:
        raise HTTPException(status_code=500, detail="FAISS not initialized")
    
    try:
        # Read uploaded image
        contents = await image.read()
        nparr = np.frombuffer(contents, np.uint8)
        img_cv = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img_cv is None:
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        # Convert to PIL Image
        img_rgb = cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB)
        pil_image = Image.fromarray(img_rgb)
        
        # Get image features using CLIP
        import torch
        image_input = MyFaiss.preprocess(pil_image).unsqueeze(0).to(MyFaiss.device)
        with torch.no_grad():
            image_features = MyFaiss.model.encode_image(image_input).cpu().numpy().astype(np.float32)
        
        # Search in FAISS
        scores, idx_image = MyFaiss.index.search(image_features, k=k)
        idx_image = idx_image.flatten()
        
        # Get image paths
        list_image_paths = [MyFaiss.id2img_fps.get(int(idx), "") for idx in idx_image]
        
        results = []
        for i, (img_path, img_id, score) in enumerate(zip(list_image_paths, idx_image, scores[0])):
            if img_path:  # Only include valid paths
                results.append(SearchResult(
                    id=int(img_id),
                    path=img_path,
                    score=float(score)
                ))
        
        return {"results": results}
    except Exception as e:
        logger.error(f"Error in upload search: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/video_info/{video_name}")
async def get_video_info(video_name: str):
    """Get video metadata including FPS"""
    try:
        video_path = os.path.join(VIDEO_FOLDER, f"{video_name}.mp4")
        if not os.path.exists(video_path):
            raise HTTPException(status_code=404, detail="Video not found")
        
        # Use opencv to get video info
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise HTTPException(status_code=500, detail="Cannot open video")
        
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = frame_count / fps if fps > 0 else 0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        cap.release()
        
        return {
            "video_name": video_name,
            "fps": fps,
            "frame_count": frame_count,
            "duration": duration,
            "width": width,
            "height": height
        }
    except Exception as e:
        logger.error(f"Error getting video info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "faiss_initialized": MyFaiss is not None,
        "total_images": LenDictPath
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
