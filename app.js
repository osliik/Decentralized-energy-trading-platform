let web3;
let energyTradingContract;
let contractAddress = '0xC7E56BfDE491189462131cd3CA1343CB7891184C';
let userAccount;

// Функции для работы с localStorage
function saveUserAccount(account) {
  localStorage.setItem('userAccount', account);
}

function getUserAccount() {
  return localStorage.getItem('userAccount');
}

// Функция для обновления навигации
function updateNavbar() {
  const isLoggedIn = userAccount != null && userAccount !== 'undefined';
  const navRegister = document.getElementById('nav-register');
  const navLogin = document.getElementById('nav-login');
  const navProfile = document.getElementById('nav-profile');
  const navLogout = document.getElementById('nav-logout');

  if (navRegister && navLogin && navProfile && navLogout) {
    navRegister.style.display = isLoggedIn ? 'none' : 'inline';
    navLogin.style.display = isLoggedIn ? 'none' : 'inline';
    navProfile.style.display = isLoggedIn ? 'inline' : 'none';
    navLogout.style.display = isLoggedIn ? 'inline' : 'none';
  }
}

async function init() {
  if (typeof window.ethereum !== 'undefined') {
    web3 = new Web3(window.ethereum);

    // Загружаем ABI контракта
    const response = await fetch('contracts/EnergyTrading.json');
    const abi = await response.json();

    // Создаем экземпляр контракта
    energyTradingContract = new web3.eth.Contract(abi, contractAddress);

    // Инициализируем приложение
    const currentPage = window.location.pathname;

    if (currentPage === '/profile.html' || currentPage === '/profile') {
      if (userAccount) {
        getUserInfo();
      } else {
        window.location.href = '/login.html';
      }
    } else if (currentPage === '/index.html' || currentPage === '/') {
      loadAllListings();
    }

    updateNavbar();
  } else {
    alert('Пожалуйста, установите MetaMask!');
  }
}

// При загрузке страницы восстанавливаем аккаунт
window.addEventListener('load', async () => {
  userAccount = getUserAccount();
  updateNavbar();
  await init();
});

// Функция для регистрации пользователя
async function registerUser() {
  const name = document.getElementById('name').value;
  const role = document.getElementById('role').value;
  try {
    await energyTradingContract.methods.registerUser(name, role).send({ from: userAccount });
    document.getElementById('registration-message').innerText = 'Регистрация успешна!';
    // Перенаправление на страницу профиля
    window.location.href = '/profile.html';
  } catch (error) {
    console.error(error);
    document.getElementById('registration-message').innerText = 'Ошибка при регистрации.';
  }
}

// Функция для подключения кошелька (вход)
async function connectWallet() {
  if (typeof window.ethereum !== 'undefined') {
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const accounts = await web3.eth.getAccounts();
      if (accounts.length > 0) {
        userAccount = accounts[0];
        saveUserAccount(userAccount);
        console.log('Подключенный аккаунт:', userAccount);
        updateNavbar();
        // Перенаправление на страницу профиля
        window.location.href = '/profile.html';
      } else {
        document.getElementById('login-message').innerText = 'Не удалось подключить кошелек.';
      }
    } catch (error) {
      console.error('Пользователь отклонил доступ к аккаунту');
      document.getElementById('login-message').innerText = 'Не удалось подключить кошелек.';
    }
  } else {
    alert('Пожалуйста, установите MetaMask!');
  }
}

// Функция для выхода из аккаунта
function logout() {
  localStorage.removeItem('userAccount');
  userAccount = null;
  updateNavbar();
  window.location.href = '/';
}

// Функция для получения информации о пользователе
async function getUserInfo() {
  if (!userAccount) {
    alert('Пожалуйста, войдите в систему.');
    window.location.href = '/login.html';
    return;
  }

  const user = await energyTradingContract.methods.users(userAccount).call();
  if (user.isRegistered) {
    const role = user.role == '1' ? 'Поставщик' : 'Потребитель';
    document.getElementById('user-name').innerText = `Имя: ${user.name}`;
    document.getElementById('user-role').innerText = `Роль: ${role}`;
    document.getElementById('energy-balance').innerText = `Баланс энергии: ${user.energyBalance}`;

    // Показываем соответствующие разделы
    if (user.role == '1') {
      document.getElementById('provider-section').style.display = 'block';
      document.getElementById('consumer-section').style.display = 'none';
      loadMyListings(); // Загружаем свои предложения
    } else if (user.role == '2') {
      document.getElementById('consumer-section').style.display = 'block';
      document.getElementById('provider-section').style.display = 'none';
      loadListings(); // Загружаем список предложений
    }
  } else {
    document.getElementById('user-name').innerText = '';
    document.getElementById('user-role').innerText = 'Пользователь не зарегистрирован';
    document.getElementById('energy-balance').innerText = '';
    alert('Вы не зарегистрированы. Пожалуйста, зарегистрируйтесь.');
    window.location.href = '/registration.html';
  }
}

// Функция для создания предложения
async function createListing() {
  const energyAmount = document.getElementById('energy-amount').value;
  let pricePerUnit = document.getElementById('price-per-unit').value;
  const energyType = document.getElementById('energy-type').value;

  // Конвертируем цену из Ether в Wei
  pricePerUnit = web3.utils.toWei(pricePerUnit, 'ether');

  try {
    await energyTradingContract.methods.createListing(energyAmount, pricePerUnit, energyType).send({ from: userAccount });
    document.getElementById('provider-message').innerText = 'Предложение создано!';
    loadMyListings(); // Обновляем список своих предложений
  } catch (error) {
    console.error(error);
    document.getElementById('provider-message').innerText = 'Ошибка при создании предложения.';
  }
}

// Функция для загрузки своих предложений
async function loadMyListings() {
  const listingsDiv = document.getElementById('my-listings');
  listingsDiv.innerHTML = '';

  const myListings = await energyTradingContract.methods.getProviderListings(userAccount).call();
  for (let id of myListings) {
    const listing = await energyTradingContract.methods.listings(id).call();
    const priceInEther = web3.utils.fromWei(listing.pricePerUnit, 'ether');
    const listingElement = document.createElement('div');
    listingElement.className = 'listing';
    listingElement.innerHTML = `
      <p><strong>ID предложения:</strong> ${listing.id}</p>
      <p><strong>Количество энергии:</strong> ${listing.energyAmount}</p>
      <p><strong>Цена за единицу:</strong> ${priceInEther} ETH</p>
      <p><strong>Тип энергии:</strong> ${listing.energyType}</p>
    `;
    listingsDiv.appendChild(listingElement);
  }
}

// Функция для загрузки списка всех предложений
async function loadAllListings() {
  const listingCount = await energyTradingContract.methods.listingCount().call();
  const listingsDiv = document.getElementById('all-listings');
  listingsDiv.innerHTML = '';

  for (let i = 1; i <= listingCount; i++) {
    const listing = await energyTradingContract.methods.listings(i).call();
    if (listing.isAvailable) {
      const priceInEther = web3.utils.fromWei(listing.pricePerUnit, 'ether');
      const listingElement = document.createElement('div');
      listingElement.className = 'listing';
      listingElement.innerHTML = `
        <p><strong>ID предложения:</strong> ${listing.id}</p>
        <p><strong>Поставщик:</strong> ${listing.provider}</p>
        <p><strong>Количество энергии:</strong> ${listing.energyAmount}</p>
        <p><strong>Цена за единицу:</strong> ${priceInEther} ETH</p>
        <p><strong>Тип энергии:</strong> ${listing.energyType}</p>
      `;
      listingsDiv.appendChild(listingElement);
    }
  }
}

// Функция для загрузки предложений для потребителя
async function loadListings() {
  const listingCount = await energyTradingContract.methods.listingCount().call();
  const listingsDiv = document.getElementById('listings');
  listingsDiv.innerHTML = '';

  for (let i = 1; i <= listingCount; i++) {
    const listing = await energyTradingContract.methods.listings(i).call();
    if (listing.isAvailable) {
      const priceInEther = web3.utils.fromWei(listing.pricePerUnit, 'ether');
      const listingElement = document.createElement('div');
      listingElement.className = 'listing';
      listingElement.innerHTML = `
        <p><strong>ID предложения:</strong> ${listing.id}</p>
        <p><strong>Поставщик:</strong> ${listing.provider}</p>
        <p><strong>Количество энергии:</strong> ${listing.energyAmount}</p>
        <p><strong>Цена за единицу:</strong> ${priceInEther} ETH</p>
        <p><strong>Тип энергии:</strong> ${listing.energyType}</p>
        <input type="number" id="purchase-amount-${listing.id}" placeholder="Количество для покупки" />
        <button onclick="purchaseEnergy(${listing.id})">Купить</button>
      `;
      listingsDiv.appendChild(listingElement);
    }
  }
}

// Функция для покупки энергии
async function purchaseEnergy(listingId) {
  const energyAmount = document.getElementById(`purchase-amount-${listingId}`).value;
  const listing = await energyTradingContract.methods.listings(listingId).call();
  const totalPrice = BigInt(listing.pricePerUnit) * BigInt(energyAmount);

  try {
    await energyTradingContract.methods.purchaseEnergy(listingId, energyAmount).send({
      from: userAccount,
      value: totalPrice.toString()
    });
    document.getElementById('consumer-message').innerText = 'Энергия успешно куплена!';
    loadListings(); // Обновляем список предложений
    getUserInfo(); // Обновляем информацию о пользователе
  } catch (error) {
    console.error(error);
    document.getElementById('consumer-message').innerText = 'Ошибка при покупке энергии.';
  }
}
