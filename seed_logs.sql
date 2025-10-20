-- seed_logs.sql
-- WARNING: this will INSERT many rows. Use DELETE FROM user_logs WHERE session_id LIKE 'seed_%'; to remove later.
SET @num_days = 30;        -- how many past days to seed
SET @min_actions = 20;     -- per user per day minimum actions
SET @max_actions = 40;     -- per user per day maximum actions

DROP PROCEDURE IF EXISTS seed_user_logs;
DELIMITER $$
CREATE PROCEDURE seed_user_logs()
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE uid INT;
  DECLARE day_idx INT;
  DECLARE act_count INT;
  DECLARE i INT;
  DECLARE base_ts DATETIME;
  DECLARE session_base VARCHAR(64);
  DECLARE users_cur CURSOR FOR SELECT user_id FROM users;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  OPEN users_cur;
  read_loop: LOOP
    FETCH users_cur INTO uid;
    IF done THEN
      LEAVE read_loop;
    END IF;

    SET day_idx = 0;
    WHILE day_idx < @num_days DO
      -- decide number of actions for this user on that day
      SET act_count = FLOOR(RAND() * (@max_actions - @min_actions + 1)) + @min_actions;
      SET i = 0;
      SET base_ts = DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL (day_idx) DAY);

      -- create one session id per day per user (seed_<uid>_<day_idx>_<rand>)
      SET session_base = CONCAT('seed_', uid, '_', day_idx, '_', LPAD(FLOOR(RAND()*9999),4,'0'));

      WHILE i < act_count DO
        -- choose random action type
        SET @r = FLOOR(RAND()*10);
        SET @action_type = 'View';
        SET @log_type = 'ui_event';
        IF @r < 1 THEN
          SET @action_type = 'Login';
        ELSEIF @r < 2 THEN
          SET @action_type = 'LoginFail';
        ELSEIF @r < 4 THEN
          SET @action_type = 'Click';
        ELSEIF @r < 6 THEN
          SET @action_type = 'Navigate';
        ELSEIF @r < 8 THEN
          SET @action_type = 'Export';
        ELSEIF @r < 9 THEN
          SET @action_type = 'Edit';
        ELSE
          SET @action_type = 'View';
        END IF;

        -- random small time offset within the day
        SET @sec_offset = FLOOR(RAND()*86400);
        SET @evt_ts = DATE_ADD(DATE(base_ts), INTERVAL @sec_offset SECOND);

        INSERT INTO user_logs
          (user_id, session_id, action_type, action_detail, page_url, ip_address, log_timestamp, user_agent, is_flagged, log_type)
        VALUES
          (uid,
           CONCAT(session_base, '_', LPAD(i,4,'0')),
           @action_type,
           CONCAT('seeded ', @action_type, ' action'),
           CASE
             WHEN @action_type IN ('Export') THEN '/export/inventory'
             WHEN @action_type IN ('Login','LoginFail') THEN '/api/auth/login'
             WHEN @action_type IN ('Click','Navigate') THEN '/dashboard'
             WHEN @action_type IN ('Edit') THEN '/inventory'
             ELSE '/inventory'
           END,
           CONCAT('10.20.', FLOOR(RAND()*240), '.', FLOOR(RAND()*240)),
           @evt_ts,
           'SeedAgent/1.0',
           0,
           @log_type
          );

        SET i = i + 1;
      END WHILE;

      SET day_idx = day_idx + 1;
    END WHILE;

  END LOOP;

  CLOSE users_cur;
END$$
DELIMITER ;

-- call it (runs the seeding)
CALL seed_user_logs();

-- optional: show a quick sample of seeded rows
SELECT user_id, session_id, action_type, log_timestamp
FROM user_logs
WHERE session_id LIKE 'seed_%'
ORDER BY log_timestamp DESC
LIMIT 20;
