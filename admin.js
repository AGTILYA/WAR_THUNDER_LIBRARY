const API_BASE_URL = 'http://localhost:5000/api';
const ADMIN_CREDENTIALS = { username: 'war_and_top', password: 'thunder_top' };

document.addEventListener('DOMContentLoaded', () => {
    const loggedIn = localStorage.getItem('adminLoggedIn') === 'true';
    loggedIn ? showAdminPanel() : showLoginScreen();
    setupLoginForm();
    setupAdminFunctions();
    setupAddVehicleForm();
    setupDynamicImageFields();
    setupEditForm();
});

function showLoginScreen() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('admin-panel').style.display = 'none';
}

function showAdminPanel() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
    loadAdminVehicles();
}

function setupLoginForm() {
    const form = document.getElementById('admin-login-form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('admin-username').value;
        const password = document.getElementById('admin-password').value;
        if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
            localStorage.setItem('adminLoggedIn', 'true');
            showAdminPanel();
        } else {
            alert('Неверные данные');
        }
    });
}

// Динамическое добавление полей для изображений (добавление и удаление)
function setupDynamicImageFields() {
    const container = document.getElementById('images-container');
    const addBtn = document.getElementById('add-image-btn');
    const fileInfo = document.getElementById('file-info');
    const previewContainer = document.getElementById('image-preview-container');

    function updatePreviews() {
        const inputs = document.querySelectorAll('#images-container .image-file-input');
        const files = Array.from(inputs).filter(input => input.files.length > 0).flatMap(input => Array.from(input.files));
        fileInfo.textContent = files.length ? `Выбрано файлов: ${files.length}` : 'Файлы не выбраны';
        previewContainer.innerHTML = '';
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'preview-image';
                img.style.maxWidth = '100px';
                img.style.maxHeight = '100px';
                img.style.margin = '5px';
                previewContainer.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    }

    function addImageField() {
        const currentInputs = document.querySelectorAll('#images-container .image-input-group').length;
        if (currentInputs >= 5) {
            alert('Максимум 5 полей для изображений');
            return;
        }
        const group = document.createElement('div');
        group.className = 'image-input-group';
        group.innerHTML = `
            <input type="file" name="images" accept="image/*" class="image-file-input" multiple>
            <button type="button" class="remove-image-btn">✖</button>
        `;
        const removeBtn = group.querySelector('.remove-image-btn');
        removeBtn.addEventListener('click', () => {
            group.remove();
            updatePreviews();
        });
        container.appendChild(group);
        const fileInput = group.querySelector('.image-file-input');
        fileInput.addEventListener('change', updatePreviews);
    }

    addBtn.addEventListener('click', addImageField);

    // Инициализация: первое поле уже есть
    const firstInput = document.querySelector('#images-container .image-file-input');
    if (firstInput) {
        firstInput.addEventListener('change', updatePreviews);
        const firstRemove = document.querySelector('#images-container .remove-image-btn');
        if (firstRemove) firstRemove.style.display = 'none'; // первое поле нельзя удалить
    }
}

// Добавление техники (сбор всех файлов)
function setupAddVehicleForm() {
    const form = document.getElementById('admin-add-vehicle-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('admin-vehicle-name').value;
        const type = document.getElementById('admin-vehicle-type').value;
        const nation = document.getElementById('admin-vehicle-nation').value;
        const rank = document.getElementById('admin-vehicle-rank').value;
        const br = document.getElementById('admin-vehicle-br').value;
        const description = document.getElementById('admin-vehicle-description').value;
        const tagsInput = document.getElementById('admin-vehicle-tags').value;

        if (!name || !type || !nation || !rank || !br || !description) {
            alert('Заполните все поля');
            return;
        }

        // Собираем все выбранные файлы из всех полей
        const fileInputs = document.querySelectorAll('#images-container .image-file-input');
        let files = [];
        for (let input of fileInputs) {
            if (input.files.length) {
                files.push(...Array.from(input.files));
            }
        }
        if (files.length === 0) {
            alert('Выберите хотя бы одно изображение');
            return;
        }
        if (files.length > 5) {
            alert('Можно загрузить не более 5 изображений');
            return;
        }

        const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t !== '');

        const formData = new FormData();
        formData.append('name', name);
        formData.append('type', type);
        formData.append('nation', nation);
        formData.append('rank', rank);
        formData.append('battle_rating', br);
        formData.append('description', description);
        for (let file of files) {
            formData.append('images', file);
        }
        formData.append('tags', JSON.stringify(tags));

        try {
            const resp = await fetch(`${API_BASE_URL}/vehicles`, { method: 'POST', body: formData });
            const result = await resp.json();
            if (resp.ok) {
                alert(`Техника "${name}" добавлена!`);
                form.reset();
                // Очистить динамические поля
                const container = document.getElementById('images-container');
                container.innerHTML = '<div class="image-input-group"><input type="file" name="images" accept="image/*" class="image-file-input"><button type="button" class="remove-image-btn" style="display:none;">✖</button></div>';
                document.getElementById('file-info').textContent = 'Файлы не выбраны';
                document.getElementById('image-preview-container').innerHTML = '';
                setupDynamicImageFields(); // переинициализировать
                loadAdminVehicles();
            } else {
                alert('Ошибка: ' + (result.error || 'Неизвестная ошибка'));
            }
        } catch (e) {
            alert('Ошибка соединения с сервером');
        }
    });
}

// Загрузка списка техники в админке
async function loadAdminVehicles() {
    const container = document.getElementById('admin-vehicles-container');
    try {
        const resp = await fetch(`${API_BASE_URL}/vehicles`);
        const vehicles = await resp.json();
        container.innerHTML = '';
        if (vehicles.length === 0) {
            container.innerHTML = '<p class="empty-message">Нет техники</p>';
            return;
        }
        vehicles.sort((a, b) => b.id - a.id).forEach(v => {
            const card = createAdminCard(v);
            container.appendChild(card);
        });
    } catch (e) {
        container.innerHTML = '<p class="error-message">Ошибка загрузки</p>';
    }
}

function createAdminCard(vehicle) {
    const card = document.createElement('div');
    card.className = `vehicle-card ${vehicle.type}`;
    
    let imagesHtml = '';
    if (vehicle.images && vehicle.images.length) {
        imagesHtml = '<div class="admin-image-gallery">';
        vehicle.images.slice(0, 3).forEach(url => {
            imagesHtml += `<img src="${url}" class="admin-thumb">`;
        });
        if (vehicle.images.length > 3) {
            imagesHtml += `<span class="more-badge">+${vehicle.images.length - 3}</span>`;
        }
        imagesHtml += '</div>';
    } else {
        imagesHtml = '<div class="vehicle-image-placeholder"><i class="fas fa-image"></i></div>';
    }
    
    card.innerHTML = `
        <div class="vehicle-content">
            <h3 class="vehicle-title">${vehicle.name}</h3>
            ${imagesHtml}
            <div class="vehicle-details">
                <span>${vehicle.type}</span>
                <span>${vehicle.nation}</span>
                <span>Ранг ${vehicle.rank}</span>
                <span>БР ${vehicle.battle_rating}</span>
            </div>
            <p>${vehicle.description}</p>
            <div class="admin-card-actions">
                <button class="edit-btn" onclick="openEditModal(${vehicle.id})">✏️ Редактировать</button>
                <button class="delete-btn" onclick="deleteVehicle(${vehicle.id})">🗑️ Удалить</button>
            </div>
        </div>
    `;
    return card;
}

// Удаление
window.deleteVehicle = async function(id) {
    if (!confirm('Удалить технику?')) return;
    try {
        await fetch(`${API_BASE_URL}/vehicles/${id}`, { method: 'DELETE' });
        loadAdminVehicles();
    } catch (e) {
        alert('Ошибка удаления');
    }
};

// Редактирование – открыть модальное окно и заполнить данными
window.openEditModal = async function(id) {
    try {
        const resp = await fetch(`${API_BASE_URL}/vehicles/${id}`);
        const vehicle = await resp.json();
        if (!resp.ok) throw new Error(vehicle.error);

        document.getElementById('edit-vehicle-id').value = vehicle.id;
        document.getElementById('edit-name').value = vehicle.name;
        document.getElementById('edit-type').value = vehicle.type;
        document.getElementById('edit-nation').value = vehicle.nation;
        document.getElementById('edit-rank').value = vehicle.rank;
        document.getElementById('edit-br').value = vehicle.battle_rating;
        document.getElementById('edit-description').value = vehicle.description;
        
        // Теги
        const tagsResp = await fetch(`${API_BASE_URL}/vehicles/${id}/tags`);
        let tagsString = '';
        if (tagsResp.ok) {
            const tags = await tagsResp.json();
            tagsString = tags.map(t => t.name).join(', ');
        }
        document.getElementById('edit-tags').value = tagsString;

        // Очистить поля для новых изображений
        const editContainer = document.getElementById('edit-images-container');
        editContainer.innerHTML = '<div class="image-input-group"><input type="file" name="edit_images" accept="image/*" class="edit-image-file-input"></div>';
        document.getElementById('edit-file-info').textContent = 'Новые файлы не выбраны';
        document.getElementById('edit-preview-container').innerHTML = '';
        // Инициализировать предпросмотр для существующих полей
        setupEditImagePreviews();

        document.getElementById('edit-modal').style.display = 'block';
    } catch (e) {
        alert('Ошибка загрузки данных для редактирования');
    }
};

function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
}

function addEditImageField() {
    const container = document.getElementById('edit-images-container');
    const currentCount = container.querySelectorAll('.image-input-group').length;
    if (currentCount >= 5) {
        alert('Максимум 5 полей для новых изображений');
        return;
    }
    const group = document.createElement('div');
    group.className = 'image-input-group';
    group.innerHTML = `
        <input type="file" name="edit_images" accept="image/*" class="edit-image-file-input">
        <button type="button" class="remove-edit-image-btn">✖</button>
    `;
    const removeBtn = group.querySelector('.remove-edit-image-btn');
    removeBtn.addEventListener('click', () => {
        group.remove();
        updateEditPreviews();
    });
    container.appendChild(group);
    const fileInput = group.querySelector('.edit-image-file-input');
    fileInput.addEventListener('change', updateEditPreviews);
    updateEditPreviews();
}

function setupEditImagePreviews() {
    const inputs = document.querySelectorAll('#edit-images-container .edit-image-file-input');
    inputs.forEach(input => {
        input.removeEventListener('change', updateEditPreviews);
        input.addEventListener('change', updateEditPreviews);
    });
}

function updateEditPreviews() {
    const inputs = document.querySelectorAll('#edit-images-container .edit-image-file-input');
    const files = Array.from(inputs).filter(input => input.files.length > 0).flatMap(input => Array.from(input.files));
    const fileInfo = document.getElementById('edit-file-info');
    const previewContainer = document.getElementById('edit-preview-container');
    fileInfo.textContent = files.length ? `Выбрано новых файлов: ${files.length}` : 'Новые файлы не выбраны';
    previewContainer.innerHTML = '';
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'preview-image';
            img.style.maxWidth = '100px';
            img.style.maxHeight = '100px';
            img.style.margin = '5px';
            previewContainer.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
}

function setupEditForm() {
    const form = document.getElementById('edit-vehicle-form');
    // Кнопка добавления поля для новых изображений в модалке
    const addEditBtn = document.getElementById('add-edit-image-btn');
    if (addEditBtn) {
        addEditBtn.addEventListener('click', addEditImageField);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-vehicle-id').value;
        const name = document.getElementById('edit-name').value;
        const type = document.getElementById('edit-type').value;
        const nation = document.getElementById('edit-nation').value;
        const rank = document.getElementById('edit-rank').value;
        const br = document.getElementById('edit-br').value;
        const description = document.getElementById('edit-description').value;
        const tagsInput = document.getElementById('edit-tags').value;

        const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t !== '');

        // Собираем новые файлы
        const fileInputs = document.querySelectorAll('#edit-images-container .edit-image-file-input');
        let newFiles = [];
        for (let input of fileInputs) {
            if (input.files.length) {
                newFiles.push(...Array.from(input.files));
            }
        }
        if (newFiles.length > 5) {
            alert('Можно добавить не более 5 новых изображений');
            return;
        }

        const formData = new FormData();
        formData.append('name', name);
        formData.append('type', type);
        formData.append('nation', nation);
        formData.append('rank', rank);
        formData.append('battle_rating', br);
        formData.append('description', description);
        formData.append('tags', JSON.stringify(tags));
        for (let file of newFiles) {
            formData.append('images', file);
        }

        try {
            const resp = await fetch(`${API_BASE_URL}/vehicles/${id}`, { method: 'PUT', body: formData });
            const result = await resp.json();
            if (resp.ok) {
                alert('Техника обновлена');
                closeEditModal();
                loadAdminVehicles();
            } else {
                alert('Ошибка: ' + (result.error || 'Неизвестная ошибка'));
            }
        } catch (e) {
            alert('Ошибка соединения с сервером');
        }
    });
}

// Общие функции админки
function setupAdminFunctions() {
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('adminLoggedIn');
        showLoginScreen();
    });

    document.getElementById('reset-data-btn').addEventListener('click', async () => {
        if (!confirm('Удалить ВСЮ технику? Это действие необратимо.')) return;
        try {
            const resp = await fetch(`${API_BASE_URL}/vehicles`);
            const vehicles = await resp.json();
            for (let v of vehicles) {
                await fetch(`${API_BASE_URL}/vehicles/${v.id}`, { method: 'DELETE' });
            }
            loadAdminVehicles();
            alert('База данных очищена');
        } catch (e) {
            alert('Ошибка при удалении');
        }
    });

    document.getElementById('refresh-btn').addEventListener('click', loadAdminVehicles);
}