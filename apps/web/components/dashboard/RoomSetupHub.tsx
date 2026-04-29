import { useState, useEffect } from "react";
import { Plus, Clock, Zap, BookOpen, FolderCheck, Search, ShieldCheck, User } from "lucide-react";
import { useGameStore } from "../../store/gameStore";
import { useDebounce } from "../../hooks/useDebounce";
import { toast } from "sonner";

export default function RoomSetupHub() {
  const { createRoom, questionSets, fetchQuestionSets } = useGameStore();
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    fetchQuestionSets();
  }, [fetchQuestionSets]);

  const filteredSets = questionSets
    .filter(set => set.title.toLowerCase().includes(debouncedSearch.toLowerCase()))
    .sort((a, b) => {
      if (a.isPreset && !b.isPreset) return -1;
      if (!a.isPreset && b.isPreset) return 1;
      return 0;
    });

  const [draftConfig, setDraftConfig] = useState({
    gameDurationMin: 10,
    turnDurationDasar: 30,
    turnDurationTantangan: 60,
    turnDurationAksi: 15,
    maxGroups: 4
  });

  const handleCreate = () => {
    if (!selectedSetId) {
      toast.error("Harap pilih paket soal terlebih dahulu!");
      return;
    }
    createRoom({ 
      gameDurationSec: draftConfig.gameDurationMin * 60, 
      turnDurationDasar: draftConfig.turnDurationDasar,
      turnDurationTantangan: draftConfig.turnDurationTantangan,
      turnDurationAksi: draftConfig.turnDurationAksi,
      maxGroups: draftConfig.maxGroups,
      questionSetId: selectedSetId
    } as any);
    toast.success("Room berhasil dibuat!");
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl shadow-slate-200/40 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-gradient-to-br from-[#2c49c5] via-[#3b59d9] to-[#1a34a8] p-10 lg:p-12 text-white relative overflow-hidden">
        {/* Decorative Mesh elements */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-32 -mt-32 blur-[80px]" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full -ml-32 -mb-32 blur-[60px]" />
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-6 border border-white/10">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Konfigurasi Sesi Baru
          </div>
          <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">Setup Hub</h2>
          <p className="text-white/70 text-sm md:text-base font-medium max-w-lg leading-relaxed">
            Siapkan arena petualangan. Atur durasi permainan, batas waktu menjawab, dan kapasitas tim dalam satu langkah mudah.
          </p>
        </div>
      </div>

      <div className="p-10 lg:p-12 space-y-12">
        {/* 0. Question Set Selection */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
                <BookOpen size={20} />
              </div>
              <h4 className="font-black text-slate-900 uppercase tracking-widest text-sm">Pilih Paket Soal</h4>
            </div>

            {/* Search Bar */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text"
                placeholder="Cari paket soal..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="relative">
            {/* Scrollable Container */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar p-1">
              {filteredSets.length > 0 ? (
                filteredSets.map((set) => (
                  <button
                    key={set.id}
                    onClick={() => setSelectedSetId(set.id)}
                    className={`p-5 rounded-[1.5rem] border-2 text-left transition-all relative overflow-hidden group ${
                      selectedSetId === set.id 
                        ? (set.isPreset ? 'bg-emerald-50 border-emerald-500 shadow-lg shadow-emerald-100' : 'bg-blue-50 border-blue-600 shadow-lg shadow-blue-100')
                        : 'bg-white border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    {set.isPreset ? (
                      <div className="absolute top-2 right-2 text-emerald-500 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        <ShieldCheck size={10} />
                        <span className="text-[8px] font-black uppercase tracking-tighter">Official</span>
                      </div>
                    ) : selectedSetId === set.id ? (
                      <div className="absolute top-2 right-2 text-blue-600">
                        <FolderCheck size={18} />
                      </div>
                    ) : (
                      <div className="absolute top-2 right-2 text-slate-300">
                        <User size={12} />
                      </div>
                    )}
                    <h5 className={`font-black text-sm mb-1 truncate pr-12 ${selectedSetId === set.id ? (set.isPreset ? 'text-emerald-900' : 'text-blue-900') : 'text-slate-700'}`}>{set.title}</h5>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {set._count?.questions || 0} Pertanyaan
                    </p>
                  </button>
                ))
              ) : (
                <div className="col-span-full p-10 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <p className="text-sm font-bold text-slate-400">
                    {searchQuery ? "Tidak ada paket soal yang cocok." : "Belum ada paket soal."}
                  </p>
                </div>
              )}
            </div>
            
            {/* Fade effect at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Group 1: Time Settings */}
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 text-[#2c49c5] rounded-xl flex items-center justify-center border border-blue-100">
                <Clock size={20} />
              </div>
              <h4 className="font-black text-slate-900 uppercase tracking-widest text-sm">Pengaturan Waktu</h4>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Durasi Total Sesi</label>
                  <span className="text-sm font-black text-[#2c49c5] bg-blue-50 px-3 py-1 rounded-lg">{draftConfig.gameDurationMin} Menit</span>
                </div>
                <input 
                  type="range" min="5" max="60" step="5"
                  value={draftConfig.gameDurationMin}
                  onChange={(e) => setDraftConfig({...draftConfig, gameDurationMin: parseInt(e.target.value)})}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#2c49c5]"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Waktu Jawab (Dasar)</label>
                  <span className="text-sm font-black text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">{draftConfig.turnDurationDasar} Detik</span>
                </div>
                <input 
                  type="range" min="10" max="120" step="10"
                  value={draftConfig.turnDurationDasar}
                  onChange={(e) => setDraftConfig({...draftConfig, turnDurationDasar: parseInt(e.target.value)})}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#2c49c5]"
                />
              </div>
            </div>
          </div>

          {/* Group 2: Advanced Settings */}
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center border border-orange-100">
                <Zap size={20} />
              </div>
              <h4 className="font-black text-slate-900 uppercase tracking-widest text-sm">Mode & Kapasitas</h4>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Waktu Jawab (Tantangan)</label>
                  <span className="text-sm font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-lg">{draftConfig.turnDurationTantangan} Detik</span>
                </div>
                <input 
                  type="range" min="30" max="300" step="30"
                  value={draftConfig.turnDurationTantangan}
                  onChange={(e) => setDraftConfig({...draftConfig, turnDurationTantangan: parseInt(e.target.value)})}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Kapasitas Maksimum Tim</label>
                <div className="flex gap-2 md:gap-4">
                  {[2, 3, 4, 6, 8].map((num) => (
                    <button
                      key={num}
                      onClick={() => setDraftConfig({...draftConfig, maxGroups: num})}
                      className={`flex-1 py-4 rounded-2xl font-black transition-all border-2 ${
                        draftConfig.maxGroups === num 
                          ? 'bg-[#2c49c5] border-[#2c49c5] text-white shadow-lg shadow-blue-500/20' 
                          : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                      }`}
                    >
                      {num}
                      <span className="block text-[8px] opacity-60">TIM</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 text-slate-400">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <p className="text-xs font-bold italic">Sistem siap untuk inisialisasi room baru</p>
          </div>
          <button 
            onClick={handleCreate} 
            className="w-full md:w-auto px-10 py-5 bg-[#2c49c5] hover:bg-[#1a34a8] text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 text-base uppercase tracking-wider"
          >
            <Plus size={20} /> Buat Sesi Permainan
          </button>
        </div>
      </div>
    </div>
  );
}
