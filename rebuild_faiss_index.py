import json
from utils.query_processing import Translation
from utils.faiss import Myfaiss

# Load image paths
with open('image_path.json') as json_file:
    json_dict = json.load(json_file)

DictImagePath = {int(key): value for key, value in json_dict.items()}
bin_file = 'faiss_normal_ViT.bin'

# Khởi tạo Myfaiss
MyFaiss = Myfaiss(bin_file, DictImagePath, 'cpu', Translation(), "ViT-B/32")

# Xoá index cũ (clear)
print("Clearing old FAISS index...")
MyFaiss.clear_index(dim=512)  # 512 là số chiều của ViT-B/32

# Nạp lại toàn bộ hình ảnh vào FAISS
print("Building new FAISS index from images...")
MyFaiss.build_index_from_images()

print("Done! FAISS index has been rebuilt and saved.")
