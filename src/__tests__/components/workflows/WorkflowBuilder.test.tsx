import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkflowBuilder, WorkflowData } from "@/components/workflows/WorkflowBuilder";

// Mock the UI components
jest.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }: { children: React.ReactNode; value?: string; onValueChange?: (value: string) => void }) => (
    <div data-testid="select" data-value={value} onClick={() => onValueChange?.("FIELD_CHANGED")}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button data-testid="select-trigger">{children}</button>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`select-item-${value}`}>{children}</div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

describe("WorkflowBuilder", () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  const defaultProps = {
    onSave: mockOnSave,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render the workflow builder header", () => {
      render(<WorkflowBuilder {...defaultProps} />);

      expect(screen.getByText("Workflow Builder")).toBeInTheDocument();
      expect(screen.getByText("Automate actions based on triggers")).toBeInTheDocument();
    });

    it("should render workflow details section", () => {
      render(<WorkflowBuilder {...defaultProps} />);

      expect(screen.getByText("Workflow Details")).toBeInTheDocument();
      expect(screen.getByLabelText("Workflow Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Description")).toBeInTheDocument();
    });

    it("should render triggers section", () => {
      render(<WorkflowBuilder {...defaultProps} />);

      expect(screen.getByText("Triggers")).toBeInTheDocument();
      expect(screen.getByText("Add Trigger")).toBeInTheDocument();
    });

    it("should render actions section", () => {
      render(<WorkflowBuilder {...defaultProps} />);

      expect(screen.getByText("Actions")).toBeInTheDocument();
      expect(screen.getByText("Add Action")).toBeInTheDocument();
    });

    it("should show empty state for triggers", () => {
      render(<WorkflowBuilder {...defaultProps} />);

      expect(screen.getByText(/No triggers configured/)).toBeInTheDocument();
    });

    it("should show empty state for actions", () => {
      render(<WorkflowBuilder {...defaultProps} />);

      expect(screen.getByText(/No actions configured/)).toBeInTheDocument();
    });

    it("should render save and cancel buttons", () => {
      render(<WorkflowBuilder {...defaultProps} />);

      expect(screen.getByText("Save Workflow")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });
  });

  describe("initial data", () => {
    it("should populate form with initial data", () => {
      const initialData = {
        name: "Welcome Email",
        description: "Send welcome email to new leads",
        entity: "contacts",
        status: "ACTIVE",
        runOnce: true,
        triggers: [],
        actions: [],
      };

      render(<WorkflowBuilder {...defaultProps} initialData={initialData} />);

      expect(screen.getByLabelText("Workflow Name")).toHaveValue("Welcome Email");
      expect(screen.getByLabelText("Description")).toHaveValue("Send welcome email to new leads");
    });

    it("should handle initial triggers", () => {
      const initialData = {
        name: "Test Workflow",
        description: "",
        entity: "contacts",
        status: "DRAFT",
        runOnce: false,
        triggers: [
          { id: "t1", type: "RECORD_CREATED", conditions: [] },
        ],
        actions: [],
      };

      render(<WorkflowBuilder {...defaultProps} initialData={initialData} />);

      // Should not show empty state when triggers exist
      expect(screen.queryByText(/No triggers configured/)).not.toBeInTheDocument();
    });

    it("should handle initial actions", () => {
      const initialData = {
        name: "Test Workflow",
        description: "",
        entity: "contacts",
        status: "DRAFT",
        runOnce: false,
        triggers: [],
        actions: [
          { id: "a1", type: "SEND_EMAIL", position: 0, config: {} },
        ],
      };

      render(<WorkflowBuilder {...defaultProps} initialData={initialData} />);

      // Should not show empty state when actions exist
      expect(screen.queryByText(/No actions configured/)).not.toBeInTheDocument();
    });
  });

  describe("workflow name input", () => {
    it("should update workflow name on input", async () => {
      const user = userEvent.setup();
      render(<WorkflowBuilder {...defaultProps} />);

      const nameInput = screen.getByLabelText("Workflow Name");
      await user.type(nameInput, "New Workflow");

      expect(nameInput).toHaveValue("New Workflow");
    });
  });

  describe("description input", () => {
    it("should update description on input", async () => {
      const user = userEvent.setup();
      render(<WorkflowBuilder {...defaultProps} />);

      const descriptionInput = screen.getByLabelText("Description");
      await user.type(descriptionInput, "This is a test description");

      expect(descriptionInput).toHaveValue("This is a test description");
    });
  });

  describe("run once toggle", () => {
    it("should render run once switch", () => {
      render(<WorkflowBuilder {...defaultProps} />);

      expect(screen.getByText("Run only once per record")).toBeInTheDocument();
    });
  });

  describe("triggers", () => {
    it("should add a trigger when clicking Add Trigger", async () => {
      const user = userEvent.setup();
      render(<WorkflowBuilder {...defaultProps} />);

      const addTriggerButton = screen.getByText("Add Trigger");
      await user.click(addTriggerButton);

      // Empty state should disappear
      expect(screen.queryByText(/No triggers configured/)).not.toBeInTheDocument();
    });

    it("should show add condition button for triggers", async () => {
      const user = userEvent.setup();
      render(<WorkflowBuilder {...defaultProps} />);

      const addTriggerButton = screen.getByText("Add Trigger");
      await user.click(addTriggerButton);

      expect(screen.getByText("Add Condition")).toBeInTheDocument();
    });
  });

  describe("actions", () => {
    it("should add an action when clicking Add Action", async () => {
      const user = userEvent.setup();
      render(<WorkflowBuilder {...defaultProps} />);

      const addActionButton = screen.getByText("Add Action");
      await user.click(addActionButton);

      // Empty state should disappear
      expect(screen.queryByText(/No actions configured/)).not.toBeInTheDocument();
    });

    it("should show action position badge", async () => {
      const user = userEvent.setup();
      render(<WorkflowBuilder {...defaultProps} />);

      const addActionButton = screen.getByText("Add Action");
      await user.click(addActionButton);

      // Should show position "1"
      expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("should add multiple actions with correct positions", async () => {
      const user = userEvent.setup();
      render(<WorkflowBuilder {...defaultProps} />);

      const addActionButton = screen.getByText("Add Action");
      await user.click(addActionButton);
      await user.click(addActionButton);

      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });

  describe("cancel button", () => {
    it("should call onCancel when cancel button is clicked", async () => {
      const user = userEvent.setup();
      render(<WorkflowBuilder {...defaultProps} />);

      const cancelButton = screen.getByText("Cancel");
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe("save button", () => {
    it("should call onSave with workflow data when save button is clicked", async () => {
      const user = userEvent.setup();
      render(<WorkflowBuilder {...defaultProps} />);

      // Fill in required fields
      const nameInput = screen.getByLabelText("Workflow Name");
      await user.type(nameInput, "Test Workflow");

      const saveButton = screen.getByText("Save Workflow");
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledTimes(1);
      });

      const savedData = mockOnSave.mock.calls[0][0] as WorkflowData;
      expect(savedData.name).toBe("Test Workflow");
      expect(savedData.entity).toBe("contacts");
      expect(savedData.status).toBe("DRAFT");
    });

    it("should disable save button while saving", async () => {
      const slowSave = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      const user = userEvent.setup();
      render(<WorkflowBuilder onSave={slowSave} onCancel={mockOnCancel} />);

      const saveButton = screen.getByText("Save Workflow");
      await user.click(saveButton);

      // Should show "Saving..." while saving
      expect(screen.getByText("Saving...")).toBeInTheDocument();
    });
  });

  describe("default values", () => {
    it("should default entity to contacts", () => {
      render(<WorkflowBuilder {...defaultProps} />);

      // Check that contacts is selected by default (via data attribute on mock)
      const entitySelect = screen.getAllByTestId("select")[0];
      expect(entitySelect).toHaveAttribute("data-value", "contacts");
    });

    it("should default status to DRAFT", () => {
      render(<WorkflowBuilder {...defaultProps} />);

      // Status select should have DRAFT value
      const statusSelects = screen.getAllByTestId("select");
      const statusSelect = statusSelects[statusSelects.length - 1];
      expect(statusSelect).toHaveAttribute("data-value", "DRAFT");
    });

    it("should default runOnce to false", async () => {
      const user = userEvent.setup();
      render(<WorkflowBuilder {...defaultProps} />);

      // Save and check the data
      const saveButton = screen.getByText("Save Workflow");
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });

      const savedData = mockOnSave.mock.calls[0][0] as WorkflowData;
      expect(savedData.runOnce).toBe(false);
    });
  });
});

describe("WorkflowBuilder initial data conversion", () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should handle undefined initial data", () => {
    render(
      <WorkflowBuilder
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByLabelText("Workflow Name")).toHaveValue("");
  });

  it("should handle partial initial data", () => {
    const partialData = {
      name: "Partial Workflow",
      // Missing description, entity, etc.
    };

    render(
      <WorkflowBuilder
        initialData={partialData}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByLabelText("Workflow Name")).toHaveValue("Partial Workflow");
    expect(screen.getByLabelText("Description")).toHaveValue("");
  });

  it("should convert null description to empty string", () => {
    const dataWithNull = {
      name: "Test",
      description: null,
      entity: "contacts",
      status: "DRAFT",
      runOnce: false,
      triggers: [],
      actions: [],
    };

    render(
      <WorkflowBuilder
        initialData={dataWithNull as any}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByLabelText("Description")).toHaveValue("");
  });

  it("should handle triggers without conditions", async () => {
    const user = userEvent.setup();
    const dataWithTriggers = {
      name: "Test",
      description: "",
      entity: "contacts",
      status: "DRAFT",
      runOnce: false,
      triggers: [
        { id: "t1", type: "RECORD_CREATED" },
      ],
      actions: [],
    };

    render(
      <WorkflowBuilder
        initialData={dataWithTriggers}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Should not show empty state
    expect(screen.queryByText(/No triggers configured/)).not.toBeInTheDocument();

    // Save and verify conditions are initialized as empty array
    const saveButton = screen.getByText("Save Workflow");
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });

    const savedData = mockOnSave.mock.calls[0][0] as WorkflowData;
    expect(savedData.triggers[0].conditions).toEqual([]);
  });

  it("should handle actions without config", async () => {
    const user = userEvent.setup();
    const dataWithActions = {
      name: "Test",
      description: "",
      entity: "contacts",
      status: "DRAFT",
      runOnce: false,
      triggers: [],
      actions: [
        { id: "a1", type: "SEND_EMAIL", position: 0 },
      ],
    };

    render(
      <WorkflowBuilder
        initialData={dataWithActions}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const saveButton = screen.getByText("Save Workflow");
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });

    const savedData = mockOnSave.mock.calls[0][0] as WorkflowData;
    expect(savedData.actions[0].config).toEqual({});
  });
});

describe("WorkflowBuilder action types", () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const actionTypes = [
    "SEND_EMAIL",
    "CREATE_TASK",
    "UPDATE_FIELD",
    "SEND_WEBHOOK",
    "ASSIGN_OWNER",
    "ADD_TAG",
    "REMOVE_TAG",
    "WAIT_DELAY",
  ];

  actionTypes.forEach((actionType) => {
    it(`should render ${actionType} action correctly`, async () => {
      const dataWithAction = {
        name: "Test",
        description: "",
        entity: "contacts",
        status: "DRAFT",
        runOnce: false,
        triggers: [],
        actions: [
          { id: "a1", type: actionType, position: 0, config: {} },
        ],
      };

      render(
        <WorkflowBuilder
          initialData={dataWithAction}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Should not throw and should not show empty state
      expect(screen.queryByText(/No actions configured/)).not.toBeInTheDocument();
    });
  });
});

describe("WorkflowBuilder trigger types", () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const triggerTypes = [
    "RECORD_CREATED",
    "FIELD_CHANGED",
    "STAGE_CHANGED",
    "DATE_BASED",
  ];

  triggerTypes.forEach((triggerType) => {
    it(`should render ${triggerType} trigger correctly`, async () => {
      const dataWithTrigger = {
        name: "Test",
        description: "",
        entity: "contacts",
        status: "DRAFT",
        runOnce: false,
        triggers: [
          { id: "t1", type: triggerType, conditions: [] },
        ],
        actions: [],
      };

      render(
        <WorkflowBuilder
          initialData={dataWithTrigger}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Should not throw and should not show empty state
      expect(screen.queryByText(/No triggers configured/)).not.toBeInTheDocument();
    });
  });
});
