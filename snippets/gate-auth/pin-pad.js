/* pin-pad.js — dependency-free PIN pad overlay for the gate-auth snippet.
 *
 * Include alongside pin-pad.css:
 *   <link rel="stylesheet" href="/pin-pad.css">
 *   <script src="/pin-pad.js" defer></script>
 *
 * On load it checks GET /api/auth/status. If unauthenticated it shows a
 * full-viewport PIN pad; on success (POST /api/auth/login) it hides the
 * overlay and dispatches `gate:unlocked` on window. If the session cookie is
 * still valid, `gate:unlocked` fires immediately — listen for it either way:
 *
 *   window.addEventListener('gate:unlocked', startApp);
 *
 * window.gateLogout() posts to /api/auth/logout and reloads the page.
 */
(function () {
  'use strict';

  var PIN_LENGTH = 4; // adapt per project; auto-submits at this many digits

  var entered = '';
  var overlay = null;
  var busy = false;

  function unlocked() {
    if (overlay) {
      overlay.remove();
      overlay = null;
      document.removeEventListener('keydown', onKeydown);
    }
    window.dispatchEvent(new Event('gate:unlocked'));
  }

  function renderDots() {
    var dots = overlay.querySelectorAll('.pin-dot');
    for (var i = 0; i < dots.length; i++) {
      dots[i].classList.toggle('pin-dot-filled', i < entered.length);
    }
  }

  function press(key) {
    if (busy || !overlay) return;
    if (key === 'back') {
      entered = entered.slice(0, -1);
    } else if (entered.length < PIN_LENGTH) {
      entered += key;
    }
    renderDots();
    if (entered.length === PIN_LENGTH) submit();
  }

  function submit() {
    busy = true;
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: entered }),
    })
      .then(function (res) {
        if (res.ok) return unlocked();
        wrongPin();
      })
      .catch(wrongPin)
      .finally(function () {
        busy = false;
      });
  }

  function wrongPin() {
    if (!overlay) return;
    entered = '';
    var box = overlay.querySelector('.pin-box');
    box.classList.add('pin-shake');
    box.addEventListener(
      'animationend',
      function () {
        box.classList.remove('pin-shake');
        renderDots();
      },
      { once: true }
    );
  }

  function onKeydown(e) {
    if (e.key >= '0' && e.key <= '9') press(e.key);
    else if (e.key === 'Backspace') press('back');
  }

  function build() {
    overlay = document.createElement('div');
    overlay.className = 'pin-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Enter PIN');

    var box = document.createElement('div');
    box.className = 'pin-box';

    var title = document.createElement('div');
    title.className = 'pin-title';
    title.textContent = 'Enter PIN';
    box.appendChild(title);

    var dots = document.createElement('div');
    dots.className = 'pin-dots';
    for (var i = 0; i < PIN_LENGTH; i++) {
      var dot = document.createElement('span');
      dot.className = 'pin-dot';
      dots.appendChild(dot);
    }
    box.appendChild(dots);

    var grid = document.createElement('div');
    grid.className = 'pin-grid';
    var keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];
    keys.forEach(function (key) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pin-key';
      if (key === '') {
        btn.className += ' pin-key-empty';
        btn.disabled = true;
      } else if (key === 'back') {
        btn.className += ' pin-key-back';
        btn.textContent = '⌫';
        btn.setAttribute('aria-label', 'Backspace');
        btn.addEventListener('click', function () {
          press('back');
        });
      } else {
        btn.textContent = key;
        btn.addEventListener('click', function () {
          press(key);
        });
      }
      grid.appendChild(btn);
    });
    box.appendChild(grid);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
    document.addEventListener('keydown', onKeydown);
  }

  window.gateLogout = function () {
    fetch('/api/auth/logout', { method: 'POST' }).finally(function () {
      window.location.reload();
    });
  };

  function init() {
    fetch('/api/auth/status')
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (data.authenticated) unlocked();
        else build();
      })
      .catch(build); // can't confirm a session — show the pad
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
