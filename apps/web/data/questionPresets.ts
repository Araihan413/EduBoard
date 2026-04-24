import { QuestionCard } from "../store/gameStore";

export interface QuestionPreset {
  name: string;
  questions: Omit<QuestionCard, 'id'>[];
}

export const QUESTION_PRESETS: QuestionPreset[] = [
  {
    name: "Paket Dasar PAI",
    questions: [
      { 
        type: 'DASAR', 
        text: 'Apa arti dari Al-Fatihah?', 
        points: 10, 
        options: ['Pembukaan', 'Penutupan', 'Pujian', 'Permohonan'], 
        answerKey: 'Pembukaan' 
      },
      { 
        type: 'DASAR', 
        text: 'Siapa nama malaikat penyampai wahyu?', 
        points: 10, 
        options: ['Jibril', 'Mikail', 'Israfil', 'Izrail'], 
        answerKey: 'Jibril' 
      },
      { 
        type: 'TANTANGAN', 
        text: 'Sebutkan 5 rukun Islam secara berurutan!', 
        points: 30 
      },
      { 
        type: 'AKSI', 
        text: 'Lakukan gerakan Takbiratul Ihram dengan benar!', 
        points: 15 
      },
      { 
        type: 'DASAR', 
        text: 'Surah pendek yang bercerita tentang keikhlasan adalah...', 
        points: 10, 
        options: ['Al-Ikhlas', 'Al-Falaq', 'An-Nas', 'Al-Kautsar'], 
        answerKey: 'Al-Ikhlas' 
      },
    ]
  },
  {
    name: "Paket Umum",
    questions: [
      { 
        type: 'DASAR', 
        text: 'Ibukota negara Indonesia adalah...', 
        points: 10, 
        options: ['Jakarta', 'Bandung', 'IKN Nusantara', 'Surabaya'], 
        answerKey: 'IKN Nusantara' 
      },
      { 
        type: 'TANTANGAN', 
        text: 'Sebutkan 3 pahlawan nasional yang kamu ketahui!', 
        points: 25 
      },
      { 
        type: 'AKSI', 
        text: 'Nyanyikan lagu Indonesia Raya bait pertama!', 
        points: 20 
      },
    ]
  }
];
