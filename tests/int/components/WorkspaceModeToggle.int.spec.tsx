import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WorkspaceModeToggle } from '@/components/Workspace/WorkspaceModeToggle'

describe('WorkspaceModeToggle', () => {
  it('renders both mode buttons', () => {
    const mockOnChange = vi.fn()
    render(<WorkspaceModeToggle mode="explorer" onChange={mockOnChange} />)
    
    expect(screen.getByText('Explorer')).toBeInTheDocument()
    expect(screen.getByText('Workspace')).toBeInTheDocument()
  })

  it('calls onChange when mode button is clicked', () => {
    const mockOnChange = vi.fn()
    render(<WorkspaceModeToggle mode="explorer" onChange={mockOnChange} />)
    
    const workspaceButton = screen.getByText('Workspace').closest('button')
    expect(workspaceButton).toBeTruthy()
    
    if (workspaceButton) {
      fireEvent.click(workspaceButton)
      expect(mockOnChange).toHaveBeenCalledWith('workspace')
    }
  })

  it('applies active styling to current mode', () => {
    const mockOnChange = vi.fn()
    const { container } = render(<WorkspaceModeToggle mode="explorer" onChange={mockOnChange} />)
    
    const explorerButton = screen.getByText('Explorer').closest('button')
    const workspaceButton = screen.getByText('Workspace').closest('button')
    
    expect(explorerButton).toBeTruthy()
    expect(workspaceButton).toBeTruthy()
    
    if (explorerButton && workspaceButton) {
      // Check if explorer button has active class
      expect(explorerButton.className).toContain('bg-primary')
      // Check if workspace button does not have active class
      expect(workspaceButton.className).not.toContain('bg-primary')
    }
  })

  it('applies active styling when workspace mode is active', () => {
    const mockOnChange = vi.fn()
    render(<WorkspaceModeToggle mode="workspace" onChange={mockOnChange} />)
    
    const explorerButton = screen.getByText('Explorer').closest('button')
    const workspaceButton = screen.getByText('Workspace').closest('button')
    
    expect(explorerButton).toBeTruthy()
    expect(workspaceButton).toBeTruthy()
    
    if (explorerButton && workspaceButton) {
      // Check if workspace button has active class
      expect(workspaceButton.className).toContain('bg-primary')
      // Check if explorer button does not have active class
      expect(explorerButton.className).not.toContain('bg-primary')
    }
  })

  it('applies custom className', () => {
    const mockOnChange = vi.fn()
    const { container } = render(
      <WorkspaceModeToggle mode="explorer" onChange={mockOnChange} className="custom-class" />
    )
    
    const toggle = container.querySelector('[data-testid="mode-toggle"]')
    expect(toggle).toBeTruthy()
    if (toggle) {
      expect(toggle.className).toContain('custom-class')
    }
  })

  it('applies custom data-testid', () => {
    const mockOnChange = vi.fn()
    const { container } = render(
      <WorkspaceModeToggle mode="explorer" onChange={mockOnChange} data-testid="custom-toggle" />
    )
    
    const toggle = container.querySelector('[data-testid="custom-toggle"]')
    expect(toggle).toBeTruthy()
  })
})

