/**
 * 一键初始化数据库与表
 * 用法：npm run init-db
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
  const rootPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  const dbName = process.env.DB_NAME || 'campus_activity';

  console.log(`[init-db] 创建数据库 ${dbName}（如不存在）`);
  await rootPool.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4`);

  const sql = fs.readFileSync(path.join(__dirname, '../../sql/01_users.sql'), 'utf8');
  console.log('[init-db] 执行 users 表建表语句');
  await rootPool.query(`USE \`${dbName}\``);
  await rootPool.query(sql);

  console.log('[init-db] 完成');
  await rootPool.end();
}

main().catch(err => {
  console.error('[init-db] 失败:', err.message);
  process.exit(1);
});
