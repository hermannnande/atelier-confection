<?php
/**
 * Atelier / Nous Unique - Upload d'images produits vers la Mediatheque WordPress.
 * Remplace Cloudinary. Securise par un token + validation stricte (images seulement).
 * A placer a la racine du site WordPress (charge wp-load.php).
 */

@ini_set('display_errors', '0');
error_reporting(0);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, X-Upload-Token');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
  http_response_code(204);
  exit;
}

function atlr_json($code, $payload) {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($payload);
  exit;
}

// --- Token ---
$ATELIER_UPLOAD_TOKEN = 'ATLRwpUP_9Kx2Qm7Zv3Fq';
$provided = $_SERVER['HTTP_X_UPLOAD_TOKEN'] ?? ($_POST['token'] ?? '');
if (!is_string($provided) || !hash_equals($ATELIER_UPLOAD_TOKEN, $provided)) {
  atlr_json(401, ['success' => false, 'message' => 'Token invalide']);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
  atlr_json(405, ['success' => false, 'message' => 'Methode non autorisee']);
}

if (empty($_FILES['file']) || !is_uploaded_file($_FILES['file']['tmp_name'] ?? '')) {
  atlr_json(400, ['success' => false, 'message' => 'Aucun fichier recu']);
}

$file = $_FILES['file'];

// --- Limite de taille (20 Mo) ---
if (($file['size'] ?? 0) > 20 * 1024 * 1024) {
  atlr_json(413, ['success' => false, 'message' => 'Image trop lourde (max 20 Mo)']);
}

// --- Validation stricte du type (images uniquement) ---
$allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = $finfo ? finfo_file($finfo, $file['tmp_name']) : '';
if ($finfo) finfo_close($finfo);
if (!in_array($mime, $allowed, true)) {
  atlr_json(400, ['success' => false, 'message' => 'Type non autorise: ' . $mime]);
}

// --- Charger WordPress ---
$wpLoad = __DIR__ . '/wp-load.php';
if (!file_exists($wpLoad)) {
  atlr_json(500, ['success' => false, 'message' => 'WordPress introuvable']);
}
require_once($wpLoad);
require_once(ABSPATH . 'wp-admin/includes/image.php');
require_once(ABSPATH . 'wp-admin/includes/file.php');
require_once(ABSPATH . 'wp-admin/includes/media.php');

// --- Deplacer le fichier dans la mediatheque ---
$overrides = [
  'test_form' => false,
  'mimes' => [
    'jpg|jpeg|jpe' => 'image/jpeg',
    'png' => 'image/png',
    'webp' => 'image/webp',
    'gif' => 'image/gif',
  ],
];
$moved = wp_handle_upload($file, $overrides);
if (!$moved || isset($moved['error'])) {
  atlr_json(500, ['success' => false, 'message' => $moved['error'] ?? 'Echec upload']);
}

// --- Creer l'entree Mediatheque ---
$attachment = [
  'post_mime_type' => $moved['type'],
  'post_title' => preg_replace('/\.[^.]+$/', '', sanitize_file_name(basename($moved['file']))),
  'post_content' => '',
  'post_status' => 'inherit',
];
$attach_id = wp_insert_attachment($attachment, $moved['file']);
if (is_wp_error($attach_id) || !$attach_id) {
  atlr_json(500, ['success' => false, 'message' => 'Echec enregistrement mediatheque']);
}
$attach_data = wp_generate_attachment_metadata($attach_id, $moved['file']);
wp_update_attachment_metadata($attach_id, $attach_data);

atlr_json(200, ['success' => true, 'url' => $moved['url'], 'id' => (int) $attach_id]);
