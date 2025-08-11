// ===== auth.js =====
import { supabase } from './supabaseClient.js';

// --- LOGIN FORM ---
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();
  const msg = document.getElementById('login-msg');

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    msg.textContent = error.message;
  } else {
    msg.style.color = '#0f0';
    msg.textContent = 'Вход успешен! Перенаправление...';
    setTimeout(() => window.location.href = 'dashboard.html', 1000);
  }
});

// --- REGISTER FORM ---
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value.trim();
  const msg = document.getElementById('reg-msg');

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    msg.textContent = error.message;
  } else {
    msg.style.color = '#0f0';
    msg.textContent = 'Регистрация успешна! Проверьте email.';
    setTimeout(() => window.location.href = 'dashboard.html', 1500);
  }
});
