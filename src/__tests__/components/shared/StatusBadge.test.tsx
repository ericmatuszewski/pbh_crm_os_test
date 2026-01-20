import { render, screen } from '@/test-utils';
import { StatusBadge } from '@/components/shared/StatusBadge';

// Mock the types
jest.mock('@/types', () => ({
  ContactStatus: {
    LEAD: 'LEAD',
    QUALIFIED: 'QUALIFIED',
    CUSTOMER: 'CUSTOMER',
    CHURNED: 'CHURNED',
    PARTNER: 'PARTNER',
  },
  DealStage: {
    QUALIFICATION: 'QUALIFICATION',
    DISCOVERY: 'DISCOVERY',
    PROPOSAL: 'PROPOSAL',
    NEGOTIATION: 'NEGOTIATION',
    CLOSED_WON: 'CLOSED_WON',
    CLOSED_LOST: 'CLOSED_LOST',
  },
  Priority: {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    URGENT: 'URGENT',
  },
  TaskStatus: {
    TODO: 'TODO',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
  },
}));

describe('StatusBadge', () => {
  describe('Contact Status', () => {
    it('should render LEAD status', () => {
      render(<StatusBadge status="LEAD" />);
      expect(screen.getByText('Lead')).toBeInTheDocument();
    });

    it('should render QUALIFIED status', () => {
      render(<StatusBadge status="QUALIFIED" />);
      expect(screen.getByText('Qualified')).toBeInTheDocument();
    });

    it('should render CUSTOMER status', () => {
      render(<StatusBadge status="CUSTOMER" />);
      expect(screen.getByText('Customer')).toBeInTheDocument();
    });

    it('should render CHURNED status', () => {
      render(<StatusBadge status="CHURNED" />);
      expect(screen.getByText('Churned')).toBeInTheDocument();
    });

    it('should render PARTNER status', () => {
      render(<StatusBadge status="PARTNER" />);
      expect(screen.getByText('Partner')).toBeInTheDocument();
    });
  });

  describe('Deal Stage', () => {
    it('should render QUALIFICATION stage', () => {
      render(<StatusBadge status="QUALIFICATION" />);
      expect(screen.getByText('Qualification')).toBeInTheDocument();
    });

    it('should render DISCOVERY stage', () => {
      render(<StatusBadge status="DISCOVERY" />);
      expect(screen.getByText('Discovery')).toBeInTheDocument();
    });

    it('should render PROPOSAL stage', () => {
      render(<StatusBadge status="PROPOSAL" />);
      expect(screen.getByText('Proposal')).toBeInTheDocument();
    });

    it('should render NEGOTIATION stage', () => {
      render(<StatusBadge status="NEGOTIATION" />);
      expect(screen.getByText('Negotiation')).toBeInTheDocument();
    });

    it('should render CLOSED_WON stage', () => {
      render(<StatusBadge status="CLOSED_WON" />);
      expect(screen.getByText('Won')).toBeInTheDocument();
    });

    it('should render CLOSED_LOST stage', () => {
      render(<StatusBadge status="CLOSED_LOST" />);
      expect(screen.getByText('Lost')).toBeInTheDocument();
    });
  });

  describe('Priority', () => {
    it('should render LOW priority', () => {
      render(<StatusBadge status="LOW" />);
      expect(screen.getByText('Low')).toBeInTheDocument();
    });

    it('should render MEDIUM priority', () => {
      render(<StatusBadge status="MEDIUM" />);
      expect(screen.getByText('Medium')).toBeInTheDocument();
    });

    it('should render HIGH priority', () => {
      render(<StatusBadge status="HIGH" />);
      expect(screen.getByText('High')).toBeInTheDocument();
    });

    it('should render URGENT priority', () => {
      render(<StatusBadge status="URGENT" />);
      expect(screen.getByText('Urgent')).toBeInTheDocument();
    });
  });

  describe('Task Status', () => {
    it('should render TODO status', () => {
      render(<StatusBadge status="TODO" />);
      expect(screen.getByText('To Do')).toBeInTheDocument();
    });

    it('should render IN_PROGRESS status', () => {
      render(<StatusBadge status="IN_PROGRESS" />);
      expect(screen.getByText('In Progress')).toBeInTheDocument();
    });

    it('should render COMPLETED status', () => {
      render(<StatusBadge status="COMPLETED" />);
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('should render CANCELLED status', () => {
      render(<StatusBadge status="CANCELLED" />);
      expect(screen.getByText('Cancelled')).toBeInTheDocument();
    });
  });

  describe('Unknown Status', () => {
    it('should render unknown status as-is', () => {
      render(<StatusBadge status="UNKNOWN_STATUS" />);
      expect(screen.getByText('UNKNOWN_STATUS')).toBeInTheDocument();
    });
  });

  describe('Custom Class Names', () => {
    it('should apply custom className', () => {
      render(<StatusBadge status="LEAD" className="custom-badge-class" />);
      
      const badge = screen.getByText('Lead');
      expect(badge).toHaveClass('custom-badge-class');
    });
  });

  describe('Accessibility', () => {
    it('should be visible', () => {
      render(<StatusBadge status="CUSTOMER" />);
      expect(screen.getByText('Customer')).toBeVisible();
    });

    it('should have readable text', () => {
      render(<StatusBadge status="IN_PROGRESS" />);
      // "In Progress" is more readable than "IN_PROGRESS"
      expect(screen.getByText('In Progress')).toBeInTheDocument();
    });
  });
});
