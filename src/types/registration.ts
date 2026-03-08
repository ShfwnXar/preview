// =============================
// ENUM & TYPE DASAR
// =============================

export type CategoryType = "individu" | "ganda" | "tim"

export type Gender = "PUTRA" | "PUTRI"

// =============================
// STRUKTUR CABANG OLAHRAGA
// =============================

export type Category = {
  id: string
  label: string
  name?: string
  type: CategoryType

  // jumlah entry yang diisi pada Step 1
  quota: number
}

export type Sport = {
  id: string
  name: string
  categories: Category[]
}

// =============================
// DATA ATLET (STEP 3)
// =============================

export type Athlete = {
  id: string

  // relasi
  sportId: string
  categoryId: string

  // data pribadi
  name: string
  gender: Gender
  birthDate: string
  institution: string
  nisnOrNim?: string

  createdAt: string
}

// =============================
// DOKUMEN ATLET (STEP 4)
// =============================

export type DocumentStatus =
  | "EMPTY"
  | "UPLOADED"
  | "APPROVED"
  | "REJECTED"

export type DocumentItem = {
  fileId?: string
  fileName?: string
  mimeType?: string
  uploadedAt?: string
  status: DocumentStatus
  note?: string // catatan admin jika ditolak
}

export type AthleteDocuments = {
  athleteId: string

  dapodik: DocumentItem
  ktp: DocumentItem
  kartu: DocumentItem
  raport: DocumentItem
  foto: DocumentItem
}

// =============================
// PEMBAYARAN
// =============================

export type PaymentStatus =
  | "NONE"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"

export type Payment = {
  proofFileId?: string
  proofFileName?: string
  proofMimeType?: string
  status: PaymentStatus
  uploadedAt?: string
  totalFee: number
  approvedTotalFee?: number
  note?: string // catatan admin jika reject
}

// =============================
// STATUS PENDAFTARAN GLOBAL
// =============================

export type RegistrationStatus =
  | "DRAFT_QUOTA"
  | "WAITING_PAYMENT_UPLOAD"
  | "WAITING_PAYMENT_VERIFICATION"
  | "PAYMENT_APPROVED"
  | "ATHLETE_DATA_IN_PROGRESS"
  | "DOCS_IN_PROGRESS"
  | "WAITING_DOC_VERIFICATION"
  | "FINAL_VALID"

// =============================
// STRUKTUR PENDAFTARAN UTAMA
// =============================

export type Registration = {
  id: string
  userId: string

  sports: Sport[]
  officials: number

  athletes: Athlete[]
  documents: AthleteDocuments[]

  payment: Payment

  status: RegistrationStatus

  createdAt: string
  updatedAt: string
}

// =============================
// STATISTIK & PERINGKAT
// =============================

export type MedalType = "EMAS" | "PERAK" | "PERUNGGU"

export type Winner = {
  id: string
  sportId: string
  categoryId: string

  position: 1 | 2 | 3
  medal: MedalType

  institutionName: string
}
