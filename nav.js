// Shared top navigation for the Quran app.
//
// Include on any page with: <script src="nav.js"></script>
// Add data-back="true" on <body> to also show a back arrow (used on
// module.html, since that's a page people navigate INTO from the index).
//
// Sits top-left so it never collides with the account widget (auth.js),
// which lives top-right on every page.

function renderNavBar() {
    const bar = document.createElement('div');
    bar.id = 'nav-bar';
    bar.style.cssText = 'position:absolute; top:16px; left:16px; z-index:10; display:flex; gap:8px; align-items:center;';

  const showBack = document.body.dataset.back === 'true';
    const backBtnHtml = showBack
      ? '<button id="nav-back-btn" title="Back" style="background:transparent;border:1px solid rgba(255,255,255,0.4);color:#FBF6EB;font-size:15px;width:32px;height:32px;border-radius:6px;cursor:pointer;font-family:inherit;line-height:1;">&larr;</button>'
          : '';

  bar.innerHTML = backBtnHtml + '<button id="nav-menu-btn" title="Menu" style="background:transparent;border:1px solid rgba(255,255,255,0.4);color:#FBF6EB;font-size:15px;width:32px;height:32px;border-radius:6px;cursor:pointer;font-family:inherit;line-height:1;">&#9776;</button>';

  document.body.insertBefore(bar, document.body.firstChild);

  if (showBack) {
        document.getElementById('nav-back-btn').addEventListener('click', () => {
                if (window.history.length > 1) {
                          window.history.back();
                } else {
                          window.location.href = 'index.html';
                }
        });
  }

  document.getElementById('nav-menu-btn').addEventListener('click', openNavMenu);
}

function openNavMenu() {
    if (document.getElementById('nav-menu-overlay')) return;

  const overlay = document.createElement('div');
    overlay.id = 'nav-menu-overlay';
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(30,43,40,0.55); z-index:200; display:flex;';

  const linkStyle = 'display:block; padding:12px 0; color:#1E2B28; text-decoration:none; font-size:15px; border-bottom:1px solid #D8CBA6; font-family:inherit;';

  overlay.innerHTML = `
      <div style="background:#FBF6EB; width:250px; max-width:80vw; height:100%; padding:26px 22px; font-family:'Work Sans', sans-serif; box-shadow:2px 0 20px rgba(0,0,0,0.2); box-sizing:border-box;">
            <p style="font-family:'Amiri', serif; font-size:20px; color:#0B3D3A; margin:0 0 24px;">Menu</p>
                  <a href="index.html" style="${linkStyle}">Home</a>
                        <a href="progress.html" style="${linkStyle}">My Progress</a>
                              <button id="nav-close-btn" style="margin-top:24px; width:100%; background:transparent; border:none; color:#6B6255; font-size:13px; cursor:pointer; font-family:inherit; text-align:left; padding:0;">Close</button>
                                  </div>
                                    `;

  overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
  });
    document.body.appendChild(overlay);
    document.getElementById('nav-close-btn').addEventListener('click', () => overlay.remove());
}

renderNavBar();
