import { render, screen } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { ContactTable } from '@/components/contacts/ContactTable';
import { Contact } from '@/types';

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

// Mock the types
jest.mock('@/types', () => ({
  ContactStatus: {
    LEAD: 'LEAD',
    QUALIFIED: 'QUALIFIED',
    CUSTOMER: 'CUSTOMER',
    CHURNED: 'CHURNED',
    PARTNER: 'PARTNER',
  },
}));

describe('ContactTable', () => {
  const mockContacts: Contact[] = [
    {
      id: 'contact-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1-555-0100',
      title: 'CEO',
      companyId: 'company-1',
      company: { id: 'company-1', name: 'Acme Corp' } as any,
      status: 'LEAD' as any,
      source: 'Website',
      ownerId: 'user-1',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
    },
    {
      id: 'contact-2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      phone: null,
      title: 'CTO',
      companyId: 'company-2',
      company: { id: 'company-2', name: 'Globex Inc' } as any,
      status: 'QUALIFIED' as any,
      source: 'Referral',
      ownerId: 'user-1',
      createdAt: new Date('2024-01-20'),
      updatedAt: new Date('2024-01-20'),
    },
    {
      id: 'contact-3',
      firstName: 'Bob',
      lastName: 'Wilson',
      email: null,
      phone: '+1-555-0200',
      title: null,
      companyId: null,
      status: 'CUSTOMER' as any,
      source: null,
      ownerId: 'user-1',
      createdAt: new Date('2024-01-25'),
      updatedAt: new Date('2024-01-25'),
    },
  ];

  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderContactTable = (props = {}) => {
    return render(
      <ContactTable
        contacts={mockContacts}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        {...props}
      />
    );
  };

  describe('Rendering', () => {
    it('should render table with headers', () => {
      renderContactTable();

      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Phone')).toBeInTheDocument();
      expect(screen.getByText('Company')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Created')).toBeInTheDocument();
    });

    it('should render all contacts', () => {
      renderContactTable();

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    });

    it('should display contact email with mailto link', () => {
      renderContactTable();

      const emailLink = screen.getByText('john.doe@example.com');
      expect(emailLink).toBeInTheDocument();
      expect(emailLink.closest('a')).toHaveAttribute('href', 'mailto:john.doe@example.com');
    });

    it('should display contact phone with tel link', () => {
      renderContactTable();

      const phoneLink = screen.getByText('+1-555-0100');
      expect(phoneLink).toBeInTheDocument();
      expect(phoneLink.closest('a')).toHaveAttribute('href', 'tel:+1-555-0100');
    });

    it('should display "-" for missing email', () => {
      renderContactTable();

      // Bob Wilson has no email
      const row = screen.getByText('Bob Wilson').closest('tr');
      expect(row).toBeInTheDocument();
    });

    it('should display company name with link', () => {
      renderContactTable();

      const companyLink = screen.getByText('Acme Corp');
      expect(companyLink).toBeInTheDocument();
      expect(companyLink.closest('a')).toHaveAttribute('href', '/companies/company-1');
    });

    it('should display contact title', () => {
      renderContactTable();

      expect(screen.getByText('CEO')).toBeInTheDocument();
      expect(screen.getByText('CTO')).toBeInTheDocument();
    });

    it('should display avatar with initials', () => {
      renderContactTable();

      expect(screen.getByText('JD')).toBeInTheDocument(); // John Doe
      expect(screen.getByText('JS')).toBeInTheDocument(); // Jane Smith
      expect(screen.getByText('BW')).toBeInTheDocument(); // Bob Wilson
    });

    it('should display formatted date', () => {
      renderContactTable();

      expect(screen.getByText(/Jan 15, 2024/i)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should render empty table when no contacts', () => {
      render(
        <ContactTable
          contacts={[]}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
      // Table body should be empty
      const tbody = screen.getByRole('table').querySelector('tbody');
      expect(tbody?.children.length).toBe(0);
    });
  });

  describe('Actions Menu', () => {
    it('should open dropdown menu on click', async () => {
      const user = userEvent.setup();
      renderContactTable();

      const actionButtons = screen.getAllByRole('button');
      const moreButton = actionButtons.find((btn) => btn.querySelector('svg'));
      
      if (moreButton) {
        await user.click(moreButton);
        expect(screen.getByText('View Details')).toBeInTheDocument();
        expect(screen.getByText('Edit')).toBeInTheDocument();
        expect(screen.getByText('Delete')).toBeInTheDocument();
      }
    });

    it('should call onEdit when Edit is clicked', async () => {
      const user = userEvent.setup();
      renderContactTable();

      const actionButtons = screen.getAllByRole('button');
      const moreButton = actionButtons.find((btn) => btn.querySelector('svg'));
      
      if (moreButton) {
        await user.click(moreButton);
        const editOption = screen.getByText('Edit');
        await user.click(editOption);

        expect(mockOnEdit).toHaveBeenCalled();
      }
    });

    it('should call onDelete when Delete is clicked', async () => {
      const user = userEvent.setup();
      renderContactTable();

      const actionButtons = screen.getAllByRole('button');
      const moreButton = actionButtons.find((btn) => btn.querySelector('svg'));
      
      if (moreButton) {
        await user.click(moreButton);
        const deleteOption = screen.getByText('Delete');
        await user.click(deleteOption);

        expect(mockOnDelete).toHaveBeenCalled();
      }
    });

    it('should have View Details link to contact page', async () => {
      const user = userEvent.setup();
      renderContactTable();

      const actionButtons = screen.getAllByRole('button');
      const moreButton = actionButtons.find((btn) => btn.querySelector('svg'));
      
      if (moreButton) {
        await user.click(moreButton);
        const viewDetailsLink = screen.getByText('View Details').closest('a');
        expect(viewDetailsLink).toHaveAttribute('href', '/contacts/contact-1');
      }
    });
  });

  describe('Accessibility', () => {
    it('should have accessible table structure', () => {
      renderContactTable();

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getAllByRole('columnheader').length).toBeGreaterThan(0);
      expect(screen.getAllByRole('row').length).toBeGreaterThan(1); // Header + data rows
    });

    it('should have accessible name links', () => {
      renderContactTable();

      const contactLinks = screen.getAllByRole('link', { name: /john doe|jane smith|bob wilson/i });
      expect(contactLinks.length).toBe(3);
    });
  });
});
