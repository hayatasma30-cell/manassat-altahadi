# Telegram student questions

## Intended workflow
- Student opens "أسئلتي للأستاذة حياة" from the existing Telegram bot menu.
- First use links the student's Telegram account to an active student access code from `platform_access_codes`; only the student ID and Telegram identifiers are associated.
- The student sends a question. Supabase stores the question text, student ID, creation time, and status only.
- Student attachments, teacher voice notes, text replies, and other conversation messages are copied or sent through Telegram and are not stored as platform media or reply text.
- Teacher reviews question records in the existing teacher questions page and uses Telegram to answer.
- Student space shows the question history and status, with a link to the Telegram bot.

## Current development status
- Changes are isolated on `feature/telegram-student-questions`.
- A draft pull request is open: https://github.com/hayatasma30-cell/manassat-altahadi/pull/4
- A staging Edge Function `telegram-tahadi-bot-staging` is deployed at version 4. It has no Telegram webhook configured; the official bot is unchanged.
- Student and teacher page changes are committed to the development branch only. They are not live until reviewed and merged.

## Required validation before release
1. Test student account linking with a valid student access code and reject invalid/inactive codes.
2. Confirm new question records contain only question text, student ID, and status; do not write `image_data` or `teacher_reply`.
3. Confirm the teacher group receives new question notifications and Telegram attachments.
4. Confirm the teacher can send text and voice/media replies privately to the linked student.
5. Confirm status transitions (new, in progress, answered, closed) and student history.
6. Confirm registration, renewal, results, and existing platform login are unchanged.
7. Only after these tests pass, configure production webhook/deploy and merge the pull request.
