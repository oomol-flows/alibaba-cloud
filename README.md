# OOMOL Cloud Storage Upload Toolkit

A complete workflow solution for uploading files to Alibaba Cloud Object Storage Service (OSS) with advanced features and real-time progress tracking.

## 🌟 What This Project Does

This toolkit provides a simple, reliable way to upload files to cloud storage through the OOMOL platform. Whether you're backing up important documents, sharing media files, or storing data for web applications, this project makes cloud storage accessible to everyone.

## 📦 Available Blocks

### OSS Upload Block
**Purpose**: Upload any file to Alibaba Cloud storage with professional-grade features

**Key Features**:
- ✅ **Real-time Progress Tracking** - See upload percentage as files transfer
- ✅ **Automatic Retry System** - Handles network interruptions gracefully
- ✅ **Custom File Organization** - Organize files in custom folders
- ✅ **Flexible Naming Options** - Keep original names or add timestamps
- ✅ **Multi-Region Support** - Upload to storage centers worldwide
- ✅ **Secure Authentication** - Enterprise-grade security with access keys

**What You Can Upload**:
- Documents (PDF, Word, Excel, PowerPoint)
- Images (JPG, PNG, GIF, WebP)
- Videos (MP4, AVI, MOV, MKV)
- Audio files (MP3, WAV, FLAC)
- Archives (ZIP, RAR, 7Z)
- Any other file type

## 🎯 Use Cases

### Personal File Backup
- **Scenario**: Back up family photos, important documents, or personal files
- **Benefits**: Secure cloud storage with global accessibility
- **Example**: Upload vacation photos to a "Family Photos/2024" folder

### Content Sharing
- **Scenario**: Share large files that are too big for email
- **Benefits**: Generate shareable URLs for any file
- **Example**: Share a presentation with colleagues via cloud link

### Website Asset Management
- **Scenario**: Store images, videos, or documents for websites
- **Benefits**: Fast, reliable content delivery with global CDN
- **Example**: Upload product images for an online store

### Data Archiving
- **Scenario**: Long-term storage of business records or research data
- **Benefits**: Cost-effective storage with high durability
- **Example**: Archive quarterly financial reports with organized folder structure

### Media Processing Workflows
- **Scenario**: Store processed videos, images, or audio files
- **Benefits**: Integration with other OOMOL blocks for complete workflows
- **Example**: Upload edited videos after processing through other workflow blocks

## 🚀 Getting Started

### Prerequisites
- OOMOL platform account
- Alibaba Cloud account with OSS service enabled
- Access Key ID and Secret (stored securely in OOMOL secrets)

### Basic Setup
1. **Configure Your Credentials**
   - Add your Alibaba Cloud Access Key to OOMOL secrets as "AccessKey_ID"
   - Add your Secret Key as "AccessKey_Secret"

2. **Choose Your Storage Region**
   - Select from 20+ global regions including:
     - China regions (Hangzhou, Beijing, Shanghai, etc.)
     - International regions (US, Europe, Asia-Pacific)

3. **Set Your Storage Bucket**
   - Use an existing bucket or create a new one
   - Default bucket name: "oomol-flows"

### Simple Upload Example
1. Drag the "OSS Upload" block into your workflow
2. Select the file you want to upload
3. Choose your storage region
4. Configure optional settings:
   - Custom folder path (e.g., "documents/2024/")
   - Keep original filename or add timestamp
   - Set retry attempts for reliability
5. Run the workflow and monitor real-time progress

## 📊 Upload Progress Features

### Visual Progress Tracking
- Real-time percentage display (0-100%)
- Automatic progress updates during upload
- Clear completion indicators

### Smart Upload Handling
- **Small files** (under 1MB): Instant upload with progress indicators
- **Large files** (over 1MB): Chunked upload with detailed progress tracking
- **Network issues**: Automatic retry with exponential backoff

## 🔧 Advanced Configuration

### File Organization
```
bucket-name/
├── documents/
│   ├── 2024/
│   └── contracts/
├── media/
│   ├── images/
│   └── videos/
└── backups/
    └── daily/
```

### Naming Strategies
- **Keep Original**: `document.pdf`
- **Add Timestamp**: `1635789123_document.pdf`
- **Custom Path**: `projects/alpha/document.pdf`

### Retry Configuration
- Configure 0-5 retry attempts
- Automatic exponential backoff (1s, 2s, 4s, 8s, 10s)
- Handles temporary network issues gracefully

## 📈 Output Information

After successful upload, you receive:
- **Public URL**: Direct link to access your file
- **File Details**: Size, type, and upload timestamp
- **Storage Info**: Exact location and object key in bucket
- **Progress**: Final completion percentage (always 100%)

## 🔒 Security & Reliability

### Data Security
- Encrypted transmission (HTTPS)
- Secure credential management through OOMOL secrets
- No sensitive data stored in workflow configurations

### Reliability Features
- Automatic retry mechanism for failed uploads
- File integrity verification
- Comprehensive error handling and reporting

### Global Infrastructure
- 99.9% uptime SLA through Alibaba Cloud
- Global CDN for fast access worldwide
- Redundant storage across multiple data centers

## 💡 Tips for Best Results

1. **Large Files**: For files over 100MB, expect longer upload times but more detailed progress tracking
2. **Organization**: Use consistent folder naming conventions for better file management
3. **Naming**: Enable timestamps for files that might be updated frequently
4. **Regions**: Choose the region closest to your users for fastest access
5. **Retries**: Set higher retry counts for unstable network connections

## 🤝 Integration with Other OOMOL Blocks

This upload block works seamlessly with other OOMOL workflow blocks:
- **File Processing**: Upload results from image/video processing blocks
- **Data Analysis**: Store generated reports and visualizations
- **Automation**: Part of larger automated backup workflows
- **Content Management**: Integration with CMS and website deployment flows

## 📞 Support

For questions about using these blocks:
1. Check the OOMOL platform documentation
2. Review Alibaba Cloud OSS service documentation
3. Contact OOMOL support for workflow-specific issues

---

**Note**: This project focuses on cloud storage functionality. For file processing, analysis, or other operations, explore additional blocks in the OOMOL marketplace.