// Queue names live here (not in scheduling.module.ts) so that providers —
// SchedulingService and the workers — can import them without creating a
// circular dependency back into the module file.
export const QUEUE_AZAN = 'azan';
export const QUEUE_QURAN = 'quran';
