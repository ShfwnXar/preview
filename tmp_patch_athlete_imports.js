const fs = require('fs');
const path = 'D:/preview-mudik/src/app/dashboard/pendaftaran/atlet/page.tsx';
let text = fs.readFileSync(path, 'utf8');
text = text.replace(
  'import { readRevisionMode } from "@/lib/registrationFlow"\n',
  'import { readRevisionMode } from "@/lib/registrationFlow"\nimport {\n  getActiveAthleteCount,\n  getApprovedAthleteQuota,\n  getExtraAccess,\n  getPendingTopUpCount,\n  getTopUp,\n  withExtraFlow,\n} from "@/lib/extraAthleteFlow"\n'
);
text = text.replace(
  '  const { state, hydrateReady, addAthlete, removeAthlete, addOfficial, removeOfficial } = useRegistration()\n',
  '  const { state, hydrateReady, addAthlete, removeAthlete, addOfficial, removeOfficial, dispatch } = useRegistration()\n'
);
text = text.replace(
  '  const paymentApproved = state.payment.status === "APPROVED" || revisionOpen\n\n',
  '  const paymentApproved = state.payment.status === "APPROVED" || revisionOpen\n  const approvedAthleteQuota = getApprovedAthleteQuota(state as any)\n  const activeAthleteCount = getActiveAthleteCount(state as any)\n  const pendingTopUpCount = getPendingTopUpCount(state as any)\n  const extraAccess = getExtraAccess(state as any)\n  const topUp = getTopUp(state as any)\n\n'
);
text = text.replace(
  '  const totalFilled = useMemo(() => (state.athletes || []).length, [state.athletes])\n',
  '  const totalFilled = useMemo(() => (state.athletes || []).length, [state.athletes])\n  const extraAthletesCount = useMemo(() => (state.athletes || []).filter((a: any) => a?.registrationState?.source === "EXTRA_ACCESS").length, [state.athletes])\n  const extraSlotsRemaining = Math.max(0, extraAccess.approvedSlots - extraAthletesCount)\n  const paidSlotsRemaining = Math.max(0, approvedAthleteQuota - activeAthleteCount)\n'
);
fs.writeFileSync(path, text, 'utf8');
