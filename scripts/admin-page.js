(() => {
  'use strict';

  window.isAdminLoggedIn = false;
  let adminUserEmail = null;
  let modulesInitialized = false;
  let modalsLoaded = false;
  let allowedAdmins = [];

  const API_ENDPOINT = window.DoggyPaddleConfig?.API_ENDPOINT ||
                       'https://script.google.com/macros/s/YOUR_DEPLOYED_WEBAPP_ID/exec';
  const isBackendConfigured = API_ENDPOINT && !API_ENDPOINT.includes('YOUR_DEPLOYED_WEBAPP_ID');

  async function loadAdminAllowlist() {
    const adminListElement = document.getElementById('admin-allowed-list');

    if (!isBackendConfigured) {
      allowedAdmins = window.DoggyPaddleConfig?.GOOGLE_AUTH?.allowedAdmins || [];
      if (adminListElement) {
        adminListElement.textContent = allowedAdmins.join(', ');
      }
      return allowedAdmins;
    }

    try {
      const response = await fetch(`${API_ENDPOINT}?action=getAdminAllowlist`);

      if (!response.ok) {
        throw new Error(`Failed to load allowlist (HTTP ${response.status})`);
      }

      const data = await response.json();

      if (data.status === 'success' && Array.isArray(data.allowedAdmins)) {
        allowedAdmins = data.allowedAdmins;
        if (adminListElement) {
          adminListElement.textContent = allowedAdmins.join(', ');
        }
      } else {
        throw new Error(data.message || 'Backend did not return an allowlist');
      }
    } catch (error) {
      console.error('Error loading admin allowlist:', error);
      if (adminListElement) {
        adminListElement.textContent = 'Unable to load allowlist';
      }
    }

    return allowedAdmins;
  }

  async function waitForAdminEnhancements() {
    const start = Date.now();
    const timeout = 5000;
    const pollInterval = 100;

    return new Promise((resolve, reject) => {
      const checkReady = () => {
        const productsReady = typeof window.loadAdminProducts === 'function';
        const slotsReady = typeof window.loadTimeSlots === 'function';

        if (productsReady && slotsReady) {
          resolve();
          return;
        }

        if (Date.now() - start >= timeout) {
          reject(new Error('Admin enhancements failed to initialize'));
          return;
        }

        setTimeout(checkReady, pollInterval);
      };

      checkReady();
    });
  }

  function checkAdminSession() {
    try {
      const sessionData = localStorage.getItem('doggypaddle_admin_session');
      if (!sessionData) {
        return false;
      }

      const session = JSON.parse(sessionData);
      if (!session || !session.email || !session.timestamp) {
        return false;
      }

      const allowlist = allowedAdmins.length > 0
        ? allowedAdmins
        : (window.DoggyPaddleConfig?.GOOGLE_AUTH?.allowedAdmins || []);
      const allowedAdminsLower = allowlist.map(email => email.toLowerCase());

      if (!allowedAdminsLower.includes(session.email.toLowerCase())) {
        localStorage.removeItem('doggypaddle_admin_session');
        return false;
      }

      window.isAdminLoggedIn = true;
      adminUserEmail = session.email;

      console.log('Existing admin session restored for:', adminUserEmail);
      showDashboard();
      return true;
    } catch (error) {
      console.error('Error checking admin session:', error);
      return false;
    }
  }

  function initGoogleSignIn() {
    const clientId = window.DoggyPaddleConfig?.GOOGLE_AUTH?.clientId;
    const googleBtnContainer = document.getElementById('google-signin-button');

    if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com') {
      console.warn('Google OAuth not configured. Using development login mode.');

      if (googleBtnContainer) {
        googleBtnContainer.textContent = '';

        const devButton = document.createElement('button');
        devButton.type = 'button';
        devButton.className = 'btn btn-primary';
        devButton.style.width = '100%';
        devButton.textContent = '🔐 Login as Admin (Dev Mode)';
        devButton.addEventListener('click', handleDevLogin);

        const helpText = document.createElement('p');
        helpText.style.fontSize = '12px';
        helpText.style.color = '#666';
        helpText.style.marginTop = '12px';
        helpText.style.fontStyle = 'italic';
        helpText.innerHTML = '⚠️ Development Mode: Google OAuth not configured<br>See GOOGLE_AUTH_SETUP.md to enable production login';

        googleBtnContainer.append(devButton, helpText);
      }
      return;
    }

    if (typeof google !== 'undefined' && google.accounts) {
      google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleSignIn,
        auto_select: false,
        cancel_on_tap_outside: true
      });

      if (googleBtnContainer) {
        google.accounts.id.renderButton(
          googleBtnContainer,
          {
            theme: 'filled_blue',
            size: 'large',
            text: 'signin_with',
            width: 350
          }
        );
      }
    }
  }

  function handleDevLogin() {
    const devAllowlist = allowedAdmins.length > 0
      ? allowedAdmins
      : (window.DoggyPaddleConfig?.GOOGLE_AUTH?.allowedAdmins || ['Scott@mustwants.com']);
    const devEmail = devAllowlist[0].toLowerCase();

    console.log('Dev login activated for:', devEmail);

    window.isAdminLoggedIn = true;
    adminUserEmail = devEmail;

    const session = {
      email: devEmail,
      name: 'Dev Admin',
      loginTime: new Date().toISOString(),
      timestamp: Date.now(),
      isDev: true
    };
    localStorage.setItem('doggypaddle_admin_session', JSON.stringify(session));

    showNotification('Logged in successfully (Dev Mode)');
    showDashboard();
  }

  function handleGoogleSignIn(response) {
    const allowlist = allowedAdmins.length > 0
      ? allowedAdmins
      : (window.DoggyPaddleConfig?.GOOGLE_AUTH?.allowedAdmins || []);

    try {
      if (!isBackendConfigured) {
        const payload = parseJwt(response.credential);
        if (!payload) {
          throw new Error('Failed to parse JWT token');
        }

        const allowedAdminsLower = allowlist.map(email => email.toLowerCase());
        const userEmail = payload.email.toLowerCase();

        if (!allowedAdminsLower.includes(userEmail)) {
          throw new Error(`Access denied. Only authorized Google Workspace accounts can access the admin panel.\n\nYour email: ${userEmail}\n\nAllowed admins: ${allowlist.join(', ')}`);
        }

        window.isAdminLoggedIn = true;
        adminUserEmail = userEmail;

        const session = {
          email: userEmail,
          name: payload.name,
          picture: payload.picture,
          timestamp: Date.now()
        };
        localStorage.setItem('doggypaddle_admin_session', JSON.stringify(session));

        showNotification(`Welcome, ${payload.name}!`);
        showDashboard();
        return;
      }

      verifyAdminIdToken(response.credential)
        .then(adminProfile => {
          window.isAdminLoggedIn = true;
          adminUserEmail = adminProfile.email.toLowerCase();

          const session = {
            ...adminProfile,
            timestamp: Date.now()
          };
          localStorage.setItem('doggypaddle_admin_session', JSON.stringify(session));

          showNotification(`Welcome, ${adminProfile.name}!`);
          showDashboard();
        })
        .catch(error => {
          console.warn('Admin verification failed:', error);
          alert(error.message || 'Authentication failed. Please try again.');
        });
    } catch (error) {
      console.error('Error handling Google Sign-In:', error);
      alert('Authentication failed. Please try again.\n\nError: ' + error.message);
    }
  }

  async function verifyAdminIdToken(idToken) {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'verifyAdminToken',
        idToken
      })
    });

    if (!response.ok) {
      throw new Error(`Backend verification failed with status ${response.status}`);
    }

    const result = await response.json();

    if (result.status !== 'success' || !result.admin) {
      throw new Error(result.message || 'Admin verification failed');
    }

    if (Array.isArray(result.allowedAdmins)) {
      allowedAdmins = result.allowedAdmins;
      const adminListElement = document.getElementById('admin-allowed-list');
      if (adminListElement) {
        adminListElement.textContent = allowedAdmins.join(', ');
      }
    }

    return result.admin;
  }

  function parseJwt(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error parsing JWT:', error);
      return null;
    }
  }

  function showDashboard() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('dashboard-screen').classList.add('active');

    const session = JSON.parse(localStorage.getItem('doggypaddle_admin_session') || '{}');
    document.getElementById('user-info').textContent = `Logged in as: ${session.name || adminUserEmail}`;

    initDashboard();
  }

  function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('doggypaddle_admin_session');
      window.isAdminLoggedIn = false;
      adminUserEmail = null;

      if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
        google.accounts.id.disableAutoSelect();
      }

      showNotification('Logged out successfully');

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }

  function showNotification(message, duration = 3000) {
    const notification = document.getElementById('notification');
    if (!notification) {
      return;
    }

    notification.textContent = message;
    notification.classList.add('show');

    setTimeout(() => {
      notification.classList.remove('show');
    }, duration);
  }

  window.showNotification = showNotification;

  function initDashboard() {
    const tabs = document.querySelectorAll('.admin-tab');
    const tabContents = document.querySelectorAll('.admin-tab-content');
    const logoutBtn = document.getElementById('logout-btn');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;

        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        tabContents.forEach(content => content.classList.remove('active'));
        const targetContent = document.getElementById(`admin-${tabName}-tab`);
        if (targetContent) {
          targetContent.classList.add('active');
        }

        loadTabData(tabName);
      });
    });

    if (logoutBtn) {
      logoutBtn.addEventListener('click', handleLogout);
    }

    initializeAdminModules();
  }

  function loadTabData(tabName) {
    console.log('Loading tab data for:', tabName);

    if (window.loadAdminProducts && tabName === 'products') {
      window.loadAdminProducts();
    } else if (window.loadTimeSlots && tabName === 'timeslots') {
      window.loadTimeSlots();
    } else if (window.loadBookings && tabName === 'bookings') {
      window.loadBookings();
          } else if (window.loadRegistrations && tabName === 'registrations') {
      window.loadRegistrations();
    } else if (window.loadPhotos && tabName === 'photos') {
      window.loadPhotos();
    } else if (window.loadOrders && tabName === 'orders') {
      window.loadOrders();
    }
  }

    function initializeAdminModules() {
      if (!modulesInitialized && typeof window.initAdminDashboard === 'function') {
        window.initAdminDashboard();
        modulesInitialized = true;
      }

      if (!modalsLoaded) {
        loadModalTemplates();
        modalsLoaded = true;
      }

      waitForAdminEnhancements()
        .then(() => {
          loadTabData('products');
        })
        .catch(error => {
          console.error('Admin modules did not finish loading:', error);
          const productsList = document.getElementById('admin-products-list');
          if (productsList) {
            productsList.innerHTML = `
              <div style="padding: 1.5rem; text-align: center; color: #721c24; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px;">
                <p style="font-weight: 700; margin-bottom: 0.25rem;">Admin dashboard failed to start</p>
                <p style="margin: 0; font-size: 0.95rem;">Refresh the page to retry loading products and time slots.</p>
              </div>
            `;
          }
        });
    }

  function loadModalTemplates() {
    fetch('/store/index.html')
      .then(response => response.text())
      .then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const modals = doc.querySelectorAll('.modal');
        const modalContainer = document.getElementById('modal-container');

        modals.forEach(modal => {
          if (!modal.id.includes('login') && !modal.id.includes('panel')) {
            modalContainer.appendChild(modal.cloneNode(true));
          }
        });
      })
      .catch(err => console.error('Error loading modals:', err));
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await loadAdminAllowlist();
    if (!checkAdminSession()) {
      initGoogleSignIn();
    }
  });

})();
