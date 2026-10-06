<?php
/*
Plugin Name: Nous Unique - copies WebP
Description: Crée une copie WebP (photo.png.webp) de chaque image PNG/JPEG de la médiathèque. Le .htaccess des uploads la sert aux navigateurs compatibles, sans changer les pages.
Version: 1.0
*/
if (!defined('ABSPATH')) { exit; }

const NU_WEBP_QUALITY = 80;

// Crée ou rafraîchit la copie WebP d'un fichier ; la supprime si elle n'allège pas l'image.
function nu_webp_convert_file($path) {
    if (!preg_match('/\.(?:jpe?g|png)$/i', $path) || !is_file($path)) { return 'ignore'; }
    $target = $path . '.webp';
    if (is_file($target) && filemtime($target) >= filemtime($path)) { return 'deja'; }
    $editor = wp_get_image_editor($path);
    if (is_wp_error($editor)) { return 'erreur'; }
    // Une photo de téléphone tournée par EXIF doit rester droite une fois en WebP.
    if (method_exists($editor, 'maybe_exif_rotate')) { $editor->maybe_exif_rotate(); }
    $editor->set_quality(NU_WEBP_QUALITY);
    $saved = $editor->save($target, 'image/webp');
    if (is_wp_error($saved) || !is_file($target)) { return 'erreur'; }
    clearstatcache(true, $target);
    if (filesize($target) >= filesize($path)) {
        @unlink($target);
        return 'plus_lourd';
    }
    return 'cree';
}

function nu_webp_attachment_files($attachment_id) {
    $file = get_attached_file($attachment_id);
    if (!$file) { return array(); }
    $directory = dirname($file);
    $files = array($file);
    $meta = wp_get_attachment_metadata($attachment_id);
    if (!empty($meta['original_image'])) { $files[] = $directory . '/' . $meta['original_image']; }
    if (!empty($meta['sizes']) && is_array($meta['sizes'])) {
        foreach ($meta['sizes'] as $size) {
            if (!empty($size['file'])) { $files[] = $directory . '/' . $size['file']; }
        }
    }
    return array_unique($files);
}

// Les métadonnées sont réécrites plusieurs fois pendant un envoi ou une retouche :
// on convertit une seule fois, en fin de requête, quand toutes les tailles existent.
function nu_webp_queue($metadata, $attachment_id) {
    static $hooked = false;
    $GLOBALS['nu_webp_pending'][(int) $attachment_id] = true;
    if (!$hooked) {
        $hooked = true;
        add_action('shutdown', function () {
            foreach (array_keys($GLOBALS['nu_webp_pending']) as $id) {
                foreach (nu_webp_attachment_files($id) as $path) { nu_webp_convert_file($path); }
            }
        });
    }
    return $metadata;
}
add_filter('wp_generate_attachment_metadata', 'nu_webp_queue', 99, 2);
add_filter('wp_update_attachment_metadata', 'nu_webp_queue', 99, 2);

// WordPress supprime l'image et ses tailles : on supprime aussi leurs copies WebP.
add_filter('wp_delete_file', function ($file) {
    if (is_string($file) && preg_match('/\.(?:jpe?g|png)$/i', $file) && is_file($file . '.webp')) {
        @unlink($file . '.webp');
    }
    return $file;
});
