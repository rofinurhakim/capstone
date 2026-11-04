<?php

use App\Http\Controllers\AcademicController as A;
use App\Http\Controllers\AcademicExtrasController;
use App\Http\Controllers\CalendarController;
use App\Http\Controllers\ManageController as M;
use App\Http\Controllers\QuizController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\StudentController as S;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;

Route::post('/login', function (Request $r) {
    $u = User::where('email', $r->email)->first();
    abort_unless($u && Hash::check((string) $r->password, $u->password), 422, 'Email atau kata sandi salah.');

    return ['token' => $u->createToken('web')->plainTextToken, 'role' => $u->role, 'roles' => $u->roles(), 'name' => $u->name];
})->middleware('throttle:10,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/summary', [A::class, 'summary']);
    Route::get('/roster', [A::class, 'roster']);
    Route::get('/attendance', [A::class, 'attendance']);
    Route::post('/attendance', [A::class, 'saveAttendance']);
    Route::get('/attendance/report', [A::class, 'attendanceReport']);
    Route::get('/attendance/export', [A::class, 'exportAttendance']);
    Route::get('/calendar', [CalendarController::class, 'index']);
    Route::post('/calendar', [CalendarController::class, 'store']);
    Route::patch('/calendar/{event}', [CalendarController::class, 'update']);
    Route::delete('/calendar/{event}', [CalendarController::class, 'destroy']);
    Route::get('/export/roster', [A::class, 'export']);
    Route::post('/scores', [A::class, 'saveScores']);
    Route::get('/account/profile', [M::class, 'profile']);
    Route::patch('/account/profile', [M::class, 'updateProfile']);
    Route::post('/enrollments/propose', [A::class, 'proposeEnrollment']);
    Route::patch('/enrollments/{enrollment}', [A::class, 'setStatus']);
    Route::get('/classrooms', [S::class, 'classrooms']);
    Route::get('/terms', [S::class, 'terms']);
    Route::get('/academic-years', [S::class, 'academicYears']);
    Route::post('/academic-years', [S::class, 'createAcademicYear']);
    Route::get('/quizzes', [QuizController::class, 'index']);
    Route::post('/quizzes', [QuizController::class, 'store']);
    Route::post('/quiz-scores', [QuizController::class, 'saveScores']);
    Route::patch('/reports/{enrollment}/verify', [ReportController::class, 'verify']);
    Route::patch('/reports/{enrollment}/schedule', [ReportController::class, 'schedule']);
    Route::get('/assessment-weights', [AcademicExtrasController::class, 'assessmentWeights']);
    Route::put('/assessment-weights', [AcademicExtrasController::class, 'updateAssessmentWeights']);
    Route::post('/reports/{enrollment}/request-revision', [ReportController::class, 'reopen']);
    Route::get('/themes', [AcademicExtrasController::class, 'themes']);
    Route::post('/themes', [AcademicExtrasController::class, 'storeTheme']);
    Route::delete('/themes/{theme}', [AcademicExtrasController::class, 'deleteTheme']);
    Route::get('/teacher-contacts', [AcademicExtrasController::class, 'teacherContacts']);
    Route::get('/teachers', [S::class, 'teachers']);
    Route::post('/teachers', [S::class, 'createTeacher']);
    Route::patch('/teachers/{teacher}', [S::class, 'updateTeacher']);
    Route::delete('/teachers/{teacher}', [S::class, 'deleteTeacher']);
    Route::post('/classrooms', [S::class, 'createClassroom']);
    Route::patch('/classrooms/{classroom}', [S::class, 'updateClassroom']);
    Route::post('/students', [S::class, 'store']);
    Route::get('/my-students', [S::class, 'myStudents']);
    Route::patch('/my-students/{student}', [S::class, 'updateOwnStudent']);
    Route::patch('/students/{student}', [M::class, 'update']);
    Route::delete('/students/{student}', [M::class, 'destroy']);
    Route::post('/students/{student}/reset-guardian', [M::class, 'resetGuardian']);
    Route::post('/password', [M::class, 'changePassword']);
});
