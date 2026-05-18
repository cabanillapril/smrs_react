import { useEffect, useState } from 'react'
import Modal from '../Modal'

export default function LogoutModal({ isOpen, onClose, onConfirm }) {
    const [confirming, setConfirming] = useState(false)

    useEffect(() => {
        if (!isOpen) setConfirming(false)
    }, [isOpen])

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Sign out" size="narrow">
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    padding: '6px 0 2px',
                }}
            >
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: 16,
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    background: 'var(--bg-raised)',
                }}>
                    <div
                        style={{
                            width: 46,
                            height: 46,
                            borderRadius: 12,
                            background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 800,
                            fontSize: '1.1rem',
                        }}
                    >
                        <i className="ph ph-sign-out" />
                    </div>

                    <div>
                        <div style={{ fontWeight: 800, fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}>
                            Logout
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 3 }}>
                            Are you sure you want to sign out?
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }} className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose} disabled={confirming}>
                        Cancel
                    </button>
                    <button
                        className="btn btn-danger"
                        onClick={async () => {
                            if (confirming) return
                            setConfirming(true)
                            try {
                                await onConfirm?.()
                                onClose?.()
                            } finally {
                                setConfirming(false)
                            }
                        }}
                        disabled={confirming}
                        style={{ color: 'white' }}
                    >
                        {confirming ? 'Signing out…' : 'Sign out'}
                    </button>
                </div>
            </div>
        </Modal>
    )
}

