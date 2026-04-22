const API_BASE_URL = 'http://localhost:5000/api';

let currentFilters = {
    type: 'all',
    nation: '',
    min_rank: 1,
    max_rank: 7,
    min_br: 1.0,
    max_br: 11.7,
    search: ''
};

let favoritesCache = [];

// ===== ЛОКАЛИЗАЦИЯ =====
let currentLang = localStorage.getItem('language') || 'ru';
const translations = {
    ru: {
        nav_home: 'Главная',
        nav_vehicles: 'Техника',
        nav_stats: 'Статистика',
        nav_map: 'Карта',
        nav_favorites: 'Избранное',
        nav_compare: 'Сравнение',
        nav_admin: 'Админ-панель',
        hero_title: 'Коллекция техники War Thunder',
        hero_subtitle: 'Просматривайте, сравнивайте, добавляйте в избранное и оценивайте технику War Thunder',
        hero_btn_vehicles: 'Смотреть технику',
        hero_btn_random: '🎲 Мне повезёт',
        vehicles_title: 'Коллекция техники',
        filter_all: 'Вся техника',
        filter_tank: 'Танки',
        filter_plane: 'Самолеты',
        filter_boat: 'Катера',
        filter_submarine: 'Подлодки',
        filter_ship: 'Корабли',
        search_placeholder: 'Поиск по названию...',
        nation_all: 'Все нации',
        nation_ussr: 'СССР',
        nation_germany: 'Германия',
        nation_usa: 'США',
        nation_britain: 'Великобритания',
        nation_japan: 'Япония',
        rank_label: 'Ранг:',
        br_label: 'БР:',
        apply_filters: 'Применить',
        reset_filters: 'Сбросить',
        loading: 'Загрузка техники...',
        favorite_add: 'В избранное',
        favorite_remove: 'В избранном',
        compare: 'Сравнить',
        details: 'Подробнее',
        open_page: 'Открыть страницу',
        empty_title: 'Техника не найдена',
        empty_text: 'Попробуйте изменить параметры поиска',
        error_title: 'Ошибка загрузки',
        error_text: 'Не удалось загрузить технику',
        retry: 'Повторить',
        modal_close: 'Закрыть',
        comments_title: 'Комментарии',
        add_comment: 'Добавить комментарий',
        comment_author: 'Ваше имя',
        comment_text_placeholder: 'Комментарий (необязательно)',
        comment_rating: 'Оценить (1-5)',
        comment_submit: 'Отправить',
        no_comments: 'Пока нет комментариев',
        no_rating: 'Без оценки'
    },
    en: {
        nav_home: 'Home',
        nav_vehicles: 'Vehicles',
        nav_stats: 'Statistics',
        nav_map: 'Map',
        nav_favorites: 'Favorites',
        nav_compare: 'Compare',
        nav_admin: 'Admin Panel',
        hero_title: 'War Thunder Vehicle Collection',
        hero_subtitle: 'Browse, compare, favorite and rate War Thunder vehicles',
        hero_btn_vehicles: 'View Vehicles',
        hero_btn_random: '🎲 I\'m feeling lucky',
        vehicles_title: 'Vehicle Collection',
        filter_all: 'All vehicles',
        filter_tank: 'Tanks',
        filter_plane: 'Planes',
        filter_boat: 'Boats',
        filter_submarine: 'Submarines',
        filter_ship: 'Ships',
        search_placeholder: 'Search by name...',
        nation_all: 'All nations',
        nation_ussr: 'USSR',
        nation_germany: 'Germany',
        nation_usa: 'USA',
        nation_britain: 'Great Britain',
        nation_japan: 'Japan',
        rank_label: 'Rank:',
        br_label: 'BR:',
        apply_filters: 'Apply',
        reset_filters: 'Reset',
        loading: 'Loading vehicles...',
        favorite_add: 'Add to favorites',
        favorite_remove: 'In favorites',
        compare: 'Compare',
        details: 'Details',
        open_page: 'Open page',
        empty_title: 'No vehicles found',
        empty_text: 'Try changing your search parameters',
        error_title: 'Loading error',
        error_text: 'Failed to load vehicles',
        retry: 'Retry',
        modal_close: 'Close',
        comments_title: 'Comments',
        add_comment: 'Add comment',
        comment_author: 'Your name',
        comment_text_placeholder: 'Comment (optional)',
        comment_rating: 'Rate (1-5)',
        comment_submit: 'Submit',
        no_comments: 'No comments yet',
        no_rating: 'No rating'
    }
};

function applyLanguage() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
            if (el.tagName === 'INPUT' && el.hasAttribute('data-i18n-placeholder')) {
                el.placeholder = translations[currentLang][key];
            } else {
                el.textContent = translations[currentLang][key];
            }
        }
    });
    // Обновляем опции select
    document.querySelectorAll('#filter-nation option').forEach(opt => {
        const key = opt.getAttribute('data-i18n');
        if (key && translations[currentLang][key]) {
            opt.textContent = translations[currentLang][key];
        }
    });
    // Обновляем кнопки в карточках (динамические)
    updateAllCardsLanguage();
    // Обновляем модальное окно, если открыто
    const modal = document.getElementById('vehicle-modal');
    if (modal && modal.style.display === 'block') {
        const vehicleId = currentVehicleId;
        if (vehicleId) openModal(vehicleId, currentImageIndex);
    }
}

function updateAllCardsLanguage() {
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        const isFav = btn.classList.contains('favorite-active');
        btn.innerHTML = `${isFav ? '★' : '☆'} ${isFav ? translations[currentLang].favorite_remove : translations[currentLang].favorite_add}`;
    });
    document.querySelectorAll('.compare-btn').forEach(btn => {
        btn.innerHTML = `+ ${translations[currentLang].compare}`;
    });
    document.querySelectorAll('.details-btn').forEach(btn => {
        btn.innerHTML = `💬 ${translations[currentLang].details}`;
    });
    document.querySelectorAll('.page-btn').forEach(btn => {
        btn.innerHTML = `📄 ${translations[currentLang].open_page}`;
    });
}

function setupLanguageSwitcher() {
    const ruBtn = document.getElementById('lang-ru');
    const enBtn = document.getElementById('lang-en');
    
    ruBtn.addEventListener('click', () => {
        currentLang = 'ru';
        localStorage.setItem('language', 'ru');
        ruBtn.classList.add('active');
        enBtn.classList.remove('active');
        applyLanguage();
    });
    
    enBtn.addEventListener('click', () => {
        currentLang = 'en';
        localStorage.setItem('language', 'en');
        enBtn.classList.add('active');
        ruBtn.classList.remove('active');
        applyLanguage();
    });
    
    // Устанавливаем активную кнопку при загрузке
    if (currentLang === 'ru') {
        ruBtn.classList.add('active');
        enBtn.classList.remove('active');
    } else {
        ruBtn.classList.remove('active');
        enBtn.classList.add('active');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupLanguageSwitcher();
    applyLanguage();
    loadVehicles();
    setupFilters();
    setupAdvancedFilters();
    setupThemeToggle();
    setupRandomButton();
    registerSW();
    loadFavorites();
});

// ===== ТЕМА =====
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
    const toggle = document.getElementById('theme-toggle');
    if (toggle) toggle.checked = savedTheme === 'light';
}

function setupThemeToggle() {
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
        toggle.addEventListener('change', () => {
            const theme = toggle.checked ? 'light' : 'dark';
            document.body.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
        });
    }
}

// ===== ЗАГРУЗКА ТЕХНИКИ =====
async function loadVehicles(filters = currentFilters) {
    const container = document.getElementById('vehicles-container');
    const loading = document.getElementById('loading');
    
    try {
        const params = new URLSearchParams();
        if (filters.type && filters.type !== 'all') params.append('type', filters.type);
        if (filters.nation) params.append('nation', filters.nation);
        if (filters.min_rank > 1) params.append('min_rank', filters.min_rank);
        if (filters.max_rank < 7) params.append('max_rank', filters.max_rank);
        if (filters.min_br > 1.0) params.append('min_br', filters.min_br);
        if (filters.max_br < 11.7) params.append('max_br', filters.max_br);
        if (filters.search) params.append('search', filters.search);
        
        const url = `${API_BASE_URL}/vehicles/search?${params.toString()}`;
        const response = await fetch(url);
        const vehicles = await response.json();
        
        if (loading) loading.style.display = 'none';
        container.innerHTML = '';
        
        if (!vehicles || vehicles.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🚫</div>
                    <h3>${translations[currentLang].empty_title}</h3>
                    <p>${translations[currentLang].empty_text}</p>
                </div>
            `;
            return;
        }
        
        const ratingPromises = vehicles.map(v => 
            fetch(`${API_BASE_URL}/vehicles/${v.id}/comments`)
                .then(res => res.json())
                .then(data => {
                    v.avg_rating = data.rating.avg;
                    v.rating_count = data.rating.count;
                    return v;
                })
                .catch(() => {
                    v.avg_rating = 0;
                    v.rating_count = 0;
                    return v;
                })
        );
        
        const vehiclesWithRating = await Promise.all(ratingPromises);
        
        vehiclesWithRating.forEach(vehicle => {
            const card = createVehicleCard(vehicle);
            container.appendChild(card);
        });
        
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        if (loading) {
            loading.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚠️</div>
                    <h3>${translations[currentLang].error_title}</h3>
                    <p>${translations[currentLang].error_text}</p>
                    <button class="btn" onclick="loadVehicles()">${translations[currentLang].retry}</button>
                </div>
            `;
        }
    }
}

// ===== СОЗДАНИЕ КАРТОЧКИ =====
function createVehicleCard(vehicle) {
    const card = document.createElement('div');
    card.className = `vehicle-card ${vehicle.type}`;
    card.dataset.id = vehicle.id;
    card.dataset.type = vehicle.type;
    
    const nationNames = {
        ussr: 'СССР', germany: 'Германия', usa: 'США',
        britain: 'Великобритания', japan: 'Япония'
    };
    const typeNames = {
        tank: 'Танк', plane: 'Самолет', boat: 'Катер',
        submarine: 'Подлодка', ship: 'Корабль'
    };
    const nationColors = {
        ussr: '#ff4444', germany: '#777777', usa: '#4444ff',
        britain: '#44ff44', japan: '#ff44ff'
    };
    
    let imageUrl = '';
    if (vehicle.images && vehicle.images.length > 0) {
        imageUrl = vehicle.images[0];
    } else if (vehicle.image_url) {
        imageUrl = vehicle.image_url;
    }
    
    const mainImageHtml = imageUrl
        ? `<div class="vehicle-image" style="background-image: url('${imageUrl}')"></div>`
        : `<div class="vehicle-image"><i class="fas fa-image"></i></div>`;
    
    const rating = vehicle.avg_rating || 0;
    const fullStars = Math.floor(rating);
    const halfStar = (rating - fullStars) >= 0.5 ? 1 : 0;
    const emptyStars = 5 - fullStars - halfStar;
    const starsHtml = '★'.repeat(fullStars) + (halfStar ? '½' : '') + '☆'.repeat(emptyStars);
    
    const isFav = isFavorite(vehicle.id);
    const favText = isFav ? translations[currentLang].favorite_remove : translations[currentLang].favorite_add;
    
    card.innerHTML = `
        <div class="vehicle-card-inner">
            ${mainImageHtml}
            <div class="vehicle-content">
                <div class="vehicle-title">
                    <span>${vehicle.name}</span>
                    <span class="vehicle-rating" title="${rating.toFixed(1)} (${vehicle.rating_count || 0} оценок)">
                        ${starsHtml} ${rating.toFixed(1)}
                    </span>
                </div>
                <div class="vehicle-details">
                    <span class="vehicle-detail" style="color: ${nationColors[vehicle.nation]}">
                        ${nationNames[vehicle.nation]}
                    </span>
                    <span class="vehicle-detail">${typeNames[vehicle.type]}</span>
                    <span class="vehicle-detail">${vehicle.rank} Ранг</span>
                    <span class="vehicle-detail">БР ${vehicle.battle_rating}</span>
                </div>
                <p class="vehicle-description">${vehicle.description}</p>
                <div class="vehicle-actions">
                    <button class="favorite-btn ${isFav ? 'favorite-active' : ''}" 
                            onclick="toggleFavorite(${vehicle.id}, this)">
                        ${isFav ? '★' : '☆'} ${favText}
                    </button>
                    <button class="compare-btn" onclick="addToCompare(${vehicle.id})">
                        + ${translations[currentLang].compare}
                    </button>
                    <button class="details-btn" onclick="openModal(${vehicle.id}, 0)">
                        💬 ${translations[currentLang].details}
                    </button>
                    <button class="page-btn" onclick="window.location.href='/vehicle/${vehicle.id}'">
                        📄 ${translations[currentLang].open_page}
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return card;
}

// ===== МОДАЛЬНОЕ ОКНО =====
let currentVehicleId = null;
let currentImageIndex = 0;

function openModal(vehicleId, imageIndex) {
    currentVehicleId = vehicleId;
    currentImageIndex = imageIndex;
    
    fetch(`${API_BASE_URL}/vehicles/${vehicleId}`)
        .then(res => res.json())
        .then(vehicle => {
            fetch(`${API_BASE_URL}/vehicles/${vehicleId}/comments`)
                .then(res => res.json())
                .then(commentData => {
                    showModal(vehicle, commentData);
                });
        })
        .catch(err => console.error('Ошибка загрузки деталей', err));
}

function showModal(vehicle, commentData) {
    const modal = document.getElementById('vehicle-modal');
    if (!modal) {
        createModal();
    }
    
    const modalContent = document.getElementById('modal-content');
    const nationNames = {
        ussr: 'СССР', germany: 'Германия', usa: 'США',
        britain: 'Великобритания', japan: 'Япония'
    };
    const typeNames = {
        tank: 'Танк', plane: 'Самолет', boat: 'Катер',
        submarine: 'Подлодка', ship: 'Корабль'
    };
    const nationColors = {
        ussr: '#ff4444', germany: '#777777', usa: '#4444ff',
        britain: '#44ff44', japan: '#ff44ff'
    };
    
    let allImages = [];
    if (vehicle.images && vehicle.images.length > 0) {
        allImages = vehicle.images;
    } else if (vehicle.image_url) {
        allImages = [vehicle.image_url];
    }
    
    let galleryHtml = '';
    if (allImages.length > 0) {
        galleryHtml = '<div class="modal-gallery">';
        galleryHtml += `<div class="modal-main-image" style="background-image: url('${allImages[currentImageIndex]}')"></div>`;
        galleryHtml += '<div class="modal-thumbnails">';
        allImages.forEach((img, idx) => {
            galleryHtml += `<img src="${img}" class="modal-thumb ${idx === currentImageIndex ? 'active' : ''}" onclick="changeModalImage(${idx})">`;
        });
        galleryHtml += '</div></div>';
    } else {
        galleryHtml = '<div class="modal-main-image"><i class="fas fa-image"></i></div>';
    }
    
    const rating = commentData.rating.avg || 0;
    const stars = '★'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '½' : '') + '☆'.repeat(5 - Math.ceil(rating));
    
    let commentsHtml = `<div class="modal-comments"><h3>${translations[currentLang].comments_title}</h3>`;
    if (commentData.comments.length === 0) {
        commentsHtml += `<p>${translations[currentLang].no_comments}</p>`;
    } else {
        commentData.comments.forEach(c => {
            const date = new Date(c.created_at).toLocaleString();
            const starsC = c.rating ? '★'.repeat(c.rating) + '☆'.repeat(5 - c.rating) : '';
            commentsHtml += `
                <div class="comment">
                    <div class="comment-header">
                        <span class="comment-author">${c.author_name}</span>
                        <span class="comment-date">${date}</span>
                    </div>
                    <div class="comment-rating">${starsC}</div>
                    <div class="comment-text">${c.text || '<em>' + (c.rating ? '' : translations[currentLang].no_rating) + '</em>'}</div>
                </div>
            `;
        });
    }
    commentsHtml += '</div>';
    
    commentsHtml += `
        <div class="modal-add-comment">
            <h4>${translations[currentLang].add_comment}</h4>
            <form onsubmit="submitModalComment(event, ${vehicle.id})">
                <input type="text" name="author" placeholder="${translations[currentLang].comment_author}" value="Аноним" required>
                <textarea name="text" placeholder="${translations[currentLang].comment_text_placeholder}"></textarea>
                <select name="rating">
                    <option value="">${translations[currentLang].no_rating}</option>
                    <option value="1">1 ★</option>
                    <option value="2">2 ★★</option>
                    <option value="3">3 ★★★</option>
                    <option value="4">4 ★★★★</option>
                    <option value="5">5 ★★★★★</option>
                </select>
                <button type="submit" class="btn">${translations[currentLang].comment_submit}</button>
            </form>
        </div>
    `;
    
    modalContent.innerHTML = `
        <div class="modal-header">
            <h2>${vehicle.name}</h2>
            <span class="close-modal" onclick="closeModal()">&times;</span>
        </div>
        <div class="modal-body">
            <div class="modal-info">
                <p><strong>${translations[currentLang].filter_tank.slice(0, -1)}:</strong> ${typeNames[vehicle.type]}</p>
                <p><strong>${translations[currentLang].nation_all.slice(0, -2)}:</strong> <span style="color: ${nationColors[vehicle.nation]}">${nationNames[vehicle.nation]}</span></p>
                <p><strong>${translations[currentLang].rank_label.slice(0, -1)}:</strong> ${vehicle.rank}</p>
                <p><strong>${translations[currentLang].br_label.slice(0, -1)}:</strong> ${vehicle.battle_rating}</p>
                <p><strong>${translations[currentLang].comments_title.slice(0, -1)}:</strong> ${stars} (${rating.toFixed(1)} из 5, ${commentData.rating.count} оценок)</p>
                <p><strong>Описание:</strong> ${vehicle.description}</p>
            </div>
            ${galleryHtml}
            ${commentsHtml}
        </div>
    `;
    
    document.getElementById('vehicle-modal').style.display = 'block';
}

function changeModalImage(index) {
    currentImageIndex = index;
    openModal(currentVehicleId, index);
}

async function submitModalComment(event, vehicleId) {
    event.preventDefault();
    const form = event.target;
    const author = form.author.value;
    const text = form.text.value;
    const rating = form.rating.value ? parseInt(form.rating.value) : null;
    
    try {
        const resp = await fetch(`${API_BASE_URL}/vehicles/${vehicleId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ author_name: author, text, rating })
        });
        if (resp.ok) {
            openModal(vehicleId, currentImageIndex);
            updateVehicleRating(vehicleId);
        } else {
            alert('Ошибка при отправке');
        }
    } catch (e) {
        alert('Ошибка соединения');
    }
}

function closeModal() {
    document.getElementById('vehicle-modal').style.display = 'none';
}

function createModal() {
    const modal = document.createElement('div');
    modal.id = 'vehicle-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" id="modal-content">
            <div class="modal-header">
                <h2>Загрузка...</h2>
                <span class="close-modal" onclick="closeModal()">&times;</span>
            </div>
            <div class="modal-body">Загрузка...</div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

// ===== СЛУЧАЙНАЯ ТЕХНИКА =====
function setupRandomButton() {
    const btn = document.getElementById('random-vehicle-btn');
    if (btn) btn.addEventListener('click', loadRandomVehicle);
    loadRandomVehicle();
}

async function loadRandomVehicle() {
    const container = document.getElementById('random-vehicle-container');
    if (!container) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/vehicles/random`);
        if (!response.ok) throw new Error('Нет техники в базе');
        const vehicle = await response.json();
        
        const ratingResp = await fetch(`${API_BASE_URL}/vehicles/${vehicle.id}/comments`);
        const ratingData = await ratingResp.json();
        vehicle.avg_rating = ratingData.rating.avg;
        vehicle.rating_count = ratingData.rating.count;
        
        container.style.display = 'block';
        container.innerHTML = createRandomVehicleCard(vehicle);
    } catch (error) {
        console.error('Ошибка загрузки случайной техники:', error);
        container.style.display = 'none';
    }
}

function createRandomVehicleCard(vehicle) {
    const nationNames = {
        ussr: 'СССР', germany: 'Германия', usa: 'США',
        britain: 'Великобритания', japan: 'Япония'
    };
    const typeNames = {
        tank: 'Танк', plane: 'Самолёт', boat: 'Катер',
        submarine: 'Подлодка', ship: 'Корабль'
    };
    const nationColors = {
        ussr: '#ff4444', germany: '#777777', usa: '#4444ff',
        britain: '#44ff44', japan: '#ff44ff'
    };
    
    let imageUrl = '';
    if (vehicle.images && vehicle.images.length > 0) {
        imageUrl = vehicle.images[0];
    } else if (vehicle.image_url) {
        imageUrl = vehicle.image_url;
    }
    const imageStyle = imageUrl ? `style="background-image: url('${imageUrl}')"` : '';
    const imageContent = imageUrl ? '' : '<i class="fas fa-image"></i>';
    
    const rating = vehicle.avg_rating || 0;
    const starsHtml = '★'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '½' : '') + '☆'.repeat(5 - Math.ceil(rating));
    
    const isFav = isFavorite(vehicle.id);
    const favText = isFav ? translations[currentLang].favorite_remove : translations[currentLang].favorite_add;
    
    return `
        <div class="random-vehicle-inner">
            <h3>🎲 ${translations[currentLang].hero_btn_random}</h3>
            <div class="vehicle-card random-card">
                <div class="vehicle-image" ${imageStyle}>
                    ${imageContent}
                </div>
                <div class="vehicle-content">
                    <div class="vehicle-title">
                        <span>${vehicle.name}</span>
                        <span class="vehicle-rating" title="${rating.toFixed(1)} (${vehicle.rating_count || 0} оценок)">
                            ${starsHtml} ${rating.toFixed(1)}
                        </span>
                    </div>
                    <div class="vehicle-details">
                        <span class="vehicle-detail" style="color: ${nationColors[vehicle.nation]}">
                            ${nationNames[vehicle.nation]}
                        </span>
                        <span class="vehicle-detail">${typeNames[vehicle.type]}</span>
                        <span class="vehicle-detail">${vehicle.rank} Ранг</span>
                        <span class="vehicle-detail">БР ${vehicle.battle_rating}</span>
                    </div>
                    <p class="vehicle-description">${vehicle.description}</p>
                    <div class="vehicle-actions">
                        <button class="favorite-btn ${isFav ? 'favorite-active' : ''}" 
                                onclick="toggleFavorite(${vehicle.id}, this)">
                            ${isFav ? '★' : '☆'} ${favText}
                        </button>
                        <button class="compare-btn" onclick="addToCompare(${vehicle.id})">
                            + ${translations[currentLang].compare}
                        </button>
                        <button class="details-btn" onclick="openModal(${vehicle.id}, 0)">
                            💬 ${translations[currentLang].details}
                        </button>
                        <button class="page-btn" onclick="window.location.href='/vehicle/${vehicle.id}'">
                            📄 ${translations[currentLang].open_page}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ===== ИЗБРАННОЕ =====
async function loadFavorites() {
    try {
        const resp = await fetch(`${API_BASE_URL}/favorites`);
        favoritesCache = await resp.json();
    } catch (e) {
        console.error('Ошибка загрузки избранного', e);
    }
}

function isFavorite(vehicleId) {
    return favoritesCache.some(v => v.id === vehicleId);
}

async function toggleFavorite(vehicleId, btn) {
    const isFav = btn.classList.contains('favorite-active');
    const method = isFav ? 'DELETE' : 'POST';
    try {
        const resp = await fetch(`${API_BASE_URL}/favorites/${vehicleId}`, { method });
        if (resp.ok) {
            btn.classList.toggle('favorite-active');
            const newFav = btn.classList.contains('favorite-active');
            btn.innerHTML = `${newFav ? '★' : '☆'} ${newFav ? translations[currentLang].favorite_remove : translations[currentLang].favorite_add}`;
            await loadFavorites();
        }
    } catch (e) {
        alert('Ошибка при изменении избранного');
    }
}

// ===== СРАВНЕНИЕ =====
function addToCompare(vehicleId) {
    let compareList = JSON.parse(localStorage.getItem('compareList') || '[]');
    if (!compareList.includes(vehicleId)) {
        compareList.push(vehicleId);
        localStorage.setItem('compareList', JSON.stringify(compareList));
        alert('Техника добавлена к сравнению');
    } else {
        alert('Эта техника уже в списке сравнения');
    }
}

// ===== ФИЛЬТРЫ =====
function setupFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilters.type = this.dataset.filter;
            loadVehicles(currentFilters);
        });
    });
}

function setupAdvancedFilters() {
    const searchInput = document.getElementById('search-name');
    const nationSelect = document.getElementById('filter-nation');
    const minRank = document.getElementById('min-rank');
    const maxRank = document.getElementById('max-rank');
    const minBr = document.getElementById('min-br');
    const maxBr = document.getElementById('max-br');
    const applyBtn = document.getElementById('apply-filters');
    const resetBtn = document.getElementById('reset-filters');
    const rankRangeValue = document.getElementById('rank-range-value');
    const brRangeValue = document.getElementById('br-range-value');

    function updateRangeLabels() {
        rankRangeValue.textContent = `${minRank.value}-${maxRank.value}`;
        brRangeValue.textContent = `${parseFloat(minBr.value).toFixed(1)}-${parseFloat(maxBr.value).toFixed(1)}`;
    }
    
    minRank.addEventListener('input', updateRangeLabels);
    maxRank.addEventListener('input', updateRangeLabels);
    minBr.addEventListener('input', updateRangeLabels);
    maxBr.addEventListener('input', updateRangeLabels);
    
    applyBtn.addEventListener('click', () => {
        currentFilters.search = searchInput.value;
        currentFilters.nation = nationSelect.value;
        currentFilters.min_rank = parseInt(minRank.value);
        currentFilters.max_rank = parseInt(maxRank.value);
        currentFilters.min_br = parseFloat(minBr.value);
        currentFilters.max_br = parseFloat(maxBr.value);
        loadVehicles(currentFilters);
    });
    
    resetBtn.addEventListener('click', () => {
        searchInput.value = '';
        nationSelect.value = '';
        minRank.value = 1;
        maxRank.value = 7;
        minBr.value = 1.0;
        maxBr.value = 11.7;
        updateRangeLabels();
        currentFilters = {
            type: document.querySelector('.filter-btn.active')?.dataset.filter || 'all',
            nation: '',
            min_rank: 1,
            max_rank: 7,
            min_br: 1.0,
            max_br: 11.7,
            search: ''
        };
        loadVehicles(currentFilters);
    });
    
    updateRangeLabels();
}

async function updateVehicleRating(vehicleId) {
    try {
        const resp = await fetch(`${API_BASE_URL}/vehicles/${vehicleId}/comments`);
        const data = await resp.json();
        const rating = data.rating.avg;
        const card = document.querySelector(`.vehicle-card[data-id="${vehicleId}"]`);
        if (card) {
            const ratingSpan = card.querySelector('.vehicle-rating');
            if (ratingSpan) {
                const stars = '★'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '½' : '') + '☆'.repeat(5 - Math.ceil(rating));
                ratingSpan.innerHTML = `${stars} ${rating.toFixed(1)}`;
                ratingSpan.title = `${rating.toFixed(1)} (${data.rating.count} оценок)`;
            }
        }
    } catch (e) {
        console.error('Ошибка обновления рейтинга', e);
    }
}

// ===== PWA =====
function registerSW() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('SW registered', reg))
            .catch(err => console.log('SW error', err));
    }
}