-- Archive and delete ONLY seeded rows from the seed dump
--  - user_logs seeded on 2025-10-10
--  - anomaly_scores seeded on 2025-10-14

START TRANSACTION;

-- Create archive tables if they don't exist (structure-copies)
CREATE TABLE IF NOT EXISTS archive_user_logs LIKE user_logs;
CREATE TABLE IF NOT EXISTS archive_anomaly_scores LIKE anomaly_scores;
CREATE TABLE IF NOT EXISTS archive_sessions LIKE sessions;
CREATE TABLE IF NOT EXISTS archive_flagged_activity LIKE flagged_activity;

-- Archive seeded user_logs for 2025-10-10
INSERT INTO archive_user_logs
SELECT * FROM user_logs
WHERE log_timestamp >= '2025-10-10 00:00:00' AND log_timestamp < '2025-10-11 00:00:00';

-- Archive any flagged_activity rows that reference those logs (if flagged_activity is a table)
INSERT INTO archive_flagged_activity
SELECT f.* FROM flagged_activity f
JOIN archive_user_logs a ON a.log_id = f.log_id
ON DUPLICATE KEY UPDATE flag_id = f.flag_id;

-- Archive sessions from that date (optional but included)
INSERT INTO archive_sessions
SELECT * FROM sessions
WHERE start_time >= '2025-10-10 00:00:00' AND start_time < '2025-10-11 00:00:00';

-- Archive seeded anomaly_scores for 2025-10-14
INSERT INTO archive_anomaly_scores
SELECT * FROM anomaly_scores
WHERE created_at >= '2025-10-14 00:00:00' AND created_at < '2025-10-15 00:00:00';

-- Now delete children first to satisfy FK constraints

-- Delete flagged_activity rows that reference archived logs
DELETE f FROM flagged_activity f
JOIN archive_user_logs a ON a.log_id = f.log_id;

-- Delete the seeded user_logs
DELETE FROM user_logs
WHERE log_timestamp >= '2025-10-10 00:00:00' AND log_timestamp < '2025-10-11 00:00:00';

-- Delete archived sessions
DELETE s FROM sessions s
JOIN archive_sessions a ON a.session_id = s.session_id;

-- Delete seeded anomaly_scores
DELETE FROM anomaly_scores
WHERE created_at >= '2025-10-14 00:00:00' AND created_at < '2025-10-15 00:00:00';

COMMIT;

-- Optional: Reset AUTO_INCREMENT for user_logs and anomaly_scores
-- ALTER TABLE user_logs AUTO_INCREMENT = (SELECT COALESCE(MAX(log_id),0) + 1 FROM user_logs);
-- ALTER TABLE anomaly_scores AUTO_INCREMENT = (SELECT COALESCE(MAX(score_id),0) + 1 FROM anomaly_scores);

-- Verification queries (run separately to confirm)
-- SELECT COUNT(*) FROM archive_user_logs;
-- SELECT COUNT(*) FROM archive_anomaly_scores;
-- SELECT COUNT(*) FROM user_logs WHERE log_timestamp >= '2025-10-10 00:00:00' AND log_timestamp < '2025-10-11 00:00:00';
-- SELECT COUNT(*) FROM anomaly_scores WHERE created_at >= '2025-10-14 00:00:00' AND created_at < '2025-10-15 00:00:00';
