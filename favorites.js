const API_BASE_URL = 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', loadFavorites);

async function loadFavorites() {
    const container = document.getElementById('favorites-container');
    try {
        const resp = await fetch(`${API_BASE_URL}/favorites`);
        const vehicles = await resp.json();
        
        if (vehicles.length === 0) {
            container.innerHTML = '<p>У вас пока нет избранной техники</p>';
            return;
        }

        container.innerHTML = '';
        vehicles.forEach(v => {
            const card = createFavoriteCard(v);
            container.appendChild(card);
        });
    } catch (e) {
        container.innerHTML = '<p>Ошибка загрузки</p>';
    }
}

function createFavoriteCard(vehicle) {
    const card = document.createElement('div');
    card.className = `vehicle-card ${vehicle.type}`;
    const imageUrl = vehicle.image_url || '';
    card.innerHTML = `
        <div class="vehicle-image" ${imageUrl ? `style="background-image: url('${imageUrl}')"` : ''}>
            ${!imageUrl ? '<i class="fas fa-image"></i>' : ''}
        </div>
        <div class="vehicle-content">
            <h3 class="vehicle-title">${vehicle.name}</h3>
            <div class="vehicle-details">
                <span>${vehicle.type}</span>
                <span>${vehicle.nation}</span>
                <span>Ранг ${vehicle.rank}</span>
                <span>БР ${vehicle.battle_rating}</span>
            </div>
            <p>${vehicle.description}</p>
            <button class="btn" onclick="removeFavorite(${vehicle.id}, this)">Удалить из избранного</button>
        </div>
    `;
    return card;
}

window.removeFavorite = async function(id, btn) {
    try {
        const resp = await fetch(`${API_BASE_URL}/favorites/${id}`, { method: 'DELETE' });
        if (resp.ok) {
            btn.closest('.vehicle-card').remove();
        }
    } catch (e) {
        alert('Ошибка');
    }
};