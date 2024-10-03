const express = require("express");
const router = new express.Router()
const db = require('../db');
const ExpressError = require("../expressError");

router.get('/', async (req, res, next) => {
    try {
        const results = await db.query(`SELECT * FROM invoices`)
        return res.json({ invoices: results.rows })
    } catch (e) {
        return next(e)
    }
})

router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params
        const results = await db.query(`SELECT * FROM invoices WHERE id = $1`, [id])
        if (results.rows.length === 0) {
            throw new ExpressError(`Can't find the invoice with id ${id} `, 404)
        }
        return res.json({ invoice: results.rows[0] })
    } catch (e) {
        next(e)
    }
})


router.post('/', async (req, res, next) => {
    try {
        const { comp_code, amt } = req.body
        const results = await db.query(`INSERT INTO invoices (comp_code,amt) VALUES ($1,$2) RETURNING id, comp_code, amt, paid, add_date, paid_date`, [comp_code, amt])
        return res.status(201).json({ invoice: results.rows[0] })
    } catch (e) {
        if (e.code === '23503') {
            return next(new ExpressError(`Company with code '${req.body.comp_code}' does not exist.`, 400));
        }
    }
    next(e)
})


// router.put('/:id', async (req, res, next) => {
//     try {
//         const { id } = req.params
//         const { amt } = req.body


//         const results = await db.query(`UPDATE invoices SET amt=$1 WHERE id=$2 RETURNING *`, [amt, id])
//         if (results.rows.length === 0) {
//             throw new ExpressError(`Can't find the company with code ${id}`, 404)
//         }
//         return res.json({ invoice: results.rows[0] })
//     } catch (e) {
//         next(e)
//     }
// })


router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { amt, paid } = req.body;

        const currResult = await db.query(`SELECT paid FROM invoices WHERE id = $1`, [id]);
        if (currResult.rows.length === 0) {
            throw new ExpressError(`Can't find the invoice with id ${id}`, 404);
        }

        const currentPaidStatus = currResult.rows[0].paid;
        let paidDate;

        if (!currentPaidStatus && paid) {

            paidDate = new Date();
        } else if (currentPaidStatus && !paid) {

            paidDate = null;
        } else {
            const paidDateResult = await db.query(`SELECT paid_date FROM invoices WHERE id = $1`, [id]);
            paidDate = paidDateResult.rows[0].paid_date;
        }

        const result = await db.query(
            `UPDATE invoices SET amt=$1, paid=$2, paid_date=$3 WHERE id=$4 RETURNING id, comp_code, amt, paid, add_date, paid_date`,
            [amt, paid, paidDate, id]
        );

        return res.json({ invoice: result.rows[0] });
    } catch (e) {
        next(e);
    }
});



router.delete('/:code', async (req, res, next) => {
    try {
        const { code } = req.params
        const results = await db.query(`DELETE  FROM companies WHERE code=$1 RETURNING code`, [code])
        if (results.rowCount === 0) {
            throw new ExpressError(`Can't find the company with code ${code}`, 404)
        }
        return res.json({ status: "deleted" })

    } catch (e) {
        return next(e)
    }
})





module.exports = router