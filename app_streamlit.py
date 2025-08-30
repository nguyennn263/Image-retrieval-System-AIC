import streamlit as st
import cv2
import os
import numpy as np
import json
from utils.query_processing import Translation
from utils.faiss import Myfaiss

# Load image paths
with open('image_path.json') as json_file:
    json_dict = json.load(json_file)

DictImagePath = {int(key): value for key, value in json_dict.items()}
LenDictPath = len(DictImagePath)
bin_file = 'faiss_normal_ViT.bin'
MyFaiss = Myfaiss(bin_file, DictImagePath, 'cpu', Translation(), "ViT-B/32")

st.set_page_config(page_title="Image Search App", layout="wide")
st.title("Image Search and Browsing")

# Sidebar for search
search_mode = st.sidebar.radio("Search mode", ("Browse", "Image Search", "Text Search"))

imgperindex = 100


# --- Add to list and show selected list ---
if 'selected_list' not in st.session_state:
    st.session_state['selected_list'] = []

def extract_info(idx, imgpath):
    # imgpath: images/keyframes/<video>/<frame>.jpg
    parts = imgpath.split('/')
    video = parts[2] if len(parts) > 2 else ''
    img_name = parts[-1].replace('.jpg', '')
    # remove leading zeros
    frame_num = str(int(img_name)) if img_name.isdigit() else img_name.lstrip('0')
    return idx, video, frame_num

if search_mode == "Browse":
    page = st.sidebar.number_input("Page", min_value=1, max_value=(LenDictPath // imgperindex) + 1, value=1)
    first_index = (page - 1) * imgperindex
    last_index = min(first_index + imgperindex, LenDictPath)
    st.subheader(f"Showing images {first_index} to {last_index - 1}")
    cols = st.columns(5)
    for idx in range(first_index, last_index):
        imgpath = DictImagePath[idx]
        with cols[(idx - first_index) % 5]:
            st.image(imgpath, caption=f"ID: {idx}", use_container_width=True)
            if st.button(f"Add to list (ID {idx})", key=f"add_{idx}"):
                info = extract_info(idx, imgpath)
                if info not in st.session_state['selected_list']:
                    st.session_state['selected_list'].append(info)
            if st.button(f"Search similar (ID {idx})", key=f"sim_{idx}"):
                st.session_state['search_imgid'] = idx
                st.session_state['search_mode'] = 'Image Search'
                st.experimental_rerun()

    # Hiển thị danh sách đã chọn ở sidebar
    st.sidebar.markdown("### Selected List")
    for i, (idx, video, frame) in enumerate(st.session_state['selected_list']):
        st.sidebar.write(f"{i+1}. ID: {idx}, Video: {video}, Frame: {frame}")
        # Nút xem lại clip tại frame (giả định có hàm get_video_path và get_frame_time)
        if st.sidebar.button(f"View clip (ID {idx})", key=f"view_{idx}"):
            # Giả định video gốc ở images/keyframes/<video>.mp4
            video_path = f"images/keyframes/{video}.mp4"
            try:
                frame_num = int(frame)
                fps = 25  # Giả định 25fps, có thể sửa lại nếu bạn biết fps thực tế
                time_sec = frame_num / fps
                st.sidebar.video(video_path, start_time=int(time_sec))
            except Exception as e:
                st.sidebar.warning(f"Cannot preview video: {e}")


elif search_mode == "Image Search":
    imgid = st.sidebar.number_input("Image ID", min_value=0, max_value=LenDictPath-1, value=0)
    uploaded_file = st.sidebar.file_uploader("Or upload an image to search", type=["jpg", "jpeg", "png"])
    search_by_upload = False
    if uploaded_file is not None:
        # Đọc ảnh upload và search
        file_bytes = np.asarray(bytearray(uploaded_file.read()), dtype=np.uint8)
        img = cv2.imdecode(file_bytes, 1)
        st.image(img, caption="Uploaded Image", use_container_width=True)
        # Search bằng ảnh upload
        _, list_ids, _, list_image_paths = MyFaiss.image_search(img, k=50, is_path=False)
        st.subheader(f"Top 50 similar images to uploaded image")
        cols = st.columns(5)
        for i, (imgpath, idx) in enumerate(zip(list_image_paths, list_ids)):
            with cols[i % 5]:
                st.image(imgpath, caption=f"ID: {idx}", use_container_width=True)
        search_by_upload = True
    if not search_by_upload:
        if st.sidebar.button("Search by Image") or st.session_state.get('search_imgid') is not None:
            if st.session_state.get('search_imgid') is not None:
                imgid = st.session_state.pop('search_imgid')
            _, list_ids, _, list_image_paths = MyFaiss.image_search(imgid, k=50)
            st.subheader(f"Top 50 similar images to ID {imgid}")
            cols = st.columns(5)
            for i, (imgpath, idx) in enumerate(zip(list_image_paths, list_ids)):
                with cols[i % 5]:
                    st.image(imgpath, caption=f"ID: {idx}", use_container_width=True)
        else:
            st.info("Enter an image ID or upload an image and click 'Search by Image'.")

elif search_mode == "Text Search":
    text_query = st.sidebar.text_input("Text Query")
    if st.sidebar.button("Search by Text") and text_query:
        _, list_ids, _, list_image_paths = MyFaiss.text_search(text_query, k=50)
        st.subheader(f"Top 50 images for query: '{text_query}'")
        cols = st.columns(5)
        for i, (imgpath, idx) in enumerate(zip(list_image_paths, list_ids)):
            with cols[i % 5]:
                st.image(imgpath, caption=f"ID: {idx}", use_container_width=True)
    else:
        st.info("Enter a text query and click 'Search by Text'.")

