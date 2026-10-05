/**
 * ============================================================================
 * HOJALATERÍA CAD LITE - CARGADOR DE SEGURIDAD Y DESENCRIPTACIÓN AES-256
 * ============================================================================
 * Taller Los Cerezos · Acceso Intranet Protegido.
 * 
 * - Desencriptación matemática en memoria con Web Crypto API (SubtleCrypto).
 * - Derivación de clave: PBKDF2-HMAC-SHA256 con 100.000 iteraciones.
 * - Algoritmo de cifrado autenticado: AES-256-GCM.
 * - Sin contraseñas en texto plano en ningún archivo del servidor.
 * - Sesión recordada durante 30 días en el dispositivo del usuario.
 * ============================================================================
 */

(function () {
  'use strict';

  const SESSION_KEY = 'cad_vault_session_v1';
  const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

  // --- Elementos del DOM ---
  const authOverlay = document.getElementById('authOverlay');
  const authForm = document.getElementById('authForm');
  const authPassword = document.getElementById('authPassword');
  const authErrorMsg = document.getElementById('authErrorMsg');
  const btnSubmitAuth = document.getElementById('btnSubmitAuth');
  const btnToggleAuthPwd = document.getElementById('btnToggleAuthPwd');
  const eyeIconOpen = document.getElementById('eyeIconOpen');
  const eyeIconClosed = document.getElementById('eyeIconClosed');
  const btnLogoutAuth = document.getElementById('btnLogoutAuth');

  // --- Utilidades Criptográficas ---
  function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
  }

  function base64ToBytes(b64) {
    const binStr = atob(b64);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }
    return bytes;
  }

  function bytesToBase64(bytes) {
    let binStr = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binStr += String.fromCharCode(bytes[i]);
    }
    return btoa(binStr);
  }

  // --- Desencriptación con Web Crypto API ---
  async function decryptPayloadWithKey(cryptoKey) {
    if (!window.__CAD_DATA__) {
      throw new Error('No se encontró el paquete de datos cifrado (__CAD_DATA__).');
    }
    const iv = hexToBytes(window.__CAD_DATA__.iv);
    const ciphertext = base64ToBytes(window.__CAD_DATA__.ciphertext);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      cryptoKey,
      ciphertext
    );

    return new TextDecoder('utf-8').decode(decryptedBuffer);
  }

  async function deriveKeyFromPassword(password, saltHex) {
    const enc = new TextEncoder();
    const pwBuffer = enc.encode(password);
    const salt = hexToBytes(saltHex);

    const baseKey = await window.crypto.subtle.importKey(
      'raw',
      pwBuffer,
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      true, // extractable para guardar sesión si es exitosa
      ['decrypt', 'encrypt']
    );
  }

  // --- Ejecución del Código CAD Desencriptado ---
  function executeDecryptedCAD(code) {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.textContent = code;
    document.body.appendChild(script);

    // Ocultar pantalla de bloqueo
    if (authOverlay) {
      authOverlay.classList.add('hidden');
    }
  }

  // --- Gestión de Sesión (Recordar por 30 días) ---
  async function tryAutoLogin() {
    try {
      const rawSession = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
      if (!rawSession) return false;

      const session = JSON.parse(rawSession);
      if (!session || !session.key || Date.now() > session.expires) {
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_KEY);
        return false;
      }

      const keyBytes = base64ToBytes(session.key);
      const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );

      const code = await decryptPayloadWithKey(cryptoKey);
      executeDecryptedCAD(code);
      return true;
    } catch (e) {
      console.warn('Error en auto-login, solicitando contraseña:', e);
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      return false;
    }
  }

  async function saveSessionKey(cryptoKey) {
    try {
      const rawKey = await window.crypto.subtle.exportKey('raw', cryptoKey);
      const keyBase64 = bytesToBase64(new Uint8Array(rawKey));
      const sessionData = JSON.stringify({
        key: keyBase64,
        expires: Date.now() + SESSION_DURATION_MS
      });
      localStorage.setItem(SESSION_KEY, sessionData);
      sessionStorage.setItem(SESSION_KEY, sessionData);
    } catch (e) {
      console.warn('No se pudo guardar la sesión local:', e);
    }
  }

  function handleLogout() {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('hojalateria_cad_intranet_auth');
    sessionStorage.removeItem('hojalateria_cad_intranet_auth');
    window.location.reload();
  }

  // Exportar para acceso desde interfaz
  window.CAD_AUTH = {
    logout: handleLogout
  };

  // --- Manejo del Formulario de Acceso ---
  async function handlePasswordSubmit() {
    if (!authPassword) return;
    const entered = authPassword.value.trim();
    if (!entered) {
      if (authErrorMsg) {
        authErrorMsg.querySelector('span').textContent = 'Ingrese una contraseña.';
        authErrorMsg.classList.remove('hidden');
      }
      authPassword.focus();
      return;
    }

    // Estado visual de carga
    const originalBtnText = btnSubmitAuth ? btnSubmitAuth.innerHTML : '';
    if (btnSubmitAuth) {
      btnSubmitAuth.disabled = true;
      btnSubmitAuth.innerHTML = '<span>Verificando y desencriptando...</span>';
    }
    if (authErrorMsg) authErrorMsg.classList.add('hidden');

    try {
      if (!window.__CAD_DATA__) {
        throw new Error('Paquete de datos CAD no disponible.');
      }

      // Derivar llave y probar descifrado
      const key = await deriveKeyFromPassword(entered, window.__CAD_DATA__.salt);
      const code = await decryptPayloadWithKey(key);

      // Si llegó aquí sin error, la contraseña es 100% correcta
      await saveSessionKey(key);
      authPassword.value = '';
      executeDecryptedCAD(code);

    } catch (err) {
      console.warn('Acceso denegado:', err);
      if (authErrorMsg) {
        authErrorMsg.querySelector('span').textContent = 'Contraseña incorrecta. Acceso denegado.';
        authErrorMsg.classList.remove('hidden');
      }
      authPassword.focus();
      authPassword.select();
    } finally {
      if (btnSubmitAuth) {
        btnSubmitAuth.disabled = false;
        btnSubmitAuth.innerHTML = originalBtnText;
      }
    }
  }

  function togglePasswordVisibility() {
    if (!authPassword) return;
    const isPassword = authPassword.type === 'password';
    authPassword.type = isPassword ? 'text' : 'password';
    if (eyeIconOpen && eyeIconClosed) {
      eyeIconOpen.classList.toggle('hidden', isPassword);
      eyeIconClosed.classList.toggle('hidden', !isPassword);
    }
  }

  // --- Inicialización y Listeners ---
  async function init() {
    // Escuchar botón de logout global en cabecera
    if (btnLogoutAuth) {
      btnLogoutAuth.addEventListener('click', handleLogout);
    }

    // Configurar toggle de contraseña
    if (btnToggleAuthPwd) {
      btnToggleAuthPwd.addEventListener('click', togglePasswordVisibility);
    }

    // Escuchar envío del formulario
    if (authForm) {
      authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handlePasswordSubmit();
      });
    }

    if (btnSubmitAuth) {
      btnSubmitAuth.addEventListener('click', (e) => {
        e.preventDefault();
        handlePasswordSubmit();
      });
    }

    if (authPassword) {
      authPassword.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handlePasswordSubmit();
        }
      });
      authPassword.addEventListener('input', () => {
        if (authErrorMsg) authErrorMsg.classList.add('hidden');
      });
    }

    // Intentar auto-login con sesión previa
    const loggedIn = await tryAutoLogin();
    if (!loggedIn) {
      // Mostrar overlay y enfocar campo de contraseña
      if (authOverlay) {
        authOverlay.classList.remove('hidden');
      }
      if (authPassword) {
        setTimeout(() => authPassword.focus(), 150);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
