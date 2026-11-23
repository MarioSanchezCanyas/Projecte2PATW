<?php
require_once __DIR__ . '/db.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($action === 'register' && $method === 'POST') {
        $b = json_body();
        $username = trim($b['username'] ?? '');
        $email    = trim($b['email']    ?? '');
        $password = (string)($b['password'] ?? '');

        if (strlen($username) < 3)  throw new Exception('Nom massa curt');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) throw new Exception('Email invàlid');
        if (strlen($password) < 6)  throw new Exception('Contrasenya massa curta');

        $existing = Supabase::select('users', [
            'or' => "(username.eq.{$username},email.eq.{$email})",
            'select' => 'id',
        ]);
        if ($existing) throw new Exception('Usuari o email ja registrat');

        $rows = Supabase::insert('users', [[
            'username'      => $username,
            'email'         => $email,
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
        ]]);
        respond(['ok' => true, 'id' => $rows[0]['id']], 201);
    }

    if ($action === 'login' && $method === 'POST') {
        $b = json_body();
        $email    = trim($b['email']    ?? '');
        $password = (string)($b['password'] ?? '');

        $rows = Supabase::select('users', [
            'email'  => 'eq.' . $email,
            'select' => 'id,username,email,password_hash',
        ]);
        if (!$rows || !password_verify($password, $rows[0]['password_hash'])) {
            throw new Exception('Credencials incorrectes', 401);
        }
        $_SESSION['user_id']   = $rows[0]['id'];
        $_SESSION['username']  = $rows[0]['username'];

        unset($rows[0]['password_hash']);
        respond(['ok' => true, 'user' => $rows[0]]);
    }

    if ($action === 'logout' && $method === 'POST') {
        session_destroy();
        respond(['ok' => true]);
    }

    if ($action === 'me') {
        if (empty($_SESSION['user_id'])) respond(['error' => 'No autenticado'], 401);
        respond([
            'id'       => $_SESSION['user_id'],
            'username' => $_SESSION['username'] ?? '',
        ]);
    }

    respond(['error' => 'Acció desconeguda'], 400);
} catch (Throwable $e) {
    $status = $e->getCode() >= 400 && $e->getCode() < 600 ? $e->getCode() : 500;
    respond(['error' => $e->getMessage()], $status);
}