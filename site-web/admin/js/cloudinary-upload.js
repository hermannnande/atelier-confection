// Cloudinary Upload Integration
const CLOUDINARY_CONFIG = window.CLOUDINARY_CONFIG || {};
const CLOUDINARY_CLOUD_NAME = CLOUDINARY_CONFIG.cloudName || 'deyvdnm2d';
const CLOUDINARY_UPLOAD_PRESET = CLOUDINARY_CONFIG.uploadPreset || 'atelier_unsigned';

// Widget pour images galerie (portrait)
let galleryWidget = null;

// Widget pour vignette (600x600)
let thumbnailWidget = null;

function initCloudinaryWidgets() {
  // Widget pour images galerie
  galleryWidget = cloudinary.createUploadWidget(
    {
      cloudName: CLOUDINARY_CLOUD_NAME,
      uploadPreset: CLOUDINARY_UPLOAD_PRESET,
      sources: ['local', 'url', 'camera'],
      multiple: true,
      maxFiles: 5,
      clientAllowedFormats: ['png', 'jpg', 'jpeg', 'webp'],
      resourceType: 'image',
      cropping: false,
      folder: 'atelier-products/gallery',
      tags: ['atelier', 'product', 'gallery'],
    },
    (error, result) => {
      if (!error && result && result.event === 'success') {
        const imageUrl = result.info.secure_url;
        console.log('✅ Image galerie uploadée:', imageUrl);
        
        // Ajouter l'URL à la liste des images
        if (window.addCloudinaryImageToGallery) {
          window.addCloudinaryImageToGallery(imageUrl);
        }
      }
      if (error) {
        console.error('❌ Erreur upload Cloudinary:', error);
        alert('Erreur upload: ' + (error.message || 'Erreur inconnue'));
      }
    }
  );

  // Widget pour vignette 600x600
  thumbnailWidget = cloudinary.createUploadWidget(
    {
      cloudName: CLOUDINARY_CLOUD_NAME,
      uploadPreset: CLOUDINARY_UPLOAD_PRESET,
      sources: ['local', 'url', 'camera'],
      multiple: false,
      maxFiles: 1,
      clientAllowedFormats: ['png', 'jpg', 'jpeg', 'webp'],
      resourceType: 'image',
      cropping: true,
      croppingAspectRatio: 1,
      croppingCoordinatesMode: 'custom',
      folder: 'atelier-products/thumbnails',
      tags: ['atelier', 'product', 'thumbnail'],
      croppingShowDimensions: true,
    },
    (error, result) => {
      if (!error && result && result.event === 'success') {
        const imageUrl = result.info.secure_url;
        console.log('✅ Vignette uploadée:', imageUrl);
        
        // Ajouter la vignette
        if (window.addCloudinaryThumbnail) {
          window.addCloudinaryThumbnail(imageUrl);
        }
      }
      if (error) {
        console.error('❌ Erreur upload Cloudinary:', error);
        alert('Erreur upload: ' + (error.message || 'Erreur inconnue'));
      }
    }
  );

  console.log('✅ Cloudinary widgets initialisés');
}

// Ouvrir le widget galerie
function openGalleryWidget() {
  if (!galleryWidget) {
    alert('Widget Cloudinary non initialisé. Vérifiez votre connexion.');
    return;
  }
  galleryWidget.open();
}

// Ouvrir le widget vignette
function openThumbnailWidget() {
  if (!thumbnailWidget) {
    alert('Widget Cloudinary non initialisé. Vérifiez votre connexion.');
    return;
  }
  thumbnailWidget.open();
}

// Initialiser au chargement
if (typeof cloudinary !== 'undefined') {
  initCloudinaryWidgets();
} else {
  console.error('❌ Cloudinary SDK non chargé');
}

console.log('✓ Cloudinary Upload Integration chargée');
