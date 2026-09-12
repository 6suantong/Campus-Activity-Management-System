# 校园活动管理系统 V1.0

> 本仓库当前进度：**REQ-01**（用户注册 / 登录 / 登出）已实现。

## 技术栈

| 层 | 选型 |
|---|---|
| 后端 | Node.js + Express + MySQL + JWT + bcryptjs |
| 前端 | Vue 3 + Vite + vue-router + axios |
| 分支策略 | main（稳定）+ develop（开发）+ feature/*（特性分支）|

## 目录结构

```
git/
├── server/                   # 后端
│   ├── sql/01_users.sql       # users 建表脚本
│   ├── src/
│   │   ├── config/db.js       # MySQL 连接池
│   │   ├── middleware/auth.js # JWT 校验中间件
│   │   ├── routes/auth.js     # register / login / logout / me
│   │   ├── utils/errors.js    # 统一响应包装
│   │   ├── scripts/init-db.js # 一键建库建表
│   │   └── app.js             # 服务入口
│   ├── .env.example
│   └── package.json
└── client/                   # 前端
    ├── src/
    │   ├── api/auth.js        # 认证 API
    │   ├── router/index.js    # 路由与守卫
    │   ├── utils/auth.js      # token / user 本地存储
    │   ├── utils/request.js   # axios 拦截器
    │   ├── views/
    │   │   ├── Login.vue
    │   │   ├── Register.vue
    │   │   └── Activities.vue # 占位，后续 REQ-02/03 实现
    │   ├── App.vue
    │   ├── main.js
    │   └── style.css
    ├── index.html
    ├── vite.config.js
    └── package.json
```

## 运行

### 1. 后端

```bash
cd server
cp .env.example .env        # 按需修改数据库密码与 JWT_SECRET
npm install
npm run init-db             # 创建数据库与 users 表
npm run dev                 # 启动 http://localhost:3000
```

### 2. 前端

```bash
cd client
npm install
npm run dev                 # 启动 http://localhost:5173（自动代理 /api 到后端）
```

## API 一览（REQ-01）

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| POST | `/api/auth/register` | 否 | 注册：user_no + password + name + role(student/teacher) |
| POST | `/api/auth/login` | 否 | 登录返回 JWT |
| POST | `/api/auth/logout` | 是 | 登出（客户端清 token） |
| GET  | `/api/auth/me` | 是 | 获取当前用户（守卫校验用） |

## 验收对应（与实验报告 TEST-01~03 对应）

- 未注册账号登录 → 提示"账号不存在"
- 正确凭证登录 → 签发 JWT，写入 localStorage，跳转 /activities
- 退出后用旧 token 访问受保护接口 → 返回 401，前端路由守卫拦截回登录页
