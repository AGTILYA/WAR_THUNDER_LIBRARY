const API_BASE_URL = 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', () => {
    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');
    const loginFormDiv = document.getElementById('login-form');
    const registerFormDiv = document.getElementById('register-form');

    loginTab.addEventListener('click', () => {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginFormDiv.style.display = 'block';
        registerFormDiv.style.display = 'none';
    });

    registerTab.addEventListener('click', () => {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerFormDiv.style.display = 'block';
        loginFormDiv.style.display = 'none';
    });

    document.getElementById('login-form-element').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        try {
            const resp = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await resp.json();
            if (resp.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                alert('Вход выполнен');
                window.location.href = 'index.html';
            } else {
                alert(data.error || 'Ошибка входа');
            }
        } catch (e) {
            alert('Ошибка соединения');
        }
    });

    document.getElementById('register-form-element').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        try {
            const resp = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            const data = await resp.json();
            if (resp.ok) {
                alert('Регистрация успешна. Теперь вы можете войти.');
                loginTab.click();
            } else {
                alert(data.error || 'Ошибка регистрации');
            }
        } catch (e) {
            alert('Ошибка соединения');
        }
    });
});