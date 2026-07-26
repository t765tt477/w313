import { MapPin, RefreshCw, Shield, MessageSquare, Star, Zap, Truck, Clock, DollarSign, CheckCircle } from 'lucide-react';

export default function About() {
  return (
    <div className="min-h-screen bg-white font-sans" dir="rtl">
      {/* Stats bar */}
      <section className="bg-green-50 border-y border-green-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 top-spacing">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: "12,850+", label: "طلب مكتمل", icon: CheckCircle },
              { value: "2,400+", label: "مندوب معتمد", icon: Truck },
              { value: "98%", label: "رضا العملاء", icon: Star },
              { value: "18 دقيقة", label: "متوسط التوصيل", icon: Zap },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="flex justify-center mb-2">
                  <s.icon className="w-6 h-6 text-green-600" />
                </div>
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
              icon: MapPin,
              title: "تحديد الموقع بدقة",
              desc: "تقنية GPS لتحديد موقع الاستلام والتسليم على الخريطة بدقة متناهية",
              color: "bg-green-50 border-green-200",
              iconColor: "text-green-600",
            },
            {
              icon: RefreshCw,
              title: "اختيار أقرب مندوب",
              desc: "يتم اختيار المندوب الأقرب لموقعك تلقائيًا لضمان أسرع توصيل ممكن",
              color: "bg-yellow-50 border-yellow-200",
              iconColor: "text-yellow-500",
            },
            {
              icon: Shield,
              title: "تتبع مباشر آمن",
              desc: "تابع رحلة طلبك خطوة بخطوة على الخريطة حتى يصل إلى بابك",
              color: "bg-green-50 border-green-200",
              iconColor: "text-green-600",
            },
            {
              icon: MessageSquare,
              title: "إشعارات فورية",
              desc: "تنبيهات لحظية بكل تغيير في حالة طلبك — من القبول حتى التسليم",
              color: "bg-yellow-50 border-yellow-200",
              iconColor: "text-yellow-500",
            },
            {
              icon: Star,
              title: "تقييم الخدمة",
              desc: "قيّم تجربتك وساعد في رفع مستوى الخدمة وتحفيز المندوبين المتميزين",
              color: "bg-green-50 border-green-200",
              iconColor: "text-green-600",
            },
            {
              icon: DollarSign,
              title: "أسعار شفافة",
              desc: "احسب تكلفة التوصيل مسبقًا بناءً على المسافة والوزن والحجم بدون مفاجآت",
              color: "bg-yellow-50 border-yellow-200",
              iconColor: "text-yellow-500",
            },
          ].map((f) => (
            <div
              key={f.title}
              className={`${f.color} border rounded-2xl p-4 hover:shadow-md transition-shadow`}
            ><div className="flex items-center gap-1.5">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm mb-4">
                  <f.icon className={`w-6 h-6 ${f.iconColor}`} />
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
                  <Truck className="w-4 h-4 text-white" />
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
