$path='D:\preview-mudik\src\app\dashboard\pendaftaran\atlet\page.tsx'
$text=[System.IO.File]::ReadAllText($path)
$text=$text.Replace('import { readRevisionMode } from "@/lib/registrationFlow"' + [Environment]::NewLine,'import { readRevisionMode } from "@/lib/registrationFlow"' + [Environment]::NewLine + 'import {' + [Environment]::NewLine + '  getActiveAthleteCount,' + [Environment]::NewLine + '  getApprovedAthleteQuota,' + [Environment]::NewLine + '  getExtraAccess,' + [Environment]::NewLine + '  getPendingTopUpCount,' + [Environment]::NewLine + '  getTopUp,' + [Environment]::NewLine + '  withExtraFlow,' + [Environment]::NewLine + '} from "@/lib/extraAthleteFlow"' + [Environment]::NewLine)
[System.IO.File]::WriteAllText($path,$text)
