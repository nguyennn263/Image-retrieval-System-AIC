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
            if st.button(f"Search similar (ID {idx})", key=f"sim_{idx}"):
                st.session_state['search_imgid'] = idx
                st.session_state['search_mode'] = 'Image Search'
                st.experimental_rerun()

elif search_mode == "Image Search":
    imgid = st.sidebar.number_input("Image ID", min_value=0, max_value=LenDictPath-1, value=0)
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
        st.info("Enter an image ID and click 'Search by Image'.")

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

