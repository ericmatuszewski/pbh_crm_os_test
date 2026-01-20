import {
  createContactSchema,
  createCompanySchema,
  createDealSchema,
  createTaskSchema,
  paginationSchema,
} from '@/lib/validations';

describe('Validation Schemas', () => {
  describe('createContactSchema', () => {
    it('should validate a valid contact', () => {
      const validContact = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1-555-0100',
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

    it('should accept empty email', () => {
      const validContact = {
        firstName: 'John',
        lastName: 'Doe',
        email: '',
      };

      const result = createContactSchema.safeParse(validContact);
      expect(result.success).toBe(true);
    });

    it('should validate contact status enum', () => {
      const invalidContact = {
        firstName: 'John',
        lastName: 'Doe',
        status: 'INVALID_STATUS',
      };

      const result = createContactSchema.safeParse(invalidContact);
      expect(result.success).toBe(false);
    });

    it('should default status to LEAD', () => {
      const validContact = {
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = createContactSchema.safeParse(validContact);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('LEAD');
      }
    });
  });

  describe('createCompanySchema', () => {
    it('should validate a valid company', () => {
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
        website: 'https://acme.com',
      };

      const result = createCompanySchema.safeParse(invalidCompany);
      expect(result.success).toBe(false);
    });

    it('should validate website URL format', () => {
      const invalidCompany = {
        name: 'Acme Corp',
        website: 'not-a-url',
      };

      const result = createCompanySchema.safeParse(invalidCompany);
      expect(result.success).toBe(false);
    });

    it('should validate company size enum', () => {
      const invalidCompany = {
        name: 'Acme Corp',
        size: 'HUGE',
      };

      const result = createCompanySchema.safeParse(invalidCompany);
      expect(result.success).toBe(false);
    });
  });

  describe('createDealSchema', () => {
    it('should validate a valid deal', () => {
      const validDeal = {
        title: 'Enterprise License',
        value: 50000,
        ownerId: 'user-123',
        stage: 'PROPOSAL',
      };

      const result = createDealSchema.safeParse(validDeal);
      expect(result.success).toBe(true);
    });

    it('should require deal title', () => {
      const invalidDeal = {
        value: 50000,
        ownerId: 'user-123',
      };

      const result = createDealSchema.safeParse(invalidDeal);
      expect(result.success).toBe(false);
    });

    it('should require ownerId', () => {
      const invalidDeal = {
        title: 'Enterprise License',
        value: 50000,
      };

      const result = createDealSchema.safeParse(invalidDeal);
      expect(result.success).toBe(false);
    });

    it('should reject negative value', () => {
      const invalidDeal = {
        title: 'Enterprise License',
        value: -1000,
        ownerId: 'user-123',
      };

      const result = createDealSchema.safeParse(invalidDeal);
      expect(result.success).toBe(false);
    });

    it('should validate probability range (0-100)', () => {
      const invalidDeal = {
        title: 'Enterprise License',
        value: 50000,
        ownerId: 'user-123',
        probability: 150,
      };

      const result = createDealSchema.safeParse(invalidDeal);
      expect(result.success).toBe(false);
    });

    it('should validate deal stage enum', () => {
      const invalidDeal = {
        title: 'Enterprise License',
        value: 50000,
        ownerId: 'user-123',
        stage: 'INVALID_STAGE',
      };

      const result = createDealSchema.safeParse(invalidDeal);
      expect(result.success).toBe(false);
    });
  });

  describe('createTaskSchema', () => {
    it('should validate a valid task', () => {
      const validTask = {
        title: 'Follow up call',
        assigneeId: 'user-123',
        priority: 'HIGH',
      };

      const result = createTaskSchema.safeParse(validTask);
      expect(result.success).toBe(true);
    });

    it('should require task title', () => {
      const invalidTask = {
        assigneeId: 'user-123',
      };

      const result = createTaskSchema.safeParse(invalidTask);
      expect(result.success).toBe(false);
    });

    it('should require assigneeId', () => {
      const invalidTask = {
        title: 'Follow up call',
      };

      const result = createTaskSchema.safeParse(invalidTask);
      expect(result.success).toBe(false);
    });

    it('should validate priority enum', () => {
      const invalidTask = {
        title: 'Follow up call',
        assigneeId: 'user-123',
        priority: 'SUPER_URGENT',
      };

      const result = createTaskSchema.safeParse(invalidTask);
      expect(result.success).toBe(false);
    });

    it('should validate status enum', () => {
      const invalidTask = {
        title: 'Follow up call',
        assigneeId: 'user-123',
        status: 'DONE',
      };

      const result = createTaskSchema.safeParse(invalidTask);
      expect(result.success).toBe(false);
    });
  });

  describe('paginationSchema', () => {
    it('should validate pagination params', () => {
      const validPagination = {
        page: 1,
        limit: 20,
      };

      const result = paginationSchema.safeParse(validPagination);
      expect(result.success).toBe(true);
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
      const invalidPagination = {
        page: 0,
      };

      const result = paginationSchema.safeParse(invalidPagination);
      expect(result.success).toBe(false);
    });

    it('should reject limit over 100', () => {
      const invalidPagination = {
        limit: 200,
      };

      const result = paginationSchema.safeParse(invalidPagination);
      expect(result.success).toBe(false);
    });

    it('should coerce string numbers', () => {
      const stringPagination = {
        page: '5',
        limit: '50',
      };

      const result = paginationSchema.safeParse(stringPagination);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(5);
        expect(result.data.limit).toBe(50);
      }
    });
  });
});
