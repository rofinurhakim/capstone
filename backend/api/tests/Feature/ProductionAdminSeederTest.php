<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\ProductionAdminSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use InvalidArgumentException;
use RuntimeException;
use Tests\TestCase;

class ProductionAdminSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_the_initial_admin_from_deployment_configuration(): void
    {
        config([
            'deployment.initial_admin_name' => 'Deployment Admin',
            'deployment.initial_admin_email' => 'deploy-admin@example.com',
            'deployment.initial_admin_password' => 'a-very-long-random-password',
        ]);

        $this->seed(ProductionAdminSeeder::class);

        $admin = User::where('email', 'deploy-admin@example.com')->firstOrFail();

        $this->assertSame('admin', $admin->role);
        $this->assertSame('Deployment Admin', $admin->name);
        $this->assertTrue(Hash::check('a-very-long-random-password', $admin->password));
    }

    public function test_it_does_not_change_an_existing_admin_password(): void
    {
        $admin = User::factory()->create([
            'email' => 'deploy-admin@example.com',
            'role' => 'admin',
            'password' => 'original-password',
        ]);
        config([
            'deployment.initial_admin_name' => 'Deployment Admin',
            'deployment.initial_admin_email' => 'deploy-admin@example.com',
            'deployment.initial_admin_password' => 'a-very-long-random-password',
        ]);

        $this->seed(ProductionAdminSeeder::class);

        $this->assertTrue(Hash::check('original-password', $admin->fresh()->password));
    }

    public function test_it_rejects_incomplete_initial_admin_configuration(): void
    {
        config([
            'deployment.initial_admin_name' => 'Deployment Admin',
            'deployment.initial_admin_email' => null,
            'deployment.initial_admin_password' => null,
        ]);

        $this->expectException(InvalidArgumentException::class);

        $this->seed(ProductionAdminSeeder::class);
    }

    public function test_it_rejects_an_existing_non_admin_account_with_the_configured_email(): void
    {
        User::factory()->create([
            'email' => 'deploy-admin@example.com',
            'role' => 'parent',
        ]);
        config([
            'deployment.initial_admin_name' => 'Deployment Admin',
            'deployment.initial_admin_email' => 'deploy-admin@example.com',
            'deployment.initial_admin_password' => 'a-very-long-random-password',
        ]);

        $this->expectException(RuntimeException::class);

        $this->seed(ProductionAdminSeeder::class);
    }
}
