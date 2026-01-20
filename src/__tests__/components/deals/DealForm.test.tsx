import { render, screen, waitFor } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { DealForm } from '@/components/deals/DealForm';

// Mock the enums
jest.mock('@/types', () => ({
  DealStage: {
    QUALIFICATION: 'QUALIFICATION',
    DISCOVERY: 'DISCOVERY',
    PROPOSAL: 'PROPOSAL',
    NEGOTIATION: 'NEGOTIATION',
    CLOSED_WON: 'CLOSED_WON',
    CLOSED_LOST: 'CLOSED_LOST',
  },
}));

describe('DealForm', () => {
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();
  const mockContacts = [
    { id: 'contact-1', name: 'John Doe' },
    { id: 'contact-2', name: 'Jane Smith' },
  ];
  const mockCompanies = [
    { id: 'company-1', name: 'Acme Corp' },
    { id: 'company-2', name: 'Globex Inc' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderDealForm = (props = {}) => {
    return render(
      <DealForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        contacts={mockContacts}
        companies={mockCompanies}
        {...props}
      />
    );
  };

  describe('Rendering', () => {
    it('should render the form with all fields', () => {
      renderDealForm();

      expect(screen.getByLabelText(/deal title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/value/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/currency/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/stage/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/probability/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/expected close date/i)).toBeInTheDocument();
    });

    it('should show "Create New Deal" title when not in edit mode', () => {
      renderDealForm({ isEdit: false });

      expect(screen.getByText('Create New Deal')).toBeInTheDocument();
    });

    it('should show "Edit Deal" title when in edit mode', () => {
      renderDealForm({ isEdit: true });

      expect(screen.getByText('Edit Deal')).toBeInTheDocument();
    });

    it('should show "Create Deal" button when not in edit mode', () => {
      renderDealForm({ isEdit: false });

      expect(screen.getByRole('button', { name: /create deal/i })).toBeInTheDocument();
    });

    it('should show "Update Deal" button when in edit mode', () => {
      renderDealForm({ isEdit: true });

      expect(screen.getByRole('button', { name: /update deal/i })).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show error when deal title is empty', async () => {
      const user = userEvent.setup();
      renderDealForm();

      const submitButton = screen.getByRole('button', { name: /create deal/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/deal title is required/i)).toBeInTheDocument();
      });
    });

    it('should show error for negative value', async () => {
      const user = userEvent.setup();
      renderDealForm();

      const titleInput = screen.getByLabelText(/deal title/i);
      const valueInput = screen.getByLabelText(/value/i);

      await user.type(titleInput, 'Test Deal');
      await user.clear(valueInput);
      await user.type(valueInput, '-1000');

      const submitButton = screen.getByRole('button', { name: /create deal/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/value must be positive/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with valid data', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValueOnce(undefined);
      renderDealForm();

      const titleInput = screen.getByLabelText(/deal title/i);
      const valueInput = screen.getByLabelText(/value/i);

      await user.type(titleInput, 'Enterprise License');
      await user.clear(valueInput);
      await user.type(valueInput, '50000');

      const submitButton = screen.getByRole('button', { name: /create deal/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Enterprise License',
            value: 50000,
          })
        );
      });
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
      renderDealForm();

      const titleInput = screen.getByLabelText(/deal title/i);
      await user.type(titleInput, 'Test Deal');

      const submitButton = screen.getByRole('button', { name: /create deal/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });

    it('should call onClose after successful submission', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValueOnce(undefined);
      renderDealForm();

      const titleInput = screen.getByLabelText(/deal title/i);
      await user.type(titleInput, 'Test Deal');

      const submitButton = screen.getByRole('button', { name: /create deal/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should include stage in submission data', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValueOnce(undefined);
      renderDealForm();

      const titleInput = screen.getByLabelText(/deal title/i);
      await user.type(titleInput, 'Test Deal');

      const submitButton = screen.getByRole('button', { name: /create deal/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            stage: 'QUALIFICATION',
          })
        );
      });
    });
  });

  describe('Cancel Behavior', () => {
    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderDealForm();

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Initial Data', () => {
    it('should populate form with initial data', () => {
      renderDealForm({
        initialData: {
          title: 'Existing Deal',
          value: 75000,
          currency: 'EUR',
          probability: 50,
        },
      });

      expect(screen.getByDisplayValue('Existing Deal')).toBeInTheDocument();
      expect(screen.getByDisplayValue('75000')).toBeInTheDocument();
    });
  });

  describe('Stage Probability Auto-update', () => {
    it('should set default probability to 10 for QUALIFICATION stage', () => {
      renderDealForm();

      const probabilityInput = screen.getByLabelText(/probability/i);
      expect(probabilityInput).toHaveValue(10);
    });
  });

  describe('Currency Selection', () => {
    it('should display available currency options', async () => {
      const user = userEvent.setup();
      renderDealForm();

      const currencyTrigger = screen.getByRole('combobox', { name: /currency/i });
      await user.click(currencyTrigger);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'USD' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'EUR' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'GBP' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'CAD' })).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels for all inputs', () => {
      renderDealForm();

      expect(screen.getByLabelText(/deal title/i)).toHaveAccessibleName();
      expect(screen.getByLabelText(/value/i)).toHaveAccessibleName();
      expect(screen.getByLabelText(/probability/i)).toHaveAccessibleName();
    });

    it('should associate error messages with inputs', async () => {
      const user = userEvent.setup();
      renderDealForm();

      const submitButton = screen.getByRole('button', { name: /create deal/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/deal title is required/i)).toBeInTheDocument();
      });
    });
  });
});
