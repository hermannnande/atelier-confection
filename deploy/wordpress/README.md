# Images WebP des pages WordPress — mise en service du 6 octobre 2026

Les pages de vente WordPress (Elementor) gardent leurs adresses d'images PNG/JPEG.
Apache sert à leur place une copie WebP `photo.png.webp` quand le navigateur
l'accepte ; les autres navigateurs reçoivent toujours l'original.

- `nu-webp-copies.php` → `web/wp-content/mu-plugins/` : crée la copie WebP
  (qualité 80, mêmes dimensions) de l'original et de chaque taille à chaque envoi
  ou retouche dans la médiathèque. La copie est supprimée si elle n'allège pas
  l'image, et avec l'image quand WordPress la supprime.
- `uploads.htaccess` → `web/wp-content/uploads/.htaccess` : règle Apache qui sert
  la copie (`Vary: Accept`). `RewriteOptions Inherit` garde la page 404 WordPress.

Mise en service : les 4 219 PNG/JPEG de plus de 60 Ko de 2025 et 2026 ont été
convertis (1,83 Go → 337 Mo ; 97 laissés en original car le WebP était plus
lourd). Les 17 100 anciennes copies `*.png.webp` du module EWWW désinstallé ont
été supprimées : 369 n'avaient plus les dimensions de leur original.

Retour arrière : supprimer `uploads/.htaccess` (les originaux sont intacts),
puis le mu-plugin. Les copies `*.png.webp` peuvent rester ou être supprimées.

Les images plus anciennes ou de moins de 60 Ko n'ont pas de copie : elles restent
servies telles quelles. Une image renvoyée par la médiathèque en reçoit une.
