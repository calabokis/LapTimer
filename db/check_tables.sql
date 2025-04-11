-- Check if tables exist and show their columns
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('turns', 'vp_changes', 'game_stats')
ORDER BY table_name, ordinal_position;
