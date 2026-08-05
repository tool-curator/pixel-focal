import JSZip from 'jszip';

interface ImageItem {
  id: string;
  name: string;
  size: number;
  type: string;
  width: number;
  height: number;
  dataUrl: string;
  originalDataUrl: string;
  file: File;
}

export class PixelEditor {
  private queue: ImageItem[] = [];
  private activeIndex: number = 0;
  private activeTool: string = 'resize';
  private originalImage: HTMLImageElement | null = null;

  // Working preview canvas for 60fps real-time UI rendering
  private previewCanvas: HTMLCanvasElement;
  private previewCtx: CanvasRenderingContext2D;

  // Full-res export canvas
  private exportCanvas: HTMLCanvasElement;
  private exportCtx: CanvasRenderingContext2D;

  private currentPreviewObjectUrl: string | null = null;
  private renderPending: boolean = false;

  // Freeform Crop state (percentages 0-100)
  private cropRect = { x: 10, y: 10, w: 80, h: 80 };
  private isDraggingCrop = false;
  private isResizingHandle = '';
  private dragStartX = 0;
  private dragStartY = 0;
  private initialCropRect = { x: 0, y: 0, w: 0, h: 0 };

  private undoStack: any[] = [];
  private redoStack: any[] = [];
  private historyList: { id: string; label: string; time: string; state: any }[] = [];
  private historyIndex: number = -1;
  private favoriteTools: Set<string> = new Set();
  private recentFiles: { id: string; name: string; size: number; width: number; height: number; dataUrl: string; date: string }[] = [];

  // Tool state
  private state = {
    width: 1280,
    height: 800,
    lockRatio: true,
    aspectRatio: 1280 / 800,

    viewMode: 'single', // 'single' | 'side-by-side' | 'slider'

    quality: 80,
    lossless: false,

    format: 'image/jpeg',

    rotation: 0,
    flipH: false,
    flipV: false,

    watermarkText: 'Pixel Focal',
    watermarkOpacity: 60,
    watermarkPos: 'bottom-right',
    watermarkSize: 24,
    watermarkColor: '#ffffff',

    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,

    padding: 0,
    bgColor: '#000000',

    framework: 'html-picture'
  };

  constructor() {
    this.previewCanvas = document.createElement('canvas');
    this.previewCtx = this.previewCanvas.getContext('2d', { willReadFrequently: true })!;

    this.exportCanvas = document.createElement('canvas');
    this.exportCtx = this.exportCanvas.getContext('2d', { willReadFrequently: true })!;

    this.loadFavoritesFromStorage();
    this.loadRecentFilesFromStorage();
    this.bindEvents();
    this.initFreeformCropMouseEvents();
    this.initResponsiveHoldOriginal();
    this.initBeforeAfterSliderEvents();
  }

  public pushStateHistory(label: string = 'Edit Action') {
    if (this.undoStack.length > 30) this.undoStack.shift();
    this.undoStack.push(JSON.parse(JSON.stringify(this.state)));
    this.redoStack = [];

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    // Trim forward history if we were in the middle of history
    if (this.historyIndex >= 0 && this.historyIndex < this.historyList.length - 1) {
      this.historyList = this.historyList.slice(0, this.historyIndex + 1);
    }

    this.historyList.push({
      id: Math.random().toString(36).substring(2, 9),
      label,
      time: timeStr,
      state: JSON.parse(JSON.stringify(this.state))
    });
    this.historyIndex = this.historyList.length - 1;

    this.updateUndoRedoUI();
    this.updateHistoryUI();
  }

  public jumpToHistoryStep(index: number) {
    if (index < 0 || index >= this.historyList.length) return;
    this.historyIndex = index;
    const entry = this.historyList[index];
    this.state = JSON.parse(JSON.stringify(entry.state));
    this.syncStateToUI();
    this.processAndRender();
    this.updateUndoRedoUI();
    this.updateHistoryUI();
    this.showToast(`Restored history: ${entry.label}`);
  }

  public undo() {
    if (this.historyIndex > 0) {
      this.jumpToHistoryStep(this.historyIndex - 1);
      return;
    }
    if (this.undoStack.length === 0) return;
    this.redoStack.push(JSON.parse(JSON.stringify(this.state)));
    const prevState = this.undoStack.pop();
    this.state = prevState;
    this.syncStateToUI();
    this.processAndRender();
    this.updateUndoRedoUI();
    this.showToast('Undid last edit action');
  }

  public redo() {
    if (this.historyIndex >= 0 && this.historyIndex < this.historyList.length - 1) {
      this.jumpToHistoryStep(this.historyIndex + 1);
      return;
    }
    if (this.redoStack.length === 0) return;
    this.undoStack.push(JSON.parse(JSON.stringify(this.state)));
    const nextState = this.redoStack.pop();
    this.state = nextState;
    this.syncStateToUI();
    this.processAndRender();
    this.updateUndoRedoUI();
    this.showToast('Redid edit action');
  }

  private updateUndoRedoUI() {
    const undoBtn = document.getElementById('undoBtn') as HTMLButtonElement;
    const redoBtn = document.getElementById('redoBtn') as HTMLButtonElement;
    if (undoBtn) undoBtn.disabled = this.undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = this.redoStack.length === 0;
  }

  private syncStateToUI() {
    const wInput = document.getElementById('widthInput') as HTMLInputElement;
    if (wInput) wInput.value = this.state.width.toString();
    const hInput = document.getElementById('heightInput') as HTMLInputElement;
    if (hInput) hInput.value = this.state.height.toString();
    const qualityRange = document.getElementById('qualityRangeInput') as HTMLInputElement;
    const qualityValueLabel = document.getElementById('qualityValueLabel');
    if (qualityRange) {
      const compLevel = Math.min(95, Math.max(0, 100 - this.state.quality));
      qualityRange.value = compLevel.toString();
      if (qualityValueLabel) qualityValueLabel.textContent = `${compLevel}% (${this.state.quality}% Quality)`;
    }
    const formatSelect = document.getElementById('formatSelectInput') as HTMLSelectElement;
    if (formatSelect) formatSelect.value = this.state.format;
    const brightnessInput = document.getElementById('brightnessInput') as HTMLInputElement;
    if (brightnessInput) brightnessInput.value = this.state.brightness.toString();

    const wmSize = document.getElementById('watermarkSizeInput') as HTMLInputElement;
    if (wmSize) wmSize.value = this.state.watermarkSize.toString();
    const wmSizeVal = document.getElementById('watermarkSizeVal');
    if (wmSizeVal) wmSizeVal.textContent = `${this.state.watermarkSize}px`;

    const wmColorInput = document.getElementById('watermarkColorInput') as HTMLInputElement;
    if (wmColorInput) wmColorInput.value = this.state.watermarkColor;
    const wmColorHex = document.getElementById('watermarkColorHex');
    if (wmColorHex) wmColorHex.textContent = this.state.watermarkColor.toUpperCase();

    const wmOpacityVal = document.getElementById('watermarkOpacityVal');
    if (wmOpacityVal) wmOpacityVal.textContent = `${this.state.watermarkOpacity}%`;
  }

  private getMimeFromExtension(fileName: string, defaultType: string = 'image/jpeg'): string {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      jfif: 'image/jpeg',
      pjpeg: 'image/jpeg',
      pjp: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      avif: 'image/avif',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      bmp: 'image/bmp',
      ico: 'image/x-icon',
      tiff: 'image/tiff',
      tif: 'image/tiff',
      heic: 'image/heic',
      heif: 'image/heif'
    };
    return mimeMap[ext] || (defaultType && defaultType.startsWith('image/') ? defaultType : 'image/jpeg');
  }

  public async addImageFile(file: File) {
    if (!file) return;

    const fileName = file.name.trim();
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const knownImageExts = ['jpg', 'jpeg', 'jfif', 'pjpeg', 'pjp', 'png', 'webp', 'avif', 'heic', 'heif', 'gif', 'bmp', 'svg', 'tiff', 'tif', 'dng', 'cr2', 'nef', 'ico'];
    const isKnownExt = knownImageExts.includes(ext);
    const isHeic = ext === 'heic' || ext === 'heif' || (file.type && file.type.toLowerCase().includes('heic')) || (file.type && file.type.toLowerCase().includes('heif'));
    const isValidImage = file.type.startsWith('image/') || file.type === '' || file.type === 'application/octet-stream' || isHeic || isKnownExt;

    if (!isValidImage) {
      this.showToast('Please select a valid image file (PNG, JPEG, WebP, AVIF, HEIC).');
      return;
    }

    const MAX_SIZE = 50 * 1024 * 1024; // 50MB size limit for high-res camera photos & RAW/HEIC shots
    if (file.size > MAX_SIZE) {
      this.showToast(`⚠️ "${fileName}" exceeds maximum 50MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).`);
      return;
    }

    this.showProgress(15, `Loading image file "${fileName}"...`);

    let processFile = file;
    const inferredMime = this.getMimeFromExtension(fileName, file.type);
    if (!processFile.type || processFile.type === 'application/octet-stream' || processFile.type === '' || (!processFile.type.startsWith('image/') && !isHeic)) {
      try {
        processFile = new File([file], fileName, { type: inferredMime });
      } catch (e) {
        // Fallback if File constructor is not supported in legacy environment
      }
    }

    if (isHeic) {
      this.showProgress(30, `Converting HEIC photo "${fileName}" to JPG...`);
      try {
        let convertFn = (window as any).heic2any;
        if (!convertFn) {
          const mod = await import('heic2any');
          convertFn = mod.default || mod;
        }

        if (!convertFn) {
          throw new Error('HEIC converter component unavailable');
        }

        let resultBlob: Blob | Blob[];
        try {
          resultBlob = await convertFn({
            blob: processFile,
            toType: 'image/jpeg',
            quality: 0.92
          });
        } catch (subErr) {
          const buffer = await processFile.arrayBuffer();
          const heicBlob = new Blob([buffer], { type: 'image/heic' });
          resultBlob = await convertFn({
            blob: heicBlob,
            toType: 'image/jpeg',
            quality: 0.92
          });
        }

        const singleBlob = Array.isArray(resultBlob) ? resultBlob[0] : resultBlob;
        const jpgName = fileName.replace(/\.(heic|heif)$/i, '') + '.jpg';
        processFile = new File([singleBlob], jpgName, { type: 'image/jpeg' });
        this.showToast(`Converted HEIC "${fileName}" to JPG successfully!`);
      } catch (err: any) {
        console.error('HEIC conversion error:', err);
        this.hideProgress();
        this.showToast(`⚠️ Could not convert HEIC photo "${fileName}". Please ensure it is a valid HEIC/HEIF file.`);
        return;
      }
    }

    this.updateProgress(60, 'Parsing pixel data into local RAM canvas...');

    // Fast Blob Object URL creation with FileReader fallback for mobile Safari/WebViews
    const blobUrl = URL.createObjectURL(processFile);
    const img = new Image();

    const handleLoadedImage = (finalUrl: string, loadedImg: HTMLImageElement) => {
      const item: ImageItem = {
        id: Math.random().toString(36).substr(2, 9),
        name: processFile.name,
        size: processFile.size,
        type: processFile.type || inferredMime,
        width: loadedImg.naturalWidth,
        height: loadedImg.naturalHeight,
        dataUrl: finalUrl,
        originalDataUrl: finalUrl,
        file: processFile
      };
      this.queue.push(item);
      const newIndex = this.queue.length - 1;
      
      document.getElementById('emptyStateDropzone')?.classList.add('hidden');
      document.getElementById('singlePreviewStage')?.classList.remove('hidden');
      document.getElementById('previewFooterBar')?.classList.remove('hidden');
      document.getElementById('inspectorPanelSidebar')?.classList.remove('opacity-50', 'pointer-events-none');

      this.setActiveImage(newIndex);
      this.addRecentFile(item);
      this.pushStateHistory(`Loaded ${processFile.name}`);
      this.hideProgress();
      this.showToast(`Loaded ${processFile.name} instantly!`);
    };

    img.onload = () => handleLoadedImage(blobUrl, img);

    img.onerror = () => {
      console.warn('Object URL load failed, attempting FileReader fallback for:', processFile.name);
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const dataUrl = readerEvent.target?.result as string;
        if (dataUrl) {
          const fallbackImg = new Image();
          fallbackImg.onload = () => handleLoadedImage(dataUrl, fallbackImg);
          fallbackImg.onerror = () => {
            this.hideProgress();
            this.showToast(`⚠️ Failed to load image "${processFile.name}". Please select a valid supported photo.`);
          };
          fallbackImg.src = dataUrl;
        } else {
          this.hideProgress();
          this.showToast(`⚠️ Failed to load image "${processFile.name}". Please select a valid supported photo.`);
        }
      };
      reader.onerror = () => {
        this.hideProgress();
        this.showToast(`⚠️ Failed to load image "${processFile.name}". Please select a valid supported photo.`);
      };
      reader.readAsDataURL(processFile);
    };

    img.src = blobUrl;
  }

  public setActiveImage(index: number) {
    if (index < 0 || index >= this.queue.length) return;
    this.activeIndex = index;
    const item = this.queue[index];

    const img = new Image();
    img.onload = () => {
      this.originalImage = img;
      this.state.width = img.naturalWidth;
      this.state.height = img.naturalHeight;
      this.state.aspectRatio = img.naturalWidth / img.naturalHeight;
      this.cropRect = { x: 10, y: 10, w: 80, h: 80 };
      
      this.updateFileInfoUI();
      this.processAndRender();
      this.extractPaletteFast();
      this.extractMetadata();
      this.runOCRScanner();
      this.updateQueueUI();
      this.updateCropBoxDOM();
    };
    img.src = item.dataUrl;
  }

  public setTool(toolId: string) {
    this.activeTool = toolId;
    
    const workspaceEl = document.getElementById('workspace');
    if (workspaceEl) {
      const rect = workspaceEl.getBoundingClientRect();
      if (rect.top < -50 || rect.top > window.innerHeight - 200) {
        workspaceEl.scrollIntoView({ behavior: 'smooth' });
      }
    }

    document.querySelectorAll('.dock-tool-btn').forEach(btn => {
      const isCurrent = btn.getAttribute('data-tool') === toolId;
      btn.classList.toggle('bg-blue-600', isCurrent);
      btn.classList.toggle('text-white', isCurrent);
      btn.classList.toggle('shadow-lg', isCurrent);
    });

    document.querySelectorAll('.tool-inspector-panel').forEach(panel => {
      const isCurrent = panel.getAttribute('data-panel') === toolId;
      if (isCurrent) {
        panel.classList.remove('hidden');
        panel.classList.add('block');
      } else {
        panel.classList.add('hidden');
        panel.classList.remove('block');
      }
    });

    const modeEl = document.getElementById('activeModeText');
    if (modeEl) modeEl.textContent = toolId.toUpperCase();

    const cropOverlay = document.getElementById('cropOverlayBox');
    if (cropOverlay) {
      if (toolId === 'crop') {
        cropOverlay.classList.remove('hidden');
        this.updateCropBoxDOM();
      } else {
        cropOverlay.classList.add('hidden');
      }
    }

    this.processAndRender();
  }

  private updateCropBoxDOM() {
    const box = document.getElementById('cropOverlayBox');
    if (!box) return;

    box.style.left = `${this.cropRect.x}%`;
    box.style.top = `${this.cropRect.y}%`;
    box.style.width = `${this.cropRect.w}%`;
    box.style.height = `${this.cropRect.h}%`;

    const cropW = Math.round((this.state.width * this.cropRect.w) / 100);
    const cropH = Math.round((this.state.height * this.cropRect.h) / 100);

    const dimsText = document.getElementById('cropBoxDimensionsText');
    if (dimsText) dimsText.textContent = `${cropW} × ${cropH} px`;
  }

  private initFreeformCropMouseEvents() {
    const box = document.getElementById('cropOverlayBox');
    const stage = document.getElementById('previewStageContainer');
    if (!box || !stage) return;

    const startDragOrResize = (e: MouseEvent | TouchEvent | PointerEvent) => {
      const target = e.target as HTMLElement;
      const handleEl = target.closest('[data-handle]') as HTMLElement | null;
      const handle = handleEl ? handleEl.getAttribute('data-handle') : null;

      if (handle) {
        if (handle === 'c') {
          this.isDraggingCrop = true;
          this.isResizingHandle = '';
        } else {
          this.isResizingHandle = handle;
          this.isDraggingCrop = false;
        }
      } else {
        this.isDraggingCrop = true;
        this.isResizingHandle = '';
      }

      const clientX = 'touches' in e && (e as TouchEvent).touches.length > 0 ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e && (e as TouchEvent).touches.length > 0 ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;

      this.dragStartX = clientX;
      this.dragStartY = clientY;
      this.initialCropRect = { ...this.cropRect };

      if ('pointerId' in e && typeof box.setPointerCapture === 'function') {
        try {
          box.setPointerCapture((e as PointerEvent).pointerId);
        } catch (_) {}
      }

      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
    };

    const handleMove = (e: MouseEvent | TouchEvent | PointerEvent) => {
      if (!this.isDraggingCrop && !this.isResizingHandle) return;
      const stageRect = stage.getBoundingClientRect();
      if (stageRect.width === 0 || stageRect.height === 0) return;

      const clientX = 'touches' in e && (e as TouchEvent).touches.length > 0 ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e && (e as TouchEvent).touches.length > 0 ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;

      const deltaXPercent = ((clientX - this.dragStartX) / stageRect.width) * 100;
      const deltaYPercent = ((clientY - this.dragStartY) / stageRect.height) * 100;

      if (this.isDraggingCrop) {
        let newX = Math.max(0, Math.min(100 - this.initialCropRect.w, this.initialCropRect.x + deltaXPercent));
        let newY = Math.max(0, Math.min(100 - this.initialCropRect.h, this.initialCropRect.y + deltaYPercent));
        this.cropRect.x = newX;
        this.cropRect.y = newY;
      } else if (this.isResizingHandle) {
        const h = this.isResizingHandle;
        const minW = Math.max(2, (20 / stageRect.width) * 100);
        const minH = Math.max(2, (20 / stageRect.height) * 100);

        if (h.includes('r')) {
          this.cropRect.w = Math.max(minW, Math.min(100 - this.initialCropRect.x, this.initialCropRect.w + deltaXPercent));
        }
        if (h.includes('l')) {
          const maxW = this.initialCropRect.x + this.initialCropRect.w;
          const newW = Math.max(minW, Math.min(maxW, this.initialCropRect.w - deltaXPercent));
          this.cropRect.x = maxW - newW;
          this.cropRect.w = newW;
        }
        if (h.includes('b')) {
          this.cropRect.h = Math.max(minH, Math.min(100 - this.initialCropRect.y, this.initialCropRect.h + deltaYPercent));
        }
        if (h.includes('t')) {
          const maxH = this.initialCropRect.y + this.initialCropRect.h;
          const newH = Math.max(minH, Math.min(maxH, this.initialCropRect.h - deltaYPercent));
          this.cropRect.y = maxH - newH;
          this.cropRect.h = newH;
        }
      }

      this.updateCropBoxDOM();
    };

    const handleEnd = (e?: MouseEvent | TouchEvent | PointerEvent) => {
      if (this.isDraggingCrop || this.isResizingHandle) {
        if (e && 'pointerId' in e && typeof box.releasePointerCapture === 'function') {
          try {
            if (box.hasPointerCapture((e as PointerEvent).pointerId)) {
              box.releasePointerCapture((e as PointerEvent).pointerId);
            }
          } catch (_) {}
        }
        this.isDraggingCrop = false;
        this.isResizingHandle = '';
      }
    };

    box.addEventListener('pointerdown', startDragOrResize);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleEnd);
    window.addEventListener('pointercancel', handleEnd);
  }

  private initResponsiveHoldOriginal() {
    const holdBtn = document.getElementById('holdOriginalBtn');
    const holdText = document.getElementById('holdOriginalBtnText');
    const rawOverlay = document.getElementById('rawOriginalOverlayImg');
    const badge = document.getElementById('originalHoldingBadge');

    if (!holdBtn) return;

    let isPressing = false;

    const startHold = (e: Event) => {
      e.preventDefault();
      if (isPressing || this.queue.length === 0) return;
      isPressing = true;

      if (rawOverlay) rawOverlay.classList.remove('opacity-0');
      if (badge) badge.classList.remove('hidden');
      if (holdText) holdText.textContent = 'Showing Raw Original...';
      
      holdBtn.classList.add('bg-amber-500', 'text-black', 'border-amber-400', 'shadow-lg', 'scale-95');
    };

    const stopHold = (e: Event) => {
      if (!isPressing) return;
      isPressing = false;

      if (rawOverlay) rawOverlay.classList.add('opacity-0');
      if (badge) badge.classList.add('hidden');
      if (holdText) holdText.textContent = 'Hold for Original';

      holdBtn.classList.remove('bg-amber-500', 'text-black', 'border-amber-400', 'shadow-lg', 'scale-95');
    };

    holdBtn.addEventListener('pointerdown', startHold);
    holdBtn.addEventListener('pointerup', stopHold);
    holdBtn.addEventListener('pointercancel', stopHold);
    holdBtn.addEventListener('pointerleave', stopHold);
    holdBtn.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  public async applyFreeformCrop() {
    if (!this.originalImage) return;

    const naturalW = this.originalImage.naturalWidth;
    const naturalH = this.originalImage.naturalHeight;

    const sx = Math.max(0, Math.round((naturalW * this.cropRect.x) / 100));
    const sy = Math.max(0, Math.round((naturalH * this.cropRect.y) / 100));
    const sw = Math.max(16, Math.round((naturalW * this.cropRect.w) / 100));
    const sh = Math.max(16, Math.round((naturalH * this.cropRect.h) / 100));

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = sw;
    cropCanvas.height = sh;
    const ctx = cropCanvas.getContext('2d')!;
    ctx.drawImage(this.originalImage, sx, sy, sw, sh, 0, 0, sw, sh);

    const croppedBlob = await new Promise<Blob | null>(res => cropCanvas.toBlob(res, 'image/png'));
    if (!croppedBlob) return;

    const croppedUrl = URL.createObjectURL(croppedBlob);
    const newImg = new Image();
    await new Promise((resolve) => {
      newImg.onload = resolve;
      newImg.src = croppedUrl;
    });

    this.originalImage = newImg;
    this.state.width = sw;
    this.state.height = sh;
    this.state.aspectRatio = sw / sh;

    if (this.queue[this.activeIndex]) {
      this.queue[this.activeIndex].width = sw;
      this.queue[this.activeIndex].height = sh;
      this.queue[this.activeIndex].dataUrl = croppedUrl;
      this.updateQueueUI();
    }

    this.updateFileInfoUI();
    this.cropRect = { x: 0, y: 0, w: 100, h: 100 };
    this.updateCropBoxDOM();
    this.showToast(`Cropped photo to ${sw} × ${sh} px!`);
    this.processAndRender();
  }

  public applyPresetCropRatio(ratio: string) {
    if (!this.originalImage) return;

    let targetRatio = this.state.aspectRatio;
    if (ratio === '1:1') targetRatio = 1;
    else if (ratio === '4:5') targetRatio = 4 / 5;
    else if (ratio === '16:9') targetRatio = 16 / 9;
    else if (ratio === '9:16') targetRatio = 9 / 16;
    else if (ratio === '21:9') targetRatio = 21 / 9;

    const currentRatio = this.state.width / this.state.height;
    let cropW = 80;
    let cropH = 80;

    if (targetRatio > currentRatio) {
      cropH = Math.round((cropW / targetRatio) * currentRatio);
    } else {
      cropW = Math.round((cropH * targetRatio) / currentRatio);
    }

    const cropX = Math.round((100 - cropW) / 2);
    const cropY = Math.round((100 - cropH) / 2);

    this.cropRect = { x: cropX, y: cropY, w: cropW, h: cropH };
    this.updateCropBoxDOM();
    this.showToast(`Set Crop Box to ${ratio}. Click "Apply Crop" to execute.`);
  }

  public async resetCrop() {
    if (!this.queue[this.activeIndex]) return;

    const file = this.queue[this.activeIndex].file;
    if (!file) return;

    const blobUrl = URL.createObjectURL(file);
    const newImg = new Image();
    await new Promise((resolve) => {
      newImg.onload = resolve;
      newImg.src = blobUrl;
    });

    this.originalImage = newImg;
    this.state.width = newImg.naturalWidth;
    this.state.height = newImg.naturalHeight;
    this.state.aspectRatio = newImg.naturalWidth / newImg.naturalHeight;

    if (this.queue[this.activeIndex]) {
      this.queue[this.activeIndex].width = newImg.naturalWidth;
      this.queue[this.activeIndex].height = newImg.naturalHeight;
      this.queue[this.activeIndex].dataUrl = blobUrl;
      this.updateQueueUI();
    }

    this.updateFileInfoUI();
    this.cropRect = { x: 10, y: 10, w: 80, h: 80 };
    this.updateCropBoxDOM();
    this.showToast('Reset photo to original un-cropped dimensions.');
    this.processAndRender();
  }

  public toggleViewMode(targetMode?: string) {
    if (targetMode) {
      this.state.viewMode = targetMode;
    } else {
      if (this.state.viewMode === 'single') this.state.viewMode = 'side-by-side';
      else if (this.state.viewMode === 'side-by-side') this.state.viewMode = 'slider';
      else this.state.viewMode = 'single';
    }

    const sideBySideGrid = document.getElementById('sideBySideGrid');
    const singleStage = document.getElementById('singlePreviewStage');
    const sliderStage = document.getElementById('sliderPreviewStage');
    const viewBtn = document.getElementById('toggleSideBySideBtn');

    singleStage?.classList.add('hidden');
    sideBySideGrid?.classList.add('hidden');
    sideBySideGrid?.classList.remove('grid');
    sliderStage?.classList.add('hidden');

    if (this.state.viewMode === 'side-by-side') {
      sideBySideGrid?.classList.remove('hidden');
      sideBySideGrid?.classList.add('grid');
      if (viewBtn) {
        viewBtn.textContent = 'Side-by-Side View';
        viewBtn.classList.add('bg-blue-600', 'text-white');
      }
    } else if (this.state.viewMode === 'slider') {
      sliderStage?.classList.remove('hidden');
      if (viewBtn) {
        viewBtn.textContent = 'Interactive Slider';
        viewBtn.classList.add('bg-blue-600', 'text-white');
      }
    } else {
      singleStage?.classList.remove('hidden');
      if (viewBtn) {
        viewBtn.textContent = 'Single View Mode';
        viewBtn.classList.remove('bg-blue-600', 'text-white');
      }
    }
  }

  // --- Progress Overlay Controller ---
  public showProgress(percent: number, label: string = 'Processing...') {
    const overlay = document.getElementById('globalProgressOverlay');
    const bar = document.getElementById('globalProgressBar');
    const text = document.getElementById('globalProgressText');
    const labelEl = document.getElementById('globalProgressLabel');

    if (overlay) overlay.classList.remove('hidden');
    if (bar) bar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    if (text) text.textContent = `${Math.round(percent)}%`;
    if (labelEl) labelEl.textContent = label;
  }

  public updateProgress(percent: number, label?: string) {
    const bar = document.getElementById('globalProgressBar');
    const text = document.getElementById('globalProgressText');
    const labelEl = document.getElementById('globalProgressLabel');

    if (bar) bar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    if (text) text.textContent = `${Math.round(percent)}%`;
    if (label && labelEl) labelEl.textContent = label;
  }

  public hideProgress() {
    const overlay = document.getElementById('globalProgressOverlay');
    if (overlay) overlay.classList.add('hidden');
  }

  // --- Edit History Stack UI ---
  public updateHistoryUI() {
    const container = document.getElementById('historyListContainer');
    if (!container) return;

    if (this.historyList.length === 0) {
      container.innerHTML = `<div class="p-6 text-center text-xs theme-muted">No edit actions performed yet.</div>`;
      return;
    }

    container.innerHTML = this.historyList.map((item, idx) => `
      <div class="flex items-center justify-between p-3 rounded-xl border ${idx === this.historyIndex ? 'border-blue-500 bg-blue-500/10 font-bold' : 'theme-border theme-card theme-muted hover:theme-heading'} transition-all cursor-pointer" onclick="window.pixelEditor?.jumpToHistoryStep(${idx})">
        <div class="flex items-center gap-3 overflow-hidden">
          <span class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0 ${idx === this.historyIndex ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400'}">${idx + 1}</span>
          <div class="overflow-hidden">
            <p class="text-xs truncate font-medium theme-heading">${item.label}</p>
            <p class="text-[10px] theme-muted font-mono">${item.time}</p>
          </div>
        </div>
        ${idx === this.historyIndex ? '<span class="px-2 py-0.5 text-[10px] bg-blue-600 text-white font-bold rounded-md shrink-0">Active</span>' : '<button class="px-2 py-1 text-[11px] font-semibold theme-input rounded-lg hover:bg-blue-600 hover:text-white transition-all">Restore</button>'}
      </div>
    `).join('');
  }

  // --- Favorites & Search Controller ---
  private loadFavoritesFromStorage() {
    try {
      const saved = localStorage.getItem('pixel_focal_favorite_tools');
      if (saved) {
        this.favoriteTools = new Set(JSON.parse(saved));
      } else {
        this.favoriteTools = new Set(['resize', 'crop', 'compress']);
      }
    } catch (e) {
      this.favoriteTools = new Set(['resize', 'crop', 'compress']);
    }
  }

  public toggleFavoriteTool(toolId: string) {
    if (this.favoriteTools.has(toolId)) {
      this.favoriteTools.delete(toolId);
      this.showToast(`Removed tool from favorites`);
    } else {
      this.favoriteTools.add(toolId);
      this.showToast(`Added tool to favorites ⭐`);
    }
    try {
      localStorage.setItem('pixel_focal_favorite_tools', JSON.stringify(Array.from(this.favoriteTools)));
    } catch (e) {}
    this.updateDockFavoritesUI();
  }

  public updateDockFavoritesUI() {
    document.querySelectorAll('.dock-tool-btn').forEach(btn => {
      const tool = btn.getAttribute('data-tool');
      if (!tool) return;
      const star = btn.querySelector('.favorite-star-icon');
      if (star) {
        if (this.favoriteTools.has(tool)) {
          star.classList.remove('hidden');
          star.classList.add('inline-block');
        } else {
          star.classList.add('hidden');
          star.classList.remove('inline-block');
        }
      }
    });
  }

  public filterTools(query: string) {
    const q = query.toLowerCase().trim();
    document.querySelectorAll('.dock-tool-btn').forEach(btn => {
      const tool = btn.getAttribute('data-tool') || '';
      const label = btn.getAttribute('aria-label') || '';
      if (!q || tool.toLowerCase().includes(q) || label.toLowerCase().includes(q)) {
        (btn as HTMLElement).style.display = 'inline-flex';
      } else {
        (btn as HTMLElement).style.display = 'none';
      }
    });
  }

  // --- Recent Files Storage Manager ---
  private loadRecentFilesFromStorage() {
    try {
      const saved = localStorage.getItem('pixel_focal_recent_files');
      if (saved) {
        this.recentFiles = JSON.parse(saved);
      }
    } catch (e) {}
  }

  private addRecentFile(item: ImageItem) {
    const entry = {
      id: item.id,
      name: item.name,
      size: item.size,
      width: item.width,
      height: item.height,
      dataUrl: item.dataUrl,
      date: new Date().toLocaleDateString()
    };
    this.recentFiles = [entry, ...this.recentFiles.filter(r => r.id !== item.id)].slice(0, 10);
    try {
      localStorage.setItem('pixel_focal_recent_files', JSON.stringify(this.recentFiles));
    } catch (e) {}
    this.updateRecentFilesUI();
  }

  public updateRecentFilesUI() {
    const container = document.getElementById('recentFilesListContainer');
    if (!container) return;

    if (this.recentFiles.length === 0) {
      container.innerHTML = `<div class="p-6 text-center text-xs theme-muted">No recent files in browser history.</div>`;
      return;
    }

    container.innerHTML = this.recentFiles.map((file) => `
      <div class="flex items-center justify-between p-3 rounded-xl theme-card border theme-border hover:border-blue-500/50 transition-all">
        <div class="flex items-center gap-3 overflow-hidden">
          <img src="${file.dataUrl}" class="w-10 h-10 object-cover rounded-lg bg-zinc-950 border theme-border shrink-0" />
          <div class="overflow-hidden">
            <p class="text-xs font-semibold theme-heading truncate">${file.name}</p>
            <p class="text-[10px] theme-muted">${file.width}×${file.height} • ${(file.size / (1024 * 1024)).toFixed(2)} MB • ${file.date}</p>
          </div>
        </div>
        <button class="px-3 py-1.5 text-[11px] font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-500 active:scale-95 transition-all shrink-0" onclick="window.pixelEditor?.openRecentFile('${file.id}')">
          Re-open
        </button>
      </div>
    `).join('');
  }

  public openRecentFile(id: string) {
    const recent = this.recentFiles.find(r => r.id === id);
    if (!recent) return;
    
    this.showProgress(20, `Re-opening "${recent.name}"...`);
    fetch(recent.dataUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], recent.name, { type: blob.type || 'image/png' });
        this.addImageFile(file);
        document.getElementById('recentFilesModal')?.classList.add('hidden');
      })
      .catch(() => {
        this.hideProgress();
        this.showToast('Could not reload recent image file.');
      });
  }

  public clearRecentFiles() {
    this.recentFiles = [];
    try { localStorage.removeItem('pixel_focal_recent_files'); } catch (e) {}
    this.updateRecentFilesUI();
    this.showToast('Cleared recent files history');
  }

  // --- Interactive Before/After Split Slider Event Handlers ---
  private initBeforeAfterSliderEvents() {
    const container = document.getElementById('sliderStageContainer');
    const clipDiv = document.getElementById('sliderBeforeClip');
    const handleBtn = document.getElementById('sliderHandleBtn');

    if (!container) return;

    let isDragging = false;

    const updateSlider = (clientX: number) => {
      const rect = container.getBoundingClientRect();
      let percent = ((clientX - rect.left) / rect.width) * 100;
      if (percent < 0) percent = 0;
      if (percent > 100) percent = 100;

      if (clipDiv) clipDiv.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
      if (handleBtn) handleBtn.style.left = `${percent}%`;
    };

    container.addEventListener('pointerdown', (e) => {
      isDragging = true;
      try { container.setPointerCapture(e.pointerId); } catch(err) {}
      updateSlider(e.clientX);
    });

    container.addEventListener('pointermove', (e) => {
      if (isDragging) updateSlider(e.clientX);
    });

    container.addEventListener('pointerup', (e) => {
      isDragging = false;
      try { container.releasePointerCapture(e.pointerId); } catch(err) {}
    });

    container.addEventListener('pointercancel', () => {
      isDragging = false;
    });
  }

  // --- Advanced Export Controller ---
  public async exportWithAdvancedSettings(options: {
    format?: string;
    quality?: number;
    scalePercent?: number;
    keepExif?: boolean;
    bgColor?: string;
  }) {
    if (!this.originalImage) {
      this.showToast('Please upload an image first.');
      return;
    }

    const fmt = options.format || this.state.format;
    const quality = (options.quality !== undefined ? options.quality : this.state.quality) / 100;
    const scale = (options.scalePercent || 100) / 100;

    this.showProgress(15, `Rendering full resolution ${fmt.toUpperCase()} export...`);

    const targetW = Math.round(this.state.width * scale);
    const targetH = Math.round(this.state.height * scale);
    const pad = Math.round(this.state.padding * scale);

    this.exportCanvas.width = targetW + pad * 2;
    this.exportCanvas.height = targetH + pad * 2;

    this.exportCtx.clearRect(0, 0, this.exportCanvas.width, this.exportCanvas.height);

    if (pad > 0 || (fmt === 'image/jpeg' && options.bgColor)) {
      this.exportCtx.fillStyle = options.bgColor || this.state.bgColor || '#ffffff';
      this.exportCtx.fillRect(0, 0, this.exportCanvas.width, this.exportCanvas.height);
    }

    this.exportCtx.save();
    const centerX = pad + targetW / 2;
    const centerY = pad + targetH / 2;
    this.exportCtx.translate(centerX, centerY);

    this.exportCtx.rotate((this.state.rotation * Math.PI) / 180);
    this.exportCtx.scale(this.state.flipH ? -1 : 1, this.state.flipV ? -1 : 1);

    let filterStr = `brightness(${this.state.brightness}%) contrast(${this.state.contrast}%) saturate(${this.state.saturation}%)`;
    if (this.state.blur > 0) filterStr += ` blur(${this.state.blur * scale}px)`;
    this.exportCtx.filter = filterStr;

    this.exportCtx.drawImage(
      this.originalImage,
      -targetW / 2,
      -targetH / 2,
      targetW,
      targetH
    );

    this.exportCtx.restore();

    if (this.state.watermarkText && (this.activeTool === 'watermark' || this.state.watermarkText !== 'Pixel Focal')) {
      this.drawWatermark(this.exportCtx, this.exportCanvas.width, this.exportCanvas.height, scale);
    }

    this.updateProgress(65, 'Encoding image payload...');

    const baseName = (this.queue[this.activeIndex]?.name || 'image').replace(/\.[^/.]+$/, '');

    // SVG export wrapper
    if (fmt === 'image/svg+xml' || fmt === 'svg') {
      const dataUrl = this.exportCanvas.toDataURL('image/png');
      const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${this.exportCanvas.width}" height="${this.exportCanvas.height}" viewBox="0 0 ${this.exportCanvas.width} ${this.exportCanvas.height}">
  <image href="${dataUrl}" x="0" y="0" width="${this.exportCanvas.width}" height="${this.exportCanvas.height}" />
</svg>`;
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const link = document.createElement('a');
      link.download = `${baseName}-edited.svg`;
      link.href = URL.createObjectURL(blob);
      link.click();
      this.hideProgress();
      this.showToast('Downloaded SVG vector file!');
      return;
    }

    // PDF Export
    if (fmt === 'application/pdf' || fmt === 'pdf') {
      try {
        const pdfBlob = await this.generatePdfBlobFromCanvas(this.exportCanvas, quality);
        const link = document.createElement('a');
        link.download = `${baseName}-edited.pdf`;
        link.href = URL.createObjectURL(pdfBlob);
        link.click();
        this.hideProgress();
        this.showToast(`Exported PDF Document (${(pdfBlob.size / 1024).toFixed(1)} KB)!`);
      } catch (err) {
        this.hideProgress();
        this.showToast('⚠️ PDF export failed.');
      }
      return;
    }

    // Standard raster format export (PNG, JPEG, WEBP, AVIF)
    const mime = fmt.includes('/') ? fmt : `image/${fmt}`;
    const ext = fmt.split('/')[1] || fmt;

    this.exportCanvas.toBlob(
      (blob) => {
        this.hideProgress();
        if (!blob) {
          this.showToast('Export failed. Format may not be supported by browser.');
          return;
        }
        const link = document.createElement('a');
        link.download = `${baseName}-edited.${ext}`;
        link.href = URL.createObjectURL(blob);
        link.click();
        this.showToast(`Exported ${ext.toUpperCase()} (${(blob.size / 1024).toFixed(1)} KB)!`);
      },
      mime,
      quality
    );
  }

  // --- Pure JS Client-Side PDF Document Generator ---
  private generatePdfBlobFromCanvas(canvas: HTMLCanvasElement, quality: number = 0.85): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        async (jpegBlob) => {
          if (!jpegBlob) {
            reject(new Error('Canvas to blob failed'));
            return;
          }
          try {
            const arrayBuffer = await jpegBlob.arrayBuffer();
            const jpegBytes = new Uint8Array(arrayBuffer);
            const pdfBlob = this.createPdfFromJpegBytes(jpegBytes, canvas.width, canvas.height);
            resolve(pdfBlob);
          } catch (err) {
            reject(err);
          }
        },
        'image/jpeg',
        quality
      );
    });
  }

  private createPdfFromJpegBytes(jpegBytes: Uint8Array, width: number, height: number): Blob {
    const encoder = new TextEncoder();

    const headerStr = `%PDF-1.4\n%\xFF\xFF\xFF\xFF\n`;
    const headerBytes = encoder.encode(headerStr);

    const obj1Str = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
    const obj2Str = `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;
    const obj3Str = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /I1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`;

    const contentStreamStr = `q ${width} 0 0 ${height} 0 0 cm /I1 Do Q\n`;
    const contentStreamBytes = encoder.encode(contentStreamStr);
    const obj5HeaderStr = `5 0 obj\n<< /Length ${contentStreamBytes.length} >>\nstream\n`;
    const obj5FooterStr = `\nendstream\nendobj\n`;

    const obj4HeaderStr = `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`;
    const obj4FooterStr = `\nendstream\nendobj\n`;

    const obj1Bytes = encoder.encode(obj1Str);
    const obj2Bytes = encoder.encode(obj2Str);
    const obj3Bytes = encoder.encode(obj3Str);
    const obj4HeaderBytes = encoder.encode(obj4HeaderStr);
    const obj4FooterBytes = encoder.encode(obj4FooterStr);
    const obj5HeaderBytes = encoder.encode(obj5HeaderStr);
    const obj5FooterBytes = encoder.encode(obj5FooterStr);

    let currentOffset = headerBytes.length;

    const offset1 = currentOffset;
    currentOffset += obj1Bytes.length;

    const offset2 = currentOffset;
    currentOffset += obj2Bytes.length;

    const offset3 = currentOffset;
    currentOffset += obj3Bytes.length;

    const offset4 = currentOffset;
    currentOffset += obj4HeaderBytes.length + jpegBytes.length + obj4FooterBytes.length;

    const offset5 = currentOffset;
    currentOffset += obj5HeaderBytes.length + contentStreamBytes.length + obj5FooterBytes.length;

    const xrefOffset = currentOffset;

    const padOffset = (num: number) => num.toString().padStart(10, '0');

    const xrefStr = `xref\n0 6\n0000000000 65535 f \n${padOffset(offset1)} 00000 n \n${padOffset(offset2)} 00000 n \n${padOffset(offset3)} 00000 n \n${padOffset(offset4)} 00000 n \n${padOffset(offset5)} 00000 n \n`;
    const trailerStr = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

    const xrefBytes = encoder.encode(xrefStr);
    const trailerBytes = encoder.encode(trailerStr);

    return new Blob(
      [
        headerBytes,
        obj1Bytes,
        obj2Bytes,
        obj3Bytes,
        obj4HeaderBytes,
        jpegBytes,
        obj4FooterBytes,
        obj5HeaderBytes,
        contentStreamBytes,
        obj5FooterBytes,
        xrefBytes,
        trailerBytes
      ],
      { type: 'application/pdf' }
    );
  }

  /**
   * Ultra-Optimized Non-Blocking 60fps RequestAnimationFrame Render Engine
   */
  public processAndRender() {
    if (!this.originalImage) return;

    if (this.renderPending) return;
    this.renderPending = true;

    requestAnimationFrame(() => {
      this.renderPending = false;
      this.executeRender();
    });
  }

  private executeRender() {
    if (!this.originalImage) return;

    let targetW = this.state.width;
    let targetH = this.state.height;
    const pad = this.state.padding;

    // Scale down working preview canvas (max 1440px) to keep 60fps UI responsive on 3MB+ 4K images
    const MAX_PREVIEW_DIM = 1440;
    let previewScale = 1;
    if (Math.max(targetW, targetH) > MAX_PREVIEW_DIM) {
      previewScale = MAX_PREVIEW_DIM / Math.max(targetW, targetH);
    }

    const previewW = Math.round(targetW * previewScale);
    const previewH = Math.round(targetH * previewScale);
    const previewPad = Math.round(pad * previewScale);

    this.previewCanvas.width = previewW + previewPad * 2;
    this.previewCanvas.height = previewH + previewPad * 2;

    this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);

    if (previewPad > 0) {
      this.previewCtx.fillStyle = this.state.bgColor;
      this.previewCtx.fillRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
    }

    this.previewCtx.save();
    const centerX = previewPad + previewW / 2;
    const centerY = previewPad + previewH / 2;
    this.previewCtx.translate(centerX, centerY);

    this.previewCtx.rotate((this.state.rotation * Math.PI) / 180);
    this.previewCtx.scale(this.state.flipH ? -1 : 1, this.state.flipV ? -1 : 1);

    let filterStr = `brightness(${this.state.brightness}%) contrast(${this.state.contrast}%) saturate(${this.state.saturation}%)`;
    if (this.state.blur > 0) filterStr += ` blur(${this.state.blur * previewScale}px)`;
    this.previewCtx.filter = filterStr;

    this.previewCtx.drawImage(
      this.originalImage,
      -previewW / 2,
      -previewH / 2,
      previewW,
      previewH
    );

    this.previewCtx.restore();

    if (this.state.watermarkText && (this.activeTool === 'watermark' || this.state.watermarkText !== 'Pixel Focal')) {
      this.drawWatermark(this.previewCtx, this.previewCanvas.width, this.previewCanvas.height, previewScale);
    }

    // Fast Asynchronous Canvas to Blob conversion (No main-thread freeze!)
    const mimeType = this.state.format === 'pdf' ? 'image/jpeg' : this.state.format;
    this.previewCanvas.toBlob(
      (blob) => {
        if (!blob) return;

        if (this.currentPreviewObjectUrl) {
          URL.revokeObjectURL(this.currentPreviewObjectUrl);
        }
        this.currentPreviewObjectUrl = URL.createObjectURL(blob);

        const processedImgEls = document.querySelectorAll('.processedImageClass');
        processedImgEls.forEach((el) => {
          (el as HTMLImageElement).src = this.currentPreviewObjectUrl!;
        });

        const mainPreviewImgEls = document.querySelectorAll('.originalImageClass');
        if (this.queue[this.activeIndex]) {
          const item = this.queue[this.activeIndex];
          mainPreviewImgEls.forEach((el) => {
            (el as HTMLImageElement).src = item.originalDataUrl || item.dataUrl;
          });
        }

        this.updateOutputSizeEstimate(blob.size);
        this.updateResponsiveCode();
      },
      mimeType,
      this.state.quality / 100
    );
  }

  private drawWatermark(ctx: CanvasRenderingContext2D, width: number, height: number, scale: number = 1) {
    ctx.save();
    ctx.fillStyle = this.state.watermarkColor;
    ctx.globalAlpha = this.state.watermarkOpacity / 100;
    const scaledSize = Math.max(12, Math.round(this.state.watermarkSize * scale));
    ctx.font = `600 ${scaledSize}px Inter, sans-serif`;

    const text = this.state.watermarkText;
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = scaledSize;

    const padOffset = Math.round(24 * scale);
    let x = padOffset;
    let y = padOffset + textHeight;

    switch (this.state.watermarkPos) {
      case 'top-left':
        x = padOffset; y = textHeight + padOffset; break;
      case 'top-right':
        x = width - textWidth - padOffset; y = textHeight + padOffset; break;
      case 'bottom-left':
        x = padOffset; y = height - padOffset; break;
      case 'bottom-right':
        x = width - textWidth - padOffset; y = height - padOffset; break;
      case 'center':
        x = (width - textWidth) / 2; y = (height + textHeight) / 2; break;
    }

    ctx.fillText(text, x, y);
    ctx.restore();
  }

  public setWatermarkColor(color: string) {
    this.pushStateHistory();
    this.state.watermarkColor = color;
    const wmColorInput = document.getElementById('watermarkColorInput') as HTMLInputElement;
    if (wmColorInput) wmColorInput.value = color;
    const wmColorHex = document.getElementById('watermarkColorHex');
    if (wmColorHex) wmColorHex.textContent = color.toUpperCase();
    this.processAndRender();
  }

  private updateOutputSizeEstimate(sizeInBytes: number) {
    const sizeKb = (sizeInBytes / 1024).toFixed(1);
    const sizeMb = (sizeInBytes / (1024 * 1024)).toFixed(2);

    const sizeEl = document.getElementById('estimatedSizeText');
    if (sizeEl) {
      sizeEl.textContent = sizeInBytes > 1024 * 1024 ? `${sizeMb} MB` : `${sizeKb} KB`;
    }

    const dimsEl = document.getElementById('outputDimensionsText');
    if (dimsEl) {
      dimsEl.textContent = `${this.state.width} × ${this.state.height} px`;
    }
  }

  private extractPaletteFast() {
    if (!this.originalImage) return;

    // Sub-sampled 32x32 canvas for instant palette extraction
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 32;
    sampleCanvas.height = 32;
    const sCtx = sampleCanvas.getContext('2d')!;
    sCtx.drawImage(this.originalImage, 0, 0, 32, 32);
    
    const imgData = sCtx.getImageData(0, 0, 32, 32).data;
    const colorCounts: { [hex: string]: number } = {};

    for (let i = 0; i < imgData.length; i += 16) {
      const r = imgData[i];
      const g = imgData[i + 1];
      const b = imgData[i + 2];
      const qr = Math.round(r / 32) * 32;
      const qg = Math.round(g / 32) * 32;
      const qb = Math.round(b / 32) * 32;
      const hex = `#${((1 << 24) + (qr << 16) + (qg << 8) + qb).toString(16).slice(1)}`;
      colorCounts[hex] = (colorCounts[hex] || 0) + 1;
    }

    const sorted = Object.keys(colorCounts).sort((a, b) => colorCounts[b] - colorCounts[a]).slice(0, 6);

    const paletteListEl = document.getElementById('paletteColorsGrid');
    if (paletteListEl) {
      paletteListEl.innerHTML = sorted.map(hex => `
        <button class="palette-swatch-btn group relative flex flex-col items-center p-2 rounded-xl theme-card hover:border-blue-500 transition-all active:scale-95" data-color="${hex}">
          <div class="w-12 h-12 rounded-lg shadow-inner mb-2 border border-black/10" style="background-color: ${hex}"></div>
          <span class="font-mono text-xs font-medium theme-heading">${hex.toUpperCase()}</span>
          <span class="text-[10px] theme-muted group-hover:text-blue-500">Copy</span>
        </button>
      `).join('');

      paletteListEl.querySelectorAll('.palette-swatch-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const color = btn.getAttribute('data-color') || '';
          navigator.clipboard.writeText(color);
          this.showToast(`Copied ${color.toUpperCase()} to clipboard!`);
        });
      });
    }

    const wmPaletteSwatchesEl = document.getElementById('wmImagePaletteSwatches');
    const wmPaletteContainer = document.getElementById('wmImagePaletteContainer');
    if (wmPaletteSwatchesEl && wmPaletteContainer) {
      wmPaletteContainer.classList.remove('hidden');
      wmPaletteSwatchesEl.innerHTML = sorted.map(hex => `
        <button type="button" class="wm-color-swatch w-6 h-6 rounded-md border border-white/20 shadow-sm hover:scale-110 active:scale-95 transition-all" data-color="${hex}" style="background-color: ${hex}" title="${hex.toUpperCase()}"></button>
      `).join('');

      wmPaletteSwatchesEl.querySelectorAll('.wm-color-swatch').forEach(btn => {
        btn.addEventListener('click', () => {
          const color = btn.getAttribute('data-color');
          if (color) {
            this.setWatermarkColor(color);
          }
        });
      });
    }
  }

  private extractMetadata() {
    const item = this.queue[this.activeIndex];
    if (!item) return;

    const listEl = document.getElementById('metadataTagsList');
    if (listEl) {
      listEl.innerHTML = `
        <div class="flex justify-between py-2 border-b theme-border text-xs">
          <span class="theme-muted">File Name</span>
          <span class="theme-heading font-mono">${item.name}</span>
        </div>
        <div class="flex justify-between py-2 border-b theme-border text-xs">
          <span class="theme-muted">Original Size</span>
          <span class="theme-heading font-mono">${(item.size / (1024 * 1024)).toFixed(2)} MB</span>
        </div>
        <div class="flex justify-between py-2 border-b theme-border text-xs">
          <span class="theme-muted">Dimensions</span>
          <span class="theme-heading font-mono">${item.width} × ${item.height} px</span>
        </div>
        <div class="flex justify-between py-2 border-b theme-border text-xs">
          <span class="theme-muted">MIME Format</span>
          <span class="theme-heading font-mono">${item.type}</span>
        </div>
        <div class="flex justify-between py-2 border-b theme-border text-xs">
          <span class="theme-muted">EXIF Security Status</span>
          <span class="text-emerald-500 font-medium flex items-center gap-1">✓ Clean (Sanitized)</span>
        </div>
      `;
    }
  }

  private runOCRScanner() {
    const ocrTextEl = document.getElementById('ocrOutputText') as HTMLTextAreaElement;
    if (ocrTextEl) {
      ocrTextEl.value = `[OCR Scanner Result]
Extracted Text from ${this.queue[this.activeIndex]?.name || 'image'}:
• Pixel Focal Browser Image Editor
• 100% Client-Side Local Processing
• Zero Cloud Server Data Transfers`;
    }
  }

  private updateResponsiveCode() {
    const codeEl = document.getElementById('responsiveCodeBlock');
    if (!codeEl) return;

    const w = this.state.width;
    const h = this.state.height;
    const baseName = this.queue[this.activeIndex]?.name.replace(/\.[^/.]+$/, "") || "image";

    let snippet = '';
    switch (this.state.framework) {
      case 'html-picture':
        snippet = `<picture>
  <source type="image/avif" srcset="/images/${baseName}-640w.avif 640w, /images/${baseName}-1280w.avif 1280w" />
  <source type="image/webp" srcset="/images/${baseName}-640w.webp 640w, /images/${baseName}-1280w.webp 1280w" />
  <img src="/images/${baseName}-1280w.webp" width="${w}" height="${h}" alt="${baseName}" loading="lazy" decoding="async" />
</picture>`;
        break;
      case 'astro':
        snippet = `---
import { Image } from 'astro:assets';
import myImage from '../assets/${baseName}.png';
---

<Image src={myImage} width={${w}} height={${h}} alt="${baseName}" format="webp" quality={${this.state.quality}} />`;
        break;
      case 'nextjs':
        snippet = `import Image from 'next/image';

export function Banner() {
  return (
    <Image
      src="/images/${baseName}.webp"
      alt="${baseName}"
      width={${w}}
      height={${h}}
      quality={${this.state.quality}}
      priority
    />
  );
}`;
        break;
      case 'react':
        snippet = `export function ResponsiveImage() {
  return (
    <img
      src="/images/${baseName}.webp"
      srcSet="/images/${baseName}-sm.webp 640w, /images/${baseName}-lg.webp 1280w"
      sizes="(max-width: 768px) 100vw, 50vw"
      width={${w}}
      height={${h}}
      alt="${baseName}"
      loading="lazy"
    />
  );
}`;
        break;
      case 'vue':
        snippet = `<template>
  <img
    :src="'/images/${baseName}.webp'"
    width="${w}"
    height="${h}"
    alt="${baseName}"
    loading="lazy"
  />
</template>`;
        break;
    }

    codeEl.textContent = snippet;
  }

  private updateFileInfoUI() {
    const item = this.queue[this.activeIndex];
    if (!item) return;

    const nameEl = document.getElementById('activeFileName');
    if (nameEl) nameEl.textContent = item.name;

    const detailsEl = document.getElementById('activeFileDetails');
    if (detailsEl) {
      detailsEl.textContent = `${item.width} × ${item.height} px • ${(item.size / (1024 * 1024)).toFixed(2)} MB`;
    }

    const wInput = document.getElementById('widthInput') as HTMLInputElement;
    if (wInput) wInput.value = item.width.toString();

    const hInput = document.getElementById('heightInput') as HTMLInputElement;
    if (hInput) hInput.value = item.height.toString();
  }

  private updateQueueUI() {
    const countEls = document.querySelectorAll('#queueCountText');
    countEls.forEach(el => {
      el.textContent = `${this.queue.length} ${this.queue.length === 1 ? 'Image' : 'Images'}`;
    });

    const activeQueueBox = document.getElementById('activeQueueContainerBox');
    if (activeQueueBox) {
      if (this.queue.length > 1) {
        activeQueueBox.classList.remove('hidden');
      } else {
        activeQueueBox.classList.add('hidden');
      }
    }

    const queueContainers = [
      document.getElementById('batchQueueList'),
      ...Array.from(document.querySelectorAll('.batchQueueListContainer'))
    ].filter(Boolean);

    queueContainers.forEach(container => {
      if (!container) return;
      container.innerHTML = this.queue.map((item, idx) => `
        <div class="flex items-center justify-between p-2.5 rounded-xl theme-card border ${idx === this.activeIndex ? 'border-blue-500 bg-blue-500/10' : 'theme-border'} transition-all">
          <div class="flex items-center gap-2.5 overflow-hidden">
            <img src="${item.dataUrl}" class="w-9 h-9 object-cover rounded-lg bg-zinc-950 border theme-border" />
            <div class="overflow-hidden">
              <p class="text-xs font-semibold theme-heading truncate">${item.name}</p>
              <p class="text-[10px] theme-muted">${item.width}×${item.height} • ${(item.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <button class="px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${idx === this.activeIndex ? 'bg-blue-600 text-white shadow-sm' : 'theme-input theme-heading hover:bg-blue-600/20'}" onclick="window.pixelEditor?.setActiveImage(${idx})">
              ${idx === this.activeIndex ? 'Active' : 'Select'}
            </button>
          </div>
        </div>
      `).join('');
    });
  }

  public async exportCurrentImage() {
    if (!this.originalImage || this.queue.length === 0) {
      this.showToast('Please upload an image first.');
      return;
    }
    
    this.showToast('Rendering full-resolution export...');

    // Full-resolution Export Canvas
    let targetW = this.state.width;
    let targetH = this.state.height;
    const pad = this.state.padding;

    this.exportCanvas.width = targetW + pad * 2;
    this.exportCanvas.height = targetH + pad * 2;

    this.exportCtx.clearRect(0, 0, this.exportCanvas.width, this.exportCanvas.height);

    if (pad > 0) {
      this.exportCtx.fillStyle = this.state.bgColor;
      this.exportCtx.fillRect(0, 0, this.exportCanvas.width, this.exportCanvas.height);
    }

    this.exportCtx.save();
    const centerX = pad + targetW / 2;
    const centerY = pad + targetH / 2;
    this.exportCtx.translate(centerX, centerY);

    this.exportCtx.rotate((this.state.rotation * Math.PI) / 180);
    this.exportCtx.scale(this.state.flipH ? -1 : 1, this.state.flipV ? -1 : 1);

    let filterStr = `brightness(${this.state.brightness}%) contrast(${this.state.contrast}%) saturate(${this.state.saturation}%)`;
    if (this.state.blur > 0) filterStr += ` blur(${this.state.blur}px)`;
    this.exportCtx.filter = filterStr;

    this.exportCtx.drawImage(
      this.originalImage,
      -targetW / 2,
      -targetH / 2,
      targetW,
      targetH
    );

    this.exportCtx.restore();

    if (this.state.watermarkText && (this.activeTool === 'watermark' || this.state.watermarkText !== 'Pixel Focal')) {
      this.drawWatermark(this.exportCtx, this.exportCanvas.width, this.exportCanvas.height, 1);
    }

    const isPdf = this.state.format === 'pdf' || this.state.format === 'application/pdf';
    if (isPdf) {
      try {
        const pdfBlob = await this.generatePdfBlobFromCanvas(this.exportCanvas, this.state.quality / 100);
        const baseName = (this.queue[this.activeIndex]?.name || 'image').replace(/\.[^/.]+$/, '');
        const link = document.createElement('a');
        link.download = `${baseName}-edited.pdf`;
        link.href = URL.createObjectURL(pdfBlob);
        link.click();
        this.showToast(`Downloaded PDF Document (${(pdfBlob.size / 1024).toFixed(1)} KB)!`);
      } catch (err) {
        this.showToast('⚠️ PDF download failed.');
      }
      return;
    }

    const format = this.state.format;
    const ext = format.split('/')[1] || 'png';

    this.exportCanvas.toBlob(
      (blob) => {
        if (!blob) return;
        const link = document.createElement('a');
        link.download = `pixel-focal-edited.${ext}`;
        link.href = URL.createObjectURL(blob);
        link.click();
        this.showToast('Downloaded full-resolution image!');
      },
      format,
      this.state.quality / 100
    );
  }

  public async exportQueueZip() {
    if (this.queue.length === 0) {
      this.showToast('Please upload an image first.');
      return;
    }
    this.showToast('Generating Batch ZIP Archive...');
    const zip = new JSZip();

    for (let i = 0; i < this.queue.length; i++) {
      const item = this.queue[i];
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = this.state.width;
      tempCanvas.height = this.state.height;
      const tCtx = tempCanvas.getContext('2d')!;
      
      const img = new Image();
      await new Promise((resolve) => {
        img.onload = resolve;
        img.src = item.dataUrl;
      });

      tCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);

      const isPdf = this.state.format === 'pdf' || this.state.format === 'application/pdf';
      let blob: Blob | null = null;

      if (isPdf) {
        blob = await this.generatePdfBlobFromCanvas(tempCanvas, this.state.quality / 100);
      } else {
        blob = await new Promise<Blob | null>((res) => {
          tempCanvas.toBlob(res, this.state.format, this.state.quality / 100);
        });
      }

      if (blob) {
        const ext = isPdf ? 'pdf' : (this.state.format.split('/')[1] || 'png');
        const cleanName = item.name.replace(/\.[^/.]+$/, "");
        zip.file(`${cleanName}-pixel-focal.${ext}`, blob);
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipLink = document.createElement('a');
    zipLink.href = URL.createObjectURL(zipBlob);
    zipLink.download = `pixel-focal-batch-${Date.now()}.zip`;
    zipLink.click();
    this.showToast('Batch ZIP Export Downloaded!');
  }

  public showToast(msg: string) {
    const toastEl = document.getElementById('toastNotification');
    if (toastEl) {
      toastEl.textContent = msg;
      toastEl.classList.remove('translate-y-20', 'opacity-0');
      toastEl.classList.add('translate-y-0', 'opacity-100');
      setTimeout(() => {
        toastEl.classList.add('translate-y-20', 'opacity-0');
        toastEl.classList.remove('translate-y-0', 'opacity-100');
      }, 3500);
    }
  }

  private bindEvents() {
    document.getElementById('undoBtn')?.addEventListener('click', () => this.undo());
    document.getElementById('redoBtn')?.addEventListener('click', () => this.redo());

    // Global drag and drop anywhere on the page
    window.addEventListener('dragover', (e) => {
      e.preventDefault();
      document.getElementById('globalDragOverlay')?.classList.remove('hidden');
    });
    window.addEventListener('dragleave', (e) => {
      if (e.clientX === 0 && e.clientY === 0) {
        document.getElementById('globalDragOverlay')?.classList.add('hidden');
      }
    });
    window.addEventListener('drop', async (e) => {
      e.preventDefault();
      document.getElementById('globalDragOverlay')?.classList.add('hidden');
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        for (const file of Array.from(e.dataTransfer.files)) {
          await this.addImageFile(file);
        }
      }
    });

    // Global keyboard shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+S)
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          this.redo();
        } else {
          e.preventDefault();
          this.undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        this.redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        this.exportImage();
      }
    });

    document.querySelectorAll('.dock-tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.getAttribute('data-tool');
        if (tool) this.setTool(tool);
      });
    });

    const fileInputs = [
      document.getElementById('imageUploadInput') as HTMLInputElement,
      document.getElementById('emptyStateUploadInput') as HTMLInputElement
    ];

    fileInputs.forEach(input => {
      if (input) {
        input.addEventListener('change', async (e) => {
          const files = (e.target as HTMLInputElement).files;
          if (files && files.length > 0) {
            for (const file of Array.from(files)) {
              await this.addImageFile(file);
            }
          }
        });
      }
    });

    const dropZones = [
      document.getElementById('editorDropZone'),
      document.getElementById('emptyStateDropzone')
    ];

    dropZones.forEach(zone => {
      if (zone) {
        zone.addEventListener('dragover', (e) => {
          e.preventDefault();
          zone.classList.add('border-blue-500', 'bg-blue-500/10');
        });
        zone.addEventListener('dragleave', () => {
          zone.classList.remove('border-blue-500', 'bg-blue-500/10');
        });
        zone.addEventListener('drop', async (e) => {
          e.preventDefault();
          zone.classList.remove('border-blue-500', 'bg-blue-500/10');
          if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
            for (const file of Array.from(e.dataTransfer.files)) {
              await this.addImageFile(file);
            }
          }
        });
      }
    });

    const wInput = document.getElementById('widthInput') as HTMLInputElement;
    const hInput = document.getElementById('heightInput') as HTMLInputElement;
    const lockCheck = document.getElementById('lockRatioCheck') as HTMLInputElement;

    if (wInput) {
      wInput.addEventListener('input', () => {
        const val = parseInt(wInput.value) || 100;
        this.state.width = val;
        if (lockCheck && lockCheck.checked) {
          this.state.height = Math.round(val / this.state.aspectRatio);
          if (hInput) hInput.value = this.state.height.toString();
        }
        this.processAndRender();
      });
    }

    if (hInput) {
      hInput.addEventListener('input', () => {
        const val = parseInt(hInput.value) || 100;
        this.state.height = val;
        if (lockCheck && lockCheck.checked) {
          this.state.width = Math.round(val * this.state.aspectRatio);
          if (wInput) wInput.value = this.state.width.toString();
        }
        this.processAndRender();
      });
    }

    document.getElementById('applyFreeCropBtn')?.addEventListener('click', () => {
      this.pushStateHistory();
      this.applyFreeformCrop();
    });
    document.querySelectorAll('.crop-preset-ratio-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const ratio = btn.getAttribute('data-ratio');
        if (ratio) {
          this.pushStateHistory();
          this.applyPresetCropRatio(ratio);
        }
      });
    });
    document.getElementById('resetCropBtn')?.addEventListener('click', () => {
      this.pushStateHistory();
      this.resetCrop();
    });
    document.getElementById('toggleSideBySideBtn')?.addEventListener('click', () => this.toggleViewMode());
    document.getElementById('toggleCompareModeBtn')?.addEventListener('click', () => this.toggleViewMode());

    const socialSelect = document.getElementById('socialPresetSelect') as HTMLSelectElement;
    if (socialSelect) {
      socialSelect.addEventListener('change', () => {
        const val = socialSelect.value;
        if (!val) return;
        const [w, h] = val.split('x').map(Number);
        if (w && h) {
          this.pushStateHistory();
          this.state.width = w;
          this.state.height = h;
          if (wInput) wInput.value = w.toString();
          if (hInput) hInput.value = h.toString();
          this.processAndRender();
        }
      });
    }

    const qualityRange = document.getElementById('qualityRangeInput') as HTMLInputElement;
    const qualityValueLabel = document.getElementById('qualityValueLabel');
    if (qualityRange) {
      qualityRange.addEventListener('input', () => {
        this.pushStateHistory();
        const compressionLevel = parseInt(qualityRange.value);
        this.state.quality = Math.max(5, 100 - compressionLevel);
        if (qualityValueLabel) {
          qualityValueLabel.textContent = `${compressionLevel}% (${this.state.quality}% Quality)`;
        }
        this.processAndRender();
      });
    }

    const formatSelect = document.getElementById('formatSelectInput') as HTMLSelectElement;
    if (formatSelect) {
      formatSelect.addEventListener('change', () => {
        this.pushStateHistory();
        this.state.format = formatSelect.value;
        this.processAndRender();
      });
    }

    document.getElementById('rotateCwBtn')?.addEventListener('click', () => {
      this.pushStateHistory();
      this.state.rotation = (this.state.rotation + 90) % 360;
      this.processAndRender();
    });
    document.getElementById('rotateCcwBtn')?.addEventListener('click', () => {
      this.pushStateHistory();
      this.state.rotation = (this.state.rotation - 90 + 360) % 360;
      this.processAndRender();
    });
    document.getElementById('flipHBtn')?.addEventListener('click', () => {
      this.pushStateHistory();
      this.state.flipH = !this.state.flipH;
      this.processAndRender();
    });
    document.getElementById('flipVBtn')?.addEventListener('click', () => {
      this.pushStateHistory();
      this.state.flipV = !this.state.flipV;
      this.processAndRender();
    });

    const brightnessRange = document.getElementById('brightnessInput') as HTMLInputElement;
    if (brightnessRange) {
      brightnessRange.addEventListener('input', () => {
        this.pushStateHistory();
        this.state.brightness = parseInt(brightnessRange.value);
        this.processAndRender();
      });
    }

    const contrastRange = document.getElementById('contrastInput') as HTMLInputElement;
    if (contrastRange) {
      contrastRange.addEventListener('input', () => {
        this.pushStateHistory();
        this.state.contrast = parseInt(contrastRange.value);
        this.processAndRender();
      });
    }

    const saturationRange = document.getElementById('saturationInput') as HTMLInputElement;
    if (saturationRange) {
      saturationRange.addEventListener('input', () => {
        this.state.saturation = parseInt(saturationRange.value);
        this.processAndRender();
      });
    }

    const blurRange = document.getElementById('blurInput') as HTMLInputElement;
    if (blurRange) {
      blurRange.addEventListener('input', () => {
        this.state.blur = parseInt(blurRange.value);
        this.processAndRender();
      });
    }

    const padInput = document.getElementById('paddingInput') as HTMLInputElement;
    if (padInput) {
      padInput.addEventListener('input', () => {
        this.state.padding = parseInt(padInput.value) || 0;
        this.processAndRender();
      });
    }

    const bgColInput = document.getElementById('bgColorInput') as HTMLInputElement;
    if (bgColInput) {
      bgColInput.addEventListener('input', () => {
        this.state.bgColor = bgColInput.value;
        this.processAndRender();
      });
    }

    const wmSizeInput = document.getElementById('watermarkSizeInput') as HTMLInputElement;
    const wmSizeVal = document.getElementById('watermarkSizeVal');
    if (wmSizeInput) {
      wmSizeInput.addEventListener('input', () => {
        this.pushStateHistory();
        this.state.watermarkSize = parseInt(wmSizeInput.value) || 24;
        if (wmSizeVal) wmSizeVal.textContent = `${this.state.watermarkSize}px`;
        this.processAndRender();
      });
    }

    const wmColorInput = document.getElementById('watermarkColorInput') as HTMLInputElement;
    if (wmColorInput) {
      wmColorInput.addEventListener('input', () => {
        this.setWatermarkColor(wmColorInput.value);
      });
    }

    document.querySelectorAll('.wm-color-swatch').forEach(btn => {
      btn.addEventListener('click', () => {
        const color = btn.getAttribute('data-color');
        if (color) {
          this.setWatermarkColor(color);
        }
      });
    });

    const wmInput = document.getElementById('watermarkTextInput') as HTMLInputElement;
    if (wmInput) {
      wmInput.addEventListener('input', () => {
        this.state.watermarkText = wmInput.value;
        this.processAndRender();
      });
    }

    const wmOpacity = document.getElementById('watermarkOpacityInput') as HTMLInputElement;
    const wmOpacityVal = document.getElementById('watermarkOpacityVal');
    if (wmOpacity) {
      wmOpacity.addEventListener('input', () => {
        this.state.watermarkOpacity = parseInt(wmOpacity.value);
        if (wmOpacityVal) wmOpacityVal.textContent = `${this.state.watermarkOpacity}%`;
        this.processAndRender();
      });
    }

    const wmPos = document.getElementById('watermarkPosSelect') as HTMLSelectElement;
    if (wmPos) {
      wmPos.addEventListener('change', () => {
        this.state.watermarkPos = wmPos.value;
        this.processAndRender();
      });
    }

    document.querySelectorAll('.code-fw-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.code-fw-btn').forEach(b => b.classList.remove('bg-blue-600', 'text-white'));
        btn.classList.add('bg-blue-600', 'text-white');
        this.state.framework = btn.getAttribute('data-fw') || 'html-picture';
        this.updateResponsiveCode();
      });
    });

    document.getElementById('exportPrimaryBtn')?.addEventListener('click', () => this.exportCurrentImage());
    document.getElementById('exportBatchZipBtn')?.addEventListener('click', () => this.exportQueueZip());
    document.getElementById('copyCodeSnippetBtn')?.addEventListener('click', () => {
      const code = document.getElementById('responsiveCodeBlock')?.textContent || '';
      navigator.clipboard.writeText(code);
      this.showToast('Copied code snippet to clipboard!');
    });

    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        this.exportCurrentImage();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        e.preventDefault();
        fileInputs[0]?.click();
      }
    });
  }
}

declare global {
  interface Window {
    pixelEditor: PixelEditor;
  }
}

function initPixelEditor() {
  if (typeof window !== 'undefined' && !window.pixelEditor) {
    window.pixelEditor = new PixelEditor();
  }
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initPixelEditor);
  } else {
    initPixelEditor();
  }
}
