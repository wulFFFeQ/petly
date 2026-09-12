export {
  buildBookingMessageContext,
  isBookingEndedStatus,
  type BookingMessageContext,
} from './bookingContext'

export {
  isSafeMessagingPayload,
  assertMessagingPayloadSafe,
  assertClinicalShareAttachmentSafe,
  isClinicalShareAttachment,
} from './privacy'

export {
  INBOX_CONVERSATIONS_KEY,
  createMessagingId,
  loadInboxConversations,
  saveInboxConversations,
  upsertConversation,
  projectConversationForViewer,
  formatMessageClock,
} from './storage'

export {
  canAccessConversation,
  getConversation,
  findConversationByBookingId,
  findDirectProfessionalConversation,
  listConversationsForAccount,
  sortConversationsForInbox,
  getOrCreateBookingConversation,
  getOrCreateProfessionalConversation,
  requireConversationAccess,
  type MessagingResult,
  type MessagingErrorCode,
} from './conversations'

export {
  sendMessage,
  markConversationRead,
  getUnreadCountForAccount,
  countUnreadMessagesInConversation,
  type SendMessageResult,
} from './messages'

export {
  openBookingConversationRequest,
  openProfessionalConversationRequest,
  sendMessageRequest,
  sendClinicalShareRequest,
  markConversationReadRequest,
  accessConversationRequest,
  type MessagingUpsertNotification,
} from './session'

export {
  ensureMessagingSeed,
  seedMessagingFromBookings,
  type MessagingSeedFixture,
} from './seed'
