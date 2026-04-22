<?php

namespace App\Http\Controllers;

use App\Models\TuitionFee;
use App\Models\MiscFeeItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TuitionFeeController extends Controller
{
    // GET /api/tuition-fees — all fees (admin)
    public function index(Request $request)
    {
        $query = TuitionFee::with('miscItems');

        if ($request->school_year) {
            $query->where('school_year', $request->school_year);
        }

        return response()->json($query->orderBy('id')->get()->map(fn($f) => $this->format($f)));
    }

    // GET /api/tuition-fees/public — for enrollment page (active only)
    public function public(Request $request)
    {
        $schoolYear = $request->school_year ?? $this->currentSchoolYear();

        $fees = TuitionFee::with('miscItems')
            ->where('school_year', $schoolYear)
            ->where('is_active', true)
            ->orderBy('id')
            ->get();

        // Return as keyed object { 'Grade 1': {...}, 'Nursery': {...} }
        return response()->json(
            $fees->keyBy('grade_level')->map(fn($f) => $this->format($f))
        );
    }

    // GET /api/tuition-fees/{id}
    public function show($id)
    {
        $fee = TuitionFee::with('miscItems')->findOrFail($id);
        return response()->json($this->format($fee));
    }

    // POST /api/tuition-fees
    public function store(Request $request)
    {
        $validated = $request->validate([
            'grade_level'   => 'required|string',
            'school_year'   => 'required|string',
            'tuition_fee'   => 'required|numeric|min:0',
            'korean_fee'    => 'nullable|numeric|min:0',
            'down_payment'  => 'required|numeric|min:0',
            'monthly_terms' => 'required|integer|min:1',
            'is_active'     => 'boolean',
            'misc_items'    => 'nullable|array',
            'misc_items.*.label'  => 'required|string',
            'misc_items.*.amount' => 'required|numeric|min:0',
        ]);

        // Prevent duplicate grade+year
        $exists = TuitionFee::where('grade_level', $validated['grade_level'])
                            ->where('school_year', $validated['school_year'])
                            ->exists();
        if ($exists) {
            return response()->json([
                'message' => "{$validated['grade_level']} for SY {$validated['school_year']} already exists."
            ], 422);
        }

        return DB::transaction(function () use ($validated) {
            $fee = TuitionFee::create($validated);

            foreach ($validated['misc_items'] ?? [] as $i => $item) {
                MiscFeeItem::create([
                    'tuition_fee_id' => $fee->id,
                    'label'          => $item['label'],
                    'amount'         => $item['amount'],
                    'sort_order'     => $i,
                ]);
            }

            return response()->json([
                'message' => 'Fee created successfully.',
                'data'    => $this->format($fee->load('miscItems'))
            ], 201);
        });
    }

    // PUT /api/tuition-fees/{id}
    public function update(Request $request, $id)
    {
        $fee = TuitionFee::findOrFail($id);

        $validated = $request->validate([
            'tuition_fee'   => 'sometimes|numeric|min:0',
            'korean_fee'    => 'nullable|numeric|min:0',
            'down_payment'  => 'sometimes|numeric|min:0',
            'monthly_terms' => 'sometimes|integer|min:1',
            'is_active'     => 'sometimes|boolean',
            'misc_items'    => 'nullable|array',
            'misc_items.*.id'     => 'nullable|integer',
            'misc_items.*.label'  => 'required|string',
            'misc_items.*.amount' => 'required|numeric|min:0',
        ]);

        return DB::transaction(function () use ($fee, $validated) {
            $fee->update($validated);

            // Replace all misc items if provided
            if (isset($validated['misc_items'])) {
                $fee->miscItems()->delete();
                foreach ($validated['misc_items'] as $i => $item) {
                    MiscFeeItem::create([
                        'tuition_fee_id' => $fee->id,
                        'label'          => $item['label'],
                        'amount'         => $item['amount'],
                        'sort_order'     => $i,
                    ]);
                }
            }

            return response()->json([
                'message' => 'Fee updated successfully.',
                'data'    => $this->format($fee->load('miscItems'))
            ]);
        });
    }

    // DELETE /api/tuition-fees/{id}
    public function destroy($id)
    {
        $fee = TuitionFee::findOrFail($id);
        $fee->delete(); // cascades to misc_fee_items
        return response()->json(['message' => 'Fee deleted successfully.']);
    }

    // ── helpers ──────────────────────────────────────────────────

    private function format(TuitionFee $f): array
    {
        $miscTotal = $f->miscItems->sum('amount');
        $total     = $f->tuition_fee + $miscTotal + $f->korean_fee;
        $remaining = $total - $f->down_payment;
        $monthly   = $f->monthly_terms > 0
                        ? round($remaining / $f->monthly_terms, 2)
                        : 0;

        return [
            'id'                => $f->id,
            'grade_level'       => $f->grade_level,
            'school_year'       => $f->school_year,
            'tuition_fee'       => (float) $f->tuition_fee,
            'korean_fee'        => (float) $f->korean_fee,
            'down_payment'      => (float) $f->down_payment,
            'monthly_terms'     => $f->monthly_terms,
            'is_active'         => $f->is_active,
            'misc_total'        => (float) $miscTotal,
            'total_fee'         => (float) $total,
            'remaining_balance' => (float) $remaining,
            'monthly_payment'   => (float) $monthly,
            'misc_items'        => $f->miscItems->map(fn($m) => [
                'id'         => $m->id,
                'label'      => $m->label,
                'amount'     => (float) $m->amount,
                'sort_order' => $m->sort_order,
            ])->values(),
        ];
    }

    private function currentSchoolYear(): string
    {
        // return '2026-2027';
        $month = (int) date('n');
        $year  = (int) date('Y');
        return $month >= 6 ? "{$year}-" . ($year + 1) : ($year - 1) . "-{$year}";
    }
}