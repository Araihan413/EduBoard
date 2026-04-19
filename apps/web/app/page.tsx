import Link from "next/link";
import { BookOpen, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
      <div className="w-full max-w-3xl text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-zinc-900 dark:text-zinc-50">
            EduBoard <span className="text-emerald-600">PAI</span>
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Platform pembelajaran Pendidikan Agama Islam berbasis Board Game Digital interaktif untuk SMA Kelas X.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 max-w-2xl mx-auto">
          {/* Card untuk Guru */}
          <Link href="/login" className="group relative flex flex-col items-center justify-center p-8 rounded-3xl border-2 border-zinc-200 bg-white hover:border-emerald-600 hover:shadow-xl transition-all dark:bg-zinc-900 dark:border-zinc-800 dark:hover:border-emerald-500">
            <div className="bg-emerald-100 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
              <BookOpen className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Masuk sebagai Guru</h2>
            <p className="text-zinc-500 text-sm mt-2">Kelola room, soal, dan pantau hasil pembelajaran siswa.</p>
          </Link>

          {/* Card untuk Siswa */}
          <Link href="/lobby" className="group relative flex flex-col items-center justify-center p-8 rounded-3xl border-2 border-zinc-200 bg-white hover:border-blue-600 hover:shadow-xl transition-all dark:bg-zinc-900 dark:border-zinc-800 dark:hover:border-blue-500">
            <div className="bg-blue-100 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
              <Users className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Main sebagai Siswa</h2>
            <p className="text-zinc-500 text-sm mt-2">Masuk ke ruang permainan menggunakan kode room.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
