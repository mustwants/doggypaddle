// DoggyPaddle Photos Upload JavaScript
//
// NOTE: If you see "content_script.js" errors in the browser console, these are
// from browser extensions (password managers, form autofill, etc.) and are NOT
// errors from this application. They can be safely ignored.

document.addEventListener('DOMContentLoaded', async () => {
  const uploadArea = document.getElementById('upload-area');
  const fileInput = document.getElementById('file-input');
  const previewContainer = document.getElementById('preview-container');
  const previewImage = document.getElementById('preview-image');
  const photoForm = document.getElementById('photo-form');
  const successMessage = document.getElementById('success-message');
  const galleryGrid = document.getElementById('gallery-grid');
  const galleryTabs = document.querySelectorAll('.gallery-tab');

  let selectedFile = null;
  let currentTab = 'recent';

  // API endpoint
  const API_ENDPOINT = window.DoggyPaddleConfig?.API_ENDPOINT ||
                       'https://script.google.com/macros/s/YOUR_DEPLOYED_WEBAPP_ID/exec';

  // Check if backend is configured
  const isBackendConfigured = API_ENDPOINT && !API_ENDPOINT.includes('YOUR_DEPLOYED_WEBAPP_ID');

  // Compress and optimize image before upload
  async function compressImage(file, maxWidth = 1920, maxHeight = 1080, quality = 0.85) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Calculate new dimensions while maintaining aspect ratio
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            const aspectRatio = width / height;
            if (width > height) {
              width = maxWidth;
              height = width / aspectRatio;
            } else {
              height = maxHeight;
              width = height * aspectRatio;
            }
          }

          // Create canvas and draw resized image
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          // Draw image on canvas (this strips EXIF data automatically)
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to data URL with compression
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

          // Log compression results
          const originalSize = (file.size / 1024).toFixed(2);
          const compressedSize = (compressedDataUrl.length * 0.75 / 1024).toFixed(2); // Approximate size
          console.log(`Image compressed: ${originalSize}KB → ${compressedSize}KB (${((1 - compressedSize/originalSize) * 100).toFixed(1)}% reduction)`);

          resolve(compressedDataUrl);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  
  // Upload area click
  uploadArea.addEventListener('click', () => {
    fileInput.click();
  });

  // Drag and drop
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  });

  // File input change
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  // Handle file selection
  function handleFile(file) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    selectedFile = file;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImage.src = e.target.result;
      previewContainer.style.display = 'block';
      successMessage.style.display = 'none';
    };
    reader.readAsDataURL(file);
  }

  // Form submission
  photoForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      alert('Please select a photo');
      return;
    }

    const submitBtn = photoForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading...';

    try {
      // Get form data
      const formData = new FormData(photoForm);
      const photoData = {
        id: `photo-${Date.now()}`,
        customerName: formData.get('customerName'),
        email: formData.get('email'),
        dogName: formData.get('dogName'),
        sessionDate: formData.get('sessionDate'),
        caption: formData.get('caption'),
        imageUrl: '', // Will be filled after upload
        status: 'pending',
        timestamp: new Date().toISOString()
      };

      // Step 1: Compress and optimize image
      submitBtn.textContent = 'Optimizing image...';
      try {
        photoData.imageUrl = await compressImage(selectedFile);
      } catch (compressionError) {
        console.warn('Image compression failed, using original:', compressionError);
        // Fallback to uncompressed if compression fails
        photoData.imageUrl = await fileToDataUrl(selectedFile);
      }

      // Step 2: Validate compressed size isn't too large for Google Sheets
      const estimatedSize = photoData.imageUrl.length * 0.75; // Approximate bytes
      if (estimatedSize > 1024 * 1024 * 2) { // 2MB limit for data URLs in sheets
        throw new Error('Image is too large even after compression. Please use a smaller image or lower resolution photo.');
      }

      // Step 3: Check if backend is configured
      if (!isBackendConfigured) {
        throw new Error(
          "Backend not configured. Please set up the Google Apps Script backend to enable photo uploads. " +
          "See /backend/README.md for setup instructions."
        );
      }

      // Step 4: Save to backend
      submitBtn.textContent = 'Submitting photo...';
      const requestBody = { action: 'savePhoto', photo: photoData };
      console.log('Sending photo upload request:', { action: requestBody.action, photoId: photoData.id });

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('Upload failed with status:', response.status, errorText);
        throw new Error(`Server error (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      console.log('Backend response:', result);

      if (result.status !== 'success') {
        console.error('Backend returned error:', result);

        // Special handling for "Invalid action" - indicates backend needs redeployment
        if (result.message === 'Invalid action') {
          throw new Error(
            'Backend deployment is outdated. The Google Apps Script needs to be redeployed with the latest code.\n\n' +
            'To fix this:\n' +
            '1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1q7yUDjuVSwXfL9PJUTny0oy5Nr5jlVKsdyik2-vTL8I/\n' +
            '2. Go to Extensions > Apps Script\n' +
            '3. Ensure the code matches /backend/google-apps-script.gs\n' +
            '4. Click Deploy > New deployment (NOT "Manage deployments")\n' +
            '5. Select type: Web app\n' +
            '6. Set "Who has access" to "Anyone"\n' +
            '7. Click "Deploy"\n\n' +
            'Note: You must create a NEW deployment each time you update the script.'
          );
        }

        throw new Error(result.message || 'Submission failed');
      }

      // Success! Show success message
      successMessage.style.display = 'block';
      photoForm.reset();
      previewContainer.style.display = 'none';
      selectedFile = null;

      // Scroll to success message
      successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Reload gallery after 2 seconds
      setTimeout(() => {
        loadGallery();
      }, 2000);

    } catch (error) {
      console.error('Upload error:', error);

      // Show user-friendly error message
      let errorMessage = 'Failed to upload photo.\n\n';
      if (error.message.includes('Backend deployment is outdated')) {
        errorMessage += error.message; // Full deployment instructions
      } else if (error.message.includes('Backend not configured')) {
        errorMessage += 'The backend is not set up yet. Please contact the administrator.';
      } else if (error.message.includes('too large')) {
        errorMessage += error.message;
      } else if (error.message.includes('Server error') || error.message.includes('502')) {
        errorMessage += 'There was a server error. This could be due to:\n';
        errorMessage += '• The image being too large\n';
        errorMessage += '• Network connectivity issues\n';
        errorMessage += '• Google Sheets API limits\n\n';
        errorMessage += 'Please try:\n';
        errorMessage += '1. Using a smaller or lower resolution photo\n';
        errorMessage += '2. Checking your internet connection\n';
        errorMessage += '3. Waiting a few minutes and trying again';
      } else if (error.message.includes('fetch')) {
        errorMessage += 'Network error. Please check your internet connection and try again.';
      } else {
        errorMessage += `${error.message}\n\nPlease try again or contact support if the problem persists.`;
      }

      alert(errorMessage);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Photo for Review';
    }
  });

  // Load gallery
  async function loadGallery() {
    galleryGrid.innerHTML = '<div class="loading">Loading photos...</div>';

    try {
      const response = await fetch(`${API_ENDPOINT}?action=getPhotos&admin=false`);

      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success') {
          renderGallery(result.photos);
        } else {
          showSampleGallery();
        }
      } else {
        showSampleGallery();
      }
    } catch (error) {
      console.warn('Using sample gallery:', error);
      showSampleGallery();
    }
  }

  // Render gallery
  function renderGallery(photos) {
    // Filter to only show approved photos (reject rejected and pending ones)
    let approvedPhotos = photos.filter(photo => photo.status === 'approved');

    // If viewing Featured tab, further filter to only featured photos
    if (currentTab === 'featured') {
      approvedPhotos = approvedPhotos.filter(photo => photo.featured === true || photo.featured === 'true');
    }

    if (approvedPhotos.length === 0) {
      const message = currentTab === 'featured'
        ? 'No featured photos yet.'
        : 'No photos yet. Be the first to share!';
      galleryGrid.innerHTML = `<div class="loading">${message}</div>`;
      return;
    }

    // Sort by date (most recent first)
    approvedPhotos.sort((a, b) => {
      const dateA = new Date(b.timestamp || b.createdAt || 0);
      const dateB = new Date(a.timestamp || a.createdAt || 0);
      return dateB - dateA;
    });

    galleryGrid.innerHTML = approvedPhotos.map(photo => `
      <div class="gallery-item">
        ${photo.featured ? '<div class="featured-badge">Featured</div>' : ''}
        <img src="${photo.imageUrl}" alt="${photo.dogName}" class="gallery-image"
             onerror="this.src='/assets/logo.png'" />
        <div class="gallery-caption">
          <div class="gallery-dog-name">${photo.dogName}</div>
          ${photo.caption ? `<div class="gallery-description">${photo.caption}</div>` : ''}
          <div class="gallery-date">
            ${photo.sessionDate ? `Session: ${photo.sessionDate}` : ''}
            ${photo.customerName ? ` - by ${photo.customerName}` : ''}
          </div>
        </div>
      </div>
    `).join('');
  }

  // Show sample gallery - loads from localStorage
  function showSampleGallery() {
    // Load photos from localStorage
    const storedPhotos = JSON.parse(localStorage.getItem('doggypaddle_photos') || '[]');

    if (storedPhotos.length > 0) {
      // Use photos from localStorage
      renderGallery(storedPhotos);
    } else {
      // No photos yet - show empty state
      galleryGrid.innerHTML = '<div class="loading">No photos yet. Be the first to share!</div>';
    }
  }

  // Gallery tabs
  galleryTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      galleryTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.dataset.tab;
      loadGallery();
    });
  });

  // Initialize gallery
  loadGallery();
});
