document.addEventListener('DOMContentLoaded', function () {
  let currentUser = '';

  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.user) {
      currentUser = request.user;
    }
  });

  const appGrid = document.getElementById('app-grid');
  const searchBar = document.getElementById('search-bar');

  function renderApps(appsToRender) {
    appGrid.innerHTML = '';
    appsToRender.forEach(app => {
      const appCard = document.createElement('div');
      appCard.classList.add('app-card');
      appCard.dataset.appName = app.name;
      appCard.innerHTML = `
        <i class="app-icon ${app.icon}"></i>
        <div class="app-name">${app.name}</div>
        <button class="manage-btn" data-app-name="${app.name}">Manage</button>
      `;
      appGrid.appendChild(appCard);
    });
  }

  renderApps(apps);

  searchBar.addEventListener('keyup', function (event) {
    const searchTerm = event.target.value.toLowerCase();
    const filteredApps = apps.filter(app => app.name.toLowerCase().includes(searchTerm));
    renderApps(filteredApps);
  });

  appGrid.addEventListener('click', function (event) {
    const target = event.target;
    if (target.classList.contains('manage-btn')) {
      const appName = target.dataset.appName;
      openManageModal(appName);
    } else {
      const appCard = target.closest('.app-card');
      if (appCard) {
        const appName = appCard.dataset.appName;
        openApp(appName);
      }
    }
  });

  function openManageModal(appName) {
    modalTitle.textContent = `Manage ${appName} Credentials`;
    credentialsForm.dataset.appName = appName;
    manageModal.style.display = 'block';
    loadCredentials(appName);
  }

  function loadCredentials(appName) {
    const adminUser = document.getElementById('admin-user').value;
    if (!adminUser) {
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        return;
    }
    chrome.storage.local.get(adminUser, function (result) {
      if (result[adminUser] && result[adminUser][appName]) {
        document.getElementById('username').value = result[adminUser][appName].username;
        document.getElementById('password').value = result[adminUser][appName].password;
      }
      else {
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
      }
    });
  }

  closeModal.addEventListener('click', function () {
    manageModal.style.display = 'none';
  });

  credentialsForm.addEventListener('submit', function (event) {
    event.preventDefault();
    const appName = credentialsForm.dataset.appName;
    const adminUser = document.getElementById('admin-user').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    chrome.storage.local.get(adminUser, function (result) {
      const data = result[adminUser] || {};
      data[appName] = { username, password };
      chrome.storage.local.set({ [adminUser]: data }, function () {
        manageModal.style.display = 'none';
      });
    });
  });

  const showPasswordBtn = document.getElementById('show-password-btn');

  showPasswordBtn.addEventListener('click', function () {
    const passwordInput = document.getElementById('password');
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      showPasswordBtn.textContent = 'Hide';
    } else {
      passwordInput.type = 'password';
      showPasswordBtn.textContent = 'Show';
    }
  });
  deleteBtn.addEventListener('click', function () {
    const appName = credentialsForm.dataset.appName;
    const adminUser = document.getElementById('admin-user').value;

    chrome.storage.local.get(adminUser, function (result) {
        if(result[adminUser] && result[adminUser][appName]) {
            delete result[adminUser][appName];
            chrome.storage.local.set({ [adminUser]: result[adminUser] }, function () {
                manageModal.style.display = 'none';
            });
        }
    });
  });

  function openApp(appName) {
    if (!currentUser) {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            const tab = tabs[0];
            if(tab.url.includes("127.0.0.1:5000/apps")) {
                chrome.scripting.executeScript({
                    target: {tabId: tab.id},
                    files: ['content.js']
                });
                alert("Please wait a moment and try again.");
            } else {
                alert("Please navigate to the apps page to use the extension.");
            }
        });
        return;
    }

    chrome.storage.local.get(currentUser, function (result) {
      if (result[currentUser] && result[currentUser][appName]) {
        const creds = result[currentUser][appName];
        const app = apps.find(a => a.name === appName);
        if (app) {
          chrome.tabs.create({ url: app.url }, function (tab) {
            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id, { credentials: creds });
            }, 1000);
          });
        }
      } else {
        alert('No credentials found for this app and admin user.');
      }
    });
  }

  renderApps();

  const viewAllDataBtn = document.getElementById('view-all-data-btn');
  const allDataContainer = document.getElementById('all-data-container');
  const deleteAllDataBtn = document.getElementById('delete-all-data-btn');

  viewAllDataBtn.addEventListener('click', function() {
    chrome.storage.local.get(null, function(items) {
      let table = '<table><tr><th>Admin User</th><th>App</th><th>Username</th><th>Password</th></tr>';
      for (const adminUser in items) {
        for (const appName in items[adminUser]) {
          table += `<tr><td>${adminUser}</td><td>${appName}</td><td>${items[adminUser][appName].username}</td><td>${items[adminUser][appName].password}</td></tr>`;
        }
      }
      table += '</table>';
      allDataContainer.innerHTML = table;
    });
  });

  deleteAllDataBtn.addEventListener('click', function() {
    chrome.storage.local.clear(function() {
      allDataContainer.innerHTML = '<p>All data has been deleted.</p>';
    });
  });
});
