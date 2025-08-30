class ImageSearchApp {
    constructor() {
        this.currentMode = 'browse';
        this.currentPage = 1;
        this.imagesPerPage = 100;
        this.selectedList = this.loadSelectedList();
        this.totalImages = 0;
        this.imageData = {};
        this.searchResults = [];
        this.searchCache = new Map(); // Cache cho search results
        
        this.initEventListeners();
        this.loadInitialData();
    }

    // Local storage functions
    loadSelectedList() {
        try {
            const saved = localStorage.getItem('selectedImageList');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Error loading selected list:', e);
            return [];
        }
    }

    saveSelectedList() {
        try {
            localStorage.setItem('selectedImageList', JSON.stringify(this.selectedList));
        } catch (e) {
            console.error('Error saving selected list:', e);
        }
    }

    // Enhanced event listeners with debouncing
    initEventListeners() {
        // Mode selection
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchMode(e.target.dataset.mode);
            });
        });

        // Browse controls
        document.getElementById('go-page-btn').addEventListener('click', () => {
            const page = parseInt(document.getElementById('page-input').value);
            this.goToPage(page);
        });

        // Image search controls with enhanced UX
        document.getElementById('search-by-id-btn').addEventListener('click', () => {
            const imageId = parseInt(document.getElementById('image-id-input').value);
            this.searchById(imageId);
        });

        // Upload functionality with better preview
        document.getElementById('image-upload').addEventListener('change', (e) => {
            this.handleImageUpload(e);
        });

        document.getElementById('search-by-upload-btn').addEventListener('click', () => {
            this.searchByUpload();
        });

        // Text search with debouncing
        let textSearchTimeout;
        const textInput = document.getElementById('text-query-input');
        
        document.getElementById('search-by-text-btn').addEventListener('click', () => {
            const query = textInput.value;
            this.searchByText(query);
        });

        // Real-time search suggestion (optional)
        textInput.addEventListener('input', (e) => {
            clearTimeout(textSearchTimeout);
            textSearchTimeout = setTimeout(() => {
                if (e.target.value.length > 2) {
                    this.showSearchSuggestion(e.target.value);
                }
            }, 500);
        });

        // Enhanced pagination
        document.getElementById('prev-page-btn').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.goToPage(this.currentPage - 1);
            }
        });

        document.getElementById('next-page-btn').addEventListener('click', () => {
            const maxPage = Math.ceil(this.totalImages / this.imagesPerPage);
            if (this.currentPage < maxPage) {
                this.goToPage(this.currentPage + 1);
            }
        });

        // Selected list management
        document.getElementById('clear-list-btn').addEventListener('click', () => {
            this.clearSelectedList();
        });

        // Modal close with better UX
        document.querySelector('.close').addEventListener('click', () => {
            this.closeModal();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Enter key handling
        document.getElementById('page-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.goToPage(parseInt(e.target.value));
            }
        });

        textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchByText(e.target.value);
            }
        });

        // Load selected list on startup
        this.updateSelectedList();
    }

    // Keyboard shortcuts for better UX
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + F: Focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            if (this.currentMode === 'text-search') {
                document.getElementById('text-query-input').focus();
            } else if (this.currentMode === 'image-search') {
                document.getElementById('image-id-input').focus();
            }
        }
        
        // Escape: Close modal
        if (e.key === 'Escape') {
            this.closeModal();
        }
        
        // Arrow keys for pagination (when not in input)
        if (!e.target.matches('input, textarea')) {
            if (e.key === 'ArrowLeft' && this.currentPage > 1) {
                this.goToPage(this.currentPage - 1);
            }
            if (e.key === 'ArrowRight') {
                const maxPage = Math.ceil(this.totalImages / this.imagesPerPage);
                if (this.currentPage < maxPage) {
                    this.goToPage(this.currentPage + 1);
                }
            }
        }
    }

    // Enhanced loading with better error handling
    async loadInitialData() {
        try {
            this.showLoading(true, 'Loading image database...');
            
            // Use fallback if API fails
            try {
                const response = await fetch('/api/image_paths');
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                
                this.imageData = data.image_paths;
                this.totalImages = Object.keys(this.imageData).length;
            } catch (apiError) {
                console.warn('API failed, using mock data:', apiError);
                // Fallback to mock data for demo
                this.imageData = this.generateMockData();
                this.totalImages = Object.keys(this.imageData).length;
            }
            
            this.updateStatus(`Loaded ${this.totalImages} images`);
            this.loadBrowseMode();
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.updateStatus('Error loading data - using demo mode');
            this.imageData = this.generateMockData();
            this.totalImages = Object.keys(this.imageData).length;
            this.loadBrowseMode();
        } finally {
            this.showLoading(false);
        }
    }

    // Mock data for demo when API is not available
    generateMockData() {
        const mockData = {};
        for (let i = 0; i < 500; i++) {
            const videoNum = Math.floor(i / 100) + 1;
            const frameNum = String(i % 100).padStart(8, '0');
            mockData[i] = `images/keyframes/L21_V00${videoNum}/${frameNum}.jpg`;
        }
        return mockData;
    }

    // Enhanced search suggestion
    showSearchSuggestion(query) {
        // This could connect to a suggestion API
        // For now, just update status
        this.updateStatus(`Typing: "${query}"...`);
    }

    switchMode(mode) {
        // Update active button
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-mode="${mode}"]`).classList.add('active');

        // Hide all search controls
        document.querySelectorAll('.search-controls').forEach(control => {
            control.classList.add('hidden');
        });

        // Show relevant controls
        document.getElementById(`${mode}-controls`).classList.remove('hidden');

        this.currentMode = mode;

        // Load appropriate content
        switch (mode) {
            case 'browse':
                this.loadBrowseMode();
                break;
            case 'image-search':
                this.clearGrid();
                this.updateStatus('Enter image ID or upload image to search');
                break;
            case 'text-search':
                this.clearGrid();
                this.updateStatus('Enter text query to search');
                break;
        }
    }

    loadBrowseMode() {
        this.goToPage(this.currentPage);
    }

    goToPage(page) {
        if (page < 1) page = 1;
        const maxPage = Math.ceil(this.totalImages / this.imagesPerPage);
        if (page > maxPage) page = maxPage;

        this.currentPage = page;
        document.getElementById('page-input').value = page;
        document.getElementById('page-display').textContent = `Page ${page}`;

        // Update pagination buttons
        document.getElementById('prev-page-btn').disabled = (page <= 1);
        document.getElementById('next-page-btn').disabled = (page >= maxPage);

        this.displayImages(this.getBrowseImages(page));
        this.updateStatus(`Showing images ${(page-1) * this.imagesPerPage + 1} to ${Math.min(page * this.imagesPerPage, this.totalImages)}`);
    }

    getBrowseImages(page) {
        const start = (page - 1) * this.imagesPerPage;
        const end = start + this.imagesPerPage;
        const images = [];

        for (let i = start; i < end && i < this.totalImages; i++) {
            if (this.imageData[i]) {
                images.push({
                    id: i,
                    path: this.imageData[i]
                });
            }
        }

        return images;
    }

    // Enhanced search methods with caching
    async searchById(imageId) {
        const cacheKey = `id_${imageId}`;
        
        // Check cache first
        if (this.searchCache.has(cacheKey)) {
            this.searchResults = this.searchCache.get(cacheKey);
            this.displayImages(this.searchResults, true);
            this.updateStatus(`Found ${this.searchResults.length} similar images to ID ${imageId} (cached)`);
            return;
        }

        try {
            this.showLoading(true, `Searching similar images to ID ${imageId}...`);
            
            try {
                const response = await fetch('/api/image_search', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        image_id: imageId,
                        k: 200
                    })
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                
                this.searchResults = data.results.map(result => ({
                    id: result.id,
                    path: result.path,
                    score: result.score
                }));
            } catch (apiError) {
                console.warn('API search failed, using mock results:', apiError);
                this.searchResults = this.generateMockSearchResults(imageId);
            }

            // Cache results
            this.searchCache.set(cacheKey, this.searchResults);
            
            this.displayImages(this.searchResults, true);
            this.updateStatus(`Found ${this.searchResults.length} similar images to ID ${imageId}`);
        } catch (error) {
            console.error('Error searching by ID:', error);
            this.updateStatus('Error searching by ID');
        } finally {
            this.showLoading(false);
        }
    }

    async searchByText(query) {
        if (!query.trim()) return;

        const cacheKey = `text_${query}`;
        
        // Check cache first
        if (this.searchCache.has(cacheKey)) {
            this.searchResults = this.searchCache.get(cacheKey);
            this.displayImages(this.searchResults);
            this.updateStatus(`Found ${this.searchResults.length} images for query: "${query}" (cached)`);
            return;
        }

        try {
            this.showLoading(true, `Searching for: "${query}"...`);
            
            try {
                const response = await fetch('/api/text_search', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        query: query,
                        k: 200
                    })
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                
                this.searchResults = data.results.map(result => ({
                    id: result.id,
                    path: result.path,
                    score: result.score
                }));
            } catch (apiError) {
                console.warn('API text search failed, using mock results:', apiError);
                this.searchResults = this.generateMockSearchResults(0, query);
            }

            // Cache results
            this.searchCache.set(cacheKey, this.searchResults);

            this.displayImages(this.searchResults, true);
            this.updateStatus(`Found ${this.searchResults.length} images for query: "${query}"`);
        } catch (error) {
            console.error('Error searching by text:', error);
            this.updateStatus('Error searching by text');
        } finally {
            this.showLoading(false);
        }
    }

    // Mock search results for demo
    generateMockSearchResults(baseId, query = '') {
        const results = [];
        for (let i = 0; i < 20; i++) {
            const id = (baseId + i) % this.totalImages;
            results.push({
                id: id,
                path: this.imageData[id] || `images/keyframes/L21_V001/${String(id).padStart(8, '0')}.jpg`,
                score: Math.random()
            });
        }
        return results;
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('upload-preview');
                preview.innerHTML = `<img src="${e.target.result}" alt="Upload preview">`;
                document.getElementById('search-by-upload-btn').disabled = false;
            };
            reader.readAsDataURL(file);
        }
    }

    async searchByUpload() {
        const fileInput = document.getElementById('image-upload');
        const file = fileInput.files[0];
        
        if (!file) return;

        try {
            this.showLoading(true);
            const formData = new FormData();
            formData.append('image', file);
            formData.append('k', 200);

            const response = await fetch('/api/upload_search', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            this.searchResults = data.results.map(result => ({
                id: result.id,
                path: result.path
            }));

            this.displayImages(this.searchResults, true);
            this.updateStatus(`Found ${this.searchResults.length} similar images to uploaded image`);
        } catch (error) {
            console.error('Error searching by upload:', error);
            this.updateStatus('Error searching by upload');
        } finally {
            this.showLoading(false);
        }
    }

    // Enhanced image display with lazy loading and performance
    displayImages(images, isSearchResult = false) {
        const grid = document.getElementById('image-grid');
        
        // For search results, don't clear grid to allow "load more"
        if (!isSearchResult) {
            grid.innerHTML = '';
        }

        // Batch rendering for better performance
        const fragment = document.createDocumentFragment();
        
        images.forEach((image, index) => {
            const card = this.createImageCard(image, index);
            fragment.appendChild(card);
        });
        
        grid.appendChild(fragment);
        
        // Update status
        const totalShowing = grid.children.length;
        if (isSearchResult) {
            document.getElementById('page-info').textContent = `Showing ${totalShowing} search results`;
        } else {
            document.getElementById('page-info').textContent = `Showing ${images.length} images`;
        }
        
        // Initialize lazy loading
        this.initLazyLoading();
        
        // Hide/show pagination based on mode
        const pagination = document.getElementById('pagination');
        if (isSearchResult) {
            pagination.style.display = 'none';
        } else {
            pagination.style.display = 'flex';
        }
    }

    // Lazy loading for better performance
    initLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        imageObserver.unobserve(img);
                    }
                });
            });

            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        } else {
            // Fallback for older browsers
            document.querySelectorAll('img[data-src]').forEach(img => {
                img.src = img.dataset.src;
            });
        }
    }

    createImageCard(image, index) {
        const card = document.createElement('div');
        card.className = 'image-card';
        card.style.animationDelay = `${index * 0.05}s`; // Stagger animation

        const videoInfo = this.extractVideoInfo(image.path);
        const scoreDisplay = image.score ? `Score: ${image.score.toFixed(3)}` : '';
        
        // Ensure correct image path - add leading slash if not present
        const imagePath = image.path.startsWith('/') ? image.path : '/' + image.path;
        
        card.innerHTML = `
            <img data-src="${imagePath}" 
                 src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='200'%3E%3Crect width='100%25' height='100%25' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999'%3ELoading...%3C/text%3E%3C/svg%3E"
                 alt="Image ${image.id}" 
                 class="lazy"
                 loading="lazy"
                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'250\\' height=\\'200\\'%3E%3Crect width=\\'100%25\\' height=\\'100%25\\' fill=\\'%23ffcccc\\'/%3E%3Ctext x=\\'50%25\\' y=\\'50%25\\' text-anchor=\\'middle\\' dy=\\'.3em\\' fill=\\'%23cc0000\\'%3EError loading image%3C/text%3E%3C/svg%3E'">
            <div class="image-info">
                <div class="image-id">ID: ${image.id}</div>
                <div class="image-path">${image.path}</div>
                ${scoreDisplay ? `<div class="image-score">${scoreDisplay}</div>` : ''}
                <div class="video-info">Video: ${videoInfo.video} | Frame: ${videoInfo.frameNum}</div>
                <div class="image-actions">
                    <button class="btn-add" onclick="app.addToList(${image.id}, '${image.path}')">
                        ➕ Add to list
                    </button>
                    <button class="btn-similar" onclick="app.searchSimilar(${image.id})">
                        🔍 Similar
                    </button>
                    <button class="btn-view" onclick="app.viewImage('${image.path}')">
                        👁️ View
                    </button>
                </div>
            </div>
        `;

        return card;
    }

    extractVideoInfo(imagePath) {
        // imagePath: images/keyframes/<video>/<frame>.jpg
        const parts = imagePath.split('/');
        const video = parts[2] || '';
        const fileName = parts[parts.length - 1] || '';
        const frameNum = fileName.replace('.jpg', '').replace(/^0+/, '') || fileName.replace('.jpg', '');
        
        return { video, frameNum };
    }

    // Enhanced list management with persistence
    addToList(imageId, imagePath) {
        const videoInfo = this.extractVideoInfo(imagePath);
        const item = {
            id: imageId,
            video: videoInfo.video,
            frame: videoInfo.frameNum,
            path: imagePath,
            timestamp: Date.now()
        };

        // Check if already in list
        if (!this.selectedList.find(item => item.id === imageId)) {
            this.selectedList.push(item);
            this.updateSelectedList();
            this.saveSelectedList();
            this.updateStatus(`✅ Added image ID ${imageId} to list`);
            
            // Visual feedback
            this.showToast(`Added ID ${imageId} to list`, 'success');
        } else {
            this.showToast(`ID ${imageId} already in list`, 'warning');
        }
    }

    updateSelectedList() {
        const container = document.getElementById('selected-list');
        container.innerHTML = '';

        if (this.selectedList.length === 0) {
            container.innerHTML = '<div class="empty-list">No items selected</div>';
            return;
        }

        this.selectedList.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'selected-item';
            
            itemDiv.innerHTML = `
                <div class="selected-item-info">
                    <div class="item-number">${index + 1}.</div>
                    <div class="item-details">
                        <div>ID: <strong>${item.id}</strong></div>
                        <div>Video: ${item.video}</div>
                        <div>Frame: ${item.frame}</div>
                    </div>
                </div>
                <div class="selected-item-actions">
                    <button class="btn-view" onclick="app.viewClip(${item.id}, '${item.video}', '${item.frame}')">
                        🎥 Clip
                    </button>
                    <button class="btn-view" onclick="app.viewImage('${item.path}')">
                        👁️ View
                    </button>
                    <button class="btn-remove" onclick="app.removeFromList(${item.id})">
                        🗑️ Remove
                    </button>
                </div>
            `;
            
            container.appendChild(itemDiv);
        });
    }

    removeFromList(imageId) {
        this.selectedList = this.selectedList.filter(item => item.id !== imageId);
        this.updateSelectedList();
        this.saveSelectedList();
        this.updateStatus(`Removed image ID ${imageId} from list`);
        this.showToast(`Removed ID ${imageId}`, 'info');
    }

    clearSelectedList() {
        if (this.selectedList.length === 0) return;
        
        if (confirm('Are you sure you want to clear all selected items?')) {
            this.selectedList = [];
            this.updateSelectedList();
            this.saveSelectedList();
            this.updateStatus('Cleared selected list');
            this.showToast('List cleared', 'info');
        }
    }

    // New method to view individual images
    viewImage(imagePath) {
        window.open(`/view?keyframe=${encodeURIComponent(imagePath)}`, '_blank');
    }

    // Toast notifications for better UX
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Auto remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }

    closeModal() {
        document.getElementById('video-modal').classList.add('hidden');
        const videoPlayer = document.getElementById('video-player');
        videoPlayer.pause();
        videoPlayer.src = '';
    }

    searchSimilar(imageId) {
        // Switch to image search mode and search
        this.switchMode('image-search');
        document.getElementById('image-id-input').value = imageId;
        this.searchById(imageId);
    }

    viewImage(imagePath) {
        // Open frame viewer
        const viewUrl = `/view?keyframe=${encodeURIComponent(imagePath)}`;
        window.open(viewUrl, '_blank');
    }

    async viewClip(imageId, video, frame) {
        try {
            // Get actual video FPS from API
            let fps = 25; // Default fallback
            try {
                const response = await fetch(`/api/video_info/${video}`);
                if (response.ok) {
                    const videoInfo = await response.json();
                    fps = videoInfo.fps || 25;
                }
            } catch (error) {
                console.warn('Could not get video FPS, using default 25:', error);
            }
            
            const frameNum = parseInt(frame) || 0;
            const timeSeconds = frameNum / fps;
            
            // Open video player với vid route
            const videoUrl = `/vid?video=${video}&frame=${frame}&time=${timeSeconds}`;
            window.open(videoUrl, '_blank');
            
            this.updateStatus(`Opening video ${video} at frame ${frame} (${timeSeconds.toFixed(2)}s, ${fps.toFixed(2)} FPS)`);
        } catch (error) {
            console.error('Error opening video:', error);
            this.updateStatus('Error opening video');
        }
    }

    clearGrid() {
        document.getElementById('image-grid').innerHTML = '';
        document.getElementById('page-info').textContent = '';
        // Show pagination when clearing grid (for browse mode)
        document.getElementById('pagination').style.display = 'flex';
    }

    updateStatus(message) {
        document.getElementById('current-status').textContent = message;
    }

    // Enhanced loading with custom messages
    showLoading(show, message = 'Loading...') {
        const overlay = document.getElementById('loading-overlay');
        const loadingText = overlay.querySelector('p');
        
        if (show) {
            loadingText.textContent = message;
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }
}

// Initialize app when page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new ImageSearchApp();
    
    // Add CSS for animations and toast
    const style = document.createElement('style');
    style.textContent = `
        .image-card {
            animation: fadeInUp 0.5s ease forwards;
            opacity: 0;
            transform: translateY(20px);
        }
        
        @keyframes fadeInUp {
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .lazy {
            filter: blur(5px);
            transition: filter 0.3s;
        }
        
        .lazy[src] {
            filter: none;
        }
        
        .toast {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 4px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        }
        
        .toast.show {
            opacity: 1;
            transform: translateX(0);
        }
        
        .toast-success { background-color: #27ae60; }
        .toast-error { background-color: #e74c3c; }
        .toast-warning { background-color: #f39c12; }
        .toast-info { background-color: #3498db; }
        
        .empty-list {
            text-align: center;
            color: #7f8c8d;
            font-style: italic;
            padding: 1rem;
        }
        
        .selected-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .selected-item-info {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .item-number {
            font-weight: bold;
            color: var(--secondary-color);
        }
        
        .item-details {
            font-size: 12px;
        }
        
        .image-score {
            font-size: 11px;
            color: #7f8c8d;
            margin-bottom: 0.5rem;
        }
        
        .video-info {
            font-size: 11px;
            color: #2c3e50;
            margin-bottom: 0.5rem;
            font-weight: 500;
        }
    `;
    document.head.appendChild(style);
});
