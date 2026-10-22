# Tahadi Telegram bot draft test checklist

This file is a draft only. It has NOT been deployed to Supabase and must not be treated as live.

## Menu
- /start shows exactly three top-level inline buttons: التسجيل, التجديد, نتائج التلاميذ.
- Old reply keyboard is removed on /start; old registration/renewal text routes through the new submenus.
- Cancel clears the active draft and returns to the three-button menu.

## Registration
- One new student: name, contact phone, level, one or multiple services, months/lesson count, payment method, payment date, receipt, review, confirm.
- Multiple new students: each student's name/phone/level/services are preserved; add at least two students; confirm one shared batch.
- Verify that multiple service rows for one new student resolve to one student record on approval, not duplicates.
- Edit services on a multi-student request restarts the multi-student selection explicitly rather than silently dropping students.

## Renewal
- One existing student is selected from active students and not re-registered.
- Family renewal selects multiple existing students; each student's services and amounts remain distinct.
- Date, payment method, receipt(s), total, and per-student rows are visible in the review.

## Results and privacy
- Results search only lists students linked to the Telegram user in guardian_student_links.
- An unlinked user sees no student results.
- Linked user can see assessment scores, attendance, and teacher notes.
- Empty result/attendance/note tables display helpful empty-state messages.

## Payment review
- Teacher receives request details and receipt messages.
- Approval/rejection only works for TEACHER_CHAT_ID.
- Duplicate confirmation does not create duplicate payment batches.
- Do not deploy until a Deno/TypeScript syntax check and end-to-end test against a non-production test bot/database are completed.
