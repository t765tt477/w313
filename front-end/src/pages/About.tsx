export default function About() {
  return (
    <div className="min-h-screen bg-white font-sans" dir="rtl">
      {/* Stats bar */}
      <section className="bg-green-50 border-y border-green-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 top-spacing">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: "12,850+", label: "طلب مكتمل", icon: "✓" },
              { value: "2,400+", label: "مندوب معتمد", icon: "🛵" },
              { value: "98%", label: "رضا العملاء", icon: "⭐" },
              { value: "18 دقيقة", label: "متوسط التوصيل", icon: "⚡" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-sm font-black text-green-700">
                  {s.value}
                </div>
                <div className="text-slate-500 text-sm mt-1 font-medium">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6">
          <h2 className="text-base  lg:text-lg font-black text-slate-900 mb-4">
            كل ما تحتاجه في منصة واحدة
          </h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            وصل مصمم ليكون الأسرع والأسهل — من لحظة إنشاء الطلب حتى لحظة
            التسليم
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: (
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-green-600">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
              ),
              title: "تحديد الموقع بدقة",
              desc: "تقنية GPS لتحديد موقع الاستلام والتسليم على الخريطة بدقة متناهية",
              color: "bg-green-50 border-green-200",
            },
            {
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  className="w-6 h-6 fill-yellow-500"
                >
                  <path d="M13 2.05v2.02c3.95.49 7 3.85 7 7.93 0 3.21-1.81 6-4.72 7.28L13 17v5h5l-1.22-1.22C19.91 19.07 22 15.76 22 12c0-5.18-3.95-9.45-9-9.95zM11 2.05C5.95 2.55 2 6.82 2 12c0 3.76 2.09 7.07 5.22 8.78L6 22h5v-5l-2.28 2.28C7.81 18 6 15.21 6 12c0-4.08 3.05-7.44 7-7.93V2.05z" />
                </svg>
              ),
              title: "اختيار أقرب مندوب",
              desc: "يتم اختيار المندوب الأقرب لموقعك تلقائيًا لضمان أسرع توصيل ممكن",
              color: "bg-yellow-50 border-yellow-200",
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-green-600">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                </svg>
              ),
              title: "تتبع مباشر آمن",
              desc: "تابع رحلة طلبك خطوة بخطوة على الخريطة حتى يصل إلى بابك",
              color: "bg-green-50 border-green-200",
            },
            {
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  className="w-6 h-6 fill-yellow-500"
                >
                  <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
                </svg>
              ),
              title: "إشعارات فورية",
              desc: "تنبيهات لحظية بكل تغيير في حالة طلبك — من القبول حتى التسليم",
              color: "bg-yellow-50 border-yellow-200",
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-green-600">
                  <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L12 15.45 7.77 18l1.12-4.81-3.73-3.23 4.92-.42L12 5l1.92 4.53 4.92.42-3.73 3.23L16.23 18z" />
                </svg>
              ),
              title: "تقييم الخدمة",
              desc: "قيّم تجربتك وساعد في رفع مستوى الخدمة وتحفيز المندوبين المتميزين",
              color: "bg-green-50 border-green-200",
            },
            {
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  className="w-6 h-6 fill-yellow-500"
                >
                  <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
                </svg>
              ),
              title: "أسعار شفافة",
              desc: "احسب تكلفة التوصيل مسبقًا بناءً على المسافة والوزن والحجم بدون مفاجآت",
              color: "bg-yellow-50 border-yellow-200",
            },
          ].map((f) => (
            <div
              key={f.title}
              className={`${f.color} border rounded-2xl p-4 hover:shadow-md transition-shadow`}
            ><div className="flex items-center gap-1.5">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm mb-4">
                  {f.icon}
                </div>
                <h3 className="font-black text-slate-900 text-base mb-2">
                  {f.title}
                </h3>
              </div>
              <p className="text-slate-600 leading-relaxed text-sm">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-green-500/10 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-base  lg:text-lg font-black text-green-600 mb-4">
              كيف يعمل وصل؟
            </h2>
            <p className="text-yellow-600 text-lg">
              ثلاث خطوات بسيطة لتوصيل طلبك
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* connector line */}
            <div className="hidden md:block absolute top-12 right-1/6 left-1/6 h-0.5 bg-gradient-to-r from-green-500 via-yellow-400 to-green-500 opacity-30" />
            {[
              {
                step: "١",
                title: "حدد موقعك",
                desc: "أدخل نقطة الاستلام والتسليم على الخريطة واحسب التكلفة",
                color: "bg-green-500 text-white",
              },
              {
                step: "٢",
                title: "اختر المندوب",
                desc: "يتم اختيار أقرب مندوب تلقائيًا ويصلك خلال دقائق",
                color: "text-yellow-600 bg-white",
              },
              {
                step: "٣",
                title: "تابع وتقيّم",
                desc: "تتبع طلبك مباشرة ثم قيّم تجربتك بعد الاستلام",
                color: "bg-yellow-400 text-green-600",
              },
            ].map((s) => (
              <div key={s.step} className="text-center relative z-10">
                <div
                  className={`${s.color} w-12 h-12 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl`}
                >
                  <span className="text-2xl font-black">{s.step}</span>
                </div>
                <h3 className="text-xl font-black text-green-600 mb-3">
                  {s.title}
                </h3>
                <p className="text-yellow-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing formula */}
      <section className="py-8 bg-yellow-500 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl p-4 shadow-lg bg-white">
          <h3 className="text-base font-bold mb-2">طرق الدفع المتاحة</h3>
          <p className="text-lg font-bold "><span className="text-blue-600">كاش</span> أو <span className="text-red-600">بنكك</span></p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-green-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                    <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4z" />
                  </svg>
                </div>
                <span className="text-xl font-black">وصل</span>
              </div>
              <p className="text-green-300 text-sm leading-relaxed">
                منصة توصيل داخل المدينة — سريع، آمن، موثوق
              </p>
            </div>
            {[
              {
                title: "الخدمات",
                links: [
                  "توصيل الطلبات",
                  "توصيل المطاعم",
                  "توصيل الأدوية",
                  "خدمة المتاجر",
                ],
              },
              {
                title: "للمندوبين",
                links: [
                  "سجّل كمندوب",
                  "الشروط والمتطلبات",
                  "الأرباح والعمولات",
                  "الدعم الفني",
                ],
              },
              {
                title: "الشركة",
                links: [
                  "من نحن",
                  "تواصل معنا",
                  "سياسة الخصوصية",
                  "الشروط والأحكام",
                ],
              },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="font-bold text-white mb-3">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-green-300 text-sm hover:text-yellow-300 transition-colors"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-green-700 mt-8 pt-6 text-center text-green-400 text-sm">
            © 2025 وصل — جميع الحقوق محفوظة
          </div>
        </div>
      </footer>
    </div>
  );
}
