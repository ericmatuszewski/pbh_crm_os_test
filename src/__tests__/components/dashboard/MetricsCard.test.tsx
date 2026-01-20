import { render, screen } from '@/test-utils';
import { MetricsCard } from '@/components/dashboard/MetricsCard';
import { DollarSign, Users, TrendingUp, Target } from 'lucide-react';

describe('MetricsCard', () => {
  describe('Basic Rendering', () => {
    it('should render title and value', () => {
      render(<MetricsCard title="Total Revenue" value="$125,000" />);

      expect(screen.getByText('Total Revenue')).toBeInTheDocument();
      expect(screen.getByText('$125,000')).toBeInTheDocument();
    });

    it('should render numeric value', () => {
      render(<MetricsCard title="Total Deals" value={42} />);

      expect(screen.getByText('Total Deals')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should render subtitle when provided', () => {
      render(
        <MetricsCard
          title="New Contacts"
          value={15}
          subtitle="from last month"
        />
      );

      expect(screen.getByText('from last month')).toBeInTheDocument();
    });

    it('should not render subtitle when not provided', () => {
      render(<MetricsCard title="Total Users" value={100} />);

      expect(screen.queryByText('from last month')).not.toBeInTheDocument();
    });
  });

  describe('Icon Rendering', () => {
    it('should render icon when provided', () => {
      render(
        <MetricsCard
          title="Revenue"
          value="$50,000"
          icon={DollarSign}
        />
      );

      // Check for SVG element (the icon)
      const card = screen.getByText('Revenue').closest('div');
      expect(card?.querySelector('svg')).toBeInTheDocument();
    });

    it('should not render icon when not provided', () => {
      render(<MetricsCard title="Revenue" value="$50,000" />);

      const header = screen.getByText('Revenue').closest('div');
      // Only the title should be in the header, no SVG
      const svg = header?.parentElement?.querySelector('svg');
      expect(svg).not.toBeInTheDocument();
    });
  });

  describe('Trend Rendering', () => {
    it('should render positive trend with plus sign', () => {
      render(
        <MetricsCard
          title="Sales"
          value={100}
          trend={{ value: 12, isPositive: true }}
        />
      );

      expect(screen.getByText('+12%')).toBeInTheDocument();
    });

    it('should render negative trend without plus sign', () => {
      render(
        <MetricsCard
          title="Churn Rate"
          value="5%"
          trend={{ value: -3, isPositive: false }}
        />
      );

      expect(screen.getByText('-3%')).toBeInTheDocument();
    });

    it('should apply green color for positive trend', () => {
      render(
        <MetricsCard
          title="Growth"
          value={25}
          trend={{ value: 15, isPositive: true }}
        />
      );

      const trendElement = screen.getByText('+15%');
      expect(trendElement).toHaveClass('text-green-600');
    });

    it('should apply red color for negative trend', () => {
      render(
        <MetricsCard
          title="Decline"
          value={10}
          trend={{ value: -8, isPositive: false }}
        />
      );

      const trendElement = screen.getByText('-8%');
      expect(trendElement).toHaveClass('text-red-600');
    });

    it('should not render trend when not provided', () => {
      render(<MetricsCard title="Static Metric" value={50} />);

      expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    });
  });

  describe('Combined Features', () => {
    it('should render all elements together', () => {
      render(
        <MetricsCard
          title="Total Revenue"
          value="$250,000"
          subtitle="this quarter"
          icon={DollarSign}
          trend={{ value: 18, isPositive: true }}
        />
      );

      expect(screen.getByText('Total Revenue')).toBeInTheDocument();
      expect(screen.getByText('$250,000')).toBeInTheDocument();
      expect(screen.getByText('this quarter')).toBeInTheDocument();
      expect(screen.getByText('+18%')).toBeInTheDocument();
    });
  });

  describe('Custom Class Names', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <MetricsCard
          title="Test"
          value={100}
          className="custom-class"
        />
      );

      const card = container.querySelector('.custom-class');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Value Formatting', () => {
    it('should display large numbers correctly', () => {
      render(<MetricsCard title="Users" value={1234567} />);

      expect(screen.getByText('1234567')).toBeInTheDocument();
    });

    it('should display currency strings correctly', () => {
      render(<MetricsCard title="Revenue" value="$1,234,567.89" />);

      expect(screen.getByText('$1,234,567.89')).toBeInTheDocument();
    });

    it('should display percentages correctly', () => {
      render(<MetricsCard title="Conversion" value="67.5%" />);

      expect(screen.getByText('67.5%')).toBeInTheDocument();
    });

    it('should display zero value', () => {
      render(<MetricsCard title="Pending" value={0} />);

      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<MetricsCard title="Metric Title" value={100} />);

      // The title should be identifiable
      expect(screen.getByText('Metric Title')).toBeInTheDocument();
    });

    it('should have readable value', () => {
      render(<MetricsCard title="Important Value" value="$50,000" />);

      const value = screen.getByText('$50,000');
      expect(value).toBeVisible();
    });
  });
});
