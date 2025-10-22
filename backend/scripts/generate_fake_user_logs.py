#!/usr/bin/env python3
"""Generate fake user_logs SQL for sakura_masas database.

Outputs a file `generated_user_logs.sql` containing INSERT statements for the
`user_logs` table covering a date range and including normal and abnormal events.

Usage:
    python generate_fake_user_logs.py

The script is deterministic by default (seeded) so results are reproducible.
"""
import random
import datetime
from pathlib import Path

OUT = Path(__file__).resolve().parent / "generated_user_logs.sql"

# Configuration
START_DATE = datetime.date(2025, 9, 22)
END_DATE = datetime.date(2025, 10, 21)
TOTAL_LOGS = 2000

# Users and behaviour profiles
USERS = {
    1: {"role": "supervisor", "actions": ["view_inventory", "edit_inventory", "add_user", "view_reports", "manage_orders"]},
    2: {"role": "employee", "actions": ["view_inventory", "view_orders", "create_order"]},
    3: {"role": "contractor", "actions": ["view_inventory"]},
}

WORK_START = datetime.time(6, 0)
WORK_END = datetime.time(22, 30)  # 10:30pm

ACTION_MAPPING = {
    "view_inventory": ("navigate", "/inventory", "view performed on /inventory"),
    "edit_inventory": ("edit", "/inventory", "edit performed on /inventory"),
    "add_user": ("create", "/users", "create performed on /users"),
    "view_reports": ("export", "/dashboard", "export performed on /dashboard"),
    "manage_orders": ("click", "/orders", "click performed on /orders"),
    "view_orders": ("navigate", "/orders", "navigate performed on /orders"),
    "create_order": ("click", "/orders", "click performed on /orders"),
}

IP_POOL = [f"192.168.1.{i}" for i in range(2, 255)]
USER_AGENTS = [
    "Mozilla/5.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
]

def random_timestamp(start_date, end_date, workday=True):
    days = (end_date - start_date).days + 1
    d = start_date + datetime.timedelta(days=random.randrange(days))
    if workday:
        # pick between WORK_START and WORK_END
        start_seconds = WORK_START.hour * 3600 + WORK_START.minute * 60
        end_seconds = WORK_END.hour * 3600 + WORK_END.minute * 60
    else:
        # night: between 23:00 and 05:59 (wrap to next day)
        # We'll pick either late night (23:00-23:59) or early morning (00:00-05:59)
        if random.random() < 0.6:
            start_seconds = 23 * 3600
            end_seconds = 23 * 3600 + 59 * 60 + 59
            # keep same day
        else:
            start_seconds = 0
            end_seconds = 5 * 3600 + 59 * 60 + 59
            # ensure day is inside range; if d is start_date, it's ok
    secs = random.randrange(start_seconds, end_seconds + 1)
    ts = datetime.datetime.combine(d, datetime.time(0, 0)) + datetime.timedelta(seconds=secs)
    return ts

def make_insert_rows(rows):
    # Format rows for SQL VALUES list
    vals = []
    for r in rows:
        # Escape single quotes in action_detail/page_url
        action_detail = r['action_detail'].replace("'", "''")
        page_url = r['page_url'].replace("'", "''")
        ua = r['user_agent'].replace("'", "''")
        geo = r['geo_location'].replace("'", "''")
        vals.append(
            "(%d, %d, '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', %d, '%s')" % (
                r['log_id'], r['user_id'], r['action_type'], action_detail, page_url,
                r['ip_address'], r['log_timestamp'].strftime('%Y-%m-%d %H:%M:%S'), r['session_id'], ua, geo, r['is_flagged'], r['log_type']
            )
        )
    return ",\n".join(vals)

def generate_logs():
    random.seed(12345)
    logs = []
    log_id = 1000  # start at 1000 to avoid conflicting with seed
    session_counters = {u: 0 for u in USERS}

    # Generate baseline / normal logs proportional to roles
    for _ in range(int(TOTAL_LOGS * 0.85)):
        # pick user biased to supervisors (they have more actions)
        user = random.choices(list(USERS.keys()), weights=[0.4, 0.35, 0.25])[0]
        profile = USERS[user]
        action_key = random.choice(profile['actions'])
        action_type, page_url, action_detail = ACTION_MAPPING.get(action_key, ("click", "/", f"{action_key} performed"))
        ts = random_timestamp(START_DATE, END_DATE, workday=True)
        session_counters[user] += 1
        session_id = f"sess_{user}_{session_counters[user]}"
        logs.append({
            'log_id': log_id,
            'user_id': user,
            'action_type': action_type,
            'action_detail': action_detail,
            'page_url': page_url,
            'ip_address': random.choice(IP_POOL),
            'log_timestamp': ts,
            'session_id': session_id,
            'user_agent': random.choice(USER_AGENTS),
            'geo_location': 'Singapore',
            'is_flagged': 0,
            'log_type': 'ui_event' if action_type != 'export' else 'data_access'
        })
        log_id += 1

    # Add abnormal logs: failed login bursts followed by success
    for user in USERS:
        # Add 3 bursts per user over the period
        for burst in range(3):
            # choose a night time for burst
            ts_base = random_timestamp(START_DATE, END_DATE, workday=False)
            session_counters[user] += 1
            session_id = f"sess_{user}_fail_{burst}"
            # 3-6 failed attempts
            fails = random.randint(3, 6)
            for i in range(fails):
                logs.append({
                    'log_id': log_id,
                    'user_id': user,
                    'action_type': 'login',
                    'action_detail': 'failed login attempt',
                    'page_url': '/login',
                    'ip_address': random.choice(IP_POOL),
                    'log_timestamp': ts_base + datetime.timedelta(seconds=i * 20),
                    'session_id': session_id,
                    'user_agent': random.choice(USER_AGENTS),
                    'geo_location': 'Singapore',
                    'is_flagged': 1,
                    'log_type': 'auth'
                })
                log_id += 1
            # successful login after fails
            logs.append({
                'log_id': log_id,
                'user_id': user,
                'action_type': 'login',
                'action_detail': 'successful login after failed attempts',
                'page_url': '/login',
                'ip_address': random.choice(IP_POOL),
                'log_timestamp': ts_base + datetime.timedelta(seconds=fails * 20 + 10),
                'session_id': session_id,
                'user_agent': random.choice(USER_AGENTS),
                'geo_location': 'Singapore',
                'is_flagged': 1,
                'log_type': 'auth'
            })
            log_id += 1

    # Abnormal inventory access outside working hours (data exfil)
    for _ in range(10):
        user = random.choice([1,2,3])
        ts = random_timestamp(START_DATE, END_DATE, workday=False)
        session_counters[user] += 1
        session_id = f"sess_{user}_exf_{session_counters[user]}"
        for i in range(1):
            logs.append({
                'log_id': log_id,
                'user_id': user,
                'action_type': 'export',
                'action_detail': 'data exfiltration - large export',
                'page_url': '/inventory/export',
                'ip_address': random.choice(IP_POOL),
                'log_timestamp': ts + datetime.timedelta(seconds=i*30),
                'session_id': session_id,
                'user_agent': random.choice(USER_AGENTS),
                'geo_location': 'Singapore',
                'is_flagged': 1,
                'log_type': 'data_access'
            })
            log_id += 1

    # Unauthorized access: employee (2) tries supervisor pages outside normal actions
    for _ in range(8):
        ts = random_timestamp(START_DATE, END_DATE, workday=random.random() < 0.6)
        session_counters[2] += 1
        session_id = f"sess_2_unauth_{session_counters[2]}"
        logs.append({
            'log_id': log_id,
            'user_id': 2,
            'action_type': 'navigate',
            'action_detail': 'accessed supervisor dashboard (unauthorized)',
            'page_url': '/supervisor',
            'ip_address': random.choice(IP_POOL),
            'log_timestamp': ts,
            'session_id': session_id,
            'user_agent': random.choice(USER_AGENTS),
            'geo_location': 'Singapore',
            'is_flagged': 1,
            'log_type': 'auth'
        })
        log_id += 1

    # Shuffle logs to simulate real arrival order and trim/pad to TOTAL_LOGS
    random.shuffle(logs)
    if len(logs) > TOTAL_LOGS:
        logs = logs[:TOTAL_LOGS]

    return logs

def main():
    logs = generate_logs()
    # Write SQL file with INSERT statement in batches
    header = "-- Generated user_logs INSERTs\nSTART TRANSACTION;\n"
    with OUT.open('w', encoding='utf-8') as f:
        f.write(header)
        batch_size = 250
        for i in range(0, len(logs), batch_size):
            chunk = logs[i:i+batch_size]
            f.write("INSERT INTO `user_logs` (`log_id`, `user_id`, `action_type`, `action_detail`, `page_url`, `ip_address`, `log_timestamp`, `session_id`, `user_agent`, `geo_location`, `is_flagged`, `log_type`) VALUES\n")
            f.write(make_insert_rows(chunk))
            f.write(";\n\n")
        f.write("COMMIT;\n")

    print(f"Wrote {len(logs)} logs to {OUT}")

if __name__ == '__main__':
    main()
