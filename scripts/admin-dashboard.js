// Admin Dashboard Enhancements for DoggyPaddle
// This file extends the base admin functionality with time slots, bookings, and photos management

// Expose initialization function globally so it can be called when loaded dynamically
window.initAdminDashboard = function() {
  console.log('Initializing admin dashboard enhancements...');
  // DISABLED: Do not auto-initialize sample data (causes fake data to appear)
  // initializeSampleData();

  // Wait for base store.js and modals to initialize
  setTimeout(initAdminEnhancements, 500);
};

// Also initialize on DOMContentLoaded if script is loaded normally
document.addEventListener('DOMContentLoaded', () => {
  window.initAdminDashboard();
});

// Initialize sample data (products and photos) if database is empty
// DISABLED: This function auto-populated fake data when localStorage was empty
// To restore functionality, uncomment the initializeSampleData() call in initAdminDashboard()
function initializeSampleData() {
  // Initialize sample products if none exist
  const products = JSON.parse(localStorage.getItem('doggypaddle_products') || '[]');
  if (products.length === 0) {
    const sampleProducts = [
      {
        id: 'prod-1',
        name: 'Dog Treats - Peanut Butter',
        description: 'Delicious all-natural peanut butter treats. Made with real peanut butter and no artificial ingredients.',
        price: 12.99,
        category: 'Treats',
        imageUrl: '/assets/products/treats1.jpg',
        inStock: true,
        quantity: 50,
        lowStockThreshold: 10
      },
      {
        id: 'prod-2',
        name: 'Dog Treats - Bacon Flavor',
        description: 'Crispy bacon-flavored treats your dog will love. Perfect for training or as a special reward.',
        price: 14.99,
        category: 'Treats',
        imageUrl: '/assets/products/treats2.jpg',
        inStock: true,
        quantity: 45,
        lowStockThreshold: 10
      },
      {
        id: 'prod-3',
        name: 'Swimming Vest - Small',
        description: 'Safety vest for small dogs (up to 25 lbs). Bright orange color for visibility.',
        price: 29.99,
        category: 'Accessories',
        imageUrl: '/assets/products/vest-small.jpg',
        inStock: true,
        quantity: 15,
        lowStockThreshold: 5
      },
      {
        id: 'prod-4',
        name: 'Swimming Vest - Large',
        description: 'Safety vest for large dogs (25+ lbs). Adjustable straps and durable construction.',
        price: 34.99,
        category: 'Accessories',
        imageUrl: '/assets/products/vest-large.jpg',
        inStock: true,
        quantity: 20,
        lowStockThreshold: 5
      }
    ];
    localStorage.setItem('doggypaddle_products', JSON.stringify(sampleProducts));
    console.log('✓ Initialized sample products');
  }

  // Initialize sample photos if none exist
  const photos = JSON.parse(localStorage.getItem('doggypaddle_photos') || '[]');
  if (photos.length === 0) {
    const samplePhotos = [
      {
        timestamp: new Date('2024-11-09').getTime(),
        customerName: 'Sarah',
        email: 'sarah@example.com',
        dogName: 'Remi',
        caption: 'First time in the pool! Had so much fun!',
        sessionDate: '11/9/2024',
        imageUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzAyODA5MCIvPjx0ZXh0IHg9IjUwJSIgeT0iNDAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iNDgiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7wn5CVPC90ZXh0Pjx0ZXh0IHg9IjUwJSIgeT0iNjAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5SZW1pPC90ZXh0Pjx0ZXh0IHg9IjUwJSIgeT0iNzUlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5GaXJzdCB0aW1lIGluIHRoZSBwb29sITwvdGV4dD48L3N2Zz4=',
        status: 'approved',
        featured: false
      },
      {
        timestamp: new Date('2024-11-11').getTime(),
        customerName: 'John',
        email: 'john@example.com',
        dogName: 'Max',
        caption: 'Max loves his swimming sessions!',
        sessionDate: '11/11/2024',
        imageUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzAyQzM5QSIvPjx0ZXh0IHg9IjUwJSIgeT0iNDAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iNDgiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7wn5CVPC90ZXh0Pjx0ZXh0IHg9IjUwJSIgeT0iNjAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5NYXg8L3RleHQ+PHRleHQgeD0iNTAlIiB5PSI3NSUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkxvdmVzIHN3aW1taW5nITwvdGV4dD48L3N2Zz4=',
        status: 'approved',
        featured: false
      },
      {
        timestamp: new Date('2024-11-12').getTime(),
        customerName: 'Emily',
        email: 'emily@example.com',
        dogName: 'Bella',
        caption: 'Great exercise for Bella!',
        sessionDate: '11/12/2024',
        imageUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI0Y3OTI1NiIvPjx0ZXh0IHg9IjUwJSIgeT0iNDAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iNDgiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7wn5CVwqA8L3RleHQ+PHRleHQgeD0iNTAlIiB5PSI2MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkJlbGxhPC90ZXh0Pjx0ZXh0IHg9IjUwJSIgeT0iNzUlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5HcmVhdCBleGVyY2lzZSE8L3RleHQ+PC9zdmc+',
        status: 'approved',
        featured: false
      },
      {
        timestamp: new Date('2024-11-13').getTime(),
        customerName: 'Mike',
        email: 'mike@example.com',
        dogName: 'Charlie',
        caption: 'Charlie is a natural swimmer!',
        sessionDate: '11/13/2024',
        imageUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzY2NjZGRiIvPjx0ZXh0IHg9IjUwJSIgeT0iNDAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iNDgiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7wn5CVPC90ZXh0Pjx0ZXh0IHg9IjUwJSIgeT0iNjAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5DaGFybGllPC90ZXh0Pjx0ZXh0IHg9IjUwJSIgeT0iNzUlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5OYXR1cmFsIHN3aW1tZXIhPC90ZXh0Pjwvc3ZnPg==',
        status: 'approved',
        featured: false
      }
    ];
    localStorage.setItem('doggypaddle_photos', JSON.stringify(samplePhotos));
    console.log('✓ Initialized sample photos');
  }
}

function initAdminEnhancements() {
  // Expose functions globally
  window.loadTimeSlots = loadTimeSlots;
  window.loadBookings = loadBookings;
  window.loadPhotos = loadPhotos;
  window.loadAdminProducts = loadAdminProductsList;

  // Tab switching
  const adminTabs = document.querySelectorAll('.admin-tab');
  const adminTabContents = document.querySelectorAll('.admin-tab-content');

  adminTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;

      // Update active tab
      adminTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Update active content
      adminTabContents.forEach(content => content.classList.remove('active'));
      const targetContent = document.getElementById(`admin-${tabName}-tab`);
      if (targetContent) {
        targetContent.classList.add('active');
      }

      // Load data for the selected tab
      switch(tabName) {
        case 'products':
          loadAdminProductsList();
          break;
        case 'timeslots':
          loadTimeSlots();
          break;
        case 'bookings':
          loadBookings();
          break;
        case 'photos':
          loadPhotos();
          break;
      }
    });
  });

  // Initialize all the features
  initProductManagement();
  initTimeSlotManagement();
  initBookingsManagement();
  initPhotosManagement();
}

// ============================================
// PRODUCT MANAGEMENT
// ============================================

let currentEditingProduct = null;

function initProductManagement() {
  const addProductBtn = document.getElementById('add-product-btn');
  if (!addProductBtn) return;

  // Add product button
  addProductBtn.addEventListener('click', () => {
    // Wait for modal to be loaded from store page
    setTimeout(() => {
      const productFormModal = document.getElementById('product-form-modal');
      const productForm = document.getElementById('product-form');

      if (!productFormModal || !productForm) {
        showNotification('Product form not loaded yet. Please try again.', 'warning');
        return;
      }

      currentEditingProduct = null;
      document.getElementById('product-form-title').textContent = 'Add Product/Treat';
      productForm.reset();
      productFormModal.style.display = 'flex';
    }, 100);
  });

  // Set up form submission handler after modals are loaded
  setTimeout(() => {
    const productForm = document.getElementById('product-form');
    const productFormModal = document.getElementById('product-form-modal');
    const closeProductFormBtn = document.getElementById('close-product-form');
    const cancelProductFormBtn = document.getElementById('cancel-product-form');

    if (productForm) {
      productForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveProduct();
      });
    }

    if (closeProductFormBtn) {
      closeProductFormBtn.addEventListener('click', () => {
        if (productFormModal) productFormModal.style.display = 'none';
      });
    }

    if (cancelProductFormBtn) {
      cancelProductFormBtn.addEventListener('click', () => {
        if (productFormModal) productFormModal.style.display = 'none';
      });
    }

    // Set up product image upload toggle
    const imageTypeRadios = document.querySelectorAll('input[name="image-type"]');
    const urlInputContainer = document.getElementById('url-input-container');
    const uploadInputContainer = document.getElementById('upload-input-container');
    const productImagePreview = document.getElementById('product-image-preview');
    const productImagePreviewImg = document.getElementById('product-image-preview-img');
    const productImageUrl = document.getElementById('product-image');
    const productImageFile = document.getElementById('product-image-file');

    if (imageTypeRadios && urlInputContainer && uploadInputContainer) {
      imageTypeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
          if (radio.value === 'url') {
            urlInputContainer.style.display = 'block';
            uploadInputContainer.style.display = 'none';
            productImagePreview.style.display = 'none';
          } else {
            urlInputContainer.style.display = 'none';
            uploadInputContainer.style.display = 'block';
          }
        });
      });
    }

    // Handle product file selection and preview
    if (productImageFile && productImagePreview && productImagePreviewImg) {
      productImageFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          // Validate file type
          if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            productImageFile.value = '';
            return;
          }

          // Validate file size (5MB max)
          if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            productImageFile.value = '';
            return;
          }

          // Show preview
          const reader = new FileReader();
          reader.onload = (e) => {
            productImagePreviewImg.src = e.target.result;
            productImagePreview.style.display = 'block';
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // Handle product URL input preview
    if (productImageUrl && productImagePreview && productImagePreviewImg) {
      productImageUrl.addEventListener('blur', () => {
        const url = productImageUrl.value.trim();
        if (url) {
          productImagePreviewImg.src = url;
          productImagePreview.style.display = 'block';
          productImagePreviewImg.onerror = () => {
            productImagePreview.style.display = 'none';
          };
        }
      });
    }
  }, 1000);
}

function loadAdminProductsList() {
  const productsList = document.getElementById('admin-products-list');
  if (!productsList) return;

  const products = JSON.parse(localStorage.getItem('doggypaddle_products') || '[]');

  if (products.length === 0) {
    productsList.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-light);">No products found. Click "Add New Product/Treat" to create one.</p>';
    return;
  }

  productsList.innerHTML = products.map(product => {
    const quantity = product.quantity || 0;
    const lowStockThreshold = product.lowStockThreshold || 5;
    const isLowStock = quantity > 0 && quantity <= lowStockThreshold;

    return `
      <div class="admin-product-item" style="
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 1rem;
        display: flex;
        gap: 1rem;
        align-items: center;
      ">
        <img src="${product.imageUrl}" alt="${product.name}" class="admin-product-image"
             style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px;"
             onerror="this.src='/assets/logo.png'" />
        <div class="admin-item-details" style="flex: 1;">
          <div class="admin-item-name" style="font-weight: 600; font-size: 1.1rem; margin-bottom: 0.25rem;">
            ${product.name}
            <span style="
              display: inline-block;
              padding: 0.25rem 0.5rem;
              border-radius: 4px;
              font-size: 0.75rem;
              margin-left: 0.5rem;
              background: ${product.inStock ? '#d4edda' : '#f8d7da'};
              color: ${product.inStock ? '#155724' : '#721c24'};
            ">
              ${product.inStock ? 'Active' : 'Inactive'}
            </span>
            ${isLowStock ? '<span style="display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; margin-left: 0.5rem; background: #fff3cd; color: #856404;">⚠️ Low Stock</span>' : ''}
            ${quantity === 0 ? '<span style="display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; margin-left: 0.5rem; background: #f8d7da; color: #721c24;">0 Stock</span>' : ''}
          </div>
          <div class="admin-item-info" style="color: #666; font-size: 0.85rem;">${product.category}</div>
          <div class="admin-item-info" style="color: #666; font-size: 0.85rem;">${product.description}</div>
          <div class="admin-item-info" style="color: #666; font-size: 0.85rem;"><strong>Quantity:</strong> ${quantity} ${isLowStock ? '⚠️' : ''}</div>
          ${product.purchaseLink ? `<div class="admin-item-info" style="color: #666; font-size: 0.85rem;"><strong>Purchase Link:</strong> <a href="${product.purchaseLink}" target="_blank" rel="noopener" style="color: #02C39A;">🔗 ${product.purchaseLink.length > 40 ? product.purchaseLink.substring(0, 40) + '...' : product.purchaseLink}</a></div>` : ''}
          <div class="admin-item-price" style="font-size: 1.1rem; font-weight: 700; color: var(--primary, #028090); margin-top: 0.25rem;">$${product.price.toFixed(2)}</div>
        </div>
        <div class="admin-item-actions" style="display: flex; flex-direction: column; gap: 0.5rem;">
          <button class="admin-btn admin-btn-edit" onclick="window.editAdminProduct('${product.id}')"
                  style="padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer; background: #02C39A; color: white; font-weight: 600;">
            Edit
          </button>
          <button class="admin-btn admin-btn-toggle" onclick="window.toggleProductStock('${product.id}')"
                  style="padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer; background: #ffc107; color: white; font-weight: 600;">
            ${product.inStock ? 'Deactivate' : 'Activate'}
          </button>
          <button class="admin-btn admin-btn-delete" onclick="window.deleteAdminProduct('${product.id}')"
                  style="padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer; background: #dc3545; color: white; font-weight: 600;">
            Delete
          </button>
        </div>
      </div>
    `;
  }).join('');
}

async function saveProduct() {
  const products = JSON.parse(localStorage.getItem('doggypaddle_products') || '[]');
  const quantity = parseInt(document.getElementById('product-quantity').value) || 0;
  const purchaseLink = document.getElementById('product-purchase-link')?.value || '';

  // Determine if URL or file upload was used
  const selectedImageType = document.querySelector('input[name="image-type"]:checked')?.value || 'url';
  let imageUrl = '';

  try {
    if (selectedImageType === 'url') {
      imageUrl = document.getElementById('product-image').value;
    } else {
      // Handle file upload - convert to base64
      const fileInput = document.getElementById('product-image-file');
      const file = fileInput?.files[0];

      if (file) {
        // Convert file to base64
        imageUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } else {
        // If editing and no new file selected, keep existing image
        if (currentEditingProduct && currentEditingProduct.imageUrl) {
          imageUrl = currentEditingProduct.imageUrl;
        }
      }
    }

    const productData = {
      id: currentEditingProduct?.id || `prod-${Date.now()}`,
      name: document.getElementById('product-name').value,
      description: document.getElementById('product-description').value,
      price: parseFloat(document.getElementById('product-price').value),
      category: document.getElementById('product-category').value,
      imageUrl: imageUrl,
      purchaseLink: purchaseLink,
      inStock: document.getElementById('product-instock').checked,
      quantity: quantity,
      lowStockThreshold: parseInt(document.getElementById('product-low-stock').value) || 5
    };

    if (currentEditingProduct) {
      // Update existing product
      const index = products.findIndex(p => p.id === currentEditingProduct.id);
      if (index !== -1) {
        products[index] = productData;
      }
    } else {
      // Add new product
      products.push(productData);
    }

    localStorage.setItem('doggypaddle_products', JSON.stringify(products));

    const productFormModal = document.getElementById('product-form-modal');
    if (productFormModal) productFormModal.style.display = 'none';

    loadAdminProductsList();

    // Reload store display
    if (typeof window.reloadStoreProducts === 'function') {
      window.reloadStoreProducts();
    }

    showNotification(currentEditingProduct ? 'Product updated!' : 'Product added!', 'success');
  } catch (error) {
    console.error('Error saving product:', error);
    alert('Failed to save product. Please try again.');
  }
}

window.editAdminProduct = function(productId) {
  const products = JSON.parse(localStorage.getItem('doggypaddle_products') || '[]');
  const product = products.find(p => p.id === productId);

  if (!product) return;

  setTimeout(() => {
    const productFormModal = document.getElementById('product-form-modal');
    if (!productFormModal) {
      showNotification('Product form not loaded yet. Please try again.', 'warning');
      return;
    }

    currentEditingProduct = product;
    document.getElementById('product-form-title').textContent = 'Edit Product/Treat';
    document.getElementById('product-id').value = product.id;
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-description').value = product.description;
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-category').value = product.category;
    document.getElementById('product-image').value = product.imageUrl;

    // Set purchase link if field exists
    const purchaseLinkField = document.getElementById('product-purchase-link');
    if (purchaseLinkField) {
      purchaseLinkField.value = product.purchaseLink || '';
    }

    document.getElementById('product-instock').checked = product.inStock;
    document.getElementById('product-quantity').value = product.quantity || 0;
    document.getElementById('product-low-stock').value = product.lowStockThreshold || 5;

    // Set image type to URL when editing (since we're displaying the existing URL)
    const urlRadio = document.querySelector('input[name="image-type"][value="url"]');
    if (urlRadio) {
      urlRadio.checked = true;
      // Trigger the change event to show/hide appropriate containers
      urlRadio.dispatchEvent(new Event('change'));
    }

    // Show image preview
    const productImagePreview = document.getElementById('product-image-preview');
    const productImagePreviewImg = document.getElementById('product-image-preview-img');
    if (productImagePreview && productImagePreviewImg && product.imageUrl) {
      productImagePreviewImg.src = product.imageUrl;
      productImagePreview.style.display = 'block';
    }

    productFormModal.style.display = 'flex';
  }, 100);
};

window.toggleProductStock = function(productId) {
  const products = JSON.parse(localStorage.getItem('doggypaddle_products') || '[]');
  const product = products.find(p => p.id === productId);

  if (!product) return;

  product.inStock = !product.inStock;
  localStorage.setItem('doggypaddle_products', JSON.stringify(products));

  loadAdminProductsList();

  // Reload store display
  if (typeof window.reloadStoreProducts === 'function') {
    window.reloadStoreProducts();
  }

  showNotification(`Product ${product.inStock ? 'activated' : 'deactivated'}!`, 'success');
};

window.deleteAdminProduct = function(productId) {
  if (!confirm('Are you sure you want to delete this product?')) return;

  let products = JSON.parse(localStorage.getItem('doggypaddle_products') || '[]');
  products = products.filter(p => p.id !== productId);
  localStorage.setItem('doggypaddle_products', JSON.stringify(products));

  loadAdminProductsList();

  // Reload store display
  if (typeof window.reloadStoreProducts === 'function') {
    window.reloadStoreProducts();
  }

  showNotification('Product deleted!', 'success');
};

// ============================================
// TIME SLOTS MANAGEMENT
// ============================================

// Global state for calendar view
let currentWeekStart = null;
let selectedSlots = new Set();
let calendarViewMode = 'calendar'; // 'calendar' or 'list'
let adminSlots = []; // Slots fetched from Google Sheets backend

// Get API endpoint from config
const API_ENDPOINT = window.DoggyPaddleConfig?.API_ENDPOINT || '';
const isBackendConfigured = API_ENDPOINT && !API_ENDPOINT.includes('YOUR_DEPLOYED_WEBAPP_ID');

function initTimeSlotManagement() {
  const addTimeslotBtn = document.getElementById('add-timeslot-btn');
  const bulkAddSlotsBtn = document.getElementById('bulk-add-slots-btn');
  const timeslotFormModal = document.getElementById('timeslot-form-modal');
  const bulkTimeslotModal = document.getElementById('bulk-timeslot-modal');
  const timeslotForm = document.getElementById('timeslot-form');
  const bulkTimeslotForm = document.getElementById('bulk-timeslot-form');

  if (!addTimeslotBtn) return;

  // Initialize current week to this week
  const today = new Date();
  currentWeekStart = getStartOfWeek(today);

  // Add time slot button
  addTimeslotBtn.addEventListener('click', () => {
    document.getElementById('timeslot-form-title').textContent = 'Add Time Slot';
    document.getElementById('timeslot-id').value = '';
    timeslotForm.reset();
    // Set default date to today
    document.getElementById('timeslot-date').value = new Date().toISOString().split('T')[0];
    timeslotFormModal.style.display = 'flex';
  });

  // Bulk add slots button
  bulkAddSlotsBtn.addEventListener('click', () => {
    bulkTimeslotForm.reset();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('bulk-start-date').value = today;
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    document.getElementById('bulk-end-date').value = nextWeek.toISOString().split('T')[0];
    bulkTimeslotModal.style.display = 'flex';
  });

  // Close buttons
  document.getElementById('close-timeslot-form')?.addEventListener('click', () => {
    timeslotFormModal.style.display = 'none';
  });

  document.getElementById('cancel-timeslot-form')?.addEventListener('click', () => {
    timeslotFormModal.style.display = 'none';
  });

  document.getElementById('close-bulk-timeslot')?.addEventListener('click', () => {
    bulkTimeslotModal.style.display = 'none';
  });

  document.getElementById('cancel-bulk-timeslot')?.addEventListener('click', () => {
    bulkTimeslotModal.style.display = 'none';
  });

  // Time slot form submission
  timeslotForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveTimeSlot();
  });

  // Bulk time slot form submission
  bulkTimeslotForm.addEventListener('submit', (e) => {
    e.preventDefault();
    generateBulkTimeSlots();
  });
}

// Helper function to get the start of week (Sunday)
function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // Sunday is 0
  return new Date(d.setDate(diff));
}

// Helper function to format date as YYYY-MM-DD
function formatDateYMD(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper function to format date in long format
function formatDateLong(dateInput) {
  let date;
  if (typeof dateInput === 'string') {
    date = new Date(dateInput + 'T12:00:00');
  } else {
    date = dateInput;
  }
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function loadTimeSlots() {
  const timeslotsList = document.getElementById('admin-timeslots-list');
  if (!timeslotsList) return;

  // Render calendar view
  renderCalendarView();
}

// Fetch slots from Google Sheets backend
async function fetchAdminSlots() {
  if (!isBackendConfigured) {
    console.error('❌ Backend not configured. Cannot fetch timeslots.');
    showNotification('Backend not configured. Please check API_ENDPOINT in config.js', 'error');
    return [];
  }

  try {
    console.log('Fetching all timeslots from Google Sheets backend...');
    const response = await fetch(`${API_ENDPOINT}?action=getAllSlots`);

    if (response.ok) {
      const data = await response.json();
      if (data.status === 'success' && data.slots) {
        adminSlots = data.slots;
        console.log(`✓ Loaded ${adminSlots.length} timeslots from Google Sheets`);
        return adminSlots;
      } else {
        console.error('Backend returned error:', data.message);
        showNotification('Failed to load timeslots: ' + data.message, 'error');
        return [];
      }
    } else {
      console.error('Failed to fetch timeslots. HTTP status:', response.status);
      showNotification('Failed to load timeslots from backend', 'error');
      return [];
    }
  } catch (error) {
    console.error('Error fetching timeslots:', error);
    showNotification('Error connecting to backend: ' + error.message, 'error');
    return [];
  }
}

async function renderCalendarView() {
  const timeslotsList = document.getElementById('admin-timeslots-list');
  if (!timeslotsList) return;

  // Fetch slots from Google Sheets backend (not localStorage)
  await fetchAdminSlots();
  const slots = adminSlots;

  // Define time slots: 8:00 AM to 9:00 PM EST, 20-minute intervals at :00 and :40
  const timeSlots = [];
  for (let hour = 8; hour <= 21; hour++) {
    timeSlots.push(`${String(hour).padStart(2, '0')}:00`);
    if (hour < 21) { // Don't add :40 for 9 PM
      timeSlots.push(`${String(hour).padStart(2, '0')}:40`);
    }
  }

  // Get 7 days starting from currentWeekStart
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(currentWeekStart);
    date.setDate(currentWeekStart.getDate() + i);
    weekDays.push(date);
  }

  // Create calendar HTML
  let html = `
    <div style="margin-bottom: 1.5rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <button onclick="navigateWeek(-1)" class="btn btn-secondary" style="padding: 0.5rem 1rem;">
          ← Previous Week
        </button>
        <h3 style="margin: 0; color: var(--primary, #028090);">
          ${formatDateLong(weekDays[0])} - ${formatDateLong(weekDays[6])}
        </h3>
        <button onclick="navigateWeek(1)" class="btn btn-secondary" style="padding: 0.5rem 1rem;">
          Next Week →
        </button>
      </div>

      <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem; align-items: center;">
        <button onclick="clearSelection()" class="btn btn-secondary" style="padding: 0.5rem 1rem;" ${selectedSlots.size === 0 ? 'disabled' : ''}>
          Clear Selection (${selectedSlots.size})
        </button>
        <button onclick="bulkDeleteSelected()" class="btn" style="padding: 0.5rem 1rem; background: #dc3545; color: white;" ${selectedSlots.size === 0 ? 'disabled' : ''}>
          Delete Selected (${selectedSlots.size})
        </button>
        <button onclick="bulkToggleStatus('available')" class="btn" style="padding: 0.5rem 1rem; background: #28a745; color: white;" ${selectedSlots.size === 0 ? 'disabled' : ''}>
          Mark Available
        </button>
        <button onclick="bulkToggleStatus('blocked')" class="btn" style="padding: 0.5rem 1rem; background: #ffc107; color: #000;" ${selectedSlots.size === 0 ? 'disabled' : ''}>
          Mark Blocked
        </button>
      </div>
    </div>

    <div class="calendar-grid" style="
      display: grid;
      grid-template-columns: 80px repeat(7, 1fr);
      gap: 1px;
      background: #ddd;
      border: 1px solid #ddd;
      overflow-x: auto;
    ">
      <!-- Header Row -->
      <div style="background: #f8f9fa; padding: 0.75rem; text-align: center; font-weight: 700; border-bottom: 2px solid #028090;">
        Time
      </div>
      ${weekDays.map(date => `
        <div style="background: #f8f9fa; padding: 0.75rem; text-align: center; font-weight: 700; border-bottom: 2px solid #028090;">
          <div style="font-size: 0.85rem;">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]}</div>
          <div style="font-size: 0.95rem;">${date.getMonth() + 1}/${date.getDate()}</div>
        </div>
      `).join('')}

      <!-- Time Slots -->
      ${timeSlots.map(time => `
        <div style="background: #f8f9fa; padding: 0.5rem; text-align: center; font-weight: 600; font-size: 0.85rem;">
          ${formatTime(time)}
        </div>
        ${weekDays.map(date => {
          const dateStr = formatDateYMD(date);
          const slot = slots.find(s => s.date === dateStr && s.time === time);
          const slotKey = `${dateStr}|${time}`;
          const isSelected = selectedSlots.has(slotKey);

          let bgColor = '#fff';
          let borderColor = '#e0e0e0';
          let text = '';
          let textColor = '#666';

          if (slot) {
            if (slot.status === 'available') {
              bgColor = '#d4edda';
              borderColor = '#28a745';
              text = '✓';
              textColor = '#28a745';
            } else if (slot.status === 'booked') {
              bgColor = '#fff3cd';
              borderColor = '#ffc107';
              text = 'Booked';
              textColor = '#856404';
            } else if (slot.status === 'blocked') {
              bgColor = '#f8d7da';
              borderColor = '#dc3545';
              text = '✗';
              textColor = '#dc3545';
            }
          }

          if (isSelected) {
            borderColor = '#028090';
            bgColor = slot ? bgColor : '#e3f2fd';
          }

          return `
            <div
              class="calendar-slot"
              data-date="${dateStr}"
              data-time="${time}"
              data-has-slot="${!!slot}"
              data-slot-id="${slot ? slot.id : ''}"
              onclick="toggleSlot('${dateStr}', '${time}')"
              style="
                background: ${bgColor};
                padding: 0.5rem;
                text-align: center;
                cursor: pointer;
                border: 2px solid ${borderColor};
                transition: all 0.2s ease;
                min-height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.85rem;
                font-weight: 600;
                color: ${textColor};
              "
              onmouseover="this.style.opacity='0.8'"
              onmouseout="this.style.opacity='1'"
            >
              ${text}
            </div>
          `;
        }).join('')}
      `).join('')}
    </div>

    <div style="margin-top: 1.5rem; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
      <h4 style="margin: 0 0 0.5rem 0;">Legend:</h4>
      <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; font-size: 0.9rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <div style="width: 20px; height: 20px; background: #d4edda; border: 2px solid #28a745;"></div>
          <span>Available</span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <div style="width: 20px; height: 20px; background: #fff3cd; border: 2px solid #ffc107;"></div>
          <span>Booked</span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <div style="width: 20px; height: 20px; background: #f8d7da; border: 2px solid #dc3545;"></div>
          <span>Blocked</span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <div style="width: 20px; height: 20px; background: #fff; border: 2px solid #e0e0e0;"></div>
          <span>Empty (click to add)</span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <div style="width: 20px; height: 20px; background: #e3f2fd; border: 2px solid #028090;"></div>
          <span>Selected</span>
        </div>
      </div>
    </div>
  `;

  timeslotsList.innerHTML = html;
}

// Toggle slot selection
window.toggleSlot = function(date, time) {
  const slotKey = `${date}|${time}`;

  if (selectedSlots.has(slotKey)) {
    selectedSlots.delete(slotKey);
  } else {
    selectedSlots.add(slotKey);
  }

  renderCalendarView();
}

// Clear selection
window.clearSelection = function() {
  selectedSlots.clear();
  renderCalendarView();
}

// Navigate week
window.navigateWeek = function(direction) {
  const newDate = new Date(currentWeekStart);
  newDate.setDate(newDate.getDate() + (direction * 7));
  currentWeekStart = newDate;
  selectedSlots.clear(); // Clear selection when changing weeks
  renderCalendarView();
}

// Bulk delete selected slots
window.bulkDeleteSelected = function() {
  if (selectedSlots.size === 0) return;

  if (!confirm(`Are you sure you want to delete ${selectedSlots.size} time slot(s)?`)) return;

  const slots = JSON.parse(localStorage.getItem('doggypaddle_timeslots') || '[]');
  const selectedArray = Array.from(selectedSlots).map(key => {
    const [date, time] = key.split('|');
    return { date, time };
  });

  // Filter out slots that match selected date/time combinations
  const filtered = slots.filter(slot => {
    return !selectedArray.some(sel => sel.date === slot.date && sel.time === slot.time);
  });

  localStorage.setItem('doggypaddle_timeslots', JSON.stringify(filtered));
  selectedSlots.clear();
  renderCalendarView();
  showNotification(`Deleted ${slots.length - filtered.length} time slot(s)`, 'success');
}

// Bulk toggle status for selected slots
window.bulkToggleStatus = function(newStatus) {
  if (selectedSlots.size === 0) return;

  const slots = JSON.parse(localStorage.getItem('doggypaddle_timeslots') || '[]');
  const selectedArray = Array.from(selectedSlots).map(key => {
    const [date, time] = key.split('|');
    return { date, time };
  });

  let modified = 0;
  let created = 0;

  selectedArray.forEach(sel => {
    const existingSlot = slots.find(s => s.date === sel.date && s.time === sel.time);

    if (existingSlot) {
      // Update existing slot
      existingSlot.status = newStatus;
      modified++;
    } else {
      // Create new slot
      slots.push({
        id: `slot-${Date.now()}-${created}`,
        date: sel.date,
        time: sel.time,
        duration: 20, // 20-minute slots
        status: newStatus
      });
      created++;
    }
  });

  localStorage.setItem('doggypaddle_timeslots', JSON.stringify(slots));
  selectedSlots.clear();
  renderCalendarView();

  const message = created > 0
    ? `Created ${created} new slot(s) and updated ${modified} existing slot(s)`
    : `Updated ${modified} slot(s)`;
  showNotification(message, 'success');
}

window.cleanupInvalidTimeSlots = function() {
  if (!confirm('This will permanently delete all time slots with invalid time formats. Continue?')) {
    return;
  }

  const slots = JSON.parse(localStorage.getItem('doggypaddle_timeslots') || '[]');
  const validSlots = slots.filter(slot => validateTimeFormat(slot.time));
  const removedCount = slots.length - validSlots.length;

  localStorage.setItem('doggypaddle_timeslots', JSON.stringify(validSlots));
  loadTimeSlots();
  showNotification(`Removed ${removedCount} invalid time slot${removedCount > 1 ? 's' : ''}`, 'success');
}

async function saveTimeSlot() {
  const date = document.getElementById('timeslot-date').value;
  const time = document.getElementById('timeslot-time').value;
  const duration = parseInt(document.getElementById('timeslot-duration').value);
  const status = document.getElementById('timeslot-status').value;

  // Validate time format
  if (!validateTimeFormat(time)) {
    alert('Invalid time format. Please select a valid time.');
    return;
  }

  if (!isBackendConfigured) {
    showNotification('Backend not configured. Cannot save timeslot.', 'error');
    return;
  }

  const slot = { date, time, duration, status };

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'addSlot', slot: slot })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.status === 'success') {
        document.getElementById('timeslot-form-modal').style.display = 'none';
        await renderCalendarView();
        showNotification('Time slot saved successfully!', 'success');
      } else {
        showNotification('Error: ' + data.message, 'error');
      }
    } else {
      showNotification('Failed to save timeslot', 'error');
    }
  } catch (error) {
    console.error('Error saving timeslot:', error);
    showNotification('Error saving timeslot: ' + error.message, 'error');
  }
}

async function generateBulkTimeSlots() {
  const startDate = new Date(document.getElementById('bulk-start-date').value);
  const endDate = new Date(document.getElementById('bulk-end-date').value);
  const startTime = document.getElementById('bulk-start-time').value;
  const endTime = document.getElementById('bulk-end-time').value;
  const duration = parseInt(document.getElementById('bulk-duration').value);

  const selectedDays = Array.from(document.querySelectorAll('input[name="bulk-days"]:checked'))
    .map(cb => parseInt(cb.value));

  if (selectedDays.length === 0) {
    alert('Please select at least one day of the week.');
    return;
  }

  if (!isBackendConfigured) {
    showNotification('Backend not configured. Cannot add timeslots.', 'error');
    return;
  }

  const slotsToAdd = [];

  // Generate all slots first
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();

    // Skip if this day is not selected
    if (!selectedDays.includes(dayOfWeek)) continue;

    const dateStr = d.toISOString().split('T')[0];

    // Generate time slots for this day
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    for (let mins = startMinutes; mins < endMinutes; mins += duration) {
      const hour = Math.floor(mins / 60);
      const minute = mins % 60;

      // Skip if hour is beyond 23 (invalid time)
      if (hour > 23) continue;

      const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

      // Validate the generated time
      if (!validateTimeFormat(timeStr)) {
        console.error('Generated invalid time, skipping:', timeStr);
        continue;
      }

      slotsToAdd.push({ date: dateStr, time: timeStr, duration, status: 'available' });
    }
  }

  // Add all slots to backend
  try {
    showNotification(`Adding ${slotsToAdd.length} timeslots...`, 'info');

    let successCount = 0;
    for (const slot of slotsToAdd) {
      try {
        const response = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'addSlot', slot: slot })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.status === 'success') {
            successCount++;
          }
        }
      } catch (error) {
        console.error('Error adding slot:', error);
      }
    }

    document.getElementById('bulk-timeslot-modal').style.display = 'none';
    await renderCalendarView();
    showNotification(`${successCount} of ${slotsToAdd.length} time slots added successfully!`, 'success');
  } catch (error) {
    console.error('Bulk add error:', error);
    showNotification('Error adding timeslots: ' + error.message, 'error');
  }
}

window.editTimeSlot = function(slotId) {
  const slots = JSON.parse(localStorage.getItem('doggypaddle_timeslots') || '[]');
  const slot = slots.find(s => s.id === slotId);

  if (slot) {
    document.getElementById('timeslot-form-title').textContent = 'Edit Time Slot';
    document.getElementById('timeslot-id').value = slot.id;
    document.getElementById('timeslot-date').value = slot.date;
    document.getElementById('timeslot-time').value = slot.time;
    document.getElementById('timeslot-duration').value = slot.duration;
    document.getElementById('timeslot-status').value = slot.status;
    document.getElementById('timeslot-form-modal').style.display = 'flex';
  }
};

window.deleteTimeSlot = async function(slotId) {
  if (!confirm('Are you sure you want to delete this time slot?')) return;

  if (!isBackendConfigured) {
    showNotification('Backend not configured. Cannot delete timeslot.', 'error');
    return;
  }

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deleteSlot', slotId: slotId })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.status === 'success') {
        await renderCalendarView();
        showNotification('Time slot deleted successfully!', 'success');
      } else {
        showNotification('Error: ' + data.message, 'error');
      }
    } else {
      showNotification('Failed to delete timeslot', 'error');
    }
  } catch (error) {
    console.error('Error deleting timeslot:', error);
    showNotification('Error deleting timeslot: ' + error.message, 'error');
  }
};

// ============================================
// BOOKINGS MANAGEMENT
// ============================================

function initBookingsManagement() {
  const exportBtn = document.getElementById('export-bookings-btn');
  if (!exportBtn) return;

  exportBtn.addEventListener('click', exportBookingsToCSV);
}

function loadBookings() {
  const bookingsList = document.getElementById('admin-bookings-list');
  if (!bookingsList) return;

  const bookings = JSON.parse(localStorage.getItem('doggypaddle_bookings') || '[]');

  if (bookings.length === 0) {
    bookingsList.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-light);">No bookings yet.</p>';
    return;
  }

  // Sort bookings by date (most recent first)
  bookings.sort((a, b) => new Date(b.sessionTime) - new Date(a.sessionTime));

  bookingsList.innerHTML = bookings.map(booking => {
    const sessionDate = new Date(booking.sessionTime);
    const statusColors = {
      pending: '#ffc107',
      confirmed: '#28a745',
      completed: '#6c757d',
      cancelled: '#dc3545'
    };
    const statusColor = statusColors[booking.status] || '#666';

    return `
      <div class="admin-product-item">
        <div class="admin-item-details">
          <div class="admin-item-name">${booking.firstName} ${booking.lastName}</div>
          <div class="admin-item-info">📧 ${booking.email} | 📱 ${booking.phone}</div>
          <div class="admin-item-info">🐕 ${booking.dogNames} (${booking.dogBreeds})</div>
          <div class="admin-item-info">📅 ${formatDateTime(sessionDate)}</div>
          <div class="admin-item-info">
            Status: <span style="color: ${statusColor}; font-weight: 600; text-transform: capitalize;">${booking.status || 'pending'}</span>
          </div>
        </div>
        <div class="admin-item-actions">
          <button class="admin-btn admin-btn-toggle" onclick="toggleBookingStatus('${booking.timestamp}')">
            Change Status
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function exportBookingsToCSV() {
  const bookings = JSON.parse(localStorage.getItem('doggypaddle_bookings') || '[]');

  if (bookings.length === 0) {
    alert('No bookings to export.');
    return;
  }

  // CSV headers
  const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Dog Names', 'Breeds', 'Number of Dogs', 'Session Date/Time', 'Status', 'Booking Date'];

  // CSV rows
  const rows = bookings.map(booking => [
    booking.firstName,
    booking.lastName,
    booking.email,
    booking.phone,
    booking.dogNames,
    booking.dogBreeds,
    booking.numDogs,
    booking.sessionTime,
    booking.status || 'pending',
    booking.timestamp
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `doggypaddle-clients-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showNotification('Client list exported successfully!', 'success');
}

window.toggleBookingStatus = function(timestamp) {
  const bookings = JSON.parse(localStorage.getItem('doggypaddle_bookings') || '[]');
  const booking = bookings.find(b => b.timestamp === timestamp);

  if (!booking) return;

  const statuses = ['pending', 'confirmed', 'completed', 'cancelled'];
  const currentIndex = statuses.indexOf(booking.status || 'pending');
  const nextIndex = (currentIndex + 1) % statuses.length;
  booking.status = statuses[nextIndex];

  localStorage.setItem('doggypaddle_bookings', JSON.stringify(bookings));
  loadBookings();
  showNotification(`Booking status updated to: ${booking.status}`, 'success');
};

// ============================================
// PHOTOS MANAGEMENT
// ============================================

function initPhotosManagement() {
  // Photos are loaded on demand when tab is clicked

  // Set up bulk action handlers
  const selectAllCheckbox = document.getElementById('select-all-photos');
  const bulkApproveBtn = document.getElementById('bulk-approve-photos');
  const bulkRejectBtn = document.getElementById('bulk-reject-photos');
  const addPhotoBtn = document.getElementById('add-photo-btn');

  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', function() {
      const checkboxes = document.querySelectorAll('.photo-checkbox');
      checkboxes.forEach(cb => cb.checked = this.checked);
      updateBulkActionButtons();
    });
  }

  if (bulkApproveBtn) {
    bulkApproveBtn.addEventListener('click', bulkApprovePhotos);
  }

  if (bulkRejectBtn) {
    bulkRejectBtn.addEventListener('click', bulkRejectPhotos);
  }

  if (addPhotoBtn) {
    addPhotoBtn.addEventListener('click', openAddPhotoModal);
  }
}

function loadPhotos() {
  const photosList = document.getElementById('admin-photos-list');
  if (!photosList) return;

  const photos = JSON.parse(localStorage.getItem('doggypaddle_photos') || '[]');

  if (photos.length === 0) {
    photosList.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-light);">No photos submitted yet.</p>';
    return;
  }

  // Sort photos by date (most recent first)
  photos.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  photosList.innerHTML = photos.map(photo => {
    const statusColors = {
      pending: '#ffc107',
      approved: '#28a745',
      rejected: '#dc3545'
    };
    const status = photo.status || 'pending';
    const statusColor = statusColors[status] || '#666';

    return `
      <div class="admin-product-item">
        <div style="display: flex; align-items: center; padding: 0.5rem;">
          <input type="checkbox" class="photo-checkbox" data-timestamp="${photo.timestamp}"
                 style="cursor: pointer; width: 20px; height: 20px;" onchange="updateBulkActionButtons()">
        </div>
        <img src="${photo.imageUrl}" class="admin-product-image" alt="${photo.dogName}"
             onerror="this.src='/assets/logo.png'" />
        <div class="admin-item-details">
          <div class="admin-item-name">🐕 ${photo.dogName}</div>
          <div class="admin-item-info">Submitted by: ${photo.customerName} (${photo.email})</div>
          <div class="admin-item-info">Caption: ${photo.caption || 'No caption'}</div>
          <div class="admin-item-info">Session Date: ${photo.sessionDate || 'Not specified'}</div>
          <div class="admin-item-info">Submitted: ${formatDateTime(new Date(photo.timestamp))}</div>
          <div class="admin-item-info">
            Status: <span style="color: ${statusColor}; font-weight: 600; text-transform: capitalize;">${status}</span>
          </div>
        </div>
        <div class="admin-item-actions">
          ${status !== 'approved' ? `<button class="admin-btn admin-btn-edit" onclick="approvePhoto('${photo.timestamp}')">✓ Approve</button>` : ''}
          ${status !== 'rejected' ? `<button class="admin-btn admin-btn-delete" onclick="rejectPhoto('${photo.timestamp}')">✗ Reject</button>` : ''}
          ${status !== 'pending' ? `<button class="admin-btn admin-btn-toggle" onclick="resetPhotoStatus('${photo.timestamp}')">Reset</button>` : ''}
          ${photo.featured ? `<button class="admin-btn admin-btn-toggle" onclick="toggleFeatured('${photo.timestamp}')" title="Remove from featured" style="background: #ff9800;">⭐ Featured</button>` : `<button class="admin-btn admin-btn-secondary" onclick="toggleFeatured('${photo.timestamp}')" title="Add to featured">☆ Feature</button>`}
          <button class="admin-btn admin-btn-edit" onclick="downloadPhoto('${photo.timestamp}')" title="Download photo">⬇ Download</button>
          <button class="admin-btn admin-btn-edit" onclick="shareToFacebook('${photo.timestamp}')" title="Share to Facebook" style="background: #1877f2;">📘 Share FB</button>
          <button class="admin-btn admin-btn-secondary" onclick="editPhotoCaption('${photo.timestamp}')" title="Edit details">✏️ Edit</button>
          <button class="admin-btn admin-btn-delete" onclick="deletePhoto('${photo.timestamp}')" title="Delete permanently">🗑 Delete</button>
        </div>
      </div>
    `;
  }).join('');

  // Reset select all checkbox
  const selectAllCheckbox = document.getElementById('select-all-photos');
  if (selectAllCheckbox) selectAllCheckbox.checked = false;

  // Update bulk action buttons
  updateBulkActionButtons();
}

window.approvePhoto = function(timestamp) {
  const photos = JSON.parse(localStorage.getItem('doggypaddle_photos') || '[]');
  const photo = photos.find(p => p.timestamp == timestamp);

  if (photo) {
    photo.status = 'approved';
    localStorage.setItem('doggypaddle_photos', JSON.stringify(photos));
    loadPhotos();
    showNotification('Photo approved and will be displayed in gallery!', 'success');
  }
};

window.rejectPhoto = function(timestamp) {
  if (!confirm('Are you sure you want to reject this photo?')) return;

  const photos = JSON.parse(localStorage.getItem('doggypaddle_photos') || '[]');
  const photo = photos.find(p => p.timestamp == timestamp);

  if (photo) {
    photo.status = 'rejected';
    localStorage.setItem('doggypaddle_photos', JSON.stringify(photos));
    loadPhotos();
    showNotification('Photo rejected.', 'success');
  }
};

window.resetPhotoStatus = function(timestamp) {
  const photos = JSON.parse(localStorage.getItem('doggypaddle_photos') || '[]');
  const photo = photos.find(p => p.timestamp == timestamp);

  if (photo) {
    photo.status = 'pending';
    localStorage.setItem('doggypaddle_photos', JSON.stringify(photos));
    loadPhotos();
    showNotification('Photo status reset to pending.', 'success');
  }
};

// Delete photo permanently
window.deletePhoto = function(timestamp) {
  if (!confirm('Are you sure you want to permanently delete this photo? This action cannot be undone.')) return;

  let photos = JSON.parse(localStorage.getItem('doggypaddle_photos') || '[]');
  photos = photos.filter(p => p.timestamp != timestamp);
  localStorage.setItem('doggypaddle_photos', JSON.stringify(photos));
  loadPhotos();
  showNotification('Photo deleted permanently.', 'success');
};

// Toggle featured status
window.toggleFeatured = function(timestamp) {
  const photos = JSON.parse(localStorage.getItem('doggypaddle_photos') || '[]');
  const photo = photos.find(p => p.timestamp == timestamp);

  if (photo) {
    photo.featured = !photo.featured;
    localStorage.setItem('doggypaddle_photos', JSON.stringify(photos));
    loadPhotos();
    showNotification(photo.featured ? 'Photo marked as featured! It will appear on the home page.' : 'Photo removed from featured.', 'success');
  }
};

// Download photo
window.downloadPhoto = function(timestamp) {
  const photos = JSON.parse(localStorage.getItem('doggypaddle_photos') || '[]');
  const photo = photos.find(p => p.timestamp == timestamp);

  if (photo) {
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = photo.imageUrl;
    link.download = `doggypaddle-${photo.dogName.replace(/\s+/g, '-')}-${timestamp}.jpg`;

    // For base64 images, we need to handle differently
    if (photo.imageUrl.startsWith('data:')) {
      link.download = `doggypaddle-${photo.dogName.replace(/\s+/g, '-')}-${timestamp}.jpg`;
    }

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification('Photo downloaded!', 'success');
  }
};

// Share to Facebook
window.shareToFacebook = function(timestamp) {
  const photos = JSON.parse(localStorage.getItem('doggypaddle_photos') || '[]');
  const photo = photos.find(p => p.timestamp == timestamp);

  if (photo) {
    const fbPageUrl = window.DoggyPaddleConfig?.SOCIAL?.facebook || 'https://www.facebook.com/dogpad';

    // Create share text with hashtags and page mention
    const shareText = photo.caption
      ? `🐕 ${photo.dogName} had a splash-tastic time at DoggyPaddle! ${photo.caption}\n\n#DoggyPaddle #DogSwimming #HappyDogs\n\nVisit us: ${fbPageUrl}`
      : `🐕 ${photo.dogName} had a splash-tastic time at DoggyPaddle!\n\n#DoggyPaddle #DogSwimming #HappyDogs\n\nVisit us: ${fbPageUrl}`;

    // For base64 images, we need to inform the user they need to download first
    if (photo.imageUrl.startsWith('data:')) {
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      `;

      modal.innerHTML = `
        <div style="
          background: white;
          padding: 2rem;
          border-radius: 12px;
          max-width: 500px;
          width: 90%;
        ">
          <h3 style="margin-top: 0; color: #1877f2;">📘 Share to Facebook</h3>
          <p><strong>Step 1:</strong> Click "Download" to save the photo first</p>
          <p><strong>Step 2:</strong> Go to your <a href="${fbPageUrl}" target="_blank" style="color: #1877f2;">DoggyPaddle Facebook page</a></p>
          <p><strong>Step 3:</strong> Create a new post and upload the photo</p>
          <p><strong>Step 4:</strong> Use this caption (already copied!):</p>
          <textarea readonly style="
            width: 100%;
            height: 120px;
            padding: 0.5rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-family: inherit;
            resize: vertical;
          ">${shareText}</textarea>
          <div style="margin-top: 1rem; display: flex; gap: 0.5rem; justify-content: flex-end;">
            <button onclick="window.open('${fbPageUrl}', '_blank')" style="
              background: #1877f2;
              color: white;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 4px;
              cursor: pointer;
              font-weight: 500;
            ">Open Facebook Page</button>
            <button onclick="this.closest('div[style*=fixed]').remove()" style="
              background: #ddd;
              color: #333;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 4px;
              cursor: pointer;
              font-weight: 500;
            ">Close</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
      });

      // Copy caption to clipboard
      navigator.clipboard.writeText(shareText).then(() => {
        showNotification('Caption copied to clipboard!', 'success');
      });
    } else {
      // For external URLs, we can use Facebook share dialog
      const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(photo.imageUrl)}&quote=${encodeURIComponent(shareText)}`;
      window.open(fbShareUrl, 'facebook-share-dialog', 'width=800,height=600');
      showNotification('Opening Facebook share dialog...', 'success');
    }
  }
};

// Edit photo details (customer name and caption)
window.editPhotoCaption = function(timestamp) {
  const photos = JSON.parse(localStorage.getItem('doggypaddle_photos') || '[]');
  const photo = photos.find(p => p.timestamp == timestamp);

  if (!photo) return;

  // Create modal for editing
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;

  modal.innerHTML = `
    <div style="
      background: white;
      padding: 2rem;
      border-radius: 12px;
      max-width: 500px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
    ">
      <h3 style="margin-top: 0; color: var(--primary, #028090);">Edit Photo Details</h3>
      <form id="edit-photo-form">
        <div style="margin-bottom: 1rem;">
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">
            Dog Name
          </label>
          <input type="text" id="edit-dog-name" value="${photo.dogName || ''}" required
                 style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;">
        </div>
        <div style="margin-bottom: 1rem;">
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">
            Submitted By
          </label>
          <input type="text" id="edit-customer-name" value="${photo.customerName || ''}" required
                 style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;">
        </div>
        <div style="margin-bottom: 1rem;">
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">
            Email
          </label>
          <input type="email" id="edit-email" value="${photo.email || ''}"
                 style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;">
        </div>
        <div style="margin-bottom: 1rem;">
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">
            Caption
          </label>
          <textarea id="edit-caption" rows="3"
                    style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem; resize: vertical;">${photo.caption || ''}</textarea>
        </div>
        <div style="margin-bottom: 1rem;">
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">
            Session Date
          </label>
          <input type="text" id="edit-session-date" value="${photo.sessionDate || ''}"
                 placeholder="MM/DD/YYYY"
                 style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;">
        </div>
        <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem;">
          <button type="button" id="cancel-edit-photo" style="
            background: #ddd;
            color: #333;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
          ">Cancel</button>
          <button type="submit" style="
            background: var(--primary, #028090);
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
          ">Save Changes</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // Handle form submission
  document.getElementById('edit-photo-form').addEventListener('submit', (e) => {
    e.preventDefault();

    photo.dogName = document.getElementById('edit-dog-name').value;
    photo.customerName = document.getElementById('edit-customer-name').value;
    photo.email = document.getElementById('edit-email').value;
    photo.caption = document.getElementById('edit-caption').value;
    photo.sessionDate = document.getElementById('edit-session-date').value;

    localStorage.setItem('doggypaddle_photos', JSON.stringify(photos));
    loadPhotos();
    modal.remove();
    showNotification('Photo details updated!', 'success');
  });

  // Handle cancel
  document.getElementById('cancel-edit-photo').addEventListener('click', () => {
    modal.remove();
  });

  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
};

// Open Add Photo Modal
function openAddPhotoModal() {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;

  modal.innerHTML = `
    <div style="
      background: white;
      padding: 2rem;
      border-radius: 12px;
      max-width: 500px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
    ">
      <h3 style="margin-top: 0; color: var(--primary, #028090);">Add Photo to Gallery</h3>
      <form id="add-photo-form">
        <div style="margin-bottom: 1rem;">
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">
            Dog Name <span style="color: red;">*</span>
          </label>
          <input type="text" id="add-dog-name" required
                 style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;">
        </div>
        <div style="margin-bottom: 1rem;">
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">
            Submitted By <span style="color: red;">*</span>
          </label>
          <input type="text" id="add-customer-name" required
                 style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;">
        </div>
        <div style="margin-bottom: 1rem;">
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">
            Email
          </label>
          <input type="email" id="add-email"
                 style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;">
        </div>
        <div style="margin-bottom: 1rem;">
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">
            Caption
          </label>
          <textarea id="add-caption" rows="3"
                    style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem; resize: vertical;"></textarea>
        </div>
        <div style="margin-bottom: 1rem;">
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">
            Session Date
          </label>
          <input type="text" id="add-session-date"
                 placeholder="MM/DD/YYYY"
                 style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;">
        </div>
        <div style="margin-bottom: 1rem;">
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">
            Image <span style="color: red;">*</span>
          </label>
          <div style="margin-bottom: 10px;">
            <label style="margin-right: 20px; cursor: pointer;">
              <input type="radio" name="photo-image-type" value="url" checked style="margin-right: 5px;" />
              Image URL
            </label>
            <label style="cursor: pointer;">
              <input type="radio" name="photo-image-type" value="upload" style="margin-right: 5px;" />
              Upload Image
            </label>
          </div>
          <div id="photo-url-input-container">
            <input type="url" id="add-image-url"
                   placeholder="https://example.com/image.jpg"
                   style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;">
            <small style="color: #666; display: block; margin-top: 0.25rem;">
              Enter an image URL
            </small>
          </div>
          <div id="photo-upload-input-container" style="display: none;">
            <input type="file" id="add-image-file" accept="image/*"
                   style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;">
            <small style="color: #666; display: block; margin-top: 0.25rem;">
              Upload a photo (JPG, PNG, etc. - max 5MB)
            </small>
          </div>
          <div id="photo-image-preview" style="margin-top: 10px; display: none;">
            <img id="photo-image-preview-img" src="" alt="Preview" style="max-width: 200px; max-height: 200px; border-radius: 4px; border: 1px solid #ddd;" />
          </div>
        </div>
        <div style="margin-bottom: 1rem;">
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">
            Status
          </label>
          <select id="add-status"
                  style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;">
            <option value="pending">Pending</option>
            <option value="approved" selected>Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem;">
          <button type="button" id="cancel-add-photo" style="
            background: #ddd;
            color: #333;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
          ">Cancel</button>
          <button type="submit" id="submit-add-photo" style="
            background: var(--primary, #028090);
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
          ">Add Photo</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // Toggle between URL and file upload
  const photoImageTypeRadios = document.querySelectorAll('input[name="photo-image-type"]');
  const photoUrlContainer = document.getElementById('photo-url-input-container');
  const photoUploadContainer = document.getElementById('photo-upload-input-container');
  const photoImagePreview = document.getElementById('photo-image-preview');
  const photoImagePreviewImg = document.getElementById('photo-image-preview-img');
  const photoUrlInput = document.getElementById('add-image-url');
  const photoFileInput = document.getElementById('add-image-file');

  photoImageTypeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.value === 'url') {
        photoUrlContainer.style.display = 'block';
        photoUploadContainer.style.display = 'none';
        photoImagePreview.style.display = 'none';
        photoUrlInput.required = true;
        photoFileInput.required = false;
      } else {
        photoUrlContainer.style.display = 'none';
        photoUploadContainer.style.display = 'block';
        photoUrlInput.required = false;
        photoFileInput.required = true;
      }
    });
  });

  // Handle file selection and preview
  photoFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        photoFileInput.value = '';
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        photoFileInput.value = '';
        return;
      }

      // Show preview
      const reader = new FileReader();
      reader.onload = (e) => {
        photoImagePreviewImg.src = e.target.result;
        photoImagePreview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  });

  // Handle URL input preview
  photoUrlInput.addEventListener('blur', () => {
    const url = photoUrlInput.value.trim();
    if (url) {
      photoImagePreviewImg.src = url;
      photoImagePreview.style.display = 'block';
      photoImagePreviewImg.onerror = () => {
        photoImagePreview.style.display = 'none';
      };
    }
  });

  // Handle form submission
  document.getElementById('add-photo-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('submit-add-photo');
    const selectedImageType = document.querySelector('input[name="photo-image-type"]:checked').value;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding...';

    try {
      let imageUrl = '';

      if (selectedImageType === 'url') {
        imageUrl = photoUrlInput.value.trim();
        if (!imageUrl) {
          alert('Please enter an image URL');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Add Photo';
          return;
        }
      } else {
        // Handle file upload - convert to base64
        const file = photoFileInput.files[0];
        if (!file) {
          alert('Please select an image file');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Add Photo';
          return;
        }

        // Convert file to base64
        imageUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      const photos = JSON.parse(localStorage.getItem('doggypaddle_photos') || '[]');

      const newPhoto = {
        timestamp: Date.now(),
        dogName: document.getElementById('add-dog-name').value,
        customerName: document.getElementById('add-customer-name').value,
        email: document.getElementById('add-email').value,
        caption: document.getElementById('add-caption').value,
        sessionDate: document.getElementById('add-session-date').value,
        imageUrl: imageUrl,
        status: document.getElementById('add-status').value,
        featured: false
      };

      photos.push(newPhoto);
      localStorage.setItem('doggypaddle_photos', JSON.stringify(photos));
      loadPhotos();
      modal.remove();
      showNotification('Photo added to gallery!', 'success');
    } catch (error) {
      console.error('Error adding photo:', error);
      alert('Failed to add photo. Please try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Add Photo';
    }
  });

  // Handle cancel
  document.getElementById('cancel-add-photo').addEventListener('click', () => {
    modal.remove();
  });

  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

window.updateBulkActionButtons = function() {
  const checkboxes = document.querySelectorAll('.photo-checkbox:checked');
  const bulkApproveBtn = document.getElementById('bulk-approve-photos');
  const bulkRejectBtn = document.getElementById('bulk-reject-photos');
  const selectedCount = document.getElementById('selected-photos-count');

  const count = checkboxes.length;

  if (bulkApproveBtn) bulkApproveBtn.disabled = count === 0;
  if (bulkRejectBtn) bulkRejectBtn.disabled = count === 0;
  if (selectedCount) selectedCount.textContent = count > 0 ? `${count} photo${count > 1 ? 's' : ''} selected` : '';
};

function bulkApprovePhotos() {
  const checkboxes = document.querySelectorAll('.photo-checkbox:checked');
  const timestamps = Array.from(checkboxes).map(cb => cb.dataset.timestamp);

  if (timestamps.length === 0) return;

  const photos = JSON.parse(localStorage.getItem('doggypaddle_photos') || '[]');
  let approvedCount = 0;

  timestamps.forEach(timestamp => {
    const photo = photos.find(p => p.timestamp == timestamp);
    if (photo && photo.status !== 'approved') {
      photo.status = 'approved';
      approvedCount++;
    }
  });

  if (approvedCount > 0) {
    localStorage.setItem('doggypaddle_photos', JSON.stringify(photos));
    loadPhotos();
    showNotification(`${approvedCount} photo${approvedCount > 1 ? 's' : ''} approved successfully!`, 'success');
  }
}

function bulkRejectPhotos() {
  const checkboxes = document.querySelectorAll('.photo-checkbox:checked');
  const timestamps = Array.from(checkboxes).map(cb => cb.dataset.timestamp);

  if (timestamps.length === 0) return;

  if (!confirm(`Are you sure you want to reject ${timestamps.length} photo${timestamps.length > 1 ? 's' : ''}?`)) return;

  const photos = JSON.parse(localStorage.getItem('doggypaddle_photos') || '[]');
  let rejectedCount = 0;

  timestamps.forEach(timestamp => {
    const photo = photos.find(p => p.timestamp == timestamp);
    if (photo && photo.status !== 'rejected') {
      photo.status = 'rejected';
      rejectedCount++;
    }
  });

  if (rejectedCount > 0) {
    localStorage.setItem('doggypaddle_photos', JSON.stringify(photos));
    loadPhotos();
    showNotification(`${rejectedCount} photo${rejectedCount > 1 ? 's' : ''} rejected.`, 'success');
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function validateTimeFormat(timeString) {
  if (!timeString || typeof timeString !== 'string') {
    return false;
  }

  const parts = timeString.split(':');
  if (parts.length < 2) {
    return false;
  }

  const hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10);

  // Validate hour and minute ranges
  if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return false;
  }

  return true;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatTime(timeString) {
  if (!timeString) {
    return 'Invalid Time';
  }

  // Handle ISO datetime strings (e.g., "1899-12-30T14:00:00.000Z")
  if (typeof timeString === 'string' && timeString.includes('T')) {
    try {
      const date = new Date(timeString);
      const hour = date.getUTCHours();
      const min = date.getUTCMinutes();
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const displayMinutes = String(min).padStart(2, '0');
      return `${displayHour}:${displayMinutes} ${ampm}`;
    } catch (e) {
      console.error('Error parsing datetime:', timeString, e);
      return 'Invalid Time';
    }
  }

  // Handle simple time strings (e.g., "14:00")
  if (typeof timeString !== 'string') {
    return 'Invalid Time';
  }

  const parts = timeString.split(':');
  if (parts.length < 2) {
    return 'Invalid Time';
  }

  const [hours, minutes] = parts;
  const hour = parseInt(hours, 10);
  const min = parseInt(minutes, 10);

  // Validate hour and minute ranges
  if (isNaN(hour) || isNaN(min) || hour < 0 || hour > 23 || min < 0 || min > 59) {
    console.error('Invalid time format:', timeString);
    return 'Invalid Time';
  }

  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const displayMinutes = String(min).padStart(2, '0');
  return `${displayHour}:${displayMinutes} ${ampm}`;
}

function formatDateTime(date) {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function showNotification(message, type = 'info') {
  // Create notification element directly
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : 'var(--primary, #028090)'};
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    z-index: 10001;
    animation: slideIn 0.3s ease;
  `;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}
