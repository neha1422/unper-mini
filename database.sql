-- database.sql
-- FINAL FIXED VERSION
-- MATCHES app.js ROUTES

DROP DATABASE IF EXISTS unper;
CREATE DATABASE unper;
USE unper;

-- ======================
-- TABLES
-- ======================

CREATE TABLE voters(
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    age INT,
    gender VARCHAR(20),
    state VARCHAR(50),
    status VARCHAR(20)
);

CREATE TABLE migration_requests(
    id INT AUTO_INCREMENT PRIMARY KEY,
    voter_id INT,
    from_state VARCHAR(50),
    to_state VARCHAR(50),
    req_status VARCHAR(30),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================
-- 320 DATASET
-- ======================

DELIMITER $$

CREATE PROCEDURE seed_data()
BEGIN
    DECLARE i INT DEFAULT 1;

    WHILE i <= 320 DO

        INSERT INTO voters(
            name,
            age,
            gender,
            state,
            status
        )
        VALUES(

            CONCAT(
                ELT((i MOD 15)+1,
                'Aarav','Vivaan','Aditya','Arjun','Sai',
                'Krishna','Rohan','Kabir','Yash','Rahul',
                'Priya','Ananya','Sneha','Neha','Diya'),

                ' ',

                ELT((i MOD 15)+1,
                'Sharma','Patel','Verma','Singh','Mehta',
                'Kapoor','Nair','Gupta','Jain','Arora',
                'Kaur','Yadav','Bansal','Joshi','Malhotra')
            ),

            18 + (i MOD 42),

            IF(i MOD 2 = 0,'Male','Female'),

            ELT((i MOD 5)+1,
                'Delhi',
                'Punjab',
                'UP',
                'Maharashtra',
                'Gujarat'
            ),

            'Active'
        );

        SET i = i + 1;

    END WHILE;

END$$

DELIMITER ;

CALL seed_data();
DROP PROCEDURE seed_data;

SELECT COUNT(*) AS total_records FROM voters;