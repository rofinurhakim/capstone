<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PasswordChangeWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_change_password_and_all_api_tokens_are_revoked(): void
    {
        $user = User::factory()->create(['password' => 'current-password']);
        $user->createToken('browser')->plainTextToken;
        $user->createToken('another-device')->plainTextToken;

        $this->actingAs($user)->postJson('/api/password', [
            'current_password' => 'current-password',
            'password' => 'new-secure-password',
            'password_confirmation' => 'new-secure-password',
        ])->assertOk()->assertJsonPath('ok', true);

        $this->assertTrue(Hash::check('new-secure-password', $user->fresh()->password));
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_password_change_requires_the_current_password(): void
    {
        $user = User::factory()->create(['password' => 'current-password']);
        $originalHash = $user->password;
        $user->createToken('browser');

        $this->actingAs($user)->postJson('/api/password', [
            'current_password' => 'wrong-password',
            'password' => 'new-secure-password',
            'password_confirmation' => 'new-secure-password',
        ])->assertUnprocessable();

        $this->assertSame($originalHash, $user->fresh()->password);
        $this->assertDatabaseCount('personal_access_tokens', 1);
    }

    public function test_password_reset_email_endpoints_are_no_longer_available(): void
    {
        $this->postJson('/api/forgot-password', ['email' => 'user@example.test'])->assertNotFound();
        $this->postJson('/api/reset-password', [])->assertNotFound();
    }
}
