import {
  createContactSchema,
  updateContactSchema,
  createCompanySchema,
  updateCompanySchema,
  createDealSchema,
  updateDealSchema,
  createTaskSchema,
  updateTaskSchema,
  createActivitySchema,
  createNoteSchema,
  paginationSchema,
  contactFiltersSchema,
  dealFiltersSchema,
  taskFiltersSchema,
} from '@/lib/validations';

describe('Contact Schemas', () => {
  describe('createContactSchema', () => {
    it('should validate valid contact data', () => {
      const validContact = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-0100',
        title: 'CEO',
        status: 'LEAD',
      };

      const result = createContactSchema.safeParse(validContact);
      expect(result.success).toBe(true);
    });

    it('should require firstName', () => {
      const invalidContact = {
        lastName: 'Doe',
      };

      const result = createContactSchema.safeParse(invalidContact);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('firstName');
      }
    });

    it('should require lastName', () => {
      const invalidContact = {
        firstName: 'John',
      };

      const result = createContactSchema.safeParse(invalidContact);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('lastName');
      }
    });

    it('should validate email format', () => {
      const invalidContact = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'not-an-email',
      };

      const result = createContactSchema.safeParse(invalidContact);
      expect(result.success).toBe(false);
    });

    it('should allow empty email', () => {
      const validContact = {
        firstName: 'John',
        lastName: 'Doe',
        email: '',
      };

      const result = createContactSchema.safeParse(validContact);
      expect(result.success).toBe(true);
    });

    it('should validate status enum', () => {
      const validContact = {
        firstName: 'John',
        lastName: 'Doe',
        status: 'CUSTOMER',
      };

      const result = createContactSchema.safeParse(validContact);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const invalidContact = {
        firstName: 'John',
        lastName: 'Doe',
        status: 'INVALID_STATUS',
      };

      const result = createContactSchema.safeParse(invalidContact);
      expect(result.success).toBe(false);
    });

    it('should limit firstName to 100 characters', () => {
      const invalidContact = {
        firstName: 'A'.repeat(101),
        lastName: 'Doe',
      };

      const result = createContactSchema.safeParse(invalidContact);
      expect(result.success).toBe(false);
    });
  });

  describe('updateContactSchema', () => {
    it('should allow partial updates', () => {
      const partialUpdate = {
        firstName: 'Jane',
      };

      const result = updateContactSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should allow empty object', () => {
      const result = updateContactSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });
});

describe('Company Schemas', () => {
  describe('createCompanySchema', () => {
    it('should validate valid company data', () => {
      const validCompany = {
        name: 'Acme Corp',
        website: 'https://acme.com',
        industry: 'Technology',
        size: 'MEDIUM',
      };

      const result = createCompanySchema.safeParse(validCompany);
      expect(result.success).toBe(true);
    });

    it('should require company name', () => {
      const invalidCompany = {
        website: 'https://example.com',
      };

      const result = createCompanySchema.safeParse(invalidCompany);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('name');
      }
    });

    it('should validate website URL format', () => {
      const invalidCompany = {
        name: 'Test Corp',
        website: 'not-a-url',
      };

      const result = createCompanySchema.safeParse(invalidCompany);
      expect(result.success).toBe(false);
    });

    it('should allow empty website', () => {
      const validCompany = {
        name: 'Test Corp',
        website: '',
      };

      const result = createCompanySchema.safeParse(validCompany);
      expect(result.success).toBe(true);
    });

    it('should validate size enum', () => {
      const validSizes = ['STARTUP', 'SMALL', 'MEDIUM', 'ENTERPRISE'];
      
      validSizes.forEach((size) => {
        const result = createCompanySchema.safeParse({
          name: 'Test Corp',
          size,
        });
        expect(result.success).toBe(true);
      });
    });
  });
});

describe('Deal Schemas', () => {
  describe('createDealSchema', () => {
    it('should validate valid deal data', () => {
      const validDeal = {
        title: 'Enterprise License',
        value: 50000,
        currency: 'USD',
        stage: 'QUALIFICATION',
        probability: 20,
        ownerId: 'user-123',
      };

      const result = createDealSchema.safeParse(validDeal);
      expect(result.success).toBe(true);
    });

    it('should require title', () => {
      const invalidDeal = {
        value: 50000,
        ownerId: 'user-123',
      };

      const result = createDealSchema.safeParse(invalidDeal);
      expect(result.success).toBe(false);
    });

    it('should require value to be non-negative', () => {
      const invalidDeal = {
        title: 'Test Deal',
        value: -1000,
        ownerId: 'user-123',
      };

      const result = createDealSchema.safeParse(invalidDeal);
      expect(result.success).toBe(false);
    });

    it('should require ownerId', () => {
      const invalidDeal = {
        title: 'Test Deal',
        value: 50000,
      };

      const result = createDealSchema.safeParse(invalidDeal);
      expect(result.success).toBe(false);
    });

    it('should validate probability range (0-100)', () => {
      const invalidDeal = {
        title: 'Test Deal',
        value: 50000,
        ownerId: 'user-123',
        probability: 150,
      };

      const result = createDealSchema.safeParse(invalidDeal);
      expect(result.success).toBe(false);
    });

    it('should validate deal stage enum', () => {
      const validStages = [
        'QUALIFICATION',
        'DISCOVERY',
        'PROPOSAL',
        'NEGOTIATION',
        'CLOSED_WON',
        'CLOSED_LOST',
      ];

      validStages.forEach((stage) => {
        const result = createDealSchema.safeParse({
          title: 'Test Deal',
          value: 50000,
          ownerId: 'user-123',
          stage,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should default currency to USD', () => {
      const deal = {
        title: 'Test Deal',
        value: 50000,
        ownerId: 'user-123',
      };

      const result = createDealSchema.safeParse(deal);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currency).toBe('USD');
      }
    });
  });
});

describe('Task Schemas', () => {
  describe('createTaskSchema', () => {
    it('should validate valid task data', () => {
      const validTask = {
        title: 'Follow up call',
        description: 'Call to discuss proposal',
        priority: 'HIGH',
        status: 'TODO',
        assigneeId: 'user-123',
      };

      const result = createTaskSchema.safeParse(validTask);
      expect(result.success).toBe(true);
    });

    it('should require title', () => {
      const invalidTask = {
        assigneeId: 'user-123',
      };

      const result = createTaskSchema.safeParse(invalidTask);
      expect(result.success).toBe(false);
    });

    it('should require assigneeId', () => {
      const invalidTask = {
        title: 'Test Task',
      };

      const result = createTaskSchema.safeParse(invalidTask);
      expect(result.success).toBe(false);
    });

    it('should validate priority enum', () => {
      const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
      
      validPriorities.forEach((priority) => {
        const result = createTaskSchema.safeParse({
          title: 'Test Task',
          assigneeId: 'user-123',
          priority,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should validate status enum', () => {
      const validStatuses = ['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
      
      validStatuses.forEach((status) => {
        const result = createTaskSchema.safeParse({
          title: 'Test Task',
          assigneeId: 'user-123',
          status,
        });
        expect(result.success).toBe(true);
      });
    });
  });
});

describe('Activity Schema', () => {
  describe('createActivitySchema', () => {
    it('should validate valid activity data', () => {
      const validActivity = {
        type: 'CALL',
        title: 'Discovery call with prospect',
        description: 'Discussed requirements',
        userId: 'user-123',
      };

      const result = createActivitySchema.safeParse(validActivity);
      expect(result.success).toBe(true);
    });

    it('should validate activity type enum', () => {
      const validTypes = ['CALL', 'EMAIL', 'MEETING', 'NOTE', 'TASK', 'DEAL_UPDATE'];
      
      validTypes.forEach((type) => {
        const result = createActivitySchema.safeParse({
          type,
          title: 'Test Activity',
          userId: 'user-123',
        });
        expect(result.success).toBe(true);
      });
    });

    it('should require type', () => {
      const invalidActivity = {
        title: 'Test Activity',
        userId: 'user-123',
      };

      const result = createActivitySchema.safeParse(invalidActivity);
      expect(result.success).toBe(false);
    });
  });
});

describe('Note Schema', () => {
  describe('createNoteSchema', () => {
    it('should validate valid note data', () => {
      const validNote = {
        content: 'This is a note about the contact.',
        contactId: 'contact-123',
      };

      const result = createNoteSchema.safeParse(validNote);
      expect(result.success).toBe(true);
    });

    it('should require content', () => {
      const invalidNote = {
        contactId: 'contact-123',
      };

      const result = createNoteSchema.safeParse(invalidNote);
      expect(result.success).toBe(false);
    });

    it('should reject empty content', () => {
      const invalidNote = {
        content: '',
        contactId: 'contact-123',
      };

      const result = createNoteSchema.safeParse(invalidNote);
      expect(result.success).toBe(false);
    });
  });
});

describe('Pagination Schema', () => {
  describe('paginationSchema', () => {
    it('should validate valid pagination params', () => {
      const validParams = {
        page: 1,
        limit: 20,
      };

      const result = paginationSchema.safeParse(validParams);
      expect(result.success).toBe(true);
    });

    it('should coerce string values to numbers', () => {
      const stringParams = {
        page: '2',
        limit: '50',
      };

      const result = paginationSchema.safeParse(stringParams);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(50);
      }
    });

    it('should default page to 1', () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
      }
    });

    it('should default limit to 20', () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
      }
    });

    it('should reject page less than 1', () => {
      const invalidParams = {
        page: 0,
      };

      const result = paginationSchema.safeParse(invalidParams);
      expect(result.success).toBe(false);
    });

    it('should reject limit greater than 100', () => {
      const invalidParams = {
        limit: 200,
      };

      const result = paginationSchema.safeParse(invalidParams);
      expect(result.success).toBe(false);
    });
  });
});

describe('Filter Schemas', () => {
  describe('contactFiltersSchema', () => {
    it('should validate contact filters', () => {
      const validFilters = {
        search: 'John',
        status: 'LEAD',
        page: 1,
        limit: 20,
      };

      const result = contactFiltersSchema.safeParse(validFilters);
      expect(result.success).toBe(true);
    });

    it('should allow all filter fields to be optional', () => {
      const result = contactFiltersSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('dealFiltersSchema', () => {
    it('should validate deal filters', () => {
      const validFilters = {
        search: 'Enterprise',
        stage: 'PROPOSAL',
        minValue: 10000,
        maxValue: 100000,
        page: 1,
        limit: 20,
      };

      const result = dealFiltersSchema.safeParse(validFilters);
      expect(result.success).toBe(true);
    });

    it('should coerce string values for min/max', () => {
      const filters = {
        minValue: '5000',
        maxValue: '50000',
      };

      const result = dealFiltersSchema.safeParse(filters);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.minValue).toBe(5000);
        expect(result.data.maxValue).toBe(50000);
      }
    });
  });

  describe('taskFiltersSchema', () => {
    it('should validate task filters', () => {
      const validFilters = {
        status: 'TODO',
        priority: 'HIGH',
        assigneeId: 'user-123',
      };

      const result = taskFiltersSchema.safeParse(validFilters);
      expect(result.success).toBe(true);
    });
  });
});
