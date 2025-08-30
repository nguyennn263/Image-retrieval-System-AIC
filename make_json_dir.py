import glob
import os
import json

def create_image_json(image_dir, output_file):
    # Use recursive glob to find all image files in the directory and subdirectories
    image_files = glob.glob(os.path.join(image_dir, "**", "*.jpg"), recursive=True) + \
                  glob.glob(os.path.join(image_dir, "**", "*.png"), recursive=True) + \
                  glob.glob(os.path.join(image_dir, "**", "*.jpeg"), recursive=True)
    
    # Convert to relative paths and normalize separators
    image_files = [os.path.relpath(f, start=os.path.dirname(output_file)).replace("\\", "/") for f in image_files]
    image_files.sort()

    # Create dictionary with index as key and file path as value
    data = {str(i): fname for i, fname in enumerate(image_files)}

    # Write to JSON file
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

    print(f"✅ JSON đã được tạo: {output_file}")
    print(f"Tổng số ảnh: {len(image_files)}")
    
if __name__ == "__main__":
    create_image_json("images", "image_path.json")




# import glob
# import os
# import json

# def create_image_json(image_dir, output_file):
#     # Duyệt qua tất cả các thư mục con trong thư mục chứa ảnh
#     image_files = []
    
#     # Tìm tất cả các ảnh có đuôi .jpg, .png, .jpeg trong tất cả các thư mục con
#     image_files.extend(glob.glob(os.path.join(image_dir, "**", "*.jpg"), recursive=True))
#     image_files.extend(glob.glob(os.path.join(image_dir, "**", "*.png"), recursive=True))
#     image_files.extend(glob.glob(os.path.join(image_dir, "**", "*.jpeg"), recursive=True))

#     # Kiểm tra nếu không có ảnh nào được tìm thấy
#     if not image_files:
#         print(f"❌ Không tìm thấy ảnh nào trong thư mục {image_dir}")
#         return
    
#     # Chuyển đổi các đường dẫn ảnh thành đường dẫn tương đối và chuẩn hóa dấu phân cách
#     image_files = [os.path.relpath(f, start=image_dir).replace("\\", "/") for f in image_files]
#     image_files.sort()

#     # Tạo dictionary với index là khóa và đường dẫn file là giá trị
#     data = {str(i): fname for i, fname in enumerate(image_files)}

#     # Ghi dữ liệu vào file JSON
#     with open(output_file, "w", encoding="utf-8") as f:
#         json.dump(data, f, indent=4, ensure_ascii=False)

#     print(f"✅ JSON đã được tạo: {output_file}")
#     print(f"Tổng số ảnh: {len(image_files)}")
    
# if __name__ == "__main__":
#     image_path = "/home/nguyennn263/Documents/AIC/Dataset/MyKeyframes"
#     create_image_json(image_path, "image_path.json")
