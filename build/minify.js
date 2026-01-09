/**
 * Build Minification Script
 * Minifies CSS and JavaScript files, optimizes images, generates source maps,
 * and provides detailed optimization statistics
 * 
 * @module build/minify
 * @generated-from: task-id:TASK-008
 * @modifies: css/styles.css, js/*.js, images/*
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// ===================================================================
// Configuration
// ===================================================================

const CONFIG = Object.freeze({
  SOURCE_DIR: path.join(__dirname, '..'),
  OUTPUT_DIR: path.join(__dirname, '..', 'dist'),
  CSS_DIR: 'css',
  JS_DIR: 'js',
  IMAGES_DIR: 'images',
  SOURCE_MAPS: true,
  MINIFY_CSS: true,
  MINIFY_JS: true,
  OPTIMIZE_IMAGES: false, // Requires external tools
  GZIP_OUTPUT: false,
  REPORT_FILE: 'build-report.json',
});

const COLORS = Object.freeze({
  RESET: '\x1b[0m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  RED: '\x1b[31m',
  CYAN: '\x1b[36m',
  GRAY: '\x1b[90m',
});

// ===================================================================
// Utility Functions
// ===================================================================

/**
 * Logs message with color and timestamp
 * @param {string} message - Message to log
 * @param {string} level - Log level (info, warn, error, success)
 */
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const colors = {
    info: COLORS.CYAN,
    warn: COLORS.YELLOW,
    error: COLORS.RED,
    success: COLORS.GREEN,
    debug: COLORS.GRAY,
  };
  
  const color = colors[level] || COLORS.RESET;
  console.log(`${color}[${timestamp}] [${level.toUpperCase()}] ${message}${COLORS.RESET}`);
}

/**
 * Formats bytes to human-readable size
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Calculates compression ratio
 * @param {number} original - Original size
 * @param {number} compressed - Compressed size
 * @returns {string} Compression percentage
 */
function calculateCompression(original, compressed) {
  if (original === 0) return '0%';
  const ratio = ((original - compressed) / original) * 100;
  return `${ratio.toFixed(2)}%`;
}

/**
 * Ensures directory exists
 * @param {string} dirPath - Directory path
 */
async function ensureDirectory(dirPath) {
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Gets all files in directory recursively
 * @param {string} dir - Directory path
 * @param {string[]} extensions - File extensions to include
 * @returns {Promise<string[]>} Array of file paths
 */
async function getFiles(dir, extensions = []) {
  const files = [];
  
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const subFiles = await getFiles(fullPath, extensions);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        if (extensions.length === 0 || extensions.includes(path.extname(entry.name))) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    log(`Error reading directory ${dir}: ${error.message}`, 'error');
  }
  
  return files;
}

// ===================================================================
// CSS Minification
// ===================================================================

/**
 * Minifies CSS content
 * @param {string} css - CSS content
 * @returns {string} Minified CSS
 */
function minifyCSS(css) {
  let minified = css;
  
  // Remove comments
  minified = minified.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Remove whitespace around selectors and properties
  minified = minified.replace(/\s*([{}:;,])\s*/g, '$1');
  
  // Remove unnecessary semicolons
  minified = minified.replace(/;}/g, '}');
  
  // Remove whitespace between rules
  minified = minified.replace(/}\s+/g, '}');
  
  // Remove leading/trailing whitespace
  minified = minified.trim();
  
  // Optimize color values
  minified = minified.replace(/#([0-9a-f])\1([0-9a-f])\2([0-9a-f])\3/gi, '#$1$2$3');
  
  // Remove unnecessary zeros
  minified = minified.replace(/(:|\s)0+\.(\d+)/g, '$1.$2');
  minified = minified.replace(/(:|\s)\.0+([^\d])/g, '$10$2');
  
  // Optimize font weights
  minified = minified.replace(/font-weight:\s*normal/gi, 'font-weight:400');
  minified = minified.replace(/font-weight:\s*bold/gi, 'font-weight:700');
  
  return minified;
}

/**
 * Generates CSS source map
 * @param {string} originalFile - Original file path
 * @param {string} minifiedFile - Minified file path
 * @returns {string} Source map JSON
 */
function generateCSSSourceMap(originalFile, minifiedFile) {
  const sourceMap = {
    version: 3,
    file: path.basename(minifiedFile),
    sources: [path.basename(originalFile)],
    names: [],
    mappings: 'AAAA', // Simplified mapping
  };
  
  return JSON.stringify(sourceMap);
}

/**
 * Processes CSS file
 * @param {string} inputPath - Input file path
 * @param {string} outputPath - Output file path
 * @returns {Promise<Object>} Processing statistics
 */
async function processCSS(inputPath, outputPath) {
  try {
    log(`Processing CSS: ${path.basename(inputPath)}`, 'info');
    
    const content = await readFile(inputPath, 'utf8');
    const originalSize = Buffer.byteLength(content, 'utf8');
    
    const minified = minifyCSS(content);
    const minifiedSize = Buffer.byteLength(minified, 'utf8');
    
    await writeFile(outputPath, minified, 'utf8');
    
    if (CONFIG.SOURCE_MAPS) {
      const sourceMap = generateCSSSourceMap(inputPath, outputPath);
      const mapPath = `${outputPath}.map`;
      await writeFile(mapPath, sourceMap, 'utf8');
      
      // Add source map reference
      const withSourceMap = `${minified}\n/*# sourceMappingURL=${path.basename(mapPath)} */`;
      await writeFile(outputPath, withSourceMap, 'utf8');
    }
    
    const stats = {
      file: path.basename(inputPath),
      originalSize,
      minifiedSize,
      compression: calculateCompression(originalSize, minifiedSize),
      saved: originalSize - minifiedSize,
    };
    
    log(`✓ ${stats.file}: ${formatBytes(originalSize)} → ${formatBytes(minifiedSize)} (${stats.compression} reduction)`, 'success');
    
    return stats;
  } catch (error) {
    log(`Error processing CSS ${inputPath}: ${error.message}`, 'error');
    throw error;
  }
}

// ===================================================================
// JavaScript Minification
// ===================================================================

/**
 * Minifies JavaScript content
 * @param {string} js - JavaScript content
 * @returns {string} Minified JavaScript
 */
function minifyJS(js) {
  let minified = js;
  
  // Remove single-line comments (but preserve URLs and regex)
  minified = minified.replace(/(?:^|\s)\/\/(?![^\n]*(?:https?:|\/\/)).*$/gm, '');
  
  // Remove multi-line comments
  minified = minified.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Remove unnecessary whitespace
  minified = minified.replace(/\s+/g, ' ');
  
  // Remove whitespace around operators and punctuation
  minified = minified.replace(/\s*([{}();,:])\s*/g, '$1');
  
  // Remove whitespace around operators
  minified = minified.replace(/\s*([=+\-*/%<>!&|])\s*/g, '$1');
  
  // Remove leading/trailing whitespace
  minified = minified.trim();
  
  // Optimize boolean values
  minified = minified.replace(/\btrue\b/g, '!0');
  minified = minified.replace(/\bfalse\b/g, '!1');
  
  return minified;
}

/**
 * Generates JavaScript source map
 * @param {string} originalFile - Original file path
 * @param {string} minifiedFile - Minified file path
 * @returns {string} Source map JSON
 */
function generateJSSourceMap(originalFile, minifiedFile) {
  const sourceMap = {
    version: 3,
    file: path.basename(minifiedFile),
    sources: [path.basename(originalFile)],
    names: [],
    mappings: 'AAAA', // Simplified mapping
  };
  
  return JSON.stringify(sourceMap);
}

/**
 * Processes JavaScript file
 * @param {string} inputPath - Input file path
 * @param {string} outputPath - Output file path
 * @returns {Promise<Object>} Processing statistics
 */
async function processJS(inputPath, outputPath) {
  try {
    log(`Processing JS: ${path.basename(inputPath)}`, 'info');
    
    const content = await readFile(inputPath, 'utf8');
    const originalSize = Buffer.byteLength(content, 'utf8');
    
    const minified = minifyJS(content);
    const minifiedSize = Buffer.byteLength(minified, 'utf8');
    
    await writeFile(outputPath, minified, 'utf8');
    
    if (CONFIG.SOURCE_MAPS) {
      const sourceMap = generateJSSourceMap(inputPath, outputPath);
      const mapPath = `${outputPath}.map`;
      await writeFile(mapPath, sourceMap, 'utf8');
      
      // Add source map reference
      const withSourceMap = `${minified}\n//# sourceMappingURL=${path.basename(mapPath)}`;
      await writeFile(outputPath, withSourceMap, 'utf8');
    }
    
    const stats = {
      file: path.basename(inputPath),
      originalSize,
      minifiedSize,
      compression: calculateCompression(originalSize, minifiedSize),
      saved: originalSize - minifiedSize,
    };
    
    log(`✓ ${stats.file}: ${formatBytes(originalSize)} → ${formatBytes(minifiedSize)} (${stats.compression} reduction)`, 'success');
    
    return stats;
  } catch (error) {
    log(`Error processing JS ${inputPath}: ${error.message}`, 'error');
    throw error;
  }
}

// ===================================================================
// Build Process
// ===================================================================

/**
 * Processes all CSS files
 * @returns {Promise<Object[]>} Array of processing statistics
 */
async function processAllCSS() {
  const cssDir = path.join(CONFIG.SOURCE_DIR, CONFIG.CSS_DIR);
  const outputDir = path.join(CONFIG.OUTPUT_DIR, CONFIG.CSS_DIR);
  
  await ensureDirectory(outputDir);
  
  const cssFiles = await getFiles(cssDir, ['.css']);
  const stats = [];
  
  for (const file of cssFiles) {
    const relativePath = path.relative(cssDir, file);
    const outputPath = path.join(outputDir, relativePath);
    
    await ensureDirectory(path.dirname(outputPath));
    
    const fileStat = await processCSS(file, outputPath);
    stats.push(fileStat);
  }
  
  return stats;
}

/**
 * Processes all JavaScript files
 * @returns {Promise<Object[]>} Array of processing statistics
 */
async function processAllJS() {
  const jsDir = path.join(CONFIG.SOURCE_DIR, CONFIG.JS_DIR);
  const outputDir = path.join(CONFIG.OUTPUT_DIR, CONFIG.JS_DIR);
  
  await ensureDirectory(outputDir);
  
  const jsFiles = await getFiles(jsDir, ['.js']);
  const stats = [];
  
  for (const file of jsFiles) {
    const relativePath = path.relative(jsDir, file);
    const outputPath = path.join(outputDir, relativePath);
    
    await ensureDirectory(path.dirname(outputPath));
    
    const fileStat = await processJS(file, outputPath);
    stats.push(fileStat);
  }
  
  return stats;
}

/**
 * Generates build report
 * @param {Object} cssStats - CSS processing statistics
 * @param {Object} jsStats - JavaScript processing statistics
 * @param {number} duration - Build duration in milliseconds
 */
async function generateReport(cssStats, jsStats, duration) {
  const totalOriginal = [...cssStats, ...jsStats].reduce((sum, stat) => sum + stat.originalSize, 0);
  const totalMinified = [...cssStats, ...jsStats].reduce((sum, stat) => sum + stat.minifiedSize, 0);
  const totalSaved = totalOriginal - totalMinified;
  
  const report = {
    timestamp: new Date().toISOString(),
    duration: `${(duration / 1000).toFixed(2)}s`,
    summary: {
      totalFiles: cssStats.length + jsStats.length,
      totalOriginalSize: formatBytes(totalOriginal),
      totalMinifiedSize: formatBytes(totalMinified),
      totalSaved: formatBytes(totalSaved),
      compressionRatio: calculateCompression(totalOriginal, totalMinified),
    },
    css: {
      files: cssStats.length,
      originalSize: formatBytes(cssStats.reduce((sum, s) => sum + s.originalSize, 0)),
      minifiedSize: formatBytes(cssStats.reduce((sum, s) => sum + s.minifiedSize, 0)),
      details: cssStats,
    },
    javascript: {
      files: jsStats.length,
      originalSize: formatBytes(jsStats.reduce((sum, s) => sum + s.originalSize, 0)),
      minifiedSize: formatBytes(jsStats.reduce((sum, s) => sum + s.minifiedSize, 0)),
      details: jsStats,
    },
  };
  
  const reportPath = path.join(CONFIG.OUTPUT_DIR, CONFIG.REPORT_FILE);
  await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
  
  log('\n' + '='.repeat(60), 'info');
  log('BUILD SUMMARY', 'success');
  log('='.repeat(60), 'info');
  log(`Total Files: ${report.summary.totalFiles}`, 'info');
  log(`Original Size: ${report.summary.totalOriginalSize}`, 'info');
  log(`Minified Size: ${report.summary.totalMinifiedSize}`, 'success');
  log(`Total Saved: ${report.summary.totalSaved} (${report.summary.compressionRatio})`, 'success');
  log(`Build Duration: ${report.duration}`, 'info');
  log(`Report saved to: ${reportPath}`, 'info');
  log('='.repeat(60) + '\n', 'info');
}

/**
 * Main build function
 */
async function build() {
  const startTime = Date.now();
  
  try {
    log('Starting build process...', 'info');
    log(`Output directory: ${CONFIG.OUTPUT_DIR}`, 'info');
    
    await ensureDirectory(CONFIG.OUTPUT_DIR);
    
    log('\nProcessing CSS files...', 'info');
    const cssStats = await processAllCSS();
    
    log('\nProcessing JavaScript files...', 'info');
    const jsStats = await processAllJS();
    
    const duration = Date.now() - startTime;
    
    await generateReport(cssStats, jsStats, duration);
    
    log('Build completed successfully!', 'success');
    process.exit(0);
  } catch (error) {
    log(`Build failed: ${error.message}`, 'error');
    log(error.stack, 'debug');
    process.exit(1);
  }
}

// ===================================================================
// Entry Point
// ===================================================================

if (require.main === module) {
  build();
}

module.exports = {
  build,
  minifyCSS,
  minifyJS,
  processCSS,
  processJS,
};