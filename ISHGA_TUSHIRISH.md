# Sen uchun · Cloudflare hisobiga joylash

Bu paket do‘konning kodi, mahsulot namunalari, rasmlari va baza sxemasini o‘z ichiga oladi. Ishlayotgan do‘kondagi xaridor suratlari, buyurtmalar, statistika va keyin qo‘shilgan mahsulotlar arxivga kiritilmagan. Hisoblar orasida ularni ko‘chirish kerak bo‘lsa, oldin eski bazadan himoyalangan eksport va yangi hisobga import qiling. Eski buyurtmalarning D1 dagi suratlarini ham server o‘qiy oladi.

## Windows va VS Code

1. Node.js 24 LTS o‘rnating. ZIP faylni oching, package.json turgan jildni VS Code’da oching. Terminalda quyidagi sinovni bajaring.

```powershell
node scripts/build.mjs
node scripts/build.mjs --cloudflare
node scripts/verify.mjs
```

2. O‘z Cloudflare hisobingizga kiring va resurslar yarating. R2 xizmatini faollashtirish hisobingizda talab qilinishi mumkin. Bu buyruqlar haqiqiy bulut resurslarini yaratadi.

```powershell
npx wrangler@4 login
npx wrangler@4 d1 create sen-uchun
npx wrangler@4 r2 bucket create sen-uchun-files
Copy-Item wrangler.example.json wrangler.json
```

3. wrangler.json ichidagi REPLACE_WITH_DATABASE_ID o‘rniga oldingi buyruq chiqargan database_id ni yozing. R2 bucket uchun ommaviy r2.dev manzilini yoqmang. Katalog fayllarini sayt alohida yo‘l bilan beradi. Mijoz suratlari himoyalangan yo‘ldan olinadi.

4. Bazani tayyorlang, admin parolini kiriting va saytni joylang. Sir so‘ralganda uzunligi kamida 24 belgili, tasodifiy, alohida parol kiriting. Agar Wrangler avval bo‘sh Worker yaratishni so‘rasa, tasdiqlang. Parolni Git yoki konfiguratsiya fayliga yozmang.

```powershell
npx wrangler@4 d1 migrations apply sen-uchun --remote
npx wrangler@4 secret put ADMIN_PASSWORD
npx wrangler@4 deploy
```

5. Chiqqan HTTPS manzilni oching. Admin uchun manzilning oxiriga /admin qo‘shing. Login **admin**, parol esa 4-bosqichda kiritilgan parol. Bu Cloudflare nusxasiga tegishli. ChatGPT Sites versiyasi o‘z egasining tasdiqlangan akkauntidan foydalanadi.

6. Agar asl surat Telegram bot orqali ham kelishi kerak bo‘lsa, bot bilan shaxsiy chatda Start bosing va tegishli bot tokeni va chat ID ni maxfiy qiymat sifatida kiriting.

```powershell
npx wrangler@4 secret put TELEGRAM_BOT_TOKEN
npx wrangler@4 secret put TELEGRAM_ADMIN_CHAT_ID
```

7. Reklama berishdan oldin yangi manzilda telefon orqali bitta haqiqiy rasm bilan buyurtma yuboring, boshqa brauzerda admin sifatida asl suratni oching. Xaridor rejimida buyurtma ro‘yxati va surat manzili rad etilishini tekshiring. D1 va R2 ishlatilishini Cloudflare panelida kuzating. Mahalliy sinov Cloudflare tarmog‘idagi kechikish va tarif kvotalarini o‘lchamaydi.

## Tuzilishi

- public — mijoz sahifalari, uslublar va tayyor rasmlar
- server — buyurtmalar, katalog, admin va kirish tekshiruvlari
- drizzle — ketma-ket bajariladigan baza migratsiyalari
- scripts — yig‘ish, mahalliy sinov serveri va regressiya/yuklama sinovi

Yangi buyurtma suratlari R2 da saqlanadi. Katalog narxi yangilanganda keshlangan javob boshqa nuqtalarda 15 soniyagacha eski bo‘lishi mumkin. Mahalliy sinov bazasi va fayl ombori vaqtinchalik.
