<?php
use App\Http\Controllers\{AcademicController as A, ManageController as M, StudentController as S};
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\{Hash, Password, Route};

Route::post('/login', function (Request $r) {
    $u = User::where('email', $r->email)->first();
    abort_unless($u && Hash::check((string) $r->password, $u->password), 422, 'Email atau kata sandi salah.');
    return ['token' => $u->createToken('web')->plainTextToken, 'role' => $u->role, 'name' => $u->name];
})->middleware('throttle:10,1');

// Selalu balas ok agar email yang terdaftar tidak bisa ditebak.
Route::post('/forgot-password', function (Request $r) {
    $r->validate(['email' => 'required|email']);
    Password::sendResetLink($r->only('email'));
    return ['ok' => true];
})->middleware('throttle:5,1');

Route::post('/reset-password', function (Request $r) {
    $d = $r->validate(['token' => 'required', 'email' => 'required|email', 'password' => 'required|min:8|confirmed']);
    $status = Password::reset($d + ['password_confirmation' => $r->password_confirmation], function ($u, $pw) {
        $u->forceFill(['password' => Hash::make($pw)])->save();
        $u->tokens()->delete();
    });
    abort_unless($status === Password::PASSWORD_RESET, 422, 'Tautan tidak valid atau sudah kedaluwarsa.');
    return ['ok' => true];
})->middleware('throttle:5,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/summary', [A::class, 'summary']);
    Route::get('/roster', [A::class, 'roster']);
    Route::post('/scores', [A::class, 'saveScores']);
    Route::post('/reenroll', [A::class, 'proposeReenroll']);
    Route::patch('/enrollments/{enrollment}', [A::class, 'setStatus']);
    Route::get('/classrooms', [S::class, 'classrooms']);
    Route::post('/students', [S::class, 'store']);
    Route::patch('/students/{student}', [M::class, 'update']);
    Route::delete('/students/{student}', [M::class, 'destroy']);
    Route::post('/students/{student}/reset-guardian', [M::class, 'resetGuardian']);
    Route::post('/password', [M::class, 'changePassword']);
});
