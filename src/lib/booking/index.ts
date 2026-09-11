export type {
  AvailabilityExceptionType,
  Booking,
  BookingConfirmMode,
  BookingErrorCode,
  BookingResult,
  BookingStatus,
  ProfessionalAvailability,
  ProfessionalAvailabilityException,
  ProfessionalService,
  PublicProfessionalService,
  ServiceCategory,
  ServiceLocationType,
  ServicePriceType,
  ServicePublicVisibility,
  TimeSlot,
  Weekday,
} from './types'

export {
  BOOKING_STATUSES,
  SERVICE_CATEGORIES,
  SERVICE_PRICE_TYPES,
  SLOT_BLOCKING_STATUSES,
} from './types'

export {
  BOOKINGS_STORAGE_KEY,
  PROFESSIONAL_SERVICES_STORAGE_KEY,
  PROFESSIONAL_AVAILABILITY_STORAGE_KEY,
  PROFESSIONAL_AVAILABILITY_EXCEPTIONS_STORAGE_KEY,
  createBookingId,
  loadBookings,
  saveBookings,
  loadProfessionalServices,
  saveProfessionalServices,
  loadProfessionalAvailability,
  saveProfessionalAvailability,
  loadAvailabilityExceptions,
  saveAvailabilityExceptions,
  normalizeBooking,
  normalizeProfessionalService,
  normalizeProfessionalAvailability,
} from './storage'

export {
  listProfessionalServices,
  listBookableServices,
  listPublicServices,
  getProfessionalService,
  createProfessionalService,
  updateProfessionalService,
  disableProfessionalService,
  activateProfessionalService,
  ensureSeedServices,
  isServiceBookable,
  type CreateServiceInput,
  type UpdateServiceFields,
} from './services'

export {
  SERVICE_CATEGORY_LABELS,
  isServiceCategory,
  recommendedCategoriesForRole,
  suggestedServicesForRole,
  type ServiceSuggestion,
} from './serviceCategories'

export {
  getAvailability,
  getAvailabilityExceptions,
  ensureDefaultAvailability,
  setWeeklyAvailability,
  upsertAvailabilityException,
  type WeeklyAvailabilityRow,
} from './availability'

export {
  getProfessionalAvailability,
  getAvailableSlots,
  isSlotAvailable,
  bookingsBlockSlot,
  bufferedRange,
  rangesOverlap,
  addMinutesIso,
  parseTimeToMinutes,
  minutesToTime,
  weekdayFromDate,
  resolveDayWindow,
  type GetAvailableSlotsInput,
} from './slots'

export {
  createBooking,
  getBooking,
  listBookings,
  confirmBooking,
  declineBooking,
  cancelBooking,
  completeBooking,
  markNoShow,
  partitionProfessionalBookings,
  partitionOwnerBookings,
  type CreateBookingInput,
  type ListBookingsFilter,
  type CancelBookingActor,
} from './bookings'

export {
  buildBookingCalendarEvent,
  syncBookingCalendarEvent,
  removeBookingCalendarEvent,
  reconcileBookingCalendarEvents,
  bookingCalendarEventId,
} from './calendarSync'

export {
  BOOKING_FORBIDDEN_PET_KEYS,
  PUBLIC_SERVICE_FORBIDDEN_KEYS,
  projectPetForBooking,
  projectOwnerForBooking,
  assertBookingPayloadSafe,
  assertPublicServiceSafe,
  toPublicProfessionalService,
  formatServicePrice,
  bookingServiceName,
  bookingPriceLabel,
  bookingDurationMinutes,
} from './privacy'

export {
  buildSeedServices,
  buildDefaultWeeklyAvailability,
  buildFullWeekAvailability,
  seedServicesForRole,
} from './seed'

export {
  buildBookingReminderDraft,
  scheduleBookingReminder,
  type BookingReminderDraft,
  type BookingReminderKind,
} from './reminders'

export {
  requestBooking,
  confirmBookingRequest,
  declineBookingRequest,
  cancelBookingRequest,
  completeBookingRequest,
  getAvailableSlotsForService,
  type BookingUpsertNotification,
  type BookingCalendarSync,
} from './session'
