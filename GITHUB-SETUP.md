# إعداد GitHub Actions للإيميل التلقائي

## الخطوات المطلوبة:

### 1. رفع الكود إلى GitHub
```bash
git add .
git commit -m "Add GitHub Actions email automation"
git push origin main
```

### 2. إعداد GitHub Secrets
اذهب إلى repository في GitHub ثم:
- Settings → Secrets and variables → Actions
- اضغط "New repository secret" وأضف:

```
EMAIL_HOST = smtp.gmail.com
EMAIL_PORT = 587
EMAIL_USER = MO.ALAMIR52@GMAIL.COM
EMAIL_PASS = juek uioe jhig dirl
EMAIL_TO = M.ALAMIR@IYELO.COM
```

### 3. تفعيل GitHub Actions
- اذهب إلى تبويب "Actions" في repository
- اضغط "I understand my workflows, go ahead and enable them"

### 4. اختبار التشغيل اليدوي
- اذهب إلى Actions → Staff Email Automation
- اضغط "Run workflow" → "Run workflow"

## الجدولة التلقائية:
- يعمل كل يوم في الساعة 9:00 صباحاً (توقيت الرياض)
- يمكن تشغيله يدوياً في أي وقت

## ملاحظات:
- GitHub Actions مجاني للـ public repositories
- للـ private repositories: 2000 دقيقة مجاناً شهرياً
- كل تشغيل يستغرق حوالي 1-2 دقيقة