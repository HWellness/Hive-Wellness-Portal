import express from "express";
import { ObjectStorageService } from "../objectStorage";
import { isAuthenticated } from "../replitAuth";

const router = express.Router();

// Document metadata
const DOCUMENT_LIBRARY = [
  {
    id: "client-info-pack",
    title: "Client Information Pack",
    description:
      "Complete guide for clients including our services, processes, and what to expect from therapy sessions.",
    filename: "HW-Client-Information-Pack.pdf",
    path: "documents/HW-Client-Information-Pack.pdf",
    category: "client",
    lastUpdated: "2025-08-02",
  },
  {
    id: "therapist-info-pack",
    title: "Therapist Information Pack & Pricing",
    description:
      "Complete guide to working with Hive Wellness including values, expectations, session structure, tiered pricing system, and earnings breakdown.",
    filename: "HW-Therapist-Information-Pack-and-Pricing-v4.pdf",
    path: "documents/HW-Therapist-Information-Pack-and-Pricing-v4.pdf",
    category: "therapist",
    lastUpdated: "2025-08-17",
  },
  {
    id: "safeguarding-procedures",
    title: "Safeguarding Procedures",
    description: "Essential safeguarding policies and procedures for all therapy professionals.",
    filename: "HW-Safeguarding-Procedures.pdf",
    path: "documents/HW-Safeguarding-Procedures.pdf",
    category: "therapist",
    lastUpdated: "2025-08-02",
  },
];

// Get available documents for user role
router.get("/documents", isAuthenticated, async (req, res) => {
  try {
    const userRole = (req.user as any)?.role || "client";

    // Filter documents based on user role
    const availableDocuments = DOCUMENT_LIBRARY.filter((doc) => {
      if (userRole === "admin") return true; // Admin can see all
      if (userRole === "therapist") return doc.category === "therapist";
      return doc.category === "client";
    });

    res.json({
      documents: availableDocuments,
      userRole,
    });
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get specific document
router.get("/documents/:documentId", isAuthenticated, async (req, res) => {
  try {
    const { documentId } = req.params;
    const userRole = (req.user as any)?.role || "client";

    const document = DOCUMENT_LIBRARY.find((doc) => doc.id === documentId);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Check permissions
    if (
      (userRole !== "admin" && userRole === "client" && document.category !== "client") ||
      (userRole === "therapist" &&
        document.category !== "therapist" &&
        document.category !== "client")
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(document);
  } catch (error) {
    console.error("Error fetching document:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Serve document files through object storage
router.get("/documents/:documentId/file", isAuthenticated, async (req, res) => {
  try {
    const { documentId } = req.params;
    const userRole = (req.user as any)?.role || "client";

    const document = DOCUMENT_LIBRARY.find((doc) => doc.id === documentId);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Check permissions
    if (
      (userRole !== "admin" && userRole === "client" && document.category !== "client") ||
      (userRole === "therapist" &&
        document.category !== "therapist" &&
        document.category !== "client")
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(document.path);
      if (!file) {
        return res.status(404).json({ error: "Document file not found" });
      }

      // Stream the file to response
      objectStorageService.downloadObject(file, res, 86400); // Cache for 24 hours
    } catch (storageError) {
      console.error("Object storage error:", storageError);
      return res.status(500).json({ error: "Document temporarily unavailable" });
    }
  } catch (error) {
    console.error("Error serving document:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as documentRouter };
