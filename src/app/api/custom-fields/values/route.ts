import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CustomFieldType } from "@prisma/client";

// GET /api/custom-fields/values - Get custom field values for an entity
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");

    if (!entityType || !entityId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "entityType and entityId are required" } },
        { status: 400 }
      );
    }

    // Get all active field definitions for this entity
    const fieldDefinitions = await prisma.customFieldDefinition.findMany({
      where: {
        entity: entityType,
        isActive: true,
      },
      orderBy: [
        { groupPosition: "asc" },
        { position: "asc" },
      ],
    });

    // Get all values for this entity
    const values = await prisma.customFieldValue.findMany({
      where: {
        entityType,
        entityId,
      },
    });

    // Map values by field ID for easy lookup
    const valuesByFieldId = new Map(
      values.map((v) => [v.fieldId, v])
    );

    // Combine definitions with their values
    const result = fieldDefinitions.map((field) => {
      const value = valuesByFieldId.get(field.id);
      return {
        field,
        value: value ? getDisplayValue(field.fieldType, value) : getDefaultValue(field),
        rawValue: value,
      };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Failed to fetch custom field values:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch custom field values" } },
      { status: 500 }
    );
  }
}

// POST /api/custom-fields/values - Set custom field values for an entity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entityType, entityId, values } = body;

    if (!entityType || !entityId || !values || !Array.isArray(values)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "entityType, entityId, and values array are required" } },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    for (const item of values) {
      const { fieldId, value } = item;

      // Get field definition
      const field = await prisma.customFieldDefinition.findUnique({
        where: { id: fieldId },
      });

      if (!field) {
        errors.push({ fieldId, error: "Field not found" });
        continue;
      }

      if (!field.isActive) {
        errors.push({ fieldId, error: "Field is inactive" });
        continue;
      }

      if (field.entity !== entityType) {
        errors.push({ fieldId, error: "Field does not belong to this entity type" });
        continue;
      }

      // Validate required field
      if (field.isRequired && (value === null || value === undefined || value === "")) {
        errors.push({ fieldId, error: "This field is required" });
        continue;
      }

      // Validate field value
      const validationError = validateFieldValue(field, value);
      if (validationError) {
        errors.push({ fieldId, error: validationError });
        continue;
      }

      // Prepare value data based on field type
      const valueData = prepareValueData(field.fieldType, value);

      // Upsert the value
      const savedValue = await prisma.customFieldValue.upsert({
        where: {
          fieldId_entityType_entityId: {
            fieldId,
            entityType,
            entityId,
          },
        },
        create: {
          field: { connect: { id: fieldId } },
          entityType,
          entityId,
          ...valueData,
        },
        update: valueData,
      });

      results.push(savedValue);
    }

    return NextResponse.json({
      success: errors.length === 0,
      data: { saved: results.length, errors },
    });
  } catch (error) {
    console.error("Failed to save custom field values:", error);
    return NextResponse.json(
      { success: false, error: { code: "SAVE_ERROR", message: "Failed to save custom field values" } },
      { status: 500 }
    );
  }
}

// DELETE /api/custom-fields/values - Delete custom field values for an entity
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { entityType, entityId, fieldIds } = body;

    if (!entityType || !entityId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "entityType and entityId are required" } },
        { status: 400 }
      );
    }

    const where: Record<string, unknown> = {
      entityType,
      entityId,
    };

    // Optionally filter by specific field IDs
    if (fieldIds && Array.isArray(fieldIds) && fieldIds.length > 0) {
      where.fieldId = { in: fieldIds };
    }

    const deleted = await prisma.customFieldValue.deleteMany({ where });

    return NextResponse.json({
      success: true,
      data: { deleted: deleted.count },
    });
  } catch (error) {
    console.error("Failed to delete custom field values:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete custom field values" } },
      { status: 500 }
    );
  }
}

// Helper functions

function getDisplayValue(
  fieldType: CustomFieldType,
  value: {
    textValue: string | null;
    numberValue: unknown;
    booleanValue: boolean | null;
    dateValue: Date | null;
    jsonValue: unknown;
    computedValue: string | null;
  }
): unknown {
  switch (fieldType) {
    case "TEXT":
    case "TEXTAREA":
    case "URL":
    case "EMAIL":
    case "PHONE":
      return value.textValue;
    case "NUMBER":
    case "DECIMAL":
    case "CURRENCY":
      return value.numberValue ? Number(value.numberValue) : null;
    case "BOOLEAN":
      return value.booleanValue;
    case "DATE":
    case "DATETIME":
      return value.dateValue;
    case "DROPDOWN":
    case "MULTI_SELECT":
    case "LOOKUP":
      return value.jsonValue;
    case "FORMULA":
      return value.computedValue;
    default:
      return value.textValue || value.jsonValue;
  }
}

function getDefaultValue(field: { defaultValue: unknown }): unknown {
  return field.defaultValue ?? null;
}

function validateFieldValue(
  field: {
    fieldType: CustomFieldType;
    validation: unknown;
    options: unknown;
    isUnique: boolean;
  },
  value: unknown
): string | null {
  if (value === null || value === undefined || value === "") {
    return null; // Empty values are allowed (required check is done separately)
  }

  const validation = field.validation as {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    customMessage?: string;
  } | null;

  switch (field.fieldType) {
    case "NUMBER":
    case "DECIMAL":
    case "CURRENCY":
      if (typeof value !== "number" && isNaN(Number(value))) {
        return "Value must be a number";
      }
      const numValue = Number(value);
      if (validation?.min !== undefined && numValue < validation.min) {
        return validation.customMessage || `Value must be at least ${validation.min}`;
      }
      if (validation?.max !== undefined && numValue > validation.max) {
        return validation.customMessage || `Value must be at most ${validation.max}`;
      }
      break;

    case "TEXT":
    case "TEXTAREA":
      if (typeof value !== "string") {
        return "Value must be a string";
      }
      if (validation?.minLength !== undefined && value.length < validation.minLength) {
        return validation.customMessage || `Value must be at least ${validation.minLength} characters`;
      }
      if (validation?.maxLength !== undefined && value.length > validation.maxLength) {
        return validation.customMessage || `Value must be at most ${validation.maxLength} characters`;
      }
      if (validation?.pattern) {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(value)) {
          return validation.customMessage || "Value does not match the required pattern";
        }
      }
      break;

    case "EMAIL":
      if (typeof value !== "string" || !value.includes("@")) {
        return "Value must be a valid email address";
      }
      break;

    case "URL":
      if (typeof value !== "string") {
        return "Value must be a valid URL";
      }
      try {
        new URL(value);
      } catch {
        return "Value must be a valid URL";
      }
      break;

    case "DATE":
    case "DATETIME":
      const date = new Date(value as string);
      if (isNaN(date.getTime())) {
        return "Value must be a valid date";
      }
      break;

    case "BOOLEAN":
      if (typeof value !== "boolean") {
        return "Value must be true or false";
      }
      break;

    case "DROPDOWN":
      const options = field.options as { value: string }[] | null;
      if (options) {
        const validValues = options.map((o) => o.value);
        if (!validValues.includes(value as string)) {
          return "Invalid option selected";
        }
      }
      break;

    case "MULTI_SELECT":
      if (!Array.isArray(value)) {
        return "Value must be an array";
      }
      const multiOptions = field.options as { value: string }[] | null;
      if (multiOptions) {
        const validMultiValues = multiOptions.map((o) => o.value);
        for (const v of value) {
          if (!validMultiValues.includes(v)) {
            return `Invalid option: ${v}`;
          }
        }
      }
      break;
  }

  return null;
}

function prepareValueData(
  fieldType: CustomFieldType,
  value: unknown
) {
  // Clear all values first - use undefined instead of null for optional fields
  const data: {
    textValue: string | null;
    numberValue: number | null;
    booleanValue: boolean | null;
    dateValue: Date | null;
    jsonValue: ReturnType<typeof JSON.parse> | null;
  } = {
    textValue: null,
    numberValue: null,
    booleanValue: null,
    dateValue: null,
    jsonValue: null,
  };

  if (value === null || value === undefined) {
    return data;
  }

  switch (fieldType) {
    case "TEXT":
    case "TEXTAREA":
    case "URL":
    case "EMAIL":
    case "PHONE":
      data.textValue = String(value);
      break;

    case "NUMBER":
    case "DECIMAL":
    case "CURRENCY":
      data.numberValue = Number(value);
      break;

    case "BOOLEAN":
      data.booleanValue = Boolean(value);
      break;

    case "DATE":
    case "DATETIME":
      data.dateValue = new Date(value as string);
      break;

    case "DROPDOWN":
    case "MULTI_SELECT":
    case "LOOKUP":
      // Ensure proper JSON serialization for Prisma
      data.jsonValue = JSON.parse(JSON.stringify(value));
      break;

    case "FORMULA":
      // Formula values are computed, not stored directly
      data.textValue = String(value);
      break;

    default:
      data.textValue = String(value);
  }

  return data;
}
