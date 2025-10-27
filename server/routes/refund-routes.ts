import { Router } from "express";
import { refundService } from "../refund-service";
import { getRefundPolicyText, getRefundPolicySummary } from "../refund-policy";
import { storage } from "../storage";

export const refundRouter = Router();

/**
 * GET /api/refunds/policy
 * Get the refund policy text for display to users
 */
refundRouter.get("/policy", (req, res) => {
  try {
    const policy = getRefundPolicyText();
    const summary = getRefundPolicySummary();

    res.json({
      success: true,
      policy,
      summary,
    });
  } catch (error) {
    console.error("Error getting refund policy:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get refund policy",
    });
  }
});

/**
 * POST /api/refunds/calculate
 * Calculate potential refund without processing (for preview)
 */
refundRouter.post("/calculate", async (req, res) => {
  try {
    const { appointmentId, paymentId, cancelledBy } = req.body;

    if (!appointmentId || !paymentId || !cancelledBy) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: appointmentId, paymentId, cancelledBy",
      });
    }

    const calculation = await refundService.calculatePotentialRefund(
      appointmentId,
      paymentId,
      cancelledBy
    );

    res.json({
      success: true,
      calculation,
    });
  } catch (error) {
    console.error("Error calculating refund:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to calculate refund",
    });
  }
});

/**
 * POST /api/refunds/process
 * Process a cancellation and refund
 */
refundRouter.post("/process", async (req, res) => {
  try {
    const { appointmentId, paymentId, cancelledBy, cancellationReason, notes } = req.body;
    const processedBy = (req.user as any)?.id; // Admin ID if authenticated

    if (!appointmentId || !paymentId || !cancelledBy) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: appointmentId, paymentId, cancelledBy",
      });
    }

    const result = await refundService.processCancellationRefund({
      appointmentId,
      paymentId,
      cancelledBy,
      cancellationReason,
      processedBy,
      notes,
    });

    res.json(result);
  } catch (error) {
    console.error("Error processing refund:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to process refund",
    });
  }
});

/**
 * GET /api/refunds/client/:clientId
 * Get all refunds for a specific client
 */
refundRouter.get("/client/:clientId", async (req, res) => {
  try {
    const { clientId } = req.params;
    const refunds = await refundService.getClientRefunds(clientId);

    res.json({
      success: true,
      refunds,
    });
  } catch (error) {
    console.error("Error getting client refunds:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get client refunds",
    });
  }
});

/**
 * GET /api/refunds/therapist/:therapistId
 * Get all refunds for a specific therapist
 */
refundRouter.get("/therapist/:therapistId", async (req, res) => {
  try {
    const { therapistId } = req.params;
    const refunds = await refundService.getTherapistRefunds(therapistId);

    res.json({
      success: true,
      refunds,
    });
  } catch (error) {
    console.error("Error getting therapist refunds:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get therapist refunds",
    });
  }
});

/**
 * GET /api/refunds/pending
 * Get all pending refunds (admin only)
 */
refundRouter.get("/pending", async (req, res) => {
  try {
    // Check if user is admin
    if ((req.user as any)?.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Admin access required",
      });
    }

    const refunds = await refundService.getPendingRefunds();

    res.json({
      success: true,
      refunds,
    });
  } catch (error) {
    console.error("Error getting pending refunds:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get pending refunds",
    });
  }
});

/**
 * GET /api/refunds/:refundId
 * Get specific refund details
 */
refundRouter.get("/:refundId", async (req, res) => {
  try {
    const { refundId } = req.params;
    const refund = await refundService.getRefundDetails(refundId);

    if (!refund) {
      return res.status(404).json({
        success: false,
        error: "Refund not found",
      });
    }

    res.json({
      success: true,
      refund,
    });
  } catch (error) {
    console.error("Error getting refund details:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get refund details",
    });
  }
});

/**
 * PUT /api/refunds/:refundId/status
 * Update refund status (admin only)
 */
refundRouter.put("/:refundId/status", async (req, res) => {
  try {
    // Check if user is admin
    if ((req.user as any)?.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Admin access required",
      });
    }

    const { refundId } = req.params;
    const { status, stripeRefundId } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: "Status is required",
      });
    }

    const updated = await refundService.updateRefundStatus(refundId, status, stripeRefundId);

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: "Refund not found or update failed",
      });
    }

    res.json({
      success: true,
      message: "Refund status updated successfully",
    });
  } catch (error) {
    console.error("Error updating refund status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update refund status",
    });
  }
});
