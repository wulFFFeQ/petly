export {
  getSupabaseBrowserClient,
  resetSupabaseBrowserClientForTests,
} from './supabaseClient'
export {
  getAuthSession,
  getAuthenticatedUserId,
  isRealAuthAvailable,
  onAuthStateChange,
  signInWithEmailPassword,
  signOutAuth,
  signUpWithEmailPassword,
  type AuthResult,
} from './supabaseAuth'
