const express = require("express");
const router = new express.Router()
const db = require('../db');
const ExpressError = require("../expressError");
const { engine } = require("../app");

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


router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params
        const { amt } = req.body
        const results = await db.query(`UPDATE invoices SET amt=$1 WHERE id=$2 RETURNING *`, [amt, id])
        if (results.rows.length === 0) {
            throw new ExpressError(`Can't find the company with code ${id}`, 404)
        }
        return res.json({ invoice: results.rows[0] })
    } catch (e) {
        next(e)
    }
})


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