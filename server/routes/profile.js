const express = require("express");
const pool = require("../db");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                u.id,
                u.name,
                u.email,
                u.role,
                u.created_at,
                p.date_of_birth,
                p.blood_group,
                p.emergency_contact
             FROM users u
             JOIN patient_profiles p
                ON u.id = p.user_id
             WHERE u.id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Patient profile not found"
            });
        }

        res.json({
            success: true,
            profile: result.rows[0]
        });

    } catch (error) {
        console.error("Profile error:", error);

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});
router.put("/", authenticateToken, async (req, res) => {
    try {
        const {
            date_of_birth,
            blood_group,
            emergency_contact
        } = req.body;

        const result = await pool.query(
            `UPDATE patient_profiles
             SET
                date_of_birth = $1,
                blood_group = $2,
                emergency_contact = $3
             WHERE user_id = $4
             RETURNING id, user_id, date_of_birth, blood_group, emergency_contact`,
            [
                date_of_birth || null,
                blood_group || null,
                emergency_contact || null,
                req.user.id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Patient profile not found"
            });
        }

        res.json({
            success: true,
            message: "Profile updated successfully",
            profile: result.rows[0]
        });

    } catch (error) {
        console.error("Profile update error:", error);

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

module.exports = router;