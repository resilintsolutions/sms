<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\FeeHead;
use App\Models\FeeStructure;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use App\Models\StudentEnrollment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FeeController extends Controller
{
    public function feeHeads(Request $request): JsonResponse
    {
        $query = FeeHead::where('institution_id', $request->get('institution_id', 1));
        return response()->json(['success' => true, 'data' => $query->get()]);
    }

    public function feeHeadStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'institution_id' => 'required|exists:institutions,id',
            'name' => 'required|string|max:255',
            'name_bn' => 'nullable|string|max:255',
            'frequency' => 'in:one_time,monthly,annual',
        ]);
        $validated['frequency'] = $validated['frequency'] ?? 'monthly';
        $head = FeeHead::create($validated);
        return response()->json(['success' => true, 'data' => $head], 201);
    }

    public function feeHeadShow(FeeHead $fee_head): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $fee_head]);
    }

    public function feeHeadUpdate(Request $request, FeeHead $fee_head): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'name_bn' => 'nullable|string|max:255',
            'frequency' => 'in:one_time,monthly,annual',
        ]);
        $fee_head->update($validated);
        return response()->json(['success' => true, 'data' => $fee_head]);
    }

    public function feeHeadDestroy(FeeHead $fee_head): JsonResponse
    {
        $fee_head->delete();
        return response()->json(['success' => true, 'message' => 'Fee head deleted']);
    }

    public function feeStructures(Request $request): JsonResponse
    {
        $query = FeeStructure::with(['feeHead', 'class', 'academicSession']);
        if ($request->has('institution_id')) {
            $query->where('institution_id', $request->institution_id);
        }
        if ($request->has('academic_session_id')) {
            $query->where('academic_session_id', $request->academic_session_id);
        }
        if ($request->has('class_id')) {
            $query->where('class_id', $request->class_id);
        }
        return response()->json(['success' => true, 'data' => $query->get()]);
    }

    public function feeStructureStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'institution_id' => 'required|exists:institutions,id',
            'academic_session_id' => 'required|exists:academic_sessions,id',
            'class_id' => 'required|exists:classes,id',
            'fee_head_id' => 'required|exists:fee_heads,id',
            'amount' => 'required|numeric|min:0',
            'effective_from' => 'nullable|date',
            'effective_to' => 'nullable|date',
        ]);
        $structure = FeeStructure::create($validated);
        return response()->json(['success' => true, 'data' => $structure->load('feeHead', 'class', 'academicSession')], 201);
    }

    public function feeStructureShow(FeeStructure $fee_structure): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $fee_structure->load('feeHead', 'class', 'academicSession')]);
    }

    public function feeStructureUpdate(Request $request, FeeStructure $fee_structure): JsonResponse
    {
        $validated = $request->validate([
            'amount' => 'sometimes|numeric|min:0',
            'effective_from' => 'nullable|date',
            'effective_to' => 'nullable|date',
        ]);
        $fee_structure->update($validated);
        return response()->json(['success' => true, 'data' => $fee_structure]);
    }

    public function feeStructureDestroy(FeeStructure $fee_structure): JsonResponse
    {
        $fee_structure->delete();
        return response()->json(['success' => true, 'message' => 'Fee structure deleted']);
    }

    public function invoices(Request $request): JsonResponse
    {
        $query = Invoice::with(['student', 'academicSession']);
        if ($request->has('student_id')) {
            $query->where('student_id', $request->student_id);
        }
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        if ($request->has('academic_session_id')) {
            $query->where('academic_session_id', $request->academic_session_id);
        }
        $invoices = $query->latest()->paginate($request->get('per_page', 15));
        return response()->json(['success' => true, 'data' => $invoices]);
    }

    public function invoiceShow(Invoice $invoice): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $invoice->load(['student', 'academicSession', 'items.feeHead', 'payments'])]);
    }

    public function invoiceStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'institution_id' => 'required|exists:institutions,id',
            'student_id' => 'required|exists:students,id',
            'academic_session_id' => 'required|exists:academic_sessions,id',
            'month' => 'nullable|string|max:7',
            'items' => 'required|array|min:1',
            'items.*.fee_head_id' => 'required|exists:fee_heads,id',
            'items.*.amount' => 'required|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'due_date' => 'nullable|date',
        ]);
        $subTotal = 0;
        foreach ($validated['items'] as $item) {
            $subTotal += (float) $item['amount'];
        }
        $discount = (float) ($validated['discount_amount'] ?? 0);
        $total = $subTotal - $discount;
        $invoiceNo = 'INV-' . strtoupper(uniqid());
        $invoice = Invoice::create([
            'institution_id' => $validated['institution_id'],
            'student_id' => $validated['student_id'],
            'academic_session_id' => $validated['academic_session_id'],
            'invoice_no' => $invoiceNo,
            'month' => $validated['month'] ?? null,
            'sub_total' => $subTotal,
            'discount_amount' => $discount,
            'total_amount' => $total,
            'paid_amount' => 0,
            'due_amount' => $total,
            'status' => 'pending',
            'due_date' => $validated['due_date'] ?? null,
        ]);
        foreach ($validated['items'] as $item) {
            InvoiceItem::create([
                'invoice_id' => $invoice->id,
                'fee_head_id' => $item['fee_head_id'],
                'amount' => $item['amount'],
            ]);
        }
        return response()->json(['success' => true, 'data' => $invoice->load('items.feeHead', 'student', 'academicSession')], 201);
    }

    public function invoiceUpdate(Request $request, Invoice $invoice): JsonResponse
    {
        $validated = $request->validate([
            'due_date' => 'nullable|date',
            'status' => 'sometimes|in:draft,pending,partial,paid',
        ]);
        $invoice->update($validated);
        return response()->json(['success' => true, 'data' => $invoice]);
    }

    public function invoiceDestroy(Invoice $invoice): JsonResponse
    {
        $invoice->delete();
        return response()->json(['success' => true, 'message' => 'Invoice deleted']);
    }

    public function collectPayment(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'invoice_id' => 'required|exists:invoices,id',
            'amount' => 'required|numeric|min:0.01',
            'payment_date' => 'required|date',
            'method' => 'in:cash,bank,bkash,nagad,other',
            'reference' => 'nullable|string|max:100',
            'note' => 'nullable|string',
        ]);
        $invoice = Invoice::findOrFail($validated['invoice_id']);
        $validated['receipt_no'] = 'RCP-' . strtoupper(uniqid());
        $validated['institution_id'] = $invoice->institution_id;
        $validated['collected_by'] = $request->user()?->id;
        $payment = Payment::create($validated);
        $invoice->paid_amount += $payment->amount;
        $invoice->due_amount = $invoice->total_amount - $invoice->paid_amount;
        $invoice->status = $invoice->due_amount <= 0 ? 'paid' : 'partial';
        $invoice->save();
        return response()->json(['success' => true, 'data' => $payment->load('invoice')], 201);
    }

    /** Report: fee summary by session/class */
    public function feeReport(Request $request): JsonResponse
    {
        $request->validate([
            'academic_session_id' => 'required|exists:academic_sessions,id',
            'class_id' => 'nullable|exists:classes,id',
        ]);
        $query = Invoice::with(['student', 'academicSession'])
            ->where('academic_session_id', $request->academic_session_id);
        if ($request->has('class_id')) {
            $classId = $request->class_id;
            $sessionId = $request->academic_session_id;
            $query->whereHas('student.enrollments', function ($q) use ($classId, $sessionId) {
                $q->where('academic_session_id', $sessionId)
                    ->whereHas('section', fn ($sq) => $sq->where('class_id', $classId));
            });
        }
        $invoices = $query->get();
        $summary = [
            'total_invoices' => $invoices->count(),
            'total_amount' => round($invoices->sum('total_amount'), 2),
            'total_paid' => round($invoices->sum('paid_amount'), 2),
            'total_due' => round($invoices->sum('due_amount'), 2),
            'by_status' => $invoices->groupBy('status')->map->count(),
        ];
        return response()->json(['success' => true, 'data' => $invoices, 'summary' => $summary]);
    }
}
