from fastapi import FastAPI, Query, Response
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import cv2
import os
import numpy as np
import json
from utils.query_processing import Translation
from utils.faiss import Myfaiss

app = FastAPI(title="Image Search API")

# Enable CORS for testing or frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

with open('image_path.json') as json_file:
    json_dict = json.load(json_file)

DictImagePath = {int(key): value for key, value in json_dict.items()}
LenDictPath = len(DictImagePath)
bin_file = 'faiss_normal_ViT.bin'
MyFaiss = Myfaiss(bin_file, DictImagePath, 'cpu', Translation(), "ViT-B/32")

@app.get("/home")
@app.get("/")
def thumbnailimg(index: int = Query(0, ge=0)):
    imgperindex = 100
    pagefile = []
    page_filelist = []
    list_idx = []
    if LenDictPath-1 > index+imgperindex:
        first_index = index * imgperindex
        last_index = index*imgperindex + imgperindex
        tmp_index = first_index
        while tmp_index < last_index:
            page_filelist.append(DictImagePath[tmp_index])
            list_idx.append(tmp_index)
            tmp_index += 1    
    else:
        first_index = index * imgperindex
        last_index = LenDictPath
        tmp_index = first_index
        while tmp_index < last_index:
            page_filelist.append(DictImagePath[tmp_index])
            list_idx.append(tmp_index)
            tmp_index += 1    
    for imgpath, id in zip(page_filelist, list_idx):
        pagefile.append({'imgpath': imgpath, 'id': id})
    data = {'num_page': int(LenDictPath/imgperindex)+1, 'pagefile': pagefile}
    return JSONResponse(content=data)

@app.get("/imgsearch")
def image_search(imgid: int = Query(..., ge=0)):
    _, list_ids, _, list_image_paths = MyFaiss.image_search(imgid, k=50)
    imgperindex = 100
    pagefile = []
    for imgpath, id in zip(list_image_paths, list_ids):
        pagefile.append({'imgpath': imgpath, 'id': int(id)})
    data = {'num_page': int(LenDictPath/imgperindex)+1, 'pagefile': pagefile}
    return JSONResponse(content=data)

@app.get("/textsearch")
def text_search(textquery: str = Query(...)):
    _, list_ids, _, list_image_paths = MyFaiss.text_search(textquery, k=50)
    imgperindex = 100
    pagefile = []
    for imgpath, id in zip(list_image_paths, list_ids):
        pagefile.append({'imgpath': imgpath, 'id': int(id)})
    data = {'num_page': int(LenDictPath/imgperindex)+1, 'pagefile': pagefile}
    return JSONResponse(content=data)

@app.get("/get_img")
def get_img(fpath: str = Query(...)):
    list_image_name = fpath.split("/")
    image_name = "/".join(list_image_name[-2:])
    if os.path.exists(fpath):
        img = cv2.imread(fpath)
    else:
        img = cv2.imread("./static/images/404.jpg")
    img = cv2.resize(img, (1280,720))
    img = cv2.putText(img, image_name, (30, 80), cv2.FONT_HERSHEY_SIMPLEX, 3, (255, 0, 0), 4, cv2.LINE_AA)
    _, jpeg = cv2.imencode('.jpg', img)
    return StreamingResponse(iter([jpeg.tobytes()]), media_type="image/jpeg")

# To run: uvicorn app_fastapi:app --reload --host 0.0.0.0 --port 8000

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app_fastapi:app", host="0.0.0.0", port=8000, reload=True)