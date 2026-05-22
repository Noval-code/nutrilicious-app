
import Image from "next/image";

export function HeroSection() {
  return (
    <section className="relative w-full min-h-[85vh] flex flex-col justify-center items-center py-20 overflow-hidden bg-white">

      {/* Gambar Piring Utama (Layer Paling Bawah Kiri, mix-blend-multiply) */}
      {/* Menggunakan negative bottom & left agar gambar sebagian terpotong di pojok */}
      <div className="absolute -bottom-10 -left-32 md:-left-40 lg:-left-32 xl:-left-16 w-[300px] md:w-[400px] lg:w-[450px] xl:w-[550px] z-0 pointer-events-none mix-blend-multiply opacity-90">
        <Image
          src="https://res.cloudinary.com/daxxzeeyr/image/upload/v1779383063/nutrilicious/static/wynqw0vjk84mqay361jg.jpg"
          alt="Plate background"
          width={600}
          height={600}
          className="object-contain"
          priority
          sizes="(max-width: 768px) 300px, (max-width: 1024px) 400px, 550px"
        />
      </div>

      {/* Gambar Elemen Pendukung Melayang (Brokoli & Tomat) */}
      <div className="absolute top-[10%] left-[15%] w-[80px] md:w-[120px] animate-[bounce_5s_infinite] mix-blend-multiply z-0 pointer-events-none drop-shadow-md">
        <Image src="https://res.cloudinary.com/daxxzeeyr/image/upload/v1779383064/nutrilicious/static/pk9rmjo6djngmv2ahr7g.png" alt="Brokoli" width={120} height={120} className="object-contain" loading="lazy" sizes="(max-width: 768px) 80px, 120px" />
      </div>
      <div className="absolute top-[20%] right-[10%] w-[70px] md:w-[110px] animate-[pulse_4s_infinite] mix-blend-multiply z-0 pointer-events-none rotate-45 drop-shadow-md">
        <Image src="https://res.cloudinary.com/daxxzeeyr/image/upload/v1779383066/nutrilicious/static/a37jj4jsbdslvqw27m48.png" alt="Tomat" width={110} height={110} className="object-contain" loading="lazy" sizes="(max-width: 768px) 70px, 110px" />
      </div>
      <div className="absolute bottom-[25%] right-[5%] lg:right-[15%] w-[90px] md:w-[130px] animate-[bounce_6s_infinite] mix-blend-multiply z-0 pointer-events-none -rotate-12 drop-shadow-md">
        <Image src="https://res.cloudinary.com/daxxzeeyr/image/upload/v1779383064/nutrilicious/static/pk9rmjo6djngmv2ahr7g.png" alt="Brokoli" width={130} height={130} className="object-contain" loading="lazy" sizes="(max-width: 768px) 90px, 130px" />
      </div>
      <div className="absolute bottom-[40%] align-middle left-[2%] lg:left-[8%] w-[50px] md:w-[70px] animate-[pulse_5s_infinite] mix-blend-multiply z-0 pointer-events-none rotate-[130deg] drop-shadow-md opacity-70">
        <Image src="https://res.cloudinary.com/daxxzeeyr/image/upload/v1779383066/nutrilicious/static/a37jj4jsbdslvqw27m48.png" alt="Tomat" width={80} height={80} className="object-contain" loading="lazy" sizes="(max-width: 768px) 50px, 70px" />
      </div>

      {/* Latar belakang lengkungan mirip inspirasi */}
      <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden leading-none z-0">
        <svg className="relative block w-full h-[60px] md:h-[120px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V0C71.39,28.27,156.4,49.88,252.89,56.44Z" className="fill-slate-50/80"></path>
        </svg>
      </div>

      {/* Teks Konten Utama (z-10, Posisi Tengah) */}
      <div className="container relative z-10 mx-auto px-4 md:px-6 flex flex-col items-center text-center space-y-10">

        {/* Latar transparan untuk memastikan teks tetap terbaca berlapis di atas gambar menu */}
        <div className="space-y-6 max-w-4xl bg-white/60 backdrop-blur-md p-6 md:p-10 rounded-3xl lg:bg-transparent lg:backdrop-blur-none transition-all mt-4 md:mt-0">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-foreground leading-[1.15]">
            <span className="text-primary block mb-3 font-black text-5xl sm:text-6xl md:text-7xl tracking-tighter">Nutrilicious Food</span>
            Fuel Your Day<br className="hidden md:block" /> The Healthy Way
          </h1>
          <p className="mx-auto max-w-[700px] text-slate-600 md:text-lg lg:text-xl font-medium leading-relaxed mt-6">
            Solusi katering lezat bergizi untuk mendukung target personal Anda. Kami percaya makanan sehat tidak harus membosankan, karena <span className="font-bold text-primary tracking-wide bg-primary/10 px-3 py-1 rounded-full whitespace-nowrap">#DietHarusEnak</span>.
          </p>
        </div>



        {/* Trust Badges */}
        {/* <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12 mt-8 md:mt-12 bg-white/80 backdrop-blur-sm px-8 py-5 rounded-full shadow-sm z-20 border border-slate-100">
          <div className="flex items-center gap-2 md:gap-3 text-sm md:text-base font-bold text-slate-800">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
            Pengiriman Tepat Waktu
          </div>
          <div className="flex items-center gap-2 md:gap-3 text-sm md:text-base font-bold text-slate-800">
            <span className="text-yellow-500 text-xl">⭐</span>
            <span>100+ <span className="text-primary underline decoration-primary/40 leading-relaxed underline-offset-4 cursor-pointer hover:text-primary/80">5.0 Reviews</span></span>
          </div>
          <div className="flex items-center gap-2 md:gap-3 text-sm md:text-base font-bold text-slate-800">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" /></svg>
            Women-Owned Business
          </div>
        </div> */}

      </div>
    </section>
  );
}
