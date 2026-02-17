import { useState, useCallback } from 'react'

interface UseFileSelectionModalOptions {
  /** Whether file selection is required */
  required?: boolean
  /** Custom warning message when closing without selection */
  warningMessage?: string
  /** Callback when modal is closed without selection */
  onCloseWithoutSelection?: () => void
}

interface UseFileSelectionModalReturn {
  /** Whether modal is open */
  isOpen: boolean
  /** Open the modal */
  open: () => void
  /** Close the modal */
  close: () => void
  /** Handle modal close with optional confirmation */
  handleClose: () => void
}

/**
 * Shared hook for file selection modal state management.
 * Handles open/close state and optional confirmation when closing without selection.
 */
export function useFileSelectionModal(
  options: UseFileSelectionModalOptions = {}
): UseFileSelectionModalReturn {
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback(() => {
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleClose = useCallback(
    (hasSelection: boolean = false) => {
      if (options.required && !hasSelection) {
        const message =
          options.warningMessage ||
          'A file is required. Are you sure you want to cancel? You will need to select a file to continue.'

        const confirmed = window.confirm(message)
        if (!confirmed) {
          return // Don't close if user cancels
        }

        if (options.onCloseWithoutSelection) {
          options.onCloseWithoutSelection()
        }
      }

      setIsOpen(false)
    },
    [options.required, options.warningMessage, options.onCloseWithoutSelection]
  )

  return {
    isOpen,
    open,
    close,
    handleClose,
  }
}


