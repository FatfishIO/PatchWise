import { SamplePatch } from "../types";

export const SAMPLE_PATCHES: SamplePatch[] = [
  {
    id: "sample-xss-java-servlet",
    title: "Vá lỗ hổng XSS (Reflected Cross-Site Scripting) trong Java CommentServlet",
    description: "Khắc phục lỗ hổng XSS do in trực tiếp tham số người dùng (userName, comment) ra HTML bằng cách mã hóa dữ liệu đầu vào qua ESAPI / StringEscapeUtils",
    tag: "Security Patch",
    riskHint: "HIGH",
    diff: `diff --git a/src/main/java/com/example/CommentServlet.java b/src/main/java/com/example/CommentServlet.java
index a19f032..c87e914 100644
--- a/src/main/java/com/example/CommentServlet.java
+++ b/src/main/java/com/example/CommentServlet.java
@@ -1,25 +1,30 @@
 package com.example;
 
 import java.io.IOException;
 import java.io.PrintWriter;
 import javax.servlet.ServletException;
 import javax.servlet.http.HttpServlet;
 import javax.servlet.http.HttpServletRequest;
 import javax.servlet.http.HttpServletResponse;
+import org.apache.commons.text.StringEscapeUtils;
 
 public class CommentServlet extends HttpServlet {
     
     protected void doGet(HttpServletRequest request, HttpServletResponse response) 
             throws ServletException, IOException {
         
         // Lấy tham số từ URL: http://example.com/comment?name=John&msg=Hello
         String userName = request.getParameter("name");
         String comment = request.getParameter("msg");
         
         response.setContentType("text/html; charset=UTF-8");
         PrintWriter out = response.getWriter();
         
         out.println("<html>");
         out.println("<head><title>Comment Page</title></head>");
         out.println("<body>");
         out.println("<h1>User Comments</h1>");
         
-        // LỖ HỔNG XSS: Dữ liệu đầu vào từ người dùng được in trực tiếp ra HTML mà KHÔNG được mã hóa
-        out.println("<p><b>User:</b> " + userName + "</p>");
-        out.println("<p><b>Comment:</b> " + comment + "</p>"); 
+        // ĐÃ VÁ LỖ HỔNG XSS: Mã hóa toàn bộ HTML Entities trước khi render ra phản hồi
+        String safeUserName = userName != null ? StringEscapeUtils.escapeHtml4(userName) : "Anonymous";
+        String safeComment = comment != null ? StringEscapeUtils.escapeHtml4(comment) : "";
+        out.println("<p><b>User:</b> " + safeUserName + "</p>");
+        out.println("<p><b>Comment:</b> " + safeComment + "</p>");
         out.println("</body>");
         out.println("</html>");
     }
 }`,
  },
  {
    id: "sample-security-fix",
    title: "Vá lỗ hổng SQL Injection & Nâng cấp Mật khẩu",
    description: "Sửa lỗi bảo mật truy vấn thô và nâng cấp cơ chế băm mật khẩu từ MD5 sang Argon2id",
    tag: "Security Patch",
    riskHint: "HIGH",
    diff: `diff --git a/services/auth.service.js b/services/auth.service.js
index 4b82c1a..8f9e2d1 100644
--- a/services/auth.service.js
+++ b/services/auth.service.js
@@ -12,12 +12,18 @@ const db = require('../config/database');
-const crypto = require('crypto');
+const argon2 = require('argon2');

 exports.login = async (username, password) => {
-  // Vulnerable to SQL Injection and weak hashing
-  const md5Hash = crypto.createHash('md5').update(password).digest('hex');
-  const query = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + md5Hash + "'";
-  const result = await db.query(query);
+  // Parameterized query prevents SQL Injection
+  const query = 'SELECT id, username, password_hash, role FROM users WHERE username = $1 LIMIT 1';
+  const { rows } = await db.query(query, [username]);
+  
+  if (rows.length === 0) {
+    return null;
+  }
+  
+  const user = rows[0];
+  const isValid = await argon2.verify(user.password_hash, password);
+  if (!isValid) {
+    return null;
+  }
   
-  return result.rows[0];
+  return { id: user.id, username: user.username, role: user.role };
 };`,
  },
  {
    id: "sample-bugfix-payment",
    title: "Sửa lỗi Null Pointer & Race Condition khi Xử lý Thanh toán",
    description: "Bổ sung kiểm tra số dư âm, mutex lock tránh thanh toán kép (double spending)",
    tag: "Bug Fix",
    riskHint: "MEDIUM",
    diff: `diff --git a/src/controllers/paymentController.ts b/src/controllers/paymentController.ts
index c9011ef..53a4b01 100644
--- a/src/controllers/paymentController.ts
+++ b/src/controllers/paymentController.ts
@@ -45,18 +45,28 @@ export async function processPayment(req: Request, res: Response) {
   const { accountId, amount, currency } = req.body;
 
+  if (!amount || typeof amount !== 'number' || amount <= 0) {
+    return res.status(400).json({ error: 'Invalid transaction amount' });
+  }
+
+  // Acquire distributed lock to prevent duplicate concurrent debits
+  const lockKey = \`lock:account:\${accountId}\`;
+  const acquired = await redisClient.set(lockKey, 'locked', 'NX', 'EX', 5);
+  if (!acquired) {
+    return res.status(429).json({ error: 'Transaction is already in progress. Please retry.' });
+  }
+
   try {
     const account = await Account.findById(accountId);
-    if (!account) {
-      return res.status(404).json({ error: 'Account not found' });
-    }
+    if (!account || account.status !== 'ACTIVE') {
+      return res.status(404).json({ error: 'Account not found or inactive' });
+    }
 
-    account.balance -= amount;
-    await account.save();
+    if (account.balance < amount) {
+      return res.status(400).json({ error: 'Insufficient balance' });
+    }
+
+    account.balance = Number((account.balance - amount).toFixed(2));
+    await account.save();
     
     const receipt = await TransactionReceipt.create({
       accountId,
@@ -66,6 +76,8 @@ export async function processPayment(req: Request, res: Response) {
     return res.json({ success: true, receiptId: receipt.id });
   } catch (error) {
     return res.status(500).json({ error: 'Internal payment failure' });
+  } finally {
+    await redisClient.del(lockKey);
   }
 }`,
  },
  {
    id: "sample-performance-opt",
    title: "Tối ưu hóa Hiệu năng Tìm kiếm & Bộ đệm Bộ nhớ",
    description: "Giảm độ trễ API từ O(N) sang O(1) nhờ LRU Cache & Debounced Indexing",
    tag: "Performance",
    riskHint: "LOW",
    diff: `diff --git a/lib/productSearch.ts b/lib/productSearch.ts
index e56a12b..9a34ff1 100644
--- a/lib/productSearch.ts
+++ b/lib/productSearch.ts
@@ -1,15 +1,24 @@
 import { Product } from '../types';
+import { LRUCache } from 'lru-cache';
 
-export function searchProducts(products: Product[], query: string): Product[] {
-  if (!query) return products;
-  const lower = query.toLowerCase();
-  return products.filter(p => 
-    p.title.toLowerCase().includes(lower) || 
-    p.description.toLowerCase().includes(lower) ||
-    p.tags.some(t => t.toLowerCase().includes(lower))
-  );
-}
+const cache = new LRUCache<string, Product[]>({
+  max: 500,
+  ttl: 1000 * 60 * 5, // 5 minutes cache
+});
+
+export function searchProducts(products: Product[], query: string): Product[] {
+  if (!query.trim()) return products;
+  
+  const cacheKey = \`query:\${query.trim().toLowerCase()}:\${products.length}\`;
+  const cached = cache.get(cacheKey);
+  if (cached) {
+    return cached;
+  }
+
+  const terms = query.toLowerCase().split(/\\s+/);
+  const results = products.filter(p => {
+    const text = \`\${p.title} \${p.description} \${p.tags.join(' ')}\`.toLowerCase();
+    return terms.every(term => text.includes(term));
+  });
+  
+  cache.set(cacheKey, results);
+  return results;
+}`,
  },
  {
    id: "sample-breaking-schema",
    title: "Thay đổi Schema Database & Gỡ bỏ Trường Cũ (Breaking Change)",
    description: "Đổi tên thuộc tính từ `user_name` sang `full_name` và xóa trường deprecated `phone_number`",
    tag: "Breaking Change",
    riskHint: "HIGH",
    diff: `diff --git a/migrations/20260315_alter_users.sql b/migrations/20260315_alter_users.sql
index 0000000..c34d812 100644
--- a/migrations/20260315_alter_users.sql
+++ b/migrations/20260315_alter_users.sql
@@ -0,0 +1,7 @@
+-- DANGEROUS: Drops legacy columns without grace period
+ALTER TABLE users 
+  DROP COLUMN user_name,
+  DROP COLUMN phone_number,
+  ADD COLUMN full_name VARCHAR(255) NOT NULL,
+  ADD COLUMN phone_e164 VARCHAR(20);
diff --git a/src/routes/userRoutes.ts b/src/routes/userRoutes.ts
index a12e567..b89c341 100644
--- a/src/routes/userRoutes.ts
+++ b/src/routes/userRoutes.ts
@@ -10,8 +10,8 @@ router.get('/profile', async (req, res) => {
   const user = await getUser(req.userId);
   return res.json({
     id: user.id,
-    userName: user.user_name,
-    phoneNumber: user.phone_number,
+    fullName: user.full_name,
+    phone: user.phone_e164,
   });
 });`,
  },
  {
    id: "sample-refactor-async",
    title: "Tái cấu trúc: Callback Hell sang Async/Await & Custom Errors",
    description: "Làm sạch mã nguồn, thay thế callback lồng nhau bằng cú pháp async/await và xử lý lỗi tập trung",
    tag: "Refactoring",
    riskHint: "LOW",
    diff: `diff --git a/src/services/fileProcessor.ts b/src/services/fileProcessor.ts
index b872391..fa14920 100644
--- a/src/services/fileProcessor.ts
+++ b/src/services/fileProcessor.ts
@@ -1,22 +1,15 @@
-import fs from 'fs';
+import fs from 'fs/promises';
+import { AppError } from '../errors/AppError';
 
-export function processUserUpload(filePath: string, callback: (err: any, data?: any) => void) {
-  fs.readFile(filePath, 'utf8', (err, raw) => {
-    if (err) return callback(err);
-    try {
-      const parsed = JSON.parse(raw);
-      fs.writeFile(\`\${filePath}.bak\`, raw, (writeErr) => {
-        if (writeErr) return callback(writeErr);
-        callback(null, parsed);
-      });
-    } catch (parseErr) {
-      callback(parseErr);
-    }
-  });
+export async function processUserUpload(filePath: string) {
+  try {
+    const raw = await fs.readFile(filePath, 'utf8');
+    const parsed = JSON.parse(raw);
+    await fs.writeFile(\`\${filePath}.bak\`, raw);
+    return parsed;
+  } catch (error: any) {
+    throw new AppError(\`Failed to process file at \${filePath}: \${error.message}\`, 422);
+  }
 }`,
  },
];
