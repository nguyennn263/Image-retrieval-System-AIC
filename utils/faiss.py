from PIL import Image
import faiss
import matplotlib.pyplot as plt
import math
import numpy as np 
import clip
from langdetect import detect

class Myfaiss:
    def clear_index(self, save_path=None, dim=None, verbose=True):
        """
        Xóa toàn bộ dữ liệu trong FAISS index và ghi đè file index cũ.
        Nếu dim không truyền vào, sẽ lấy từ index hiện tại (nếu có), nếu không có thì báo lỗi.
        """
        if dim is None:
            if self.index is not None:
                dim = self.index.d
            else:
                raise ValueError("Bạn phải truyền vào dim nếu chưa có index cũ.")
        index = faiss.IndexFlatL2(dim)
        self.index = index
        if save_path is None:
            save_path = self.bin_file
        faiss.write_index(index, save_path)
        if verbose:
            print(f"[Myfaiss] FAISS index cleared and saved to {save_path}")
        return index
    def __init__(self, bin_file : str, id2img_fps, device, translater, clip_backbone="ViT-B/32"):
        self.bin_file = bin_file
        self.id2img_fps = id2img_fps
        self.device = device
        self.model, self.preprocess = clip.load(clip_backbone, device=device)
        self.translater = translater
        # Try to load index, if not found, set to None
        try:
            self.index = self.load_bin_file(bin_file)
        except Exception as e:
            print(f"[Myfaiss] Warning: Cannot load index from {bin_file}: {e}")
            self.index = None

    def build_index_from_images(self, save_path=None, verbose=True, batch_size=64, use_gpu=True, nlist=256):
        """
        Build FAISS index from all images in self.id2img_fps.
        - Batch encode images for speed.
        - Use IndexIVFFlat for faster search on large datasets.
        - Optionally use GPU if available.
        """
        import torch
        from tqdm import tqdm
        image_paths = [self.id2img_fps[k] for k in sorted(self.id2img_fps.keys())]
        features = []
        total = len(image_paths)
        # Batch encode with tqdm
        for start in tqdm(range(0, total, batch_size), desc="Encoding images", unit="batch"):
            end = min(start + batch_size, total)
            batch_imgs = []
            for img_path in image_paths[start:end]:
                try:
                    image = Image.open(img_path).convert("RGB")
                    batch_imgs.append(self.preprocess(image))
                except Exception as e:
                    print(f"[Myfaiss] Error processing {img_path}: {e}")
                    batch_imgs.append(torch.zeros((3, 224, 224)))
            batch_tensor = torch.stack(batch_imgs).to(self.device)
            with torch.no_grad():
                feats = self.model.encode_image(batch_tensor).cpu().numpy().astype(np.float32)
            features.append(feats)
            if verbose:
                print(f"Processed {end}/{total} images...")
        feats_np = np.concatenate(features, axis=0)
        dim = feats_np.shape[1]
        # FAISS index
        if use_gpu:
            try:
                import faiss.contrib.torch_utils
                res = faiss.StandardGpuResources()
                quantizer = faiss.IndexFlatL2(dim)
                index = faiss.IndexIVFFlat(quantizer, dim, nlist, faiss.METRIC_L2)
                index.train(feats_np)
                gpu_index = faiss.index_cpu_to_gpu(res, 0, index)
                gpu_index.add(feats_np)
                self.index = faiss.index_gpu_to_cpu(gpu_index)
            except Exception as e:
                print(f"[Myfaiss] GPU indexing failed, fallback to CPU: {e}")
                quantizer = faiss.IndexFlatL2(dim)
                index = faiss.IndexIVFFlat(quantizer, dim, nlist, faiss.METRIC_L2)
                index.train(feats_np)
                index.add(feats_np)
                self.index = index
        else:
            quantizer = faiss.IndexFlatL2(dim)
            index = faiss.IndexIVFFlat(quantizer, dim, nlist, faiss.METRIC_L2)
            index.train(feats_np)
            index.add(feats_np)
            self.index = index
        if save_path is None:
            save_path = self.bin_file
        faiss.write_index(self.index, save_path)
        if verbose:
            print(f"[Myfaiss] FAISS index (IVF) built and saved to {save_path}")
        return self.index

    def load_bin_file(self, bin_file: str):
        return faiss.read_index(bin_file)
    
    def show_images(self, image_paths):
        fig = plt.figure(figsize=(15, 10))
        columns = int(math.sqrt(len(image_paths)))
        rows = int(np.ceil(len(image_paths)/columns))

        for i in range(1, columns*rows +1):
          img = plt.imread(image_paths[i - 1])
          ax = fig.add_subplot(rows, columns, i)
          ax.set_title('/'.join(image_paths[i - 1].split('/')[-3:]))

          plt.imshow(img)
          plt.axis("off")

        plt.show()
        
    def image_search(self, query, k, is_path=True): 
        if is_path:
            # Search by image ID (original behavior)
            query_feats = self.index.reconstruct(query).reshape(1,-1)
        else:
            # Search by image array (new behavior for uploaded images)
            import torch
            if isinstance(query, np.ndarray):
                # Convert numpy array to PIL Image
                from PIL import Image
                if len(query.shape) == 3:
                    if query.shape[2] == 3:  # RGB
                        pil_image = Image.fromarray(query)
                    else:  # BGR
                        pil_image = Image.fromarray(query[:,:,::-1])
                else:
                    raise ValueError("Invalid image shape")
            else:
                pil_image = query
            
            # Get features
            image_input = self.preprocess(pil_image).unsqueeze(0).to(self.device)
            with torch.no_grad():
                query_feats = self.model.encode_image(image_input).cpu().numpy().astype(np.float32)

        scores, idx_image = self.index.search(query_feats, k=k)
        idx_image = idx_image.flatten()

        infos_query = list(map(self.id2img_fps.get, list(idx_image)))
        image_paths = [info for info in infos_query]

        
        return scores, idx_image, infos_query, image_paths
    
    def text_search(self, text, k):
        if detect(text) == 'vi':
            text = self.translater(text)

        ###### TEXT FEATURES EXACTING ######
        text = clip.tokenize([text]).to(self.device)  
        text_features = self.model.encode_text(text).cpu().detach().numpy().astype(np.float32)

        ###### SEARCHING #####
        scores, idx_image = self.index.search(text_features, k=k)
        idx_image = idx_image.flatten()

        ###### GET INFOS KEYFRAMES_ID ######
        infos_query = list(map(self.id2img_fps.get, list(idx_image)))
        image_paths = [info for info in infos_query]

        return scores, idx_image, infos_query, image_paths