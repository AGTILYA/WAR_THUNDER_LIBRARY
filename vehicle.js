const API_BASE_URL = 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    const vehicleId = path.split('/').pop();
    if (vehicleId && !isNaN(vehicleId)) {
        loadVehicle(vehicleId);
    } else {
        document.getElementById('vehicle-detail').innerHTML = '<p>Не указан ID техники</p>';
    }
});

async function loadVehicle(id) {
    const container = document.getElementById('vehicle-detail');
    try {
        const [vehicleResp, commentsResp] = await Promise.all([
            fetch(`${API_BASE_URL}/vehicles/${id}`),
            fetch(`${API_BASE_URL}/vehicles/${id}/comments`)
        ]);
        if (!vehicleResp.ok) throw new Error('Техника не найдена');
        const vehicle = await vehicleResp.json();
        const commentsData = await commentsResp.json();
        renderVehicle(vehicle, commentsData);
    } catch (error) {
        container.innerHTML = `<div class="empty-state"><h3>Ошибка</h3><p>${error.message}</p><a href="index.html" class="btn">Вернуться на главную</a></div>`;
    }
}

function renderVehicle(vehicle, commentsData) {
    const container = document.getElementById('vehicle-detail');
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

    // Галерея изображений
    let galleryHtml = '';
    if (vehicle.images && vehicle.images.length > 0) {
        galleryHtml = '<div class="vehicle-gallery">';
        galleryHtml += '<div class="gallery-main">';
        galleryHtml += `<img src="${vehicle.images[0]}" id="gallery-main-img" alt="${vehicle.name}">`;
        galleryHtml += '</div><div class="gallery-thumbnails">';
        vehicle.images.forEach((img, idx) => {
            galleryHtml += `<img src="${img}" class="gallery-thumb" onclick="changeMainImage('${img}')">`;
        });
        galleryHtml += '</div></div>';
    } else {
        galleryHtml = '<div class="vehicle-image-placeholder"><i class="fas fa-image"></i></div>';
    }

    // Рейтинг
    const rating = commentsData.rating.avg || 0;
    const stars = '★'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '½' : '') + '☆'.repeat(5 - Math.ceil(rating));

    // Теги
    let tagsHtml = '';
    if (vehicle.tags && vehicle.tags.length) {
        tagsHtml = '<div class="vehicle-tags">' + vehicle.tags.map(t => `<span class="tag">${t.name}</span>`).join('') + '</div>';
    }

    // Комментарии
    let commentsHtml = '<div class="comments-section"><h3>Комментарии</h3>';
    if (commentsData.comments.length === 0) {
        commentsHtml += '<p>Пока нет комментариев</p>';
    } else {
        commentsData.comments.forEach(c => {
            const date = new Date(c.created_at).toLocaleString();
            const starsC = c.rating ? '★'.repeat(c.rating) + '☆'.repeat(5 - c.rating) : '';
            commentsHtml += `
                <div class="comment">
                    <div class="comment-header">
                        <span class="comment-author">${c.author_name}</span>
                        <span class="comment-date">${date}</span>
                    </div>
                    <div class="comment-rating">${starsC}</div>
                    <div class="comment-text">${c.text || '<em>Без текста</em>'}</div>
                </div>
            `;
        });
    }
    commentsHtml += '</div>';

    // Форма добавления комментария
    commentsHtml += `
        <div class="add-comment">
            <h4>Добавить комментарий</h4>
            <form id="comment-form">
                <input type="text" name="author" placeholder="Ваше имя" value="Аноним" required>
                <textarea name="text" placeholder="Комментарий (необязательно)"></textarea>
                <select name="rating">
                    <option value="">Без оценки</option>
                    <option value="1">1 ★</option>
                    <option value="2">2 ★★</option>
                    <option value="3">3 ★★★</option>
                    <option value="4">4 ★★★★</option>
                    <option value="5">5 ★★★★★</option>
                </select>
                <button type="submit" class="btn">Отправить</button>
            </form>
        </div>
    `;

    const actionsHtml = `
        <div class="vehicle-actions-page">
            <button class="favorite-btn" onclick="toggleFavoritePage(${vehicle.id}, this)">
                ☆ В избранное
            </button>
            <button class="compare-btn" onclick="addToComparePage(${vehicle.id})">+ Сравнить</button>
            <a href="index.html" class="btn-secondary">← На главную</a>
        </div>
    `;

    container.innerHTML = `
        <div class="vehicle-detail-card">
            <h1>${vehicle.name}</h1>
            <div class="vehicle-detail-info">
                <p><strong>Тип:</strong> ${typeNames[vehicle.type]}</p>
                <p><strong>Нация:</strong> <span style="color: ${nationColors[vehicle.nation]}">${nationNames[vehicle.nation]}</span></p>
                <p><strong>Ранг:</strong> ${vehicle.rank}</p>
                <p><strong>Боевой рейтинг:</strong> ${vehicle.battle_rating}</p>
                <p><strong>Рейтинг:</strong> ${stars} (${rating.toFixed(1)} из 5, ${commentsData.rating.count} оценок)</p>
                <p><strong>Описание:</strong> ${vehicle.description}</p>
                ${tagsHtml}
            </div>
            ${galleryHtml}
            ${actionsHtml}
            ${commentsHtml}
        </div>
    `;

    // Загружаем статус избранного для кнопки
    updateFavoriteButton(vehicle.id);
    // Инициализация формы
    const form = document.getElementById('comment-form');
    form.addEventListener('submit', (e) => submitCommentPage(e, vehicle.id));
}

async function updateFavoriteButton(vehicleId) {
    const btn = document.querySelector('.favorite-btn');
    if (btn) {
        try {
            const resp = await fetch(`${API_BASE_URL}/favorites/${vehicleId}/status`);
            const data = await resp.json();
            btn.classList.toggle('favorite-active', data.favorite);
            btn.innerHTML = data.favorite ? '★ В избранном' : '☆ В избранное';
        } catch (e) {
            console.error('Ошибка загрузки статуса избранного');
        }
    }
}

function changeMainImage(src) {
    const mainImg = document.getElementById('gallery-main-img');
    if (mainImg) mainImg.src = src;
}

async function toggleFavoritePage(vehicleId, btn) {
    const isFav = btn.classList.contains('favorite-active');
    const method = isFav ? 'DELETE' : 'POST';
    try {
        const resp = await fetch(`${API_BASE_URL}/favorites/${vehicleId}`, { method });
        if (resp.ok) {
            btn.classList.toggle('favorite-active');
            btn.innerHTML = btn.classList.contains('favorite-active') ? '★ В избранном' : '☆ В избранное';
        }
    } catch (e) {
        alert('Ошибка при изменении избранного');
    }
}

function addToComparePage(vehicleId) {
    let compareList = JSON.parse(localStorage.getItem('compareList') || '[]');
    if (!compareList.includes(vehicleId)) {
        compareList.push(vehicleId);
        localStorage.setItem('compareList', JSON.stringify(compareList));
        alert('Техника добавлена к сравнению');
    } else {
        alert('Эта техника уже в списке сравнения');
    }
}

async function submitCommentPage(event, vehicleId) {
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
            window.location.reload();
        } else {
            alert('Ошибка при отправке');
        }
    } catch (e) {
        alert('Ошибка соединения');
    }
}