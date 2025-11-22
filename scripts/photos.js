// DoggyPaddle Photos Upload JavaScript

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
        customerName: formData.get('customerName'),
        email: formData.get('email'),
        dogName: formData.get('dogName'),
        sessionDate: formData.get('sessionDate'),
        caption: formData.get('caption'),
        imageUrl: '', // Will be filled after upload
        timestamp: new Date().toISOString()
      };

      // For now, we'll use a placeholder URL
      // In production, you'd upload to imgur, cloudinary, or firebase
      // Here's how you'd upload to imgur:
      /*
      const imgurClientId = window.DoggyPaddleConfig?.IMAGE_UPLOAD?.clientId;
      if (imgurClientId) {
        const imgurFormData = new FormData();
        imgurFormData.append('image', selectedFile);

        const imgurResponse = await fetch('https://api.imgur.com/3/image', {
          method: 'POST',
          headers: {
            'Authorization': `Client-ID ${imgurClientId}`
          },
          body: imgurFormData
        });

        if (imgurResponse.ok) {
          const imgurData = await imgurResponse.json();
          photoData.imageUrl = imgurData.data.link;
        }
      }
      */

      // For demo purposes, use base64 (not recommended for production)
      const reader = new FileReader();
      reader.onload = async (e) => {
        photoData.imageUrl = e.target.result;

        // Check if backend is configured
        if (!isBackendConfigured) {
          throw new Error(
            "Backend not configured. Please set up the Google Apps Script backend to enable photo uploads. " +
            "See /backend/README.md for setup instructions."
          );
        }

        // Save to backend
        try {
          const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            // Use a simple content type to avoid a CORS preflight (Google Apps Script
            // does not handle OPTIONS requests). The backend still receives the JSON
            // payload via e.postData.contents.
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'savePhoto', photo: photoData })
          });

          if (response.ok) {
            const result = await response.json();
            if (result.status === 'success') {
              // Show success message
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
            } else {
              throw new Error(result.message || 'Submission failed');
            }
          } else {
            throw new Error('Server error');
          }
        } catch (error) {
          console.error('Photo submission error:', error);
          alert('Failed to submit photo. Please try again.');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Photo for Review';
        }
      };
      reader.readAsDataURL(selectedFile);

    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload photo. Please try again.');
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
    const approvedPhotos = photos.filter(photo => photo.status === 'approved');

    if (approvedPhotos.length === 0) {
      galleryGrid.innerHTML = '<div class="loading">No photos yet. Be the first to share!</div>';
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
