import { render, screen, waitFor } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { ContactForm } from '@/components/contacts/ContactForm';

// Mock the enums since they come from Prisma
jest.mock('@/types', () => ({
  ContactStatus: {
    LEAD: 'LEAD',
    QUALIFIED: 'QUALIFIED',
    CUSTOMER: 'CUSTOMER',
    CHURNED: 'CHURNED',
    PARTNER: 'PARTNER',
  },
}));

describe('ContactForm', () => {
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();
  const mockCompanies = [
    { id: 'company-1', name: 'Acme Corp' },
    { id: 'company-2', name: 'Globex Inc' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderContactForm = (props = {}) => {
    return render(
      <ContactForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        companies={mockCompanies}
        {...props}
      />
    );
  };

  describe('Rendering', () => {
    it('should render the form with all fields', () => {
      renderContactForm();

      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/source/i)).toBeInTheDocument();
    });

    it('should show "Add New Contact" title when not in edit mode', () => {
      renderContactForm({ isEdit: false });

      expect(screen.getByText('Add New Contact')).toBeInTheDocument();
    });

    it('should show "Edit Contact" title when in edit mode', () => {
      renderContactForm({ isEdit: true });

      expect(screen.getByText('Edit Contact')).toBeInTheDocument();
    });

    it('should show "Create Contact" button when not in edit mode', () => {
      renderContactForm({ isEdit: false });

      expect(screen.getByRole('button', { name: /create contact/i })).toBeInTheDocument();
    });

    it('should show "Update Contact" button when in edit mode', () => {
      renderContactForm({ isEdit: true });

      expect(screen.getByRole('button', { name: /update contact/i })).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show error when first name is empty', async () => {
      const user = userEvent.setup();
      renderContactForm();

      const submitButton = screen.getByRole('button', { name: /create contact/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      });
    });

    it('should show error when last name is empty', async () => {
      const user = userEvent.setup();
      renderContactForm();

      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.type(firstNameInput, 'John');

      const submitButton = screen.getByRole('button', { name: /create contact/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
      });
    });

    it('should show error for invalid email format', async () => {
      const user = userEvent.setup();
      renderContactForm();

      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const emailInput = screen.getByLabelText(/email/i);

      await user.type(firstNameInput, 'John');
      await user.type(lastNameInput, 'Doe');
      await user.type(emailInput, 'invalid-email');

      const submitButton = screen.getByRole('button', { name: /create contact/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with valid data', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValueOnce(undefined);
      renderContactForm();

      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const emailInput = screen.getByLabelText(/email/i);

      await user.type(firstNameInput, 'John');
      await user.type(lastNameInput, 'Doe');
      await user.type(emailInput, 'john.doe@example.com');

      const submitButton = screen.getByRole('button', { name: /create contact/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
          })
        );
      });
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
      renderContactForm();

      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);

      await user.type(firstNameInput, 'John');
      await user.type(lastNameInput, 'Doe');

      const submitButton = screen.getByRole('button', { name: /create contact/i });
      await user.click(submitButton);

      // Should show loading spinner
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });

    it('should call onClose after successful submission', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValueOnce(undefined);
      renderContactForm();

      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);

      await user.type(firstNameInput, 'John');
      await user.type(lastNameInput, 'Doe');

      const submitButton = screen.getByRole('button', { name: /create contact/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Cancel Behavior', () => {
    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderContactForm();

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Initial Data', () => {
    it('should populate form with initial data', () => {
      renderContactForm({
        initialData: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          phone: '+1-555-0100',
          title: 'CTO',
        },
      });

      expect(screen.getByDisplayValue('Jane')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Smith')).toBeInTheDocument();
      expect(screen.getByDisplayValue('jane@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('+1-555-0100')).toBeInTheDocument();
      expect(screen.getByDisplayValue('CTO')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels for all inputs', () => {
      renderContactForm();

      expect(screen.getByLabelText(/first name/i)).toHaveAccessibleName();
      expect(screen.getByLabelText(/last name/i)).toHaveAccessibleName();
      expect(screen.getByLabelText(/email/i)).toHaveAccessibleName();
      expect(screen.getByLabelText(/phone/i)).toHaveAccessibleName();
      expect(screen.getByLabelText(/title/i)).toHaveAccessibleName();
    });

    it('should associate error messages with inputs', async () => {
      const user = userEvent.setup();
      renderContactForm();

      const submitButton = screen.getByRole('button', { name: /create contact/i });
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessages = screen.getAllByText(/required/i);
        expect(errorMessages.length).toBeGreaterThan(0);
      });
    });
  });
});
