// Auth for the Quran app, using Supabase Auth.
//
// Two sign-in paths, both intentionally password-free to keep this simple
// for a wide age range:
//   - Email magic link: type your email, get a one-time link, tap it, you're in.
//   - Google sign-in: one tap, no typing at all.
//
// This file also injects a small account widget (top-right corner) into
// whatever page includes it, so index.html and module.html both get the
// same "Sign in" / avatar + "Sign out" UI without duplicating markup.

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

async function initAuth() {
    const { data: { session } } = await sb.auth.getSession();
    currentUser = session ? session.user : null;
    renderAccountWidget();

  sb.auth.onAuthStateChange((_event, session) => {
        currentUser = session ? session.user : null;
        renderAccountWidget();
  });
}

function renderAccountWidget() {
    let widget = document.getElementById('account-widget');
    if (!widget) {
          widget = document.createElement('div');
          widget.id = 'account-widget';
          widget.style.cssText = 'position:absolute; top:16px; right:16px; z-index:10;';
          document.body.insertBefore(widget, document.body.firstChild);
    }

  if (currentUser) {
        const label = currentUser.email ? currentUser.email[0].toUpperCase() : '?';
        widget.innerHTML = `
              <div style="display:flex; align-items:center; gap:8px;">
                      <div title="${escapeHtml(currentUser.email || '')}" style="width:28px; height:28px; border-radius:50%; background:#C9A24B; color:#4A3512; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:600; font-family:sans-serif;">${label}</div>
                              <button id="sign-out-btn" style="background:transparent; border:1px solid rgba(255,255,255,0.4); color:#FBF6EB; font-size:12px; padding:5px 10px; border-radius:6px; cursor:pointer; font-family:inherit;">Sign out</button>
                                    </div>
                                        `;
        document.getElementById('sign-out-btn').addEventListener('click', async () => {
                await sb.auth.signOut();
        });
  } else {
        widget.innerHTML = `
              <button id="sign-in-btn" style="background:transparent; border:1px solid rgba(255,255,255,0.4); color:#FBF6EB; font-size:12px; padding:5px 12px; border-radius:6px; cursor:pointer; font-family:inherit;">Sign in</button>
                  `;
        document.getElementById('sign-in-btn').addEventListener('click', openAuthModal);
  }
}

function openAuthModal() {
    if (document.getElementById('auth-modal')) return;

  const overlay = document.createElement('div');
    overlay.id = 'auth-modal';
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(30,43,40,0.55); display:flex; align-items:center; justify-content:center; z-index:100; padding:20px;';
    overlay.innerHTML = `
        <div style="background:#FBF6EB; border-radius:12px; padding:28px 26px; max-width:340px; width:100%; font-family:'Work Sans', sans-serif; box-shadow:0 10px 40px rgba(0,0,0,0.2);">
              <p style="font-family:'Amiri', serif; font-size:20px; color:#0B3D3A; margin:0 0 6px;">Sign in</p>
                    <p style="font-size:13px; color:#6B6255; margin:0 0 20px;">Keep your progress and quiz scores synced across your devices.</p>

                          <button id="google-signin-btn" style="width:100%; display:flex; align-items:center; justify-content:center; gap:8px; background:#fff; border:1px solid #D8CBA6; border-radius:8px; padding:10px; font-size:14px; cursor:pointer; margin-bottom:16px; font-family:inherit;">
                                  <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.5 29.5 3.5 24 3.5 12.7 3.5 3.5 12.7 3.5 24S12.7 44.5 24 44.5 44.5 35.3 44.5 24c0-1.2-.1-2.4-.3-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.9 19 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.5 6.5 29.5 4.5 24 4.5c-7.5 0-14 4.2-17.4 10.2z"/><path fill="#4CAF50" d="M24 44.5c5.4 0 10.2-1.8 13.9-5l-6.4-5.4C29.4 35.6 26.8 36.5 24 36.5c-5.2 0-9.6-3.3-11.2-8l-6.6 5.1C9.8 40.3 16.4 44.5 24 44.5z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.4 5.4C40.9 36.5 44 30.8 44 24c0-1.2-.1-2.4-.4-3.5z"/></svg>
                                          Continue with Google
                                                </button>

                                                      <div style="display:flex; align-items:center; gap:10px; margin:0 0 16px;">
                                                              <div style="flex:1; height:1px; background:#D8CBA6;"></div>
                                                                      <span style="font-size:11px; color:#6B6255;">or</span>
                                                                              <div style="flex:1; height:1px; background:#D8CBA6;"></div>
                                                                                    </div>

                                                                                          <div id="auth-form-area">
                                                                                                  <input id="email-input" type="email" placeholder="you@example.com" style="width:100%; box-sizing:border-box; padding:10px 12px; border:1px solid #D8CBA6; border-radius:8px; font-size:14px; margin-bottom:10px; font-family:inherit;" />
                                                                                                          <p id="auth-error" style="font-size:12px; color:#7A2E2E; margin:0 0 10px; min-height:14px;"></p>
                                                                                                                  <button id="send-link-btn" style="width:100%; background:#0B3D3A; color:#fff; border:none; border-radius:8px; padding:10px; font-size:14px; font-weight:500; cursor:pointer; font-family:inherit;">Send me a sign-in link</button>
                                                                                                                        </div>
                                                                                                                        
                                                                                                                              <button id="close-modal-btn" style="width:100%; background:transparent; border:none; color:#6B6255; font-size:12px; padding:14px 0 0; cursor:pointer; font-family:inherit;">Cancel</button>
                                                                                                                                  </div>
                                                                                                                                    `;
    document.body.appendChild(overlay);

  document.getElementById('close-modal-btn').addEventListener('click', closeAuthModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeAuthModal(); });

  document.getElementById('google-signin-btn').addEventListener('click', async () => {
        await sb.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.href }
        });
  });

  document.getElementById('send-link-btn').addEventListener('click', async () => {
        const emailInput = document.getElementById('email-input');
        const errorEl = document.getElementById('auth-error');
        const email = emailInput.value.trim();
        if (!email || !email.includes('@')) {
                errorEl.textContent = 'Enter a valid email first.';
                return;
        }
        errorEl.textContent = '';
        const btn = document.getElementById('send-link-btn');
        btn.textContent = 'Sending...';
        btn.disabled = true;

                                                                const { error } = await sb.auth.signInWithOtp({
                                                                        email,
                                                                        options: { emailRedirectTo: window.location.href }
                                                                });

                                                                if (error) {
                                                                        errorEl.textContent = "Couldn't send the link. Try again in a moment.";
                                                                        btn.textContent = 'Send me a sign-in link';
                                                                        btn.disabled = false;
                                                                } else {
                                                                        document.getElementById('auth-form-area').innerHTML = `
                                                                                <p style="font-size:13px; color:#155C56; text-align:center; padding:10px 0;">Check your inbox — tap the link we sent to ${escapeHtml(email)} to sign in.</p>
                                                                                      `;
                                                                }
  });
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.remove();
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Progress syncing helpers, used by module.html once a quiz is completed
// or a new content layer is viewed. No-ops quietly if nobody's signed in,
// so the app works exactly the same for guests.

async function saveQuizResult(surahN, score, total) {
    if (!currentUser) return;
    await sb.from('user_progress').upsert({
          user_id: currentUser.id,
          surah_n: surahN,
          quiz_score: score,
          quiz_total: total,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,surah_n' });
}

async function saveLayersSeen(surahN, layers) {
    if (!currentUser) return;
    await sb.from('user_progress').upsert({
          user_id: currentUser.id,
          surah_n: surahN,
          layers_seen: layers,
          updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,surah_n' });
}

async function getMyProgress() {
    if (!currentUser) return {};
    const { data, error } = await sb.from('user_progress').select('*').eq('user_id', currentUser.id);
    if (error || !data) return {};
    const map = {};
    data.forEach(row => { map[row.surah_n] = row; });
    return map;
}

initAuth();
