<?php
namespace Tests\Feature;

use App\Models\{Classroom, Enrollment, Score, Student, User};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AcademicTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role): User
    {
        return User::forceCreate(['name' => ucfirst($role), 'email' => $role . uniqid() . '@t.test', 'password' => Hash::make('password'), 'role' => $role]);
    }

    private function enrollment(?int $guardian = null): Enrollment
    {
        $c = Classroom::create(['name' => 'K2', 'term' => now()->year . '-1']);
        $s = Student::create(['nis' => uniqid(), 'name' => 'Murid', 'level' => 'Kids', 'guardian_id' => $guardian]);
        return Enrollment::create(['student_id' => $s->id, 'classroom_id' => $c->id, 'term' => now()->year . '-1']);
    }

    public function test_login_berhasil_dan_gagal(): void
    {
        $u = $this->user('admin');
        $this->postJson('/api/login', ['email' => $u->email, 'password' => 'password'])->assertOk()->assertJsonStructure(['token', 'role']);
        $this->postJson('/api/login', ['email' => $u->email, 'password' => 'salah'])->assertStatus(422);
    }

    public function test_tanpa_login_ditolak(): void
    {
        $this->getJson('/api/roster')->assertUnauthorized();
    }

    public function test_guru_bisa_simpan_nilai_dan_catatan_nilai_di_luar_rentang_diabaikan(): void
    {
        $e = $this->enrollment();
        Sanctum::actingAs($this->user('teacher'));
        $this->postJson('/api/scores', ['rows' => [['id' => $e->id, 'note' => 'Rajin', 'scores' => ['Speaking' => 88, 'Writing' => 150]]]])->assertOk();
        $this->assertSame(1, Score::count());
        $this->assertSame('Rajin', $e->fresh()->note);
    }

    public function test_orang_tua_tidak_bisa_simpan_nilai(): void
    {
        $e = $this->enrollment();
        Sanctum::actingAs($this->user('parent'));
        $this->postJson('/api/scores', ['rows' => [['id' => $e->id, 'scores' => ['Speaking' => 90]]]])->assertForbidden();
    }

    public function test_orang_tua_hanya_melihat_anaknya(): void
    {
        $p = $this->user('parent');
        $this->enrollment($p->id);
        $this->enrollment(null);
        Sanctum::actingAs($p);
        $this->getJson('/api/roster')->assertOk()->assertJsonCount(1);
    }

    public function test_daftar_ulang_hanya_admin(): void
    {
        $e = $this->enrollment();
        $body = ['from' => now()->year . '-1', 'to' => now()->year . '-2'];
        Sanctum::actingAs($this->user('teacher'));
        $this->postJson('/api/reenroll', $body)->assertForbidden();
        Sanctum::actingAs($this->user('admin'));
        $this->postJson('/api/reenroll', $body)->assertOk()->assertJson(['created' => 1]);
        $this->postJson('/api/reenroll', $body)->assertJson(['created' => 0]); // tidak dobel
    }

    public function test_admin_daftarkan_murid_baru_dan_akun_orang_tua_dibuat(): void
    {
        $c = Classroom::create(['name' => 'K2', 'term' => now()->year . '-1']);
        Sanctum::actingAs($this->user('admin'));
        $r = $this->postJson('/api/students', ['name' => 'Baru', 'level' => 'Kids', 'classroom_id' => $c->id, 'term' => now()->year . '-1',
            'guardian_name' => 'Ortu', 'guardian_email' => 'ortu.baru@t.test'])->assertOk();
        $this->assertNotEmpty($r->json('guardianPassword'));
        $this->assertDatabaseHas('users', ['email' => 'ortu.baru@t.test', 'role' => 'parent']);
    }

    public function test_hapus_murid_hanya_admin(): void
    {
        $e = $this->enrollment();
        Sanctum::actingAs($this->user('teacher'));
        $this->deleteJson('/api/students/' . $e->student_id)->assertForbidden();
        Sanctum::actingAs($this->user('admin'));
        $this->deleteJson('/api/students/' . $e->student_id)->assertOk();
        $this->assertSame(0, Enrollment::count());
    }

    public function test_ganti_sandi_butuh_sandi_lama_yang_benar(): void
    {
        Sanctum::actingAs($this->user('teacher'));
        $this->postJson('/api/password', ['current_password' => 'salah', 'password' => 'sandibaru123', 'password_confirmation' => 'sandibaru123'])->assertStatus(422);
        $this->postJson('/api/password', ['current_password' => 'password', 'password' => 'sandibaru123', 'password_confirmation' => 'sandibaru123'])->assertOk();
    }
}
