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
