/**
 * 報修請求
 */

import { TenantRepairRequest } from '../types.ts';

type ResolutionDetails = NonNullable<TenantRepairRequest['resolutionDetails']>;

/**
 * 結案資料是否有實際內容。
 *
 * 表單在狀態非「已結案」時會隱藏結案欄位，過去儲存時一律把結案資料設為 undefined，
 * 導致把已結案的報修改回「處理中」再儲存，先前填的修繕方式、廠商、費用、
 * 結案日期會被靜默刪除且無法復原。改以「是否有內容」決定保留與否。
 */
export function hasResolutionContent(details: ResolutionDetails | undefined): boolean {
  if (!details) return false;

  return Boolean(
    details.method?.trim() ||
    details.vendor?.trim() ||
    details.completionDate?.trim() ||
    details.notes?.trim() ||
    (details.cost !== undefined && details.cost !== null && !Number.isNaN(details.cost))
  );
}
