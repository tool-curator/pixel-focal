export interface ToolSeoData {
  slug: string;
  name: string;
  title: string;
  metaDescription: string;
  h1: string;
  intro: string;
  icon: string;
  features: string[];
  benefits: string[];
  faqs: { q: string; a: string }[];
  keywords: string[];
}

export const toolsData: Record<string, ToolSeoData> = {
  'image-resizer': {
    slug: 'image-resizer',
    name: 'Image Resizer',
    title: 'Free Browser Image Resizer • Resize Images Privately | Pixel Focal',
    metaDescription: 'Resize PNG, JPEG, WebP, and AVIF images online directly in your browser. 100% client-side, zero uploads, custom dimensions, aspect ratio lock & social presets.',
    h1: 'Online Browser Image Resizer',
    intro: 'Resize images instantly in your browser with custom pixel dimensions, scaling percentages, aspect ratio locks, and presets for Instagram, YouTube, LinkedIn, X/Twitter, and TikTok. 100% private with zero server uploads.',
    icon: 'M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4',
    features: [
      'Custom pixel width and height input fields',
      'Automatic aspect ratio locking mechanism',
      'Social media dimensions (Instagram, YouTube, LinkedIn, X, TikTok, Discord)',
      'Scaling options (25%, 50%, 75%, 100%, 150%, 200%)',
      'Batch queue resizing for multiple files simultaneously'
    ],
    benefits: [
      '100% Client-Side Privacy: Your photos never upload to remote servers',
      'Zero Latency: Instant Canvas preview without network wait times',
      'High Quality Re-Sampling: Preserves sharpness and visual fidelity'
    ],
    faqs: [
      { q: 'Is there a limit on how many images I can resize?', a: 'No. Pixel Focal processes images locally using your device resources without artificial limits.' },
      { q: 'Does resizing decrease image quality?', a: 'Pixel Focal uses high-precision HTML5 Canvas bilinear resampling to maintain crisp details.' }
    ],
    keywords: ['image resizer', 'browser image resizer', 'resize image online', 'free image resizer', 'social media image resizer']
  },
  'image-cropper': {
    slug: 'image-cropper',
    name: 'Image Cropper',
    title: 'Interactive Image Cropper Online • Crop Images Privately | Pixel Focal',
    metaDescription: 'Crop images online with freeform handles, 1:1, 4:5, 16:9, 9:16, 21:9 aspect ratios, and focal point selection. 100% client-side image cropper.',
    h1: 'Interactive Browser Image Cropper',
    intro: 'Crop photos and graphics with interactive crop handles, focal point positioning, and preset ratios for avatars, banners, thumbnails, and posts. Zero uploads required.',
    icon: 'M5 3v14a2 2 0 002 2h14M3 5h14a2 2 0 012 2v14',
    features: [
      'Interactive crop box selection with drag handles',
      'Preset aspect ratios: 1:1 Square, 4:5 Portrait, 16:9 Landscape, 9:16 Story, 21:9 Ultrawide',
      'Focal point center selector for subject tracking',
      'Circle crop preview mode for avatars and profile pictures',
      'Instant Apply Crop and Reset Crop operations'
    ],
    benefits: [
      'Precision Framing: Perfect alignment for social media profiles',
      'Private Local Processing: Zero cloud server storage',
      'Real-Time Feedback: Live preview before exporting'
    ],
    faqs: [
      { q: 'Can I crop images into a circle?', a: 'Yes! Pixel Focal supports circle crop modes ideal for avatars and icons.' },
      { q: 'How do focal points work?', a: 'Focal points lock onto key subjects so crops remain centered automatically.' }
    ],
    keywords: ['image cropper', 'crop image online', 'browser image cropper', 'circle crop tool', 'aspect ratio cropper']
  },
  'image-compressor': {
    slug: 'image-compressor',
    name: 'Image Compressor',
    title: 'Free Browser Image Compressor • Lossless & Lossy Compression | Pixel Focal',
    metaDescription: 'Compress PNG, JPEG, WebP, and AVIF files without server uploads. Reduce file size up to 90% while maintaining crisp visual quality.',
    h1: 'Local Browser Image Compressor',
    intro: 'Compress images right in your browser with lossy and lossless algorithms, quality sliders, target size calculators, and split-screen comparison sliders.',
    icon: 'M19 14l-7 7m0 0l-7-7m7 7V3',
    features: [
      'Lossy and Lossless compression options',
      'Real-time Quality Slider (10% to 100%)',
      'Estimated file size calculation in KB and MB',
      'Before/After split screen comparison view',
      'Support for PNG, JPEG, WebP, and AVIF formats'
    ],
    benefits: [
      'Maximized Web Speed: Reduce page load times by shrinking image footprints',
      'Complete Data Protection: Images remain strictly on your computer',
      'Instant Visual Audit: Compare original vs compressed output side-by-side'
    ],
    faqs: [
      { q: 'How much can image compressor reduce file size?', a: 'WebP and AVIF compression can reduce file size by 50% to 90% with minimal perceptual quality loss.' },
      { q: 'Are my images stored after compression?', a: 'No. Images are processed in RAM and destroyed when you close the tab.' }
    ],
    keywords: ['image compressor', 'compress image online', 'browser image compressor', 'lossless image compressor', 'reduce file size']
  },
  'image-converter': {
    slug: 'image-converter',
    name: 'Image Converter',
    title: 'Online Image Format Converter • HEIC to JPG, PNG, WebP, AVIF, JPEG, PDF | Pixel Focal',
    metaDescription: 'Convert HEIC photos to JPG, PNG, WebP, AVIF, and PDF files instantly in your browser. Default JPEG export with 100% private local processing.',
    h1: 'Browser Image Format Converter',
    intro: 'Convert HEIC, PNG, JPEG, WebP, AVIF, and PDF formats in seconds with universal JPEG/JPG as default export format. Zero server uploads and unlimited batch queue support.',
    icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
    features: [
      'Convert iPhone HEIC / HEIF photos instantly to JPG',
      'Universal JPEG / JPG default export format',
      'Convert to WebP, AVIF, PNG, JPEG, and PDF',
      'Batch conversion queue for multiple files',
      'Quality fine-tuning for compressed target formats',
      'Instant browser Blob downloads'
    ],
    benefits: [
      'HEIC Photo Compatibility: Convert iOS HEIC camera photos to universal JPEG/JPG',
      'Modern Web Formats: Upgrade older JPGs to modern WebP & AVIF',
      'Zero Cloud Risks: Confidential graphics stay local',
      'Universal Compatibility: Export images for all web browsers and devices'
    ],
    faqs: [
      { q: 'Can I convert iPhone HEIC photos to JPG?', a: 'Yes! Pixel Focal converts HEIC/HEIF files to high-quality JPEG/JPG directly in your browser without uploading your photos to any server.' },
      { q: 'Which format should I convert to for web performance?', a: 'JPEG is our universal default for maximum compatibility. WebP and AVIF offer superior compression ratios for modern web development.' },
      { q: 'Can I convert multiple files at once?', a: 'Yes! Use the Batch Queue to convert dozens of files in one click.' }
    ],
    keywords: ['image converter', 'convert image online', 'PNG to WebP', 'JPG to AVIF', 'browser image format converter']
  },
  'image-optimizer': {
    slug: 'image-optimizer',
    name: 'Image Optimizer',
    title: 'Web Image Optimizer • Speed Up Page Loading | Pixel Focal',
    metaDescription: 'Optimize web images locally in your browser. Remove unnecessary bloat, strip EXIF metadata, and convert to lightweight WebP/AVIF codecs.',
    h1: 'Web Image Optimizer Tool',
    intro: 'Optimize website images to pass Google Core Web Vitals, boost PageSpeed scores, and deliver ultra-fast web experiences.',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    features: [
      'WebP & AVIF encoding optimization',
      'EXIF security metadata stripping',
      'Quality ceiling controls for optimal file sizes',
      'Core Web Vitals image audits'
    ],
    benefits: [
      'Faster Load Times: Improve PageSpeed and SEO rankings',
      'Bandwidth Savings: Reduce CDN transfer costs',
      'Local Processing: Secure client-side execution'
    ],
    faqs: [
      { q: 'Why is image optimization important for SEO?', a: 'Fast-loading images improve user experience and lower bounce rates, directly boosting Google Core Web Vitals.' }
    ],
    keywords: ['image optimizer', 'web image optimizer', 'optimize images for web', 'Core Web Vitals image optimization']
  },
  'image-rotator': {
    slug: 'image-rotator',
    name: 'Image Rotator',
    title: 'Rotate Images Online 90° / 180° / 270° • Browser Tool | Pixel Focal',
    metaDescription: 'Rotate images online instantly without server uploads. Adjust orientation by +90°, -90°, 180°, or custom angles privately in your browser.',
    h1: 'Online Image Rotator',
    intro: 'Fix sideways or upside-down photos with 90-degree increments, 180-degree flips, and custom angle rotation controls.',
    icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
    features: [
      'Rotate Clockwise +90° and Counter-Clockwise -90°',
      '180° orientation inversion',
      'Custom angle rotation slider',
      'Preserve original aspect ratio'
    ],
    benefits: [
      'Instant Orientation Fix: Correct camera rotation glitches',
      'Lossless Canvas Rotations: Crisp output files'
    ],
    faqs: [
      { q: 'Does rotating an image degrade quality?', a: 'No. Pixel Focal uses hardware-accelerated canvas rotation to preserve image quality.' }
    ],
    keywords: ['image rotator', 'rotate image online', 'rotate photo 90 degrees', 'browser image rotator']
  },
  'image-flipper': {
    slug: 'image-flipper',
    name: 'Image Flipper',
    title: 'Flip Images Horizontally & Vertically Online | Pixel Focal',
    metaDescription: 'Flip photos horizontally (mirror image) or vertically in your browser. 100% client-side and free image flipper tool.',
    h1: 'Browser Image Flipper Tool',
    intro: 'Mirror images horizontally or flip them vertically with one click directly inside your browser memory.',
    icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
    features: [
      'Flip Horizontal (Mirror Effect)',
      'Flip Vertical (Upside-Down Effect)',
      'Combine flips with rotations',
      'Instant download export'
    ],
    benefits: [
      'Mirror Photo Correction: Fix flipped selfie photos',
      'Creative Design Effects: Generate mirrored graphics'
    ],
    faqs: [
      { q: 'How do I mirror a photo?', a: 'Upload your image and click "Flip Horizontal" in the Rotate & Flip tab.' }
    ],
    keywords: ['image flipper', 'flip image online', 'mirror image tool', 'horizontal flip photo']
  },
  'watermark-tool': {
    slug: 'watermark-tool',
    name: 'Watermark Tool',
    title: 'Add Watermark to Images Online • Text & Branding | Pixel Focal',
    metaDescription: 'Add text watermarks, copyright marks, or logos to images online. Fine-tune opacity, font size, color, and 9-point grid positioning.',
    h1: 'Online Image Watermark Tool',
    intro: 'Protect your photos, artwork, and client drafts with customizable text watermarks, opacity sliders, and 9-point grid placement.',
    icon: 'M7 20l4-16m2 16l4-16M6 9h14M4 15h14',
    features: [
      'Custom text watermark content input',
      'Opacity control slider (10% to 100%)',
      '9-point grid alignment (Top-Left, Center, Bottom-Right, etc.)',
      'Custom font sizes and text colors'
    ],
    benefits: [
      'Copyright Protection: Prevent unauthorized image re-use',
      'Brand Identity: Add your company name to social graphics'
    ],
    faqs: [
      { q: 'Can I watermark multiple images at once?', a: 'Yes! Apply watermark settings across your batch queue.' }
    ],
    keywords: ['watermark tool', 'add watermark to image', 'online image watermark', 'photo copyright watermark']
  },
  'metadata-viewer': {
    slug: 'metadata-viewer',
    name: 'Metadata Viewer',
    title: 'EXIF Metadata Viewer Online • Inspect Image Data | Pixel Focal',
    metaDescription: 'Inspect camera EXIF data, GPS coordinates, camera models, ISO settings, and dimensions embedded inside your images.',
    h1: 'Browser EXIF Metadata Inspector',
    intro: 'View hidden metadata embedded in JPEG and PNG photos including camera model, lens parameters, timestamps, and file dimensions.',
    icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    features: [
      'EXIF tag parser (File name, size, dimensions, MIME type)',
      'Camera parameters inspection',
      'Client-side privacy check'
    ],
    benefits: [
      'Photo Analysis: Check camera settings used by photographers',
      'Privacy Awareness: Discover hidden location data attached to files'
    ],
    faqs: [
      { q: 'Are EXIF tags uploaded anywhere?', a: 'No. Metadata is parsed strictly within your local browser JavaScript engine.' }
    ],
    keywords: ['metadata viewer', 'EXIF viewer online', 'inspect photo metadata', 'read image EXIF data']
  },
  'metadata-remover': {
    slug: 'metadata-remover',
    name: 'Metadata Remover',
    title: 'Sanitize & Strip EXIF Metadata Online | Pixel Focal',
    metaDescription: 'Remove GPS coordinates, camera information, and personal metadata from images before publishing online. 100% private EXIF stripper.',
    h1: 'Online EXIF Metadata Sanitizer',
    intro: 'Strip sensitive EXIF data, GPS location coordinates, camera serial numbers, and creation timestamps from your photos before sharing on the web.',
    icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    features: [
      'One-click EXIF metadata stripping',
      'Sanitized canvas re-export',
      'Privacy protection against GPS tracking'
    ],
    benefits: [
      'Protect Personal Privacy: Hide home location GPS tags',
      'Web Security: Prevent hardware fingerprinting'
    ],
    faqs: [
      { q: 'Does stripping metadata change photo appearance?', a: 'No. Only hidden text headers are removed; pixel content remains identical.' }
    ],
    keywords: ['metadata remover', 'strip EXIF data', 'remove photo location tag', 'sanitize image metadata']
  },
  'color-palette-extractor': {
    slug: 'color-palette-extractor',
    name: 'Color Palette Extractor',
    title: 'Extract Dominant Colors from Image • HEX, RGB, HSL | Pixel Focal',
    metaDescription: 'Extract dominant color palettes from any photo or graphic. One-click copy for HEX, RGB, HSL, and CSS variable color codes.',
    h1: 'Image Color Palette Extractor',
    intro: 'Extract beautiful dominant color palettes from photos and design files with instant copy options for HEX, RGB, HSL, and CSS custom properties.',
    icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
    features: [
      'Extract 6 dominant color swatches per image',
      'One-click HEX code clipboard copy (`#3B82F6`)',
      'Visual color swatch preview cards',
      'K-means pixel color sampling algorithm'
    ],
    benefits: [
      'Design Speed: Instantly capture theme colors for websites and branding',
      'Developer Friendly: Copy CSS variables directly into stylesheets'
    ],
    faqs: [
      { q: 'How does color palette extraction work?', a: 'Pixel Focal analyzes pixel frequency across a canvas sample grid to extract dominant colors.' }
    ],
    keywords: ['color palette extractor', 'extract colors from image', 'image color picker', 'HEX color code generator']
  },
  'ocr-text-extractor': {
    slug: 'ocr-text-extractor',
    name: 'OCR Text Extractor',
    title: 'Client-Side OCR Text Extractor • Scan Image Text | Pixel Focal',
    metaDescription: 'Scan and extract text from images directly in your browser. 100% client-side canvas text scanner without server APIs.',
    h1: 'Browser OCR Text Extraction Tool',
    intro: 'Extract printed or embedded text from screenshots, documents, and graphics locally using client-side optical character recognition heuristics.',
    icon: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z',
    features: [
      'Client-side text recognition engine',
      'Extract text from screenshots and photo documents',
      'One-click text copy to clipboard'
    ],
    benefits: [
      'Private Scanning: Read sensitive document text without uploading to cloud OCR APIs',
      'Instant Copy: Convert text in images to editable string data'
    ],
    faqs: [
      { q: 'Is my scanned text sent to an external API?', a: 'No. OCR processing runs locally in browser JavaScript.' }
    ],
    keywords: ['OCR text extractor', 'extract text from image', 'online OCR tool', 'scan text from photo']
  },
  'responsive-image-generator': {
    slug: 'responsive-image-generator',
    name: 'Responsive Image Generator',
    title: 'Responsive Image Generator • HTML <picture>, Next.js, Astro, React, Vue | Pixel Focal',
    metaDescription: 'Generate production-ready responsive image code for HTML <picture>, srcset, Next.js, Astro, React, and Vue. Boost performance with one-click markup snippets.',
    h1: 'Responsive Image Code Snippet Generator',
    intro: 'Auto-generate production-ready responsive markup for HTML <picture>, `srcset`, Next.js `<Image>`, Astro `<Image>`, React, and Vue components with custom width breakpoints.',
    icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
    features: [
      'HTML <picture> element code generator',
      'HTML `srcset` and `sizes` attributes generator',
      'Next.js `<Image>` component code snippet',
      'Astro `<Image>` framework component code snippet',
      'React and Vue responsive image templates'
    ],
    benefits: [
      'Developer Productivity: Copy pre-built component code in seconds',
      'Page Speed Optimization: Deliver exact image dimensions per viewport'
    ],
    faqs: [
      { q: 'Which frameworks are supported?', a: 'Pixel Focal outputs snippets for standard HTML5, Next.js, Astro, React, and Vue.' }
    ],
    keywords: ['responsive image generator', 'HTML picture tag generator', 'Next.js image code', 'Astro image component']
  },
  'batch-image-editor': {
    slug: 'batch-image-editor',
    name: 'Batch Image Editor',
    title: 'Batch Image Editor Online • Process Multiple Files | Pixel Focal',
    metaDescription: 'Resize, compress, convert, and watermark multiple images at once. Export full batch queues as a ZIP archive directly from your browser.',
    h1: 'Browser Batch Image Processing Suite',
    intro: 'Queue dozens of images, apply uniform resize, compression, and watermark settings, then download all edited files in a single ZIP archive.',
    icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
    features: [
      'Multi-file queue manager with drag-and-drop',
      'Apply uniform settings across all queued images',
      'Client-side ZIP archive creation via JSZip',
      'Dynamic file naming templates'
    ],
    benefits: [
      'Massive Time Savings: Process 50+ photos in seconds',
      'Private Local Archive: Zip generated entirely in RAM'
    ],
    faqs: [
      { q: 'Is there a limit on batch queue size?', a: 'Queue capacity depends only on your computer available RAM.' }
    ],
    keywords: ['batch image editor', 'bulk image editor', 'batch convert images', 'batch ZIP export']
  },
  'image-inspector': {
    slug: 'image-inspector',
    name: 'Image Inspector',
    title: 'Image Inspector Online • Dimensions, Color & Metadata Audit | Pixel Focal',
    metaDescription: 'Audit image dimensions, aspect ratios, color profiles, file sizes, and EXIF tags in a single browser inspector panel.',
    h1: 'Comprehensive Image Inspector Tool',
    intro: 'Inspect pixel dimensions, color spaces, compression ratios, and embedded metadata in a single clean dashboard.',
    icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    features: [
      'Full dimension and aspect ratio audit',
      'File size and MIME type analysis',
      'EXIF security status check',
      'Dominant color palette extraction'
    ],
    benefits: [
      'Comprehensive Quality Control: Audit assets before production release',
      'Instant Diagnostic: Spot oversized or unoptimized images'
    ],
    faqs: [
      { q: 'What does the Image Inspector check?', a: 'It audits file sizes, dimensions, aspect ratios, EXIF tags, and color palettes.' }
    ],
    keywords: ['image inspector', 'inspect image online', 'image audit tool', 'photo analysis']
  }
};
