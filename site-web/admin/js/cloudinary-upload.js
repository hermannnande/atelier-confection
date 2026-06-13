// ============================================================
// Upload d'images produits vers la MEDIATHEQUE WORDPRESS
// (remplace Cloudinary). Conserve les memes fonctions/callbacks
// pour rester compatible avec products-manager.js.
// ============================================================

const WP_UPLOAD_URL = 'https://nousunique.com/atelier-upload.php';
const WP_UPLOAD_TOKEN = 'ATLRwpUP_9Kx2Qm7Zv3Fq';

function atlrShowUploadStatus(text) {
  let el = document.getElementById('atlrUploadStatus');
  if (!el) {
    el = document.createElement('div');
    el.id = 'atlrUploadStatus';
    el.style.cssText =
      'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);';
    el.innerHTML =
      '<div class="atlr-up-box" style="background:#111;color:#fff;padding:18px 28px;border-radius:12px;font-weight:700;font-size:15px;">' +
      text +
      '</div>';
    document.body.appendChild(el);
  } else {
    const box = el.querySelector('.atlr-up-box');
    if (box) box.textContent = text;
    el.style.display = 'flex';
  }
}

function atlrHideUploadStatus() {
  const el = document.getElementById('atlrUploadStatus');
  if (el) el.style.display = 'none';
}

async function atlrUploadToWp(file) {
  const fd = new FormData();
  fd.append('token', WP_UPLOAD_TOKEN);
  fd.append('file', file);
  const res = await fetch(WP_UPLOAD_URL, { method: 'POST', body: fd });
  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    /* reponse non JSON */
  }
  if (!res.ok || !data.success || !data.url) {
    throw new Error(data.message || `Erreur ${res.status}`);
  }
  return data.url;
}

function atlrPickAndUpload({ multiple, onUrl }) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/png,image/jpeg,image/webp,image/gif';
  input.multiple = Boolean(multiple);
  input.style.display = 'none';
  document.body.appendChild(input);

  input.addEventListener('change', async () => {
    const files = Array.from(input.files || []);
    if (input.parentNode) input.parentNode.removeChild(input);
    if (!files.length) return;

    let done = 0;
    atlrShowUploadStatus(`Téléversement... (0/${files.length})`);
    for (const file of files) {
      try {
        const url = await atlrUploadToWp(file);
        if (typeof onUrl === 'function') onUrl(url);
        done += 1;
        atlrShowUploadStatus(`Téléversement... (${done}/${files.length})`);
      } catch (err) {
        atlrHideUploadStatus();
        console.error('Erreur upload WordPress:', err);
        alert('Erreur lors du téléversement : ' + err.message);
        return;
      }
    }
    atlrHideUploadStatus();
  });

  input.click();
}

// Galerie (plusieurs images ; la limite de 5 est gérée par products-manager.js)
function openGalleryWidget() {
  atlrPickAndUpload({
    multiple: true,
    onUrl: (url) => {
      if (window.addCloudinaryImageToGallery) window.addCloudinaryImageToGallery(url);
    },
  });
}

// Vignette (une seule image)
function openThumbnailWidget() {
  atlrPickAndUpload({
    multiple: false,
    onUrl: (url) => {
      if (window.addCloudinaryThumbnail) window.addCloudinaryThumbnail(url);
    },
  });
}

console.log('✓ Upload WordPress (médiathèque) chargé');
