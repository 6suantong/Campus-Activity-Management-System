/**
 * 一键初始化数据库与全部表
 * 用法：npm run init-db
 * 注意：建表脚本含 DROP TABLE IF EXISTS，会清空重建所有业务表
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
  await rootPool.query(`USE \`${dbName}\``);

  // 按文件名顺序执行 sql 目录下全部 .sql（01_ → 02_ → ...）
  const sqlDir = path.join(__dirname, '../../sql');
  const files = fs.readdirSync(sqlDir).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    console.log(`[init-db] 执行建表脚本 ${file}`);
    const sql = fs.readFileSync(path.join(sqlDir, file), 'utf8');
    await rootPool.query(sql);
  }

  console.log(`[init-db] 完成，共执行 ${files.length} 个脚本`);
  await rootPool.end();
}

main().catch(err => {
  console.error('[init-db] 失败:', err.message);
  process.exit(1);
});
