# TODO - CORS/500 fix + dummy-data verification

## Step 1: Fix backend 500 causing CORS error
- [x] Identify `/dashboard/stats` crash due to `Deficiency.reason` not existing
- [x] Update `backend/app/routes/dashboard_routes.py` to use `Deficiency.type` instead

## Step 2: Verify all pages render
- [ ] Ensure Dashboard, Students, Deficiencies, Grades, Curriculum, Reports pages don’t crash
- [ ] Validate every route/modal can open


## Step 3: Smoke test API
- [ ] Smoke test: restart backend and confirm `GET /dashboard/stats` returns 200

- [ ] Run frontend and confirm CORS error is gone


