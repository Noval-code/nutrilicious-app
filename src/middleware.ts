// Middleware kosong - autentikasi dilakukan di level komponen via AuthContext
// Tidak lagi menggunakan Clerk middleware

export function middleware() {
  // Auth check dilakukan di setiap halaman melalui useAuth()
}

export const config = {
  matcher: [],
};
