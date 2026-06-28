import { MapPin, Clock, Phone, Mail, ExternalLink } from 'lucide-react';

export function Footer() {
    return (
        <footer className="bg-gradient-to-br from-[#0a2e18] via-[#114C2A] to-[#1a663a] text-white">
            <div className="container mx-auto px-4 md:px-6 py-14 md:py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">

                    {/* Brand */}
                    <div className="lg:col-span-1">
                        <div className="flex items-center gap-3 mb-4">
                            <img
                                src="https://res.cloudinary.com/daxxzeeyr/image/upload/v1779722843/WhatsApp_Image_2026-05-25_at_22.22.11-removebg-preview_1_uerl99.png"
                                alt="Nutrilicious Logo"
                                width={40}
                                height={40}
                                className="w-10 h-10 object-contain"
                            />
                            <span className="text-xl font-extrabold tracking-tight">Nutrilicious Food</span>
                        </div>
                        <p className="text-white/50 text-sm leading-relaxed max-w-xs">
                            Cita Rasa Alam, Presisi Gizi Masa Depan. Layanan catering sehat premium untuk hidup yang lebih berkualitas.
                        </p>
                        {/* Social Links */}
                        <div className="flex items-center gap-3 mt-5">
                            <a href="#" className="w-9 h-9 rounded-xl bg-white/10 hover:bg-[#F9A826]/20 hover:text-[#F9A826] flex items-center justify-center transition-all" aria-label="Instagram">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                            </a>
                            <a href="#" className="w-9 h-9 rounded-xl bg-white/10 hover:bg-[#F9A826]/20 hover:text-[#F9A826] flex items-center justify-center transition-all" aria-label="Email">
                                <Mail className="w-4 h-4" />
                            </a>
                            <span className="text-xs text-white/30 ml-1">@nutriliciousfood</span>
                        </div>
                    </div>

                    {/* Alamat */}
                    <div>
                        <h4 className="font-bold text-sm uppercase tracking-widest text-[#F9A826] mb-4">Alamat</h4>
                        <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                                <MapPin className="w-4 h-4 text-[#F9A826]" />
                            </div>
                            <div>
                                <p className="text-sm text-white/70 leading-relaxed">
                                    Jl. Arum Blk. B III No.3, Randugunting, Kec. Tegal Sel., Kota Tegal, Jawa Tengah 52131
                                </p>
                                <a
                                    href="https://maps.app.goo.gl/qbuBiUyn6wi4hcpC9"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[#F9A826] text-xs font-bold mt-2 hover:underline"
                                >
                                    Buka di Google Maps <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Jam Operasional */}
                    <div>
                        <h4 className="font-bold text-sm uppercase tracking-widest text-[#F9A826] mb-4">Jam Operasional</h4>
                        <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                                <Clock className="w-4 h-4 text-[#F9A826]" />
                            </div>
                            <div>
                                <p className="text-sm text-white/70">Senin – Sabtu</p>
                                <p className="text-sm text-white/90 font-semibold">08.00 – 17.00 WIB</p>
                                <p className="text-xs text-white/40 mt-1">Minggu & hari libur tutup</p>
                            </div>
                        </div>
                    </div>

                    {/* Hubungi Kami */}
                    <div>
                        <h4 className="font-bold text-sm uppercase tracking-widest text-[#F9A826] mb-4">Hubungi Kami</h4>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                                    <Phone className="w-4 h-4 text-[#F9A826]" />
                                </div>
                                <div>
                                    <p className="text-sm text-white/70">WhatsApp / Telepon</p>
                                    <p className="text-sm text-white/90 font-semibold">0852-xxxx-xxxx</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                                    <Mail className="w-4 h-4 text-[#F9A826]" />
                                </div>
                                <div>
                                    <p className="text-sm text-white/70">Email</p>
                                    <p className="text-sm text-white/90 font-semibold">info@nutrilicious.id</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Divider + Copyright */}
                <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-white/40">
                        © 2026 Nutrilicious Food. Cita Rasa Alam, Presisi Gizi Masa Depan.
                    </p>
                    <div className="flex items-center gap-6 text-xs text-white/30">
                        <a href="#" className="hover:text-white/60 transition-colors">Syarat & Ketentuan</a>
                        <a href="#" className="hover:text-white/60 transition-colors">Kebijakan Privasi</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
