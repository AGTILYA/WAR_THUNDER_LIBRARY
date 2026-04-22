const API_BASE_URL = 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    loadProfile(user.id);
    loadNotifications(user.id);

    document.getElementById('edit-profile-btn').addEventListener('click', () => {
        document.getElementById('edit-profile-form').style.display = 'block';
        document.getElementById('edit-avatar').value = user.avatar || '';
        document.getElementById('edit-bio').value = user.bio || '';
    });

    document.getElementById('cancel-edit').addEventListener('click', () => {
        document.getElementById('edit-profile-form').style.display = 'none';
    });

    document.getElementById('edit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const avatar = document.getElementById('edit-avatar').value;
        const bio = document.getElementById('edit-bio').value;

        try {
            const resp = await fetch(`${API_BASE_URL}/profile/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ avatar, bio })
            });
            if (resp.ok) {
                alert('Профиль обновлён');
                user.avatar = avatar;
                user.bio = bio;
                localStorage.setItem('user', JSON.stringify(user));
                loadProfile(user.id);
                document.getElementById('edit-profile-form').style.display = 'none';
            } else {
                alert('Ошибка обновления');
            }
        } catch (e) {
            alert('Ошибка соединения');
        }
    });

    document.getElementById('mark-all-read').addEventListener('click', async () => {
        try {
            await fetch(`${API_BASE_URL}/notifications/${user.id}/read-all`, { method: 'POST' });
            loadNotifications(user.id);
        } catch (e) {
            alert('Ошибка');
        }
    });

    document.getElementById('logout-link').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    });
});

async function loadProfile(userId) {
    try {
        const resp = await fetch(`${API_BASE_URL}/profile/${userId}`);
        const user = await resp.json();
        document.getElementById('profile-username').textContent = user.username;
        document.getElementById('profile-email').textContent = user.email;
        document.getElementById('profile-bio').textContent = user.bio || '—';
        if (user.avatar) {
            document.getElementById('avatar-img').src = user.avatar;
        }
    } catch (e) {
        console.error('Ошибка загрузки профиля', e);
    }
}

async function loadNotifications(userId) {
    try {
        const resp = await fetch(`${API_BASE_URL}/notifications/${userId}?unread_only=false`);
        const notifications = await resp.json();
        const list = document.getElementById('notifications-list');
        list.innerHTML = '';
        if (notifications.length === 0) {
            list.innerHTML = '<p>Нет уведомлений</p>';
            return;
        }
        notifications.forEach(n => {
            const div = document.createElement('div');
            div.className = 'notification-item' + (n.is_read ? '' : ' unread');
            div.innerHTML = `
                <p>${n.message} <small>${new Date(n.created_at).toLocaleString()}</small></p>
                ${!n.is_read ? `<button class="mark-read" data-id="${n.id}">✓ Отметить прочитанным</button>` : ''}
            `;
            list.appendChild(div);
        });

        document.querySelectorAll('.mark-read').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                await fetch(`${API_BASE_URL}/notifications/${id}/read`, { method: 'POST' });
                loadNotifications(userId);
            });
        });
    } catch (e) {
        console.error('Ошибка загрузки уведомлений', e);
    }
}