import { z } from "zod";

export const uploadMinorApprovalFormSchema = z.object({
  reservationId: z.string().uuid("ID de reserva inválido."),
  fileName: z.string().min(1, "Nome de arquivo obrigatório."),
  fileType: z.enum(["application/pdf", "image/jpeg", "image/png"], {
    errorMap: () => ({ message: "Apenas arquivos PDF, JPEG ou PNG são permitidos." }),
  }),
  fileSize: z
    .number()
    .max(10 * 1024 * 1024, "O arquivo não pode exceder 10MB.")
    .positive("Arquivo vazio não permitido."),
});

export const approveMinorFormSchema = z.object({
  formId: z.string().uuid("ID de formulário inválido."),
  adminId: z.string().uuid("ID de administrador inválido."),
  status: z.enum(["approved", "rejected"]),
});
