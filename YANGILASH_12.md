# Telegram, mahsulot ulashish va sen-uchun.uz

Kod tayyor; haqiqiy DNS va hosting hisoblarida o‘zgarish hali bajarilmagan.

## Yangilash
ZIP ichidagi public, server, scripts va hujjatlarni loyihangizga ko‘chiring. O‘zingizdagi wrangler.json, maxfiy kalitlar va .git papkasini saqlang. ZIPda haqiqiy wrangler.json yo‘q.
PowerShell’da loyiha papkasidan ketma-ket bajaring:

```powershell
node scripts/configure-domain.mjs
npx wrangler@4 deploy
git add public server scripts YANGILASH_12.md
git commit -m "Add product sharing and custom domain support"
git push
```
Netlify GitHub bilan ulangan bo‘lsa avtomatik deploy tugashini kuting. SHOP_API_ORIGIN o‘zgarmaydi: https://sen-uchun.sen-uchun.workers.dev. Bu yangilanish yangi migratsiya talab qilmaydi.

## Netlify va Eskiz
1. Netlify’da sen-uchun-onlineshop loyihasi → Domain management → Production domains → Add a domain: sen-uchun.uz. www.sen-uchun.uz ham borligini tekshiring.
2. Pending DNS verification oynasini oching: aynan shu loyiha uchun ko‘rsatilgan yozuvlar ustun hisoblanadi.
3. my.eskiz.uz/domains orqali sen-uchun.uz sozlamalarini oching. DNS yozuvlarini tahrirlash mavjud bo‘lsa quyidagilarni kiriting (Netlify Standard tarmog‘i):

| Turi | Nomi | Qiymati |
| --- | --- | --- |
| A | @ | 75.2.60.5 |
| CNAME | www | sen-uchun-onlineshop.netlify.app |

ALIAS/ANAME qo‘llansa @ uchun A o‘rniga apex-loadbalancer.netlify.com ishlatish tavsiya etiladi. Ikkalasini birga qo‘ymang. Faqat shu saytga tegishli ziddiyatli eski A/AAAA/CNAME yozuvlarini almashtiring; MX/TXT pochta yozuvlarini saqlang.
4. Eskiz’da faqat NS almashtirish mavjud bo‘lsa: Netlify’da Set up Netlify DNS orqali berilgan barcha nameserverlarni Eskiz’dagi NS maydonlariga aynan ko‘chiring. NS qiymatlarini taxmin qilmang. Pochta ishlatilsa uning DNS yozuvlarini avval yangi zonaga ko‘chiring.
5. DNS tarqalgach Netlify HTTPS/SSL holatini tekshiring; sen-uchun.uz ni Primary domain qiling. DNS odatda bir necha soat, ayrim holatda 48 soatgacha tarqaladi.
6. https://sen-uchun.uz saytida katalog, admin kirish, buyurtma yuborish va mahsulot ulashishni sinang. Yangi domen boshqa origin bo‘lgani uchun eski brauzer lokal savat/saqlangan kuzatuv havolalari avtomatik ko‘chmaydi; bazadagi buyurtmalar saqlanadi. Eski shaxsiy kuzatuv havolalarini saqlang.

## O‘zgargan funksiyalar
- Footer Telegram: https://t.me/sen_uchun50. Sotuvchi bilan to‘lov chati avvalgi sozlamada qoldi.
- Kartada va mahsulot ichida Ulashish tugmasi. Havola ?product=ID orqali aynan mahsulotni ochadi, shaxsiy buyurtma tokenini ulashmaydi.
- Telegram, nusxalash, qo‘llab-quvvatlangan brauzerlarda tizim ulashish oynasi.
- Ulashuv preview rasmi umumiy do‘kon rasmi; mahsulotga xos server OG rasmi bu yangilanishda yo‘q.
- Canonical, OG va sitemap yangi domen bilan sozlandi.
- configure-domain skripti yangi domenlarni aniq ruxsat ro‘yxatiga kiritadi, DB/R2 sozlamalarini saqlaydi va zaxira oladi.

Tekshirildi: build, uzun tavsif va mahsulot sharhlari testi, asosiy server tekshiruvi, mahsulot havolasi/token ajratilishi, domen sozlamalarining saqlanishi. Vizual brauzer tekshiruvi bajarilmadi.
Rasmiy DNS qo‘llanmasi: https://docs.netlify.com/manage/domains/configure-domains/configure-external-dns/
