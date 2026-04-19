import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-lg border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-zinc-500 hover:text-emerald-600 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali
        </Link>
        <div className="space-y-2 mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Masuk ke EduBoard
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Masukkan kredensial Guru untuk mengakses dashboard.
          </p>
        </div>

        <form className="space-y-6" action="/dashboard">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-900 dark:text-zinc-300">Email</label>
            <input 
              type="email" 
              placeholder="guru@sekolah.com"
              className="w-full h-11 px-4 rounded-xl border border-zinc-200 bg-transparent text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-800 dark:text-white" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-900 dark:text-zinc-300">Password</label>
            <input 
              type="password" 
              placeholder="••••••••"
              className="w-full h-11 px-4 rounded-xl border border-zinc-200 bg-transparent text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-800 dark:text-white" 
            />
          </div>
          <button 
            type="submit" 
            className="w-full h-11 inline-flex items-center justify-center rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors"
          >
            Masuk
          </button>
        </form>
      </div>
    </div>
  );
}
