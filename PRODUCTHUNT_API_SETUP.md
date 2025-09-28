# Product Hunt API 配置指南

## 获取 Product Hunt API Token

1. **访问 Product Hunt 开发者页面**
   - 前往 https://www.producthunt.com/apps
   - 点击 "Create an app" 或登录后管理你的应用

2. **创建新应用**
   - 填写应用名称（例如：Daily Agent）
   - 填写应用描述
   - 设置 Redirect URI (可以使用 `http://localhost:3000` 用于开发)

3. **获取 API Token**
   - 创建应用后，你会获得以下凭证：
     - Client ID
     - Client Secret
   - 使用这些凭证获取 Access Token

4. **获取 Access Token 的两种方式**

   ### 方式 1: Client Credentials Token（推荐用于只读公开数据）

   ```bash
   curl -X POST https://api.producthunt.com/v2/oauth/token \
     -d 'client_id=YOUR_CLIENT_ID' \
     -d 'client_secret=YOUR_CLIENT_SECRET' \
     -d 'grant_type=client_credentials'
   ```

   返回示例:
   ```json
   {
     "access_token": "your_access_token_here",
     "token_type": "Bearer",
     "scope": "public",
     "created_at": 1234567890
   }
   ```

   ### 方式 2: 使用 OAuth 2.0 流程（需要用户授权）

   如果需要访问用户特定数据，需要完整的 OAuth 流程。

## 配置环境变量

将获取的 Access Token 添加到项目的 `.env.local` 文件：

```bash
# Product Hunt API Token
PRODUCTHUNT_API_TOKEN=your_access_token_here
```

## 验证配置

重启开发服务器后，应用会自动使用 Product Hunt API 获取真实的每日热门产品数据。

如果未配置 `PRODUCTHUNT_API_TOKEN`，系统会使用备用数据源或本地数据。

## API 限制

- Product Hunt API 有速率限制
- 建议在生产环境中实现缓存机制
- 遵守 Product Hunt 的使用条款

## 参考链接

- Product Hunt API 文档: https://api.producthunt.com/v2/docs
- Product Hunt GraphQL Explorer: https://ph-graph-api-explorer.herokuapp.com/
- GitHub 示例代码: https://github.com/producthunt/producthunt-api