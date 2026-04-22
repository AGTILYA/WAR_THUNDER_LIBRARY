const API_BASE_URL = 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', initMap);

async function initMap() {
    const map = L.map('map').setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    try {
        const resp = await fetch(`${API_BASE_URL}/map-data`);
        const data = await resp.json();

        data.forEach(item => {
            const marker = L.marker([item.lat, item.lng]).addTo(map);
            marker.bindPopup(`
                <b>${item.name}</b><br>
                Количество техники: ${item.count}
            `);
        });
    } catch (e) {
        console.error('Ошибка загрузки карты', e);
    }
}