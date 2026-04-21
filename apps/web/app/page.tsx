import Link from "next/link";
import { BookOpen, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white bg-grid p-4">
      <div className="w-full max-w-3xl text-center space-y-8 relative">
        {/* Subtle Accent Detail */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-1 bg-[#ffda59] rounded-full opacity-50" />
        
        <div className="space-y-4">
          <h1 className="text-5xl font-black tracking-tight sm:text-7xl text-slate-900">
            EduBoard <span className="text-[#2c49c5]">PAI</span>
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto font-medium">
            Platform pembelajaran Pendidikan Agama Islam berbasis Board Game Digital interaktif untuk SMA Kelas X.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 max-w-2xl mx-auto">
          {/* Card untuk Guru */}
          <Link href="/login" className="group relative flex flex-col items-center justify-center p-10 rounded-[2rem] border-2 border-slate-100 bg-white hover:border-[#2c49c5] hover:shadow-2xl transition-all shadow-xl shadow-slate-200/50">
            <div className="bg-blue-50 p-5 rounded-3xl mb-6 group-hover:scale-110 transition-transform group-hover:bg-[#2c49c5]/10">
              <BookOpen className="w-12 h-12 text-[#2c49c5]" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Masuk sebagai Guru</h2>
            <p className="text-slate-500 text-sm mt-3 leading-relaxed">Kelola room, soal, dan pantau hasil pembelajaran siswa secara real-time.</p>
            {/* Detail kecil kuning */}
            <div className="absolute top-4 right-4 w-2 h-2 bg-[#ffda59] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>

          {/* Card untuk Siswa */}
          <Link href="/lobby" className="group relative flex flex-col items-center justify-center p-10 rounded-[2rem] border-2 border-slate-100 bg-white hover:border-[#2c49c5] hover:shadow-2xl transition-all shadow-xl shadow-slate-200/50">
            <div className="bg-blue-50 p-5 rounded-3xl mb-6 group-hover:scale-110 transition-transform group-hover:bg-[#2c49c5]/10">
              <Users className="w-12 h-12 text-[#2c49c5]" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Main sebagai Siswa</h2>
            <p className="text-slate-500 text-sm mt-3 leading-relaxed">Masuk ke ruang permainan menggunakan kode room dari Gurumu.</p>
             {/* Detail kecil kuning */}
             <div className="absolute top-4 right-4 w-2 h-2 bg-[#ffda59] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        </div>
      </div>
    </div>
  );
}
