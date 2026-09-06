import { Modal } from './ui'
import AuthPage from '../pages/AuthPage'
import { useAuth } from '../auth'

export default function AuthModal() {
  const {
    authPromptOpen,
    setAuthPromptOpen
  } = useAuth()

  return (
    <Modal
      open={authPromptOpen}
      onClose={() => setAuthPromptOpen(false)}
      title="Unlock your private workspace"
      wide
    >
      <AuthPage embedded />
    </Modal>
  )
}