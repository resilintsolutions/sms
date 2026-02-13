<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Models\BookIssue;
use App\Models\EBook;
use App\Models\Student;
use App\Models\Notice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LibraryController extends Controller
{
    // ================================================================
    //  DASHBOARD
    // ================================================================
    public function dashboard(Request $request): JsonResponse
    {
        $instId = $request->user()->institution_id ?? 1;

        $totalBooks     = Book::where('institution_id', $instId)->sum('total_copies');
        $availableBooks = Book::where('institution_id', $instId)->sum('available_copies');
        $uniqueBooks    = Book::where('institution_id', $instId)->count();
        $issuedBooks    = BookIssue::where('institution_id', $instId)->where('status', 'issued')->count();
        $overdueBooks   = BookIssue::where('institution_id', $instId)->where('status', 'issued')
            ->where('due_date', '<', now()->toDateString())->count();
        $totalStudents  = Student::where('institution_id', $instId)->where('status', 'active')->count();
        $totalEbooks    = EBook::where('institution_id', $instId)->where('status', 'published')->count();

        $recentIssues = BookIssue::where('book_issues.institution_id', $instId)
            ->join('books', 'book_issues.book_id', '=', 'books.id')
            ->join('students', 'book_issues.student_id', '=', 'students.id')
            ->orderByDesc('book_issues.issue_date')
            ->orderByDesc('book_issues.id')
            ->limit(10)
            ->select(
                'book_issues.id',
                'books.title as book_title',
                'students.name as student_name',
                'students.student_id as student_code',
                'book_issues.issue_date',
                'book_issues.due_date',
                'book_issues.return_date',
                'book_issues.status'
            )
            ->get()
            ->map(function ($issue) {
                if ($issue->status === 'issued' && $issue->due_date < now()->toDateString()) {
                    $issue->status = 'overdue';
                }
                return $issue;
            });

        $popularBooks = Book::where('institution_id', $instId)
            ->withCount('issues')
            ->orderByDesc('issues_count')
            ->limit(5)
            ->get(['id', 'title', 'author', 'category']);

        $recentNotices = Notice::where('institution_id', $instId)
            ->where('is_published', true)
            ->where(function ($q) {
                $q->where('audience', 'all')->orWhere('audience', 'staff');
            })
            ->orderByDesc('published_at')
            ->limit(5)
            ->get(['id', 'title', 'title_bn', 'published_at']);

        // Category breakdown
        $categories = Book::where('institution_id', $instId)
            ->select('category', DB::raw('COUNT(*) as count'), DB::raw('SUM(total_copies) as total'))
            ->groupBy('category')
            ->orderByDesc('count')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'total_books'     => (int) $totalBooks,
                'available_books' => (int) $availableBooks,
                'unique_books'    => $uniqueBooks,
                'issued_books'    => $issuedBooks,
                'overdue_books'   => $overdueBooks,
                'total_students'  => $totalStudents,
                'total_ebooks'    => $totalEbooks,
                'recent_issues'   => $recentIssues,
                'popular_books'   => $popularBooks,
                'recent_notices'  => $recentNotices,
                'categories'      => $categories,
            ],
        ]);
    }

    // ================================================================
    //  BOOKS — CRUD
    // ================================================================
    public function bookIndex(Request $request): JsonResponse
    {
        $instId = $request->user()->institution_id ?? 1;
        $query  = Book::where('institution_id', $instId);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%$search%")
                  ->orWhere('author', 'like', "%$search%")
                  ->orWhere('isbn', 'like', "%$search%")
                  ->orWhere('category', 'like', "%$search%");
            });
        }

        if ($cat = $request->query('category')) {
            $query->where('category', $cat);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $books = $query->orderBy('title')->get();

        return response()->json(['success' => true, 'data' => $books]);
    }

    public function bookShow(Request $request, int $id): JsonResponse
    {
        $instId = $request->user()->institution_id ?? 1;
        $book   = Book::where('institution_id', $instId)->findOrFail($id);

        $issueHistory = BookIssue::where('book_id', $id)
            ->join('students', 'book_issues.student_id', '=', 'students.id')
            ->orderByDesc('book_issues.issue_date')
            ->limit(20)
            ->select(
                'book_issues.*',
                'students.name as student_name',
                'students.student_id as student_code'
            )
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'book' => $book,
                'issue_history' => $issueHistory,
            ],
        ]);
    }

    public function bookStore(Request $request): JsonResponse
    {
        $request->validate([
            'title'           => 'required|string|max:255',
            'author'          => 'required|string|max:255',
            'isbn'            => 'nullable|string|max:30',
            'category'        => 'required|string|max:100',
            'publisher'       => 'nullable|string|max:255',
            'edition'         => 'nullable|string|max:50',
            'language'        => 'nullable|string|max:50',
            'pages'           => 'nullable|integer|min:1',
            'shelf_location'  => 'nullable|string|max:100',
            'total_copies'    => 'required|integer|min:1',
            'description'     => 'nullable|string',
            'title_bn'        => 'nullable|string|max:255',
            'author_bn'       => 'nullable|string|max:255',
            'description_bn'  => 'nullable|string',
        ]);

        $book = Book::create([
            'institution_id'   => $request->user()->institution_id ?? 1,
            'title'            => $request->title,
            'title_bn'         => $request->title_bn,
            'author'           => $request->author,
            'author_bn'        => $request->author_bn,
            'isbn'             => $request->isbn,
            'category'         => $request->category,
            'publisher'        => $request->publisher,
            'edition'          => $request->edition,
            'language'         => $request->language ?? 'Bangla',
            'pages'            => $request->pages,
            'shelf_location'   => $request->shelf_location,
            'total_copies'     => $request->total_copies,
            'available_copies' => $request->total_copies,
            'description'      => $request->description,
            'description_bn'   => $request->description_bn,
            'added_by'         => $request->user()->id,
            'status'           => 'active',
        ]);

        return response()->json(['success' => true, 'data' => $book], 201);
    }

    public function bookUpdate(Request $request, int $id): JsonResponse
    {
        $instId = $request->user()->institution_id ?? 1;
        $book   = Book::where('institution_id', $instId)->findOrFail($id);

        $request->validate([
            'title'          => 'sometimes|string|max:255',
            'author'         => 'sometimes|string|max:255',
            'isbn'           => 'nullable|string|max:30',
            'category'       => 'sometimes|string|max:100',
            'publisher'      => 'nullable|string|max:255',
            'edition'        => 'nullable|string|max:50',
            'language'       => 'nullable|string|max:50',
            'pages'          => 'nullable|integer|min:1',
            'shelf_location' => 'nullable|string|max:100',
            'total_copies'   => 'sometimes|integer|min:1',
            'description'    => 'nullable|string',
            'status'         => 'sometimes|in:active,inactive',
        ]);

        $oldTotal = $book->total_copies;
        $fillable = $request->only([
            'title', 'title_bn', 'author', 'author_bn', 'isbn', 'category',
            'publisher', 'edition', 'language', 'pages', 'shelf_location',
            'total_copies', 'description', 'description_bn', 'status',
        ]);

        $book->fill($fillable);

        // Adjust available copies when total changes
        if (isset($fillable['total_copies']) && $fillable['total_copies'] != $oldTotal) {
            $diff = $fillable['total_copies'] - $oldTotal;
            $book->available_copies = max(0, $book->available_copies + $diff);
        }

        $book->save();

        return response()->json(['success' => true, 'data' => $book]);
    }

    public function bookDestroy(Request $request, int $id): JsonResponse
    {
        $instId = $request->user()->institution_id ?? 1;
        $book   = Book::where('institution_id', $instId)->findOrFail($id);

        $activeIssues = BookIssue::where('book_id', $id)->where('status', 'issued')->count();
        if ($activeIssues > 0) {
            return response()->json([
                'success' => false,
                'message' => "Cannot delete — $activeIssues copies currently issued.",
            ], 422);
        }

        $book->delete();

        return response()->json(['success' => true, 'message' => 'Book deleted.']);
    }

    // ================================================================
    //  BOOK CATEGORIES
    // ================================================================
    public function categories(Request $request): JsonResponse
    {
        $instId = $request->user()->institution_id ?? 1;
        $cats = Book::where('institution_id', $instId)
            ->select('category')
            ->distinct()
            ->orderBy('category')
            ->pluck('category');

        return response()->json(['success' => true, 'data' => $cats]);
    }

    // ================================================================
    //  ISSUE / RETURN
    // ================================================================
    public function issueIndex(Request $request): JsonResponse
    {
        $instId = $request->user()->institution_id ?? 1;
        $query  = BookIssue::where('book_issues.institution_id', $instId)
            ->join('books', 'book_issues.book_id', '=', 'books.id')
            ->join('students', 'book_issues.student_id', '=', 'students.id');

        if ($status = $request->query('status')) {
            $query->where('book_issues.status', $status);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('books.title', 'like', "%$search%")
                  ->orWhere('students.name', 'like', "%$search%")
                  ->orWhere('students.student_id', 'like', "%$search%");
            });
        }

        $issues = $query->orderByDesc('book_issues.issue_date')
            ->orderByDesc('book_issues.id')
            ->select(
                'book_issues.*',
                'books.title as book_title',
                'books.isbn',
                'students.name as student_name',
                'students.student_id as student_code'
            )
            ->get()
            ->map(function ($issue) {
                if ($issue->status === 'issued' && $issue->due_date < now()->toDateString()) {
                    $issue->display_status = 'overdue';
                } else {
                    $issue->display_status = $issue->status;
                }
                return $issue;
            });

        return response()->json(['success' => true, 'data' => $issues]);
    }

    public function issueBook(Request $request): JsonResponse
    {
        $request->validate([
            'book_id'    => 'required|integer|exists:books,id',
            'student_id' => 'required|integer|exists:students,id',
            'due_date'   => 'required|date|after_or_equal:today',
        ]);

        $instId = $request->user()->institution_id ?? 1;
        $book   = Book::where('institution_id', $instId)->findOrFail($request->book_id);

        if ($book->available_copies < 1) {
            return response()->json([
                'success' => false,
                'message' => 'No copies available for this book.',
            ], 422);
        }

        // Check if student already has this book
        $alreadyIssued = BookIssue::where('book_id', $request->book_id)
            ->where('student_id', $request->student_id)
            ->where('status', 'issued')
            ->exists();

        if ($alreadyIssued) {
            return response()->json([
                'success' => false,
                'message' => 'This student already has this book issued.',
            ], 422);
        }

        // Check max books per student (limit 5)
        $currentIssued = BookIssue::where('student_id', $request->student_id)
            ->where('status', 'issued')
            ->count();

        if ($currentIssued >= 5) {
            return response()->json([
                'success' => false,
                'message' => 'Student already has 5 books issued. Return some first.',
            ], 422);
        }

        DB::transaction(function () use ($request, $book, $instId) {
            BookIssue::create([
                'institution_id' => $instId,
                'book_id'        => $book->id,
                'student_id'     => $request->student_id,
                'issued_by'      => $request->user()->id,
                'issue_date'     => now()->toDateString(),
                'due_date'       => $request->due_date,
                'status'         => 'issued',
            ]);

            $book->decrement('available_copies');
        });

        return response()->json(['success' => true, 'message' => 'Book issued successfully.'], 201);
    }

    public function returnBook(Request $request, int $issueId): JsonResponse
    {
        $instId = $request->user()->institution_id ?? 1;
        $issue  = BookIssue::where('institution_id', $instId)->findOrFail($issueId);

        if ($issue->status !== 'issued') {
            return response()->json([
                'success' => false,
                'message' => 'This book is already returned.',
            ], 422);
        }

        $finePerDay = 5; // BDT 5 per day late
        $fine = 0;
        $today = now()->toDateString();

        if ($today > $issue->due_date->toDateString()) {
            $daysLate = now()->diffInDays($issue->due_date);
            $fine = $daysLate * $finePerDay;
        }

        DB::transaction(function () use ($issue, $request, $fine, $today) {
            $issue->update([
                'return_date'  => $today,
                'returned_to'  => $request->user()->id,
                'fine_amount'  => $fine,
                'status'       => 'returned',
            ]);

            Book::where('id', $issue->book_id)->increment('available_copies');
        });

        return response()->json([
            'success' => true,
            'message' => $fine > 0 ? "Book returned. Late fine: BDT $fine" : 'Book returned successfully.',
            'data' => ['fine_amount' => $fine],
        ]);
    }

    // ================================================================
    //  STUDENT BOOK HISTORY
    // ================================================================
    public function studentBooks(Request $request, int $studentId): JsonResponse
    {
        $instId = $request->user()->institution_id ?? 1;
        $student = Student::where('institution_id', $instId)->findOrFail($studentId);

        $issues = BookIssue::where('book_issues.student_id', $studentId)
            ->join('books', 'book_issues.book_id', '=', 'books.id')
            ->orderByDesc('book_issues.issue_date')
            ->select(
                'book_issues.*',
                'books.title as book_title',
                'books.author',
                'books.isbn'
            )
            ->get()
            ->map(function ($issue) {
                if ($issue->status === 'issued' && $issue->due_date < now()->toDateString()) {
                    $issue->display_status = 'overdue';
                } else {
                    $issue->display_status = $issue->status;
                }
                return $issue;
            });

        return response()->json([
            'success' => true,
            'data' => [
                'student' => $student->only(['id', 'student_id', 'name', 'name_bn']),
                'issues' => $issues,
                'currently_issued' => $issues->where('status', 'issued')->count(),
                'total_issued' => $issues->count(),
                'overdue' => $issues->where('display_status', 'overdue')->count(),
            ],
        ]);
    }

    // ================================================================
    //  E-LIBRARY — CRUD
    // ================================================================
    public function ebookIndex(Request $request): JsonResponse
    {
        $instId = $request->user()->institution_id ?? 1;
        $query  = EBook::where('institution_id', $instId);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%$search%")
                  ->orWhere('author', 'like', "%$search%")
                  ->orWhere('category', 'like', "%$search%");
            });
        }

        if ($cat = $request->query('category')) {
            $query->where('category', $cat);
        }

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        $ebooks = $query->orderByDesc('created_at')->get();

        return response()->json(['success' => true, 'data' => $ebooks]);
    }

    public function ebookStore(Request $request): JsonResponse
    {
        $request->validate([
            'title'    => 'required|string|max:255',
            'author'   => 'required|string|max:255',
            'category' => 'required|string|max:100',
            'type'     => 'required|in:pdf,google_drive,dropbox,youtube,website,other',
            'link'     => 'required|string',
        ]);

        $ebook = EBook::create([
            'institution_id' => $request->user()->institution_id ?? 1,
            'title'          => $request->title,
            'title_bn'       => $request->title_bn,
            'author'         => $request->author,
            'author_bn'      => $request->author_bn,
            'category'       => $request->category,
            'description'    => $request->description,
            'description_bn' => $request->description_bn,
            'type'           => $request->type,
            'link'           => $request->link,
            'file_name'      => $request->file_name,
            'file_type'      => $request->file_type,
            'file_size'      => $request->file_size,
            'is_public'      => $request->boolean('is_public', true),
            'download_count' => 0,
            'added_by'       => $request->user()->id,
            'status'         => 'published',
        ]);

        return response()->json(['success' => true, 'data' => $ebook], 201);
    }

    public function ebookUpdate(Request $request, int $id): JsonResponse
    {
        $instId = $request->user()->institution_id ?? 1;
        $ebook  = EBook::where('institution_id', $instId)->findOrFail($id);

        $ebook->update($request->only([
            'title', 'title_bn', 'author', 'author_bn', 'category',
            'description', 'description_bn', 'type', 'link',
            'file_name', 'file_type', 'file_size', 'is_public', 'status',
        ]));

        return response()->json(['success' => true, 'data' => $ebook]);
    }

    public function ebookDestroy(Request $request, int $id): JsonResponse
    {
        $instId = $request->user()->institution_id ?? 1;
        $ebook  = EBook::where('institution_id', $instId)->findOrFail($id);
        $ebook->delete();

        return response()->json(['success' => true, 'message' => 'E-book deleted.']);
    }
}
