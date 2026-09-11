const fs = require("fs");
const express = require("express");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const pool = require("../db");
const authenticateToken = require("../middleware/auth");
const { extractTextFromPDF } = require("../services/documentProcessor");
const {
    extractMedicalInformation,
    askMedicalRecords
} = require("../services/medicalExtractor");

const router = express.Router();
async function createAuditLog(userId, action, resourceType = null, resourceId = null) {
    try {
        await pool.query(
            `INSERT INTO audit_logs
                (user_id, action, resource_type, resource_id)
             VALUES
                ($1, $2, $3, $4)`,
            [userId, action, resourceType, resourceId]
        );
    } catch (error) {
        console.error("Audit log error:", error);
    }
}

// Configure where uploaded files are stored
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/");
    },

    filename: function (req, file, cb) {
        const uniqueName =
            Date.now() + "-" + Math.round(Math.random() * 1E9);

        cb(
            null,
            uniqueName + path.extname(file.originalname)
        );
    }
});

// Create upload middleware
const upload = multer({
    storage: storage,

    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB
    },

    fileFilter: (req, file, cb) => {
        if (file.mimetype === "application/pdf") {
            cb(null, true);
        } else {
            cb(new Error("Only PDF files are allowed."));
        }
    }
});

// Upload document
router.post(
    "/upload",
    authenticateToken,
    (req, res, next) => {
        upload.single("document")(req, res, (error) => {
            if (error) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            next();
        });
    },
    async (req, res) => {
        try {
            // Check if file exists
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "Please upload a document"
                });
            }

            // Get patient profile
            const patientResult = await pool.query(
                `SELECT id
                 FROM patient_profiles
                 WHERE user_id = $1`,
                [req.user.id]
            );

            if (patientResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Patient profile not found"
                });
            }

            const patientId = patientResult.rows[0].id;
            const fileBuffer = fs.readFileSync(req.file.path);

            const fileHash = crypto
                .createHash("sha256")
                .update(fileBuffer)
                .digest("hex");

            const duplicateResult = await pool.query(
                `SELECT id
                 FROM documents
                 WHERE patient_id = $1
                 AND file_hash = $2`,
                [patientId, fileHash]
            );

            if (duplicateResult.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: "This document has already been uploaded."
                });
            }
            // Save document information in database
            const result = await pool.query(
                `INSERT INTO documents
                 (patient_id, file_name, file_url, status, file_hash)
                 VALUES
                 ($1, $2, $3, $4, $5)
                 RETURNING *`,
                [
                    patientId,
                    req.file.originalname,
                    req.file.path,
                    "PROCESSING",
                    fileHash
                ]
            );
            await createAuditLog(
                req.user.id,
                "DOCUMENT_UPLOADED",
                "DOCUMENT",
                result.rows[0].id
            );

            res.status(201).json({
                success: true,
                message: "Document uploaded successfully",
                document: result.rows[0]
            });

        } catch (error) {
            console.error("Document upload error:", error);

            res.status(500).json({
                success: false,
                message: "Server error"
            });
        }
    }
);
router.post(
    "/:id/process",
    authenticateToken,
    async (req, res) => {
        try {
            const documentId = req.params.id;

            // Get document belonging to logged-in patient
            const result = await pool.query(
                `SELECT d.*
                 FROM documents d
                 JOIN patient_profiles p
                    ON d.patient_id = p.id
                 WHERE d.id = $1
                 AND p.user_id = $2`,
                [documentId, req.user.id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Document not found"
                });
            }

            const document = result.rows[0];

            // Extract text from PDF
            const text = await extractTextFromPDF(
                document.file_url
            );

            // Send extracted text to Gemini
            const medicalData = await extractMedicalInformation(
                text
            );

            // Convert Gemini JSON string into JavaScript object
            const cleanedMedicalData = medicalData
                .replace(/```json/g, "")
                .replace(/```/g, "")
                .trim();

            const structuredData = JSON.parse(cleanedMedicalData);
            const timelineEvents = structuredData.timeline_events || [];

            // Save both raw text and structured medical data
            await pool.query(
                `UPDATE documents
                SET extracted_data = $1,
                  status = $2
               WHERE id = $3`,
                [
                    JSON.stringify({
                        text: text,
                        medical_data: structuredData
                    }),
                    "COMPLETED",
                    documentId
                ]
            );
            await createAuditLog(
                req.user.id,
                "DOCUMENT_PROCESSED",
                "DOCUMENT",
                documentId
            );
            // Save timeline events
            for (const event of timelineEvents) {
                await pool.query(
                    `INSERT INTO timeline_events
                        (patient_id, document_id, event_type, title, description, event_date)
                     VALUES
                        ($1, $2, $3, $4, $5, $6)`,
                    [
                        document.patient_id,
                        documentId,
                        event.event_type,
                        event.title,
                        event.description,
                        event.event_date
                    ]
                );
            }

            res.json({
                success: true,
                message: "Document processed successfully",
                data: {
                    text: text,
                    medical_data: structuredData
                }
            });

        } catch (error) {
            console.error("Document processing error:", error);

            res.status(500).json({
                success: false,
                message: "Failed to process document"
            });
        }
    }
);
router.post("/ai-test", authenticateToken, async (req, res) => {
    try {
        const text = `
        Patient has a history of hypertension and hypothyroidism.
        Patient presented with syncope.
        Medications include warfarin and sotalol.
        CT scan and echocardiogram were performed.
        `;

        const result = await extractMedicalInformation(text);

        res.json({
            success: true,
            message: "AI extraction working",
            data: result
        });

    } catch (error) {
        console.error("AI test error:", error);

        res.status(500).json({
            success: false,
            message: "AI extraction failed"
        });
    }
});
// Get patient's medical timeline
router.get("/timeline", authenticateToken, async (req, res) => {
    try {
        // Find patient profile for logged-in user
        const patientResult = await pool.query(
            `SELECT id
             FROM patient_profiles
             WHERE user_id = $1`,
            [req.user.id]
        );

        if (patientResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Patient profile not found"
            });
        }

        const patientId = patientResult.rows[0].id;

        // Get timeline events
        const result = await pool.query(
            `SELECT
                id,
                document_id,
                event_type,
                title,
                description,
                event_date,
                created_at
             FROM timeline_events
             WHERE patient_id = $1
             ORDER BY event_date ASC`,
            [patientId]
        );

        res.json({
            success: true,
            count: result.rows.length,
            timeline: result.rows
        });

    } catch (error) {
        console.error("Timeline fetch error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch medical timeline"
        });
    }
});
// Get patient's medical documents
router.get("/", authenticateToken, async (req, res) => {
    try {
        const patientResult = await pool.query(
            `SELECT id
             FROM patient_profiles
             WHERE user_id = $1`,
            [req.user.id]
        );

        if (patientResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Patient profile not found"
            });
        }

        const patientId = patientResult.rows[0].id;

        const result = await pool.query(
            `SELECT
                id,
                file_name,
                document_type,
                document_date,
                status,
                extracted_data,
                uploaded_at
             FROM documents
             WHERE patient_id = $1
             ORDER BY uploaded_at DESC`,
            [patientId]
        );

        res.json({
            success: true,
            count: result.rows.length,
            documents: result.rows
        });

    } catch (error) {
        console.error("Documents fetch error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch documents"
        });
    }
});
// Ask questions about patient's medical records
router.post("/ask", authenticateToken, async (req, res) => {
    try {
        const { question } = req.body;

        if (!question || !question.trim()) {
            return res.status(400).json({
                success: false,
                message: "Question is required"
            });
        }

        // Find patient profile
        const patientResult = await pool.query(
            `SELECT id
             FROM patient_profiles
             WHERE user_id = $1`,
            [req.user.id]
        );

        if (patientResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Patient profile not found"
            });
        }

        const patientId = patientResult.rows[0].id;

        // Get patient's processed medical records
        const documentsResult = await pool.query(
            `SELECT
                id,
                file_name,
                extracted_data
             FROM documents
             WHERE patient_id = $1
             AND status = 'COMPLETED'
             ORDER BY uploaded_at DESC`,
            [patientId]
        );

        if (documentsResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No processed medical records found"
            });
        }

        // Prepare medical records for AI
        const records = documentsResult.rows.map(doc => ({
            document_id: doc.id,
            file_name: doc.file_name,
            medical_data: doc.extracted_data?.medical_data || {}
        }));

        const medicalContext = JSON.stringify(records, null, 2);

        // Ask AI
        const answer = await askMedicalRecords(
            question,
            medicalContext
        );

        res.json({
            success: true,
            question,
            answer
        });

    } catch (error) {
        console.error("Ask records error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to answer question"
        });
    }
});
// Generate a temporary doctor share link
router.post("/share", authenticateToken, async (req, res) => {
    try {
        // Find patient profile
        const patientResult = await pool.query(
            `SELECT id
             FROM patient_profiles
             WHERE user_id = $1`,
            [req.user.id]
        );

        if (patientResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Patient profile not found"
            });
        }

        const patientId = patientResult.rows[0].id;

        // Generate secure random token
        const token = crypto.randomBytes(32).toString("hex");

        // Store only the hash in database
        const tokenHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        // Link expires after 24 hours
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await pool.query(
            `INSERT INTO share_tokens
                (patient_id, token_hash, expires_at)
             VALUES
                ($1, $2, $3)`,
            [
                patientId,
                tokenHash,
                expiresAt
            ]
        );

        await createAuditLog(
            req.user.id,
            "SHARE_LINK_CREATED",
            "SHARE_TOKEN"
        );
        res.status(201).json({
            success: true,
            message: "Share link created successfully",
            share_url: `http://localhost:5173/share/${token}`,
            expires_at: expiresAt
        });

    } catch (error) {
        console.error("Share link error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create share link"
        });
    }
});
router.post("/share/revoke", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const profileResult = await pool.query(
            `SELECT id
             FROM patient_profiles
             WHERE user_id = $1`,
            [userId]
        );

        if (profileResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Patient profile not found"
            });
        }

        const patientId = profileResult.rows[0].id;

        const result = await pool.query(
            `UPDATE share_tokens
             SET revoked_at = CURRENT_TIMESTAMP
             WHERE patient_id = $1
             AND revoked_at IS NULL
             RETURNING id`,
            [patientId]
        );
        if (result.rowCount > 0) {
            await createAuditLog(
                req.user.id,
                "SHARE_LINK_REVOKED",
                "SHARE_TOKEN",
                result.rows[0].id
            );
        }

        res.json({
            success: true,
            message: result.rowCount > 0
                ? "Share link revoked successfully"
                : "No active share link found"
        });

    } catch (error) {
        console.error("Revoke share error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to revoke share link"
        });
    }
});
// View medical records using a temporary share token
router.get("/share/:token", async (req, res) => {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Share token is required"
            });
        }

        // Hash the token received in the URL
        const tokenHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        // Find valid, non-revoked, non-expired token
        const tokenResult = await pool.query(
            `SELECT
                id,
                patient_id,
                expires_at
             FROM share_tokens
             WHERE token_hash = $1
             AND expires_at > CURRENT_TIMESTAMP
             AND revoked_at IS NULL`,
            [tokenHash]
        );

        if (tokenResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired share link"
            });
        }

        const patientId = tokenResult.rows[0].patient_id;

        // Get patient basic profile
        const profileResult = await pool.query(
            `SELECT
                u.name,
                u.email,
                p.date_of_birth,
                p.blood_group,
                p.emergency_contact
             FROM patient_profiles p
             JOIN users u ON u.id = p.user_id
             WHERE p.id = $1`,
            [patientId]
        );

        if (profileResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Patient profile not found"
            });
        }

        // Get processed medical documents
        const documentsResult = await pool.query(
            `SELECT
                id,
                file_name,
                document_type,
                document_date,
                extracted_data,
                uploaded_at
             FROM documents
             WHERE patient_id = $1
             AND status = 'COMPLETED'
             ORDER BY uploaded_at DESC`,
            [patientId]
        );

        // Get timeline
        const timelineResult = await pool.query(
            `SELECT
                id,
                document_id,
                event_type,
                title,
                description,
                event_date
             FROM timeline_events
             WHERE patient_id = $1
             ORDER BY event_date ASC`,
            [patientId]
        );

        res.json({
            success: true,
            message: "Shared medical records retrieved successfully",
            expires_at: tokenResult.rows[0].expires_at,
            patient: profileResult.rows[0],
            documents: documentsResult.rows,
            timeline: timelineResult.rows
        });

    } catch (error) {
        console.error("Share records error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve shared records"
        });
    }
});

module.exports = router;