// Auth logic — login, signup, logout, session guard.
// Used by both index.html and app.html.

// ===== INDEX.HTML helpers =====

function showLogin() {
  document.getElementById('login-view').style.display = '';
  document.getElementById('signup-view').style.display = 'none';
}

function showSignup() {
  document.getElementById('login-view').style.display = 'none';
  document.getElementById('signup-view').style.display = '';
}

function showAuthError(id, message) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.classList.add('visible');
}

function hideAuthError(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('visible');
}

// ===== LOGIN FORM =====

const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAuthError('login-error');

    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn      = document.getElementById('login-btn');

    btn.disabled = true;
    btn.textContent = 'Signing in…';

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
      showAuthError('login-error', error.message);
      btn.disabled = false;
      btn.textContent = 'Sign in';
    } else {
      window.location.href = 'app.html';
    }
  });
}

// ===== SIGNUP FORM =====

const signupForm = document.getElementById('signup-form');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAuthError('signup-error');

    const email    = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm  = document.getElementById('signup-confirm').value;
    const btn      = document.getElementById('signup-btn');

    if (password !== confirm) {
      showAuthError('signup-error', 'Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      showAuthError('signup-error', 'Password must be at least 6 characters.');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Creating account…';

    const { error } = await supabaseClient.auth.signUp({ email, password });

    if (error) {
      showAuthError('signup-error', error.message);
      btn.disabled = false;
      btn.textContent = 'Create account';
    } else {
      // Some Supabase projects require email confirmation.
      // Try to go straight to app; if session isn't available yet show a message.
      const { data } = await supabaseClient.auth.getSession();
      if (data.session) {
        window.location.href = 'app.html';
      } else {
        showAuthError('signup-error', '');
        document.getElementById('signup-error').style.background = '#d4edda';
        document.getElementById('signup-error').style.color = '#155724';
        showAuthError('signup-error', 'Account created! Check your email to confirm, then sign in.');
        btn.disabled = false;
        btn.textContent = 'Create account';
      }
    }
  });
}

// ===== SESSION GUARD (app.html) =====
// Redirects to index.html if no active session.

async function requireAuth() {
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) {
    window.location.href = 'index.html';
    return null;
  }
  return data.session;
}

// ===== LOGOUT =====

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = 'index.html';
}

// On index.html: if user is already logged in, skip straight to app
(async () => {
  if (document.getElementById('login-form')) {
    const { data } = await supabaseClient.auth.getSession();
    if (data.session) {
      window.location.href = 'app.html';
    }
  }
})();
