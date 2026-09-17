# 校园活动管理系统 V1.0 — 运行文档

## 一、项目简介

校园活动管理系统是一个前后端分离的 Web 应用，支持教师发布活动、学生报名参加，以及满员/截止自动关闭报名通道等功能。

- **GitHub 仓库**：https://github.com/6suantong/Campus-Activity-Management-System
- **当前版本**：V1.0.0（REQ-01 ~ REQ-04 已完成）

---

## 二、技术栈

| 层级 | 技术选型 |
|---|---|
| 后端 | Node.js + Express + MySQL + JWT + bcryptjs |
| 前端 | Vue 3 + Vite + vue-router + axios |
| 数据库 | MySQL 8.0 |
| 包管理 | npm |

---

## 三、环境要求

运行项目前需确保已安装以下软件：

| 软件 | 版本要求 | 验证命令 |
|---|---|---|
| Node.js | >= 16（推荐 18+） | `node -v` |
| npm | 随 Node.js 自带 | `npm -v` |
| MySQL | 8.0 | `mysql --version` |

> 本项目开发环境：Node.js v24.21.0、MySQL 8.0.46、Windows 11。

---

## 四、项目目录结构

```
Campus Activity Management System/
├── server/                         # 后端服务
│   ├── sql/                        # 数据库建表脚本
│   │   ├── 01_users.sql            # 用户表
│   │   ├── 02_activities.sql       # 活动表
│   │   └── 03_registrations.sql    # 报名表
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js               # MySQL 连接池配置
│   │   ├── middleware/
│   │   │   └── auth.js             # JWT 鉴权 + 角色校验中间件
│   │   ├── routes/
│   │   │   ├── auth.js             # 注册 / 登录 / 登出 / 当前用户
│   │   │   ├── activities.js       # 发布活动 / 活动列表 / 活动详情
│   │   │   └── registrations.js    # 报名 / 我的报名
│   │   ├── scripts/
│   │   │   └── init-db.js          # 一键建库建表脚本
│   │   ├── utils/
│   │   │   ├── channel-state.js    # 报名通道状态自动判定（REQ-04）
│   │   │   └── errors.js           # 统一响应封装
│   │   └── app.js                  # 服务入口
│   ├── .env                        # 环境变量（已被 .gitignore 忽略）
│   ├── .env.example                # 环境变量模板
│   └── package.json
├── client/                         # 前端应用
│   ├── src/
│   │   ├── api/                    # 接口请求封装
│   │   │   ├── activity.js
│   │   │   └── auth.js
│   │   ├── router/
│   │   │   └── index.js            # 路由与守卫
│   │   ├── store/
│   │   │   └── auth.js             # 全局响应式登录状态
│   │   ├── utils/
│   │   │   ├── auth.js             # token / user 本地存储
│   │   │   └── request.js          # axios 拦截器
│   │   ├── views/                  # 页面组件
│   │   │   ├── Login.vue
│   │   │   ├── Register.vue
│   │   │   ├── Activities.vue
│   │   │   ├── ActivityCreate.vue
│   │   │   └── MyRegistrations.vue
│   │   ├── App.vue
│   │   ├── main.js
│   │   └── style.css
│   ├── index.html
│   ├── vite.config.js              # Vite 配置（含 /api 代理）
│   └── package.json
├── .gitignore
├── README.md
└── RUNNING.md                      # 本文件
```

---

## 五、环境变量配置

后端通过 `.env` 文件读取数据库连接与 JWT 配置。

### 5.1 创建配置文件

进入 `server` 目录，将模板复制为 `.env`：

```bash
cd server
copy .env.example .env
```

### 5.2 编辑 `.env`

```env
# 服务端口
PORT=3000

# MySQL 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的MySQL密码
DB_NAME=campus_activity

# JWT 密钥（生产环境请使用强随机字符串）
JWT_SECRET=change_this_to_a_long_random_string_in_production
JWT_EXPIRES_IN=8h
```

> **注意**：`.env` 已被 `.gitignore` 忽略，不会被提交到仓库，数据库密码不会泄露。

---

## 六、数据库初始化

项目提供了一键建库建表脚本，会自动创建 `campus_activity` 数据库并执行 `sql/` 目录下的所有建表脚本。

```bash
cd server
npm run init-db
```

成功输出示例：
```
[init-db] 创建数据库 campus_activity（如不存在）
[init-db] 执行建表脚本 01_users.sql
[init-db] 执行建表脚本 02_activities.sql
[init-db] 执行建表脚本 03_registrations.sql
[init-db] 完成，共执行 3 个脚本
```

### ⚠️ 重新初始化注意事项

建表脚本包含 `DROP TABLE IF EXISTS`，但由于 `activities` 和 `registrations` 表有外键指向 `users`，直接重新执行会报外键约束错误。如需重建，请先删除数据库：

```bash
mysql -u root -p -e "DROP DATABASE IF EXISTS campus_activity;"
npm run init-db
```

---

## 七、安装依赖

前后端都需要安装依赖（首次运行或 `package.json` 变更后执行）。

### 后端依赖

```bash
cd server
npm install
```

### 前端依赖

```bash
cd client
npm install
```

---

## 八、启动项目

需要**打开两个终端**，分别启动后端和前端。

### 8.1 启动后端服务

```bash
cd server
npm run dev
```

启动成功后输出：
```
[server] 校园活动管理系统后端已启动: http://localhost:3000
```

后端运行在 **http://localhost:3000**。

> `npm run dev` 使用 `nodemon`，修改代码后会自动重启。生产环境可用 `npm start`（直接 `node src/app.js`）。

### 8.2 启动前端开发服务器

打开第二个终端：

```bash
cd client
npm run dev
```

启动成功后输出：
```
  VITE v5.4.21  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

前端运行在 **http://localhost:5173**。

前端通过 Vite 的代理配置将 `/api` 请求转发到后端 `http://localhost:3000`，无需手动处理跨域。

### 8.3 访问

浏览器打开 **http://localhost:5173/** 即可使用。

---

## 九、功能说明

| 需求 | 功能 | 角色 |
|---|---|---|
| REQ-01 | 用户注册 / 登录 / 登出 | 学生、教师 |
| REQ-02 | 教师发布活动 | 教师 |
| REQ-03 | 学生浏览可报名活动并报名 | 学生 |
| REQ-04 | 满员 / 截止 / 活动开始后自动关闭报名通道 | 系统自动 |

### 页面路由

| 路径 | 页面 | 权限 |
|---|---|---|
| `/login` | 登录页 | 公开（已登录自动跳转） |
| `/register` | 注册页 | 公开（已登录自动跳转） |
| `/activities` | 活动列表 | 需登录 |
| `/activities/create` | 发布活动 | 需登录 + 教师 |
| `/my-registrations` | 我的报名 | 需登录 + 学生 |

### 报名通道状态（REQ-04）

系统根据"时间窗口 + 已报名人数 + 容量"实时判定报名通道状态：

| 状态码 | 文案 | 可报名 |
|---|---|---|
| `not_open` | 报名未开始 | ❌ |
| `open` | 报名中 | ✅ |
| `full` | 名额已满 | ❌ |
| `deadline` | 报名已截止 | ❌ |
| `started` | 活动已开始 | ❌ |
| `cancelled` | 活动已取消 | ❌ |
| `closed` | 报名通道已关闭 | ❌ |

---

## 十、API 接口文档

所有接口统一响应格式：
```json
{ "code": 0, "message": "成功", "data": { ... } }
```
`code !== 0` 表示业务错误，HTTP 状态码同时反映错误类型。

### 10.1 用户认证

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| POST | `/api/auth/register` | 否 | 注册 |
| POST | `/api/auth/login` | 否 | 登录，返回 JWT |
| POST | `/api/auth/logout` | 是 | 登出 |
| GET | `/api/auth/me` | 是 | 获取当前用户 |

**注册请求体**：
```json
{
  "user_no": "20210001",
  "password": "123456",
  "name": "张三",
  "role": "student"
}
```
- `user_no`：字母数字 4-32 位
- `password`：至少 6 位
- `role`：`student`（默认）或 `teacher`

**登录响应**：
```json
{
  "code": 0,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOi...",
    "user": { "id": 1, "user_no": "20210001", "name": "张三", "role": "student" }
  }
}
```

### 10.2 活动管理

| 方法 | 路径 | 鉴权 | 角色 | 说明 |
|---|---|---|---|---|
| POST | `/api/activities` | 是 | 教师 | 发布活动 |
| GET | `/api/activities` | 可选 | — | 活动列表 |
| GET | `/api/activities/:id` | 否 | — | 活动详情 |

**发布活动请求体**：
```json
{
  "title": "迎新晚会",
  "start_time": "2026-10-01 19:00:00",
  "end_time": "2026-10-01 21:00:00",
  "location": "大礼堂",
  "capacity": 200,
  "register_start": "2026-09-20 00:00:00",
  "register_end": "2026-09-30 23:59:00",
  "description": "欢迎全体新生参加..."
}
```

**活动列表查询参数**：
- `onlyRegisterable=true`：仅返回当前可报名的活动（学生视角）

### 10.3 报名管理

| 方法 | 路径 | 鉴权 | 角色 | 说明 |
|---|---|---|---|---|
| POST | `/api/registrations` | 是 | 学生 | 报名活动 |
| GET | `/api/registrations/mine` | 是 | 学生 | 我的报名列表 |

**报名请求体**：
```json
{ "activity_id": 1 }
```

---

## 十一、常见问题排查

### Q1：前端启动报 esbuild 平台错误

**现象**：
```
You installed esbuild for another platform than the one you're currently using.
```

**解决**：
```bash
cd client
npm rebuild esbuild
```

### Q2：数据库初始化报外键约束错误

**现象**：
```
Cannot drop table 'users' referenced by a foreign key constraint 'fk_activities_publisher' on table 'activities'.
```

**原因**：`01_users.sql` 先执行，但 `activities` 表有外键指向 `users`。

**解决**：先删除整个数据库再重新初始化：
```bash
mysql -u root -p -e "DROP DATABASE IF EXISTS campus_activity;"
npm run init-db
```

### Q3：连接数据库失败（ECONNREFUSED）

**排查**：
1. 确认 MySQL 服务已启动：`sc query MySQL80`（Windows）
2. 确认 `.env` 中 `DB_HOST`、`DB_PORT`、`DB_USER`、`DB_PASSWORD` 配置正确
3. 确认 MySQL 允许本地连接

### Q4：登录后 401 或路由被拦截

**排查**：
1. 确认后端服务正在运行（http://localhost:3000）
2. 检查浏览器 localStorage 中是否有 `token`
3. JWT 默认有效期 8 小时，过期需重新登录

### Q5：PowerShell 中执行 npm 报错

**现象**：
```
无法加载文件 npm.ps1，因为在此系统上禁止运行脚本。
```

**原因**：PowerShell 执行策略限制了 `.ps1` 脚本。

**解决**：使用 CMD 运行命令，或在 PowerShell 中用 `npm.cmd` 代替 `npm`。

---

## 十二、开发常用命令

### 后端

| 命令 | 说明 |
|---|---|
| `npm install` | 安装依赖 |
| `npm run init-db` | 初始化数据库 |
| `npm run dev` | 开发模式启动（nodemon 热重载） |
| `npm start` | 生产模式启动 |

### 前端

| 命令 | 说明 |
|---|---|
| `npm install` | 安装依赖 |
| `npm run dev` | 开发模式启动（Vite 热更新） |
| `npm run build` | 构建生产版本到 `dist/` |
| `npm run preview` | 预览构建产物 |

---

## 十三、Git 分支说明

| 分支 | 说明 |
|---|---|
| `main` | 稳定分支，含 Release V1.0.0 |
| `develop` | 开发分支 |
| `feature/req-03` | REQ-03 学生报名功能 |
| `feature/req-04` | REQ-04 报名通道自动关闭 |
