-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 14, 2025 at 10:38 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `sakura_masas`
--

-- --------------------------------------------------------

--
-- Table structure for table `anomaly_scores`
--

DROP TABLE IF EXISTS `anomaly_scores`;
CREATE TABLE `anomaly_scores` (
  `score_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `session_id` varchar(64) DEFAULT NULL,
  `risk_score` decimal(5,2) DEFAULT NULL,
  `risk_level` enum('Normal','Low Alert','Medium Alert','High Alert') DEFAULT NULL,
  `explanation` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `anomaly_scores`
--

INSERT INTO `anomaly_scores` (`score_id`, `user_id`, `session_id`, `risk_score`, `risk_level`, `explanation`, `created_at`) VALUES
(1, 4, 'session_1', 82.00, 'High Alert', 'Auto-generated risk: score 82 due to mixed actions', '2025-10-14 08:31:04'),
(2, 6, 'session_2', 96.00, 'High Alert', 'Auto-generated risk: score 96 due to mixed actions', '2025-10-14 08:31:04'),
(3, 7, 'session_3', 54.00, 'Medium Alert', 'Auto-generated risk: score 54 due to mixed actions', '2025-10-14 08:31:04'),
(4, 4, 'session_4', 74.00, 'High Alert', 'Auto-generated risk: score 74 due to mixed actions', '2025-10-14 08:31:04'),
(5, 3, 'session_5', 63.00, 'Medium Alert', 'Auto-generated risk: score 63 due to mixed actions', '2025-10-14 08:31:04'),
(6, 1, 'session_6', 79.00, 'High Alert', 'Auto-generated risk: score 79 due to mixed actions', '2025-10-14 08:31:04'),
(7, 6, 'session_7', 33.00, 'Low Alert', 'Auto-generated risk: score 33 due to mixed actions', '2025-10-14 08:31:04'),
(8, 5, 'session_8', 84.00, 'High Alert', 'Auto-generated risk: score 84 due to mixed actions', '2025-10-14 08:31:04'),
(9, 2, 'session_9', 87.00, 'High Alert', 'Auto-generated risk: score 87 due to mixed actions', '2025-10-14 08:31:04'),
(10, 1, 'session_10', 66.00, 'Medium Alert', 'Auto-generated risk: score 66 due to mixed actions', '2025-10-14 08:31:04');

-- --------------------------------------------------------

--
-- Table structure for table `rule_based_detections`
--

DROP TABLE IF EXISTS `rule_based_detections`;
CREATE TABLE `rule_based_detections` (
  `detection_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `session_id` varchar(64) DEFAULT NULL,
  `last_analyzed_log_id` int(11) DEFAULT NULL,  -- Track which logs were analyzed
  `risk_score` int(11) DEFAULT 0,
  `risk_level` enum('Normal','Low Alert','Medium Alert','High Alert') DEFAULT 'Normal',
  `triggered_rules` text DEFAULT NULL,
  `explanation` text DEFAULT NULL,
  `detected_at` timestamp NOT NULL DEFAULT current_timestamp(),
  KEY `idx_user_session` (`user_id`, `session_id`),  -- Index for faster lookups
  KEY `idx_last_log` (`last_analyzed_log_id`)  -- Index for log tracking
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Stand-in structure for view `flagged_activity`
-- (See below for the actual view)
--
DROP VIEW IF EXISTS `flagged_activity`;
CREATE TABLE `flagged_activity` (
`log_id` int(11)
,`user_id` int(11)
,`session_id` varchar(64)
,`action_type` varchar(50)
,`action_detail` text
,`log_timestamp` timestamp
,`page_url` varchar(255)
,`ip_address` varchar(45)
,`geo_location` varchar(100)
,`log_type` enum('ui_event','system','auth','data_access')
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `high_risk_users`
-- (See below for the actual view)
--
DROP VIEW IF EXISTS `high_risk_users`;
CREATE TABLE `high_risk_users` (
`user_id` int(11)
,`username` varchar(100)
,`session_id` varchar(64)
,`risk_score` decimal(5,2)
,`risk_level` enum('Normal','Low Alert','Medium Alert','High Alert')
,`explanation` text
,`created_at` timestamp
);

-- --------------------------------------------------------

--
-- Table structure for table `inventory_items`
--

DROP TABLE IF EXISTS `inventory_items`;
CREATE TABLE `inventory_items` (
  `item_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `quantity` int(11) DEFAULT 0,
  `last_updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `inventory_items`
--

INSERT INTO `inventory_items` (`item_id`, `name`, `description`, `quantity`, `last_updated`) VALUES
(1, 'Laptop', 'Laptop for general use', 30, '2025-10-14 08:31:04'),
(2, 'Monitor', 'Monitor for general use', 5, '2025-10-14 08:31:04'),
(3, 'External HDD', 'External HDD for general use', 17, '2025-10-14 08:31:04'),
(4, 'Keyboard', 'Keyboard for general use', 6, '2025-10-14 08:31:04'),
(5, 'Mouse', 'Mouse for general use', 45, '2025-10-14 08:31:04'),
(6, 'Router', 'Router for general use', 23, '2025-10-14 08:31:04');

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
  `order_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `item_id` int(11) DEFAULT NULL,
  `quantity` int(11) NOT NULL,
  `order_time` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`order_id`, `user_id`, `item_id`, `quantity`, `order_time`) VALUES
(1, 1, 1, 1, '2025-10-14 08:31:04'),
(2, 1, 1, 2, '2025-10-14 08:31:04'),
(3, 2, 2, 3, '2025-10-14 08:31:04'),
(4, 2, 1, 1, '2025-10-14 08:31:04'),
(5, 3, 2, 3, '2025-10-14 08:31:04'),
(6, 3, 6, 1, '2025-10-14 08:31:04'),
(7, 4, 2, 2, '2025-10-14 08:31:04'),
(8, 4, 5, 2, '2025-10-14 08:31:04'),
(9, 4, 6, 1, '2025-10-14 08:31:04'),
(10, 5, 3, 2, '2025-10-14 08:31:04'),
(11, 5, 2, 1, '2025-10-14 08:31:04'),
(12, 5, 6, 3, '2025-10-14 08:31:04'),
(13, 6, 2, 2, '2025-10-14 08:31:04'),
(14, 6, 5, 3, '2025-10-14 08:31:04'),
(15, 7, 3, 2, '2025-10-14 08:31:04'),
(16, 7, 3, 1, '2025-10-14 08:31:04');

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `role_id` int(11) NOT NULL,
  `role_name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`role_id`, `role_name`) VALUES
(3, 'contractor'),
(2, 'employee'),
(1, 'supervisor');

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
CREATE TABLE `sessions` (
  `session_id` varchar(64) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `start_time` timestamp NOT NULL DEFAULT current_timestamp(),
  `end_time` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sessions`
--

INSERT INTO `sessions` (`session_id`, `user_id`, `start_time`, `end_time`) VALUES
('session_1', 4, '2025-10-10 04:37:42', '2025-10-10 05:22:42'),
('session_10', 1, '2025-10-10 07:03:32', '2025-10-10 07:40:32'),
('session_2', 6, '2025-10-10 06:38:25', '2025-10-10 07:24:25'),
('session_3', 7, '2025-10-10 05:40:55', '2025-10-10 05:55:55'),
('session_4', 4, '2025-10-10 01:17:45', '2025-10-10 01:58:45'),
('session_5', 3, '2025-10-10 03:07:43', '2025-10-10 03:53:43'),
('session_6', 1, '2025-10-10 04:30:32', '2025-10-10 05:08:32'),
('session_7', 6, '2025-10-10 00:40:53', '2025-10-10 01:14:53'),
('session_8', 5, '2025-10-10 00:05:44', '2025-10-10 00:20:44'),
('session_9', 2, '2025-10-10 04:49:30', '2025-10-10 05:45:30');

-- --------------------------------------------------------

--
-- Stand-in structure for view `session_summary`
-- (See below for the actual view)
--
DROP VIEW IF EXISTS `session_summary`;
CREATE TABLE `session_summary` (
`session_id` varchar(64)
,`user_id` int(11)
,`username` varchar(100)
,`session_start` timestamp
,`session_end` timestamp
,`total_actions` bigint(21)
,`export_count` decimal(22,0)
,`flagged_actions` decimal(22,0)
);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `username` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `role_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
-- Demo credentials: supervisor1/password123, employee1/password123, contractor1/password123
--

INSERT INTO `users` (`user_id`, `username`, `password_hash`, `created_at`, `role_id`) VALUES
(1, 'supervisor1', '$2b$12$1zfRhBFf9biyNdB3eYR2U.hhJ4kO6sJoBHIgtXbtLKXhixNUbWx1.', '2025-10-18 08:00:00', 1),
(2, 'employee1', '$2b$12$1zfRhBFf9biyNdB3eYR2U.hhJ4kO6sJoBHIgtXbtLKXhixNUbWx1.', '2025-10-18 08:00:00', 2),
(3, 'contractor1', '$2b$12$1zfRhBFf9biyNdB3eYR2U.hhJ4kO6sJoBHIgtXbtLKXhixNUbWx1.', '2025-10-18 08:00:00', 3);

-- --------------------------------------------------------

--
-- Table structure for table `user_logs`
--

DROP TABLE IF EXISTS `user_logs`;
CREATE TABLE `user_logs` (
  `log_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `action_type` varchar(50) DEFAULT NULL,
  `action_detail` text DEFAULT NULL,
  `page_url` varchar(255) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `log_timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  `session_id` varchar(64) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `geo_location` varchar(100) DEFAULT NULL,
  `is_flagged` tinyint(1) DEFAULT 0,
  `log_type` enum('ui_event','system','auth','data_access') DEFAULT 'ui_event'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_logs`
--

INSERT INTO `user_logs` (`log_id`, `user_id`, `action_type`, `action_detail`, `page_url`, `ip_address`, `log_timestamp`, `session_id`, `user_agent`, `geo_location`, `is_flagged`, `log_type`) VALUES
(1, 4, 'export', 'export performed on /dashboard', '/dashboard', '192.168.1.159', '2025-10-10 05:16:06', 'session_1', 'Mozilla/5.0', 'Singapore', 0, 'data_access'),
(2, 4, 'export', 'export performed on /dashboard', '/dashboard', '192.168.1.186', '2025-10-10 05:20:36', 'session_1', 'Mozilla/5.0', 'Singapore', 0, 'ui_event'),
(3, 4, 'click', 'click performed on /orders', '/orders', '192.168.1.23', '2025-10-10 05:11:01', 'session_1', 'Mozilla/5.0', 'Singapore', 1, 'auth'),
(4, 4, 'click', 'click performed on /inventory', '/inventory', '192.168.1.44', '2025-10-10 04:44:12', 'session_1', 'Mozilla/5.0', 'Singapore', 0, 'auth'),
(5, 6, 'export', 'export performed on /inventory', '/inventory', '192.168.1.146', '2025-10-10 06:55:53', 'session_2', 'Mozilla/5.0', 'Singapore', 0, 'system'),
(6, 6, 'login', 'login performed on /orders', '/orders', '192.168.1.109', '2025-10-10 07:09:09', 'session_2', 'Mozilla/5.0', 'Singapore', 0, 'system'),
(7, 6, 'logout', 'logout performed on /dashboard', '/dashboard', '192.168.1.154', '2025-10-10 07:23:03', 'session_2', 'Mozilla/5.0', 'Singapore', 1, 'data_access'),
(8, 6, 'click', 'click performed on /dashboard', '/dashboard', '192.168.1.87', '2025-10-10 07:05:23', 'session_2', 'Mozilla/5.0', 'Singapore', 0, 'auth'),
(9, 6, 'logout', 'logout performed on /orders', '/orders', '192.168.1.88', '2025-10-10 06:39:53', 'session_2', 'Mozilla/5.0', 'Singapore', 0, 'system'),
(10, 6, 'export', 'export performed on /orders', '/orders', '192.168.1.127', '2025-10-10 07:05:48', 'session_2', 'Mozilla/5.0', 'Singapore', 0, 'ui_event'),
(11, 7, 'navigate', 'navigate performed on /dashboard', '/dashboard', '192.168.1.20', '2025-10-10 05:44:21', 'session_3', 'Mozilla/5.0', 'Singapore', 0, 'auth'),
(12, 7, 'export', 'export performed on /inventory', '/inventory', '192.168.1.3', '2025-10-10 05:41:19', 'session_3', 'Mozilla/5.0', 'Singapore', 0, 'system'),
(13, 7, 'navigate', 'navigate performed on /inventory', '/inventory', '192.168.1.34', '2025-10-10 05:47:47', 'session_3', 'Mozilla/5.0', 'Singapore', 0, 'system'),
(14, 7, 'export', 'export performed on /orders', '/orders', '192.168.1.107', '2025-10-10 05:44:17', 'session_3', 'Mozilla/5.0', 'Singapore', 0, 'auth'),
(15, 7, 'login', 'login performed on /inventory', '/inventory', '192.168.1.60', '2025-10-10 05:41:56', 'session_3', 'Mozilla/5.0', 'Singapore', 0, 'system'),
(16, 4, 'logout', 'logout performed on /inventory', '/inventory', '192.168.1.10', '2025-10-10 01:29:15', 'session_4', 'Mozilla/5.0', 'Singapore', 1, 'system'),
(17, 4, 'export', 'export performed on /inventory', '/inventory', '192.168.1.93', '2025-10-10 01:44:28', 'session_4', 'Mozilla/5.0', 'Singapore', 0, 'system'),
(18, 4, 'logout', 'logout performed on /dashboard', '/dashboard', '192.168.1.98', '2025-10-10 01:46:06', 'session_4', 'Mozilla/5.0', 'Singapore', 0, 'ui_event'),
(19, 4, 'click', 'click performed on /inventory', '/inventory', '192.168.1.70', '2025-10-10 01:30:38', 'session_4', 'Mozilla/5.0', 'Singapore', 0, 'ui_event'),
(20, 3, 'navigate', 'navigate performed on /dashboard', '/dashboard', '192.168.1.58', '2025-10-10 03:23:12', 'session_5', 'Mozilla/5.0', 'Singapore', 0, 'ui_event'),
(21, 3, 'edit', 'edit performed on /inventory', '/inventory', '192.168.1.158', '2025-10-10 03:14:23', 'session_5', 'Mozilla/5.0', 'Singapore', 1, 'data_access'),
(22, 3, 'export', 'export performed on /orders', '/orders', '192.168.1.143', '2025-10-10 03:25:00', 'session_5', 'Mozilla/5.0', 'Singapore', 0, 'system'),
(23, 3, 'click', 'click performed on /dashboard', '/dashboard', '192.168.1.52', '2025-10-10 03:40:38', 'session_5', 'Mozilla/5.0', 'Singapore', 0, 'system'),
(24, 1, 'logout', 'logout performed on /inventory', '/inventory', '192.168.1.168', '2025-10-10 04:35:55', 'session_6', 'Mozilla/5.0', 'Singapore', 0, 'data_access'),
(25, 1, 'edit', 'edit performed on /inventory', '/inventory', '192.168.1.37', '2025-10-10 05:08:15', 'session_6', 'Mozilla/5.0', 'Singapore', 0, 'auth'),
(26, 1, 'login', 'login performed on /orders', '/orders', '192.168.1.79', '2025-10-10 04:57:48', 'session_6', 'Mozilla/5.0', 'Singapore', 0, 'system'),
(27, 6, 'export', 'export performed on /inventory', '/inventory', '192.168.1.114', '2025-10-10 01:10:48', 'session_7', 'Mozilla/5.0', 'Singapore', 1, 'ui_event'),
(28, 6, 'export', 'export performed on /orders', '/orders', '192.168.1.170', '2025-10-10 00:42:34', 'session_7', 'Mozilla/5.0', 'Singapore', 0, 'auth'),
(29, 6, 'export', 'export performed on /inventory', '/inventory', '192.168.1.153', '2025-10-10 00:50:03', 'session_7', 'Mozilla/5.0', 'Singapore', 0, 'ui_event'),
(30, 5, 'login', 'login performed on /inventory', '/inventory', '192.168.1.174', '2025-10-10 00:18:29', 'session_8', 'Mozilla/5.0', 'Singapore', 0, 'system'),
(31, 5, 'navigate', 'navigate performed on /dashboard', '/dashboard', '192.168.1.131', '2025-10-10 00:13:51', 'session_8', 'Mozilla/5.0', 'Singapore', 0, 'ui_event'),
(32, 5, 'logout', 'logout performed on /orders', '/orders', '192.168.1.28', '2025-10-10 00:12:36', 'session_8', 'Mozilla/5.0', 'Singapore', 0, 'ui_event'),
(33, 5, 'export', 'export performed on /dashboard', '/dashboard', '192.168.1.129', '2025-10-10 00:20:38', 'session_8', 'Mozilla/5.0', 'Singapore', 0, 'data_access'),
(34, 2, 'navigate', 'navigate performed on /dashboard', '/dashboard', '192.168.1.116', '2025-10-10 04:54:05', 'session_9', 'Mozilla/5.0', 'Singapore', 0, 'system'),
(35, 2, 'edit', 'edit performed on /inventory', '/inventory', '192.168.1.179', '2025-10-10 04:56:05', 'session_9', 'Mozilla/5.0', 'Singapore', 0, 'ui_event'),
(36, 2, 'logout', 'logout performed on /orders', '/orders', '192.168.1.138', '2025-10-10 05:19:26', 'session_9', 'Mozilla/5.0', 'Singapore', 0, 'auth'),
(37, 1, 'logout', 'logout performed on /orders', '/orders', '192.168.1.181', '2025-10-10 07:05:01', 'session_10', 'Mozilla/5.0', 'Singapore', 0, 'ui_event'),
(38, 1, 'click', 'click performed on /orders', '/orders', '192.168.1.97', '2025-10-10 07:25:00', 'session_10', 'Mozilla/5.0', 'Singapore', 1, 'data_access'),
(39, 1, 'edit', 'edit performed on /dashboard', '/dashboard', '192.168.1.95', '2025-10-10 07:26:01', 'session_10', 'Mozilla/5.0', 'Singapore', 0, 'auth'),
(40, 1, 'navigate', 'navigate performed on /dashboard', '/dashboard', '192.168.1.67', '2025-10-10 07:07:31', 'session_10', 'Mozilla/5.0', 'Singapore', 0, 'auth'),
(41, 1, 'navigate', 'navigate performed on /dashboard', '/dashboard', '192.168.1.58', '2025-10-10 07:08:27', 'session_10', 'Mozilla/5.0', 'Singapore', 0, 'auth'),
(42, 1, 'navigate', 'navigate performed on /dashboard', '/dashboard', '192.168.1.59', '2025-10-10 07:38:33', 'session_10', 'Mozilla/5.0', 'Singapore', 1, 'auth'),
(43, 1, 'logout', 'logout performed on /inventory', '/inventory', '192.168.1.5', '2025-10-10 07:25:07', 'session_10', 'Mozilla/5.0', 'Singapore', 1, 'data_access'),
(44, 1, 'logout', 'logout performed on /inventory', '/inventory', '192.168.1.149', '2025-10-10 07:29:29', 'session_10', 'Mozilla/5.0', 'Singapore', 0, 'data_access');

-- --------------------------------------------------------

--
-- Structure for view `flagged_activity`
--
DROP TABLE IF EXISTS `flagged_activity`;

DROP VIEW IF EXISTS `flagged_activity`;
CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `flagged_activity`  AS SELECT `user_logs`.`log_id` AS `log_id`, `user_logs`.`user_id` AS `user_id`, `user_logs`.`session_id` AS `session_id`, `user_logs`.`action_type` AS `action_type`, `user_logs`.`action_detail` AS `action_detail`, `user_logs`.`log_timestamp` AS `log_timestamp`, `user_logs`.`page_url` AS `page_url`, `user_logs`.`ip_address` AS `ip_address`, `user_logs`.`geo_location` AS `geo_location`, `user_logs`.`log_type` AS `log_type` FROM `user_logs` WHERE `user_logs`.`is_flagged` = 1 ;

-- --------------------------------------------------------

--
-- Structure for view `high_risk_users`
--
DROP TABLE IF EXISTS `high_risk_users`;

DROP VIEW IF EXISTS `high_risk_users`;
CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `high_risk_users`  AS SELECT `a`.`user_id` AS `user_id`, `u`.`username` AS `username`, `a`.`session_id` AS `session_id`, `a`.`risk_score` AS `risk_score`, `a`.`risk_level` AS `risk_level`, `a`.`explanation` AS `explanation`, `a`.`created_at` AS `created_at` FROM (`anomaly_scores` `a` join `users` `u` on(`a`.`user_id` = `u`.`user_id`)) WHERE `a`.`risk_score` >= 70 ORDER BY `a`.`risk_score` DESC ;

-- --------------------------------------------------------

--
-- Structure for view `session_summary`
--
DROP TABLE IF EXISTS `session_summary`;

DROP VIEW IF EXISTS `session_summary`;
CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `session_summary`  AS SELECT `s`.`session_id` AS `session_id`, `s`.`user_id` AS `user_id`, `u`.`username` AS `username`, min(`l`.`log_timestamp`) AS `session_start`, max(`l`.`log_timestamp`) AS `session_end`, count(0) AS `total_actions`, sum(case when `l`.`action_type` = 'export' then 1 else 0 end) AS `export_count`, sum(case when `l`.`is_flagged` = 1 then 1 else 0 end) AS `flagged_actions` FROM ((`sessions` `s` join `user_logs` `l` on(`s`.`session_id` = `l`.`session_id`)) join `users` `u` on(`s`.`user_id` = `u`.`user_id`)) GROUP BY `s`.`session_id`, `s`.`user_id`, `u`.`username` ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `anomaly_scores`
--
ALTER TABLE `anomaly_scores`
  ADD PRIMARY KEY (`score_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `inventory_items`
--
ALTER TABLE `inventory_items`
  ADD PRIMARY KEY (`item_id`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`order_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `item_id` (`item_id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`role_id`),
  ADD UNIQUE KEY `role_name` (`role_name`);

--
-- Indexes for table `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`session_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `role_id` (`role_id`);

--
-- Indexes for table `user_logs`
--
ALTER TABLE `user_logs`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `idx_user_logs_user_id` (`user_id`),
  ADD KEY `idx_user_logs_timestamp` (`log_timestamp`),
  ADD KEY `idx_user_logs_session` (`session_id`);

--
-- Indexes for table `rule_based_detections`
--
ALTER TABLE `rule_based_detections`
  ADD PRIMARY KEY (`detection_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_detected_at` (`detected_at`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `anomaly_scores`
--
ALTER TABLE `anomaly_scores`
  MODIFY `score_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `inventory_items`
--
ALTER TABLE `inventory_items`
  MODIFY `item_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `order_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `role_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `user_logs`
--
ALTER TABLE `user_logs`
  MODIFY `log_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=45;

--
-- AUTO_INCREMENT for table `rule_based_detections`
--
ALTER TABLE `rule_based_detections`
  MODIFY `detection_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `anomaly_scores`
--
ALTER TABLE `anomaly_scores`
  ADD CONSTRAINT `anomaly_scores_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `orders_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `inventory_items` (`item_id`);

--
-- Constraints for table `sessions`
--
ALTER TABLE `sessions`
  ADD CONSTRAINT `sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`);

--
-- Constraints for table `user_logs`
--
ALTER TABLE `user_logs`
  ADD CONSTRAINT `user_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `rule_based_detections`
--
ALTER TABLE `rule_based_detections`
  ADD CONSTRAINT `rule_detections_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `rule_detections_ibfk_2` FOREIGN KEY (`last_analyzed_log_id`) REFERENCES `user_logs` (`log_id`) ON DELETE SET NULL;  -- FK to track logs
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
