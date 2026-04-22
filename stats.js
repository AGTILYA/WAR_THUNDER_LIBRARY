const API_BASE_URL = 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', loadStats);

async function loadStats() {
    try {
        const resp = await fetch(`${API_BASE_URL}/stats/detailed`);
        const stats = await resp.json();
        renderCharts(stats);
    } catch (e) {
        document.getElementById('chart-container').innerHTML = '<p>Ошибка загрузки статистики</p>';
    }
}

function renderCharts(stats) {
    const container = document.getElementById('chart-container');
    container.innerHTML = '';

    // 1. Круговая диаграмма – распределение по нациям
    if (stats.by_nation && Object.keys(stats.by_nation).length > 0) {
        const wrapper = createChartWrapper('Распределение по нациям');
        const canvas = document.createElement('canvas');
        wrapper.appendChild(canvas);
        container.appendChild(wrapper);
        
        const nationNames = {
            ussr: 'СССР',
            germany: 'Германия',
            usa: 'США',
            britain: 'Великобритания',
            japan: 'Япония'
        };
        
        const labels = Object.keys(stats.by_nation).map(k => nationNames[k] || k);
        const data = Object.values(stats.by_nation);
        
        new Chart(canvas, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: ['#ff9900', '#3498db', '#2ecc71', '#e74c3c', '#9b59b6']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: getComputedStyle(document.body).getPropertyValue('--text-primary') }
                    }
                }
            }
        });
    } else {
        container.appendChild(createEmptyMessage('Нет данных для отображения по нациям'));
    }

    // 2. Столбчатая диаграмма – по типам техники
    if (stats.by_type && Object.keys(stats.by_type).length > 0) {
        const wrapper = createChartWrapper('Распределение по типам техники');
        const canvas = document.createElement('canvas');
        wrapper.appendChild(canvas);
        container.appendChild(wrapper);
        
        const typeNames = {
            tank: 'Танки',
            plane: 'Самолёты',
            boat: 'Катера',
            submarine: 'Подлодки',
            ship: 'Корабли'
        };
        
        const labels = Object.keys(stats.by_type).map(k => typeNames[k] || k);
        const data = Object.values(stats.by_type);
        
        new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Количество',
                    data: data,
                    backgroundColor: '#ff9900',
                    borderRadius: 8,
                    barPercentage: 0.7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1, color: getComputedStyle(document.body).getPropertyValue('--text-primary') },
                        grid: { color: getComputedStyle(document.body).getPropertyValue('--border') }
                    },
                    x: {
                        ticks: { color: getComputedStyle(document.body).getPropertyValue('--text-primary') },
                        grid: { display: false }
                    }
                }
            }
        });
    } else {
        container.appendChild(createEmptyMessage('Нет данных для отображения по типам техники'));
    }

    // 3. Столбчатая диаграмма – распределение по БР (точные значения)
    if (stats.by_br_detail && Object.keys(stats.by_br_detail).length > 0) {
        const wrapper = createChartWrapper('Распределение по боевому рейтингу (БР)');
        const canvas = document.createElement('canvas');
        wrapper.appendChild(canvas);
        container.appendChild(wrapper);
        
        // Сортируем ключи как числа
        const sortedBr = Object.keys(stats.by_br_detail).sort((a, b) => parseFloat(a) - parseFloat(b));
        const labels = sortedBr;
        const data = sortedBr.map(br => stats.by_br_detail[br]);
        
        new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Количество',
                    data: data,
                    backgroundColor: '#27ae60',
                    borderRadius: 6,
                    barPercentage: 0.8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: (items) => `БР ${items[0].label}`,
                            label: (item) => `${item.raw} единиц(ы)`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1, color: getComputedStyle(document.body).getPropertyValue('--text-primary') },
                        grid: { color: getComputedStyle(document.body).getPropertyValue('--border') }
                    },
                    x: {
                        title: { display: true, text: 'Боевой рейтинг', color: getComputedStyle(document.body).getPropertyValue('--accent') },
                        ticks: { color: getComputedStyle(document.body).getPropertyValue('--text-primary') },
                        grid: { display: false }
                    }
                }
            }
        });
    } else {
        container.appendChild(createEmptyMessage('Нет данных для отображения по БР'));
    }
}

function createChartWrapper(title) {
    const div = document.createElement('div');
    div.className = 'chart-wrapper';
    div.innerHTML = `<h3>${title}</h3>`;
    return div;
}

function createEmptyMessage(message) {
    const div = document.createElement('div');
    div.className = 'empty-state';
    div.innerHTML = `
        <div class="empty-icon">📊</div>
        <p>${message}</p>
    `;
    return div;
}