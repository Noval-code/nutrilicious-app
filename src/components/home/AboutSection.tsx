"use client";

import React from 'react';
import { Heart, Leaf, Award, Users, Clock } from 'lucide-react';

export function AboutSection() {
    return (
        <section id="tentang" className="w-full relative py-20 md:py-28 font-sans bg-white overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-0 left-0 w-72 h-72 bg-[#005D33]/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#F9A826]/5 rounded-full translate-x-1/3 translate-y-1/3" />

            <div className="container mx-auto px-4 md:px-6 relative z-10">

                {/* Section Header */}
                <div className="text-center mb-16 md:mb-20">
                    <h2 className="text-[#005D33] font-bold tracking-widest text-xs md:text-sm uppercase mb-3">
                        Kenali Kami
                    </h2>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight">
                        Tentang Nutrilicious
                    </h1>
                    <p className="mt-4 text-slate-500 max-w-2xl mx-auto text-sm md:text-base">
                        Kami hadir untuk membuktikan bahwa makanan sehat bisa lezat, praktis, dan terjangkau untuk semua orang.
                    </p>
                </div>

                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-14 items-center">
                        
                        {/* Left: Story + Values */}
                        <div className="space-y-6">
                            <div className="inline-flex items-center gap-2 bg-[#005D33]/10 text-[#005D33] px-4 py-2 rounded-full text-sm font-bold">
                                <Heart className="w-4 h-4 text-[#F9A826]" />
                                Cerita Kami
                            </div>
                            <h3 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight leading-tight">
                                Dari Dapur Kecil Menjadi <span className="text-[#005D33]">Catering Sehat</span> Pilihan Kota Tegal
                            </h3>
                            <p className="text-slate-500 leading-relaxed">
                                Nutrilicious Food lahir dari keyakinan bahwa setiap orang berhak mendapatkan makanan sehat tanpa mengorbankan cita rasa. Berawal dari dapur rumahan, kini kami melayani ratusan pelanggan setia dengan menu-menu bergizi yang disiapkan oleh tim berpengalaman.
                            </p>
                            <p className="text-slate-500 leading-relaxed">
                                Setiap menu dirancang khusus oleh ahli gizi dengan bahan-bahan segar berkualitas. Kami percaya, pola makan yang tepat adalah investasi terbaik untuk kesehatan jangka panjang Anda.
                            </p>

                            {/* Values Grid */}
                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <div className="bg-slate-50 rounded-2xl p-4 border border-gray-100 hover:border-[#005D33]/20 transition-colors group">
                                    <div className="w-10 h-10 rounded-xl bg-[#005D33]/10 text-[#005D33] flex items-center justify-center mb-3 group-hover:bg-[#005D33] group-hover:text-white transition-all">
                                        <Leaf className="w-5 h-5" />
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-sm">100% Bahan Segar</h4>
                                    <p className="text-xs text-slate-400 mt-1">Tanpa pengawet & bahan kimia</p>
                                </div>
                                <div className="bg-slate-50 rounded-2xl p-4 border border-gray-100 hover:border-[#005D33]/20 transition-colors group">
                                    <div className="w-10 h-10 rounded-xl bg-[#F9A826]/10 text-[#F9A826] flex items-center justify-center mb-3 group-hover:bg-[#F9A826] group-hover:text-white transition-all">
                                        <Award className="w-5 h-5" />
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-sm">Menu Bersertifikat</h4>
                                    <p className="text-xs text-slate-400 mt-1">Disusun ahli gizi profesional</p>
                                </div>
                                <div className="bg-slate-50 rounded-2xl p-4 border border-gray-100 hover:border-[#005D33]/20 transition-colors group">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-sm">100+ Pelanggan</h4>
                                    <p className="text-xs text-slate-400 mt-1">Kepercayaan yang terus tumbuh</p>
                                </div>
                                <div className="bg-slate-50 rounded-2xl p-4 border border-gray-100 hover:border-[#005D33]/20 transition-colors group">
                                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-sm">Antar Tepat Waktu</h4>
                                    <p className="text-xs text-slate-400 mt-1">Pengiriman setiap hari</p>
                                </div>
                            </div>
                        </div>

                        {/* Right: Map */}
                        <div className="rounded-3xl overflow-hidden shadow-lg border border-gray-100 aspect-[4/3]">
                            <iframe
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3960.5!2d109.1421!3d-6.8818!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e6fb9e2d95a3341%3A0x6e26e87c67cd577a!2sJl.%20Arum%20Blk.%20B%20III%20No.3%2C%20Randugunting%2C%20Kec.%20Tegal%20Sel.%2C%20Kota%20Tegal%2C%20Jawa%20Tengah%2052131!5e0!3m2!1sid!2sid!4v1700000000000!5m2!1sid!2sid"
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                allowFullScreen
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                title="Lokasi Nutrilicious Food"
                                className="w-full h-full"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
