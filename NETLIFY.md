# Sen uchun do‘konini Netlify orqali ochish

Bu paketda saytning ko‘rinadigan qismi Netlify’da, buyurtmalar, admin panel, D1 va shaxsiy R2 ombori o‘z Cloudflare hisobingizda ishlaydi. Ikkala xizmatni ham sozlang. ZIPni Netlify Drop oynasiga tashlash to‘liq do‘konni ishga tushirmaydi.

1. ISHGA_TUSHIRISH.md bo‘yicha o‘z Cloudflare hisobingizda Worker, D1 va R2 ni ishga tushiring. Worker HTTPS manzilini saqlab oling. Bu manzil oxiri workers.dev yoki o‘zingiz ulagan domen bo‘ladi.
2. Paketni oching. netlify.toml turgan jildni GitHub repozitoriy ildiziga joylang. Netlify’da shu repozitoriyni import qiling. Build command va publish directory netlify.toml dan olinadi.
3. Netlify build muhiti uchun SHOP_API_ORIGIN qiymatiga Worker manzilini kiriting (masalan https://sen-uchun.YOUR-SUBDOMAIN.workers.dev). Buildni ishga tushiring.
4. Cloudflare Worker sozlamasiga STOREFRONT_ORIGIN o‘zgaruvchisini kiriting. Qiymati Netlify saytining aynan HTTPS manzili, oxirida / bo‘lmasin. Masalan https://YOUR-SHOP.netlify.app. Custom domen ishlatsangiz aynan xaridor ochadigan domenni kiriting.
5. Saytni Netlify manzilida oching. /admin da Cloudflare uchun belgilangan login va parol bilan kiring. Rasm bilan sinov buyurtmasi bering va admin paneldan asl suratni oching. Netlify proksi kanali orqali 10 MB sinovni reklama berishdan oldin haqiqiy manzilda bajaring.

## Ishlayotgan do‘konni yangilash

Avvalgi wrangler.json va mavjud D1, R2 hamda Worker sozlamalarini saqlang. Shu loyihada quyidagi buyruqlarni bajaring, so‘ng Netlify uchun yangilangan kodni GitHub ga yuboring.

```powershell
npx wrangler@4 d1 migrations apply sen-uchun --remote
npx wrangler@4 deploy
```

Sayt manzilini saqlang. Yangi buyurtma yuborilgach, xaridor shu brauzerda do‘konni qayta ochib «Buyurtmalarim» tugmasini bosadi. Inkognito yoki sayt xotirasini tozalash shaxsiy tarixga kirishni uzadi. Oldingi buyurtmalar admin panelida qoladi.
