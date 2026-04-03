import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1775229513411 implements MigrationInterface {
    name = 'InitialSchema1775229513411'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 创建 certification_type 表
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`certification_type\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`code\` varchar(30) NOT NULL,
                \`name\` varchar(50) NOT NULL,
                \`icon\` varchar(200) DEFAULT NULL,
                \`description\` varchar(200) DEFAULT NULL,
                \`requiredFields\` json DEFAULT NULL,
                \`isEnabled\` tinyint NOT NULL DEFAULT '1',
                \`sortOrder\` int NOT NULL DEFAULT '0',
                \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`IDX_bb73d7b03787e9bd4870b296a8\` (\`code\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // 创建 users 表
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`users\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`mobile\` varchar(20) NOT NULL,
                \`password\` varchar(255) NOT NULL,
                \`nickname\` varchar(50) DEFAULT NULL,
                \`avatarUrl\` varchar(500) DEFAULT NULL,
                \`avatarPath\` varchar(500) DEFAULT NULL,
                \`gender\` tinyint NOT NULL DEFAULT '0',
                \`points\` int NOT NULL DEFAULT '2000',
                \`inviteCode\` varchar(20) NOT NULL,
                \`inviterCode\` varchar(20) DEFAULT NULL,
                \`isVerified\` tinyint NOT NULL DEFAULT '0',
                \`status\` tinyint NOT NULL DEFAULT '0',
                \`violationCount\` int NOT NULL DEFAULT '0',
                \`lastLoginAt\` timestamp(6) NULL DEFAULT NULL,
                \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`deletedAt\` timestamp(6) DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`IDX_d376a9f93bba651f32a2c03a7d\` (\`mobile\`),
                UNIQUE KEY \`IDX_f0e1b4ecdca13b177e2e3a0613\` (\`inviteCode\`),
                KEY \`IDX_8bf09204c4b3f6e5c8c1b4e6f5\` (\`inviterCode\`),
                KEY \`IDX_a6e124991c8c1b4e6f5d376a9f\` (\`status\`),
                KEY \`IDX_b7e124991c8c1b4e6f5d376a9f\` (\`deletedAt\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // 创建 certifications 表
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`certifications\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`userId\` int NOT NULL,
                \`type\` enum('house','education','id_card','business','driver','utility') NOT NULL,
                \`imageUrl\` varchar(500) DEFAULT NULL,
                \`description\` text,
                \`status\` tinyint NOT NULL DEFAULT '0',
                \`rejectReason\` varchar(500) DEFAULT NULL,
                \`reviewedAt\` timestamp NULL DEFAULT NULL,
                \`reviewedBy\` bigint DEFAULT NULL,
                \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                KEY \`IDX_c5d9770c24adc7be0680f9bd96\` (\`userId\`),
                KEY \`IDX_f586a19c805f12f686bdf6ce4a\` (\`type\`),
                KEY \`IDX_b2ace296eeb341aa623f27e378\` (\`status\`),
                CONSTRAINT \`FK_c5d9770c24adc7be0680f9bd963\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // 创建 chat_messages 表
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`chat_messages\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`senderId\` bigint NOT NULL,
                \`receiverId\` bigint NOT NULL,
                \`content\` text NOT NULL,
                \`msgType\` tinyint NOT NULL DEFAULT '1',
                \`isRead\` tinyint NOT NULL DEFAULT '0',
                \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                KEY \`IDX_fc6b58e41e9a871dacbe9077de\` (\`senderId\`),
                KEY \`IDX_9a197c82c9ea44d75bc145a6e2\` (\`receiverId\`),
                KEY \`IDX_a6f359922fb93e42d1b2daf38d\` (\`createdAt\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // 创建 file_record 表
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`file_record\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`fileName\` varchar(255) NOT NULL,
                \`filePath\` varchar(500) NOT NULL,
                \`originalName\` varchar(255) NOT NULL,
                \`fileSize\` bigint NOT NULL DEFAULT '0',
                \`mimeType\` varchar(100) NOT NULL,
                \`fileExt\` varchar(20) NOT NULL,
                \`bucketName\` varchar(100) NOT NULL DEFAULT 'default',
                \`width\` int DEFAULT NULL,
                \`height\` int DEFAULT NULL,
                \`status\` tinyint NOT NULL DEFAULT '1',
                \`uploadUserId\` int NOT NULL,
                \`uploadNickname\` varchar(100) DEFAULT NULL,
                \`type\` varchar(100) DEFAULT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`deletedAt\` datetime(6) DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                KEY \`IDX_8c707a20fe7a304ee870bb1043\` (\`fileName\`),
                KEY \`IDX_a95db4188eef858af116c9e203\` (\`filePath\`),
                KEY \`IDX_a79b289435cbf54f694dbb9246\` (\`status\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // 创建 friendships 表
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`friendships\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`userId\` int NOT NULL,
                \`friendId\` int NOT NULL,
                \`status\` tinyint NOT NULL DEFAULT '0',
                \`unlockPoints\` bigint DEFAULT NULL,
                \`chatCount\` int NOT NULL DEFAULT '0',
                \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`IDX_79319c79ccb0d109db66e5faaf\` (\`userId\`,\`friendId\`),
                KEY \`IDX_721d9e1784e4eb781d7666fa7a\` (\`userId\`),
                KEY \`IDX_d54199dd09cec12dda4c4a05cd\` (\`friendId\`),
                KEY \`IDX_4864bfab7fad9a34292e12bdb0\` (\`status\`),
                CONSTRAINT \`FK_721d9e1784e4eb781d7666fa7ab\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`),
                CONSTRAINT \`FK_d54199dd09cec12dda4c4a05cd7\` FOREIGN KEY (\`friendId\`) REFERENCES \`users\` (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // 创建 points_config 表
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`points_config\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`key\` varchar(50) NOT NULL,
                \`value\` int NOT NULL DEFAULT '0',
                \`description\` varchar(200) DEFAULT NULL,
                \`isEnabled\` tinyint NOT NULL DEFAULT '1',
                \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`IDX_04c4e2a18b91a7814d468526f9\` (\`key\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // 创建 points_logs 表
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`points_logs\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`userId\` bigint NOT NULL,
                \`type\` tinyint NOT NULL,
                \`amount\` int NOT NULL,
                \`balance\` int NOT NULL DEFAULT '0',
                \`description\` varchar(200) DEFAULT NULL,
                \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                KEY \`IDX_a6e124991c8c1b4e6f5d376a9f\` (\`userId\`),
                KEY \`IDX_b7e124991c8c1b4e6f5d376a9f\` (\`type\`),
                KEY \`IDX_c8f235001d9d2c5f7g6e487b0g\` (\`createdAt\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // 创建 post_reports 表
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`post_reports\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`postId\` int NOT NULL,
                \`reporterId\` int NOT NULL,
                \`reason\` varchar(500) NOT NULL,
                \`status\` tinyint NOT NULL DEFAULT '0',
                \`handledBy\` int DEFAULT NULL,
                \`handledAt\` timestamp NULL DEFAULT NULL,
                \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                KEY \`IDX_a7f236002e0e3d6g8h7f598c1h\` (\`postId\`),
                KEY \`IDX_b8g347113f1f4e7h9i8g6a9d2i\` (\`reporterId\`),
                KEY \`IDX_c9h458224g2g5f8i0j9h7b0e3j\` (\`status\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // 创建 sign_records 表
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`sign_records\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`userId\` int NOT NULL,
                \`signDate\` date NOT NULL,
                \`points\` int NOT NULL DEFAULT '0',
                \`continuousDays\` int NOT NULL DEFAULT '1',
                \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`IDX_d0i569335h3h6g9j1k0i8c1f4k\` (\`userId\`,\`signDate\`),
                KEY \`IDX_e1j670446i4i7h0k2l1j9d2g5l\` (\`userId\`),
                KEY \`IDX_f2k781557j5j8i1l3m2k0e3h6m\` (\`signDate\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // 创建 square_comments 表
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`square_comments\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`postId\` int NOT NULL,
                \`userId\` int NOT NULL,
                \`content\` text NOT NULL,
                \`parentId\` int DEFAULT NULL,
                \`replyToId\` int DEFAULT NULL,
                \`likeCount\` int NOT NULL DEFAULT '0',
                \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`deletedAt\` timestamp(6) DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                KEY \`IDX_g3l892668k6k9j2m4n3l1f4i7n\` (\`postId\`),
                KEY \`IDX_h4m903779l7l0k3n5o4m2g5j8o\` (\`userId\`),
                KEY \`IDX_i5n014880m8m1l4o6p5n3h6k9p\` (\`parentId\`),
                KEY \`IDX_j6o125991n9n2m5p7q6o4i7l0q\` (\`deletedAt\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // 创建 square_likes 表
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`square_likes\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`postId\` int NOT NULL,
                \`userId\` int NOT NULL,
                \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`IDX_k7p236002o0o3n6q8r7p5j8m1r\` (\`postId\`,\`userId\`),
                KEY \`IDX_l8q347113p1p4o7r9s8q6k9n2s\` (\`postId\`),
                KEY \`IDX_m9r458224q2q5p8s0t9r7l0o3t\` (\`userId\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // 创建 square_posts 表
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`square_posts\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`userId\` int NOT NULL,
                \`content\` text NOT NULL,
                \`images\` json DEFAULT NULL,
                \`likeCount\` int NOT NULL DEFAULT '0',
                \`commentCount\` int NOT NULL DEFAULT '0',
                \`viewCount\` int NOT NULL DEFAULT '0',
                \`status\` tinyint NOT NULL DEFAULT '1',
                \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`deletedAt\` timestamp(6) DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                KEY \`IDX_n0s569335r3r6q9t1u0s8m1p4u\` (\`userId\`),
                KEY \`IDX_o1t670446s4s7r0u2v1t9n2q5v\` (\`status\`),
                KEY \`IDX_p2u781557t5t8s1v3w2u0o3r6w\` (\`createdAt\`),
                KEY \`IDX_q3v892668u6u9t2w4x3v1p4s7x\` (\`deletedAt\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // 创建 system_config 表
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`system_config\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`key\` varchar(100) NOT NULL,
                \`value\` text NOT NULL,
                \`description\` varchar(200) DEFAULT NULL,
                \`group\` varchar(50) DEFAULT 'default',
                \`isPublic\` tinyint NOT NULL DEFAULT '0',
                \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`IDX_r4w903779v7v0u3x5y4w2q5t8y\` (\`key\`),
                KEY \`IDX_s5x014880w8w1v4y6z5x3r6u9z\` (\`group\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // 创建 user_blacklist 表
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`user_blacklist\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`userId\` int NOT NULL,
                \`blockedUserId\` int NOT NULL,
                \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`IDX_t6y125991x9x2w5z7a6y4s7v0a\` (\`userId\`,\`blockedUserId\`),
                KEY \`IDX_u7z236002y0y3x6a8b7z5t8w1b\` (\`userId\`),
                KEY \`IDX_v8a347113z1z4y7b9c8a6u9x2c\` (\`blockedUserId\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // 创建 user_profiles 表
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`user_profiles\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`userId\` int NOT NULL,
                \`realName\` varchar(50) DEFAULT NULL,
                \`birthday\` date DEFAULT NULL,
                \`height\` int DEFAULT NULL,
                \`weight\` int DEFAULT NULL,
                \`education\` varchar(50) DEFAULT NULL,
                \`occupation\` varchar(100) DEFAULT NULL,
                \`income\` varchar(50) DEFAULT NULL,
                \`city\` varchar(100) DEFAULT NULL,
                \`hometown\` varchar(100) DEFAULT NULL,
                \`maritalStatus\` tinyint DEFAULT NULL,
                \`hasChildren\` tinyint DEFAULT NULL,
                \`wantChildren\` tinyint DEFAULT NULL,
                \`housing\` varchar(50) DEFAULT NULL,
                \`car\` varchar(50) DEFAULT NULL,
                \`smoking\` tinyint DEFAULT NULL,
                \`drinking\` tinyint DEFAULT NULL,
                \`bio\` text,
                \`hobbies\` json DEFAULT NULL,
                \`photos\` json DEFAULT NULL,
                \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`IDX_w9b458224a2a5z8c0d9b7v0y3d\` (\`userId\`),
                CONSTRAINT \`FK_w9b458224a2a5z8c0d9b7v0y3d\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // 创建 user_violations 表
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`user_violations\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`userId\` int NOT NULL,
                \`type\` varchar(50) NOT NULL,
                \`reason\` varchar(500) NOT NULL,
                \`status\` tinyint NOT NULL DEFAULT '0',
                \`handledBy\` int DEFAULT NULL,
                \`handledAt\` timestamp NULL DEFAULT NULL,
                \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                KEY \`IDX_x0c569335b3b6a9d1e0c8w1z4e\` (\`userId\`),
                KEY \`IDX_y1d670446c4c7b0e2f1d9x2a5f\` (\`type\`),
                KEY \`IDX_z2e781557d5d8c1f3g2e0y3b6g\` (\`status\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 按照依赖关系逆序删除表
        await queryRunner.query(`DROP TABLE IF EXISTS \`user_violations\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`user_profiles\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`user_blacklist\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`system_config\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`square_posts\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`square_likes\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`square_comments\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`sign_records\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`post_reports\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`points_logs\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`points_config\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`friendships\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`file_record\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`chat_messages\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`certifications\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`users\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`certification_type\``);
    }
}
