import { Request, Response, NextFunction } from "express";
import { z, ZodError, ZodSchema } from "zod";
import { fromZodError } from "zod-validation-error";

/**
 * Validation middleware factory for standardized input validation across all API routes.
 * Ensures consistent validation with Zod schemas and clear error messages.
 *
 * Usage:
 * app.post('/api/endpoint',
 *   sanitizeInput, // Always run sanitization first
 *   validate({ body: mySchema }),
 *   async (req, res) => { ... }
 * );
 */

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export const validate = (schemas: ValidationSchemas) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body if schema provided
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }

      // Validate query parameters if schema provided
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }

      // Validate path parameters if schema provided
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Convert Zod errors to user-friendly format
        const validationError = fromZodError(error);

        // Log validation failure (HIPAA-compliant - no sensitive data)
        console.error("❌ Validation failed:", {
          path: req.path,
          method: req.method,
          errors: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
            code: e.code,
          })),
        });

        return res.status(400).json({
          error: "Validation failed",
          message: validationError.message,
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        });
      }

      // Handle unexpected errors
      console.error("❌ Unexpected validation error:", error);
      return res.status(500).json({
        error: "Internal server error during validation",
      });
    }
  };
};

/**
 * Shorthand for body-only validation (most common case)
 */
export const validateBody = (schema: ZodSchema) => {
  return validate({ body: schema });
};

/**
 * Shorthand for query-only validation
 */
export const validateQuery = (schema: ZodSchema) => {
  return validate({ query: schema });
};

/**
 * Shorthand for params-only validation
 */
export const validateParams = (schema: ZodSchema) => {
  return validate({ params: schema });
};

/**
 * Optional validation - allows undefined/empty values but validates if present
 */
export const validateOptional = (schemas: ValidationSchemas) => {
  const optionalSchemas: ValidationSchemas = {};

  if (schemas.body) {
    optionalSchemas.body = schemas.body.optional();
  }
  if (schemas.query) {
    optionalSchemas.query = schemas.query.optional();
  }
  if (schemas.params) {
    optionalSchemas.params = schemas.params.optional();
  }

  return validate(optionalSchemas);
};
