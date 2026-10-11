# 校园活动管理系统 V2.0

> 本仓库当前进度：V2.0 全部功能已实现——注册登录、活动发布与浏览、学生报名（取消/候补/审核）、教师名单管理与审核、管理员账号管理。

## 功能总览

| 角色 | 功能 |
|---|---|
| 学生 | 浏览活动（含"需审核/名额/截止"状态）、报名、取消报名、满员申请候补、退出候补、查看我的报名（待审核/已确认/候补中/已取消 + 候补排队顺序） |
| 教师 | 发布活动（可设参加资格说明、开启报名审核）、查看本人活动报名名单（区分状态）、导出名单 CSV、审核报名申请（通过/拒绝） |
| 管理员 | 查看平台账号、停用异常账号、恢复账号（停用后无法登录） |

**核心业务规则**

- 报名状态机：`confirmed`（已确认）→ `cancelled`（取消）；`waitlisted`（候补中）→ `confirmed`（自动递补）或 `cancelled`（退出）；`pending`（待审核）→ `confirmed`/`waitlisted`（通过）或 `cancelled`（拒绝）
- 满员后可申请候补，按进入时间先到先得；有人取消时**同一事务内**自动递补队首
- 需审核活动报名先记 `pending` 不占名额，教师通过后按剩余名额转 `confirmed`（有位置）或 `waitlisted`（已满）
- 取消/退出/拒绝均为逻辑删除（`cancelled`），保留历史可追溯；人数统计只计 `confirmed`
- 活动归属鉴权：教师只能管理本人发布的活动；管理员不触碰报名业务数据

## 技术栈

| 层 | 选型 |
|---|---|
| 后端 | Node.js + Express + MySQL 8.0（mysql2/promise 连接池）+ JWT + bcryptjs |
| 前端 | Vue 3 + Vite + vue-router + axios |
| 分支策略 | main（稳定）+ develop（开发）+ feature/*（特性分支） |

## 目录结构

```
├── server/                        # 后端
│   ├── sql/
│   │   ├── 01_users.sql            # users 建表（student/teacher/admin + 账号状态）
│   │   ├── 02_activities.sql       # activities 建表（含参加资格、审核开关）
│   │   ├── 03_registrations.sql    # registrations 建表（报名状态机 + 候补排序索引）
│   │   └── 04_seed_admin.sql       # 预置管理员账号 admin/admin123
│   ├── src/
│   │   ├── config/db.js            # MySQL 连接池
│   │   ├── middleware/auth.js      # JWT 校验 + 角色中间件
│   │   ├── routes/
│   │   │   ├── auth.js             # register / login / logout / me（登录拦截停用账号）
│   │   │   ├── activities.js       # 活动发布 / 列表 / 详情（含 channel_state 与学生报名状态）
│   │   │   ├── registrations.js    # 报名 / 候补 / 取消（事务内自动递补）/ 退出候补 / 我的报名
│   │   │   ├── teacher.js          # 教师端：本人活动列表 / 名单 / CSV导出 / 待审核 / 审核
│   │   │   └── admin.js            # 管理员端：账号列表 / 停用 / 恢复
│   │   ├── utils/
│   │   │   ├── channel-state.js    # 报名通道状态统一判定（open/full/deadline/started…）
│   │   │   └── errors.js           # 统一响应包装
│   │   ├── scripts/init-db.js      # 一键建库建表
│   │   └── app.js                  # 服务入口
│   ├── .env.example
│   └── package.json
└── client/                        # 前端
    ├── src/
    │   ├── api/activity.js         # 全部 API（含报名/候补/教师/管理员接口 + CSV导出）
    │   ├── api/auth.js             # 认证 API
    │   ├── router/index.js         # 路由与角色守卫
    │   ├── store/auth.js           # 全局响应式登录状态
    │   ├── utils/                  # request 拦截器 / auth 本地存储
    │   ├── views/
    │   │   ├── Login.vue / Register.vue
    │   │   ├── Activities.vue          # 活动列表（需审核标签/满员候补按钮）
    │   │   ├── ActivityCreate.vue      # 发布活动（参加资格/审核开关）
    │   │   ├── MyRegistrations.vue     # 我的报名（状态标签/取消/退出候补/排队顺序）
    │   │   ├── TeacherActivities.vue   # 教师-我发布的活动
    │   │   ├── TeacherRegistrations.vue# 教师-名单/审核/导出
    │   │   └── AdminUsers.vue          # 管理员-账号管理
    │   ├── App.vue / main.js / style.css
    ├── index.html / vite.config.js / package.json
```

## 运行

### 1. 后端

```bash
cd server
cp .env.example .env        # 按需修改数据库密码与 JWT_SECRET
npm install
npm run init-db             # 创建数据库与全部表（含预置管理员 admin/admin123）
npm run dev                 # 启动 http://localhost:3000
```

### 2. 前端

```bash
cd client
npm install
npm run dev                 # 启动 http://localhost:5173（自动代理 /api 到后端）
```

## API 一览

### 认证（auth）

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| POST | `/api/auth/register` | 否 | 注册（仅 student/teacher；admin 由系统预置） |
| POST | `/api/auth/login` | 否 | 登录返回 JWT；停用账号返回 403 |
| POST | `/api/auth/logout` | 是 | 登出（客户端清 token） |
| GET  | `/api/auth/me` | 是 | 获取当前用户 |

### 活动（activities）

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| POST | `/api/activities` | 教师 | 发布活动（可带 requirement 资格说明、need_review 审核开关） |
| GET  | `/api/activities` | 是 | 活动列表（含 channel_state、registered_count、学生 my_reg_status） |
| GET  | `/api/activities/:id` | 是 | 活动详情 |

### 报名（registrations，学生）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/registrations` | 报名；需审核活动记 pending，否则 confirmed |
| POST | `/api/registrations/waitlist` | 满员申请候补，返回排队顺序 |
| POST | `/api/registrations/:id/cancel` | 取消已确认报名，同事务自动递补候补队首 |
| POST | `/api/registrations/:id/leave-waitlist` | 退出候补 |
| GET  | `/api/registrations/mine` | 我的报名（全部状态 + 候补排队顺序） |

### 教师端（teacher）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/teacher/activities` | 我发布的活动（含 confirmed/waitlisted/pending 计数） |
| GET | `/api/teacher/activities/:id/registrations` | 本人活动名单（区分状态） |
| GET | `/api/teacher/activities/:id/registrations/export` | 导出名单 CSV（UTF-8 BOM） |
| GET | `/api/teacher/activities/:id/pending` | 待审核申请列表 |
| POST| `/api/teacher/registrations/:id/review` | 审核（approve/reject），通过后按剩余名额转 confirmed/waitlisted |

### 管理员端（admin）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET  | `/api/admin/users` | 查看平台账号（支持 keyword/role 过滤） |
| POST | `/api/admin/users/:userNo/disable` | 停用账号（停用后无法登录） |
| POST | `/api/admin/users/:userNo/enable` | 恢复账号 |

## 关键验收场景

- 满员活动：学生申请候补 → 排队顺序正确；有人取消 → 候补队首自动转已确认
- 需审核活动：学生报名 → 待审核；教师通过 → 按剩余名额转已确认/候补；教师拒绝 → 已取消
- 权限边界：教师不能看他人活动名单；学生不能访问教师/管理员接口；管理员停用账号后该账号无法登录
- 并发安全：报名/候补/取消/审核均在事务内加活动行锁（FOR UPDATE），人数统计只计 confirmed，不超发名额
