const API_BASE_URL = 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', loadCompare);

async function loadCompare() {
    const container = document.getElementById('compare-container');
    const compareIds = JSON.parse(localStorage.getItem('compareList') || '[]');
    
    if (compareIds.length === 0) {
        container.innerHTML = '<p>Список сравнения пуст. Добавьте технику на главной странице.</p>';
        return;
    }

    try {
        const vehicles = [];
        for (let id of compareIds) {
            const resp = await fetch(`${API_BASE_URL}/vehicles/${id}`);
            if (resp.ok) vehicles.push(await resp.json());
        }

        if (vehicles.length === 0) {
            container.innerHTML = '<p>Не удалось загрузить технику</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'compare-table';
        
        let thead = '<tr><th>Характеристика</th>';
        vehicles.forEach(v => thead += `<th>${v.name}</th>`);
        thead += '</tr>';
        table.innerHTML = thead;

        const rows = [
            { label: 'Тип', field: 'type' },
            { label: 'Нация', field: 'nation' },
            { label: 'Ранг', field: 'rank' },
            { label: 'Боевой рейтинг', field: 'battle_rating' },
            { label: 'Описание', field: 'description' }
        ];

        rows.forEach(row => {
            let tr = `<tr><td>${row.label}</td>`;
            vehicles.forEach(v => {
                tr += `<td>${v[row.field] || '-'}</td>`;
            });
            tr += '</tr>';
            table.innerHTML += tr;
        });

        const clearBtn = document.createElement('button');
        clearBtn.className = 'btn';
        clearBtn.textContent = 'Очистить список сравнения';
        clearBtn.onclick = () => {
            localStorage.removeItem('compareList');
            loadCompare();
        };

        container.innerHTML = '';
        container.appendChild(table);
        container.appendChild(clearBtn);

    } catch (e) {
        container.innerHTML = '<p>Ошибка загрузки данных</p>';
    }
}