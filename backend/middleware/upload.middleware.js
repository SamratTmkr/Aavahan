import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/events');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `${Date.now()}-${baseName}${ext}`;
        cb(null, filename);
    }
});

// File filter: image mime types and extensions only
const fileFilter = (req, file, cb) => {
    const isMimeImage = file.mimetype && file.mimetype.startsWith('image/');
    const isExtImage = /\.(jpe?g|png|webp|gif)$/i.test(path.extname(file.originalname));

    if (isMimeImage && isExtImage) {
        cb(null, true);
    } else {
        cb(new Error('Only image files (JPEG, PNG, WebP, GIF) are allowed.'), false);
    }
};

// Multer upload instance
const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter
});

// Middleware for single event banner with formatted error handling
export const uploadEventBanner = (req, res, next) => {
    upload.single('eventBanner')(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ success: false, message: 'Image size exceeds the 5MB limit.' });
                }
                return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
            }
            return res.status(400).json({ success: false, message: err.message || 'Invalid file uploaded.' });
        }
        next();
    });
};
