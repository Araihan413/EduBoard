import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const CreateRoomSchema = z.object({
  durationMinutes: z.number().min(1),
  turnDurationDasar: z.number().min(10).max(120),
  turnDurationTantangan: z.number().min(10).max(300),
  turnDurationAksi: z.number().min(5).max(120),
  maxGroups: z.number().min(2).max(6),
});
export type CreateRoomInput = z.infer<typeof CreateRoomSchema>;

export const QuestionSchema = z.object({
  type: z.enum(["DASAR", "AKSI", "TANTANGAN"]),
  text: z.string().min(5),
  options: z.array(z.string()).optional(),
  answerKey: z.string().optional(),
  points: z.number().default(10),
});
export type QuestionInput = z.infer<typeof QuestionSchema>;

// Socket Payload Types
export interface ClientJoinRoomPayload {
  roomCode: string;
  groupName: string;
}

export interface TeacherStartGamePayload {
  roomId: string;
}

export interface ClientAnswerPayload {
  questionId: string;
  answerText: string;
  isObjektif: boolean;
}

export interface TeacherGradePayload {
  answerId: string;
  score: number;
}
