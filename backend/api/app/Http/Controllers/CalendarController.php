<?php

namespace App\Http\Controllers;

use App\Models\AcademicEvent;
use Illuminate\Http\Request;

class CalendarController extends Controller
{
    private function canManage(Request $request): void
    {
        abort_unless($request->user()->hasAnyRole(['admin', 'academic_admin']), 403);
    }

    public function index(Request $request)
    {
        $query = AcademicEvent::query()->orderBy('start_date')->orderBy('start_time');
        if ($request->filled('from')) {
            $query->whereDate('start_date', '>=', $request->query('from'));
        }
        if ($request->filled('to')) {
            $query->whereDate('start_date', '<=', $request->query('to'));
        }

        return $query->get();
    }

    public function store(Request $request)
    {
        $this->canManage($request);
        $data = $request->validate(['title' => 'required|string|max:150', 'type' => 'required|in:class,meeting,exam,holiday,activity,placement_test', 'start_date' => 'required|date', 'end_date' => 'nullable|date|after_or_equal:start_date', 'start_time' => 'nullable|date_format:H:i', 'end_time' => 'nullable|date_format:H:i', 'description' => 'nullable|string|max:1000', 'location' => 'nullable|string|max:150', 'term' => ['nullable', 'regex:/^\d{4}$/']]);
        $this->validateEventTimes($data);

        return AcademicEvent::create($data + ['created_by' => $request->user()->id]);
    }

    public function update(Request $request, AcademicEvent $event)
    {
        $this->canManage($request);
        $data = $request->validate(['title' => 'required|string|max:150', 'type' => 'required|in:class,meeting,exam,holiday,activity,placement_test', 'start_date' => 'required|date', 'end_date' => 'nullable|date|after_or_equal:start_date', 'start_time' => 'nullable|date_format:H:i', 'end_time' => 'nullable|date_format:H:i', 'description' => 'nullable|string|max:1000', 'location' => 'nullable|string|max:150', 'term' => ['nullable', 'regex:/^\d{4}$/']]);
        $this->validateEventTimes($data);
        $event->update($data);

        return $event->fresh();
    }

    public function destroy(Request $request, AcademicEvent $event)
    {
        $this->canManage($request);
        $event->delete();

        return ['ok' => true];
    }

    private function validateEventTimes(array $data): void
    {
        abort_if(
            ! empty($data['start_time'])
                && ! empty($data['end_time'])
                && ($data['end_date'] ?? $data['start_date']) === $data['start_date']
                && $data['end_time'] < $data['start_time'],
            422,
            'Waktu selesai harus setelah waktu mulai.',
        );
    }
}