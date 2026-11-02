<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class ProductionAdminSeeder extends Seeder
{
    public function run(): void
    {
        $name = config('deployment.initial_admin_name');
        $email = config('deployment.initial_admin_email');
        $password = config('deployment.initial_admin_password');

        if ($name === null && $email === null && $password === null) {
            return;
        }

        if (! is_string($name) || trim($name) === ''
            || ! is_string($email) || filter_var($email, FILTER_VALIDATE_EMAIL) === false
            || ! is_string($password) || strlen($password) < 16) {
            throw new \InvalidArgumentException('Initial administrator setup requires a name, valid email, and password with at least 16 characters.');
        }

        $existing = User::where('email', $email)->first();
        if ($existing) {
            if ($existing->role !== 'admin') {
                throw new \RuntimeException('The initial administrator email already belongs to a non-admin account.');
            }

            return;
        }

        User::create([
            'name' => trim($name),
            'email' => $email,
            'role' => 'admin',
            'password' => Hash::make($password),
        ]);

        $this->command?->info('Initial administrator account created.');
    }
}
