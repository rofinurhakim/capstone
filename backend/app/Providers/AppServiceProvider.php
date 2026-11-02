<?php
namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        // Tautan reset kata sandi mengarah ke frontend Next.js.
        ResetPassword::createUrlUsing(fn ($user, string $token) =>
            rtrim(config('app.frontend_url', 'http://localhost:3000'), '/') . '/reset-sandi?token=' . $token . '&email=' . urlencode($user->email));
    }
}
