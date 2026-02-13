# Login Credentials & Test Data

All passwords: **`password`**

---

## 🔐 User Accounts (Email Login)

| Role | Email | Password | After Login |
|------|-------|----------|-------------|
| **Super Admin** | superadmin@schoolportal.bd | password | → Super Admin Dashboard |
| **Admin** | admin@school.edu.bd | password | → Admin Panel |
| **Teacher** | teacher@school.edu.bd | password | → Teacher Portal |
| **Parent** | parent@school.edu.bd | password | → Parent Portal |
| **Accountant** | shahidul.accountant@school.edu.bd | password | → Accountant Portal |
| **Librarian** | morium.librarian@school.edu.bd | password | → Librarian Portal |

---

## 👨‍🎓 Student Portal (No Login Required)

Go to **Student Portal** → Enter **Student ID**:

| Student ID | Student Name |
|------------|--------------|
| STU-24-00001 | Ayan Rahman |
| STU-24-00002 | Sara Islam |
| STU-24-00003 | Rafid Hassan |
| STU-24-00004 | Nadia Akter |
| STU-24-00005 | Omar Faruk |

---

## 👨‍👩‍👧 Parent Portal (No Login Required)

Go to **Parents Portal** → Enter **Guardian Phone** to find children:

| Phone | Guardian | Linked Students |
|-------|----------|-----------------|
| +8801711111001 | Rahim Ahmed | Ayan Rahman, Sara Islam |
| +8801711111002 | Fatema Begum | Ayan Rahman, Sara Islam |
| +8801711111003 | Karim Hossain | Rafid Hassan, Nadia Akter |
| +8801711111004 | Ayesha Khan | Rafid Hassan, Nadia Akter |
| +8801711111005 | Mizan Rahman | Omar Faruk |

---

## 📋 Dummy Data Summary

- **Academic Sessions**: 2023-2024, 2024-2025 (current)
- **Classes**: 1–12 with sections A, B
- **Students**: 5+ with enrollments, attendance, marks, results
- **Teachers**: Rahim Teacher (Class 1-A, Bangla & English)
- **Fees**: Tuition, Admission, Exam, Transport fee heads
- **Invoices**: Sample invoices for students 1 & 2
- **Notices**: School reopening, Parent meeting, Exam schedule

---

## 🔄 Re-seed Data

To reset and re-run all seed scripts:

```bash
cd backend
php seed_admin.php
php setup_multitenant.php
php seed_dummy.php
php seed_users.php
```
